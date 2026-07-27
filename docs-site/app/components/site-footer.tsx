import Image from 'next/image'
import Link from 'next/link'

import { getGithubRepoURL, getWebsiteURL } from '../utilities/getWebsiteURL'
import { ThemeSelector } from './theme-selector'

type FooterColumn = {
  title: string
  links: { label: string; href: string; newTab?: boolean }[]
}

const websiteUrl = getWebsiteURL()

const columns: FooterColumn[] = [
  {
    title: 'Documentation',
    links: [
      { label: 'Quickstart', href: '/getting-started/quickstart' },
      { label: 'Concepts', href: '/getting-started/concepts' },
      { label: 'API Reference', href: '/api-reference' },
      { label: 'Self-Hosting', href: '/self-hosting/docker' },
    ],
  },
  {
    title: 'Platforms',
    links: [
      { label: 'Overview', href: '/platforms' },
      { label: 'Telegram', href: '/platforms/telegram' },
      { label: 'Slack', href: '/platforms/slack' },
      { label: 'Discord', href: '/platforms/discord' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', href: getGithubRepoURL(), newTab: true },
      { label: 'Contributing', href: '/legal/contributing' },
      { label: 'Website', href: websiteUrl, newTab: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Licensing', href: '/legal/licensing' },
      { label: 'Credits', href: '/legal/credits' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <div className="site-footer-columns">
          {columns.map((column) => (
            <div className="site-footer-column" key={column.title}>
              <p className="site-footer-column-title">{column.title}</p>
              <ul className="site-footer-column-links">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      className="site-footer-link"
                      href={item.href}
                      {...(item.newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer-bar">
          <Link className="site-footer-brand" href="/">
            <Image
              alt="Greenlight"
              className="docs-logo-mark--dark"
              height={28}
              priority
              src="/logo/greenlight-mark-dark.svg"
              width={28}
            />
            <Image
              alt="Greenlight"
              className="docs-logo-mark--light"
              height={28}
              priority
              src="/logo/greenlight-mark-light.svg"
              width={28}
            />
            <b>Greenlight</b>
          </Link>
          <p className="site-footer-copyright">2026 © Greenlight.</p>
          <ThemeSelector />
        </div>
      </div>
    </footer>
  )
}
