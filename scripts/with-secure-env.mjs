/**
 * Run a command with the encrypted env unlocked only for its lifetime.
 *
 * Usage: node scripts/with-secure-env.mjs <command> [args...]
 *
 * The plaintext file is created in the secure directory before the command and
 * removed afterwards in a finally block, so build/dev runs do not leave secrets
 * decrypted on disk.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import {
  decryptText,
  encryptedEnvPath,
  plaintextEnvPath,
  removePlaintext,
  writePlaintext,
} from './lib/secure-env.mjs'

const commandLine = process.argv.slice(2).join(' ')
if (!commandLine) throw new Error('No command supplied.')

let relock = false
let exitCode = 1

try {
  if (!existsSync(plaintextEnvPath()) && existsSync(encryptedEnvPath())) {
    writePlaintext(decryptText(readFileSync(encryptedEnvPath(), 'utf8')))
    relock = true
  }
  const result = spawnSync(commandLine, {
    shell: true,
    stdio: 'inherit',
    windowsHide: true,
  })
  exitCode = result.status ?? 1
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Secure env command failed.')
} finally {
  if (relock && existsSync(plaintextEnvPath())) removePlaintext()
}

process.exit(exitCode)
