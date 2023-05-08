import pg from 'pg'
import dotenv from 'dotenv'

const { Pool } = pg

dotenv.config()

const pool = new Pool({
  user: 'postgres',
  password: process.env.PASSWORD || 'password',
  host: 'localhost',
  port: 5432,
  database: 'skillSage',
})

export default pool
