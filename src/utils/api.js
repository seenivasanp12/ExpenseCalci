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

export const addExpense = (year, month, day, category, amount, remark, paymentMethod, cardId) =>
  authReq('POST', '/api/data/expense', { year, month, day, category, amount, remark, paymentMethod, cardId })

export const deleteExpense = (id) => authReq('DELETE', `/api/data/expense/${id}`)

export const addAchievement = (year, month, date, amount, remark, type) =>
  authReq('POST', '/api/data/achievement', { year, month, date, amount, remark, type })

export const deleteAchievement = (id) => authReq('DELETE', `/api/data/achievement/${id}`)

// ── Admin: all users + their data for a month ───────────────────────────────
export const getAdminData = (year, month) => adminReq('GET', `/api/data/admin/${year}/${month}`)

// ── Credit cards (member JWT required) ──────────────────────────────────────
export const getCards = () => authReq('GET', '/api/cards')

export const addCard = (card) => authReq('POST', '/api/cards', card)

export const updateCard = (id, card) => authReq('PUT', `/api/cards/${id}`, card)

export const deleteCard = (id) => authReq('DELETE', `/api/cards/${id}`)

export const getCardExpenses = (id) => authReq('GET', `/api/cards/${id}/expenses`)

export const getCardPayments = (id) => authReq('GET', `/api/cards/${id}/payments`)

export const markCardPaid = (id, payment) => authReq('POST', `/api/cards/${id}/payments`, payment)

// ── EMI plans (member JWT required) ─────────────────────────────────────────
export const getEmis = () => authReq('GET', '/api/emi')

export const previewEmi = (plan) => authReq('POST', '/api/emi/preview', plan)

export const addEmi = (plan) => authReq('POST', '/api/emi', plan)

export const deleteEmi = (id) => authReq('DELETE', `/api/emi/${id}`)

export const confirmEmiDiscount = (id, { day, month, year, amount }) =>
  authReq('POST', `/api/emi/${id}/confirm-discount`, { day, month, year, amount })

// ── Mutual Funds (member JWT required) ──────────────────────────────────────
export const getMutualFunds = () => authReq('GET', '/api/mf/funds')

export const addMutualFund = (fund) => authReq('POST', '/api/mf/funds', fund)

export const deleteMutualFund = (id) => authReq('DELETE', `/api/mf/funds/${id}`)

export const addSip = (fundId, sip) => authReq('POST', `/api/mf/funds/${fundId}/sip`, sip)

export const stopSip = (id) => authReq('PATCH', `/api/mf/sips/${id}/stop`)

export const deleteSip = (id) => authReq('DELETE', `/api/mf/sips/${id}`)

export const addLumpsum = (fundId, contribution) => authReq('POST', `/api/mf/funds/${fundId}/lumpsum`, contribution)

export const deleteContribution = (id) => authReq('DELETE', `/api/mf/contributions/${id}`)

export const withdrawFund = (fundId, withdrawal) => authReq('POST', `/api/mf/funds/${fundId}/withdraw`, withdrawal)

export const deleteWithdrawal = (id) => authReq('DELETE', `/api/mf/withdrawals/${id}`)
