'use client'
// app/sales/page.tsx
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { orderService } from '@/services/orderService'
import { useAuth } from '@/components/AuthProvider'
import { Order, PaymentMethod } from '@/lib/types'
import { fmt, orderBadge } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { Search, Calendar, Eye, XCircle, Download, TrendingUp, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PAY_BADGE: Record<PaymentMethod, string> = {
  Cash:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
  GCash: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
  Card:  'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20',
  Maya:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20',
}

export default function SalesPage() {
  const { user } = useAuth()
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatus] = useState<'all'|'completed'|'cancelled'|'refunded'>('all')
  const [payFilter, setPay]     = useState<PaymentMethod|'all'>('all')
  const [startDate, setStartDate] = useState(format(subDays(new Date(),30),'yyyy-MM-dd'))
  const [endDate, setEndDate]   = useState(format(new Date(),'yyyy-MM-dd'))
  const [detailOrder, setDetailOrder] = useState<Order|null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order|null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try { setOrders(await orderService.getByRange(startDate, endDate)) }
    catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [startDate, endDate])

  const filtered = orders.filter(o => {
    const ms = o.orderNumber.toLowerCase().includes(search.toLowerCase())
      || o.cashierName.toLowerCase().includes(search.toLowerCase())
      || o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
    const ss = statusFilter === 'all' || o.status === statusFilter
    const ps = payFilter === 'all' || o.paymentMethod === payFilter
    return ms && ss && ps
  })

  const completed   = filtered.filter(o => o.status === 'completed')
  const totalRev    = completed.reduce((s, o) => s + o.total, 0)
  const totalProfit = completed.reduce((s, o) => s + (o.grossProfit ?? 0), 0)
  const cancelled   = filtered.filter(o => o.status !== 'completed').length

  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) { toast.error('Provide a reason'); return }
    setActionLoading(true)
    try {
      await orderService.cancel(cancelTarget.id, cancelReason, user!.uid)
      toast.success('Order cancelled. Stock reversed.')
      setCancelTarget(null); setCancelReason(''); fetchOrders()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setActionLoading(false) }
  }

  const exportExcel = () => {
    const rows = filtered.map(o => ({
      'Order #': o.orderNumber, Date: fmt.date(o.timestamp), Time: fmt.time(o.timestamp),
      Items: o.items.map(i => `${i.name} ×${i.quantity}`).join(', '),
      Total: o.total, Cost: o.costTotal ?? 0, Profit: o.grossProfit ?? 0,
      Payment: o.paymentMethod, Status: o.status, Cashier: o.cashierName,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sales')
    XLSX.writeFile(wb, `SizzlePOS_Sales_${startDate}_to_${endDate}.xlsx`)
    toast.success('Exported!')
  }

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Sales Records</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>{filtered.length} transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="btn-ghost btn-sm flex items-center gap-1.5"><Download size={13} /> Export</button>
            <button onClick={fetchOrders} className="btn-ghost btn-sm p-2"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: fmt.currency(totalRev),    color: 'var(--acc)', icon: TrendingUp },
            { label: 'Gross Profit',  value: fmt.currency(totalProfit), color: '#10b981',    icon: TrendingUp },
            { label: 'Completed',     value: completed.length.toString(), color: '#3b82f6',  icon: ShoppingBag },
            { label: 'Cancelled',     value: cancelled.toString(),      color: '#ef4444',    icon: AlertCircle },
          ].map(s => (
            <div key={s.label} className="card-pad flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="label">{s.label}</p>
                <p className="display font-bold text-xl tabular-nums mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card-pad flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search order #, item, cashier…" className="input input-sm pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={13} style={{ color: 'var(--t3)' }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input input-sm w-36" />
            <span style={{ color: 'var(--t3)' }}>—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input input-sm w-36" />
          </div>
          <div className="flex rounded-xl p-1 gap-1 border" style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
            {(['all', 'completed', 'cancelled', 'refunded'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{ background: statusFilter === s ? 'var(--acc)' : 'transparent', color: statusFilter === s ? '#fff' : 'var(--t3)' }}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <select value={payFilter} onChange={e => setPay(e.target.value as any)} className="input input-sm w-32">
            <option value="all">All Payments</option>
            {(['Cash', 'GCash', 'Card', 'Maya'] as const).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th><th>Date & Time</th><th>Items</th><th>Total</th>
                  <th>Profit</th><th>Payment</th><th>Status</th><th>Cashier</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton h-4 my-1" /></td></tr>)
                  : filtered.length === 0
                  ? <tr><td colSpan={9} className="text-center py-16" style={{ color: 'var(--t3)' }}>No transactions found</td></tr>
                  : filtered.map(order => (
                    <tr key={order.id}>
                      <td><span className="mono text-xs font-semibold" style={{ color: 'var(--acc)' }}>{order.orderNumber}</span></td>
                      <td>
                        <p className="text-sm">{fmt.date(order.timestamp)}</p>
                        <p className="mono text-[11px]" style={{ color: 'var(--t3)' }}>{fmt.time(order.timestamp)}</p>
                      </td>
                      <td>
                        <p className="text-sm" style={{ color: 'var(--text)' }}>
                          {order.items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </p>
                        {order.items.length > 2 && <p className="text-xs" style={{ color: 'var(--t3)' }}>+{order.items.length - 2} more</p>}
                      </td>
                      <td><span className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>{fmt.currency(order.total)}</span></td>
                      <td>
                        <span className={clsx('mono text-xs font-semibold', (order.grossProfit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-400')}>
                          {fmt.currency(order.grossProfit ?? 0)}
                        </span>
                      </td>
                      <td><span className={clsx('badge text-[10px]', PAY_BADGE[order.paymentMethod])}>{order.paymentMethod}</span></td>
                      <td><span className={orderBadge(order.status)}>{order.status}</span></td>
                      <td className="text-xs" style={{ color: 'var(--t3)' }}>{order.cashierName}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailOrder(order)} className="btn-ghost p-1.5 rounded-lg btn-sm"><Eye size={13} /></button>
                          {order.status === 'completed' && (
                            <button onClick={() => { setCancelTarget(order); setCancelReason('') }}
                              className="btn-ghost p-1.5 rounded-lg btn-sm text-red-400 hover:text-red-600">
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title="Order Details" size="md">
        {detailOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl border"
              style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
              <div>
                <p className="mono font-bold" style={{ color: 'var(--acc)' }}>{detailOrder.orderNumber}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{fmt.dateTime(detailOrder.timestamp)}</p>
              </div>
              <span className={orderBadge(detailOrder.status)}>{detailOrder.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ['Payment',  detailOrder.paymentMethod],
                ['Cashier',  detailOrder.cashierName],
                ['Stock',    detailOrder.stockDeducted ? 'Deducted ✓' : 'Not deducted'],
              ].map(([l, v]) => (
                <div key={l} className="p-3 rounded-xl border" style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
                  <p className="label mb-1">{l}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="label mb-3">Items Ordered</p>
              <div className="space-y-2">
                {detailOrder.items.map(item => (
                  <div key={item.menuItemId} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'var(--t3)' }}>{item.category} · {fmt.currency(item.price)} each · Cost: {fmt.currency(item.costPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold mono" style={{ color: 'var(--acc)' }}>×{item.quantity}</p>
                      <p className="text-xs mono" style={{ color: 'var(--text)' }}>{fmt.currency(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--t3)' }}>Cost Total</span>
                <span className="mono" style={{ color: 'var(--t3)' }}>{fmt.currency(detailOrder.costTotal ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--t3)' }}>Gross Profit</span>
                <span className="mono font-semibold text-emerald-500">{fmt.currency(detailOrder.grossProfit ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--text)' }}>Total</span>
                <span className="mono" style={{ color: 'var(--acc)' }}>{fmt.currency(detailOrder.total)}</span>
              </div>
              {detailOrder.paymentMethod === 'Cash' && detailOrder.cashReceived != null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--t3)' }}>Cash Received</span>
                    <span className="mono">{fmt.currency(detailOrder.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-emerald-500">
                    <span>Change</span>
                    <span className="mono">{fmt.currency(detailOrder.change ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            {detailOrder.cancelReason && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <p className="label text-red-500 mb-1">Cancel Reason</p>
                <p className="text-sm text-red-700 dark:text-red-400">{detailOrder.cancelReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Order" size="sm"
        footer={<>
          <button onClick={() => setCancelTarget(null)} className="btn-ghost">Go Back</button>
          <button onClick={handleCancel} disabled={actionLoading} className="btn-red">
            {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Cancel Order
          </button>
        </>}>
        {cancelTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-sub)', borderColor: 'var(--border)' }}>
              <p className="mono text-sm font-bold" style={{ color: 'var(--acc)' }}>{cancelTarget.orderNumber}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>
                Total: {fmt.currency(cancelTarget.total)} · {cancelTarget.paymentMethod}
              </p>
            </div>
            {cancelTarget.stockDeducted && (
              <div className="alert-info text-xs">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-blue-500" />
                Stock deduction will be automatically reversed for all recipe-linked ingredients.
              </div>
            )}
            <div>
              <label className="label block mb-1.5">Reason for Cancellation *</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Provide a clear reason…" className="input h-24" autoFocus />
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
