process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'

const request = require('supertest')
const { Op } = require('sequelize')

const app = require('../../index')
const db = require('../../db/models')
const bcrypt = require('../../src/utils/bcrypt')

const TEST_PASSWORD = 'Password123'
const TEST_EMAILS = [
   'groups-owner@example.test',
   'groups-member@example.test',
   'groups-outsider@example.test'
]
const TEST_INVITE_CODES = [
   'GRPTEST1',
   'GRPTEST2',
   'GRPTEST3',
   'GRPTEST4'
]

let role
let users
let cookies

async function ensureUserRole() {
   const [userRole] = await db.role.findOrCreate({
      where: { name: 'User' },
      defaults: {
         name: 'User',
         is_superadmin: false
      }
   })

   return userRole
}

async function createUser(email, name) {
   return db.user.create({
      name,
      email,
      password: bcrypt.hashPassword(TEST_PASSWORD),
      role_id: role.id,
      status: true
   })
}

async function loginCookie(email) {
   const response = await request(app).post('/api/v1/auth/login').send({
      email,
      password: TEST_PASSWORD
   })
   const cookiesHeader = response.headers['set-cookie'] || []
   const tokenCookie = cookiesHeader.find((cookie) => cookie.startsWith('token='))

   expect(tokenCookie).toBeTruthy()

   return tokenCookie.split(';')[0]
}

async function createGroup({
   owner = users.owner,
   name = 'Groups Test Group',
   inviteCode = 'GRPTEST1'
} = {}) {
   const group = await db.Group.create({
      name,
      description: `${name} description`,
      invite_code: inviteCode,
      owner_id: owner.id,
      member_count: 1
   })

   await db.GroupMember.create({
      group_id: group.id,
      user_id: owner.id,
      is_admin: true
   })

   return group
}

async function cleanupGroups() {
   const testUsers = await db.user.findAll({
      attributes: ['id'],
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      paranoid: false
   })
   const userIds = testUsers.map((user) => user.id)

   const groupWhere = {
      [Op.or]: [
         {
            invite_code: {
               [Op.in]: TEST_INVITE_CODES
            }
         }
      ]
   }

   if (userIds.length > 0) {
      groupWhere[Op.or].push({
         owner_id: {
            [Op.in]: userIds
         }
      })
   }

   const groups = await db.Group.findAll({
      attributes: ['id'],
      where: groupWhere
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

   await db.user.destroy({
      where: {
         email: {
            [Op.in]: TEST_EMAILS
         }
      },
      force: true,
      paranoid: false
   })
}

function authedGet(path, cookie = cookies.owner) {
   return request(app).get(path).set('Cookie', cookie)
}

function authedPost(path, body, cookie = cookies.owner) {
   return request(app).post(path).set('Cookie', cookie).send(body)
}

function authedDelete(path, cookie = cookies.owner) {
   return request(app).delete(path).set('Cookie', cookie)
}

describe('groups API', () => {
   beforeAll(async () => {
      await db.sequelize.authenticate()
      role = await ensureUserRole()
   })

   beforeEach(async () => {
      await cleanupGroups()

      users = {
         owner: await createUser('groups-owner@example.test', 'Groups Owner'),
         member: await createUser('groups-member@example.test', 'Groups Member'),
         outsider: await createUser('groups-outsider@example.test', 'Groups Outsider')
      }

      cookies = {
         owner: await loginCookie(users.owner.email),
         member: await loginCookie(users.member.email),
         outsider: await loginCookie(users.outsider.email)
      }
   })

   afterEach(async () => {
      await cleanupGroups()
   })

   it('create group requires authentication', async () => {
      const response = await request(app).post('/api/v1/groups').send({
         name: 'No Auth Group'
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
   })

   it('create group validates required fields', async () => {
      const response = await authedPost('/api/v1/groups', {})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Group name is required')
   })

   it('join group requires authentication', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await request(app)
         .post(`/api/v1/groups/${group.id}/join`)
         .send({
            invite_code: group.invite_code
         })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Unauthorized, token not found')
   })

   it('join group rejects duplicate membership', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const firstJoin = await authedPost(
         `/api/v1/groups/${group.id}/join`,
         {
            invite_code: group.invite_code
         },
         cookies.member
      )

      const secondJoin = await authedPost(
         `/api/v1/groups/${group.id}/join`,
         {
            invite_code: group.invite_code
         },
         cookies.member
      )

      expect(firstJoin.status).toBe(201)
      expect(firstJoin.body.success).toBe(true)
      expect(secondJoin.status).toBe(409)
      expect(secondJoin.body.success).toBe(false)
      expect(secondJoin.body.message).toBe('Already a member of this group')
   })

   it('leave group removes membership', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      await authedPost(
         `/api/v1/groups/${group.id}/join`,
         {
            invite_code: group.invite_code
         },
         cookies.member
      ).expect(201)

      const response = await authedPost(
         `/api/v1/groups/${group.id}/leave`,
         {},
         cookies.member
      )

      const membership = await db.GroupMember.findOne({
         where: {
            group_id: group.id,
            user_id: users.member.id
         }
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toBe('Successfully left group')
      expect(membership).toBeNull()
   })

   it('group list returns current user groups', async () => {
      const ownerGroup = await createGroup({
         owner: users.owner,
         name: 'Owner Visible Group',
         inviteCode: 'GRPTEST1'
      })
      const outsiderGroup = await createGroup({
         owner: users.outsider,
         name: 'Outsider Hidden Group',
         inviteCode: 'GRPTEST2'
      })

      await authedPost(
         `/api/v1/groups/${ownerGroup.id}/join`,
         {
            invite_code: ownerGroup.invite_code
         },
         cookies.member
      ).expect(201)

      const response = await authedGet('/api/v1/groups', cookies.member)
      const groupIds = response.body.data.map((group) => group.id)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(groupIds).toContain(ownerGroup.id)
      expect(groupIds).not.toContain(outsiderGroup.id)
      expect(response.body.data[0].my_role).toBe('member')
   })

   it('group detail includes members', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      await authedPost(
         `/api/v1/groups/${group.id}/join`,
         {
            invite_code: group.invite_code
         },
         cookies.member
      ).expect(201)

      const response = await authedGet(`/api/v1/groups/${group.id}`)
      const memberEmails = response.body.data.members.map(
         (member) => member.user.email
      )

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(group.id)
      expect(response.body.data.my_role).toBe('admin')
      expect(Array.isArray(response.body.data.members)).toBe(true)
      expect(memberEmails).toContain(users.owner.email)
      expect(memberEmails).toContain(users.member.email)
   })

   it('user cannot modify group they do not own', async () => {
      const group = await createGroup({
         owner: users.owner,
         inviteCode: 'GRPTEST1'
      })

      const response = await authedDelete(
         `/api/v1/groups/${group.id}`,
         cookies.member
      )

      const stillExists = await db.Group.findByPk(group.id)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Only owner can delete group')
      expect(stillExists).toBeTruthy()
   })

   it('join group rejects invalid invite code', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedPost(
         `/api/v1/groups/${group.id}/join`,
         {
            invite_code: 'WRONGCODE'
         },
         cookies.member
      )

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid invite code')
   })

   it('join group returns 404 for missing group', async () => {
      const response = await authedPost(
         '/api/v1/groups/99999999-9999-4999-8999-999999999999/join',
         {
            invite_code: 'GRPTEST1'
         },
         cookies.member
      )

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Group not found')
   })

   it('group detail rejects non-member', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedGet(
         `/api/v1/groups/${group.id}`,
         cookies.outsider
      )

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('You are not a member of this group')
   })

   it('leave group rejects non-member', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedPost(
         `/api/v1/groups/${group.id}/leave`,
         {},
         cookies.outsider
      )

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Not a member of this group')
   })

   it('owner cannot leave their own group', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedPost(
         `/api/v1/groups/${group.id}/leave`,
         {},
         cookies.owner
      )

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe(
         'Owner cannot leave. Transfer ownership or delete group.'
      )
   })

   it('owner can delete group', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedDelete(
         `/api/v1/groups/${group.id}`,
         cookies.owner
      )

      const deletedGroup = await db.Group.findByPk(group.id)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toBe('Group deleted')
      expect(deletedGroup).toBeNull()
   })

   it('joins group using invite code without group id', async () => {
      const group = await createGroup({
         inviteCode: 'GRPTEST1'
      })

      const response = await authedPost(
         '/api/v1/groups/join',
         {
            invite_code: '  grptest1  '
         },
         cookies.member
      )

      const membership = await db.GroupMember.findOne({
         where: {
            group_id: group.id,
            user_id: users.member.id
         }
      })

      const updatedGroup = await db.Group.findByPk(group.id)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.group_id).toBe(group.id)
      expect(response.body.data.group.name).toBe(group.name)
      expect(response.body.data.group.my_role).toBe('member')
      expect(membership).toBeTruthy()
      expect(updatedGroup.member_count).toBe(2)
   })

   it('join by code validates invite code', async () => {
      const response = await authedPost(
         '/api/v1/groups/join',
         {},
         cookies.member
      )

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invite code is required')
   })

   it('join by code returns 404 for unknown code', async () => {
      const response = await authedPost(
         '/api/v1/groups/join',
         {
            invite_code: 'UNKNOWNCODE'
         },
         cookies.member
      )

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe(
         'Group not found for this invite code'
      )
   })
})
