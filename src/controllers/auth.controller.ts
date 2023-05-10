import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../db.js'

export type User = {
  id: number
  username: string
  password: string
  secret_word: string
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

  const token = jwt.sign({ id: newUser.id, username }, process.env.TOKEN_KEY || '', {
    expiresIn: '1h',
  })

  res.status(200).json({ data: newUser, token })
}

export const login = async (req: Request, res: Response): Promise<void> => {
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

  const token = jwt.sign({ id: user.id, username }, process.env.TOKEN_KEY || '', {
    expiresIn: '1h',
  })

  res.status(200).json({ data: user, token })
}

export const profile = async (req: Request, res: Response): Promise<void> => {
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
}

export const passwordReset = async (req: Request, res: Response): Promise<void> => {
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
}
