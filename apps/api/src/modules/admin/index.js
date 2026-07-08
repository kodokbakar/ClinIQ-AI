/**
 * @swagger
 * /v1/admin/icd/upload:
 *   post:
 *     tags: [Admin]
 *     summary: Upload ICD CSV data
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: ICD data imported }
 * /v1/admin/vignettes/generate:
 *   post:
 *     tags: [Admin]
 *     summary: Generate a vignette for a disease
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Vignette generated }
 * /v1/admin/vignettes/bulk:
 *   post:
 *     tags: [Admin]
 *     summary: Bulk generate vignettes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bulk generation started }
 */

const Controller = require('./controller')
const router = require('express').Router()
const multer = require('multer')
const { authentication, authorize } = require('../../middleware/auth')

const upload = multer({ storage: multer.memoryStorage() })

router.get('/me', authentication, authorize('admin'), Controller.me)

router.post(
   '/icd/upload',
   authentication,
   authorize('admin'),
   upload.single('file'),
   Controller.uploadICD
)
router.post(
   '/vignettes/generate',
   authentication,
   authorize('admin'),
   Controller.generateVignette
)
router.post(
   '/vignettes/bulk',
   authentication,
   authorize('admin'),
   Controller.bulkGenerate
)

module.exports = router
