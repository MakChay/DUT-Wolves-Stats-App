import path from 'node:path'
import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { plaintextEnvPath, secureEnvDir } from './scripts/lib/secure-env.mjs'

// Local secrets are unlocked outside the repo. CI/Vercel supply env vars directly.
const secureEnvAvailable = existsSync(plaintextEnvPath())

// https://vite.dev/config/
export default defineConfig({
  envDir: secureEnvAvailable ? secureEnvDir() : undefined,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
