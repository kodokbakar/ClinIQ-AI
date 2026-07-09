process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')

const app = require('../../index')

const OLD_NODE_ENV = process.env.NODE_ENV
const OLD_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS

function restoreEnv() {
   process.env.NODE_ENV = OLD_NODE_ENV || 'local'
   process.env.ALLOWED_ORIGINS = OLD_ALLOWED_ORIGINS || '*'
}

describe('CORS', () => {
   afterEach(() => {
      restoreEnv()
   })

   it('local mode allows origin when wildcard is explicit', async () => {
      process.env.NODE_ENV = 'local'
      process.env.ALLOWED_ORIGINS = '*'

      const response = await request(app)
         .get('/api/status')
         .set('Origin', 'http://localhost:3000')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(
         'http://localhost:3000'
      )
      expect(response.headers['access-control-allow-credentials']).toBe('true')
   })

   it('non-local mode allows configured origin', async () => {
      process.env.NODE_ENV = 'production'
      process.env.ALLOWED_ORIGINS = 'https://cliniq.example.com'

      const response = await request(app)
         .get('/api/status')
         .set('Origin', 'https://cliniq.example.com')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(
         'https://cliniq.example.com'
      )
      expect(response.headers['access-control-allow-credentials']).toBe('true')
   })

   it('non-local mode rejects unconfigured origin', async () => {
      process.env.NODE_ENV = 'production'
      process.env.ALLOWED_ORIGINS = 'https://cliniq.example.com'

      const response = await request(app)
         .get('/api/status')
         .set('Origin', 'https://evil.example.com')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
      expect(response.headers['access-control-allow-credentials']).toBeUndefined()
   })

   it('non-local mode rejects wildcard origin', async () => {
      process.env.NODE_ENV = 'production'
      process.env.ALLOWED_ORIGINS = '*'

      const response = await request(app)
         .get('/api/status')
         .set('Origin', 'https://cliniq.example.com')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
      expect(response.headers['access-control-allow-credentials']).toBeUndefined()
   })
})
