import process from 'node:process'
import { createRequire } from 'node:module'

process.env.NODE_ENV = 'local'
process.env.JWT_KEY = process.env.JWT_KEY || 'test-secret'
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'
process.env.SKIP_AI_EXPLANATIONS = 'true'

const require = createRequire(import.meta.url)

export default async function globalSetup() {
    return async function teardown() {
        const db = require('../db/models')
        const redis = require('../config/redis')

        await db.sequelize.close()
        redis.disconnect()
    }
}