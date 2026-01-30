// Service Worker for PWA functionality
// No offline caching - requires internet

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests - no caching
  event.respondWith(fetch(event.request));
});
