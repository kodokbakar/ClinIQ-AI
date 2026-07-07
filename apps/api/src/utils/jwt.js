require('dotenv').config({})

const jwt = require('jsonwebtoken')
const key = process.env.JWT_KEY

function generateToken(payload) {
   return jwt.sign(payload, key)
}

function verifyToken(token) {
   return jwt.verify(token, key)
}

function decodeToken(token) {
   return jwt.decode(token)
}

module.exports = { generateToken, verifyToken, decodeToken }
