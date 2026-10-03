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
    function ranged(req, path, alt) {
      return caches.match(path).then(function (m) { return m || (alt ? caches.match(alt) : null); }).then(function (m) {
        if (!m) return Response.error();
        return m.arrayBuffer().then(function (buf) {
          var size = buf.byteLength, mm = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || ''), start = 0, end = size - 1;
          if (mm && mm[1]) { start = +mm[1]; if (mm[2]) end = Math.min(+mm[2], size - 1); }
          else if (mm && mm[2]) start = Math.max(0, size - +mm[2]);
          if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
          return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
            'Content-Type': m.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
            'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
        });
      });
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
      // <audio>/<video> ask for byte ranges: from the network when online; offline, cut the range out of the cached full file
      // (without this, music played through an Audio element stays silent offline while fetch()-loaded sounds work)
      if (r.headers.has('range')) {
        var moved = alt && alt !== u.pathname;
        e.respondWith((moved ? fetch(alt, { headers: r.headers }) : fetch(r)).then(function (res) {
          return res.status === 200 || res.status === 206 ? res : ranged(r, u.pathname, alt);
        }).catch(function () { return ranged(r, u.pathname, alt); }));
        return;
      }
      e.respondWith(fetch(r).then(function (res) {
        if (res.status === 200) { put(u.pathname, res); return res; }
        if (res.status === 404 && alt && alt !== u.pathname) return fetch(alt).then(function (r2) { if (r2.status === 200) put(alt, r2); return r2; });
        return res;
      }).catch(function () {
        return caches.match(u.pathname).then(function (m) { return m || (alt ? caches.match(alt) : null); }).then(function (m) { return m || Response.error(); });
      }));
    });
  })({"v":"mc-megaman-musfu8n0","prefix":"mc-megaman-","base":"/megaman/","files":["/megaman/index.html","/megaman/Hero.js","/megaman/Game.js","/megaman/sounds/warning.mp3","/megaman/sounds/musichall.mp3","/megaman/sounds/menumusic.mp3","/megaman/sounds/gunload.wav","/megaman/sounds/robotenemy.wav","/megaman/sounds/walk.wav","/megaman/sounds/music1.mp3","/megaman/sounds/victory-march.mp3","/megaman/sounds/explore.mp3","/megaman/sounds/winner.js","/megaman/Level.Js","/megaman/Shop.js","/megaman/Audio.js","/megaman/Ui.js","/megaman/i18n.js","/megaman/Perf.js","/megaman/Outside.js","/megaman/Hub.js","/megaman/Camera.js","/megaman/Explore.js","/megaman/Forge.js","/megaman/Retreat.js","/megaman/Shots.js","/megaman/Biolab.js","/megaman/Hero-anim.js","/megaman/Surfaces.js","/megaman/Net.js","/megaman/Coop.js","/megaman/Training.js","/megaman/Guard.js","/megaman/guide.js","/megaman/council.js","/megaman/aliens.js","/megaman/impact.js","/megaman/Winner.js","/megaman/title.js","/megaman/menuskin.js","/megaman/Sectors.js","/megaman/comm.js","/megaman/polish.js","/megaman/foes.js","/megaman/foelook.js","/megaman/hqskin.js","/megaman/net.js"]});
