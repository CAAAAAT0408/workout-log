/* 운동관리 — 오프라인 사본.
   페이지 파일: 인터넷이 되면 새 것을 받아 바꿔 두고, 느리거나 끊기면 저장해 둔 것으로 연다.
   글꼴·엑셀 도구(CDN): 한 번 받은 것을 저장해 두고 다시 쓴다.
   기록 자체는 여기가 아니라 페이지의 localStorage 에 있다. */
const CACHE = 'workout-log-1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const CDN = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function keep(req, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
  return res;
}
function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // 4초 안에 답이 없으면 저장해 둔 사본으로 연다 (신호가 약한 곳)
    e.respondWith(new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => { fromCache(req).then((hit) => { if (hit && !done) { done = true; resolve(hit); } }); }, 4000);
      fetch(req).then((res) => { clearTimeout(timer); keep(req, res); if (!done) { done = true; resolve(res); } })
        .catch(() => { clearTimeout(timer); fromCache(req).then((hit) => { if (done) return; done = true; if (hit) resolve(hit); else reject(new Error('offline')); }); });
    }));
    return;
  }
  if (CDN.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res))));
  }
});
