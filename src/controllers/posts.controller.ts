import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type PostRequestBody = {
  title: string
  description: string
  category_id: number
}

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category_id } = req.body as PostRequestBody

    if (!title || !description || !category_id) {
      res.status(400).json({
        message: 'Bad request',
      })

      return
    }

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const newPost = await db.query(
      'INSERT INTO posts (title, description, category_id, user_id) values ($1, $2, $3, $4) returning *',
      [title, description, category_id, user?.id],
    )

    res.status(200).json(newPost.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10, title = '', sort_variant = 'ASC', category_id = null } = req.query

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    let query = `SELECT p.*, 
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) as likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) as dislikes_count,
        MAX(CASE WHEN l.user_id = $1 THEN CAST(l.liked AS INT) ELSE NULL END) as liked
      FROM posts p 
      LEFT JOIN likes_for_posts l ON p.id = l.post_id 
      WHERE p.title ILIKE $2 || '%'`

    const params = [user?.id, title]

    if (category_id) {
      query += ` AND p.category_id = $${params.length + 1}`
      params.push(category_id)
    }

    query += ` GROUP BY p.id 
      ORDER BY p.created_at ${sort_variant}
      LIMIT $${params.length + 1}`

    params.push(limit)

    const posts = await db.query(query, params)

    const total = await db.query(
      `SELECT COUNT(*) from posts WHERE title ILIKE $1 || '%' ${category_id ? 'AND category_id = $2' : ''}`,
      category_id ? [title, category_id] : [title],
    )

    res.status(200).json({ data: posts.rows, total: +total.rows[0].count })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const posts = await db.query(
      `
      SELECT p.*,
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) as likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) as dislikes_count,
        MAX(CASE WHEN l.user_id = $2 THEN CAST(l.liked AS INT) ELSE NULL END) as liked
      FROM posts p
      LEFT JOIN likes_for_posts l ON p.id = l.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `,
      [id, user?.id],
    )

    if (!posts?.rows[0]) {
      res.status(400).json({
        message: 'Post does not exist',
      })

      return
    }

    res.status(200).json(posts?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category_id } = req.body as PostRequestBody
    const id = req.params.id

    const posts = await db.query('SELECT * from posts where id = $1', [id])

    if (!posts?.rows[0]) {
      res.status(400).json({
        message: 'Post does not exist',
      })

      return
    }

    const post = await db.query(
      'UPDATE posts set title = $1, description = $2, category_id = $3 where id = $4 returning *',
      [title, description, category_id, id],
    )

    res.status(200).json(post?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id

    const posts = await db.query('SELECT * from posts where id = $1', [id])

    if (!posts?.rows[0]) {
      res.status(400).json({
        message: 'Post does not exist',
      })

      return
    }

    await db.query('DELETE from posts where id = $1', [id])

    res.status(200).json({
      message: 'Post successfully deleted',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}
