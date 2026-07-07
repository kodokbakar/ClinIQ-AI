'use strict'

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [diseases] = await queryInterface.sequelize.query(
      `SELECT id, name FROM diseases LIMIT 10;`
    )
    if (!diseases.length) return

    const vignettes = diseases.map((d, i) => ({
      id: uuidv4(),
      disease_id: d.id,
      variant_name: `Vignette ${i + 1}`,
      created_at: new Date(),
      updated_at: new Date()
    }))

    await queryInterface.bulkInsert('quiz_vignettes', vignettes, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('quiz_vignettes', null, {})
  }
}
