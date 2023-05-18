import pg from 'pg'
import dotenv from 'dotenv'

const { Pool } = pg

dotenv.config()

const pool = new Pool({
  user: 'postgre',
  password: process.env.PASSWORD || 'password',
  host: 'dpg-chij1qak728hm23vhs00-a.frankfurt-postgres.render.com',
  port: 5432,
  database: 'skillsage',
  ssl: {
    rejectUnauthorized: false,
  },
})

export default pool
