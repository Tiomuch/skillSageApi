import { Router } from 'express'
import { createPost, getPosts, getPostById, updatePost, deletePost } from '../controllers/posts.controller.js'

const router = Router()

router.post('/', createPost)
router.put('/:id', updatePost)
router.delete('/:id', deletePost)
router.get('/', getPosts)
router.get('/:id', getPostById)

export default router
