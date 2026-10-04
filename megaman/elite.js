// =====================================================================
//  AXON BREACH — ELITE MACHINES + DIFFICULTY (elite.js)
//  The hero got a lot of new tools; the machines get two tricks, so that the tools are needed and not just there:
//   BULWARK   some heavies carry an energy shield on their front. Ordinary shots and cuts from the front barely
//             scratch them — get behind them, charge the buster, land the finishing cut, or use the room:
//             a volatile crystal, the vortex, the chandelier, the launcher all go straight through.
//   VOLATILE  some runners carry an unstable core: when one dies it explodes — on the hero if he is close,
//             and on the machines around it. Kill it in the middle of its friends.
//  DIFFICULTY (the ⚔ button in the HQ): EASY — the hero takes 40 % less damage · NORMAL · HARD — 50 % more.
//  level.js calls AxonElite.tick every frame of the mission. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonElite = (function () {
    const T = {
        en: { easy: 'EASY', normal: 'NORMAL', hard: 'HARD', shield: 'SHIELDED — hit it from behind, with a charged shot, or with the room', vol: 'VOLATILE — it explodes when it dies' },
        ar: { easy: 'سهل', normal: 'عادي', hard: 'صعب', shield: 'مدرّع — اضربه من الخلف، بطلقة مشحونة، أو بأدوات الغرفة', vol: 'متفجر — بينفجر لما يموت' },
        es: { easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', shield: 'CON ESCUDO — golpéalo por detrás, con disparo cargado o con la sala', vol: 'VOLÁTIL — explota al morir' },
        zh: { easy: '简单', normal: '普通', hard: '困难', shield: '有护盾 — 从背后、蓄力射击或用机关打它', vol: '不稳定 — 死亡时爆炸' },
        ja: { easy: 'イージー', normal: 'ノーマル', hard: 'ハード', shield: 'シールド持ち — 背後から、チャージショット、または部屋の仕掛けで', vol: '不安定 — 倒すと爆発する' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const guest = () => window.AxonCoop && window.AxonCoop.on && window.AxonCoop.guest;
    const stage = () => document.getElementById('stage');
    const MUL = { easy: 0.6, normal: 1, hard: 1.5 }, ORDER = ['easy', 'normal', 'hard'];
    let diff = 'normal'; try { const d = localStorage.getItem('axon.diff'); if (MUL[d]) diff = d; } catch (e) { }
    let built = null, API = null, P = null, told = {}, elites = [], btn = null, cullT = 0;
    const _v = new THREE.Vector3();
    const hint = k => { if (told[k] || !API) return; told[k] = 1; API.toast(T[lang()][k]); };

    // ---------- difficulty ----------
    function label() { if (btn) btn.innerHTML = `<i>⚔</i><span>${T[lang()][diff]}</span>`; }
    function dom() {
        if (btn || !stage()) return;
        const st = document.createElement('style');
        st.textContent = `#el-btn{display:none;align-items:center;gap:6px;padding:7px 12px;margin-top:2px;border:1px solid rgba(255,255,255,.25);background:rgba(8,14,24,.8);color:#fff;font:800 11px/1 var(--font,system-ui);letter-spacing:.14em;cursor:pointer;pointer-events:auto;touch-action:manipulation;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
          #el-btn i{font-style:normal;color:#ff7a2a;font-size:13px} #el-btn[data-d=easy] i{color:#5cf0a0} #el-btn[data-d=hard] i{color:#ff2a55}
          #stage.in-hub:not(.in-menu):not(.modal-on) #el-btn{display:inline-flex}`;
        document.head.appendChild(st);
        btn = document.createElement('button'); btn.id = 'el-btn'; btn.type = 'button'; btn.dataset.d = diff; (document.querySelector('#hud .hud-right') || stage()).appendChild(btn);
        btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); diff = ORDER[(ORDER.indexOf(diff) + 1) % 3]; btn.dataset.d = diff; try { localStorage.setItem('axon.diff', diff); } catch (err) { } label(); sfx(a => a.tone('square', diff === 'hard' ? 330 : diff === 'easy' ? 660 : 495, 495, 0.08, 0.06)); });
        label();
    }
    function arm(player) {                                                       // the hero's armour answers to the chosen difficulty
        if (player.__diff) return; player.__diff = true;
        const take = player.takeDamage;
        player.takeDamage = function (n, force) { return take.call(this, n >= 9999 ? n : Math.max(1, Math.round(n * MUL[diff])), force); };
    }

    // ---------- the elites ----------
    const plate = new THREE.CircleGeometry(1.5, 6), orb = new THREE.IcosahedronGeometry(0.34, 0);
    function bulwark(e) {
        const m = new THREE.Mesh(plate, new THREE.MeshBasicMaterial({ color: 0x39d7ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        m.position.set(0, 2.3, 1.75); e.mesh.add(m);
        const rim = new THREE.Mesh(new THREE.RingGeometry(1.38, 1.5, 6), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.add(rim);
        const take = e.takeDamage; let flash = 0;
        e.takeDamage = function (amt, at, crit) {
            if (!guest() && !crit && at && !e.isDead) {
                const q = e.mesh.position, dx = at.x - q.x, dz = at.z - q.z, d = Math.hypot(dx, dz), ry = e.mesh.rotation.y;
                if (d > 0.7 && (dx * Math.sin(ry) + dz * Math.cos(ry)) / d > 0.2) {             // it came from the front, on the shield
                    amt = Math.max(1, Math.round(amt * 0.15)); flash = 0.25; hint('shield');
                    if (API) API.spawnSparks(_v.set(q.x + Math.sin(ry) * 1.7, q.y + 2.3, q.z + Math.cos(ry) * 1.7), 0xbff4ff, 6, 9);
                    sfx(a => { a.tone('triangle', 1900, 1300, 0.07, 0.07); a.noise(0.04, 0.05, { type: 'highpass', f0: 3500 }); });
                }
            }
            return take.call(this, amt, at, crit);
        };
        elites.push({ e, kind: 'b', tick(dt, t) { flash = Math.max(0, flash - dt); m.material.opacity = 0.22 + 0.08 * Math.sin(t * 3) + flash * 2.4; m.rotation.z = t * 0.4; } });
    }
    function volatile(e) {
        const m = new THREE.Mesh(orb, new THREE.MeshBasicMaterial({ color: 0xff5a2a })); m.position.set(0, 2.05, -0.42); e.mesh.add(m);
        const halo = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 18), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.add(halo);
        const die = e.die;
        e.die = function () {
            const at = e.mesh.position.clone().setY(e.mesh.position.y + 1.2), r = die.apply(this, arguments);
            if (!API) return r;
            API.spawnFlash(at.clone(), 0xff7a2a, 5, 0.28); API.spawnShockwave(at.clone().setY(at.y - 1), 0xff5a2a, 8); API.spawnSparks(at.clone(), 0xffc24a, 30, 18); API.shake(0.5);
            sfx(a => { a.noise(0.5, 0.22, { type: 'lowpass', f0: 1300, f1: 70 }); a.tone('sine', 170, 38, 0.45, 0.2); });
            if (P && !P.dead && P.mesh.position.distanceTo(at) < 4.6) P.takeDamage(12);
            if (!guest()) for (const o of API.enemies.slice()) { if (o === e || o.isDead || o.dormant) continue; if (o.mesh.position.distanceTo(at) < 5.5) { try { o.takeDamage(o.type === 'boss' ? 20 : 70, o.mesh.position.clone(), true); } catch (err) { } } }
            return r;
        };
        elites.push({ e, kind: 'v', tick(dt, t) { const k = 1 + 0.25 * Math.sin(t * 9); m.scale.setScalar(k); halo.rotation.z = t * 2; } });
    }
    function build(api, layout) {
        built = layout; elites = []; told = {};
        const all = new Set(api.enemies); layout.arenas.forEach(a => { a.wave1.forEach(e => all.add(e)); a.wave2.forEach(e => all.add(e)); });
        // the same machines on every device of a co-op room: sorted by where they stand, picked by count
        const list = [...all].filter(e => e && e.mesh && !e.isDead && (e.type === 'heavy' || e.type === 'runner')).sort((a, b) => (b.home ? b.home.z : b.mesh.position.z) - (a.home ? a.home.z : a.mesh.position.z) || (a.home ? a.home.x : 0) - (b.home ? b.home.x : 0));
        let h = 0, r = 0;
        for (const e of list) {
            if (e.type === 'heavy') { if ((e.lvl || 0) >= 2 && h++ % 3 === 1) bulwark(e); }
            else if ((e.lvl || 0) >= 1 && r++ % 3 === 2) volatile(e);
        }
    }

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; P = player; arm(player);
        if (built !== layout) build(api, layout);
        const t = performance.now() / 1000, p = player.mesh.position;
        for (const x of elites) {
            if (x.e.isDead || !x.e.mesh.visible) continue;
            x.tick(dt, t);
            if (x.kind === 'v' && x.e.mesh.position.distanceToSquared(p) < 196) hint('vol');
        }
    }
    setInterval(dom, 1500);
    return { tick, get diff() { return diff; }, get elites() { return elites; }, MUL };
})();
