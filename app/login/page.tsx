'use client'
// app/login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Flame, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => { if (!loading && user) router.replace('/dashboard') }, [user, loading])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!email || !pw) { setError('Fill all fields'); return }
    setBusy(true)
    try { await login(email, pw); router.replace('/dashboard') }
    catch { setError('Invalid email or password.') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background:'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] flex-col items-center justify-center relative overflow-hidden bg-dark-900">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage:'linear-gradient(rgba(249,115,22,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-15"
          style={{ background:'var(--acc)', filter:'blur(80px)' }} />
        <div className="relative z-10 px-12 text-center space-y-6 max-w-sm">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background:'var(--acc)', boxShadow:'0 8px 32px rgba(249,115,22,.5)' }}>
              <Flame size={36} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="display font-bold text-4xl text-white">ElaiPOS</h1>
            <p className="text-gray-400 mt-2 text-base">Restaurant ERP with Inventory Management</p>
          </div>
          <div className="acc-line" />
          <div className="grid grid-cols-2 gap-3 text-left">
            {[['🛒','Smart POS','Auto inventory deduction'],['📦','Inventory','Recipe-based tracking'],['📊','Analytics','Revenue & profit charts'],['⚠️','Alerts','Low stock notifications']].map(([e,t,d]) => (
              <div key={t} className="p-3 rounded-xl" style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)' }}>
                <p className="text-base mb-1">{e}</p>
                <p className="text-sm font-semibold text-white">{t}</p>
                <p className="text-xs text-gray-400 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'var(--acc)' }}>
                <Flame size={16} className="text-white" />
              </div>
              <span className="display font-bold text-xl" style={{ color:'var(--text)' }}>SizzlePOS</span>
            </div>
            <h2 className="display font-bold text-2xl" style={{ color:'var(--text)' }}>Admin Sign In</h2>
            <p className="text-sm mt-1" style={{ color:'var(--t3)' }}>Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="label block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@sizzle.ph" className="input pl-10" disabled={busy} />
              </div>
            </div>
            <div>
              <label className="label block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }} />
                <input type={showPw?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" disabled={busy} />
                <button type="button" onClick={()=>setShowPw(p=>!p)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--t3)' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-sizzle w-full justify-center py-3 text-[15px] mt-2">
              {busy ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl border text-sm" style={{ background:'var(--bg-hover)', borderColor:'var(--border)' }}>
            <p className="label mb-2">Demo Account</p>
            <p style={{ color:'var(--t3)' }}>admin@sizzle.ph / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
