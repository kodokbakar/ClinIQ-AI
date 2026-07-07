'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'is_superadmin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    // Set Superadmin role to true
    await queryInterface.sequelize.query(
      `UPDATE roles SET is_superadmin = true WHERE name = 'Superadmin'`
    )
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('roles', 'is_superadmin')
  }
}
