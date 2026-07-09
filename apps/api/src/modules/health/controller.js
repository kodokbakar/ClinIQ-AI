// apps/api/src/modules/health/controller.js
const { HttpStatusCode } = require('axios')
const db = require('../../../db/models')
const redis = require('../../../config/redis')

const CHECK_TIMEOUT_MS = 1500

function withTimeout(check) {
   let timeoutId

   const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
         reject(new Error('health check timed out'))
      }, CHECK_TIMEOUT_MS)
   })

   return Promise.race([check(), timeout]).finally(() => clearTimeout(timeoutId))
}

async function runCheck(name, check) {
   try {
      await withTimeout(check)

      return {
         name,
         status: 'ok'
      }
   } catch {
      return {
         name,
         status: 'down'
      }
   }
}

class HealthController {
   static async show(req, res) {
      const checks = await Promise.all([
         runCheck('postgres', () => db.sequelize.authenticate()),
         runCheck('redis', async () => {
            if (redis.status !== 'ready') {
               throw new Error('redis is not ready')
            }

            await redis.ping()
         })
      ])

      const healthy = checks.every((check) => check.status === 'ok')
      const code = healthy ? HttpStatusCode.Ok : HttpStatusCode.ServiceUnavailable

      return res.status(code).json({
         success: healthy,
         message: healthy ? 'healthy' : 'unhealthy',
         data: {
            status: healthy ? 'ok' : 'down',
            checks,
            timestamp: new Date().toISOString()
         }
      })
   }
}

module.exports = HealthController
