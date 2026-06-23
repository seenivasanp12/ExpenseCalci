import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, LogOut, ShieldCheck,
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  Users, Calculator, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, BarChart3,
  UserPlus, Trash2, KeyRound, Eye, EyeOff,
  UserCog, CheckCheck, X, Loader2,
} from 'lucide-react'
import { getAdminData, addUser, removeUser, changePassword } from '../utils/api'

const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const COLOR_POOL = [
  { gradient:'from-violet-500 to-purple-600', light:'bg-violet-50',  border:'border-violet-100', text:'text-violet-600',  badge:'bg-violet-100 text-violet-600'  },
  { gradient:'from-blue-500 to-indigo-600',   light:'bg-blue-50',    border:'border-blue-100',   text:'text-blue-600',    badge:'bg-blue-100 text-blue-600'    },
  { gradient:'from-rose-500 to-pink-600',     light:'bg-rose-50',    border:'border-rose-100',   text:'text-rose-600',    badge:'bg-rose-100 text-rose-600'    },
  { gradient:'from-green-500 to-emerald-600', light:'bg-green-50',   border:'border-green-100',  text:'text-green-600',   badge:'bg-green-100 text-green-600'  },
  { gradient:'from-orange-500 to-amber-600',  light:'bg-orange-50',  border:'border-orange-100', text:'text-orange-600',  badge:'bg-orange-100 text-orange-600' },
  { gradient:'from-teal-500 to-cyan-600',     light:'bg-teal-50',    border:'border-teal-100',   text:'text-teal-600',    badge:'bg-teal-100 text-teal-600'    },
]
const getStyle = (user) => COLOR_POOL[(user.color_index ?? 0) % COLOR_POOL.length]

const TABS = ['Overview','Earnings','Expenses','Savings','Calculate','Users']
const fmt  = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const fmtDate = (d) => { if (!d) return ''; const [y,m,day] = d.split('-'); return `${day} ${MONTH_SHORT[Number(m)-1]}` }

const TAB_ICONS = {
  Overview:  <BarChart3 size={13} />,
  Earnings:  <TrendingUp size={13} />,
  Expenses:  <TrendingDown size={13} />,
  Savings:   <PiggyBank size={13} />,
  Calculate: <Calculator size={13} />,
  Users:     <Users size={13} />,
}

export default function AdminDashboard({ onLogout }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [activeTab, setActiveTab] = useState('Overview')
  const [calculated, setCalculated] = useState(false)
  const [expanded, setExpanded]     = useState({})

  // ── User list + budget data ────────────────────────────────
  const [userList, setUserList]       = useState([])
  const [allData, setAllData]         = useState({})
  const [dataLoading, setDataLoading] = useState(true)

  // ── User management form state ─────────────────────────────
  const [addForm, setAddForm]       = useState({ name: '', password: '' })
  const [addError, setAddError]     = useState('')
  const [showAddPwd, setShowAddPwd] = useState(false)
  const [addSaving, setAddSaving]   = useState(false)
  const [changingPwd, setChangingPwd]   = useState(null)
  const [newPwd, setNewPwd]             = useState('')
  const [showNewPwd, setShowNewPwd]     = useState(false)
  const [pwdSaving, setPwdSaving]       = useState(false)
  const [pwdSuccess, setPwdSuccess]     = useState(null)
  const [removingUser, setRemovingUser] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(null)

  // ── Load all users + their budget data in one request ─────
  const loadAllData = useCallback(async () => {
    setDataLoading(true)
    try {
      const { users, allData: ad } = await getAdminData(year, month + 1)
      setUserList(users || [])
      setAllData(ad || {})
    } catch (err) {
      console.error('Admin data load failed:', err)
    } finally {
      setDataLoading(false)
    }
  }, [year, month])

  useEffect(() => { loadAllData() }, [loadAllData])

  const navigateMonth = (dir) => {
    let m = month + dir, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y); setCalculated(false)
  }

  const toggleExpand = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  // ── Computed stats ─────────────────────────────────────────
  const userStats = useMemo(() => {
    const stats = {}
    userList.forEach(u => {
      const d = allData[u.id] || { earn: [], expenses: {}, achievements: [] }
      const earn         = d.earn.reduce((s, e) => s + Number(e.amount || 0), 0)
      const expenses     = Object.values(d.expenses).reduce((s, e) => s + Number(e.amount || 0), 0)
      const achievements = d.achievements.reduce((s, a) => s + Number(a.amount || 0), 0)
      const salaryEntry  = d.earn.find(e => e.isSalary || e.description?.toLowerCase().includes('salary'))
      const salary       = salaryEntry ? Number(salaryEntry.amount) : earn
      stats[u.id] = { earn, expenses, achievements, balance: earn - expenses - achievements, salary }
    })
    return stats
  }, [allData, userList])

  const family = useMemo(() => {
    const earn         = userList.reduce((s, u) => s + (userStats[u.id]?.earn         || 0), 0)
    const expenses     = userList.reduce((s, u) => s + (userStats[u.id]?.expenses     || 0), 0)
    const achievements = userList.reduce((s, u) => s + (userStats[u.id]?.achievements || 0), 0)
    const totalSalary  = userList.reduce((s, u) => s + (userStats[u.id]?.salary       || 0), 0)
    return { earn, expenses, achievements, balance: earn - expenses - achievements, totalSalary, target: Math.round(totalSalary * 0.4) }
  }, [userStats, userList])

  // ── User actions ───────────────────────────────────────────
  const handleAddUser = async () => {
    const name = addForm.name.trim()
    if (!name || !addForm.password) { setAddError('Name and password are required.'); return }
    if (!/^[a-zA-Z ]+$/.test(name)) { setAddError('Name must contain letters only.'); return }
    setAddSaving(true); setAddError('')
    const colorIndex = userList.length % COLOR_POOL.length
    try {
      await addUser(name, addForm.password, colorIndex)
      setAddForm({ name: '', password: '' })
      loadAllData()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  const handleChangePassword = async (user) => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await changePassword(user.id, newPwd.trim())
      setChangingPwd(null); setNewPwd(''); setShowNewPwd(false)
      setPwdSuccess(user.id)
      setTimeout(() => setPwdSuccess(null), 2500)
    } catch (err) {
      console.error('Change password error:', err)
    } finally {
      setPwdSaving(false)
    }
  }

  const handleRemoveUser = async (user) => {
    setRemoveLoading(user.id)
    try {
      await removeUser(user.id)
      setRemovingUser(null)
      loadAllData()
    } finally {
      setRemoveLoading(null)
    }
  }

  if (dataLoading && userList.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-indigo-400">
        <Loader2 size={40} className="animate-spin" />
        <p className="font-semibold text-slate-500">Loading family data…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="max-w-3xl mx-auto px-4 pt-5 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold leading-none mb-1">Admin Console</p>
            <p className="font-black text-xl leading-none tracking-tight">Family Budget</p>
          </div>

          {/* Month navigator — integrated into header */}
          <div className="flex items-center bg-white/10 rounded-xl overflow-hidden">
            <button onClick={() => navigateMonth(-1)} className="p-2.5 hover:bg-white/10 transition-colors">
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm font-bold px-2 min-w-[86px] text-center tabular-nums">
              {MONTH_SHORT[month]} {year}
            </span>
            <button onClick={() => navigateMonth(1)} className="p-2.5 hover:bg-white/10 transition-colors">
              <ChevronRight size={17} />
            </button>
          </div>

          <button onClick={onLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2.5 rounded-xl transition-colors text-sm font-semibold">
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Family summary strip */}
        <div className="max-w-3xl mx-auto px-4 pb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Family Earn',  val: family.earn,         color: 'text-emerald-300' },
            { label: 'Family Spent', val: family.expenses,     color: 'text-rose-300'    },
            { label: 'Family Saved', val: family.achievements, color: 'text-amber-300'   },
            { label: 'Balance',      val: family.balance,      color: family.balance >= 0 ? 'text-sky-300' : 'text-rose-400' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 border border-white/10 rounded-xl py-2.5 px-3">
              <p className="text-[10px] text-white/50 leading-none mb-1.5 font-medium truncate">{item.label}</p>
              <p className={`font-black text-sm leading-none ${item.color}`}>{fmt(item.val)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* Pill tab bar */}
          <div className="px-3 pt-3 pb-0">
            <div className="flex gap-0.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {TAB_ICONS[tab]}
                  {tab === 'Users' ? `Users (${userList.length})` : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {dataLoading && activeTab !== 'Users' && (
              <div className="flex items-center justify-center py-8 text-indigo-400 gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">Loading {MONTH_NAMES[month]} data…</span>
              </div>
            )}

            {/* ══ OVERVIEW ══ */}
            {activeTab === 'Overview' && !dataLoading && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="opacity-60" />
                    <p className="font-bold opacity-60 text-sm uppercase tracking-wider">Family Budget — {MONTH_NAMES[month]} {year}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {l:'Total Earn',     c:'text-emerald-300', v:family.earn},
                      {l:'Total Expenses', c:'text-rose-300',    v:family.expenses},
                      {l:'Total Savings',  c:'text-amber-300',   v:family.achievements},
                      {l:'Remaining',      c:family.balance>=0?'text-sky-300':'text-rose-400', v:family.balance},
                    ].map(i=>(
                      <div key={i.l} className="bg-white/10 rounded-xl p-3">
                        <p className="text-xs opacity-60">{i.l}</p>
                        <p className={`text-xl font-black ${i.c}`}>{fmt(i.v)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Member Breakdown</p>
                {userList.map(u => {
                  const s = userStats[u.id] || {}; const style = getStyle(u); const isOpen = expanded[`ov_${u.id}`]
                  return (
                    <div key={u.id} className={`rounded-2xl border ${style.border} ${style.light} overflow-hidden`}>
                      <button onClick={() => toggleExpand(`ov_${u.id}`)} className="w-full flex items-center gap-3 p-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>{u.name[0].toUpperCase()}</div>
                        <div className="flex-1 text-left"><p className="font-black text-gray-800">{u.name}</p><p className="text-xs text-gray-400">Balance: <span className={`font-bold ${(s.balance||0)>=0?'text-green-600':'text-red-500'}`}>{fmt(s.balance||0)}</span></p></div>
                        <div className="text-right mr-2"><p className={`font-black ${style.text}`}>{fmt(s.earn||0)}</p><p className="text-xs text-gray-400">earned</p></div>
                        {isOpen?<ChevronUp size={18} className="text-gray-400"/>:<ChevronDown size={18} className="text-gray-400"/>}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                          {[{l:'Earn',v:s.earn||0,c:'text-green-600'},{l:'Expenses',v:s.expenses||0,c:'text-red-500'},{l:'Savings',v:s.achievements||0,c:'text-amber-600'}].map(i=>(
                            <div key={i.l} className="bg-white rounded-xl p-3 text-center"><p className="text-xs text-gray-400">{i.l}</p><p className={`font-black ${i.c}`}>{fmt(i.v)}</p></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {family.earn > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3"><BarChart3 size={16} className="text-slate-400"/><p className="text-sm font-bold text-gray-600">Earnings Contribution</p></div>
                    {userList.map(u => {
                      const pct = Math.round(((userStats[u.id]?.earn||0)/family.earn)*100); const style=getStyle(u)
                      return (
                        <div key={u.id} className="mb-2">
                          <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-gray-600">{u.name}</span><span className={`font-bold ${style.text}`}>{pct}% — {fmt(userStats[u.id]?.earn||0)}</span></div>
                          <div className="bg-gray-100 rounded-full h-2.5"><div className={`bg-gradient-to-r ${style.gradient} rounded-full h-2.5 transition-all`} style={{width:`${pct}%`}}/></div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ EARNINGS ══ */}
            {activeTab === 'Earnings' && !dataLoading && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2"><TrendingUp size={20} className="text-green-500"/><p className="font-bold text-green-700">Total Family Earnings</p></div>
                  <p className="font-black text-2xl text-green-600">{fmt(family.earn)}</p>
                </div>
                {userList.map(u => {
                  const d=allData[u.id]||{earn:[]}; const style=getStyle(u); const total=userStats[u.id]?.earn||0
                  return (
                    <div key={u.id} className={`rounded-2xl border ${style.border} overflow-hidden`}>
                      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${style.gradient} text-white`}>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">{u.name[0].toUpperCase()}</div>
                        <p className="font-bold flex-1">{u.name}</p><p className="font-black text-lg">{fmt(total)}</p>
                      </div>
                      {d.earn.length===0?<p className="text-center text-gray-300 py-4 text-sm">No earnings recorded</p>:
                        <div className="divide-y divide-gray-50">
                          {d.earn.map(e=>(<div key={e.id} className="flex justify-between items-center px-4 py-3"><div><p className="font-semibold text-gray-800 text-sm">{e.description}</p>{e.isSalary&&<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>Salary</span>}</div><p className="font-black text-green-600">{fmt(e.amount)}</p></div>))}
                          <div className="flex justify-between items-center px-4 py-2 bg-gray-50"><p className="text-xs font-bold text-gray-400 uppercase">Total</p><p className={`font-black ${style.text}`}>{fmt(total)}</p></div>
                        </div>
                      }
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══ EXPENSES ══ */}
            {activeTab === 'Expenses' && !dataLoading && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2"><TrendingDown size={20} className="text-red-500"/><p className="font-bold text-red-700">Total Family Expenses</p></div>
                  <p className="font-black text-2xl text-red-600">{fmt(family.expenses)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {userList.map(u=>{const style=getStyle(u);return(<div key={u.id} className={`rounded-xl border ${style.border} ${style.light} p-3 text-center`}><div className={`w-8 h-8 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-black mx-auto mb-2`}>{u.name[0].toUpperCase()}</div><p className="text-xs text-gray-500 font-medium">{u.name}</p><p className="font-black text-red-600 text-sm">{fmt(userStats[u.id]?.expenses||0)}</p></div>)})}
                </div>
                {userList.map(u=>{
                  const d=allData[u.id]||{expenses:{}}; const style=getStyle(u)
                  const filledDays=Object.entries(d.expenses).filter(([,e])=>Number(e.amount)>0); const isOpen=expanded[`exp_${u.id}`]
                  return(
                    <div key={u.id} className={`rounded-2xl border ${style.border} overflow-hidden`}>
                      <button onClick={()=>toggleExpand(`exp_${u.id}`)} className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${style.gradient} text-white`}>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">{u.name[0].toUpperCase()}</div>
                        <p className="font-bold flex-1 text-left">{u.name}</p>
                        <p className="text-xs opacity-70">{filledDays.length} days</p>
                        <p className="font-black text-lg ml-2">{fmt(userStats[u.id]?.expenses||0)}</p>
                        {isOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
                      </button>
                      {isOpen&&(<div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                        {filledDays.length===0?<p className="text-center text-gray-300 py-4 text-sm">No expenses</p>:
                          filledDays.sort(([a],[b])=>Number(a)-Number(b)).map(([day,e])=>(<div key={day} className="flex justify-between items-center px-4 py-2.5"><div><span className="text-xs font-bold text-gray-400 mr-2">{MONTH_SHORT[month]} {day}</span><span className="text-sm text-gray-600">{e.remark||'—'}</span></div><p className="font-bold text-red-500 text-sm">{fmt(e.amount)}</p></div>))
                        }
                      </div>)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══ SAVINGS ══ */}
            {activeTab === 'Savings' && !dataLoading && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2"><PiggyBank size={20} className="text-amber-500"/><p className="font-bold text-amber-700">Total Family Savings</p></div>
                  <p className="font-black text-2xl text-amber-600">{fmt(family.achievements)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {userList.map(u=>{const style=getStyle(u);return(<div key={u.id} className={`rounded-xl border ${style.border} ${style.light} p-3 text-center`}><div className={`w-8 h-8 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-black mx-auto mb-2`}>{u.name[0].toUpperCase()}</div><p className="text-xs text-gray-500 font-medium">{u.name}</p><p className="font-black text-amber-600 text-sm">{fmt(userStats[u.id]?.achievements||0)}</p></div>)})}
                </div>
                {userList.map(u=>{
                  const d=allData[u.id]||{achievements:[]}; const style=getStyle(u); const isOpen=expanded[`sav_${u.id}`]
                  return(
                    <div key={u.id} className={`rounded-2xl border ${style.border} overflow-hidden`}>
                      <button onClick={()=>toggleExpand(`sav_${u.id}`)} className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${style.gradient} text-white`}>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">{u.name[0].toUpperCase()}</div>
                        <p className="font-bold flex-1 text-left">{u.name}</p><p className="text-xs opacity-70">{d.achievements.length} entries</p><p className="font-black text-lg ml-2">{fmt(userStats[u.id]?.achievements||0)}</p>
                        {isOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
                      </button>
                      {isOpen&&(<div className="divide-y divide-gray-50">
                        {d.achievements.length===0?<p className="text-center text-gray-300 py-4 text-sm">No savings</p>:<>
                          {d.achievements.map(a=>(<div key={a.id} className="flex justify-between items-center px-4 py-2.5"><div><span className="text-xs font-bold text-gray-400 mr-2">{fmtDate(a.date)}</span><span className="text-sm font-semibold text-gray-700">{a.remark||'—'}</span></div><p className="font-black text-amber-600 text-sm">{fmt(a.amount)}</p></div>))}
                          <div className="flex justify-between items-center px-4 py-2 bg-gray-50"><p className="text-xs font-bold text-gray-400 uppercase">Total</p><p className={`font-black ${style.text}`}>{fmt(userStats[u.id]?.achievements||0)}</p></div>
                        </>}
                      </div>)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══ CALCULATE ══ */}
            {activeTab === 'Calculate' && !dataLoading && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Family Budget — {MONTH_NAMES[month]} {year}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {icon:<TrendingUp size={22} className="text-green-500 mx-auto mb-2"/>,l:'Family Earn',v:family.earn,c:'text-green-600',bg:'bg-green-50 border-green-100'},
                    {icon:<TrendingDown size={22} className="text-red-500 mx-auto mb-2"/>,l:'Family Expenses',v:family.expenses,c:'text-red-500',bg:'bg-red-50 border-red-100'},
                    {icon:<PiggyBank size={22} className="text-amber-500 mx-auto mb-2"/>,l:'Family Savings',v:family.achievements,c:'text-amber-600',bg:'bg-amber-50 border-amber-100'},
                    {icon:<Wallet size={22} className="text-indigo-500 mx-auto mb-2"/>,l:'40% Save Target',v:family.target,c:'text-indigo-600',bg:'bg-indigo-50 border-indigo-100',sub:`of ${fmt(family.totalSalary)} salary`},
                  ].map(i=>(
                    <div key={i.l} className={`border rounded-2xl p-4 text-center ${i.bg}`}>{i.icon}<p className="text-xs text-gray-400 font-medium">{i.l}</p><p className={`text-xl font-black ${i.c}`}>{fmt(i.v)}</p>{i.sub&&<p className="text-xs text-gray-300 mt-0.5">{i.sub}</p>}</div>
                  ))}
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-4 py-2"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Per Member Summary</p></div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-50">{['Member','Earn','Expense','Saved','Balance'].map(h=>(<th key={h} className={`px-3 py-2 text-xs text-gray-400 font-semibold ${h==='Member'?'text-left':'text-right'}`}>{h}</th>))}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {userList.map(u=>{const s=userStats[u.id]||{}; const style=getStyle(u);return(
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-black text-xs`}>{u.name[0].toUpperCase()}</div><span className="font-semibold text-gray-800">{u.name}</span></div></td>
                          <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">{fmt(s.earn||0)}</td>
                          <td className="px-3 py-3 text-right font-bold text-red-500 text-xs">{fmt(s.expenses||0)}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-600 text-xs">{fmt(s.achievements||0)}</td>
                          <td className={`px-3 py-3 text-right font-black text-xs ${(s.balance||0)>=0?'text-blue-600':'text-red-500'}`}>{fmt(Math.abs(s.balance||0))}{(s.balance||0)<0?' ⚠':''}</td>
                        </tr>
                      )})}
                    </tbody>
                    <tfoot><tr className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white"><td className="px-4 py-3 font-black text-sm">Family Total</td><td className="px-3 py-3 text-right font-black text-emerald-300 text-xs">{fmt(family.earn)}</td><td className="px-3 py-3 text-right font-black text-rose-300 text-xs">{fmt(family.expenses)}</td><td className="px-3 py-3 text-right font-black text-amber-300 text-xs">{fmt(family.achievements)}</td><td className={`px-3 py-3 text-right font-black text-xs ${family.balance>=0?'text-sky-300':'text-rose-400'}`}>{fmt(Math.abs(family.balance))}{family.balance<0?' ⚠':''}</td></tr></tfoot>
                  </table>
                </div>
                <button onClick={()=>setCalculated(true)} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-indigo-800 flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 transition-all">
                  <Calculator size={22}/> Calculate Family Budget
                </button>
                {calculated && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-2xl p-5 text-white">
                      <p className="text-sm opacity-60 font-medium mb-4 uppercase tracking-wider">{MONTH_NAMES[month]} {year}</p>
                      <div className="space-y-3">
                        {[{dot:'bg-emerald-400',l:'Total Earnings',v:`+${fmt(family.earn)}`,c:'text-emerald-400'},{dot:'bg-rose-400',l:'(-) Total Expenses',v:`-${fmt(family.expenses)}`,c:'text-rose-400'},{dot:'bg-amber-400',l:'(-) Total Savings',v:`-${fmt(family.achievements)}`,c:'text-amber-400'}].map(r=>(
                          <div key={r.l} className="flex justify-between items-center"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${r.dot}`}/><span className="opacity-80 text-sm">{r.l}</span></div><span className={`font-bold ${r.c}`}>{r.v}</span></div>
                        ))}
                        <div className="border-t border-white/10 pt-3 flex justify-between items-center"><span className="font-bold">Family Remaining Balance</span><span className={`font-black text-2xl ${family.balance>=0?'text-emerald-300':'text-rose-400'}`}>{family.balance<0?'-':''}{fmt(Math.abs(family.balance))}</span></div>
                      </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center"><span className="text-gray-600 text-sm">In-hand after expenses (before savings)</span><span className="font-black text-indigo-600 text-xl">{fmt(family.earn-family.expenses)}</span></div>
                    {(()=>{
                      const targetMet=family.achievements>=family.target
                      const pct=family.target>0?Math.min(100,Math.round((family.achievements/family.target)*100)):0
                      return(
                        <div className={`rounded-2xl p-5 text-white ${targetMet?'bg-gradient-to-r from-green-500 to-emerald-600':'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
                          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><PiggyBank size={22}/></div><div><p className="font-black text-xl">Family Picky Bank</p><p className="text-xs opacity-70">Combined savings vault</p></div></div>
                          <div className="space-y-2 mb-3"><div className="flex justify-between"><span className="opacity-80 text-sm">Total Family Saved</span><span className="font-black text-xl">{fmt(family.achievements)}</span></div><div className="flex justify-between"><span className="opacity-80 text-sm">Target (40% of salary)</span><span className="font-bold">{fmt(family.target)}</span></div></div>
                          <div className="bg-white/20 rounded-full h-3 mb-1"><div className="bg-white rounded-full h-3 transition-all duration-700" style={{width:`${pct}%`}}/></div>
                          <p className="text-xs opacity-70 text-right mb-3">{pct}% of target</p>
                          <div className="flex items-center gap-2 bg-white/20 rounded-xl p-3">
                            {targetMet?<><CheckCircle2 size={20}/><div><p className="font-bold">Family Target Achieved!</p><p className="text-xs opacity-80">Saved {fmt(family.achievements-family.target)} extra</p></div></>:<><AlertCircle size={20}/><div><p className="font-bold">Still need to save</p><p className="font-black">{fmt(family.target-family.achievements)} more</p></div></>}
                          </div>
                        </div>
                      )
                    })()}
                    <button onClick={()=>setCalculated(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors">Reset calculation</button>
                  </div>
                )}
              </div>
            )}

            {/* ══ USERS ══ */}
            {activeTab === 'Users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCog size={20} className="text-slate-400"/>
                  <p className="font-black text-gray-700">Family Member Management</p>
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full">{userList.length} members</span>
                </div>

                <div className="space-y-3">
                  {userList.map(user => {
                    const style      = getStyle(user)
                    const isChanging = changingPwd?.id === user.id
                    const isRemoving = removingUser?.id === user.id
                    const success    = pwdSuccess === user.id

                    return (
                      <div key={user.id} className={`rounded-2xl border ${style.border} overflow-hidden`}>
                        <div className={`flex items-center gap-3 px-4 py-3 ${style.light}`}>
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-black text-xl flex-shrink-0`}>{user.name[0].toUpperCase()}</div>
                          <p className="font-black text-gray-800 flex-1 text-lg">{user.name}</p>

                          {success && <span className="flex items-center gap-1 text-green-600 text-xs font-bold mr-1"><CheckCheck size={14}/> Saved!</span>}

                          {!isRemoving && (
                            <button onClick={()=>{setChangingPwd(isChanging?null:user);setNewPwd('');setShowNewPwd(false);setRemovingUser(null)}}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isChanging?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
                              <KeyRound size={13}/>{isChanging?'Cancel':'Change Pwd'}
                            </button>
                          )}

                          {!isChanging && (
                            <button onClick={()=>{setRemovingUser(isRemoving?null:user);setChangingPwd(null)}}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isRemoving?'bg-red-600 text-white':'bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'}`}>
                              <Trash2 size={13}/>{isRemoving?'Cancel':'Remove'}
                            </button>
                          )}
                        </div>

                        {/* Change password */}
                        {isChanging && (
                          <div className="px-4 pb-4 pt-3 bg-indigo-50 border-t border-indigo-100">
                            <p className="text-xs text-indigo-600 font-bold mb-2 flex items-center gap-1"><KeyRound size={12}/> Set new password for {user.name}</p>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input type={showNewPwd?'text':'password'} value={newPwd} onChange={e=>setNewPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChangePassword(user)} placeholder="New password…" className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-indigo-200 focus:border-indigo-400 outline-none text-gray-800 bg-white text-sm" autoFocus/>
                                <button type="button" onClick={()=>setShowNewPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showNewPwd?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                              </div>
                              <button onClick={()=>handleChangePassword(user)} disabled={!newPwd.trim()||pwdSaving} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
                                {pwdSaving?<Loader2 size={14} className="animate-spin"/>:null}{pwdSaving?'Saving…':'Save'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Remove confirmation */}
                        {isRemoving && (
                          <div className="px-4 pb-4 pt-3 bg-red-50 border-t border-red-100">
                            <div className="flex items-start gap-2 mb-3">
                              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0"/>
                              <div>
                                <p className="text-sm font-bold text-red-700">Remove {user.name} from the family?</p>
                                <p className="text-xs text-red-400 mt-0.5">All their earnings, expenses, and savings data will be permanently deleted from the database.</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={()=>setRemovingUser(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-1"><X size={14}/> Cancel</button>
                              <button onClick={()=>handleRemoveUser(user)} disabled={removeLoading===user.id} className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                {removeLoading===user.id?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}
                                {removeLoading===user.id?'Removing…':'Yes, Remove'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add new member */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-black">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><UserPlus size={15}/></div>
                    Add New Family Member
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={addForm.name} onChange={e=>{setAddForm(f=>({...f,name:e.target.value}));setAddError('')}} placeholder="Full name" className="px-3 py-3 rounded-xl border border-indigo-100 focus:border-indigo-400 outline-none text-gray-800 bg-white text-sm"/>
                    <div className="relative">
                      <input type={showAddPwd?'text':'password'} value={addForm.password} onChange={e=>{setAddForm(f=>({...f,password:e.target.value}));setAddError('')}} onKeyDown={e=>e.key==='Enter'&&handleAddUser()} placeholder="Password" className="w-full pl-3 pr-10 py-3 rounded-xl border border-indigo-100 focus:border-indigo-400 outline-none text-gray-800 bg-white text-sm"/>
                      <button type="button" onClick={()=>setShowAddPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showAddPwd?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                    </div>
                  </div>
                  {addError && <p className="text-red-500 text-xs font-medium">{addError}</p>}
                  <button onClick={handleAddUser} disabled={!addForm.name.trim()||!addForm.password||addSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2 text-sm transition-colors">
                    {addSaving?<Loader2 size={16} className="animate-spin"/>:<UserPlus size={16}/>}
                    {addSaving?'Adding…':'Add Member'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
