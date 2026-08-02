import { Router } from 'express'
import { supabase } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import {
  calculateEmi, calculateFeeWithGst, computeInstallmentDates,
  daysInMonth, addDays, round2,
} from '../utils/emiCalc.js'

const router = Router()
const EMI_TYPES = ['interest', 'deferred', 'upfront_discount']
const DEFAULT_DISCOUNT_WINDOW_DAYS = 90

// Validates + computes everything about a prospective EMI plan without
// touching the database — shared by /preview and the real create route.
const buildPlan = (body) => {
  const {
    cardId, itemName, purchaseDay, purchaseMonth, purchaseYear,
    originalAmount, upfrontDiscount, tenureMonths, emiType,
    interestRateAnnual, processingFee, gstRate, deferredMonths,
    deferredDiscountAmount, discountExpectedDay, discountExpectedMonth, discountExpectedYear,
  } = body

  const tenure = Number(tenureMonths)
  if (!Number.isInteger(tenure) || tenure < 1) throw new Error('Tenure must be a whole number of months.')
  if (!EMI_TYPES.includes(emiType)) throw new Error('Invalid EMI type.')
  if (!Number(originalAmount) || Number(originalAmount) <= 0) throw new Error('Original amount must be greater than zero.')

  const principal = round2(Number(originalAmount) - (Number(upfrontDiscount) || 0))
  if (principal <= 0) throw new Error('Principal must be greater than zero after the upfront discount.')

  // "Upfront Discount" EMI is a genuinely flat, interest-free split — the
  // discount is baked in at purchase, no waiting, no deferred refund.
  // "Interest" and "Deferred" both run the same real amortization; the only
  // difference is Deferred also tracks a delayed discount refund.
  const rate = emiType === 'upfront_discount' ? 0 : (Number(interestRateAnnual) || 0)
  const gst = Number(gstRate) || 18
  const { monthlyEmi, schedule, totalInterest } = calculateEmi({ principal, tenureMonths: tenure, interestRateAnnual: rate, gstRate: gst })

  const deferred = Number(deferredMonths) || 0
  const dueDates = computeInstallmentDates(Number(purchaseMonth), Number(purchaseYear), deferred, tenure)
  const fee = Number(processingFee) || 0
  const gstOnFee = round2(fee * (gst / 100))
  const feeWithGst = calculateFeeWithGst(fee, gst)
  const totalPayable = round2(schedule.reduce((s, row) => s + row.amount, 0) + feeWithGst)

  let discount = null
  if (emiType === 'deferred') {
    const amount = deferredDiscountAmount != null && deferredDiscountAmount !== '' ? round2(Number(deferredDiscountAmount)) : totalInterest
    const expected = (discountExpectedDay && discountExpectedMonth && discountExpectedYear)
      ? { day: Number(discountExpectedDay), month: Number(discountExpectedMonth), year: Number(discountExpectedYear) }
      : addDays(Number(purchaseYear), Number(purchaseMonth), Number(purchaseDay), DEFAULT_DISCOUNT_WINDOW_DAYS)
    discount = { amount, expected }
  }

  return {
    cardId, itemName: itemName?.trim() || '',
    purchaseDay: Number(purchaseDay), purchaseMonth: Number(purchaseMonth), purchaseYear: Number(purchaseYear),
    originalAmount: Number(originalAmount), upfrontDiscount: Number(upfrontDiscount) || 0, principal,
    tenureMonths: tenure, emiType, interestRateAnnual: rate,
    processingFee: fee, gstRate: gst, gstOnFee, deferredMonths: deferred,
    monthlyEmi, feeWithGst, totalPayable, totalInterest, schedule, dueDates, discount,
  }
}

router.post('/preview', requireAuth, async (req, res) => {
  try {
    const plan = buildPlan(req.body)
    res.json({
      principal: plan.principal,
      monthlyEmiAmount: plan.monthlyEmi,
      processingFee: plan.processingFee,
      gstOnFee: plan.gstOnFee,
      feeWithGst: plan.feeWithGst,
      totalPayable: plan.totalPayable,
      firstDueYear: plan.dueDates[0]?.year,
      firstDueMonth: plan.dueDates[0]?.month,
      schedule: plan.schedule.map((row, i) => ({ ...row, dueYear: plan.dueDates[i].year, dueMonth: plan.dueDates[i].month })),
      deferredDiscount: plan.discount,
    })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('emi_plans').select('*').eq('user_id', req.user.id).order('created_at')
    if (error) throw error

    const planIds = (plans || []).map(p => p.id)
    let installmentsByPlan = {}
    if (planIds.length) {
      const { data: installments, error: instErr } = await supabase
        .from('emi_installments').select('*').in('emi_plan_id', planIds).order('installment_no')
      if (instErr) throw instErr
      installmentsByPlan = (installments || []).reduce((acc, row) => {
        (acc[row.emi_plan_id] ||= []).push(row)
        return acc
      }, {})
    }

    res.json((plans || []).map(p => ({
      id: p.id, cardId: p.card_id, itemName: p.item_name,
      purchaseDay: p.purchase_day, purchaseMonth: p.purchase_month, purchaseYear: p.purchase_year,
      originalAmount: p.original_amount, upfrontDiscount: p.upfront_discount, principal: p.principal,
      tenureMonths: p.tenure_months, emiType: p.emi_type, interestRateAnnual: p.interest_rate_annual,
      processingFee: p.processing_fee, gstRate: p.gst_rate, deferredMonths: p.deferred_months,
      monthlyEmiAmount: p.monthly_emi_amount, totalPayable: p.total_payable, status: p.status,
      deferredDiscountAmount: p.deferred_discount_amount,
      discountStatus: p.discount_status,
      discountExpectedDay: p.discount_expected_day, discountExpectedMonth: p.discount_expected_month, discountExpectedYear: p.discount_expected_year,
      discountConfirmedDay: p.discount_confirmed_day, discountConfirmedMonth: p.discount_confirmed_month, discountConfirmedYear: p.discount_confirmed_year,
      installments: (installmentsByPlan[p.id] || []).map(i => ({
        id: i.id, installmentNo: i.installment_no, dueYear: i.due_year, dueMonth: i.due_month, dueDay: i.due_day,
        principalComponent: i.principal_component, interestComponent: i.interest_component,
        gstComponent: i.gst_component, amount: i.amount,
      })),
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { data: card } = await supabase
      .from('credit_cards').select('id').eq('id', req.body.cardId).eq('user_id', req.user.id).maybeSingle()
    if (!card) return res.status(400).json({ error: 'Select a valid card.' })

    const plan = buildPlan(req.body)
    if (!plan.itemName) return res.status(400).json({ error: 'Item name is required.' })

    const { data: planRow, error: planErr } = await supabase
      .from('emi_plans').insert({
        user_id: req.user.id, card_id: plan.cardId, item_name: plan.itemName,
        purchase_day: plan.purchaseDay, purchase_month: plan.purchaseMonth, purchase_year: plan.purchaseYear,
        original_amount: plan.originalAmount, upfront_discount: plan.upfrontDiscount, principal: plan.principal,
        tenure_months: plan.tenureMonths, emi_type: plan.emiType, interest_rate_annual: plan.interestRateAnnual,
        processing_fee: plan.processingFee, gst_rate: plan.gstRate, deferred_months: plan.deferredMonths,
        monthly_emi_amount: plan.monthlyEmi, total_payable: plan.totalPayable,
        deferred_discount_amount: plan.discount?.amount || 0,
        discount_status: plan.emiType === 'deferred' ? 'pending' : 'not_applicable',
        discount_expected_day: plan.discount?.expected.day ?? null,
        discount_expected_month: plan.discount?.expected.month ?? null,
        discount_expected_year: plan.discount?.expected.year ?? null,
      }).select().single()
    if (planErr) throw planErr

    // Processing fee and its GST are two separate, separately-labeled charges
    // on a real statement — kept as two rows (installment_no 0 and -2)
    // instead of one combined figure. Both post on the purchase date, same
    // as the fee always has.
    const feeRow = plan.processingFee > 0 ? {
      emi_plan_id: planRow.id, installment_no: 0,
      due_year: plan.purchaseYear, due_month: plan.purchaseMonth, due_day: plan.purchaseDay,
      principal_component: 0, interest_component: 0, gst_component: 0, amount: plan.processingFee,
    } : null
    const gstFeeRow = plan.gstOnFee > 0 ? {
      emi_plan_id: planRow.id, installment_no: -2,
      due_year: plan.purchaseYear, due_month: plan.purchaseMonth, due_day: plan.purchaseDay,
      principal_component: 0, interest_component: 0, gst_component: plan.gstOnFee, amount: plan.gstOnFee,
    } : null

    const installmentRows = [
      ...(feeRow ? [feeRow] : []),
      ...(gstFeeRow ? [gstFeeRow] : []),
      // Posts on the SAME day-of-month as the purchase (clamped to the
      // month's length) — matches how computeInstallmentDates derived this
      // installment's month, so it buckets into the correct billing cycle
      // and shows up in the right calendar month in the Expenses tab.
      ...plan.schedule.map((row, i) => ({
        emi_plan_id: planRow.id, installment_no: row.installmentNo,
        due_year: plan.dueDates[i].year, due_month: plan.dueDates[i].month,
        due_day: Math.min(plan.purchaseDay, daysInMonth(plan.dueDates[i].year, plan.dueDates[i].month)),
        principal_component: row.principalComponent, interest_component: row.interestComponent,
        gst_component: row.gstComponent, amount: row.amount,
      })),
    ]

    const { data: installments, error: instErr } = await supabase
      .from('emi_installments').insert(installmentRows).select()
    if (instErr) throw instErr

    const remarkFor = (inst) => {
      if (inst.installment_no === 0) return `${plan.itemName} — Processing Fee`
      if (inst.installment_no === -2) return `${plan.itemName} — GST (${plan.gstRate}%) on Processing Fee`
      return `${plan.itemName} — EMI ${inst.installment_no}/${plan.tenureMonths}`
    }
    const expenseRows = installments.map(inst => ({
      user_id: req.user.id, year: inst.due_year, month: inst.due_month, day: inst.due_day,
      category: 'emi', amount: inst.amount, remark: remarkFor(inst),
      payment_method: 'credit_card', card_id: plan.cardId, emi_installment_id: inst.id,
    }))
    const { error: expErr } = await supabase.from('expenses').insert(expenseRows)
    if (expErr) throw expErr

    res.json({
      id: planRow.id, monthlyEmiAmount: plan.monthlyEmi, feeWithGst: plan.feeWithGst, totalPayable: plan.totalPayable,
      deferredDiscount: plan.discount,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Confirms the deferred discount actually landed on the card, on the given
// date, crediting an offsetting (negative) expense — the user checks their
// real statement and tells us when/how much, since banks can round slightly
// differently than our estimate.
router.post('/:id/confirm-discount', requireAuth, async (req, res) => {
  try {
    const { day, month, year, amount } = req.body
    if (!day || !month || !year) return res.status(400).json({ error: 'Confirmation date is required.' })

    const { data: planRow } = await supabase
      .from('emi_plans').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!planRow) return res.status(404).json({ error: 'EMI plan not found.' })
    if (planRow.emi_type !== 'deferred') return res.status(400).json({ error: 'This plan has no deferred discount to confirm.' })
    if (planRow.discount_status === 'confirmed') return res.status(400).json({ error: 'Discount already confirmed.' })

    const finalAmount = amount != null && amount !== '' ? round2(Number(amount)) : planRow.deferred_discount_amount

    const { data: instRow, error: instErr } = await supabase
      .from('emi_installments').insert({
        emi_plan_id: planRow.id, installment_no: -1,
        due_year: Number(year), due_month: Number(month), due_day: Number(day),
        principal_component: 0, interest_component: 0, gst_component: 0, amount: -finalAmount,
      }).select().single()
    if (instErr) throw instErr

    const { error: expErr } = await supabase.from('expenses').insert({
      user_id: req.user.id, year: Number(year), month: Number(month), day: Number(day),
      category: 'emi', amount: -finalAmount, remark: `${planRow.item_name} — deferred discount refund`,
      payment_method: 'credit_card', card_id: planRow.card_id, emi_installment_id: instRow.id,
    })
    if (expErr) throw expErr

    const { error: updateErr } = await supabase.from('emi_plans')
      .update({
        discount_status: 'confirmed', deferred_discount_amount: finalAmount,
        discount_confirmed_day: Number(day), discount_confirmed_month: Number(month), discount_confirmed_year: Number(year),
      })
      .eq('id', planRow.id)
    if (updateErr) throw updateErr

    res.json({ ok: true, amount: finalAmount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: planRow } = await supabase
      .from('emi_plans').select('id').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!planRow) return res.status(404).json({ error: 'EMI plan not found.' })

    const { data: installments } = await supabase
      .from('emi_installments').select('id').eq('emi_plan_id', planRow.id)
    const installmentIds = (installments || []).map(i => i.id)

    if (installmentIds.length) {
      const { error: delExpErr } = await supabase.from('expenses').delete().in('emi_installment_id', installmentIds)
      if (delExpErr) throw delExpErr
    }

    const { error: delPlanErr } = await supabase.from('emi_plans').delete().eq('id', planRow.id).eq('user_id', req.user.id)
    if (delPlanErr) throw delPlanErr

    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
