#!/usr/bin/env node
/**
 * First-time local setup: copy .env, install deps, start Postgres, migrate.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
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

const envExample = path.join(root, '.env.example')
const envFile = path.join(root, '.env')

if (!fs.existsSync(envFile)) {
  if (!fs.existsSync(envExample)) {
    console.error('Missing .env.example — cannot create .env')
    process.exit(1)
  }
  fs.copyFileSync(envExample, envFile)
  console.log('Created .env from .env.example — edit secrets before production use')
} else {
  console.log('.env already exists — leaving it unchanged')
}

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

Edit .env if you still have placeholder secrets.
`)
