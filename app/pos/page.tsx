'use client'
// app/pos/page.tsx
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { menuService } from '@/services/menuService'
import { orderService } from '@/services/orderService'
import { inventoryService } from '@/services/inventoryService'
import { MenuItem, CartItem, PaymentMethod, Order, MENU_CATS, InventoryItem } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'
import { fmt, catEmoji } from '@/lib/utils'
import { availableUnitsForMenu, lowStockForMenu, auditInventoryMappings } from '@/lib/stock'
import { Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle, Printer, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PAY_METHODS: { label:string; value:PaymentMethod; icon:string }[] = [
  { label:'Cash',  value:'Cash',  icon:'💵' },
  { label:'GCash', value:'GCash', icon:'📱' },
  { label:'Card',  value:'Card',  icon:'💳' },
  { label:'Maya',  value:'Maya',  icon:'📲' },
]

export default function POSPage() {
  const { user } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [cart, setCart]           = useState<CartItem[]>([])
  const [cat, setCat]             = useState<'All'|typeof MENU_CATS[number]>('All')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [placing, setPlacing]     = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash')
  const [cashRec, setCashRec]     = useState('')
  const [lastOrder, setLastOrder] = useState<{ order:Order; stockError?:string }|null>(null)
  const [rcptOpen, setRcptOpen]   = useState(false)
  const [finalizingReceipt, setFinalizingReceipt] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [menu, inventory] = await Promise.all([menuService.getAll(), inventoryService.getAll()])
      setMenuItems(menu)
      setInventoryItems(inventory)

      const audit = auditInventoryMappings(menu, inventory)
      if (audit.invalidMappings.length || audit.duplicateInventoryNames.length) {
        console.warn('[INVENTORY MAPPING AUDIT]', {
          invalidMappings: audit.invalidMappings,
          duplicateInventoryNames: audit.duplicateInventoryNames,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = menuItems.filter(item => {
    const mc = cat==='All' || item.category===cat
    const ms = item.name.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  const availableForItem = (item: MenuItem) => availableUnitsForMenu(item, inventoryItems)

  const addToCart = (item: MenuItem, addQty = 1) => {
    if (!item.available) return
    const available = availableForItem(item)
    setCart(prev => {
      const ex = prev.find(ci=>ci.menuItem.id===item.id)
      const currentQty = ex?.quantity ?? 0
      const nextQty = currentQty + addQty

      if (nextQty > available) {
        const canAdd = Math.max(0, available - currentQty)
        toast.error(`Insufficient stock. Only ${canAdd} unit(s) of ${item.name} can be added.`)
        return prev
      }

      return ex
        ? prev.map(ci=>ci.menuItem.id===item.id ? {...ci,quantity:nextQty} : ci)
        : [...prev, {menuItem:item, quantity:addQty}]
    })
  }

  const updateQty = (id:string, qty:number) => {
    if (qty<=0) setCart(prev=>prev.filter(ci=>ci.menuItem.id!==id))
    else setCart(prev=>prev.map(ci=>{
      if (ci.menuItem.id !== id) return ci
      const available = availableForItem(ci.menuItem)
      if (qty > available) {
        toast.error(`Insufficient stock. Only ${available} unit(s) of ${ci.menuItem.name} available.`)
        return { ...ci, quantity: available }
      }
      return { ...ci, quantity: qty }
    }).filter(ci => ci.quantity > 0))
  }

  const total  = cart.reduce((s,ci)=>s+ci.menuItem.price*ci.quantity,0)
  const cash   = parseFloat(cashRec)||0
  const change = cash - total
  const canPlace = cart.length>0 && (payMethod!=='Cash' || cash>=total)

  const finalizeInventoryForOrder = async () => {
    if (!user || !lastOrder || finalizingReceipt) return null

    setFinalizingReceipt(true)
    try {
      const result = await orderService.finalizeInventoryForOrder(lastOrder.order.id, menuItems, user.uid)
      if (result.order) {
        setLastOrder(prev => prev ? { ...prev, order: result.order!, stockError: prev.stockError } : prev)
      }
      return result
    } finally {
      setFinalizingReceipt(false)
    }
  }

  const handlePlace = async () => {
    if (!user || !canPlace || placing || finalizingReceipt) return

    const insufficient: string[] = []
    for (const ci of cart) {
      const available = availableForItem(ci.menuItem)
      if (ci.quantity > available) {
        insufficient.push(`${ci.menuItem.name} (requested ${ci.quantity}, available ${available})`)
      }
    }
    if (insufficient.length > 0) {
      toast.error(`Stock changed. Please adjust cart: ${insufficient.join('; ')}`)
      await fetchData()
      return
    }

    setPlacing(true)
    try {
      const result = await orderService.placeOrder(cart, payMethod, user.uid, user.name, payMethod==='Cash'?cash:undefined)
      setLastOrder(result)
      setCart([]); setCashRec(''); setRcptOpen(true)
      toast.success('Order placed. Payment confirmed. Receipt ready.')
      await fetchData()
    } catch(e:any) { toast.error(e.message ?? 'Failed to place order') }
    finally { setPlacing(false) }
  }

  const handlePrintReceipt = async () => {
    if (!lastOrder || !user || finalizingReceipt) return

    try {
      const result = await finalizeInventoryForOrder()
      setRcptOpen(false)
      if (typeof window !== 'undefined') {
        window.print()
      }
      toast.success(result?.alreadyDeducted ? 'Receipt ready. Inventory already finalized.' : 'Receipt printed.')
    } catch (e:any) {
      toast.error(e.message ?? 'Could not finalize receipt inventory')
    }
  }

  const handleNewOrder = async () => {
    if (!lastOrder || !user || finalizingReceipt) return

    try {
      await finalizeInventoryForOrder()
    } catch (e:any) {
      toast.error(e.message ?? 'Could not finalize order inventory')
    } finally {
      setLastOrder(null)
      setCart([])
      setCashRec('')
      setPayMethod('Cash')
      setRcptOpen(false)
    }
  }

  return (
    <AppShell>
      <div className="flex gap-5 h-[calc(100vh-7.5rem)] -m-6 p-6">
        {/* Left: menu grid */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu…" className="input pl-10 py-2.5" />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['All',...MENU_CATS] as const).map(c=>(
              <button key={c} onClick={()=>setCat(c as any)}
                className={clsx('btn btn-sm', cat===c?'btn-sizzle':'btn-ghost')}>
                {c!=='All'&&catEmoji(c)} {c}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({length:8}).map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl" />)}
              </div>
            ) : filtered.length===0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color:'var(--t3)' }}>
                <span className="text-4xl">🍽️</span><p className="text-sm">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(item=>{
                  const inCart  = cart.find(ci=>ci.menuItem.id===item.id)
                  const available = availableForItem(item)
                  const isLow = lowStockForMenu(item, inventoryItems)
                  const unavail = !item.available || available <= 0
                  return (
                    <div key={item.id} onClick={()=>!unavail&&addToCart(item)}
                      className={clsx('card overflow-hidden transition-all duration-150 select-none',
                        !unavail?'cursor-pointer hover:scale-[1.02] active:scale-[.98]':'opacity-50 cursor-not-allowed',
                        inCart&&'ring-2 ring-sizzle-500')}
                      style={{ borderColor:inCart?'var(--acc)':'var(--border)' }}>
                      <div className="relative h-28 overflow-hidden" style={{ background:'var(--bg-sub)' }}>
                        {item.imageUrl
                          ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl">{catEmoji(item.category)}</div>
                        }
                        <div className="absolute top-2 right-2"><span className="badge-acc text-[9px] px-1.5 py-0.5">{item.category}</span></div>
                        {unavail && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="badge-oos text-[10px]">Out of Stock</span>
                          </div>
                        )}
                        {inCart&&!unavail&&(
                          <div className="absolute top-2 left-2">
                            <span className="badge-avail text-[9px] px-1.5 py-0.5">✓ {inCart.quantity}×</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color:'var(--text)' }}>{item.name}</p>
                        <p className="text-sm font-bold mt-1.5 mono" style={{ color:'var(--acc)' }}>{fmt.currency(item.price)}</p>
                        <div className="mt-2">
                          {unavail ? (
                            <span className="badge-oos">OUT OF STOCK</span>
                          ) : isLow ? (
                            <span className="badge-low">Available: {available}</span>
                          ) : (
                            <span className="badge-ok">Available: {available}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: cart */}
        <div className="w-72 flex-shrink-0 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor:'var(--border)' }}>
            <div className="flex items-center gap-2">
              <ShoppingBag size={15} style={{ color:'var(--acc)' }} />
              <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>Cart</span>
              {cart.length>0&&<span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background:'var(--acc)' }}>{cart.length}</span>}
            </div>
            {cart.length>0&&<button onClick={()=>setCart([])} className="text-xs text-red-400 hover:text-red-600">Clear</button>}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {cart.length===0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color:'var(--t3)' }}>
                <ShoppingBag size={36} strokeWidth={1} /><p className="text-sm">Cart is empty</p>
              </div>
            ) : cart.map(ci=>(
              <div key={ci.menuItem.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border"
                style={{ background:'var(--bg-hover)', borderColor:'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color:'var(--text)' }}>{ci.menuItem.name}</p>
                  <p className="text-[11px] mono" style={{ color:'var(--acc)' }}>{fmt.currency(ci.menuItem.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>updateQty(ci.menuItem.id,ci.quantity-1)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background:'var(--bg-sub)', border:'1px solid var(--border-md)' }}>
                    {ci.quantity===1 ? <Trash2 size={10} style={{ color:'var(--t3)' }} /> : <Minus size={10} style={{ color:'var(--t3)' }} />}
                  </button>
                  <span className="text-sm font-bold w-5 text-center tabular-nums" style={{ color:'var(--text)' }}>{ci.quantity}</span>
                  <button onClick={()=>updateQty(ci.menuItem.id,ci.quantity+1)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background:'var(--bg-sub)', border:'1px solid var(--border-md)' }}>
                    <Plus size={10} style={{ color:'var(--t3)' }} />
                  </button>
                </div>
                <p className="text-xs font-bold mono w-14 text-right" style={{ color:'var(--text)' }}>{fmt.currency(ci.menuItem.price*ci.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t space-y-3" style={{ borderColor:'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color:'var(--t2)' }}>Total</span>
              <span className="display font-bold text-xl mono" style={{ color:'var(--text)' }}>{fmt.currency(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PAY_METHODS.map(pm=>(
                <button key={pm.value} onClick={()=>setPayMethod(pm.value)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all"
                  style={{
                    background:payMethod===pm.value?'var(--acc-dim)':'var(--bg-sub)',
                    borderColor:payMethod===pm.value?'var(--acc-bdr)':'var(--border)',
                    color:payMethod===pm.value?'var(--acc)':'var(--t3)',
                  }}>
                  {pm.icon} {pm.label}
                </button>
              ))}
            </div>
            {payMethod==='Cash'&&(
              <div className="space-y-2">
                <input type="number" value={cashRec} onChange={e=>setCashRec(e.target.value)}
                  placeholder="Cash received…" className="input-sm text-center mono" min={total} step="0.01" />
                {cash>0&&(
                  <div className={clsx('flex justify-between px-3 py-2 rounded-xl text-sm font-bold mono',
                    change>=0?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                             :'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20')}>
                    <span>Change</span><span>{fmt.currency(change)}</span>
                  </div>
                )}
              </div>
            )}
            <button onClick={handlePlace} disabled={!canPlace||placing||finalizingReceipt} className="btn-sizzle w-full justify-center py-3 text-sm">
              {placing ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                : `Place Order — ${fmt.currency(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      <Modal open={rcptOpen} onClose={()=>setRcptOpen(false)} size="sm">
        {lastOrder&&(
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)' }}>
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
            </div>
            <div>
              <h3 className="display font-bold text-xl" style={{ color:'var(--text)' }}>Order Placed!</h3>
              <p className="mono text-sm mt-1" style={{ color:'var(--t3)' }}>{lastOrder.order.orderNumber}</p>
            </div>
            {lastOrder.stockError&&(
              <div className="alert-warn text-left text-xs">
                <AlertTriangle size={13} className="flex-shrink-0 text-amber-500 mt-0.5" />
                <span>Stock deduction issue: {lastOrder.stockError}</span>
              </div>
            )}
            <div className="rounded-xl p-4 border text-left space-y-2" style={{ background:'var(--bg-sub)', borderColor:'var(--border)' }}>
              {lastOrder.order.items.map(item=>(
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span style={{ color:'var(--t2)' }}>{item.name} × {item.quantity}</span>
                  <span className="mono font-semibold" style={{ color:'var(--text)' }}>{fmt.currency(item.subtotal)}</span>
                </div>
              ))}
              <div className="acc-line my-2" />
              <div className="flex justify-between font-bold">
                <span style={{ color:'var(--text)' }}>Total</span>
                <span className="mono text-lg" style={{ color:'var(--acc)' }}>{fmt.currency(lastOrder.order.total)}</span>
              </div>
              {lastOrder.order.paymentMethod==='Cash'&&lastOrder.order.change!=null&&(
                <div className="flex justify-between text-sm">
                  <span style={{ color:'var(--t3)' }}>Change</span>
                  <span className="mono text-emerald-500 font-semibold">{fmt.currency(lastOrder.order.change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleNewOrder} disabled={finalizingReceipt} className="btn-ghost flex-1 justify-center disabled:opacity-50">New Order</button>
              <button onClick={handlePrintReceipt} disabled={finalizingReceipt} className="btn-sizzle flex-1 justify-center flex items-center gap-2 disabled:opacity-50"><Printer size={14} /> {finalizingReceipt ? 'Finalizing…' : 'Print Receipt'}</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
