'use client'
// components/Modal.tsx
import { useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'

const SIZES = { sm:'max-w-md', md:'max-w-xl', lg:'max-w-3xl', xl:'max-w-5xl' }

export default function Modal({ open, onClose, title, children, size='md', footer }:
  { open:boolean; onClose:()=>void; title?:string; children:ReactNode; size?:'sm'|'md'|'lg'|'xl'; footer?:ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const esc = (e:KeyboardEvent) => { if (e.key==='Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow=''; window.removeEventListener('keydown',esc) }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full flex flex-col max-h-[90vh] rounded-2xl border animate-slide-up shadow-modal', SIZES[size])}
        style={{ background:'var(--bg-card)', borderColor:'var(--border-md)' }}>
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor:'var(--border)' }}>
            <h2 className="display font-bold text-[15px]" style={{ color:'var(--text)' }}>{title}</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg btn-sm"><X size={15} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor:'var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
