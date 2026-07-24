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
    const { code, name, password } = req.body
    if (!code?.trim() || !name?.trim() || !password)
      return res.status(400).json({ error: 'Family code, name and password are required.' })

    const { data: family } = await supabase
      .from('families').select('id').eq('code', code.trim().toUpperCase()).maybeSingle()
    if (!family) return res.status(401).json({ error: 'Incorrect family code, name or password.' })

    const { data: user } = await supabase
      .from('family_users')
      .select('id, name, color_index, password')
      .eq('family_id', family.id)
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
      { id: user.id, name: user.name, color_index: user.color_index, role: 'member', family_id: family.id },
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
    const { code, password } = req.body
    if (!code?.trim() || !password)
      return res.status(400).json({ error: 'Family code and password are required.' })

    const { data: family } = await supabase
      .from('families').select('id, password_hash').eq('code', code.trim().toUpperCase()).maybeSingle()
    if (!family) return res.status(401).json({ error: 'Incorrect family code or password.' })

    const valid = await bcrypt.compare(password, family.password_hash)
    if (!valid) return res.status(401).json({ error: 'Incorrect family code or password.' })

    const token = jwt.sign({ role: 'admin', family_id: family.id }, process.env.JWT_SECRET, { expiresIn: '4h' })
    res.json({ token })
  } catch (err) {
    console.error('Admin login error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

export default router
