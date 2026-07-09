process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const RESET_PASSWORD = 'ResetPassword123'
const TEST_EMAILS = [
   'users-admin@example.test',
   'users-list-1@example.test',
   'users-list-2@example.test',
   'users-create@example.test',
   'users-duplicate@example.test',
   'users-show@example.test',
   'users-update-1@example.test',
   'users-update-2@example.test',
   'users-delete@example.test',
   'users-reset@example.test',
   'users-access@example.test'
]

let userRole
let adminUser
let adminCookie

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

async function createUser({
   email,
   name = 'Users Test User',
   password = TEST_PASSWORD,
   roleId = userRole.id,
   status = true
}) {
   return db.user.create({
      name,
      email,
      password: bcrypt.hashPassword(password),
      role_id: roleId,
      status
   })
}

async function loginCookie(email, password = TEST_PASSWORD) {
   const response = await request(app).post('/api/v1/auth/login').send({
      email,
      password
   })
   const cookies = response.headers['set-cookie'] || []
   const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

function authedGet(path) {
   return request(app).get(path).set('Cookie', adminCookie)
}

function authedPost(path, body) {
   return request(app).post(path).set('Cookie', adminCookie).send(body)
}

function authedPut(path, body) {
   return request(app).put(path).set('Cookie', adminCookie).send(body)
}

function authedDelete(path) {
   return request(app).delete(path).set('Cookie', adminCookie)
}

describe('users API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      userRole = await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupUsers()

      adminUser = await createUser({
         email: 'users-admin@example.test',
         name: 'Users Admin'
      })
      adminCookie = await loginCookie(adminUser.email)
   })

   afterEach(async () => {
      await cleanupUsers()
   })

   it('list users requires authentication', async () => {
      const response = await request(app).get('/api/v1/users')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
   })

   it('list users returns pagination metadata', async () => {
      await createUser({
         email: 'users-list-1@example.test',
         name: 'UsersListMarker One'
      })
      await createUser({
         email: 'users-list-2@example.test',
         name: 'UsersListMarker Two'
      })

      const response = await authedGet('/api/v1/users?q=UsersListMarker&page=1&per_page=1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.metadata).toEqual({
         per_page: 1,
         current_page: 1,
         total_row: 2,
         total_page: 2
      })
   })

   it('create user rejects duplicate email', async () => {
      await createUser({
         email: 'users-duplicate@example.test'
      })

      const response = await authedPost('/api/v1/users', {
         name: 'Duplicate User',
         email: 'users-duplicate@example.test',
         password: TEST_PASSWORD,
         role_id: userRole.id
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Email already exists')
      expect(response.body.data).toBeNull()
   })

   it('create user hashes password', async () => {
      const response = await authedPost('/api/v1/users', {
         name: 'Created User',
         email: 'users-create@example.test',
         password: TEST_PASSWORD,
         role_id: userRole.id
      })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.password).toBeUndefined()

      const savedUser = await db.user.findOne({
         where: { email: 'users-create@example.test' }
      })

      expect(savedUser).toBeTruthy()
      expect(savedUser.password).not.toBe(TEST_PASSWORD)
      expect(bcrypt.compare(TEST_PASSWORD, savedUser.password)).toBe(true)
   })

   it('create user rejects missing role', async () => {
      const response = await authedPost('/api/v1/users', {
         name: 'Missing Role User',
         email: 'users-create@example.test',
         password: TEST_PASSWORD,
         role_id: uuidv4()
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Role does not exist')
      expect(response.body.data).toBeNull()
   })

   it('show user rejects invalid UUID', async () => {
      const response = await authedGet('/api/v1/users/not-a-uuid')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid user ID')
   })

   it('show user returns 404 for missing user', async () => {
      const response = await authedGet(`/api/v1/users/${uuidv4()}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User not found')
   })

   it('update user rejects invalid UUID', async () => {
      const response = await authedPut('/api/v1/users/not-a-uuid', {
         name: 'Invalid Update',
         email: 'users-update-1@example.test'
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid user ID')
   })

   it('update user rejects duplicate email', async () => {
      const firstUser = await createUser({
         email: 'users-update-1@example.test'
      })
      const secondUser = await createUser({
         email: 'users-update-2@example.test'
      })

      const response = await authedPut(`/api/v1/users/${firstUser.id}`, {
         name: 'Duplicate Update',
         email: secondUser.email
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Email already exists')
   })

   it('delete user soft-deletes user', async () => {
      const targetUser = await createUser({
         email: 'users-delete@example.test'
      })

      const response = await authedDelete(`/api/v1/users/${targetUser.id}`)

      const defaultLookup = await db.user.findByPk(targetUser.id)
      const deletedLookup = await db.user.findByPk(targetUser.id, {
         paranoid: false
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBe(true)
      expect(defaultLookup).toBeNull()
      expect(deletedLookup).toBeTruthy()
      expect(deletedLookup.deletedAt).toBeTruthy()
   })

   it('deleted user cannot login', async () => {
      const targetUser = await createUser({
         email: 'users-delete@example.test'
      })

      await authedDelete(`/api/v1/users/${targetUser.id}`)

      const response = await request(app).post('/api/v1/auth/login').send({
         email: 'users-delete@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User is not registered')
   })

   it('reset password rejects weak password', async () => {
      const targetUser = await createUser({
         email: 'users-reset@example.test'
      })

      const response = await authedPost(`/api/v1/users/${targetUser.id}/reset-password`, {
         password: 'weak',
         confirm_password: 'weak'
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBeTruthy()
      expect(response.body.data).toBeNull()
   })

   it('reset password changes password hash', async () => {
      const targetUser = await createUser({
         email: 'users-reset@example.test'
      })

      const oldHash = targetUser.password

      const response = await authedPost(`/api/v1/users/${targetUser.id}/reset-password`, {
         password: RESET_PASSWORD,
         confirm_password: RESET_PASSWORD
      })

      const updatedUser = await db.user.findByPk(targetUser.id)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(updatedUser.password).not.toBe(oldHash)
      expect(bcrypt.compare(RESET_PASSWORD, updatedUser.password)).toBe(true)
   })

   it('new password works after reset', async () => {
      const targetUser = await createUser({
         email: 'users-reset@example.test'
      })

      await authedPost(`/api/v1/users/${targetUser.id}/reset-password`, {
         password: RESET_PASSWORD,
         confirm_password: RESET_PASSWORD
      }).expect(200)

      const response = await request(app).post('/api/v1/auth/login').send({
         email: 'users-reset@example.test',
         password: RESET_PASSWORD
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('users-reset@example.test')
   })

   it('create user rejects superadmin role selection', async () => {
      const [superadminRole] = await db.role.findOrCreate({
         where: {
            name: 'Users Test Superadmin'
         },
         defaults: {
            name: 'Users Test Superadmin',
            is_superadmin: true
         }
      })

      await superadminRole.update({
         is_superadmin: true
      })

      const response = await authedPost('/api/v1/users', {
         name: 'Blocked Superadmin',
         email: 'users-access@example.test',
         password: TEST_PASSWORD,
         role_id: superadminRole.id
      })

      await superadminRole.destroy()

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid select role')
   })

   it('show user returns target user data', async () => {
      const targetUser = await createUser({
         email: 'users-show@example.test',
         name: 'Visible Target User'
      })

      const response = await authedGet(`/api/v1/users/${targetUser.id}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         id: targetUser.id,
         name: 'Visible Target User',
         email: 'users-show@example.test',
         status: true,
         role_id: userRole.id
      })
      expect(response.body.data.password).toBeUndefined()
   })

   it('update user succeeds', async () => {
      const targetUser = await createUser({
         email: 'users-update-1@example.test',
         name: 'Before Update'
      })

      const response = await authedPut(`/api/v1/users/${targetUser.id}`, {
         name: 'After Update',
         email: 'users-update-1@example.test'
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         id: targetUser.id,
         name: 'After Update',
         email: 'users-update-1@example.test',
         status: true
      })
   })

   it('delete user rejects invalid UUID', async () => {
      const response = await authedDelete('/api/v1/users/not-a-uuid')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid user ID')
   })

   it('delete user returns 404 for missing user', async () => {
      const response = await authedDelete(
         '/api/v1/users/99999999-9999-4999-8999-999999999999'
      )

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User not found')
   })

   it('reset password rejects invalid UUID', async () => {
      const response = await authedPost('/api/v1/users/not-a-uuid/reset-password', {
         password: RESET_PASSWORD,
         confirm_password: RESET_PASSWORD
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid user ID')
   })

   it('reset password returns 404 for missing user', async () => {
      const response = await authedPost(
         '/api/v1/users/99999999-9999-4999-8999-999999999999/reset-password',
         {
            password: RESET_PASSWORD,
            confirm_password: RESET_PASSWORD
         }
      )

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User not found')
   })
})
