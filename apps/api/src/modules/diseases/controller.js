const db = require('../../../db/models')
const { Op } = require('sequelize')
const { HttpStatusCode } = require('axios')
const { getCache, setCacheWithTTL } = require('../../utils/redis')

const CACHE_TTL_SECONDS = 60 * 5 // 5 minutes

class Controller {
   static async search(req, res) {
      try {
         const q = (req.query.q || '').trim()
         if (q.length > 100) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Search query is too long'
            })
         }
         if (q.length < 2) {
            return res.status(HttpStatusCode.Ok).json({ success: true, data: [] })
         }

         const limit = Math.min(parseInt(req.query.limit) || 10, 25)
         const cacheKey = `diseases:search:${q}:${limit}`
         const startsWithPattern = `${q}%`
         const containsPattern = `%${q}%`

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
               [Op.or]: [
                  { name: { [Op.iLike]: startsWithPattern } },
                  { name: { [Op.iLike]: containsPattern } }
               ]
            },
            attributes: ['id', 'icd_code', 'name'],
            limit,
            order: [
               [
                  db.sequelize.literal(
                     `CASE WHEN "Disease"."name" ILIKE ${db.sequelize.escape(
                        startsWithPattern
                     )} THEN 0 ELSE 1 END`
                  ),
                  'ASC'
               ],
               ['name', 'ASC']
            ]
         })

         await setCacheWithTTL(cacheKey, rows, CACHE_TTL_SECONDS)

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: rows,
            meta: { 'X-Cache': 'MISS' }
         })
      } catch (err) {
         console.error('Disease search failed:', err.message)
         const code = err.code || HttpStatusCode.InternalServerError
         res.status(code).json({
            success: false,
            message: 'Search failed'
         })
      }
   }
}

module.exports = Controller
