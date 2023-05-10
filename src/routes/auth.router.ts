import { Router } from 'express'
import { login, register, profile, passwordReset, refreshToken } from '../controllers/auth.controller.js'
import verifyToken from '../middlewares/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/password-reset', passwordReset)
router.post('/refresh-token', refreshToken)
router.get('/profile', verifyToken, profile)

export default router
