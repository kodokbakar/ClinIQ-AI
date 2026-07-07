'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class QuizAttempt extends Model {
    static associate(models) {
      QuizAttempt.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
      QuizAttempt.belongsTo(models.QuizVignette, {
        foreignKey: 'vignette_id',
        as: 'vignette'
      })
    }
  }
  QuizAttempt.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      vignette_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      is_correct: DataTypes.BOOLEAN,
      submitted_diagnosis: DataTypes.STRING(255),
      clues_revealed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      score: DataTypes.INTEGER,
      attempt_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'QuizAttempt',
      tableName: 'quiz_attempts',
      timestamps: true,
      underscored: true
    }
  )
  return QuizAttempt
}
