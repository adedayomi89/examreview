// Kept deliberately simple: the goal is installability (so students/admins
// can "Add to Home Screen") plus a bit of static-asset caching for speed.
// It intentionally does NOT intervene in page navigations — every earlier
// version of this file that tried to serve a cached fallback for
// navigation requests risked returning `undefined` instead of a real
// Response when the cache lookup missed, which crashes the page load with
// "Failed to convert value to 'Response'". Simplicity here is a feature.

const CACHE_NAME = 'cor-exams-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

// Never touch navigations (loading a page/route) or cross-origin requests
// (Supabase, Google Fonts, etc) — only opportunistically cache same-origin
// static assets like JS/CSS bundles and icons, and always fall back to a
// normal network fetch if anything about the cache goes wrong.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.mode === 'navigate') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => cached || fetch(request))
    })
  )
})
