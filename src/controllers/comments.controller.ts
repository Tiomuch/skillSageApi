import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type CommentRequestBody = {
  text: string
  post_id: string
}

type CommentUpdateBody = {
  text: string
}

export const createComment = async (req: Request, res: Response): Promise<void> => {
  const { text, post_id } = req.body as CommentRequestBody

  const token = req.headers['authorization'] as string
  const user = jwt.decode(token?.split(' ')[1]) as User | null

  const newComment = await db.query('INSERT INTO comments (text, post_id, user_id) values ($1, $2, $3) returning *', [
    text,
    post_id,
    user?.id,
  ])

  res.status(200).json(newComment.rows[0])
}

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const { limit = 10 } = req.query

  const comments = await db.query('SELECT * from comments limit $1', [limit])

  const total = await db.query('SELECT COUNT(*) from comments')

  res.status(200).json({ data: comments.rows, total: +total.rows[0].count })
}

export const getCommentById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id

  const comments = await db.query('SELECT * from comments WHERE id = $1', [id])

  if (!comments?.rows[0]) {
    res.status(400).json({
      message: 'Comment does not exist',
    })

    return
  }

  res.status(200).json(comments?.rows[0])
}

export const updateComment = async (req: Request, res: Response): Promise<void> => {
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
}

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
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
}
