import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from 'next-themes'
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
      <body className="min-h-full w-full antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
