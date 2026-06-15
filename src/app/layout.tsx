import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/shared/Providers'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'OpTutor – Future-Ready Learning',
  description: 'Learn technology, AI, math, science and more with live classes and recorded courses.',
  keywords: ['online tutoring', 'AI learning', 'live classes', 'technology education'],
  icons: {
    icon: '/logos/logo-icon.svg',
    shortcut: '/logos/logo-icon.svg',
    apple: '/logos/logo-icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
