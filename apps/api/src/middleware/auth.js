const { HttpStatusCode } = require('axios')
const JWT = require('../utils/jwt')
const db = require('../../db/models')
const { api } = require('../utils/api')

const authorize = (...roles) => {
   return (req, res, next) => {
      if (!req.user) {
         return res.status(HttpStatusCode.Unauthorized).json({
            success: false,
            message: 'Unauthorized'
         })
      }

      const userRoles = []

      if (req.user.is_superadmin) {
         userRoles.push('admin', 'superadmin')
      }

      if (req.user.role?.name) {
         userRoles.push(req.user.role.name.toLowerCase())
      }

      const allowedRoles = roles.map((role) => role.toLowerCase())
      const hasRole = allowedRoles.some((role) => userRoles.includes(role))

      if (!hasRole) {
         return res.status(HttpStatusCode.Forbidden).json({
            success: false,
            message: 'Forbidden: Insufficient permissions'
         })
      }

      next()
   }
}

const authentication = async (req, res, next) => {
   try {
      const reqToken = req.cookies?.token || null

      if (!reqToken) {
         throw {
            code: HttpStatusCode.Unauthorized,
            message: 'Unauthorized, token not found'
         }
      }

      const decodedToken = JWT.verifyToken(reqToken)

      const user = await db.user.findOne({
         where: { id: decodedToken.id }
      })

      if (!user) {
         throw {
            code: HttpStatusCode.Unauthorized,
            message: 'Unauthorized, Invalid Token'
         }
      }

      if (!user.status) {
         throw {
            code: HttpStatusCode.Unauthorized,
            message: 'Unauthorized, Account is not active'
         }
      }

      const role = user.role_id ? await db.role.findByPk(user.role_id) : null

      req.user = {
         id: user.id,
         name: user.name,
         email: user.email,
         role_id: user.role_id,
         is_superadmin: Boolean(role?.is_superadmin),
         role: role
            ? {
               id: role.id,
               name: role.name
            }
            : null
      }

      next()
   } catch (err) {
      err.code = err.code ?? HttpStatusCode.InternalServerError

      if (err.name === 'JsonWebTokenError') {
         const error = {
            message: 'Unauthorized, invalid token',
            code: HttpStatusCode.Unauthorized
         }
         return res.status(error.code).json(api(null, error.code, { err: error }))
      }

      if (err.name === 'TokenExpiredError') {
         const error = {
            message: 'Unauthorized, token expired',
            code: HttpStatusCode.Unauthorized
         }
         return res.status(error.code).json(api(null, error.code, { err: error }))
      }

      res.status(err.code).json(api(null, err.code, { err }))
   }
}

module.exports = { authentication, authorize }
