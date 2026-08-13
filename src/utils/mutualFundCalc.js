// Pure helpers for the Mutual Fund tab — everything is derived client-side
// from the one payload GET /api/mf/funds returns, the same
// client-derives-everything approach billingCycle.js uses for credit cards.
// `month` fields throughout are 1-12, matching the backend's convention.

export const CHART_RANGES = ['1M', '3M', '6M', '1Y', 'All']
const RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, All: null }

const addMonthsLocal = (year, month, add) => {
  const total = (month - 1) + add
  return { year: year + Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 }
}

// Every contribution across every fund, oldest first. Used for SIP due-date
// math only — withdrawals never affect a SIP's own schedule.
export const allContributions = (funds) =>
  funds
    .flatMap(f => f.contributions.map(c => ({ ...c, fundId: f.id })))
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month) || a.day - b.day)

// Contributions (+) and withdrawals (-) merged into one signed, time-sorted
// list — the basis for the running-total chart, since a withdrawal should
// pull the invested total back down, not just stop it from growing.
const allFlows = (funds) =>
  funds
    .flatMap(f => [
      ...f.contributions.map(c => ({ year: c.year, month: c.month, day: c.day, signedAmount: Number(c.amount || 0) })),
      ...(f.withdrawals || []).map(w => ({ year: w.year, month: w.month, day: w.day, signedAmount: -Number(w.amount || 0) })),
    ])
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month) || a.day - b.day)

// Running-total series for the growth chart, optionally windowed to the
// trailing N months. Plots net money invested (contributions minus
// withdrawals), not market value — there's no live NAV feed in this phase.
export const cumulativeSeries = (funds, range = 'All') => {
  let running = 0
  const full = allFlows(funds).map(f => {
    running += f.signedAmount
    return { year: f.year, month: f.month, day: f.day, total: running }
  })

  const windowMonths = RANGE_MONTHS[range]
  if (!windowMonths || full.length === 0) return full
  const now = new Date()
  const cutoffOrdinal = now.getFullYear() * 12 + now.getMonth() - windowMonths
  return full.filter(p => (p.year * 12 + (p.month - 1)) >= cutoffOrdinal)
}

// One fund's full activity — SIP installments, lumpsums, and withdrawals —
// merged and sorted newest-first for the per-fund history view.
export const fundHistory = (fund) => [
  ...fund.contributions.map(c => ({ ...c, kind: 'in' })),
  ...(fund.withdrawals || []).map(w => ({ ...w, type: 'withdrawal', kind: 'out' })),
].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month) || b.day - a.day)

// The next date an active SIP is due, derived from its own posted
// contributions rather than trusting "today" directly — so a SIP that's
// behind on backfill (e.g. just created with a past start date) still shows
// the correct next gap once it catches up. A skipped month counts as
// "handled" too — otherwise a month with no contribution (because it was
// skipped) would keep looking due forever and could get offered for
// skipping again.
export const nextSipDueDate = (sip, contributions) => {
  const handled = [
    ...contributions.filter(c => c.sipId === sip.id).map(c => ({ year: c.year, month: c.month })),
    ...(sip.skips || []),
  ]
  if (!handled.length) return { day: sip.sipDay, month: sip.startMonth, year: sip.startYear }

  const last = handled.reduce((max, c) =>
    (c.year * 12 + c.month) > (max.year * 12 + max.month) ? c : max)
  const next = addMonthsLocal(last.year, last.month, 1)
  return { day: sip.sipDay, month: next.month, year: next.year }
}

// Mirrors backend/routes/mutualFunds.js's effectiveSipAmount — the amount a
// SIP actually posts for a given month once an optional annual step-up is
// factored in. Kept in sync by hand rather than shared, same as this file's
// other backend-mirroring helpers (client-derives-everything convention).
export const effectiveSipAmount = (sip, year, month) => {
  if (!sip.stepUpPercent) return Number(sip.amount)
  const monthsSinceStart = (year * 12 + month) - (sip.startYear * 12 + sip.startMonth)
  const yearsElapsed = Math.max(0, Math.floor(monthsSinceStart / 12))
  return Math.round(Number(sip.amount) * Math.pow(1 + Number(sip.stepUpPercent) / 100, yearsElapsed))
}
