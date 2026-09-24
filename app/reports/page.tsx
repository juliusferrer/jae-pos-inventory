'use client'
// app/reports/page.tsx
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { orderService } from '@/services/orderService'
import { inventoryService } from '@/services/inventoryService'
import { Order, InventoryItem } from '@/lib/types'
import { fmt, stockStatus, catEmoji } from '@/lib/utils'
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { Download, RefreshCw, FileSpreadsheet, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Period = 'today' | 'week' | 'month' | '3months' | 'custom'
const COLORS = ['#f97316','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#94a3b8']

export default function ReportsPage() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState<Period>('month')
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd]     = useState(format(new Date(), 'yyyy-MM-dd'))

  const getRange = (): [string, string] => {
    const today = new Date()
    if (period === 'today')   return [format(today, 'yyyy-MM-dd'), format(today, 'yyyy-MM-dd')]
    if (period === 'week')    return [format(subDays(today, 6), 'yyyy-MM-dd'), format(today, 'yyyy-MM-dd')]
    if (period === 'month')   return [format(startOfMonth(today), 'yyyy-MM-dd'), format(endOfMonth(today), 'yyyy-MM-dd')]
    if (period === '3months') return [format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd'), format(today, 'yyyy-MM-dd')]
    return [customStart, customEnd]
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [start, end] = getRange()
      const [ords, inv] = await Promise.all([
        orderService.getByRange(start, end),
        inventoryService.getAll(),
      ])
      setOrders(ords); setInventory(inv)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [period, customStart, customEnd])

  const { totalRevenue, totalCost, grossProfit, totalOrders, bestSellers } = orderService.summary(orders)
  const profitMargin  = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0'
  const avgOrderValue = totalOrders  > 0 ? totalRevenue / totalOrders : 0

  const [start, end] = getRange()
  const startD = new Date(start), endD = new Date(end)
  const dayCount = Math.min(Math.ceil((endD.getTime() - startD.getTime()) / 86400000) + 1, 30)

  const dailyData = Array.from({ length: dayCount }, (_, i) => {
    const d    = new Date(startD); d.setDate(startD.getDate() + i)
    const date = format(d, 'yyyy-MM-dd')
    const lbl  = dayCount <= 7 ? format(d, 'EEE') : format(d, 'MMM d')
    const dayO = orders.filter(o => o.date === date && o.status === 'completed')
    return {
      date: lbl,
      revenue: dayO.reduce((s, o) => s + o.total, 0),
      profit:  dayO.reduce((s, o) => s + (o.grossProfit ?? 0), 0),
      orders:  dayO.length,
    }
  })

  const catRev: Record<string, number> = {}
  orders.filter(o => o.status === 'completed').forEach(o => o.items.forEach(i => {
    catRev[i.category] = (catRev[i.category] ?? 0) + i.subtotal
  }))
  const catData = Object.entries(catRev).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const hourMap: Record<number, number> = {}
  orders.filter(o => o.status === 'completed').forEach(o => {
    const hr = parseISO(o.timestamp).getHours()
    hourMap[hr] = (hourMap[hr] ?? 0) + 1
  })
  const hourlyData = Array.from({ length: 14 }, (_, i) => {
    const hr = i + 7
    const lbl = hr > 12 ? `${hr - 12}pm` : hr === 12 ? '12pm' : `${hr}am`
    return { hour: lbl, orders: hourMap[hr] ?? 0 }
  })

  const payMap: Record<string, number> = {}
  orders.filter(o => o.status === 'completed').forEach(o => {
    payMap[o.paymentMethod] = (payMap[o.paymentMethod] ?? 0) + o.total
  })
  const payData = Object.entries(payMap).map(([name, value]) => ({ name, value }))

  const totalStockValue = inventory.reduce((s, i) => s + i.stockQty * i.costPerUnit, 0)
  const lowStockCount   = inventory.filter(i => stockStatus(i) !== 'ok').length

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="card-sm text-xs shadow-lg" style={{ padding: '10px 14px', minWidth: 130 }}>
        <p className="mb-1" style={{ color: 'var(--t3)' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="font-semibold tabular-nums" style={{ color: p.stroke || p.fill }}>
            {p.name}: {p.name === 'revenue' || p.name === 'profit' ? fmt.currency(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const summary = [
      ['SizzlePOS — Sales Report'],
      ['Period:', `${start} to ${end}`],
      ['Generated:', fmt.dateTime(new Date().toISOString())],
      [],
      ['REVENUE SUMMARY'],
      ['Total Revenue', fmt.currency(totalRevenue)],
      ['Total Cost', fmt.currency(totalCost)],
      ['Gross Profit', fmt.currency(grossProfit)],
      ['Profit Margin', `${profitMargin}%`],
      ['Total Orders', totalOrders],
      ['Avg Order Value', fmt.currency(avgOrderValue)],
      [],
      ['TOP SELLERS'],
      ['Item', 'Qty Sold', 'Revenue'],
      ...bestSellers.map(i => [i.name, i.qty, fmt.currency(i.revenue)]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary')

    const daily = [['Date', 'Revenue', 'Profit', 'Orders'], ...dailyData.map(d => [d.date, d.revenue, d.profit, d.orders])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(daily), 'Daily')

    const invRows = inventory.map(i => ({
      Name: i.name, SKU: i.sku, Category: i.category,
      'Stock Qty': i.stockQty, Unit: i.unit,
      'Cost/Unit': i.costPerUnit,
      'Total Value': (i.stockQty * i.costPerUnit).toFixed(2),
      Status: stockStatus(i),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), 'Inventory')

    XLSX.writeFile(wb, `SizzlePOS_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    toast.success('Report exported!')
  }

  const PERIODS = [
    { key: 'today',   label: 'Today' },
    { key: 'week',    label: 'This Week' },
    { key: 'month',   label: 'This Month' },
    { key: '3months', label: '3 Months' },
    { key: 'custom',  label: 'Custom' },
  ] as const

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Reports & Analytics</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Business performance overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="btn-ghost btn-sm p-2">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => window.print()} className="btn-ghost btn-sm flex items-center gap-1.5">
              <Printer size={13} /> Print
            </button>
            <button onClick={exportExcel} className="btn-ghost btn-sm flex items-center gap-1.5">
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="card-pad flex flex-wrap items-center gap-4">
          <div className="flex rounded-xl p-1 gap-1 border" style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: period === p.key ? 'var(--acc)' : 'transparent', color: period === p.key ? '#fff' : 'var(--t3)' }}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input input-sm w-36" />
              <span style={{ color: 'var(--t3)' }}>—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input input-sm w-36" />
            </div>
          )}
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Period: {start} → {end}</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Revenue',  value: fmt.currency(totalRevenue), color: 'var(--acc)' },
            { label: 'Gross Profit',   value: fmt.currency(grossProfit),  color: '#10b981' },
            { label: 'Total Orders',   value: totalOrders.toString(),      color: '#3b82f6' },
            { label: 'Avg Order Val',  value: fmt.currency(avgOrderValue), color: '#8b5cf6' },
            { label: 'Profit Margin',  value: `${profitMargin}%`,          color: '#f59e0b' },
          ].map(kpi => (
            <div key={kpi.label} className="card-pad">
              <p className="label">{kpi.label}</p>
              <p className="display font-bold text-xl tabular-nums mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue + Profit trend */}
        <div className="card-pad">
          <div className="flex items-center justify-between mb-5">
            <p className="card-title">Revenue & Profit Trend</p>
            <span className="badge-acc capitalize">{period} view</span>
          </div>
          {loading ? <div className="h-52 flex items-center justify-center" style={{ color: 'var(--t3)' }}>Loading…</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.1)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--t3)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#rg)" dot={false} name="revenue" />
                <Area type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} fill="url(#pg)" dot={false} name="profit" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category + Hourly */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-pad">
            <p className="card-title mb-4">Revenue by Category</p>
            {loading || catData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--t3)' }}>
                {loading ? 'Loading…' : 'No data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [fmt.currency(Number(v)), 'Revenue']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--t3)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card-pad">
            <p className="card-title mb-4">Orders by Hour</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--t3)' }}>Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,.1)" />
                  <XAxis dataKey="hour" tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top sellers */}
        <div className="card-pad">
          <p className="card-title mb-4">Top Selling Items — Revenue Share</p>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading…</div>
          ) : bestSellers.length === 0 ? (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--t3)' }}>No sales data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Item</th><th>Qty Sold</th><th>Revenue</th><th>Share</th></tr>
                </thead>
                <tbody>
                  {bestSellers.map((item, i) => {
                    const share = totalRevenue > 0 ? (item.revenue / totalRevenue * 100) : 0
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                            style={{ background: i === 0 ? 'rgba(251,191,36,.15)' : 'var(--bg-sub)', color: i === 0 ? '#fbbf24' : 'var(--t3)', border: '1px solid var(--border)' }}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</td>
                        <td className="tabular-nums" style={{ color: 'var(--t3)' }}>{item.qty}</td>
                        <td className="mono font-semibold" style={{ color: 'var(--acc)' }}>{fmt.currency(item.revenue)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-sub)', minWidth: 60 }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(share * 3, 100)}%`, background: 'var(--acc)' }} />
                            </div>
                            <span className="text-xs tabular-nums" style={{ color: 'var(--t3)', minWidth: 36 }}>
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment method breakdown */}
        {payData.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="card-pad">
              <p className="card-title mb-4">Payment Method Breakdown</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={payData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {payData.map((_, i) => <Cell key={i} fill={['#10b981','#3b82f6','#8b5cf6','#f59e0b'][i % 4]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [fmt.currency(Number(v)), 'Revenue']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {payData.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: ['#10b981','#3b82f6','#8b5cf6','#f59e0b'][i % 4] }} />
                      <span style={{ color: 'var(--t3)' }}>{p.name}</span>
                    </div>
                    <span className="mono font-semibold" style={{ color: 'var(--text)' }}>{fmt.currency(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock valuation snapshot */}
            <div className="card-pad">
              <div className="flex items-center justify-between mb-4">
                <p className="card-title">Stock Valuation Snapshot</p>
                <div className="text-right">
                  <p className="label">Total Value</p>
                  <p className="display font-bold text-lg" style={{ color: '#10b981' }}>{fmt.currency(totalStockValue)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {inventory.sort((a, b) => (b.stockQty * b.costPerUnit) - (a.stockQty * a.costPerUnit)).slice(0, 6).map(item => {
                  const val   = item.stockQty * item.costPerUnit
                  const share = totalStockValue > 0 ? (val / totalStockValue * 100) : 0
                  const st    = stockStatus(item)
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-base">{catEmoji(item.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</span>
                          <span className="mono font-semibold flex-shrink-0 ml-2" style={{ color: st === 'critical' || st === 'empty' ? '#ef4444' : 'var(--text)' }}>
                            {item.stockQty} {item.unit}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-sub)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(share * 4, 100)}%`, background: st === 'critical' || st === 'empty' ? '#ef4444' : 'var(--acc)' }} />
                        </div>
                      </div>
                      <span className="mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--t3)', minWidth: 60, textAlign: 'right' }}>
                        {fmt.currency(val)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {lowStockCount > 0 && (
                <div className="mt-3 p-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5' }}>
                  ⚠ {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below minimum threshold
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory usage report */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="card-title">Full Stock Valuation Report</p>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="label">Total Inventory Value</p>
                <p className="display font-bold text-xl" style={{ color: '#10b981' }}>{fmt.currency(totalStockValue)}</p>
              </div>
              <div className="text-right">
                <p className="label">Low Stock Items</p>
                <p className="display font-bold text-xl" style={{ color: '#ef4444' }}>{lowStockCount}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Stock</th><th>Unit</th>
                  <th>Cost/Unit</th><th>Total Value</th><th>% of Total</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory
                  .sort((a, b) => (b.stockQty * b.costPerUnit) - (a.stockQty * a.costPerUnit))
                  .map(item => {
                    const value  = item.stockQty * item.costPerUnit
                    const share  = totalStockValue > 0 ? (value / totalStockValue * 100) : 0
                    const st     = stockStatus(item)
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{catEmoji(item.category)}</span>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.name}</p>
                              <p className="mono text-[10px]" style={{ color: 'var(--t4)' }}>{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs">{item.category}</td>
                        <td>
                          <span className={clsx('font-bold tabular-nums',
                            st === 'critical' || st === 'empty' ? 'text-red-500' : st === 'low' ? 'text-amber-500' : 'text-emerald-500')}>
                            {item.stockQty}
                          </span>
                        </td>
                        <td className="mono text-xs">{item.unit}</td>
                        <td className="mono text-xs">{fmt.currency(item.costPerUnit)}</td>
                        <td className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>{fmt.currency(value)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-sub)', minWidth: 50 }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(share * 3, 100)}%`, background: 'var(--acc)' }} />
                            </div>
                            <span className="text-xs tabular-nums" style={{ color: 'var(--t3)', minWidth: 30 }}>
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={clsx('badge text-[10px]',
                            st === 'ok' ? 'badge-ok' : st === 'low' ? 'badge-low' : 'badge-crit')}>
                            {st === 'ok' ? '✓ OK' : st === 'low' ? '⚠ Low' : '✕ Critical'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                {inventory.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--t3)' }}>No inventory data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
