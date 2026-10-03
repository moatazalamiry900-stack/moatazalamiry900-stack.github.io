// =====================================================================
//  AXON BREACH — POWER CRYSTALS (power.js)
//  Caged crystals stand along mission 01. Break one (blade, shot or dash) and it charges the hero:
//   OVERDRIVE  double damage for a while        AEGIS   a shield that eats every hit
//   STORM      rapid fire, energy never ends    NOVA    a blast that hits everything around
//   SURGE      run much faster                  MEND    armour repaired on the spot
//  A timed power shows as a chip with a ring that drains, the hero wears its colour, and it is
//  announced across the screen. Powers end on death and when the mission is left.
//  level.js calls AxonPower.tick every frame of the mission. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonPower = (function () {
    const T = {
        en: { over: 'double damage', aegis: 'shield up', storm: 'rapid fire · endless energy', nova: 'shock blast', surge: 'speed up', mend: 'armour repaired', hint: 'BREAK IT' },
        ar: { over: 'ضرر مضاعف', aegis: 'درع كامل', storm: 'إطلاق سريع · طاقة لا تنتهي', nova: 'انفجار صاعق', surge: 'سرعة أعلى', mend: 'تم إصلاح الدرع', hint: 'اكسرها' },
        es: { over: 'daño doble', aegis: 'escudo activo', storm: 'fuego rápido · energía infinita', nova: 'onda de choque', surge: 'más velocidad', mend: 'armadura reparada', hint: 'RÓMPELO' },
        zh: { over: '双倍伤害', aegis: '护盾开启', storm: '连射 · 能量无限', nova: '冲击爆破', surge: '速度提升', mend: '装甲已修复', hint: '击碎它' },
        ja: { over: 'ダメージ2倍', aegis: 'シールド展開', storm: '連射 · エネルギー無限', nova: '衝撃波', surge: 'スピードアップ', mend: 'アーマー修復', hint: '壊せ' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage');
    const KIND = {
        over: { name: 'OVERDRIVE', col: 0xff3a4a, t: 14, glyph: '⚔' },
        aegis: { name: 'AEGIS', col: 0xb58cff, t: 10, glyph: '⛨' },
        storm: { name: 'STORM', col: 0x39d7ff, t: 14, glyph: '≫' },
        nova: { name: 'NOVA', col: 0xffc24a, t: 0, glyph: '✹' },
        surge: { name: 'SURGE', col: 0x9dff3a, t: 14, glyph: '➤' },
        mend: { name: 'MEND', col: 0x5cf0a0, t: 0, glyph: '✚' }
    };
    const ORDER = ['over', 'aegis', 'storm', 'nova', 'surge', 'mend'];
    const hex = c => '#' + c.toString(16).padStart(6, '0');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };

    let built = null, crates = [], hud = null, ann = null, annT = 0, aura = null, auraMat = null, lastTick = 0, P = null, API = null, puff = 0;
    let chipT = 0;
    const active = {};                       // kind → { t, undo }
    const _v = new THREE.Vector3();

    // ---------- screen: chips + the announcement ----------
    function dom() {
        if (hud) return;
        const st = document.createElement('style');
        st.textContent = `
          #pw-hud{display:flex;flex-direction:row-reverse;flex-wrap:wrap;justify-content:flex-start;gap:8px;max-width:170px;margin-top:2px;pointer-events:none;font-family:var(--font,system-ui)}
          #pw-hud .c{--k:1;position:relative;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px;color:#fff;
            background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--pc) 55%,#000),#07090d 72%);box-shadow:0 0 14px color-mix(in srgb,var(--pc) 70%,transparent);animation:pwIn .35s cubic-bezier(.2,1.6,.3,1) both}
          #pw-hud .c::before{content:"";position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(var(--pc) calc(var(--k)*360deg),rgba(255,255,255,.12) 0);-webkit-mask:radial-gradient(circle,transparent 20px,#000 21px);mask:radial-gradient(circle,transparent 20px,#000 21px)}
          #pw-hud .c.low{animation:pwLow .5s steps(2) infinite}
          #pw-ann{position:absolute;z-index:7;left:50%;top:27%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;font-family:var(--font,system-ui);opacity:0;white-space:nowrap}
          #pw-ann.on{animation:pwAnn 1.9s ease-out both}
          #pw-ann b{display:block;font-size:clamp(30px,7vw,58px);font-weight:900;font-style:italic;letter-spacing:.08em;color:#fff;text-shadow:0 0 22px var(--pc),0 0 4px var(--pc),0 3px 0 rgba(0,0,0,.6)}
          #pw-ann span{display:inline-block;margin-top:2px;padding:3px 14px;font-size:13px;font-weight:700;letter-spacing:.14em;color:#07090d;background:var(--pc);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
          #pw-ann[dir=rtl] b,#pw-ann[dir=rtl] span{letter-spacing:0}
          #stage.in-hub #pw-hud,#stage.in-menu #pw-hud,#stage.modal-on #pw-hud,#stage.winner-on #pw-hud,#stage.in-hub #pw-ann,#stage.in-menu #pw-ann,#stage.modal-on #pw-ann{display:none}
          #pw-hud:empty{display:none} #stage.short #pw-hud .c{width:36px;height:36px;font-size:16px} #stage.short #pw-hud .c::before{-webkit-mask:radial-gradient(circle,transparent 16px,#000 17px);mask:radial-gradient(circle,transparent 16px,#000 17px)}
          @keyframes pwIn{0%{transform:scale(0)}100%{transform:none}}
          @keyframes pwLow{50%{opacity:.35}}
          @keyframes pwAnn{0%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}12%{opacity:1;transform:translate(-50%,-50%) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%) scale(1)}}`;
        document.head.appendChild(st);
        hud = document.createElement('div'); hud.id = 'pw-hud'; ann = document.createElement('div'); ann.id = 'pw-ann';
        (document.querySelector('#hud .hud-right') || stage()).appendChild(hud); stage().appendChild(ann);   // the chips sit right under the hit counter
    }
    function announce(kind) {
        const K = KIND[kind], L = lang();
        ann.dir = L === 'ar' ? 'rtl' : 'ltr'; ann.style.setProperty('--pc', hex(K.col));
        ann.innerHTML = `<b>${K.name}</b><span>${T[L][kind]}</span>`;
        ann.classList.remove('on'); void ann.offsetWidth; ann.classList.add('on');
    }
    function chips() {
        const want = Object.keys(active).join(',');
        if (hud.dataset.k !== want) { hud.dataset.k = want; hud.innerHTML = Object.keys(active).map(k => `<div class="c" data-p="${k}" style="--pc:${hex(KIND[k].col)}">${KIND[k].glyph}</div>`).join(''); }
        for (const el of hud.children) { const a = active[el.dataset.p]; if (!a) continue; el.style.setProperty('--k', Math.max(0, a.t / KIND[el.dataset.p].t).toFixed(3)); el.classList.toggle('low', a.t < 3); }
    }

    // ---------- the powers ----------
    // a number is multiplied for a while. The armory's stats are computed (getters): the getter is wrapped and put back after;
    // a plain field (the hero's speed) is scaled and restored only if nobody rewrote it meanwhile
    function mul(obj, key, f) {
        if (!obj) return () => { };
        const d = Object.getOwnPropertyDescriptor(obj, key);
        if (d && d.get) { if (!d.configurable) return () => { }; Object.defineProperty(obj, key, { configurable: true, enumerable: d.enumerable, get() { return d.get.call(this) * f; } }); return () => Object.defineProperty(obj, key, d); }
        if (typeof obj[key] !== 'number') return () => { };
        const before = obj[key], now = obj[key] = before * f; return () => { if (obj[key] === now) obj[key] = before; };
    }
    function end(kind) { const a = active[kind]; if (!a) return; delete active[kind]; try { a.undo(); } catch (e) { } }
    function endAll() { Object.keys(active).forEach(end); if (hud) chips(); if (aura) aura.visible = false; }
    function grant(kind, at) {
        const K = KIND[kind], S = window.AxonShop && window.AxonShop.stats; if (!K || !P) return;
        dom(); announce(kind);
        const p = P.mesh.position;
        sfx(a => { a.tone('sawtooth', 220, 880, 0.28, 0.1, { lp: 2600 }); a.tone('square', 880, 1320, 0.12, 0.07, { delay: 0.16 }); a.tone('square', 1760, 1760, 0.2, 0.06, { delay: 0.28 }); a.noise(0.25, 0.08, { type: 'highpass', f0: 3000 }); });
        if (API) { API.spawnSparks(_v.copy(p).setY(p.y + 1.4), K.col, 30, 15); API.spawnShockwave(_v.copy(p).setY(p.y + 0.1), K.col, 7); }
        if (kind === 'mend') { P.hp = Math.min(P.maxHp, P.hp + Math.round(P.maxHp * 0.45)); return; }
        if (kind === 'nova') {
            if (API) {
                API.shake(0.7); API.hitStop(0.08); API.spawnShockwave(_v.copy(p).setY(p.y + 0.2), 0xffffff, 16); API.spawnFlash(_v.copy(p).setY(p.y + 1.4), K.col, 9, 0.3);
                for (const e of API.enemies.slice()) { if (e.isDead || e.dormant) continue; const d = e.mesh.position.distanceTo(p); if (d < 18) { try { e.takeDamage(e.type === 'boss' ? 45 : 90, e.mesh.position.clone(), true); } catch (err) { } API.spawnSparks(e.mesh.position.clone().setY(e.mesh.position.y + 1.2), K.col, 10, 10); } }
            }
            sfx(a => { a.noise(0.7, 0.22, { type: 'lowpass', f0: 900, f1: 80 }); a.tone('sine', 160, 40, 0.6, 0.2); });
            return;
        }
        end(kind);                                                              // the same power again: the clock starts over
        let undo = () => { };
        if (kind === 'over') { const a = mul(S, 'meleeMul', 2), b = mul(S, 'shotMul', 2); undo = () => { a(); b(); }; }
        else if (kind === 'storm') { const a = mul(S, 'fireMul', 0.45), b = mul(S, 'regenMul', 6), c = mul(S, 'chargeMul', 0.5); undo = () => { a(); b(); c(); }; }
        else if (kind === 'surge') undo = mul(P, 'speed', 1.4);
        else if (kind === 'aegis') { P.shieldT = Math.max(P.shieldT || 0, K.t); undo = () => { }; }
        active[kind] = { t: K.t, undo };
    }

    // ---------- the crystals in the level ----------
    let iconTex = {};
    function icon(kind) {
        if (iconTex[kind]) return iconTex[kind];
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), K = KIND[kind];
        g.fillStyle = 'rgba(6,8,12,.82)'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
        g.strokeStyle = hex(K.col); g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
        g.fillStyle = '#fff'; g.font = '700 70px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(K.glyph, 64, 68);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return iconTex[kind] = t;
    }
    const gem = new THREE.OctahedronGeometry(0.62, 0), cageG = new THREE.TorusGeometry(0.95, 0.045, 6, 28), baseG = new THREE.CylinderGeometry(0.85, 1.05, 0.22, 8), haloG = new THREE.RingGeometry(1.1, 1.3, 32);
    const goldM = new THREE.MeshStandardMaterial({ color: 0xd9a531, metalness: 0.95, roughness: 0.28 });
    function crate(api, x, y, z, kind) {
        const K = KIND[kind], g = new THREE.Group(); g.position.set(x, y, z);
        const core = new THREE.Mesh(gem, new THREE.MeshStandardMaterial({ color: K.col, emissive: K.col, emissiveIntensity: 1.3, roughness: 0.1, metalness: 0.2, flatShading: true }));
        core.scale.y = 1.55; core.position.y = 1.55; g.add(core);
        const cage = new THREE.Group(); cage.position.y = 1.55; g.add(cage);
        for (const r of [0, Math.PI / 2]) { const t = new THREE.Mesh(cageG, goldM); t.rotation.y = r; cage.add(t); }
        const eq = new THREE.Mesh(cageG, goldM); eq.rotation.x = Math.PI / 2; cage.add(eq);
        const base = new THREE.Mesh(baseG, goldM); base.position.y = 0.11; g.add(base);
        const halo = new THREE.Mesh(haloG, new THREE.MeshBasicMaterial({ color: K.col, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.26; g.add(halo);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: icon(kind), transparent: true, depthWrite: false })); sp.scale.set(0.95, 0.95, 1); sp.position.y = 3.25; g.add(sp);
        try { window.AxonPerf.mergeStatic(cage); } catch (e) { } g.userData.lazy = true; base.updateMatrix(); base.matrixAutoUpdate = false; g.updateMatrix(); g.matrixAutoUpdate = false;   // few meshes, and nothing static recomputes its matrix
        api.scene.add(g);
        crates.push({ g, core, cage, halo, sp, kind, c: new THREE.Vector3(x, y + 1.55, z), t: Math.random() * 6, dead: false });
    }
    // a floor under this point with head room (same test the level's crystals use)
    function ground(S, x, z, y0) {
        let best = null;
        for (const b of S) { if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; const t = b.max.y; if (t < y0 - 1 || t > y0 + 4 || t - b.min.y > 12) continue; if (best === null || t < best) best = t; }
        if (best === null) return null;
        for (const b of S) if (x > b.min.x - 0.9 && x < b.max.x + 0.9 && z > b.min.z - 0.9 && z < b.max.z + 0.9 && b.min.y < best + 3 && b.max.y > best + 0.2) return null;
        return best;
    }
    function build(api, layout) {
        built = layout; crates.forEach(c => api.scene.remove(c.g)); crates = [];
        let n = 0; const S = api.solids;
        const put = (x, z, y0, kind) => { for (const [dx, dz] of [[0, 0], [1.6, 0], [-1.6, 0], [0, -1.6], [0, 1.6], [2.4, -2.4], [-2.4, -2.4]]) { const y = ground(S, x + dx, z + dz, y0); if (y !== null) { crate(api, x + dx, y, z + dz, kind || ORDER[n++ % ORDER.length]); return true; } } return false; };
        for (const z of layout.zones) {
            const side = z.stage % 2 ? 1 : -1;
            if (z.kind === 'corridor') { if (z.stage === layout.stages) { put(-3.5, z.z1 + 6, z.y + 3, 'mend'); put(3.5, z.z1 + 6, z.y + 3, 'over'); } else put(side * 3.2, z.z0 - 4.5, z.y); }
            else if (z.kind === 'arena') put(-side * (z.x1 - 7), (z.z0 + z.z1) / 2 + 9, z.y);
        }
    }
    function smash(api, c) {
        c.dead = true; api.scene.remove(c.g);
        api.spawnSparks(c.c.clone(), KIND[c.kind].col, 34, 17); api.spawnSparks(c.c.clone(), 0xffe6a0, 12, 10); api.spawnFlash(c.c.clone(), KIND[c.kind].col, 4, 0.2);
        api.hitStop(0.05); api.shake(0.3);
        sfx(a => { a.noise(0.18, 0.2, { type: 'highpass', f0: 2400 }); a.tone('triangle', 2400, 900, 0.14, 0.09); a.tone('triangle', 3200, 1500, 0.1, 0.06, { delay: 0.05 }); });
        grant(c.kind);
    }

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; P = player; lastTick = performance.now(); dom();
        if (built !== layout) build(api, layout);
        const p = player.mesh.position;
        for (const c of crates) {
            if (c.dead) continue;
            const d2 = (c.c.x - p.x) ** 2 + (c.c.z - p.z) ** 2;
            c.g.visible = d2 < 120 * 120; if (d2 > 70 * 70) continue;                              // far crystals are switched off (no draw calls, no matrix work)
            c.t += dt; c.core.rotation.y += dt * 1.6; c.core.position.y = 1.55 + Math.sin(c.t * 2.2) * 0.12; c.cage.rotation.y -= dt * 0.7; c.cage.rotation.x = Math.sin(c.t * 0.9) * 0.35;
            c.halo.material.opacity = 0.45 + 0.3 * Math.sin(c.t * 4); c.halo.scale.setScalar(1 + 0.08 * Math.sin(c.t * 4));
            if (d2 > 14 * 14 || player.dead) continue;
            let hit = player.isDashing && d2 < 1.8 * 1.8 && Math.abs(p.y + 1.3 - c.c.y) < 2.6;
            if (!hit && api.hb) for (const h of api.hb) if (h.pos.distanceToSquared(c.c) < 2.5 * 2.5) { hit = true; break; }
            if (!hit && api.pj) for (const s of api.pj) if (s.mesh.position.distanceToSquared(c.c) < 1.5 * 1.5) { hit = true; if (!s.pierce) s.life = 0; break; }
            if (hit) smash(api, c);
        }
        // the powers run down; the hero wears the colour of the newest one
        let top = null;
        for (const k of Object.keys(active)) { const a = active[k]; a.t = k === 'aegis' ? (player.shieldT > 0 ? player.shieldT : 0) : a.t - dt; if (a.t <= 0) { end(k); sfx(s => s.tone('triangle', 660, 330, 0.18, 0.06)); } else top = k; }
        if (player.dead) endAll();
        if ((chipT -= dt) <= 0) { chipT = 0.1; chips(); }                                       // the page is touched 10×/s, not every frame
        if (!aura) { auraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }); aura = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 36), auraMat); aura.rotation.x = -Math.PI / 2; api.scene.add(aura); }
        aura.visible = !!top && !player.dead;
        if (top) {
            const t = performance.now() / 1000; auraMat.color.setHex(KIND[top].col); auraMat.opacity = 0.45 + 0.25 * Math.sin(t * 9);
            aura.position.set(p.x, p.y + 0.08, p.z); aura.scale.setScalar(1 + 0.12 * Math.sin(t * 6)); aura.rotation.z = t * 2;
            if ((puff -= dt) <= 0) { puff = 0.12; api.spawnSparks(_v.set(p.x + (Math.random() - 0.5) * 0.8, p.y + 0.3 + Math.random() * 1.6, p.z + (Math.random() - 0.5) * 0.8), KIND[top].col, 2, 3); }
        }
    }
    // left the mission (HQ, menu, game over): nothing stays switched on
    setInterval(() => { const c = stage() && stage().classList; if (lastTick && c && (c.contains('in-hub') || c.contains('in-menu')) && Object.keys(active).length) endAll(); }, 700);

    return { tick, grant, KIND, drop(api, x, y, z, kind) { crate(api, x, y, z, kind); } };
})();
