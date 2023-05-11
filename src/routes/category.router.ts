import { Router } from 'express'
import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/category.controller.js'

const router = Router()

router.post('/', createCategory)
router.put('/:id', updateCategory)
router.delete('/:id', deleteCategory)
router.get('/', getCategories)

export default router
