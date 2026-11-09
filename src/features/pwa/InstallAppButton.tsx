import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  const install = async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } catch (error) {
      console.error('DUT Wolves Stats could not start app installation.', error)
    }
  }

  if (!installPrompt) return null

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => void install()}
      className="px-2 sm:px-3"
      aria-label="Install DUT Wolves Stats"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Install app</span>
    </Button>
  )
}
