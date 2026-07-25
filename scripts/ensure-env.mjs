#!/usr/bin/env node
/**
 * Create .env or .env.self-host from the matching example with generated secrets.
 * Never modifies *.example files. Skips if the output already exists.
 *
 * Usage:
 *   node scripts/ensure-env.mjs
 *   node scripts/ensure-env.mjs --profile dev
 *   node scripts/ensure-env.mjs --profile self-host
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const PROFILES = {
  dev: {
    example: '.env.example',
    output: '.env',
    mirror: true,
  },
  'self-host': {
    example: '.env.self-host.example',
    output: '.env.self-host',
    mirror: false,
  },
}

const PLACEHOLDER_RE = /^(replace-with-.+|change-me-strong)$/

function parseArgs(argv) {
  let profile = 'dev'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--profile') {
      const value = argv[++i]
      if (!value || value.startsWith('-')) {
        console.error('Missing value for --profile (expected dev|self-host)')
        process.exit(1)
      }
      profile = value
    } else if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length)
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/ensure-env.mjs [--profile dev|self-host]

Profiles:
  dev         .env.example → .env (default)
  self-host   .env.self-host.example → .env.self-host
`)
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
  }
  return profile
}

function secret() {
  return crypto.randomBytes(32).toString('hex')
}

function isPlaceholder(value) {
  return PLACEHOLDER_RE.test(value)
}

/**
 * @param {string} content
 * @param {{ mirror: boolean }} options
 */
function fillSecrets(content, { mirror }) {
  /** @type {Map<string, string>} */
  const generated = new Map()

  const lines = content.split('\n').map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) return line

    const [, key, rawValue] = match
    if (!isPlaceholder(rawValue)) return line

    let value = generated.get(key)
    if (!value) {
      value = secret()
      generated.set(key, value)
    }
    return `${key}=${value}`
  })

  if (!mirror) {
    return lines.join('\n')
  }

  const apiKey = generated.get('API_KEY')
  const adminToken = generated.get('ADMIN_INTERNAL_TOKEN')

  return lines
    .map((line) => {
      if (apiKey && line.startsWith('GREENLIGHT_API_KEY=')) {
        return `GREENLIGHT_API_KEY=${apiKey}`
      }
      if (adminToken && line.startsWith('GREENLIGHT_ADMIN_TOKEN=')) {
        return `GREENLIGHT_ADMIN_TOKEN=${adminToken}`
      }
      return line
    })
    .join('\n')
}

const profileName = parseArgs(process.argv.slice(2))
const profile = PROFILES[profileName]
if (!profile) {
  console.error(`Unknown profile "${profileName}". Use: ${Object.keys(PROFILES).join(', ')}`)
  process.exit(1)
}

const examplePath = path.join(root, profile.example)
const outputPath = path.join(root, profile.output)

if (fs.existsSync(outputPath)) {
  console.log(`${profile.output} already exists — leaving it unchanged`)
  process.exit(0)
}

if (!fs.existsSync(examplePath)) {
  console.error(`Missing ${profile.example} — cannot create ${profile.output}`)
  process.exit(1)
}

const filled = fillSecrets(fs.readFileSync(examplePath, 'utf8'), {
  mirror: profile.mirror,
})
fs.writeFileSync(outputPath, filled, { mode: 0o600 })
console.log(`Created ${profile.output} from ${profile.example} with generated secrets`)
