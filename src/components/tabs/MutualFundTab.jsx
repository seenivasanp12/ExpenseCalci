import { useState } from 'react'
import { Plus, Trash2, Loader2, TrendingUp, StopCircle, ArrowDownCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { PAYMENT_METHODS } from '../../utils/paymentMethods'
import { MF_CATEGORIES, OTHER_CATEGORY } from '../../utils/mfCategories'
import { CHART_RANGES, cumulativeSeries, nextSipDueDate, allContributions, fundHistory } from '../../utils/mutualFundCalc'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
// Paying INTO a fund with a credit card isn't a supported case, same as
// paying OFF a credit card bill (see CreditCardTab.jsx).
const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.filter(m => m.id !== 'credit_card')

const HISTORY_LABEL = { sip: 'SIP', lumpsum: 'Lumpsum', withdrawal: 'Withdrawal' }

const todayParts = () => {
  const now = new Date()
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() }
}

const formatDate = ({ day, month, year }) => `${day} ${MONTH_SHORT[month - 1]} ${year}`
const dateInputValue = ({ day, month, year }) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const parseDateInput = (value) => { const [year, month, day] = value.split('-').map(Number); return { day, month, year } }

const emptyFundForm = { fundName: '', fundCategory: '', customCategory: '' }

export default function MutualFundTab({ funds, onAddFund, onAddSip, onStopSip, onAddLumpsum, onWithdrawFund, onDeleteFund }) {
  const [range, setRange] = useState('All')
  const [showAddFund, setShowAddFund] = useState(false)
  const [fundForm, setFundForm] = useState(emptyFundForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [showClosed, setShowClosed] = useState(false)

  const [sipFundId, setSipFundId] = useState(null)
  const [sipForm, setSipForm] = useState({ amount: '', sipDay: '5', paymentMethod: 'debit_card', ...todayParts() })

  const [lumpsumFundId, setLumpsumFundId] = useState(null)
  const [lumpsumForm, setLumpsumForm] = useState({ amount: '', paymentMethod: 'debit_card', ...todayParts() })

  const [withdrawFundId, setWithdrawFundId] = useState(null)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', ...todayParts() })

  const contributions = allContributions(funds)
  const series = cumulativeSeries(funds, range)

  const activeSips = funds
    .filter(f => f.activeSip)
    .map(f => ({ fund: f, sip: f.activeSip, due: nextSipDueDate(f.activeSip, contributions) }))
    .sort((a, b) => (a.due.year * 12 + a.due.month - (b.due.year * 12 + b.due.month)) || (a.due.day - b.due.day))

  const handleAddFund = async () => {
    if (!fundForm.fundName.trim()) return
    setSaving(true)
    try {
      const fundCategory = fundForm.fundCategory === OTHER_CATEGORY ? fundForm.customCategory.trim() : fundForm.fundCategory
      await onAddFund({ fundName: fundForm.fundName.trim(), fundCategory })
      setFundForm(emptyFundForm)
      setShowAddFund(false)
    } finally { setSaving(false) }
  }

  const openSipForm = (fundId) => {
    setSipFundId(fundId)
    setSipForm({ amount: '', sipDay: '5', paymentMethod: 'debit_card', ...todayParts() })
  }
  const handleAddSip = async () => {
    if (!sipFundId || !sipForm.amount) return
    setSaving(true)
    try {
      await onAddSip(sipFundId, {
        amount: Number(sipForm.amount), sipDay: Number(sipForm.sipDay), paymentMethod: sipForm.paymentMethod,
        startDay: sipForm.day, startMonth: sipForm.month, startYear: sipForm.year,
      })
      setSipFundId(null)
    } finally { setSaving(false) }
  }

  const openLumpsumForm = (fundId) => {
    setLumpsumFundId(fundId)
    setLumpsumForm({ amount: '', paymentMethod: 'debit_card', ...todayParts() })
  }
  const handleAddLumpsum = async () => {
    if (!lumpsumFundId || !lumpsumForm.amount) return
    setSaving(true)
    try {
      await onAddLumpsum(lumpsumFundId, {
        amount: Number(lumpsumForm.amount), paymentMethod: lumpsumForm.paymentMethod,
        day: lumpsumForm.day, month: lumpsumForm.month, year: lumpsumForm.year,
      })
      setLumpsumFundId(null)
    } finally { setSaving(false) }
  }

  const openWithdrawForm = (fundId) => {
    setWithdrawFundId(fundId)
    setWithdrawForm({ amount: '', ...todayParts() })
  }
  const handleWithdraw = async () => {
    if (!withdrawFundId || !withdrawForm.amount) return
    setSaving(true)
    try {
      await onWithdrawFund(withdrawFundId, {
        amount: Number(withdrawForm.amount), day: withdrawForm.day, month: withdrawForm.month, year: withdrawForm.year,
      })
      setWithdrawFundId(null)
    } finally { setSaving(false) }
  }

  const handleStopSip = async (id) => {
    if (!window.confirm('Stop this SIP? Past contributions stay, but it will no longer auto-post each month.')) return
    setBusyId(id)
    try { await onStopSip(id) } finally { setBusyId(null) }
  }

  const handleDeleteFund = async (id) => {
    if (!window.confirm('Delete this fund? Its SIP/lumpsum/withdrawal tracking goes away, but past expenses and Earn entries stay in your records — same as removing a credit card.')) return
    setBusyId(id)
    try { await onDeleteFund(id) } finally { setBusyId(null) }
  }

  const activeFunds = funds.filter(f => f.isActive !== false)
  const closedFunds = funds.filter(f => f.isActive === false)

  // A closed fund with a still-active SIP isn't a contradiction — it's the
  // exact real-world case being modeled: fully redeemed today, reopens on
  // its own the moment the SIP's next installment posts. So this list is
  // built from every fund, not just the active ones.
  const renderFund = (fund) => {
    const expanded = expandedId === fund.id
    const history = expanded ? fundHistory(fund) : []
    const closed = fund.isActive === false
    return (
      <div key={fund.id} className={`rounded-2xl border overflow-hidden bg-white ${closed ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm truncate">{fund.fundName}</p>
              {closed && <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5 flex-shrink-0">Closed</span>}
            </div>
            {fund.fundCategory && <p className="text-xs text-gray-400 truncate">{fund.fundCategory}</p>}
          </div>
          <button
            onClick={() => handleDeleteFund(fund.id)}
            disabled={busyId === fund.id}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 flex-shrink-0"
          >
            {busyId === fund.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>

        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <button onClick={() => setExpandedId(expanded ? null : fund.id)} className="text-left">
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              Invested {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </p>
            <p className="text-lg font-black text-amber-600">₹{Number(fund.totalInvested).toLocaleString('en-IN')}</p>
          </button>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            {!fund.activeSip && (
              <button onClick={() => openSipForm(fund.id)} className="text-[11px] font-bold text-amber-600 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50">
                + SIP
              </button>
            )}
            <button onClick={() => openLumpsumForm(fund.id)} className="text-[11px] font-bold text-amber-600 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50">
              + Lumpsum
            </button>
            {fund.totalInvested > 0 && (
              <button onClick={() => openWithdrawForm(fund.id)} className="text-[11px] font-bold text-red-500 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50">
                Withdraw
              </button>
            )}
          </div>
        </div>

        {fund.activeSip && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-semibold">
            SIP ₹{Number(fund.activeSip.amount).toLocaleString('en-IN')} on day {fund.activeSip.sipDay} of every month
            {closed && ' — will reopen this fund automatically once it posts'}
          </div>
        )}

        {/* Full history — every SIP installment, lumpsum, and withdrawal for
            this fund, not just the current month's activity */}
        {expanded && (
          <div className="mx-4 mb-3 rounded-xl border border-gray-100 overflow-hidden">
            {history.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-4">No activity yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {history.map(h => (
                  <div key={`${h.kind}-${h.id}`} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <span className="text-gray-600">{MONTH_SHORT[h.month - 1]} {h.day}, {h.year}</span>
                      <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase">{HISTORY_LABEL[h.type]}</span>
                    </div>
                    <span className={`font-bold ${h.kind === 'out' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {h.kind === 'out' ? '−' : '+'}₹{Number(h.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sipFundId === fund.id && (
          <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <p className="text-[11px] font-bold text-gray-500">Set up SIP</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <input
                  type="number" value={sipForm.amount} onChange={e => setSipForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount / month" className="w-full pl-6 pr-2 py-2.5 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <input
                type="number" min="1" max="31" value={sipForm.sipDay} onChange={e => setSipForm(f => ({ ...f, sipDay: e.target.value }))}
                placeholder="Day of month" className="px-2 py-2.5 rounded-lg border border-gray-200 text-xs"
              />
            </div>
            <input
              type="date" value={dateInputValue(sipForm)}
              onChange={e => setSipForm(f => ({ ...f, ...parseDateInput(e.target.value) }))}
              className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-xs"
            />
            <select
              value={sipForm.paymentMethod} onChange={e => setSipForm(f => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-xs"
            >
              {PAYMENT_METHOD_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setSipFundId(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold">Cancel</button>
              <button
                onClick={handleAddSip} disabled={saving || !sipForm.amount}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : null} Start SIP
              </button>
            </div>
          </div>
        )}

        {lumpsumFundId === fund.id && (
          <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <p className="text-[11px] font-bold text-gray-500">Add Lumpsum</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <input
                  type="number" value={lumpsumForm.amount} onChange={e => setLumpsumForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount" className="w-full pl-6 pr-2 py-2.5 rounded-lg border border-gray-200 text-xs"
                />
              </div>
              <input
                type="date" value={dateInputValue(lumpsumForm)}
                onChange={e => setLumpsumForm(f => ({ ...f, ...parseDateInput(e.target.value) }))}
                className="px-2 py-2.5 rounded-lg border border-gray-200 text-xs"
              />
            </div>
            <select
              value={lumpsumForm.paymentMethod} onChange={e => setLumpsumForm(f => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-xs"
            >
              {PAYMENT_METHOD_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setLumpsumFundId(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold">Cancel</button>
              <button
                onClick={handleAddLumpsum} disabled={saving || !lumpsumForm.amount}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : null} Add
              </button>
            </div>
          </div>
        )}

        {withdrawFundId === fund.id && (
          <div className="mx-4 mb-3 p-3 bg-red-50 rounded-xl border border-red-100 space-y-2">
            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1"><ArrowDownCircle size={12} /> Withdraw — lands in Earn as "From {fund.fundName}"</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                <input
                  type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max ₹${Number(fund.totalInvested).toLocaleString('en-IN')}`} className="w-full pl-6 pr-2 py-2.5 rounded-lg border border-red-200 text-xs"
                />
              </div>
              <input
                type="date" value={dateInputValue(withdrawForm)}
                onChange={e => setWithdrawForm(f => ({ ...f, ...parseDateInput(e.target.value) }))}
                className="px-2 py-2.5 rounded-lg border border-red-200 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWithdrawFundId(null)} className="flex-1 py-2 rounded-lg border border-red-200 text-gray-500 text-xs font-bold">Cancel</button>
              <button
                onClick={handleWithdraw} disabled={saving || !withdrawForm.amount}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : null} Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Growth chart — net money invested (contributions minus withdrawals),
          not live market value (no NAV feed in this phase) */}
      {contributions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Invested Over Time</p>
          <InvestedChart series={series} />
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {CHART_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  range === r ? 'border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-100' : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active SIPs */}
      {activeSips.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50/60 text-xs font-bold text-gray-600">Active SIPs ({activeSips.length})</div>
          <div className="divide-y divide-gray-50">
            {activeSips.map(({ fund, sip, due }) => (
              <div key={sip.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{fund.fundName}</p>
                  <p className="text-xs text-gray-400">₹{Number(sip.amount).toLocaleString('en-IN')}/month</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-bold text-gray-500 border border-gray-200 rounded-lg px-2 py-1">{formatDate(due)}</span>
                  <button
                    onClick={() => handleStopSip(sip.id)}
                    disabled={busyId === sip.id}
                    aria-label="Stop SIP"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    {busyId === sip.id ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund list */}
      {funds.length === 0 ? (
        <div className="text-center py-10 text-gray-300">
          <TrendingUp size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No mutual funds added yet</p>
        </div>
      ) : activeFunds.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">Every fund is fully withdrawn and closed — see below, or add a new one.</p>
      ) : (
        <div className="space-y-3">{activeFunds.map(renderFund)}</div>
      )}

      {/* Closed funds — fully redeemed with nothing left to feed them.
          Collapsed by default so a "done" fund doesn't clutter the active
          list, but its history stays one tap away rather than disappearing. */}
      {closedFunds.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowClosed(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-400 hover:bg-gray-100"
          >
            <span>Closed Funds ({closedFunds.length})</span>
            {showClosed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showClosed && closedFunds.map(renderFund)}
        </div>
      )}

      {/* Add fund */}
      {!showAddFund ? (
        <button
          onClick={() => setShowAddFund(true)}
          className="w-full flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 text-amber-600 font-bold text-sm rounded-2xl py-3 hover:bg-amber-100 transition-colors"
        >
          <Plus size={16} /> Add Mutual Fund
        </button>
      ) : (
        <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-100">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center"><Plus size={14} /></div>
            Add Mutual Fund
          </div>
          <input
            type="text" value={fundForm.fundName} onChange={e => setFundForm(f => ({ ...f, fundName: e.target.value }))}
            placeholder="e.g. Motilal Oswal Midcap Fund Direct Growth"
            className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm"
          />
          <select
            value={fundForm.fundCategory} onChange={e => setFundForm(f => ({ ...f, fundCategory: e.target.value }))}
            className="w-full px-3 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm"
          >
            <option value="">Category (optional)…</option>
            {MF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            <option value={OTHER_CATEGORY}>Other (type manually)</option>
          </select>
          {fundForm.fundCategory === OTHER_CATEGORY && (
            <input
              type="text" value={fundForm.customCategory} onChange={e => setFundForm(f => ({ ...f, customCategory: e.target.value }))}
              placeholder="Category name"
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white text-sm"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddFund(false); setFundForm(emptyFundForm) }}
              className="flex-1 px-4 py-3 rounded-xl border border-amber-200 text-amber-600 font-bold text-sm hover:bg-amber-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddFund} disabled={!fundForm.fundName.trim() || saving}
              className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Add Fund'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hand-rolled inline SVG — the codebase has no charting dependency and this
// is a single series, so a small line chart doesn't warrant adding one.
// Single hue (amber, matches this tab's palette), thin 2px line, a rounded
// data-end at the latest point, a recessive baseline instead of a full grid,
// and a crosshair + readout on hover/touch per the dataviz interaction spec.
function InvestedChart({ series }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  if (series.length === 0) return null

  const width = 320, height = 120, padX = 8, padY = 14
  const maxTotal = Math.max(...series.map(p => p.total), 0)
  const lastIdx = series.length - 1
  const xFor = (i) => padX + (i / Math.max(lastIdx, 1)) * (width - padX * 2)
  const yFor = (v) => height - padY - (v / (maxTotal || 1)) * (height - padY * 2)
  const points = series.map((p, i) => `${xFor(i)},${yFor(p.total)}`).join(' ')

  const handlePointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const x = ((clientX - rect.left) / rect.width) * width
    const idx = Math.round(((x - padX) / (width - padX * 2)) * Math.max(lastIdx, 1))
    setHoverIdx(Math.min(Math.max(idx, 0), lastIdx))
  }

  const shown = hoverIdx != null ? series[hoverIdx] : series[lastIdx]

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`} className="w-full h-32 touch-none" preserveAspectRatio="none"
        onMouseMove={handlePointer} onMouseLeave={() => setHoverIdx(null)}
        onTouchMove={handlePointer} onTouchEnd={() => setHoverIdx(null)}
      >
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#F3F4F6" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xFor(lastIdx)} cy={yFor(series[lastIdx].total)} r="4" fill="#F59E0B" />
        {hoverIdx != null && (
          <>
            <line x1={xFor(hoverIdx)} y1={4} x2={xFor(hoverIdx)} y2={height - padY} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <circle cx={xFor(hoverIdx)} cy={yFor(shown.total)} r="3.5" fill="#fff" stroke="#F59E0B" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="flex items-center justify-between text-[11px] px-1">
        <span className="text-gray-400">{MONTH_SHORT[series[0].month - 1]} {series[0].year}</span>
        <span className="font-black text-gray-800">
          ₹{shown.total.toLocaleString('en-IN')}
          <span className="text-gray-400 font-medium"> — {shown.day} {MONTH_SHORT[shown.month - 1]} {shown.year}</span>
        </span>
      </div>
    </div>
  )
}
