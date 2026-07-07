const db = require('../../../db/models')
const { getCache, setCacheWithTTL } = require('../../utils/redis')
const { getAIClient } = require('../../config/ai')
const aiClient = getAIClient()
const { HttpStatusCode } = require('axios')

class Controller {
  /** GET /v1/ai/explanation/:disease_id?locale=id */
  static async getExplanation(req, res) {
    try {
      const { disease_id } = req.params
      const locale = (req.query.locale || 'id').toLowerCase()

      if (!disease_id) {
        return res.status(HttpStatusCode.BadRequest).json({
          success: false,
          message: 'disease_id is required'
        })
      }
      // Try cache first
      const cacheKey = `explanation:${disease_id}:${locale}`
      const cached = await getCache(cacheKey)
      if (cached) {
        return res.status(HttpStatusCode.Ok).json({
          success: true,
          data: cached
        })
      }
      // Get disease from DB
      const disease = await db.Disease.findByPk(disease_id)
      if (!disease) {
        return res.status(HttpStatusCode.NotFound).json({
          success: false,
          message: 'Disease not found'
        })
      }

      // Check existing explanation in DB
      const existing = await db.AIExplanation.findOne({
        where: { disease_id, locale }
      })
      if (existing) {
        await setCacheWithTTL(cacheKey, existing, 86400)
        return res.status(HttpStatusCode.Ok).json({
          success: true,
          data: existing
        })
      }

      // Generate via 9Router (requires AI_API_KEY)
      if (!aiClient) {
        return res.status(HttpStatusCode.ServiceUnavailable).json({
          success: false,
          message: 'AI service not configured. Please set AI_API_KEY.'
        })
      }
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

      const completion = await aiClient.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500
      })

      const explanation = JSON.parse(completion.choices[0].message.content)

      // Save to DB
      const saved = await db.AIExplanation.create({
        disease_id,
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

      res.status(HttpStatusCode.Created).json({
        success: true,
        data: saved
      })
    } catch (err) {
      console.error('AI Explanation Error:', err)
      res.status(err.code || HttpStatusCode.InternalServerError).json({
        success: false,
        message: err.message
      })
    }
  }
}

module.exports = Controller
