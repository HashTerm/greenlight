import nextra from 'nextra'

const withNextra = nextra({
  search: true,
  defaultShowCopyCode: true,
})

export default withNextra({
  output: 'standalone',
  transpilePackages: ['@greenlight/theme'],
})
