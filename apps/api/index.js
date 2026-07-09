require('dotenv').config({})

const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const route = require('./src/routes')
const { createServer } = require('node:http')
const cookieParser = require('cookie-parser')
const swaggerSpec = require('./src/config/swagger')
const { apiReference } = require('@scalar/express-api-reference')
const rateLimit = require('express-rate-limit')
const db = require('./db/models')

function getAllowedOrigins() {
   return (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
}

const corsOptions = (req, callback) => {
   const mode = process.env.NODE_ENV || 'development'
   const origin = req.headers.origin
   const allowedOrigins = getAllowedOrigins()
   const allowsWildcardLocal = mode === 'local' && allowedOrigins.includes('*')

   if (!origin) {
      return callback(null, { origin: false, credentials: false })
   }

   if (allowsWildcardLocal || allowedOrigins.includes(origin)) {
      return callback(null, { origin: true, credentials: true })
   }

   return callback(null, { origin: false, credentials: false })
}

app.use(morgan('dev'))
app.use(cors(corsOptions))
app.use(cookieParser())

const authRateLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 20,
   standardHeaders: true,
   legacyHeaders: false,
   message: {
      success: false,
      message: 'Too many auth requests. Please try again later.',
      data: null
   }
})

if (process.env.NODE_ENV !== 'local') {
   app.use('/api/v1/auth', authRateLimiter)
}

function rawBodySaver(req, res, buf, encoding) {
   if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8')
   }
}

app.use(
   express.urlencoded({ extended: false, limit: '50mb', verify: rawBodySaver })
)
app.use(express.json({ limit: '50mb' }))

const healthRateLimiter = rateLimit({
   windowMs: 60 * 1000,
   max: 60,
   standardHeaders: true,
   legacyHeaders: false,
   message: {
      success: false,
      message: 'Too many health check requests. Please try again later.',
      data: null
   }
})

app.use('/health', healthRateLimiter, require('./src/modules/health'))

app.use('/api', route)
app.use('/reference', apiReference({ spec: { content: swaggerSpec } }))

app.use((req, res) => {
   res.status(404).json({
      success: false,
      message: 'Route not found',
      data: null
   })
})
// apps/api/index.js

const port = process.env.PORT || 8000
const server = createServer(app)

async function startServer() {
   try {
      await db.sequelize.authenticate()
      console.log('PostgreSQL Connected ⚡')

      server.listen(port, () => {
         console.log(`Server Running ⚡ PORT : ${port}`)
      })
   } catch (err) {
      console.error('PostgreSQL connection failed:', err.message)
      process.exit(1)
   }
}

if (require.main === module) {
   startServer()
}

module.exports = app
