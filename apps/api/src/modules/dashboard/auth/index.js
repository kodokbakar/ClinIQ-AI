/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email }
 *         password: { type: string, format: password }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean }
 *         data:
 *           type: object
 *           properties:
 *             token: { type: string }
 *             user: { $ref: '#/components/schemas/User' }
 *     User:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         role: { type: string }
 *     RegisterRequest:
 *       type: object
 *       required: [name, email, password, confirmPassword]
 *       properties:
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         password: { type: string, format: password }
 *         confirmPassword: { type: string }
 */
const Controller = require('./controller')
const router = require('express').Router()
const { authentication } = require('../../../middleware/auth')

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200: { description: Login success, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
 *       401: { description: Invalid credentials }
 */
router.post('/login', Controller.loginUser)

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logout success }
 */
router.post('/logout', authentication, Controller.logoutUser)

/**
 * @swagger
 * /v1/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Change the authenticated user's password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *               - confirm_password
 *             properties:
 *               old_password:
 *                 type: string
 *                 format: password
 *               new_password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               confirm_password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200: { description: Password changed }
 *       400: { description: Invalid password input }
 *       401: { description: Authentication required }
 */
router.put(
   '/change-password',
   authentication,
   Controller.changePassword
)

/**
 * @swagger
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 */
router.get('/me', authentication, Controller.getMe)

/**
 * @swagger
 * /v1/auth:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201: { description: User registered }
 */
router.post('/', Controller.registerUser)

module.exports = router
