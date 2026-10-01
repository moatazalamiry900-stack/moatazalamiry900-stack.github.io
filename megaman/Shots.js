// =====================================================================
//  AXON BREACH — buster shots, charging and enemy plasma (visual side only; damage stays in game.js)
//   • Three buster tiers, each with its own shape and colour:
//       LV0 lemon     — a small gold plasma pellet with a short streak
//       LV1 half-charge — a green-cyan plasma bolt wrapped in two spinning rings
//       LV2 full charge — a big violet plasma core behind a double crescent wave, spiral rings, long tail
//   • Charging: energy motes are sucked into the buster, a glowing aura with rings grows on the arm,
//     each level is announced by a burst; at full charge the whole armour flashes. The HUD charge bar
//     changes colour per level and shows LV1 / LV2.
//   • Muzzle flashes and impact bursts in the colour of the tier.
//   • Enemy shots: a hot pink-white core in a soft red glow, a spinning ring and a fading tail.
//  Everything is pooled and shares geometry / materials: no allocations while shooting.
//  Loaded by index.html before game.js; game.js builds it with AxonShots.create({...}).
// =====================================================================
'use strict';

window.AxonShots = (function () {
    const TIER = [
        { col: 0xffc93c, core: 0xfff6d6, hot: 0xffe9a0 },          // LV0 gold
        { col: 0x3dffb6, core: 0xeafff8, hot: 0x9dfff0 },          // LV1 green-cyan
        { col: 0x7d7bff, core: 0xf2ecff, hot: 0xd27bff }           // LV2 violet / pink
    ];
    const ENEMY = { col: 0xff2a5a, core: 0xffe2ea, ring: 0xff7a96 };

    function create(c) {
        const { THREE, scene } = c;
        const Z = new THREE.Vector3(0, 0, 1), _v = new THREE.Vector3(), _q = new THREE.Quaternion();

        // ---------- shared shaders ----------
        // soft plasma glow: bright where the surface faces the camera, fading to nothing at the rim
        const glowMat = (color, power = 1.6, strength = 1) => new THREE.ShaderMaterial({
            uniforms: { color: { value: new THREE.Color(color) }, power: { value: power }, strength: { value: strength } },
            vertexShader: `varying vec3 vN; varying vec3 vV;
                void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `uniform vec3 color; uniform float power; uniform float strength; varying vec3 vN; varying vec3 vV;
                void main(){ float d = max(dot(normalize(vN), normalize(vV)), 0.0); float a = pow(d, power) * strength; gl_FragColor = vec4(color * (1.0 + a * 0.6), clamp(a, 0.0, 1.0)); }`,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });
        // tail streak: opaque at the head, fading along its length and toward its edges
        const trailMat = (head, tail) => new THREE.ShaderMaterial({
            uniforms: { head: { value: new THREE.Color(head) }, tail: { value: new THREE.Color(tail) }, strength: { value: 1 } },
            vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
                void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `uniform vec3 head; uniform vec3 tail; uniform float strength; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
                void main(){ float t = vUv.y; float e = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 0.9);
                  float a = pow(1.0 - t, 1.7) * e * strength; gl_FragColor = vec4(mix(head, tail, t), clamp(a, 0.0, 1.0)); }`,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        const GLOW = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.75)'); gr.addColorStop(0.42, 'rgba(255,255,255,.22)'); gr.addColorStop(0.7, 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
        const spriteMat = (col, op = 1) => new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        const sprite = (mat, size) => { const s = new THREE.Sprite(mat); s.scale.set(size, size, 1); s.frustumCulled = false; s.userData.size = size; return s; };
        const add = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        const solid = col => new THREE.MeshBasicMaterial({ color: col });

        // ---------- shared geometry (all built along +z: the direction of travel) ----------
        const sphere = new THREE.SphereGeometry(1, 18, 12);
        const tailGeo = (len, r) => { const g = new THREE.CylinderGeometry(r * 0.15, r, len, 14, 1, true); g.rotateX(-Math.PI / 2); g.translate(0, 0, -len / 2); return g; };   // head at z = 0, tail toward -z (uv.y: 0 head → 1 tail)
        const ring = (r, t) => new THREE.TorusGeometry(r, t, 8, 40);
        const crescent = (r, t, arc) => { const g = new THREE.TorusGeometry(r, t, 10, 40, arc); g.rotateZ(Math.PI / 2 - arc / 2); g.rotateX(Math.PI / 2); return g; };   // bowed forward (+z)
        const tails = [tailGeo(1.6, 0.14), tailGeo(2.6, 0.24), tailGeo(4.4, 0.46)];
        const M = TIER.map(t => ({
            core: solid(t.core), glow: spriteMat(t.col, 0.75), glowHot: spriteMat(t.hot, 0.95),
            trail: trailMat(t.hot, t.col), ring: add(t.hot, 0.85), cres: add(t.hot, 0.9)
        }));

        // ---------- player shots (pooled per tier) ----------
        function buildShot(tier) {
            const g = new THREE.Group(), m = M[tier], parts = { rings: [] };
            const mesh = (geo, mat, sx = 1, sy = 1, sz = 1, z = 0) => { const o = new THREE.Mesh(geo, mat); o.scale.set(sx, sy, sz); o.position.z = z; o.frustumCulled = false; g.add(o); return o; };
            const spr = (mat, size) => { const s = sprite(mat, size); g.add(s); return s; };
            if (tier === 0) {
                parts.trail = mesh(tails[0], m.trail);
                parts.glow = spr(m.glow, 1.25); parts.hot = spr(m.glowHot, 0.55);
                parts.core = mesh(sphere, m.core, 0.1, 0.1, 0.2);
            } else if (tier === 1) {
                parts.trail = mesh(tails[1], m.trail);
                parts.glow = spr(m.glow, 2.0); parts.hot = spr(m.glowHot, 0.85);
                parts.core = mesh(sphere, m.core, 0.16, 0.16, 0.28);
                [0.4, 0.32].forEach((r, k) => { const o = mesh(ring(r, 0.032), m.ring, 1, 1, 1, -0.14 - k * 0.3); parts.rings.push(o); });
            } else {
                parts.trail = mesh(tails[2], m.trail);
                parts.glow = spr(m.glow, 3.1); parts.hot = spr(m.glowHot, 1.35);
                parts.core = mesh(sphere, m.core, 0.26, 0.26, 0.4);
                parts.cres = [mesh(crescent(1.0, 0.13, Math.PI * 1.1), m.cres, 1, 1, 1, -0.25), mesh(crescent(0.8, 0.09, Math.PI), m.cres, 1, 1, 1, -0.15)];
                parts.cres[1].rotation.z = Math.PI / 2;
                [0.7, 0.56].forEach((r, k) => { const o = mesh(ring(r, 0.045), m.ring, 1, 1, 1, -0.45 - k * 0.6); o.rotation.x = 0.35 * (k ? -1 : 1); parts.rings.push(o); });
            }
            g.userData = { tier, parts, age: 0 };
            return g;
        }
        const pool = [[], [], []], live = new Set();
        function shot(tier, pos, dir) {
            const g = pool[tier].pop() || buildShot(tier);
            g.userData.age = 0; g.position.copy(pos); g.quaternion.setFromUnitVectors(Z, _v.copy(dir).normalize()); g.visible = true;
            scene.add(g); live.add(g); animShot(g, 0, 0);
            return g;
        }
        function free(g) { if (!g || !live.has(g)) return; live.delete(g); scene.remove(g); pool[g.userData.tier].push(g); }
        function animShot(g, dt, time) {
            const u = g.userData, P = u.parts; u.age += dt;
            P.trail.scale.z = Math.min(1, 0.15 + u.age / 0.09);          // the tail grows out of the muzzle instead of poking into the arm
            const pulse = 1 + Math.sin(time * 38 + u.tier) * 0.07;
            P.glow.scale.setScalar(P.glow.userData.size * pulse); P.hot.scale.setScalar(P.hot.userData.size * (2 - pulse));
            P.core.scale.x = P.core.scale.y = [0.1, 0.16, 0.26][u.tier] * (1 + Math.sin(time * 61) * 0.08);
            P.rings.forEach((r, k) => { r.rotation.z += dt * (k ? -14 : 18); });
            if (P.cres) { const s = 1 + Math.sin(time * 24) * 0.06; P.cres.forEach((c, k) => c.scale.set(s, s, 1)); P.cres[1].rotation.z = Math.PI / 2 + Math.sin(time * 9) * 0.25; }
        }

        // ---------- short-lived bursts: muzzle flash, impact, level-up ----------
        const RING = new THREE.RingGeometry(0.82, 1, 40), bursts = [];
        for (let i = 0; i < 14; i++) {
            const g = new THREE.Group(); g.visible = false;
            const flash = sprite(spriteMat(0xffffff, 1), 1), rg = new THREE.Mesh(RING, add(0xffffff, 1)), rg2 = new THREE.Mesh(RING, add(0xffffff, 1));
            rg.material.side = rg2.material.side = THREE.DoubleSide; rg2.rotation.z = Math.PI / 4;
            [flash, rg, rg2].forEach(o => { o.frustumCulled = false; g.add(o); });
            scene.add(g); bursts.push({ g, flash, rg, rg2, t: 0, life: 0, size: 1 });
        }
        let bi = 0;
        // kind: 'muzzle' · 'hit' · 'wall' · 'level' · 'enemy'
        function burst(pos, dir, tier, kind) {
            const b = bursts[bi = (bi + 1) % bursts.length], t = kind === 'enemy' ? ENEMY : TIER[tier];
            const big = kind === 'enemy' ? 0.7 : [0.7, 1.1, 1.8][tier];
            b.size = big * (kind === 'hit' ? 1.5 : kind === 'level' ? 1.3 : kind === 'wall' ? 1.1 : 1);
            b.life = b.t = kind === 'hit' ? 0.26 : kind === 'level' ? 0.32 : 0.16;
            b.g.position.copy(pos);
            if (dir) b.g.quaternion.setFromUnitVectors(Z, _v.copy(dir).normalize()); else b.g.quaternion.identity();
            b.flash.material.color.setHex(t.col); b.rg.material.color.setHex(kind === 'enemy' ? ENEMY.ring : t.hot); b.rg2.material.color.setHex(t.col);
            b.rg2.visible = kind !== 'muzzle' || tier > 0;
            b.g.visible = true; upBurst(b, 0);
            if (c.spawnSparks && kind !== 'muzzle') c.spawnSparks(pos, kind === 'enemy' ? 0xff5a7a : t.hot, kind === 'hit' ? 8 + tier * 8 : 5 + tier * 3, 8 + tier * 4);
        }
        function upBurst(b, dt) {
            if (!b.g.visible) return;
            b.t -= dt; if (b.t <= 0) { b.g.visible = false; return; }
            const k = 1 - b.t / b.life, s = b.size;
            b.flash.scale.setScalar(s * 2.6 * (0.5 + 0.6 * Math.sqrt(k))); b.flash.material.opacity = 1 - k;
            b.rg.scale.setScalar(s * (0.3 + 1.3 * k)); b.rg.material.opacity = 1 - k;
            b.rg2.scale.setScalar(s * (0.2 + 0.9 * k)); b.rg2.material.opacity = 0.8 * (1 - k);
        }

        // ---------- charging: motes sucked into the buster, an aura with rings, level bursts, armour flash ----------
        const NP = 72, ptPos = new Float32Array(NP * 3), pts = [];
        for (let i = 0; i < NP; i++) pts.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 });
        const ptGeo = new THREE.BufferGeometry(); ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3).setUsage(THREE.DynamicDrawUsage));
        const dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
        const ptMat = new THREE.PointsMaterial({ size: 0.16, map: dot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: TIER[0].hot });
        const motes = new THREE.Points(ptGeo, ptMat); motes.frustumCulled = false; motes.visible = false; scene.add(motes);
        const aura = new THREE.Group(); aura.visible = false; scene.add(aura);
        const auraGlow = sprite(spriteMat(TIER[0].col, 0.85), 1), auraHot = sprite(spriteMat(0xffffff, 0.9), 1);
        const auraRings = [0, 1, 2].map(k => new THREE.Mesh(ring(1, 0.05), add(TIER[0].hot, 0.85)));
        [auraGlow, auraHot, ...auraRings].forEach(o => { o.frustumCulled = false; aura.add(o); });
        const _mp = new THREE.Vector3(), _md = new THREE.Vector3(), _wq = new THREE.Quaternion(), _tint = new THREE.Color();
        let lastLv = -1, spawnAcc = 0;
        // returns the charge level shown: -1 (not charging) · 0 · 1 · 2
        function charge(P, dt, time, mul) {
            const c0 = P.charge || 0, lv = c0 < 0.16 ? -1 : c0 >= 0.9 * mul ? 2 : c0 >= 0.45 * mul ? 1 : 0;
            if (P.chargeOrb) P.chargeOrb.visible = false;                  // the old orb: replaced by the aura
            hud(lv, Math.min(1, c0 / (0.9 * mul)));
            if (lv < 0 || P.dead) {
                aura.visible = false; lastLv = -1;
                let any = false; for (const s of pts) if (s.life > 0) { s.life = 0; any = true; }
                if (any || motes.visible) { motes.visible = false; }
                if (P._chTint) { P._chTint = false; P.mats.glow.emissiveIntensity = 2.2; }
                return lv;
            }
            const T = TIER[lv];
            P.muzzle.getWorldPosition(_mp); P.elbowR.getWorldQuaternion(_wq); _md.set(0, -1, 0).applyQuaternion(_wq);   // barrel axis
            if (lv > lastLv) { if (lastLv >= 0 || lv > 0) burst(_mp, _md, lv, 'level'); lastLv = lv; }
            // aura on the barrel
            aura.visible = true; aura.position.copy(_mp); aura.quaternion.setFromUnitVectors(Z, _md);
            const grow = lv === 0 ? 0.24 + c0 * 0.25 : lv === 1 ? 0.4 : 0.55, flick = 1 + Math.sin(time * 47) * 0.1;
            auraGlow.material.color.setHex(lv === 2 && Math.sin(time * 34) > 0.3 ? 0xffffff : T.col);
            auraGlow.scale.setScalar(grow * 4.2 * flick); auraHot.scale.setScalar(grow * 1.5 * flick);
            auraRings.forEach((r, k) => {
                r.visible = k <= lv; r.material.color.setHex(k === 2 ? 0xffffff : T.hot);
                const s = grow * (0.85 + k * 0.3) * (1 + Math.sin(time * 10 + k * 2) * 0.05); r.scale.setScalar(s);
                r.rotation.set(k === 1 ? 1.1 : k === 2 ? -1.1 : 0, time * (3 + k * 2) * (k % 2 ? -1 : 1), time * (k + 1) * 5);
            });
            // motes: spawned on a shell around the muzzle, pulled in
            ptMat.color.setHex(lv === 2 && Math.sin(time * 34) > 0 ? 0xffffff : T.hot); motes.visible = true;
            spawnAcc += dt * [36, 70, 110][lv];
            for (const s of pts) {
                if (s.life <= 0 && spawnAcc >= 1) {
                    spawnAcc -= 1; const r = 0.9 + Math.random() * 0.8;
                    s.p.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(r).add(_mp);
                    s.life = 0.22 + Math.random() * 0.12; s.v.subVectors(_mp, s.p).divideScalar(s.life);
                }
                if (s.life > 0) { s.life -= dt; s.p.addScaledVector(s.v, dt); s.v.lerp(_v.subVectors(_mp, s.p).multiplyScalar(1 / Math.max(0.03, s.life)), 0.25); }
            }
            spawnAcc = Math.min(spawnAcc, 4);
            pts.forEach((s, i) => { if (s.life > 0) { ptPos[i * 3] = s.p.x; ptPos[i * 3 + 1] = s.p.y; ptPos[i * 3 + 2] = s.p.z; } else { ptPos[i * 3] = _mp.x; ptPos[i * 3 + 1] = _mp.y; ptPos[i * 3 + 2] = _mp.z; } });
            ptGeo.attributes.position.needsUpdate = true;
            // armour: a soft tint at LV1, a hard flash at full charge (after hero.js has set it for this frame)
            if (P.hurtTimer <= 0) {
                const f = lv === 2 ? (Math.sin(time * 42) > 0 ? 0.42 : 0.05) : lv === 1 ? 0.08 + Math.sin(time * 14) * 0.04 : 0;
                if (f > 0) P.mats.pearl.emissive.copy(_tint.setHex(T.col).multiplyScalar(f));
            }
            P.mats.glow.emissiveIntensity = lv === 2 ? 3.6 + Math.sin(time * 42) * 1.2 : lv === 1 ? 2.9 : 2.4; P._chTint = true;
            return lv;
        }

        // ---------- HUD: the charge bar takes the colour of the level and shows LV1 / LV2 ----------
        const st = document.createElement('style');
        st.textContent = `#charge-wrap.lv0 i{background:linear-gradient(90deg,#ffb020,#ffe066)}
          #charge-wrap.lv1 i{background:linear-gradient(90deg,#1fd99a,#7dffd8);box-shadow:0 0 8px rgba(61,255,182,.8)}
          #charge-wrap.lv2 i{background:linear-gradient(90deg,#7d7bff,#d27bff,#fff);box-shadow:0 0 12px rgba(160,130,255,.95);animation:chLv2 .16s steps(2) infinite}
          @keyframes chLv2{50%{filter:brightness(1.7)}}
          .bar-row .num.ch-lv{font-size:10px;letter-spacing:.04em;transition:color .1s}
          .bar-row .num.ch-lv.l0{color:#ffd36b}.bar-row .num.ch-lv.l1{color:#5cffc8;text-shadow:0 0 6px rgba(61,255,182,.9)}
          .bar-row .num.ch-lv.l2{color:#e2d4ff;text-shadow:0 0 8px rgba(190,140,255,1)}
          .bar-row .num.ch-lv.pop{animation:chPop .3s}
          @keyframes chPop{40%{transform:scale(1.5)}}
          @media (prefers-reduced-motion:reduce){#charge-wrap.lv2 i,.bar-row .num.ch-lv.pop{animation:none}}`;
        document.head.appendChild(st);
        const wrap = document.getElementById('charge-wrap'), num = wrap && wrap.parentNode.querySelector('.num');
        if (num) num.classList.add('ch-lv');
        let hudLv = -2;
        function hud(lv) {
            if (!wrap || lv === hudLv) return;
            wrap.classList.remove('lv0', 'lv1', 'lv2'); if (lv >= 0) wrap.classList.add('lv' + lv);
            if (num) {
                num.className = 'num ch-lv' + (lv >= 0 ? ' l' + lv : '');
                num.textContent = lv >= 1 ? 'LV' + lv : '';
                if (lv > hudLv && lv >= 1) { void num.offsetWidth; num.classList.add('pop'); }
            }
            hudLv = lv;
        }

        // ---------- enemy plasma ----------
        const enemyGeo = new THREE.SphereGeometry(0.2, 14, 10);
        const enemyCore = solid(ENEMY.core), enemyHalo = add(ENEMY.col, 0.4), eGlow = spriteMat(ENEMY.col, 0.85), eHot = spriteMat(0xff8fb0, 0.8);
        const eTail = tailGeo(1.7, 0.26), eTrail = trailMat(0xff6a8a, 0x6a0020), eRingG = ring(0.32, 0.028), eRing = add(ENEMY.ring, 0.9);
        function decorateEnemy(s) {
            if (s.fx) return; s.fx = true;
            const m = s.mesh; let F = m.userData.fx;
            if (!F) {                                            // first use of this (pooled) orb: build its glow, tail and ring once
                const halo = m.children[0]; if (halo) halo.visible = false;
                const gl = sprite(eGlow, 1.5), hot = sprite(eHot, 0.65); m.add(gl, hot);
                const o = new THREE.Group(); m.add(o);
                const tl = new THREE.Mesh(eTail, eTrail), rg = new THREE.Mesh(eRingG, eRing); tl.frustumCulled = rg.frustumCulled = false;
                o.add(tl, rg); F = m.userData.fx = { gl, o, tl, rg };
            }
            F.o.quaternion.setFromUnitVectors(Z, _v.copy(s.dir).normalize()); F.tl.scale.z = 0.1;
            s.fxGlow = F.gl; s.fxTail = F.tl; s.fxRing = F.rg; s.fxAge = 0;
        }
        // enemy plasma orbs are pooled: a volley no longer creates ~6 objects per orb for the garbage collector
        const ePool = [];
        function enemyMesh() {
            let m = ePool.pop();
            if (!m) { m = new THREE.Mesh(enemyGeo, enemyCore); const h = new THREE.Mesh(enemyGeo, enemyHalo); h.scale.setScalar(1.9); m.add(h); }
            m.scale.setScalar(1); m.visible = true; return m;
        }
        function freeEnemy(m) { if (m.parent) m.parent.remove(m); if (ePool.length < 160) ePool.push(m); }
        function updateEnemy(s, dt, time) {
            if (!s.fx) decorateEnemy(s);
            s.fxAge += dt;
            s.fxTail.scale.z = Math.min(1, 0.1 + s.fxAge / 0.15);
            s.fxRing.rotation.x = Math.sin(time * 9 + s.fxAge * 3) * 0.6; s.fxRing.rotation.z += dt * 12;
            s.fxGlow.scale.setScalar(s.fxGlow.userData.size * (1 + Math.sin(time * 30 + s.fxAge * 7) * 0.14));
        }

        // ---------- per frame ----------
        let time = 0;
        function update(dt) {
            time += dt;
            for (const g of live) animShot(g, dt, time);
            bursts.forEach(b => upBurst(b, dt));
        }
        // make one of everything drawable so all shaders compile behind a loading screen
        let warm = null;
        function prewarm(on) {
            if (on) {
                warm = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2].map(t => shot(t, _v.set(0, -500, 0), Z));   // fill the pool for a full burst of fire: no shot is ever built mid-fight
                aura.visible = motes.visible = true; bursts[0].g.visible = true;
            } else if (warm) { warm.forEach(free); warm = null; aura.visible = motes.visible = false; bursts[0].g.visible = false; }
        }
        return { shot, free, burst, charge, update, prewarm, decorateEnemy, updateEnemy, enemyMesh, freeEnemy, enemy: { geo: enemyGeo, core: enemyCore, halo: enemyHalo }, TIER, ENEMY, get time() { return time; } };
    }
    return { create };
})();
