// services/inventoryService.ts
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, Timestamp, runTransaction
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { InventoryItem, InventoryLog, MovType } from '@/lib/types'

const C = 'inventory', L = 'inventory_logs'
const col  = () => collection(db, C)
const logC = () => collection(db, L)

const ts = (v: any) => v instanceof Timestamp ? v.toDate().toISOString() : (v ?? new Date().toISOString())

function toItem(s: any): InventoryItem {
  const d = s.data()
  return { id:s.id, name:d.name, sku:d.sku, category:d.category,
    stockQty:d.stockQty, minThreshold:d.minThreshold, unit:d.unit,
    costPerUnit:d.costPerUnit, supplier:d.supplier, description:d.description,
    barcode:d.barcode, createdAt:ts(d.createdAt), updatedAt:ts(d.updatedAt) }
}

function toLog(s: any): InventoryLog {
  const d = s.data()
  return { id:s.id, inventoryItemId:d.inventoryItemId, inventoryItemName:d.inventoryItemName,
    type:d.type, quantity:d.quantity, balanceBefore:d.balanceBefore, balanceAfter:d.balanceAfter,
    reference:d.reference, notes:d.notes, performedBy:d.performedBy, createdAt:ts(d.createdAt) }
}

export const inventoryService = {
  async getAll(): Promise<InventoryItem[]> {
    return (await getDocs(query(col(), orderBy('category'), orderBy('name')))).docs.map(toItem)
  },

  async getLowStock(): Promise<InventoryItem[]> {
    return (await this.getAll()).filter(i => i.stockQty <= i.minThreshold)
  },

  async create(data: Omit<InventoryItem,'id'|'createdAt'|'updatedAt'>): Promise<string> {
    const r = await addDoc(col(), { ...data, createdAt:serverTimestamp(), updatedAt:serverTimestamp() })
    return r.id
  },

  async update(id: string, data: Partial<InventoryItem>): Promise<void> {
    const { id:_, createdAt, ...rest } = data as any
    await updateDoc(doc(db, C, id), { ...rest, updatedAt:serverTimestamp() })
  },

  async delete(id: string): Promise<void> { await deleteDoc(doc(db, C, id)) },

  async stockIn(id: string, qty: number, notes: string, by: string): Promise<void> {
    await runTransaction(db, async tx => {
      const ref = doc(db, C, id); const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Item not found')
      const before = snap.data().stockQty as number
      tx.update(ref, { stockQty: before + qty, updatedAt: serverTimestamp() })
    })
    const snap = await getDoc(doc(db, C, id))
    if (snap.exists()) {
      const after = snap.data().stockQty
      await addDoc(logC(), { inventoryItemId:id, inventoryItemName:snap.data().name,
        type:'stock_in' as MovType, quantity:qty, balanceBefore:after-qty, balanceAfter:after,
        notes, performedBy:by, createdAt:serverTimestamp() })
    }
  },

  async stockOut(id: string, qty: number, notes: string, by: string): Promise<void> {
    await runTransaction(db, async tx => {
      const ref = doc(db, C, id); const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Item not found')
      const before = snap.data().stockQty as number
      if (before < qty) throw new Error(`Insufficient stock: ${before} ${snap.data().unit} available`)
      tx.update(ref, { stockQty: before - qty, updatedAt: serverTimestamp() })
    })
    const snap = await getDoc(doc(db, C, id))
    if (snap.exists()) {
      const after = snap.data().stockQty
      await addDoc(logC(), { inventoryItemId:id, inventoryItemName:snap.data().name,
        type:'stock_out' as MovType, quantity:-qty, balanceBefore:after+qty, balanceAfter:after,
        notes, performedBy:by, createdAt:serverTimestamp() })
    }
  },

  async deductForOrder(orderId: string, deductions: {itemId:string;itemName:string;qty:number}[], by: string): Promise<{success:boolean;error?:string;alreadyDeducted?:boolean}> {
    try {
      const refs  = deductions.map(d => doc(db, C, d.itemId))
      const orderRef = doc(db, 'orders', orderId)
      const orderSnap = await getDoc(orderRef)
      if (orderSnap.exists() && orderSnap.data().stockDeducted === true) {
        return { success:true, alreadyDeducted:true }
      }

      let didDeduct = false
      await runTransaction(db, async tx => {
        const currentOrder = await tx.get(orderRef)
        if (!currentOrder.exists()) throw new Error('Order not found')
        if (currentOrder.data().stockDeducted === true) return

        const freshSnaps = await Promise.all(refs.map(r => tx.get(r)))
        for (let i = 0; i < freshSnaps.length; i++) {
          if (!freshSnaps[i].exists()) throw new Error(`"${deductions[i].itemName}" not found`)
          const cur = freshSnaps[i].data()!.stockQty as number
          if (cur < deductions[i].qty) throw new Error(`Insufficient stock for "${freshSnaps[i].data()!.name}": need ${deductions[i].qty} ${freshSnaps[i].data()!.unit}, have ${cur}`)
        }
        for (let i = 0; i < freshSnaps.length; i++) {
          const cur = freshSnaps[i].data()!.stockQty as number
          tx.update(refs[i], { stockQty: cur - deductions[i].qty, updatedAt: serverTimestamp() })
        }
        tx.update(orderRef, { stockDeducted: true })
        didDeduct = true
      })

      if (!didDeduct) {
        return { success:true, alreadyDeducted:true }
      }

      for (const d of deductions) {
        const s = await getDoc(doc(db, C, d.itemId))
        if (s.exists()) {
          await addDoc(logC(), { inventoryItemId:d.itemId, inventoryItemName:d.itemName,
            type:'sale_deduction' as MovType, quantity:-d.qty,
            balanceBefore:s.data().stockQty+d.qty, balanceAfter:s.data().stockQty,
            reference:orderId, performedBy:by, createdAt:serverTimestamp() })
        }
      }
      return { success:true, alreadyDeducted:false }
    } catch(e:any) { return { success:false, error:e.message, alreadyDeducted:false } }
  },

  async reverseDeduction(orderId: string, deductions: {itemId:string;itemName:string;qty:number}[], by: string): Promise<void> {
    const refs = deductions.map(d => doc(db, C, d.itemId))
    await runTransaction(db, async tx => {
      const snaps = await Promise.all(refs.map(r => tx.get(r)))
      for (let i = 0; i < refs.length; i++) {
        if (snaps[i].exists()) {
          const cur = snaps[i].data()!.stockQty as number
          tx.update(refs[i], { stockQty: cur + deductions[i].qty, updatedAt: serverTimestamp() })
        }
      }
    })
    for (const d of deductions) {
      await addDoc(logC(), { inventoryItemId:d.itemId, inventoryItemName:d.itemName,
        type:'refund_reversal' as MovType, quantity:d.qty,
        reference:orderId, performedBy:by, createdAt:serverTimestamp() })
    }
  },

  async getLogs(limit=50): Promise<InventoryLog[]> {
    const q = query(logC(), orderBy('createdAt','desc'))
    return (await getDocs(q)).docs.slice(0, limit).map(toLog)
  },

  async getLogsByItem(itemId: string): Promise<InventoryLog[]> {
    const q = query(logC(), where('inventoryItemId','==',itemId), orderBy('createdAt','desc'))
    return (await getDocs(q)).docs.map(toLog)
  },
}
