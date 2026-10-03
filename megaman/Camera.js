// =====================================================================
//  AXON BREACH — third-person camera: orbit, zoom, lock-on framing, wall avoidance
//  (collision-aware: sphere-casts against the level boxes so it never clips into walls)
//  Loaded by index.html before game.js; game.js builds it with AxonCamera.make(deps).
// =====================================================================
'use strict';

window.AxonCamera = (function () {
    function make({ solids, View, store }) {
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const damp = (a, b, k, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));
        const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
        const _C = { c1: new THREE.Vector3(), c2: new THREE.Vector3(), c3: new THREE.Vector3(), c4: new THREE.Vector3(), c5: new THREE.Vector3(), c6: new THREE.Vector3(), a: new THREE.Vector3() };   // per-frame scratch

        const ZOOM_MIN = 3.2, ZOOM_MAX = 14;
        const PIVOT_H = 2.85;  // orbit/look point just above the hero's head → he sits in the lower middle, the arena ahead stays visible
        const CAM_R = 0.45;   // camera "body" radius — covers the near plane at any FOV

        // only the boxes around the camera boom are tested (broadphase grid in perf.js), not the whole level
        const nearBy = (x0, x1, z0, z1) => window.AxonPerf.near ? window.AxonPerf.near(solids, x0, x1, z0, z1) : solids;
        const AXES = ['x', 'y', 'z'];
        function sphereCast(o, dir, maxT, r) {
            let best = maxT;
            const ex = maxT + r;
            for (const s of nearBy(o.x - ex, o.x + ex, o.z - ex, o.z + ex)) {
                let t0 = -Infinity, t1 = Infinity;
                for (const ax of AXES) {
                    const lo = s.min[ax] - r, hi = s.max[ax] + r, d = dir[ax], oo = o[ax];
                    if (Math.abs(d) < 1e-8) { if (oo < lo || oo > hi) { t0 = Infinity; break; } continue; }
                    let a = (lo - oo) / d, b = (hi - oo) / d;
                    if (a > b) { const t = a; a = b; b = t; }
                    if (a > t0) t0 = a; if (b < t1) t1 = b;
                    if (t0 > t1) break;
                }
                if (t0 <= t1 && t0 > 0 && t0 < best) best = t0;
            }
            return best;
        }
        function pushOutOfSolids(p, r) {
            for (const s of nearBy(p.x - r, p.x + r, p.z - r, p.z + r)) {
                if (p.x < s.min.x - r || p.x > s.max.x + r || p.y < s.min.y - r || p.y > s.max.y + r || p.z < s.min.z - r || p.z > s.max.z + r) continue;
                let best = Infinity, ax = null, to = 0;
                for (const a of ['x', 'y', 'z']) {
                    const dLo = p[a] - (s.min[a] - r), dHi = (s.max[a] + r) - p[a];
                    if (dLo < best) { best = dLo; ax = a; to = s.min[a] - r; }
                    if (dHi < best) { best = dHi; ax = a; to = s.max[a] + r; }
                }
                if (ax) p[ax] = to;
            }
        }
        class CameraSystem {
            constructor() {
                this.camera = new THREE.PerspectiveCamera(66, View.W / View.H, 0.05, 400);
                this.currentPosition = new THREE.Vector3(); this.currentLookat = new THREE.Vector3();
                this.theta = 0; this.phi = Math.PI / 7; this.targetTheta = 0; this.targetPhi = this.phi;
                this.targetRadius = clamp(parseFloat(store.get('zoom', '8.5')) || 8.5, ZOOM_MIN, ZOOM_MAX);
                this.radius = this.targetRadius; this.damping = 18; this.manualTimer = 0; this.dragging = false;
                this.raycaster = new THREE.Raycaster(); this.focusPoint = new THREE.Vector3();
                this.shakeAmt = 0; this.ready = false;
                this.frustum = new THREE.Frustum(); this._pm = new THREE.Matrix4();
                this.softTarget = null; this.softTime = 0;
            }
            rotateBy(dx, dy) {
                this.manualTimer = 1.5;
                this.targetTheta -= dx * 0.009;
                this.targetPhi = clamp(this.targetPhi - dy * 0.009, -0.35, 1.05);
            }
            shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
            zoomBy(f) {
                this.targetRadius = clamp(this.targetRadius * f, ZOOM_MIN, ZOOM_MAX);
                store.set('zoom', this.targetRadius.toFixed(2));
            }
            update(player, dt, move) {
                if (this.manualTimer > 0) this.manualTimer -= dt;
                const hard = player.lockedEnemy && !player.lockedEnemy.isDead ? player.lockedEnemy : null;
                const at = !hard && player.attentionEnemy && !player.attentionEnemy.isDead ? player.attentionEnemy : null;
                if (at !== this.softTarget) { this.softTarget = at; this.softTime = 0; } else if (at) this.softTime += dt;
                const soft = at && this.softTime > 0.25 && (player.mesh.position.distanceTo(at.mesh.position) < 18 || at === player.combatTarget) ? at : null;
                const target = hard || soft;
                const turnRate = hard ? 3.5 : 2.2;
                if (!this.dragging && this.manualTimer <= 0) {
                    const d = target ? _C.c1.subVectors(target.mesh.position, player.mesh.position) : null;
                    if (d) {
                        const h = Math.hypot(d.x, d.z);
                        if (h > 2.5) { let diff = Math.atan2(d.x, d.z) + Math.PI - this.targetTheta; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); this.targetTheta += diff * Math.min(1, turnRate * dt); }
                        // pitch follows the target's height: an enemy above (a drone overhead, a gun on a ledge) drops the camera low
                        // so it looks up at it; an enemy below raises it to look down. Level targets keep the usual pitch.
                        const ty = target.aimPoint(_C.a).y - (player.mesh.position.y + PIVOT_H), elev = Math.atan2(ty, Math.max(h, 3.5));
                        const band = Math.abs(elev) < 0.12 ? 0 : elev - Math.sign(elev) * 0.12;
                        this.targetPhi = THREE.MathUtils.lerp(this.targetPhi, clamp(Math.PI / 8 - band * 0.9, -0.32, 1.0), Math.min(1, (hard ? 5 : 3.5) * dt));
                    } else if (!target && move.active && move.y < 0.3) {
                        const v = player.velocity, sp = Math.hypot(v.x, v.z);
                        if (sp > 3) {
                            let diff = Math.atan2(v.x, v.z) + Math.PI - this.targetTheta; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                            const w = (Math.max(0, -move.y) * 1.6 + Math.abs(move.x) * 0.5) * dt;
                            this.targetTheta += diff * Math.min(1, w); this.targetPhi = THREE.MathUtils.lerp(this.targetPhi, Math.PI / 8, 1.2 * dt);
                        }
                    }
                }
                this.radius = damp(this.radius, this.targetRadius, 10, dt);
                this.theta = THREE.MathUtils.lerp(this.theta, this.targetTheta, Math.min(1, dt * this.damping));
                this.phi = THREE.MathUtils.lerp(this.phi, this.targetPhi, Math.min(1, dt * this.damping));

                const off = _C.c2.set(
                    this.radius * Math.sin(this.theta) * Math.cos(this.phi),
                    this.radius * Math.sin(this.phi),   // pure orbit: camera pitch = phi, so the horizon stays on screen in landscape too
                    this.radius * Math.cos(this.theta) * Math.cos(this.phi));
                const px = player.mesh.position;
                if (!this.ready) { this.pivotY = px.y + PIVOT_H; this.camDist = off.length(); this.lookOff = new THREE.Vector3(); this.ready = true; }
                this.pivotY = clamp(damp(this.pivotY, px.y + PIVOT_H, 12, dt), px.y + 1.2, px.y + 3.4);
                const head = _C.c3.set(px.x, this.pivotY, px.z);
                const piv = _C.c4.copy(head); pushOutOfSolids(piv, 1.0);
                if (piv.distanceTo(head) < 0.6) head.copy(piv);
                const want = off.length();
                const dirAt = lift => {
                    const ph = Math.min(1.4, this.phi + lift), c = Math.cos(ph);
                    const yo = this.radius * Math.sin(ph);
                    return _C.c5.set(this.radius * Math.sin(this.theta) * c, yo, this.radius * Math.cos(this.theta) * c).normalize();
                };
                const need = Math.min(want, 2.6);
                let pick = 0;
                for (let li = 0; li <= 4; li++) { const l = li * 0.3; pick = l; if (sphereCast(head, dirAt(l), want, CAM_R) >= need) break; }
                this.lift = damp(this.lift || 0, pick, 5, dt);
                const dir = dirAt(this.lift);
                const allowed = Math.max(0.35, sphereCast(head, dir, want, CAM_R));
                this.camDist = allowed < this.camDist ? allowed : damp(this.camDist, allowed, 6, dt);
                this.camera.position.copy(head).addScaledVector(dir, this.camDist);
                pushOutOfSolids(this.camera.position, CAM_R);
                player.setFade(clamp((this.camera.position.distanceTo(head) - 0.7) / 1.1, 0.22, 1));
                const lo = _C.c6.set(0, 0, 0);
                if (target) { const tp = target.aimPoint(_C.a); tp.y = clamp(tp.y, head.y - 9, head.y + 9); lo.subVectors(tp, head).multiplyScalar(hard ? 0.2 : 0.12); lo.y = (tp.y - head.y) * (hard ? 0.42 : 0.34); }   // the look point rises / sinks with the target
                this.lookOff.lerp(lo, Math.min(1, 6 * dt));
                this.currentLookat.copy(head).add(this.lookOff);
                if (this.shakeAmt > 0.001) {
                    this.camera.position.x += rand(-1, 1) * this.shakeAmt; this.camera.position.y += rand(-1, 1) * this.shakeAmt;
                    this.shakeAmt = damp(this.shakeAmt, 0, 9, dt);
                }
                this.camera.lookAt(this.currentLookat);
                this.camera.updateMatrixWorld();
                this._pm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
                this.frustum.setFromProjectionMatrix(this._pm);
            }
        }

        return { CameraSystem, ZOOM_MIN, ZOOM_MAX };
    }
    // touch / mouse camera control: one finger drags the view round, two fingers pinch-zoom, wheel and +/− zoom
    function bindInput({ stage, View, AudioSys, cameraSystem }) {
        const $ = id => document.getElementById(id);
        const camZone = $('camera-zone');
        const camPtrs = new Map();
        let pinchDist = 0;
        const pinchSpan = () => { const [a, b] = [...camPtrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
        camZone.addEventListener('pointerdown', e => {
            if (camPtrs.size >= 2) return;
            e.preventDefault(); AudioSys.init();
            camPtrs.set(e.pointerId, View.toLocal(e.clientX, e.clientY));
            try { camZone.setPointerCapture(e.pointerId); } catch (err) { }
            cameraSystem.dragging = true; cameraSystem.manualTimer = 1.5;
            if (camPtrs.size === 2) pinchDist = pinchSpan();
        });
        camZone.addEventListener('pointermove', e => {
            if (!camPtrs.has(e.pointerId)) return;
            const p = View.toLocal(e.clientX, e.clientY), last = camPtrs.get(e.pointerId);
            camPtrs.set(e.pointerId, p);
            if (camPtrs.size === 2) {
                const d = pinchSpan();
                if (pinchDist > 0 && d > 0) cameraSystem.zoomBy(pinchDist / d);   // fingers apart = closer
                pinchDist = d; cameraSystem.manualTimer = 1.5;
            } else cameraSystem.rotateBy(p.x - last.x, p.y - last.y);
        });
        const camEnd = e => {
            if (!camPtrs.delete(e.pointerId)) return;
            pinchDist = 0;
            if (!camPtrs.size) cameraSystem.dragging = false;
        };
        camZone.addEventListener('pointerup', camEnd);
        camZone.addEventListener('pointercancel', camEnd);
        stage.addEventListener('wheel', e => { e.preventDefault(); cameraSystem.zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
        $('btn-zoom-in').addEventListener('click', () => { AudioSys.init(); cameraSystem.zoomBy(0.8); });
        $('btn-zoom-out').addEventListener('click', () => { AudioSys.init(); cameraSystem.zoomBy(1.25); });
        window.addEventListener('keydown', e => {
            if (e.code === 'Equal' || e.code === 'NumpadAdd') cameraSystem.zoomBy(0.85);
            if (e.code === 'Minus' || e.code === 'NumpadSubtract') cameraSystem.zoomBy(1.18);
        });
    }
    return { make, bindInput };
})();

