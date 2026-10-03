// =====================================================================
//  AXON BREACH — THE SURGE RUN (chase.js)
//  Half way up the facility the geode wakes: a wall of growing crystal bursts out behind the hero and
//  comes down the tunnel after him. 190 m to run — hurdles to jump, walls to swing round, pillars that
//  drop from the ceiling — while the wall gains speed. At the far end a blast door slams and the surge
//  breaks against it. Touching the wall costs armour and throws the hero forward; it never stops.
//  sectors.js builds it as chamber 4 (floor 5); level.js calls AxonChase.tick every frame of the mission.
//  Loaded by index.html before sectors.js.
// =====================================================================
'use strict';

window.AxonChase = (function () {
    const T = {
        en: { run: 'RUN!', sub: 'the surge is coming', out: 'ESCAPED', outS: 'surge sealed', gap: 'SURGE', area: 'THE SURGE RUN' },
        ar: { run: 'اركض!', sub: 'الموجة قادمة', out: 'نجوت', outS: 'تم حجز الموجة', gap: 'الموجة', area: 'نفق الموجة' },
        es: { run: '¡CORRE!', sub: 'la oleada se acerca', out: 'A SALVO', outS: 'oleada sellada', gap: 'OLEADA', area: 'LA CARRERA' },
        zh: { run: '快跑！', sub: '晶潮来袭', out: '逃脱成功', outS: '晶潮已封锁', gap: '晶潮', area: '晶潮通道' },
        ja: { run: '走れ！', sub: 'サージが来る', out: '脱出成功', outS: 'サージ封鎖', gap: 'サージ', area: 'サージ・ラン' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const L = 190, HALF = 7, RED = 0xff2a55;
    let C = null;                              // the tunnel of this world
    let ui = null, vig = null, bar = null, fill = null, big = null, fov0 = 0;
    const _v = new THREE.Vector3();

    // ---------- the tunnel (sectors.js → level.js) ----------
    function build(c) {
        const { api, B, S, z0, h } = c, cC = z0 - L / 2;
        B(0, h - 2, cC, 14, 4, L, true);
        B(-8, h + 6, cC, 2, 20, L); B(8, h + 6, cC, 2, 20, L); B(0, h + 15, cC, 18, 2, L);
        const at = d => z0 - d;
        // what stands in the way: [distance, kind]  h = hurdle (jump) · H = high hurdle · l/r = wall across the left / right half · m = block in the middle
        const PLAN = [[26, 'h'], [42, 'l'], [56, 'r'], [72, 'H'], [88, 'm'], [104, 'l'], [114, 'r'], [128, 'h'], [134, 'h'], [150, 'm'], [164, 'H']];
        for (const [d, k] of PLAN) {
            const z = at(d);
            if (k === 'h') { B(0, h + 0.6, z, 14, 1.2, 1.4, true); S(0, h + 1.23, z, 14, 0.05, 0.2, 0xffc24a); }
            else if (k === 'H') { B(0, h + 1.1, z, 14, 2.2, 1.6, true); S(0, h + 2.23, z, 14, 0.05, 0.2, 0xffc24a); }
            else if (k === 'm') { B(0, h + 3.5, z, 7, 7, 2); for (const x of [-5.2, 5.2]) S(x, h + 0.04, z + 4, 0.25, 0.04, 3, 0xffc24a); }
            else { const s = k === 'l' ? -1 : 1; B(s * 3, h + 3.5, z, 8, 7, 1.6); S(-s * 4, h + 0.04, z + 4, 0.25, 0.04, 3, 0xffc24a); S(s * 3, h + 5, z + 0.84, 7.4, 0.3, 0.05, RED); }
        }
        // red warning rails along both walls, arrows in the floor: this way, fast
        for (const x of [-6.94, 6.94]) { S(x, h + 3, cC, 0.06, 0.14, L - 2, RED); S(x, h + 8, cC, 0.06, 0.1, L - 2, RED); }
        for (let d = 14; d < L - 12; d += 16) { const z = at(d); S(0, h + 0.04, z, 0.2, 0.04, 2.6, RED); S(-0.6, h + 0.04, z - 0.9, 0.2, 0.04, 1.1, RED); S(0.6, h + 0.04, z - 0.9, 0.2, 0.04, 1.1, RED); }
        S(0, h + 0.04, at(L - 9), 14, 0.04, 0.3, 0x5cf0a0);                                        // the line to cross
        C = { z0, h, endZ: at(L - 9), st: 0, t: 0, wz: z0, v: 0, hits: 0, wall: null, door: null,
            pillars: [[34, -3], [64, 3.5], [80, -1], [96, 4], [120, 0], [142, -4], [158, 2.5]].map(([d, x]) => ({ z: at(d), x, st: 0, t: 0, m: null, ring: null })) };
        return { L, rise: 0, half: HALF };
    }

    // ---------- screen ----------
    function dom() {
        if (ui) return;
        const st = document.createElement('style');
        st.textContent = `
          #ch-vig{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 55%,transparent 42%,rgba(255,20,60,.55) 100%);transition:opacity .15s}
          #ch-ui{position:absolute;z-index:6;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 64px);transform:translateX(-50%);width:min(340px,58%);pointer-events:none;font-family:var(--font,system-ui);display:none}
          #stage.chase-on #ch-ui{display:block}
          #ch-ui .k{display:flex;justify-content:space-between;font-size:11px;font-weight:800;letter-spacing:.18em;color:#ff5a7a;text-shadow:0 0 8px rgba(255,40,80,.8)}
          #ch-ui .b{height:8px;margin-top:3px;background:rgba(6,8,12,.75);outline:1px solid rgba(255,90,122,.5);transform:skewX(-18deg);overflow:hidden}
          #ch-ui .b i{display:block;height:100%;width:100%;transform-origin:left;background:linear-gradient(90deg,#ff2a55,#ffc24a 55%,#5cf0a0)}
          #ch-ui[dir=rtl] .k{letter-spacing:0;font-size:13px}
          #ch-big{position:absolute;z-index:7;left:50%;top:34%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;font-family:var(--font,system-ui);opacity:0;white-space:nowrap}
          #ch-big.on{animation:chBig 2.2s ease-out both}
          #ch-big b{display:block;font-size:clamp(46px,13vw,110px);font-weight:900;font-style:italic;letter-spacing:.06em;color:#fff;text-shadow:0 0 30px var(--cc),0 0 6px var(--cc),0 4px 0 rgba(0,0,0,.6)}
          #ch-big span{font-size:14px;font-weight:700;letter-spacing:.3em;color:var(--cc);text-transform:uppercase}
          #ch-big[dir=rtl] b,#ch-big[dir=rtl] span{letter-spacing:0}
          #stage.chase-on #tipbar,#stage.chase-on #aban{opacity:0!important}
          @keyframes chBig{0%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}10%{opacity:1;transform:translate(-50%,-50%) scale(1)}16%{transform:translate(-50%,-50%) scale(1.08)}22%{transform:translate(-50%,-50%) scale(1)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.15)}}`;
        document.head.appendChild(st);
        vig = document.createElement('div'); vig.id = 'ch-vig'; ui = document.createElement('div'); ui.id = 'ch-ui'; big = document.createElement('div'); big.id = 'ch-big';
        ui.innerHTML = '<div class="k"><span></span><span></span></div><div class="b"><i></i></div>'; fill = ui.querySelector('i'); bar = ui.querySelectorAll('.k span');
        stage().appendChild(vig); stage().appendChild(ui); stage().appendChild(big);
    }
    function shout(a, b, col) { const l = lang(); big.dir = l === 'ar' ? 'rtl' : 'ltr'; big.style.setProperty('--cc', col); big.innerHTML = `<b>${T[l][a]}</b><span>${T[l][b]}</span>`; big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); }

    // ---------- the wall of crystal ----------
    function makeWall(api) {
        const g = new THREE.Group(), MG = window.AxonPerf.mergeGeometries, parts = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3();
        const cone = new THREE.ConeGeometry(1, 1, 5, 1).toNonIndexed(); cone.translate(0, 0.5, 0);
        let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 70; k++) {                                                             // spikes growing forward (towards −z)
            const x = (rnd() - 0.5) * 14, y = rnd() * 13, r = 0.35 + rnd() * 0.9, len = 2.5 + rnd() * 6;
            e.set(-Math.PI / 2 + (rnd() - 0.5) * 0.7, 0, (rnd() - 0.5) * 0.7); q.setFromEuler(e);
            parts.push({ geo: cone, matrix: m4.clone().compose(_v.set(x, y, 1.5), q, one.set(r, len, r)) });
        }
        const geo = MG(parts); geo.computeVertexNormals();
        const spikes = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff2a55, emissive: 0xff1040, emissiveIntensity: 1.5, roughness: 0.15, metalness: 0.2, flatShading: true }));
        g.add(spikes);
        const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x1a0208, side: THREE.DoubleSide })); back.position.set(0, 7, 2.2); g.add(back);
        const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x2 = c.getContext('2d');
        for (let k = 0; k < 90; k++) { x2.fillStyle = `rgba(255,${60 + rnd() * 160 | 0},${90 + rnd() * 90 | 0},${0.15 + rnd() * 0.5})`; x2.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 3, 12 + rnd() * 70); }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 1);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); glow.position.set(0, 7, -2.6); g.add(glow);
        const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, 0.06, -7); g.add(floorGlow);
        g.visible = false; api.scene.add(g);
        return { g, spikes, tex, glow, back };
    }
    function reset() {
        if (!C) return;
        C.st = 0; if (C.wall) C.wall.g.visible = false;
        stage().classList.remove('chase-on'); if (vig) vig.style.opacity = 0;
    }

    // ---------- every frame of the mission (level.js) ----------
    let rumT = 0, beepT = 0, sparkT = 0, uiT = 0;
    function tick(api, player, layout, dt) {
        if (!C) return; dom();
        const p = player.mesh.position, cam = api.camera && api.camera();
        if (cam && !fov0) fov0 = cam.fov;
        const inside = p.z < C.z0 - 10 && p.z > C.endZ && Math.abs(p.y - C.h) < 9;
        if (C.st === 0) {
            if (p.z <= C.endZ && p.z > C.endZ - 400 && !C.seen) C.st = 9;                           // came back past it (checkpoint): it is over
            if (inside && !player.dead) {
                C.st = 1; C.t = 0; C.seen = true; C.wz = C.z0 + 3; C.v = 0; C.hits = 0;
                if (!C.wall) C.wall = makeWall(api);
                C.wall.g.position.set(0, C.h, C.wz); C.wall.g.visible = true;
                stage().classList.add('chase-on'); shout('run', 'sub', '#ff2a55'); api.shake(0.8);
                sfx(a => { a.noise(1.1, 0.24, { type: 'lowpass', f0: 500, f1: 60 }); a.tone('sawtooth', 70, 38, 1.0, 0.2); for (let k = 0; k < 3; k++) { a.tone('square', 880, 880, 0.14, 0.09, { delay: 0.25 + k * 0.32 }); a.tone('square', 660, 660, 0.14, 0.09, { delay: 0.41 + k * 0.32 }); } });
            }
        }
        if (C.st === 1 || C.st === 2 || C.st === 3) {
            C.t += dt;
            if (player.dead) { reset(); return; }
            const gap = C.wz - p.z;                                                                 // metres between the wall and the hero
            if (C.st === 1 && C.t > 1.5) C.st = 2;
            if (C.st === 2) {
                const want = gap > 42 ? 17 : Math.min(12.6, 9.6 + (C.t - 1.5) * 0.28);                   // it gains speed; far behind, it sprints to stay in sight
                C.v += (want - C.v) * Math.min(1, dt * 2.5); C.wz -= C.v * dt;
                if (gap < 1.2) {                                                                   // caught: armour torn, thrown forward
                    C.hits++; player.takeDamage(22, true); player.invincibleTimer = 1.3;
                    p.z = C.wz - 10; p.y += 0.3; if (api.freeSpot) api.freeSpot(p); player.velocity.set(0, 9, -12); if (player.lastSafePos) player.lastSafePos.copy(p);
                    api.shake(1.0); api.hitStop(0.1); api.spawnSparks(_v.copy(p).setY(p.y + 1.3), RED, 30, 16);
                    sfx(a => { a.noise(0.35, 0.25, { type: 'lowpass', f0: 1400, f1: 120 }); a.tone('sawtooth', 300, 60, 0.3, 0.16); });
                }
                if (p.z <= C.endZ) {                                                               // across the line: the blast door comes down behind him
                    C.st = 3; C.t = 0;
                    const dz = C.endZ + 3, geo = new THREE.BoxGeometry(14, 13, 1.6), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd9a531, metalness: 0.95, roughness: 0.3, emissive: 0x3a2206, emissiveIntensity: 1 }));
                    m.position.set(0, C.h + 6.5 + 14, dz); api.scene.add(m); C.door = { m, y: C.h + 6.5, t: 0, z: dz };
                    api.solids.push(new THREE.Box3(new THREE.Vector3(-7, C.h, dz - 0.8), new THREE.Vector3(7, C.h + 13, dz + 0.8)));
                    try { api.AudioSys.playGateSlam(); } catch (e) { }
                }
            }
            if (C.st === 3) {
                const d = C.door; d.t += dt; const k = Math.min(1, d.t / 0.28); d.m.position.y = d.y + 14 * (1 - k * k); if (k >= 1 && !d.down) { d.down = true; api.shake(0.7); api.spawnSparks(_v.set(0, C.h + 0.3, d.z - 1), 0xffc24a, 30, 14); }
                C.v += (34 - C.v) * Math.min(1, dt * 3); C.wz -= C.v * dt;
                if (C.wz <= d.z + 3.2) {                                                           // the surge breaks on the door
                    C.st = 9; C.wall.g.visible = false; stage().classList.remove('chase-on'); vig.style.opacity = 0;
                    api.shake(1.3); api.hitStop(0.12);
                    for (let k = 0; k < 6; k++) api.spawnSparks(_v.set((Math.random() - 0.5) * 12, C.h + 1 + Math.random() * 9, d.z - 1.2), k % 2 ? RED : 0xffc24a, 26, 20);
                    api.spawnFlash(_v.set(0, C.h + 5, d.z - 1.5), RED, 14, 0.35);
                    sfx(a => { a.noise(1.4, 0.3, { type: 'lowpass', f0: 1800, f1: 50 }); a.tone('sine', 120, 28, 1.2, 0.28); a.tone('triangle', 520, 1040, 0.25, 0.09, { delay: 0.7 }); a.tone('triangle', 1040, 1560, 0.4, 0.09, { delay: 0.9 }); });
                    shout('out', 'outS', '#5cf0a0');
                    if (window.AxonPower && !C.hits) window.AxonPower.grant('aegis');                // untouched: a shield for the fight ahead
                    else if (window.AxonPower) window.AxonPower.grant('mend');
                }
            }
            // the wall itself
            const W = C.wall, time = performance.now() / 1000;
            W.g.position.z = C.wz; if (cam) { const out = cam.position.z < C.wz - 3; W.glow.visible = W.back.visible = W.spikes.visible = out; }   // the camera is swallowed before the hero is: no wall in the lens then, only its light on the floor
            W.tex.offset.y = -time * 1.4; W.glow.material.opacity = 0.7 + 0.25 * Math.sin(time * 17);
            W.spikes.scale.set(1, 1, 1 + 0.12 * Math.sin(time * 11)); W.spikes.rotation.z = Math.sin(time * 3.1) * 0.01;
            if ((sparkT -= dt) <= 0) { sparkT = 0.07; api.spawnSparks(_v.set((Math.random() - 0.5) * 13, C.h + Math.random() * 10, C.wz - 3), Math.random() < 0.3 ? 0xffffff : RED, 5, 12); }
            // pressure: rumble, alarm, red edges, a wider lens the closer it is
            const near = Math.max(0, Math.min(1, 1 - (gap - 4) / 26));
            if ((rumT -= dt) <= 0) { rumT = 0.22; sfx(a => { a.noise(0.3, 0.05 + 0.13 * near, { type: 'lowpass', f0: 180 + 260 * near, f1: 60 }); }); if (near > 0.35) api.shake(0.12 + 0.3 * near); }
            if (C.st === 2 && (beepT -= dt) <= 0) { beepT = 0.75 - 0.45 * near; sfx(a => a.tone('square', near > 0.6 ? 1320 : 990, near > 0.6 ? 1320 : 990, 0.06, 0.05)); }
            if ((uiT -= dt) <= 0) { uiT = 0.1;                                                    // the page is touched 10×/s, not every frame
            vig.style.opacity = (0.15 + 0.85 * near).toFixed(2);
            const l = lang(); ui.dir = l === 'ar' ? 'rtl' : 'ltr'; bar[0].textContent = T[l].gap; bar[1].textContent = Math.max(0, gap).toFixed(0) + ' m'; fill.style.transform = `scaleX(${Math.max(0.02, Math.min(1, gap / 40)).toFixed(3)})`; }
            // pillars break off the ceiling ahead of him
            for (const q of C.pillars) {
                if (q.st === 0 && p.z - q.z < 19 && p.z - q.z > 0) {
                    q.st = 1; q.t = 0;
                    q.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); q.ring.rotation.x = -Math.PI / 2; q.ring.position.set(q.x, C.h + 0.07, q.z); api.scene.add(q.ring);
                    const g = new THREE.CylinderGeometry(0.75, 0.95, 7, 6); q.m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xff3a66, emissive: 0xff1040, emissiveIntensity: 0.8, roughness: 0.15, flatShading: true })); q.m.position.set(q.x, C.h + 3.5 + 12, q.z); q.m.rotation.y = q.x; api.scene.add(q.m);
                    sfx(a => a.tone('square', 1500, 1500, 0.05, 0.05));
                } else if (q.st === 1) {
                    q.t += dt; q.ring.scale.setScalar(1 + 0.25 * Math.sin(q.t * 30)); 
                    const k = Math.max(0, (q.t - 0.75) / 0.2);
                    if (k > 0) q.m.position.y = C.h + 3.5 + 12 * (1 - Math.min(1, k) ** 2);
                    if (k >= 1) {
                        q.st = 2; api.scene.remove(q.ring); api.shake(0.5);
                        api.solids.push(new THREE.Box3(new THREE.Vector3(q.x - 0.85, C.h, q.z - 0.85), new THREE.Vector3(q.x + 0.85, C.h + 7, q.z + 0.85)));
                        api.spawnSparks(_v.set(q.x, C.h + 0.4, q.z), RED, 24, 13);
                        sfx(a => { a.noise(0.22, 0.2, { type: 'lowpass', f0: 700, f1: 90 }); a.tone('sine', 140, 50, 0.2, 0.16); });
                        if ((p.x - q.x) ** 2 + (p.z - q.z) ** 2 < 1.5 * 1.5 && p.y < C.h + 6) { player.takeDamage(16); if (api.freeSpot) api.freeSpot(p); }
                    }
                }
            }
        }
        // the lens: wide while it chases, back to normal after
        if (cam && fov0) { const want = (C.st === 2 || C.st === 3) ? fov0 + 11 : fov0; if (Math.abs(cam.fov - want) > 0.05) { cam.fov += (want - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); } }
    }
    return { build, tick, name: () => T[lang()].area, get state() { return C ? C.st : -1; }, get info() { return C; } };
})();
