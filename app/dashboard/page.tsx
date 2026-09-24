'use client'
// app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { orderService } from '@/services/orderService'
import { inventoryService } from '@/services/inventoryService'
import { Order, InventoryItem } from '@/lib/types'
import { fmt, stockStatus, catEmoji } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, ShoppingBag, DollarSign, AlertTriangle, Award, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const COLORS = ['#f97316','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6']

function StatCard({ label, value, sub, icon:Icon, color }:any) {
  return (
    <div className="stat-card" style={{ borderLeft:`3px solid ${color}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="label mt-1">{label}</p>
      <p className="display font-bold text-2xl mt-1 tabular-nums" style={{ color:'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color:'var(--t3)' }}>{sub}</p>}
    </div>
  )
}

const Tip = ({ active, payload, label }:any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card-sm text-xs shadow-lg" style={{ padding:'10px 14px', minWidth:120 }}>
      <p className="mb-1" style={{ color:'var(--t3)' }}>{label}</p>
      {payload.map((p:any) => (
        <p key={p.name} className="font-semibold tabular-nums" style={{ color:p.stroke||p.fill }}>
          {p.name==='revenue'||p.name==='profit' ? fmt.currency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [inv, setInv]         = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<'7'|'14'|'30'>('7')

  const fetchData = async () => {
    setLoading(true)
    try {
      const days  = parseInt(period)
      const start = format(subDays(new Date(), days), 'yyyy-MM-dd')
      const end   = format(new Date(), 'yyyy-MM-dd')
      const [ords, items] = await Promise.all([orderService.getByRange(start, end), inventoryService.getAll()])
      setOrders(ords); setInv(items)
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [period])

  const { totalRevenue, grossProfit, totalOrders, bestSellers } = orderService.summary(orders)
  const lowStock  = inv.filter(i => stockStatus(i) !== 'ok')
  const today     = format(new Date(), 'yyyy-MM-dd')
  const todayOrds = orders.filter(o => o.date===today && o.status==='completed')
  const todayRev  = todayOrds.reduce((s,o)=>s+o.total,0)

  const days = parseInt(period)
  const dailyData = Array.from({ length:Math.min(days,14) }, (_,i) => {
    const d = subDays(new Date(), Math.min(days,14)-1-i)
    const date = format(d,'yyyy-MM-dd')
    const dayOrds = orders.filter(o=>o.date===date && o.status==='completed')
    return {
      date: format(d, days<=7?'EEE':'MMM d'),
      revenue: dayOrds.reduce((s,o)=>s+o.total,0),
      profit:  dayOrds.reduce((s,o)=>s+(o.grossProfit??0),0),
      orders:  dayOrds.length,
    }
  })

  const catRev: Record<string,number> = {}
  orders.filter(o=>o.status==='completed').forEach(o=>o.items.forEach(i=>{ catRev[i.category]=(catRev[i.category]??0)+i.subtotal }))
  const catData = Object.entries(catRev).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Dashboard</h2>
            <p className="text-sm mt-0.5" style={{ color:'var(--t3)' }}>{format(new Date(),'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl p-1 gap-1 border" style={{ background:'var(--bg-sub)', borderColor:'var(--border)' }}>
              {(['7','14','30'] as const).map(p => (
                <button key={p} onClick={()=>setPeriod(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background:period===p?'var(--acc)':'transparent', color:period===p?'#fff':'var(--t3)' }}>
                  {p}d
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="btn-ghost btn-sm p-2"><RefreshCw size={13} className={loading?'animate-spin':''} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Revenue"  value={fmt.currency(todayRev)}    sub={`${todayOrds.length} orders`}         icon={DollarSign}  color="#f97316" />
          <StatCard label={`${period}d Revenue`} value={fmt.currency(totalRevenue)} sub={`${totalOrders} orders`}         icon={TrendingUp}   color="#3b82f6" />
          <StatCard label={`${period}d Profit`}  value={fmt.currency(grossProfit)}  sub={totalRevenue>0?`${((grossProfit/totalRevenue)*100).toFixed(1)}% margin`:''} icon={Award} color="#10b981" />
          <StatCard label="Low Stock Items"  value={lowStock.length.toString()} sub="Needs attention"                     icon={AlertTriangle} color="#ef4444" />
        </div>

        {lowStock.length > 0 && (
          <div className="alert-crit">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold">Stock Alert — {lowStock.length} item{lowStock.length>1?'s':''} need restocking</p>
              <p className="text-xs mt-0.5 opacity-80">{lowStock.slice(0,4).map(i=>`${i.name} (${i.stockQty} ${i.unit})`).join(' · ')}{lowStock.length>4&&` +${lowStock.length-4} more`}</p>
            </div>
            <Link href="/inventory" className="ml-auto btn btn-sm bg-red-500 text-white border-red-600 text-xs flex-shrink-0">View →</Link>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="card-pad col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="card-title">Revenue & Profit Trend</p>
              <span className="badge-acc">{period}-day</span>
            </div>
            {loading ? <div className="h-48 flex items-center justify-center text-sm" style={{ color:'var(--t3)' }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.1)" />
                  <XAxis dataKey="date" tick={{ fill:'var(--t3)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'var(--t3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#rg)" dot={false} name="revenue" />
                  <Area type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} fill="url(#pg)" dot={false} name="profit" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card-pad">
            <p className="card-title mb-4">By Category</p>
            {loading || catData.length===0 ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color:'var(--t3)' }}>{loading?'Loading…':'No data'}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={3}>
                      {catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any)=>[fmt.currency(Number(v)),'Revenue']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-md)', borderRadius:10, fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {catData.slice(0,5).map((c,i)=>(
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background:COLORS[i] }} />
                        <span style={{ color:'var(--t3)' }}>{c.name}</span>
                      </div>
                      <span className="tabular-nums font-semibold" style={{ color:'var(--text)' }}>{fmt.currency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card-pad col-span-2">
            <p className="card-title mb-4">Orders Per Day</p>
            {loading ? <div className="h-40 flex items-center justify-center text-sm" style={{ color:'var(--t3)' }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyData} barSize={parseInt(period)>14?10:18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.1)" />
                  <XAxis dataKey="date" tick={{ fill:'var(--t3)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'var(--t3)', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="orders" fill="#f97316" radius={[4,4,0,0]} name="orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card-pad">
            <div className="flex items-center gap-2 mb-4"><Award size={15} style={{ color:'#fbbf24' }} /><p className="card-title">Best Sellers</p></div>
            {loading ? <div className="text-sm" style={{ color:'var(--t3)' }}>Loading…</div>
              : bestSellers.length===0 ? <div className="text-sm" style={{ color:'var(--t3)' }}>No data yet</div>
              : (
                <div className="space-y-3">
                  {bestSellers.slice(0,6).map((item,i)=>(
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background:i===0?'rgba(251,191,36,.15)':'var(--bg-sub)', color:i===0?'#fbbf24':'var(--t3)', border:'1px solid', borderColor:i===0?'rgba(251,191,36,.3)':'var(--border)' }}>
                        {i+1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color:'var(--text)' }}>{item.name}</p>
                        <p className="text-[10px]" style={{ color:'var(--t3)' }}>{item.qty} sold</p>
                      </div>
                      <p className="text-xs font-bold tabular-nums" style={{ color:'var(--acc)' }}>{fmt.currency(item.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
