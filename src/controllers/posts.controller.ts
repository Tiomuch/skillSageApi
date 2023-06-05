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
      location: 'Create post method',
    })
  }
}

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10, title = '', sort_variant = 'ASC', category_id = null, user_id = null } = req.query

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    let query = `SELECT p.id, p.user_id, p.category_id, p.title, p.description, p.created_at,
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) AS likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) AS dislikes_count,
        MAX(CASE WHEN l.user_id = $1 THEN CAST(l.liked AS INT) ELSE NULL END) AS liked,
        u.username, u.id AS user_id, u.nickname
      FROM posts p 
      LEFT JOIN likes_for_posts l ON p.id = l.post_id
      JOIN users u ON p.user_id = u.id
      WHERE p.title ILIKE $2 || '%'`

    const params = [user?.id, title, limit]

    if (!!category_id) {
      query += ' AND p.category_id = $4'

      params.push(category_id)
    }

    if (!!user_id) {
      const num = !!category_id ? 5 : 4

      query += ` AND p.user_id = $${num}`

      params.push(user_id)
    }

    query += ` GROUP BY p.id, u.id
      ORDER BY p.created_at ${sort_variant}
      LIMIT $3`

    const result = await db.query(query, params)

    const posts = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      category_id: row.category_id,
      title: row.title,
      description: row.description,
      created_at: row.created_at,
      likes_count: row.likes_count,
      dislikes_count: row.dislikes_count,
      liked: row.liked,
      user: {
        id: row.user_id,
        username: row.username,
        nickname: row.nickname,
      },
    }))

    const userPosition = category_id ? 3 : 2

    const totalResult = await db.query(
      `SELECT COUNT(*) from posts WHERE title ILIKE $1 || '%' ${category_id ? 'AND category_id = $2' : ''} ${
        user_id ? `AND user_id = $${userPosition}` : ''
      }`,
      user_id
        ? category_id
          ? [title, category_id, user_id]
          : [title, user_id]
        : category_id
        ? [title, category_id]
        : [title],
    )

    const total = +totalResult.rows[0].count

    res.status(200).json({ data: posts, total })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Get posts method',
    })
  }
}

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const query = `
      SELECT p.*, 
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) as likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) as dislikes_count,
        MAX(CASE WHEN l.user_id = $2 THEN CAST(l.liked AS INT) ELSE NULL END) as liked,
        u.id AS user_id, u.username, u.nickname
      FROM posts p
      LEFT JOIN likes_for_posts l ON p.id = l.post_id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
      GROUP BY p.id, u.id
    `

    const params = [id, user?.id]

    const result = await db.query(query, params)
    const post = result.rows[0]

    if (!post) {
      res.status(400).json({
        message: 'Post does not exist',
      })
      return
    }

    const populatedPost = {
      id: post.id,
      user_id: post.user_id,
      category_id: post.category_id,
      title: post.title,
      description: post.description,
      created_at: post.created_at,
      likes_count: post.likes_count,
      dislikes_count: post.dislikes_count,
      liked: post.liked,
      user: {
        id: post.user_id,
        username: post.username,
        nickname: post.nickname,
      },
    }

    res.status(200).json(populatedPost)
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Get post by id method',
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
      location: 'Update post method',
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
      location: 'Delete post method',
    })
  }
}
