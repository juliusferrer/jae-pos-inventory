'use client'
// app/inventory/page.tsx
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { inventoryService } from '@/services/inventoryService'
import { useAuth } from '@/components/AuthProvider'
import { InventoryItem, InventoryLog, InvCategory, StockUnit, INV_CATS, STOCK_UNITS } from '@/lib/types'
import { fmt, stockStatus, stockBadge, catEmoji } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, History, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY = { name:'', sku:'', category:'Dry Goods' as InvCategory, stockQty:'', minThreshold:'', unit:'pcs' as StockUnit, costPerUnit:'', supplier:'', description:'', barcode:'' }

export default function InventoryPage() {
  const { user } = useAuth()
  const [items, setItems]     = useState<InventoryItem[]>([])
  const [logs, setLogs]       = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState<InvCategory|'All'>('All')
  const [showLow, setShowLow] = useState(false)
  const [activeTab, setActiveTab] = useState<'items'|'logs'>('items')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem|null>(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [delTarget, setDelTarget] = useState<InventoryItem|null>(null)
  const [stockModal, setStockModal] = useState<{item:InventoryItem;type:'in'|'out'}|null>(null)
  const [stockQty, setStockQty]   = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [logsModal, setLogsModal] = useState<InventoryItem|null>(null)
  const [itemLogs, setItemLogs]   = useState<InventoryLog[]>([])

  const fetchItems = async () => {
    setLoading(true)
    try { setItems(await inventoryService.getAll()) }
    finally { setLoading(false) }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try { setLogs(await inventoryService.getLogs(100)) }
    finally { setLogsLoading(false) }
  }

  useEffect(() => { fetchItems() }, [])
  useEffect(() => { if (activeTab==='logs') fetchLogs() }, [activeTab])

  const filtered = items.filter(i => {
    const ms = i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()) || i.supplier.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter==='All' || i.category===catFilter
    const ml = !showLow || stockStatus(i)!=='ok'
    return ms && mc && ml
  })

  const lowCount   = items.filter(i=>stockStatus(i)!=='ok').length
  const totalValue = items.reduce((s,i)=>s+i.stockQty*i.costPerUnit,0)

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit   = (item: InventoryItem) => {
    setEditing(item)
    setForm({ name:item.name, sku:item.sku, category:item.category, stockQty:item.stockQty.toString(),
      minThreshold:item.minThreshold.toString(), unit:item.unit, costPerUnit:item.costPerUnit.toString(),
      supplier:item.supplier, description:item.description??'', barcode:item.barcode??'' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name||!form.sku||!form.stockQty) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      const data = { name:form.name.trim(), sku:form.sku.trim().toUpperCase(), category:form.category,
        stockQty:parseFloat(form.stockQty), minThreshold:parseFloat(form.minThreshold||'0'),
        unit:form.unit, costPerUnit:parseFloat(form.costPerUnit||'0'),
        supplier:form.supplier.trim(), description:form.description.trim(), barcode:form.barcode.trim() }
      if (editing) { await inventoryService.update(editing.id, data); toast.success('Updated!') }
      else { await inventoryService.create(data); toast.success('Item added!') }
      setModalOpen(false); fetchItems()
    } catch(e:any) { toast.error(e.message??'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try { await inventoryService.delete(delTarget.id); toast.success('Deleted'); setDelTarget(null); fetchItems() }
    catch { toast.error('Delete failed') }
  }

  const handleStockAdjust = async () => {
    if (!stockModal||!stockQty||parseFloat(stockQty)<=0) { toast.error('Enter valid quantity'); return }
    try {
      const qty = parseFloat(stockQty)
      if (stockModal.type==='in') { await inventoryService.stockIn(stockModal.item.id, qty, stockNotes||'Manual stock in', user!.uid); toast.success(`+${qty} ${stockModal.item.unit} added`) }
      else { await inventoryService.stockOut(stockModal.item.id, qty, stockNotes||'Manual stock out', user!.uid); toast.success(`-${qty} ${stockModal.item.unit} deducted`) }
      setStockModal(null); setStockQty(''); setStockNotes(''); fetchItems()
    } catch(e:any) { toast.error(e.message??'Failed') }
  }

  const openItemLogs = async (item: InventoryItem) => {
    setLogsModal(item)
    const logs = await inventoryService.getLogsByItem(item.id)
    setItemLogs(logs)
  }

  const exportExcel = () => {
    const rows = filtered.map(i=>({ Name:i.name, SKU:i.sku, Category:i.category, 'Stock':i.stockQty, Unit:i.unit, 'Min':i.minThreshold, 'Cost/Unit':i.costPerUnit, 'Total Value':(i.stockQty*i.costPerUnit).toFixed(2), Supplier:i.supplier, Status:stockStatus(i) }))
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Inventory')
    XLSX.writeFile(wb,`SizzlePOS_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Exported!')
  }

  const F = (k:keyof typeof EMPTY) => (e:any) => setForm(p=>({...p,[k]:e.target.value}))

  const LOG_CLR: Record<string,string> = { stock_in:'text-emerald-500', stock_out:'text-amber-500', sale_deduction:'text-red-400', refund_reversal:'text-blue-400', adjustment:'text-purple-400' }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Inventory</h2>
            <p className="text-sm mt-0.5" style={{ color:'var(--t3)' }}>
              {items.length} items · Total value: <span className="font-semibold" style={{ color:'var(--acc)' }}>{fmt.currency(totalValue)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="btn-ghost btn-sm flex items-center gap-1.5"><Download size={13} /> Export</button>
            <button onClick={openCreate} className="btn-sizzle btn-sm flex items-center gap-1.5"><Plus size={13} /> Add Item</button>
          </div>
        </div>

        {lowCount>0&&(
          <div className="alert-crit">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold">{lowCount} item{lowCount>1?'s':''} at or below minimum threshold</p>
              <p className="text-xs mt-0.5 opacity-80">{items.filter(i=>stockStatus(i)!=='ok').slice(0,4).map(i=>`${i.name} (${i.stockQty} ${i.unit})`).join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor:'var(--border)' }}>
          {(['items','logs'] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className={clsx('px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all capitalize', activeTab===tab?'border-sizzle-500':'border-transparent')}
              style={{ color:activeTab===tab?'var(--acc)':'var(--t3)' }}>
              {tab==='items'?`Stock Items (${items.length})`:'Movement History'}
            </button>
          ))}
        </div>

        {activeTab==='items'&&(
          <>
            <div className="card-pad flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, SKU, supplier…" className="input input-sm pl-10" />
              </div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value as any)} className="input input-sm w-40">
                <option value="All">All Categories</option>
                {INV_CATS.map(c=><option key={c} value={c}>{catEmoji(c)} {c}</option>)}
              </select>
              <button onClick={()=>setShowLow(p=>!p)} className={clsx('btn btn-sm',showLow?'btn-sizzle':'btn-ghost')}>
                <AlertTriangle size={12} /> {showLow?'Low Stock':'All Stock'}
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Stock</th><th>Min</th><th>Unit</th><th>Cost/Unit</th><th>Total Value</th><th>Supplier</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loading ? Array.from({length:6}).map((_,i)=><tr key={i}><td colSpan={11}><div className="skeleton h-4 my-1" /></td></tr>)
                      : filtered.length===0 ? <tr><td colSpan={11} className="text-center py-12" style={{ color:'var(--t3)' }}>No items</td></tr>
                      : filtered.map(item=>{
                        const st = stockStatus(item)
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{catEmoji(item.category)}</span>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{item.name}</p>
                                  {item.barcode&&<p className="mono text-[10px]" style={{ color:'var(--t4)' }}>{item.barcode}</p>}
                                </div>
                              </div>
                            </td>
                            <td><span className="mono text-xs">{item.sku}</span></td>
                            <td><span className="text-xs">{item.category}</span></td>
                            <td><span className={clsx('font-bold tabular-nums text-sm', st==='critical'||st==='empty'?'text-red-500':st==='low'?'text-amber-500':'text-emerald-500')}>{item.stockQty}</span></td>
                            <td className="tabular-nums text-sm">{item.minThreshold}</td>
                            <td><span className="mono text-xs">{item.unit}</span></td>
                            <td><span className="mono text-xs">{fmt.currency(item.costPerUnit)}</span></td>
                            <td><span className="mono text-xs font-semibold" style={{ color:'var(--text)' }}>{fmt.currency(item.stockQty*item.costPerUnit)}</span></td>
                            <td><span className="text-xs" style={{ color:'var(--t3)' }}>{item.supplier||'—'}</span></td>
                            <td><span className={stockBadge(st)}>{st==='ok'?'✓ OK':st==='low'?'⚠ Low':'✕ Critical'}</span></td>
                            <td>
                              <div className="flex items-center gap-1">
                                <button onClick={()=>setStockModal({item,type:'in'})} className="btn btn-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20" title="Stock In"><ArrowDownToLine size={12} /></button>
                                <button onClick={()=>setStockModal({item,type:'out'})} className="btn btn-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20" title="Stock Out"><ArrowUpFromLine size={12} /></button>
                                <button onClick={()=>openItemLogs(item)} className="btn-ghost p-1.5 rounded-lg btn-sm" title="History"><History size={13} /></button>
                                <button onClick={()=>openEdit(item)} className="btn-ghost p-1.5 rounded-lg btn-sm"><Pencil size={13} /></button>
                                <button onClick={()=>setDelTarget(item)} className="btn-ghost p-1.5 rounded-lg btn-sm text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab==='logs'&&(
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor:'var(--border)' }}>
              <p className="card-title text-sm">All Inventory Movements</p>
              <button onClick={fetchLogs} className="btn-ghost p-1.5 rounded-lg btn-sm"><RefreshCw size={13} className={logsLoading?'animate-spin':''} /></button>
            </div>
            {logsLoading ? <div className="p-8 text-center" style={{ color:'var(--t3)' }}>Loading…</div>
              : logs.length===0 ? <div className="p-12 text-center"><History size={28} className="mx-auto mb-3 opacity-20" /><p className="text-sm" style={{ color:'var(--t3)' }}>No logs yet</p></div>
              : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Time</th><th>Item</th><th>Type</th><th>Change</th><th>Before</th><th>After</th><th>Ref</th></tr></thead>
                    <tbody>
                      {logs.map(log=>(
                        <tr key={log.id}>
                          <td className="mono text-xs">{fmt.time(log.createdAt)}<br /><span style={{ color:'var(--t3)' }}>{fmt.date(log.createdAt)}</span></td>
                          <td className="font-medium" style={{ color:'var(--text)' }}>{log.inventoryItemName}</td>
                          <td><span className={clsx('badge text-[10px]', log.type==='stock_in'||log.type==='refund_reversal'?'badge-done':log.type==='sale_deduction'?'badge-canc':'badge-pend')}>{log.type.replace(/_/g,' ')}</span></td>
                          <td className={clsx('mono font-bold text-sm',log.quantity>0?'text-emerald-500':'text-red-400')}>{log.quantity>0?'+':''}{log.quantity}</td>
                          <td className="mono text-xs">{log.balanceBefore}</td>
                          <td className="mono text-xs font-semibold" style={{ color:'var(--text)' }}>{log.balanceAfter}</td>
                          <td className="mono text-xs" style={{ color:'var(--t3)' }}>{log.reference??'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Item':'Add Inventory Item'} size="lg"
        footer={<><button onClick={()=>setModalOpen(false)} className="btn-ghost">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-sizzle">{saving&&<span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{editing?'Save Changes':'Add Item'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label block mb-1">Name *</label><input value={form.name} onChange={F('name')} placeholder="Chicken Breast" className="input" /></div>
          <div><label className="label block mb-1">SKU *</label><input value={form.sku} onChange={F('sku')} placeholder="CHK-001" className="input mono" /></div>
          <div><label className="label block mb-1">Category</label><select value={form.category} onChange={F('category')} className="input">{INV_CATS.map(c=><option key={c} value={c}>{catEmoji(c)} {c}</option>)}</select></div>
          <div><label className="label block mb-1">Unit</label><select value={form.unit} onChange={F('unit')} className="input">{STOCK_UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
          <div><label className="label block mb-1">Stock Qty *</label><input type="number" min="0" step="0.01" value={form.stockQty} onChange={F('stockQty')} placeholder="0" className="input" /></div>
          <div><label className="label block mb-1">Min Threshold</label><input type="number" min="0" step="0.01" value={form.minThreshold} onChange={F('minThreshold')} placeholder="0" className="input" /></div>
          <div><label className="label block mb-1">Cost per Unit (₱)</label><input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={F('costPerUnit')} placeholder="0.00" className="input" /></div>
          <div><label className="label block mb-1">Supplier</label><input value={form.supplier} onChange={F('supplier')} placeholder="Supplier name" className="input" /></div>
          <div><label className="label block mb-1">Barcode</label><input value={form.barcode} onChange={F('barcode')} placeholder="123456789" className="input mono" /></div>
          <div><label className="label block mb-1">Description</label><input value={form.description} onChange={F('description')} placeholder="Notes" className="input" /></div>
        </div>
        {form.stockQty&&form.minThreshold&&parseFloat(form.stockQty)<=parseFloat(form.minThreshold)&&(
          <div className="alert-warn mt-4 text-xs"><AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />Stock is at or below threshold — will show as low stock.</div>
        )}
      </Modal>

      {/* Stock In/Out Modal */}
      <Modal open={!!stockModal} onClose={()=>{setStockModal(null);setStockQty('');setStockNotes('')}}
        title={stockModal?.type==='in'?`Stock In — ${stockModal.item.name}`:`Stock Out — ${stockModal?.item.name}`} size="sm"
        footer={<><button onClick={()=>setStockModal(null)} className="btn-ghost">Cancel</button><button onClick={handleStockAdjust} className={stockModal?.type==='in'?'btn-green':'btn-amber'}>{stockModal?.type==='in'?'Add Stock':'Deduct Stock'}</button></>}>
        {stockModal&&(
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ background:'var(--bg-sub)', borderColor:'var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color:'var(--text)' }}>{stockModal.item.name}</p>
              <p className="text-xs mt-0.5" style={{ color:'var(--t3)' }}>Current: <span className="font-bold" style={{ color:'var(--text)' }}>{stockModal.item.stockQty} {stockModal.item.unit}</span></p>
            </div>
            <div>
              <label className="label block mb-1">Quantity ({stockModal.item.unit}) *</label>
              <input type="number" min="0.01" step="0.01" value={stockQty} onChange={e=>setStockQty(e.target.value)} placeholder="0" className="input text-center text-lg mono" autoFocus />
            </div>
            {stockQty&&parseFloat(stockQty)>0&&(
              <div className={clsx('flex justify-between px-4 py-2.5 rounded-xl text-sm font-semibold mono', stockModal.type==='in'?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20':'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20')}>
                <span>New balance</span>
                <span>{stockModal.type==='in'?stockModal.item.stockQty+parseFloat(stockQty):stockModal.item.stockQty-parseFloat(stockQty)} {stockModal.item.unit}</span>
              </div>
            )}
            <div>
              <label className="label block mb-1">Notes</label>
              <input value={stockNotes} onChange={e=>setStockNotes(e.target.value)} placeholder={stockModal.type==='in'?'e.g. New delivery':'e.g. Spoilage'} className="input" />
            </div>
          </div>
        )}
      </Modal>

      {/* Item logs modal */}
      <Modal open={!!logsModal} onClose={()=>setLogsModal(null)} title={`History — ${logsModal?.name}`} size="lg">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Date & Time</th><th>Type</th><th>Change</th><th>Before</th><th>After</th><th>Reference</th></tr></thead>
            <tbody>
              {itemLogs.length===0 ? <tr><td colSpan={6} className="text-center py-8" style={{ color:'var(--t3)' }}>No history</td></tr>
                : itemLogs.map(log=>(
                  <tr key={log.id}>
                    <td className="mono text-xs">{fmt.dateTime(log.createdAt)}</td>
                    <td><span className={clsx('badge text-[10px]',log.type==='stock_in'||log.type==='refund_reversal'?'badge-done':log.type==='sale_deduction'?'badge-canc':'badge-pend')}>{log.type.replace(/_/g,' ')}</span></td>
                    <td className={clsx('mono font-bold text-sm',log.quantity>0?'text-emerald-500':'text-red-400')}>{log.quantity>0?'+':''}{log.quantity}</td>
                    <td className="mono text-xs">{log.balanceBefore}</td>
                    <td className="mono text-xs font-semibold" style={{ color:'var(--text)' }}>{log.balanceAfter}</td>
                    <td className="mono text-xs" style={{ color:'var(--t3)' }}>{log.reference??'—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delTarget} onClose={()=>setDelTarget(null)} title="Delete Item" size="sm"
        footer={<><button onClick={()=>setDelTarget(null)} className="btn-ghost">Cancel</button><button onClick={handleDelete} className="btn-red">Delete</button></>}>
        {delTarget&&<div className="text-center py-3 space-y-3"><div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto"><Trash2 size={22} className="text-red-500" /></div><p className="font-semibold" style={{ color:'var(--text)' }}>Delete "{delTarget.name}"?</p><p className="text-sm" style={{ color:'var(--t3)' }}>This will permanently remove this item and all movement history.</p></div>}
      </Modal>
    </AppShell>
  )
}
