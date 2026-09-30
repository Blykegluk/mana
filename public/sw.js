/* Service worker Mana — réseau d'abord, cache en secours (usage hors-ligne en magasin). */
const CACHE = 'mana-v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin) return
  // La page elle-même est toujours revalidée auprès du serveur : c'est elle qui désigne
  // les scripts de la dernière version publiée.
  const requete = event.request.mode === 'navigate' ? new Request(event.request.url, { cache: 'no-cache' }) : event.request
  event.respondWith(
    fetch(requete)
      .then((reponse) => {
        const copie = reponse.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copie))
        return reponse
      })
      .catch(() =>
        caches.match(event.request).then(
          (enCache) =>
            enCache ??
            (event.request.mode === 'navigate' ? caches.match('./portail.html') : Response.error()),
        ),
      ),
  )
})
