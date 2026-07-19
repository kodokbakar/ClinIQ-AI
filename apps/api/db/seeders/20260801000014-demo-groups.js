'use strict'

const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const {
  demoGroups
} = require('../data/demo-presentation-data')

function daysAgo(days) {
  const date = new Date()

  date.setUTCHours(9, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)

  return date
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ownerEmails = demoGroups.map((group) => group.ownerEmail)

    const [owners] = await queryInterface.sequelize.query(
      `
            SELECT id, email
            FROM users
            WHERE email IN (:emails)
         `,
      {
        replacements: {
          emails: ownerEmails
        }
      }
    )

    const ownersByEmail = new Map(
      owners.map((owner) => [owner.email, owner])
    )

    const missingOwners = ownerEmails.filter(
      (email) => !ownersByEmail.has(email)
    )

    if (missingOwners.length > 0) {
      throw new Error(
        `Cannot seed demo groups. Missing owners: ${missingOwners.join(', ')}`
      )
    }

    const inviteCodes = demoGroups.map((group) => group.inviteCode)

    await queryInterface.bulkDelete(
      'groups',
      {
        invite_code: {
          [Op.in]: inviteCodes
        }
      },
      {}
    )

    const createdAt = daysAgo(60)

    const groups = demoGroups.map((group) => ({
      id: uuidv4(),
      name: group.name,
      description: group.description,
      invite_code: group.inviteCode,
      owner_id: ownersByEmail.get(group.ownerEmail).id,
      member_count: group.memberEmails.length,
      created_at: createdAt,
      updated_at: createdAt
    }))

    await queryInterface.bulkInsert('groups', groups, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'groups',
      {
        invite_code: {
          [Op.in]: demoGroups.map((group) => group.inviteCode)
        }
      },
      {}
    )
  }
}