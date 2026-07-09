require('dotenv').config({})

const jwt = require('jsonwebtoken')

const key = process.env.JWT_KEY
const expiresIn = process.env.JWT_EXPIRES_IN || '24h'

if (!key) {
   throw new Error('FATAL: JWT_KEY is not set')
}

function generateToken(payload) {
   return jwt.sign(payload, key, { expiresIn })
}

function verifyToken(token) {
   return jwt.verify(token, key)
}

function decodeToken(token) {
   return jwt.decode(token)
}

module.exports = { generateToken, verifyToken, decodeToken }
