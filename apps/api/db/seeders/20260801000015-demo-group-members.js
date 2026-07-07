'use strict'

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [groups] = await queryInterface.sequelize.query(
      `SELECT id, owner_id FROM groups;`
    )
    if (!groups.length) return

    const members = groups.map((g) => ({
      id: uuidv4(),
      group_id: g.id,
      user_id: g.owner_id,
      is_admin: true,
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }))

    await queryInterface.bulkInsert('group_members', members, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('group_members', null, {})
  }
}
