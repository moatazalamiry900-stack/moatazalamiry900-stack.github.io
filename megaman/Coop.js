// =====================================================================
//  AXON BREACH — co-op gameplay on top of net.js (up to 4 heroes in one world).
//   · every device builds the same facility (shared world seed), the HOST runs the enemies and the boss;
//     guests show them as puppets from the host's snapshots and send their hits to the host
//   · every device is in charge of its own hero (HP, dodging, traps); enemy shots are copied to everyone
//   · teammates appear as full animated heroes with name tags; a team bar shows their health
//   · progression is shared: a deploy takes the whole team, whoever reaches a new stage pulls the others
//     in, an arena lockdown or the boss gate pulls everyone inside; the fallen get back up next to a
//     teammate; the run ends only when the whole team is down
//  game.js calls the hooks below; with no co-op session each hook simply does the single-player thing.
// =====================================================================
'use strict';

window.AxonCoop = (function () {
    const N = () => window.AxonNet;
    const on = () => !!(N() && N().on);
    const host = () => on() && N().role === 'host';
    const guest = () => on() && N().role === 'client';
    let C = null;                                   // context from game.js (MP.init)
    const reg = new Map();                          // network id → enemy (dormant ones too)
    let nextId = 0, forceId = null, hitBy = 0, building = true;

    // ---------- the shared world ----------
    // the facility layout (cover blocks, enemy types and spots) comes from Math.random: in co-op it is seeded
    // with the team's seed while the level is generated, so every device builds the very same world
    function seeded(fn) {
        const s = on() ? N().seed : null;
        if (s === null || s === undefined) return fn();
        const R = Math.random; let a = s >>> 0;
        Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        try { return fn(); } finally { Math.random = R; }
    }
    // every enemy gets a network id in creation order (identical on every device for the generated level)
    function wrapEnemy(Base) {
        return class extends Base {
            constructor(x, y, z, type, lvl) {
                super(x, y, z, type, lvl);
                this.nid = forceId !== null ? forceId : (building ? nextId++ : 100000 + nextId++);
                reg.set(this.nid, this);
                if (guest()) asPuppet(this);
                else if (host()) asHosted(this);
                if (!building && host() && forceId === null) N().broadcast({ t: 'sp', n: this.nid, k: type, l: lvl, p: r3(this.mesh.position) });
            }
        };
    }
    const r2 = v => Math.round(v * 100) / 100;
    const r3 = p => [r2(p.x), r2(p.y), r2(p.z)];
    const V = a => new THREE.Vector3(a[0], a[1], a[2]);

    // guest side: hits go to the host; the enemy only really dies when the host says so
    function asPuppet(e) {
        const orig = e.takeDamage.bind(e);
        e.takeDamage = (amt, at, crit) => {
            if (e.isDead) return;
            N().send({ t: 'hit', n: e.nid, d: amt, c: crit ? 1 : 0, a: at ? r3(at) : null });
            if (e.hp - amt <= 0) e.hp = amt + 0.01;           // shows the hit, never the death (that comes from the host)
            orig(amt, at, crit);
        };
    }
    // host side: remember who landed the last hit, for the kill reward
    function asHosted(e) {
        const orig = e.takeDamage.bind(e);
        e.takeDamage = (amt, at, crit) => { if (!e.isDead) e._by = hitBy; orig(amt, at, crit); };
    }
    // api.onKill: who gets the credits for this kill (true = this device)
    function reward(e) {
        if (!on()) return true;
        if (host()) { N().broadcast({ t: 'k', n: e.nid, b: e._by || 0 }); return !(e._by > 0); }
        return e._killer === N().slot;
    }

    // ---------- teammates ----------
    const mates = new Map();                        // slot → { A (hero), st (last state), rx, proxy, tag }
    const _v = new THREE.Vector3();
    function makeAvatar(slot, look) {
        const H = window.AxonHero, A = {
            mesh: new THREE.Group(), velocity: new THREE.Vector3(), localF: 1, localS: 0, isGrounded: true, isDashing: false, jumpCount: 0,
            slashTimer: 0, slashDur: 0.28, slashKind: 'h1', slashSide: 1, aimTimer: 0, recoilTimer: 0, charge: 0, aimPitch: 0, headYaw: 0, headPitch: 0,
            lookTarget: null, hurtTimer: 0, invincibleTimer: 0, dead: false, landT: 0, flipT: 0, rollT: 0, wallJumpT: 0, skidT: 0, wallSlide: 0,
            wallN: new THREE.Vector3(), wallPush: false, ledge: null, body: { r: 0.5, h: 3.15 }
        };
        C.api.scene.add(A.mesh);
        A.look = (look && look.look) || {};
        H.build(A, (look && look.body) || 'a'); H.applySkin(A, (look && look.skin) || 'EMBER');
        const M = A.mats, keep = new Set([M.pearl, M.steel, M.trim, M.accent, M.glow, M.skin, M.hair]);
        const live = new Set([A.torso, A.chest, A.headGroup, A.armL, A.armR, A.elbowL, A.elbowR, A.legL, A.legR, A.kneeL, A.kneeR, A.footL, A.footR,
            A.sword, A.chargeOrb, A.muzzle, A.coreGem, A.mouth, A.mouthOpen, A.mouthClosed, ...A.vanes, ...A.thrusters, ...A.scarf.flat()]);
        A.eyes.forEach(e => { live.add(e); const u = e.userData; [u.lid, u.lidSkin, u.lash, u.iris, u.brow].forEach(o => o && live.add(o)); });
        try { window.AxonPerf.skinRig(A.mesh, o => live.has(o), m => keep.has(m.material)); } catch (err) { console.warn('avatar rig', err); }
        A.tag = nameTag(N().nameOf(slot), N().COLORS[slot] || 0xffffff); A.tag.position.y = 3.75; A.mesh.add(A.tag);
        A.mesh.visible = false;
        return A;
    }
    function nameTag(text, color) {
        const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
        g.font = '700 30px "Chakra Petch","IBM Plex Sans Arabic",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = Math.min(240, g.measureText(text).width + 34);
        g.fillStyle = 'rgba(6,14,26,.78)'; g.fillRect(128 - w / 2, 10, w, 44);
        g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fillRect(128 - w / 2, 50, w, 4);
        g.fillStyle = '#eaf4ff'; g.fillText(text, 128, 33);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
        s.scale.set(1.9, 0.48, 1); s.renderOrder = 6; return s;
    }
    function removeMate(slot) {
        const m = mates.get(slot); if (!m) return;
        if (m.A) { C.api.scene.remove(m.A.mesh); if (m.A.trail) C.api.scene.remove(m.A.trail.mesh); }
        mates.delete(slot); drawTeam();
    }
    function mate(slot) {
        let m = mates.get(slot);
        if (!m) { m = { st: null, rx: 0, A: null, proxy: null, lookKey: '' }; mates.set(slot, m); }
        return m;
    }
    // an enemy's view of a remote hero (host only): position, line of sight, and damage sent over the wire
    function proxyOf(slot, m) {
        if (!m.proxy) m.proxy = {
            slot, mesh: { position: new THREE.Vector3() }, velocity: new THREE.Vector3(), isGrounded: true, isDashing: false, dead: false,
            hasLineOfSight(e) {
                const a = _v.copy(this.mesh.position); a.y += 1.5; const b = e.aimPoint(), P = C.PERF;
                const t = P.segHit(C.api.solids, a, b); return t < 0 || t * a.distanceTo(b) >= a.distanceTo(b) - 0.1;
            },
            takeDamage(n) { if (!this.dead && !this.isDashing) N().sendTo(slot, { t: 'dmg', d: n }); }
        };
        return m.proxy;
    }
    // remote heroes in the same place (and alive) — the host's enemies can target any of them
    function team(player) {
        const out = [player];
        if (!host()) return out;
        mates.forEach((m, slot) => { if (m.st && m.st.w === 'm' && !(m.st.f & 4) && performance.now() - m.rx < 5000) out.push(proxyOf(slot, m)); });
        return out;
    }

    // ---------- where am I ----------
    const where = () => {
        if (!C) return 'x';
        const s = C.getState();
        if (s === 'title' || s === 'over' || s === 'clear') return 'x';
        if (C.hub.on) return 'h';
        return 'm';
    };
    const myStage = () => { const z = C.minimap.stageAt(C.player.mesh.position.z); return z ? z.stage : 0; };

    // ---------- outgoing state ----------
    const KINDS = ['h1', 'h2', 'fin', 'air'];
    let sendT = 0, lookT = 0, lastLook = '', snapT = 0;
    function myState() {
        const P = C.player, p = P.mesh.position, v = P.velocity, L = P.ledge;
        return {
            t: 's', p: r3(p), r: r2(P.mesh.rotation.y), v: r3(v),
            f: (P.isGrounded ? 1 : 0) | (P.isDashing ? 2 : 0) | (P.dead ? 4 : 0) | (P.wallPush ? 8 : 0),
            j: P.jumpCount, k: KINDS.indexOf(P.slashKind), st: r2(Math.max(0, P.slashTimer)), sd: r2(P.slashDur || 0.28),
            ai: r2(Math.max(0, P.aimTimer)), ap: r2(P.aimPitch || 0), ch: r2(P.charge || 0), ws: r2(Math.max(0, P.wallSlide)), wn: [r2(P.wallN.x), r2(P.wallN.z)],
            ld: L ? [L.phase === 'up' ? 1 : 0, r2(L.t), r2(L.dur || 0.5), r2(L.top), L.from ? r2(L.from.y) : r2(p.y)] : 0,
            fl: r2(Math.max(0, P.flipT)), ro: r2(Math.max(0, P.rollT)), wj: r2(Math.max(0, P.wallJumpT)), sk: r2(Math.max(0, P.skidT)), la: r2(Math.max(0, P.landT || 0)),
            hu: r2(Math.max(0, P.hurtTimer)), hp: Math.round(P.hp), mh: P.maxHp, w: where(), sg: where() === 'm' ? myStage() : 0
        };
    }

    // ---------- incoming ----------
    function onMsg(m, from) {
        if (!C) { pending.push([m, from]); return; }
        switch (m.t) {
            case 's': {                                  // a teammate's state (relayed by the host to the others)
                const slot = from; if (slot === N().slot) return;
                const M = mate(slot); M.st = m; M.rx = performance.now(); M.fresh = true;
                if (host()) N().relay(m, slot);
                break;
            }
            case 'fx': if (host()) N().relay(m, from); ghostShot(m); break;
            case 'hit': if (host()) remoteHit(m, from); break;
            case 'dmg': if (!C.player.dead) C.player.takeDamage(m.d); break;
            case 'S': if (guest() && where() === 'm') snapshot(m); break;
            case 'k': if (guest()) killed(m); break;
            case 'sp': if (guest()) spawned(m); break;
            // the rest only matters on the mission (arena gates are solid blocks: never build them into the HQ)
            case 'es': if (guest() && where() === 'm') enemyShot(m); break;
            case 'sk': if (guest() && where() === 'm' && C.boss) C.boss.addShock(V(m.p), m.m); break;
            case 'ar': if (guest() && where() === 'm') C.arenaDir.force(m.i, m.s); break;
            case 'bs': if (guest() && where() === 'm' && !C.boss.active) C.bossStart(); break;
            case 'dep': if (host()) N().relay(m, from); remoteDeploy(m); break;
            case 'over': if (where() === 'm') C.endGame('over'); break;
            case 'down': if (host()) N().relay(m, from); if (from !== N().slot) C.toast(fallen(N().nameOf(from))); break;
            case 'A': if (guest() && where() === 'm') [...(m.a || '')].forEach((c, i) => C.arenaDir.force(i, ARENA[+c])); break;
            case 'roster': rosterSync(); break;
            case 'leave': removeMate(from); break;
            case 'join': if (host()) { N().sendTo(from, myState()); sendArenas(from); } break;
        }
    }
    const pending = [];
    const FALLEN = { ar: n => `${n} سقط!`, en: n => `${n} is down!`, es: n => `¡${n} ha caído!`, zh: n => `${n} 倒下了！`, ja: n => `${n} がダウン！` };
    const REVIVE = { ar: 'سقطت! ستعود بجانب فريقك…', en: 'Down! Back up next to your team…', es: '¡Caído! Vuelves junto a tu equipo…', zh: '倒下了！即将在队友身边复活…', ja: 'ダウン！ 仲間のそばで復帰します…' };
    const PULLED = { ar: n => `لحقت بـ ${n}`, en: n => `Joined ${n}`, es: n => `Te uniste a ${n}`, zh: n => `已跟上 ${n}`, ja: n => `${n} に合流` };
    const BLOCK = { ar: 'غير متاح في اللعب الجماعي', en: 'Not available in co-op', es: 'No disponible en cooperativo', zh: '联机合作中不可用', ja: '協力プレイでは利用できません' };
    const lang = () => (window.AxonI18n && window.AxonI18n.lang) || 'en';
    const tr = (D, ...a) => { const v = D[lang()] || D.en; return typeof v === 'function' ? v(...a) : v; };
    const fallen = n => tr(FALLEN, n);
    function rosterSync() {
        N().roster.forEach(r => {
            if (r.slot === N().slot) return;
            const m = mate(r.slot), key = JSON.stringify(r.look || {}) + r.name;
            if (m.lookKey !== key) { m.lookKey = key; if (m.A) { C.api.scene.remove(m.A.mesh); if (m.A.trail) C.api.scene.remove(m.A.trail.mesh); } m.A = null; m.look = r.look; }
        });
        mates.forEach((m, slot) => { if (!N().roster.some(r => r.slot === slot)) removeMate(slot); });
        drawTeam();
    }

    // host: a guest's hit on one of the host's enemies
    function remoteHit(m, from) {
        const e = m.n === -1 ? C.boss : reg.get(m.n);
        if (!e || e.isDead) return;
        hitBy = from; e.takeDamage(m.d, m.a ? V(m.a) : undefined, !!m.c); hitBy = 0;
    }
    // guest: the host's view of every enemy, a dozen times a second
    function snapshot(m) {
        const E = m.e || [], here = new Set();
        for (let i = 0; i < E.length; i += 7) {
            const nid = E[i], e = reg.get(nid); here.add(nid);
            if (!e || e.isDead) continue;
            if (e.dormant) { e.dormant = false; e.mesh.visible = true; if (!C.api.enemies.includes(e)) C.api.enemies.push(e); }
            if (!C.api.enemies.includes(e)) C.api.enemies.push(e);
            if (!e._t) { e._t = {}; e.mesh.position.set(E[i + 1], E[i + 2], E[i + 3]); }
            const T = e._t, now = performance.now(), gap = T.at ? Math.max(30, now - T.at) / 1000 : 0;
            T.vx = gap ? (E[i + 1] - T.x) / gap : 0; T.vz = gap ? (E[i + 3] - T.z) / gap : 0; T.at = now;   // its speed, to run slightly ahead between snapshots
            T.x = E[i + 1]; T.y = E[i + 2]; T.z = E[i + 3]; T.r = E[i + 4]; e.hp = Math.max(0.01, E[i + 5]); e._f = E[i + 6];
        }
        // missing from the host's list for a good while (a kill message lost, or never there) → gone here too.
        // Reinforcements appear one by one over ~1.5 s, so a short absence means nothing.
        const now = performance.now();
        C.api.enemies.slice().forEach(e => {
            if (e.type === 'boss' || e.isDead || here.has(e.nid)) { e._miss = 0; return; }
            if (!e._miss) e._miss = now; else if (now - e._miss > 3000) { e._killer = -1; e.die(); }
        });
        if (m.b && C.boss) {
            const B = C.boss, b = m.b;
            if (b[12] && !B.active) C.bossStart();
            B._t = { x: b[0], y: b[1], z: b[2], r: b[3], ry: b[6], rx: b[7] };
            if (!B.isDead) B.hp = Math.max(0.01, b[4]);
            B.phase = b[5]; B._warn = [b[8], b[9], b[10], b[11]];
        }
        if (m.a) [...m.a].forEach((c, i) => C.arenaDir.force(i, ARENA[+c]));
    }
    const ARENA = ['idle', 'wave1', 'wave2', 'clear'];
    function killed(m) {
        const e = m.n === -1 ? C.boss : reg.get(m.n);
        if (!e || e.isDead) return;
        e._killer = m.b;
        if (e.dormant) { e.dormant = false; if (!C.api.enemies.includes(e)) C.api.enemies.push(e); }
        e.die();
    }
    function spawned(m) {
        if (reg.has(m.n) && !reg.get(m.n).isDead) return;
        forceId = m.n; try { new C.api.Enemy(m.p[0], m.p[1] - (m.k === 'drone' ? 4 : 0), m.p[2], m.k, m.l); } finally { forceId = null; }
    }
    function enemyShot(m) {
        const api = C.api, mesh = api.orbMesh(); mesh.scale.setScalar(m.s || 1); mesh.position.set(m.p[0], m.p[1], m.p[2]);
        api.scene.add(mesh); api.enemyShots.push({ mesh, dir: V(m.d).normalize(), life: m.l || 3, dmg: m.g || 8 });
    }
    // a teammate's buster shot: same projectile, but harmless here (their own device scores the hits)
    function ghostShot(m) {
        if (where() !== 'm' && where() !== 'h') return;
        const S = C.SHOTS, p = V(m.p), d = V(m.d).normalize(), tier = m.k | 0;
        const mesh = S.shot(tier, p, d);
        C.projectiles.push({ mesh, tier, dir: d, life: 1.4, damage: 0, crit: false, pierce: true, hit: new Set(), speed: tier === 2 ? 55 : 65, spT: 0, ghost: true });
        S.burst(p, d, tier, 'muzzle');
    }
    function fx(spawn, aim, tier) { if (on()) N().send({ t: 'fx', p: r3(spawn), d: r3(aim), k: tier }); }

    // ---------- deploys and team moves ----------
    let remoteDeployPending = false;
    function deployed(i) {                            // hub.onDeploy: tell the team (unless this deploy came from them)
        if (!on()) return;
        if (remoteDeployPending) { remoteDeployPending = false; return; }
        let ck = null; try { ck = localStorage.getItem('axon.ckpt'); } catch (e) { }
        N().send({ t: 'dep', i, ck });
    }
    function remoteDeploy(m) {
        if (!C.hub.on) return;
        try { if (m.ck) localStorage.setItem('axon.ckpt', m.ck); else localStorage.removeItem('axon.ckpt'); } catch (e) { }
        remoteDeployPending = true;
        C.hub.deploy(m.i || 0);
    }
    function goto(to) { return on() ? N().goto(to || 'hub') : false; }
    function block() { if (!on()) return false; C.toast(tr(BLOCK)); return true; }

    // pull this hero to a point (teammate's side, inside a locked arena, into the boss chamber)
    let pullCd = 0;
    function pullTo(x, y, z, who) {
        const P = C.player, p = P.mesh.position;
        C.fxFlash(p.clone().setY(p.y + 1.3));
        const o = SPOT[N().slot % 4]; p.set(x + (o[0] || 1.5), y + 0.05, z + o[1]); if (C.api.freeSpot) C.api.freeSpot(p);   // beside the teammate, never inside
        P.lastSafePos.copy(p); P.velocity.set(0, 0, 0); P.ledge = null; P.wallSlide = 0;
        C.fxFlash(p.clone().setY(p.y + 1.3)); C.api.AudioSys.playLock();
        if (who !== undefined) C.toast(tr(PULLED, N().nameOf(who)));
        pullCd = 2;
    }
    function inArena(a, p) { return p.z < a.entryZ - 1 && p.z > a.exitZ + 1 && Math.abs(p.x) < a.half && Math.abs(p.y - a.h) < 5; }
    function onArena(i, state) {
        if (host()) N().broadcast({ t: 'ar', i, s: state });
        if (state !== 'wave1' || !on() || C.player.dead) return;
        const a = C.layout.arenas[i], p = C.player.mesh.position;
        if (a && !inArena(a, p)) pullTo((Math.random() - 0.5) * 6, a.h, a.entryZ - 7);
    }
    function bossStarted() {
        if (!on()) return;
        if (host()) N().broadcast({ t: 'bs' });
        const L = C.layout, p = C.player.mesh.position;
        if (!C.player.dead && !(p.z < L.bossEntryZ - 1 && p.y > L.bossY - 1)) pullTo((Math.random() - 0.5) * 8, L.bossY, L.bossEntryZ - 9);
    }
    function sendArenas(to) { const a = C.layout.arenas.map(x => ARENA.indexOf(x.state)).join(''); N().sendTo(to, { t: 'A', a }); }

    // ---------- falling in co-op ----------
    let reviveT = 0, overSent = false;
    function died() {
        if (!on() || where() !== 'm') return false;
        N().send({ t: 'down' });
        const alive = [...mates.values()].some(m => m.st && m.st.w === 'm' && !(m.st.f & 4) && performance.now() - m.rx < 5000);
        if (!alive) {
            if (host()) { overSent = true; N().broadcast({ t: 'over' }); return false; }
            const H = mates.get(0);                                         // the host calls it for the team (when it is on the mission)
            return !!(H && H.st && H.st.w === 'm' && performance.now() - H.rx < 5000);
        }
        reviveT = 5; C.toast(tr(REVIVE));
        return true;
    }
    function revive() {
        const P = C.player;
        let best = null;
        mates.forEach((m, slot) => { if (!best && m.st && m.st.w === 'm' && !(m.st.f & 4)) best = { m, slot }; });
        if (!best) return;
        const s = best.m.st.p;
        P.dead = false; P.hp = Math.round(P.maxHp * 0.5); P.invincibleTimer = 2.5; P.mesh.visible = true;
        pullTo(s[0] + (Math.random() - 0.5) * 3, s[1], s[2] + 2, best.slot);
    }

    // ---------- per-enemy tick (game.js main loop) ----------
    // single player: as before · host: the enemy hunts the nearest living hero · guest: puppet of the host
    function tickEnemy(e, dt, time, d2) {
        const P = C.player;
        if (guest()) { if (e.type === 'boss') puppetBoss(e, dt, time); else puppet(e, dt, time); return; }
        if (!host()) { if (d2 < 6400 || e.type === 'boss') e.update(dt, P, time); return; }
        const T = team(P);
        let tgt = P.dead ? null : P, best = P.dead ? Infinity : d2;
        for (let i = 1; i < T.length; i++) { const q = T[i].mesh.position, ep = e.mesh.position, d = (q.x - ep.x) ** 2 + (q.z - ep.z) ** 2; if (d < best) { best = d; tgt = T[i]; } }
        if (!tgt) return;
        if (best < 6400 || e.type === 'boss') e.update(dt, tgt, time);
    }
    function puppet(e, dt, time) {
        const t = e._t; if (!t || e.isDead) return;
        const P = e.mesh.position, k = 1 - Math.exp(-14 * dt), ox = P.x, oz = P.z;
        const ahead = t.at ? Math.min(0.15, (performance.now() - t.at) / 1000) + 0.06 : 0, tx = t.x + (t.vx || 0) * ahead, tz = t.z + (t.vz || 0) * ahead;
        if (Math.abs(tx - P.x) + Math.abs(tz - P.z) > 12) P.set(tx, t.y, tz);
        P.x += (tx - P.x) * k; P.y += (t.y - P.y) * k; P.z += (tz - P.z) * k;
        let dy = t.r - e.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.mesh.rotation.y += dy * k;
        const sp = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-3), f = e._f || 0, alert = f & 1;
        if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) e.mats.forEach(m => { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; }); }
        if ((f & 4) && !(e.flash > 0)) e.glow(0.12);
        if (e.mark) e.mark.visible = !!(f & 3);
        if (e.type === 'drone') { if (e.ring) e.ring.rotation.z += (alert ? 7 : 3) * dt; return; }
        const moving = sp > 0.6, fast = sp > 4.5, base = e.type === 'heavy' ? 1.5 : 1.2;
        if (!e.armL || !e.legL) return;
        if (moving) {
            const s = Math.sin(time * (e.type === 'heavy' ? (fast ? 5 : 3) : (fast ? 20 : 9))), a = e.type === 'heavy' ? 0.5 : (fast ? 0.6 : 0.3);
            if (e.type === 'runner') e.core.rotation.x = fast ? 0.3 : 0.08;
            e.armL.position.z = s * a; e.armR.position.z = -s * a; e.legL.position.z = -s * a; e.legR.position.z = s * a;
            e.core.position.y = base + Math.abs(s) * (e.type === 'heavy' ? 0.1 : fast ? 0.2 : 0.08);
        } else {
            e.core.rotation.x = 0; e.armL.position.z = e.armR.position.z = e.legL.position.z = e.legR.position.z = 0;
            e.core.position.y = base + Math.sin(time * 5) * 0.05;
        }
    }
    function puppetBoss(B, dt, time) {
        if (B.isDead) return;
        if (B.flash > 0) { B.flash -= dt; if (B.flash <= 0) B.mats.forEach(m => { if (m.emissive) { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; } }); }
        B.glowMat.emissiveIntensity = 2 + Math.sin(time * (B.phase === 2 ? 12 : 5)) * 0.8;
        B.core.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
        B.updateShocks(dt, C.player);
        const t = B._t; if (!t) return;
        const P = B.mesh.position, k = 1 - Math.exp(-12 * dt), ox = P.x, oz = P.z;
        P.x += (t.x - P.x) * k; P.y += (t.y - P.y) * k; P.z += (t.z - P.z) * k;
        let dy = t.r - B.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); B.mesh.rotation.y += dy * k;
        B.root.position.y += (t.ry - B.root.position.y) * Math.min(1, dt * 20); B.root.position.x = t.rx;
        const sp = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-3), walk = sp > 0.8 && sp < 12 ? Math.sin(time * 6) : 0;
        B.legs[0].rotation.x = walk * 0.35; B.legs[1].rotation.x = -walk * 0.35;
        const w = B._warn;
        if (w) { B.warn.material.opacity = w[0]; if (w[0] > 0) { B.warn.position.set(w[1], P.y + 0.06, w[2]); B.warn.scale.setScalar(w[3]); } }
    }

    // ---------- host snapshot ----------
    function sendSnapshot() {
        const E = [];
        for (const e of C.api.enemies) {
            if (e.type === 'boss' || e.isDead || e.dormant) continue;
            const p = e.mesh.position, f = (e.mode === 'alert' ? 1 : 0) | (e.mode === 'search' ? 2 : 0) | (e.flash > 0.15 ? 4 : 0);
            E.push(e.nid, r2(p.x), r2(p.y), r2(p.z), r2(e.mesh.rotation.y), Math.round(e.hp), f);
        }
        const B = C.boss, bp = B.mesh.position;
        const b = [r2(bp.x), r2(bp.y), r2(bp.z), r2(B.mesh.rotation.y), Math.round(B.hp), B.phase, r2(B.root.position.y), r2(B.root.position.x),
            r2(B.warn.material.opacity), r2(B.warn.position.x), r2(B.warn.position.z), r2(B.warn.scale.x), B.active ? 1 : 0];
        N().broadcast({ t: 'S', e: E, b, a: C.layout.arenas.map(x => ARENA.indexOf(x.state)).join('') });
    }

    // ---------- team bar ----------
    let teamEl = null;
    function drawTeam() {
        if (!on()) { if (teamEl) teamEl.hidden = true; return; }
        if (!teamEl) {
            const st = document.createElement('style');
            st.textContent = `#mp-team{position:absolute;z-index:6;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 58px);transform:translateX(-50%);display:flex;gap:6px;pointer-events:none;font-family:var(--font)}
              #mp-team .tm{display:grid;gap:3px;min-width:74px;padding:4px 8px;background:var(--panel);border-bottom:2px solid var(--c)}
              #mp-team b{font-size:11px;letter-spacing:.06em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:96px}
              #mp-team i{display:block;height:4px;background:rgba(255,255,255,.12)} #mp-team i u{display:block;height:100%;background:var(--c);transform-origin:left}
              #mp-team .tm.down{opacity:.45} #mp-team .tm.away{opacity:.3}
              #stage.in-menu #mp-team{display:none} #stage.is-portrait #mp-team{top:calc(max(10px,env(safe-area-inset-top)) + 150px)}`;
            document.head.appendChild(st);
            teamEl = document.createElement('div'); teamEl.id = 'mp-team'; C.stage.appendChild(teamEl);
        }
        teamEl.hidden = false;
        const col = s => '#' + (N().COLORS[s] || 0xffffff).toString(16).padStart(6, '0');
        teamEl.innerHTML = [...mates.entries()].sort((a, b) => a[0] - b[0]).map(([slot, m]) => {
            const st = m.st, hp = st ? Math.max(0, st.hp) / (st.mh || 100) : 0, away = !st || st.w !== where();
            const nm = String(N().nameOf(slot)).replace(/[<>&"]/g, '');
            return `<div class="tm${st && (st.f & 4) ? ' down' : ''}${away ? ' away' : ''}" style="--c:${col(slot)}"><b>${nm}</b><i><u style="transform:scaleX(${hp.toFixed(3)})"></u></i></div>`;
        }).join('');
    }

    // ---------- every frame (game.js main loop) ----------
    let teamT = 0, followT = 0, lastW = 'x';
    const _pv = new THREE.Vector3(), SPOT = [[0, 0], [1.8, 0.7], [-1.8, 0.7], [0, 2.0]];
    function tick(dt, time) {
        if (!C || !on()) return;
        while (pending.length) { const [m, f] = pending.shift(); onMsg(m, f); }
        const W = where(), P = C.player;
        // send my state ~15×/s; the host also sends the enemies ~12×/s
        if ((sendT -= dt) <= 0) { sendT = 1 / 15; const s = myState(); if (host()) N().broadcast(Object.assign({ id: 0 }, s)); else N().send(s); }
        if (host() && W === 'm' && (snapT -= dt) <= 0) { snapT = 1 / 12; sendSnapshot(); }
        if ((lookT -= dt) <= 0) { lookT = 1; const k = JSON.stringify([P.bodyType, P.skin, P.look]); if (k !== lastLook) { if (lastLook) N().lookChanged(); lastLook = k; } }
        // teammates
        const now = performance.now();
        mates.forEach((m, slot) => {
            const st = m.st;
            if (!st) return;
            if (!m.A) { m.A = makeAvatar(slot, m.look || N().lookOf(slot)); m.A.mesh.position.set(st.p[0], st.p[1], st.p[2]); }
            const A = m.A, age = Math.min(0.25, (now - m.rx) / 1000), fresh = now - m.rx < 4000;
            const show = fresh && st.w === W && W !== 'x' && !(st.f & 4);
            A.mesh.visible = show; if (A.trail) A.trail.mesh.visible = show && A.trail.mesh.visible;
            if (m.proxy) { m.proxy.mesh.position.set(st.p[0], st.p[1], st.p[2]); m.proxy.dead = !!(st.f & 4); m.proxy.isGrounded = !!(st.f & 1); m.proxy.isDashing = !!(st.f & 2); }
            if (!show) return;
            const tx = st.p[0] + st.v[0] * age, ty = st.p[1] + (st.f & 1 ? 0 : st.v[1] * age), tz = st.p[2] + st.v[2] * age, p = A.mesh.position;
            if (Math.abs(tx - p.x) + Math.abs(ty - p.y) + Math.abs(tz - p.z) > 6) p.set(tx, ty, tz);
            const k = 1 - Math.exp(-16 * dt); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.z += (tz - p.z) * k;
            let dy = st.r - A.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); A.mesh.rotation.y += dy * Math.min(1, dt * 18);
            A.velocity.set(st.v[0], st.v[1], st.v[2]);
            A.isGrounded = !!(st.f & 1); A.isDashing = !!(st.f & 2); A.wallPush = !!(st.f & 8); A.jumpCount = st.j;
            A.aimPitch = st.ap; A.charge = st.ch; A.wallN.set(st.wn[0], 0, st.wn[1]);
            if (m.fresh) {                                              // a new packet: take its timers as they are
                m.fresh = false;
                if (st.k >= 0 && st.st > 0 && (st.st > A.slashTimer + 0.04 || A.slashKind !== KINDS[st.k])) { A.slashKind = KINDS[st.k]; A.slashDur = st.sd; A.slashTimer = st.st; }
                A.aimTimer = st.ai; A.wallSlide = st.ws; A.flipT = st.fl; A.rollT = st.ro; A.wallJumpT = st.wj; A.skidT = st.sk; A.hurtTimer = st.hu;
                if (st.la > A.landT + 0.02) A.landT = st.la;
                if (st.ld) { const L = A.ledge || (A.ledge = { from: {} }); L.phase = st.ld[0] ? 'up' : 'hang'; L.t = st.ld[1]; L.dur = st.ld[2]; L.top = st.ld[3]; L.from.y = st.ld[4]; } else A.ledge = null;
            } else {                                                    // between packets they keep running here, so nothing stutters
                for (const k2 of ['slashTimer', 'aimTimer', 'wallSlide', 'flipT', 'rollT', 'wallJumpT', 'skidT', 'hurtTimer']) if (A[k2] > 0) A[k2] = Math.max(0, A[k2] - dt);
                if (A.ledge) A.ledge.t += dt;
            }
            const hv = Math.hypot(st.v[0], st.v[2]);
            if (hv > 0.5) { const ry = A.mesh.rotation.y, vx = st.v[0] / hv, vz = st.v[2] / hv; A.localF += (vx * Math.sin(ry) + vz * Math.cos(ry) - A.localF) * k; A.localS += (vx * Math.cos(ry) - vz * Math.sin(ry) - A.localS) * k; }
            try { window.AxonHero.animate(A, dt, time, hv > 2); } catch (err) { }
        });
        // heroes are solid to each other: mine is pushed out of any teammate it overlaps (every device does the
        // same for its own hero, so both step apart). Two heroes on the very same spot part in fixed directions.
        if (!P.dead && W !== 'x') mates.forEach(m => {
            const A = m.A; if (!A || !A.mesh.visible) return;
            const q = A.mesh.position, p = P.mesh.position; if (Math.abs(p.y - q.y) > 1.9) return;
            let dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); const R = 1.05; if (d >= R) return;
            if (d < 0.03) { const a = N().slot * 2.4 + 0.6; dx = Math.cos(a); dz = Math.sin(a); d = 1; }
            const push = Math.min(R - (d < 1 ? d : 0), 0.7) * 11; _pv.set(dx / d * push, 0, dz / d * push);
            try { C.api.moveBody(p, _pv, dt, (P.body && P.body.r) || 0.5, 0, (P.body && P.body.h) || 2.6, 0.45, false); } catch (e) { }
        });
        // arriving somewhere together (the HQ, a mission, a restart): each slot steps to its own place
        if (W !== lastW) { lastW = W; if (W !== 'x' && N().slot > 0 && !P.dead) { const o = SPOT[N().slot % 4], p = P.mesh.position; p.x += o[0]; p.z += o[1]; if (C.api.freeSpot) C.api.freeSpot(p); if (P.lastSafePos) P.lastSafePos.copy(p); } }
        if ((teamT -= dt) <= 0) { teamT = 0.25; drawTeam(); }
        // revive / team over
        if (reviveT > 0 && (reviveT -= dt) <= 0) { if (P.dead && W === 'm') revive(); }
        if (P.dead && W === 'm') {                                       // watch a teammate while down: the camera follows them
            let s = null; mates.forEach(m => { if (!s && m.st && m.st.w === 'm' && !(m.st.f & 4)) s = m.st.p; });
            if (s) { const p = P.mesh.position, kk = Math.min(1, dt * 4); p.x += (s[0] - p.x) * kk; p.y += (s[1] - p.y) * kk; p.z += (s[2] - p.z) * kk; }
        }
        if (host() && W === 'm' && C.getState() === 'play' && P.dead) {
            const anyAlive = [...mates.values()].some(m => m.st && m.st.w === 'm' && !(m.st.f & 4) && now - m.rx < 5000);
            if (!anyAlive && !overSent) { overSent = true; N().broadcast({ t: 'over' }); C.endGame('over'); }
        }
        // whoever reaches a new stage pulls the team along
        if (pullCd > 0) pullCd -= dt;
        if (W === 'm' && C.getState() === 'play' && !P.dead && (followT -= dt) <= 0 && pullCd <= 0) {
            followT = 0.5;
            const mine = myStage(); let lead = null;
            mates.forEach((m, slot) => { const st = m.st; if (st && st.w === 'm' && !(st.f & 4) && now - m.rx < 3000 && st.sg > mine && (!lead || st.sg > lead.st.sg)) lead = { st, slot }; });
            if (lead && lead.st.f & 1) pullTo(lead.st.p[0] + (Math.random() - 0.5) * 3, lead.st.p[1], lead.st.p[2] + 2.5, lead.slot);
        }
    }

    // ---------- start-up (game.js, once the world exists) ----------
    function init(ctx) {
        C = ctx; building = false;
        window.__axonPlayer = ctx.player; window.__axonAudio = ctx.api.AudioSys;
        ctx.api.localPlayer = ctx.player;
        ctx.boss.nid = -1;
        ctx.api.onArena = onArena;
        if (!on()) return;
        if (guest()) asPuppet(ctx.boss); else asHosted(ctx.boss);
        if (host()) {
            const shots = ctx.api.enemyShots, push = shots.push;
            shots.push = function (...a) {
                a.forEach(s => { const p = s.mesh.position; N().broadcast({ t: 'es', p: r3(p), d: r3(s.dir), g: s.dmg, l: r2(s.life), s: r2(s.mesh.scale.x) }); });
                return push.apply(this, a);
            };
            const add = ctx.boss.addShock.bind(ctx.boss);
            ctx.boss.addShock = (p, max) => { N().broadcast({ t: 'sk', p: r3(p), m: max }); add(p, max); };
        }
        rosterSync(); drawTeam();
    }
    N() && N().onMsg(onMsg);

    return {
        seeded, wrapEnemy, reward, init, tick, tickEnemy, team, fx, died, deployed, goto, block, bossStarted, where,
        // teammates standing in my world right now (their avatars): doors and gates open for them too
        heroes() { const out = []; if (C && on()) mates.forEach(m => { if (m.A && m.A.mesh.visible) out.push(m.A.mesh.position); }); return out; },
        nearAny(x, z, r2) { if (!C || !on()) return false; let hit = false; mates.forEach(m => { if (!hit && m.A && m.A.mesh.visible) { const q = m.A.mesh.position; hit = (q.x - x) ** 2 + (q.z - z) ** 2 < r2; } }); return hit; },
        get on() { return on(); },
        get guest() { return guest(); },
        // pause / shop / tips don't stop a shared world: it keeps running (the hero just stands still)
        bg: (state, resumeTo) => on() && (state === 'pause' || state === 'shop' || state === 'tips') && resumeTo === 'play',
        toast: s => { if (C) C.toast(s); },
        openLobby: () => N() && N().openLobby()
    };
})();

