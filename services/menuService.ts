// services/menuService.ts
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MenuItem } from '@/lib/types'

const C = 'menu_items'
const col = () => collection(db, C)
const ts = (v: any) => v instanceof Timestamp ? v.toDate().toISOString() : (v ?? new Date().toISOString())

function toItem(s: any): MenuItem {
  const d = s.data()
  return { id:s.id, name:d.name, category:d.category, price:d.price, costPrice:d.costPrice??0,
    imageUrl:d.imageUrl, imagePublicId:d.imagePublicId, available:d.available??true,
    soldCount:d.soldCount??0, description:d.description, recipe:d.recipe??[],
    createdAt:ts(d.createdAt), updatedAt:ts(d.updatedAt) }
}

export const menuService = {
  async getAll(): Promise<MenuItem[]> {
    return (await getDocs(query(col(), orderBy('category'), orderBy('name')))).docs.map(toItem)
  },
  async getById(id: string): Promise<MenuItem|null> {
    const s = await getDoc(doc(db, C, id))
    return s.exists() ? toItem(s) : null
  },
  async create(data: Omit<MenuItem,'id'|'createdAt'|'updatedAt'|'soldCount'>): Promise<string> {
    const r = await addDoc(col(), { ...data, soldCount:0, createdAt:serverTimestamp(), updatedAt:serverTimestamp() })
    return r.id
  },
  async update(id: string, data: Partial<MenuItem>): Promise<void> {
    const { id:_, createdAt, ...rest } = data as any
    await updateDoc(doc(db, C, id), { ...rest, updatedAt:serverTimestamp() })
  },
  async delete(id: string): Promise<void> { await deleteDoc(doc(db, C, id)) },
  async toggleAvail(id: string, available: boolean): Promise<void> {
    await updateDoc(doc(db, C, id), { available, updatedAt:serverTimestamp() })
  },
  async incSold(id: string, qty: number): Promise<void> {
    const s = await getDoc(doc(db, C, id))
    if (s.exists()) await updateDoc(doc(db, C, id), { soldCount:(s.data().soldCount??0)+qty })
  },
}
