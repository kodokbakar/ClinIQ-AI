const db = require('../../../db/models')
const { getCache, setCacheWithTTL } = require('../../utils/redis')
const { getAIClient } = require('../../config/ai')
const { Op } = require('sequelize')
const { HttpStatusCode } = require('axios')
const { MAX_CLUES, scoreForClues } = require('../../utils/quiz')
const { generateForDisease } = require('../../utils/vignette')
const {
   globalLeaderboardCacheKey,
   groupLeaderboardCacheKey,
   invalidateLeaderboardCaches
} = require('../../utils/leaderboard-cache')
const uuid = require('uuid')

const CACHE_TTL_SECONDS = 86400
const EMPTY_QUIZ_MESSAGE = 'No more vignettes available. All completed!'
const FIRST_CLUE_NUMBER = 1

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
      include: [
         {
            model: db.Clue,
            as: 'clues',
            required: true,
            attributes: ['id']
         }
      ],
      order: db.sequelize.random()
   })
}

async function findDiseaseWithoutVignette() {
   const generatedDiseaseIds = (
      await db.QuizVignette.findAll({
         attributes: ['disease_id'],
         group: ['disease_id']
      })
   ).map((row) => row.disease_id)

   return db.Disease.findOne({
      where: generatedDiseaseIds.length
         ? { id: { [Op.notIn]: generatedDiseaseIds } }
         : {},
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

async function invalidateLeaderboardsForUser(userId) {
   try {
      const memberships = await db.GroupMember.findAll({
         where: {
            user_id: userId
         },
         attributes: ['group_id']
      })

      await invalidateLeaderboardCaches([
         globalLeaderboardCacheKey(),
         ...memberships.map((membership) =>
            groupLeaderboardCacheKey(
               membership.group_id
            )
         )
      ])
   } catch (error) {
      console.error(
         'Leaderboard cache invalidation failed:',
         error.message
      )
   }
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
         model: process.env.AI_MODEL || process.env.AI_COMBOS,
         messages: [{ role: 'user', content: prompt }],
         temperature: 0.3,
         max_tokens: 1500
      })

      const raw = completion.choices?.[0]?.message?.content || '{}'
      let parsed
      try {
         parsed = JSON.parse(raw)
      } catch {
         const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
         const match = cleaned.match(/\{[\s\S]*\}/)
         const text = match ? match[0] : cleaned
         const opens = (text.match(/\{/g) || []).length
         const closes = (text.match(/\}/g) || []).length
         const repaired = opens > closes ? text + '}'.repeat(opens - closes) : text
         parsed = JSON.parse(repaired)
      }

      const saved = await db.AIExplanation.create({
         disease_id: diseaseId,
         locale,
         overview: parsed.overview,
         pathophysiology: parsed.pathophysiology,
         clinical_features: parsed.clinical_features,
         diagnosis: parsed.diagnosis,
         management: parsed.management,
         prevention: parsed.prevention,
         key_points: parsed.key_points
      })

      await setCacheWithTTL(cacheKey, saved, CACHE_TTL_SECONDS)
   } catch (error) {
      console.error(
         `Failed to generate explanation for ${diseaseId}:`,
         error.message
      )
   }
}

class Controller {
   static async random(req, res) {
      try {
         const userId = req.user.id
         let vignette = await findUnattemptedVignette(userId)

         if (!vignette) {
            try {
               const disease = await findDiseaseWithoutVignette()
               if (disease) {
                  vignette = await generateForDisease(disease, 'id', 'medium')
               }
            } catch (genErr) {
               console.error('Auto-generate vignette failed:', genErr.message)
            }

            if (!vignette) {
               return res.status(HttpStatusCode.Ok).json({
                  success: true,
                  data: {
                     message: EMPTY_QUIZ_MESSAGE,
                     is_empty: true
                  }
               })
            }
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

         let vignette = await findUnattemptedVignette(userId)

         if (!vignette) {
            try {
               const disease = await findDiseaseWithoutVignette()
               if (disease) {
                  vignette = await generateForDisease(disease, 'id', 'medium')
               }
            } catch (genErr) {
               console.error('Auto-generate vignette failed:', genErr.message)
            }

            if (!vignette) {
               return res.status(HttpStatusCode.Ok).json({
                  success: true,
                  data: {
                     message: EMPTY_QUIZ_MESSAGE,
                     is_empty: true
                  }
               })
            }
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
                     {
                        model: db.Disease,
                        as: 'disease',
                        attributes: ['id', 'name', 'icd_code']
                     },
                     {
                        model: db.Clue,
                        as: 'clues',
                        attributes: ['clue_number', 'content', 'type'],
                        order: [['clue_number', 'ASC']]
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

         if (attempt.is_correct === true) {
            return res
               .status(HttpStatusCode.BadRequest)
               .json({ success: false, message: 'Attempt already completed' })
         }

         const correctName = attempt.vignette.disease.name
         const isCorrect =
            diagnosis.trim().toLowerCase() === correctName.trim().toLowerCase()
         const cluesRevealed = revealedClueCount(attempt.clues_revealed)

         // Always record the last answer
         attempt.submitted_diagnosis = diagnosis

         if (isCorrect) {
            attempt.is_correct = true
            attempt.score = scoreForClues(cluesRevealed)
            await attempt.save()

            await invalidateLeaderboardsForUser(userId)

            if (process.env.SKIP_AI_EXPLANATIONS !== 'true') {
               generateExplanation(attempt.vignette.disease_id, 'id').catch(
                  (err) => console.error('AI explanation failed:', err.message)
               )
            }

            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: {
                  is_correct: true,
                  score: attempt.score,
                  clues_revealed: cluesRevealed,
                  correct_disease: {
                     name: attempt.vignette.disease.name,
                     icd_code: attempt.vignette.disease.icd_code
                  }
               }
            })
         }

         // --- Incorrect Diagnosis Flow ---

         const nextCluesRevealed = cluesRevealed + 1

         if (nextCluesRevealed > MAX_CLUES) {
            // Failed on the last clue
            attempt.is_correct = false
            attempt.score = 0
            await attempt.save()

            if (process.env.SKIP_AI_EXPLANATIONS !== 'true') {
               generateExplanation(attempt.vignette.disease_id, 'id').catch(
                  (err) => console.error('AI explanation failed:', err.message)
               )
            }

            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: {
                  is_correct: false,
                  score: 0,
                  correct_disease: {
                     name: attempt.vignette.disease.name,
                     icd_code: attempt.vignette.disease.icd_code
                  }
               }
            })
         }

         // Incorrect, but more clues are available
         attempt.clues_revealed = nextCluesRevealed
         await attempt.save()

         const clues = [...attempt.vignette.clues].sort(
            (a, b) => a.clue_number - b.clue_number
         )
         const nextClue = clues.find(
            (clue) => clue.clue_number === nextCluesRevealed
         )

         return res.status(HttpStatusCode.Ok).json({
            success: true,
            data: {
               is_correct: false,
               clues_revealed: nextCluesRevealed,
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

   static async attemptDetail(req, res) {
      try {
         const userId = req.user.id
         const { attempt_id: attemptId } = req.params

         if (!uuid.validate(attemptId)) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Invalid attempt ID'
            })
         }

         const attempt = await db.QuizAttempt.findOne({
            where: {
               id: attemptId,
               user_id: userId
            },
            include: [
               {
                  model: db.QuizVignette,
                  as: 'vignette',
                  attributes: [
                     'id',
                     'variant_name',
                     'disease_id'
                  ],
                  include: [
                     {
                        model: db.Disease,
                        as: 'disease',
                        attributes: [
                           'id',
                           'name',
                           'icd_code',
                           'description'
                        ]
                     },
                     {
                        model: db.Clue,
                        as: 'clues',
                        attributes: [
                           'clue_number',
                           'content',
                           'type'
                        ]
                     }
                  ]
               }
            ]
         })

         if (!attempt) {
            return res
               .status(HttpStatusCode.NotFound)
               .json({
                  success: false,
                  message: 'Attempt not found'
               })
         }

         if (!isCompleted(attempt)) {
            return res
               .status(HttpStatusCode.Conflict)
               .json({
                  success: false,
                  message: 'Attempt is not completed'
               })
         }

         const disease = attempt.vignette?.disease

         if (!disease) {
            return res
               .status(HttpStatusCode.NotFound)
               .json({
                  success: false,
                  message: 'Disease not found'
               })
         }

         const explanation =
            await db.AIExplanation.findOne({
               where: {
                  disease_id: disease.id,
                  locale: 'id'
               },
               attributes: [
                  'disease_id',
                  'locale',
                  'overview',
                  'pathophysiology',
                  'clinical_features',
                  'diagnosis',
                  'management',
                  'prevention',
                  'key_points'
               ]
            })

         const clues = [
            ...(attempt.vignette.clues || [])
         ]
            .sort(
               (first, second) =>
                  first.clue_number -
                  second.clue_number
            )
            .map(cluePayload)

         return res
            .status(HttpStatusCode.Ok)
            .json({
               success: true,
               data: {
                  id: attempt.id,
                  vignette_id: attempt.vignette_id,
                  variant_name:
                     attempt.vignette.variant_name,
                  clues_revealed:
                     attempt.clues_revealed,
                  is_correct: attempt.is_correct,
                  score: attempt.score,
                  attempt_date:
                     attempt.attempt_date,
                  submitted_diagnosis:
                     attempt.submitted_diagnosis,
                  disease: {
                     id: disease.id,
                     name: disease.name,
                     icd_code: disease.icd_code,
                     description:
                        disease.description
                  },
                  clues,
                  explanation
               }
            })
      } catch (err) {
         console.error(
            'Attempt detail failed:',
            err.message
         )

         const code =
            typeof err.code === 'number'
               ? err.code
               : HttpStatusCode.InternalServerError

         return res.status(code).json({
            success: false,
            message: 'Failed to get attempt detail'
         })
      }
   }

   static async myAttempts(req, res) {
      try {
         const userId = req.user.id
         const page = Math.max(parseInt(req.query.page) || 1, 1)
         const limit = Math.min(parseInt(req.query.limit) || 10, 50)
         const offset = (page - 1) * limit
         const userWhere = { user_id: userId }

         const [
            attemptsResult,
            completedAttempts,
            correctAttempts,
            totalScore
         ] = await Promise.all([
            db.QuizAttempt.findAndCountAll({
               where: userWhere,
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
            }),
            db.QuizAttempt.count({
               where: {
                  ...userWhere,
                  is_correct: {
                     [Op.ne]: null
                  }
               }
            }),
            db.QuizAttempt.count({
               where: {
                  ...userWhere,
                  is_correct: true
               }
            }),
            db.QuizAttempt.sum('score', {
               where: userWhere
            })
         ])

         const { count, rows } = attemptsResult

         res.status(HttpStatusCode.Ok).json({
            success: true,
            metadata: {
               per_page: limit,
               current_page: page,
               total_row: count,
               total_page: Math.ceil(count / limit),
               completed_attempts: completedAttempts,
               correct_attempts: correctAttempts,
               total_score: Number(totalScore) || 0
            },
            data: rows.map((attempt) => {
               const completed = isCompleted(attempt)

               return {
                  id: attempt.id,
                  vignette_id: attempt.vignette_id,
                  disease_name: completed
                     ? attempt.vignette?.disease?.name
                     : null,
                  disease_icd: completed
                     ? attempt.vignette?.disease?.icd_code
                     : null,
                  clues_revealed: attempt.clues_revealed,
                  is_correct: attempt.is_correct,
                  score: attempt.score,
                  attempt_date: attempt.attempt_date,
                  submitted_diagnosis:
                     attempt.submitted_diagnosis
               }
            })
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
