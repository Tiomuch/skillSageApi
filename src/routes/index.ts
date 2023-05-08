import { Router } from 'express'
import authRouter from './auth.router.js'
import postsRouter from './posts.router.js'
import commentsRouter from './comments.router.js'
import verifyToken from '../middlewares/auth.js'

const router = Router()

router.use('/auth', authRouter)
router.use('/posts', verifyToken, postsRouter)
router.use('/comments', verifyToken, commentsRouter)

export default router
