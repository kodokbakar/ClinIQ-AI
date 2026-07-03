'use strict'

const { hashPassword } = require('../../src/utils/bcrypt')
const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const now = new Date()
    const passwordHash = hashPassword('password123')

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name FROM roles;`
    )
    const superAdminRole = roles.find((r) => r.name === 'Superadmin')
    const adminRole = roles.find((r) => r.name === 'Admin')
    const User = roles.find((r) => r.name === 'User')

    await queryInterface.bulkInsert(
      'users',
      [
        {
          id: uuidv4(),
          name: 'Super Admin',
          email: 'suadm@gmail.com',
          password: passwordHash,
          role_id: superAdminRole?.id,
          status: true,
          avatar: null,
          last_updated_password: now,
          created_at: now,
          updated_at: now,
          deleted_at: null
        },
        {
          id: uuidv4(),
          name: 'admin',
          email: 'admin@gmail.com',
          password: passwordHash,
          role_id: adminRole?.id,
          status: true,
          avatar: null,
          last_updated_password: now,
          created_at: now,
          updated_at: now,
          deleted_at: null
        },
        {
          id: uuidv4(),
          name: 'User',
          email: 'user@gmail.com',
          password: passwordHash,
          role_id: User?.id,
          status: true,
          avatar: null,
          last_updated_password: now,
          created_at: now,
          updated_at: now,
          deleted_at: null
        }
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['suadm@gmail.com', 'admin@gmail.com', 'user@gmail.com']
    })
  }
}
