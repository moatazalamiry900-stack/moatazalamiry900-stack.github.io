// =====================================================================
//  AXON BREACH — level module: enemies, the ascending facility, the boss, the minimap
//  Loaded by index.html before game.js. game.js hands it an `api` object with the engine pieces.
// =====================================================================
'use strict';

window.AxonLevel = (function () {

    // ---------------------------------------------------------------
    // Regular enemies (drone / runner / heavy); `lvl` scales hp, speed and fire rate
    // ---------------------------------------------------------------
    // ---------------------------------------------------------------
    // Hit feedback: floating damage numbers and a slim health bar over damaged enemies
    // ---------------------------------------------------------------
    const Feedback = {
        api: null, css: false, bars: new Set(), pops: [], popI: 0, mats: null,
        update() { for (const e of this.bars) e.hpBarUpd(); },
        init(api) {
            this.api = api;
            if (!this.mats) {                          // created up front so the first hit never compiles a shader mid-fight
                const m = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false });
                this.mats = { geo: new THREE.PlaneGeometry(1, 1), bg: m(0x0a0f18, 0.8), back: m(0xffffff, 0.9), g: m(0x7dffb8, 1), y: m(0xffc24a, 1), r: m(0xff3a5a, 1) };
            }
            if (this.css) return; this.css = true;
            const st = document.createElement('style');
            st.textContent = `.dmg-pop{position:absolute;z-index:7;pointer-events:none;font:700 16px/1 var(--font);color:#fff;left:0;top:0;opacity:0;will-change:transform,opacity;
              text-shadow:0 0 6px rgba(255,120,60,.9),0 2px 0 #000;font-variant-numeric:tabular-nums;white-space:nowrap}
              .dmg-pop.crit{font-size:24px;color:#ffe066;text-shadow:0 0 12px rgba(255,200,40,.95),0 2px 0 #000}
              .dmg-pop.boss{color:#ff9ab5}
`;
            document.head.appendChild(st);
        },
        hit(e, amount, at, crit, boss) {
            const api = this.api; if (!api || !api.camera) return;
            const p = (at ? at.clone() : e.aimPoint()); p.y += 0.6;
            const v = p.project(api.camera());
            if (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1) {
                if (!this.pops.length) for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.style.display = 'none'; api.stage.appendChild(d); this.pops.push(d); }
                const el = this.pops[this.popI = (this.popI + 1) % this.pops.length];   // reuse, no DOM churn
                // compositor-only animation (transform + opacity): no forced reflow, no layout per hit
                el.className = 'dmg-pop' + (crit ? ' crit' : '') + (boss ? ' boss' : '');
                el.style.display = ''; el.textContent = Math.round(amount);
                const x = ((v.x + 1) / 2 * api.View.W + (Math.random() - 0.5) * 24) | 0, y = ((1 - v.y) / 2 * api.View.H) | 0, P = `translate(${x}px,${y}px) translate(-50%,`;
                if (el._a) el._a.cancel();
                el._a = el.animate([{ opacity: 0, transform: P + '-30%) scale(.6)' }, { opacity: 1, transform: P + '-70%) scale(1.25)', offset: 0.15 }, { opacity: 0, transform: P + '-220%) scale(1)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
                clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 720);
            }
            if (boss) return;
            // health bar parented to the enemy (removed with it), billboarded every frame
            if (!e.hpBar) {
                const g = new THREE.Group();
                if (!this.mats) {
                    const m = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false });
                    this.mats = { geo: new THREE.PlaneGeometry(1, 1), bg: m(0x0a0f18, 0.8), back: m(0xffffff, 0.9), g: m(0x7dffb8, 1), y: m(0xffc24a, 1), r: m(0xff3a5a, 1) };
                }
                const M = this.mats, mk = mat => new THREE.Mesh(M.geo, mat);
                const bg = mk(M.bg), fill = mk(M.g), back = mk(M.back);
                bg.scale.set(2.3, 0.34, 1); back.scale.set(2.2, 0.22, 1); fill.scale.set(2.2, 0.22, 1);
                back.position.z = fill.position.z = 0.001; fill.position.z = 0.002;
                [bg, back, fill].forEach(m => { m.renderOrder = 999; g.add(m); });
                g.userData = { fill, back, lag: 1 };
                const top = e.type === 'heavy' ? 4.3 : e.type === 'runner' ? 3.4 : 1.6;
                g.position.y = top + (e.core ? 0 : 0); e.mesh.add(g); e.hpBar = g;
                Feedback.bars.add(e);
                e.hpBarUpd = () => {
                    if (e.isDead || !e.mesh.parent) { Feedback.bars.delete(e); return; }
                    if (!e.mesh.visible) return;
                    const k = Math.max(0, e.hp / e.maxHp), u = g.userData;
                    u.lag += (k - u.lag) * 0.08;
                    u.fill.scale.x = 2.2 * k; u.fill.position.x = -1.1 * (1 - k);
                    u.back.scale.x = 2.2 * u.lag; u.back.position.x = -1.1 * (1 - u.lag);
                    u.fill.material = k > 0.5 ? Feedback.mats.g : k > 0.25 ? Feedback.mats.y : Feedback.mats.r;
                    g.quaternion.copy(e.mesh.quaternion).invert().multiply(api.camera().quaternion);
                };
            }
        }
    };

    const _dir = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _v2 = new THREE.Vector3();
    const noiseHooks = [];
    const noise = (p, loud = 22) => noiseHooks.forEach(f => f(p, loud));
    function makeEnemy(api) {
        Feedback.init(api);
        // where a sound comes from, for the ears: [distance to the hero, screen pan -1..1]
        const _sv = new THREE.Vector3();
        const where = P => { const cam = api.camera(), v = _sv.copy(P).applyMatrix4(cam.matrixWorldInverse); return [api.playerPos().distanceTo(P), Math.max(-1, Math.min(1, v.x / Math.max(4, -v.z)))]; };
        // "?" / "!" awareness markers shared by every enemy (two sprite materials, no per-enemy textures)
        const MARK = (() => {
            const tex = (ch, col) => {
                const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
                g.translate(64, 64); g.beginPath();
                for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(Math.cos(a) * 54, Math.sin(a) * 54); }
                g.closePath(); g.fillStyle = 'rgba(6,12,22,.85)'; g.fill(); g.lineWidth = 7; g.strokeStyle = col; g.stroke();
                g.fillStyle = col; g.font = '900 78px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, 5);
                const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
            };
            const m = (ch, col) => new THREE.SpriteMaterial({ map: tex(ch, col), depthTest: false, transparent: true });
            return { q: m('?', '#ffd23f'), x: m('!', '#ff3a5a') };
        })();
        // per-type senses: how far it can see, how wide its eyes are, how close it simply hears you
        const SENSE = { drone: { range: 30, fov: 1.2, hear: 8 }, runner: { range: 24, fov: 1.05, hear: 7 }, heavy: { range: 22, fov: 0.95, hear: 6 } };
        // armour colour shifts with the floor, so tougher units read as tougher (orange → red-orange → crimson → violet)
        const TIER = [0xe0621a, 0xd9471c, 0xb5242e, 0x7c34c9];
        const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

        class Enemy {
            constructor(x, y, z, type, lvl = 0) {
                this.lvl = lvl;
                this.type = type; this.isDead = false; this.flash = 0;
                this.mesh = new THREE.Group(); api.scene.add(this.mesh);
                this.radius = type === 'heavy' ? 1.5 : 1.0;
                this.fireTimer = api.rand(1.5, 3.5);
                this.mats = [];
                const mk = o => { const m = new THREE.MeshStandardMaterial(o); this.mats.push(m); return m; };
                const dark = mk({ color: 0x1a202c, metalness: 0.85, roughness: 0.36, envMapIntensity: 1 });
                const silver = mk({ color: 0x9aa4b2, metalness: 0.9, roughness: 0.24, envMapIntensity: 1.1 });
                const red = mk({ color: 0xff2238, emissive: 0xff0a28, emissiveIntensity: 1.6 });
                const hazard = mk({ color: TIER[Math.min(TIER.length - 1, Math.floor(lvl / 2))], metalness: 0.45, roughness: 0.4 });
                const add = (geo, mat, parent, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
                const grp = (parent, px, py, pz) => { const g = new THREE.Group(); g.position.set(px, py, pz); parent.add(g); return g; };
                const C = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s), B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
                this.core = new THREE.Group(); this.mesh.add(this.core);

                if (type === 'drone') {
                    // SEEKER: beetle-shell scout, one big optic, twin thruster pods, spinning halo
                    this.hp = 24; this.speed = 6; y += 4;
                    add(lathe([[0, 0.42], [0.5, 0.39], [0.88, 0.24], [1.1, 0.02]]), silver, this.core);
                    add(lathe([[1.1, 0.02], [0.92, -0.16], [0.52, -0.34], [0, -0.4]]), dark, this.core);
                    add(new THREE.TorusGeometry(1.08, 0.05, 6, 36), hazard, this.core, 0, 0.02, 0, Math.PI / 2);
                    add(C(0.44, 0.44, 0.34, 18), dark, this.core, 0, 0.03, 0.9, Math.PI / 2);
                    this.eye = add(new THREE.SphereGeometry(0.3, 16, 12), red, this.core, 0, 0.03, 1.04);
                    for (const s of [-1, 1]) {
                        add(C(0.2, 0.2, 0.95, 12), dark, this.core, s * 1.22, -0.05, -0.05, Math.PI / 2);
                        add(new THREE.SphereGeometry(0.2, 12, 8), silver, this.core, s * 1.22, -0.05, 0.43);
                        add(new THREE.TorusGeometry(0.19, 0.04, 6, 16), red, this.core, s * 1.22, -0.05, -0.52);
                    }
                    add(C(0.03, 0.03, 0.55, 6), silver, this.core, -0.3, 0.62, -0.2, -0.3);
                    add(C(0.08, 0.1, 0.5, 10), dark, this.core, 0, -0.4, 0.55, Math.PI / 2);
                    this.ring = add(new THREE.TorusGeometry(1.55, 0.07, 8, 40), dark, this.core);
                    this.ring.rotation.x = Math.PI / 2;
                    add(new THREE.TorusGeometry(1.55, 0.03, 6, 40), red, this.ring, 0, 0, -0.07);
                } else if (type === 'runner') {
                    // STALKER: lean biped, blade on the right forearm, slit visor
                    this.hp = 36; this.speed = 8; this.core.position.y = 1.2;
                    add(B(0.62, 0.28, 0.42), dark, this.core, 0, -0.05, 0);
                    const chest = add(lathe([[0.26, 0], [0.4, 0.22], [0.46, 0.46], [0.36, 0.64], [0.18, 0.7]], 16), silver, this.core, 0, 0.02, 0); chest.scale.z = 0.72;
                    add(B(0.07, 0.46, 0.05), red, this.core, 0, 0.3, 0.33);
                    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.19, 12, 8), hazard, this.core, s * 0.48, 0.62, 0);
                    const head = grp(this.core, 0, 0.95, 0);
                    add(C(0.22, 0.27, 0.4, 6), dark, head, 0, 0, 0);
                    add(B(0.36, 0.07, 0.1), red, head, 0, 0.02, 0.22);
                    add(B(0.05, 0.16, 0.42), hazard, head, 0, 0.24, -0.02);
                    this.armL = grp(this.core, -0.5, 0.55, 0); this.armR = grp(this.core, 0.5, 0.55, 0);
                    for (const a of [this.armL, this.armR]) {
                        add(C(0.11, 0.09, 0.5, 10), dark, a, 0, -0.28, 0);
                        add(C(0.09, 0.12, 0.45, 10), silver, a, 0, -0.72, 0);
                    }
                    add(B(0.04, 0.85, 0.16), red, this.armR, 0.1, -0.95, 0.1, 0.25);
                    this.legL = grp(this.core, -0.2, -0.05, 0); this.legR = grp(this.core, 0.2, -0.05, 0);
                    for (const l of [this.legL, this.legR]) {
                        add(C(0.14, 0.11, 0.55, 10), silver, l, 0, -0.28, 0);
                        add(B(0.16, 0.14, 0.08), hazard, l, 0, -0.55, 0.12);
                        add(C(0.1, 0.13, 0.5, 10), dark, l, 0, -0.8, -0.03);
                        add(B(0.2, 0.1, 0.38), dark, l, 0, -1.1, 0.08);
                    }
                } else {
                    // BULWARK: hunched walking fortress, cannon arms, sensor dome, glowing back vents
                    this.hp = 90; this.speed = 2.6; this.core.position.y = 1.5;
                    add(B(2.2, 1.6, 1.4), hazard, this.core, 0, 0.2, 0);
                    add(B(1.5, 1.0, 0.2), dark, this.core, 0, 0.1, 0.74);
                    add(B(1.0, 0.12, 0.08), red, this.core, 0, 0.45, 0.86);
                    for (const s of [-1, 1]) {
                        add(B(0.9, 0.45, 1.3), dark, this.core, s * 1.3, 0.95, 0, 0, 0, s * -0.2);
                        add(B(0.12, 0.7, 0.08), red, this.core, s * 0.5, 0.35, -0.72);
                    }
                    add(new THREE.SphereGeometry(0.46, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark, this.core, 0, 1.0, 0.1);
                    add(B(0.66, 0.1, 0.12), red, this.core, 0, 1.12, 0.47);
                    this.armL = grp(this.core, -1.5, 0.55, 0); this.armR = grp(this.core, 1.5, 0.55, 0);
                    for (const a of [this.armL, this.armR]) {
                        add(C(0.42, 0.5, 1.7, 16), dark, a, 0, -0.6, 0);
                        add(C(0.52, 0.52, 0.22, 16), hazard, a, 0, -0.2, 0);
                        add(new THREE.TorusGeometry(0.44, 0.06, 6, 18), red, a, 0, -1.45, 0, Math.PI / 2);
                    }
                    this.legL = grp(this.core, -0.7, -0.4, 0); this.legR = grp(this.core, 0.7, -0.4, 0);
                    for (const l of [this.legL, this.legR]) {
                        add(B(0.7, 0.6, 0.8), dark, l, 0, -0.25, 0);
                        add(B(0.6, 0.32, 0.3), hazard, l, 0, -0.5, 0.42);
                        add(B(0.8, 0.5, 0.9), dark, l, 0, -0.8, 0);
                        add(B(1.0, 0.2, 1.3), silver, l, 0, -1.08, 0.12);
                    }
                }
                this.hp = Math.round(this.hp * (1 + 0.15 * lvl)); this.maxHp = this.hp; this.speed *= 1 + 0.05 * lvl;
                this.body = type === 'drone' ? { r: 1.2, off: -0.6, h: 1.2 } : type === 'runner' ? { r: 0.8, off: 0, h: 2.4 } : { r: 1.5, off: 0, h: 3.2 };
                // never spawn inside a block (that produced invisible, unreachable api.enemies)
                const b = this.body; let tries = 0;
                const cx = x, cz = z;
                while (api.spotBlocked(x, z, b.r + 0.3, y + b.off + 0.3, y + b.off + b.h) && tries++ < 40) {
                    x = cx + api.rand(-9, 9); z = cz + api.rand(-9, 9);
                }
                this.spawnY = y; this.vel = new THREE.Vector3(); this.sees = false; this.seeTimer = api.rand(0, 0.3);
                this.mesh.position.set(x, y, z); this.mesh.rotation.y = api.rand(-Math.PI, Math.PI);
                this.home = new THREE.Vector3(x, y, z); this.goal = new THREE.Vector3(x, y, z); this.last = new THREE.Vector3();
                this.mode = 'idle'; this.aware = 0; this.searchT = 0; this.patrolT = api.rand(0.5, 3); this.markT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1;
                this.sense = SENSE[type];
                this.mats.forEach(m => { m.userData.e = m.emissive.clone(); m.userData.ei = m.emissiveIntensity; });
                window.AxonPerf.mergeStatic(this.core, m => m === this.ring || m === this.eye);
                this.mesh.traverse(c => { if (c.isMesh) { c.castShadow = !api.lowShadow; c.receiveShadow = true; } });   // phones: only the heroes and the boss cast sun shadows (half the shadow-pass draw calls)
                this.mark = new THREE.Sprite(MARK.q); this.mark.scale.setScalar(0.95); this.mark.visible = false; this.mark.renderOrder = 5;
                this.mark.position.y = type === 'drone' ? 1.5 : type === 'runner' ? 3.0 : 4.3; this.mesh.add(this.mark);
                api.enemies.push(this);
            }

            aimPoint(out) {                                  // pass a scratch vector in hot loops to avoid garbage
                const p = out ? out.copy(this.mesh.position) : this.mesh.position.clone();
                p.y += this.type === 'heavy' ? 1.6 : this.type === 'runner' ? 1.3 : 0;
                return p;
            }
            hitRadius() { return this.type === 'heavy' ? 2.3 : this.type === 'runner' ? 1.5 : 1.7; }

            // fully alerted (spotted you, got shot, heard something close, or a lockdown started)
            alertNow(p) {
                if (this.isDead) return;
                if (p) this.last.copy(p);
                if (this.mode !== 'alert') { this.markT = 1.1; this.mark.material = MARK.x; if (this.mesh.visible) api.AudioSys.playAlert(...where(this.mesh.position)); }
                this.mode = 'alert'; this.aware = 1; this.searchT = 0;
            }
            // a noise at p: close ones react at once, farther ones turn and get suspicious
            hear(p, loud) {
                if (this.isDead || this.dormant || this.mode === 'alert') return;
                const d = this.mesh.position.distanceTo(p);
                if (d < loud * 0.45) this.alertNow(p);
                else if (d < loud) { this.aware = Math.max(this.aware, 0.7); this.last.copy(p); if (this.mode === 'idle') this.mode = 'search'; this.searchT = 3; }
            }

            update(dt, player, time) {
                if (this.isDead) return;
                if (this.flash > 0) {
                    this.flash -= dt;
                    if (this.flash <= 0) this.mats.forEach(m => { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; });
                }
                const P = this.mesh.position, playerPos = player.mesh.position, S = this.sense;
                const dir = _dir.subVectors(playerPos, P); dir.y = 0;
                const dist = dir.length(), range = S.range + this.lvl * 0.8;

                // ---- senses (4× a second): sight inside a cone + line of sight, hearing when very close ----
                this.seeTimer -= dt;
                if (this.seeTimer <= 0) {
                    this.seeTimer = 0.25;
                    let spotted = false;
                    if (dist < range) {
                        let a = Math.atan2(dir.x, dir.z) - this.mesh.rotation.y; a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
                        if ((a < S.fov || dist < S.hear || this.mode === 'alert') && player.hasLineOfSight(this)) spotted = true;
                    }
                    this.sees = spotted;
                    if (spotted) {
                        this.last.copy(playerPos);
                        if (this.mode !== 'alert') {
                            // awareness builds faster the closer you are
                            this.aware += 0.25 * (0.9 + 2.6 * (1 - dist / range));
                            if (this.mode === 'idle') this.mode = 'search';
                            this.searchT = 3.5;
                            if (this.aware >= 1) {
                                this.alertNow(playerPos);
                                for (const o of api.enemies) if (o !== this && o.alertNow && !o.dormant && o.mesh.position.distanceTo(P) < 16) o.alertNow(playerPos);   // calls for backup
                            }
                        }
                    } else if (this.mode === 'alert') { this.mode = 'search'; this.searchT = 4; }
                }
                if (!this.sees && this.mode !== 'alert') this.aware = Math.max(0, this.aware - 0.3 * dt);
                if (this.mode === 'search' && (this.searchT -= dt) <= 0 && this.aware <= 0.05) { this.mode = 'idle'; this.goal.copy(this.home); }

                // ---- marker: "?" while suspicious / searching, "!" for a moment when it locks on ----
                if (this.markT > 0) this.markT -= dt;
                const showQ = this.mode === 'search';
                this.mark.visible = this.markT > 0 || showQ;
                if (this.markT <= 0 && showQ) this.mark.material = MARK.q;
                if (this.mark.visible) this.mark.scale.setScalar(this.markT > 0 ? 0.95 + Math.max(0, this.markT - 0.9) * 2 : 0.6 + 0.4 * Math.min(1, this.aware));

                // ---- movement ----
                let vx = 0, vz = 0, face = null;
                const alert = this.mode === 'alert';
                const chasing = alert && dist > 1.5;
                if (alert) {
                    face = dir;
                    const keepAway = this.type === 'drone' && dist < 10;   // drones hold range and circle you
                    if (dist > 1.5 && !keepAway) { const k = this.speed / Math.max(dist, 0.001); vx = dir.x * k; vz = dir.z * k; }
                    if (keepAway) {
                        if ((this.strafeT = (this.strafeT || api.rand(1.5, 3)) - dt) <= 0) { this.strafeT = api.rand(1.5, 3); this.strafe *= -1; }
                        const k = this.speed * 0.55 * this.strafe / Math.max(dist, 0.001); vx = -dir.z * k; vz = dir.x * k;
                    }
                } else if (this.mode === 'search') {
                    const d = _v2.subVectors(this.last, P); d.y = 0; const l = d.length();
                    face = this.sees ? dir : d;
                    if (!this.sees && l > 1.5) { const k = this.speed * 0.6 / l; vx = d.x * k; vz = d.z * k; }
                } else {
                    // idle: wander around the post, pause, look around
                    if ((this.patrolT -= dt) <= 0) { this.patrolT = api.rand(2.5, 5); this.goal.set(this.home.x + api.rand(-4, 4), P.y, this.home.z + api.rand(-4, 4)); }
                    const d = _v2.subVectors(this.goal, P); d.y = 0; const l = d.length();
                    if (l > 0.6) { const k = this.speed * 0.3 / l; vx = d.x * k; vz = d.z * k; face = d; }
                }
                if (face && (face.x || face.z)) {
                    let dy = Math.atan2(face.x, face.z) - this.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
                    this.mesh.rotation.y += dy * Math.min(1, (alert ? 10 : 3) * dt);
                }
                // light separation so api.enemies don't stack into one blob
                for (const o of api.enemies) {
                    if (o === this || o.isDead) continue;
                    const dx = P.x - o.mesh.position.x, dz = P.z - o.mesh.position.z;
                    const d2 = dx * dx + dz * dz, min = this.body.r + o.body.r;
                    if (d2 > 0.0001 && d2 < min * min) { const d = Math.sqrt(d2); vx += dx / d * 4; vz += dz / d * 4; }
                }

                // ---- abilities ----
                if (this.type === 'runner') {
                    // lunge: a short red crouch as a warning, then a burst of speed
                    this.lungeCd = (this.lungeCd === undefined ? api.rand(1, 2.5) : this.lungeCd) - dt;
                    if (alert && this.sees && dist > 2.5 && dist < 8 && this.lungeCd <= 0 && !(this.windT > 0)) { this.windT = 0.3; this.lungeCd = api.rand(2.2, 3.4) / (1 + 0.06 * this.lvl); this.glow(0.3); api.AudioSys.playRunnerWind(...where(P)); }
                    if (this.windT > 0) { this.windT -= dt; vx *= 0.1; vz *= 0.1; this.core.position.y = 1.05; if (this.windT <= 0) { this.lungeT = 0.34; api.AudioSys.playLunge(...where(P)); } }
                    if (this.lungeT > 0) { this.lungeT -= dt; vx *= 2.7; vz *= 2.7; }
                } else if (this.type === 'heavy') {
                    this.fireTimer -= dt;
                    if (this.fireTimer <= 0) {
                        this.fireTimer = api.rand(3.2, 4.6) / (1 + 0.08 * this.lvl);
                        if (alert && this.sees && dist > 6 && dist < 24) [-0.26, 0, 0.26].forEach(a => this.fire(player, a));
                    }
                    // ground slam when you get close: arms rise (0.6 s), then a shockwave — jump over it
                    this.slamCd = (this.slamCd === undefined ? 2 : this.slamCd) - dt;
                    if (alert && dist < 5.5 && this.slamCd <= 0 && !(this.slamT > 0)) { this.slamT = 0.6; this.slamCd = api.rand(4.5, 6); this.glow(0.6); api.AudioSys.playHeavyWind(...where(P)); }
                    if (this.slamT > 0) {
                        this.slamT -= dt; vx = vz = 0;
                        this.armL.position.y = this.armR.position.y = 0.55 + (0.6 - this.slamT) * 1.4;
                        if (this.slamT <= 0) {
                            this.armL.position.y = this.armR.position.y = 0.55;
                            api.spawnShockwave(_v2.copy(P).setY(P.y + 0.1), 0xff7a2a, 7); api.shake(0.45); api.AudioSys.playExplode();
                            if (dist < 6.5 && player.isGrounded && playerPos.y < P.y + 1) player.takeDamage(Math.round(16 * (1 + 0.1 * this.lvl)));
                        }
                    }
                }
                // robotic chatter every few seconds while it is near (panned to its side of the screen)
                if ((this.voiceT = (this.voiceT === undefined ? api.rand(2, 8) : this.voiceT) - dt) <= 0) {
                    this.voiceT = api.rand(5, 11);
                    if (dist < 26 && api.AudioSys.voice) {
                        const cam = api.camera(), v = _v2.copy(P).applyMatrix4(cam.matrixWorldInverse);
                        api.AudioSys.voice(this.type, dist, Math.max(-1, Math.min(1, v.x / Math.max(4, -v.z))));
                    }
                }
                this.vel.set(vx, 0, vz);
                if (vx || vz) api.moveBody(P, this.vel, dt, this.body.r, this.body.off, this.body.h, 0.3, false);

                if (this.type === 'drone') {
                    this.ring.rotation.z += (alert ? 7 : 3) * dt;
                    P.y = this.spawnY + Math.sin(time * 3 + this.spawnY) * 0.5;
                    // shots are telegraphed: the optic swells and burns white for 0.45 s first
                    this.fireTimer -= dt;
                    if (this.fireTimer <= 0 && !(this.aimT > 0)) {
                        this.fireTimer = api.rand(2.2, 3.4) / (1 + 0.12 * this.lvl);
                        if (alert && dist < 26 && this.sees) { this.aimT = 0.45; api.AudioSys.playDroneCharge(...where(P)); }
                    }
                    if (this.aimT > 0) {
                        this.aimT -= dt; this.eye.scale.setScalar(1 + (0.45 - this.aimT) * 1.6);
                        if (this.aimT <= 0) {
                            this.eye.scale.setScalar(1); this.fire(player);
                            if (this.lvl >= 3) setTimeout(() => { if (!this.isDead && this.sees) this.fire(player); }, 180);   // twin burst higher up
                        }
                    }
                } else if (this.type === 'runner') {
                    const moving = vx || vz;
                    if (moving && !(this.windT > 0)) {
                        const s = Math.sin(time * (chasing ? 20 : 9)), a = chasing ? 0.6 : 0.3;
                        this.core.rotation.x = chasing ? 0.3 : 0.08;
                        this.armL.position.z = s * a; this.armR.position.z = -s * a;
                        this.legL.position.z = -s * a; this.legR.position.z = s * a;
                        this.core.position.y = 1.2 + Math.abs(s) * (chasing ? 0.2 : 0.08);
                    } else if (!(this.windT > 0)) {
                        this.core.rotation.x = 0;
                        this.armL.position.z = this.armR.position.z = this.legL.position.z = this.legR.position.z = 0;
                        this.core.position.y = 1.2 + Math.sin(time * 5) * 0.05;
                    }
                } else if ((vx || vz) && !(this.slamT > 0)) {
                    const s = Math.sin(time * (chasing ? 5 : 3));
                    if (Math.sign(s) !== this._stepS) { this._stepS = Math.sign(s); if (dist < 30) api.AudioSys.playHeavyStep(...where(P)); }   // each heavy footfall
                    this.armL.position.z = s * 0.5; this.armR.position.z = -s * 0.5;
                    this.legL.position.z = -s * 0.5; this.legR.position.z = s * 0.5;
                    this.core.position.y = 1.5 + Math.abs(s) * 0.1;
                }
            }
            // warning glow before an attack (reuses the hit-flash path)
            glow(t) { this.flash = t; this.mats.forEach(m => { if (m.userData.ei > 1) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 3.2; } }); }

            fire(player, spread = 0) {
                const from = this.aimPoint();
                const to = player.mesh.position.clone(); to.y += 1.4;
                const dir = to.sub(from).normalize();
                if (spread) dir.applyAxisAngle(_up, spread);
                const m = api.orbMesh();                                     // pooled orb (shots.js)
                m.position.copy(from).addScaledVector(dir, 1.4);
                api.scene.add(m); api.enemyShots.push({ mesh: m, dir, life: 3, dmg: Math.round(7 * (1 + 0.1 * this.lvl)) });
                api.AudioSys.playEnemyShot(...where(from));
            }

            takeDamage(amount, at, crit) {
                if (this.isDead) return;
                this.hp -= amount; api.AudioSys.playHit(); Feedback.hit(this, amount, at, crit);
                this.alertNow(api.playerPos ? api.playerPos() : null);        // getting shot always gives you away
                this.flash = 0.09;
                this.mats.forEach(m => { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.4; });
                api.spawnSparks(at || this.aimPoint(), 0xffd27a, 8, 10);
                if (this.hp <= 0) this.die();
            }

            die() {
                this.isDead = true;
                const p = this.aimPoint();
                api.scene.remove(this.mesh);
                const i = api.enemies.indexOf(this); if (i > -1) api.enemies.splice(i, 1);
                api.onKill(this);
                api.AudioSys.playExplode();
                api.spawnFlash(p, 0xffc070, this.type === 'heavy' ? 3.4 : 2.4, 0.25);
                api.spawnSparks(p, 0xff9a3c, 22, 18);
                api.spawnSparks(p, 0x7ff3ff, 10, 12);
                const g = p.clone(); g.y = this.type === 'drone' ? p.y - 1 : this.mesh.position.y + 0.1;
                api.spawnShockwave(g, 0xff9a3c, this.type === 'heavy' ? 9 : 6);
                api.shake(this.type === 'heavy' ? 0.55 : 0.3);
                api.hitStop(0.06);
            }
        }
        // a sound the player made (shots, blasts): nearby enemies react
        noiseHooks.push((p, loud) => { for (const e of api.enemies) if (e.hear) e.hear(p, loud); });

        return Enemy;
    }

    // ---------------------------------------------------------------
    // The facility: STAGES sections that climb upward. Each section =
    // gate → corridor with a staircase (+3 m) → gate → arena. Arenas grow
    // and enemies get more numerous, heavier and tougher each stage.
    // The last arena is the boss chamber.
    // ---------------------------------------------------------------
    const STAGES = 9, RISE = 3;
    function generate(api) {
        const B = api.createFacilityBlock, zones = [], arenas = [], traps = [];
        // ---- GAUNTLET: between two sectors, a pit crossed on staggered platforms, with timed spike
        //      poppers on some platforms and a spiked roller sweeping the landing. Falling in costs HP
        //      and drops you back at the start ledge. 44 m long, same height at both ends. ----
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cf, metalness: 0.95, roughness: 0.22 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.85, roughness: 0.36 });
        const cone = new THREE.ConeGeometry(0.2, 0.75, 6); cone.translate(0, 0.375, 0);
        const m4 = new THREE.Matrix4();
        const spikeField = (w, d) => {                 // a bed of spikes, bases at y = 0
            const parts = [];
            for (let x = -w / 2 + 0.3; x <= w / 2 - 0.3 + 1e-6; x += 0.6) for (let z = -d / 2 + 0.3; z <= d / 2 - 0.3 + 1e-6; z += 0.6)
                parts.push({ geo: cone, matrix: m4.clone().makeTranslation(x, 0, z) });
            return window.AxonPerf.mergeGeometries(parts);
        };
        const rollerSpikes = (() => {                  // spikes on the front, back and top of a 2 m bar
            const parts = [], rx = new THREE.Matrix4();
            for (let x = -0.8; x <= 0.81; x += 0.4) for (const y of [0.25, 0.65]) {
                parts.push({ geo: cone, matrix: new THREE.Matrix4().makeTranslation(x, y, 0.3).multiply(rx.makeRotationX(Math.PI / 2)) });
                parts.push({ geo: cone, matrix: new THREE.Matrix4().makeTranslation(x, y, -0.3).multiply(rx.makeRotationX(-Math.PI / 2)) });
            }
            for (let x = -0.8; x <= 0.81; x += 0.4) parts.push({ geo: cone, matrix: new THREE.Matrix4().makeTranslation(x, 0.9, 0) });
            return window.AxonPerf.mergeGeometries(parts);
        })();
        const popper = (x, z, top, w, d, off, lvl) => {
            const mesh = new THREE.Mesh(spikeField(w, d), spikeMat); mesh.position.set(x, top - 0.8, z); mesh.castShadow = true; api.scene.add(mesh);
            const pm = new THREE.MeshStandardMaterial({ color: 0x2a0a10, emissive: 0xff1a33, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.4 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), pm); plate.position.set(x, top + 0.02, z); api.scene.add(plate);
            traps.push({ kind: 'pop', x, z, w, d, top, off, mesh, pm, lvl, cd: 0 });
        };
        const roller = (z, top, off, lvl) => {
            const g = new THREE.Group(); g.position.set(0, top, z); api.scene.add(g);
            const core = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.5), coreMat); core.position.y = 0.45; g.add(core);
            const sp = new THREE.Mesh(rollerSpikes, spikeMat); g.add(sp); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
            api.decorStrip(0, top + 0.03, z, 12, 0.03, 0.18, 0xffa826);        // its track
            traps.push({ kind: 'roll', z, top, off, mesh: g, lvl, cd: 0 });
        };
        const gauntlet = (z0, h, i) => {
            const L = 44, cC = z0 - L / 2;
            B(-8, h - 8, cC, 2, 64, L); B(8, h - 8, cC, 2, 64, L); B(0, h + 24, cC, 18, 2, L);
            B(0, h - 2, z0 - 4, 14, 4, 8, true);                                   // start ledge
            B(0, h - 2, z0 - 41, 14, 4, 6, true);                                  // landing
            // the abyss: no floor at all — a fall is fatal. Glow lines deep down sell the depth
            [-6.94, 6.94].forEach(x => { for (const dy of [6, 16, 30]) api.decorStrip(x, h - dy, z0 - 23, 0.06, 0.1, 28, dy > 20 ? 0x5a0f22 : 0xff2a6d); api.decorStrip(x, h + 7.5, cC, 0.06, 0.14, L - 2, 0xffa826); });
            B(0, h - 12, z0 - 8.5, 14, 10, 1, false); B(0, h - 12, z0 - 37.5, 14, 10, 1, false);   // ledge faces going down (below the point of no return)
            api.decorStrip(0, h + 0.03, z0 - 7.85, 14, 0.04, 0.2, 0xffa826); api.decorStrip(0, h + 0.03, z0 - 38.15, 14, 0.04, 0.2, 0xffa826);   // edge warnings
            // staggered platforms (zig-zag, rising then falling): 2–4.5 m gaps
            const P = [[-3, z0 - 12, 0], [2.5, z0 - 18.5, 0.8], [-2, z0 - 25, 1.6], [3, z0 - 31.5, 0.8]];
            P.forEach(([x, z, dy]) => { B(x, h + dy - 0.5, z, 4, 1, 4, true); api.decorStrip(x, h + dy - 1.02, z, 4, 0.05, 4, 0x39d7ff); });
            // spikes on every platform, firing one after another like a wave you have to ride
            P.forEach(([x, z, dy], k) => popper(x, z, h + dy, 3.4, 3.4, k * 0.55, i));
            roller(z0 - 41.5, h, i * 0.9, i);
            roller(z0 - 5, h, i * 0.9 + 1.6, i);                                   // one guarding the take-off too
            traps.push({ kind: 'pit', x0: -7, x1: 7, z0: z0 - 8, z1: z0 - 38, y: h - 3, h, lvl: i });
            if (i >= 1) new api.Enemy(api.rand(-3, 3), h + 1, z0 - 24, 'drone', i);   // a drone harasses you over the pit
            zones.push({ kind: 'gauntlet', x0: -7, x1: 7, z0, z1: z0 - L, y: h, stage: i + 1 });
            return L;
        };
        const glow = [0x39d7ff, 0xff2a6d, 0xffa826, 0x8f6bff, 0x2fd6c3, 0xff2a6d];
        const gate = (z, h) => { B(-8, h + 5, z, 4, 14, 2, false, true); B(8, h + 5, z, 4, 14, 2, false, true); B(0, h + 13, z, 12, 2, 2, false, true); };
        const pickType = i => {
            const r = Math.random(), heavy = Math.min(0.42, i * 0.09), drone = 0.36;
            return r < heavy ? 'heavy' : r < heavy + drone ? 'drone' : 'runner';
        };
        // start room
        B(0, -2, 0, 30, 4, 30, true); B(-16, 10, 0, 2, 28, 32); B(16, 10, 0, 2, 28, 32); B(0, 10, 16, 30, 28, 2); B(0, 24, 0, 34, 2, 34);
        api.arenaEmblem(0, 0x39d7ff, 0);
        zones.push({ kind: 'start', x0: -15, x1: 15, z0: 15, z1: -15, y: 0, stage: 0 });
        let zc = -15, h = 0, bossEntryZ = 0, bossCenter = null, bossHalf = 0, bossY = 0;
        for (let i = 0; i < STAGES; i++) {
            const col = glow[i % glow.length], last = i === STAGES - 1;
            gate(zc, h); zc -= 1;
            // corridor with a staircase in the middle
            const cL = 40, cC = zc - cL / 2;
            B(0, h - 2, zc - 8, 14, 4, 16, true);                                    // lower floor
            for (let k = 0; k < 8; k++) { const top = h + (k + 1) * (RISE / 8); B(0, top - 2, zc - 16 - 1.25 * k - 0.625, 14, 4, 1.25, true); }
            B(0, h + RISE - 2, zc - 33, 14, 4, 14, true);                            // upper floor
            B(-8, h + 9.5, cC, 2, 27, cL); B(8, h + 9.5, cC, 2, 27, cL); B(0, h + 24, cC, 18, 2, cL);
            B(-3.5, h + 0.75, zc - 7, 5, 2.5, 2.5, true);                            // low cover
            [-6.94, 6.94].forEach(x => { api.decorStrip(x, h + 7.5, cC, 0.06, 0.14, cL - 2, col); api.decorStrip(x, h + 1.2, zc - 8, 0.06, 0.08, 14, 0x1d6fb8); });
            api.decorStrip(0, h + 22.94, cC, 3, 0.06, cL - 4, 0xbff4ff);
            zones.push({ kind: 'corridor', x0: -7, x1: 7, z0: zc, z1: zc - cL, y: h, stage: i + 1 });
            const nC = Math.min(6, 2 + Math.floor(i / 2));
            for (let e = 0; e < nC; e++) new api.Enemy(api.rand(-4, 4), h, zc - 4 - api.rand(0, 9), pickType(i), i);
            zc -= cL; h += RISE;
            gate(zc, h); if (last) bossEntryZ = zc;
            zc -= 1;
            // arena (the last one is the boss chamber)
            const aS = last ? 84 : 60 + i * 4, aC = zc - aS / 2, half = aS / 2;
            B(0, h - 2, aC, aS, 4, aS, true);
            B(-(half + 1), h + 15, aC, 2, 38, aS); B(half + 1, h + 15, aC, 2, 38, aS);
            [zc + 1, zc - aS].forEach(zE => [-1, 1].forEach(s => { const w = half + 2 - 10; B(s * (10 + w / 2), h + 15, zE, w, 38, 2); }));
            if (last) B(0, h + 15, zc - aS, 20, 38, 2);                              // boss chamber is sealed at the far end
            const covers = last ? [[-18, -14], [18, -14], [-18, 14], [18, 14]] : [[-10, 5], [10, -5], [0, -15], [api.rand(-18, 18), api.rand(-20, 20)]];
            covers.forEach(([x, z], k) => { const ht = last ? 7 : (k === 3 ? 5.5 : 2.5 + (k % 2) * 1.5); B(x, h + (ht - 1) / 2, aC + z, last ? 5 : 7, ht + 1, last ? 5 : 6, true); });
            [-(half) + 0.06, half - 0.06].forEach(x => api.decorStrip(x, h + 9, aC, 0.06, 0.2, aS - 4, col));
            api.arenaEmblem(aC, last ? 0xff2a6d : col, h);
            if (last) { bossCenter = new THREE.Vector3(0, h, aC); bossHalf = half; bossY = h; zones.push({ kind: 'boss', x0: -half, x1: half, z0: zc, z1: zc - aS, y: h, stage: i + 1 }); }
            else {
                zones.push({ kind: 'arena', x0: -half, x1: half, z0: zc, z1: zc - aS, y: h, stage: i + 1 });
                const nA = Math.min(8, 3 + i), nW = 2 + Math.floor(i / 2), before = api.enemies.length;
                for (let e = 0; e < nA; e++) new api.Enemy(api.rand(-half + 8, half - 8), h, aC - api.rand(-half + 12, half - 8), pickType(i + 1), i);
                const wave1 = api.enemies.slice(before), wave2 = [];
                for (let e = 0; e < nW; e++) {
                    const en = new api.Enemy(api.rand(-half + 6, half - 6), h, aC + api.rand(-half + 8, half - 8), pickType(i + 2), i + 1);
                    api.enemies.splice(api.enemies.indexOf(en), 1); en.mesh.visible = false; en.dormant = true; wave2.push(en);
                }
                arenas.push({ i, h, half, cz: aC, entryZ: zc + 1, exitZ: zc - aS, wave1, wave2, state: 'idle' });
            }
            zc -= aS;
            if (!last) { gate(zc, h); zc -= 1; zc -= gauntlet(zc, h, i); }   // exit frame → gauntlet → next corridor's gate
        }
        return { zones, arenas, traps, stages: STAGES, startZ: 0, endZ: zc, top: h, bossEntryZ, bossCenter, bossHalf, bossY };
    }

    // ---------------------------------------------------------------
    // SENTINEL-Ω: the final guardian. Three attacks, and a second phase under 50% HP.
    //   volley — fans of energy orbs      slam — leaps and sends a shockwave ring (jump or dash through it)
    //   charge — glows, then rushes you   phase 2 — faster, wider volleys, calls two drones once
    // ---------------------------------------------------------------
    function makeBoss(api) {
        const dark = () => new THREE.MeshStandardMaterial({ color: 0x1a1d27, metalness: 0.8, roughness: 0.34 });
        return class Boss {
            constructor(center, half) {
                this.type = 'boss'; this.name = 'SENTINEL-Ω'; this.isDead = false; this.active = false;
                this.maxHp = this.hp = 1500; this.center = center.clone(); this.half = half;
                this.body = { r: 2.2, off: 0, h: 6.5 }; this.touchR = 0; this.meleeR = 4.6;
                this.mesh = new THREE.Group(); this.mesh.position.set(center.x, center.y, center.z - half * 0.45); api.scene.add(this.mesh);
                this.vel = new THREE.Vector3(); this.state = 'idle'; this.t = 0; this.cool = 2.5; this.flash = 0; this.phase = 1; this.called = false;
                this.mats = [];
                const mk = m => { this.mats.push(m); m.userData.e = (m.emissive || new THREE.Color()).clone(); m.userData.ei = m.emissiveIntensity || 0; return m; };
                const armor = mk(dark()), plate = mk(new THREE.MeshStandardMaterial({ color: 0x3a3f4d, metalness: 0.7, roughness: 0.3 }));
                const gold = mk(new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.95, roughness: 0.22 }));
                this.glowMat = mk(new THREE.MeshStandardMaterial({ color: 0xff2a6d, emissive: 0xff1a55, emissiveIntensity: 2.4 }));
                const add = (geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
                const root = this.root = new THREE.Group(); this.mesh.add(root);
                // legs
                this.legs = [-1, 1].map(s => {
                    const g = new THREE.Group(); g.position.set(s * 0.95, 2.6, 0); root.add(g);
                    add(new THREE.SphereGeometry(0.55, 20, 14), plate, g);
                    add(new THREE.CylinderGeometry(0.42, 0.34, 1.4, 20), armor, g, 0, -0.75, 0);
                    add(new THREE.SphereGeometry(0.4, 18, 12), gold, g, 0, -1.45, 0.05);
                    add(new THREE.CylinderGeometry(0.46, 0.38, 1.2, 20), plate, g, 0, -2.05, 0);
                    const f = add(new THREE.BoxGeometry(0.9, 0.35, 1.5), armor, g, 0, -2.6, 0.25); f.scale.set(1, 1, 1);
                    return g;
                });
                // torso
                const pel = add(new THREE.CylinderGeometry(1.0, 0.8, 0.8, 24), armor, root, 0, 3.0, 0); pel.scale.z = 0.8;
                const torso = add(new THREE.SphereGeometry(1.3, 32, 22), plate, root, 0, 4.4, 0); torso.scale.set(1.35, 1.05, 0.95);
                add(new THREE.TorusGeometry(0.62, 0.09, 12, 36), gold, root, 0, 4.4, 1.2);
                this.core = add(new THREE.SphereGeometry(0.45, 24, 16), this.glowMat, root, 0, 4.4, 1.18);
                add(new THREE.BoxGeometry(2.6, 0.18, 0.2), this.glowMat, root, 0, 3.55, 1.05);
                // head
                const head = add(new THREE.SphereGeometry(0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), armor, root, 0, 5.55, 0.1); head.scale.set(1.1, 0.9, 1.15);
                this.visor = add(new THREE.BoxGeometry(0.95, 0.13, 0.1), this.glowMat, root, 0, 5.6, 0.72);
                add(new THREE.ConeGeometry(0.12, 0.9, 12), gold, root, 0, 6.1, -0.2, -0.6, 0, 0);
                // shoulders + arm cannons
                this.arms = [-1, 1].map(s => {
                    const g = new THREE.Group(); g.position.set(s * 2.05, 4.9, 0); root.add(g);
                    add(new THREE.SphereGeometry(0.85, 24, 16), plate, g);
                    add(new THREE.TorusGeometry(0.8, 0.08, 10, 36), gold, g, 0, 0, 0, 0, Math.PI / 2, 0);
                    add(new THREE.CylinderGeometry(0.42, 0.52, 2.4, 24), armor, g, 0, -0.35, 1.1, Math.PI / 2, 0, 0);
                    add(new THREE.TorusGeometry(0.44, 0.07, 10, 32), this.glowMat, g, 0, -0.35, 2.3);
                    const muz = new THREE.Object3D(); muz.position.set(0, -0.35, 2.5); g.add(muz); g.userData.muz = muz;
                    return g;
                });
                // back thrusters
                [-0.7, 0.7].forEach(x => add(new THREE.CylinderGeometry(0.25, 0.38, 1.0, 16), gold, root, x, 4.6, -1.25, 0.4, 0, 0));
                // warning ring (telegraphs slams and charges)
                this.warn = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xff2a6d, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
                this.warn.rotation.x = -Math.PI / 2; api.scene.add(this.warn);
                this.shocks = [];
                window.AxonPerf.mergeStatic(this.root, m => m === this.core || m === this.visor);
                api.enemies.push(this);
            }
            aimPoint(out) { const p = out ? out.copy(this.mesh.position) : this.mesh.position.clone(); p.y += 4.3; return p; }
            hitRadius() { return 2.7; }
            activate() { if (this.active) return; this.active = true; this.cool = 1.5; api.shake(0.6); api.AudioSys.playExplode(); }
            face(player, dt, rate = 4) {
                const d = _dir.subVectors(player.mesh.position, this.mesh.position);
                let a = Math.atan2(d.x, d.z) - this.mesh.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
                this.mesh.rotation.y += a * Math.min(1, rate * dt);
            }
            volley() {
                const n = this.phase === 2 ? 7 : 5, spread = this.phase === 2 ? 0.95 : 0.7;
                this.arms.forEach(g => {
                    const from = new THREE.Vector3(); g.userData.muz.getWorldPosition(from);
                    const to = this.target.clone(); to.y += 1.4;
                    const base = to.sub(from).normalize();
                    for (let k = 0; k < n; k++) {
                        const ang = (k / (n - 1) - 0.5) * spread;
                        const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).normalize();
                        const m = api.orbMesh(); m.scale.setScalar(1.05);
                        m.position.copy(from); api.scene.add(m); api.enemyShots.push({ mesh: m, dir, life: 3.5, dmg: 8 });
                    }
                    api.spawnFlash(from, 0xff4a7a, 1.4, 0.12);
                });
                api.AudioSys.playBigShot();
            }
            update(dt, player, time) {
                if (this.isDead) return;
                if (this.flash > 0) { this.flash -= dt; if (this.flash <= 0) this.mats.forEach(m => { if (m.emissive) { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; } }); }
                this.glowMat.emissiveIntensity = 2 + Math.sin(time * (this.phase === 2 ? 12 : 5)) * 0.8;
                this.core.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
                this.updateShocks(dt, api.localPlayer || player);   // each device checks its own hero against the rings
                if (!this.active) { this.root.position.y = Math.sin(time * 1.5) * 0.05; return; }
                if (this.phase === 1 && this.hp < this.maxHp / 2) {
                    this.phase = 2; api.shake(0.7); api.AudioSys.playBossRoar(); api.spawnShockwave(this.mesh.position.clone().setY(this.mesh.position.y + 0.1), 0xff2a6d, 14);
                    if (!this.called) { this.called = true; [-1, 1].forEach(s => new api.Enemy(this.center.x + s * 14, this.center.y, this.center.z, 'drone', 6)); }
                }
                const P = this.mesh.position, pp = player.mesh.position;
                const d = new THREE.Vector3(pp.x - P.x, 0, pp.z - P.z), dist = d.length(); d.normalize();
                const fast = this.phase === 2 ? 1.35 : 1;
                this.t += dt;
                let move = 0;
                switch (this.state) {
                    case 'idle':
                        this.face(player, dt);
                        move = dist > 15 ? 5 * fast : dist < 8 ? -4 : 0;
                        this.cool -= dt * fast;
                        if (this.cool <= 0) {
                            const r = Math.random();
                            this.state = r < 0.4 ? 'volley' : r < 0.72 ? 'slam' : (dist > 9 ? 'charge' : 'volley');
                            this.t = 0; this.shots = 0; this.target = pp.clone();
                            if (this.state === 'slam') api.AudioSys.playBossLeap(); else if (this.state === 'charge') api.AudioSys.playBossCharge();
                        }
                        break;
                    case 'volley':
                        this.face(player, dt, 6); this.target = pp.clone();
                        if (this.t > 0.35 * this.shots + 0.3 && this.shots < 3) { this.volley(); this.shots++; }
                        if (this.t > 1.6) this.endAttack();
                        break;
                    case 'slam': {
                        // telegraph → leap → land with a shockwave ring
                        const up = 0.55 / fast, air = 0.5 / fast;
                        if (this.t < up) { this.root.position.y = -0.6 * (this.t / up); this.warnAt(P, 22, this.t / up); }
                        else if (this.t < up + air) { const k = (this.t - up) / air; this.root.position.y = Math.sin(k * Math.PI) * 6; }
                        else if (!this.landed) {
                            this.landed = true; this.root.position.y = 0; api.shake(0.8); api.AudioSys.playExplode();
                            api.spawnShockwave(P.clone().setY(P.y + 0.1), 0xff2a6d, 10);
                            this.addShock(P.clone(), this.phase === 2 ? 30 : 24);
                            if (this.phase === 2) setTimeout(() => !this.isDead && this.addShock(this.mesh.position.clone(), 30), 450);
                        }
                        if (this.t > up + air + 0.7) { this.landed = false; this.endAttack(); }
                        break;
                    }
                    case 'charge': {
                        const tele = 0.75 / fast;
                        if (this.t < tele) {
                            this.face(player, dt, 8); this.chargeDir = d.clone(); this.warnAt(P, 3.5, this.t / tele);
                            this.root.position.x = Math.sin(time * 60) * 0.06;
                        } else if (this.t < tele + 0.8) {
                            this.root.position.x = 0;
                            this.vel.set(this.chargeDir.x * 30 * fast, 0, this.chargeDir.z * 30 * fast);
                            const res = api.moveBody(P, this.vel, dt, this.body.r, 0, this.body.h, 0.3, false);
                            if (Math.random() < 0.5) api.spawnSparks(P.clone().setY(P.y + 0.3), 0xff9a3c, 2, 6);
                            if (!this.rushHit && dist < 3.6 && Math.abs(pp.y - P.y) < 3) { this.rushHit = true; player.takeDamage(18); }
                            if (res.blocked) { api.shake(0.5); this.t = tele + 0.8; }
                        } else if (this.t > tele + 1.3) { this.rushHit = false; this.endAttack(); }
                        break;
                    }
                }
                if (move) { this.vel.set(d.x * move, 0, d.z * move); api.moveBody(P, this.vel, dt, this.body.r, 0, this.body.h, 0.3, false); }
                // keep inside the chamber
                P.x = Math.max(this.center.x - this.half + 3, Math.min(this.center.x + this.half - 3, P.x));
                P.z = Math.max(this.center.z - this.half + 3, Math.min(this.center.z + this.half - 3, P.z));
                // stomping walk
                const walk = this.state === 'idle' && move ? Math.sin(time * 6) : 0;
                this.legs[0].rotation.x = walk * 0.35; this.legs[1].rotation.x = -walk * 0.35;
                // body contact
                if (dist < 3.2 && Math.abs(pp.y - P.y) < 4 && this.state !== 'charge') player.takeDamage(10);
            }
            endAttack() { this.state = 'idle'; this.t = 0; this.cool = (this.phase === 2 ? 1.4 : 2.2) + Math.random(); this.warn.material.opacity = 0; }
            warnAt(p, r, k) { this.warn.position.set(p.x, p.y + 0.06, p.z); this.warn.scale.setScalar(r); this.warn.material.opacity = 0.25 + 0.6 * Math.abs(Math.sin(k * 12)); }
            addShock(p, max) {
                const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 72), new THREE.MeshBasicMaterial({ color: 0xff3a6a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
                m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.08, p.z); api.scene.add(m);
                const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a6d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
                wall.position.set(p.x, p.y + 0.4, p.z); api.scene.add(wall);
                this.shocks.push({ m, wall, c: p.clone(), r: 1, max, hit: false });
            }
            updateShocks(dt, player) {
                for (let i = this.shocks.length - 1; i >= 0; i--) {
                    const s = this.shocks[i]; s.r += 20 * dt;
                    s.m.scale.setScalar(s.r); s.wall.scale.set(s.r, 1, s.r);
                    const k = s.r / s.max; s.m.material.opacity = 0.9 * (1 - k); s.wall.material.opacity = 0.35 * (1 - k);
                    const pp = player.mesh.position, dd = Math.hypot(pp.x - s.c.x, pp.z - s.c.z);
                    // the ring is low: jumping over it or dashing through it avoids the hit
                    if (!s.hit && Math.abs(dd - s.r) < 0.9 && pp.y - s.c.y < 0.9) { s.hit = true; player.takeDamage(16); }
                    if (s.r >= s.max) { api.scene.remove(s.m); api.scene.remove(s.wall); this.shocks.splice(i, 1); }
                }
            }
            takeDamage(amount, at, crit) {
                if (this.isDead || !this.active) return;
                this.hp -= amount; Feedback.hit(this, amount, at, crit, true); api.AudioSys.playHit(); this.flash = 0.07;
                this.mats.forEach(m => { if (m.emissive) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.2; } });
                api.spawnSparks(at || this.aimPoint(), 0xffd27a, 8, 12);
                if (this.hp <= 0) this.die();
            }
            die() {
                this.isDead = true; this.hp = 0; this.warn.visible = false;
                this.shocks.forEach(s => { api.scene.remove(s.m); api.scene.remove(s.wall); }); this.shocks = [];
                const i = api.enemies.indexOf(this); if (i > -1) api.enemies.splice(i, 1);
                api.onKill(this);
                let n = 0;
                const boom = () => {
                    const p = this.aimPoint().add(new THREE.Vector3(api.rand(-2, 2), api.rand(-2.5, 2), api.rand(-1.5, 1.5)));
                    api.spawnFlash(p, 0xffc070, 3.5, 0.3); api.spawnSparks(p, 0xff9a3c, 26, 20); api.AudioSys.playExplode(); api.shake(0.7);
                    if (++n < 7) setTimeout(boom, 180);
                    else { api.spawnShockwave(this.mesh.position.clone().setY(this.mesh.position.y + 0.1), 0xffa826, 18); api.scene.remove(this.mesh); api.onBossDown(this); }
                };
                api.hitStop(0.25); boom();
            }
        };
    }

    // ---------------------------------------------------------------
    // Minimap: round radar, north = forward (-z). Rooms, player arrow,
    // enemies (red), boss (magenta), cleared arenas (green), progress bar.
    // ---------------------------------------------------------------
    function Minimap(canvas, layout) {
        const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, R = W / 2 - 2, VIEW = 110;
        const total = layout.startZ - layout.endZ;
        let acc = 0;
        this.draw = (player, enemies, dt, time) => {
            acc += dt; if (acc < 0.08) return; acc = 0;
            const p = player.mesh.position, s = (2 * R) / VIEW, cx = W / 2, cy = H / 2;
            const X = x => cx + (x - p.x) * s, Y = z => cy + (z - p.z) * s;
            g.clearRect(0, 0, W, H);
            g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = 'rgba(4,12,24,0.72)'; g.fill(); g.clip();
            // rooms
            for (const z of layout.zones) {
                if (Y(z.z0) < -20 || Y(z.z1) > H + 20) continue;
                let cleared = false;
                if (z.kind === 'arena' || z.kind === 'corridor') cleared = !enemies.some(e => e.mesh.position.z <= z.z0 && e.mesh.position.z >= z.z1 && Math.abs(e.mesh.position.x) <= Math.max(Math.abs(z.x0), Math.abs(z.x1)));
                g.fillStyle = z.kind === 'boss' ? 'rgba(255,42,109,0.18)' : cleared ? 'rgba(60,220,140,0.16)' : 'rgba(57,215,255,0.14)';
                g.strokeStyle = z.kind === 'boss' ? 'rgba(255,42,109,0.8)' : cleared ? 'rgba(60,220,140,0.7)' : 'rgba(57,215,255,0.6)';
                g.lineWidth = 1;
                g.fillRect(X(z.x0), Y(z.z0), (z.x1 - z.x0) * s, (z.z1 - z.z0) * s);
                g.strokeRect(X(z.x0) + 0.5, Y(z.z0) + 0.5, (z.x1 - z.x0) * s, (z.z1 - z.z0) * s);
            }
            // enemies
            for (const e of enemies) {
                if (e.isDead) continue;
                const ex = X(e.mesh.position.x), ey = Y(e.mesh.position.z);
                if (e.type === 'boss') {
                    const r = 5 + Math.sin(time * 6) * 1.2;
                    g.fillStyle = '#ff2a6d'; g.beginPath(); g.arc(ex, ey, r, 0, Math.PI * 2); g.fill();
                    g.strokeStyle = 'rgba(255,42,109,0.5)'; g.beginPath(); g.arc(ex, ey, r + 4, 0, Math.PI * 2); g.stroke();
                } else { g.fillStyle = e === player.lockedEnemy ? '#ffe066' : '#ff4a5a'; g.fillRect(ex - 2, ey - 2, 4, 4); }
            }
            // player arrow
            const ry = player.mesh.rotation.y;
            g.save(); g.translate(cx, cy); g.rotate(Math.atan2(Math.sin(ry), Math.cos(ry)) * -1 + Math.PI);
            g.fillStyle = '#ffa826'; g.strokeStyle = '#1a0d00'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2.5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
            g.restore();
            g.restore();
            // rim + progress arc
            const prog = Math.max(0, Math.min(1, (layout.startZ - p.z) / total));
            g.lineWidth = 2; g.strokeStyle = 'rgba(57,215,255,0.35)'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
            g.lineWidth = 3; g.strokeStyle = '#ffa826'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g.stroke();
        };
        this.stageAt = z => { for (const q of layout.zones) if (z <= q.z0 && z >= q.z1) return q; return null; };
    }

    // ---------------------------------------------------------------
    // Arena lockdown: stepping into an arena slams both gates shut. Clear the first wave,
    // a second (tougher) wave warps in, and the gates only open when the arena is empty.
    // ---------------------------------------------------------------
    const LK = {
        lock: { ar: '⚠ إغلاق المنطقة — اقضِ على الجميع', en: '⚠ LOCKDOWN — clear the arena', es: '⚠ BLOQUEO — limpia la arena', zh: '⚠ 封锁 — 清空竞技场', ja: '⚠ ロックダウン — 全滅させろ' },
        wave: { ar: '⚠ موجة ثانية!', en: '⚠ SECOND WAVE!', es: '⚠ ¡SEGUNDA OLEADA!', zh: '⚠ 第二波！', ja: '⚠ 第二波！' },
        open: { ar: 'فُتحت البوابات', en: 'GATES OPEN', es: 'PUERTAS ABIERTAS', zh: '大门开启', ja: 'ゲート開放' },
        saved: { ar: '✓ تم حفظ التقدم', en: '✓ PROGRESS SAVED', es: '✓ PROGRESO GUARDADO', zh: '✓ 进度已保存', ja: '✓ セーブ完了' },
        resume: { ar: 'استئناف من آخر نقطة حفظ', en: 'RESUMING FROM CHECKPOINT', es: 'CONTINUANDO DESDE EL PUNTO DE CONTROL', zh: '从存档点继续', ja: 'チェックポイントから再開' }
    };
    const lk = k => LK[k][window.AxonI18n ? window.AxonI18n.lang : 'en'] || LK[k].en;
    // checkpoints: every cleared arena is saved; coming back to the mission starts right after the last one,
    // with everything behind it already cleared
    const CKPT = 'axon.ckpt';
    function saveCkpt(i) { try { const c = JSON.parse(localStorage.getItem(CKPT) || '{}'); if (!(c.a >= i)) localStorage.setItem(CKPT, JSON.stringify({ v: 1, m: 0, a: i })); } catch (e) { } }
    function makeArenas(api, layout) {
        const doors = [];
        const drop = e => { if (e.isDead) return; e.isDead = true; e.dormant = false; api.scene.remove(e.mesh); const k = api.enemies.indexOf(e); if (k > -1) api.enemies.splice(k, 1); };
        function gateAt(a, z) {
            // sits exactly inside the gate frame (pillars from |x| = 6, lintel from h+12), thinner than the frame
            const n = api.solids.length, m = api.createFacilityBlock(0, a.h + 5.95, z, 11.9, 11.9, 1.4, false, true);
            const box = api.solids[n];
            if (m) { m.userData.y = m.position.y; m.position.y += 12.5; }
            const d = { m, box, t: 0, open: false }; doors.push(d); return d;
        }
        function openGate(d) { d.open = true; d.t = 0; const i = api.solids.indexOf(d.box); if (i > -1) api.solids.splice(i, 1); }
        // one arena transition: idle → wave1 (lockdown) → wave2 (reinforcements) → clear (gates open, checkpoint)
        function step(a, to, p) {
            if (to === 'wave1' && a.state === 'idle') {
                a.state = 'wave1'; a.gates = [gateAt(a, a.entryZ), gateAt(a, a.exitZ)];
                api.toast(lk('lock')); api.shake(0.5); api.AudioSys.playGateSlam(); if (api.tip) api.tip('lockdown');
                a.wave1.forEach(e => e.alertNow && e.alertNow(p || api.playerPos()));
            } else if (to === 'wave2' && a.state === 'wave1') {
                a.state = 'wave2';
                a.wave2.forEach((e, k) => setTimeout(() => {
                    if (e.isDead) return;
                    e.dormant = false; e.mesh.visible = true; if (!api.enemies.includes(e)) api.enemies.push(e); e.alertNow && e.alertNow(api.playerPos ? api.playerPos() : null);
                    const q = e.aimPoint(); api.spawnFlash(q, 0x8fe9ff, 2.6, 0.3); api.spawnShockwave(q.setY(e.mesh.position.y + 0.1), 0x39d7ff, 5);
                }, 250 + k * 220));
                api.toast(lk('wave')); api.AudioSys.playLock();
            } else if (to === 'clear' && a.state !== 'clear') {
                if (a.state === 'idle') a.gates = [];
                a.state = 'clear'; (a.gates || []).forEach(openGate); api.AudioSys.playGateOpen();
                saveCkpt(layout.arenas.indexOf(a));
                api.toast(lk('open') + ' · ' + lk('saved')); api.AudioSys.playChargeFull();
                if (api.tip) api.tip('retreat');
            } else return;
            if (api.onArena) api.onArena(layout.arenas.indexOf(a), a.state);
        }
        const ORDER = ['idle', 'wave1', 'wave2', 'clear'];
        return {
            // co-op guest: walk an arena forward to the host's state (each missing step in order)
            force(i, to) {
                const a = layout.arenas[i]; if (!a) return;
                while (ORDER.indexOf(a.state) < ORDER.indexOf(to)) { const before = a.state; step(a, ORDER[ORDER.indexOf(a.state) + 1]); if (a.state === before) break; }
            },
            // put the hero at the last checkpoint (returns false when there is none)
            restore(player) {
                let c = null; try { c = JSON.parse(localStorage.getItem(CKPT) || 'null'); } catch (e) { }
                const a = c && layout.arenas[c.a]; if (!a) return false;
                layout.arenas.forEach((b, k) => { if (k <= c.a) { b.state = 'clear'; b.wave1.forEach(drop); b.wave2.forEach(drop); } });
                api.enemies.slice().forEach(e => { if (e.type !== 'boss' && e.mesh.position.z > a.exitZ - 1) drop(e); });
                layout.zones.forEach(z => { if (z.z1 >= a.exitZ - 1) z.rewarded = true; });
                // respawn in the middle of the cleared (empty) arena, well back from the next corridor's enemies
                player.mesh.position.set(0, a.h + 0.05, a.cz); if (api.freeSpot) api.freeSpot(player.mesh.position); player.lastSafePos.copy(player.mesh.position);
                player.velocity.set(0, 0, 0); player.mesh.rotation.y = Math.PI;
                api.toast(lk('resume'));
                return true;
            },
            reset() { try { localStorage.removeItem(CKPT); } catch (e) { } },
            // players: the hero, or every hero in a co-op run (any of them walking in starts the lockdown).
            // auth = false on a co-op guest: the host decides, its events arrive through force()
            update(players, dt, auth = true) {
                const list = Array.isArray(players) ? players : [players];
                if (auth) for (const a of layout.arenas) {
                    if (a.state === 'idle') {
                        const who = list.find(pl => { const p = pl.mesh.position; return p.z < a.entryZ - 4 && p.z > a.exitZ + 4 && Math.abs(p.x) < a.half - 1 && Math.abs(p.y - a.h) < 4; });
                        if (who) step(a, 'wave1', who.mesh.position);
                    } else if (a.state === 'wave1') {
                        if (a.wave1.filter(e => !e.isDead).length <= 1) step(a, 'wave2');
                    } else if (a.state === 'wave2') {
                        if (a.wave2.every(e => !e.dormant) && a.wave1.every(e => e.isDead) && a.wave2.every(e => e.isDead)) step(a, 'clear');
                    }
                }
                // gates slam down / slide up
                for (let i = doors.length - 1; i >= 0; i--) {
                    const d = doors[i]; if (!d.m) continue;
                    d.t = Math.min(1, d.t + dt * (d.open ? 1.6 : 5));
                    const k = d.open ? d.t * d.t : 1 - (1 - d.t) * (1 - d.t) * (1 - d.t);
                    d.m.position.y = d.m.userData.y + (d.open ? k : 1 - k) * 12.5;
                    if (d.open && d.t >= 1) { api.scene.remove(d.m); doors.splice(i, 1); }
                }
            }
        };
    }

    // ---------------------------------------------------------------
    // Traps of the gauntlets: spike poppers (retracted → 0.45 s glowing warning → up for 0.9 s),
    // spiked rollers sweeping across the landing (jump them), and the pits (fall = damage + back to the ledge).
    // ---------------------------------------------------------------
    function makeTraps(api, layout) {
        let t = 0; const T = 2.2;
        return {
            update(player, dt) {
                t += dt;
                const p = player.mesh.position;
                for (const tr of layout.traps) {
                    if (tr.cd > 0) tr.cd -= dt;
                    if (tr.kind === 'pop') {
                        const ph = (t + tr.off) % T, warn = ph > 0.95 && ph < 1.3, up = ph >= 1.3;
                        const k = up ? Math.min(1, (ph - 1.3) / 0.06) : warn ? 0.12 : 0;
                        tr.mesh.position.y = tr.top - 0.8 + k * 0.8;
                        tr.pm.emissiveIntensity = up ? 2.2 : warn ? 1 + Math.sin(t * 40) * 0.8 : 0.25;
                        if (up && !tr.was && Math.abs(p.z - tr.z) < 25) api.AudioSys.playTone('square', 340, 90, 0.08, 0.04);
                        tr.was = up;
                        if (up && tr.cd <= 0 && Math.abs(p.x - tr.x) < tr.w / 2 + 0.3 && Math.abs(p.z - tr.z) < tr.d / 2 + 0.3 && p.y < tr.top + 0.8 && p.y > tr.top - 0.6) {
                            tr.cd = 0.6; player.takeDamage(Math.round(22 * (1 + 0.1 * tr.lvl))); player.velocity.y = 14;
                        }
                    } else if (tr.kind === 'roll') {
                        const x = Math.sin((t + tr.off) * (2.6 + 0.08 * tr.lvl)) * 5.6; tr.mesh.position.x = x;
                        if (tr.cd <= 0 && Math.abs(p.x - x) < 1.5 && Math.abs(p.z - tr.z) < 0.95 && p.y < tr.top + 1.1 && p.y > tr.top - 0.6) {
                            tr.cd = 0.6; player.takeDamage(Math.round(24 * (1 + 0.1 * tr.lvl))); player.velocity.y = 12; p.z += p.z > tr.z ? 1.2 : -1.2;
                        }
                    } else if (tr.kind === 'pit') {
                        if (!tr.told && p.z < tr.z0 + 8 && p.z > tr.z1 && Math.abs(p.y - tr.y - 3) < 3) { tr.told = true; if (api.tip) api.tip('traps'); }
                        if (!player.dead && p.z < tr.z0 + 1 && p.z > tr.z1 - 1 && p.x > tr.x0 && p.x < tr.x1 && p.y < tr.h - 6) {
                            player.shieldT = 0; player.takeDamage(99999, true);        // fell into the abyss: that's the run
                        }
                        // walkers never step off into the pit (they don't fall): keep them on the ledges
                        for (const e of api.enemies) {
                            if (e.type === 'drone' || e.type === 'boss' || e.isDead) continue;
                            const q = e.mesh.position;
                            if (q.z < tr.z0 && q.z > tr.z1 && Math.abs(q.y - tr.y - 3) < 2) q.z = q.z > (tr.z0 + tr.z1) / 2 ? tr.z0 + 0.2 : tr.z1 - 0.2;
                        }
                    }
                }
            }
        };
    }

    return { makeEnemy, generate, makeBoss, Minimap, makeArenas, makeTraps, STAGES, Feedback, noise };
})();
