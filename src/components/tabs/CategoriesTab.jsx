import { LayoutGrid } from 'lucide-react'
import { CATEGORIES } from '../../utils/categories'
import DonutChart from '../DonutChart'

export default function CategoriesTab({ expenses }) {
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
  const segments   = rows.map(r => ({ value: r.total, color: r.hex }))

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
              centerLabel="Total Spent"
              centerValue={<span className="text-xl font-black text-gray-800">₹{grandTotal.toLocaleString('en-IN')}</span>}
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
                const Icon = c.icon
                const pct  = grandTotal > 0 ? (c.total / grandTotal) * 100 : 0
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                      <Icon size={15} className={c.text} />
                    </div>
                    <span className="flex-1 min-w-0 font-semibold text-gray-800 text-sm truncate">{c.label}</span>
                    <span className="font-bold text-gray-700 text-sm whitespace-nowrap">₹{c.total.toLocaleString('en-IN')}</span>
                    <span className="text-xs font-bold text-gray-400 w-14 text-right whitespace-nowrap">{pct.toFixed(2)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
