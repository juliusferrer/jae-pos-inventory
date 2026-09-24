// services/orderService.ts
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MenuItem, Order, CartItem, OrderItem, PaymentMethod } from '@/lib/types'
import { inventoryService } from './inventoryService'
import { menuService } from './menuService'
import { fmt } from '@/lib/utils'
import { format } from 'date-fns'
import { buildDeductionsFromCart, resolveMenuLinks } from '@/lib/stock'

const C = 'orders'
const col = () => collection(db, C)
const ts  = (v: any) => v instanceof Timestamp ? v.toDate().toISOString() : (v ?? new Date().toISOString())

function toOrder(s: any): Order {
  const d = s.data()
  return { id:s.id, orderNumber:d.orderNumber, items:d.items,
    subtotal:d.subtotal, total:d.total, costTotal:d.costTotal??0, grossProfit:d.grossProfit??0,
    paymentMethod:d.paymentMethod, cashReceived:d.cashReceived ?? null, change:d.change ?? null,
    status:d.status, stockDeducted:d.stockDeducted??false,
    cashierId:d.cashierId, cashierName:d.cashierName, cancelReason:d.cancelReason,
    timestamp:ts(d.timestamp), date:d.date }
}

export const orderService = {
  async placeOrder(
    cart: CartItem[], paymentMethod: PaymentMethod,
    cashierId: string, cashierName: string, cashReceived?: number
  ): Promise<{ order: Order; stockError?: string }> {
    const now  = new Date()
    const date = format(now, 'yyyy-MM-dd')
    const orderNumber = fmt.orderNum()

    const items: OrderItem[] = cart.map(ci => ({
      menuItemId:   ci.menuItem.id,
      name:         ci.menuItem.name,
      category:     ci.menuItem.category,
      price:        ci.menuItem.price,
      costPrice:    ci.menuItem.costPrice,
      quantity:     ci.quantity,
      subtotal:     ci.menuItem.price * ci.quantity,
      costSubtotal: ci.menuItem.costPrice * ci.quantity,
    }))

    const subtotal    = items.reduce((s, i) => s + i.subtotal, 0)
    const costTotal   = items.reduce((s, i) => s + i.costSubtotal, 0)
    const grossProfit = subtotal - costTotal
    const normalizedCashReceived = paymentMethod === 'Cash' ? cashReceived ?? null : null
    const change = paymentMethod === 'Cash' && cashReceived != null ? cashReceived - subtotal : null

    const payload = {
      orderNumber, items, subtotal, total:subtotal, costTotal, grossProfit,
      paymentMethod, cashReceived: normalizedCashReceived, change,
      status:'completed' as const, stockDeducted:false,
      cashierId, cashierName, timestamp:serverTimestamp(), date
    }

    const orderRef = doc(col())
    const inventoryItems = await inventoryService.getAll()

    for (const ci of cart) {
      const links = resolveMenuLinks(ci.menuItem, inventoryItems)
      if (ci.menuItem.recipe?.length) {
        ci.menuItem.recipe.forEach((r, idx) => {
          const resolved = links[idx]
          console.info('[POS DEBUG] Recipe Inventory ID:', r.inventoryItemId)
          console.info('[POS DEBUG] Resolved Inventory ID:', resolved?.inventory.id ?? null)
        })
      }
    }

    const { deductions, unmappedItems } = buildDeductionsFromCart(cart, inventoryItems)
    if (unmappedItems.length > 0) {
      throw new Error(`Missing inventory mapping for: ${unmappedItems.join(', ')}`)
    }

    await setDoc(orderRef, payload)
    const order: Order = { ...payload, id:orderRef.id, stockDeducted:false, timestamp:now.toISOString() }

    await Promise.all(cart.map(ci => menuService.incSold(ci.menuItem.id, ci.quantity)))

    return { order }
  },

  async finalizeInventoryForOrder(orderId: string, menuItems: MenuItem[], cashierId: string): Promise<{ order: Order | null; alreadyDeducted: boolean }> {
    const orderSnap = await getDoc(doc(db, C, orderId))
    if (!orderSnap.exists()) return { order: null, alreadyDeducted: false }

    const order = toOrder(orderSnap)
    if (order.stockDeducted) return { order, alreadyDeducted: true }

    const cart: CartItem[] = order.items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId)
      if (!menuItem) throw new Error(`Menu item not found for order: ${item.name}`)
      return { menuItem, quantity: item.quantity }
    })

    const inventoryItems = await inventoryService.getAll()
    const { deductions, unmappedItems } = buildDeductionsFromCart(cart, inventoryItems)
    if (unmappedItems.length > 0) {
      throw new Error(`Missing inventory mapping for: ${unmappedItems.join(', ')}`)
    }

    const dedResult = await inventoryService.deductForOrder(orderId, deductions, cashierId)
    if (!dedResult.success) {
      throw new Error(dedResult.error ?? 'Insufficient inventory')
    }

    const refreshed = await getDoc(doc(db, C, orderId))
    return { order: refreshed.exists() ? toOrder(refreshed) : null, alreadyDeducted: !!dedResult.alreadyDeducted }
  },

  async getAll(): Promise<Order[]> {
    return (await getDocs(query(col(), orderBy('timestamp','desc')))).docs.map(toOrder)
  },

  async getByDate(date: string): Promise<Order[]> {
    const q = query(col(), where('date','==',date), orderBy('timestamp','desc'))
    return (await getDocs(q)).docs.map(toOrder)
  },

  async getByRange(start: string, end: string): Promise<Order[]> {
    const q = query(col(), where('date','>=',start), where('date','<=',end), orderBy('date','desc'), orderBy('timestamp','desc'))
    return (await getDocs(q)).docs.map(toOrder)
  },

  async cancel(id: string, reason: string, cashierId: string): Promise<void> {
    const s = await getDoc(doc(db, C, id))
    if (!s.exists()) throw new Error('Order not found')
    const order = toOrder(s)
    if (order.status !== 'completed') throw new Error('Only completed orders can be cancelled')

    await updateDoc(doc(db, C, id), { status:'cancelled', cancelReason:reason })

    if (order.stockDeducted) {
      const inventoryItems = await inventoryService.getAll()
      const cancelCart: CartItem[] = []
      for (const oi of order.items) {
        const menu = await menuService.getById(oi.menuItemId)
        if (!menu) continue
        cancelCart.push({ menuItem: menu, quantity: oi.quantity })
      }

      const { deductions, unmappedItems } = buildDeductionsFromCart(cancelCart, inventoryItems)
      if (unmappedItems.length > 0) {
        throw new Error(`Cannot reverse stock for unmapped item(s): ${unmappedItems.join(', ')}`)
      }

      const validDeductions = deductions.filter(d => d.qty > 0)
      if (validDeductions.length > 0) {
        await inventoryService.reverseDeduction(id, validDeductions, cashierId)
      }
    }
  },

  summary(orders: Order[]) {
    const done = orders.filter(o => o.status === 'completed')
    const totalRevenue  = done.reduce((s, o) => s + o.total, 0)
    const totalCost     = done.reduce((s, o) => s + (o.costTotal ?? 0), 0)
    const grossProfit   = done.reduce((s, o) => s + (o.grossProfit ?? 0), 0)
    const totalOrders   = done.length
    const itemMap: Record<string, { name:string; qty:number; revenue:number; category:string }> = {}
    done.forEach(o => o.items.forEach(i => {
      if (!itemMap[i.menuItemId]) itemMap[i.menuItemId] = { name:i.name, qty:0, revenue:0, category:i.category }
      itemMap[i.menuItemId].qty     += i.quantity
      itemMap[i.menuItemId].revenue += i.subtotal
    }))
    const bestSellers = Object.entries(itemMap).map(([id,d]) => ({ id,...d })).sort((a,b) => b.qty - a.qty).slice(0,10)
    return { totalRevenue, totalCost, grossProfit, totalOrders, bestSellers, itemMap }
  },
}
