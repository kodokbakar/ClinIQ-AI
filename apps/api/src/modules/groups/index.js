/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         code: { type: string }
 *         memberCount: { type: integer }
 *     CreateGroupRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string }
 */
const Controller = require('./controller')
const router = require('express').Router()
const { authentication } = require('../../middleware/auth')

/**
 * @swagger
 * /v1/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a group
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateGroupRequest' }
 *     responses:
 *       201: { description: Group created }
 *   get:
 *     tags: [Groups]
 *     summary: List user's groups
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of groups }
 * /v1/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Group details }
 *   delete:
 *     tags: [Groups]
 *     summary: Delete a group (owner only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Group deleted }
 * /v1/groups/{id}/join:
 *   post:
 *     tags: [Groups]
 *     summary: Join a group by code
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: Joined group }
 * /v1/groups/{id}/leave:
 *   post:
 *     tags: [Groups]
 *     summary: Leave a group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Left group }
 */
router.post('/', authentication, Controller.create)
router.get('/', authentication, Controller.list)
router.get('/:id', authentication, Controller.getById)
router.post('/:id/join', authentication, Controller.join)
router.post('/:id/leave', authentication, Controller.leave)
router.delete('/:id', authentication, Controller.delete)

module.exports = router
