// Pure helpers for grouping credit-card expenses into billing cycles.
// `month` is 0-indexed (JS Date convention), matching the rest of the app.

// Which statement period an expense made on `day` (of `year`/`month`) falls into.
// A cycle runs from statementDay of one month through statementDay-1 of the
// next, so a purchase strictly before statementDay lands in this month's
// statement, and one on-or-after it starts the next cycle instead.
export const getStatementPeriod = (statementDay, year, month, day) => {
  if (day < statementDay) return { year, month }
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
}

// The due date's (year, month) for a statement that closes on `statementDay`
// of (statementYear, statementMonth). Due dates always fall after the
// statement date, so if dueDay <= statementDay the due date must roll into
// the following month.
export const getDueDate = (statementDay, dueDay, statementYear, statementMonth) => {
  if (dueDay > statementDay) return { year: statementYear, month: statementMonth }
  return statementMonth === 11
    ? { year: statementYear + 1, month: 0 }
    : { year: statementYear, month: statementMonth + 1 }
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
