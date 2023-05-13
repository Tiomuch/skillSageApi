import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type CategoryRequestBody = {
  title: string
}

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body as CategoryRequestBody

    const categories = await db.query<User>('SELECT * from categories where title = $1', [title])

    if (!!categories?.rows[0]) {
      res.status(400).json({
        message: 'The category has already been created',
      })

      return
    }

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const newCategory = await db.query('INSERT INTO categories (title, user_id) values ($1, $2) returning *', [
      title,
      user?.id,
    ])

    res.status(200).json(newCategory.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query

    const categories = await db.query('SELECT * from categories limit $1', [limit])

    const total = await db.query('SELECT COUNT(*) from categories')

    res.status(200).json({ data: categories.rows, total: +total.rows[0].count })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body as CategoryRequestBody
    const id = req.params.id

    const categories = await db.query('SELECT * from categories where id = $1', [id])

    if (!categories?.rows[0]) {
      res.status(400).json({
        message: 'Category does not exist',
      })

      return
    }

    const category = await db.query('UPDATE categories set title = $1 where id = $2 returning *', [title, id])

    res.status(200).json(category?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id

    const categories = await db.query('SELECT * from categories where id = $1', [id])

    if (!categories?.rows[0]) {
      res.status(400).json({
        message: 'Category does not exist',
      })

      return
    }

    await db.query('DELETE from categories where id = $1', [id])

    res.status(200).json({
      message: 'Category successfully deleted',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}