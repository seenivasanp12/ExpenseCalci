import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, LogOut, TrendingUp, Loader2 } from 'lucide-react'
import EarnTab        from './tabs/EarnTab'
import ExpensesTab    from './tabs/ExpensesTab'
import AchievementTab from './tabs/AchievementTab'
import CalculateTab   from './tabs/CalculateTab'
import {
  getData, addEarning, deleteEarning,
  upsertExpense, addAchievement, deleteAchievement,
} from '../utils/api'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TABS = [
  { id: 'Earn',        color: 'text-green-600 border-green-500 bg-green-50'   },
  { id: 'Expenses',    color: 'text-red-600 border-red-500 bg-red-50'         },
  { id: 'Achievement', color: 'text-amber-600 border-amber-500 bg-amber-50'   },
  { id: 'Calculate',   color: 'text-indigo-600 border-indigo-500 bg-indigo-50'},
]

const COLOR_POOL = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-cyan-600',
]

const EMPTY = { earn: [], expenses: {}, achievements: [] }

export default function Dashboard({ user, onLogout }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [activeTab, setActiveTab] = useState('Earn')
  const [data, setData]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const gradient = COLOR_POOL[(user?.color_index ?? 0) % COLOR_POOL.length]

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await getData(year, month + 1)
      setData(d)
    } catch {
      setError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  const navigateMonth = (dir) => {
    let m = month + dir, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y); setActiveTab('Earn')
  }

  // ── Earn mutations ────────────────────────────────────────
  const handleAddEarning = async (description, amount, isSalary) => {
    const entry = await addEarning(year, month + 1, description, amount, isSalary)
    setData(d => ({ ...d, earn: [...d.earn, entry] }))
  }
  const handleDeleteEarning = async (id) => {
    await deleteEarning(id)
    setData(d => ({ ...d, earn: d.earn.filter(e => e.id !== id) }))
  }

  // ── Expense mutations ─────────────────────────────────────
  const handleUpdateExpense = async (day, amount, remark) => {
    await upsertExpense(year, month + 1, day, amount, remark)
    setData(d => ({
      ...d,
      expenses: { ...d.expenses, [day]: { ...(d.expenses[day] || {}), amount, remark } },
    }))
  }

  // ── Achievement mutations ─────────────────────────────────
  const handleAddAchievement = async (date, amount, remark) => {
    const entry = await addAchievement(year, month + 1, date, amount, remark)
    setData(d => ({ ...d, achievements: [...d.achievements, entry] }))
  }
  const handleDeleteAchievement = async (id) => {
    await deleteAchievement(id)
    setData(d => ({ ...d, achievements: d.achievements.filter(a => a.id !== id) }))
  }

  const totalEarn         = data.earn.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpenses     = Object.values(data.expenses).reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalAchievement  = data.achievements.reduce((s, a) => s + Number(a.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} text-white shadow-xl`}>
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-black">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs opacity-70 uppercase tracking-wider">Family Expenses</p>
              <p className="font-black text-xl">{user?.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors text-sm font-semibold">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Earned', value: totalEarn },
            { label: 'Spent',  value: totalExpenses },
            { label: 'Saved',  value: totalAchievement },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl py-2 px-1">
              <p className="text-xs opacity-70">{item.label}</p>
              <p className="font-bold text-sm">₹{item.value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* Month navigator */}
        <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center justify-between mb-4">
          <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={22} className="text-gray-500" />
          </button>
          <div className="text-center">
            <p className="text-2xl font-black text-gray-800">{MONTH_NAMES[month]}</p>
            <p className="text-sm text-gray-400 font-medium">{year}</p>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={22} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === tab.id ? `${tab.color} border-b-2` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.id}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-indigo-400 gap-3">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm font-medium">Loading {MONTH_NAMES[month]} data…</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 font-medium mb-3">{error}</p>
                <button onClick={loadData} className="text-sm text-indigo-500 hover:underline">Retry</button>
              </div>
            ) : (
              <>
                {activeTab === 'Earn'        && <EarnTab        earn={data.earn}         onAdd={handleAddEarning}        onDelete={handleDeleteEarning} />}
                {activeTab === 'Expenses'    && <ExpensesTab    expenses={data.expenses} onUpdate={handleUpdateExpense}  year={year} month={month} />}
                {activeTab === 'Achievement' && <AchievementTab achievements={data.achievements} onAdd={handleAddAchievement} onDelete={handleDeleteAchievement} />}
                {activeTab === 'Calculate'   && <CalculateTab   data={data} year={year} month={month} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
