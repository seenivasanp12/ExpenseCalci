import { useState, useEffect } from 'react'
import { Repeat, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Info, CheckCircle2 } from 'lucide-react'
import { previewEmi, confirmEmiDiscount } from '../../utils/api'
import MaskedAmount from '../MaskedAmount'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TENURE_PRESETS = [3, 6, 9, 12, 18, 24]
const EMI_TYPE_LABELS = {
  deferred: 'Deferred (No-Cost)',
  upfront_discount: 'Upfront Discount',
  interest: 'With Interest',
}

const emptyForm = () => {
  const now = new Date()
  return {
    cardId: '', itemName: '',
    purchaseDay: now.getDate(), purchaseMonth: now.getMonth() + 1, purchaseYear: now.getFullYear(),
    originalAmount: '', upfrontDiscount: '0',
    tenurePreset: '6', customTenure: '',
    emiType: 'upfront_discount', interestRateAnnual: '15.99', processingFee: '0', gstRate: '18', deferredMonths: '0',
  }
}

const todayParts = () => {
  const now = new Date()
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() }
}

export default function EmiTab({ emis, cards, onAdd, onDelete, onConfirmDiscount }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [confirmForm, setConfirmForm] = useState(todayParts())
  const [confirming, setConfirming] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const tenureMonths = form.tenurePreset === 'custom' ? Number(form.customTenure) : Number(form.tenurePreset)
  const needsRate = form.emiType !== 'upfront_discount'

  const buildPayload = () => ({
    cardId: form.cardId,
    itemName: form.itemName.trim(),
    purchaseDay: Number(form.purchaseDay), purchaseMonth: Number(form.purchaseMonth), purchaseYear: Number(form.purchaseYear),
    originalAmount: Number(form.originalAmount), upfrontDiscount: Number(form.upfrontDiscount) || 0,
    tenureMonths, emiType: form.emiType,
    interestRateAnnual: Number(form.interestRateAnnual) || 0,
    processingFee: Number(form.processingFee) || 0, gstRate: Number(form.gstRate) || 18,
    deferredMonths: Number(form.deferredMonths) || 0,
  })

  const canPreview = form.cardId && Number(form.originalAmount) > 0 && tenureMonths >= 1
    && (!needsRate || Number(form.interestRateAnnual) >= 0)

  useEffect(() => {
    if (!canPreview) { setPreview(null); setPreviewError(null); return }
    setPreviewLoading(true)
    const handle = setTimeout(() => {
      previewEmi(buildPayload())
        .then(p => { setPreview(p); setPreviewError(null) })
        .catch(err => { setPreview(null); setPreviewError(err.message) })
        .finally(() => setPreviewLoading(false))
    }, 450)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cardId, form.originalAmount, form.upfrontDiscount, form.tenurePreset, form.customTenure,
      form.emiType, form.interestRateAnnual, form.processingFee, form.gstRate, form.deferredMonths,
      form.purchaseDay, form.purchaseMonth, form.purchaseYear])

  const canSubmit = canPreview && form.itemName.trim() && preview && !previewLoading

  const handleAdd = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onAdd(buildPayload())
      setForm(emptyForm())
      setPreview(null)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this EMI plan? All of its generated monthly expense entries will be removed too.')) return
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null) }
  }

  const openConfirm = (plan) => {
    setConfirmingId(plan.id)
    setConfirmForm(todayParts())
  }

  const handleConfirmDiscount = async (plan) => {
    setConfirming(true)
    try {
      await onConfirmDiscount(plan.id, { day: Number(confirmForm.day), month: Number(confirmForm.month), year: Number(confirmForm.year) })
      setConfirmingId(null)
    } finally {
      setConfirming(false)
    }
  }

  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]))
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  const isElapsed = (inst) => inst.dueYear < curYear || (inst.dueYear === curYear && inst.dueMonth <= curMonth)

  const activeEmis = emis.filter(e => e.status === 'active')
  const thisMonthOutgo = activeEmis.reduce((sum, plan) => {
    const due = plan.installments.find(i => i.installmentNo >= 1 && i.dueYear === curYear && i.dueMonth === curMonth)
    return sum + (due ? Number(due.amount) : 0)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-r from-cyan-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <Repeat size={16} />
          <span className="text-sm font-medium">EMI outgo this month</span>
        </div>
        <MaskedAmount value={thisMonthOutgo} show className="text-4xl font-black tracking-tight block" />
        <p className="text-xs opacity-70 mt-1">{activeEmis.length} active {activeEmis.length === 1 ? 'plan' : 'plans'}</p>
      </div>

      {/* Plan list */}
      {emis.length === 0 ? (
        <div className="text-center py-10 text-gray-300">
          <Repeat size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No EMI plans yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emis.map(plan => {
            const expanded = expandedId === plan.id
            const card = cardMap[plan.cardId]
            const realInstallments = plan.installments.filter(i => i.installmentNo >= 1)
            const feeRow = plan.installments.find(i => i.installmentNo === 0)
            const gstFeeRow = plan.installments.find(i => i.installmentNo === -2)
            const discountRow = plan.installments.find(i => i.installmentNo === -1)
            const elapsedCount = realInstallments.filter(isElapsed).length
            const next = realInstallments.find(i => !isElapsed(i))
            const remaining = realInstallments.filter(i => !isElapsed(i)).reduce((s, i) => s + Number(i.amount), 0)

            return (
              <div key={plan.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : plan.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-cyan-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <Repeat size={18} className="text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{plan.itemName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {card ? `${card.bank} — ${card.cardName}` : 'Card removed'} · {EMI_TYPE_LABELS[plan.emiType]}
                      {plan.emiType !== 'upfront_discount' ? ` @ ${plan.interestRateAnnual}%` : ''}
                      {' · '}{elapsedCount}/{realInstallments.length} elapsed
                    </p>
                    {plan.emiType === 'deferred' && (
                      <p className="text-[11px] mt-0.5">
                        {plan.discountStatus === 'confirmed' ? (
                          <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Discount ₹{Number(plan.deferredDiscountAmount).toLocaleString('en-IN')} confirmed {MONTH_SHORT[plan.discountConfirmedMonth - 1]} {plan.discountConfirmedDay}, {plan.discountConfirmedYear}</span>
                        ) : (
                          <span className="text-amber-600">Discount ≈ ₹{Number(plan.deferredDiscountAmount).toLocaleString('en-IN')} expected by {MONTH_SHORT[plan.discountExpectedMonth - 1]} {plan.discountExpectedDay}, {plan.discountExpectedYear}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-cyan-600 text-sm">₹{Number(plan.monthlyEmiAmount).toLocaleString('en-IN')}/mo</p>
                    {next && <p className="text-[10px] text-gray-400">Next {MONTH_SHORT[next.dueMonth - 1]} {next.dueYear}</p>}
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400">Principal</p>
                        <p className="font-bold text-gray-700 text-sm">₹{Number(plan.principal).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400">Remaining</p>
                        <p className="font-bold text-gray-700 text-sm">₹{remaining.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400">Total payable</p>
                        <p className="font-bold text-gray-700 text-sm">₹{Number(plan.totalPayable).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {(feeRow || gstFeeRow) && (
                      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2 space-y-1">
                        {feeRow && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Processing Fee — {MONTH_SHORT[feeRow.dueMonth - 1]} {feeRow.dueDay}, {feeRow.dueYear}</span>
                            <span className="font-semibold text-gray-700">₹{Number(feeRow.amount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {gstFeeRow && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">GST ({plan.gstRate}%) on Processing Fee</span>
                            <span className="font-semibold text-gray-700">₹{Number(gstFeeRow.amount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {plan.emiType === 'deferred' && plan.discountStatus === 'pending' && (
                      confirmingId === plan.id ? (
                        <div className="bg-white rounded-xl border border-cyan-100 p-3 space-y-2">
                          <p className="text-xs text-gray-500">Confirm the date the discount actually landed on your card (check your statement):</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input type="number" min="1" max="31" value={confirmForm.day}
                              onChange={e => setConfirmForm(f => ({ ...f, day: e.target.value }))}
                              className="px-2 py-2 rounded-lg border border-cyan-200 text-sm" placeholder="Day" />
                            <select value={confirmForm.month} onChange={e => setConfirmForm(f => ({ ...f, month: e.target.value }))}
                              className="px-2 py-2 rounded-lg border border-cyan-200 text-sm">
                              {MONTH_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                            <input type="number" value={confirmForm.year}
                              onChange={e => setConfirmForm(f => ({ ...f, year: e.target.value }))}
                              className="px-2 py-2 rounded-lg border border-cyan-200 text-sm" placeholder="Year" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmingId(null)} className="flex-1 py-2 rounded-lg border border-cyan-200 text-cyan-600 text-xs font-bold">Cancel</button>
                            <button
                              onClick={() => handleConfirmDiscount(plan)}
                              disabled={confirming}
                              className="flex-1 py-2 rounded-lg bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
                            >
                              {confirming ? <Loader2 size={13} className="animate-spin" /> : null}
                              Confirm ₹{Number(plan.deferredDiscountAmount).toLocaleString('en-IN')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openConfirm(plan)}
                          className="w-full text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 rounded-xl py-2 hover:bg-cyan-100 transition-colors"
                        >
                          Mark discount as received…
                        </button>
                      )
                    )}

                    {discountRow && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 px-3 py-2">
                        Discount refund: ₹{Number(discountRow.amount).toLocaleString('en-IN')} — {MONTH_SHORT[discountRow.dueMonth - 1]} {discountRow.dueDay}, {discountRow.dueYear}
                      </p>
                    )}

                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        <span>Due</span><span className="text-right">Principal</span><span className="text-right">Interest</span><span className="text-right">GST</span><span className="text-right">Amount</span>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                        {realInstallments.map(inst => (
                          <div key={inst.id} className={`grid grid-cols-5 gap-1 px-3 py-1.5 text-xs ${isElapsed(inst) ? 'text-gray-300' : 'text-gray-700'}`}>
                            <span>{MONTH_SHORT[inst.dueMonth - 1]} {inst.dueYear}</span>
                            <span className="text-right">₹{Number(inst.principalComponent).toLocaleString('en-IN')}</span>
                            <span className="text-right">₹{Number(inst.interestComponent).toLocaleString('en-IN')}</span>
                            <span className="text-right">₹{Number(inst.gstComponent).toLocaleString('en-IN')}</span>
                            <span className="text-right font-semibold">₹{Number(inst.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(plan.id)}
                      disabled={deleting === plan.id}
                      className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-500 py-2 disabled:opacity-50"
                    >
                      {deleting === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Delete EMI plan
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        cards.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-center">
            Add a credit card in the Credit Cards tab before creating an EMI plan.
          </p>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-cyan-50 border border-cyan-100 text-cyan-600 font-bold text-sm rounded-2xl py-3 hover:bg-cyan-100 transition-colors"
          >
            <Plus size={16} /> Add EMI Plan
          </button>
        )
      ) : (
        <div className="bg-cyan-50 rounded-2xl p-4 space-y-3 border border-cyan-100">
          <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm">
            <div className="w-6 h-6 rounded-full bg-cyan-200 flex items-center justify-center"><Plus size={14} /></div>
            Add EMI Plan
          </div>

          <select
            value={form.cardId} onChange={set('cardId')}
            className="w-full px-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
          >
            <option value="">Select card…</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.bank} — {c.cardName}{c.nickname ? ` (${c.nickname})` : ''}</option>)}
          </select>

          <input
            type="text" value={form.itemName} onChange={set('itemName')}
            placeholder="What did you buy? e.g. iPhone 15"
            className="w-full px-4 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <input
                type="number" value={form.originalAmount} onChange={set('originalAmount')}
                placeholder="Original amount"
                className="w-full pl-8 pr-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <input
                type="number" value={form.upfrontDiscount} onChange={set('upfrontDiscount')}
                placeholder="Instant discount at purchase"
                className="w-full pl-8 pr-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Purchase day</label>
              <input type="number" min="1" max="31" value={form.purchaseDay} onChange={set('purchaseDay')}
                className="w-full px-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Month</label>
              <select value={form.purchaseMonth} onChange={set('purchaseMonth')}
                className="w-full px-2 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm">
                {MONTH_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Year</label>
              <input type="number" value={form.purchaseYear} onChange={set('purchaseYear')}
                className="w-full px-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Tenure</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TENURE_PRESETS.map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tenurePreset: String(t) }))}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    form.tenurePreset === String(t) ? 'border-cyan-400 bg-white ring-2 ring-cyan-200 text-cyan-600' : 'border-cyan-100 bg-white/60 hover:bg-white text-gray-500'
                  }`}
                >
                  {t}mo
                </button>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, tenurePreset: 'custom' }))}
                className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  form.tenurePreset === 'custom' ? 'border-cyan-400 bg-white ring-2 ring-cyan-200 text-cyan-600' : 'border-cyan-100 bg-white/60 hover:bg-white text-gray-500'
                }`}
              >
                Custom
              </button>
            </div>
            {form.tenurePreset === 'custom' && (
              <input
                type="number" min="1" value={form.customTenure} onChange={set('customTenure')}
                placeholder="Months"
                className="w-full mt-2 px-4 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">EMI type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(EMI_TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, emiType: type }))}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    form.emiType === type ? 'border-cyan-400 bg-white ring-2 ring-cyan-200 text-cyan-600' : 'border-cyan-100 bg-white/60 hover:bg-white text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.emiType === 'deferred' && (
              <p className="text-[11px] text-gray-400 mt-1">The real EMI + GST is charged monthly; the discount refund lands on your card separately — confirm it once it does.</p>
            )}
          </div>

          {needsRate && (
            <div className="relative">
              <input
                type="number" step="0.01" value={form.interestRateAnnual} onChange={set('interestRateAnnual')}
                placeholder="Annual interest rate (your card's EMI conversion rate)"
                className="w-full pl-4 pr-8 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <input
                type="number" value={form.processingFee} onChange={set('processingFee')}
                placeholder="Processing fee"
                className="w-full pl-8 pr-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
            </div>
            <div className="relative">
              <input
                type="number" step="0.01" value={form.gstRate} onChange={set('gstRate')}
                placeholder="GST rate"
                className="w-full pl-4 pr-8 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
            </div>
          </div>
          {needsRate && <p className="text-[11px] text-gray-400 -mt-1">GST above is charged once on the processing fee, and monthly on each installment's interest portion.</p>}

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Delayed start (skip first N months before the 1st installment)</label>
            <select value={form.deferredMonths} onChange={set('deferredMonths')}
              className="w-full px-3 py-3 rounded-xl border border-cyan-200 focus:border-cyan-400 outline-none text-gray-800 bg-white text-sm">
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n === 0 ? 'No delay' : `${n} month${n > 1 ? 's' : ''}`}</option>)}
            </select>
          </div>

          {/* Live preview */}
          {canPreview && (
            <div className="bg-white rounded-xl border border-cyan-100 p-3 text-sm">
              {previewLoading ? (
                <div className="flex items-center justify-center py-2 text-cyan-400"><Loader2 size={16} className="animate-spin" /></div>
              ) : previewError ? (
                <p className="text-xs text-red-500 flex items-center gap-1.5"><Info size={13} />{previewError}</p>
              ) : preview ? (
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-gray-400">Monthly EMI</span><span className="font-black text-cyan-600">₹{preview.monthlyEmiAmount.toLocaleString('en-IN')}</span></div>
                  {preview.schedule?.[0]?.gstComponent > 0 && (
                    <div className="flex justify-between text-xs"><span className="text-gray-400">+ GST on interest (1st month)</span><span className="text-gray-600">₹{preview.schedule[0].gstComponent.toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Processing Fee</span><span className="text-gray-600">₹{preview.processingFee.toLocaleString('en-IN')}</span></div>
                  {preview.gstOnFee > 0 && (
                    <div className="flex justify-between text-xs"><span className="text-gray-400">GST on Processing Fee</span><span className="text-gray-600">₹{preview.gstOnFee.toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Total payable</span><span className="text-gray-600">₹{preview.totalPayable.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">First due</span><span className="text-gray-600">{MONTH_SHORT[preview.firstDueMonth - 1]} {preview.firstDueYear}</span></div>
                  {preview.deferredDiscount && (
                    <div className="flex justify-between text-xs pt-1 mt-1 border-t border-gray-100">
                      <span className="text-amber-600">Expected discount refund</span>
                      <span className="text-amber-600 font-semibold">
                        ₹{preview.deferredDiscount.amount.toLocaleString('en-IN')} by {MONTH_SHORT[preview.deferredDiscount.expected.month - 1]} {preview.deferredDiscount.expected.day}, {preview.deferredDiscount.expected.year}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setForm(emptyForm()); setPreview(null); setShowForm(false) }}
              className="flex-1 px-4 py-3 rounded-xl border border-cyan-200 text-cyan-600 font-bold text-sm hover:bg-cyan-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!canSubmit || saving}
              className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Creating…' : 'Create EMI Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
