import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes  from './routes/auth.js'
import usersRoutes from './routes/users.js'
import dataRoutes  from './routes/data.js'

const app  = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// CORS — Vite dev-server proxies so the real caller is localhost:5173
app.use(cors({ origin: true, credentials: true }))

app.use(express.json({ limit: '100kb' }))

// Global rate limiter: 300 req / 15 min
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))

// Stricter limiter on auth endpoints: 20 req / 15 min
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
}))

app.use('/api/auth',  authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/data',  dataRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () =>
  console.log(`[Family Expenses API] running on http://localhost:${PORT}`)
)
