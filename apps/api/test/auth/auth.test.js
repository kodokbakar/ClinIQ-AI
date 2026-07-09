process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')
const jwt = require('jsonwebtoken')

const TEST_PASSWORD = 'Password123'
const NEW_PASSWORD = 'NewPassword123'
const TEST_EMAILS = [
   'auth-register@example.test',
   'auth-register-hidden@example.test',
   'auth-login@example.test',
   'auth-inactive@example.test',
   'auth-password@example.test',
   'auth-unknown@example.test'
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
      force: true
   })
}

async function createUser({ email, status = true, password = TEST_PASSWORD }) {
   const role = await ensureUserRole()

   return db.user.create({
      name: 'Auth Test User',
      email,
      password: bcrypt.hashPassword(password),
      role_id: role.id,
      status
   })
}

async function login(email, password = TEST_PASSWORD) {
   return request(app).post('/api/v1/auth/login').send({
      email,
      password
   })
}

async function loginCookie(email, password = TEST_PASSWORD) {
   const response = await login(email, password)

   return tokenCookieFrom(response)
}

function tokenCookieFrom(response) {
   const cookies = response.headers['set-cookie'] || []
   const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

describe('auth API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupUsers()
   })

   afterAll(async () => {
      await cleanupUsers()
   })

   it('registers a user successfully', async () => {
      const response = await request(app).post('/api/v1/auth').send({
         name: 'Auth Register',
         email: 'auth-register@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('success')
      expect(response.body.data).toMatchObject({
         name: 'Auth Register',
         email: 'auth-register@example.test',
         status: true
      })
      expect(response.body.data.id).toBeTruthy()
      expect(response.body.data.role_id).toBeTruthy()

      const savedUser = await db.user.findOne({
         where: { email: 'auth-register@example.test' }
      })

      expect(savedUser).toBeTruthy()
      expect(savedUser.email).toBe('auth-register@example.test')
      expect(bcrypt.compare(TEST_PASSWORD, savedUser.password)).toBe(true)
   })

   it('register rejects duplicate email', async () => {
      await createUser({ email: 'auth-register@example.test' })

      const response = await request(app).post('/api/v1/auth').send({
         name: 'Duplicate User',
         email: 'auth-register@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User already registered')
      expect(response.body.data).toBeNull()
   })

   it('register rejects invalid payload', async () => {
      const response = await request(app).post('/api/v1/auth').send({
         name: '',
         email: 'not-an-email',
         password: '123'
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBeTruthy()
      expect(response.body.data).toBeNull()
   })

   it('register does not expose password hash', async () => {
      const response = await request(app).post('/api/v1/auth').send({
         name: 'Hidden Password User',
         email: 'auth-register-hidden@example.test',
         password: TEST_PASSWORD
      })

      expect(response.status).toBe(201)
      expect(response.body.data.password).toBeUndefined()
      expect(JSON.stringify(response.body)).not.toContain('$2')
      expect(JSON.stringify(response.body)).not.toContain(TEST_PASSWORD)
   })

   it('login successfully with valid email/password', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const response = await login('auth-login@example.test')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         email: 'auth-login@example.test',
         name: 'Auth Test User',
         is_superadmin: false
      })
      expect(response.body.data.id).toBeTruthy()
      expect(response.body.data.password).toBeUndefined()
   })

   it('login sets httpOnly token cookie', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const response = await login('auth-login@example.test')
      const cookies = response.headers['set-cookie'] || []

      expect(response.status).toBe(200)
      expect(cookies.some((cookie) => cookie.startsWith('token='))).toBe(true)
      expect(cookies.some((cookie) => cookie.includes('HttpOnly'))).toBe(true)
   })

   it('login token includes expiration claim', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const response = await login('auth-login@example.test')
      const cookie = tokenCookieFrom(response)
      const token = cookie.replace('token=', '')
      const decoded = jwt.decode(token)

      expect(response.status).toBe(200)
      expect(decoded.exp).toBeTruthy()
      expect(decoded.iat).toBeTruthy()
      expect(decoded.exp).toBeGreaterThan(decoded.iat)
   })

   it('jwt helper falls back to default expiration for invalid env value', async () => {
      const OLD_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN
      process.env.JWT_EXPIRES_IN = 'banana'

      delete require.cache[require.resolve('../../src/utils/jwt')]
      const JwtHelper = require('../../src/utils/jwt')

      const token = JwtHelper.generateToken({ id: 'jwt-test-user' })
      const decoded = JwtHelper.decodeToken(token)

      process.env.JWT_EXPIRES_IN = OLD_JWT_EXPIRES_IN
      delete require.cache[require.resolve('../../src/utils/jwt')]

      expect(decoded.exp).toBeTruthy()
      expect(decoded.exp).toBeGreaterThan(decoded.iat)
   })

   it('login rejects unknown email', async () => {
      const response = await login('auth-unknown@example.test')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User is not registered')
      expect(response.body.data).toBeNull()
   })

   it('login rejects wrong password', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const response = await login('auth-login@example.test', 'WrongPassword123')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid email or password')
      expect(response.body.data).toBeNull()
   })

   it('login rejects inactive user', async () => {
      await createUser({
         email: 'auth-inactive@example.test',
         status: false
      })

      const response = await login('auth-inactive@example.test')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User is not active')
      expect(response.body.data).toBeNull()
   })

   it('GET /api/v1/auth/me rejects missing token', async () => {
      const response = await request(app).get('/api/v1/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
      expect(response.body.data).toBeNull()
   })

   it('GET /api/v1/auth/me rejects invalid token', async () => {
      const response = await request(app)
         .get('/api/v1/auth/me')
         .set('Cookie', 'token=invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, invalid token')
      expect(response.body.data).toBeNull()
   })

   it('GET /api/v1/auth/me returns current user with valid cookie', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const cookie = await loginCookie('auth-login@example.test')
      const response = await request(app)
         .get('/api/v1/auth/me')
         .set('Cookie', cookie)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
         email: 'auth-login@example.test',
         name: 'Auth Test User',
         status: true
      })
      expect(response.body.data.role).toMatchObject({
         name: 'User'
      })
      expect(response.body.data.password).toBeUndefined()
   })

   it('logout clears token cookie', async () => {
      await createUser({ email: 'auth-login@example.test' })

      const cookie = await loginCookie('auth-login@example.test')
      const response = await request(app)
         .post('/api/v1/auth/logout')
         .set('Cookie', cookie)

      const cookies = response.headers['set-cookie'] || []

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBe(true)
      expect(cookies.some((item) => item.startsWith('token=;'))).toBe(true)
   })

   it('change password succeeds with correct old password', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')
      const response = await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: TEST_PASSWORD,
            new_password: NEW_PASSWORD,
            confirm_password: NEW_PASSWORD
         })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBe(true)

      const savedUser = await db.user.findOne({
         where: { email: 'auth-password@example.test' }
      })

      expect(bcrypt.compare(NEW_PASSWORD, savedUser.password)).toBe(true)
   })

   it('change password rejects wrong old password', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')
      const response = await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: 'WrongPassword123',
            new_password: NEW_PASSWORD,
            confirm_password: NEW_PASSWORD
         })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Old password is incorrect')
      expect(response.body.data).toBeNull()
   })

   it('change password rejects weak new password', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')
      const response = await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: TEST_PASSWORD,
            new_password: 'weakpass',
            confirm_password: 'weakpass'
         })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBeTruthy()
      expect(response.body.data).toBeNull()
   })

   it('change password rejects same old/new password', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')
      const response = await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: TEST_PASSWORD,
            new_password: TEST_PASSWORD,
            confirm_password: TEST_PASSWORD
         })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe(
         'New password must be different from old password'
      )
      expect(response.body.data).toBeNull()
   })

   it('old password no longer works after change', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')

      await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: TEST_PASSWORD,
            new_password: NEW_PASSWORD,
            confirm_password: NEW_PASSWORD
         })
         .expect(200)

      const response = await login('auth-password@example.test', TEST_PASSWORD)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid email or password')
   })

   it('new password works after change', async () => {
      await createUser({ email: 'auth-password@example.test' })

      const cookie = await loginCookie('auth-password@example.test')

      await request(app)
         .put('/api/v1/auth/change-password')
         .set('Cookie', cookie)
         .send({
            old_password: TEST_PASSWORD,
            new_password: NEW_PASSWORD,
            confirm_password: NEW_PASSWORD
         })
         .expect(200)

      const response = await login('auth-password@example.test', NEW_PASSWORD)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('auth-password@example.test')
      expect(tokenCookieFrom(response)).toContain('token=')
   })
})
