import { useState } from 'react'
import { Eye, EyeOff, ArrowLeft, UserPlus, CheckCircle2, Copy, Check } from 'lucide-react'
import { signupFamily } from '../utils/api'

const FIELDS = [
  { key: 'familyName',     label: 'Family Name',         placeholder: 'e.g. Perumaland Family' },
  { key: 'accountantName', label: 'Accountant Name',     placeholder: 'Who will manage the family budget' },
  { key: 'email',          label: 'Email',               placeholder: 'you@example.com', type: 'email' },
  { key: 'mobile',         label: 'Mobile Number',       placeholder: '10-digit mobile number' },
]

export default function FamilySignup({ onDone, onBack }) {
  const [form, setForm]           = useState({ familyName: '', accountantName: '', email: '', mobile: '', password: '', confirmPassword: '' })
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null) // { code, name }
  const [copied, setCopied]       = useState(false)

  const update = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.password || form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true); setError('')
    try {
      const { code, name } = await signupFamily(form)
      setResult({ code, name })
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(result.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-200">
            <CheckCircle2 size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Family created!</h2>
          <p className="text-gray-400 mt-2 text-sm">Save this Family Code — you and your family will use it to sign in.</p>

          <div className="mt-6 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl py-5 px-4">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">Family Code</p>
            <p className="text-3xl font-black text-indigo-700 tracking-widest">{result.code}</p>
            <button
              onClick={copyCode}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>

          <button
            onClick={() => onDone({ code: result.code, name: result.name })}
            className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200"
          >
            Continue to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <UserPlus size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Create your family</h2>
          <p className="text-gray-400 mt-1 text-sm">Set up your household's budget space</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {FIELDS.map(f => (
            <input
              key={f.key}
              type={f.type || 'text'}
              value={form[f.key]}
              onChange={update(f.key)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-sm transition-colors"
            />
          ))}

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={update('password')}
              placeholder="Password"
              className="w-full px-4 pr-11 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-sm transition-colors"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <input
            type={showPwd ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            placeholder="Confirm password"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-indigo-400 outline-none text-gray-800 text-sm transition-colors"
          />

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-indigo-200"
          >
            {loading ? 'Creating…' : 'Create Family'}
          </button>
        </form>
      </div>
    </div>
  )
}
