import type { ReactNode } from 'react'
import Image from 'next/image'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import 'nextra-theme-docs/style.css'
import './theme.css'
import './logo.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
})

const siteUrl = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Greenlight Docs',
    template: '%s | Greenlight Docs',
  },
  description:
    'Self-host guides, agent integration, platform setup, and API reference for Greenlight.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

const logo = (
  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Image
      className="docs-logo-mark--dark"
      src="/logo/greenlight-mark-dark.svg"
      alt="Greenlight"
      width={28}
      height={28}
      priority
    />
    <Image
      className="docs-logo-mark--light"
      src="/logo/greenlight-mark-light.svg"
      alt="Greenlight"
      width={28}
      height={28}
      priority
    />
    <b>Greenlight</b>
  </span>
)

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap()

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${GeistMono.variable}`}
    >
      <Head color={{ hue: 148.5, saturation: 89.4, lightness: 40.6 }} />
      <body suppressHydrationWarning>
        <Layout
          navbar={<Navbar logo={logo} projectLink="https://github.com/greenlight/greenlight" />}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/greenlight/greenlight/tree/main/docs-site"
          footer={<Footer>BUSL-1.1 2026 © Greenlight.</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
