process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const { Op } = require('sequelize')

const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'models-user@example.test',
   'models-cascade-user@example.test'
]
const TEST_ROLE_NAMES = [
   'Models Test Role',
   'Models Unique Role'
]
const TEST_DISEASE_CODES = [
   'T-MODEL-001',
   'T-MODEL-002',
   'T-MODEL-003',
   'T-MODEL-004'
]
const TEST_INVITE_CODES = [
   'MODELGRP1'
]

let role

async function ensureRole() {
   const [createdRole] = await db.role.findOrCreate({
      where: { name: 'Models Test Role' },
      defaults: {
         name: 'Models Test Role',
         is_superadmin: false
      }
   })

   return createdRole
}

async function createUser(email = 'models-user@example.test') {
   return db.user.create({
      name: 'Models Test User',
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
      status: true
   })
}

async function createDisease({
   icdCode = 'T-MODEL-001',
   name = 'Models Test Disease'
} = {}) {
   return db.Disease.create({
      icd_code: icdCode,
      name,
      description: `${name} description`
   })
}

async function createVignette(disease, variantName = 'model-variant') {
   return db.QuizVignette.create({
      disease_id: disease.id,
      variant_name: variantName
   })
}

async function cleanupModelsData() {
   const users = await db.user.findAll({
      attributes: ['id'],
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      paranoid: false
   })
   const userIds = users.map((user) => user.id)

   const diseases = await db.Disease.findAll({
      attributes: ['id'],
      where: {
         icd_code: {
            [Op.in]: TEST_DISEASE_CODES
         }
      }
   })
   const diseaseIds = diseases.map((disease) => disease.id)

   const vignettes = diseaseIds.length > 0
      ? await db.QuizVignette.findAll({
         attributes: ['id'],
         where: {
            disease_id: {
               [Op.in]: diseaseIds
            }
         }
      })
      : []
   const vignetteIds = vignettes.map((vignette) => vignette.id)

   const groups = await db.Group.findAll({
      attributes: ['id'],
      where: {
         [Op.or]: [
            {
               invite_code: {
                  [Op.in]: TEST_INVITE_CODES
               }
            },
            userIds.length > 0
               ? {
                  owner_id: {
                     [Op.in]: userIds
                  }
               }
               : null
         ].filter(Boolean)
      }
   })
   const groupIds = groups.map((group) => group.id)

   if (groupIds.length > 0 || userIds.length > 0) {
      await db.GroupMember.destroy({
         where: {
            [Op.or]: [
               groupIds.length > 0 ? { group_id: { [Op.in]: groupIds } } : null,
               userIds.length > 0 ? { user_id: { [Op.in]: userIds } } : null
            ].filter(Boolean)
         }
      })
   }

   if (groupIds.length > 0) {
      await db.Group.destroy({
         where: {
            id: {
               [Op.in]: groupIds
            }
         }
      })
   }

   if (userIds.length > 0 || vignetteIds.length > 0) {
      await db.QuizAttempt.destroy({
         where: {
            [Op.or]: [
               userIds.length > 0 ? { user_id: { [Op.in]: userIds } } : null,
               vignetteIds.length > 0 ? { vignette_id: { [Op.in]: vignetteIds } } : null
            ].filter(Boolean)
         }
      })
   }

   if (diseaseIds.length > 0) {
      await db.AIExplanation.destroy({
         where: {
            disease_id: {
               [Op.in]: diseaseIds
            }
         }
      })
   }

   if (vignetteIds.length > 0) {
      await db.Clue.destroy({
         where: {
            vignette_id: {
               [Op.in]: vignetteIds
            }
         }
      })

      await db.QuizVignette.destroy({
         where: {
            id: {
               [Op.in]: vignetteIds
            }
         }
      })
   }

   if (diseaseIds.length > 0) {
      await db.Disease.destroy({
         where: {
            id: {
               [Op.in]: diseaseIds
            }
         }
      })
   }

   await db.user.destroy({
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      force: true,
      paranoid: false
   })

   await db.role.destroy({
      where: {
         name: {
            [Op.in]: TEST_ROLE_NAMES
         }
      }
   })
}

describe('database model constraints', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
   })

   beforeEach(async () => {
      await cleanupModelsData()
      role = await ensureRole()
   })

   afterEach(async () => {
      await cleanupModelsData()
   })

   it('user email must be unique', async () => {
      await createUser('models-user@example.test')

      await expect(createUser('models-user@example.test')).rejects.toThrow()
   })

   it('role name must be unique', async () => {
      await db.role.create({
         name: 'Models Unique Role',
         is_superadmin: false
      })

      await expect(
         db.role.create({
            name: 'Models Unique Role',
            is_superadmin: false
         })
      ).rejects.toThrow()
   })

   it('disease icd_code must be unique', async () => {
      await createDisease({
         icdCode: 'T-MODEL-001',
         name: 'Models Disease One'
      })

      await expect(
         createDisease({
            icdCode: 'T-MODEL-001',
            name: 'Models Disease Duplicate'
         })
      ).rejects.toThrow()
   })

   it('clue number must be unique per vignette', async () => {
      const disease = await createDisease({
         icdCode: 'T-MODEL-001'
      })
      const vignette = await createVignette(disease)

      await db.Clue.create({
         vignette_id: vignette.id,
         clue_number: 1,
         content: 'First clue',
         type: 'history'
      })

      await expect(
         db.Clue.create({
            vignette_id: vignette.id,
            clue_number: 1,
            content: 'Duplicate first clue',
            type: 'clinical'
         })
      ).rejects.toThrow()
   })

   it('quiz attempt must be unique per user/vignette', async () => {
      const user = await createUser('models-user@example.test')
      const disease = await createDisease({
         icdCode: 'T-MODEL-001'
      })
      const vignette = await createVignette(disease)

      await db.QuizAttempt.create({
         user_id: user.id,
         vignette_id: vignette.id,
         clues_revealed: 1,
         attempt_date: new Date().toISOString().slice(0, 10)
      })

      await expect(
         db.QuizAttempt.create({
            user_id: user.id,
            vignette_id: vignette.id,
            clues_revealed: 1,
            attempt_date: new Date().toISOString().slice(0, 10)
         })
      ).rejects.toThrow()
   })

   it('group membership must be unique per group/user', async () => {
      const user = await createUser('models-user@example.test')
      const group = await db.Group.create({
         name: 'Models Test Group',
         description: 'Models group description',
         invite_code: 'MODELGRP1',
         owner_id: user.id,
         member_count: 1
      })

      await db.GroupMember.create({
         group_id: group.id,
         user_id: user.id,
         is_admin: true
      })

      await expect(
         db.GroupMember.create({
            group_id: group.id,
            user_id: user.id,
            is_admin: false
         })
      ).rejects.toThrow()
   })

   it('AI explanation must be unique per disease and locale', async () => {
      const disease = await createDisease({
         icdCode: 'T-MODEL-001'
      })

      await db.AIExplanation.create({
         disease_id: disease.id,
         locale: 'id',
         overview: 'Overview'
      })

      await expect(
         db.AIExplanation.create({
            disease_id: disease.id,
            locale: 'id',
            overview: 'Duplicate overview'
         })
      ).rejects.toThrow()
   })

   it('deleting disease cascades vignettes and clues', async () => {
      const disease = await createDisease({
         icdCode: 'T-MODEL-001'
      })
      const vignette = await createVignette(disease)

      const clue = await db.Clue.create({
         vignette_id: vignette.id,
         clue_number: 1,
         content: 'Cascade clue',
         type: 'history'
      })

      await disease.destroy()

      const deletedVignette = await db.QuizVignette.findByPk(vignette.id)
      const deletedClue = await db.Clue.findByPk(clue.id)

      expect(deletedVignette).toBeNull()
      expect(deletedClue).toBeNull()
   })

   it('deleting user soft-deletes expected data', async () => {
      const user = await createUser('models-cascade-user@example.test')

      await user.destroy()

      const defaultLookup = await db.user.findByPk(user.id)
      const paranoidLookup = await db.user.findByPk(user.id, {
         paranoid: false
      })

      expect(defaultLookup).toBeNull()
      expect(paranoidLookup).toBeTruthy()
      expect(paranoidLookup.deletedAt).toBeTruthy()
   })
})
