/**
 * Shared, non-public environment loader.
 *
 * Local secrets live outside the repository in `%LOCALAPPDATA%\dut-wolves-stats\env`.
 * The plaintext `.env.local` is only unlocked on demand; the at-rest copy is
 * encrypted with Windows DPAPI under the current user account, so no encryption
 * passphrase needs to be stored in the repo or in chat.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..')

const PROTECT_SCRIPT =
  '$i=[Console]::In.ReadToEnd().Trim(); Add-Type -AssemblyName System.Security; ' +
  '$p=[System.Security.Cryptography.ProtectedData]::Protect(' +
  '[Convert]::FromBase64String($i),$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); ' +
  '[Convert]::ToBase64String($p)'

const UNPROTECT_SCRIPT =
  '$i=[Console]::In.ReadToEnd().Trim(); Add-Type -AssemblyName System.Security; ' +
  '$p=[System.Security.Cryptography.ProtectedData]::Unprotect(' +
  '[Convert]::FromBase64String($i),$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); ' +
  '[Convert]::ToBase64String($p)'

export function secureEnvDir() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.config')
  return path.join(base, 'dut-wolves-stats', 'env')
}

export function encryptedEnvPath() {
  return path.join(secureEnvDir(), '.env.local.enc')
}

export function plaintextEnvPath() {
  return path.join(secureEnvDir(), '.env.local')
}

export function legacyEnvPath() {
  return path.join(REPO_ROOT, '.env.local')
}

function runPowerShell(script, input) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    input,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error('Windows DPAPI operation failed. Secrets were not printed.')
  }
  return result.stdout.trim()
}

/** Encrypt plaintext env text; returns a base64 DPAPI blob. */
export function encryptText(text) {
  const input = Buffer.from(text, 'utf8').toString('base64')
  return runPowerShell(PROTECT_SCRIPT, input)
}

/** Decrypt a base64 DPAPI blob; returns plaintext env text. */
export function decryptText(blob) {
  const output = runPowerShell(UNPROTECT_SCRIPT, String(blob).trim())
  return Buffer.from(output, 'base64').toString('utf8')
}

export function parseEnv(text) {
  const parsed = {}
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.replace(/^export\s+/, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    let value = match[2].trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1)
    } else {
      const commentIndex = value.indexOf(' #')
      if (commentIndex >= 0) value = value.slice(0, commentIndex).trim()
    }
    parsed[match[1]] = value
  }
  return parsed
}

function readEnvText() {
  if (fs.existsSync(plaintextEnvPath())) {
    return fs.readFileSync(plaintextEnvPath(), 'utf8')
  }
  if (fs.existsSync(encryptedEnvPath())) {
    return decryptText(fs.readFileSync(encryptedEnvPath(), 'utf8'))
  }
  if (fs.existsSync(legacyEnvPath())) {
    return fs.readFileSync(legacyEnvPath(), 'utf8')
  }
  return ''
}

/**
 * Environment for maintenance scripts. Values from the real process environment
 * win over the encrypted file, so CI/Vercel can supply secrets directly.
 */
export function loadSecureEnv() {
  return { ...parseEnv(readEnvText()), ...process.env }
}

export function writePlaintext(text) {
  fs.mkdirSync(secureEnvDir(), { recursive: true })
  fs.writeFileSync(plaintextEnvPath(), text, { mode: 0o600 })
}

export function writeEncrypted(text) {
  fs.mkdirSync(secureEnvDir(), { recursive: true })
  fs.writeFileSync(encryptedEnvPath(), encryptText(text), { mode: 0o600 })
}

export function removePlaintext() {
  if (fs.existsSync(plaintextEnvPath())) fs.unlinkSync(plaintextEnvPath())
}

export function removeLegacyFile() {
  if (fs.existsSync(legacyEnvPath())) fs.unlinkSync(legacyEnvPath())
}

export function envStatus() {
  return {
    secureDir: secureEnvDir(),
    encrypted: fs.existsSync(encryptedEnvPath()),
    plaintextUnlocked: fs.existsSync(plaintextEnvPath()),
    legacyRepoFile: fs.existsSync(legacyEnvPath()),
  }
}
