#!/usr/bin/env node
/**
 * First-time local setup: ensure .env with secrets, install deps, start Postgres, migrate.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('Ensuring .env…')
run('node', ['scripts/ensure-env.mjs'])

console.log('Installing npm dependencies…')
run('npm', ['install'])

console.log('Starting Postgres…')
run('npm', ['run', 'infra:up'])

console.log('Waiting for Postgres…')
run('node', ['scripts/wait-for-postgres.mjs'])

console.log('Applying UI migrations…')
run('npm', ['run', 'db:migrate'])

console.log(`
Setup complete.

  npm run dev          # hybrid: Postgres + core + ui + docs (hot reload)
  npm run docker:full  # optional: full containerized stack

  npm run env:ensure -- --profile self-host   # optional: .env.self-host with secrets
`)
