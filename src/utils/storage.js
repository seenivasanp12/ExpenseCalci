const USERS_KEY = 'familyExpenses_users'

const DEFAULT_USERS = {
  Viji: 'viji1234',
  Seenivasan: 'seen1234',
  Anusha: 'anusha1234',
}

// ── User management ──────────────────────────────────────────

export const getUsers = () => {
  const stored = localStorage.getItem(USERS_KEY)
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS))
    return { ...DEFAULT_USERS }
  }
  return JSON.parse(stored)
}

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export const getUserList = () => Object.keys(getUsers())

export const verifyPassword = (username, password) => {
  const users = getUsers()
  return users[username] === password
}

export const addUser = (name, password) => {
  const users = getUsers()
  if (users[name]) return { ok: false, error: 'User already exists.' }
  users[name] = password
  saveUsers(users)
  return { ok: true }
}

export const removeUser = (name) => {
  const users = getUsers()
  delete users[name]
  saveUsers(users)
  // Delete all expense data for this user
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(`familyExpenses_${name}_`)) toRemove.push(key)
  }
  toRemove.forEach(k => localStorage.removeItem(k))
}

export const changePassword = (name, newPassword) => {
  const users = getUsers()
  if (!users[name]) return false
  users[name] = newPassword
  saveUsers(users)
  return true
}

// ── Expense data ─────────────────────────────────────────────

const getKey = (username, year, month) =>
  `familyExpenses_${username}_${year}_${String(month).padStart(2, '0')}`

const defaultData = () => ({ earn: [], expenses: {}, achievements: [] })

export const getData = (username, year, month) => {
  const key = getKey(username, year, month)
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : defaultData()
}

export const saveData = (username, year, month, data) => {
  const key = getKey(username, year, month)
  localStorage.setItem(key, JSON.stringify(data))
}
