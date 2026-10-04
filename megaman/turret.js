// =====================================================================
//  AXON BREACH — MOUNTED GUNS (turret.js)
//  A gun on a swivel stands at the mouth of every arena of mission 01. Walk up, press the button (or E)
//  and the hero takes the grips:
//   REPEATER   a three-barrel machine gun: a stream of rounds, it overheats if the trigger is never let go
//   LAUNCHER   lobs crystal grenades that burst over a wide circle; six in the drum, then it reloads
//  The gun turns where the camera looks and locks onto the nearest machine in front of it. Fire with BUSTER or
//  SABER (K / J). JUMP, DASH or the button again steps off. On the gun the hero takes half damage and cannot
//  walk. The arenas alternate between the two kinds.
//  level.js calls AxonTurret.tick every frame of the mission. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonTurret = (function () {
    const T = {
        en: { on: 'MAN THE GUN', off: 'STEP OFF', mg: 'REPEATER', gl: 'LAUNCHER', heat: 'HEAT', hot: 'OVERHEATED', drum: 'DRUM', load: 'RELOADING', how: 'BUSTER / SABER to fire · JUMP to step off' },
        ar: { on: 'اركب الرشاش', off: 'انزل', mg: 'الرشاش', gl: 'قاذف القنابل', heat: 'الحرارة', hot: 'سخن زيادة', drum: 'المخزن', load: 'إعادة تعبئة', how: 'BUSTER أو SABER للإطلاق · JUMP للنزول' },
        es: { on: 'TOMA EL ARMA', off: 'BAJAR', mg: 'REPETIDORA', gl: 'LANZADOR', heat: 'CALOR', hot: 'SOBRECALENTADA', drum: 'TAMBOR', load: 'RECARGANDO', how: 'BUSTER / SABER para disparar · JUMP para bajar' },
        zh: { on: '操控机枪', off: '离开', mg: '连发机枪', gl: '榴弹发射器', heat: '热量', hot: '过热', drum: '弹鼓', load: '装填中', how: 'BUSTER / SABER 开火 · JUMP 离开' },
        ja: { on: '銃座につく', off: '降りる', mg: 'リピーター', gl: 'ランチャー', heat: 'ヒート', hot: 'オーバーヒート', drum: 'ドラム', load: 'リロード中', how: 'BUSTER / SABER で射撃 · JUMP で降りる' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const tx = k => T[lang()][k];
    const stage = () => document.getElementById('stage');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
    const guns = [], shells = [], tracers = [];
    let built = null, API = null, P = null, near = null, cur = null, go = null, hud = null, cullT = 0, undo = null, jumpWas = false;
    const keys = new Set();
    window.addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'KeyE' && !e.repeat) toggle(); }, true);
    window.addEventListener('keyup', e => keys.delete(e.code), true);
    const held = a => !!document.querySelector(`[data-action="${a}"].on`);
    const firing = () => keys.has('KeyK') || keys.has('KeyJ') || held('Shoot') || held('Attack');
    const leaving = () => keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || held('Jump') || held('Dash');

    // ---------- the gun ----------
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a531, metalness: 0.95, roughness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d25, metalness: 0.85, roughness: 0.38 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a94a6, metalness: 0.9, roughness: 0.3 });
    const add = (par, geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; par.add(m); return m; };
    const tidy = (g, live) => { try { window.AxonPerf.mergeStatic(g, m => live.includes(m)); } catch (e) { } };
    function tag(ch, col) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        g.fillStyle = 'rgba(6,8,12,.85)'; g.beginPath(); g.moveTo(64, 6); g.lineTo(122, 64); g.lineTo(64, 122); g.lineTo(6, 64); g.closePath(); g.fill(); g.strokeStyle = col; g.lineWidth = 7; g.stroke();
        g.fillStyle = '#fff'; g.font = '700 54px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 68);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(0.9, 0.9, 1); return s;
    }
    const SC = 1.45, GRIP = 1;                 // GRIP: which way the upper arm swings so that the bent elbow lands the hand on the grip
    function make(api, x, y, z, kind) {
        const col = kind === 'mg' ? 0x39d7ff : 0xff7a2a, g = new THREE.Group(); g.position.set(x, y, z);
        // the base bolted to the floor and the post of the swivel
        add(g, new THREE.CylinderGeometry(0.95, 1.15, 0.22, 10), dark, 0, 0.11, 0); add(g, new THREE.CylinderGeometry(0.62, 0.62, 0.1, 10), gold, 0, 0.27, 0);
        add(g, new THREE.CylinderGeometry(0.2, 0.3, 1.0, 8), steel, 0, 0.8, 0);
        const glowM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 32), glowM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
        // the swivel: turns (yaw), and in it the cradle that tilts (pitch). The gun points along −z.
        const yaw = new THREE.Group(); yaw.position.y = 1.32; g.add(yaw);
        add(yaw, new THREE.BoxGeometry(0.9, 0.12, 0.34), gold, 0, 0, 0); for (const s of [-1, 1]) add(yaw, new THREE.BoxGeometry(0.1, 0.5, 0.3), gold, s * 0.42, 0.24, 0);
        const pitch = new THREE.Group(); pitch.position.y = 0.36; yaw.add(pitch);
        add(pitch, new THREE.BoxGeometry(0.5, 0.42, 1.1), dark, 0, 0, 0.1);                                   // the body
        add(pitch, new THREE.BoxGeometry(0.9, 0.7, 0.07), steel, 0, 0.08, -0.36);                             // the gunner's shield …
        add(pitch, new THREE.BoxGeometry(0.34, 0.2, 0.09), dark, 0, 0.16, -0.37);                             // … with its slit
        for (const s of [-1, 1]) add(pitch, new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), steel, s * 0.2, -0.05, 0.78, Math.PI / 2);   // the grips
        add(pitch, new THREE.BoxGeometry(0.3, 0.3, 0.42), gold, kind === 'mg' ? 0.42 : 0, kind === 'mg' ? -0.05 : 0.34, 0.2);                // ammunition box / drum
        const lamp = add(pitch, new THREE.BoxGeometry(0.52, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: col }), 0, 0.235, 0.2);
        const spin = new THREE.Group(); spin.position.z = -0.95; pitch.add(spin);
        if (kind === 'mg') { for (let k = 0; k < 3; k++) { const a = k * 2.094; add(spin, new THREE.CylinderGeometry(0.045, 0.045, 1.5, 6), steel, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0, Math.PI / 2); } add(spin, new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), gold, 0, 0, -0.55, Math.PI / 2); add(spin, new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), gold, 0, 0, 0.3, Math.PI / 2); }
        else { add(spin, new THREE.CylinderGeometry(0.17, 0.2, 1.0, 8), dark, 0, 0, 0.2, Math.PI / 2); add(spin, new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8), gold, 0, 0, -0.3, Math.PI / 2); }
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: kind === 'mg' ? 0xcff6ff : 0xffc27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); flash.position.z = -1.85; pitch.add(flash);
        const icon = tag(kind === 'mg' ? '⁂' : '✹', '#' + col.toString(16).padStart(6, '0')); icon.position.y = 3.1; g.add(icon);
        tidy(g, [ring, yaw, pitch, spin, flash, lamp]); g.scale.setScalar(SC); g.userData.lazy = true; api.scene.add(g);   // sized to the hero (he is 3 m tall): the grips at his chest
        guns.push({ kind, g, yaw, pitch, spin, flash, ring, lamp, icon, col, pos: new THREE.Vector3(x, y, z), ya: Math.PI, pa: 0, heat: 0, hot: false, cd: 0, drum: 6, load: 0, rot: 0, tgt: null, seek: 0 });
    }
    function ground(S, x, z, y0) {
        let best = null;
        for (const b of S) { if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; const t = b.max.y; if (t < y0 - 1 || t > y0 + 4 || t - b.min.y > 12) continue; if (best === null || t < best) best = t; }
        if (best === null) return null;
        for (const b of S) if (x > b.min.x - 1.3 && x < b.max.x + 1.3 && z > b.min.z - 1.3 && z < b.max.z + 1.3 && b.min.y < best + 2.8 && b.max.y > best + 0.2) return null;
        return best;
    }
    function build(api, layout) {
        built = layout;
        layout.arenas.forEach((a, n) => {                                                          // where toys.js plans one (one idea per arena)
            const kind = window.AxonToys && window.AxonToys.plan ? window.AxonToys.plan(n).gun : (n % 2 ? 'gl' : 'mg'); if (!kind) return;
            const s = n % 2 ? -1 : 1;
            for (const [x, dz] of [[s * 4.5, 9], [-s * 4.5, 9], [s * 3, 12], [s * 7.5, 7], [s * a.half * 0.42, 7]]) { const y = ground(api.solids, x, a.entryZ - dz, a.h); if (y !== null) { make(api, x, y, a.entryZ - dz, kind); break; } }
        });
        const L = layout; if (L.bossCenter) { const y = ground(api.solids, -9, L.bossEntryZ - 12, L.bossY); if (y !== null) make(api, -9, y, L.bossEntryZ - 12, 'gl'); }
    }

    // ---------- screen ----------
    function dom() {
        if (go) return;
        const st = document.createElement('style');
        st.textContent = `
          #tr-go{position:absolute;z-index:8;left:29%;top:63%;transform:translate(-50%,-50%);display:none;white-space:nowrap;align-items:center;gap:10px;padding:12px 22px;border:0;cursor:pointer;
            font:800 15px/1 var(--font,system-ui);letter-spacing:.12em;color:#07090d;background:var(--tc,#39d7ff);clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);box-shadow:0 0 24px var(--tc,#39d7ff);pointer-events:auto;touch-action:manipulation}
          #tr-go.on{display:flex} #tr-go.riding{background:rgba(8,14,24,.85);color:#fff;box-shadow:inset 0 0 0 1px var(--tc,#39d7ff);font-size:12px;padding:9px 16px}
          #tr-go kbd{font:800 12px/1 var(--font,system-ui);padding:3px 6px;background:rgba(0,0,0,.25);color:#fff;border-radius:3px} #tr-go[dir=rtl]{letter-spacing:0;font-size:17px} #tr-go.riding[dir=rtl]{font-size:14px}
          #stage.modal-on #tr-go,#stage.comm-on #tr-go,#stage.rd-on #tr-go,#stage.in-hub #tr-go,#stage.in-menu #tr-go,#stage.rd-near #tr-go{display:none!important}
          #stage.is-portrait #tr-go{left:50%;top:60%}
          #tr-hud{position:absolute;z-index:6;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 64px);transform:translateX(-50%);width:min(320px,56%);display:none;pointer-events:none;font-family:var(--font,system-ui)}
          #tr-hud.on{display:block} #stage.modal-on #tr-hud,#stage.in-hub #tr-hud,#stage.in-menu #tr-hud{display:none}
          #tr-hud .k{display:flex;justify-content:space-between;font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--tc);text-shadow:0 0 8px var(--tc)}
          #tr-hud .b{height:8px;margin-top:3px;background:rgba(6,8,12,.75);outline:1px solid color-mix(in srgb,var(--tc) 55%,transparent);transform:skewX(-18deg);overflow:hidden}
          #tr-hud .b i{display:block;height:100%;transform-origin:left;background:var(--tc)} #tr-hud.hot .b i{background:#ff2a55} #tr-hud.hot .k{color:#ff5a7a}
          #tr-hud .h{margin-top:5px;text-align:center;font-size:10.5px;letter-spacing:.06em;color:#cfd8e6;text-shadow:0 1px 3px #000}
          #tr-hud[dir=rtl] .k,#tr-hud[dir=rtl] .h{letter-spacing:0;font-size:12px}`;
        document.head.appendChild(st);
        go = document.createElement('button'); go.id = 'tr-go'; go.type = 'button'; stage().appendChild(go);
        go.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggle(); });
        hud = document.createElement('div'); hud.id = 'tr-hud'; hud.innerHTML = '<div class="k"><span></span><span></span></div><div class="b"><i></i></div><div class="h"></div>'; stage().appendChild(hud);
    }
    function prompt() {
        if (!go) return; const g = cur || near, st = stage().classList;
        if (!g || (P && P.dead)) { go.classList.remove('on'); return; }
        const rtl = lang() === 'ar', hexc = '#' + g.col.toString(16).padStart(6, '0'); go.dir = rtl ? 'rtl' : 'ltr'; go.style.setProperty('--tc', hexc);
        const key = cur ? 'off' : 'on', sig = key + g.kind + lang();
        if (go.dataset.s !== sig) { go.dataset.s = sig; go.innerHTML = `<span>${tx(key)}</span>${cur ? '' : `<small style="opacity:.75;font-weight:700">· ${tx(g.kind)}</small>`}<kbd>E</kbd>`; }
        go.classList.toggle('riding', !!cur); go.classList.add('on');
    }

    // ---------- on and off the gun ----------
    function mount(g) {
        if (cur || !P || P.dead || !g) return; cur = g; jumpWas = true;
        const speed = P.speed, take = P.takeDamage; P.speed = 0;
        P.takeDamage = function (n, force) { return take.call(this, Math.max(1, Math.round(n * 0.5)), force); };          // behind the shield: half damage
        undo = () => { if (P.speed === 0) P.speed = speed; P.takeDamage = take; };
        hud.style.setProperty('--tc', '#' + g.col.toString(16).padStart(6, '0')); hud.dir = lang() === 'ar' ? 'rtl' : 'ltr'; hud.classList.add('on'); hud.querySelector('.h').textContent = tx('how');
        sfx(a => { a.tone('square', 220, 440, 0.08, 0.08); a.noise(0.08, 0.1, { type: 'highpass', f0: 1800 }); a.tone('triangle', 660, 660, 0.06, 0.05, { delay: 0.09 }); });
    }
    function leave(hop) {
        if (!cur) return; const g = cur; cur = null; if (undo) { try { undo(); } catch (e) { } undo = null; }
        hud.classList.remove('on', 'hot'); g.tgt = null;
        if (P && !P.dead && hop) { P.velocity.set(Math.sin(g.ya) * -3, 9, Math.cos(g.ya) * -3); }
        sfx(a => a.tone('square', 440, 220, 0.08, 0.06));
    }
    function toggle() { const st = stage() && stage().classList; if (!st || st.contains('modal-on') || st.contains('comm-on') || st.contains('rd-on')) return; if (cur) leave(true); else if (near) mount(near); }

    // ---------- shooting ----------
    const foes = () => API.enemies;
    function seek(g) {                                   // the machine nearest to where the camera looks, in sight of the muzzle
        const cam = API.camera(); cam.getWorldDirection(_a); const cy = Math.atan2(_a.x, _a.z);
        let best = null, score = 1e9; const m = _b.set(g.pos.x, g.pos.y + 1.7 * SC, g.pos.z);
        for (const e of foes()) {
            if (e.isDead || e.dormant) continue; const q = e.aimPoint ? e.aimPoint(_c) : _c.copy(e.mesh.position), dx = q.x - m.x, dz = q.z - m.z, d = Math.hypot(dx, dz); if (d > 75 || d < 1.5) continue;
            let da = Math.atan2(dx, dz) - cy; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))); if (da > 0.75) continue;
            const s = da * 40 + d * 0.25; if (s >= score) continue;
            try { const t = window.AxonPerf.segHit(API.solids, m, q); if (t >= 0 && t < 0.97) continue; } catch (err) { }
            best = e; score = s;
        }
        g.tgt = best; return cy;
    }
    function hurt(e, dmg, at) { try { e.takeDamage(e.type === 'boss' ? Math.round(dmg * 0.6) : dmg, at.clone(), false); } catch (err) { } }
    function tracer(a, b, col) {
        let t = tracers.find(x => x.life <= 0);
        if (!t) { if (tracers.length >= 14) return; const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); m.userData.lazy = true; API.scene.add(m); t = { m, life: 0 }; tracers.push(t); }
        t.m.material.color.setHex(col); t.m.position.copy(a).add(b).multiplyScalar(0.5); t.m.scale.set(1, 1, a.distanceTo(b)); t.m.lookAt(b); t.m.visible = true; t.life = 0.06;
    }
    function burst(at, r, dmg) {
        API.spawnFlash(_d.copy(at), 0xffb060, r * 0.85, 0.24); API.spawnShockwave(_d.copy(at).setY(at.y - 0.4), 0xff7a2a, r * 1.4); API.spawnSparks(_d.copy(at), 0xffc24a, 26, 17); API.shake(0.4);
        sfx(a => { a.noise(0.45, 0.2, { type: 'lowpass', f0: 1200, f1: 70 }); a.tone('sine', 160, 40, 0.4, 0.18); });
        for (const e of foes().slice()) { if (e.isDead || e.dormant) continue; const d = e.mesh.position.distanceTo(at); if (d < r) hurt(e, Math.round(Math.max(dmg, (e.hp || 0) * 0.7) * (d < r * 0.55 ? 1 : 0.7)), e.mesh.position); }
    }
    function fire(g, dt) {
        const muzzle = g.flash.getWorldPosition(_a), dir = _b.set(0, 0, -1).applyQuaternion(g.pitch.getWorldQuaternion(new THREE.Quaternion())).normalize();
        if (g.kind === 'mg') {
            g.cd = 0.085; g.heat = Math.min(1, g.heat + 0.011); if (g.heat >= 1) { g.hot = true; sfx(a => { a.noise(0.5, 0.12, { type: 'highpass', f0: 2500 }); a.tone('sawtooth', 500, 120, 0.4, 0.08); }); }
            dir.x += (Math.random() - 0.5) * 0.03; dir.y += (Math.random() - 0.5) * 0.025; dir.z += (Math.random() - 0.5) * 0.03; dir.normalize();
            const end = _c.copy(muzzle).addScaledVector(dir, 70); let hit = null, ht = 1;
            try { const t = window.AxonPerf.segHit(API.solids, muzzle, end); if (t >= 0 && t < 1) ht = t; } catch (err) { }
            for (const e of foes()) {                                                             // the first machine the line passes through
                if (e.isDead || e.dormant) continue; const q = e.aimPoint ? e.aimPoint(_d) : _d.copy(e.mesh.position), t = _d.sub(muzzle).dot(dir) / 70; if (t <= 0 || t >= ht) continue;
                const cx = muzzle.x + dir.x * t * 70, cy = muzzle.y + dir.y * t * 70, cz = muzzle.z + dir.z * t * 70, p = e.aimPoint ? e.aimPoint(_d) : _d.copy(e.mesh.position), r = (e.body ? e.body.r : 0.8) + 0.55;
                if ((p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2 < r * r) { ht = t; hit = e; }
            }
            end.copy(muzzle).addScaledVector(dir, 70 * ht); tracer(muzzle, end, 0xbff4ff);
            if (hit) { hurt(hit, 9, end); if (Math.random() < 0.5) API.spawnSparks(end.clone(), 0x9df3ff, 4, 9); } else if (ht < 1 && Math.random() < 0.4) API.spawnSparks(end.clone(), 0xffe6a0, 3, 7);
            sfx(a => { a.noise(0.045, 0.11, { type: 'bandpass', f0: 1500 + Math.random() * 500 }); a.tone('square', 190, 90, 0.04, 0.05); });
        } else {
            g.cd = 0.62; g.drum--; if (g.drum <= 0) { g.load = 2.2; sfx(a => { a.tone('square', 300, 300, 0.05, 0.05, { delay: 0.2 }); a.tone('square', 450, 450, 0.05, 0.05, { delay: 1.9 }); }); }
            const to = g.tgt ? (g.tgt.aimPoint ? g.tgt.aimPoint(_c) : _c.copy(g.tgt.mesh.position)) : _c.copy(muzzle).addScaledVector(dir, 22).setY(g.pos.y + 0.3);
            const d = Math.hypot(to.x - muzzle.x, to.z - muzzle.z), tt = Math.max(0.35, d / 26), G = 30;
            const m = new THREE.Mesh(shellGeo, shellMat); m.position.copy(muzzle); API.scene.add(m);
            shells.push({ m, v: new THREE.Vector3((to.x - muzzle.x) / tt, (to.y - muzzle.y + 0.5 * G * tt * tt) / tt, (to.z - muzzle.z) / tt), t: 0, G });
            sfx(a => { a.tone('sine', 300, 110, 0.14, 0.14); a.noise(0.1, 0.1, { type: 'lowpass', f0: 700 }); });
        }
        g.flash.material.opacity = 1; g.flash.scale.setScalar(0.7 + Math.random() * 0.7); if (API.shake && g.kind === 'gl') API.shake(0.18);
    }
    const shellGeo = new THREE.IcosahedronGeometry(0.2, 0), shellMat = new THREE.MeshBasicMaterial({ color: 0xffb060 });

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; P = player; dom();
        if (built !== layout) build(api, layout);
        const p = player.mesh.position, time = performance.now() / 1000;
        if ((cullT -= dt) <= 0) { cullT = 0.25; for (const g of guns) { const dz = Math.abs(g.pos.z - p.z); g.g.visible = dz < 120; g.icon.visible = dz < 50 && g !== cur; } }
        // which gun is at hand
        let n = null; if (!cur && !player.dead) for (const g of guns) { if (Math.abs(g.pos.z - p.z) < 3.4 && (g.pos.x - p.x) ** 2 + (g.pos.z - p.z) ** 2 < 3.3 * 3.3 && Math.abs(p.y - g.pos.y) < 2) { n = g; break; } }
        if (n !== near || cur) { near = n; }
        prompt();
        // shells in flight
        for (let i = shells.length - 1; i >= 0; i--) {
            const s = shells[i]; s.t += dt; s.v.y -= s.G * dt; _a.copy(s.m.position); s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 9;
            let boom = s.t > 4; if (!boom) { try { const t = window.AxonPerf.segHit(api.solids, _a, s.m.position); if (t >= 0 && t <= 1) { s.m.position.lerpVectors(_a, s.m.position, t); boom = true; } } catch (e) { } }
            if (!boom) for (const e of foes()) if (!e.isDead && !e.dormant && e.mesh.position.distanceToSquared(s.m.position) < 3.2) { boom = true; break; }
            if (boom) { api.scene.remove(s.m); shells.splice(i, 1); burst(s.m.position.clone(), 6, 85); }
            else if (Math.random() < 0.5) api.spawnSparks(s.m.position.clone(), 0xffa040, 1, 2);
        }
        for (const t of tracers) if (t.life > 0 && (t.life -= dt) <= 0) t.m.visible = false;
        for (const g of guns) {
            if (!g.g.visible) continue;
            g.ring.material.opacity = g === cur ? 0.9 : 0.4 + 0.25 * Math.sin(time * 3); g.flash.material.opacity = Math.max(0, g.flash.material.opacity - dt * 14);
            if (g !== cur) { g.heat = Math.max(0, g.heat - dt * 0.3); if (g.heat < 0.3) g.hot = false; if (g.load > 0 && (g.load -= dt) <= 0) g.drum = 6; continue; }
        }
        const g = cur; if (!g) return;
        if (player.dead || (g.pos.x - p.x) ** 2 + (g.pos.z - p.z) ** 2 > 16) { leave(false); return; }
        const lv = leaving(); if (lv && !jumpWas) { leave(false); return; } jumpWas = lv;
        // the gun follows the camera, and locks on what it finds there
        if ((g.seek -= dt) <= 0) { g.seek = 0.12; g.camYaw = seek(g); }
        let wantY = g.camYaw === undefined ? g.ya : g.camYaw, wantP = 0;
        if (g.tgt && !g.tgt.isDead) { const q = g.tgt.aimPoint ? g.tgt.aimPoint(_c) : _c.copy(g.tgt.mesh.position), dx = q.x - g.pos.x, dy = q.y - (g.pos.y + 1.68 * SC), dz = q.z - g.pos.z; wantY = Math.atan2(dx, dz); wantP = Math.atan2(dy, Math.hypot(dx, dz)); }
        let dy = wantY - g.ya; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.ya += dy * Math.min(1, dt * 12); g.pa += (Math.max(-0.5, Math.min(0.7, wantP)) - g.pa) * Math.min(1, dt * 12);
        g.yaw.rotation.y = g.ya + Math.PI; g.pitch.rotation.x = g.pa;                              // the model points along −z
        // the hero holds the grips: behind the gun, facing where it points
        p.set(g.pos.x - Math.sin(g.ya) * 1.25 * SC, g.pos.y, g.pos.z - Math.cos(g.ya) * 1.25 * SC); player.velocity.set(0, 0, 0); player.mesh.rotation.y = g.ya; if (player.lastSafePos) player.lastSafePos.copy(p);
        player.shotCooldown = Math.max(player.shotCooldown || 0, 0.25); player.attackCooldown = Math.max(player.attackCooldown || 0, 0.25); player.charge = 0;
        // both hands on the grips: arms out in front, elbows a little bent, leaning into the gun; they shake with every round
        const kick = g.flash.material.opacity > 0.3 ? (g.kind === 'mg' ? Math.sin(time * 80) * 0.045 : 0.22 * g.flash.material.opacity) : 0, A = player;
        if (A.armL && A.armR && A.chest) {
            if (A.torso) A.torso.rotation.set(0.13 - Math.abs(kick) * 0.6, 0, 0); A.chest.rotation.set(0, 0, 0); if (A.headGroup) A.headGroup.rotation.set(-g.pa * 0.5, 0, 0);
            A.mesh.updateMatrixWorld(true); g.pitch.updateMatrixWorld(true);
            for (const sd of [-1, 1]) {                                                           // each hand goes to its own grip (shoulder + elbow solved for the distance)
                const arm = sd < 0 ? A.armL : A.armR, elb = sd < 0 ? A.elbowL : A.elbowR;
                const v = A.chest.worldToLocal(g.pitch.localToWorld(_a.set(sd * 0.2, -0.05, 0.86 + Math.abs(kick) * 0.5))).sub(arm.position);
                const U = 0.4, F = 0.4, D = Math.min(U + F - 0.01, Math.max(0.2, v.length())); v.normalize();
                const inner = Math.acos(Math.max(-1, Math.min(1, (U * U + F * F - D * D) / (2 * U * F)))), lift = Math.acos(Math.max(-1, Math.min(1, (U * U + D * D - F * F) / (2 * U * D))));
                arm.quaternion.setFromUnitVectors(_b.set(0, -1, 0), v); arm.rotateX(GRIP * lift);
                if (elb) elb.rotation.set(-(Math.PI - inner), 0, 0);
            }
        }
        // trigger
        g.cd -= dt; const trig = firing(); let busy = false;
        if (g.kind === 'mg') { if (!trig || g.hot) { g.heat = Math.max(0, g.heat - dt * (g.hot ? 0.38 : 0.3)); if (g.hot && g.heat < 0.3) g.hot = false; } if (trig && !g.hot) { busy = true; g.rot += dt * 30; if (g.cd <= 0) fire(g, dt); } g.spin.rotation.z = g.rot; }
        else { if (g.load > 0) { if ((g.load -= dt) <= 0) g.drum = 6; } else if (trig && g.cd <= 0) fire(g, dt); }
        // read-out
        const k = hud.querySelectorAll('.k span'), bar = hud.querySelector('.b i');
        if (g.kind === 'mg') { hud.classList.toggle('hot', g.hot); k[0].textContent = tx('mg'); k[1].textContent = g.hot ? tx('hot') : tx('heat') + ' ' + Math.round(g.heat * 100) + '%'; bar.style.transform = `scaleX(${g.heat.toFixed(3)})`; }
        else { hud.classList.toggle('hot', g.load > 0); k[0].textContent = tx('gl'); k[1].textContent = g.load > 0 ? tx('load') : tx('drum') + ' ' + g.drum + ' / 6'; bar.style.transform = `scaleX(${(g.load > 0 ? 1 - g.load / 2.2 : g.drum / 6).toFixed(3)})`; }
    }
    setInterval(() => { const c = stage() && stage().classList; if (c && (c.contains('in-hub') || c.contains('in-menu'))) { if (cur) leave(false); near = null; if (go) go.classList.remove('on'); } }, 700);

    return { tick, get guns() { return guns; }, get cur() { return cur; }, mount, leave, toggle };
})();
