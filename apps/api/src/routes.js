const router = require('express').Router()
const { authentication } = require('../src/middleware/auth')

router.get('/status', (req, res) => {
   res.send('Running ⚡')
})

// V1 API routes
router.use('/v1/auth', require('./modules/dashboard/auth'))
router.use('/v1/users', authentication, require('./modules/dashboard/users'))
router.use('/v1/diseases', require('./modules/diseases'))
router.use('/v1/quiz', require('./modules/quiz'))
router.use('/v1/leaderboards', require('./modules/leaderboards'))
router.use('/v1/ai', require('./modules/ai'))
router.use('/v1/groups', require('./modules/groups'))
router.use('/v1/admin', require('./modules/admin'))

module.exports = router
