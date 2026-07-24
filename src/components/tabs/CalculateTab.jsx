import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator, TrendingUp, TrendingDown,
  PiggyBank, Wallet, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react'
import DonutChart from '../DonutChart'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// Stagger children on mount — each card animates in after the previous one.
const cardGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}
const card = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function CalculateTab({ data, year, month }) {
  const [calculated, setCalculated] = useState(false)
  const [activeKey, setActiveKey] = useState(null)
  const toggleActive = (key) => setActiveKey(k => (k === key ? null : key))

  const totalEarn = data.earn.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpenses = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalAchievement = data.achievements.reduce((s, a) => s + Number(a.amount || 0), 0)

  const salaryEntry = data.earn.find(
    e => e.isSalary || e.description.toLowerCase().includes('salary')
  )
  const salaryAmount = salaryEntry ? Number(salaryEntry.amount) : totalEarn
  const targetSaving = Math.round(salaryAmount * 0.4)

  const remaining = totalEarn - totalExpenses - totalAchievement
  const savingsProgress = targetSaving > 0 ? Math.min(100, Math.round((totalAchievement / targetSaving) * 100)) : 0
  const targetMet = totalAchievement >= targetSaving

  const chartTotal = totalEarn + totalExpenses + totalAchievement
  const chartSegments = [
    { key: 'earn',        label: 'Earn',        value: totalEarn,        color: '#22c55e' },
    { key: 'expenses',     label: 'Expenses',     value: totalExpenses,     color: '#ef4444' },
    { key: 'achievement', label: 'Achievement', value: totalAchievement, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-4">
      {/* Overview chart — segments draw in one by one: Earn, then Expenses, then Achievement */}
      {chartTotal > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center gap-4">
          <DonutChart
            segments={chartSegments}
            animated
            staggerDelay={0.7}
            activeKey={activeKey}
            onSegmentSelect={toggleActive}
          />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {chartSegments.map(s => {
              const active = activeKey === s.key
              const dimmed = activeKey != null && !active
              return (
                <button
                  key={s.key}
                  onClick={() => toggleActive(s.key)}
                  className={`flex items-center gap-1.5 text-xs transition-opacity ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className={active ? 'text-gray-800 font-bold' : 'text-gray-500 font-medium'}>{s.label}</span>
                  <span className="font-bold text-gray-800">₹{s.value.toLocaleString('en-IN')}</span>
                </button>
              )
            })}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-indigo-500" />
              <span className="text-gray-500 font-medium">Balance</span>
              <span className={`font-bold ${remaining >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                {remaining < 0 ? '-' : ''}₹{Math.abs(remaining).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards — load in one by one: Earn, Expenses, Achievement, Balance */}
      <motion.div className="grid grid-cols-2 gap-3" variants={cardGrid} initial="hidden" animate="show">
        <motion.div variants={card} className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <TrendingUp size={22} className="text-green-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">Total Earn</p>
          <p className="text-xl font-black text-green-600 mt-0.5">
            ₹{totalEarn.toLocaleString('en-IN')}
          </p>
        </motion.div>
        <motion.div variants={card} className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <TrendingDown size={22} className="text-red-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">Total Expenses</p>
          <p className="text-xl font-black text-red-500 mt-0.5">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
        </motion.div>
        <motion.div variants={card} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <PiggyBank size={22} className="text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">Achievement</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">
            ₹{totalAchievement.toLocaleString('en-IN')}
          </p>
        </motion.div>
        <motion.div variants={card} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
          <Wallet size={22} className="text-indigo-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">Balance</p>
          <p className={`text-xl font-black mt-0.5 ${remaining >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
            {remaining < 0 ? '-' : ''}₹{Math.abs(remaining).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-300 mt-0.5">Earn − Expenses − Achievement</p>
        </motion.div>
      </motion.div>

      {/* Calculate button */}
      <button
        onClick={() => setCalculated(true)}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
      >
        <Calculator size={22} />
        Calculate
        <ChevronRight size={18} />
      </button>

      {/* Results */}
      {calculated && (
        <div className="space-y-3 animate-fade-in">
          {/* Main calculation breakdown */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white">
            <p className="text-sm opacity-60 font-medium mb-4 uppercase tracking-wider">
              {MONTH_NAMES[month]} {year} — Summary
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="opacity-80 text-sm">Total Earned</span>
                </div>
                <span className="font-bold text-green-400">+₹{totalEarn.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="opacity-80 text-sm">(-) Expenses</span>
                </div>
                <span className="font-bold text-red-400">-₹{totalExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="opacity-80 text-sm">(-) Achievement / Savings</span>
                </div>
                <span className="font-bold text-amber-400">-₹{totalAchievement.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-white/60" />
                  <span className="font-bold text-sm">Remaining Balance</span>
                </div>
                <span className={`font-black text-2xl ${remaining >= 0 ? 'text-green-300' : 'text-red-400'}`}>
                  {remaining < 0 ? '-' : ''}₹{Math.abs(remaining).toLocaleString('en-IN')}
                </span>
              </div>
              {remaining < 0 && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle size={12} />
                  Expenses exceeded earnings by ₹{Math.abs(remaining).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          {/* After expense balance */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">After Expenses (before savings)</p>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">In hand after spending</span>
              <span className="font-black text-blue-600 text-xl">
                ₹{(totalEarn - totalExpenses).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Picky Bank */}
          <div className={`rounded-2xl p-5 text-white ${targetMet ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <PiggyBank size={22} />
              </div>
              <div>
                <p className="font-black text-xl">Picky Bank</p>
                <p className="text-xs opacity-70">Your savings vault</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="opacity-80 text-sm">Total Saved</span>
                <span className="font-black text-xl">₹{totalAchievement.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80 text-sm">
                  Target (40% of {salaryEntry ? 'Salary' : 'Earnings'})
                </span>
                <span className="font-bold">₹{targetSaving.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="bg-white/20 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-700"
                  style={{ width: `${savingsProgress}%` }}
                />
              </div>
              <p className="text-xs opacity-70 mt-1.5 text-right">{savingsProgress}% of target</p>
            </div>

            {/* Status */}
            {targetMet ? (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl p-3">
                <CheckCircle2 size={20} />
                <div>
                  <p className="font-bold text-sm">Target Achieved!</p>
                  <p className="text-xs opacity-80">
                    Saved ₹{(totalAchievement - targetSaving).toLocaleString('en-IN')} extra — Great job!
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl p-3">
                <AlertCircle size={20} />
                <div>
                  <p className="font-bold text-sm">Still need to save</p>
                  <p className="text-sm font-black">
                    ₹{(targetSaving - totalAchievement).toLocaleString('en-IN')} more to reach target
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recalculate hint */}
          <button
            onClick={() => setCalculated(false)}
            className="w-full py-2 text-sm text-gray-400 hover:text-indigo-500 transition-colors"
          >
            Reset calculation
          </button>
        </div>
      )}
    </div>
  )
}
