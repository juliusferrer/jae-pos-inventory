import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'ElaiPOS — Restaurant ERP',
  description: 'Restaurant POS + Inventory ERP System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" toastOptions={{
              style: {
                background: 'var(--bg-card)', color: 'var(--text)',
                border: '1px solid var(--border-md)', borderRadius: '12px',
                fontFamily: 'Inter,sans-serif', fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
