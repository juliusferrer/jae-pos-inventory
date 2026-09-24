'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, Package, ClipboardList, BarChart3, LogOut, Flame, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href:'/dashboard',       label:'Dashboard',       icon:LayoutDashboard },
  { href:'/pos',             label:'Point of Sale',   icon:ShoppingCart },
  { href:'/menu-management', label:'Product Management', icon:UtensilsCrossed },
  { href:'/inventory',       label:'Inventory',       icon:Package },
  { href:'/sales',           label:'Sales Records',   icon:ClipboardList },
  { href:'/reports',         label:'Reports',         icon:BarChart3 },
]

export default function Sidebar({ collapsed, onToggle }:{ collapsed:boolean; onToggle:()=>void }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  return (
    <aside className={clsx('fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 border-r',
      collapsed ? 'w-[60px]' : 'w-[220px]')}
      style={{ background:'var(--bg-card)', borderColor:'var(--border)' }}>

      {/* Logo */}
      <div className={clsx('flex items-center gap-3 py-5 border-b', collapsed ? 'px-3 justify-center' : 'px-5')}
        style={{ borderColor:'var(--border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:'var(--acc)', boxShadow:'0 2px 12px rgba(249,115,22,.4)' }}>
          <Flame size={15} className="text-white" />
        </div>
        {!collapsed && <div>
          <p className="display font-bold text-[14px] leading-none" style={{ color:'var(--text)' }}>ElaiPOS</p>
          <p className="mono text-[9px] mt-0.5" style={{ color:'var(--t3)' }}>ERP SYSTEM</p>
        </div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {!collapsed && <p className="label px-1 mb-2">Navigation</p>}
        {NAV.map(item => {
          const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
          return (
            <Link key={item.href} href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx('nav-link', active && 'active', collapsed && 'justify-center px-0 py-3')}>
              <item.icon size={15} className="flex-shrink-0" />
              {!collapsed && <><span className="flex-1 text-[13px]">{item.label}</span>{active && <ChevronRight size={12} />}</>}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor:'var(--border)' }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2" style={{ background:'var(--bg-hover)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background:'var(--acc-dim)', color:'var(--acc)', border:'1px solid var(--acc-bdr)' }}>
              {user.name?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color:'var(--text)' }}>{user.name}</p>
              <p className="text-[10px]" style={{ color:'var(--t3)' }}>Administrator</p>
            </div>
          </div>
        )}
        <button onClick={logout} className={clsx('nav-link w-full text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600', collapsed && 'justify-center px-0 py-2.5')}>
          <LogOut size={14} />{!collapsed && 'Sign out'}
        </button>
        <button onClick={onToggle} className={clsx('nav-link w-full text-[12px]', collapsed && 'justify-center px-0 py-2')}>
          <ChevronRight size={12} className={clsx('transition-transform', collapsed ? '' : 'rotate-180')} />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
