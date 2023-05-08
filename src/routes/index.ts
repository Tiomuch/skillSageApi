import { Router } from 'express'
import authRouter from './auth.router.js'
import postsRouter from './posts.router.js'
import verifyToken from '../middlewares/auth.js'

const router = Router()

router.use('/auth', authRouter)
router.use('/posts', verifyToken, postsRouter)

export default router
