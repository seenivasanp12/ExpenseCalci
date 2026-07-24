import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { CATEGORIES } from '../../utils/categories'
import DonutChart from '../DonutChart'

export default function CategoriesTab({ expenses }) {
  const [activeKey, setActiveKey] = useState(null)
  const toggleActive = (key) => setActiveKey(k => (k === key ? null : key))

  const totals = {}
  expenses.forEach(e => {
    const id = e.category || 'others'
    totals[id] = (totals[id] || 0) + Number(e.amount || 0)
  })

  const rows = CATEGORIES
    .map(c => ({ ...c, total: totals[c.id] || 0 }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const segments   = rows.map(r => ({ key: r.id, value: r.total, color: r.hex }))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-800 font-black text-lg">
        <LayoutGrid size={20} className="text-indigo-500" />
        Categories
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-10 text-gray-300">
          <LayoutGrid size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No expenses added yet this month</p>
        </div>
      ) : (
        <>
          {/* Donut chart */}
          <div className="flex justify-center py-2">
            <DonutChart
              segments={segments}
              activeKey={activeKey}
              onSegmentSelect={toggleActive}
            />
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Share</span>
            </div>
            <div className="divide-y divide-gray-50">
              {rows.map(c => {
                const Icon   = c.icon
                const pct    = grandTotal > 0 ? (c.total / grandTotal) * 100 : 0
                const active = activeKey === c.id
                const dimmed = activeKey != null && !active
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleActive(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      active ? 'bg-gray-50' : ''
                    } ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                      <Icon size={15} className={c.text} />
                    </div>
                    <span className={`flex-1 min-w-0 text-sm truncate ${active ? 'font-black text-gray-900' : 'font-semibold text-gray-800'}`}>{c.label}</span>
                    <span className="font-bold text-gray-700 text-sm whitespace-nowrap">₹{c.total.toLocaleString('en-IN')}</span>
                    <span className={`text-xs w-14 text-right whitespace-nowrap ${active ? 'font-black text-gray-700' : 'font-bold text-gray-400'}`}>{pct.toFixed(2)}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
