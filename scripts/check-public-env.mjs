/**
 * Fail the build if a private environment value leaks into public sources or
 * generated output. VITE_FIREBASE_* web config is intentionally public and is
 * excluded; SEED_*, admin, password, token and secret values are not.
 */
import fs from 'node:fs'
import path from 'node:path'
import { REPO_ROOT, loadSecureEnv } from './lib/secure-env.mjs'

const env = loadSecureEnv()
const privateEntries = Object.entries(env).filter(
  ([name, value]) =>
    value &&
    value.length >= 8 &&
    !name.startsWith('VITE_') &&
    /(PASSWORD|SECRET|TOKEN|ADMIN|SEED_|PRIVATE_KEY|CLIENT_EMAIL)/i.test(name),
)

const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx', '.html', '.json', '.css', '.map'])
const roots = ['src', 'public', 'dist', 'index.html'].map((entry) => path.join(REPO_ROOT, entry))

function walk(target, output = []) {
  if (!fs.existsSync(target)) return output
  const stat = fs.statSync(target)
  if (stat.isFile()) {
    output.push(target)
    return output
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    walk(path.join(target, entry.name), output)
  }
  return output
}

const files = roots.flatMap((root) => walk(root)).filter((file) => extensions.has(path.extname(file)))
const findings = []
const forbiddenImport = /import\.meta\.env\.(SEED_|FIREBASE_ADMIN_|[A-Z_]*PASSWORD|[A-Z_]*SECRET)/

for (const file of files) {
  let content
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }

  if (forbiddenImport.test(content)) {
    findings.push({ variable: 'private env referenced in client source', file: path.relative(REPO_ROOT, file) })
  }

  for (const [name, value] of privateEntries) {
    if (content.includes(value)) {
      findings.push({ variable: name, file: path.relative(REPO_ROOT, file) })
    }
  }
}

if (findings.length > 0) {
  console.error('Private environment values found in public sources or build output:')
  for (const finding of findings) console.error(`  ${finding.file} <- ${finding.variable}`)
  process.exit(1)
}

console.log(`Public env guard passed (${files.length} files checked; values not printed).`)
