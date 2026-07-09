process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')
const redis = require('../../config/redis')
const { setAIClient, resetAIClient } = require('../../src/config/ai')

const TEST_PASSWORD = 'Password123'
const TEST_EMAIL = 'ai-user@example.test'
const TEST_DISEASE_CODE = 'T-AI-001'

let cookie
let role
let disease

async function ensureUserRole() {
   const [userRole] = await db.role.findOrCreate({
      where: { name: 'User' },
      defaults: {
         name: 'User',
         is_superadmin: false
      }
   })

   return userRole
}

async function createUser() {
   return db.user.create({
      name: 'AI Test User',
      email: TEST_EMAIL,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
      status: true
   })
}

async function createDisease() {
   return db.Disease.create({
      icd_code: TEST_DISEASE_CODE,
      name: 'AI Test Disease',
      description: 'AI test disease description'
   })
}

async function loginCookie() {
   const response = await request(app).post('/api/v1/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
   })
   const cookies = response.headers['set-cookie'] || []
   const tokenCookie = cookies.find((item) => item.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

async function clearExplanationCache() {
   const keys = await redis.keys('explanation:*')

   if (keys.length > 0) {
      await redis.del(keys)
   }
}

async function cleanupAIData() {
   const diseases = await db.Disease.findAll({
      attributes: ['id'],
      where: {
         icd_code: TEST_DISEASE_CODE
      }
   })
   const diseaseIds = diseases.map((item) => item.id)

   if (diseaseIds.length > 0) {
      await db.AIExplanation.destroy({
         where: {
            disease_id: {
               [Op.in]: diseaseIds
            }
         }
      })

      await db.Disease.destroy({
         where: {
            id: {
               [Op.in]: diseaseIds
            }
         }
      })
   }

   await db.user.destroy({
      where: { email: TEST_EMAIL },
      force: true,
      paranoid: false
   })

   await clearExplanationCache()
   resetAIClient()
}

function authedGet(path) {
   return request(app).get(path).set('Cookie', cookie)
}

describe('AI explanation API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await redis.ping()
      role = await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupAIData()

      await createUser()
      disease = await createDisease()
      cookie = await loginCookie()
   })

   afterEach(async () => {
      await cleanupAIData()
   })

   it('AI route requires authentication', async () => {
      const response = await request(app).get(
         `/api/v1/ai/explanation/${disease.id}`
      )

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
   })

   it('explanation endpoint validates disease id', async () => {
      const response = await authedGet('/api/v1/ai/explanation/not-a-uuid')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid disease ID')
   })

   it('explanation returns cached explanation when available', async () => {
      const cachedExplanation = {
         disease_id: disease.id,
         locale: 'id',
         overview: 'Cached overview',
         pathophysiology: 'Cached pathophysiology',
         clinical_features: ['cached feature'],
         diagnosis: ['cached diagnosis'],
         management: ['cached management'],
         prevention: ['cached prevention'],
         key_points: ['cached key point']
      }

      await redis.set(
         `explanation:${disease.id}:id`,
         JSON.stringify(cachedExplanation),
         'EX',
         60
      )

      const aiCreate = vi.fn()

      setAIClient({
         chat: {
            completions: {
               create: aiCreate
            }
         }
      })

      const response = await authedGet(`/api/v1/ai/explanation/${disease.id}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject(cachedExplanation)
      expect(aiCreate).not.toHaveBeenCalled()
   })

   it('explanation returns 404 for missing disease', async () => {
      const response = await authedGet(`/api/v1/ai/explanation/${uuidv4()}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Disease not found')
   })

   it('explanation generates and stores explanation when not cached', async () => {
      const explanation = {
         overview: 'Generated overview',
         pathophysiology: 'Generated pathophysiology',
         clinical_features: ['fever'],
         diagnosis: ['clinical exam'],
         management: ['supportive care'],
         prevention: ['hygiene'],
         key_points: ['early recognition']
      }

      const aiCreate = vi.fn(async () => ({
         choices: [
            {
               message: {
                  content: JSON.stringify(explanation)
               }
            }
         ]
      }))

      setAIClient({
         chat: {
            completions: {
               create: aiCreate
            }
         }
      })

      const response = await authedGet(
         `/api/v1/ai/explanation/${disease.id}?locale=en`
      )

      const saved = await db.AIExplanation.findOne({
         where: {
            disease_id: disease.id,
            locale: 'en'
         }
      })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         disease_id: disease.id,
         locale: 'en',
         overview: explanation.overview
      })
      expect(saved).toBeTruthy()
      expect(saved.overview).toBe(explanation.overview)
      expect(aiCreate).toHaveBeenCalledTimes(1)
   })

   it('explanation returns existing database explanation without AI call', async () => {
      await db.AIExplanation.create({
         disease_id: disease.id,
         locale: 'id',
         overview: 'Stored overview',
         pathophysiology: 'Stored pathophysiology',
         clinical_features: ['stored feature'],
         diagnosis: ['stored diagnosis'],
         management: ['stored management'],
         prevention: ['stored prevention'],
         key_points: ['stored key point']
      })

      const aiCreate = vi.fn()

      setAIClient({
         chat: {
            completions: {
               create: aiCreate
            }
         }
      })

      const response = await authedGet(`/api/v1/ai/explanation/${disease.id}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         disease_id: disease.id,
         locale: 'id',
         overview: 'Stored overview'
      })
      expect(aiCreate).not.toHaveBeenCalled()
   })

   it('AI provider failure returns safe error response', async () => {
      setAIClient({
         chat: {
            completions: {
               create: vi.fn(async () => {
                  throw new Error('provider secret failure')
               })
            }
         }
      })

      const response = await authedGet(`/api/v1/ai/explanation/${disease.id}`)

      expect(response.status).toBe(502)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('AI provider failed')
      expect(JSON.stringify(response.body)).not.toContain('provider secret failure')
   })
})
