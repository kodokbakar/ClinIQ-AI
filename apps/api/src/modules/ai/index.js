/**
 * @swagger
 * /v1/ai/explanation/{disease_id}:
 *   get:
 *     tags: [AI]
 *     summary: Get AI explanation for a disease
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: disease_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Cached or existing AI explanation }
 *       201: { description: AI explanation generated }
 *       400: { description: Invalid disease ID }
 *       401: { description: Authentication required }
 *       404: { description: Disease not found }
 *       502: { description: AI provider failed }
 */
const Controller = require('./controller')
const router = require('express').Router()
const { authentication } = require('../../middleware/auth')

router.get('/explanation/:disease_id', authentication, Controller.getExplanation)

module.exports = router
