'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class GroupMember extends Model {
    static associate(models) {
      GroupMember.belongsTo(models.Group, {
        foreignKey: 'group_id',
        as: 'group'
      })
      GroupMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    }
  }
  GroupMember.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      group_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      is_admin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'GroupMember',
      tableName: 'group_members',
      timestamps: true,
      underscored: true
    }
  )
  return GroupMember
}
