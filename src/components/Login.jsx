import { useState } from 'react'
import { Eye, EyeOff, Lock, ArrowLeft, ShieldCheck } from 'lucide-react'
import { loginUser, storeToken } from '../utils/api'

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-cyan-600',
]

export default function Login({ familyCode, username, onSuccess, onBack }) {
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  const gradient = GRADIENTS[(username?.charCodeAt(0) ?? 0) % GRADIENTS.length]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token, user } = await loginUser(familyCode, username, password)
      storeToken(token)
      onSuccess(user)
    } catch (err) {
      setError(err.message.includes('Incorrect') ? err.message : 'Cannot connect to server. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-8 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to profiles</span>
        </button>

        <div className="text-center mb-8">
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-5xl font-black mx-auto mb-5 shadow-xl`}>
            {username?.[0]?.toUpperCase()}
          </div>
          <h2 className="text-3xl font-black text-gray-800">Hi {username}!</h2>
          <p className="text-gray-400 mt-2">Please enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Enter your password"
              className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-base transition-colors"
              autoFocus
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!password || loading}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${gradient} text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-3 shadow-lg`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Checking…
              </span>
            ) : (
              <><ShieldCheck size={20} /> Enter Dashboard</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
