import path from 'path'
import { fileURLToPath } from 'url'
import nextra from 'nextra'

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const themeDocsDir = path.join(projectDir, '../node_modules/nextra-theme-docs/dist')
const layoutAlias = path.join(projectDir, 'lib/nextra-layout.js')

const withNextra = nextra({
  search: true,
  defaultShowCopyCode: true,
})

export default withNextra({
  output: 'standalone',
  transpilePackages: ['@greenlight/theme'],
  turbopack: {
    resolveAlias: {
      'nextra-theme-docs/dist/layout.js': layoutAlias,
      'nextra-theme-docs-layout-internals': themeDocsDir,
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'nextra-theme-docs/dist/layout.js': layoutAlias,
      'nextra-theme-docs-layout-internals': themeDocsDir,
    }
    return config
  },
})
