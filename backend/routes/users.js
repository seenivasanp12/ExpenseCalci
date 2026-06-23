import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router    = Router()
const SALT_ROUNDS = 12

const DEFAULTS = [
  { name: 'Viji',       password: 'viji1234',   color_index: 0 },
  { name: 'Seenivasan', password: 'seen1234',   color_index: 1 },
  { name: 'Anusha',     password: 'anusha1234', color_index: 2 },
]

// Public — welcome screen needs this without auth
router.get('/', async (_req, res) => {
  try {
    let { data, error } = await supabase
      .from('family_users')
      .select('id, name, color_index')
      .order('created_at')
    if (error) throw error

    if (data.length === 0) {
      const rows = await Promise.all(
        DEFAULTS.map(async (u) => ({
          name: u.name,
          password: await bcrypt.hash(u.password, SALT_ROUNDS),
          color_index: u.color_index,
        }))
      )
      await supabase.from('family_users').insert(rows)
      ;({ data } = await supabase
        .from('family_users')
        .select('id, name, color_index')
        .order('created_at'))
    }

    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: add member
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, password, color_index } = req.body
    const cleanName = name?.trim()
    if (!cleanName || !password)
      return res.status(400).json({ error: 'Name and password are required.' })
    if (!/^[a-zA-Z ]+$/.test(cleanName))
      return res.status(400).json({ error: 'Name must contain letters only.' })

    const { data: existing } = await supabase
      .from('family_users').select('id').eq('name', cleanName).maybeSingle()
    if (existing)
      return res.status(409).json({ error: 'A member with that name already exists.' })

    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const { data, error } = await supabase
      .from('family_users')
      .insert({ name: cleanName, password: hash, color_index: color_index ?? 0 })
      .select('id, name, color_index')
      .single()
    if (error) throw error

    res.json({ ok: true, user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: remove member (CASCADE deletes all their data)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('family_users').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: change member password
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required.' })
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const { error } = await supabase.from('family_users').update({ password: hash }).eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
