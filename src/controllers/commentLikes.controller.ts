import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type LikeRequestBody = {
  liked: boolean
  comment_id: number
}

type GetLikesBody = {
  comment_id: number
}

export const createLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { liked, comment_id } = req.body as LikeRequestBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    await db.query('INSERT INTO likes_for_comments (liked, comment_id, user_id) values ($1, $2, $3) returning *', [
      liked,
      comment_id,
      user?.id,
    ])

    res.status(200).json({
      message: 'Like successfully created',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Create like for comment method',
    })
  }
}

export const getLikes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { comment_id } = req.body as GetLikesBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const totalLikes = await db.query(
      `SELECT COUNT(*) from likes_for_comments where comment_id = $1 and liked = true`,
      [comment_id],
    )

    const totalDislikes = await db.query(
      `SELECT COUNT(*) from likes_for_comments where comment_id = $1 and liked = false`,
      [comment_id],
    )

    const likedByUser = await db.query(`SELECT * from likes_for_comments where comment_id = $1 and user_id = $2`, [
      comment_id,
      user?.id,
    ])

    let liked = null

    if (likedByUser.rows[0]) {
      liked = likedByUser.rows[0].liked
    }

    res.status(200).json({
      likes: +totalLikes.rows[0].count,
      dislikes: +totalDislikes.rows[0].count,
      liked,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Get likes for comment method',
    })
  }
}

export const updateLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { liked, comment_id } = req.body as LikeRequestBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const likes = await db.query(`SELECT * from likes_for_comments where comment_id = $1 and user_id = $2`, [
      comment_id,
      user?.id,
    ])

    if (!likes?.rows[0]) {
      res.status(400).json({
        message: 'Like does not exist',
      })

      return
    }

    await db.query(`UPDATE likes_for_comments set liked = $1 where comment_id = $2 and user_id = $3 returning *`, [
      liked,
      comment_id,
      user?.id,
    ])

    res.status(200).json({
      message: 'Like successfully updated',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Update like for comment method',
    })
  }
}

export const deleteLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { comment_id } = req.body as GetLikesBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    const likes = await db.query(`SELECT * from likes_for_comments where comment_id = $1 and user_id = $2`, [
      comment_id,
      user?.id,
    ])

    if (!likes?.rows[0]) {
      res.status(400).json({
        message: 'Like does not exist',
      })

      return
    }

    await db.query(`DELETE from likes_for_comments where comment_id = $1 and user_id = $2`, [comment_id, user?.id])

    res.status(200).json({
      message: 'Like successfully deleted',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
      location: 'Delete like for comment method',
    })
  }
}
