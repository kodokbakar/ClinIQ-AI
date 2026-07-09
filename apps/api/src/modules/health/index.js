// apps/api/src/modules/health/index.js
const router = require('express').Router()
const HealthController = require('./controller')

router.get('/', HealthController.show)

module.exports = router
