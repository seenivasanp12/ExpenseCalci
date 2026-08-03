// Pure helpers for grouping credit-card expenses into billing cycles.
// `month` is 0-indexed (JS Date convention), matching the rest of the app.

// Which statement period an expense made on `day` (of `year`/`month`) falls into.
// Cycles are pure calendar months — every expense made in a given month lands
// on that month's statement, regardless of the exact statement day. The
// statement/due day only affect *when* that statement is generated and due
// (see getDueDate), not which transactions belong to it.
export const getStatementPeriod = (statementDay, year, month, day) => ({ year, month })

const addMonth = (year, month) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })

// The due date's (year, month) for a statement covering (periodYear, periodMonth)
// of spending. The statement itself is generated the following month, on
// `statementDay`; the due date falls in that same month if dueDay comes after
// statementDay, otherwise it rolls one month further.
export const getDueDate = (statementDay, dueDay, periodYear, periodMonth) => {
  const generated = addMonth(periodYear, periodMonth)
  return dueDay > statementDay ? generated : addMonth(generated.year, generated.month)
}

const cycleKey = (p) => `${p.year}-${p.month}`

// Groups a flat list of expenses (already filtered to one card) into billing
// cycles, newest first. Each group: { year, month, dueYear, dueMonth, total, entries }.
export const groupByBillingCycle = (card, expenses) => {
  const groups = {}
  expenses.forEach(e => {
    const period = getStatementPeriod(card.statementDay, e.year, e.month, e.day)
    const key = cycleKey(period)
    if (!groups[key]) {
      const due = getDueDate(card.statementDay, card.dueDay, period.year, period.month)
      groups[key] = { year: period.year, month: period.month, dueYear: due.year, dueMonth: due.month, total: 0, entries: [] }
    }
    groups[key].total += Number(e.amount || 0)
    groups[key].entries.push(e)
  })
  return Object.values(groups).sort((a, b) => (b.year - a.year) || (b.month - a.month))
}
