const db = require('../../../db/models')
const redisClient = require('../../../config/redis')
const { getCache, setCacheWithTTL } = require('../../utils/redis')
const { getAIClient } = require('../../config/ai')
const { Op } = require('sequelize')
const { HttpStatusCode } = require('axios')
const { MAX_CLUES, scoreForClues } = require('../../utils/quiz')

const CACHE_TTL_SECONDS = 86400
const FIRST_CLUE_NUMBER = 1
const EMPTY_QUIZ_MESSAGE = 'No more vignettes available. All completed!'

function todayDate() {
   return new Date().toISOString().slice(0, 10)
}

function isCompleted(attempt) {
   return attempt.is_correct !== null
}

function revealedClueCount(value) {
   return Math.max(Number(value) || 0, FIRST_CLUE_NUMBER)
}

function cluePayload(clue) {
   return {
      clue_number: clue.clue_number,
      content: clue.content,
      type: clue.type
   }
}

function clueSlotPayload(clue, cluesRevealed) {
   const isRevealed = clue.clue_number <= cluesRevealed

   return {
      clue_number: clue.clue_number,
      content: isRevealed ? clue.content : null,
      type: clue.type,
      is_revealed: isRevealed
   }
}

async function getVignetteClues(vignetteId) {
   return db.Clue.findAll({
      where: { vignette_id: vignetteId },
      attributes: ['clue_number', 'content', 'type'],
      order: [['clue_number', 'ASC']]
   })
}

async function findUnattemptedVignette(userId) {
   const attemptedIds = (
      await db.QuizAttempt.findAll({
         attributes: ['vignette_id'],
         where: { user_id: userId }
      })
   ).map((attempt) => attempt.vignette_id)

   const where = attemptedIds.length > 0 ? { id: { [Op.notIn]: attemptedIds } } : {}

   return db.QuizVignette.findOne({
      where,
      attributes: ['id', 'variant_name'],
      order: db.sequelize.random()
   })
}

async function createAttempt(userId, vignetteId) {
   const [attempt] = await db.QuizAttempt.findOrCreate({
      where: {
         user_id: userId,
         vignette_id: vignetteId
      },
      defaults: {
         user_id: userId,
         vignette_id: vignetteId,
         clues_revealed: FIRST_CLUE_NUMBER,
         attempt_date: todayDate()
      }
   })

   return attempt
}

/**
 * Async helper to generate AI explanation and save to DB/cache.
 * @param {string} diseaseId
 * @param {string} locale
 */
async function generateExplanation(diseaseId, locale) {
   const cacheKey = `explanation:${diseaseId}:${locale}`
   const cached = await getCache(cacheKey)
   if (cached) return

   const existing = await db.AIExplanation.findOne({
      where: { disease_id: diseaseId, locale }
   })
   if (existing) {
      await setCacheWithTTL(cacheKey, existing, CACHE_TTL_SECONDS)
      return
   }

   const disease = await db.Disease.findByPk(diseaseId)
   if (!disease) return

   const prompt = `You are a medical education AI for Indonesian medical students (Gen Z).
Provide a clear, concise explanation of "${disease.name}" (ICD: ${disease.icd_code}) in ${locale === 'id' ? 'Bahasa Indonesia' : 'English'}.

Format your response as JSON:
{
  "overview": "2-3 sentence summary",
  "pathophysiology": "Mechanism of disease (3-4 sentences)",
  "clinical_features": ["feature1", "feature2", "feature3"],
  "diagnosis": ["test1", "test2"],
  "management": ["treatment1", "treatment2"],
  "prevention": ["prevention1"],
  "key_points": ["board-style pearl1", "board-style pearl2"]
}`

   const aiClient = getAIClient()
   try {
      const completion = await aiClient.chat.completions.create({
         model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
         messages: [{ role: 'user', content: prompt }],
         temperature: 0.3,
         max_tokens: 500
      })

      const explanation = JSON.parse(completion.choices[0].message.content)

      const saved = await db.AIExplanation.create({
         disease_id: diseaseId,
         locale,
         overview: explanation.overview,
         pathophysiology: explanation.pathophysiology,
         clinical_features: explanation.clinical_features,
         diagnosis: explanation.diagnosis,
         management: explanation.management,
         prevention: explanation.prevention,
         key_points: explanation.key_points
      })

      await setCacheWithTTL(cacheKey, saved, CACHE_TTL_SECONDS)
   } catch (error) {
      console.error(
         `Failed to generate explanation for ${diseaseId}:`,
         error.message
      )
   }
}

async function updateLeaderboards(userId, score) {
   await redisClient.ping()
   await redisClient.zincrby('global_leaderboard', score, userId)

   const groupMember = await db.GroupMember.findOne({
      where: { user_id: userId },
      attributes: ['group_id']
   })

   if (groupMember) {
      await redisClient.zincrby(
         `group_leaderboard:${groupMember.group_id}`,
         score,
         userId
      )
   }
}

class Controller {
   static async random(req, res) {
      try {
         const userId = req.user.id
         const vignette = await findUnattemptedVignette(userId)

         if (!vignette) {
            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: {
                  message: EMPTY_QUIZ_MESSAGE,
                  is_empty: true
               }
            })
         }

         const attempt = await createAttempt(userId, vignette.id)
         const clues = await getVignetteClues(vignette.id)
         const cluesRevealed = revealedClueCount(attempt.clues_revealed)

         return res.status(HttpStatusCode.Created).json({
            success: true,
            data: {
               attempt_id: attempt.id,
               vignette_id: vignette.id,
               clues_revealed: cluesRevealed,
               is_completed: false,
               clues: clues.map((clue) => clueSlotPayload(clue, cluesRevealed))
            }
         })
      } catch (err) {
         console.log(err)
         res
            .status(
               typeof err.code === 'number'
                  ? err.code
                  : HttpStatusCode.InternalServerError
            )
            .json({
               success: false,
               message: err.message
            })
      }
   }

   static async daily(req, res) {
      try {
         const userId = req.user.id
         const today = todayDate()

         const existing = await db.QuizAttempt.findOne({
            where: { user_id: userId, attempt_date: today }
         })

         if (existing) {
            const clues = await getVignetteClues(existing.vignette_id)
            const cluesRevealed = revealedClueCount(existing.clues_revealed)

            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: {
                  attempt_id: existing.id,
                  vignette_id: existing.vignette_id,
                  clues_revealed: cluesRevealed,
                  is_completed: isCompleted(existing),
                  is_correct: existing.is_correct,
                  score: existing.score,
                  clues: clues.map((clue) => clueSlotPayload(clue, cluesRevealed))
               }
            })
         }

         const vignette = await findUnattemptedVignette(userId)

         if (!vignette) {
            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: {
                  message: EMPTY_QUIZ_MESSAGE,
                  is_empty: true
               }
            })
         }

         const attempt = await createAttempt(userId, vignette.id)
         const clues = await getVignetteClues(vignette.id)
         const cluesRevealed = revealedClueCount(attempt.clues_revealed)

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: {
               attempt_id: attempt.id,
               vignette_id: vignette.id,
               clues_revealed: cluesRevealed,
               is_completed: false,
               clues: clues.map((clue) => clueSlotPayload(clue, cluesRevealed))
            }
         })
      } catch (err) {
         console.log(err)
         res
            .status(
               typeof err.code === 'number'
                  ? err.code
                  : HttpStatusCode.InternalServerError
            )
            .json({
               success: false,
               message: err.message
            })
      }
   }

   static async revealClue(req, res) {
      try {
         const userId = req.user.id
         const { attempt_id } = req.body

         if (!attempt_id) {
            return res
               .status(HttpStatusCode.BadRequest)
               .json({ success: false, message: 'attempt_id is required' })
         }

         const attempt = await db.QuizAttempt.findOne({
            where: { id: attempt_id, user_id: userId },
            include: [
               {
                  model: db.QuizVignette,
                  as: 'vignette',
                  include: [
                     {
                        model: db.Clue,
                        as: 'clues',
                        attributes: ['clue_number', 'content', 'type']
                     }
                  ]
               }
            ]
         })

         if (!attempt) {
            return res
               .status(HttpStatusCode.NotFound)
               .json({ success: false, message: 'Attempt not found' })
         }

         if (isCompleted(attempt)) {
            return res
               .status(HttpStatusCode.BadRequest)
               .json({ success: false, message: 'Attempt already completed' })
         }

         const currentCluesRevealed = revealedClueCount(attempt.clues_revealed)

         if (currentCluesRevealed >= MAX_CLUES) {
            return res
               .status(HttpStatusCode.BadRequest)
               .json({ success: false, message: 'All clues already revealed' })
         }

         const nextClueNumber = currentCluesRevealed + 1

         attempt.clues_revealed = nextClueNumber
         await attempt.save()

         const clues = [...attempt.vignette.clues].sort(
            (a, b) => a.clue_number - b.clue_number
         )
         const nextClue = clues.find((clue) => clue.clue_number === nextClueNumber)

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: {
               attempt_id: attempt.id,
               clues_revealed: attempt.clues_revealed,
               clue: nextClue ? cluePayload(nextClue) : null
            }
         })
      } catch (err) {
         console.log(err)
         res
            .status(
               typeof err.code === 'number'
                  ? err.code
                  : HttpStatusCode.InternalServerError
            )
            .json({
               success: false,
               message: err.message
            })
      }
   }

   static async submitDiagnosis(req, res) {
      try {
         const userId = req.user.id
         const { attempt_id, diagnosis } = req.body

         if (!attempt_id || !diagnosis) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'attempt_id and diagnosis are required'
            })
         }

         const attempt = await db.QuizAttempt.findOne({
            where: { id: attempt_id, user_id: userId },
            include: [
               {
                  model: db.QuizVignette,
                  as: 'vignette',
                  include: [
                     { model: db.Disease, as: 'disease', attributes: ['id', 'name'] }
                  ]
               }
            ]
         })

         if (!attempt) {
            return res
               .status(HttpStatusCode.NotFound)
               .json({ success: false, message: 'Attempt not found' })
         }

         if (isCompleted(attempt)) {
            return res
               .status(HttpStatusCode.BadRequest)
               .json({ success: false, message: 'Attempt already completed' })
         }

         const correctName = attempt.vignette.disease.name
         const isCorrect =
            diagnosis.trim().toLowerCase() === correctName.trim().toLowerCase()
         const cluesRevealed = revealedClueCount(attempt.clues_revealed)

         attempt.is_correct = isCorrect
         attempt.submitted_diagnosis = diagnosis
         attempt.score = isCorrect ? scoreForClues(cluesRevealed) : 0
         await attempt.save()

         if (isCorrect) {
            try {
               await updateLeaderboards(userId, attempt.score)

               if (process.env.SKIP_AI_EXPLANATIONS !== 'true') {
                  const diseaseId = attempt.vignette.disease_id
                  generateExplanation(diseaseId, 'id').catch((error) => {
                     console.error('AI explanation generation failed:', error.message)
                  })
               }
            } catch (redisError) {
               console.error('Redis operation failed:', redisError.message)
            }
         }

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: {
               attempt_id: attempt.id,
               is_correct: isCorrect,
               correct_disease: correctName,
               score: attempt.score,
               clues_revealed: cluesRevealed
            }
         })
      } catch (err) {
         console.log(err)
         res
            .status(
               typeof err.code === 'number'
                  ? err.code
                  : HttpStatusCode.InternalServerError
            )
            .json({
               success: false,
               message: err.message
            })
      }
   }

   static async myAttempts(req, res) {
      try {
         const userId = req.user.id
         const page = Math.max(parseInt(req.query.page) || 1, 1)
         const limit = Math.min(parseInt(req.query.limit) || 10, 50)
         const offset = (page - 1) * limit

         const { count, rows } = await db.QuizAttempt.findAndCountAll({
            where: { user_id: userId },
            include: [
               {
                  model: db.QuizVignette,
                  as: 'vignette',
                  include: [
                     {
                        model: db.Disease,
                        as: 'disease',
                        attributes: ['name', 'icd_code']
                     }
                  ]
               }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
         })

         res.status(HttpStatusCode.Ok).json({
            success: true,
            metadata: {
               per_page: limit,
               current_page: page,
               total_row: count,
               total_page: Math.ceil(count / limit)
            },
            data: rows.map((attempt) => ({
               id: attempt.id,
               vignette_id: attempt.vignette_id,
               disease_name: attempt.vignette?.disease?.name,
               disease_icd: attempt.vignette?.disease?.icd_code,
               clues_revealed: attempt.clues_revealed,
               is_correct: attempt.is_correct,
               score: attempt.score,
               attempt_date: attempt.attempt_date,
               submitted_diagnosis: attempt.submitted_diagnosis
            }))
         })
      } catch (err) {
         console.log(err)
         res
            .status(
               typeof err.code === 'number'
                  ? err.code
                  : HttpStatusCode.InternalServerError
            )
            .json({
               success: false,
               message: err.message
            })
      }
   }
}

module.exports = Controller
