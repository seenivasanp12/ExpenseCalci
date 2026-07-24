import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router    = Router()
const SALT_ROUNDS = 12

// Public — welcome screen needs this without auth, scoped to one family via ?code=
router.get('/', async (req, res) => {
  try {
    const code = req.query.code?.trim().toUpperCase()
    if (!code) return res.status(400).json({ error: 'Family code is required.' })

    const { data: family } = await supabase
      .from('families').select('id').eq('code', code).maybeSingle()
    if (!family) return res.status(404).json({ error: 'No family found with that code.' })

    const { data, error } = await supabase
      .from('family_users')
      .select('id, name, color_index')
      .eq('family_id', family.id)
      .order('created_at')
    if (error) throw error

    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: add member (scoped to the admin's own family)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, password, color_index } = req.body
    const cleanName = name?.trim()
    if (!cleanName || !password)
      return res.status(400).json({ error: 'Name and password are required.' })
    if (!/^[a-zA-Z ]+$/.test(cleanName))
      return res.status(400).json({ error: 'Name must contain letters only.' })

    const { data: existing } = await supabase
      .from('family_users').select('id')
      .eq('family_id', req.user.family_id).eq('name', cleanName).maybeSingle()
    if (existing)
      return res.status(409).json({ error: 'A member with that name already exists.' })

    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const { data, error } = await supabase
      .from('family_users')
      .insert({ name: cleanName, password: hash, color_index: color_index ?? 0, family_id: req.user.family_id })
      .select('id, name, color_index')
      .single()
    if (error) throw error

    res.json({ ok: true, user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: remove member (CASCADE deletes all their data) — scoped to the admin's own family
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('family_users')
      .delete().eq('id', req.params.id).eq('family_id', req.user.family_id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: change member password — scoped to the admin's own family
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required.' })
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const { error } = await supabase.from('family_users')
      .update({ password: hash }).eq('id', req.params.id).eq('family_id', req.user.family_id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
