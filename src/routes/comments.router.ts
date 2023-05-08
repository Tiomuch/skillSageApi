import { Router } from 'express'
import {
  createComment,
  getComments,
  getCommentById,
  updateComment,
  deleteComment,
} from '../controllers/comments.controller.js'

const router = Router()

router.post('/', createComment)
router.put('/:id', updateComment)
router.delete('/:id', deleteComment)
router.get('/', getComments)
router.get('/:id', getCommentById)

export default router
