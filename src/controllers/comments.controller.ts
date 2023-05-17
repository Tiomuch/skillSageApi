import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type CommentRequestBody = {
  text: string
  post_id: number
}

type CommentUpdateBody = {
  text: string
}

export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, post_id } = req.body as CommentRequestBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const newComment = await db.query('INSERT INTO comments (text, post_id, user_id) values ($1, $2, $3) returning *', [
      text,
      post_id,
      user?.id,
    ])

    res.status(200).json(newComment.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10, sort_variant = 'ASC' } = req.query

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const comments = await db.query(
      `SELECT c.*, 
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) as likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) as dislikes_count,
        MAX(CASE WHEN l.user_id = $1 THEN CAST(l.liked AS INT) ELSE NULL END) as liked
      FROM comments c 
      LEFT JOIN likes_for_comments l ON c.id = l.comment_id 
      GROUP BY c.id 
      ORDER BY c.created_at ${sort_variant}
      LIMIT $2`,
      [user?.id, limit],
    )

    const total = await db.query(`SELECT COUNT(*) from comments`)

    res.status(200).json({ data: comments.rows, total: +total.rows[0].count })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const getCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id

    const comments = await db.query('SELECT * from comments WHERE id = $1', [id])

    if (!comments?.rows[0]) {
      res.status(400).json({
        message: 'Comment does not exist',
      })

      return
    }

    res.status(200).json(comments?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const updateComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body as CommentUpdateBody
    const id = req.params.id

    const comments = await db.query('SELECT * from comments where id = $1', [id])

    if (!comments?.rows[0]) {
      res.status(400).json({
        message: 'Comment does not exist',
      })

      return
    }

    const comment = await db.query('UPDATE comments set text = $1 where id = $2 returning *', [text, id])

    res.status(200).json(comment?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id

    const comments = await db.query('SELECT * from comments where id = $1', [id])

    if (!comments?.rows[0]) {
      res.status(400).json({
        message: 'Comment does not exist',
      })

      return
    }

    await db.query('DELETE from comments where id = $1', [id])

    res.status(200).json({
      message: 'Comment successfully deleted',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}
