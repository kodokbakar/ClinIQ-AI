const Controller = require('./controller')
const router = require('express').Router()
const { authentication } = require('../../middleware/auth')

/**
 * @swagger
 * components:
 *   schemas:
 *     QuizClue:
 *       type: object
 *       properties:
 *         clue_number:
 *           type: integer
 *           example: 1
 *         content:
 *           type: string
 *           nullable: true
 *           example: "Patient has fever for 3 days"
 *         type:
 *           type: string
 *           nullable: true
 *           example: "history"
 *         is_revealed:
 *           type: boolean
 *           example: true
 *     QuizAttemptResponse:
 *       type: object
 *       properties:
 *         attempt_id:
 *           type: string
 *           format: uuid
 *         vignette_id:
 *           type: string
 *           format: uuid
 *         clues_revealed:
 *           type: integer
 *           example: 1
 *         is_completed:
 *           type: boolean
 *           example: false
 *         is_correct:
 *           type: boolean
 *           nullable: true
 *         score:
 *           type: integer
 *           nullable: true
 *         clues:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuizClue'
 *     RevealClueRequest:
 *       type: object
 *       required: [attempt_id]
 *       properties:
 *         attempt_id:
 *           type: string
 *           format: uuid
 *     RevealClueResponse:
 *       type: object
 *       properties:
 *         attempt_id:
 *           type: string
 *           format: uuid
 *         clues_revealed:
 *           type: integer
 *           example: 2
 *         clue:
 *           $ref: '#/components/schemas/QuizClue'
 *     SubmitDiagnosisRequest:
 *       type: object
 *       required: [attempt_id, diagnosis]
 *       properties:
 *         attempt_id:
 *           type: string
 *           format: uuid
 *         diagnosis:
 *           type: string
 *           example: "Dengue fever"
 *     SubmitDiagnosisResponse:
 *       type: object
 *       properties:
 *         attempt_id:
 *           type: string
 *           format: uuid
 *         is_correct:
 *           type: boolean
 *         correct_disease:
 *           type: string
 *         score:
 *           type: integer
 *         clues_revealed:
 *           type: integer
 */

/**
 * @swagger
 * /v1/quiz/random:
 *   get:
 *     tags: [Quiz]
 *     summary: Get a random unattempted quiz
 *     description: Creates a quiz attempt from a random vignette that the authenticated user has not attempted yet. The first clue is visible and unrevealed clue contents are hidden.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Random quiz attempt created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QuizAttemptResponse'
 *       200:
 *         description: No more vignettes are available
 *       401:
 *         description: Authentication required
 */
router.get('/random', authentication, Controller.random)

/**
 * @swagger
 * /v1/quiz/daily:
 *   get:
 *     tags: [Quiz]
 *     summary: Get or resume today's quiz
 *     description: Resumes today's existing attempt if present, otherwise creates a new daily quiz attempt.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Existing daily quiz attempt returned, or empty state
 *       201:
 *         description: New daily quiz attempt created
 *       401:
 *         description: Authentication required
 */
router.get('/daily', authentication, Controller.daily)

/**
 * @swagger
 * /v1/quiz/reveal-clue:
 *   post:
 *     tags: [Quiz]
 *     summary: Reveal the next clue
 *     description: Reveals one additional clue for an active attempt.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RevealClueRequest'
 *     responses:
 *       200:
 *         description: Next clue revealed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RevealClueResponse'
 *       400:
 *         description: Missing attempt_id, completed attempt, or max clues reached
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Attempt not found
 */
router.post('/reveal-clue', authentication, Controller.revealClue)

/**
 * @swagger
 * /v1/quiz/submit-diagnosis:
 *   post:
 *     tags: [Quiz]
 *     summary: Submit diagnosis
 *     description: Submits the final diagnosis, marks the attempt as completed, assigns score, and updates leaderboard when correct.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitDiagnosisRequest'
 *     responses:
 *       200:
 *         description: Diagnosis submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SubmitDiagnosisResponse'
 *       400:
 *         description: Missing fields or completed attempt
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Attempt not found
 */
router.post('/submit-diagnosis', authentication, Controller.submitDiagnosis)

/**
 * @swagger
 * /v1/quiz/attempts/me:
 *   get:
 *     tags: [Quiz]
 *     summary: Get my quiz attempts
 *     description: Returns paginated quiz attempt history for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Current user's quiz attempts
 *       401:
 *         description: Authentication required
 */
router.get('/attempts/me', authentication, Controller.myAttempts)

module.exports = router
