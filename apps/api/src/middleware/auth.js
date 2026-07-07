const { HttpStatusCode } = require('axios')
const JWT = require('../utils/jwt')
const { user: User } = require('../../db/models')
const { api } = require('../utils/api')

/**
 * Authorization middleware for role-based access
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HttpStatusCode.Unauthorized).json({
        success: false,
        message: 'Unauthorized'
      })
    }

    const userRoles = []
    if (req.user.is_superadmin) userRoles.push('admin')

    const hasRole = roles.some((role) => userRoles.includes(role))

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
    const reqToken =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null) ||
      null

    if (!reqToken) {
      throw {
        code: HttpStatusCode.Unauthorized,
        message: 'Unauthorized, token not found'
      }
    }

    const token = reqToken
    const decodedToken = JWT.verifyToken(token)

    let me = null
    if (!me) {
      const user = await User.findOne({
        where: { id: decodedToken.id }
      })

      if (!user) {
        throw {
          code: HttpStatusCode.Unauthorized,
          message: 'Unauthorized, Invalid Token'
        }
      }

      const isActive =
        typeof user.status !== 'undefined' ? user.status : user.is_active

      if (!isActive) {
        throw {
          code: HttpStatusCode.Unauthorized,
          message: 'Unauthorized, Account is not active'
        }
      }

      me = user
    }

    req.user = {
      id: me.id,
      name: me.name,
      email: me.email,
      is_superadmin: decodedToken.is_superadmin
    }

    next()
  } catch (err) {
    console.error(err)
    err.code = err.code ?? HttpStatusCode.InternalServerError

    if (err.name === 'JsonWebTokenError') {
      const newErr = {
        message: 'Unauthorized, invalid token',
        code: HttpStatusCode.Unauthorized
      }
      return res
        .status(newErr.code)
        .json(api(null, newErr.code, { err: newErr }))
    }

    if (err.name === 'TokenExpiredError') {
      const newErr = {
        message: 'Unauthorized, token expired',
        code: HttpStatusCode.Unauthorized
      }
      return res
        .status(newErr.code)
        .json(api(null, newErr.code, { err: newErr }))
    }

    res.status(err.code).json(api(null, err.code, { err }))
  }
}

module.exports = { authentication, authorize }
