'use client'
// app/login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Flame, Eye, EyeOff, Lock, Mail, AlertCircle, ShoppingCart, Boxes, BarChart3, BellRing, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('')

    if (!email || !pw) {
      setError('Fill all fields')
      return
    }

    setBusy(true)
    try {
      await login(email, pw)
      router.replace('/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  const features = [
    { title: 'Smart POS', desc: 'Fast and easy checkout for your customers.', icon: ShoppingCart },
    { title: 'Inventory', desc: 'Real-time stock tracking and management.', icon: Boxes },
    { title: 'Analytics', desc: 'Sales & profit insights for better decisions.', icon: BarChart3 },
    { title: 'Alerts', desc: 'Low-stock notifications and reminders.', icon: BellRing },
  ]

  return (
    <div className="min-h-screen overflow-hidden relative" style={{ background: 'radial-gradient(circle at 10% 0%, #172033 0%, #0a101b 45%, #070c14 100%)' }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 5% 80%, rgba(249,115,22,.28) 0%, rgba(249,115,22,0) 28%), radial-gradient(circle at 100% 0%, rgba(249,115,22,.18) 0%, rgba(249,115,22,0) 26%)',
        }}
      />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <section className="relative min-h-[320px] sm:min-h-[420px] lg:min-h-screen overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(110deg, rgba(6,11,20,.82), rgba(6,11,20,.42)), url(https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1800&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-[#060b14]/30" />
          <div className="absolute -left-16 -bottom-20 h-56 w-[130%] rounded-[100%] border border-orange-500/35" />
          <div className="absolute -right-24 -top-28 h-72 w-[75%] rounded-[100%] border border-orange-500/25" />

          <div className="relative h-full p-5 sm:p-8 lg:p-12 flex flex-col">
            <div className="inline-flex items-center gap-3 w-fit rounded-2xl px-4 py-3 border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_10px_28px_rgba(249,115,22,.35)]">
                <Flame size={22} className="text-white" />
              </div>
              <div>
                <p className="display text-3xl sm:text-4xl font-bold leading-none text-white">
                  Elai<span className="text-orange-500">POS</span>
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 max-w-xl">
              <h1 className="display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white">
                Bodega wholesale and retail
                <br />
                POS &amp; Inventory Management
              </h1>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-200/90 max-w-md">
                Smart and simple solution for your
                <br className="hidden sm:block" /> bodega, wholesale and retail business.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/15 bg-slate-900/35 backdrop-blur-md p-4 shadow-[0_10px_28px_rgba(0,0,0,.25)]"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    <feature.icon size={16} />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{feature.title}</p>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 hidden lg:flex items-center gap-4 text-slate-300/90">
              <ShoppingCart size={26} className="text-orange-400" />
              <p className="text-2xl leading-none">|</p>
              <p className="text-sm tracking-wide">
                Bodega wholesale and retail POS &amp; Inventory Management
                <br />
                <span className="mono text-xs text-slate-400">BETTER INVENTORY. BIGGER PROFITS.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="w-full max-w-xl">
            <div className="relative rounded-[28px] border border-white/10 bg-slate-900/45 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,.45)] p-5 sm:p-7 lg:p-10">
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-36 w-56 rounded-full bg-orange-500/18 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_10px_30px_rgba(249,115,22,.35)]">
                  <Flame size={22} className="text-white" />
                </div>
                <h2 className="display text-4xl font-bold leading-none text-white">
                  Elai<span className="text-orange-500">POS</span>
                </h2>
              </div>

              <div className="relative z-10 mt-6">
                <h3 className="display text-3xl sm:text-4xl font-bold text-white">Welcome back 👋</h3>
                <p className="mt-2 text-base text-slate-300">
                  Sign in to your ElaiPOS account
                  <br className="hidden sm:block" /> to continue to your dashboard.
                </p>
              </div>

              <form onSubmit={handle} className="relative z-10 mt-7 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-2xl border border-white/15 bg-slate-800/60 text-white placeholder:text-slate-400 pl-12 pr-4 py-3.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25 transition-all"
                      disabled={busy}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/15 bg-slate-800/60 text-white placeholder:text-slate-400 pl-12 pr-12 py-3.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25 transition-all"
                      disabled={busy}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="inline-flex items-center gap-2.5 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-900 text-orange-500 focus:ring-orange-500/30"
                    />
                    Remember me
                  </label>
                  <a href="mailto:itsupport@gmail.com" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 font-semibold text-white shadow-[0_12px_26px_rgba(249,115,22,.35)] hover:brightness-110 active:scale-[.99] disabled:opacity-65 disabled:cursor-not-allowed transition-all"
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="relative z-10 my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/15" />
                <span className="text-xs font-medium text-slate-400">OR</span>
                <div className="h-px flex-1 bg-white/15" />
              </div>

              <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-800/45 px-4 py-4 text-sm text-slate-300">
                <p>© 2026&nbsp; Developed by Julius Ferrer.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
