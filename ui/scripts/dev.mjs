import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')

const uiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.join(uiDir, '..')

loadEnvConfig(repoRoot)

const nextBin = path.join(repoRoot, 'node_modules/next/dist/bin/next')
const child = spawn(process.execPath, [nextBin, 'dev', '--port', '3001'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '' },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
