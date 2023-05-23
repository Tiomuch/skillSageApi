import express, { Request, Response, NextFunction } from 'express'
import router from './routes/index.js'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 8000

const app = express()

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = '*'
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})

app.use(cors(corsOptions))

app.use(express.json())
app.use('/api', router)

app.use((error: Error, req: Request, res: Response) => {
  res.status(500).json({
    message: 'Something went wrong',
    error,
  })
})

app.listen(PORT, () => console.log(`Server started on port - ${PORT}`))
