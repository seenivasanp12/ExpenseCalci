import { useState } from 'react'
import { ShoppingCart, Plus, Trash2, Loader2, PartyPopper, Eye, EyeOff } from 'lucide-react'
import { CATEGORIES, getCategory } from '../../utils/categories'
import MaskedAmount from '../MaskedAmount'

const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const getDays     = (year, month) => new Date(year, month + 1, 0).getDate()

export default function ExpensesTab({ expenses, onAdd, onDelete, year, month }) {
  const days = getDays(year, month)
  const now            = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month
  const defaultDay     = isCurrentMonth ? now.getDate() : 1

  const [day, setDay]           = useState(defaultDay)
  const [category, setCategory] = useState('')
  const [amount, setAmount]     = useState('')
  const [remark, setRemark]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [showTotal, setShowTotal] = useState(false)

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  const handleAdd = async () => {
    if (!category || !amount) return
    setSaving(true)
    try {
      await onAdd(day, category, Number(amount), remark)
      setAmount(''); setRemark('')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null) }
  }

  // Group entries by day, in calendar order (1st, 2nd, 3rd, …).
  const byDay = {}
  expenses.forEach(e => { (byDay[e.day] ||= []).push(e) })
  const groupedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-r from-red-400 to-orange-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 opacity-80">
            <ShoppingCart size={16} />
            <span className="text-sm font-medium">Total Expenses this month</span>
          </div>
          <button
            onClick={() => setShowTotal(v => !v)}
            aria-label={showTotal ? 'Hide total expenses' : 'Show total expenses'}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            {showTotal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <MaskedAmount value={total} show={showTotal} className="text-4xl font-black tracking-tight block" />
        <p className="text-xs opacity-70 mt-1">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'} across {groupedDays.length} of {days} days</p>
      </div>

      {/* Add form */}
      <div className="bg-red-50 rounded-2xl p-4 space-y-3 border border-red-100">
        <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
          <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center"><Plus size={14} /></div>
          Add Expense
        </div>

        {/* Category picker */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(c => {
            const Icon = c.icon
            const active = category === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-colors ${
                  active ? 'border-red-400 bg-white ring-2 ring-red-200' : 'border-red-100 bg-white/60 hover:bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
                  <Icon size={16} className={c.text} />
                </div>
                <span className="text-[10px] font-semibold text-gray-600 leading-tight px-1">{c.label}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={day}
            onChange={e => setDay(Number(e.target.value))}
            className="px-3 py-3 rounded-xl border border-red-200 focus:border-red-400 outline-none text-gray-800 bg-white text-sm"
          >
            {Array.from({ length: days }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{MONTH_SHORT[month]} {d}</option>
            ))}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Amount"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-red-200 focus:border-red-400 outline-none text-gray-800 bg-white text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add remark…"
            className="flex-1 px-4 py-3 rounded-xl border border-red-200 focus:border-red-400 outline-none text-gray-800 bg-white text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={!category || !amount || saving}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-40 transition-colors text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Entries grouped by day, calendar order */}
      {groupedDays.length === 0 ? (
        <div className="text-center py-10 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
          <PartyPopper size={40} className="mx-auto mb-2 text-emerald-400" />
          <p className="font-black text-emerald-600 text-lg">Excellent! 🎉</p>
          <p className="text-sm text-emerald-500 mt-1">No expenses recorded this month — keep it up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDays.map(d => {
            const date     = new Date(year, month, d)
            const dayTotal = byDay[d].reduce((s, e) => s + Number(e.amount || 0), 0)
            return (
              <div key={d} className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-bold text-gray-600">{DAY_NAMES[date.getDay()]}, {MONTH_SHORT[month]} {d}</span>
                  <span className="text-sm font-black text-red-500">₹{dayTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {byDay[d].map(entry => {
                    const cat  = getCategory(entry.category)
                    const Icon = cat.icon
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                          <Icon size={18} className={cat.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{cat.label}</p>
                          {entry.remark && <p className="text-xs text-gray-400 truncate">{entry.remark}</p>}
                        </div>
                        <span className="font-black text-gray-800 whitespace-nowrap">₹{Number(entry.amount).toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleting === entry.id}
                          className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          {deleting === entry.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
