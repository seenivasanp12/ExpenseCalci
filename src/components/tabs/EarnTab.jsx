import { useState } from 'react'
import { Plus, Trash2, TrendingUp, Briefcase, Star, Loader2 } from 'lucide-react'

export default function EarnTab({ earn, onAdd, onDelete }) {
  const [desc, setDesc]     = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const total = earn.reduce((s, e) => s + Number(e.amount || 0), 0)

  const handleAdd = async () => {
    if (!desc.trim() || !amount) return
    setSaving(true)
    try {
      const isSalary = desc.toLowerCase().includes('salary')
      await onAdd(desc.trim(), Number(amount), isSalary)
      setDesc(''); setAmount('')
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
      <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <TrendingUp size={16} />
          <span className="text-sm font-medium">Total Earnings this month</span>
        </div>
        <p className="text-4xl font-black tracking-tight">₹{total.toLocaleString('en-IN')}</p>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {earn.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <TrendingUp size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No earnings added yet</p>
          </div>
        ) : (
          earn.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-green-50 transition-colors group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${entry.isSalary ? 'bg-green-100' : 'bg-blue-100'}`}>
                {entry.isSalary ? <Briefcase size={18} className="text-green-600" /> : <Star size={18} className="text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{entry.description}</p>
                {entry.isSalary && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Salary</span>}
              </div>
              <p className="font-black text-green-600 text-lg whitespace-nowrap">₹{Number(entry.amount).toLocaleString('en-IN')}</p>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deleting === entry.id}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {deleting === entry.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))
        )}
      </div>

      {earn.length > 1 && (
        <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center border border-green-100">
          <span className="text-sm text-gray-500 font-medium">{earn.length} income sources</span>
          <span className="font-black text-green-600">= ₹{total.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Add form */}
      <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 border border-indigo-100">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center"><Plus size={14} /></div>
          Add Earning
        </div>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Salary / Extra work this week"
          className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:border-indigo-400 outline-none text-gray-800 bg-white text-sm"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Amount"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-indigo-200 focus:border-indigo-400 outline-none text-gray-800 bg-white text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!desc.trim() || !amount || saving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
