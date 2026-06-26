/* Palm Hills Attendance — Service Worker */
const CACHE = 'phsc-attendance-v1';
const ASSETS = [
  './attendance.html',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
];

// Install: pre-cache the shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//  - Firestore / Google APIs: always network (real-time data, never cache)
//  - everything else: network-first, fall back to cache when offline
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache live database traffic
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.includes('googleapis.com/google.firestore')) {
    return; // let it go straight to network
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // cache a copy of successful GETs
        if (e.request.method === 'GET' && res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(()=>{});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
