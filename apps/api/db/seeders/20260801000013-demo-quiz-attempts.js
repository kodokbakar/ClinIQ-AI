'use strict'

const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { clinicalCases } = require('../data/demo-clinical-cases')
const {
  demoLearnerEmails
} = require('../data/demo-presentation-data')

function dateDaysAgo(days) {
  const date = new Date()

  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)

  return date
}

async function getSeedTargets(queryInterface) {
  const [users] = await queryInterface.sequelize.query(
    `
         SELECT id, email
         FROM users
         WHERE email IN (:emails)
      `,
    {
      replacements: {
        emails: demoLearnerEmails
      }
    }
  )

  const [vignettes] = await queryInterface.sequelize.query(
    `
         SELECT
            quiz_vignettes.id,
            diseases.icd_code,
            diseases.name AS disease_name
         FROM quiz_vignettes
         INNER JOIN diseases
            ON diseases.id = quiz_vignettes.disease_id
         WHERE diseases.icd_code IN (:icdCodes)
         ORDER BY diseases.icd_code ASC, quiz_vignettes.id ASC
      `,
    {
      replacements: {
        icdCodes: clinicalCases.map(
          (clinicalCase) => clinicalCase.icdCode
        )
      }
    }
  )

  return {
    users,
    vignettes
  }
}

async function deleteDemoAttempts(queryInterface, users, vignettes) {
  const userIds = users.map((user) => user.id)
  const vignetteIds = vignettes.map((vignette) => vignette.id)

  if (userIds.length === 0 || vignetteIds.length === 0) return

  await queryInterface.bulkDelete(
    'quiz_attempts',
    {
      user_id: {
        [Op.in]: userIds
      },
      vignette_id: {
        [Op.in]: vignetteIds
      }
    },
    {}
  )
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { users, vignettes } = await getSeedTargets(queryInterface)

    if (users.length === 0 || vignettes.length === 0) return

    await deleteDemoAttempts(queryInterface, users, vignettes)

    const usersByEmail = new Map(
      users.map((user) => [user.email, user])
    )
    const attempts = []

    demoLearnerEmails.forEach((email, userIndex) => {
      const user = usersByEmail.get(email)

      if (!user) return

      const attemptCount = Math.min(
        vignettes.length,
        8 + (userIndex % 8)
      )

      for (let attemptIndex = 0; attemptIndex < attemptCount; attemptIndex += 1) {
        const vignetteIndex =
          (userIndex + attemptIndex) % vignettes.length
        const vignette = vignettes[vignetteIndex]
        const cluesRevealed =
          ((userIndex + attemptIndex) % 5) + 1
        const incorrectEvery = 4 + (userIndex % 4)
        const isCorrect =
          (attemptIndex + userIndex + 1) % incorrectEvery !== 0
        const daysAgo =
          (attemptIndex * 2 + userIndex) % 28
        const createdAt = dateDaysAgo(daysAgo)

        attempts.push({
          id: uuidv4(),
          user_id: user.id,
          vignette_id: vignette.id,
          is_correct: isCorrect,
          submitted_diagnosis: isCorrect
            ? vignette.disease_name
            : 'Diagnosis banding lain',
          clues_revealed: cluesRevealed,
          score: isCorrect ? (6 - cluesRevealed) * 100 : 0,
          attempt_date: createdAt.toISOString().slice(0, 10),
          created_at: createdAt,
          updated_at: createdAt
        })
      }
    })

    if (attempts.length > 0) {
      await queryInterface.bulkInsert('quiz_attempts', attempts, {})
    }
  },

  async down(queryInterface) {
    const { users, vignettes } = await getSeedTargets(queryInterface)

    await deleteDemoAttempts(queryInterface, users, vignettes)
  }
}