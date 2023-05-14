import { Router } from 'express'
import authRouter from './auth.router.js'
import postsRouter from './posts.router.js'
import commentsRouter from './comments.router.js'
import postLikesRouter from './postLikes.router.js'
import commentLikesRouter from './commentLikes.router.js'
import categoryRouter from './category.router.js'
import verifyToken from '../middlewares/auth.js'

const router = Router()

router.use('/auth', authRouter)
router.use('/categories', verifyToken, categoryRouter)
router.use('/posts', verifyToken, postsRouter)
router.use('/comments', verifyToken, commentsRouter)
router.use('/post-likes', verifyToken, postLikesRouter)
router.use('/comment-likes', verifyToken, commentLikesRouter)

export default router
