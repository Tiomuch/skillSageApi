import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.body.token || req.query.token || req.headers['authorization']

  if (!token) {
    return res.status(403).send('A token is required for authentication')
  }

  try {
    jwt.verify(token?.split(' ')[1], process.env.TOKEN_KEY as string)
  } catch (err) {
    return res.status(401).send('Invalid Token')
  }

  return next()
}

export default verifyToken
