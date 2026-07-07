'use strict'

/** @type {import('sequelize-cli').Migration} */
const uuid = require('uuid')

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'roles',
      [
        {
          id: uuid.v4(),
          name: 'Superadmin',
          is_superadmin: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuid.v4(),
          name: 'Admin',
          is_superadmin: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuid.v4(),
          name: 'User',
          is_superadmin: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      {}
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {})
  }
}
