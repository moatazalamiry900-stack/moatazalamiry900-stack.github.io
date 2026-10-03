// =====================================================================
//  AXON BREACH — ALIEN FORCES of the exploration worlds (aliens.js)
//  Three new kinds of hostile, used by explore.js next to the seekers, stalkers and bulwarks:
//   • MOTES — a pack of small, weak orbs that fly in a ring around one shared point. The ring circles you,
//     then tightens, burns white and dives straight through you. One or two hits pops each of them.
//   • CARAPACE — a walking gun that lives inside an armoured dome. Shut, the dome deflects everything and it
//     crawls closer; then the two halves swing open, the gun rises and fires, and that is the moment to hit
//     it. Hurt it badly while it is open and it snaps shut again.
//   • MAVERICKS — rogue commanders, one per expedition from depth 2 (two from depth 8). Three of them:
//       RAZOR (twin blades: chained dashes),  TITAN (huge: leaps on you, the landing sends out a shockwave),
//       VOLT (keeps its distance: volleys, and a ring of plasma in every direction). Under 40 % they enrage.
//  They are their own classes with the same interface the game expects from an enemy (mesh, body, hp,
//  aimPoint, hitRadius, update, takeDamage, die …), so lock-on, shots, the saber and the counters all work.
//  Loaded by index.html before explore.js.
// =====================================================================
'use strict';

window.AxonAliens = (function () {
    const TEXT = {
        en: { elite: n => `⚠ MAVERICK: ${n}`, rage: n => `${n} IS ENRAGED` },
        ar: { elite: n => `⚠ مافريك: ${n}`, rage: n => `${n} في حالة هيجان` },
        es: { elite: n => `⚠ MAVERICK: ${n}`, rage: n => `${n} ESTÁ FURIOSO` },
        zh: { elite: n => `⚠ 叛乱者：${n}`, rage: n => `${n} 已狂暴` },
        ja: { elite: n => `⚠ マーベリック：${n}`, rage: n => `${n} が激昂` }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const T = (k, ...a) => (TEXT[lang()] || TEXT.en)[k](...a);
    // what each unit costs in a wave's budget, and how many enemies it really is
    const COST = { runner: 1, drone: 1, swarm: 2, shell: 2, heavy: 3, maverick: 6 };
    const STYLES = {
        RAZOR: { hp: 170, speed: 7.5, scale: 1.0, range: 9, moves: ['dash', 'dash', 'volley'], chain: true, tint: 0xff3a5a },
        TITAN: { hp: 260, speed: 4.6, scale: 1.25, range: 7, moves: ['leap', 'leap', 'dash', 'volley'], tint: 0xff9a2a },
        VOLT: { hp: 190, speed: 6.2, scale: 1.05, range: 15, moves: ['nova', 'volley', 'volley', 'dash'], tint: 0x6ad8ff }
    };

    let inst = null;
    function get(api) {
        if (inst && inst.api === api) return inst;
        const THREE = api.THREE, FB = window.AxonLevel.Feedback, PERF = window.AxonPerf;
        const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
        const where = P => { const cam = api.camera(), v = _c.copy(P).applyMatrix4(cam.matrixWorldInverse); return [api.playerPos().distanceTo(P), Math.max(-1, Math.min(1, v.x / Math.max(4, -v.z)))]; };
        const snd = (name, P) => { try { api.AudioSys[name](...where(P)); } catch (e) { } };
        const C = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s), B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
        const add = (geo, mat, parent, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
        const grp = (parent, px = 0, py = 0, pz = 0) => { const g = new THREE.Group(); g.position.set(px, py, pz); parent.add(g); return g; };
        // the four materials every enemy carries, in the order explore.js recolours them: [dark, silver, glow, armour]
        const palette = () => {
            const m = [
                new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.85, roughness: 0.36 }),
                new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.9, roughness: 0.24 }),
                new THREE.MeshStandardMaterial({ color: 0xff2238, emissive: 0xff0a28, emissiveIntensity: 1.6 }),
                new THREE.MeshStandardMaterial({ color: 0xe0621a, metalness: 0.45, roughness: 0.4 })
            ];
            return m;
        };

        // ---------- what all three share ----------
        class Alien {
            constructor(type, lvl, x, y, z) {
                this.type = type; this.lvl = lvl; this.isDead = false; this.flash = 0;
                this.touchR = 0;                                   // the game's own contact check is off: each kind deals its own contact damage
                this.mesh = new THREE.Group(); this.mesh.position.set(x, y, z); api.scene.add(this.mesh);
                this.core = new THREE.Group(); this.mesh.add(this.core);
                this.vel = new THREE.Vector3(); this.spawnY = y; this.mode = 'alert'; this.aware = 1; this.sees = true; this.radius = 1;
            }
            ready(hp, speed) {
                this.hp = this.maxHp = Math.round(hp * (1 + 0.15 * this.lvl)); this.speed = speed * (1 + 0.05 * this.lvl);
                this.mesh.traverse(o => { if (o.isMesh) { o.castShadow = !api.lowShadow; o.receiveShadow = true; } });
                api.enemies.push(this);
            }
            base() { this.mats.forEach(m => { if (!m.userData.e) { m.userData.e = m.emissive.clone(); m.userData.ei = m.emissiveIntensity; } }); }   // call after explore.js recoloured them too
            restore() { this.mats.forEach(m => { if (m.userData.e) { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; } }); }
            lit(t, all, k = 3.2) { this.base(); this.flash = t; this.mats.forEach(m => { if (all || m.userData.ei > 1) { m.emissive.setHex(0xffffff); m.emissiveIntensity = all ? 1.4 : k; } }); }
            tick(dt) { if (this.flash > 0 && (this.flash -= dt) <= 0) this.restore(); }
            aimPoint(out) { const p = out ? out.copy(this.mesh.position) : this.mesh.position.clone(); p.y += this.aimY; return p; }
            hitRadius() { return this.hitR; }
            alertNow() { }
            hear() { }
            // contact with the hero: his chest inside r of our centre
            touch(player, r, dmg) {
                if (player.dead || player.isDashing) return false;
                const p = _a.copy(player.mesh.position); p.y += 1.3;
                if (p.distanceTo(this.aimPoint(_b)) > r) return false;
                player.takeDamage(Math.round(dmg * (1 + 0.1 * this.lvl))); return true;
            }
            shoot(from, dir, dmg) {
                const m = api.orbMesh(); m.position.copy(from).addScaledVector(dir, 0.6);
                api.scene.add(m); api.enemyShots.push({ mesh: m, dir: dir.clone(), life: 3, dmg: Math.round(dmg * (1 + 0.1 * this.lvl)) });
            }
            takeDamage(amount, at, crit) {
                if (this.isDead) return;
                if (this.blocks && this.blocks(amount, at)) return;
                this.hp -= amount; api.AudioSys.playHit(); FB.hit(this, amount, at, crit);
                if (this.hpBar && !this._bar) { this._bar = true; this.hpBar.position.y = this.barY; this.hpBar.scale.setScalar(this.barS || 1); }
                const hp = at || this.aimPoint();                             // white only where it was struck
                api.spawnFlash(hp, 0xffffff, this.type === 'mote' ? 0.35 : 0.55, 0.12);
                api.spawnSparks(hp, 0xffd27a, 8, 10);
                if (this.onHurt) this.onHurt(amount);
                if (this.hp <= 0) this.die();
            }
            die() {
                if (this.isDead) return;
                this.isDead = true; this.restore();
                const p = this.aimPoint(), k = this.boom || 1;
                api.scene.remove(this.mesh);
                const i = api.enemies.indexOf(this); if (i > -1) api.enemies.splice(i, 1);
                if (this.onDeath) this.onDeath();
                api.onKill(this);
                api.AudioSys.playExplode();
                api.spawnFlash(p, 0xffc070, 2.4 * k, 0.25);
                api.spawnSparks(p, 0xff9a3c, Math.round(22 * k), 18); api.spawnSparks(p, 0x7ff3ff, Math.round(10 * k), 12);
                if (k >= 1) { api.spawnShockwave(_a.copy(p).setY(this.spawnY + 0.1), 0xff9a3c, 6 * k); api.shake(0.3 * k); api.hitStop(0.06); }
            }
        }

        // =====================================================================
        //  MOTES — a ring of small orbs
        // =====================================================================
        // one orb is built once; every orb of every pack reuses its geometries
        let ORB = null;
        function orbParts() {
            if (ORB) return ORB;
            const t = palette(), g = new THREE.Group();
            add(new THREE.SphereGeometry(0.36, 14, 10), t[3], g);                                        // shell (takes the world's alien colour)
            add(new THREE.TorusGeometry(0.4, 0.05, 6, 20), t[2], g, 0, 0, 0, Math.PI / 2);                // glowing equator
            add(new THREE.SphereGeometry(0.14, 10, 8), t[2], g, 0, 0.02, 0.3);                            // eye
            add(new THREE.ConeGeometry(0.1, 0.34, 6), t[0], g, 0, 0.46, 0);                                // top and bottom spikes
            add(new THREE.ConeGeometry(0.1, 0.34, 6), t[0], g, 0, -0.46, 0, Math.PI);
            for (const s of [-1, 1]) add(B(0.3, 0.05, 0.2), t[0], g, s * 0.5, 0, -0.08, 0, 0, s * 0.5);    // stub wings
            PERF.mergeStatic(g);
            ORB = g.children.map(m => ({ geo: m.geometry, mi: t.indexOf(m.material), pos: m.position.clone(), rot: m.rotation.clone() }));
            return ORB;
        }
        class Pack {
            constructor(x, y, z, lvl, n) {
                this.lvl = lvl; this.c = new THREE.Vector3(x, y + 2.6, z); this.ground = y;
                this.ang = api.rand(0, 6.28); this.R = 2.4; this.side = Math.random() < 0.5 ? 1 : -1; this.tilt = api.rand(0, 6.28);
                this.state = 'orbit'; this.t = api.rand(2.2, 3.4); this.dir = new THREE.Vector3(); this.stamp = -1;
                this.mats = palette(); this.alive = [];
                for (let i = 0; i < n; i++) this.alive.push(new Orb(this, i, n));
            }
            get members() { return this.alive.slice(); }
            update(dt, player) {
                const c = this.c, pp = player.mesh.position, speed = 7.5 + 0.35 * this.lvl;
                const dx = pp.x - c.x, dz = pp.z - c.z, d = Math.hypot(dx, dz) || 0.001;
                if (this.state === 'orbit') {
                    this.ang += 2.3 * dt; this.R += (2.4 - this.R) * Math.min(1, 4 * dt);
                    let v = d > 7.5 ? speed : d < 5 ? -3 : 0;                               // close in, hold about six metres away
                    c.x += (dx / d * v - dz / d * 2.6 * this.side) * dt; c.z += (dz / d * v + dx / d * 2.6 * this.side) * dt;
                    c.y += (pp.y + 2.4 - c.y) * Math.min(1, 2.5 * dt);
                    if ((this.t -= dt) <= 0 && d < 16) { this.state = 'wind'; this.t = 0.55; this.alive[0].lit(0.55, false); snd('playDroneCharge', c); }
                } else if (this.state === 'wind') {                                         // the ring tightens and burns white: it is about to dive
                    this.ang += 9 * dt; this.R += (1.25 - this.R) * Math.min(1, 8 * dt);
                    if ((this.t -= dt) <= 0) { this.state = 'dive'; this.t = 0.8; this.dir.set(dx, pp.y + 1.2 - c.y, dz).normalize(); snd('playLunge', c); }
                } else {
                    this.ang += 12 * dt; c.addScaledVector(this.dir, 18 * dt);
                    if ((this.t -= dt) <= 0) { this.state = 'orbit'; this.t = api.rand(2.4, 3.8) / (1 + 0.05 * this.lvl); this.side *= -1; }
                }
                c.y = Math.max(this.ground + 1.2, c.y);
            }
        }
        class Orb extends Alien {
            constructor(pack, i, n) {
                const a = i * 6.2832 / n;
                super('mote', pack.lvl, pack.c.x + Math.cos(a) * 2.4, pack.c.y, pack.c.z + Math.sin(a) * 2.4);
                this.pack = pack; this.mats = pack.mats; this.ph = i * 1.7;
                for (const p of orbParts()) { const m = new THREE.Mesh(p.geo, this.mats[p.mi]); m.position.copy(p.pos); m.rotation.copy(p.rot); this.core.add(m); }
                this.body = { r: 0.45, off: -0.45, h: 0.9 }; this.aimY = 0; this.hitR = 0.95; this.meleeR = 2.3; this.barY = 0.95; this.barS = 0.45; this.boom = 0.45;
                this.ready(9, 0);
                this.core.children.forEach(m => { m.castShadow = false; });
            }
            onDeath() { const k = this.pack.alive.indexOf(this); if (k > -1) this.pack.alive.splice(k, 1); }
            update(dt, player, time) {
                if (this.isDead) return;
                this.tick(dt);
                const K = this.pack, P = this.mesh.position;
                if (K.stamp !== time) { K.stamp = time; K.update(dt, player); }               // the pack moves once a frame, whoever is asked first
                const m = K.alive, a = K.ang + m.indexOf(this) * 6.2832 / m.length, diving = K.state === 'dive';
                _a.set(K.c.x + Math.cos(a) * K.R, K.c.y + Math.sin(a + K.tilt) * K.R * 0.35 + Math.sin(time * 4 + this.ph) * 0.12, K.c.z + Math.sin(a) * K.R);
                P.lerp(_a, Math.min(1, (diving ? 16 : 9) * dt));
                this.mesh.rotation.y = Math.atan2(player.mesh.position.x - P.x, player.mesh.position.z - P.z);
                this.core.rotation.z += (diving ? 14 : 4) * dt;
                this.touch(player, 1.15, diving ? 6 : 4);
            }
        }
        // a pack of n orbs at (x, y, z); returns its orbs (each one is an enemy)
        const swarm = (x, y, z, lvl, n = 5) => new Pack(x, y, z, lvl, n).members;

        // =====================================================================
        //  CARAPACE — the gun in the dome
        // =====================================================================
        class Shell extends Alien {
            constructor(x, y, z, lvl) {
                super('shell', lvl, x, y, z);
                const M = this.mats = palette(), [dark, silver, glow, armour] = M; armour.side = THREE.DoubleSide;
                const core = this.core;
                this.legs = grp(core);
                for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(B(0.5, 0.44, 0.6), dark, this.legs, sx * 1.1, 0.22, sz * 0.95);
                add(C(1.62, 1.78, 0.42, 20), dark, core, 0, 0.5, 0);
                add(new THREE.TorusGeometry(1.64, 0.06, 6, 30), glow, core, 0, 0.7, 0, Math.PI / 2);
                // the gun: rises out of the base when the dome opens
                const tur = this.tur = grp(core, 0, 0.15, 0);
                add(C(0.5, 0.64, 0.9, 12), silver, tur, 0, 0.45, 0);
                add(B(1.1, 0.6, 1.0), armour, tur, 0, 1.05, 0);
                add(B(0.8, 0.14, 0.08), glow, tur, 0, 1.12, 0.52);
                for (const s of [-1, 1]) { add(C(0.13, 0.13, 0.9, 10), dark, tur, s * 0.3, 0.95, 0.8, Math.PI / 2); add(new THREE.TorusGeometry(0.13, 0.035, 6, 12), glow, tur, s * 0.3, 0.95, 1.25); }
                add(C(0.05, 0.05, 0.5, 6), silver, tur, 0.38, 1.55, -0.3);
                // the dome: two halves hinged at the rim
                this.half = [-1, 1].map(s => {
                    const h = grp(core, s * 1.55, 0.65, 0), o = -s * 1.55;
                    add(new THREE.SphereGeometry(1.6, 18, 10, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2), armour, h, o, 0, 0);
                    add(B(0.5, 0.1, 0.08), glow, h, o + s * 0.45, 0.55, 1.47, -0.35);                      // eye slits on the front of the dome
                    for (const [a, e] of [[0.5, 0.75], [1.57, 0.6], [2.6, 0.75], [1.57, 1.25]]) {             // studs
                        const r = 1.6, x = Math.sin(e) * Math.sin(a) * s, yy = Math.cos(e), zz = Math.sin(e) * Math.cos(a);
                        const c = add(new THREE.ConeGeometry(0.16, 0.36, 6), silver, h, o + x * r * 1.04, yy * r * 1.04, zz * r * 1.04);
                        c.quaternion.setFromUnitVectors(_up, _a.set(x, yy, zz).normalize());
                    }
                    return h;
                });
                PERF.mergeStatic(core);
                this.body = { r: 1.6, off: 0, h: 2.3 }; this.aimY = 1.2; this.hitR = 2.0; this.meleeR = 3.3; this.barY = 3.3; this.boom = 1.2;
                this.k = 0; this.state = 'shut'; this.t = api.rand(1.4, 2.8); this.shots = 0; this.win = 0; this.clang = 0; this.wob = 0;
                this.mesh.rotation.y = api.rand(-3.14, 3.14);
                this.ready(70, 1.7);
            }
            // shut: everything bounces off
            blocks(amount, at) {
                if (this.k > 0.5) return false;
                const p = at || this.aimPoint(); api.spawnSparks(p, 0xcfe8ff, 6, 9); this.wob = 0.18;
                if (this.clang <= 0) { this.clang = 0.12; const w = where(this.mesh.position); try { api.AudioSys.playRicochet(w[1], w[0]); } catch (e) { } }
                return true;
            }
            onHurt(amount) { this.win += amount; if (this.win > this.maxHp * 0.4 && this.state === 'open') { this.state = 'closing'; this.t = 0.3; } }   // hurt badly: it snaps shut
            update(dt, player, time) {
                if (this.isDead) return;
                this.tick(dt); this.clang -= dt;
                const P = this.mesh.position, pp = player.mesh.position, dx = pp.x - P.x, dz = pp.z - P.z, dist = Math.hypot(dx, dz) || 0.001;
                let dy = Math.atan2(dx, dz) - this.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
                this.mesh.rotation.y += dy * Math.min(1, (this.state === 'shut' ? 2 : 6) * dt);
                this.t -= dt;
                if (this.state === 'shut') {
                    if (dist > 13) {                                                         // crawls into range on its stubby legs
                        this.vel.set(dx / dist * this.speed, 0, dz / dist * this.speed);
                        api.moveBody(P, this.vel, dt, this.body.r, this.body.off, this.body.h, 0.3, false);
                        this.core.position.y = Math.abs(Math.sin(time * 7)) * 0.07; this.core.rotation.z = Math.sin(time * 7) * 0.03;
                    } else { this.core.position.y = 0; this.core.rotation.z = 0; }
                    if (this.t <= 0 && dist < 30) { this.state = 'opening'; this.t = 0.35; this.core.position.y = 0; this.core.rotation.z = 0; this.lit(0.35, false); snd('playDroneCharge', P); }
                } else if (this.state === 'opening') {
                    this.k = Math.min(1, this.k + dt / 0.35);
                    if (this.t <= 0) { this.state = 'open'; this.t = 2.4; this.shots = 0; this.win = 0; }
                } else if (this.state === 'open') {
                    const el = 2.4 - this.t;
                    if (this.shots < 2 && el > 0.4 + this.shots * 0.85) {
                        this.shots++;
                        const from = _a.set(Math.sin(this.mesh.rotation.y) * 1.3, 2.0, Math.cos(this.mesh.rotation.y) * 1.3).add(P);
                        const dir = _b.copy(pp).setY(pp.y + 1.3).sub(from).normalize();
                        for (const s of (this.lvl >= 3 ? [-0.2, 0, 0.2] : [-0.09, 0.09])) this.shoot(from, _c.copy(dir).applyAxisAngle(_up, s), 7);
                        snd('playEnemyShot', P); this.tur.position.z = -0.22;
                    }
                    if (this.t <= 0) { this.state = 'closing'; this.t = 0.3; }
                } else {
                    this.k = Math.max(0, this.k - dt / 0.3);
                    if (this.t <= 0) { this.k = 0; this.state = 'shut'; this.t = api.rand(1.8, 2.8) / (1 + 0.06 * this.lvl); }
                }
                const e = this.k * this.k * (3 - 2 * this.k);
                this.tur.position.y = 0.15 + e * 0.8; this.tur.position.z *= Math.max(0, 1 - 9 * dt);
                this.wob = Math.max(0, this.wob - dt);
                this.half.forEach((h, i) => { const s = i ? 1 : -1; h.rotation.z = -s * (e * 1.05 + Math.sin(this.wob * 60) * this.wob * 0.25); });
                this.aimY = 1.2 + e * 0.7;
                this.touch(player, 2.3, 8);
            }
        }

        // =====================================================================
        //  MAVERICKS — rogue commanders
        // =====================================================================
        class Maverick extends Alien {
            constructor(x, y, z, lvl, style) {
                super('maverick', lvl, x, y, z);
                const S = this.S = STYLES[style] || STYLES.RAZOR; this.name = STYLES[style] ? style : 'RAZOR';
                const M = this.mats = palette(), [dark, silver, glow, armour] = M;
                const core = this.core; core.position.y = 1.75;
                const razor = this.name === 'RAZOR', titan = this.name === 'TITAN', volt = this.name === 'VOLT';
                // legs
                this.legL = grp(core, -0.32, 0, 0); this.legR = grp(core, 0.32, 0, 0);
                for (const l of [this.legL, this.legR]) {
                    add(C(0.2, 0.16, 0.8, 10), silver, l, 0, -0.4, 0);
                    add(B(0.26, 0.2, 0.14), armour, l, 0, -0.8, 0.16);
                    add(C(0.15, 0.21, 0.75, 10), dark, l, 0, -1.2, -0.02);
                    add(B(0.34, 0.16, 0.62), dark, l, 0, -1.65, 0.1);
                    add(B(0.3, 0.08, 0.2), armour, l, 0, -1.56, 0.36);
                }
                // body
                add(B(0.8, 0.3, 0.5), dark, core, 0, 0.05, 0);
                add(C(0.64, 0.42, 0.95, 8), armour, core, 0, 0.68, 0).scale.z = 0.78;
                add(B(0.5, 0.5, 0.12), dark, core, 0, 0.72, 0.42);
                add(new THREE.SphereGeometry(0.19, 12, 10), glow, core, 0, 0.76, 0.5);                       // the core in its chest
                add(new THREE.TorusGeometry(0.24, 0.035, 6, 16), silver, core, 0, 0.76, 0.5);
                add(B(0.16, 0.8, 0.14), dark, core, 0, 0.7, -0.44);
                for (const s of [-1, 1]) {
                    const p = add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), armour, core, s * 0.86, 1.02, 0, 0, 0, -s * 0.35); p.scale.set(1.15, 1, 1.1);
                    add(new THREE.TorusGeometry(0.4, 0.035, 6, 16), glow, core, s * 0.92, 0.9, 0, Math.PI / 2, s * 0.35, 0);
                    if (!volt) add(new THREE.ConeGeometry(0.12, titan ? 0.6 : 0.42, 6), silver, core, s * 1.0, 1.45, 0, 0, 0, -s * 0.45);
                    if (titan) { add(C(0.16, 0.2, 0.7, 10), dark, core, s * 0.62, 1.42, 0.1, Math.PI / 2); add(new THREE.TorusGeometry(0.16, 0.035, 6, 12), glow, core, s * 0.62, 1.42, 0.46); }
                }
                // head
                const head = grp(core, 0, 1.46, 0);
                add(C(0.26, 0.3, 0.42, 8), dark, head);
                add(B(0.42, 0.08, 0.1), glow, head, 0, 0.03, 0.26);
                add(B(0.2, 0.14, 0.12), silver, head, 0, -0.16, 0.24);
                if (razor) add(B(0.06, 0.34, 0.8), armour, head, 0, 0.36, -0.16, -0.45);                      // swept crest
                if (titan) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.09, 0.55, 6), silver, head, s * 0.3, 0.32, 0, 0, 0, -s * 0.6);   // horns
                if (volt) add(new THREE.TorusGeometry(0.34, 0.03, 6, 20), glow, head, 0, 0.42, 0, Math.PI / 2);   // halo
                // arms
                this.armL = grp(core, -0.98, 1.0, 0); this.armR = grp(core, 0.98, 1.0, 0);
                for (const a of [this.armL, this.armR]) {
                    const right = a === this.armR;
                    add(C(0.17, 0.15, 0.6, 10), dark, a, 0, -0.35, 0);
                    add(C(0.2, 0.25, 0.65, 10), silver, a, 0, -0.95, 0);
                    if (razor) add(B(0.05, 1.25, 0.22), glow, a, right ? 0.14 : -0.14, -1.45, 0.14, 0.18);        // forearm blades
                    else if (titan) { add(B(0.52, 0.5, 0.52), armour, a, 0, -1.42, 0); add(B(0.56, 0.08, 0.56), glow, a, 0, -1.16, 0); }   // great fists
                    else if (right) { add(C(0.28, 0.34, 0.8, 12), dark, a, 0, -1.4, 0); add(new THREE.TorusGeometry(0.26, 0.05, 6, 16), glow, a, 0, -1.8, 0, Math.PI / 2); }   // arm cannon
                    else add(new THREE.SphereGeometry(0.22, 12, 10), glow, a, 0, -1.4, 0);                       // charged hand
                }
                if (volt) { this.ring = grp(core, 0, 0.8, -0.55); add(new THREE.TorusGeometry(1.0, 0.05, 6, 28), glow, this.ring); for (let k = 0; k < 6; k++) add(B(0.1, 0.34, 0.1), silver, this.ring, Math.cos(k * 1.047) * 1.0, Math.sin(k * 1.047) * 1.0, 0, 0, 0, k * 1.047 - 1.57); }
                PERF.mergeStatic(core);
                const sc = S.scale; this.mesh.scale.setScalar(sc);
                // name over its head
                const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
                g.fillStyle = 'rgba(20,6,10,.82)'; g.fillRect(4, 10, 248, 44); g.strokeStyle = '#' + S.tint.toString(16).padStart(6, '0'); g.lineWidth = 4; g.strokeRect(4, 10, 248, 44);
                g.fillStyle = '#fff'; g.font = "800 30px 'Chakra Petch',system-ui,sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.name, 128, 34);
                const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); tag.scale.set(2.2, 0.55, 1); tag.position.y = 4.75; this.mesh.add(tag);
                this.body = { r: 0.9 * sc, off: 0, h: 3.4 * sc }; this.aimY = 2.0 * sc; this.hitR = 1.9 * sc; this.meleeR = 3.4 * sc; this.barY = 4.15; this.boom = 2.2;
                this.st = 'stalk'; this.t = 0; this.cd = api.rand(1.2, 2); this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 2; this.chain = 0; this.lastMove = '';
                this.dir = new THREE.Vector3(0, 0, 1); this.from = new THREE.Vector3(); this.to = new THREE.Vector3(); this.rage = false; this.walk = 0;
                this.ready(S.hp, S.speed);
            }
            onHurt() {
                if (!this.rage && this.hp > 0 && this.hp < this.maxHp * 0.4) {
                    this.rage = true; this.speed *= 1.2; api.toast(T('rage', this.name)); try { api.AudioSys.playBossRoar(); } catch (e) { }
                    api.spawnShockwave(_a.copy(this.mesh.position).setY(this.spawnY + 0.1), this.S.tint, 8);
                }
            }
            pose(l, r, lean = 0) { this.armL.rotation.x += (l - this.armL.rotation.x) * 0.3; this.armR.rotation.x += (r - this.armR.rotation.x) * 0.3; this.core.rotation.x += (lean - this.core.rotation.x) * 0.3; }
            start(move, player) {
                this.lastMove = move; const P = this.mesh.position;
                if (move === 'dash') { this.st = 'wind'; this.next = 'dash'; this.t = this.chain ? 0.26 : 0.45; this.lit(this.t, false); snd('playRunnerWind', P); }
                else if (move === 'leap') { this.st = 'wind'; this.next = 'leap'; this.t = 0.4; this.lit(0.4, false); snd('playHeavyWind', P); }
                else if (move === 'nova') { this.st = 'wind'; this.next = 'nova'; this.t = 0.6; this.lit(0.6, false); try { api.AudioSys.playBossCharge(); } catch (e) { } }
                else { this.st = 'volley'; this.t = 0; this.n = 0; }
            }
            rest() { this.st = 'recover'; this.t = this.rage ? 0.6 : 0.95; this.chain = 0; }
            update(dt, player, time) {
                if (this.isDead) return;
                this.tick(dt);
                const P = this.mesh.position, pp = player.mesh.position, S = this.S, sc = S.scale, ground = this.spawnY;
                const dx = pp.x - P.x, dz = pp.z - P.z, dist = Math.hypot(dx, dz) || 0.001, nx = dx / dist, nz = dz / dist;
                let vx = 0, vz = 0, turn = 8;
                if (this.ring) this.ring.rotation.z += (this.st === 'wind' ? 9 : 1.5) * dt;
                if (this.st === 'stalk') {
                    if ((this.strafeT -= dt) <= 0) { this.strafeT = api.rand(1.6, 3.2); this.strafe *= -1; }
                    const v = dist > S.range + 2 ? this.speed : dist < S.range - 3 ? -this.speed * 0.6 : 0, s = this.speed * 0.5 * this.strafe;
                    vx = nx * v - nz * s; vz = nz * v + nx * s;
                    this.pose(0.1, 0.1, 0);
                    if ((this.cd -= dt) <= 0) {
                        const ok = S.moves.filter(m => (m === 'dash' ? dist > 5 && dist < 26 : m === 'leap' ? dist > 5 && dist < 24 : m === 'volley' ? dist > 6 : true) && (m !== this.lastMove || Math.random() < 0.35));
                        if (ok.length) this.start(ok[Math.floor(Math.random() * ok.length)], player); else this.cd = 0.4;
                    }
                } else if (this.st === 'wind') {
                    if (this.next === 'dash') this.pose(0.9, 0.9, 0.35); else if (this.next === 'leap') this.pose(-2.6, -2.6, -0.2); else this.pose(-1.5, -1.5, -0.1);
                    this.core.position.y = 1.75 - (this.next === 'nova' ? 0 : 0.25);
                    if ((this.t -= dt) <= 0) {
                        this.core.position.y = 1.75;
                        if (this.next === 'dash') { this.st = 'dash'; this.t = 0.42; this.dir.set(nx, 0, nz); this.hitOnce = false; snd('playLunge', P); }
                        else if (this.next === 'leap') {
                            const d = Math.min(dist, 22); this.from.copy(P); this.to.set(P.x + nx * d, ground, P.z + nz * d);
                            if (api.spotBlocked(this.to.x, this.to.z, this.body.r + 0.2, ground + 0.4, ground + this.body.h)) this.to.copy(P);   // would land inside a rock: slam where it stands
                            this.st = 'leap'; this.t = 0; try { api.AudioSys.playBossLeap(); } catch (e) { }
                        } else {
                            const n = 12 + Math.min(6, Math.floor(this.lvl / 2)), from = _a.copy(P).setY(P.y + 1.5 * sc);
                            for (let k = 0; k < n; k++) { const a = k * 6.2832 / n + this.walk; this.shoot(from, _b.set(Math.sin(a), 0, Math.cos(a)), 7); }
                            api.spawnShockwave(_b.copy(P).setY(ground + 0.1), S.tint, 6); snd('playEnemyShot', P);
                            if (this.chain++ < 1) { this.walk += 3.1416 / n; this.t = 0.4; this.lit(0.4, false); } else this.rest();   // a second ring, turned half a step
                        }
                    }
                } else if (this.st === 'dash') {
                    turn = 0; vx = this.dir.x * 30; vz = this.dir.z * 30; this.pose(1.2, 1.2, 0.5);
                    if (Math.random() < 0.5) api.spawnSparks(_a.copy(P).setY(P.y + 0.3), S.tint, 2, 5);
                    if (!this.hitOnce && this.touch(player, 2.4 * sc, 16)) this.hitOnce = true;
                    if ((this.t -= dt) <= 0) { if (S.chain && this.chain++ < 1 && Math.random() < 0.65) this.start('dash', player); else this.rest(); }
                } else if (this.st === 'leap') {
                    turn = 0; this.t += dt; const k = Math.min(1, this.t / 0.85);
                    P.x = this.from.x + (this.to.x - this.from.x) * k; P.z = this.from.z + (this.to.z - this.from.z) * k; P.y = ground + 4 * 6.5 * k * (1 - k);
                    this.pose(-2.8, -2.8, 0.2);
                    if (k >= 1) {
                        P.y = ground; api.spawnShockwave(_a.copy(P).setY(ground + 0.1), 0xff7a2a, 9 * sc); api.shake(0.6); api.AudioSys.playExplode();
                        api.spawnSparks(_a, 0xffc070, 18, 14);
                        if (Math.hypot(pp.x - P.x, pp.z - P.z) < 7 * sc && player.isGrounded && pp.y < ground + 1) player.takeDamage(Math.round(18 * (1 + 0.1 * this.lvl)));   // jump over the wave
                        this.rest();
                    }
                } else if (this.st === 'volley') {
                    this.pose(0.1, -1.5, 0); this.t += dt;
                    if (this.t > 0.3 + this.n * 0.28) {
                        this.n++;
                        const from = _a.set(Math.sin(this.mesh.rotation.y) * 1.2, 1.9, Math.cos(this.mesh.rotation.y) * 1.2).multiplyScalar(sc).add(P);
                        const dir = _b.copy(pp).setY(pp.y + 1.3).sub(from).normalize();
                        for (const s of (this.name === 'VOLT' ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.2, 0, 0.2])) this.shoot(from, _c.copy(dir).applyAxisAngle(_up, s), 7);
                        snd('playEnemyShot', P);
                        if (this.n >= (this.rage ? 4 : 3)) this.rest();
                    }
                } else {
                    this.pose(0.25, 0.25, 0.12);
                    if ((this.t -= dt) <= 0) { this.st = 'stalk'; this.cd = api.rand(1.1, 2) / (1 + 0.05 * this.lvl) * (this.rage ? 0.6 : 1); }
                }
                if (turn) { let dy = Math.atan2(dx, dz) - this.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.mesh.rotation.y += dy * Math.min(1, turn * dt); }
                if (vx || vz) {
                    this.vel.set(vx, 0, vz); api.moveBody(P, this.vel, dt, this.body.r, this.body.off, this.body.h, 0.3, false);
                    if (this.st === 'stalk') { this.walk += dt * 8; const s = Math.sin(this.walk); this.legL.rotation.x = s * 0.5; this.legR.rotation.x = -s * 0.5; this.core.position.y = 1.75 + Math.abs(s) * 0.08; }
                    else { this.legL.rotation.x = 0.7; this.legR.rotation.x = -0.5; }
                } else if (this.st !== 'wind') { this.legL.rotation.x *= 0.8; this.legR.rotation.x *= 0.8; if (this.st !== 'leap') this.core.position.y = 1.75 + Math.sin(time * 3) * 0.03; }
                if (this.rage && Math.random() < 0.25) api.spawnSparks(_a.copy(P).setY(P.y + 2.4 * sc), S.tint, 1, 4);
                if (this.st !== 'dash' && this.st !== 'leap') this.touch(player, 2.0 * sc, 10);
            }
        }

        inst = { api, swarm, Shell, Maverick, eliteText: n => T('elite', n) };
        return inst;
    }

    // ---------------------------------------------------------------------
    //  The order of battle for one expedition: a list of waves, each a list of unit kinds.
    //  budget = how much one wave may cost (COST); depth decides what exists yet and which wave is which.
    //   patrol — stalkers and seekers          swarm — packs of motes with stalkers
    //   siege  — carapaces in a ring + seekers  armor — bulwarks, a carapace, stalkers
    //   elite  — the last wave from depth 2: a maverick and its escort
    // ---------------------------------------------------------------------
    const ELITES = ['RAZOR', 'TITAN', 'VOLT'];
    function plan(depth, budgets) {
        const last = budgets.length - 1, mid = depth >= 3 ? ['swarm', 'siege', 'armor', 'patrol'] : ['swarm', 'siege', 'patrol'];
        const o = Math.floor(Math.random() * mid.length), waves = [];
        budgets.forEach((b, k) => {
            let theme = k === last && depth >= 2 ? 'elite' : k === 0 ? (depth % 2 ? 'patrol' : 'swarm') : mid[(o + k) % mid.length];
            if (k && theme === waves[k - 1].theme) theme = mid[(o + k + 1) % mid.length];        // never the same kind of wave twice in a row
            const u = []; let left = b;
            const take = (kind, n) => { for (let i = 0; i < n && left >= COST[kind]; i++) { u.push(kind); left -= COST[kind]; } };
            if (theme === 'elite') {
                const first = ELITES[(depth + o) % 3]; u.push('maverick:' + first); left -= COST.maverick;
                if (depth >= 8) { u.push('maverick:' + ELITES[(depth + o + 1) % 3]); left -= COST.maverick; }
                take('swarm', 1); if (depth >= 5) take('shell', 1);
                while (left > 0) { take('drone', 1); take('runner', 1); }
            } else if (theme === 'swarm') { take('swarm', Math.max(1, Math.min(3, Math.floor(b / 3)))); while (left > 0) take('runner', 1); }
            else if (theme === 'siege') { take('shell', Math.max(1, Math.min(4, Math.floor(b / 3)))); while (left > 0) take('drone', 1); }
            else if (theme === 'armor') { take('heavy', Math.max(1, Math.min(3, Math.floor(b / 5)))); take('shell', 1); while (left > 0) take('runner', 1); }
            else { if (b >= 5) take('swarm', 1); while (left > 0) { take('runner', 1); take('drone', 1); } }
            waves.push({ theme, units: u });
        });
        return waves;
    }
    const packSize = depth => (depth >= 6 ? 6 : 5);
    // how many enemies a wave really is (a pack counts as its orbs)
    const count = (wave, depth) => wave.units.reduce((n, u) => n + (u === 'swarm' ? packSize(depth) : 1), 0);

    return { get, plan, count, packSize, COST, STYLES };
})();
