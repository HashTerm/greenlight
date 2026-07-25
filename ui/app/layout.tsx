import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Greenlight Admin',
  description: 'Admin UI for Greenlight multi-platform gateway',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full w-full antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
