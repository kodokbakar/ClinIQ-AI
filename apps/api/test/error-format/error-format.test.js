process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'error-duplicate@example.test',
   'error-201@example.test'
]

async function ensureUserRole() {
   const [role] = await db.role.findOrCreate({
      where: { name: 'User' },
      defaults: {
         name: 'User',
         is_superadmin: false
      }
   })

   return role
}

async function cleanupUsers() {
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

async function createUser(email) {
   const role = await ensureUserRole()

   return db.user.create({
      name: 'Error Format User',
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
      status: true
   })
}

function expectStandardShape(body) {
   expect(body).toHaveProperty('success')
   expect(body).toHaveProperty('message')
   expect(body).toHaveProperty('metadata')
   expect(body).toHaveProperty('data')
}

describe('error format regression', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupUsers()
      vi.restoreAllMocks()
   })

   afterEach(async () => {
      vi.restoreAllMocks()
      await cleanupUsers()
   })

   it('404 route returns standard response shape', async () => {
      const response = await request(app).get('/api/v1/route-that-does-not-exist')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
         success: false,
         message: 'Route not found',
         data: null
      })
   })

   it('validation error returns success false', async () => {
      const response = await request(app).post('/api/v1/auth').send({
         name: '',
         email: 'bad-email',
         password: '1'
      })

      expect(response.status).toBe(400)
      expectStandardShape(response.body)
      expect(response.body.success).toBe(false)
      expect(response.body.data).toBeNull()
      expect(response.body.message).toBeTruthy()
   })

   it('database unique error returns safe message', async () => {
      await createUser('error-duplicate@example.test')

      vi.spyOn(db.user, 'findOne').mockResolvedValue(null)

      const response = await request(app).post('/api/v1/auth').send({
         name: 'Duplicate DB User',
         email: 'error-duplicate@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(500)
      expectStandardShape(response.body)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Terjadi kesalahan. Silakan coba lagi.')
      expect(response.body.data).toBeNull()
      expect(JSON.stringify(response.body)).not.toContain('SequelizeUniqueConstraintError')
      expect(JSON.stringify(response.body)).not.toContain('stack')
   })

   it('internal error does not leak stack trace', async () => {
      vi.spyOn(db.user, 'findOne').mockRejectedValue(
         new Error('internal secret stack marker')
      )

      const response = await request(app).post('/api/v1/auth/login').send({
         email: 'error-201@example.test',
         password: TEST_PASSWORD
      })

      const body = JSON.stringify(response.body)

      expect(response.status).toBe(500)
      expectStandardShape(response.body)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Internal server error')
      expect(response.body.data).toBeNull()
      expect(body).not.toContain('internal secret stack marker')
      expect(body).not.toContain('at ')
      expect(body).not.toContain('.js:')
   })

   it('successful 201 response returns success true', async () => {
      const response = await request(app).post('/api/v1/auth').send({
         name: 'Created 201 User',
         email: 'error-201@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(201)
      expectStandardShape(response.body)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('success')
      expect(response.body.data).toMatchObject({
         name: 'Created 201 User',
         email: 'error-201@example.test',
         status: true
      })
      expect(response.body.data.password).toBeUndefined()
   })
})
