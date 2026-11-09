const CACHE_NAME = 'dut-wolves-shell-v5'
const CACHE_PREFIX = 'dut-wolves-'
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/social-card.jpg',
  '/icons/favicon-32.png',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-512.png',
  '/icons/pwa-monochrome-512.png',
  '/icons/apple-touch-icon.png',
  '/brand/wolves-on-dark.png',
  '/brand/wolves-on-light.png',
  '/media/dut-wolves-men.webp',
  '/media/dut-wolves-women.webp',
  '/media/dut-wolves-women-squad.webp',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const offlinePage = await cache.match('/offline.html')
        return offlinePage ?? Response.error()
      }),
    )
    return
  }

  if (['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ??
            fetch(request).then((response) => {
              if (response.ok && response.type === 'basic') {
                const copy = response.clone()
                void cache.put(request, copy)
              }
              return response
            }),
        ),
      ),
    )
  }
})
