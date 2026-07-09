process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')
const { setAIClient, resetAIClient } = require('../../src/config/ai')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'admin-normal@example.test',
   'admin-super@example.test',
   'admin-db-role@example.test'
]
const TEST_DISEASE_CODES = [
   'T-ADMIN-001',
   'T-ADMIN-002'
]

let normalRole
let superadminRole

async function ensureRoles() {
   const [userRole] = await db.role.findOrCreate({
      where: { name: 'User' },
      defaults: {
         name: 'User',
         is_superadmin: false
      }
   })

   const [adminRole] = await db.role.findOrCreate({
      where: { name: 'Superadmin' },
      defaults: {
         name: 'Superadmin',
         is_superadmin: true
      }
   })

   await userRole.update({ is_superadmin: false })
   await adminRole.update({ is_superadmin: true })

   normalRole = userRole
   superadminRole = adminRole
}

async function cleanupUsers() {
   await db.Disease.destroy({
      where: {
         icd_code: {
            [Op.in]: TEST_DISEASE_CODES
         }
      }
   })

   resetAIClient()
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

async function createUser({ email, roleId, name = 'Admin Test User' }) {
   return db.user.create({
      name,
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: roleId,
      status: true
   })
}

async function loginCookie(email) {
   const response = await request(app).post('/api/v1/auth/login').send({
      email,
      password: TEST_PASSWORD
   })
   const cookies = response.headers['set-cookie'] || []
   const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

describe('admin API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await ensureRoles()
   })

   beforeEach(async () => {
      await cleanupUsers()
      await ensureRoles()
   })

   afterEach(async () => {
      await cleanupUsers()
   })

   it('admin route requires authentication', async () => {
      const response = await request(app).get('/api/v1/admin/me')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
   })

   it('admin route rejects normal user', async () => {
      const user = await createUser({
         email: 'admin-normal@example.test',
         roleId: normalRole.id
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .get('/api/v1/admin/me')
         .set('Cookie', cookie)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Forbidden: Insufficient permissions')
   })

   it('admin route allows superadmin', async () => {
      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id,
         name: 'Super Admin'
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .get('/api/v1/admin/me')
         .set('Cookie', cookie)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         id: user.id,
         name: 'Super Admin',
         email: 'admin-super@example.test',
         is_superadmin: true
      })
   })

   it('superadmin role is detected through role.is_superadmin', async () => {
      await superadminRole.update({ is_superadmin: false })

      const user = await createUser({
         email: 'admin-db-role@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      await superadminRole.update({ is_superadmin: true })

      const response = await request(app)
         .get('/api/v1/admin/me')
         .set('Cookie', cookie)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.is_superadmin).toBe(true)
   })

   it('admin response does not expose sensitive fields', async () => {
      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .get('/api/v1/admin/me')
         .set('Cookie', cookie)

      const body = JSON.stringify(response.body)

      expect(response.status).toBe(200)
      expect(body).not.toContain('password')
      expect(body).not.toContain('token')
      expect(body).not.toContain(user.password)
      expect(response.body.data.role_id).toBeUndefined()
   })

   it('admin upload ICD rejects missing CSV file', async () => {
      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .post('/api/v1/admin/icd/upload')
         .set('Cookie', cookie)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('CSV file is required')
   })

   it('admin upload ICD creates diseases from CSV', async () => {
      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const csv = [
         'icd_code,name,description',
         'T-ADMIN-001,Admin Test Disease,Admin description'
      ].join('\n')

      const response = await request(app)
         .post('/api/v1/admin/icd/upload')
         .set('Cookie', cookie)
         .attach('file', Buffer.from(csv), {
            filename: 'icd.csv',
            contentType: 'text/csv'
         })

      const disease = await db.Disease.findOne({
         where: {
            icd_code: 'T-ADMIN-001'
         }
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.created).toBe(1)
      expect(response.body.data.updated).toBe(0)
      expect(disease).toBeTruthy()
      expect(disease.name).toBe('Admin Test Disease')
   })

   it('admin upload ICD updates existing disease from CSV', async () => {
      await db.Disease.create({
         icd_code: 'T-ADMIN-002',
         name: 'Old Admin Disease',
         description: 'Old description'
      })

      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const csv = [
         'icd_code,name,description',
         'T-ADMIN-002,Updated Admin Disease,Updated description'
      ].join('\n')

      const response = await request(app)
         .post('/api/v1/admin/icd/upload')
         .set('Cookie', cookie)
         .attach('file', Buffer.from(csv), {
            filename: 'icd.csv',
            contentType: 'text/csv'
         })

      const disease = await db.Disease.findOne({
         where: {
            icd_code: 'T-ADMIN-002'
         }
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.created).toBe(0)
      expect(response.body.data.updated).toBe(1)
      expect(disease.name).toBe('Updated Admin Disease')
   })

   it('admin generate vignette validates disease_id', async () => {
      setAIClient({
         chat: {
            completions: {
               create: vi.fn()
            }
         }
      })

      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .post('/api/v1/admin/vignettes/generate')
         .set('Cookie', cookie)
         .send({})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('disease_id is required')
   })

   it('admin generate vignette returns 404 for missing disease', async () => {
      setAIClient({
         chat: {
            completions: {
               create: vi.fn()
            }
         }
      })

      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const response = await request(app)
         .post('/api/v1/admin/vignettes/generate')
         .set('Cookie', cookie)
         .send({
            disease_id: '0bd3381d-77b9-460e-b1aa-fb1b534d4fb4'
         })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Disease not found')
   })

   it('admin bulk generate returns 503 when AI is not configured', async () => {
      resetAIClient()

      const user = await createUser({
         email: 'admin-super@example.test',
         roleId: superadminRole.id
      })
      const cookie = await loginCookie(user.email)

      const oldBaseUrl = process.env.AI_BASE_URL
      const oldApiKey = process.env.AI_API_KEY

      delete process.env.AI_BASE_URL
      delete process.env.AI_API_KEY

      const response = await request(app)
         .post('/api/v1/admin/vignettes/bulk')
         .set('Cookie', cookie)
         .send({
            limit: 1
         })

      process.env.AI_BASE_URL = oldBaseUrl
      process.env.AI_API_KEY = oldApiKey

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('AI service not configured')
   })
})
