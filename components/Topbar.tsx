'use client'
// components/Topbar.tsx
import { usePathname } from 'next/navigation'
import { Bell, Sun, Moon, Search } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'

const TITLES: Record<string,string> = {
  '/dashboard':'Dashboard','/pos':'Point of Sale','/menu-management':'Product Management',
  '/inventory':'Inventory','/sales':'Sales Records','/reports':'Reports',
}

export default function Topbar({ collapsed }:{ collapsed:boolean }) {
  const { theme, toggle } = useTheme()
  const pathname = usePathname()
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t) },[])
  return (
    <header className={clsx('fixed top-0 right-0 z-20 h-[60px] flex items-center justify-between px-6 border-b transition-all duration-300', collapsed ? 'left-[60px]' : 'left-[220px]')}
      style={{ background:'var(--bg-card)', borderColor:'var(--border)' }}>
      <div>
        <h1 className="display font-bold text-[17px]" style={{ color:'var(--text)' }}>{TITLES[pathname] ?? 'SizzlePOS'}</h1>
        <p className="mono text-[9px] mt-0.5" style={{ color:'var(--t3)' }}>{format(now,'EEEE, MMM d yyyy · hh:mm:ss aa')}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="relative hidden md:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
          <input placeholder="Search…" className="input-sm pl-9 w-40 text-xs" />
        </div>
        <button onClick={toggle} className="w-9 h-9 rounded-xl flex items-center justify-center border"
          style={{ borderColor:'var(--border-md)', background:'var(--bg-hover)' }}>
          {theme==='dark' ? <Sun size={15} style={{ color:'var(--t2)' }} /> : <Moon size={15} style={{ color:'var(--t2)' }} />}
        </button>
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center border"
          style={{ borderColor:'var(--border-md)', background:'var(--bg-hover)' }}>
          <Bell size={15} style={{ color:'var(--t2)' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
