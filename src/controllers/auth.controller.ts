import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../db.js'

export type User = {
  id: number
  username: string
  password: string
  secret_word: string
  refresh_token: string
}

type UserRegisterBody = {
  username: string
  password: string
  secret_word: string
}

type UserAuthBody = {
  username: string
  password: string
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, secret_word } = req.body as UserRegisterBody

    const users = await db.query<User>('SELECT * from users where username = $1', [username])

    if (!!users?.rows[0]) {
      res.status(400).json({
        message: 'Name already in use',
      })

      return
    }

    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)
    const hashedSecretWord = bcrypt.hashSync(secret_word, salt)

    const newPerson = await db.query<User>(
      'INSERT INTO users (username, password, secret_word) values ($1, $2, $3) returning *',
      [username, hashedPassword, hashedSecretWord],
    )
    const newUser = newPerson.rows[0]

    const accessToken = jwt.sign({ id: newUser.id, username }, process.env.ACCESS_TOKEN_KEY || '', {
      expiresIn: '1h',
    })
    const refreshToken = jwt.sign({ id: newUser.id, username }, process.env.REFRESH_TOKEN_KEY || '', {
      expiresIn: '30d',
    })

    await db.query('UPDATE users set refresh_token = $1 where username = $2 returning *', [refreshToken, username])

    res.status(200).json({ data: newUser, accessToken, refreshToken })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as UserAuthBody
    const users = await db.query<User>('SELECT * from users where username = $1', [username])

    if (!users?.rows[0]) {
      res.status(400).json({
        message: 'User does not exist',
      })

      return
    }

    const passwordCorrect = bcrypt.compareSync(password, users?.rows[0]?.password)

    if (!passwordCorrect) {
      res.status(400).json({
        message: 'Password is not correct',
      })

      return
    }

    const user = users.rows[0]

    const accessToken = jwt.sign({ id: user.id, username }, process.env.ACCESS_TOKEN_KEY || '', {
      expiresIn: '1h',
    })
    const refreshToken = jwt.sign({ id: user.id, username }, process.env.REFRESH_TOKEN_KEY || '', {
      expiresIn: '30d',
    })

    await db.query('UPDATE users set refresh_token = $1 where username = $2 returning *', [refreshToken, username])

    res.status(200).json({ data: user, accessToken, refreshToken })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const profile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers['authorization'] as string
    const user = jwt.decode(token?.split(' ')[1]) as User | null

    if (!user) {
      res.status(400).json({
        message: 'Invalid token',
      })

      return
    }

    const dbUser = await db.query('SELECT * from users where username = $1', [user.username])

    if (!dbUser?.rows[0]) {
      res.status(400).json({
        message: 'User does not exist',
      })

      return
    }

    res.status(200).json(dbUser?.rows[0])
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const passwordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, secret_word } = req.body as UserRegisterBody

    const users = await db.query('SELECT * from users where username = $1', [username])

    if (!users?.rows[0]) {
      res.status(400).json({
        message: 'User does not exist',
      })

      return
    }

    const secretWordCorrect = bcrypt.compareSync(secret_word, users?.rows[0]?.secret_word)

    if (!secretWordCorrect) {
      res.status(400).json({
        message: 'Secret code is not correct',
      })

      return
    }

    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)

    await db.query('UPDATE users set password = $1 where username = $2 returning *', [hashedPassword, username])

    res.status(200).json({
      message: 'Password changed successfully',
    })
  } catch (error) {
    res.status(500).json({
      message: 'Something went wrong',
      error,
    })
  }
}

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.body.token

  if (!token) {
    res.status(403).send('A token is required for refreshing')
  }

  try {
    jwt.verify(token, process.env.REFRESH_TOKEN_KEY as string)

    const user = jwt.decode(token) as User

    const users = await db.query<User>('SELECT * from users where username = $1', [user.username])

    if (!users?.rows[0]) {
      res.status(401).json({
        message: 'User does not exist',
      })

      return
    }

    if (users?.rows[0]?.refresh_token !== token) {
      res.status(401).json({
        message: 'Tokens do not match',
      })

      return
    }

    const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.ACCESS_TOKEN_KEY || '', {
      expiresIn: '1h',
    })
    const refreshToken = jwt.sign({ id: user.id, username: user.username }, process.env.REFRESH_TOKEN_KEY || '', {
      expiresIn: '30d',
    })

    await db.query('UPDATE users set refresh_token = $1 where username = $2 returning *', [refreshToken, user.username])

    res.status(200).json({ accessToken, refreshToken })
  } catch (error) {
    res.status(401).send('Invalid Token')
  }
}
