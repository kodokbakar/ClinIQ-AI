require('dotenv').config()

const Redis = require('ioredis')

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
