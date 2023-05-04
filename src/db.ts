import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  user: 'postgres',
  password: process.env.PASSWORD || 'password',
  host: 'localhost',
  port: 5432,
  database: 'skillSage',
})

export default pool
