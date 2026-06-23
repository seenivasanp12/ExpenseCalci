import { useState } from 'react'
import { Plus, Trash2, Trophy, PiggyBank, TrendingUp, Loader2 } from 'lucide-react'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const QUICK_LABELS = ['SIP', 'Fixed Deposit', 'Recurring Deposit', 'Gold', 'PPF', 'Other']

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d} ${MONTH_SHORT[Number(m) - 1]} ${y}`
}

export default function AchievementTab({ achievements, onAdd, onDelete }) {
  const [form, setForm]       = useState({ date: '', amount: '', remark: '' })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  const total = achievements.reduce((s, a) => s + Number(a.amount || 0), 0)

  const handleAdd = async () => {
    if (!form.date || !form.amount) return
    setSaving(true)
    try {
      await onAdd(form.date, Number(form.amount), form.remark)
      setForm({ date: '', amount: '', remark: '' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <PiggyBank size={16} />
          <span className="text-sm font-medium">Total Savings / Investments</span>
        </div>
        <p className="text-4xl font-black tracking-tight">₹{total.toLocaleString('en-IN')}</p>
        <p className="text-xs opacity-70 mt-1">{achievements.length} {achievements.length === 1 ? 'entry' : 'entries'}</p>
      </div>

      {/* Table */}
      {achievements.length === 0 ? (
        <div className="text-center py-10 text-gray-300">
          <Trophy size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No savings added yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Amount</th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {achievements.map(a => (
                <tr key={a.id} className="bg-white hover:bg-amber-50 transition-colors group">
                  <td className="px-4 py-3 text-gray-500 text-xs font-medium whitespace-nowrap">{formatDate(a.date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                      <TrendingUp size={14} className="text-amber-500" />{a.remark || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-amber-600">₹{Number(a.amount).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                      className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deleting === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t border-amber-100">
                <td colSpan={2} className="px-4 py-3 font-bold text-amber-700">Total</td>
                <td className="px-4 py-3 text-right font-black text-amber-700 text-base">₹{total.toLocaleString('en-IN')}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add form */}
      <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-100">
        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
          <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center"><Plus size={14} /></div>
          Add Saving / Investment
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_LABELS.map(label => (
            <button
              key={label}
              onClick={() => setForm(f => ({ ...f, remark: label }))}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${form.remark === label ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className="w-full pl-8 pr-3 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <input type="text" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. SIP, Fixed Deposit…" className="flex-1 px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm" />
          <button onClick={handleAdd} disabled={!form.date || !form.amount || saving} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors text-sm flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
