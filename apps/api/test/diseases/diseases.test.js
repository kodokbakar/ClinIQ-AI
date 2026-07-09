process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const redis = require('../../config/redis')

const TEST_CODES = [
   'T-ZZ-001',
   'T-ZZ-002',
   'T-ZZ-003',
   'T-SHAPE-001',
   'T-CACHE-001',
   ...Array.from({ length: 12 }, (_, index) => `T-LIMIT-${index + 1}`),
   ...Array.from({ length: 30 }, (_, index) => `T-CAP-${index + 1}`)
]

async function cleanupDiseases() {
   await db.Disease.destroy({
      where: {
         icd_code: {
            [Op.in]: TEST_CODES
         }
      }
   })

   await clearDiseaseSearchCache()
}

async function clearDiseaseSearchCache() {
   const keys = await redis.keys('diseases:search:*')
   if (keys.length > 0) {
      await redis.del(keys)
   }
}

async function seedDisease(overrides) {
   return db.Disease.create({
      icd_code: overrides.icd_code,
      name: overrides.name,
      description: overrides.description || null
   })
}

async function seedDiseases() {
   await seedDisease({
      icd_code: 'T-ZZ-001',
      name: 'Zztest Fever Alpha'
   })
   await seedDisease({
      icd_code: 'T-ZZ-002',
      name: 'Alpha Zztest Condition'
   })
   await seedDisease({
      icd_code: 'T-ZZ-003',
      name: 'Unrelated Test Disease'
   })
   await seedDisease({
      icd_code: 'T-SHAPE-001',
      name: 'Shapezz Disease'
   })
   await seedDisease({
      icd_code: 'T-CACHE-001',
      name: 'Cachezz Disease'
   })

   await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
         seedDisease({
            icd_code: `T-LIMIT-${index + 1}`,
            name: `Limitzz Disease ${String(index + 1).padStart(2, '0')}`
         })
      )
   )

   await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
         seedDisease({
            icd_code: `T-CAP-${index + 1}`,
            name: `Capzz Disease ${String(index + 1).padStart(2, '0')}`
         })
      )
   )
}

async function search(query) {
   return request(app).get('/api/v1/diseases/search').query(query)
}

describe('diseases search API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await redis.ping()
   })

   beforeEach(async () => {
      await cleanupDiseases()
      await seedDiseases()
   })

   afterEach(async () => {
      await cleanupDiseases()
   })

   it('returns empty array when q length is less than 2', async () => {
      const response = await search({ q: 'z' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual([])
   })

   it('returns matching diseases by prefix', async () => {
      const response = await search({ q: 'zztest' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data[0]).toMatchObject({
         icd_code: 'T-ZZ-001',
         name: 'Zztest Fever Alpha'
      })
   })

   it('returns matching diseases by contains search', async () => {
      const response = await search({ q: 'zztest' })
      const names = response.body.data.map((disease) => disease.name)

      expect(response.status).toBe(200)
      expect(names).toContain('Alpha Zztest Condition')
   })

   it('limits result count by default', async () => {
      const response = await search({ q: 'limitzz' })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(10)
   })

   it('caps limit at 25', async () => {
      const response = await search({ q: 'capzz', limit: 999 })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(25)
   })

   it('returns only id, icd_code, and name', async () => {
      const response = await search({ q: 'shapezz' })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(Object.keys(response.body.data[0]).sort()).toEqual([
         'icd_code',
         'id',
         'name'
      ])
   })

   it('returns cache MISS on first request', async () => {
      await clearDiseaseSearchCache()

      const response = await search({ q: 'cachezz' })

      expect(response.status).toBe(200)
      expect(response.body.meta).toEqual({ 'X-Cache': 'MISS' })
   })

   it('returns cache HIT on repeated request', async () => {
      await clearDiseaseSearchCache()

      await search({ q: 'cachezz' })
      const response = await search({ q: 'cachezz' })

      expect(response.status).toBe(200)
      expect(response.body.meta).toEqual({ 'X-Cache': 'HIT' })
   })

   it('search query with quotes or SQL-like input does not crash', async () => {
      const response = await search({
         q: 'zztest%\' OR 1=1 --'
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
   })

   it('rejects overly long search query', async () => {
      const response = await search({
         q: 'a'.repeat(101)
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Search query is too long')
   })

   it('returns generic error message when search fails', async () => {
      const spy = vi.spyOn(db.Disease, 'findAll').mockRejectedValue(
         new Error('secret database detail')
      )

      const response = await search({ q: 'zztest' })

      spy.mockRestore()

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Search failed')
      expect(JSON.stringify(response.body)).not.toContain('secret database detail')
   })
})
