'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
   class QuizVignette extends Model {
      static associate(models) {
         QuizVignette.belongsTo(models.Disease, {
            foreignKey: 'disease_id',
            as: 'disease'
         })
         QuizVignette.hasMany(models.Clue, {
            foreignKey: 'vignette_id',
            as: 'clues'
         })
         QuizVignette.hasMany(models.QuizAttempt, {
            foreignKey: 'vignette_id',
            as: 'attempts'
         })
      }
   }
   QuizVignette.init(
      {
         id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
         },
         disease_id: {
            type: DataTypes.UUID,
            allowNull: false
         },
         variant_name: {
            type: DataTypes.STRING(100),
            allowNull: false
         }
      },
      {
         sequelize,
         modelName: 'QuizVignette',
         tableName: 'quiz_vignettes',
         timestamps: true,
         underscored: true
      }
   )
   return QuizVignette
}
