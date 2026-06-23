import jwt from 'jsonwebtoken'

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured')
  return process.env.JWT_SECRET
}

const extractToken = (req) => req.headers.authorization?.split(' ')[1]

export const requireAuth = (req, res, next) => {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    req.user = jwt.verify(token, secret())
    next()
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

export const requireAdmin = (req, res, next) => {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const decoded = jwt.verify(token, secret())
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' })
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}
