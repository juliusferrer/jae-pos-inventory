// lib/utils.ts
import { format, formatDistanceToNow } from 'date-fns'
import { InventoryItem, OrderStatus } from './types'

export const fmt = {
  currency: (n: number) => `₱${n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
  date:     (s: string) => { try { return format(new Date(s),'MMM d, yyyy') } catch { return '—' } },
  dateTime: (s: string) => { try { return format(new Date(s),'MMM d, yyyy hh:mm aa') } catch { return '—' } },
  time:     (s: string) => { try { return format(new Date(s),'hh:mm aa') } catch { return '—' } },
  relative: (s: string) => { try { return formatDistanceToNow(new Date(s),{addSuffix:true}) } catch { return '' } },
  orderNum: () => `ORD-${format(new Date(),'yyyyMMdd')}-${Math.floor(1000+Math.random()*9000)}`,
}

export function stockStatus(item: InventoryItem): 'ok'|'low'|'critical'|'empty' {
  if (item.stockQty <= 0) return 'empty'
  if (item.stockQty <= item.minThreshold) return 'critical'
  if (item.stockQty <= item.minThreshold * 1.5) return 'low'
  return 'ok'
}

export function stockBadge(s: string) {
  return { ok:'badge-ok', low:'badge-low', critical:'badge-crit', empty:'badge-crit' }[s] ?? 'badge-low'
}

export function orderBadge(s: OrderStatus) {
  return { completed:'badge-done', cancelled:'badge-canc', refunded:'badge-pend' }[s] ?? 'badge-pend'
}

export function catEmoji(c: string) {
  return ({
    'Silog Meals':'🍳','Hot Plate':'🔥','Sizzling':'🍖','Drinks':'🥤',
    'Desserts':'🍧','Snacks':'🌭','Add-ons':'➕',
    'Meat':'🥩','Dairy':'🥛','Vegetables':'🥬','Dry Goods':'🌾',
    'Beverages':'🧃','Condiments':'🧂','Seafood':'🐟','Frozen':'🧊','Other':'📦',
  } as Record<string,string>)[c] ?? '📦'
}
