/**
 * Manage the encrypted local environment store.
 *
 *   npm run env:migrate  move repo .env.local into the secure store and encrypt it
 *   npm run env:unlock   decrypt .env.local.enc into the secure store for dev
 *   npm run env:lock     encrypt and remove the plaintext copy
 *   npm run env:verify   confirm the encrypted blob can be decrypted (no values printed)
 *   npm run env:status   show file state only (no values printed)
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  REPO_ROOT,
  encryptedEnvPath,
  legacyEnvPath,
  plaintextEnvPath,
  decryptText,
  envStatus,
  parseEnv,
  removeLegacyFile,
  removePlaintext,
  writeEncrypted,
  writePlaintext,
} from './lib/secure-env.mjs'

const command = process.argv[2] ?? 'status'

function readSource() {
  if (fs.existsSync(plaintextEnvPath())) return fs.readFileSync(plaintextEnvPath(), 'utf8')
  if (fs.existsSync(legacyEnvPath())) return fs.readFileSync(legacyEnvPath(), 'utf8')
  return null
}

switch (command) {
  case 'migrate': {
    if (!fs.existsSync(legacyEnvPath())) {
      console.log('No repo-local .env.local to migrate.')
      break
    }
    if (fs.existsSync(encryptedEnvPath())) {
      throw new Error('Encrypted env already exists. Use env:lock or env:unlock instead.')
    }
    const text = fs.readFileSync(legacyEnvPath(), 'utf8')
    writeEncrypted(text)
    writePlaintext(text)
    removeLegacyFile()
    console.log(
      `Migrated ${path.relative(REPO_ROOT, legacyEnvPath())} outside the repo. ` +
        'Encrypted copy created; plaintext copy unlocked in the secure directory.',
    )
    break
  }

  case 'unlock': {
    if (fs.existsSync(encryptedEnvPath())) {
      writePlaintext(decryptText(fs.readFileSync(encryptedEnvPath(), 'utf8')))
      console.log(`Unlocked encrypted env into ${plaintextEnvPath()}.`)
    } else if (fs.existsSync(legacyEnvPath())) {
      writePlaintext(fs.readFileSync(legacyEnvPath(), 'utf8'))
      removeLegacyFile()
      console.log(`Moved legacy env into ${plaintextEnvPath()}. Run env:lock to encrypt it.`)
    } else {
      throw new Error('No encrypted or legacy environment file found.')
    }
    break
  }

  case 'lock': {
    const source = readSource()
    if (source === null) throw new Error('No plaintext environment file found to lock.')
    writeEncrypted(source)
    removePlaintext()
    removeLegacyFile()
    console.log(`Encrypted env stored at ${encryptedEnvPath()}; plaintext copy removed.`)
    break
  }

  case 'verify': {
    if (!fs.existsSync(encryptedEnvPath())) throw new Error('No encrypted environment file found.')
    const text = decryptText(fs.readFileSync(encryptedEnvPath(), 'utf8'))
    const keys = Object.keys(parseEnv(text))
    console.log(`Encrypted env decrypted successfully (${keys.length} keys; values not printed).`)
    break
  }

  case 'status': {
    console.log(JSON.stringify(envStatus(), null, 2))
    break
  }

  default:
    throw new Error(`Unknown command: ${command}`)
}
