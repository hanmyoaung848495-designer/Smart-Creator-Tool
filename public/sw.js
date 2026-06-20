self.options = {
    "domain": "5gvci.com",
    "zoneId": 11175466
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple fetch handler is required for PWA installability criteria
  // We can just respond with the network request
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Offline content not available');
  }));
});
