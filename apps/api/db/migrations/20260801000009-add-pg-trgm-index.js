'use strict'
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_diseases_name_trgm ON diseases USING gin (name gin_trgm_ops)'
    )
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_diseases_name_trgm'
    )
  }
}
