import { Banknote, Smartphone, CreditCard, Landmark, MoreHorizontal } from 'lucide-react'

export const PAYMENT_METHODS = [
  { id: 'cash',        label: 'Cash',        icon: Banknote },
  { id: 'upi',         label: 'UPI',         icon: Smartphone },
  { id: 'debit_card',  label: 'Debit Card',  icon: Landmark },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'other',       label: 'Other',       icon: MoreHorizontal },
]

export const PAYMENT_METHOD_MAP = Object.fromEntries(PAYMENT_METHODS.map(m => [m.id, m]))
export const getPaymentMethod = (id) => PAYMENT_METHOD_MAP[id] || PAYMENT_METHOD_MAP.cash
