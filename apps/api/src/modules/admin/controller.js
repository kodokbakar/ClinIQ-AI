const db = require('../../../db/models')
const { getAIClient } = require('../../config/ai')
const aiClient = getAIClient()
const { HttpStatusCode } = require('axios')
const csv = require('csv-parser')
const { Readable } = require('stream')
const { deleteCache } = require('../../utils/redis')

class Controller {
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
         if (!aiClient) {
            return res.status(HttpStatusCode.ServiceUnavailable).json({
               success: false,
               message: 'AI service not configured. Set AI_API_KEY.'
            })
         }

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

         const difficultyLevel = difficulty || 'medium'
         const prompt = buildPrompt(disease, difficultyLevel, locale)

         const completion = await aiClient.chat.completions.create({
            model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
            messages: [
               {
                  role: 'system',
                  content:
              'You are a medical education expert creating clinical vignettes for medical students.'
               },
               { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
         })

         const content = completion.choices[0].message.content
         const parsed = parseVignette(content)

         const vignette = await db.QuizVignette.create({
            disease_id: disease.id,
            locale,
            difficulty: difficultyLevel,
            case_text: parsed.caseText,
            correct_diagnosis: parsed.correctDiagnosis,
            clues: parsed.clues || [],
            distractors: parsed.distractors || []
         })

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: vignette
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
         if (!aiClient) {
            return res.status(HttpStatusCode.ServiceUnavailable).json({
               success: false,
               message: 'AI service not configured'
            })
         }

         const { limit = 10, locale = 'id', difficulty = 'medium' } = req.body

         const diseasesWithoutVignettes = await db.Disease.findAll({
            where: {
               '$vignettes.id$': null
            },
            include: [
               {
                  model: db.QuizVignette,
                  as: 'vignettes',
                  required: false
               }
            ],
            limit: parseInt(limit)
         })

         const results = []
         for (const disease of diseasesWithoutVignettes) {
            try {
               const prompt = buildPrompt(disease, difficulty, locale)
               const completion = await aiClient.chat.completions.create({
                  model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
                  messages: [
                     {
                        role: 'system',
                        content:
                  'You are a medical education expert creating clinical vignettes.'
                     },
                     { role: 'user', content: prompt }
                  ],
                  temperature: 0.7,
                  max_tokens: 1500
               })

               const content = completion.choices[0].message.content
               const parsed = parseVignette(content)

               const vignette = await db.QuizVignette.create({
                  disease_id: disease.id,
                  locale,
                  difficulty,
                  case_text: parsed.caseText,
                  correct_diagnosis: parsed.correctDiagnosis,
                  clues: parsed.clues || [],
                  distractors: parsed.distractors || []
               })

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

function buildPrompt(disease, difficulty, locale) {
   const difficultyPrompts = {
      easy: 'Create a straightforward clinical case with classic presentation.',
      medium: 'Create a moderately challenging case with some atypical features.',
      hard: 'Create a complex case with unusual presentation or comorbidities.'
   }

   const lang = locale === 'id' ? 'Indonesian' : 'English'

   return `Create a clinical vignette for "${disease.name}" (ICD-10: ${disease.icd_code}) in ${lang}.
${difficultyPrompts[difficulty]}

Format your response as JSON with these exact fields:
{
  "caseText": "Clinical presentation (2-4 paragraphs)",
  "correctDiagnosis": "Exact disease name",
  "clues": ["Key finding 1", "Key finding 2", "Key finding 3", "Key finding 4", "Key finding 5"],
  "distractors": ["Similar condition 1", "Similar condition 2", "Similar condition 3"]
}

Include age, gender, chief complaint, history, physical exam, and relevant labs/imaging.`
}

function parseVignette(content) {
   try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
         return JSON.parse(jsonMatch[0])
      }
   } catch (e) {
      console.warn('Failed to parse AI response as JSON:', e.message)
   }
   // Fallback parsing
   return {
      caseText: content,
      correctDiagnosis: '',
      clues: [],
      distractors: []
   }
}

module.exports = Controller
