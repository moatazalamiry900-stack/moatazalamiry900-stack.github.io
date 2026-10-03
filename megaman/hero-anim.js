// =====================================================================
//  AXON BREACH — hero animation: procedural run cycle, jumps, landings, dashes and saber cuts,
//  driven by joint springs for smooth, human motion. Loaded right after hero.js (needs AxonHero).
// =====================================================================
'use strict';

(function () {
    const H = window.AxonHero;
    const { clamp, damp, rand, updateScarf } = H._shared;
    const _cc = new THREE.Color();

    // Procedural animation: joint-based run cycle (hip → knee → ankle, shoulder → elbow),
    // fast forward-leaning run with bent arms, directional steps, jump / dash / landing poses.
    const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
    const FEET = P => P._feet || (P._feet = [P.footL, P.footR]);

    // Blade trail: a ribbon swept by the saber's edge (hilt → tip) for the last ~0.26 s. It is drawn solid (its own
    // transparency, not added light), so the cut reads on any background — a bright sky as well as a dark corridor —
    // and without the glow pass that phones do not run. Between two frames the blade is interpolated around the hilt,
    // so a fast cut at a low frame rate is still a smooth arc instead of a few flat facets.
    const TRAIL_N = 48, TRAIL_LIFE = 0.26, TRAIL_SUB = 3;
    function updateTrail(P, dt) {
        if (!P.trail) {
            if (!P.mesh.parent) return;
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3 * 3), 3));
            geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3 * 4), 4));       // rgba: the 4th value is the opacity
            const idx = [];
            for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
            geo.setIndex(idx);
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
            mesh.frustumCulled = false; mesh.renderOrder = 6; P.mesh.parent.add(mesh);
            P.trail = { mesh, geo, pts: [], free: [], last: null };
        }
        const tr = P.trail;
        tr.pts.forEach(q => { q.age += dt; });
        while (tr.pts.length && tr.pts[0].age > TRAIL_LIFE) tr.free.push(tr.pts.shift());   // recycle points, no garbage
        if (P.slashTimer > 0 && P.sword.visible) {
            P.sword.updateWorldMatrix(true, false);                   // just the arm chain, not all ~100 hero parts
            const take = () => { const q = tr.free.pop() || { a: new THREE.Vector3(), b: new THREE.Vector3(), age: 0 }; tr.pts.push(q); if (tr.pts.length > TRAIL_N) tr.free.push(tr.pts.shift()); return q; };
            const A = P.sword.localToWorld(_v.set(0, -0.3, 0)), B = P.sword.localToWorld(_v2.set(0, -2.55, 0)), L = tr.last;
            if (L && L.age < 0.09) {                                   // in-betweens: hilt in a straight line, blade turned around it at full length
                const len = A.distanceTo(B), a0 = L.a, b0 = L.b, age0 = L.age;
                for (let k = 1; k < TRAIL_SUB; k++) {
                    const u = k / TRAIL_SUB, q = take();
                    q.a.lerpVectors(a0, A, u); q.b.lerpVectors(b0, B, u).sub(q.a).setLength(len).add(q.a); q.age = age0 * (1 - u);
                }
            }
            const q = take(); q.a.copy(A); q.b.copy(B); q.age = 0; tr.last = q;
        } else tr.last = null;
        const n = tr.pts.length, pos = tr.geo.attributes.position, col = tr.geo.attributes.color, c = P.mats.glow.color;
        for (let i = 0; i < n; i++) {
            const q = tr.pts[i], f = Math.max(0, 1 - q.age / TRAIL_LIFE), w = f * f, k = i * 3;
            pos.setXYZ(k, q.a.x, q.a.y, q.a.z); pos.setXYZ(k + 2, q.b.x, q.b.y, q.b.z);
            pos.setXYZ(k + 1, q.a.x + (q.b.x - q.a.x) * 0.62, q.a.y + (q.b.y - q.a.y) * 0.62, q.a.z + (q.b.z - q.a.z) * 0.62);
            col.setXYZW(k, c.r, c.g, c.b, 0);                                                  // nothing at the hilt
            col.setXYZW(k + 1, c.r * 0.75 + 0.25, c.g * 0.75 + 0.25, c.b * 0.75 + 0.25, 0.42 * w);   // the blade's colour through the middle
            col.setXYZW(k + 2, 0.55 + c.r * 0.45, 0.55 + c.g * 0.45, 0.55 + c.b * 0.45, 0.95 * f);   // a hot, nearly white edge at the tip
        }
        pos.needsUpdate = true; col.needsUpdate = true;
        tr.geo.setDrawRange(0, Math.max(0, n - 1) * 12);
        tr.mesh.visible = n > 1;
    }
    // ---------- saber on the back ----------
    // first cut with the saber stowed: the arm reaches over the shoulder, pulls it (+DRAW s, hits delayed to match),
    // then the cut follows; after a quiet moment the saber goes back on the back; raising the buster stows it at once
    const DRAW = 0.17, SHEATH = 0.45;
    function holster(P, dt, aiming) {
        const out = { draw: -1, sheath: -1 };
        if (!P.backSaber) return out;
        if (P.slashDur !== P._sd) { P._sd = P.slashDur; P._drawX = 0; }                  // a new cut from game.js
        if (P.blocking && !(P.slashTimer > 0)) {                                         // saber guard (guard.js): the blade comes off the back first
            P._idle = 0; if (P._sheathT > 0) P._sheathT = 0;
            if (!P.drawn && !(P._drawT > 0)) { P._drawT = DRAW; P._grab = false; }
        }
        if (P.slashTimer > 0) {
            P._idle = 0;
            if (P._sheathT > 0) P._sheathT = 0;                                          // attacking again: stop stowing
            if (!P.drawn && !(P._drawT > 0)) {
                P.slashTimer += DRAW; P.slashDur += DRAW; P._sd = P.slashDur; P._drawX = DRAW; P.comboWindow = (P.comboWindow || 0) + DRAW;
                if (P.pendingHits) P.pendingHits.forEach(h => { h.t += DRAW; });
                P._drawT = DRAW; P._grab = false;
            }
        }
        if (P._drawT > 0) {
            P._drawT = Math.max(0, P._drawT - dt); const u = 1 - P._drawT / DRAW;
            if (u >= 0.5 && !P._grab) { P._grab = true; P.drawn = true; if (P.onDraw) P.onDraw(true); }
            if (P._drawT > 0) out.draw = u;
        } else if (P.drawn && P.slashTimer <= 0) {
            if (!(P._sheathT > 0) && (P._idle = (P._idle || 0) + dt) > 2.4) P._sheathT = SHEATH;
        }
        if (P._sheathT > 0) {
            P._sheathT = Math.max(0, P._sheathT - dt); const u = 1 - P._sheathT / SHEATH;
            if (u >= 0.5 && P.drawn) { P.drawn = false; if (P.onDraw) P.onDraw(false); }
            if (P._sheathT > 0) out.sheath = u;
        }
        P.backSaber.visible = !P.drawn; P.handHilt.visible = P.drawn;
        P.sword.visible = P.drawn;                                               // blade stays lit while in hand
        return out;
    }
    // ---------- springs: every joint is a damped spring toward its target pose ----------
    // (instead of a plain exponential approach, which starts at full speed and stops dead → robotic).
    // A spring accelerates into the move, carries momentum and settles with a little overshoot — the
    // forearm lags the upper arm, the chest lags the hips: overlapping action, like a real body.
    // If something outside writes the joint (game.js snapping the gun arm, HQ idle poses), the spring
    // picks up from that value instead of fighting it.
    function spr(P, key, obj, prop, target, w, z, dt, offPrev = 0, offNow = 0) {
        const S = P._sp || (P._sp = {});
        let s = S[key];
        const cur = obj[prop] - offPrev;
        if (!s) s = S[key] = { x: cur, v: 0 };
        else if (Math.abs(cur - s.x) > 1e-4) { s.x = cur; s.v *= 0.5; }      // moved from outside: continue from there
        const h0 = Math.min(dt, 0.1), n = Math.min(12, Math.ceil(h0 * 240)), h = h0 / n;
        for (let i = 0; i < n; i++) { s.v += (w * w * (target - s.x) - 2 * z * w * s.v) * h; s.x += s.v * h; }
        obj[prop] = s.x + offNow;
        return s.x;
    }
    const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const mix = (a, b, t) => a + (b - a) * t;

    // ---------- two-handed grip: the off (buster) arm reaches the saber hilt — 2-bone IK ----------
    // Done in chest space (both arms hang from the chest) with plain quaternion math, so torso flips and spins don't matter.
    const Q = {
        euler(x, y, z, order) {                                   // three.js Euler → quaternion [x,y,z,w]
            const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
            return order === 'YXZ'
                ? [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3]
                : [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
        },
        rot(q, v) {                                               // rotate vector v by unit quaternion q
            const [qx, qy, qz, qw] = q, [x, y, z] = v;
            const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
            return [ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx];
        },
        mul(a, b) {
            const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
            return [ax * bw + aw * bx + ay * bz - az * by, ay * bw + aw * by + az * bx - ax * bz, az * bw + aw * bz + ax * by - ay * bx, aw * bw - ax * bx - ay * by - az * bz];
        },
        axis(ax, a) { const s = Math.sin(a / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(a / 2)]; },
        arc(a, b) {                                               // shortest rotation taking unit a to unit b
            const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            if (d < -0.999999) { const ax = Math.abs(a[0]) < 0.9 ? V3.n(V3.x(a, [1, 0, 0])) : V3.n(V3.x(a, [0, 1, 0])); return [ax[0], ax[1], ax[2], 0]; }
            const c = V3.x(a, b), q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(...q); return q.map(v => v / l);
        },
        slerp(a, b, t) {
            let [bx, by, bz, bw] = b, c = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
            if (c < 0) { c = -c; bx = -bx; by = -by; bz = -bz; bw = -bw; }
            if (c > 0.9995) { const q = [a[0] + (bx - a[0]) * t, a[1] + (by - a[1]) * t, a[2] + (bz - a[2]) * t, a[3] + (bw - a[3]) * t], l = Math.hypot(...q); return q.map(v => v / l); }
            const th = Math.acos(c), s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
            return [a[0] * ka + bx * kb, a[1] * ka + by * kb, a[2] * ka + bz * kb, a[3] * ka + bw * kb];
        },
        toXYZ(q) {                                                // quaternion → three.js Euler, order XYZ
            const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
            const m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy);
            const ey = Math.asin(Math.max(-1, Math.min(1, m13)));
            return Math.abs(m13) < 0.9999999 ? [Math.atan2(-m23, m33), ey, Math.atan2(-m12, m11)] : [Math.atan2(m32, m22), ey, 0];
        },
        toYXZ(q) {                                                // quaternion → three.js Euler, order YXZ
            const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
            const m11 = 1 - (yy + zz), m13 = xz + wy, m21 = xy + wz, m22 = 1 - (xx + zz), m23 = yz - wx, m31 = xz - wy, m33 = 1 - (xx + yy);
            const ex = Math.asin(-Math.max(-1, Math.min(1, m23)));
            return Math.abs(m23) < 0.9999999 ? [ex, Math.atan2(m13, m33), Math.atan2(m21, m22)] : [ex, Math.atan2(-m31, m11), 0];
        }
    };
    const V3 = {
        add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
        sc: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
        x: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
        len: a => Math.hypot(a[0], a[1], a[2]), n: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
        of: o => [o.x, o.y, o.z]
    };
    const qOf = o => Q.euler(o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.order || 'XYZ');
    // a point given in the local space of `obj` → chest space (walks up the parents to the chest)
    function toChest(P, obj, p) {
        let v = p;
        for (let o = obj; o && o !== P.chest; o = o.parent) v = V3.add(Q.rot(qOf(o), [v[0] * o.scale.x, v[1] * o.scale.y, v[2] * o.scale.z]), V3.of(o.position));
        return v;
    }
    const GRIP_ON_HILT = [0, 0.03, 0], GRIP_ON_ARM = 0.47;   // pommel end of the hilt · how far down the buster forearm the "hand" sits
    // place the buster arm so its forearm end holds the hilt; w = 0..1 blend with the current pose
    // generic 2-bone IK: limb root A (rotates freely), hinge joint J (bends about its X), effector `l2` down J's -Y.
    // tgt / pole are in A's parent space. sgn +1: the hinge folds forward (elbow), -1: backward (knee).
    function solveLimb(A, J, tgt, l2, sgn, pole, w, order) {
        const d = V3.sub(tgt, V3.of(A.position)), ep = V3.of(J.position), l1 = V3.len(ep);
        const dist = clamp(V3.len(d), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.002);
        const b = Math.acos(clamp((dist * dist - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1));
        const h = V3.add(ep, [0, -l2 * Math.cos(b), sgn * l2 * Math.sin(b)]);
        const dn = V3.n(d);
        let q = Q.arc(V3.n(h), dn);
        const e = Q.rot(q, ep), pe = V3.sub(e, V3.sc(dn, V3.dot(e, dn))), pp = V3.sub(pole, V3.sc(dn, V3.dot(pole, dn)));
        if (V3.len(pe) > 1e-4 && V3.len(pp) > 1e-4) {                     // swing the middle joint toward the pole
            const an = Math.atan2(V3.dot(V3.x(V3.n(pe), V3.n(pp)), dn), V3.dot(V3.n(pe), V3.n(pp)));
            q = Q.mul(Q.axis(dn, an), q);
        }
        const r = A.rotation, cur = Q.euler(r.x, r.y, r.z, order), o = (order === 'YXZ' ? Q.toYXZ : Q.toXYZ)(Q.slerp(cur, q, w));
        // the same rotation has two Euler forms (and ±2π copies): keep the one nearest the current angles, so the
        // joint springs never see a sudden 2π / flipped jump and spin the limb around when the IK lets go
        const near = (v, ref) => v + Math.round((ref - v) / (2 * Math.PI)) * 2 * Math.PI;
        const alt = order === 'YXZ' ? [Math.PI - o[0], o[1] + Math.PI, o[2] + Math.PI] : [o[0] + Math.PI, Math.PI - o[1], o[2] + Math.PI];
        const A1 = o.map((v, i) => near(v, [r.x, r.y, r.z][i])), A2 = alt.map((v, i) => near(v, [r.x, r.y, r.z][i]));
        const gap = E => Math.abs(E[0] - r.x) + Math.abs(E[1] - r.y) + Math.abs(E[2] - r.z), best = gap(A1) <= gap(A2) ? A1 : A2;
        r.order = order; r.x = best[0]; r.y = best[1]; r.z = best[2];
        J.rotation.x += (-sgn * b - J.rotation.x) * w;
    }
    function twoHand(P, w) {
        if (w <= 0.001 || !P.handHilt) return;
        const A = P.armR, side = Math.sign(A.position.x) || 1;
        solveLimb(A, P.elbowR, toChest(P, P.handHilt, GRIP_ON_HILT), GRIP_ON_ARM, 1, V3.n([side, -0.9, -0.35]), w, 'YXZ');
    }
    // obj-local point → the space of `stop` (an ancestor), and back
    function up(P, obj, p, stop) {
        let v = p;
        for (let o = obj; o && o !== stop; o = o.parent) v = V3.add(Q.rot(qOf(o), [v[0] * o.scale.x, v[1] * o.scale.y, v[2] * o.scale.z]), V3.of(o.position));
        return v;
    }
    function down(P, obj, p, stop) {
        const chain = []; for (let o = obj; o && o !== stop; o = o.parent) chain.unshift(o);
        let v = p;
        for (const o of chain) { const q = qOf(o); v = Q.rot([-q[0], -q[1], -q[2], q[3]], V3.sub(v, V3.of(o.position))); v = [v[0] / o.scale.x, v[1] / o.scale.y, v[2] / o.scale.z]; }
        return v;
    }
    // wall slide contact: the hand and one boot are pressed flat on the actual wall surface
    function wallContact(P, w, time) {
        if (w <= 0.001 || !P.wallN || !P.footR) return;
        const M = P.mesh, ry = M.rotation.y, c = Math.cos(-ry), s = Math.sin(-ry), r = (P.body && P.body.r) || 0.5;
        const toMesh = v => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];      // world direction → mesh space (yaw only)
        const n = toMesh([P.wallN.x, 0, P.wallN.z]), w0 = V3.sc(n, -(r + 0.03));      // wall plane in mesh space (n points out of the wall)
        const onWall = p => V3.sub(p, V3.sc(n, V3.dot(V3.sub(p, w0), n)));
        const slip = Math.sin(time * 38) * 0.015;                                     // friction judder
        // hand: up and in front of its shoulder, on the wall
        const sh = up(P, P.armL, [0, 0, 0], M), hand = V3.add(onWall(sh), [0, 0.32 + slip, 0]);
        const tgtA = down(P, P.chest, hand, M), sideA = Math.sign(P.armL.position.x) || -1;
        solveLimb(P.armL, P.elbowL, tgtA, 0.47, 1, V3.n([sideA, -0.6, -0.4]), w, 'YXZ');
        // boot: the other side's foot braced on the wall about knee height, knee up toward the wall
        const boot = P.footR.parent, l2 = Math.abs(boot.position.y) + Math.abs(P.footR.position.y);   // knee → ankle
        const hip = up(P, P.legR, [0, 0, 0], M), foot = V3.add(V3.add(onWall(hip), V3.sc(n, 0.11)), [0, -0.62 - slip, 0]);   // ankle one sole-thickness off the wall
        const tgtL = down(P, P.torso, foot, M);
        const poleL = V3.sub(down(P, P.torso, V3.add(hip, V3.add(V3.sc(n, -1), [0, 0.6, 0])), M), V3.of(P.legR.position));   // knee toward the wall and up
        solveLimb(P.legR, P.kneeR, tgtL, l2, -1, V3.n(poleL), w, P.legR.rotation.order || 'XYZ');
        // sole flat against the wall (toes up)
        const T = P.torso, lvl = -(P.legR.rotation.x + P.kneeR.rotation.x + T.rotation.x) - Math.PI / 2;
        P.footR.rotation.x += (lvl - P.footR.rotation.x) * w;
    }
    function animate(P, dt, time, isMoving) {
        const T = P.torso;
        if (P.cyc) {                                          // legendary schemes: the light flows through their colours
            const n = P.cyc.length, u = (time * 0.3) % 1 * n, i = Math.floor(u), f = u - i, k = f * f * (3 - 2 * f);
            _cc.copy(P.cyc[i]).lerp(P.cyc[(i + 1) % n], k);
            P.mats.glow.color.copy(_cc); P.mats.glow.emissive.copy(_cc); if (P.flameMat) P.flameMat.color.copy(_cc);
        }
        const airborne = !P.isGrounded && !P.isDashing;
        const F = P.localF, S = P.localS;                    // move direction in body frame (+F forward)
        const hv = Math.hypot(P.velocity.x, P.velocity.z);
        const amp = clamp(hv / 15, 0.3, 1.15);               // stride size follows speed (analog stick)
        const L = { hip: 0, knee: 0.15, foot: 0, z: 0 }, R = { hip: 0, knee: 0.15, foot: 0, z: 0 };
        let tLean = 0, tRoll = 0, tTwist = 0, cTwist = 0, tY = 1.3, aL = 0.1, aR = -0.05, eL = -0.35, eR = -0.35, aRy = 0, thrust = 0;
        let zL = -0.1, zR = 0.08;                            // shoulder abduction (arms out from the body)
        let footFlat = 1;                                    // 1 = keep soles parallel to the ground
        const running = isMoving && P.isGrounded && !P.isDashing;

        // take-off: the first instant after leaving the ground the legs are still pushing (extended, toes pointed)
        if (P._wasGround && airborne && P.velocity.y > 2 && P.jumpCount <= 1) P._toT = 0.16;
        P._wasGround = P.isGrounded;
        if (P._toT > 0) P._toT = Math.max(0, P._toT - dt);

        if (P.isDashing) {
            thrust = 1;
            if (F < -0.4) {            // back-dash: sit back, one knee up
                tLean = -0.25; tY = 1.18; L.hip = -0.55; L.knee = 0.7; R.hip = -0.15; R.knee = 0.95;
                aL = -0.5; aR = -0.4; eL = eR = -0.8; zL = -0.35; zR = 0.35;
            } else if (Math.abs(S) > 0.6) {   // side-dash: lean into it, knees bent, arms out for balance
                tRoll = -S * 0.35; tY = 1.16; L.hip = R.hip = -0.35; L.knee = R.knee = 0.75; L.z = R.z = -S * 0.35;
                eL = eR = -0.7; zL = -0.45; zR = 0.45;
            } else {                   // forward dash: low slide, front knee bent, rear leg stretched back
                tLean = 0.5; tY = 1.12; L.hip = -0.75; L.knee = 1.05; R.hip = 0.85; R.knee = 0.3;
                aL = 0.75; aR = 0.7; eL = eR = -0.35; footFlat = 0.6; zL = -0.2; zR = 0.2;
            }
        } else if (airborne) {
            const vy = P.velocity.y;
            if (P.jumpCount === 2 && vy > 0) {              // double jump: tuck
                L.hip = R.hip = -1.15; L.knee = R.knee = 1.9; tLean = 0.25; aL = aR = -0.6; eL = eR = -1.2;
            } else {
                // one continuous pose that flows with the vertical speed: knee drives up on the way up,
                // floats at the top, and the legs open and reach for the ground on the way down; the arms rise for balance
                const up = smooth((vy + 4) / 12), k = clamp(-vy / 25, 0, 1), drift = Math.sin(time * 5.5) * 0.07;
                L.hip = mix(-0.55 + 0.3 * k, -0.95, up) + drift; L.knee = mix(0.85 - 0.45 * k, 1.35, up);
                R.hip = mix(0.05, 0.25, up) - drift;             R.knee = mix(0.4 - 0.15 * k, 0.6, up);
                tLean = mix(0.04, 0.1, up);
                aL = mix(-0.4 - 0.35 * k, -0.55, up); aR = mix(-0.25 - 0.35 * k, 0.35, up);
                eL = mix(-0.6, -0.9, up); eR = mix(-0.6, -0.55, up);
                zL = mix(-0.3 - 0.3 * k, -0.15, up); zR = mix(0.3 + 0.3 * k, 0.15, up);
                if (P._toT > 0) {                            // still pushing off: legs straight, arms swung up
                    const w = smooth(P._toT / 0.16);
                    L.hip = mix(L.hip, -0.1, w); R.hip = mix(R.hip, 0.2, w); L.knee = mix(L.knee, 0.12, w); R.knee = mix(R.knee, 0.1, w);
                    aL = mix(aL, -1.15, w); aR = mix(aR, -0.9, w); eL = mix(eL, -0.5, w); eR = mix(eR, -0.5, w); tLean = mix(tLean, -0.05, w);
                }
            }
            footFlat = 0.3;
        } else if (isMoving) {
            // gait phase advances with distance travelled (backwards when backpedalling)
            const dir = F < -0.25 ? -1 : 1;
            P.gait = (P.gait + dt * Math.PI * 2 * (1.1 + 2.0 * amp) * dir) % (Math.PI * 200);
            const fw = Math.max(Math.abs(F), 0.25), sw = Math.abs(S);
            const A = 0.95 * amp * fw;
            const legPose = (o, p) => {
                o.hip = -A * Math.sin(p);                                           // thigh swing
                const bend = Math.pow(Math.max(0, Math.sin(p + 2.5 * dir)), 1.4);   // knee folds during the swing, peaks just after toe-off
                o.knee = 0.18 + (0.25 + 1.35 * amp) * bend * fw;
                o.bend = bend;
                o.z = sw * 0.3 * Math.max(0, Math.sin(p)) * Math.sign(S);           // side-steps when strafing
            };
            legPose(L, P.gait); legPose(R, P.gait + Math.PI);
            // double-frequency bounce, body lower at bigger strides; the pelvis rocks with each step
            tY = 1.3 - 0.06 * amp + 0.07 * amp * Math.cos(2 * P.gait);
            tLean = F > 0 ? 0.32 * amp * F : 0.12 * F;
            tRoll = -S * 0.12 + 0.05 * amp * Math.sin(P.gait) * fw;
            tTwist = 0.12 * amp * Math.sin(P.gait) * fw; cTwist = -0.26 * amp * Math.sin(P.gait) * fw;
            // arms swing opposite to the legs, elbows bent like a runner, shoulders loose
            const armA = 0.85 * amp * fw;
            aL = armA * Math.sin(P.gait); aR = -armA * Math.sin(P.gait);
            eL = -(0.55 + 0.6 * amp) - 0.35 * amp * Math.max(0, -Math.sin(P.gait));
            eR = -(0.55 + 0.6 * amp) - 0.35 * amp * Math.max(0, Math.sin(P.gait));
            zL = -0.12 - 0.04 * amp * (1 + Math.cos(P.gait)); zR = 0.1 + 0.04 * amp * (1 - Math.cos(P.gait));
            // sprint: at full speed going forward, arms sweep back and the body drops into a deep lean
            const nk = clamp((amp - 0.7) / 0.3, 0, 1) * clamp((F - 0.4) / 0.4, 0, 1);
            if (nk > 0) {
                const sw2 = Math.sin(P.gait) * 0.12;
                aL = aL + (1.15 + sw2 - aL) * nk; aR = aR + (1.15 - sw2 - aR) * nk;
                eL = eL + (-0.25 - eL) * nk; eR = eR + (-0.25 - eR) * nk;
                tLean = tLean + (0.62 - tLean) * nk; tY -= 0.06 * nk; cTwist *= 1 - 0.6 * nk;
            }
        } else {
            // ready stance: breathing, a slow shift of weight from one leg to the other, arms hanging loose
            const br = Math.sin(time * 2.6), ws = Math.sin(time * 0.55), sway = Math.sin(time * 0.37 + 1.3);
            tY = 1.28 + br * 0.012 - Math.abs(ws) * 0.01;
            L.hip = -0.14 + 0.04 * ws; R.hip = -0.06 - 0.04 * ws; L.knee = 0.26 + 0.08 * Math.max(0, -ws); R.knee = 0.16 + 0.08 * Math.max(0, ws);
            L.z = -0.05 + 0.03 * ws; R.z = 0.05 + 0.03 * ws;
            tRoll = 0.035 * ws; tTwist = 0.03 * sway; cTwist = -0.02 * sway; tLean = 0.02 * br;
            aL = 0.12 + br * 0.025 + 0.03 * sway; aR = -0.02 + br * 0.02 - 0.03 * sway; eL = -0.4 - 0.04 * br; eR = -0.3 - 0.04 * br;
            zL = -0.12 - 0.02 * br; zR = 0.1 + 0.02 * br;
        }

        // landing: the knees give a moment after touch-down, then the body rises back (deeper on harder landings)
        if (P.landT > 0) {
            if (!(P._landD > 0) || P.landT > P._landD) P._landD = P.landT;
            P.landT -= dt;
            const p = clamp(1 - P.landT / P._landD, 0, 1), depth = clamp(P._landD / 0.2, 0.45, 1);
            const k = (p < 0.25 ? Math.sin(p / 0.25 * Math.PI / 2) : 1 - smooth((p - 0.25) / 0.75)) * depth;
            L.hip -= 0.55 * k; R.hip -= 0.5 * k; L.knee += 1.05 * k; R.knee += 1.0 * k; tY -= 0.3 * k; tLean += 0.18 * k;
            eL -= 0.3 * k; eR -= 0.3 * k; zL -= 0.15 * k; zR += 0.15 * k;
        } else P._landD = 0;

        // momentum: lean into acceleration, lean back when braking, bank into turns
        if (!P._pv) { P._pv = P.velocity.clone(); P._py = P.mesh.rotation.y; P._accF = 0; P._bank = 0; P._flipAdd = 0; P._spinAdd = 0; }
        {
            const ry = P.mesh.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry);
            const accF = ((P.velocity.x - P._pv.x) * fx + (P.velocity.z - P._pv.z) * fz) / Math.max(dt, 1e-3);
            let dy = ry - P._py; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
            P._accF = damp(P._accF, P.isGrounded && !P.isDashing ? clamp(accF * 0.004, -0.3, 0.22) : 0, 8, dt);
            P._bank = damp(P._bank, P.isGrounded ? clamp(-dy / Math.max(dt, 1e-3) * 0.05 * amp, -0.32, 0.32) : 0, 8, dt);
            P._pv.copy(P.velocity); P._py = ry;
            tLean += P._accF; tRoll += P._bank;
        }
        if (P.skidT > 0 && P.isGrounded) {                                   // skid: brace on the front leg, lean back, arms out
            tLean -= 0.4; L.hip = -0.7; L.knee = 0.5; R.hip = 0.2; R.knee = 0.8; tY -= 0.12; footFlat = 0.7; zL = -0.45; zR = 0.45; aL = aR = -0.3;
        }
        if (P.wallSlide > 0 && airborne && !P.ledge) {                      // wall slide: facing the wall, one hand and one foot braking on it
            if (!(P._wsW > 0.05)) P._wsHit = 0.22;                              // first touch: the body gives a little as it catches the wall
            if (P._wsHit > 0) P._wsHit -= dt;
            const hit = P._wsHit > 0 ? Math.sin((1 - P._wsHit / 0.22) * Math.PI) : 0;
            const rub = Math.sin(time * 38) * 0.025, push = P.wallPush ? 1 : 0.6;   // a little judder from the friction
            tLean = -0.1 + 0.08 * hit; tRoll = 0.05; tY = 1.22 - 0.1 * hit;
            L.hip = -0.95 + rub; L.knee = 1.3; R.hip = -0.3; R.knee = 0.85 - rub; L.z = -0.06; R.z = 0.1;
            aL = -2.35 - 0.2 * push + rub; eL = -0.45; zL = -0.25; aR = -0.85; eR = -1.0; zR = 0.3; footFlat = 0.5;
        }
        let flipAdd = 0, spinAdd = 0, noPlant = false;
        const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        if (P.flipT > 0 && airborne) {                                       // double jump → front flip, tucked
            const fp = 1 - P.flipT / 0.46;
            flipAdd = ease(fp) * Math.PI * 2;
            const open = smooth((fp - 0.75) / 0.25);                         // opens out of the tuck at the end of the turn
            L.hip = R.hip = mix(-1.35, -0.6, open); L.knee = R.knee = mix(2.15, 0.9, open); aL = aR = mix(-0.9, -0.5, open); eL = eR = mix(-1.4, -0.7, open); footFlat = 0;
        }
        if (P.wallJumpT > 0 && airborne) {                                   // wall kick → corkscrew
            spinAdd = ease(1 - P.wallJumpT / 0.32) * Math.PI * 2 * (P.slashSide || 1);
            L.hip = -1.1; L.knee = 1.6; R.hip = 0.2; R.knee = 0.6; aL = -1.8; aR = 0.6;
        }
        if (P.diving && airborne) {                                          // METEOR DIVE (training wing): one knee up, the other leg driving down, arms swept back
            tLean = 0.3; L.hip = 0.15; L.knee = 0.1; R.hip = -1.3; R.knee = 1.8; aL = 0.95; aR = 0.95; eL = eR = -0.2; zL = -0.35; zR = 0.35; footFlat = 0; flipAdd = 0;
        }
        if (P.rollT > 0) {                                                   // fast landing → forward roll
            const rp = 1 - P.rollT / 0.4;
            flipAdd = ease(rp) * Math.PI * 2; tY -= 0.75 * Math.sin(rp * Math.PI); tLean = 0.3;
            L.hip = R.hip = -1.5; L.knee = R.knee = 2.25; aL = aR = -1.2; eL = eR = -1.5; noPlant = true; footFlat = 0;
        }

        // ledge climb (game.js sets P.ledge): hang from both hands → pull up → knee over the edge → stand
        if (P.ledge) {
            const Lg = P.ledge, sm = x => smooth(x);
            noPlant = true; footFlat = 0.25; flipAdd = 0; spinAdd = 0; tRoll = 0; tTwist = 0; cTwist = 0; zL = -0.14; zR = 0.14;
            //        aArm   eArm   lean   tY    Lhip   Lknee  Rhip   Rknee
            const K = [[-2.5, -0.15, -0.05, 1.3, -0.3, 0.6, -0.1, 0.35],      // hanging, arms up on the edge, legs loose
                       [-1.1, -2.1, 0.15, 1.25, -1.2, 1.7, -0.2, 0.6],        // pulled up: elbows down, knee driving up
                       [0.15, -0.35, 0.55, 1.05, -1.4, 2.0, 0.35, 0.6],       // pressing on the edge: knee over the lip, leaning in
                       [0.1, -0.35, 0.1, 1.25, -0.14, 0.26, -0.06, 0.16]];    // standing on top
            {                                                                       // a higher hang (shoulders at the edge) bends the arms
                const s = clamp((Lg.top - P.mesh.position.y - 2.15) / 0.55, 0, 1);
                if (Lg.phase === 'hang' || !Lg.from) { K[0][0] = mix(-1.9, -2.5, s); K[0][1] = mix(-1.0, -0.15, s); }
                else { const s0 = clamp((Lg.top - Lg.from.y - 2.15) / 0.55, 0, 1); K[0][0] = mix(-1.9, -2.5, s0); K[0][1] = mix(-1.0, -0.15, s0); }
            }
            let pose = K[0];
            if (Lg.phase === 'hang') {
                const sway = Math.sin(time * 6) * 0.06 * Math.max(0, 1 - Lg.t / 0.2);   // swings in from the grab
                pose = K[0].map((v, i) => i === 4 || i === 6 ? v + sway : v);
            } else {
                const k = clamp(Lg.t / (Lg.dur || 0.5), 0, 1), seg = k < 0.4 ? 0 : k < 0.7 ? 1 : 2;
                const u = sm(seg === 0 ? k / 0.4 : seg === 1 ? (k - 0.4) / 0.3 : (k - 0.7) / 0.3);
                pose = K[seg].map((v, i) => mix(v, K[seg + 1][i], u));
            }
            aL = aR = pose[0]; eL = eR = pose[1]; tLean = pose[2]; tY = pose[3];
            L.hip = pose[4]; L.knee = pose[5]; R.hip = pose[6]; R.knee = pose[7]; L.z = R.z = 0;
            aR += 0.06; eR -= 0.05;                                                   // not perfectly symmetric
        }

        // right arm: aim the buster, or swing the saber — anticipation, a fast cut driven by the hips, follow-through
        const aiming = P.aimTimer > 0 || P.charge > 0.05;
        let aLy = 0;
        const hol = holster(P, dt, aiming), reach = (u, back) => {        // sword hand up over its shoulder to the hilt
            const k = u < 0.5 ? u / 0.5 : 1 - (u - 0.5) / 0.5, e = k * k * (3 - 2 * k);
            aL = 0.1 + (-2.95 - 0.1) * e; eL = -0.35 - 1.55 * e; aLy = -0.3 * e; tTwist = 0.12 * e; cTwist = 0.2 * e;
            if (!back && u >= 0.5) { const f = (u - 0.5) / 0.5; aL = -2.95 + 1.6 * f; eL = -1.9 + 1.6 * f; aLy = -0.3 - 0.9 * f; }   // pull it out into the cut
        };
        if (hol.draw >= 0) reach(hol.draw, false);
        else if (P.slashTimer > 0) {
            const p = clamp(1 - P.slashTimer / ((P.slashDur || 0.28) - (P._drawX || 0)), 0, 1), kind = P.slashKind || 'h1';
            const W = kind === 'fin' ? 0.34 : kind === 'air' ? 0.05 : kind === 'spin' ? 0.12 : 0.2;
            const wind = p < W, u = wind ? smooth(p / W) : (p - W) / (1 - W), e = 1 - Math.pow(1 - u, 3);
            const step = smooth(p / Math.max(W + 0.25, 0.3));                 // the feet move into the cut, not before it
            const lerp = mix;
            let tw = 0;
            eR = -0.1;
            if (kind === 'h1') {                     // horizontal cut: coil to the sword side, whip across
                aR = -1.3; eR = wind ? -0.55 : lerp(-0.55, -0.05, e);
                if (wind) { aRy = lerp(0, 1.55, u); tw = lerp(0, 0.5, u); } else { aRy = lerp(1.55, -1.55, e); tw = lerp(0.5, -0.65, e); }
                tLean = lerp(0.05, 0.28, step); tY -= 0.1 * step; L.hip = -0.8 * step; L.knee = lerp(0.2, 0.75, step); R.hip = 0.6 * step; R.knee = lerp(0.2, 0.35, step);
                aL = lerp(-0.3, 0.7, wind ? 0 : e); eL = -1.1; zR = 0.35;
            } else if (kind === 'h2') {              // rising backhand: from low across the body up and out
                if (wind) { aR = lerp(-0.6, -0.35, u); aRy = lerp(0, -1.45, u); tw = lerp(0, -0.5, u); eR = lerp(-0.1, -0.6, u); }
                else { aR = lerp(-0.35, -2.55, e); aRy = lerp(-1.45, 1.3, e); tw = lerp(-0.5, 0.6, e); eR = lerp(-0.6, -0.1, e); }
                tLean = lerp(0.3, -0.05, wind ? 0 : e); L.hip = -0.45 * step; L.knee = lerp(0.2, 0.55, step); R.hip = 0.4 * step; R.knee = lerp(0.2, 0.5, step);
                aL = -0.9; eL = -0.9; tY -= 0.06 * step;
            } else if (kind === 'fin') {             // overhead cleave: rise and arch, then drop into a deep lunge
                if (wind) { aR = lerp(-1.0, -3.05, u); eR = lerp(-0.2, -0.75, u); tLean = lerp(0, -0.28, u); tY += 0.06 * u; aL = lerp(0, -2.8, u); eL = -0.5; L.knee = R.knee = lerp(0.2, 0.05, u); }
                else {
                    aR = lerp(-3.05, -0.2, e); eR = lerp(-0.75, 0, e); tLean = lerp(-0.28, 0.62, e); tY -= 0.34 * e;
                    L.hip = -1.0 * e; L.knee = 1.25 * e; R.hip = 0.8 * e; R.knee = 0.3 + 0.1 * e; aL = lerp(-2.8, 0.8, e); eL = -0.5;
                }
            } else if (kind === 'spin') {            // CYCLONE EDGE (training wing): blade held out level, two full turns on bent, planted legs
                aR = -1.5; aRy = wind ? lerp(0.2, 1.2, u) : lerp(1.2, 0.7, e); aL = 0.9; eL = -0.3; zR = 0.4; eR = -0.05;
                tY -= 0.16 * (wind ? u : 1); tLean = 0.08; L.hip = -0.5; L.knee = 0.7; R.hip = 0.45; R.knee = 0.6;
                spinAdd = wind ? 0 : ease(u) * Math.PI * 4;
            } else {                                 // air: spinning cut, legs tucked
                aR = -1.5; aRy = 0.8; aL = 0.9; eL = -0.3; zR = 0.4;
                L.hip = R.hip = -1.0; L.knee = R.knee = 1.6; footFlat = 0;
                spinAdd = ease(u) * Math.PI * 2 * 1.5;
            }
            tTwist = tw * 0.45; cTwist = tw * 0.65;                               // the hips lead, the chest follows (its spring is slower)
            // the cuts were authored for the other arm: mirror them onto the sword hand
            [aL, aR] = [aR, aL]; [eL, eR] = [eR, eL]; aLy = -aRy; aRy = 0; tTwist = -tTwist; cTwist = -cTwist; spinAdd = -spinAdd;
            [zL, zR] = [-zR, -zL];
            [L.hip, R.hip] = [R.hip, L.hip]; [L.knee, R.knee] = [R.knee, L.knee];
        } else if (aiming) {
            aR = -Math.PI / 2 - P.aimPitch + (P.recoilTimer > 0 ? 0.25 : 0); eR = 0;
        }
        else if (hol.sheath >= 0) reach(hol.sheath, true);

        // two-handed saber, Zero-style: every cut and the guard are held with both hands — the buster arm grips the
        // pommel end of the hilt (IK below). Two hands can't swing as wide as one, so the sweep moves into the hips and
        // chest: the hands stay in front of the body and the whole torso turns through the cut.
        const cutting = P.slashTimer > 0 && hol.draw < 0 && P.drawn && !aiming;
        const guard = P.drawn && P.isGrounded && !isMoving && !P.isDashing && P.slashTimer <= 0 && !aiming && hol.draw < 0 && hol.sheath < 0 && !(P.rollT > 0);
        if (cutting) {
            const sw = aLy;
            aL = clamp(aL, -2.1, -0.45); aLy = clamp(0.95 + 0.3 * sw, 0.5, 1.35); eL = Math.min(eL, -0.25);
            tTwist += 0.22 * sw; cTwist += 0.28 * sw;
            if (P.isGrounded) { tY -= 0.06; L.z -= 0.08; R.z += 0.08; }                // a wider, lower base for a two-handed swing
        } else if (P.blocking && P.drawn && hol.draw < 0) {
            // SABER GUARD: side-on behind the blade, which is held up across the body in both hands; knees bent, weight low.
            // A blocked hit jolts the arms back for a moment (P.guardHit).
            const jolt = Math.max(0, P.guardHit || 0) / 0.18, br = Math.sin(time * 3.2);
            tTwist = -0.38; cTwist = -0.26; tLean = 0.1 - 0.12 * jolt; tRoll = 0.03;
            if (!isMoving) { tY = 1.11 + 0.01 * br; R.hip = -0.6; R.knee = 0.85; L.hip = 0.4; L.knee = 0.62; L.z = -0.12; R.z = 0.12; footFlat = 1; }
            aL = -1.5 + 0.25 * jolt; aLy = 0.62; eL = -1.15 - 0.2 * jolt; zL = -0.2;
        } else if (guard) {
            // battle stance after a combo: side-on, knees bent, weight low, saber held in both hands at the waist,
            // blade angled forward and down — ready to cut again (until the saber goes back on the back)
            const br = Math.sin(time * 2.4);
            tTwist = -0.3; cTwist = -0.22; tLean = 0.14 + 0.01 * br; tRoll = 0.04; tY = 1.14 + 0.012 * br;
            R.hip = -0.5; R.knee = 0.7; L.hip = 0.32; L.knee = 0.55; L.z = -0.1; R.z = 0.1; footFlat = 1;
            aL = -0.58 + 0.02 * br; aLy = 0.88; eL = -0.5; zL = -0.1;
        }

        // spring stiffness (ω, rad/s) and damping (ζ) per body part and situation:
        // repeating cycles (run) need stiff springs to keep their shape; pose changes use soft ones so they flow
        const slash = P.slashTimer > 0, swing = slash || hol.draw >= 0 || hol.sheath >= 0;
        const wT = slash ? 24 : running ? 36 : 13, wC = slash ? 17 : running ? 30 : 10;
        const wLeg = running ? 58 : flipAdd || P.rollT > 0 ? 34 : 24, zLeg = 0.92;
        const wArm = swing ? 34 : running ? 42 : aiming ? 40 : P.ledge ? 30 : 15, zArm = swing ? 0.62 : 0.8;
        const wElb = swing ? 26 : running ? 40 : aiming ? 40 : P.ledge ? 28 : 12, zElb = swing ? 0.55 : 0.72;

        spr(P, 'tx', T.rotation, 'x', tLean, wT, 0.82, dt, P._flipAdd, 0);
        spr(P, 'tz', T.rotation, 'z', tRoll, wT * 0.9, 0.8, dt);
        spr(P, 'ty', T.rotation, 'y', tTwist, wT, 0.78, dt, P._spinAdd, 0);
        const baseRX = T.rotation.x;
        spr(P, 'cy', P.chest.rotation, 'y', cTwist, wC, 0.72, dt);
        T.position.y = damp(T.position.y, tY + (P.torsoBase || 1.35) - 1.35, running ? 18 : 12, dt);

        // legs: hips compensate the torso lean so the feet stay under the body
        const legs = [['l', P.legL, P.kneeL, P.footL, L], ['r', P.legR, P.kneeR, P.footR, R]];
        for (const [id, hip, knee, foot, o] of legs) {
            spr(P, id + 'hx', hip.rotation, 'x', o.hip - baseRX * 0.85, wLeg, zLeg, dt);
            spr(P, id + 'hz', hip.rotation, 'z', o.z, wLeg * 0.8, zLeg, dt);
            spr(P, id + 'hy', hip.rotation, 'y', 0, wLeg * 0.8, zLeg, dt);   // the thigh never stays twisted (the wall-contact IK turns it, this brings it back)
            spr(P, id + 'k', knee.rotation, 'x', o.knee, wLeg, zLeg, dt);
            if (knee.rotation.x < 0.02) { knee.rotation.x = 0.02; P._sp[id + 'k'].x = 0.02; P._sp[id + 'k'].v = Math.max(0, P._sp[id + 'k'].v); }   // a knee never bends backwards
            // ankle: keep the sole level on the ground, point the toes while the leg swings or in the air
            const level = -(hip.rotation.x + knee.rotation.x + baseRX);
            const point = 0.45 * (o.bend || 0) + (airborne ? 0.35 : 0) + (P._toT > 0 ? 0.5 * P._toT / 0.16 : 0);
            spr(P, id + 'f', foot.rotation, 'x', level * footFlat + point, wLeg * 1.1, 0.9, dt);
        }
        // foot planting: on the ground, shift the body so the lowest sole touches the floor exactly
        // (no sinking in crouches, no floating in strides, whatever the leg lengths are)
        if (P.isGrounded && !noPlant) {
            P.footL.updateWorldMatrix(true, false); P.footR.updateWorldMatrix(true, false);   // leg chains only
            let low = Infinity, fl = Infinity, fr = Infinity;
            const feet = FEET(P);
            for (let fi = 0; fi < 2; fi++) {
                for (let zi = 0; zi < 2; zi++) { const z = zi ? 0.2 : -0.12;          // heel and toe
                    _v.set(0, -0.108, z).applyMatrix4(feet[fi].matrixWorld);
                    const y = _v.y - P.mesh.position.y;
                    low = Math.min(low, y); if (fi) fr = Math.min(fr, y); else fl = Math.min(fl, y);
                }
            }
            if (isFinite(low)) T.position.y -= low;
            // footfall: the moment the other foot becomes the lowest one = heel strike → step sound
            if (P.onStep && isMoving && hv > 1.5) {
                const side = fl < fr - 0.02 ? 0 : fr < fl - 0.02 ? 1 : P._stepSide;
                if (side !== undefined && side !== P._stepSide) { if (P._stepSide !== undefined) P.onStep(hv); P._stepSide = side; }
            } else { if (P._stepSide !== undefined && P.onStepEnd) P.onStepEnd(); P._stepSide = undefined; }
        }

        spr(P, 'alx', P.armL.rotation, 'x', aL - (slash ? baseRX : 0), wArm, zArm, dt);
        spr(P, 'aly', P.armL.rotation, 'y', aLy, swing ? 36 : 18, swing ? 0.62 : 0.8, dt);
        spr(P, 'alz', P.armL.rotation, 'z', zL, swing ? 26 : 12, 0.75, dt);
        spr(P, 'arx', P.armR.rotation, 'x', aR - (aiming ? baseRX : 0), aiming ? 40 : wArm, aiming ? 0.9 : zArm, dt);
        spr(P, 'ary', P.armR.rotation, 'y', aRy - (aiming ? T.rotation.y - P._spinAdd + P.chest.rotation.y : 0), aiming ? 40 : swing ? 36 : 18, aiming ? 0.9 : 0.75, dt);
        spr(P, 'arz', P.armR.rotation, 'z', zR, swing ? 26 : 12, 0.75, dt);
        spr(P, 'elx', P.elbowL.rotation, 'x', Math.min(0, eL), wElb, zElb, dt);
        spr(P, 'erx', P.elbowR.rotation, 'x', Math.min(0, eR), aiming ? 40 : wElb, aiming ? 0.9 : zElb, dt);
        if (P.elbowL.rotation.x > 0) P.elbowL.rotation.x = 0;                // elbows don't hyperextend
        if (P.elbowR.rotation.x > 0) P.elbowR.rotation.x = 0;
        P._grip = damp(P._grip || 0, cutting || guard || (P.blocking && P.drawn) ? 1 : 0, cutting ? 26 : 14, dt);
        twoHand(P, P._grip);
        // plant hand and boot on the wall only once he actually faces it (while he is still turning, a planted
        // boot would have to twist the whole leg round)
        const facing = P.wallN ? -(Math.sin(P.mesh.rotation.y) * P.wallN.x + Math.cos(P.mesh.rotation.y) * P.wallN.z) : 0;
        const wsOn = P.wallSlide > 0 && airborne && !P.ledge && !(P.slashTimer > 0) && !aiming;
        P._wsW = damp(P._wsW || 0, wsOn ? clamp((facing - 0.55) / 0.35, 0, 1) : 0, wsOn ? 16 : 10, dt);
        wallContact(P, P._wsW, time);

        P._flipAdd = flipAdd; P._spinAdd = spinAdd;
        T.rotation.x += flipAdd; T.rotation.y += spinAdd;

        if (airborne && !flipAdd) {
            const st = clamp(1 + P.velocity.y * 0.006, 0.95, 1.05);
            T.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
        } else T.scale.set(1, 1, 1);

        updateTrail(P, dt);

        // head (and eyes) track the enemy he's aware of
        let yaw = 0, pitch = 0, aimPitch = 0, yawRaw = 0;
        const lt = P.lookTarget && !P.lookTarget.isDead ? P.lookTarget : null;
        if (lt) {
            const hp = P.mesh.position.clone(); hp.y += 2.95;
            const d = lt.aimPoint().sub(hp);
            let a = Math.atan2(d.x, d.z) - P.mesh.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
            const flat = Math.hypot(d.x, d.z);
            yaw = clamp(a, -1.15, 1.15);
            pitch = clamp(Math.atan2(d.y, flat), -0.5, 0.45);
            aimPitch = clamp(Math.atan2(d.y + 0.4, flat), -0.8, 1.0);
        }
        P.headYaw = damp(P.headYaw, yaw, 9, dt); P.headPitch = damp(P.headPitch, pitch, 9, dt);
        P.aimPitch = damp(P.aimPitch, aimPitch, 20, dt);
        P.headGroup.rotation.order = 'YXZ';
        // the head keeps the eyes level: it turns against the hips/chest twist and the body's roll and lean
        const twist = (T.rotation.y - spinAdd) + P.chest.rotation.y;
        P.headGroup.rotation.y = damp(P.headGroup.rotation.y, P.headYaw - twist * 0.6, 14, dt);
        P.headGroup.rotation.x = damp(P.headGroup.rotation.x, -(T.rotation.x - flipAdd) * 0.6 - P.headPitch, 10, dt);
        P.headGroup.rotation.z = damp(P.headGroup.rotation.z, -T.rotation.z * 0.55, 10, dt);
        P.thrusters.forEach((f, i) => {
            const target = thrust * (0.8 + Math.sin(time * 60 + i) * 0.25);
            f.scale.y = Math.max(0.001, damp(f.scale.y, target, 25, dt));
        });
        P.coreGem.rotation.y += dt * 2;

        // --- face: blinking lids, expressions, eye gaze, mouth ---
        P.blinkTimer -= dt;
        if (P.blinkTimer <= -0.14) P.blinkTimer = rand(2.2, 4.8) * (Math.random() < 0.15 ? 0.15 : 1);   // sometimes a quick double blink
        const bt = P.blinkTimer < 0 ? -P.blinkTimer / 0.14 : -1;                                         // 0..1 through a blink
        const blinkAmt = bt >= 0 ? Math.sin(bt * Math.PI) : 0;                                            // close fast, reopen
        const fierce = P.charge > 0.3 || P.slashTimer > 0 || P.isDashing;
        const rest = P.hurtTimer > 0 ? 0.55 : fierce ? 0.3 : P.lockedEnemy ? 0.22 : 0.14;                 // lid resting height = mood
        P.eyeLid = damp(P.eyeLid, rest, 14, dt);
        const lidK = Math.max(P.eyeLid, blinkAmt);
        // gaze: the eyes lead the head toward the target
        let gx = 0, gy = 0;
        if (lt) { gx = clamp((yawRaw - P.headYaw) * 0.012, -0.007, 0.007); gy = clamp((pitch - P.headPitch) * 0.01 + pitch * 0.006, -0.005, 0.005); }
        P.gaze.x = damp(P.gaze.x, gx, 10, dt); P.gaze.y = damp(P.gaze.y, gy, 10, dt);
        P.eyes.forEach(e => {
            const u = e.userData;
            u.lidSkin.scale.y = Math.max(0.001, lidK);                 // lid skin grows down from the brow line
            u.lash.position.y = -0.09 * lidK;                          // lash line rides the lid edge
            u.iris.position.set(-u.s * 0.003 + P.gaze.x, -0.006 + P.gaze.y, 0.0015);
            u.brow.position.y = u.browY - (fierce ? 0.008 : 0) + (P.hurtTimer > 0 ? 0.006 : 0);
        });
        // mouth opens into a shout on attacks and dashes
        P.mouthAmt = damp(P.mouthAmt, fierce || P.hurtTimer > 0 ? 1 : 0, 18, dt);
        P.mouthOpen.visible = P.mouthAmt > 0.05; P.mouthClosed.visible = !P.mouthOpen.visible;
        P.mouthOpen.scale.y = Math.max(0.01, P.mouthAmt);

        // back vanes flare open on dash / double jump
        const flare = P.isDashing ? 1 : (airborne && P.jumpCount === 2 ? 0.6 : 0);
        P.vanes.forEach(v => {
            const s = v.userData.s;
            v.rotation.z = damp(v.rotation.z, -s * (0.5 + flare * 0.6), 12, dt);
            v.rotation.x = damp(v.rotation.x, -0.25 - flare * 0.4, 12, dt);
        });

        // energy scarf: cloth tails (see updateScarf)
        updateScarf(P, dt, time, Math.hypot(P.velocity.x, P.velocity.z));

        // hurt blink
        if (P.dead) { P.mesh.visible = false; return; }
        const blink = P.invincibleTimer > 0 && Math.sin(time * 40) > 0;
        P.mesh.visible = !(blink && P.hurtTimer <= 0);
        P.mats.pearl.emissive.setHex(P.hurtTimer > 0 ? 0xff1030 : 0x000000);
    }

    H.animate = animate;
    H.updateTrail = updateTrail;
})();
