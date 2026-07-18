'use strict'
const { clinicalCases } = require('../data/demo-clinical-cases')

const { v4: uuidv4 } = require('uuid')

module.exports = {
  async up(queryInterface) {
    const [diseases] = await queryInterface.sequelize.query(
      `
    SELECT id, name
    FROM diseases
    WHERE icd_code IN (:icdCodes)
    ORDER BY icd_code ASC
  `,
      {
        replacements: {
          icdCodes: clinicalCases.map(
            (clinicalCase) => clinicalCase.icdCode
          )
        }
      }
    )
    if (!diseases.length) return

    const explanations = diseases.map((d) => ({
      id: uuidv4(),
      disease_id: d.id,
      overview: `${d.name} adalah suatu kondisi medis yang memerlukan diagnosis tepat.`,
      pathophysiology:
        'Mekanisme patofisiologi melibatkan respons inflamasi sistemik.',
      clinical_features: JSON.stringify(['Demam', 'Batuk', 'Nyeri']),
      diagnosis: JSON.stringify([
        'Anamnesis',
        'Pemeriksaan fisik',
        'Laboratorium'
      ]),
      management: JSON.stringify([
        'Terapi suportif',
        'Medikasi sesuai indikasi'
      ]),
      prevention: JSON.stringify(['Vaksinasi', 'PHBS']),
      key_points: JSON.stringify([
        'Diagnosis dini penting',
        'Penanganan tepat waktu'
      ]),
      locale: 'id',
      ai_model_used: 'gpt-4',
      created_at: new Date(),
      updated_at: new Date()
    }))

    await queryInterface.bulkInsert('ai_explanations', explanations, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('ai_explanations', null, {})
  }
}
