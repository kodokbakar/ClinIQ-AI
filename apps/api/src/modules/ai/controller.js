const db = require('../../../db/models')
const { getCache, setCacheWithTTL } = require('../../utils/redis')
const { getAIClient } = require('../../config/ai')
const { HttpStatusCode } = require('axios')
const uuid = require('uuid')

const CACHE_TTL_SECONDS = 86400

class Controller {
   /** GET /v1/ai/explanation/:disease_id?locale=id */
   static async getExplanation(req, res) {
      try {
         const { disease_id } = req.params
         const locale = (req.query.locale || 'id').toLowerCase()

         if (!uuid.validate(disease_id)) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Invalid disease ID'
            })
         }

         const cacheKey = `explanation:${disease_id}:${locale}`
         const cached = await getCache(cacheKey)
         if (cached) {
            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: cached
            })
         }

         const disease = await db.Disease.findByPk(disease_id)
         if (!disease) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Disease not found'
            })
         }

         const existing = await db.AIExplanation.findOne({
            where: { disease_id, locale }
         })
         if (existing) {
            await setCacheWithTTL(cacheKey, existing, CACHE_TTL_SECONDS)
            return res.status(HttpStatusCode.Ok).json({
               success: true,
               data: existing
            })
         }

         let aiClient
         try {
            aiClient = getAIClient()
         } catch (err) {
            return res.status(HttpStatusCode.ServiceUnavailable).json({
               success: false,
               message: err.message
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

         let completion
         try {
            completion = await aiClient.chat.completions.create({
               model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
               messages: [{ role: 'user', content: prompt }],
               temperature: 0.3,
               max_tokens: 500
            })
         } catch (error) {
            console.error('AI provider failure:', error.message)

            return res.status(HttpStatusCode.BadGateway).json({
               success: false,
               message: 'AI provider failed'
            })
         }

         const explanation = JSON.parse(completion.choices[0].message.content)

         const saved = await db.AIExplanation.create({
            disease_id,
            locale,
            overview: explanation.overview,
            pathophysiology: explanation.pathophysiology,
            clinical_features: explanation.clinical_features,
            diagnosis: explanation.diagnosis,
            management: explanation.management,
            prevention: explanation.prevention,
            key_points: explanation.key_points,
            ai_model_used: process.env.AI_MODEL || null
         })

         await setCacheWithTTL(cacheKey, saved, CACHE_TTL_SECONDS)

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: saved
         })
      } catch (err) {
         console.error('AI Explanation Error:', err)
         const httpCode =
            typeof err.code === 'number'
               ? err.code
               : HttpStatusCode.InternalServerError

         res.status(httpCode).json({
            success: false,
            message: 'Failed to get AI explanation'
         })
      }
   }
}

module.exports = Controller
