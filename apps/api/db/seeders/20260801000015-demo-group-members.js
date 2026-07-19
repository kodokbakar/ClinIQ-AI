'use strict'

const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const {
  demoGroups,
  demoLearnerEmails
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
    const [groups] = await queryInterface.sequelize.query(
      `
            SELECT id, invite_code
            FROM groups
            WHERE invite_code IN (:inviteCodes)
         `,
      {
        replacements: {
          inviteCodes: demoGroups.map(
            (group) => group.inviteCode
          )
        }
      }
    )

    const [users] = await queryInterface.sequelize.query(
      `
            SELECT id, email
            FROM users
            WHERE email IN (:emails)
         `,
      {
        replacements: {
          emails: demoLearnerEmails
        }
      }
    )

    if (groups.length === 0 || users.length === 0) return

    const groupsByInviteCode = new Map(
      groups.map((group) => [group.invite_code, group])
    )
    const usersByEmail = new Map(
      users.map((user) => [user.email, user])
    )

    const missingGroups = demoGroups.filter(
      (group) => !groupsByInviteCode.has(group.inviteCode)
    )
    const missingUsers = demoLearnerEmails.filter(
      (email) => !usersByEmail.has(email)
    )

    if (missingGroups.length > 0) {
      throw new Error(
        `Cannot seed group members. Missing groups: ${missingGroups
          .map((group) => group.inviteCode)
          .join(', ')}`
      )
    }

    if (missingUsers.length > 0) {
      throw new Error(
        `Cannot seed group members. Missing users: ${missingUsers.join(', ')}`
      )
    }

    const groupIds = groups.map((group) => group.id)

    await queryInterface.bulkDelete(
      'group_members',
      {
        group_id: {
          [Op.in]: groupIds
        }
      },
      {}
    )

    const members = []

    demoGroups.forEach((groupConfig) => {
      const group = groupsByInviteCode.get(groupConfig.inviteCode)

      groupConfig.memberEmails.forEach((email, memberIndex) => {
        const user = usersByEmail.get(email)
        const joinedAt = daysAgo(45 - memberIndex)

        members.push({
          id: uuidv4(),
          group_id: group.id,
          user_id: user.id,
          is_admin: email === groupConfig.ownerEmail,
          joined_at: joinedAt,
          created_at: joinedAt,
          updated_at: joinedAt
        })
      })
    })

    await queryInterface.bulkInsert('group_members', members, {})

    for (const groupConfig of demoGroups) {
      const group = groupsByInviteCode.get(groupConfig.inviteCode)

      await queryInterface.bulkUpdate(
        'groups',
        {
          member_count: groupConfig.memberEmails.length,
          updated_at: new Date()
        },
        {
          id: group.id
        }
      )
    }
  },

  async down(queryInterface) {
    const [groups] = await queryInterface.sequelize.query(
      `
            SELECT id
            FROM groups
            WHERE invite_code IN (:inviteCodes)
         `,
      {
        replacements: {
          inviteCodes: demoGroups.map(
            (group) => group.inviteCode
          )
        }
      }
    )

    const groupIds = groups.map((group) => group.id)

    if (groupIds.length === 0) return

    await queryInterface.bulkDelete(
      'group_members',
      {
        group_id: {
          [Op.in]: groupIds
        }
      },
      {}
    )

    await queryInterface.bulkUpdate(
      'groups',
      {
        member_count: 0,
        updated_at: new Date()
      },
      {
        id: {
          [Op.in]: groupIds
        }
      }
    )
  }
}