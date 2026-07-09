const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const Redis = require('ioredis')

dotenv.config()

const rootEnvPath = path.resolve(__dirname, '../../../.env')

if (fs.existsSync(rootEnvPath)) {
   const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath))

   if (!process.env.REDIS_PASSWORD && rootEnv.REDIS_PASSWORD) {
      process.env.REDIS_PASSWORD = rootEnv.REDIS_PASSWORD
   }
}

const redisConfig = {
   host: process.env.REDIS_HOST || '127.0.0.1',
   port: Number(process.env.REDIS_PORT) || 6379
}

if (process.env.REDIS_PASSWORD) {
   redisConfig.password = process.env.REDIS_PASSWORD
}

const redis = new Redis(redisConfig)

redis.on('connect', () => {
   console.log('Redis Connected ⚡')
})

redis.on('error', (err) => {
   console.error('Redis Error', err.message)
})

module.exports = redis
