const router = require('express').Router()
const express = require('express')
const { authentication } = require('../src/middleware/auth')

router.use(express.json())
router.use(express.urlencoded({ extended: true }))

router.get('/status', (req, res) => {
   res.send('Running ⚡')
})

// DASHBOARD
router.use('/dashboard/auth', require('./modules/dashboard/auth'))
router.use(
   '/dashboard/user',
   authentication,
   require('./modules/dashboard/users')
)
router.use('/dashboard/master', authentication)

// V1 API routes — reuse existing module routers
router.use('/v1/auth', require('./modules/dashboard/auth'))
router.use('/v1/users', require('./modules/dashboard/users'))
router.use('/v1/diseases', require('./modules/diseases'))
router.use('/v1/quiz', require('./modules/quiz'))
router.use('/v1/leaderboards', require('./modules/leaderboards'))
router.use('/v1/ai', require('./modules/ai'))
router.use('/v1/groups', require('./modules/groups'))
router.use('/v1/admin', require('./modules/admin'))

// Backward-compat: old /register route
router.use('/register', require('./modules/dashboard/auth'))

module.exports = router
