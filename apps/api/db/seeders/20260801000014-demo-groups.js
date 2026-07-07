'use strict'

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT id, name FROM users LIMIT 3;`
    )
    if (!users.length) return

    const groups = users.map((u, i) => ({
      id: uuidv4(),
      name: `Kelompok Belajar ${String.fromCharCode(65 + i)}`,
      description: 'Kelompok belajar untuk latihan quiz.',
      invite_code: `INVITE${String.fromCharCode(65 + i)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      owner_id: u.id,
      member_count: 1,
      created_at: new Date(),
      updated_at: new Date()
    }))

    await queryInterface.bulkInsert('groups', groups, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('groups', null, {})
  }
}
