import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './auth.controller.js'
import db from '../db.js'

type LikeRequestBody = {
  liked: boolean
  post_id?: string
  comment_id?: string
}

type GetLikesBody = {
  post_id?: string
  comment_id?: string
}

export const createLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { liked, post_id = null, comment_id = null } = req.body as LikeRequestBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    await db.query('INSERT INTO likes (liked, post_id, comment_id, user_id) values ($1, $2, $3, $4) returning *', [
      liked,
      post_id,
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
    })
  }
}

export const getLikes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { post_id = null, comment_id = null } = req.body as GetLikesBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    let tableColumn = 'post_id'
    let selectedId = post_id

    if (comment_id) {
      tableColumn = 'comment_id'
      selectedId = comment_id
    }

    const totalLikes = await db.query(`SELECT COUNT(*) from likes where ${tableColumn} = $1 and liked = true`, [
      selectedId,
    ])

    const totalDislikes = await db.query(`SELECT COUNT(*) from likes where ${tableColumn} = $1 and liked = false`, [
      selectedId,
    ])

    const likedByUser = await db.query(`SELECT * from likes where ${tableColumn} = $1 and user_id = $2`, [
      selectedId,
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
    })
  }
}

export const updateLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { liked, post_id = null, comment_id = null } = req.body as LikeRequestBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    let tableColumn = 'post_id'
    let selectedId = post_id

    if (comment_id) {
      tableColumn = 'comment_id'
      selectedId = comment_id
    }

    const likes = await db.query(`SELECT * from likes where ${tableColumn} = $1 and user_id = $2`, [
      selectedId,
      user?.id,
    ])

    if (!likes?.rows[0]) {
      res.status(400).json({
        message: 'Like does not exist',
      })

      return
    }

    await db.query(`UPDATE likes set liked = $1 where ${tableColumn} = $2 and user_id = $3 returning *`, [
      liked,
      selectedId,
      user?.id,
    ])

    res.status(200).json({
      message: 'Like successfully updated',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const deleteLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { post_id = null, comment_id = null } = req.body as GetLikesBody

    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    let tableColumn = 'post_id'
    let selectedId = post_id

    if (comment_id) {
      tableColumn = 'comment_id'
      selectedId = comment_id
    }

    const likes = await db.query(`SELECT * from likes where ${tableColumn} = $1 and user_id = $2`, [
      selectedId,
      user?.id,
    ])

    if (!likes?.rows[0]) {
      res.status(400).json({
        message: 'Like does not exist',
      })

      return
    }

    await db.query(`DELETE from likes where ${tableColumn} = $1 and user_id = $2`, [selectedId, user?.id])

    res.status(200).json({
      message: 'Like successfully deleted',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}
