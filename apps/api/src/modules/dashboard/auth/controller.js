const api = require('../../../utils/api')
const db = require('../../../../db/models')
const bcrypt = require('../../../utils/bcrypt')
const JWT = require('../../../utils/jwt')
const { HttpStatusCode } = require('axios')
const { validateRequest } = require('../../../utils/validation')
const {
   LoginSchema,
   ChangePasswordSchema,
   RegisterUserSchema
} = require('./schema')

class Controller {
   static async registerUser(req, res) {
      try {
         const data = validateRequest(RegisterUserSchema, req)

         const existingUser = await db.user.findOne({
            where: { email: data.email }
         })

         if (existingUser) {
            throw {
               code: HttpStatusCode.Conflict,
               message: 'User already registered'
            }
         }

         const defaultRole = await db.role.findOne({
            where: { name: 'User' }
         })

         if (!defaultRole) {
            throw {
               code: HttpStatusCode.InternalServerError,
               message: 'Default role User is not available'
            }
         }

         const defaultStatus = data.status !== undefined ? data.status : true
         const passwordHash = bcrypt.hashPassword(data.password)

         const newUser = await db.user.create({
            name: data.name,
            email: data.email,
            password: passwordHash,
            role_id: defaultRole.id,
            status: defaultStatus
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
         err.code =
            typeof err.code !== 'undefined' && err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError
         res.status(err.code).json(api.results(null, err.code, { err }))
      }
   }

   static async loginUser(req, res) {
      try {
         const data = validateRequest(LoginSchema, req)

         const user = await db.user.findOne({
            where: {
               email: data.email
            }
         })

         if (!user) {
            throw {
               code: HttpStatusCode.Unauthorized,
               message: 'User is not registered'
            }
         }

         const validatedPassword = bcrypt.compare(data.password, user.password)
         if (!validatedPassword) {
            throw {
               code: HttpStatusCode.Unauthorized,
               message: 'Invalid email or password'
            }
         }

         if (!user.status) {
            throw {
               code: HttpStatusCode.Unauthorized,
               message: 'User is not active'
            }
         }

         const role = await db.role.findByPk(user.role_id)
         if (!role) {
            throw {
               code: HttpStatusCode.Unauthorized,
               message: 'Role is not assigned'
            }
         }

         const result = {
            id: user.id,
            email: user.email,
            name: user.name,
            is_superadmin: role.is_superadmin
         }

         const token = JWT.generateToken(result)

         res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 6 * 60 * 60 * 1000 // 6 hours
         })

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

   static async logoutUser(req, res) {
      try {
         res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
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

   static async changePassword(req, res) {
      try {
         const data = validateRequest(
            ChangePasswordSchema,
            req
         )

         const currentUser = await db.user.findByPk(
            req.user.id
         )

         if (!currentUser) {
            throw {
               code: HttpStatusCode.Unauthorized,
               message: 'User session is no longer valid'
            }
         }

         const isValidOldPassword = bcrypt.compare(
            data.old_password,
            currentUser.password
         )

         if (!isValidOldPassword) {
            throw {
               code: HttpStatusCode.BadRequest,
               message: 'Old password is incorrect'
            }
         }

         const isSamePassword = bcrypt.compare(
            data.new_password,
            currentUser.password
         )

         if (isSamePassword) {
            throw {
               code: HttpStatusCode.BadRequest,
               message:
                  'New password must be different from old password'
            }
         }

         const changedAt = new Date()
         const newPasswordHash = bcrypt.hashPassword(
            data.new_password
         )

         await currentUser.update({
            password: newPasswordHash,
            last_updated_password: changedAt
         })

         return res
            .status(HttpStatusCode.Ok)
            .json(
               api.results(
                  {
                     changed_at: changedAt.toISOString()
                  },
                  HttpStatusCode.Ok,
                  { req }
               )
            )
      } catch (err) {
         console.log(err)

         err.code =
            typeof err.code !== 'undefined' &&
               err.code !== null
               ? err.code
               : HttpStatusCode.InternalServerError

         return res
            .status(err.code)
            .json(api.results(null, err.code, { err }))
      }
   }

   static async getMe(req, res) {
      try {
         const user = await db.user.findByPk(req.user.id, {
            attributes: [
               'id',
               'name',
               'email',
               'status',
               'avatar',
               'role_id',
               'last_updated_password',
               'last_activity'
            ]
         })

         if (!user) {
            throw {
               code: HttpStatusCode.NotFound,
               message: 'User not found'
            }
         }

         const role = user.role_id
            ? await db.role.findByPk(user.role_id, {
               attributes: ['id', 'name', 'is_superadmin']
            })
            : null

         const result = {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            avatar: user.avatar,
            role_id: user.role_id,
            is_superadmin: role?.is_superadmin || false,
            last_updated_password: user.last_updated_password,
            last_activity: user.last_activity,
            role: role
               ? {
                  id: role.id,
                  name: role.name,
                  is_superadmin: role.is_superadmin
               }
               : null
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
}

module.exports = Controller
