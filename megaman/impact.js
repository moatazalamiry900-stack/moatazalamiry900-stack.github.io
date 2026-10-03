// =====================================================================
//  AXON BREACH — IMPACT: what a hit does to an enemy (impact.js)
//  Split out of game.js (which must stay under the editor's 100 KB limit). game.js calls:
//   hitReact(e, dx, dz, power) when a shot or the saber hurts an enemy · hitTick(e, dt) every frame for an enemy
//   that was hit · contact(e) for the point the blade lands on · meleeImpact(e, point, finisher) for the cut.
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonImpact = (function () {
    function create(c) {
        const THREE = c.THREE;
        // ---------- being hit: every enemy shows it in its shape, its physics and its speed ----------
        //  shape   — it is squashed for a moment and thrown back on its heels, leaning away from the blow
        //  physics — it is knocked back along the blow (walls and other boxes stop it), lighter units fly further
        //  speed   — it is staggered: for a moment it moves and acts in slow motion
        // One place for every kind of enemy (facility units, the aliens of aliens.js); the guardian is too heavy to move.
        const HIT_W = { drone: 1.3, runner: 1, heavy: 0.35, mote: 1.7, shell: 0.25, maverick: 0.3 }, _hrv = new THREE.Vector3();
        function hitReact(e, dx, dz, pow) {
            if (!e || e.isDead || e.type === 'boss' || !e.body) return;
            const l = Math.hypot(dx, dz) || 1, w = HIT_W[e.type] ?? 0.8;
            let r = e._hr; if (!r) { r = e._hr = { vx: 0, vz: 0, t: 0, lean: 0, lx: 0, lz: 0, slow: 0, s0: e.mesh.scale.x }; e.mesh.rotation.order = 'YXZ'; }
            if (!c.MP.on) { r.vx += dx / l * 13 * pow * w; r.vz += dz / l * 13 * pow * w; const s = Math.hypot(r.vx, r.vz); if (s > 20) { r.vx *= 20 / s; r.vz *= 20 / s; } }   // co-op: the host owns positions
            r.t = Math.max(r.t, pow >= 1 ? 0.24 : 0.12); r.lean = Math.min(0.55, 0.42 * pow * (0.5 + w * 0.5)); r.lx = dx / l; r.lz = dz / l;
            r.slow = Math.max(r.slow, 0.45 * Math.min(1.5, pow) * Math.min(1, w + 0.25));
        }
        // per frame, for an enemy that was hit; returns how fast it may act this frame (1 = normal)
        function hitTick(e, dt) {
            const r = e._hr, m = e.mesh;
            if (r.vx || r.vz) {
                c.moveBody(m.position, _hrv.set(r.vx, 0, r.vz), dt, e.body.r, e.body.off, e.body.h, 0.3, false);
                const d = Math.exp(-8 * dt); r.vx *= d; r.vz *= d; if (Math.abs(r.vx) + Math.abs(r.vz) < 0.3) r.vx = r.vz = 0;
            }
            if (r.t > 0) {
                r.t = Math.max(0, r.t - dt);
                const k = Math.min(1, r.t / 0.2), y = m.rotation.y, lx = r.lx * Math.cos(y) - r.lz * Math.sin(y), lz = r.lx * Math.sin(y) + r.lz * Math.cos(y), q = k * k;
                m.rotation.x = r.lean * k * lz; m.rotation.z = -r.lean * k * lx;
                m.scale.set(r.s0 * (1 + 0.2 * q), r.s0 * (1 - 0.16 * q), r.s0 * (1 + 0.2 * q));
                if (r.t === 0) { m.rotation.x = m.rotation.z = 0; m.scale.setScalar(r.s0); }
            }
            if (r.slow > 0) { r.slow -= dt; return 0.22; }
            return 1;
        }
        // the cut itself: a white slash across the target, a second one crossing it on a finisher
        const cutGeo = new THREE.PlaneGeometry(1, 1);
        function spawnCut(pos, big) {
            const cam = c.camera(), tilt = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6);
            for (let i = 0, n = big ? 2 : 1; i < n; i++) {
                const m = c.fxPool.get(cutGeo, i ? 0xfff2c0 : 0xffffff, { side: THREE.DoubleSide }), len = (big ? 5.2 : 3.6) * (i ? 0.8 : 1), a = tilt + i * 1.35;
                m.position.copy(pos).addScaledVector(_hrv.subVectors(cam.position, pos).normalize(), 0.9); m.quaternion.copy(cam.quaternion); m.rotateZ(a);
                c.addFx({ mesh: m, life: 0.16, max: 0.16, update(f) { const k = 1 - f.life / f.max; f.mesh.scale.set(len * (0.35 + 0.65 * Math.min(1, k * 3)), 0.34 * (1 - k) + 0.02, 1); f.mesh.material.opacity = 1 - k * k; } });
            }
        }
        // where the blade lands: on the enemy's surface, on the side the hero stands
        function contact(e) {
            const p = e.aimPoint(), pp = c.player().mesh.position, dx = pp.x - p.x, dz = pp.z - p.z, d = Math.hypot(dx, dz) || 1, r = Math.min(d * 0.8, e.hitRadius() * 0.5);
            p.x += dx / d * r; p.z += dz / d * r; return p;
        }
        function meleeImpact(e, p, big) {
            const pp = c.player().mesh.position;
            spawnCut(p, big); c.spawnSparks(p, 0xeaffff, big ? 16 : 9, big ? 20 : 15);
            hitReact(e, e.mesh.position.x - pp.x, e.mesh.position.z - pp.z, big ? 1.7 : 1);
        }
        return { hitReact, hitTick, contact, meleeImpact, cutGeo };
    }
    return { create };
})();
