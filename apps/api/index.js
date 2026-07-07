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

const mode = process.env.NODE_ENV || 'development'
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
   .split(',')
   .map((origin) => origin.trim())
   .filter(Boolean)

const corsOptions = (req, callback) => {
   const origin = req.headers.origin

   if (mode !== 'local' && origin && allowedOrigins.includes(origin)) {
      callback(null, { origin: true, credentials: true })
   } else if (mode === 'local') {
      callback(null, { origin: true, credentials: true })
   } else {
      const res = req.res || req.socket?.parser?.incoming?.res
      if (res && typeof res.status === 'function') {
         return res.status(500).json({
            success: false,
            message: 'Not allowed by CORS',
            data: null
         })
      }
      callback(new Error('Not allowed by CORS'))
   }
}

app.use(morgan('dev'))
app.use(cors(corsOptions))
app.use(cookieParser())
function rawBodySaver(req, res, buf, encoding) {
   if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8')
   }
}

app.use(
   express.urlencoded({ extended: false, limit: '50mb', verify: rawBodySaver })
)
app.use(express.json({ limit: '50mb' }))

app.use('/api', route)
app.use('/reference', apiReference({ spec: { content: swaggerSpec } }))

app.use((req, res, next) => {
   res.status(404).json({
      success: false,
      message: 'Route not found',
      data: null
   })
})
const port = process.env.PORT || 8000
const server = createServer(app)

server.listen(port, () => {
   console.log(`Server Running ⚡ PORT : ${port}`)
})

module.exports = app
