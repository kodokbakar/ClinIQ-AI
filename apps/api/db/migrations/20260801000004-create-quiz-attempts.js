'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quiz_attempts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      vignette_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'quiz_vignettes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      submitted_diagnosis: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      clues_revealed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      attempt_date: {
        type: Sequelize.DATEONLY,
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
    await queryInterface.addConstraint('quiz_attempts', {
      fields: ['user_id', 'vignette_id'],
      type: 'unique',
      name: 'uq_quiz_attempts_user_vignette'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('quiz_attempts')
  }
}
