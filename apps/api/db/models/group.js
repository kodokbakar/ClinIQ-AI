'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
   class Group extends Model {
      static associate(models) {
         Group.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' })
         Group.hasMany(models.GroupMember, {
            foreignKey: 'group_id',
            as: 'members'
         })
      }
   }
   Group.init(
      {
         id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
         },
         name: {
            type: DataTypes.STRING(100),
            allowNull: false
         },
         description: DataTypes.TEXT,
         invite_code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
         },
         owner_id: {
            type: DataTypes.UUID,
            allowNull: false
         },
         member_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
         }
      },
      {
         sequelize,
         modelName: 'Group',
         tableName: 'groups',
         timestamps: true,
         underscored: true
      }
   )
   return Group
}
