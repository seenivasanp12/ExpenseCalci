// All requests go to our Express backend.
// VITE_API_URL must be set to the backend host (e.g. https://expensecalci.onrender.com).
// The backend holds the Supabase service key — it never reaches the client.

const API_BASE = import.meta.env.VITE_API_URL || ''

// localStorage keeps the session alive when the app is backgrounded on mobile.
export const getToken      = () => localStorage.getItem('fe_token')
export const storeToken    = (t) => localStorage.setItem('fe_token', t)
export const clearToken    = () => localStorage.removeItem('fe_token')

export const getAdminToken   = () => localStorage.getItem('fe_admin_token')
export const storeAdminToken = (t) => localStorage.setItem('fe_admin_token', t)
export const clearAdminToken = () => localStorage.removeItem('fe_admin_token')

const req = async (method, path, body, token) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const authReq  = (method, path, body) => req(method, path, body, getToken())
const adminReq = (method, path, body) => req(method, path, body, getAdminToken())

// ── Families ─────────────────────────────────────────────────────────────────
export const signupFamily = ({ familyName, accountantName, email, mobile, password }) =>
  req('POST', '/api/families/signup', { familyName, accountantName, email, mobile, password })

export const lookupFamily = (code) => req('POST', '/api/families/lookup', { code })

// ── Auth ────────────────────────────────────────────────────────────────────
export const loginUser  = (code, name, password) => req('POST', '/api/auth/login', { code, name, password })
export const loginAdmin = (code, password)       => req('POST', '/api/auth/admin', { code, password })

// ── Users (public — welcome screen) ────────────────────────────────────────
export const getUsers = (code) => req('GET', `/api/users?code=${encodeURIComponent(code)}`)

// ── Users (admin JWT required) ──────────────────────────────────────────────
export const addUser        = (name, password, color_index) =>
  adminReq('POST', '/api/users', { name, password, color_index })
export const removeUser     = (id)           => adminReq('DELETE', `/api/users/${id}`)
export const changePassword = (id, password) => adminReq('PUT',    `/api/users/${id}/password`, { password })

// ── Monthly data (member JWT required) ─────────────────────────────────────
export const getData = (year, month) => authReq('GET', `/api/data/${year}/${month}`)

export const addEarning = (year, month, description, amount, isSalary) =>
  authReq('POST', '/api/data/earn', { year, month, description, amount, isSalary })

export const deleteEarning = (id) => authReq('DELETE', `/api/data/earn/${id}`)

export const addExpense = (year, month, day, category, amount, remark) =>
  authReq('POST', '/api/data/expense', { year, month, day, category, amount, remark })

export const deleteExpense = (id) => authReq('DELETE', `/api/data/expense/${id}`)

export const addAchievement = (year, month, date, amount, remark) =>
  authReq('POST', '/api/data/achievement', { year, month, date, amount, remark })

export const deleteAchievement = (id) => authReq('DELETE', `/api/data/achievement/${id}`)

// ── Admin: all users + their data for a month ───────────────────────────────
export const getAdminData = (year, month) => adminReq('GET', `/api/data/admin/${year}/${month}`)
