import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes     from './routes/auth.js'
import usersRoutes    from './routes/users.js'
import dataRoutes     from './routes/data.js'
import familiesRoutes from './routes/families.js'
import cardsRoutes    from './routes/cards.js'
import emiRoutes      from './routes/emi.js'
import mutualFundsRoutes from './routes/mutualFunds.js'

const app  = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// CORS — allowed origins from env, fallback to localhost for local dev
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim()),
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
]

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))

app.use(express.json({ limit: '100kb' }))

// Global rate limiter: 300 req / 15 min
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))

// Stricter limiter on auth + family signup/lookup endpoints: 20 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please wait 15 minutes.' },
})
app.use('/api/auth/',     authLimiter)
app.use('/api/families/', authLimiter)

app.use('/api/auth',     authRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/data',     dataRoutes)
app.use('/api/families', familiesRoutes)
app.use('/api/cards',    cardsRoutes)
app.use('/api/emi',      emiRoutes)
app.use('/api/mf',       mutualFundsRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () =>
  console.log(`[Family Expenses API] running on http://localhost:${PORT}`)
)
