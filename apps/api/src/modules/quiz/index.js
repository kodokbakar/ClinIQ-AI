const Controller = require('./controller')
const router = require('express').Router()
const { authentication } = require('../../middleware/auth')

/**
 * @swagger
 * /v1/quiz/daily:
 *   get:
 *     tags: [Quiz]
 *     summary: Get daily quiz
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Daily quiz data }
 *       404: { description: No quiz today }
 */
router.get('/daily', authentication, Controller.daily)

/**
 * @swagger
 * /v1/quiz/reveal-clue:
 *   post:
 *     tags: [Quiz]
 *     summary: Reveal a clue for current quiz
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Clue revealed }
 */
router.post('/reveal-clue', authentication, Controller.revealClue)

/**
 * @swagger
 * /v1/quiz/submit-diagnosis:
 *   post:
 *     tags: [Quiz]
 *     summary: Submit final diagnosis
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diseaseName: { type: string }
 *               icdCode: { type: string }
 *     responses:
 *       200: { description: Result after submission }
 */
router.post('/submit-diagnosis', authentication, Controller.submitDiagnosis)

/**
 * @swagger
 * /v1/quiz/attempts/me:
 *   get:
 *     tags: [Quiz]
 *     summary: Get my quiz attempts history
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of attempts }
 */
router.get('/attempts/me', authentication, Controller.myAttempts)

module.exports = router
