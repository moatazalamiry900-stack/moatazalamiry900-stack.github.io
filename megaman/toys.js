// =====================================================================
//  AXON BREACH — THE FACILITY FIGHTS FOR YOU (toys.js)
//  Fewer things that hurt the hero, more things he can turn on the machines:
//   BOUNCE PADS      (instead of the spike beds and rollers) throw the hero 8 m up; coming down from a
//                    launch he hits the floor like a hammer — a shockwave that breaks what stands near.
//   VOLATILE CRYSTAL a red cluster: one shot or cut and it blows up, taking the machines round it — and
//                    any other cluster near enough, one after another.
//   VORTEX PYLON     hit it: for two seconds it drags every machine of the room into one heap, then the
//                    heap implodes. It recharges.
//   THE CHANDELIER   a ton of crystal hangs over the middle of some arenas. Lure them under it, hit one of
//                    the two release crystals — it comes down on all of them.
//  The number of machines and of sectors is untouched: there are simply faster, louder ways through them.
//  Co-op: a device set off by one player goes off for everyone (coop.js 'ty').
//  level.js builds the pads while it makes the world and calls AxonToys.tick every frame of the mission.
// =====================================================================
'use strict';

window.AxonToys = (function () {
    const T = {
        en: { pad: 'BOUNCE PAD — land hard to smash them', bar: 'VOLATILE CRYSTAL — shoot it!', vor: 'VORTEX PYLON — hit it and watch', chan: 'Lure them under the chandelier, then hit the release crystal', stomp: 'SLAM', multi: n => `${n} DOWN` },
        ar: { pad: 'منصة القفز — انزل بقوة لتسحقهم', bar: 'كريستال متفجر — أطلق عليه!', vor: 'عمود الدوامة — اضربه وتفرّج', chan: 'استدرجهم تحت الثريا ثم اضرب كريستالة الإفلات', stomp: 'سحق', multi: n => `سقط ${n}` },
        es: { pad: 'PLATAFORMA DE SALTO — cae fuerte para aplastarlos', bar: 'CRISTAL VOLÁTIL — ¡dispárale!', vor: 'PILÓN DE VÓRTICE — golpéalo y mira', chan: 'Atráelos bajo la lámpara y golpea el cristal de suelta', stomp: 'IMPACTO', multi: n => `${n} CAÍDOS` },
        zh: { pad: '弹跳垫 — 重重落下砸碎它们', bar: '不稳定水晶 — 射它！', vor: '漩涡塔 — 击打它，看好戏', chan: '把它们引到吊灯下，再击打释放水晶', stomp: '重击', multi: n => `击倒 ${n}` },
        ja: { pad: 'バウンスパッド — 強く着地して叩き潰せ', bar: '不安定クリスタル — 撃て！', vor: 'ボルテックス・パイロン — 叩いて見物', chan: 'シャンデリアの下に誘い、解放クリスタルを叩け', stomp: 'スラム', multi: n => `${n} 体撃破` }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const guest = () => window.AxonCoop && window.AxonCoop.on && window.AxonCoop.guest;
    const tell = (id, on) => { if (!on && window.AxonCoop && window.AxonCoop.on && window.AxonCoop.send) window.AxonCoop.send({ t: 'ty', n: id }); };
    const _v = new THREE.Vector3(), _w = new THREE.Vector3();
    const pads = [], devs = [];              // devs: barrels, pylons, chandeliers (index = id, the same on every device)
    let built = null, API = null, P = null, told = {}, launch = null, kills0 = 0, burst = null;

    // ---------- shared looks ----------
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a531, metalness: 0.95, roughness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: 0.8, roughness: 0.4 });
    const glow = (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const gem = (c, e = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.12, metalness: 0.2, flatShading: true });
    const icons = {};
    function icon(ch, col) {
        const k = ch + col; if (icons[k]) return icons[k];
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        g.fillStyle = 'rgba(6,8,12,.85)'; g.beginPath(); g.moveTo(64, 6); g.lineTo(122, 64); g.lineTo(64, 122); g.lineTo(6, 64); g.closePath(); g.fill();
        g.strokeStyle = col; g.lineWidth = 7; g.stroke();
        g.fillStyle = '#fff'; g.font = '700 58px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 68);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return icons[k] = t;
    }
    const tag = (ch, col, y) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: icon(ch, col), transparent: true, depthWrite: false })); s.scale.set(0.9, 0.9, 1); s.position.y = y; return s; };
    // performance: a device is a handful of meshes — its rigid parts are merged into one per material, nothing static recomputes its
    // matrix, and everything far from the hero is switched off (hidden + lazy = no draw call, no matrix work)
    const tidy = (g, live = []) => { try { window.AxonPerf.mergeStatic(g, m => live.includes(m)); } catch (e) { } g.userData.lazy = true; g.traverse(o => { if (o !== g && !live.includes(o) && !o.isSprite) { o.updateMatrix(); o.matrixAutoUpdate = false; } }); return g; };
    const SEE = 120; let cullT = 0;
    const hint = k => { if (told[k] || !API) return; told[k] = 1; API.toast(T[lang()][k]); };

    // ---------- BOUNCE PADS (level.js calls this where a spike bed used to be) ----------
    function pad(api, x, top, z, w, d) {
        const g = new THREE.Group(); g.position.set(x, top, z);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), dark); frame.position.y = 0.08; g.add(frame);
        const skin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.1, d - 0.5), new THREE.MeshStandardMaterial({ color: 0x1a6a4a, emissive: 0x5cf0a0, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 })); skin.position.y = 0.2; g.add(skin);
        const rm = glow(0xcffff0, 0.9);
        for (const k of [0.32, 0.62]) { const r = new THREE.Mesh(new THREE.RingGeometry(Math.min(w, d) * k * 0.5 - 0.06, Math.min(w, d) * k * 0.5, 28).rotateX(-Math.PI / 2), rm); r.position.y = 0.27; g.add(r); }
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 6), gold); c.position.set(sx * (w / 2 - 0.18), 0.15, sz * (d / 2 - 0.18)); g.add(c); }
        tidy(g, [skin]); g.updateMatrix(); g.matrixAutoUpdate = false; api.scene.add(g);
        pads.push({ g, skin, x, z, top, w, d, t: 9 });
    }

    // ---------- the devices ----------
    function ground(S, x, z, y0) {
        let best = null;
        for (const b of S) { if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; const t = b.max.y; if (t < y0 - 1 || t > y0 + 4 || t - b.min.y > 12) continue; if (best === null || t < best) best = t; }
        if (best === null) return null;
        for (const b of S) if (x > b.min.x - 0.8 && x < b.max.x + 0.8 && z > b.min.z - 0.8 && z < b.max.z + 0.8 && b.min.y < best + 2.6 && b.max.y > best + 0.2) return null;
        return best;
    }
    function spot(S, x, z, y0) { for (const [dx, dz] of [[0, 0], [1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8], [2.6, 2.6], [-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6]]) { const y = ground(S, x + dx, z + dz, y0); if (y !== null) return [x + dx, y, z + dz]; } return null; }
    function barrel(api, x, y, z) {
        const g = new THREE.Group(); g.position.set(x, y, z);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.3, 8), gold); base.position.y = 0.15; g.add(base);
        const core = new THREE.Group(); core.position.y = 0.3; g.add(core);
        const m = gem(0xff5a2a, 1.4);
        [[0, 0, 0.5, 1.7, 0], [0.36, 0.2, 0.3, 1.1, 0.5], [-0.33, 0.25, 0.3, 1.2, -0.45], [0.05, -0.38, 0.28, 0.95, 0.3], [-0.1, 0.4, 0.22, 0.8, -0.2]].forEach(([px, pz, r, h, tilt]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), m); c.position.set(px, h / 2, pz); c.rotation.z = tilt * 0.5; c.rotation.x = tilt * 0.3; core.add(c); });
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 20), gold); band.rotation.x = Math.PI / 2; band.position.y = 0.55; g.add(band);
        g.add(tag('✹', '#ff5a2a', 2.5)); tidy(g, [core]); g.updateMatrix(); g.matrixAutoUpdate = false; api.scene.add(g);
        devs.push({ kind: 'bar', g, core, m, c: new THREE.Vector3(x, y + 1, z), st: 0, t: 0, fuse: -1 });
    }
    function pylon(api, x, y, z) {
        const g = new THREE.Group(); g.position.set(x, y, z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 2.2, 6), gold); post.position.y = 1.1; g.add(post);
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), gem(0xb58cff, 1.3)); orb.position.y = 2.75; g.add(orb);
        const rings = [1.0, 1.5].map((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.04, 6, 30), gold); m.position.y = 2.75; m.rotation.x = Math.PI / 2 + i * 0.6; g.add(m); return m; });
        const disc = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 40), glow(0xb58cff, 0)); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.1; g.add(disc);
        g.add(tag('🌀', '#b58cff', 4)); tidy(g, [orb, disc, ...rings]); g.updateMatrix(); g.matrixAutoUpdate = false; api.scene.add(g);
        devs.push({ kind: 'vor', g, orb, rings, disc, c: new THREE.Vector3(x, y + 2.75, z), base: new THREE.Vector3(x, y, z), st: 0, t: 0, mine: false });
    }
    function chandelier(api, a) {
        const g = new THREE.Group(), top = a.h + 14; g.position.set(0, top, a.cz);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 0.7, 10), gold); g.add(hub);
        const m = gem(0x8fd8ff, 0.9); let s = 7 + a.i; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 16; k++) { const r = 0.3 + rnd() * 0.5, h = 2 + rnd() * 3.2, an = rnd() * 6.3, d = rnd() * 2.8; const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), m); c.rotation.x = Math.PI; c.position.set(Math.cos(an) * d, -h / 2 - 0.3, Math.sin(an) * d); g.add(c); }
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 12, 5), gold); chain.position.y = 6.3; g.add(chain);
        tidy(g); api.scene.add(g);
        const ring = new THREE.Mesh(new THREE.RingGeometry(8.4, 9, 48), glow(0x8fd8ff, 0.5)); ring.rotation.x = -Math.PI / 2; ring.position.set(0, a.h + 0.09, a.cz); api.scene.add(ring);
        // two release crystals: by the way in and by the way out
        const keys = [a.entryZ - 5.5, a.exitZ + 5.5].map((z, i) => { const p = spot(api.solids, i ? 6 : -6, z, a.h); if (!p) return null; const k = new THREE.Group(); k.position.set(p[0], p[1], p[2]); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 1.3, 6), gold); post.position.y = 0.65; k.add(post); const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), gem(0x8fd8ff, 1.4)); c.position.y = 1.75; k.add(c); k.add(tag('⬇', '#8fd8ff', 2.9)); tidy(k, [c]); k.updateMatrix(); k.matrixAutoUpdate = false; api.scene.add(k); return { k, c, p: new THREE.Vector3(p[0], p[1] + 1.75, p[2]) }; }).filter(Boolean);
        devs.push({ kind: 'chan', g, ring, keys, a, top, st: 0, t: 0, mine: false });
    }
    function build(api, layout) {
        built = layout; told = {};
        const S = api.solids;
        for (const z of layout.zones) {
            if (z.kind === 'corridor') { const s = z.stage % 2 ? 1 : -1; for (const [x, dz] of [[-s * 4.6, 9], [s * 4.2, 15]]) { const p = spot(S, x, z.z0 - dz, z.y); if (p) barrel(api, p[0], p[1], p[2]); } }
        }
        layout.arenas.forEach((a, n) => {
            if (a.state === 'clear') return;
            for (const [x, dz] of [[-5, 6], [6, -3], [-9, -11], [13, 9]]) { const p = spot(S, x, a.cz + dz, a.h); if (p) barrel(api, p[0], p[1], p[2]); }
            if (n % 2) { const p = spot(S, 0, a.cz, a.h); if (p) pylon(api, p[0], p[1], p[2]); } else chandelier(api, a);
            for (const x of [-(a.half - 8), a.half - 8]) { const p = spot(S, x, a.cz + 1, a.h); if (p) pad(api, p[0], p[1], p[2], 3.2, 3.2); }
        });
    }

    // ---------- what they do ----------
    const foes = () => API.enemies.filter(e => !e.isDead && !e.dormant);
    // frac: the share of a machine's remaining armour the blast takes at least (so the devices stay deadly on the upper floors)
    function blast(at, r, dmg, col, mine, frac = 0.9) {
        API.spawnFlash(_v.copy(at), col, r * 0.9, 0.28); API.spawnShockwave(_v.copy(at).setY(at.y - 0.7), col, r * 1.5); API.spawnSparks(_v.copy(at), col, 36, 20); API.spawnSparks(_v.copy(at), 0xffe6a0, 14, 11);
        API.shake(Math.min(1.1, 0.25 + r * 0.07));
        if (!mine) return;
        for (const e of foes()) { const d = e.mesh.position.distanceTo(at); if (d < r) { try { e.takeDamage(Math.round(e.type === 'boss' ? dmg * 0.3 : Math.max(dmg, (e.hp || 0) * frac) * (d < r * 0.6 ? 1 : 0.75)), e.mesh.position.clone(), true); } catch (err) { } } }
    }
    function boom(d, mine) {
        if (d.st) return; d.st = 1; API.scene.remove(d.g);
        blast(d.c, 7.5, 130, 0xff5a2a, mine, 1); API.hitStop(0.05);
        sfx(a => { a.noise(0.6, 0.26, { type: 'lowpass', f0: 1300, f1: 70 }); a.tone('sine', 170, 38, 0.5, 0.22); a.noise(0.12, 0.12, { type: 'highpass', f0: 2600 }); });
        if (mine && P && !P.dead && P.mesh.position.distanceTo(d.c) < 4) P.takeDamage(10);
        for (const o of devs) if (o.kind === 'bar' && !o.st && o.fuse < 0 && o.c.distanceTo(d.c) < 9) { o.fuse = 0.16 + Math.random() * 0.1; o.mine = mine; }      // the next cluster catches
    }
    function fire(d, id, mine) {
        if (d.st) return; tell(id, !mine);
        if (d.kind === 'bar') { boom(d, mine); return; }
        d.st = 1; d.t = 0; d.mine = mine;
        if (d.kind === 'vor') sfx(a => { a.tone('sawtooth', 90, 700, 2.1, 0.12, { lp: 1800 }); a.noise(2.1, 0.07, { type: 'bandpass', f0: 500 }); });
        else { d.keys.forEach(k => API.scene.remove(k.k)); sfx(a => { a.tone('square', 1800, 600, 0.12, 0.08); a.noise(0.5, 0.1, { type: 'highpass', f0: 1500 }); }); API.shake(0.3); }
    }

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; P = player;
        if (built !== layout) build(api, layout);
        const p = player.mesh.position, time = performance.now() / 1000;
        if ((cullT -= dt) <= 0) {                                                                  // only what is near is drawn
            cullT = 0.2;
            for (const q of pads) q.g.visible = Math.abs(q.z - p.z) < SEE;
            for (const d of devs) { const on = Math.abs((d.c ? d.c.z : d.a.cz) - p.z) < SEE; d.g.visible = on; if (d.kind === 'chan') { d.ring.visible = on; for (const k of d.keys) k.k.visible = on; } }
        }
        // -- pads --
        for (const q of pads) {
            if (Math.abs(p.z - q.z) > 40) continue;
            q.t += dt; const k = Math.max(0, 1 - q.t * 3.2); q.skin.position.y = 0.2 - 0.14 * k * Math.cos(q.t * 26); q.skin.material.emissiveIntensity = 0.75 + 0.3 * Math.sin(time * 4 + q.x) + k * 2;
            if (player.dead) continue;
            if (Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.z - q.z) < q.d / 2 && p.y > q.top - 0.3 && p.y < q.top + 0.7 && player.velocity.y <= 1) {
                player.velocity.y = 34; p.y = q.top + 0.35; player.isGrounded = false; player.jumpCount = 1; player.airDashUsed = false;
                q.t = 0; launch = { top: p.y, kills: 0 }; hint('pad');
                api.spawnSparks(_v.set(q.x, q.top + 0.3, q.z), 0x5cf0a0, 14, 9);
                sfx(a => { a.tone('sine', 150, 620, 0.28, 0.16); a.tone('triangle', 300, 900, 0.18, 0.06, { delay: 0.03 }); });
            }
        }
        // -- the slam after a launch --
        if (launch) {
            launch.top = Math.max(launch.top, p.y);
            if (player.dead) launch = null;
            else if (player.isGrounded && player.velocity.y <= 0.5) {
                const fall = launch.top - p.y; launch = null;
                if (fall > 3.5) {
                    const n0 = foes().length; blast(_v.copy(p).setY(p.y + 0.8).clone(), 7, 80, 0x5cf0a0, true, 0.6); api.hitStop(0.06);
                    sfx(a => { a.noise(0.4, 0.22, { type: 'lowpass', f0: 600, f1: 60 }); a.tone('sine', 120, 34, 0.4, 0.24); });
                    const n = n0 - foes().length; if (n > 0) api.toast(T[lang()].stomp + ' · ' + T[lang()].multi(n));
                }
            }
        }
        // -- devices --
        const hb = api.hb || [], pj = api.pj || [];
        const struck = (c, r) => { for (const h of hb) if (h.pos.distanceToSquared(c) < (r + 1.2) ** 2) return true; for (const s of pj) if (s.mesh.position.distanceToSquared(c) < r * r) { if (!s.pierce) s.life = 0; return true; } return false; };
        for (let id = 0; id < devs.length; id++) {
            const d = devs[id]; const far = Math.abs(p.z - (d.c ? d.c.z : d.a.cz)) > 75; if (far && !d.st && !(d.fuse >= 0)) continue;
            if (d.kind === 'bar') {
                if (d.st) continue;
                d.t += dt; d.core.scale.setScalar(1 + 0.05 * Math.sin(d.t * 7)); d.m.emissiveIntensity = 1.1 + 0.5 * Math.sin(d.t * 7);
                if (d.fuse >= 0) { d.fuse -= dt; d.m.emissiveIntensity = 3; if (d.fuse <= 0) boom(d, d.mine); continue; }
                if (p.distanceToSquared(d.c) < 144) hint('bar');
                if (!player.dead && struck(d.c, 1.3)) fire(d, id, true);
            } else if (d.kind === 'vor') {
                d.orb.rotation.y += dt * (d.st === 1 ? 14 : 1.2); d.rings[0].rotation.z += dt * (d.st === 1 ? 9 : 0.8); d.rings[1].rotation.y += dt * (d.st === 1 ? -7 : -0.6);
                if (d.st === 0) { if (p.distanceToSquared(d.c) < 196) hint('vor'); if (!player.dead && struck(d.c, 1.3)) fire(d, id, true); }
                else if (d.st === 1) {
                    d.t += dt; const k = Math.min(1, d.t / 2.2);
                    d.disc.material.opacity = 0.7; d.disc.scale.setScalar(22 * (1 - k) + 1.5); d.disc.rotation.z += dt * 6; d.orb.scale.setScalar(1 + k * 1.2);
                    if (!guest()) for (const e of foes()) {                                          // the room is dragged into one heap
                        if (e.type === 'boss') continue; const q = e.mesh.position; _w.set(d.base.x - q.x, 0, d.base.z - q.z); const dist = _w.length();
                        if (dist < 30 && dist > 1.4) { _w.multiplyScalar(Math.min(dist - 1.3, (9 + 16 * k) * dt) / dist); q.x += _w.x; q.z += _w.z; if (e.velocity) e.velocity.set(0, e.velocity.y, 0); }
                    }
                    if (Math.random() < 0.6) { const an = Math.random() * 6.3, r = 6 + Math.random() * 10; api.spawnSparks(_v.set(d.base.x + Math.cos(an) * r * (1 - k), d.base.y + 0.5 + Math.random() * 2, d.base.z + Math.sin(an) * r * (1 - k)), 0xb58cff, 2, 4); }
                    if (d.t >= 2.2) {
                        d.st = 2; d.t = 0; d.disc.material.opacity = 0; d.orb.scale.setScalar(0.4); d.orb.material.emissiveIntensity = 0.1;
                        const n0 = foes().length; blast(_v.copy(d.base).setY(d.base.y + 1.2).clone(), 7.5, 160, 0xb58cff, d.mine, 1.4); api.hitStop(0.1);
                        sfx(a => { a.noise(0.8, 0.28, { type: 'lowpass', f0: 1600, f1: 60 }); a.tone('sine', 220, 30, 0.7, 0.26); });
                        const n = n0 - foes().length; if (d.mine && n > 1) api.toast(T[lang()].multi(n));
                    }
                } else { d.t += dt; if (d.t > 22) { d.st = 0; d.orb.scale.setScalar(1); d.orb.material.emissiveIntensity = 1.3; sfx(a => a.tone('triangle', 500, 1000, 0.2, 0.05)); } }   // recharging
            } else {                                                                              // chandelier
                if (d.st === 0) {
                    d.g.rotation.y += dt * 0.15; d.ring.material.opacity = 0.3 + 0.2 * Math.sin(time * 3);
                    for (const k of d.keys) { k.c.rotation.y += dt * 2; if (p.distanceToSquared(k.p) < 100) hint('chan'); if (!player.dead && struck(k.p, 1.2)) { fire(d, id, true); break; } }
                } else if (d.st === 1) {
                    d.t += dt; const k = Math.min(1, d.t / 0.5); d.g.position.y = d.top - (d.top - d.a.h - 3.4) * k * k; d.ring.material.opacity = 0.9;
                    if (k >= 1) {
                        d.st = 2; d.t = 0; api.scene.remove(d.ring);
                        const at = new THREE.Vector3(0, d.a.h + 1, d.a.cz), n0 = foes().length; blast(at, 9.5, 200, 0x8fd8ff, d.mine, 1.4); api.hitStop(0.12); api.shake(1.2);
                        for (let j = 0; j < 5; j++) api.spawnSparks(_v.set((Math.random() - 0.5) * 12, d.a.h + 0.5 + Math.random() * 3, d.a.cz + (Math.random() - 0.5) * 12), 0x8fd8ff, 22, 16);
                        sfx(a => { a.noise(1.1, 0.3, { type: 'lowpass', f0: 2200, f1: 60 }); a.tone('sine', 140, 26, 0.9, 0.28); for (let j = 0; j < 6; j++) a.tone('triangle', 1800 + Math.random() * 1800, 900, 0.12, 0.05, { delay: 0.05 + j * 0.06 }); });
                        if (d.mine && !player.dead && Math.hypot(p.x, p.z - d.a.cz) < 8 && Math.abs(p.y - d.a.h) < 5) player.takeDamage(18);
                        const n = n0 - foes().length; if (d.mine && n > 1) api.toast(T[lang()].multi(n));
                    }
                } else if (d.st === 2) { d.t += dt; d.g.position.y -= dt * 0.6; d.g.scale.setScalar(Math.max(0.01, 1 - d.t / 2.5)); if (d.t > 2.5) { d.st = 3; api.scene.remove(d.g); } }
            }
        }
    }
    // a teammate set a device off (coop.js): it goes off here too — the damage is theirs
    function remote(m) { const d = devs[m.n]; if (d && API) fire(d, m.n, false); }

    return { pad, tick, remote, get devs() { return devs; }, get pads() { return pads; }, fire };
})();
