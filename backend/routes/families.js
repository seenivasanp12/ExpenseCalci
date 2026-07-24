import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db.js'

const router = Router()
const SALT_ROUNDS = 12

// "PerumalandFamily" -> ["Perumaland", "Family"] -> "PF"
const makeInitials = (name) => {
  const tokens = name.trim().split(/(?=[A-Z])|[\s_-]+/).filter(Boolean)
  const picks = tokens.length >= 2 ? tokens.slice(0, 2) : [tokens[0], tokens[0]]
  return picks.map(t => t[0].toUpperCase()).join('').padEnd(2, 'X').slice(0, 2)
}

export const generateFamilyCode = async (name) => {
  const prefix = makeInitials(name)
  for (let attempt = 0; attempt < 20; attempt++) {
    const num = Math.floor(1000 + Math.random() * 9000)
    const code = `${prefix}${num}`
    const { data } = await supabase.from('families').select('id').eq('code', code).maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique family code, please retry.')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^[0-9]{7,15}$/

router.post('/signup', async (req, res) => {
  try {
    const { familyName, accountantName, email, mobile, password } = req.body
    const cleanFamily     = familyName?.trim()
    const cleanAccountant = accountantName?.trim()
    const cleanEmail      = email?.trim().toLowerCase()
    const cleanMobile     = mobile?.trim()

    if (!cleanFamily || !cleanAccountant || !cleanEmail || !cleanMobile || !password)
      return res.status(400).json({ error: 'All fields are required.' })
    if (!EMAIL_RE.test(cleanEmail))
      return res.status(400).json({ error: 'Enter a valid email address.' })
    if (!MOBILE_RE.test(cleanMobile))
      return res.status(400).json({ error: 'Enter a valid mobile number.' })
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })

    const code = await generateFamilyCode(cleanFamily)
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    const { data, error } = await supabase
      .from('families')
      .insert({
        name: cleanFamily,
        code,
        accountant_name: cleanAccountant,
        email: cleanEmail,
        mobile: cleanMobile,
        password_hash,
      })
      .select('code, name')
      .single()
    if (error) throw error

    res.json({ ok: true, code: data.code, name: data.name })
  } catch (err) {
    console.error('Family signup error:', err)
    res.status(500).json({ error: err.message || 'Server error. Please try again.' })
  }
})

router.post('/lookup', async (req, res) => {
  try {
    const code = req.body.code?.trim().toUpperCase()
    if (!code) return res.status(400).json({ error: 'Family code is required.' })

    const { data } = await supabase
      .from('families').select('id, name').eq('code', code).maybeSingle()
    if (!data) return res.status(404).json({ error: 'No family found with that code.' })

    res.json({ id: data.id, name: data.name })
  } catch (err) {
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
})

export default router
