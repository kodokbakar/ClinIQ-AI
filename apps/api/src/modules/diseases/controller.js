const db = require('../../../db/models')
const { Op } = require('sequelize')
const { HttpStatusCode } = require('axios')
const { getCache, setCacheWithTTL } = require('../../utils/redis')

const CACHE_TTL_SECONDS = 60 * 5 // 5 minutes

class Controller {
  static async search(req, res) {
    try {
      const q = (req.query.q || '').trim()
      if (q.length < 2) {
        return res.status(HttpStatusCode.Ok).json({ success: true, data: [] })
      }

      const limit = Math.min(parseInt(req.query.limit) || 10, 25)
      const cacheKey = `diseases:search:${q}:${limit}`

      const cached = await getCache(cacheKey)
      if (cached) {
        return res.status(HttpStatusCode.Ok).json({
          success: true,
          data: cached,
          meta: { 'X-Cache': 'HIT' }
        })
      }

      const rows = await db.Disease.findAll({
        where: {
          name: { [Op.iLike]: `%${q}%` }
        },
        attributes: ['id', 'icd_code', 'name'],
        limit,
        order: [['name', 'ASC']]
      })

      await setCacheWithTTL(cacheKey, rows, CACHE_TTL_SECONDS)

      res.status(HttpStatusCode.Ok).json({
        success: true,
        data: rows,
        meta: { 'X-Cache': 'MISS' }
      })
    } catch (err) {
      console.log(err)
      const code = err.code || HttpStatusCode.InternalServerError
      res.status(code).json({
        success: false,
        message: err.message
      })
    }
  }
}

module.exports = Controller
