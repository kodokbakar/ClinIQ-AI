'use strict'

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [vignettes] = await queryInterface.sequelize.query(
      `SELECT id FROM quiz_vignettes;`
    )
    if (!vignettes.length) return

    const clues = []
    for (const v of vignettes) {
      clues.push(
        {
          id: uuidv4(),
          vignette_id: v.id,
          clue_number: 1,
          content: 'Demographic clue: patient is a 45-year-old male.',
          type: 'demographic',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          vignette_id: v.id,
          clue_number: 2,
          content: 'Symptom clue: presents with chronic cough and fever.',
          type: 'symptom',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          vignette_id: v.id,
          clue_number: 3,
          content: 'Diagnostic clue: lab results show elevated WBC count.',
          type: 'diagnostic',
          created_at: new Date(),
          updated_at: new Date()
        }
      )
    }

    await queryInterface.bulkInsert('clues', clues, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('clues', null, {})
  }
}
