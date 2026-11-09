import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/features/auth/AuthContext'
import { TeamScopeProvider } from '@/features/teams/TeamScopeContext'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { initAnalytics } from '@/services/firebase/app'

void initAnalytics()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.error('DUT Wolves Stats could not register its service worker.', error)
      })
    },
    { once: true },
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TeamScopeProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </TeamScopeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  const bootScreen = document.getElementById('app-boot')
  if (!bootScreen) return
  bootScreen.classList.add('is-hidden')
  window.setTimeout(() => bootScreen.remove(), 360)
})
