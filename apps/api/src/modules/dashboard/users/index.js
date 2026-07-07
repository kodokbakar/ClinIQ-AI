/**
 * @swagger
 * /v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of users }
 *   post:
 *     tags: [Users]
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: User created }
 * /v1/users/{user_id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User details }
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200: { description: User updated }
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User deleted }
 * /v1/users/{user_id}/access:
 *   put:
 *     tags: [Users]
 *     summary: Update user access
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Access updated }
 * /v1/users/{user_id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset user password
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Password reset }
 */
const Controller = require('./controller')
const router = require('express').Router()

router.get('/', Controller.listUser)
router.post('/', Controller.createUser)
router.get('/:user_id', Controller.showUser)
router.put('/:user_id', Controller.updateUser)
router.delete('/:user_id', Controller.deleteUser)
router.put('/:user_id/access', Controller.updateUserAccess)
router.post('/:user_id/reset-password', Controller.resetPassword)

module.exports = router
