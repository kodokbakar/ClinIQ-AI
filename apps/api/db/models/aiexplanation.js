'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
   class AIExplanation extends Model {
      static associate(models) {
         AIExplanation.belongsTo(models.Disease, {
            foreignKey: 'disease_id',
            as: 'disease'
         })
      }
   }
   AIExplanation.init(
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
         overview: DataTypes.TEXT,
         pathophysiology: DataTypes.TEXT,
         clinical_features: DataTypes.JSONB,
         diagnosis: DataTypes.JSONB,
         management: DataTypes.JSONB,
         prevention: DataTypes.JSONB,
         key_points: DataTypes.JSONB,
         locale: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'id'
         },
         ai_model_used: DataTypes.STRING(100)
      },
      {
         sequelize,
         modelName: 'AIExplanation',
         tableName: 'ai_explanations',
         timestamps: true,
         underscored: true
      }
   )
   return AIExplanation
}
