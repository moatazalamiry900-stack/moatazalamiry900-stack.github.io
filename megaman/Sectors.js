// =====================================================================
//  AXON BREACH — MISSION SECTORS (sectors.js)
//  The mission used to be one straight line: corridor, stairs, arena, pit — nine times, always forward.
//  These are the chambers that break that line. Level.Js asks for one instead of the plain corridor:
//   1  Z-HALL   — a wide hall cut by two cross walls: in, turn to the side, climb a staircase that runs
//                 ACROSS the building, turn back at the top. A dome gun covers the stairs.
//   2  SHAFT    — a vertical shaft: two 8 m faces. Ladder up the first (or the crates beside it), cross the
//                 ledge sideways past the spike bed, ladder up the second.
//   3  TOWER    — a tall hall with the exit on a balcony 9 m up: the long ladder past the spike beds, or
//                 the stepped platforms along the other wall and a short ladder.
//  Odd visits are mirrored, so the same chamber turns the other way the second time.
//  Ladders: walk or jump onto one and the hero climbs hand over hand; jump to leap off; the top puts him on the ledge.
//  Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonSectors = (function () {
    const SFX = k => { const x = window.AxonSfx; if (x && x[k]) x[k](); };
    // kind of corridor on each of the nine floors (0 = the classic corridor with a staircase)
    const PLAN = [0, 1, 2, 3, 0, 1, 2, 3, 0];

    function build(kind, c) {
        const { api, B, S, z0, h, col, acc, i, m, traps, popper } = c;
        const aliens = window.AxonAliens && window.AxonAliens.get ? window.AxonAliens.get(api) : null;
        const E = (x, y, z, type) => new api.Enemy(m * x, y, z, type, i);
        const shell = (x, y, z) => { if (aliens && aliens.Shell) new aliens.Shell(m * x, y, z, i); else E(x, y + 1.5, z, 'drone'); };
        // a floor slab with its top at `top`, a wall, a platform standing on the floor
        const F = (x0, x1, zA, zB, top, th = 4) => B(m * (x0 + x1) / 2, top - th / 2, (zA + zB) / 2, Math.abs(x1 - x0), th, Math.abs(zA - zB), true);
        const W = (x0, x1, zA, zB, y0, y1) => B(m * (x0 + x1) / 2, (y0 + y1) / 2, (zA + zB) / 2, Math.abs(x1 - x0), y1 - y0, Math.abs(zA - zB), false);
        const ladder = (x, z, y0, y1) => {
            for (const s of [-0.45, 0.45]) S(m * x + s, (y0 + y1) / 2, z + 0.06, 0.09, y1 - y0, 0.09, acc);
            for (let y = y0 + 0.4; y < y1; y += 0.5) S(m * x, y, z + 0.06, 0.9, 0.07, 0.07, 0xfff2d0);
            S(m * x, y1 + 0.04, z - 0.5, 1.4, 0.04, 0.9, acc);                      // the mat at the top
            traps.push({ kind: 'ladder', x: m * x, z, y0, y1, cd: 0 });
        };
        const arrow = (x, z, y, dx) => { S(m * x, y, z, 2.2, 0.04, 0.22, acc); for (const s of [-1, 1]) S(m * (x + dx * 0.8), y, z + s * 0.35, 0.9, 0.04, 0.2, acc); };   // floor arrow pointing along x
        // the shell of the room: side walls, ceiling, the wall over the entry door, end walls beside the doors
        const room = (L, rise, half) => {
            const top = h + rise + 24, cC = z0 - L / 2;
            B(-(half + 1), (h - 4 + top) / 2, cC, 2, top - h + 4, L); B(half + 1, (h - 4 + top) / 2, cC, 2, top - h + 4, L); B(0, top + 1, cC, half * 2 + 4, 2, L);
            B(0, (h + 14 + top) / 2, z0 + 1, 12, top - h - 14, 2); for (const s of [-1, 1]) B(s * 8, (h + 12 + top) / 2, z0 + 1, 4, top - h - 12, 2);   // the wall over the entry door
            if (half > 7) for (const s of [-1, 1]) { const w = half - 8; B(s * (10 + w / 2), (h - 4 + top) / 2, z0 + 1, w, top - h + 4, 2); }   // beside the entry (the arena brings its own wall at the exit)
            for (const x of [-(half - 0.06), half - 0.06]) { S(x, h + rise + 9, cC, 0.06, 0.14, L - 2, col); S(x, h + 3.2, z0 - 6, 0.06, 0.1, 10, acc); }
            S(0, top - 0.06, cC, 3, 0.06, L - 4, 0xbff4ff);
        };

        if (kind === 1) {                                   // ---------------- Z-HALL ----------------
            const L = 40, rise = 3, r = rise / 8;
            room(L, rise, 15);
            F(-15, 15, z0, z0 - 13, h); W(-16, 6, z0 - 13, z0 - 14, h - 2, h + 27);
            F(6, 15, z0 - 14, z0 - 26, h); F(-15, -6, z0 - 14, z0 - 26, h + rise);
            for (let k = 0; k < 8; k++) { const x = 5.25 - 1.5 * k, top = h + (k + 1) * r; B(m * x, top - 2, z0 - 20, 1.5, 4, 12, true); S(m * (x + 0.75), top - 0.06, z0 - 20, 0.05, 0.06, 11.6, k % 2 ? acc : col); }   // stairs across the hall
            W(-6, 16, z0 - 26, z0 - 27, h - 2, h + 27);
            F(-15, 15, z0 - 27, z0 - 40, h + rise);
            B(m * -6, h + 0.75, z0 - 7, 5, 2.5, 2.5, true); B(m * 6, h + rise + 0.75, z0 - 33, 5, 2.5, 2.5, true);   // cover
            arrow(6, z0 - 10, h + 0.04, 1); arrow(-8, z0 - 30, h + rise + 0.04, 1);
            S(m * -5, h + 6, z0 - 12.96, 14, 0.5, 0.06, col); S(m * 5, h + rise + 6, z0 - 25.96, 14, 0.5, 0.06, acc);
            api.arenaEmblem(z0 - 7, col, h);
            E(9, h, z0 - 9, 'runner'); E(-8, h, z0 - 6, 'runner'); E(11, h, z0 - 22, i > 4 ? 'heavy' : 'runner');
            shell(-11, h + rise, z0 - 20); E(0, h + 4, z0 - 20, 'drone');
            E(3, h + rise, z0 - 35, i > 4 ? 'heavy' : 'runner'); E(-10, h + rise + 3, z0 - 33, 'drone');
            return { L, rise, half: 15 };
        }
        if (kind === 2) {                                   // ---------------- SHAFT ----------------
            const L = 40, rise = 16, a = h + 8, b = h + 16;
            room(L, rise, 7);
            F(-7, 7, z0, z0 - 12, h); B(0, a - 6, z0 - 18, 14, 12, 12, true); B(0, b - 10, z0 - 32, 14, 20, 16, true);
            ladder(-4, z0 - 12, h, a);
            B(m * 5, h + 1.25, z0 - 9.5, 4, 2.5, 5, true); B(m * 5.5, h + 2.75, z0 - 10.75, 3, 5.5, 2.5, true);    // the crates: the fast way up
            ladder(4, z0 - 24, a, b);
            popper(0, z0 - 18, a, 3.4, 5.2, 0, i);                                                               // the ledge is crossed sideways, past the spikes
            S(0, h + 5, z0 - 11.96, 13.6, 0.12, 0.06, col); S(0, a + 5, z0 - 23.96, 13.6, 0.12, 0.06, acc);
            S(0, a + 0.03, z0 - 12.3, 14, 0.04, 0.2, 0xffa826); S(0, b + 0.03, z0 - 24.3, 14, 0.04, 0.2, 0xffa826);
            arrow(0, z0 - 21.5, a + 0.04, 1);
            api.arenaEmblem(z0 - 6, col, h);
            E(-1, h, z0 - 7, 'runner'); E(-4, h, z0 - 3.5, 'runner');
            E(0, h + 6, z0 - 8, 'drone'); E(-4, a + 4, z0 - 18, 'drone');
            shell(-3, b, z0 - 29); E(2, b, z0 - 35, i > 4 ? 'heavy' : 'runner');
            return { L, rise, half: 7 };
        }
        // ---------------- TOWER ----------------
        const L = 40, rise = 9, top = h + rise;
        room(L, rise, 15);
        F(-15, 15, z0, z0 - 34, h); B(0, top - 6, z0 - 37, 30, 12, 6, true);                                    // the floor and the balcony with the exit
        const P = (x0, x1, zA, zB, t) => { B(m * (x0 + x1) / 2, h + t / 2 - 0.5, (zA + zB) / 2, x1 - x0, t + 1, zA - zB, true); S(m * (x0 + x1) / 2, h + t - 0.3, zA + 0.03, x1 - x0 - 0.3, 0.12, 0.05, col); };
        P(9, 15, z0 - 7, z0 - 13, 3); P(9, 15, z0 - 17, z0 - 34, 6); ladder(12, z0 - 34, h + 6, top);             // the stepped way
        P(-3, 3, z0 - 17, z0 - 23, 4.5);                                                                        // the block in the middle
        ladder(-11, z0 - 34, h, top);                                                                           // the long ladder…
        popper(-11, z0 - 30.5, h, 4, 3.4, 0, i); popper(-11, z0 - 25.5, h, 4, 3.4, 1.2, i);                       // …behind two spike beds
        S(0, top + 0.03, z0 - 34.3, 30, 0.04, 0.2, 0xffa826); S(0, h + 5, z0 - 33.96, 16, 0.5, 0.06, acc);
        for (const x of [-14.94, 14.94]) for (const y of [12, 18]) S(x, h + y, z0 - 17, 0.06, 0.12, 30, y === 12 ? acc : col);
        api.arenaEmblem(z0 - 12, col, h);
        E(-6, h, z0 - 9, 'runner'); E(5, h, z0 - 14, 'runner'); E(-4, h, z0 - 27, i > 4 ? 'heavy' : 'runner');
        E(12, h + 8, z0 - 12, 'drone'); E(0, h + 8, z0 - 20, 'drone');
        shell(-6, top, z0 - 37);
        return { L, rise, half: 15 };
    }

    // ---- climbing: called every frame for every ladder (Level.Js, traps) ----
    function climb(tr, P, dt) {
        const p = P.mesh.position;
        if (P.dead || tr.cd > 0 || P.ledge) return;
        const dz = p.z - tr.z;
        if (Math.abs(p.x - tr.x) > 0.85 || dz < 0 || dz > 1.05 || p.y < tr.y0 - 0.3 || p.y > tr.y1) { tr.on = false; return; }
        const facing = Math.cos(P.mesh.rotation.y) < -0.45;
        if (!tr.on && !facing) return;                              // standing beside it, looking away
        if (tr.on && P.velocity.y > 10) { tr.on = false; tr.cd = 0.5; P.velocity.z = 9; P.mesh.rotation.y = 0; SFX('leap'); return; }   // jumped: leap off, away from the wall
        if (!tr.on) SFX('grab');
        tr.on = true;
        if (p.y > tr.y1 - 0.3) { p.set(tr.x, tr.y1 + 0.03, tr.z - 0.75); P.velocity.set(0, 0, 0); P.isGrounded = true; P.jumpCount = 0; tr.on = false; tr.cd = 0.3; SFX('top'); return; }   // over the top
        P.velocity.y = 5.2; P.velocity.x = 0; P.velocity.z = Math.min(P.velocity.z, 0);
        p.x += (tr.x - p.x) * Math.min(1, dt * 8); P.mesh.rotation.y = Math.PI;
        P.jumpCount = 1; P.airDashUsed = false; P.wallSlide = 0; P.flipT = 0;
        // climbing pose: hand over hand, opposite knee up — one cycle per metre of ladder
        const ph = p.y * Math.PI * 2, u = Math.sin(ph) * 0.5 + 0.5, v = 1 - u, set = (o, x) => { if (o) o.rotation.set(x, 0, 0); };
        set(P.armL, -2.75 + 0.95 * u); set(P.elbowL, -0.25 - 0.95 * u); set(P.armR, -2.75 + 0.95 * v); set(P.elbowR, -0.25 - 0.95 * v);
        set(P.legL, -0.25 - 0.95 * v); set(P.kneeL, 0.45 + 1.0 * v); set(P.legR, -0.25 - 0.95 * u); set(P.kneeR, 0.45 + 1.0 * u);
        if (P.headGroup) P.headGroup.rotation.x = -0.35;
    }
    // ---- enemies obey the world: walkers fall to the floor under them, and nobody stands inside anybody ----
    const GROUND = { runner: 1, heavy: 1, shell: 1 }, _v = { x: 0, y: 0, z: 0 };
    function settle(api, p, dt) {
        const E = api.enemies, near = [];
        for (const e of E) {
            if (e.isDead || e.dormant || e.type === 'boss' || !e.body) continue;
            const q = e.mesh.position, dx = q.x - p.x, dz = q.z - p.z;
            if (dx * dx + dz * dz > 4900) continue;
            near.push(e);
            if (!GROUND[e.type]) continue;
            e._vy = Math.max(-45, (e._vy || 0) - 50 * dt); _v.x = _v.z = 0; _v.y = e._vy;
            const fall = e._vy, res = api.moveBody(q, _v, dt, e.body.r, e.body.off || 0, e.body.h, 0.3, true); e._vy = _v.y;
            if (res.grounded && fall < -14 && window.AxonSfx) { window.AxonSfx.land(Math.max(0.25, 1 - Math.sqrt(dx * dx + dz * dz) / 40) * (e.type === 'runner' ? 0.7 : 1)); if (api.spawnSparks) api.spawnSparks(q.clone(), 0xffd9b0, 6, 6); }   // it came down hard
        }
        for (let a = 0; a < near.length; a++) for (let b = a + 1; b < near.length; b++) {
            const A = near[a], B = near[b], P = A.mesh.position, Q = B.mesh.position;
            if (Math.abs(P.y - Q.y) > 2.2) continue;
            let dx = Q.x - P.x, dz = Q.z - P.z; const R = (A.body.r + B.body.r) * 0.92, d2 = dx * dx + dz * dz;
            if (d2 >= R * R) continue;
            let d = Math.sqrt(d2); if (d < 0.01) { dx = 1; dz = 0; d = 1; }
            const pen = Math.min(R - d, 0.5), sp = pen * 9, fa = A.type === 'shell' ? 0 : B.type === 'shell' ? 1 : 0.5;
            _v.y = 0;
            if (fa) { _v.x = -dx / d * sp * fa * 2; _v.z = -dz / d * sp * fa * 2; api.moveBody(P, _v, dt, A.body.r, A.body.off || 0, A.body.h, 0.3, false); }
            if (fa < 1) { _v.x = dx / d * sp * (1 - fa) * 2; _v.z = dz / d * sp * (1 - fa) * 2; api.moveBody(Q, _v, dt, B.body.r, B.body.off || 0, B.body.h, 0.3, false); }
        }
    }
    // ---- the guardian's door: a sealed slab with an eye in it. Come near and the eye finds you, reads you
    //      (no visible beam: the iris flickers and ticks), turns green — and only then the door goes up. ----
    const OKTXT = { ar: 'تم التعرّف عليك — الباب يُفتح', en: 'IDENTITY CONFIRMED — DOOR OPENING', es: 'IDENTIDAD CONFIRMADA — ABRIENDO', zh: '身份确认 — 开门', ja: '認証完了 — ゲート開放' };
    function eyeDoor(api, z, h, traps) {
        const g = new THREE.Group(); g.position.set(0, h, z); api.scene.add(g);
        const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: 0.8, roughness: 0.4 }, o));
        const lit = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
        const add = (geo, mat, x, y, zz, par = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, zz); par.add(m); return m; };
        add(new THREE.BoxGeometry(12, 12, 0.8), std(0x0e0a0a, { metalness: 0.55, roughness: 0.75 }), 0, 6, 0);
        for (const x of [-3, 3]) add(new THREE.BoxGeometry(0.5, 12, 1), std(0x2a1c12), x, 6, 0);
        for (const y of [1.2, 10.8]) add(new THREE.BoxGeometry(12, 0.5, 1), std(0x2a1c12), 0, y, 0);
        const glow = lit(0xff2a3a); for (const x of [-5.6, 5.6]) add(new THREE.BoxGeometry(0.12, 11, 0.9), glow, x, 6, 0.02);
        // the eye: socket, ball, iris, pupil — it looks at you
        add(new THREE.TorusGeometry(1.55, 0.22, 10, 32), std(0x8a6a48), 0, 5, 0.42); add(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 28).rotateX(Math.PI / 2), std(0x100808), 0, 5, 0.3);
        const ball = new THREE.Group(); ball.position.set(0, 5, 0.3); g.add(ball);
        add(new THREE.SphereGeometry(1.2, 24, 16), std(0xe8e0d8, { metalness: 0.2, roughness: 0.25 }), 0, 0, 0, ball);
        const iris = lit(0xff2a3a); add(new THREE.CircleGeometry(0.62, 28), iris, 0, 0, 1.205, ball); add(new THREE.CircleGeometry(0.26, 20), lit(0x050205), 0, 0, 1.215, ball);
        add(new THREE.RingGeometry(0.62, 0.7, 28), lit(0x1a0a0a), 0, 0, 1.21, ball);
        const lidU = add(new THREE.SphereGeometry(1.26, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5a3a22, { side: THREE.DoubleSide }), 0, 5, 0.3), lidL = add(lidU.geometry, lidU.material, 0, 5, 0.3); lidL.rotation.x = Math.PI;
        const beam = add(new THREE.CylinderGeometry(0.05, 0.3, 1, 8, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc24a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), 0, 5, 1.5); beam.visible = false;
        const box = new THREE.Box3(new THREE.Vector3(-6, h, z - 0.4), new THREE.Vector3(6, h + 12, z + 0.4)); api.solids.push(box);
        traps.push({ kind: 'eye', z, h, g, ball, iris, glow, lidU, lidL, beam, box, st: 0, t: 0, cd: 0 });
    }
    const _t = new THREE.Vector3();
    function eye(tr, P, dt, api) {
        let p = P.mesh.position, d = p.z - tr.z, front = d > 0 && d < 17 && Math.abs(p.x) < 9 && Math.abs(p.y - tr.h) < 6;
        if (!front && window.AxonCoop && window.AxonCoop.heroes) for (const q of window.AxonCoop.heroes()) { const dq = q.z - tr.z; if (dq > 0 && dq < 17 && Math.abs(q.x) < 9 && Math.abs(q.y - tr.h) < 6) { p = q; d = dq; front = true; break; } }   // co-op: it reads a teammate too, and the door opens on every device
        tr.t += dt;
        if (tr.st === 3) { const k = Math.min(1, tr.t / 1.3), e = k * k * (3 - 2 * k); tr.g.position.y = tr.h + e * 12.6; if (k >= 1) { tr.st = 4; tr.g.visible = false; SFX('thud'); } return; }
        if (tr.st === 4) return;
        // the eye follows you when it can see you, and drifts when it can't
        const lid = tr.st === 0 ? 0.55 + Math.sin(tr.t * 0.8) * 0.05 : 1.15;                       // half shut while idle, wide open when it has you
        tr.lidU.rotation.x += (-lid - tr.lidU.rotation.x) * Math.min(1, dt * 8); tr.lidL.rotation.x += (Math.PI + lid - tr.lidL.rotation.x) * Math.min(1, dt * 8);
        if (tr.st === 0) {
            tr.ball.rotation.y = Math.sin(tr.t * 0.7) * 0.5; tr.ball.rotation.x = Math.sin(tr.t * 0.43) * 0.12;
            if (front) { tr.st = 1; tr.t = 0; tr.iris.color.setHex(0xffc24a); tr.glow.color.setHex(0xffc24a); api.AudioSys.playTone('sine', 300, 900, 0.3, 0.08); }
            return;
        }
        tr.ball.lookAt(_t.set(p.x, p.y + 1.6, p.z));
        if (tr.st === 1) {                                                                         // reading you: the beam runs head to foot, twice
            if (!front) { tr.st = 0; tr.t = 0; tr.beam.visible = false; tr.iris.color.setHex(0xff2a3a); tr.glow.color.setHex(0xff2a3a); return; }
            const k = tr.t / 1.7, y = p.y + 0.1 + (0.5 + 0.5 * Math.cos(k * Math.PI * 4)) * 2.3;
            tr.iris.color.setHex(Math.sin(tr.t * 22) > 0 ? 0xffc24a : 0xfff0c0);                    // no beam to see: the eye only flickers while it reads you
            if ((tr.s = (tr.s || 0) - dt) <= 0) { tr.s = 0.2; api.AudioSys.playTone('square', 880, 880, 0.04, 0.03); }
            if (k >= 1) { tr.st = 2; tr.t = 0; tr.beam.visible = false; tr.iris.color.setHex(0x5cff8a); tr.glow.color.setHex(0x5cff8a); api.AudioSys.playTone('sine', 660, 1320, 0.35, 0.1); if (api.toast) api.toast(OKTXT[window.AxonI18n ? window.AxonI18n.lang : 'en'] || OKTXT.en); }
        } else if (tr.st === 2 && tr.t > 0.6) {                                                    // …and it lets you in
            tr.st = 3; tr.t = 0; const i = api.solids.indexOf(tr.box); if (i > -1) api.solids.splice(i, 1); SFX('lift'); api.shake(0.3);
        }
    }
    return { PLAN, build, climb, settle, eyeDoor, eye };
})();
