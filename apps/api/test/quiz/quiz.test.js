process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'
process.env.SKIP_AI_EXPLANATIONS = 'true'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'quiz-user@example.test',
   'quiz-other@example.test'
]
const TEST_CODES = ['T-QUIZ-A', 'T-QUIZ-B']

let users
let quizData

function todayDate() {
   return new Date().toISOString().slice(0, 10)
}

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

async function createUser(email) {
   const role = await ensureUserRole()

   return db.user.create({
      name: email === TEST_EMAILS[0] ? 'Quiz User' : 'Quiz Other',
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
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

async function createVignette({ icdCode, diseaseName, variantName }) {
   const disease = await db.Disease.create({
      icd_code: icdCode,
      name: diseaseName,
      description: `${diseaseName} description`
   })

   const vignette = await db.QuizVignette.create({
      disease_id: disease.id,
      variant_name: variantName
   })

   await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
         db.Clue.create({
            vignette_id: vignette.id,
            clue_number: index + 1,
            content: `${variantName} clue ${index + 1}`,
            type: index === 0 ? 'history' : 'clinical'
         })
      )
   )

   return { disease, vignette }
}

async function seedQuizData() {
   const first = await createVignette({
      icdCode: 'T-QUIZ-A',
      diseaseName: 'Quiz Test Disease A',
      variantName: 'quiz-test-a'
   })

   const second = await createVignette({
      icdCode: 'T-QUIZ-B',
      diseaseName: 'Quiz Test Disease B',
      variantName: 'quiz-test-b'
   })

   return { first, second }
}

async function createAttempt(user, vignette, overrides = {}) {
   return db.QuizAttempt.create({
      user_id: user.id,
      vignette_id: vignette.id,
      clues_revealed: 1,
      attempt_date: todayDate(),
      ...overrides
   })
}

async function createAttemptForVignetteId(user, vignetteId, overrides = {}) {
   const [attempt] = await db.QuizAttempt.findOrCreate({
      where: {
         user_id: user.id,
         vignette_id: vignetteId
      },
      defaults: {
         user_id: user.id,
         vignette_id: vignetteId,
         clues_revealed: 1,
         attempt_date: todayDate(),
         is_correct: true,
         score: 500,
         ...overrides
      }
   })

   return attempt
}

async function attemptAllVignettesExcept(user, excludedVignetteIds = []) {
   const vignettes = await db.QuizVignette.findAll({
      attributes: ['id']
   })

   await Promise.all(
      vignettes
         .filter((vignette) => !excludedVignetteIds.includes(vignette.id))
         .map((vignette) => createAttemptForVignetteId(user, vignette.id))
   )
}

async function cleanupQuizData() {
   const usersToDelete = await db.user.findAll({
      attributes: ['id'],
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      paranoid: false
   })
   const userIds = usersToDelete.map((user) => user.id)

   const diseases = await db.Disease.findAll({
      attributes: ['id'],
      where: {
         icd_code: {
            [Op.in]: TEST_CODES
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
      force: true
   })

}

async function authGet(path, user = users.primary) {
   const cookie = await loginCookie(user.email)

   return request(app).get(path).set('Cookie', cookie)
}

async function authPost(path, body, user = users.primary) {
   const cookie = await loginCookie(user.email)

   return request(app).post(path).set('Cookie', cookie).send(body)
}

describe('quiz API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupQuizData()

      users = {
         primary: await createUser(TEST_EMAILS[0]),
         other: await createUser(TEST_EMAILS[1])
      }
      quizData = await seedQuizData()
   })

   afterEach(async () => {
      await cleanupQuizData()
   })

   it('random quiz requires authentication', async () => {
      const response = await request(app).get('/api/v1/quiz/random')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
   })

   it('random quiz creates an attempt', async () => {
      const response = await authGet('/api/v1/quiz/random')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.attempt_id).toBeTruthy()

      const attempt = await db.QuizAttempt.findByPk(response.body.data.attempt_id)

      expect(attempt).toBeTruthy()
      expect(attempt.user_id).toBe(users.primary.id)
      expect(attempt.clues_revealed).toBe(1)
   })

   it('random quiz returns first clue visible', async () => {
      const response = await authGet('/api/v1/quiz/random')
      const firstClue = response.body.data.clues.find(
         (clue) => clue.clue_number === 1
      )

      expect(response.status).toBe(201)
      expect(firstClue).toBeTruthy()
      expect(firstClue.content).toBeTruthy()
      expect(firstClue.is_revealed).toBe(true)
   })

   it('random quiz hides unrevealed clue content', async () => {
      const response = await authGet('/api/v1/quiz/random')
      const secondClue = response.body.data.clues.find(
         (clue) => clue.clue_number === 2
      )

      expect(response.status).toBe(201)
      expect(secondClue).toBeTruthy()
      expect(secondClue.content).toBeNull()
      expect(secondClue.is_revealed).toBe(false)
   })

   it('random quiz does not include correct disease answer', async () => {
      const response = await authGet('/api/v1/quiz/random')
      const body = JSON.stringify(response.body)

      expect(response.status).toBe(201)
      expect(body).not.toContain(quizData.first.disease.name)
      expect(body).not.toContain(quizData.second.disease.name)
      expect(body).not.toContain(quizData.first.disease.icd_code)
      expect(body).not.toContain(quizData.second.disease.icd_code)
   })

   it('random quiz skips vignettes already attempted by user', async () => {
      await attemptAllVignettesExcept(users.primary, [
         quizData.second.vignette.id
      ])

      const response = await authGet('/api/v1/quiz/random')

      expect(response.status).toBe(201)
      expect(response.body.data.vignette_id).toBe(quizData.second.vignette.id)
   })

   it('random quiz returns friendly empty state when all vignettes are completed', async () => {
      await attemptAllVignettesExcept(users.primary)

      const response = await authGet('/api/v1/quiz/random')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.is_empty).toBe(true)
      expect(response.body.data.message).toBe(
         'No more vignettes available. All completed!'
      )
   })

   it('daily quiz requires authentication', async () => {
      const response = await request(app).get('/api/v1/quiz/daily')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
   })

   it('daily quiz resumes existing attempt for today', async () => {
      const attempt = await createAttempt(users.primary, quizData.first.vignette, {
         clues_revealed: 2,
         attempt_date: todayDate()
      })

      const response = await authGet('/api/v1/quiz/daily')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.attempt_id).toBe(attempt.id)
      expect(response.body.data.clues_revealed).toBe(2)
   })

   it('daily quiz creates new attempt if none exists today', async () => {
      const response = await authGet('/api/v1/quiz/daily')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.attempt_id).toBeTruthy()
      expect(response.body.data.clues_revealed).toBe(1)

      const attempt = await db.QuizAttempt.findByPk(response.body.data.attempt_id)

      expect(attempt).toBeTruthy()
      expect(attempt.user_id).toBe(users.primary.id)
   })

   it('submit diagnosis requires attempt_id and diagnosis', async () => {
      const response = await authPost('/api/v1/quiz/submit-diagnosis', {})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('attempt_id and diagnosis are required')
   })

   it('submit diagnosis rejects attempt owned by another user', async () => {
      const attempt = await createAttempt(users.other, quizData.first.vignette)

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: quizData.first.disease.name
      })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Attempt not found')
   })

   it('submit diagnosis rejects completed attempt', async () => {
      const attempt = await createAttempt(users.primary, quizData.first.vignette, {
         is_correct: true,
         score: 500
      })

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: quizData.first.disease.name
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Attempt already completed')
   })

   it('submit diagnosis marks correct answer as true', async () => {
      const attempt = await createAttempt(users.primary, quizData.first.vignette)

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: quizData.first.disease.name
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.is_correct).toBe(true)
      expect(response.body.data.correct_disease).toEqual({
         name: quizData.first.disease.name,
         icd_code: quizData.first.disease.icd_code
      })
   })

   it('submit diagnosis marks wrong answer as false', async () => {
      const attempt = await createAttempt(
         users.primary,
         quizData.first.vignette,
         {
            clues_revealed: 5
         }
      )

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: 'Wrong Disease'
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.is_correct).toBe(false)
      expect(response.body.data.score).toBe(0)
   })

   it('submit diagnosis assigns score based on clues revealed', async () => {
      const attempt = await createAttempt(users.primary, quizData.first.vignette, {
         clues_revealed: 2
      })

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: quizData.first.disease.name
      })

      expect(response.status).toBe(200)
      expect(response.body.data.is_correct).toBe(true)
      expect(response.body.data.score).toBe(400)
      expect(response.body.data.clues_revealed).toBe(2)
   })

   it('submit diagnosis persists score for leaderboard aggregation', async () => {
      const attempt = await createAttempt(
         users.primary,
         quizData.first.vignette,
         {
            clues_revealed: 1
         }
      )

      const response = await authPost('/api/v1/quiz/submit-diagnosis', {
         attempt_id: attempt.id,
         diagnosis: quizData.first.disease.name
      })

      const savedAttempt = await db.QuizAttempt.findByPk(attempt.id)

      expect(response.status).toBe(200)
      expect(response.body.data.score).toBe(500)
      expect(savedAttempt.score).toBe(500)
      expect(savedAttempt.is_correct).toBe(true)
   })

   it('my attempts returns only current user attempts', async () => {
      const myAttempt = await createAttempt(users.primary, quizData.first.vignette)
      const otherAttempt = await createAttempt(users.other, quizData.second.vignette)

      const response = await authGet('/api/v1/quiz/attempts/me')

      const attemptIds = response.body.data.map((attempt) => attempt.id)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(attemptIds).toContain(myAttempt.id)
      expect(attemptIds).not.toContain(otherAttempt.id)
   })

   it('my attempts returns pagination and all-history aggregate metadata', async () => {
      await createAttempt(users.primary, quizData.first.vignette, {
         is_correct: true,
         score: 500
      })
      await createAttempt(users.primary, quizData.second.vignette, {
         is_correct: false,
         score: 0
      })
      await createAttempt(users.other, quizData.first.vignette, {
         is_correct: true,
         score: 500
      })

      const response = await authGet('/api/v1/quiz/attempts/me?page=1&limit=1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.metadata).toEqual({
         per_page: 1,
         current_page: 1,
         total_row: 2,
         total_page: 2,
         completed_attempts: 2,
         correct_attempts: 1,
         total_score: 500
      })
   })
})
