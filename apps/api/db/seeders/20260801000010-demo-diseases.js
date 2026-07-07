'use strict'

const { v4: uuidv4 } = require('uuid')
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const csvPath = path.resolve(__dirname, '../../archive/ICD_11.csv')
    const csvData = fs.readFileSync(csvPath)
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    const diseases = records
      .filter(
        (record) => record.ClassKind === 'category' && record.isLeaf === 'TRUE'
      )
      .map((record) => ({
        id: uuidv4(),
        icd_code: record['8Y'] || record.BlockId,
        name: record.Title,
        created_at: new Date(),
        updated_at: new Date()
      }))

    if (diseases.length > 0) {
      await queryInterface.bulkInsert('diseases', diseases, {
        ignoreDuplicates: true
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('diseases', null, {})
  }
}
