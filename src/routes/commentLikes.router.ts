import { Router } from 'express'
import { createLike, getLikes, updateLike, deleteLike } from '../controllers/commentLikes.controller.js'

const router = Router()

router.post('/', createLike)
router.put('/', updateLike)
router.delete('/', deleteLike)
router.get('/', getLikes)

export default router
