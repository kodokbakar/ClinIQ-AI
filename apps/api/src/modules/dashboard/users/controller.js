const api = require('../../../utils/api')
const db = require('../../../../db/models')
const bcrypt = require('../../../utils/bcrypt')
const { HttpStatusCode } = require('axios')
const uuid = require('uuid')
const { validateRequest } = require('../../../utils/validation')
const {
   UserCreateSchema,
   UserUpdateSchema,
   ResetPasswordSchema,
   UpdateUserAccessSchema
} = require('./schema')

class Controller {
   static async listUser(req, res) {
      try {
         const user = req.user
         const limit = parseInt(req.query.per_page || req.query.limit) || 10
         const page = parseInt(req.query.page) || 1
         const q = req.query.q || null

         const search = q
            ? 'AND (u.name LIKE :search OR u.email LIKE :search)'
            : ''

         const count = await db.sequelize.query(
            `
         SELECT
         COUNT(*) as total
         FROM users u
         WHERE u.id NOT IN (:user_id)
         ${search}
         `,
            {
               type: db.sequelize.QueryTypes.SELECT,
               replacements: {
                  user_id: user.id,
                  search: `%${q}%`
               }
            }
         )

         const rows = await db.sequelize.query(
            `
        SELECT
        u.id,
        u.name,
        u.email,
        r.name as role,
        u.status
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id NOT IN (:user_id)
        ${search}
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
        `,
            {
               type: db.sequelize.QueryTypes.SELECT,
               replacements: {
                  user_id: user.id,
                  search: `%${q}%`,
                  limit,
                  offset: (page - 1) * limit
               }
            }
         )

         const result = {
            count: parseInt(count[0].total),
            page,
            per_page: limit,
            data: rows
         }

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(result, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async showUser(req, res) {
      try {
         const user = req.user
         const userId = req.params.user_id

         if (!uuid.validate(userId)) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid user ID'
            }
         }

         const checkUser = await db.user.findByPk(userId)
         if (!checkUser) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         const result = {
            id: checkUser.id,
            name: checkUser.name,
            email: checkUser.email,
            status: checkUser.status,
            role_id: checkUser.role_id
         }

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(result, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async createUser(req, res) {
      try {
         const data = validateRequest(UserCreateSchema, req)
         const checkUser = await db.user.findOne({
            where: {
               email: data.email
            }
         })

         if (checkUser) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Email already exists'
            }
         }

         const passwordHash = bcrypt.hashPassword(data.password)

         const checkRole = await db.role.findByPk(data.role_id)
         if (!checkRole) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Role does not exist'
            }
         }

         if (checkRole.is_superadmin) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid select role'
            }
         }

         const newUser = await db.user.create({
            id: uuid.v4(),
            name: data.name,
            email: data.email,
            role_id: data.role_id,
            status: true,
            password: passwordHash
         })

         const result = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role_id: newUser.role_id,
            status: newUser.status
         }

         res
            .status(HttpStatusCode.Created)
            .json(api.results(result, HttpStatusCode.Created, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async updateUser(req, res) {
      try {
         const userId = req.params.user_id
         if (!uuid.validate(userId)) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid user ID'
            }
         }

         const data = validateRequest(UserUpdateSchema, req)
         const existUser = await db.user.findByPk(userId)

         if (!existUser) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         const checkUser = await db.user.findOne({
            where: {
               email: data.email
            }
         })

         if (checkUser && checkUser.id !== existUser.id) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Email already exists'
            }
         }

         await existUser.update({
            name: data.name,
            email: data.email
         })

         const result = {
            id: existUser.id,
            name: existUser.name,
            email: existUser.email,
            status: existUser.status
         }

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(result, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async deleteUser(req, res) {
      try {
         const userId = req.params.user_id
         if (!uuid.validate(userId)) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid user ID'
            }
         }

         const existUser = await db.user.findByPk(userId)

         if (!existUser) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         await existUser.destroy()

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(true, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async resetPassword(req, res) {
      try {
         const userId = req.params.user_id
         if (!uuid.validate(userId)) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid user ID'
            }
         }

         const data = validateRequest(ResetPasswordSchema, req)

         const existUser = await db.user.findByPk(userId)

         if (!existUser) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         const passwordHash = bcrypt.hashPassword(data.password)
         await existUser.update({
            password: passwordHash,
            last_updated_password: new Date()
         })

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(true, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async updateUserAccess(req, res) {
      const t = await db.sequelize.transaction()
      try {
         const user = req.user
         const userId = req.params.user_id
         if (!uuid.validate(userId)) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Invalid user ID'
            }
         }

         const data = validateRequest(UpdateUserAccessSchema, req)

         const existUser = await db.user.findByPk(userId)

         if (!existUser) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         for (const access of data.access) {
            const permissions = access.permissions

            const userAccess = await db.user_access.findOne({
               where: {
                  user_id: existUser.id,
                  menu_id: access.menu_id
               }
            })

            if (!userAccess) {
               await db.user_access.create(
                  {
                     user_id: existUser.id,
                     menu_id: access.menu_id,
                     ...permissions.reduce(
                        (acc, perm) => ({
                           ...acc,
                           [perm.action]: perm.granted
                        }),
                        {}
                     )
                  },
                  {
                     transaction: t
                  }
               )
            } else {
               await userAccess.update(
                  {
                     ...permissions.reduce(
                        (acc, perm) => ({
                           ...acc,
                           [perm.action]: perm.granted
                        }),
                        {}
                     ),
                     updated_by: user.id
                  },
                  {
                     transaction: t
                  }
               )
            }
         }

         await t.commit()

         res
            .status(HttpStatusCode.Ok)
            .json(api.results(true, HttpStatusCode.Ok, { req }))
      } catch (err) {
         console.log(err)
         await t.rollback()
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }
}

module.exports = Controller
