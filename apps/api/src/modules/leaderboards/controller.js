const db = require('../../../db/models')
const redisClient = require('../../../config/redis')
const { HttpStatusCode } = require('axios')

class Controller {
  static async getGlobal(req, res) {
    try {
      if (!redisClient.isReady) await redisClient.connect()

      const leaderboards = await redisClient.zRangeWithScores(
        'global_leaderboard',
        0,
        99,
        { REV: true }
      )

      const userIds = leaderboards.map((l) => l.value)
      const users = await db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username']
      })
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.username
        return acc
      }, {})

      const data = leaderboards.map((l) => ({
        user_id: l.value,
        username: userMap[l.value] || 'N/A',
        score: l.score
      }))

      res.status(HttpStatusCode.Ok).json({ success: true, data })
    } catch (err) {
      console.error('Error fetching global leaderboard:', err.message)
      res.status(HttpStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to fetch leaderboard. Is Redis running?'
      })
    }
  }

  static async getByGroup(req, res) {
    try {
      const { group_id } = req.params

      if (!group_id) {
        return res
          .status(HttpStatusCode.BadRequest)
          .json({ success: false, message: 'Group ID is required' })
      }

      if (!redisClient.isReady) await redisClient.connect()

      const leaderboards = await redisClient.zRangeWithScores(
        `group_leaderboard:${group_id}`,
        0,
        99,
        { REV: true }
      )

      const userIds = leaderboards.map((l) => l.value)
      const users = await db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username']
      })
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.username
        return acc
      }, {})

      const data = leaderboards.map((l) => ({
        user_id: l.value,
        username: userMap[l.value] || 'N/A',
        score: l.score
      }))

      res.status(HttpStatusCode.Ok).json({ success: true, data })
    } catch (err) {
      console.error(
        `Error fetching group ${req.params.group_id} leaderboard:`,
        err.message
      )
      res.status(HttpStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to fetch leaderboard. Is Redis running?'
      })
    }
  }
}

module.exports = Controller
