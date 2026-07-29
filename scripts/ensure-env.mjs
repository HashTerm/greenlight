#!/usr/bin/env node
/**
 * Create .env or .env.self-host from the matching example with generated secrets.
 * Never modifies *.example files.
 *
 * For the dev profile, also syncs GREENLIGHT_* vars into an existing .env so hybrid
 * npm run dev can reach core (GREENLIGHT_API_KEY must match API_KEY for bootstrap).
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

/** UI hybrid dev vars must match core secrets. */
const DEV_MIRRORS = {
  GREENLIGHT_API_KEY: 'API_KEY',
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
  dev         .env.example → .env (default); syncs GREENLIGHT_* into existing .env
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
 * @returns {Map<string, string>}
 */
function parseEnv(content) {
  /** @type {Map<string, string>} */
  const values = new Map()
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) {
      values.set(match[1], match[2])
    }
  }
  return values
}

/**
 * @param {string} content
 * @param {string} key
 * @param {string} value
 */
function setEnvValue(content, key, value) {
  const prefix = `${key}=`
  const lines = content.split('\n')
  let found = false

  const updated = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })

  if (!found) {
    if (updated.length > 0 && updated[updated.length - 1] !== '') {
      updated.push('')
    }
    updated.push(`# Admin UI (hybrid npm run dev)`)
    updated.push(`${key}=${value}`)
  }

  return updated.join('\n')
}

/**
 * Ensure GREENLIGHT_* vars exist and match core secrets for hybrid dev.
 *
 * @param {string} outputPath
 * @param {string} examplePath
 * @returns {boolean} whether the file was updated
 */
function syncHybridEnv(outputPath, examplePath) {
  let content = fs.readFileSync(outputPath, 'utf8')
  const values = parseEnv(content)
  const exampleValues = parseEnv(fs.readFileSync(examplePath, 'utf8'))
  let changed = false

  for (const [uiKey, coreKey] of Object.entries(DEV_MIRRORS)) {
    const coreValue = values.get(coreKey)
    if (!coreValue || isPlaceholder(coreValue)) continue

    const current = values.get(uiKey)
    if (current !== coreValue) {
      content = setEnvValue(content, uiKey, coreValue)
      values.set(uiKey, coreValue)
      changed = true
    }
  }

  const exampleApiUrl = exampleValues.get('GREENLIGHT_API_URL')
  if (exampleApiUrl && !values.get('GREENLIGHT_API_URL')) {
    content = setEnvValue(content, 'GREENLIGHT_API_URL', exampleApiUrl)
    changed = true
  }

  if (changed) {
    fs.writeFileSync(outputPath, content, { mode: 0o600 })
  }

  return changed
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

    const mirrorFrom = mirror ? DEV_MIRRORS[key] : undefined
    if (mirrorFrom) {
      const mirrored = generated.get(mirrorFrom)
      if (mirrored) {
        generated.set(key, mirrored)
        return `${key}=${mirrored}`
      }
    }

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

  return lines
    .map((line) => {
      if (apiKey && line.startsWith('GREENLIGHT_API_KEY=')) {
        return `GREENLIGHT_API_KEY=${apiKey}`
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

if (!fs.existsSync(examplePath)) {
  console.error(`Missing ${profile.example} — cannot create ${profile.output}`)
  process.exit(1)
}

if (fs.existsSync(outputPath)) {
  if (profile.mirror) {
    const updated = syncHybridEnv(outputPath, examplePath)
    if (updated) {
      console.log(`Updated ${profile.output} — synced GREENLIGHT_* vars for hybrid dev`)
    } else {
      console.log(`${profile.output} already exists — hybrid env vars OK`)
    }
  } else {
    console.log(`${profile.output} already exists — leaving it unchanged`)
  }
  process.exit(0)
}

const filled = fillSecrets(fs.readFileSync(examplePath, 'utf8'), {
  mirror: profile.mirror,
})
fs.writeFileSync(outputPath, filled, { mode: 0o600 })
console.log(`Created ${profile.output} from ${profile.example} with generated secrets`)
