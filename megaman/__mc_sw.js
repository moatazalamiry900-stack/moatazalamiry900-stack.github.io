/* Minassa Code — offline copy of the game */
(function mcServiceWorker(C) {
    var V = C.v, FILES = C.files, BASE = C.base, MAP = {};
    function norm(p) { try { p = decodeURIComponent(p); } catch (e) { } return p.toLowerCase().split('/').map(function (s) { return s.trim(); }).join('/'); }
    FILES.forEach(function (f) {
      MAP[norm(f)] = f;
      var stem = f.replace(/\.[^\/.]*$/, '');
      if (stem !== f && !(norm(stem) in MAP)) MAP[norm(stem)] = f;
    });
    MAP[norm(BASE)] = MAP[norm(BASE + 'index.html')];
    function fix(path) {
      var k = norm(path);
      if (MAP[k]) return MAP[k];
      if (path.indexOf(BASE) !== 0) { k = norm(BASE + path.replace(/^\/+/, '')); if (MAP[k]) return MAP[k]; }
      return null;
    }
    function put(key, res) { var c = res.clone(); caches.open(V).then(function (x) { x.put(key, c); }); }
    self.addEventListener('install', function (e) {
      self.skipWaiting();
      e.waitUntil(caches.open(V).then(function (c) {
        return Promise.all(FILES.map(function (u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () { }); }));
      }));
    });
    self.addEventListener('activate', function (e) {
      e.waitUntil(caches.keys().then(function (k) {
        return Promise.all(k.filter(function (n) { return n !== V && n.indexOf(C.prefix) === 0; }).map(function (n) { return caches.delete(n); }));
      }).then(function () { return self.clients.claim(); }));
    });
    self.addEventListener('fetch', function (e) {
      var r = e.request;
      if (r.method !== 'GET') return;
      var u = new URL(r.url);
      if (u.origin !== location.origin) {
        if (r.headers.has('range')) return;
        e.respondWith(caches.match(r).then(function (m) {
          return m || fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') put(r, res); return res; });
        }));
        return;
      }
      var alt = fix(u.pathname);
      if (r.headers.has('range')) { if (alt && alt !== u.pathname) e.respondWith(fetch(alt, { headers: r.headers })); return; }
      e.respondWith(fetch(r).then(function (res) {
        if (res.status === 200) { put(u.pathname, res); return res; }
        if (res.status === 404 && alt && alt !== u.pathname) return fetch(alt).then(function (r2) { if (r2.status === 200) put(alt, r2); return r2; });
        return res;
      }).catch(function () {
        return caches.match(u.pathname).then(function (m) { return m || (alt ? caches.match(alt) : null); }).then(function (m) { return m || Response.error(); });
      }));
    });
  })({"v":"mc-megaman-mupz4gm3","prefix":"mc-megaman-","base":"/megaman/","files":["/megaman/index.html","/megaman/Hero.js","/megaman/Game.js","/megaman/sounds/musichall.mp3","/megaman/sounds/menumusic.mp3","/megaman/sounds/gunload.wav","/megaman/sounds/robotenemy.wav","/megaman/sounds/walk.wav","/megaman/sounds/music1.mp3","/megaman/Level.Js","/megaman/Shop.js","/megaman/Audio.js","/megaman/Ui.js","/megaman/i18n.js","/megaman/Perf.js","/megaman/Outside.js","/megaman/Hub.js","/megaman/Camera.js","/megaman/Explore.js","/megaman/Forge.js","/megaman/Retreat.js","/megaman/Shots.js","/megaman/Biolab.js","/megaman/Hero-anim.js","/megaman/Surfaces.js","/megaman/Net.js","/megaman/Coop.js"]});
