'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quiz_vignettes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      disease_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'diseases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      variant_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })
    await queryInterface.addConstraint('quiz_vignettes', {
      fields: ['disease_id', 'variant_name'],
      type: 'unique',
      name: 'uq_quiz_vignettes_disease_variant'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('quiz_vignettes')
  }
}
