import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, CalendarDays } from 'lucide-react'

const DAY_NAMES      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const getDays        = (year, month) => new Date(year, month + 1, 0).getDate()

export default function ExpensesTab({ expenses, onUpdate, year, month }) {
  const days = getDays(year, month)

  const now              = new Date()
  const todayDay         = now.getDate()
  const isCurrentMonth   = now.getFullYear() === year && now.getMonth() === month
  const todayDayName     = DAY_NAMES[now.getDay()]

  // Local mirror of expenses for instant UI response
  const [local, setLocal] = useState(expenses)
  const timers   = useRef({})
  const todayRef = useRef(null)
  const listRef  = useRef(null)

  // Sync when parent reloads data (month/user change)
  useEffect(() => { setLocal(expenses) }, [expenses])

  // Scroll to today's row when viewing the current month
  useEffect(() => {
    if (isCurrentMonth && todayRef.current && listRef.current) {
      setTimeout(() => {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
  }, [isCurrentMonth, month, year])

  const total      = Object.values(local).reduce((s, e) => s + Number(e.amount || 0), 0)
  const filledDays = Object.values(local).filter(e => Number(e.amount) > 0).length

  const updateDay = (day, field, value) => {
    const prev = local[day] || { amount: '', remark: '' }
    const next = { ...prev, [field]: value }
    setLocal(p => ({ ...p, [day]: next }))

    clearTimeout(timers.current[day])
    timers.current[day] = setTimeout(() => {
      onUpdate(day, next.amount, next.remark)
    }, 700)
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-r from-red-400 to-orange-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <ShoppingCart size={16} />
          <span className="text-sm font-medium">Total Expenses this month</span>
        </div>
        <p className="text-4xl font-black tracking-tight">₹{total.toLocaleString('en-IN')}</p>
        <p className="text-xs opacity-70 mt-1">{filledDays} of {days} days have expenses</p>
      </div>

      {/* Today banner — only shown when viewing the current month */}
      {isCurrentMonth && (
        <div className="flex items-center gap-3 bg-indigo-600 rounded-2xl px-4 py-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold opacity-80 leading-none">{todayDayName}</span>
            <span className="text-lg font-black leading-tight">{todayDay}</span>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold opacity-70 uppercase tracking-widest leading-none mb-0.5">Today</p>
            <p className="font-black text-base leading-tight">{todayDayName}, {todayDay} {MONTH_NAMES[month]} {year}</p>
          </div>
          <CalendarDays size={20} className="opacity-40" />
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-14 flex-shrink-0" />
        <div className="w-28 flex-shrink-0"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</span></div>
        <div className="flex-1"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remarks</span></div>
      </div>

      {/* Day rows */}
      <div ref={listRef} className="space-y-2 max-h-[500px] overflow-y-auto pr-1 -mr-1">
        {Array.from({ length: days }, (_, i) => i + 1).map(day => {
          const date    = new Date(year, month, day)
          const dayName = DAY_NAMES[date.getDay()]
          const isSun   = date.getDay() === 0
          const isToday = isCurrentMonth && day === todayDay
          const entry   = local[day] || { amount: '', remark: '' }
          const hasAmt  = Number(entry.amount) > 0

          return (
            <div
              key={day}
              ref={isToday ? todayRef : null}
              className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${
                isToday
                  ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm shadow-indigo-100'
                  : hasAmt
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-gray-50'
              }`}
            >
              {/* Date badge */}
              <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 relative ${
                isToday
                  ? 'bg-indigo-600'
                  : hasAmt
                    ? 'bg-red-100'
                    : isSun
                      ? 'bg-orange-50'
                      : 'bg-white border border-gray-100'
              }`}>
                <span className={`text-xs font-semibold ${isToday ? 'text-indigo-200' : hasAmt ? 'text-red-400' : isSun ? 'text-orange-400' : 'text-gray-400'}`}>{dayName}</span>
                <span className={`text-lg font-black leading-tight ${isToday ? 'text-white' : hasAmt ? 'text-red-600' : isSun ? 'text-orange-500' : 'text-gray-600'}`}>{day}</span>
                {isToday && <span className="absolute -top-1.5 -right-1.5 bg-white text-indigo-600 text-[9px] font-black px-1 py-0.5 rounded-full border border-indigo-200 leading-none">NOW</span>}
              </div>

              {/* Amount */}
              <div className="relative w-28 flex-shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  value={entry.amount}
                  onChange={e => updateDay(day, 'amount', e.target.value)}
                  placeholder="0"
                  className={`w-full pl-7 pr-2 py-2.5 rounded-lg border outline-none text-sm font-semibold transition-colors ${
                    isToday
                      ? 'border-indigo-200 bg-white text-gray-700 focus:border-indigo-400'
                      : hasAmt
                        ? 'border-red-200 bg-white text-red-700 focus:border-red-400'
                        : 'border-gray-200 bg-white text-gray-700 focus:border-red-300'
                  }`}
                />
              </div>

              {/* Remark */}
              <input
                type="text"
                value={entry.remark}
                onChange={e => updateDay(day, 'remark', e.target.value)}
                placeholder={isToday ? "What did you spend today?" : "Add remark…"}
                className={`flex-1 px-3 py-2.5 rounded-lg border outline-none text-sm transition-colors ${
                  isToday
                    ? 'border-indigo-200 bg-white text-gray-800 focus:border-indigo-400'
                    : entry.remark
                      ? 'border-red-200 bg-white text-gray-800 focus:border-red-400'
                      : 'border-gray-200 bg-white text-gray-500 focus:border-red-300'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
