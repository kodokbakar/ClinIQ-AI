process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'

const { z } = require('zod')

const {
   api,
   sequelizePaginate,
   paginateArray
} = require('../../src/utils/api')
const {
   validateRequest,
   validationFiles
} = require('../../src/utils/validation')
const JWT = require('../../src/utils/jwt')
const { MAX_CLUES, scoreForClues } = require('../../src/utils/quiz')

describe('utility helpers', () => {
   it('api formats successful created response', () => {
      const response = api({ id: 'created-id' }, 201)

      expect(response).toEqual({
         success: true,
         message: 'success',
         metadata: {},
         data: { id: 'created-id' }
      })
   })

   it('api formats object pagination wrapper', () => {
      const response = api(
         {
            count: 2,
            page: 1,
            per_page: 1,
            data: [{ id: 'row-1' }]
         },
         200
      )

      expect(response.success).toBe(true)
      expect(response.metadata).toEqual({
         per_page: 1,
         current_page: 1,
         total_row: 2,
         total_page: 2
      })
      expect(response.data).toEqual([{ id: 'row-1' }])
   })

   it('api formats sequelize pagination wrapper', () => {
      const response = api(
         {
            count: 3,
            rows: [{ id: 'row-2' }]
         },
         200,
         {
            req: {
               query: {
                  page: '2',
                  per_page: '1'
               }
            }
         }
      )

      expect(response.metadata).toEqual({
         per_page: 1,
         current_page: 2,
         total_row: 3,
         total_page: 3
      })
      expect(response.data).toEqual([{ id: 'row-2' }])
   })

   it('api hides generic internal error messages', () => {
      const response = api(null, 500, {
         err: new Error('secret internal detail')
      })

      expect(response.success).toBe(false)
      expect(response.message).toBe('Internal server error')
      expect(JSON.stringify(response)).not.toContain('secret internal detail')
   })

   it('api formats zod validation error', () => {
      const schema = z.object({
         email: z.email('Invalid email')
      })

      let error
      try {
         schema.parse({ email: 'bad-email' })
      } catch (err) {
         error = err
      }

      const response = api(null, 400, { err: error })

      expect(response.success).toBe(false)
      expect(response.message).toContain('email')
      expect(response.data).toBeNull()
   })

   it('sequelizePaginate returns limit and offset', () => {
      expect(sequelizePaginate(3, 10)).toEqual({
         offset: 20,
         limit: 10
      })
   })

   it('paginateArray returns selected page', () => {
      expect(paginateArray([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
   })

   it('validateRequest returns parsed body', () => {
      const schema = z.object({
         name: z.string().min(1)
      })

      const result = validateRequest(schema, {
         body: {
            name: 'ClinIQ'
         }
      })

      expect(result).toEqual({
         name: 'ClinIQ'
      })
   })

   it('validateRequest sets bad request code for zod error', () => {
      const schema = z.object({
         name: z.string().min(1)
      })

      try {
         validateRequest(schema, {
            body: {
               name: ''
            }
         })
         throw new Error('Expected validation to fail')
      } catch (err) {
         expect(err.code).toBe(400)
      }
   })

   it('validationFiles allows empty files', () => {
      expect(validationFiles(null, [])).toBe(true)
      expect(validationFiles({}, [])).toBe(true)
   })

   it('validationFiles accepts jpg alias for jpeg files', () => {
      const result = validationFiles(
         {
            avatar: {
               mimetype: 'image/jpeg',
               size: 100
            }
         },
         [
            {
               name: 'avatar',
               allowed_mimes: ['jpg'],
               max_size: 1024
            }
         ]
      )

      expect(result).toBe(true)
   })

   it('validationFiles rejects invalid mime', () => {
      try {
         validationFiles(
            {
               avatar: {
                  mimetype: 'text/plain',
                  size: 100
               }
            },
            [
               {
                  name: 'avatar',
                  allowed_mimes: ['png'],
                  max_size: 1024
               }
            ]
         )
         throw new Error('Expected mime validation to fail')
      } catch (err) {
         expect(err.code).toBe(400)
         expect(err.message).toContain('Format file avatar')
      }
   })

   it('validationFiles rejects oversized file', () => {
      try {
         validationFiles(
            {
               avatar: {
                  mimetype: 'image/png',
                  size: 2048
               }
            },
            [
               {
                  name: 'avatar',
                  allowed_mimes: ['png'],
                  max_size: 1024
               }
            ]
         )
         throw new Error('Expected size validation to fail')
      } catch (err) {
         expect(err.code).toBe(400)
         expect(err.message).toContain('Ukuran file avatar')
      }
   })

   it('jwt decodeToken decodes token payload', () => {
      const token = JWT.generateToken({
         id: 'user-id',
         email: 'jwt@example.test'
      })

      const decoded = JWT.decodeToken(token)

      expect(decoded).toMatchObject({
         id: 'user-id',
         email: 'jwt@example.test'
      })
   })

   it('quiz score constants stay stable', () => {
      expect(MAX_CLUES).toBe(5)
      expect(scoreForClues(1)).toBe(500)
      expect(scoreForClues(2)).toBe(400)
      expect(scoreForClues(5)).toBe(100)
      expect(scoreForClues(99)).toBe(0)
   })
})
