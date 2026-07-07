'use strict'

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users LIMIT 3;`
    )
    const [vignettes] = await queryInterface.sequelize.query(
      `SELECT id, disease_id FROM quiz_vignettes LIMIT 5;`
    )
    if (!users.length || !vignettes.length) return

    const attemps = []
    for (const user of users) {
      for (const v of vignettes) {
        attemps.push({
          id: uuidv4(),
          user_id: user.id,
          vignette_id: v.id,
          is_correct: Math.random() > 0.5,
          submitted_diagnosis: 'Sample Diagnosis',
          clues_revealed: Math.floor(Math.random() * 3) + 1,
          score: Math.floor(Math.random() * 100),
          attempt_date: new Date().toISOString().split('T')[0],
          created_at: new Date(),
          updated_at: new Date()
        })
      }
    }

    await queryInterface.bulkInsert('quiz_attempts', attemps, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('quiz_attempts', null, {})
  }
}
