import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

const uiDir =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// Load root .env so hybrid npm dev shares secrets with core / compose
loadEnvConfig(path.join(uiDir, '..'))

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@greenlight/theme'],
}

export default nextConfig
