import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type PostRequestBody = {
  title: string
  description: string
}

export const createPost = async (req: Request, res: Response): Promise<void> => {
  const { title, description } = req.body as PostRequestBody

  const token = req.headers['authorization'] as string
  const user = jwt.decode(token?.split(' ')[1]) as User | null

  const newPost = await db.query('INSERT INTO posts (title, description, user_id) values ($1, $2, $3) returning *', [
    title,
    description,
    user?.id,
  ])

  res.status(200).json(newPost.rows[0])
}

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  const { limit = 10 } = req.query

  const posts = await db.query('SELECT * from posts limit $1', [limit])

  const total = await db.query('SELECT COUNT(*) from posts')

  res.status(200).json({ data: posts.rows, total: +total.rows[0].count })
}

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id

  const posts = await db.query('SELECT * from posts WHERE id = $1', [id])

  if (!posts?.rows[0]) {
    res.status(400).json({
      message: 'Post does not exist',
    })

    return
  }

  res.status(200).json(posts?.rows[0])
}

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  const { title, description } = req.body as PostRequestBody
  const id = req.params.id

  const posts = await db.query('SELECT * from posts where id = $1', [id])

  if (!posts?.rows[0]) {
    res.status(400).json({
      message: 'Post does not exist',
    })

    return
  }

  const post = await db.query('UPDATE posts set title = $1, description = $2 where id = $3 returning *', [
    title,
    description,
    id,
  ])

  res.status(200).json(post?.rows[0])
}

export const deletePost = async (req: Request, res: Response): Promise<void> => {
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
}
