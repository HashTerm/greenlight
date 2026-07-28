import { jsx, jsxs } from 'react/jsx-runtime'
import { ThemeProvider } from '@greenlight/theme'
import { SkipNavLink } from 'nextra/components'
import { z } from 'zod'
import { MobileNav } from 'nextra-theme-docs-layout-internals/components/sidebar.js'
import { LayoutPropsSchema } from 'nextra-theme-docs-layout-internals/schemas.js'
import {
  ConfigProvider,
  ThemeConfigProvider,
} from 'nextra-theme-docs-layout-internals/stores/index.js'

const docsThemeConfig = {
  enableClassAttribute: true,
}

const Layout = (props) => {
  const { data, error } = LayoutPropsSchema.safeParse(props)
  if (error) {
    throw z.prettifyError(error)
  }
  const { footer, navbar, pageMap, banner, children, ...rest } = data

  return jsx(ThemeConfigProvider, {
    value: rest,
    // Nextra's compiled CSS hardcodes `.dark`-class selectors, so we toggle `class="dark"`
    // alongside `data-theme` for cross-app consistency with ui/website.
    children: jsxs(ThemeProvider, {
      config: docsThemeConfig,
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
