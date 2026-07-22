import { Router } from 'express'
import { supabase } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

const fetchUserData = async (userId, year, month) => {
  const [{ data: earnRows }, { data: expRows }, { data: achRows }] = await Promise.all([
    supabase.from('earnings').select('*').eq('user_id', userId).eq('year', year).eq('month', month).order('created_at'),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('year', year).eq('month', month).order('day').order('created_at'),
    supabase.from('achievements').select('*').eq('user_id', userId).eq('year', year).eq('month', month).order('entry_date'),
  ])
  return {
    earn: (earnRows || []).map(e => ({ id: e.id, description: e.description, amount: e.amount, isSalary: e.is_salary })),
    expenses: (expRows || []).map(e => ({ id: e.id, day: e.day, category: e.category, amount: e.amount, remark: e.remark ?? '' })),
    achievements: (achRows || []).map(a => ({ id: a.id, date: a.entry_date, amount: a.amount, remark: a.remark })),
  }
}

// ── Member routes (JWT required) ───────────────────────────────────────────

router.get('/:year/:month', requireAuth, async (req, res) => {
  try {
    res.json(await fetchUserData(req.user.id, req.params.year, req.params.month))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/earn', requireAuth, async (req, res) => {
  try {
    const { year, month, description, amount, isSalary } = req.body
    const { data, error } = await supabase.from('earnings')
      .insert({ user_id: req.user.id, year, month, description, amount, is_salary: isSalary })
      .select().single()
    if (error) throw error
    res.json({ id: data.id, description: data.description, amount: data.amount, isSalary: data.is_salary })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/earn/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('earnings')
      .delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/expense', requireAuth, async (req, res) => {
  try {
    const { year, month, day, category, amount, remark } = req.body
    const { data, error } = await supabase.from('expenses')
      .insert({ user_id: req.user.id, year, month, day, category, amount: Number(amount) || 0, remark: remark || '' })
      .select().single()
    if (error) throw error
    res.json({ id: data.id, day: data.day, category: data.category, amount: data.amount, remark: data.remark })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/expense/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('expenses')
      .delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/achievement', requireAuth, async (req, res) => {
  try {
    const { year, month, date, amount, remark } = req.body
    const { data, error } = await supabase.from('achievements')
      .insert({ user_id: req.user.id, year, month, entry_date: date, amount, remark: remark || '' })
      .select().single()
    if (error) throw error
    res.json({ id: data.id, date: data.entry_date, amount: data.amount, remark: data.remark })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/achievement/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('achievements')
      .delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin route — all users' data in one shot ──────────────────────────────
router.get('/admin/:year/:month', requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.params
    const { data: users, error } = await supabase
      .from('family_users').select('id, name, color_index').order('created_at')
    if (error) throw error
    const entries = await Promise.all((users || []).map(async u => [u.id, await fetchUserData(u.id, year, month)]))
    res.json({ users: users || [], allData: Object.fromEntries(entries) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
