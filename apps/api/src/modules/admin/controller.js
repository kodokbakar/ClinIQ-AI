const db = require('../../../db/models')
const { generateForDisease } = require('../../utils/vignette')
const { HttpStatusCode } = require('axios')
const csv = require('csv-parser')
const { Readable } = require('stream')
const { deleteCache } = require('../../utils/redis')
const { Op } = require('sequelize')

class Controller {
   /** GET /v1/admin/me — Check current admin */
   static async me(req, res) {
      res.status(HttpStatusCode.Ok).json({
         success: true,
         data: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            is_superadmin: req.user.is_superadmin
         }
      })
   }

   /** POST /v1/admin/icd/upload — Upload ICD codes CSV */
   static async uploadICD(req, res) {
      try {
         if (!req.file) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'CSV file is required'
            })
         }

         const results = []
         const stream = Readable.from(req.file.buffer)

         await new Promise((resolve, reject) => {
            stream
               .pipe(csv())
               .on('data', (row) => results.push(row))
               .on('end', resolve)
               .on('error', reject)
         })

         let created = 0
         let updated = 0
         const errors = []

         for (const row of results) {
            const icd_code = row.icd_code || row.code
            const name = row.name || row.disease_name
            const description = row.description || ''

            if (!icd_code || !name) {
               errors.push({ row, message: 'Missing icd_code or name' })
               continue
            }

            try {
               const [disease, isNew] = await db.Disease.findOrCreate({
                  where: { icd_code: icd_code.trim().toUpperCase() },
                  defaults: {
                     name: name.trim(),
                     description: description.trim()
                  }
               })

               if (!isNew) {
                  await disease.update({
                     name: name.trim(),
                     description: description.trim()
                  })
                  updated++
               } else {
                  created++
               }
               // Invalidate disease search cache
               await deleteCache('diseases:search:*')
            } catch (err) {
               errors.push({ row, message: err.message })
            }
         }

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: {
               created,
               updated,
               errors: errors.length,
               details: errors.slice(0, 10)
            }
         })
      } catch (err) {
         console.error('ICD upload error:', err)
         res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Upload failed'
         })
      }
   }

   /** POST /v1/admin/vignettes/generate — Generate vignette via AI */
   static async generateVignette(req, res) {
      try {
         const { disease_id, difficulty, locale = 'id' } = req.body

         if (!disease_id) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'disease_id is required'
            })
         }

         const disease = await db.Disease.findByPk(disease_id)
         if (!disease) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Disease not found'
            })
         }

         const vignette = await generateForDisease(disease, locale, difficulty || 'medium')

         const clueCount = await db.Clue.count({ where: { vignette_id: vignette.id } })

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: {
               ...vignette.toJSON(),
               clue_count: clueCount
            }
         })
      } catch (err) {
         console.error('Generate vignette error:', err)
         const httpCode = typeof err.code === 'number' ? err.code : HttpStatusCode.InternalServerError
         res.status(httpCode).json({
            success: false,
            message: 'Failed to generate vignette'
         })
      }
   }

   /** POST /v1/admin/vignettes/bulk — Bulk generate vignettes for diseases without them */
   static async bulkGenerate(req, res) {
      try {
         const { limit = 10, locale = 'id', difficulty = 'medium' } = req.body

         const diseasesWithVignettes = await db.QuizVignette.findAll({
            attributes: ['disease_id'],
            group: ['disease_id']
         })
         const excludeIds = diseasesWithVignettes.map((v) => v.disease_id)

         const diseasesWithoutVignettes = await db.Disease.findAll({
            where: excludeIds.length ? { id: { [Op.notIn]: excludeIds } } : {},
            limit: parseInt(limit)
         })

         const results = []
         for (const disease of diseasesWithoutVignettes) {
            try {
               const vignette = await generateForDisease(disease, locale, difficulty)
               results.push({
                  disease: disease.name,
                  vignette: vignette.id,
                  success: true
               })
            } catch (err) {
               results.push({
                  disease: disease.name,
                  error: err.message,
                  success: false
               })
            }
         }

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: results
         })
      } catch (err) {
         console.error('Bulk generate error:', err)
         res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Bulk generation failed'
         })
      }
   }
}

module.exports = Controller
