import { jsx, jsxs } from 'react/jsx-runtime'
import { ThemeProvider } from 'next-themes'
import { SkipNavLink } from 'nextra/components'
import { z } from 'zod'
import { MobileNav } from 'nextra-theme-docs-layout-internals/components/sidebar.js'
import { LayoutPropsSchema } from 'nextra-theme-docs-layout-internals/schemas.js'
import {
  ConfigProvider,
  ThemeConfigProvider,
} from 'nextra-theme-docs-layout-internals/stores/index.js'

const Layout = (props) => {
  const { data, error } = LayoutPropsSchema.safeParse(props)
  if (error) {
    throw z.prettifyError(error)
  }
  const { footer, navbar, pageMap, nextThemes, banner, children, ...rest } = data

  return jsx(ThemeConfigProvider, {
    value: rest,
    // Nextra's own compiled CSS hardcodes `.dark`-class selectors for its internal
    // component styling, so `class` must stay enabled alongside `data-theme` (used for
    // cross-app consistency with ui/website) — next-themes supports setting both at once.
    children: jsxs(ThemeProvider, {
      attribute: ['class', 'data-theme'],
      ...nextThemes,
      children: [
        jsx(SkipNavLink, {}),
        banner,
        jsxs(ConfigProvider, {
          pageMap,
          navbar,
          footer,
          children: [jsx(MobileNav, {}), children],
        }),
      ],
    }),
  })
}

export { Layout }
