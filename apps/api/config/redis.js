require('dotenv').config()
const Redis = require('ioredis')

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
}

const redis = new Redis(redisConfig)

redis.on('connect', () => {
  console.log('Redis Connected ⚡')
})

redis.on('error', (err) => {
  console.log('Redis Error', err.message)
})

module.exports = redis
