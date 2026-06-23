// All requests go to our Express backend (proxied by Vite in dev).
// The backend holds the Supabase service key — it never reaches the browser.

export const getToken      = () => sessionStorage.getItem('fe_token')
export const storeToken    = (t) => sessionStorage.setItem('fe_token', t)
export const clearToken    = () => sessionStorage.removeItem('fe_token')

export const getAdminToken   = () => sessionStorage.getItem('fe_admin_token')
export const storeAdminToken = (t) => sessionStorage.setItem('fe_admin_token', t)
export const clearAdminToken = () => sessionStorage.removeItem('fe_admin_token')

const req = async (method, path, body, token) => {
  const res = await fetch(path, {
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

// ── Auth ────────────────────────────────────────────────────────────────────
export const loginUser  = (name, password) => req('POST', '/api/auth/login', { name, password })
export const loginAdmin = (password)       => req('POST', '/api/auth/admin', { password })

// ── Users (public — welcome screen) ────────────────────────────────────────
export const getUsers = () => req('GET', '/api/users')

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

export const upsertExpense = (year, month, day, amount, remark) =>
  authReq('PUT', `/api/data/expense/${day}`, { year, month, amount, remark })

export const addAchievement = (year, month, date, amount, remark) =>
  authReq('POST', '/api/data/achievement', { year, month, date, amount, remark })

export const deleteAchievement = (id) => authReq('DELETE', `/api/data/achievement/${id}`)

// ── Admin: all users + their data for a month ───────────────────────────────
export const getAdminData = (year, month) => adminReq('GET', `/api/data/admin/${year}/${month}`)
