'use strict'

const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const { hashPassword } = require('../../src/utils/bcrypt')
const {
  DEMO_PASSWORD,
  demoUserEmails,
  demoUsers
} = require('../data/demo-presentation-data')

function daysAgo(days) {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() - days)

  return date
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query(
      `
            SELECT id, name
            FROM roles
            WHERE name IN ('Superadmin', 'Admin', 'User')
         `
    )

    const roleIds = new Map(roles.map((role) => [role.name, role.id]))
    const missingRoles = ['Superadmin', 'Admin', 'User'].filter(
      (roleName) => !roleIds.has(roleName)
    )

    if (missingRoles.length > 0) {
      throw new Error(
        `Cannot seed demo users. Missing roles: ${missingRoles.join(', ')}`
      )
    }

    const now = new Date()
    const passwordHash = hashPassword(DEMO_PASSWORD)

    const users = demoUsers.map((user, index) => ({
      id: uuidv4(),
      name: user.name,
      email: user.email,
      password: passwordHash,
      role_id: roleIds.get(user.roleName),
      status: true,
      avatar: null,
      last_updated_password: now,
      last_activity: daysAgo(index % 7),
      created_at: daysAgo(90 - index),
      updated_at: now,
      deleted_at: null
    }))

    await queryInterface.bulkInsert('users', users, {
      ignoreDuplicates: true
    })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'users',
      {
        email: {
          [Op.in]: demoUserEmails
        }
      },
      {}
    )
  }
}