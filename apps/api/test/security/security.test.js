process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'security-user@example.test',
   'security-other@example.test'
]
const TEST_DISEASE_CODES = ['T-SEC-001']

let role
let users

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

async function createUser(email, name) {
   return db.user.create({
      name,
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
      status: true
   })
}

async function login(email, password = TEST_PASSWORD) {
   return request(app).post('/api/v1/auth/login').send({
      email,
      password
   })
}

async function loginCookie(email) {
   const response = await login(email)
   const cookies = response.headers['set-cookie'] || []
   const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

async function createDiseaseQuizAttemptForOtherUser() {
   const disease = await db.Disease.create({
      icd_code: 'T-SEC-001',
      name: 'Security Test Disease',
      description: 'Security test disease'
   })

   const vignette = await db.QuizVignette.create({
      disease_id: disease.id,
      variant_name: 'security-vignette'
   })

   await db.Clue.create({
      vignette_id: vignette.id,
      clue_number: 1,
      content: 'Security clue 1',
      type: 'history'
   })

   const attempt = await db.QuizAttempt.create({
      user_id: users.other.id,
      vignette_id: vignette.id,
      clues_revealed: 1,
      attempt_date: new Date().toISOString().slice(0, 10)
   })

   return attempt
}

async function cleanupSecurityData() {
   const testUsers = await db.user.findAll({
      attributes: ['id'],
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      paranoid: false
   })
   const userIds = testUsers.map((user) => user.id)

   const diseases = await db.Disease.findAll({
      attributes: ['id'],
      where: {
         icd_code: {
            [Op.in]: TEST_DISEASE_CODES
         }
      }
   })
   const diseaseIds = diseases.map((disease) => disease.id)

   const vignettes = diseaseIds.length > 0
      ? await db.QuizVignette.findAll({
         attributes: ['id'],
         where: {
            disease_id: {
               [Op.in]: diseaseIds
            }
         }
      })
      : []
   const vignetteIds = vignettes.map((vignette) => vignette.id)

   if (userIds.length > 0 || vignetteIds.length > 0) {
      await db.QuizAttempt.destroy({
         where: {
            [Op.or]: [
               userIds.length > 0 ? { user_id: { [Op.in]: userIds } } : null,
               vignetteIds.length > 0 ? { vignette_id: { [Op.in]: vignetteIds } } : null
            ].filter(Boolean)
         }
      })
   }

   if (vignetteIds.length > 0) {
      await db.Clue.destroy({
         where: {
            vignette_id: {
               [Op.in]: vignetteIds
            }
         }
      })

      await db.QuizVignette.destroy({
         where: {
            id: {
               [Op.in]: vignetteIds
            }
         }
      })
   }

   if (diseaseIds.length > 0) {
      await db.Disease.destroy({
         where: {
            id: {
               [Op.in]: diseaseIds
            }
         }
      })
   }

   await db.user.destroy({
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      force: true,
      paranoid: false
   })
}

describe('security regression', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      role = await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupSecurityData()

      users = {
         primary: await createUser(
            'security-user@example.test',
            'Security User'
         ),
         other: await createUser(
            'security-other@example.test',
            'Security Other'
         )
      }
   })

   afterEach(async () => {
      await cleanupSecurityData()
   })

   it('auth cookie is httpOnly', async () => {
      const response = await login(users.primary.email)
      const cookies = response.headers['set-cookie'] || []

      expect(response.status).toBe(200)
      expect(cookies.some((cookie) => cookie.includes('HttpOnly'))).toBe(true)
   })

   it('auth cookie uses SameSite=None', async () => {
      const response = await login(users.primary.email)
      const cookies = response.headers['set-cookie'] || []

      expect(response.status).toBe(200)
      expect(cookies.some((cookie) => cookie.includes('SameSite=None'))).toBe(true)
   })

   it('auth cookie uses Secure', async () => {
      const response = await login(users.primary.email)
      const cookies = response.headers['set-cookie'] || []

      expect(response.status).toBe(200)
      expect(cookies.some((cookie) => cookie.includes('Secure'))).toBe(true)
   })

   it('password hash is never returned by auth responses', async () => {
      const loginResponse = await login(users.primary.email)
      const cookie = await loginCookie(users.primary.email)

      const meResponse = await request(app)
         .get('/api/v1/auth/me')
         .set('Cookie', cookie)

      const loginBody = JSON.stringify(loginResponse.body)
      const meBody = JSON.stringify(meResponse.body)

      expect(loginResponse.status).toBe(200)
      expect(meResponse.status).toBe(200)
      expect(loginResponse.body.data.password).toBeUndefined()
      expect(meResponse.body.data.password).toBeUndefined()
      expect(loginBody).not.toContain(users.primary.password)
      expect(meBody).not.toContain(users.primary.password)
      expect(loginBody).not.toContain('$2')
      expect(meBody).not.toContain('$2')
   })

   it('invalid JWT returns 401', async () => {
      const response = await request(app)
         .get('/api/v1/auth/me')
         .set('Cookie', 'token=invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, invalid token')
   })

   it('expired JWT returns 401', async () => {
      const token = jwt.sign(
         {
            id: users.primary.id,
            email: users.primary.email,
            name: users.primary.name
         },
         process.env.JWT_KEY,
         { expiresIn: '-1s' }
      )

      const response = await request(app)
         .get('/api/v1/auth/me')
         .set('Cookie', `token=${token}`)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token expired')
   })

   it('SQL-like search input does not crash disease search', async () => {
      const response = await request(app)
         .get('/api/v1/diseases/search')
         .query({
            q: 'security%\\' OR 1=1 --'
         })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
   })
})
