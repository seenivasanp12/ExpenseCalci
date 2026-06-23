import { supabase } from './supabase'

// ── Password hashing (SHA-256 via Web Crypto — no extra library needed) ────

export const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Default users — seeded once when the DB is empty ──────────────────────

const DEFAULTS = [
  { name: 'Viji',       password: 'viji1234',   color_index: 0 },
  { name: 'Seenivasan', password: 'seen1234',   color_index: 1 },
  { name: 'Anusha',     password: 'anusha1234', color_index: 2 },
]

const seedDefaults = async () => {
  const rows = await Promise.all(
    DEFAULTS.map(async (u) => ({
      name: u.name,
      password: await hashPassword(u.password),
      color_index: u.color_index,
    }))
  )
  await supabase.from('family_users').insert(rows)
}

// ── User management ────────────────────────────────────────────────────────

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('family_users')
    .select('id, name, color_index')
    .order('created_at')
  if (error) throw error
  if (data.length === 0) {
    await seedDefaults()
    const { data: seeded } = await supabase
      .from('family_users')
      .select('id, name, color_index')
      .order('created_at')
    return seeded || []
  }
  return data
}

export const verifyPassword = async (name, password) => {
  const hash = await hashPassword(password)
  const { data } = await supabase
    .from('family_users')
    .select('id, name, color_index')
    .eq('name', name)
    .eq('password', hash)
    .single()
  if (!data) return { ok: false }
  return { ok: true, user: data }
}

export const addUser = async (name, password, colorIndex = 0) => {
  const { data: existing } = await supabase
    .from('family_users')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (existing) return { ok: false, error: 'A member with that name already exists.' }

  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('family_users')
    .insert({ name, password: hash, color_index: colorIndex })
    .select('id, name, color_index')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, user: data }
}

export const removeUser = async (userId) => {
  const { error } = await supabase
    .from('family_users')
    .delete()
    .eq('id', userId)
  if (error) throw error
}

export const changePassword = async (userId, newPassword) => {
  const hash = await hashPassword(newPassword)
  const { error } = await supabase
    .from('family_users')
    .update({ password: hash })
    .eq('id', userId)
  return !error
}

// ── Monthly data ───────────────────────────────────────────────────────────

export const getData = async (userId, year, month) => {
  const [{ data: earnRows }, { data: expRows }, { data: achRows }] = await Promise.all([
    supabase.from('earnings').select('*').eq('user_id', userId).eq('year', year).eq('month', month).order('created_at'),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('year', year).eq('month', month),
    supabase.from('achievements').select('*').eq('user_id', userId).eq('year', year).eq('month', month).order('entry_date'),
  ])

  // Normalise expenses → { day: { id, amount, remark } }
  const expenses = {}
  ;(expRows || []).forEach(e => {
    expenses[e.day] = { id: e.id, amount: String(e.amount ?? ''), remark: e.remark ?? '' }
  })

  return {
    earn: (earnRows || []).map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      isSalary: e.is_salary,
    })),
    expenses,
    achievements: (achRows || []).map(a => ({
      id: a.id,
      date: a.entry_date,
      amount: a.amount,
      remark: a.remark,
    })),
  }
}

// ── Earnings ───────────────────────────────────────────────────────────────

export const addEarning = async (userId, year, month, description, amount, isSalary) => {
  const { data, error } = await supabase
    .from('earnings')
    .insert({ user_id: userId, year, month, description, amount, is_salary: isSalary })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, description: data.description, amount: data.amount, isSalary: data.is_salary }
}

export const deleteEarning = async (id) => {
  const { error } = await supabase.from('earnings').delete().eq('id', id)
  if (error) throw error
}

// ── Expenses (upsert — safe to call on every keystroke with debounce) ──────

export const upsertExpense = async (userId, year, month, day, amount, remark) => {
  const { error } = await supabase.from('expenses').upsert(
    { user_id: userId, year, month, day, amount: Number(amount) || 0, remark: remark || '' },
    { onConflict: 'user_id,day,month,year' }
  )
  if (error) throw error
}

// ── Achievements ───────────────────────────────────────────────────────────

export const addAchievement = async (userId, year, month, date, amount, remark) => {
  const { data, error } = await supabase
    .from('achievements')
    .insert({ user_id: userId, year, month, entry_date: date, amount, remark: remark || '' })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, date: data.entry_date, amount: data.amount, remark: data.remark }
}

export const deleteAchievement = async (id) => {
  const { error } = await supabase.from('achievements').delete().eq('id', id)
  if (error) throw error
}
