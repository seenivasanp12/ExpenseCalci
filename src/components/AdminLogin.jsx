import { useState } from 'react'
import { Eye, EyeOff, Lock, ArrowLeft, ShieldCheck } from 'lucide-react'
import { loginAdmin, storeAdminToken } from '../utils/api'

export default function AdminLogin({ familyCode, onSuccess, onBack }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { token } = await loginAdmin(familyCode, password)
      storeAdminToken(token)
      onSuccess()
    } catch (err) {
      setError(err.message.includes('Incorrect') ? err.message : 'Cannot connect to server.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'32px 32px'}} />

      <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to profiles
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Admin Console</h2>
          <p className="text-gray-400 mt-2 text-sm">Family Budget — Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Enter admin password"
              className="w-full pl-11 pr-12 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-base transition-colors bg-slate-50 focus:bg-white"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-base hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-40 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : (
              <>
                <ShieldCheck size={18} />
                Access Admin Console
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-300 text-center mt-6">Authorised access only</p>
      </div>
    </div>
  )
}
