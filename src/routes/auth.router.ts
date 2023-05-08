import { Router } from 'express'
import { login, register, profile, passwordReset } from '../controllers/auth.controller.js'
import verifyToken from '../middlewares/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/password-reset', passwordReset)
router.get('/profile', verifyToken, profile)

export default router
