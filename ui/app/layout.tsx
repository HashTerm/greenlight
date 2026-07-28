import { Toaster } from '@/components/toaster'
import type { Metadata } from 'next'
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { InitTheme, ThemeProvider } from '@greenlight/theme'
import { cn } from '@/lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Greenlight Admin',
  description: 'Admin UI for Greenlight multi-platform gateway',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn('h-full', 'font-sans', plusJakartaSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
      </head>
      <body className="min-h-full w-full antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
