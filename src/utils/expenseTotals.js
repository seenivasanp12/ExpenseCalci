// Cash-basis split: a credit-card purchase doesn't reduce your available cash
// the moment you make it — only paying the bill does, whenever that happens.
// A bill-payment expense row is always tagged with a real payment_method
// (never 'credit_card'), so it naturally counts as cash-basis spend the
// month it's paid, with no special-casing needed here.
export const cashBasisTotal = (expenses) =>
  expenses.filter(e => e.paymentMethod !== 'credit_card').reduce((s, e) => s + Number(e.amount || 0), 0)

export const creditSpendTotal = (expenses) =>
  expenses.filter(e => e.paymentMethod === 'credit_card').reduce((s, e) => s + Number(e.amount || 0), 0)
