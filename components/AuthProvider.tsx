'use client'
// components/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthCtx {
  user: { uid:string; email:string; name:string } | null
  loading: boolean
  login:  (e:string, p:string) => Promise<void>
  logout: () => Promise<void>
}
const Ctx = createContext<AuthCtx>({ user:null, loading:true, login:async()=>{}, logout:async()=>{} })

export function AuthProvider({ children }: { children:ReactNode }) {
  const [user, setUser]     = useState<AuthCtx['user']>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => onAuthStateChanged(auth, fb => {
    setUser(fb ? { uid:fb.uid, email:fb.email!, name:fb.displayName??'Admin' } : null)
    setLoading(false)
  }), [])
  return <Ctx.Provider value={{ user, loading,
    login: async(e,p) => { await signInWithEmailAndPassword(auth,e,p) },
    logout: async() => { await signOut(auth) }
  }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
