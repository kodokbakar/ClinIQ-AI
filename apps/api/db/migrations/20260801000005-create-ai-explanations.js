'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_explanations', {
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
      overview: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pathophysiology: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      clinical_features: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      diagnosis: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      management: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      prevention: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      key_points: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      locale: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'id'
      },
      ai_model_used: {
        type: Sequelize.STRING(100),
        allowNull: true
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
    await queryInterface.addConstraint('ai_explanations', {
      fields: ['disease_id', 'locale'],
      type: 'unique',
      name: 'uq_ai_explanations_disease_locale'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_explanations')
  }
}
