import { Request, Response } from 'express'
import db from '../db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

type User = {
  id: number
  name: string
  password: string
  secret_word: string
}

type UserRequestBody = {
  name: string
  password: string
  secret_word: string
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, password, secret_word } = req.body as UserRequestBody

  const user = await db.query<User>('SELECT * from users where name = $1', [name])

  if (!!user?.rows[0]) {
    res.status(400).json({
      message: 'Name already in use',
    })

    return
  }

  const salt = bcrypt.genSaltSync(10)
  const hashedPassword = bcrypt.hashSync(password, salt)
  const hashedSecretWord = bcrypt.hashSync(secret_word, salt)

  const newPerson = await db.query<User>(
    'INSERT INTO users (name, password, secret_word) values ($1, $2, $3) returning *',
    [name, hashedPassword, hashedSecretWord],
  )
  const newUser = newPerson.rows[0]

  const token = jwt.sign({ id: newUser.id, name }, process.env.TOKEN_KEY as string, {
    expiresIn: '1h',
  })

  res.status(200).json({ data: newUser, token })
}

export const login = (req: Request, res: Response) => {
  // TODO Add logic to user login
}
