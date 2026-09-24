'use client'
// components/AppShell.tsx
import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import clsx from 'clsx'

export default function AppShell({ children }:{ children:React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading])

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background:'var(--bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background:'var(--acc)' }} />
        <p className="mono text-sm" style={{ color:'var(--t3)' }}>Loading SizzlePOS…</p>
      </div>
    </div>
  )
  if (!user) return null

  return (
    <div className="min-h-screen" style={{ background:'var(--bg)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <Topbar collapsed={collapsed} />
      <main className={clsx('transition-all duration-300 pt-[60px]', collapsed ? 'pl-[60px]' : 'pl-[220px]')}>
        <div className="p-6 animate-slide-up">{children}</div>
      </main>
    </div>
  )
}
