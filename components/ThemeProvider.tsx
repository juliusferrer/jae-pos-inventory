'use client'
// components/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
type Theme = 'dark'|'light'
const Ctx = createContext<{ theme:Theme; toggle:()=>void }>({ theme:'dark', toggle:()=>{} })

export function ThemeProvider({ children }:{ children:ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    const s = (localStorage.getItem('szl-theme') as Theme) || 'dark'
    setTheme(s); document.documentElement.classList.toggle('dark', s==='dark')
  }, [])
  const toggle = () => setTheme(t => {
    const n = t==='dark'?'light':'dark'
    localStorage.setItem('szl-theme', n)
    document.documentElement.classList.toggle('dark', n==='dark')
    return n
  })
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
