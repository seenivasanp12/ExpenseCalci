import { useState } from 'react'
import { Monitor, KeyRound, ArrowRight, Loader2 } from 'lucide-react'
import { lookupFamily } from '../utils/api'

const LAST_CODE_KEY = 'fe_last_family_code'

export default function FamilyGate({ onFamilyFound, onSignupClick }) {
  const [code, setCode]       = useState(() => localStorage.getItem(LAST_CODE_KEY) || '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setLoading(true); setError('')
    try {
      const { name } = await lookupFamily(clean)
      localStorage.setItem(LAST_CODE_KEY, clean)
      onFamilyFound({ code: clean, name })
    } catch (err) {
      setError(err.message || 'Cannot connect to server.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Monitor size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Family Expenses
          </h1>
        </div>
        <p className="text-gray-400 text-lg">Enter your Family Code to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-4">
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="Family Code (e.g. PF1001)"
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-base tracking-widest font-bold transition-colors"
            autoFocus
            autoCapitalize="characters"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-base hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? 'Checking…' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={onSignupClick}
          className="w-full text-center text-sm text-gray-400 hover:text-indigo-500 transition-colors pt-1"
        >
          New family? <span className="font-semibold">Sign up</span>
        </button>
      </form>

      <p className="mt-8 text-xs text-gray-300 tracking-widest uppercase">Family Expenses © 2026</p>
    </div>
  )
}
