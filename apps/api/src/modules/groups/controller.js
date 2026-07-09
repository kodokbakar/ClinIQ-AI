const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')

class Controller {
   /** POST /v1/groups — Create a new group */
   static async create(req, res) {
      try {
         const userId = req.user.id
         const { name, description, invite_code } = req.body

         if (!name) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Group name is required'
            })
         }

         const group = await db.Group.create({
            name,
            description: description || '',
            invite_code:
               invite_code ||
               Math.random().toString(36).substring(2, 10).toUpperCase(),
            owner_id: userId
         })

         // Add creator as member (admin)
         await db.GroupMember.create({
            group_id: group.id,
            user_id: userId,
            is_admin: true
         })

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: {
               id: group.id,
               name: group.name,
               description: group.description,
               invite_code: group.invite_code,
               owner_id: group.owner_id,
               member_count: group.member_count,
               created_at: group.createdAt
            }
         })
      } catch (err) {
         console.error('Create group error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }

   /** GET /v1/groups — List groups the user is a member of */
   static async list(req, res) {
      try {
         const userId = req.user.id

         const memberships = await db.GroupMember.findAll({
            where: { user_id: userId },
            include: [
               {
                  model: db.Group,
                  as: 'group',
                  attributes: [
                     'id',
                     'name',
                     'description',
                     'invite_code',
                     'owner_id',
                     'member_count',
                     'createdAt'
                  ]
               }
            ],
            order: [['created_at', 'DESC']]
         })

         const groups = memberships.map((m) => ({
            ...m.group.toJSON(),
            my_role: m.is_admin ? 'admin' : 'member'
         }))

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: groups
         })
      } catch (err) {
         console.error('List groups error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }

   /** GET /v1/groups/:id — Get group details with members */
   static async getById(req, res) {
      try {
         const userId = req.user.id
         const { id } = req.params

         const membership = await db.GroupMember.findOne({
            where: { group_id: id, user_id: userId },
            attributes: ['is_admin']
         })

         if (!membership) {
            return res.status(HttpStatusCode.Forbidden).json({
               success: false,
               message: 'You are not a member of this group'
            })
         }

         const group = await db.Group.findByPk(id, {
            include: [
               {
                  model: db.GroupMember,
                  as: 'members',
                  attributes: ['id', 'user_id', 'is_admin', 'joined_at'],
                  include: [
                     {
                        model: db.User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                     }
                  ]
               },
               {
                  model: db.User,
                  as: 'owner',
                  attributes: ['id', 'name', 'email']
               }
            ]
         })

         if (!group) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Group not found'
            })
         }

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: {
               ...group.toJSON(),
               my_role: membership.is_admin ? 'admin' : 'member'
            }
         })
      } catch (err) {
         console.error('Get group error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }

   /** POST /v1/groups/:id/join — Join group via invite code */
   static async join(req, res) {
      try {
         const userId = req.user.id
         const { id } = req.params
         const { invite_code } = req.body

         const group = await db.Group.findByPk(id)
         if (!group) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Group not found'
            })
         }

         if (group.invite_code !== invite_code) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Invalid invite code'
            })
         }

         const existing = await db.GroupMember.findOne({
            where: { group_id: id, user_id: userId }
         })

         if (existing) {
            return res.status(HttpStatusCode.Conflict).json({
               success: false,
               message: 'Already a member of this group'
            })
         }

         await db.sequelize.transaction(async (transaction) => {
            await db.GroupMember.create(
               {
                  group_id: id,
                  user_id: userId,
                  is_admin: false
               },
               { transaction }
            )

            await db.sequelize.query(
               'UPDATE groups SET member_count = member_count + 1 WHERE id = :id',
               {
                  replacements: { id },
                  transaction
               }
            )
         })

         res.status(HttpStatusCode.Created).json({
            success: true,
            data: { message: 'Successfully joined group', group_id: id }
         })
      } catch (err) {
         if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(HttpStatusCode.Conflict).json({
               success: false,
               message: 'Already a member of this group'
            })
         }
         console.error('Join group error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }

   /** POST /v1/groups/:id/leave — Leave group */
   static async leave(req, res) {
      try {
         const userId = req.user.id
         const { id } = req.params

         const membership = await db.GroupMember.findOne({
            where: { group_id: id, user_id: userId }
         })

         if (!membership) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Not a member of this group'
            })
         }

         // Check if owner
         const group = await db.Group.findByPk(id)
         if (group.owner_id === userId) {
            return res.status(HttpStatusCode.BadRequest).json({
               success: false,
               message: 'Owner cannot leave. Transfer ownership or delete group.'
            })
         }

         await db.sequelize.transaction(async (transaction) => {
            await membership.destroy({ transaction })

            await db.sequelize.query(
               'UPDATE groups SET member_count = GREATEST(member_count - 1, 1) WHERE id = :id',
               {
                  replacements: { id },
                  transaction
               }
            )
         })

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: { message: 'Successfully left group' }
         })
      } catch (err) {
         console.error('Leave group error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }

   /** DELETE /v1/groups/:id — Delete group (owner only) */
   static async delete(req, res) {
      try {
         const userId = req.user.id
         const { id } = req.params

         const group = await db.Group.findByPk(id)
         if (!group) {
            return res.status(HttpStatusCode.NotFound).json({
               success: false,
               message: 'Group not found'
            })
         }

         if (group.owner_id !== userId) {
            return res.status(HttpStatusCode.Forbidden).json({
               success: false,
               message: 'Only owner can delete group'
            })
         }

         await group.destroy() // CASCADE deletes members

         res.status(HttpStatusCode.Ok).json({
            success: true,
            data: { message: 'Group deleted' }
         })
      } catch (err) {
         console.error('Delete group error:', err)
         res.status(err.code || HttpStatusCode.InternalServerError).json({
            success: false,
            message: err.message
         })
      }
   }
}

module.exports = Controller
