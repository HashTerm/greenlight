import { InitTheme } from '@greenlight/theme'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Layout } from '../lib/nextra-layout.js'
import { Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import 'nextra-theme-docs/style.css'
import './theme.css'
import './logo.css'
import { SiteFooter } from './components/site-footer'
import { SidebarToggle } from './components/sidebar-toggle'
import { getDocsURL, getWebsiteURL } from './utilities/getWebsiteURL'

export const dynamic = 'force-dynamic'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
})

export async function generateMetadata() {
  return {
    metadataBase: new URL(getDocsURL()),
    title: {
      default: 'Greenlight Docs — Human approval for AI agents, over chat',
      template: '%s | Greenlight Docs',
    },
    description:
      'Self-host guides, agent integration, platform setup, and API reference for Greenlight.',
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    },
  }
}

// Rendered with `logoLink={false}` below and our own inner <Link> (instead of letting
// Nextra wrap the whole `logo` node in an <a>), so the sidebar toggle button can sit next
// to the wordmark as a sibling rather than being nested inside an anchor.
const logo = (
  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Link
      aria-label="Home page"
      className="x:flex x:items-center x:gap-2 x:focus-visible:nextra-focus"
      href="/"
    >
      <Image
        className="docs-logo-mark--dark docs-navbar-logo-mark"
        src="/logo/greenlight-mark-dark.svg"
        alt="Greenlight"
        width={40}
        height={40}
        priority
      />
      <Image
        className="docs-logo-mark--light docs-navbar-logo-mark"
        src="/logo/greenlight-mark-light.svg"
        alt="Greenlight"
        width={40}
        height={40}
        priority
      />
      <b className="docs-navbar-wordmark">Greenlight Docs</b>
    </Link>
    <SidebarToggle />
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
      <Head color={{ hue: 148.5, saturation: 89.4, lightness: 40.6 }}>
        <InitTheme config={{ enableClassAttribute: true }} />
      </Head>
      <body suppressHydrationWarning>
        <Layout
          navbar={
            <Navbar
              logo={logo}
              logoLink={false}
              projectLink="https://github.com/HashTerm/greenlight"
            >
              <Link className="docs-nav-website-link" href={getWebsiteURL()}>
                Website
              </Link>
            </Navbar>
          }
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/HashTerm/greenlight/tree/main/docs-site"
          footer={<SiteFooter />}
          // The sidebar's own collapse-toggle + footer bar is replaced by our
          // `<SidebarToggle>` next to the navbar logo (see `logo` above and
          // `docs-sidebar-collapsed` styles in theme.css). `darkMode: false` additionally
          // suppresses Nextra's built-in theme switch, which would otherwise keep this
          // footer bar around on its own (we already have <ThemeSelector> in <SiteFooter>).
          darkMode={false}
          sidebar={{ toggleButton: false }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
