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
      location: 'Create comment method',
    })
  }
}

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10, sort_variant = 'ASC' } = req.query

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const query = `
      SELECT c.*, 
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) AS likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) AS dislikes_count,
        MAX(CASE WHEN l.user_id = $1 THEN CAST(l.liked AS INT) ELSE NULL END) AS liked,
        u.username, u.id AS user_id, u.nickname
      FROM comments c 
      LEFT JOIN likes_for_comments l ON c.id = l.comment_id
      JOIN users u ON c.user_id = u.id
      GROUP BY c.id, u.id 
      ORDER BY c.created_at ${sort_variant}
      LIMIT $2
    `

    const commentsResult = await db.query(query, [user?.id, limit])

    const comments = commentsResult.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      content: row.content,
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

    const totalResult = await db.query(`SELECT COUNT(*) from comments`)
    const total = +totalResult.rows[0].count

    res.status(200).json({ data: comments, total })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Get comments method',
    })
  }
}

export const getCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const query = `
      SELECT c.*, 
        COALESCE(SUM(CASE WHEN l.liked THEN 1 ELSE 0 END), 0) AS likes_count,
        COALESCE(SUM(CASE WHEN NOT l.liked THEN 1 ELSE 0 END), 0) AS dislikes_count,
        MAX(CASE WHEN l.user_id = $1 THEN CAST(l.liked AS INT) ELSE NULL END) AS liked,
        u.username, u.id AS user_id, u.nickname
      FROM comments c 
      LEFT JOIN likes_for_comments l ON c.id = l.comment_id 
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $2 
      GROUP BY c.id, u.id
    `

    const commentsResult = await db.query(query, [user?.id, id])

    if (!commentsResult?.rows[0]) {
      res.status(400).json({
        message: 'Comment does not exist',
      })
      return
    }

    const comment = commentsResult.rows[0]

    const commentData = {
      id: comment.id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      likes_count: comment.likes_count,
      dislikes_count: comment.dislikes_count,
      liked: comment.liked,
      user: {
        id: comment.user_id,
        username: comment.username,
        nickname: comment.nickname,
      },
    }

    res.status(200).json(commentData)
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Get comment by id method',
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
      location: 'Update comment method',
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
      location: 'Delete comment method',
    })
  }
}
