require('dotenv').config({})

const jwt = require('jsonwebtoken')

const key = process.env.JWT_KEY
const DEFAULT_EXPIRES_IN = '24h'
const EXPIRES_IN_PATTERN = /^\d+(ms|s|m|h|d)$/

if (!key) {
   throw new Error('FATAL: JWT_KEY is not set')
}

function getExpiresIn() {
   const value = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN

   if (!EXPIRES_IN_PATTERN.test(value)) {
      return DEFAULT_EXPIRES_IN
   }

   return value
}

function generateToken(payload) {
   return jwt.sign(payload, key, { expiresIn: getExpiresIn() })
}

function verifyToken(token) {
   return jwt.verify(token, key)
}

function decodeToken(token) {
   return jwt.decode(token)
}

module.exports = { generateToken, verifyToken, decodeToken }
