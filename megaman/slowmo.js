// =====================================================================
//  AXON BREACH — THE SLOW MOMENT (slowmo.js)
//  All through a fight the world keeps dropping to a quarter speed for a moment, the picture closes in and black bars
//  slide over the top and bottom — then it snaps back.
//   a plain kill   a short beat (0.4 s, thin bars, no caption) — at most one every ~2.5 s
//   named moments  DOUBLE KILL · MULTI KILL ×n · ELITE DOWN · FINISHER (last of a wave) · COMBO ×10/20/… · CLOSE CALL (dash past a shot)
//   the guardian   when it changes phase, and — longest of all — when it falls
//  A named moment cuts into a beat. The game's clock itself is slowed (one line in game.js reads AxonSlowK), so every
//  animation, spark and shot slows together; sound gets a falling and a rising sweep.
//  THE BUTTON under the map (or T): ten seconds of slow world on demand; five kills refill it. Not in co-op.
//  Co-op: the shared world cannot slow down — there only the bars, the zoom and the caption show.
//  level.js calls AxonSlowmo.tick every frame of the mission. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonSlowK = 1;
window.AxonSlowmo = (function () {
    const T = {
        en: { kill: '', dbl: 'DOUBLE KILL', combo: n => `COMBO ×${n}`, elite: 'ELITE DOWN', fin: 'FINISHER', multi: n => `MULTI KILL ×${n}`, dodge: 'CLOSE CALL', phase: 'IT CHANGES', boss: 'GUARDIAN DOWN' },
        ar: { kill: '', dbl: 'قتل مزدوج', combo: n => `كومبو ×${n}`, elite: 'سقطت النخبة', fin: 'الضربة القاضية', multi: n => `قتل متعدد ×${n}`, dodge: 'نجاة بأعجوبة', phase: 'يتحوّل', boss: 'سقط الحارس' },
        es: { kill: '', dbl: 'DOBLE BAJA', combo: n => `COMBO ×${n}`, elite: 'ÉLITE CAÍDA', fin: 'REMATE', multi: n => `MULTI BAJA ×${n}`, dodge: 'POR POCO', phase: 'CAMBIA', boss: 'GUARDIÁN CAÍDO' },
        zh: { kill: '', dbl: '双杀', combo: n => `连击 ×${n}`, elite: '精英倒下', fin: '终结一击', multi: n => `连杀 ×${n}`, dodge: '千钧一发', phase: '形态变化', boss: '守卫倒下' },
        ja: { kill: '', dbl: 'ダブルキル', combo: n => `コンボ ×${n}`, elite: 'エリート撃破', fin: 'フィニッシュ', multi: n => `マルチキル ×${n}`, dodge: '紙一重', phase: 'フェーズ変化', boss: 'ガーディアン撃破' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const coop = () => window.AxonCoop && window.AxonCoop.on;
    const now = () => performance.now() / 1000;
    let el = null, cap = null, S = null, lastEnd = -99, lastTick = 0, hooked = null, API = null, kills = [], bossPhase = 0, bossDead = false, built = null, dodgeCd = 0, comboNode = null, comboSeen = 0, btn = null, M = null, charge = 5, mk = 0, lastReal = 0, posN = 0;
    const NEED = 5, LAST = 10, MK = 0.4;                                          // kills to refill · seconds it lasts · speed of the world

    function dom() {
        if (el || !stage()) return;
        const st = document.createElement('style');
        st.textContent = `
          #slo{position:absolute;inset:0;z-index:4;pointer-events:none;--k:0}
          #slo::before,#slo::after{content:"";position:absolute;left:0;right:0;height:11%;background:#000;transform:scaleY(calc(var(--k) * var(--b,1)));transition:none}
          #slo::before{top:0;transform-origin:top} #slo::after{bottom:0;transform-origin:bottom}
          #slo i{position:absolute;inset:0;opacity:var(--k);background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(4,8,20,.6) 100%);box-shadow:inset 0 0 0 100vmax rgba(60,120,255,.06)}
          #slo b{position:absolute;left:50%;bottom:13%;transform:translateX(-50%) scale(calc(.9 + var(--k) * .1));opacity:var(--k);white-space:nowrap;font:900 italic clamp(15px,3.4vw,26px)/1 var(--font,system-ui);letter-spacing:.3em;color:#fff;text-shadow:0 0 18px var(--sc,#39d7ff),0 0 3px var(--sc,#39d7ff)}
          #slo b[dir=rtl]{letter-spacing:0}
          #slo u,#slo-u{position:absolute;width:46px;height:46px;margin-left:-23px;border-radius:50%;pointer-events:auto;touch-action:none;cursor:pointer;text-decoration:none;display:grid;place-items:center;
            background:conic-gradient(var(--c,#39d7ff) calc(var(--p,1) * 360deg),rgba(255,255,255,.12) 0);opacity:.55;transition:transform .12s,opacity .2s;-webkit-tap-highlight-color:transparent}
          #slo u::before,#slo-u::before{content:"";position:absolute;inset:4px;border-radius:50%;background:rgba(6,12,26,.92)}
          #slo u svg,#slo-u svg{position:relative;width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round}
          #slo u.ready,#slo-u.ready{opacity:1;box-shadow:0 0 14px var(--c,#39d7ff);animation:slop 1.4s ease-in-out infinite} #slo u.live,#slo-u.live{opacity:1;--c:#ffc24a;transform:scale(1.12)} #slo u:active,#slo-u:active{transform:scale(.92)}
          @keyframes slop{50%{box-shadow:0 0 22px 3px var(--c,#39d7ff)}}
          #stage.modal-on #slo,#stage.in-hub #slo,#stage.in-menu #slo{display:none}`;
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'slo'; el.innerHTML = '<i></i><b></b><u><svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/></svg></u>'; cap = el.querySelector('b'); btn = el.querySelector('u'); stage().appendChild(el);
        const tu = document.getElementById('touch-ui'); if (tu && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) { btn.id = 'slo-u'; tu.appendChild(btn); }   // above the joystick's half of the screen
        const press = ev => { ev.preventDefault(); ev.stopPropagation(); manual(); };
        btn.addEventListener('pointerdown', press); btn.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
        window.addEventListener('keydown', ev => { if (ev.code === 'KeyT' && now() - lastTick < 0.3) manual(); });
    }
    // kind: caption key · secs: how long it holds (real time) · k: speed of the world while it holds · n: for the multi caption
    // rank: 1 a quick beat on a plain kill · 2 a named moment · 3 the guardian. A higher rank may cut into a lower one;
    // after a beat 2.2 s must pass before the next beat, but a named moment only waits 1 s.
    const RANK = { kill: 1, dbl: 2, combo: 2, elite: 2, dodge: 2, multi: 2, fin: 2, phase: 3, boss: 3 };
    function go(kind, secs, k, col, n, force) {
        const t = now(), r = RANK[kind] || 2;
        if (S && !(force || r > S.r)) return false;
        if (!S && !force && t - lastEnd < (r === 1 ? 2.2 : 1)) return false;
        dom(); const from = S ? Math.min(t - S.t0, 0.14) : 0; S = { t0: t - from, hold: secs, k: coop() ? 1 : k, col, r };
        const tx = T[lang()][kind]; cap.textContent = typeof tx === 'function' ? tx(n) : tx; cap.dir = lang() === 'ar' ? 'rtl' : 'ltr'; cap.style.setProperty('--sc', col || '#39d7ff'); el.style.setProperty('--b', 1);
        sfx(a => { a.tone('sine', 420, 70, r === 1 ? 0.3 : 0.5, r === 1 ? 0.09 : 0.16); if (r > 1) a.noise(0.5, 0.07, { type: 'lowpass', f0: 900, f1: 120 }); a.tone('sine', 90, 520, 0.3, r === 1 ? 0.06 : 0.1, { delay: Math.max(0.2, secs - 0.05) }); });
        return true;
    }
    // the button under the map: ten seconds of slow world, refilled by five kills
    function manual() {
        if (M || charge < NEED || coop() || now() - lastTick > 0.3) return false;
        M = { left: LAST }; charge = 0; sfx(a => { a.tone('sine', 520, 60, 0.7, 0.18); a.noise(0.6, 0.08, { type: 'lowpass', f0: 1200, f1: 100 }); }); return true;
    }
    function button(real) {
        if (!btn) return;
        if (M) { M.left -= real; if (M.left <= 0) { M = null; sfx(a => a.tone('sine', 80, 560, 0.35, 0.14)); } }
        mk += ((M ? 1 : 0) - mk) * Math.min(1, real * 7); if (!M && mk < 0.01) mk = 0;
        btn.style.setProperty('--p', M ? (M.left / LAST).toFixed(3) : (charge / NEED).toFixed(2));
        btn.classList.toggle('ready', !M && charge >= NEED); btn.classList.toggle('live', !!M); btn.style.display = coop() ? 'none' : '';
        if (posN-- <= 0) { posN = 30; const m = document.getElementById('minimap'), st = stage(); if (m && st) { const a = m.getBoundingClientRect(), b = st.getBoundingClientRect(), l = document.getElementById('stage-label'), lb = l ? l.getBoundingClientRect() : a; if (a.width) { btn.style.left = (a.left + a.width / 2 - b.left) + 'px'; btn.style.top = (Math.max(a.bottom, lb.width ? lb.bottom : 0) - b.top + 7) + 'px'; } } }
    }
    function out(k, s, fov) { k = Math.min(k, 1 - (1 - MK) * mk); if (coop()) k = 1; window.AxonSlowK = k; window.AxonFovAdd = Math.min(fov, -5 * mk); el.style.setProperty('--k', Math.max(s, mk * 0.55).toFixed(3)); if (!S) el.style.setProperty('--b', 1); }
    // the curve of a moment: 0.12 s in, hold, 0.3 s out (real time)
    function drive() {
        if (!S) { out(1, 0, 0); return; }
        const t = now() - S.t0, IN = 0.14, OUT = 0.35, e = t < IN ? t / IN : t < IN + S.hold ? 1 : Math.max(0, 1 - (t - IN - S.hold) / OUT), s = e * e * (3 - 2 * e);
        out(1 - (1 - S.k) * s, s * (S.r === 1 ? 0.55 : 1), -(S.r === 1 ? 7 : 11) * s);
        if (t > IN + S.hold + OUT) { S = null; lastEnd = now(); out(1, 0, 0); }
    }

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; dom(); const real = Math.min(0.25, lastTick ? now() - lastTick : 0); lastTick = now(); button(real);
        if (built !== layout) { built = layout; charge = NEED; M = null; mk = 0; bossPhase = 0; bossDead = false; kills = []; }
        if (hooked !== api) {                                                   // every kill is noted (real time)
            hooked = api; const ok = api.onKill;
            api.onKill = e => { if (!M && charge < NEED) charge++; try { kills.push({ t: now(), boss: e.type === 'boss', elite: !!(window.AxonElite && window.AxonElite.elites.some(x => x.e === e)), x: e.mesh.position.x, z: e.mesh.position.z }); } catch (err) { } return ok(e); };
        }
        const t = now(), p = player.mesh.position;
        // kills of the last half second
        const fresh = kills.filter(k => !k.used && !k.boss), use = () => fresh.forEach(k => { k.used = true; });
        if (fresh.length && (!S || S.r === 1)) {
            const a = layout.arenas.find(a => (a.state === 'wave1' || a.state === 'wave2') && p.z < a.entryZ + 2 && p.z > a.exitZ - 2);
            let left = 1; if (a) { left = 0; for (const e of api.enemies) if (!e.isDead && !e.dormant && e.type !== 'boss' && e.mesh.position.z < a.entryZ + 2 && e.mesh.position.z > a.exitZ - 2) left++; }
            if (fresh.length >= 3) { if (go('multi', 1.1, 0.2, '#ffc24a', fresh.length)) use(); }
            else if (!left) { if (go('fin', 1.0, 0.2, '#39d7ff')) use(); }
            else if (fresh.some(k => k.elite)) { if (go('elite', 0.9, 0.22, '#ff5cf0')) use(); }
            else if (fresh.length === 2) { if (go('dbl', 0.8, 0.22, '#ffc24a')) use(); }
            else if (M) use(); else if (!S && t - fresh[0].t > 0.08) { go('kill', 0.42, 0.28, '#39d7ff'); use(); }      // a plain kill: a short beat, no caption
        }
        while (kills.length && (kills[0].used || t - kills[0].t > 0.55)) kills.shift();
        // every tenth hit of a chain
        const cc = +(comboNode || (comboNode = document.getElementById('combo-count')) || {}).textContent || 0;
        if (cc < comboSeen) comboSeen = 0;
        if (cc >= comboSeen + 10) { comboSeen = cc - cc % 10; go('combo', 0.75, 0.24, '#5cf0a0', comboSeen); }
        // a dash through a shot, at the last instant
        dodgeCd -= dt;
        if (player.isDashing && dodgeCd <= 0 && (!S || S.r === 1) && api.enemyShots) for (const s of api.enemyShots) { const q = s.mesh.position; if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 5 && Math.abs(q.y - p.y - 1.5) < 2) { dodgeCd = 1.5; go('dodge', 0.8, 0.25, '#5cf0a0'); break; } }
        // the guardian
        const B = window.AxonBossRef;
        if (B) { if (B.active && !B.isDead && B.phase === 2 && bossPhase < 2) { bossPhase = 2; go('phase', 0.9, 0.3, '#ff2a55', 0, true); } if (B.isDead && !bossDead) { bossDead = true; go('boss', 1.7, 0.18, '#ffd24a', 0, true); } }
        drive();
    }
    // never left slow: out of the mission, paused, a panel over the game → the clock is whole again
    setInterval(() => { if (now() - lastTick > 0.4 && (S || window.AxonSlowK !== 1)) { S = null; lastTick = 0; window.AxonSlowK = 1; window.AxonFovAdd = 0; if (el) el.style.setProperty('--k', 0); } }, 200);

    return { tick, go, manual, get on() { return !!S; }, get live() { return M ? M.left : 0; }, get charge() { return charge; } };
})();
