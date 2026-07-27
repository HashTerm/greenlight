'use client'

import { PanelLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'docs-sidebar-collapsed'

/**
 * Replaces nextra-theme-docs' own sidebar collapse button (previously rendered inside
 * the sidebar's own sticky footer bar) with one placed next to the navbar logo. The
 * sidebar's expanded/collapsed state lives in an internal, unexported hook inside
 * nextra-theme-docs, so instead of driving that state we collapse the sidebar entirely
 * via a CSS class on `<html>` (see `.docs-sidebar-collapsed` in theme.css).
 */
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) === '1'
    setCollapsed(stored)
    document.documentElement.classList.toggle('docs-sidebar-collapsed', stored)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('docs-sidebar-collapsed', next)
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <button
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="docs-sidebar-toggle x:max-md:hidden x:focus-visible:nextra-focus"
      onClick={toggle}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      type="button"
    >
      <PanelLeft
        aria-hidden="true"
        className={
          collapsed
            ? 'docs-sidebar-toggle-icon docs-sidebar-toggle-icon--collapsed'
            : 'docs-sidebar-toggle-icon'
        }
      />
    </button>
  )
}
