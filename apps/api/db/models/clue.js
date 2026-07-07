'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
   class Clue extends Model {
      static associate(models) {
         Clue.belongsTo(models.QuizVignette, {
            foreignKey: 'vignette_id',
            as: 'vignette'
         })
      }
   }
   Clue.init(
      {
         id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
         },
         vignette_id: {
            type: DataTypes.UUID,
            allowNull: false
         },
         clue_number: {
            type: DataTypes.INTEGER,
            allowNull: false
         },
         content: {
            type: DataTypes.TEXT,
            allowNull: false
         },
         type: DataTypes.STRING(50)
      },
      {
         sequelize,
         modelName: 'Clue',
         tableName: 'clues',
         timestamps: true,
         underscored: true
      }
   )
   return Clue
}
