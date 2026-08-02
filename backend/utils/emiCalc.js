// EMI amortization math. Single source of truth — the backend computes and
// persists these numbers once at plan creation; the frontend never re-derives
// them, it only previews via POST /api/emi/preview before committing.
//
// All months here are 1-12 (matching emi_plans/emi_installments/expenses'
// SMALLINT month columns), not JS Date's 0-indexed convention used elsewhere
// in the frontend.
//
// Real-world "No Cost EMI" is NOT interest-free under the hood: the bank
// charges the same reducing-balance EMI as a normal interest EMI, then
// separately refunds a "deferred discount" (~= total interest) onto the card,
// typically within ~90 days. So there's one amortization formula for all
// three plan types — 'upfront_discount' is just that formula with rate
// forced to 0, which degrades cleanly to a flat principal/tenure split.

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// Builds the full monthly schedule: EMI (principal + interest) plus GST
// charged monthly on the interest component only (GST is a tax on the
// finance-charge/service, not on principal repayment).
export const calculateEmi = ({ principal, tenureMonths, interestRateAnnual, gstRate }) => {
  const r = interestRateAnnual / 12 / 100
  const emi = r === 0
    ? round2(principal / tenureMonths)
    : round2((principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1))

  let balance = principal
  const schedule = []
  for (let i = 1; i <= tenureMonths; i++) {
    const interest = round2(balance * r)
    const principalComponent = i === tenureMonths ? round2(balance) : round2(emi - interest)
    balance = round2(balance - principalComponent)
    const gst = round2(interest * (gstRate / 100))
    schedule.push({
      installmentNo: i, principalComponent, interestComponent: interest, gstComponent: gst,
      amount: round2(principalComponent + interest + gst),
    })
  }
  const totalInterest = round2(schedule.reduce((s, row) => s + row.interestComponent, 0))
  return { monthlyEmi: emi, schedule, totalInterest }
}

export const calculateFeeWithGst = (processingFee, gstRate) => round2(processingFee * (1 + gstRate / 100))

// month is 1-12; returns the (year, month) reached by adding `add` months.
export const addMonths = (year, month, add) => {
  const total = (month - 1) + add
  return { year: year + Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 }
}

// month is 1-12; returns the (year, month, day) reached by adding `days` days.
export const addDays = (year, month, day, days) => {
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// Number of days in a 1-12 indexed month.
export const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

// Each installment posts on the SAME day-of-month as the purchase itself,
// one calendar month after the previous installment — deferredMonths pushes
// the whole schedule out further. Installment 1 with no deferral posts in
// the purchase's own calendar month, exactly like the processing fee does.
// Using the purchase's actual day-of-month (not day 1) means each one
// buckets into the correct billing cycle via getStatementPeriod (src/utils/
// billingCycle.js) exactly the way the purchase/fee already do, AND shows
// up in the right calendar month when browsing the Expenses tab.
export const computeInstallmentDates = (purchaseMonth, purchaseYear, deferredMonths, tenureMonths) =>
  Array.from({ length: tenureMonths }, (_, i) => addMonths(purchaseYear, purchaseMonth, deferredMonths + i))
