import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'
import { supabase } from '../db.js'

const router = Router()

// Detect and verify old SHA-256 hashes produced by the browser-side db.js
const sha256Hex = (str) => createHash('sha256').update(str).digest('hex')

router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body
    if (!name?.trim() || !password)
      return res.status(400).json({ error: 'Name and password are required.' })

    const { data: user } = await supabase
      .from('family_users')
      .select('id, name, color_index, password')
      .eq('name', name.trim())
      .maybeSingle()

    if (!user) return res.status(401).json({ error: 'Incorrect name or password.' })

    let valid = false

    if (user.password.startsWith('$2')) {
      // Modern bcrypt hash
      valid = await bcrypt.compare(password, user.password)
    } else {
      // Legacy SHA-256 hash — verify then upgrade to bcrypt transparently
      if (sha256Hex(password) === user.password) {
        valid = true
        const upgraded = await bcrypt.hash(password, 12)
        await supabase.from('family_users').update({ password: upgraded }).eq('id', user.id)
      }
    }

    if (!valid) return res.status(401).json({ error: 'Incorrect name or password.' })

    const token = jwt.sign(
      { id: user.id, name: user.name, color_index: user.color_index, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { id: user.id, name: user.name, color_index: user.color_index } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
})

router.post('/admin', async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required.' })
    if (password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ error: 'Incorrect admin password.' })

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '4h' })
    res.json({ token })
  } catch {
    res.status(500).json({ error: 'Server error.' })
  }
})

export default router
