/**
 * @swagger
 * /v1/leaderboards/global:
 *   get:
 *     tags: [Leaderboards]
 *     summary: Get global leaderboard
 *     responses:
 *       200: { description: Global rankings }
 * /v1/leaderboards/group/{group_id}:
 *   get:
 *     tags: [Leaderboards]
 *     summary: Get group leaderboard
 *     parameters:
 *       - in: path
 *         name: group_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Group rankings }
 */
const Controller = require('./controller')
const router = require('express').Router()

router.get('/global', Controller.getGlobal)
router.get('/group/:group_id', Controller.getByGroup)

module.exports = router
