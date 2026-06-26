import { useState, useEffect } from 'react'
import { Monitor, Sparkles, ShieldCheck, Loader2 } from 'lucide-react'
import { getUsers } from '../utils/api'

const COLOR_POOL = [
  { gradient: 'from-violet-500 to-purple-600', border: 'hover:border-violet-300', shadow: 'hover:shadow-violet-200', tag: 'bg-violet-100 text-violet-600' },
  { gradient: 'from-blue-500 to-indigo-600',   border: 'hover:border-blue-300',   shadow: 'hover:shadow-blue-200',   tag: 'bg-blue-100 text-blue-600'   },
  { gradient: 'from-rose-500 to-pink-600',     border: 'hover:border-rose-300',   shadow: 'hover:shadow-rose-200',   tag: 'bg-rose-100 text-rose-600'   },
  { gradient: 'from-green-500 to-emerald-600', border: 'hover:border-green-300',  shadow: 'hover:shadow-green-200',  tag: 'bg-green-100 text-green-600'  },
  { gradient: 'from-orange-500 to-amber-600',  border: 'hover:border-orange-300', shadow: 'hover:shadow-orange-200', tag: 'bg-orange-100 text-orange-600' },
  { gradient: 'from-teal-500 to-cyan-600',     border: 'hover:border-teal-300',   shadow: 'hover:shadow-teal-200',   tag: 'bg-teal-100 text-teal-600'   },
]

export default function Welcome({ onUserSelect, onAdminAccess }) {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Cannot connect to database. Check your .env credentials.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Hero */}
      <div className="text-center mb-14 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Monitor size={28} className="text-white" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Tech World
          </h1>
        </div>
        <p className="text-3xl font-bold text-gray-700">Hi Welcome to Tech World</p>
        <p className="text-gray-400 mt-3 text-lg flex items-center justify-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          Family Expenses Tracker — Select your profile
          <Sparkles size={16} className="text-indigo-400" />
        </p>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center gap-3 text-indigo-500 mb-8">
          <Loader2 size={22} className="animate-spin" />
          <span className="font-semibold">Connecting to database…</span>
        </div>
      )}
      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-6 py-4 text-sm font-medium max-w-md text-center">
          {error}
        </div>
      )}

      {/* User cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {users.map((user, i) => {
            const style = COLOR_POOL[user.color_index ?? i % COLOR_POOL.length]
            return (
              <button
                key={user.id}
                onClick={() => onUserSelect(user.name)}
                className={`group flex flex-col items-center p-5 rounded-3xl bg-white shadow-xl border-2 border-transparent ${style.border} ${style.shadow} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white text-2xl font-black mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-base font-bold text-gray-800 mb-1 truncate w-full text-center">{user.name}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.tag}`}>
                  Tap to enter
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Admin button */}
      <button
        onClick={onAdminAccess}
        className="mt-12 flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-colors shadow-lg"
      >
        <ShieldCheck size={18} />
        Admin Panel — Family Budget
      </button>

      <p className="mt-6 text-xs text-gray-300 tracking-widest uppercase">Family Expenses © 2026</p>
    </div>
  )
}
