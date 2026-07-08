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
   'admin-normal@example.test',
   'admin-super@example.test',
   'admin-db-role@example.test'
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
})
