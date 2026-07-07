/**
 * @swagger
 * /v1/ai/explanation/{disease_id}:
 *   get:
 *     tags: [AI]
 *     summary: Get AI explanation for a disease
 *     parameters:
 *       - in: path
 *         name: disease_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: AI-generated explanation }
 */
const Controller = require('./controller')
const router = require('express').Router()

router.get('/explanation/:disease_id', Controller.getExplanation)

module.exports = router
