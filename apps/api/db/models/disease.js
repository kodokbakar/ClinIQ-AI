'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
   class Disease extends Model {
      static associate(models) {
         Disease.hasMany(models.QuizVignette, {
            foreignKey: 'disease_id',
            as: 'vignettes'
         })
         Disease.hasMany(models.AIExplanation, {
            foreignKey: 'disease_id',
            as: 'explanations'
         })
      }
   }
   Disease.init(
      {
         id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
         },
         icd_code: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
         },
         name: {
            type: DataTypes.STRING(255),
            allowNull: false
         },
         description: {
            type: DataTypes.TEXT,
            allowNull: true
         }
      },
      {
         sequelize,
         modelName: 'Disease',
         tableName: 'diseases',
         timestamps: true,
         underscored: true
      }
   )
   return Disease
}
