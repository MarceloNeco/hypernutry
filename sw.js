/* HyperNutry — service worker: rede primeiro para o código (sempre a versão nova), cache como reserva offline. */
var V = 'hypernutry-v0.2.2';
var FILES = ['./', 'index.html', 'manifest.json', 'versoes.json', 'css/style.css', 'js/data-foods.js', 'js/data-taco.js', 'js/data-recipes.js', 'js/calc.js', 'js/ocr.js', 'js/core.js', 'js/ui.js', 'js/v-home.js', 'js/v-food.js', 'js/v-plan.js', 'js/v-body.js', 'js/v-meta.js', 'js/v-calc.js', 'img/icon-192.png', 'img/icon-512.png', 'img/favicon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('hypernutry-') === 0 && k !== V; /* só os caches deste app: os outros apps da mesma origem têm o modo offline deles */ }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin) return; // CDN do OCR etc. passam direto
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); return res; }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
});
