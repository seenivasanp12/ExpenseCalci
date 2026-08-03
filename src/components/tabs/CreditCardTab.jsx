import { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Pencil, Loader2, ChevronDown, ChevronUp, Wallet, Lock } from 'lucide-react'
import { BANK_PRESETS, getBank, getCardPreset } from '../../utils/cardPresets'
import { groupByBillingCycle, getStatementPeriod } from '../../utils/billingCycle'
import { getCardExpenses, getCardPayments } from '../../utils/api'
import { PAYMENT_METHODS } from '../../utils/paymentMethods'
import MaskedAmount from '../MaskedAmount'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const OTHER = '__other__'
const VIEW_MODES = ['current', 'lastMonth', 'annual', 'custom']
const VIEW_LABELS = { current: 'Current', lastMonth: 'Last Month', annual: 'Annual', custom: 'Custom' }
// Paying a card bill with the same/another credit card isn't a supported case.
const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.filter(m => m.id !== 'credit_card')

const emptyForm = {
  bankId: '', customBank: '', cardPresetId: '', customCardName: '', nickname: '',
  creditLimit: '', statementDay: '1', dueDay: '15',
  joiningFee: '0', annualFee: '0', feeWaiverNote: '',
}

const todayParts = () => {
  const now = new Date()
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() }
}

// Bank rule: billing-cycle date can only be changed once every ~180 days.
const cycleLockedUntil = (card) => {
  if (!card?.cycleChangedAt) return null
  const next = new Date(card.cycleChangedAt)
  next.setDate(next.getDate() + 180)
  return next
}

export default function CreditCardTab({ cards, onAdd, onUpdate, onDelete, onConfirmPayment }) {
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [viewMode, setViewMode] = useState('current')
  const [customFrom, setCustomFrom] = useState(() => { const t = todayParts(); return { year: t.year, month: t.month } })
  const [customTo, setCustomTo] = useState(() => { const t = todayParts(); return { year: t.year, month: t.month } })

  const [expensesByCard, setExpensesByCard] = useState({})
  const [cyclesByCard, setCyclesByCard] = useState({})
  const [paymentsByCard, setPaymentsByCard] = useState({})
  const [loadingData, setLoadingData] = useState(true)

  const [payingCycle, setPayingCycle] = useState(null) // { cardId, year, month, dueYear, dueMonth, total }
  const [payForm, setPayForm] = useState(todayParts())
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('debit_card')
  const [paying, setPaying] = useState(false)

  // Utilization/outstanding need every card's data up front (not just on expand),
  // since those are always-visible, not tucked behind the expand toggle.
  useEffect(() => {
    if (cards.length === 0) { setLoadingData(false); return }
    let cancelled = false
    setLoadingData(true)
    Promise.all(cards.map(card =>
      Promise.all([getCardExpenses(card.id), getCardPayments(card.id)])
        .then(([expenses, payments]) => ({ id: card.id, expenses, payments }))
    )).then(results => {
      if (cancelled) return
      const exp = {}, cyc = {}, pay = {}
      results.forEach(r => { exp[r.id] = r.expenses; cyc[r.id] = groupByBillingCycle(cards.find(c => c.id === r.id), r.expenses); pay[r.id] = r.payments })
      setExpensesByCard(exp); setCyclesByCard(cyc); setPaymentsByCard(pay)
    }).finally(() => { if (!cancelled) setLoadingData(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const selectedBank   = getBank(form.bankId)
  const selectedPreset = getCardPreset(form.bankId, form.cardPresetId)

  const handleBankChange = (e) => {
    const bankId = e.target.value
    setForm(f => ({ ...f, bankId, cardPresetId: '', customCardName: '', joiningFee: '0', annualFee: '0', feeWaiverNote: '' }))
  }

  const handleCardPresetChange = (e) => {
    const cardPresetId = e.target.value
    const preset = getCardPreset(form.bankId, cardPresetId)
    setForm(f => ({
      ...f, cardPresetId,
      joiningFee: preset ? String(preset.joiningFee) : f.joiningFee,
      annualFee: preset ? String(preset.annualFee) : f.annualFee,
      feeWaiverNote: preset ? preset.waiverNote : f.feeWaiverNote,
    }))
  }

  const bankName = form.bankId === OTHER || !form.bankId ? form.customBank.trim() : selectedBank?.label
  const cardName = form.cardPresetId === OTHER || !form.cardPresetId ? form.customCardName.trim() : selectedPreset?.label

  const statementDayNum = Number(form.statementDay)
  const dueDayNum       = Number(form.dueDay)
  const canSubmit = bankName && cardName && form.creditLimit
    && statementDayNum >= 1 && statementDayNum <= 31
    && dueDayNum >= 1 && dueDayNum <= 31

  const locked = editingCard ? cycleLockedUntil(editingCard) : null
  const cycleLocked = locked && new Date() < locked

  const startAdd = () => {
    setEditingCard(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const startEdit = (card) => {
    setEditingCard(card)
    setForm({
      bankId: OTHER, customBank: card.bank, cardPresetId: OTHER, customCardName: card.cardName,
      nickname: card.nickname || '', creditLimit: String(card.creditLimit),
      statementDay: String(card.statementDay), dueDay: String(card.dueDay),
      joiningFee: String(card.joiningFee || 0), annualFee: String(card.annualFee || 0), feeWaiverNote: card.feeWaiverNote || '',
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        bank: bankName, cardName, nickname: form.nickname.trim(),
        creditLimit: Number(form.creditLimit), statementDay: statementDayNum, dueDay: dueDayNum,
        joiningFee: Number(form.joiningFee) || 0, annualFee: Number(form.annualFee) || 0,
        feeWaiverNote: form.feeWaiverNote.trim(),
      }
      if (editingCard) await onUpdate(editingCard.id, payload)
      else await onAdd(payload)
      setForm(emptyForm)
      setEditingCard(null)
      setShowForm(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this card? Its past expenses stay, just unlinked.')) return
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null) }
  }

  const toggleExpand = (cardId) => {
    setExpandedId(id => id === cardId ? null : cardId)
    setViewMode('current')
  }

  const openPayment = (card, cyc, remaining) => {
    setPayingCycle({ cardId: card.id, year: cyc.year, month: cyc.month, dueYear: cyc.dueYear, dueMonth: cyc.dueMonth })
    setPayForm(todayParts())
    setPayAmount(String(remaining))
    setPayMethod('debit_card')
  }

  const handleConfirmPayment = async () => {
    if (!payingCycle) return
    setPaying(true)
    try {
      await onConfirmPayment(payingCycle.cardId, {
        statementYear: payingCycle.year, statementMonth: payingCycle.month + 1,
        amountPaid: Number(payAmount), paidDay: payForm.day, paidMonth: payForm.month, paidYear: payForm.year,
        paymentMethod: payMethod,
      })
      const fresh = await getCardPayments(payingCycle.cardId)
      setPaymentsByCard(p => ({ ...p, [payingCycle.cardId]: fresh }))
      setPayingCycle(null)
    } finally {
      setPaying(false)
    }
  }

  const totalLimit = cards.reduce((s, c) => s + Number(c.creditLimit || 0), 0)
  const now = new Date()

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <CreditCard size={16} />
          <span className="text-sm font-medium">Total Credit Limit</span>
        </div>
        <MaskedAmount value={totalLimit} show className="text-4xl font-black tracking-tight block" />
        <p className="text-xs opacity-70 mt-1">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
      </div>

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="text-center py-10 text-gray-300">
          <CreditCard size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No credit cards added yet</p>
        </div>
      ) : loadingData ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-sky-400" /></div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => {
            const expanded = expandedId === card.id
            const curPeriod = getStatementPeriod(card.statementDay, now.getFullYear(), now.getMonth(), now.getDate())
            const curKey = `${curPeriod.year}-${curPeriod.month}`
            const cardCycles = cyclesByCard[card.id] || []
            const currentCycle = cardCycles.find(c => `${c.year}-${c.month}` === curKey)
            const usedThisCycle = currentCycle?.total || 0
            const limit = Number(card.creditLimit) || 0

            // Only cycles strictly BEFORE the current open one are actually
            // billed/closed — a card can have future cycles already in
            // cardCycles (e.g. pre-generated EMI installments), and those
            // aren't due yet, so they must never count as outstanding.
            const curOrdinal = curPeriod.year * 12 + curPeriod.month
            const closedCycles = cardCycles.filter(c => (c.year * 12 + c.month) < curOrdinal)
            const cardPayments = paymentsByCard[card.id] || []
            const paidSoFar = (cyc) => cardPayments
              .filter(p => p.statementYear === cyc.year && p.statementMonth === cyc.month + 1)
              .reduce((s, p) => s + Number(p.amountPaid || 0), 0)
            const remainingDue = (cyc) => Math.max(0, cyc.total - paidSoFar(cyc))
            const unpaidCycles = closedCycles.filter(c => remainingDue(c) > 0)
            const totalOutstanding = unpaidCycles.reduce((s, c) => s + remainingDue(c), 0)
            const dueDateValue = (c) => new Date(c.dueYear, c.dueMonth, card.dueDay)
            const nearestDue = unpaidCycles.length
              ? unpaidCycles.reduce((min, c) => dueDateValue(c) < dueDateValue(min) ? c : min)
              : null
            // closedCycles is sorted newest-first, so the oldest unpaid one
            // (what a single "Pay Now" tap should default to) is the last entry.
            const oldestUnpaid = unpaidCycles.length ? unpaidCycles[unpaidCycles.length - 1] : null

            // What you actually owe the bank right now = any unpaid past
            // statement(s) plus whatever's accumulated in the still-open
            // cycle — not just the current cycle alone. Paying off the
            // outstanding balance drops totalOutstanding back to 0, so this
            // automatically falls back to just the current cycle's spend.
            const totalUtilized = totalOutstanding + usedThisCycle
            const utilizationPct = limit > 0 ? Math.min(100, (totalUtilized / limit) * 100) : 0
            const barColor = utilizationPct < 50 ? 'bg-emerald-500' : utilizationPct < 80 ? 'bg-amber-500' : 'bg-red-500'

            const lastClosedCycle = closedCycles[0] || null
            const annualCycles = cardCycles.filter(c => c.year === now.getFullYear()).slice().sort((a, b) => a.month - b.month)
            const annualTotal = annualCycles.reduce((s, c) => s + c.total, 0)
            const rawExpenses = expensesByCard[card.id] || []
            const inCustomRange = (e) => {
              const val = e.year * 12 + e.month
              const from = customFrom.year * 12 + (customFrom.month - 1)
              const to = customTo.year * 12 + (customTo.month - 1)
              return val >= from && val <= to
            }
            const customFiltered = expanded && viewMode === 'custom' ? rawExpenses.filter(inCustomRange) : []
            const customTotal = customFiltered.reduce((s, e) => s + Number(e.amount || 0), 0)

            return (
              <div key={card.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(card.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-sky-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={18} className="text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{card.bank} — {card.cardName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Statement day {card.statementDay} · Due day {card.dueDay}
                      {card.nickname ? ` · ${card.nickname}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(card) }}
                    className="p-1.5 rounded-lg hover:bg-sky-100 text-gray-400 hover:text-sky-600 flex-shrink-0"
                    aria-label="Edit card"
                  >
                    <Pencil size={14} />
                  </button>
                  {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {/* Always-visible utilization bar */}
                <div className="px-4 pb-3 bg-white">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>₹{totalUtilized.toLocaleString('en-IN')} used</span>
                    <span>of ₹{limit.toLocaleString('en-IN')} limit</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${utilizationPct}%` }} />
                  </div>
                </div>

                {/* Always-visible Amount Due — one clean figure + Pay Now, like a real card app */}
                <div className="px-4 pb-3 bg-white">
                  <div className={`rounded-xl p-3 border ${totalOutstanding > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-gray-500">Amount Due</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-black ${totalOutstanding > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                            ₹{totalOutstanding.toLocaleString('en-IN')}
                          </span>
                          {totalOutstanding === 0 && (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Fully Paid</span>
                          )}
                        </div>
                        {totalOutstanding > 0 && nearestDue && (
                          <p className="text-[11px] text-amber-600 mt-0.5">Due {MONTH_SHORT[nearestDue.dueMonth]} {card.dueDay}, {nearestDue.dueYear}</p>
                        )}
                      </div>
                      {totalOutstanding > 0 && (
                        <button
                          onClick={() => openPayment(card, oldestUnpaid, remainingDue(oldestUnpaid))}
                          className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors flex-shrink-0"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>

                    {/* Itemized breakdown only matters once more than one statement has piled up unpaid */}
                    {unpaidCycles.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-amber-100 space-y-1.5">
                        {unpaidCycles.map(cyc => {
                          const paid = paidSoFar(cyc)
                          const remaining = remainingDue(cyc)
                          return (
                            <div key={`${cyc.year}-${cyc.month}`} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">
                                {MONTH_SHORT[cyc.month]} statement — ₹{remaining.toLocaleString('en-IN')} due
                                {paid > 0 && <span className="text-gray-400"> (₹{paid.toLocaleString('en-IN')} of ₹{cyc.total.toLocaleString('en-IN')} paid)</span>}
                              </span>
                              <button onClick={() => openPayment(card, cyc, remaining)} className="text-cyan-600 font-bold text-[11px] hover:underline">
                                Mark as Paid
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                      {payingCycle?.cardId === card.id && (
                        <div className="mt-3 bg-white rounded-lg border border-amber-200 p-2 space-y-2">
                          <p className="text-[11px] text-gray-500">Confirm payment date, amount and method (partial payments are fine):</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input type="number" min="1" max="31" value={payForm.day}
                              onChange={e => setPayForm(f => ({ ...f, day: Number(e.target.value) }))}
                              className="px-2 py-1.5 rounded-lg border border-amber-200 text-xs" placeholder="Day" />
                            <select value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: Number(e.target.value) }))}
                              className="px-2 py-1.5 rounded-lg border border-amber-200 text-xs">
                              {MONTH_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                            <input type="number" value={payForm.year}
                              onChange={e => setPayForm(f => ({ ...f, year: Number(e.target.value) }))}
                              className="px-2 py-1.5 rounded-lg border border-amber-200 text-xs" placeholder="Year" />
                          </div>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-amber-200 text-xs" placeholder="Amount paid" />
                          </div>
                          <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-amber-200 text-xs">
                            {PAYMENT_METHOD_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => setPayingCycle(null)} className="flex-1 py-1.5 rounded-lg border border-amber-200 text-amber-600 text-xs font-bold">Cancel</button>
                            <button
                              onClick={handleConfirmPayment}
                              disabled={paying || !payAmount}
                              className="flex-1 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
                            >
                              {paying ? <Loader2 size={12} className="animate-spin" /> : null}
                              Confirm Paid
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                    {(card.joiningFee > 0 || card.annualFee > 0 || card.feeWaiverNote) && (
                      <div className="bg-white rounded-xl p-3 border border-gray-100 text-xs text-gray-500 flex items-start gap-2">
                        <Wallet size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                        <span>
                          Joining fee ₹{Number(card.joiningFee).toLocaleString('en-IN')}, annual fee ₹{Number(card.annualFee).toLocaleString('en-IN')}
                          {card.feeWaiverNote ? ` — ${card.feeWaiverNote}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Statement viewer segmented control */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {VIEW_MODES.map(v => (
                        <button
                          key={v}
                          onClick={() => setViewMode(v)}
                          className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                            viewMode === v ? 'border-sky-400 bg-white ring-2 ring-sky-200 text-sky-600' : 'border-sky-100 bg-white/60 hover:bg-white text-gray-500'
                          }`}
                        >
                          {VIEW_LABELS[v]}
                        </button>
                      ))}
                    </div>

                    {viewMode === 'current' && (
                      currentCycle ? (
                        <StatementCard label={`${MONTH_SHORT[currentCycle.month]} ${card.statementDay} statement (open)`} cyc={currentCycle} dueDay={card.dueDay} />
                      ) : (
                        <p className="text-center text-sm text-gray-400 py-4">No spend recorded in the current cycle yet.</p>
                      )
                    )}

                    {viewMode === 'lastMonth' && (
                      lastClosedCycle ? (
                        <StatementCard
                          label={`${MONTH_SHORT[lastClosedCycle.month]} ${card.statementDay} statement`}
                          cyc={lastClosedCycle} dueDay={card.dueDay}
                          paidAmount={paidSoFar(lastClosedCycle)} remaining={remainingDue(lastClosedCycle)}
                        />
                      ) : (
                        <p className="text-center text-sm text-gray-400 py-4">No closed statement yet.</p>
                      )
                    )}

                    {viewMode === 'annual' && (
                      annualCycles.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-4">No spend recorded in {now.getFullYear()} yet.</p>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <div className="divide-y divide-gray-50">
                            {annualCycles.map(c => (
                              <div key={`${c.year}-${c.month}`} className="flex items-center justify-between px-3 py-2 text-xs">
                                <span className="text-gray-600">{MONTH_SHORT[c.month]} {c.year}</span>
                                <span className="font-bold text-sky-600">₹{c.total.toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between px-3 py-2 bg-sky-50 text-xs font-bold">
                            <span className="text-gray-600">Total {now.getFullYear()}</span>
                            <span className="text-sky-600">₹{annualTotal.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )
                    )}

                    {viewMode === 'custom' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 font-medium block mb-1">From</label>
                            <div className="flex gap-1">
                              <select value={customFrom.month} onChange={e => setCustomFrom(f => ({ ...f, month: Number(e.target.value) }))}
                                className="flex-1 px-1 py-2 rounded-lg border border-sky-200 text-xs">
                                {MONTH_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                              </select>
                              <input type="number" value={customFrom.year} onChange={e => setCustomFrom(f => ({ ...f, year: Number(e.target.value) }))}
                                className="w-16 px-1 py-2 rounded-lg border border-sky-200 text-xs" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-medium block mb-1">To</label>
                            <div className="flex gap-1">
                              <select value={customTo.month} onChange={e => setCustomTo(f => ({ ...f, month: Number(e.target.value) }))}
                                className="flex-1 px-1 py-2 rounded-lg border border-sky-200 text-xs">
                                {MONTH_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                              </select>
                              <input type="number" value={customTo.year} onChange={e => setCustomTo(f => ({ ...f, year: Number(e.target.value) }))}
                                className="w-16 px-1 py-2 rounded-lg border border-sky-200 text-xs" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          {customFiltered.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-4">No entries in this range.</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 px-3 py-1.5 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                <span>Date</span><span>Remark</span><span className="text-right">Amount</span>
                              </div>
                              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                                {customFiltered.slice().sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month) || a.day - b.day).map(e => (
                                  <div key={e.id} className="grid grid-cols-[auto_1fr_auto] gap-x-2 px-3 py-2 text-xs items-center">
                                    <span className="text-gray-400 whitespace-nowrap">{MONTH_SHORT[e.month]} {e.day}</span>
                                    <span className="text-gray-700 truncate">{e.remark || '—'}</span>
                                    <span className="font-semibold text-gray-800 whitespace-nowrap">₹{Number(e.amount).toLocaleString('en-IN')}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between px-3 py-2 bg-sky-50 text-xs font-bold border-t border-gray-100">
                                <span className="text-gray-600">{customFiltered.length} entries</span>
                                <span className="text-sky-600">₹{customTotal.toLocaleString('en-IN')}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(card.id)}
                      disabled={deleting === card.id}
                      className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-500 py-2 disabled:opacity-50"
                    >
                      {deleting === card.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Delete card
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit form */}
      {!showForm ? (
        <button
          onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 bg-sky-50 border border-sky-100 text-sky-600 font-bold text-sm rounded-2xl py-3 hover:bg-sky-100 transition-colors"
        >
          <Plus size={16} /> Add Credit Card
        </button>
      ) : (
        <div className="bg-sky-50 rounded-2xl p-4 space-y-3 border border-sky-100">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
            <div className="w-6 h-6 rounded-full bg-sky-200 flex items-center justify-center"><Plus size={14} /></div>
            {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
          </div>

          {!editingCard && (
            <select
              value={form.bankId}
              onChange={handleBankChange}
              className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
            >
              <option value="">Select bank…</option>
              {BANK_PRESETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              <option value={OTHER}>Other (type manually)</option>
            </select>
          )}

          {(editingCard || form.bankId === OTHER) && (
            <input
              type="text" value={form.customBank} onChange={set('customBank')}
              placeholder="Bank name"
              className="w-full px-4 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
            />
          )}

          {!editingCard && selectedBank ? (
            <select
              value={form.cardPresetId}
              onChange={handleCardPresetChange}
              className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
            >
              <option value="">Select card…</option>
              {selectedBank.cards.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              <option value={OTHER}>Other (type manually)</option>
            </select>
          ) : (editingCard || form.bankId === OTHER) ? (
            <input
              type="text" value={form.customCardName} onChange={set('customCardName')}
              placeholder="Card name, e.g. Coral"
              className="w-full px-4 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
            />
          ) : null}

          <input
            type="text" value={form.nickname} onChange={set('nickname')}
            placeholder="Nickname (optional, e.g. last 4 digits)"
            className="w-full px-4 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
          />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
            <input
              type="number" value={form.creditLimit} onChange={set('creditLimit')}
              placeholder="Credit limit"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
            />
          </div>
          {editingCard && <p className="text-[11px] text-gray-400 -mt-1">Bank increased your limit? Just update it here — no restriction on this field.</p>}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1 mb-1">
                Statement day {cycleLocked && <Lock size={10} className="text-gray-300" />}
              </label>
              <input
                type="number" min="1" max="31" value={form.statementDay} onChange={set('statementDay')}
                disabled={cycleLocked}
                className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1 mb-1">
                Due day {cycleLocked && <Lock size={10} className="text-gray-300" />}
              </label>
              <input
                type="number" min="1" max="31" value={form.dueDay} onChange={set('dueDay')}
                disabled={cycleLocked}
                className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>
          {cycleLocked && (
            <p className="text-[11px] text-amber-600 -mt-1">Billing-cycle date can only change once every 180 days — editable again on {locked.toLocaleDateString('en-IN')}.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Joining fee</label>
              <input
                type="number" value={form.joiningFee} onChange={set('joiningFee')}
                className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Annual fee</label>
              <input
                type="number" value={form.annualFee} onChange={set('annualFee')}
                className="w-full px-3 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
              />
            </div>
          </div>

          <input
            type="text" value={form.feeWaiverNote} onChange={set('feeWaiverNote')}
            placeholder="Fee waiver note (optional, e.g. waived above ₹1L spend)"
            className="w-full px-4 py-3 rounded-xl border border-sky-200 focus:border-sky-400 outline-none text-gray-800 bg-white text-sm"
          />
          {(!editingCard && form.bankId && form.bankId !== OTHER) && (
            <p className="text-[11px] text-gray-400 -mt-1">Fees are a typical starting point — please verify against your actual card and edit if needed.</p>
          )}

          {formError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => { setForm(emptyForm); setEditingCard(null); setShowForm(false); setFormError(null) }}
              className="flex-1 px-4 py-3 rounded-xl border border-sky-200 text-sky-600 font-bold text-sm hover:bg-sky-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="flex-1 px-4 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Saving…' : editingCard ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatementCard({ label, cyc, dueDay, paidAmount, remaining }) {
  const fullyPaid = typeof remaining === 'number' && remaining <= 0
  const partiallyPaid = typeof paidAmount === 'number' && paidAmount > 0 && !fullyPaid
  const sortedEntries = cyc.entries.slice().sort((a, b) => a.day - b.day)
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-sky-50/60">
        <span className="text-xs font-bold text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">Due {MONTH_SHORT[cyc.dueMonth]} {dueDay}, {cyc.dueYear}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 px-3 py-1.5 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        <span>Date</span><span>Remark</span><span className="text-right">Amount</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {sortedEntries.map(e => (
          <div key={e.id} className="grid grid-cols-[auto_1fr_auto] gap-x-2 px-3 py-2 text-xs items-center">
            <span className="text-gray-400 whitespace-nowrap">{MONTH_SHORT[e.month]} {e.day}</span>
            <span className="text-gray-700 truncate">{e.remark || '—'}</span>
            <span className="font-semibold text-gray-800 whitespace-nowrap">₹{Number(e.amount).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">{cyc.entries.length} {cyc.entries.length === 1 ? 'entry' : 'entries'}</span>
        <span className="font-black text-sky-600 text-sm">Total ₹{cyc.total.toLocaleString('en-IN')}</span>
      </div>
      {typeof remaining === 'number' && (
        <div className={`px-3 py-1.5 text-[11px] font-semibold ${fullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {fullyPaid ? '✓ Paid in full' : partiallyPaid ? `₹${paidAmount.toLocaleString('en-IN')} paid — ₹${remaining.toLocaleString('en-IN')} due` : `₹${remaining.toLocaleString('en-IN')} outstanding`}
        </div>
      )}
    </div>
  )
}
