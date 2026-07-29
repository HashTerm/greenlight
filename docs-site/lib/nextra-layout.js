import { jsx, jsxs } from 'react/jsx-runtime'
import { ThemeProvider } from '@greenlight/theme'
import { SkipNavLink } from 'nextra/components'
import { z } from '../../node_modules/nextra-theme-docs/node_modules/zod/index.js'
import { MobileNav } from '../../node_modules/nextra-theme-docs/dist/components/sidebar.js'
import { LayoutPropsSchema } from '../../node_modules/nextra-theme-docs/dist/schemas.js'
import {
  ConfigProvider,
  ThemeConfigProvider,
} from '../../node_modules/nextra-theme-docs/dist/stores/index.js'

const docsThemeConfig = {
  enableClassAttribute: true,
}

const Layout = (props) => {
  const { children, ...themeConfig } = props
  const { data, error } = LayoutPropsSchema.safeParse({
    ...themeConfig,
    children: children ?? null,
  })
  if (error) {
    throw z.prettifyError(error)
  }
  const { footer, navbar, pageMap, banner, children: _parsedChildren, ...rest } = data

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
