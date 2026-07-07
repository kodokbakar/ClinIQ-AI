const db = require('../../../db/models')
const redisClient = require('../../../config/redis')
const { getCache, setCacheWithTTL } = require('../../utils/redis')
const { getAIClient } = require('../../config/ai')
const aiClient = getAIClient()
const { Op } = require('sequelize')
const { HttpStatusCode } = require('axios')
const { MAX_CLUES, scoreForClues } = require('../../utils/quiz')

/**
 * Async helper to generate AI explanation and save to DB/cache.
 * @param {string} diseaseId
 * @param {string} locale
 */
async function generateExplanation(diseaseId, locale) {
  const cacheKey = `explanation:${diseaseId}:${locale}`
  const cached = await getCache(cacheKey)
  if (cached) return // Already exists

  const existing = await db.AIExplanation.findOne({
    where: { disease_id: diseaseId, locale }
  })
  if (existing) {
    await setCacheWithTTL(cacheKey, existing, 86400)
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

  try {
    const completion = await aiClient.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500
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

    await setCacheWithTTL(cacheKey, saved, 86400)
  } catch (error) {
    console.error(
      `Failed to generate explanation for ${diseaseId}:`,
      error.message
    )
  }
}

class Controller {
  /** GET /v1/quiz/daily — serve today's vignette (or resume existing) */
  static async daily(req, res) {
    try {
      const userId = req.user.id
      const today = new Date().toISOString().slice(0, 10)

      // Resume existing attempt for today
      const existing = await db.QuizAttempt.findOne({
        where: { user_id: userId, attempt_date: today },
        include: [
          {
            model: db.QuizVignette,
            as: 'vignette',
            include: [
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
      if (existing) {
        const clues = existing.vignette.clues
          .filter((c) => c.clue_number <= existing.clues_revealed)
          .map((c) => ({
            clue_number: c.clue_number,
            content: c.content,
            type: c.type
          }))

        return res.status(HttpStatusCode.Ok).json({
          success: true,
          data: {
            attempt_id: existing.id,
            vignette_id: existing.vignette_id,
            clues_revealed: existing.clues_revealed,
            is_completed: existing.is_correct !== null,
            is_correct: existing.is_correct,
            score: existing.score,
            clues
          }
        })
      }

      // Pick a vignette the user has never attempted
      const attemptedIds = (
        await db.QuizAttempt.findAll({
          attributes: ['vignette_id'],
          where: { user_id: userId }
        })
      ).map((a) => a.vignette_id)

      const vignetteWhere =
        attemptedIds.length > 0 ? { id: { [Op.notIn]: attemptedIds } } : {}

      const vignette = await db.QuizVignette.findOne({
        where: vignetteWhere,
        include: [
          {
            model: db.Clue,
            as: 'clues',
            attributes: ['clue_number', 'content', 'type'],
            order: [['clue_number', 'ASC']],
            limit: 1
          }
        ]
      })

      if (!vignette) {
        return res.status(HttpStatusCode.Ok).json({
          success: true,
          data: { message: 'No more vignettes available. All completed!' }
        })
      }

      const attempt = await db.QuizAttempt.create({
        user_id: userId,
        vignette_id: vignette.id,
        clues_revealed: 0,
        attempt_date: today
      })

      const firstClue = vignette.clues?.[0] || null

      res.status(HttpStatusCode.Created).json({
        success: true,
        data: {
          attempt_id: attempt.id,
          vignette_id: vignette.id,
          clues_revealed: 0,
          is_completed: false,
          clues: firstClue
            ? [
                {
                  clue_number: firstClue.clue_number,
                  content: firstClue.content,
                  type: firstClue.type
                }
              ]
            : []
        }
      })
    } catch (err) {
      console.log(err)
      res.status(err.code || HttpStatusCode.InternalServerError).json({
        success: false,
        message: err.message
      })
    }
  }

  /** POST /v1/quiz/reveal-clue — increment clues_revealed, return next clue */
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
      if (attempt.is_correct !== null) {
        return res
          .status(HttpStatusCode.BadRequest)
          .json({ success: false, message: 'Attempt already completed' })
      }
      if (attempt.clues_revealed >= MAX_CLUES) {
        return res
          .status(HttpStatusCode.BadRequest)
          .json({ success: false, message: 'All clues already revealed' })
      }

      attempt.clues_revealed += 1
      await attempt.save()

      const nextClue = attempt.vignette.clues.find(
        (c) => c.clue_number === attempt.clues_revealed
      )

      res.status(HttpStatusCode.Ok).json({
        success: true,
        data: {
          attempt_id: attempt.id,
          clues_revealed: attempt.clues_revealed,
          clue: nextClue
            ? {
                clue_number: nextClue.clue_number,
                content: nextClue.content,
                type: nextClue.type
              }
            : null
        }
      })
    } catch (err) {
      console.log(err)
      res.status(err.code || HttpStatusCode.InternalServerError).json({
        success: false,
        message: err.message
      })
    }
  }

  /** POST /v1/quiz/submit-diagnosis — compare answer, assign score */
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
      if (attempt.is_correct !== null) {
        return res
          .status(HttpStatusCode.BadRequest)
          .json({ success: false, message: 'Attempt already completed' })
      }

      const correctName = attempt.vignette.disease.name
      const isCorrect =
        diagnosis.trim().toLowerCase() === correctName.trim().toLowerCase()

      attempt.is_correct = isCorrect
      attempt.submitted_diagnosis = diagnosis
      attempt.score = isCorrect ? scoreForClues(attempt.clues_revealed + 1) : 0
      await attempt.save()

      // Update Redis Leaderboards
      if (isCorrect) {
        try {
          if (!redisClient.isReady) await redisClient.connect()
          await redisClient.zIncrBy('global_leaderboard', attempt.score, userId)

          const groupMember = await db.GroupMember.findOne({
            where: { user_id: userId },
            attributes: ['group_id']
          })
          if (groupMember) {
            await redisClient.zIncrBy(
              `group_leaderboard:${groupMember.group_id}`,
              attempt.score,
              userId
            )
          }

          // Trigger AI explanation generation (fire-and-forget)
          if (aiClient) {
            const diseaseId = attempt.vignette.disease_id
            generateExplanation(diseaseId, 'id').catch(console.error)
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
          clues_revealed: attempt.clues_revealed
        }
      })
    } catch (err) {
      console.log(err)
      res.status(err.code || HttpStatusCode.InternalServerError).json({
        success: false,
        message: err.message
      })
    }
  }

  /** GET /v1/quiz/attempts/me — paginated attempt history */
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
        data: rows.map((a) => ({
          id: a.id,
          vignette_id: a.vignette_id,
          disease_name: a.vignette?.disease?.name,
          disease_icd: a.vignette?.disease?.icd_code,
          clues_revealed: a.clues_revealed,
          is_correct: a.is_correct,
          score: a.score,
          attempt_date: a.attempt_date,
          submitted_diagnosis: a.submitted_diagnosis
        }))
      })
    } catch (err) {
      console.log(err)
      res.status(err.code || HttpStatusCode.InternalServerError).json({
        success: false,
        message: err.message
      })
    }
  }
}

module.exports = Controller
