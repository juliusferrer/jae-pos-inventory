'use client'
// app/menu-management/page.tsx
import { useEffect, useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { menuService } from '@/services/menuService'
import { inventoryService } from '@/services/inventoryService'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { MenuItem, MenuCategory, MENU_CATS, InventoryItem, RecipeIngredient } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'
import { fmt, catEmoji } from '@/lib/utils'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, ImageOff, Upload, X, Link2 } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY = { name:'', category:'Silog Meals' as MenuCategory, price:'', costPrice:'', description:'', available:true, imageUrl:'', imagePublicId:'' }

export default function MenuManagementPage() {
  const { user } = useAuth()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [items, setItems]     = useState<MenuItem[]>([])
  const [invItems, setInvItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState<MenuCategory|'All'>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem|null>(null)
  const [form, setForm]       = useState(EMPTY)
  const [recipe, setRecipe]   = useState<RecipeIngredient[]>([])
  const [imgFile, setImgFile] = useState<File|null>(null)
  const [imgPrev, setImgPrev] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [delTarget, setDelTarget] = useState<MenuItem|null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [m, i] = await Promise.all([menuService.getAll(), inventoryService.getAll()])
      setItems(m); setInvItems(i)
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = items.filter(i => {
    const ms = i.name.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter==='All' || i.category===catFilter
    return ms && mc
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY); setRecipe([]); setImgFile(null); setImgPrev(''); setModalOpen(true) }
  const openEdit   = (item: MenuItem) => {
    setEditing(item)
    setForm({ name:item.name, category:item.category, price:item.price.toString(), costPrice:item.costPrice.toString(),
      description:item.description??'', available:item.available, imageUrl:item.imageUrl??'', imagePublicId:item.imagePublicId??'' })
    setRecipe(item.recipe??[])
    setImgFile(null); setImgPrev(item.imageUrl??''); setModalOpen(true)
  }

  const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 8*1024*1024) { toast.error('Max 8 MB'); return }
    setImgFile(file); setImgPrev(URL.createObjectURL(file))
  }

  const addRecipe = () => {
    if (!invItems.length) return
    const first = invItems[0]
    setRecipe(prev=>[...prev, { inventoryItemId:first.id, inventoryItemName:first.name, quantity:1, unit:first.unit }])
  }

  const updateRecipe = (idx:number, field:keyof RecipeIngredient, value:any) => {
    setRecipe(prev=>prev.map((r,i)=>{
      if (i!==idx) return r
      if (field==='inventoryItemId') {
        const inv = invItems.find(it=>it.id===value)
        return { ...r, inventoryItemId:value, inventoryItemName:inv?.name??'', unit:inv?.unit??r.unit }
      }
      return { ...r, [field]:value }
    }))
  }

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl, imagePublicId = form.imagePublicId
      if (imgFile) {
        setUploading(true)
        const res = await uploadToCloudinary(imgFile, 'sizzle-pos/menu')
        imageUrl = res.secure_url; imagePublicId = res.public_id
        setUploading(false)
      }
      const data = { name:form.name.trim(), category:form.category, price:parseFloat(form.price),
        costPrice:parseFloat(form.costPrice||'0'), description:form.description.trim(),
        available:form.available, imageUrl, imagePublicId, recipe }
      if (editing) { await menuService.update(editing.id, data); toast.success('Updated!') }
      else { await menuService.create(data); toast.success('Item added!') }
      setModalOpen(false); fetchAll()
    } catch(e:any) { toast.error(e.message??'Save failed') }
    finally { setSaving(false); setUploading(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try { await menuService.delete(delTarget.id); toast.success('Deleted'); setDelTarget(null); fetchAll() }
    catch { toast.error('Delete failed') }
  }

  const toggleAvail = async (item: MenuItem) => {
    try { await menuService.toggleAvail(item.id, !item.available); setItems(prev=>prev.map(i=>i.id===item.id?{...i,available:!i.available}:i)) }
    catch { toast.error('Failed') }
  }

  const F = (k:keyof typeof EMPTY) => (e:any) => setForm(p=>({...p,[k]:e.target.value}))

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Product Management</h2>
            <p className="text-sm mt-0.5" style={{ color:'var(--t3)' }}>{items.length} items · {items.filter(i=>!i.available).length} out of stock</p>
          </div>
          <button onClick={openCreate} className="btn-sizzle btn-sm flex items-center gap-1.5"><Plus size={14} /> Add Item</button>
        </div>

        <div className="card-pad flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="input input-sm pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All',...MENU_CATS] as const).map(c=>(
              <button key={c} onClick={()=>setCatFilter(c as any)} className={clsx('btn btn-sm', catFilter===c?'btn-sizzle':'btn-ghost')}>
                {c!=='All'&&catEmoji(c)} {c}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Cost</th><th>Recipe</th><th>Sold</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i)=><tr key={i}><td colSpan={8}><div className="skeleton h-4 my-1" /></td></tr>)
                  : filtered.length===0 ? <tr><td colSpan={8} className="text-center py-12" style={{ color:'var(--t3)' }}>No items</td></tr>
                  : filtered.map(item=>(
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl" style={{ background:'var(--bg-sub)' }}>
                            {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="object-cover w-full h-full rounded-xl" /> : catEmoji(item.category)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{item.name}</p>
                            {item.description&&<p className="text-xs truncate max-w-xs" style={{ color:'var(--t3)' }}>{item.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-acc">{item.category}</span></td>
                      <td><span className="mono text-sm font-bold" style={{ color:'var(--acc)' }}>{fmt.currency(item.price)}</span></td>
                      <td><span className="mono text-xs" style={{ color:'var(--t3)' }}>{fmt.currency(item.costPrice)}</span></td>
                      <td><span className="flex items-center gap-1 text-xs" style={{ color:'var(--t3)' }}><Link2 size={11} /> {item.recipe?.length??0}</span></td>
                      <td className="tabular-nums" style={{ color:'var(--t3)' }}>{item.soldCount}</td>
                      <td>
                        <button onClick={()=>toggleAvail(item)} className="flex items-center gap-1.5">
                          {item.available ? <><ToggleRight size={20} className="text-emerald-500" /><span className="badge-avail">Available</span></>
                            : <><ToggleLeft size={20} style={{ color:'var(--t3)' }} /><span className="badge-oos">Out of Stock</span></>}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEdit(item)} className="btn-ghost p-1.5 rounded-lg btn-sm"><Pencil size={13} /></button>
                          <button onClick={()=>setDelTarget(item)} className="btn-ghost p-1.5 rounded-lg btn-sm text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Item':'Add Menu Item'} size="xl"
        footer={<>
          <button onClick={()=>setModalOpen(false)} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving||uploading} className="btn-sizzle">
            {(saving||uploading)&&<span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {uploading?'Uploading…':saving?'Saving…':editing?'Save Changes':'Add Item'}
          </button>
        </>}>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><label className="label block mb-1">Name *</label><input value={form.name} onChange={F('name')} placeholder="e.g. Tapsilog" className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label block mb-1">Category *</label>
                <select value={form.category} onChange={F('category')} className="input">
                  {MENU_CATS.map(c=><option key={c} value={c}>{catEmoji(c)} {c}</option>)}
                </select>
              </div>
              <div><label className="label block mb-1">Availability</label>
                <button type="button" onClick={()=>setForm(p=>({...p,available:!p.available}))} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-medium" style={{ background:'var(--bg-sub)', borderColor:'var(--border-md)', color:'var(--t2)' }}>
                  {form.available ? <><ToggleRight size={18} className="text-emerald-500" /> Available</> : <><ToggleLeft size={18} style={{ color:'var(--t3)' }} /> Out of Stock</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label block mb-1">Price (₱) *</label><input type="number" value={form.price} onChange={F('price')} placeholder="0.00" className="input" min="0" step="0.01" /></div>
              <div><label className="label block mb-1">Cost Price (₱)</label><input type="number" value={form.costPrice} onChange={F('costPrice')} placeholder="0.00" className="input" min="0" step="0.01" /></div>
            </div>
            {form.price&&form.costPrice&&(
              <div className="px-3 py-2 rounded-xl text-xs" style={{ background:'var(--acc-dim)', border:'1px solid var(--acc-bdr)', color:'var(--acc)' }}>
                Margin: {(((parseFloat(form.price)-parseFloat(form.costPrice))/parseFloat(form.price))*100).toFixed(1)}% · Profit: {fmt.currency(parseFloat(form.price)-parseFloat(form.costPrice))}
              </div>
            )}
            <div><label className="label block mb-1">Description</label><textarea value={form.description} onChange={F('description')} placeholder="Brief description…" className="input h-20" /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Recipe (Inventory Link)</label>
                <button type="button" onClick={addRecipe} className="btn btn-sm btn-ghost text-xs flex items-center gap-1"><Plus size={11} /> Add</button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recipe.length===0&&<p className="text-xs py-2" style={{ color:'var(--t3)' }}>No ingredients linked. Add to enable auto stock deduction.</p>}
                {recipe.map((r,idx)=>(
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background:'var(--bg-sub)', borderColor:'var(--border)' }}>
                    <select value={r.inventoryItemId} onChange={e=>updateRecipe(idx,'inventoryItemId',e.target.value)} className="input input-sm flex-1 text-xs">
                      {invItems.map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input type="number" value={r.quantity} onChange={e=>updateRecipe(idx,'quantity',parseFloat(e.target.value))} className="input input-sm w-16 text-xs text-center mono" min="0.01" step="0.01" />
                    <span className="text-xs mono flex-shrink-0" style={{ color:'var(--t3)' }}>{r.unit}</span>
                    <button type="button" onClick={()=>setRecipe(prev=>prev.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label block mb-1.5">Item Image</label>
              <div onClick={()=>fileRef.current?.click()} className={clsx('relative aspect-video rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden transition-all',
                imgPrev?'border-sizzle-500':'hover:border-sizzle-500')} style={{ borderColor:imgPrev?'var(--acc)':'var(--border-md)' }}>
                {imgPrev ? <>
                  <Image src={imgPrev} alt="Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><Upload size={20} className="text-white" /></div>
                </> : <>
                  <ImageOff size={28} style={{ color:'var(--t3)' }} />
                  <p className="text-sm" style={{ color:'var(--t3)' }}>Click to upload</p>
                  <p className="text-xs" style={{ color:'var(--t4)' }}>PNG, JPG up to 8 MB</p>
                </>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImgChange} className="hidden" />
              {imgPrev&&<button type="button" onClick={()=>{setImgPrev('');setImgFile(null);setForm(p=>({...p,imageUrl:'',imagePublicId:''}))}} className="text-xs text-red-400 hover:text-red-600 mt-1.5 flex items-center gap-1"><X size={11} /> Remove</button>}
            </div>
            {editing&&(
              <div className="p-4 rounded-xl border space-y-2" style={{ background:'var(--bg-sub)', borderColor:'var(--border)' }}>
                <p className="label">Item Stats</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[['Sold',editing.soldCount],['Created',fmt.date(editing.createdAt)],['Updated',fmt.date(editing.updatedAt)]].map(([l,v])=>(
                    <div key={String(l)}><p style={{ color:'var(--t3)' }}>{l}</p><p className="font-medium" style={{ color:'var(--text)' }}>{String(v)}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={!!delTarget} onClose={()=>setDelTarget(null)} title="Delete Item" size="sm"
        footer={<><button onClick={()=>setDelTarget(null)} className="btn-ghost">Cancel</button><button onClick={handleDelete} className="btn-red">Delete</button></>}>
        {delTarget&&(
          <div className="text-center py-3 space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto"><Trash2 size={22} className="text-red-500" /></div>
            <p className="font-semibold" style={{ color:'var(--text)' }}>Delete "{delTarget.name}"?</p>
            <p className="text-sm" style={{ color:'var(--t3)' }}>This cannot be undone. Sales history will not be affected.</p>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
