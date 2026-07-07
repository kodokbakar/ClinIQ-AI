/**
 * @swagger
 * /v1/diseases/search:
 *   get:
 *     tags: [Diseases]
 *     summary: Autocomplete disease search
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search term
 *     responses:
 *       200: { description: List of matching diseases }
 */
const Controller = require('./controller')
const router = require('express').Router()

router.get('/search', Controller.search)

module.exports = router
