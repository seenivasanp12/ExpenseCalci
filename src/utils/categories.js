import {
  Utensils, ShoppingBasket, FileText, ArrowLeftRight,
  Dumbbell, Plane, Clapperboard, ShoppingBag, MoreHorizontal,
} from 'lucide-react'

export const CATEGORIES = [
  { id: 'food_dining',     label: 'Food & Dining',       icon: Utensils,       bg: 'bg-indigo-100',  text: 'text-indigo-600',  dot: 'bg-indigo-500',  bar: 'bg-indigo-500',  hex: '#6366f1' },
  { id: 'grocery',         label: 'Grocery & Essential', icon: ShoppingBasket, bg: 'bg-green-100',   text: 'text-green-600',   dot: 'bg-green-500',   bar: 'bg-green-500',   hex: '#22c55e' },
  { id: 'bills_utilities', label: 'Bills & Utilities',   icon: FileText,       bg: 'bg-blue-100',    text: 'text-blue-600',    dot: 'bg-blue-500',    bar: 'bg-blue-500',    hex: '#3b82f6' },
  { id: 'transfers',       label: 'Transfers',           icon: ArrowLeftRight, bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-500', bar: 'bg-emerald-500', hex: '#10b981' },
  { id: 'health',          label: 'Health & Wellness',   icon: Dumbbell,       bg: 'bg-pink-100',    text: 'text-pink-600',    dot: 'bg-pink-500',    bar: 'bg-pink-500',    hex: '#ec4899' },
  { id: 'travel',          label: 'Travel',              icon: Plane,          bg: 'bg-orange-100',  text: 'text-orange-600',  dot: 'bg-orange-500',  bar: 'bg-orange-500',  hex: '#f97316' },
  { id: 'entertainment',   label: 'Entertainment',       icon: Clapperboard,   bg: 'bg-purple-100',  text: 'text-purple-600',  dot: 'bg-purple-500',  bar: 'bg-purple-500',  hex: '#a855f7' },
  { id: 'shopping',        label: 'Shopping',            icon: ShoppingBag,    bg: 'bg-amber-100',   text: 'text-amber-600',   dot: 'bg-amber-500',   bar: 'bg-amber-500',   hex: '#f59e0b' },
  { id: 'others',          label: 'Others',              icon: MoreHorizontal, bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400',    bar: 'bg-gray-400',    hex: '#9ca3af' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
export const getCategory = (id) => CATEGORY_MAP[id] || CATEGORY_MAP.others
