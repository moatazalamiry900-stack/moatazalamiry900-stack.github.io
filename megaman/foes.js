// =====================================================================
//  AXON BREACH — ENEMY PRESENTATION (foes.js)
//  What the mission's machines were missing around their behaviour (nothing here changes how they fight):
//   1 WRECKAGE   — a destroyed unit no longer just vanishes: it breaks into pieces in its own colours that
//                  fly, bounce and cool down, and leaves a scorch mark on the floor.
//   2 TELEGRAPHS — the heavy's ground slam draws its reach on the floor while the arms rise (a ring that
//                  fills up); the runner's lunge shows the lane it is about to rush down.
//   3 DAMAGE     — a unit under a third of its armour sparks and smokes, so you can see which one is nearly gone.
//   4 ARRIVAL    — the second wave of an arena beams in (a column of light and a ring) instead of popping up.
//   5 CONTACT SHADOWS — a soft shadow under every unit on phones, where the real shadows are off for speed:
//                  drones read as flying, walkers as standing on the floor.
//  Everything is pooled (a handful of draw calls in all). level.js calls AxonFoes.tick(...) every frame of the mission.
//  Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonFoes = (function () {
    const N_DEB = 54, N_SH = 22, GROUND = { runner: 1, heavy: 1, shell: 1 };
    let S = null, frame = 0, clock = 0, last = 0, grace = 2.5;
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();

    const radial = (stops, size = 128) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, col]) => r.addColorStop(o, col)); g.fillStyle = r; g.fillRect(0, 0, size, size); return new THREE.CanvasTexture(c); };
    function build(api) {
        const sc = api.scene, add = o => { o.frustumCulled = false; sc.add(o); return o; };
        // wreckage
        const deb = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.5 }), N_DEB));
        deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); _m.makeScale(0, 0, 0); for (let i = 0; i < N_DEB; i++) { deb.setMatrixAt(i, _m); deb.setColorAt(i, _c.setHex(0x333333)); }
        const D = []; for (let i = 0; i < N_DEB; i++) D.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), s: 1, t: 0, life: 1, floor: 0, hot: 0, col: new THREE.Color() });
        // scorch marks
        const scT = radial([[0, 'rgba(0,0,0,.96)'], [0.4, 'rgba(6,3,2,.86)'], [0.7, 'rgba(14,7,4,.45)'], [1, 'rgba(0,0,0,0)']]);
        const scorch = []; for (let i = 0; i < 8; i++) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: scT, transparent: true, depthWrite: false, opacity: 0, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); m.rotation.x = -Math.PI / 2; m.visible = false; scorch.push({ m, t: 0 }); }
        // telegraphs: slam rings and lunge lanes
        const addM = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const rings = []; for (let i = 0; i < 3; i++) { const g = add(new THREE.Group()); const rim = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 56), addM(0xff5a2a, 0.9)), fill = new THREE.Mesh(new THREE.CircleGeometry(1, 40), addM(0xff3a1a, 0.22)); rim.rotation.x = fill.rotation.x = -Math.PI / 2; g.add(rim, fill); g.visible = false; g.traverse(o => { o.frustumCulled = false; }); rings.push({ g, rim, fill, e: null }); }
        const lnT = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d'), l = g.createLinearGradient(0, 128, 0, 0); l.addColorStop(0, 'rgba(255,255,255,.9)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, 16, 128); return new THREE.CanvasTexture(c); })();
        const lanes = []; for (let i = 0; i < 3; i++) { const geo = new THREE.PlaneGeometry(1.5, 7); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 3.5); const mt = addM(0xff2a45, 0.5); mt.map = lnT; const m = add(new THREE.Mesh(geo, mt)); m.visible = false; lanes.push({ m, e: null }); }
        // arrival columns
        const cols = []; for (let i = 0; i < 4; i++) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 18, 1, true), addM(0x7fe8ff, 0.5))); m.visible = false; cols.push({ m, t: 0 }); }
        // contact shadows (phones only: real shadows are off there)
        let sh = null;
        if (api.lowShadow) { const g = new THREE.CircleGeometry(1, 20); g.rotateX(-Math.PI / 2); sh = add(new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(0,0,0,.62)'], [0.55, 'rgba(0,0,0,.34)'], [1, 'rgba(0,0,0,0)']], 64), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), N_SH)); sh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sh.renderOrder = 1; }
        return { deb, D, scorch, rings, lanes, cols, sh, known: new Map(), di: 0, si: 0, ci: 0 };
    }

    // the floor under a point (for flying units): the highest box top below it
    function floorAt(api, x, y, z, fallback) {
        const near = window.AxonPerf && window.AxonPerf.near ? window.AxonPerf.near(api.solids, x - 0.3, x + 0.3, z - 0.3, z + 0.3) : api.solids; let best = -Infinity;
        for (const s of near) if (x > s.min.x && x < s.max.x && z > s.min.z && z < s.max.z && s.max.y <= y + 0.3 && s.max.y > best) best = s.max.y;
        return best > -Infinity ? best : fallback;
    }
    const hexOf = (m, d) => (m && m.color ? m.color.getHex() : d);
    function wreck(api, k) {
        const big = k.type === 'heavy' || k.type === 'shell', n = big ? 14 : k.type === 'drone' ? 8 : 10;
        for (let i = 0; i < n; i++) {
            const d = S.D[S.di = (S.di + 1) % N_DEB], a = Math.random() * 6.283, sp = 3 + Math.random() * (big ? 9 : 7);
            d.on = true; d.t = 0; d.life = 1.5 + Math.random() * 0.9; d.floor = k.gy; d.hot = 1;
            d.p.set(k.x + (Math.random() - 0.5) * k.r, k.ay + (Math.random() - 0.3) * k.r, k.z + (Math.random() - 0.5) * k.r);
            d.v.set(Math.cos(a) * sp, 4 + Math.random() * 8, Math.sin(a) * sp);
            d.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); d.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            d.s = (big ? 0.34 : 0.22) * (0.6 + Math.random() * 0.9); d.col.setHex(k.cols[i % k.cols.length]);
        }
        if (k.type !== 'drone' || k.ay - k.gy < 3) { const s = S.scorch[S.si = (S.si + 1) % S.scorch.length]; s.t = 7; s.m.visible = true; s.m.position.set(k.x, k.gy + 0.035, k.z); s.m.scale.setScalar((big ? 5.4 : 3.6) * (0.9 + Math.random() * 0.3)); s.m.rotation.z = Math.random() * 6.283; }
    }
    function arrive(api, e) {
        const c = S.cols[S.ci = (S.ci + 1) % S.cols.length], q = e.mesh.position, r = (e.body ? e.body.r : 0.8) * 1.5;
        c.t = 0.55; c.m.visible = true; c.m.position.set(q.x, q.y + 7, q.z); c.m.scale.set(r, 16, r);
        try { api.spawnShockwave(q.clone().setY((GROUND[e.type] ? q.y : floorAt(api, q.x, q.y, q.z, q.y - 1.5)) + 0.08), 0x7fe8ff, 3.2); api.AudioSys.tone('sine', 1400, 300, 0.3, 0.06, { pan: 0 }); api.AudioSys.noise(0.25, 0.04, { type: 'highpass', f0: 2500 }); } catch (err) { }
    }

    // every frame of the mission
    function tick(api, player, dt) {
        if (!S) S = build(api);
        const now = performance.now(); if (now - last > 1500) grace = last ? 1 : 2.5; last = now;                 // just (re)entered the mission: nobody "arrives" for a moment
        clock += dt; frame++; if (grace > 0) grace -= dt;
        const p = player.mesh.position, E = api.enemies, near = [];
        let ri = 0, li = 0;
        for (const e of E) {
            if (e.type === 'boss' || e.isDead || !e.mesh) continue;
            const q = e.mesh.position, dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz;
            let k = S.known.get(e);
            if (!k) { k = { type: e.type, r: e.body ? e.body.r : 0.8, cols: [hexOf(e.mats && e.mats[0], 0x1a202c), hexOf(e.mats && e.mats[1], 0xb8c2cf), hexOf(e.mats && e.mats[3], 0x5a6474), hexOf(e.mats && e.mats[0], 0x1a202c), 0xff7a2a], x: 0, y: 0, z: 0, ay: 0, gy: 0, f: 0, sm: Math.random() * 0.4 }; S.known.set(e, k); if (grace <= 0 && d2 < 3600 && e.mesh.visible !== false) arrive(api, e); }
            k.f = frame; k.x = q.x; k.z = q.z; if (GROUND[e.type]) k.gy = q.y; else if (d2 < 2400 && ((k.fl = (k.fl || 0) - 1) <= 0)) { k.fl = 6; k.gy = floorAt(api, q.x, q.y, q.z, q.y - 1.5); } else if (k.gy === 0 && !k.fl) k.gy = q.y - 1.5; k.ay = GROUND[e.type] ? q.y + 1.3 : q.y;
            if (d2 > 2400) continue;
            near.push(e);
            // telegraphs
            if (e.type === 'heavy' && e.slamT > 0 && ri < S.rings.length) { const r = S.rings[ri++], u = 1 - e.slamT / 0.6; r.g.visible = true; r.g.position.set(q.x, q.y + 0.06, q.z); r.rim.scale.setScalar(6.5); r.fill.scale.setScalar(6.5 * u); r.rim.material.opacity = 0.55 + 0.4 * Math.sin(clock * 30); r.fill.material.opacity = 0.12 + 0.2 * u; }
            if (e.type === 'runner' && e.windT > 0 && li < S.lanes.length) { const l = S.lanes[li++]; l.m.visible = true; l.m.position.set(q.x, q.y + 0.06, q.z); l.m.rotation.y = Math.atan2(p.x - q.x, p.z - q.z); l.m.material.opacity = 0.25 + 0.5 * (1 - e.windT / 0.3); }
            // nearly destroyed: sparks and a puff of smoke
            if (e.maxHp > 0 && e.hp > 0 && e.hp < e.maxHp * 0.34 && (k.sm -= dt) <= 0) { k.sm = 0.28 + Math.random() * 0.3; _p.set(q.x + (Math.random() - 0.5) * k.r, k.ay + (Math.random() - 0.2) * k.r, q.z + (Math.random() - 0.5) * k.r); try { api.spawnSparks(_p.clone(), Math.random() < 0.5 ? 0xffb040 : 0x9fe8ff, 4, 6); if (Math.random() < 0.35) api.spawnFlash(_p.clone(), 0xffa040, 0.7, 0.1); } catch (err) { } }
        }
        for (; ri < S.rings.length; ri++) S.rings[ri].g.visible = false;
        for (; li < S.lanes.length; li++) S.lanes[li].m.visible = false;
        // the ones that are gone: destroyed → wreckage
        S.known.forEach((k, e) => { if (k.f === frame) return; if (e.isDead) { const dx = k.x - p.x, dz = k.z - p.z; if (dx * dx + dz * dz < 4900) wreck(api, k); } S.known.delete(e); });
        // wreckage in flight
        let any = false;
        for (let i = 0; i < N_DEB; i++) {
            const d = S.D[i]; if (!d.on) continue; any = true;
            d.t += dt; d.v.y -= 30 * dt; d.p.addScaledVector(d.v, dt);
            if (d.p.y < d.floor + d.s * 0.5) { d.p.y = d.floor + d.s * 0.5; if (d.v.y < -2) { d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.5); } else { d.v.set(0, 0, 0); d.w.set(0, 0, 0); } }
            d.r.addScaledVector(d.w, dt); d.hot = Math.max(0, d.hot - dt * 1.4);
            const u = d.t / d.life, sc = d.s * (u > 0.75 ? Math.max(0, 1 - (u - 0.75) / 0.25) : 1);
            if (u >= 1) { d.on = false; _m.makeScale(0, 0, 0); } else _m.compose(d.p, _q.setFromEuler(_e.set(d.r.x, d.r.y, d.r.z)), _s.set(sc, sc * 0.7, sc * 1.2));
            S.deb.setMatrixAt(i, _m); S.deb.setColorAt(i, _c.copy(d.col).lerp(_c2.setRGB(1.6, 0.6, 0.15), d.hot * 0.8));
        }
        if (any || S.debDirty) { S.deb.instanceMatrix.needsUpdate = true; if (S.deb.instanceColor) S.deb.instanceColor.needsUpdate = true; S.debDirty = any; }
        for (const s of S.scorch) if (s.t > 0) { s.t -= dt; s.m.material.opacity = Math.min(0.95, s.t * 0.5); if (s.t <= 0) s.m.visible = false; }
        for (const c of S.cols) if (c.t > 0) { c.t -= dt; const u = Math.max(0, c.t / 0.55); c.m.material.opacity = 0.6 * u; c.m.scale.x = c.m.scale.z = Math.max(0.05, c.m.scale.x * (1 - dt * 3.5)); if (c.t <= 0) c.m.visible = false; }
        // contact shadows under the nearest units
        if (S.sh) {
            let n = 0;
            for (const e of near) { if (n >= N_SH) break; if (e.mesh.visible === false) continue; const k = S.known.get(e), q = e.mesh.position, h = Math.max(0, q.y - k.gy), r = k.r * (GROUND[e.type] ? 1.5 : 1.25) * (1 + h * 0.06); _m.makeScale(r, 1, r); _m.setPosition(q.x, k.gy + 0.045, q.z); S.sh.setMatrixAt(n++, _m); }
            S.sh.count = n; S.sh.instanceMatrix.needsUpdate = true;
        }
    }
    return { tick, _s: () => S, _clock: () => clock };
})();
