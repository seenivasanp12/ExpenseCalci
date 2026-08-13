import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, LogOut, Loader2, Eye, EyeOff, Menu,
  TrendingUp, ShoppingCart, PiggyBank, LayoutGrid, Calculator, CreditCard, Repeat, LineChart,
} from 'lucide-react'
import EarnTab        from './tabs/EarnTab'
import ExpensesTab    from './tabs/ExpensesTab'
import AchievementTab from './tabs/AchievementTab'
import CategoriesTab  from './tabs/CategoriesTab'
import CalculateTab   from './tabs/CalculateTab'
import CreditCardTab  from './tabs/CreditCardTab'
import EmiTab         from './tabs/EmiTab'
import MutualFundTab  from './tabs/MutualFundTab'
import {
  getData, addEarning, deleteEarning,
  addExpense, deleteExpense, addAchievement, deleteAchievement,
  getCards, addCard, updateCard, deleteCard, markCardPaid,
  getEmis, addEmi, deleteEmi, confirmEmiDiscount,
  getMutualFunds, addMutualFund, deleteMutualFund, addSip, stopSip, skipSip, unskipSip, addLumpsum, withdrawFund,
} from '../utils/api'
import { cashBasisTotal } from '../utils/expenseTotals'
import MaskedAmount from './MaskedAmount'
import NavDrawer from './NavDrawer'
import ChartSkeleton from './ChartSkeleton'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TABS = [
  { id: 'Earn',        icon: TrendingUp,   color: 'text-green-600 border-green-500 bg-green-50'   },
  { id: 'Expenses',    icon: ShoppingCart, color: 'text-red-600 border-red-500 bg-red-50'         },
  { id: 'CreditCard',  icon: CreditCard,   color: 'text-sky-600 border-sky-500 bg-sky-50', label: 'Credit Cards', monthScoped: false },
  { id: 'Emi',         icon: Repeat,       color: 'text-cyan-600 border-cyan-500 bg-cyan-50', label: 'EMI', monthScoped: false },
  { id: 'MutualFund',  icon: LineChart,    color: 'text-yellow-600 border-yellow-500 bg-yellow-50', label: 'Mutual Fund', monthScoped: false },
  { id: 'Achievement', icon: PiggyBank,    color: 'text-amber-600 border-amber-500 bg-amber-50'   },
  { id: 'Categories',  icon: LayoutGrid,   color: 'text-purple-600 border-purple-500 bg-purple-50'},
  { id: 'Calculate',   icon: Calculator,   color: 'text-indigo-600 border-indigo-500 bg-indigo-50'},
]

const COLOR_POOL = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-teal-500 to-cyan-600',
]

const EMPTY = { earn: [], expenses: [], achievements: [] }

export default function Dashboard({ user, onLogout }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [activeTab, setActiveTab] = useState('Expenses')
  const [data, setData]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAmounts, setShowAmounts] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cards, setCards]     = useState([])
  const [emis, setEmis]       = useState([])
  const [mutualFunds, setMutualFunds] = useState([])

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

  // Cards, EMI plans, and mutual funds aren't month-scoped, so they're
  // fetched once rather than on every navigateMonth(). Loading mutual funds
  // is also what triggers the SIP auto-backfill pass on the backend (see
  // GET /api/mf/funds) — this is the "silent auto-post on app load" moment.
  useEffect(() => {
    getCards().then(setCards).catch(() => {})
    getEmis().then(setEmis).catch(() => {})
    getMutualFunds().then(setMutualFunds).catch(() => {})
  }, [])

  const navigateMonth = (dir) => {
    let m = month + dir, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y); setActiveTab('Expenses')
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
  const handleAddExpense = async (day, category, amount, remark, paymentMethod, cardId) => {
    const entry = await addExpense(year, month + 1, day, category, amount, remark, paymentMethod, cardId)
    setData(d => ({ ...d, expenses: [...d.expenses, entry] }))
  }
  const handleDeleteExpense = async (id) => {
    await deleteExpense(id)
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }))
  }

  // ── Credit card mutations ──────────────────────────────────
  const handleAddCard = async (card) => {
    const created = await addCard(card)
    setCards(cs => [...cs, created])
  }
  const handleUpdateCard = async (id, patch) => {
    const updated = await updateCard(id, patch)
    setCards(cs => cs.map(c => c.id === id ? updated : c))
  }
  const handleDeleteCard = async (id) => {
    await deleteCard(id)
    setCards(cs => cs.filter(c => c.id !== id))
  }
  // Confirming a payment creates a real expense row (dated on the payment
  // date) — refetch the current month so it shows up immediately if relevant.
  const handleConfirmCardPayment = async (cardId, payment) => {
    const result = await markCardPaid(cardId, payment)
    await loadData()
    return result.payment
  }

  // ── EMI mutations ───────────────────────────────────────────
  // Creating/deleting an EMI plan generates or removes expense rows across
  // many months at once, so the simplest correct thing is to refetch both
  // the EMI list and whatever month is currently on screen.
  const handleAddEmi = async (plan) => {
    await addEmi(plan)
    const [freshEmis] = await Promise.all([getEmis(), loadData()])
    setEmis(freshEmis)
  }
  const handleDeleteEmi = async (id) => {
    await deleteEmi(id)
    const [freshEmis] = await Promise.all([getEmis(), loadData()])
    setEmis(freshEmis)
  }
  const handleConfirmEmiDiscount = async (id, date) => {
    await confirmEmiDiscount(id, date)
    const [freshEmis] = await Promise.all([getEmis(), loadData()])
    setEmis(freshEmis)
  }

  // ── Achievement mutations ─────────────────────────────────
  const handleAddAchievement = async (date, amount, remark, type) => {
    const entry = await addAchievement(year, month + 1, date, amount, remark, type)
    setData(d => ({ ...d, achievements: [...d.achievements, entry] }))
  }
  const handleDeleteAchievement = async (id) => {
    await deleteAchievement(id)
    setData(d => ({ ...d, achievements: d.achievements.filter(a => a.id !== id) }))
  }

  // ── Mutual fund mutations ───────────────────────────────────
  // A SIP/lumpsum action also creates a real expense row, so refetch both
  // the fund list and whatever month is currently on screen — same
  // refetch-both pattern EMI already uses for the same reason.
  const handleAddMutualFund = async (fund) => {
    const created = await addMutualFund(fund)
    setMutualFunds(fs => [...fs, { ...created, sips: [], activeSip: null, contributions: [], totalInvested: 0 }])
  }
  const handleDeleteMutualFund = async (id) => {
    await deleteMutualFund(id)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }
  const handleAddSip = async (fundId, sip) => {
    await addSip(fundId, sip)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }
  const handleStopSip = async (id) => {
    await stopSip(id)
    setMutualFunds(await getMutualFunds())
  }
  // Skipping a month may delete an already-posted expense (if the installment
  // had auto-posted before the user skipped it), and unskipping may
  // immediately post one back — same refetch-both pattern as SIP/lumpsum.
  const handleSkipSip = async (id, month) => {
    await skipSip(id, month)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }
  const handleUnskipSip = async (id, month) => {
    await unskipSip(id, month)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }
  const handleAddLumpsum = async (fundId, contribution) => {
    await addLumpsum(fundId, contribution)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }
  // A withdrawal creates an earnings row dated on whatever month/year the
  // user picked in the form (not necessarily the month currently on
  // screen) — loadData() only refreshes what's currently displayed, so the
  // new Earn entry shows up immediately if relevant, same caveat as
  // handleConfirmCardPayment above.
  const handleWithdrawFund = async (fundId, withdrawal) => {
    await withdrawFund(fundId, withdrawal)
    const [freshFunds] = await Promise.all([getMutualFunds(), loadData()])
    setMutualFunds(freshFunds)
  }

  const totalEarn         = data.earn.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpenses     = cashBasisTotal(data.expenses)
  const totalAchievement  = data.achievements.reduce((s, a) => s + Number(a.amount || 0), 0)
  const mutualFundsTotal  = mutualFunds.reduce((s, f) => s + Number(f.totalInvested || 0), 0)

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAmounts(v => !v)}
              aria-label={showAmounts ? 'Hide earning details' : 'Show earning details'}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              {showAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors text-sm font-semibold">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Earned', value: totalEarn },
            { label: 'Spent',  value: totalExpenses },
            { label: 'Saved',  value: totalAchievement },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl py-2 px-1">
              <p className="text-xs opacity-70">{item.label}</p>
              <MaskedAmount value={item.value} show={showAmounts} className="font-bold text-sm block" />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* Month navigator — hidden for tabs that aren't scoped to a calendar month */}
        {TABS.find(t => t.id === activeTab)?.monthScoped !== false && (
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
        )}

        {/* Section nav */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} className="text-gray-500" />
            </button>
            <span className="font-black text-gray-800">{TABS.find(t => t.id === activeTab)?.label || activeTab}</span>
          </div>

          <NavDrawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            tabs={TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <div className="p-4">
            {loading ? (
              activeTab === 'Categories' || activeTab === 'Calculate' ? (
                <ChartSkeleton />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-indigo-400 gap-3">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Loading {MONTH_NAMES[month]} data…</p>
                </div>
              )
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 font-medium mb-3">{error}</p>
                <button onClick={loadData} className="text-sm text-indigo-500 hover:underline">Retry</button>
              </div>
            ) : (
              <>
                {activeTab === 'Earn'        && <EarnTab        earn={data.earn}         onAdd={handleAddEarning}        onDelete={handleDeleteEarning} />}
                {activeTab === 'Expenses'    && <ExpensesTab    expenses={data.expenses} onAdd={handleAddExpense}        onDelete={handleDeleteExpense} year={year} month={month} cards={cards} />}
                {activeTab === 'CreditCard'  && <CreditCardTab  cards={cards} onAdd={handleAddCard} onUpdate={handleUpdateCard} onDelete={handleDeleteCard} onConfirmPayment={handleConfirmCardPayment} />}
                {activeTab === 'Emi'         && <EmiTab         emis={emis} cards={cards} onAdd={handleAddEmi} onDelete={handleDeleteEmi} onConfirmDiscount={handleConfirmEmiDiscount} />}
                {activeTab === 'MutualFund'  && <MutualFundTab
                  funds={mutualFunds} onAddFund={handleAddMutualFund} onAddSip={handleAddSip} onStopSip={handleStopSip}
                  onSkipSip={handleSkipSip} onUnskipSip={handleUnskipSip}
                  onAddLumpsum={handleAddLumpsum} onWithdrawFund={handleWithdrawFund} onDeleteFund={handleDeleteMutualFund}
                />}
                {activeTab === 'Achievement' && <AchievementTab
                  achievements={data.achievements} onAddAchievement={handleAddAchievement} onDeleteAchievement={handleDeleteAchievement}
                  mutualFundsTotal={mutualFundsTotal} mutualFundsCount={mutualFunds.length}
                  onOpenMutualFund={() => setActiveTab('MutualFund')}
                />}
                {activeTab === 'Categories'  && <CategoriesTab  expenses={data.expenses} />}
                {activeTab === 'Calculate'   && <CalculateTab   data={data} year={year} month={month} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
