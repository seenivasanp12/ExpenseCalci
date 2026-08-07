import { Router } from 'express'
import { supabase } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { addDays } from '../utils/emiCalc.js'

const router = Router()
const CYCLE_CHANGE_COOLDOWN_DAYS = 180

const toCard = (c) => ({
  id: c.id,
  bank: c.bank,
  cardName: c.card_name,
  nickname: c.nickname ?? '',
  creditLimit: c.credit_limit,
  statementDay: c.statement_day,
  dueDay: c.due_day,
  joiningFee: c.joining_fee,
  annualFee: c.annual_fee,
  feeWaiverNote: c.fee_waiver_note ?? '',
  isActive: c.is_active,
  cycleChangedAt: c.cycle_changed_at,
})

const isValidDay = (d) => Number.isInteger(d) && d >= 1 && d <= 31

// Banks only let you change the billing-cycle date once every ~180 days —
// null means it's never been changed, so the first change is always allowed.
const checkCycleCooldown = (cycleChangedAt) => {
  if (!cycleChangedAt) return { allowed: true }
  const [y, m, d] = cycleChangedAt.split('-').map(Number)
  const nextEligible = addDays(y, m, d, CYCLE_CHANGE_COOLDOWN_DAYS)
  const today = new Date()
  const allowed = today >= new Date(nextEligible.year, nextEligible.month - 1, nextEligible.day)
  return { allowed, nextEligible }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('credit_cards').select('*')
      .eq('user_id', req.user.id).order('created_at')
    if (error) throw error
    res.json((data || []).map(toCard))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { bank, cardName, nickname, creditLimit, statementDay, dueDay, joiningFee, annualFee, feeWaiverNote } = req.body
    if (!bank?.trim() || !cardName?.trim())
      return res.status(400).json({ error: 'Bank and card name are required.' })
    if (!isValidDay(Number(statementDay)) || !isValidDay(Number(dueDay)))
      return res.status(400).json({ error: 'Statement day and due day must be between 1 and 28.' })

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: req.user.id,
        bank: bank.trim(),
        card_name: cardName.trim(),
        nickname: nickname?.trim() || '',
        credit_limit: Number(creditLimit) || 0,
        statement_day: Number(statementDay),
        due_day: Number(dueDay),
        joining_fee: Number(joiningFee) || 0,
        annual_fee: Number(annualFee) || 0,
        fee_waiver_note: feeWaiverNote?.trim() || '',
      })
      .select().single()
    if (error) throw error
    res.json(toCard(data))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { bank, cardName, nickname, creditLimit, statementDay, dueDay, joiningFee, annualFee, feeWaiverNote, isActive } = req.body
    if (!bank?.trim() || !cardName?.trim())
      return res.status(400).json({ error: 'Bank and card name are required.' })
    if (!isValidDay(Number(statementDay)) || !isValidDay(Number(dueDay)))
      return res.status(400).json({ error: 'Statement day and due day must be between 1 and 28.' })

    const { data: existing } = await supabase
      .from('credit_cards').select('statement_day, due_day, cycle_changed_at')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Card not found.' })

    const cycleChanging = Number(statementDay) !== existing.statement_day || Number(dueDay) !== existing.due_day
    let cycleChangedAtUpdate = {}
    if (cycleChanging) {
      const { allowed, nextEligible } = checkCycleCooldown(existing.cycle_changed_at)
      if (!allowed) {
        return res.status(400).json({
          error: `Billing-cycle date can only be changed once every ${CYCLE_CHANGE_COOLDOWN_DAYS} days. Try again on ${nextEligible.year}-${String(nextEligible.month).padStart(2, '0')}-${String(nextEligible.day).padStart(2, '0')}.`,
        })
      }
      const today = new Date()
      cycleChangedAtUpdate = { cycle_changed_at: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` }
    }

    const { data, error } = await supabase
      .from('credit_cards')
      .update({
        bank: bank.trim(),
        card_name: cardName.trim(),
        nickname: nickname?.trim() || '',
        credit_limit: Number(creditLimit) || 0,
        statement_day: Number(statementDay),
        due_day: Number(dueDay),
        joining_fee: Number(joiningFee) || 0,
        annual_fee: Number(annualFee) || 0,
        fee_waiver_note: feeWaiverNote?.trim() || '',
        is_active: isActive ?? true,
        ...cycleChangedAtUpdate,
      })
      .eq('id', req.params.id).eq('user_id', req.user.id)
      .select().single()
    if (error) throw error
    res.json(toCard(data))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('credit_cards')
      .delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// All of this card's expenses across every month — the Dashboard's main
// data feed is scoped to one calendar month at a time, but a billing cycle
// can span two, so billing-cycle grouping needs its own unscoped fetch.
router.get('/:id/expenses', requireAuth, async (req, res) => {
  try {
    const { data: card } = await supabase
      .from('credit_cards').select('id')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!card) return res.status(404).json({ error: 'Card not found.' })

    const { data, error } = await supabase
      .from('expenses').select('*')
      .eq('card_id', req.params.id).eq('user_id', req.user.id)
      .neq('category', 'card_payment')
      .order('year').order('month').order('day')
    if (error) throw error

    res.json((data || []).map(e => ({
      id: e.id, year: e.year, month: e.month - 1, day: e.day,
      category: e.category, amount: e.amount, remark: e.remark ?? '',
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Payment records for this card's closed statements — independent of
// expenses/earnings, purely tracks which cycles have been settled.
router.get('/:id/payments', requireAuth, async (req, res) => {
  try {
    const { data: card } = await supabase
      .from('credit_cards').select('id')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!card) return res.status(404).json({ error: 'Card not found.' })

    const { data, error } = await supabase
      .from('credit_card_payments').select('*').eq('card_id', req.params.id)
    if (error) throw error

    res.json((data || []).map(p => ({
      id: p.id, statementYear: p.statement_year, statementMonth: p.statement_month,
      amountPaid: p.amount_paid, paidDay: p.paid_day, paidMonth: p.paid_month, paidYear: p.paid_year,
      paymentMethod: p.payment_method,
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

const PAYMENT_METHODS = ['cash', 'upi', 'debit_card', 'other']

// Recording a payment also creates a real expense row dated on the payment
// date — the purchase itself doesn't reduce cash-basis spend until this
// happens, since that's when money actually leaves the bank account.
// Partial payments are allowed: multiple rows can apply to the same
// statement, and the Credit Card tab sums them to compute what's still due.
router.post('/:id/payments', requireAuth, async (req, res) => {
  try {
    const { statementYear, statementMonth, amountPaid, paidDay, paidMonth, paidYear, paymentMethod } = req.body
    const method = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'debit_card'
    if (!Number(amountPaid) || Number(amountPaid) <= 0)
      return res.status(400).json({ error: 'Amount paid must be greater than zero.' })

    const { data: card } = await supabase
      .from('credit_cards').select('*')
      .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()
    if (!card) return res.status(404).json({ error: 'Card not found.' })

    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({
        user_id: req.user.id, year: Number(paidYear), month: Number(paidMonth), day: Number(paidDay),
        category: 'card_payment', amount: Number(amountPaid),
        remark: `${card.bank} ${card.card_name} — Bill Payment`,
        payment_method: method, card_id: card.id,
      })
      .select().single()
    if (expErr) throw expErr

    const { data, error } = await supabase
      .from('credit_card_payments')
      .insert({
        card_id: req.params.id, statement_year: Number(statementYear), statement_month: Number(statementMonth),
        amount_paid: Number(amountPaid), paid_day: Number(paidDay), paid_month: Number(paidMonth), paid_year: Number(paidYear),
        payment_method: method, expense_id: expense.id,
      })
      .select().single()
    if (error) throw error

    res.json({
      payment: {
        id: data.id, statementYear: data.statement_year, statementMonth: data.statement_month,
        amountPaid: data.amount_paid, paidDay: data.paid_day, paidMonth: data.paid_month, paidYear: data.paid_year,
        paymentMethod: data.payment_method,
      },
      expense: {
        id: expense.id, day: expense.day, category: expense.category, amount: expense.amount, remark: expense.remark,
        paymentMethod: expense.payment_method, cardId: expense.card_id,
      },
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
