// =====================================================================
//  AXON BREACH — PRESENTATION (polish.js)
//  The small things a finished game has around its play:
//   1 (the mission card was removed: the loading screen already names the mission and the countdown starts it —
//     a third start screen on top of them only got in the way)
//   2 AREA BANNER — the name of each part of the facility slides in the first time you walk into it
//     ("FLOOR 3 / 9 · LADDER SHAFT"), in the floor's colour.
//   3 RESULTS — on the mission-complete card: time, damage taken, hostiles destroyed and a rank (S / A / B / C)
//     that stamps itself on.
//  level.js calls AxonPolish.tick(...) every frame of the mission. Five languages. Loaded before level.js.
// =====================================================================
'use strict';

window.AxonPolish = (function () {
    const T = {
        en: { area: ['START BAY', 'ACCESS CORRIDOR', 'CROSS HALL', 'LADDER SHAFT', 'TOWER HALL', 'LOCKDOWN ARENA', 'THE PIT', 'GUARDIAN CHAMBER'], floor: 'FLOOR', sub: 'CLIMB THE FACILITY · DEFEAT THE GUARDIAN', time: 'TIME', dmg: 'DAMAGE TAKEN', kills: 'HOSTILES DESTROYED', rank: 'RANK' },
        ar: { area: ['حجرة البداية', 'ممر العبور', 'القاعة المتقاطعة', 'بئر السلالم', 'قاعة البرج', 'ساحة الإغلاق', 'الهاوية', 'حجرة الحارس'], floor: 'الطابق', sub: 'اصعد المنشأة · اهزم الحارس', time: 'الوقت', dmg: 'الضرر المتلقّى', kills: 'الأعداء المدمَّرون', rank: 'التقييم' },
        es: { area: ['BAHÍA INICIAL', 'CORREDOR DE ACCESO', 'SALA CRUZADA', 'POZO DE ESCALERAS', 'SALA DE LA TORRE', 'ARENA DE CIERRE', 'EL FOSO', 'CÁMARA DEL GUARDIÁN'], floor: 'PISO', sub: 'SUBE LA INSTALACIÓN · DERROTA AL GUARDIÁN', time: 'TIEMPO', dmg: 'DAÑO RECIBIDO', kills: 'HOSTILES DESTRUIDOS', rank: 'RANGO' },
        zh: { area: ['起始舱', '通行走廊', '交叉大厅', '梯井', '塔厅', '封锁竞技场', '深渊', '守卫之间'], floor: '楼层', sub: '登上设施 · 击败守卫', time: '用时', dmg: '承受伤害', kills: '击毁敌人', rank: '评级' },
        ja: { area: ['スタートベイ', '連絡通路', 'クロスホール', 'はしごシャフト', 'タワーホール', '封鎖アリーナ', '奈落', 'ガーディアンの間'], floor: 'フロア', sub: '施設を登れ · ガーディアンを倒せ', time: 'タイム', dmg: '被ダメージ', kills: '撃破数', rank: 'ランク' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage') || document.body;
    const tone = (...a) => { try { const s = window.AxonAudio && window.AxonAudio.AudioSys; if (s && s.ctx) s.tone(...a); } catch (e) { } };
    let built = false, card, ban, last = 0, zi = 0, seen = {}, banT = 0;
    const R = { t: 0, dmg: 0, kills: 0, total: 0, hp: -1, max: 100 }; let fresh = true;

    function build() {
        built = true;
        const st = document.createElement('style');
        st.textContent = `
          #mcard{position:absolute;inset:0;z-index:16;display:none;place-items:center;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(4,8,16,0),rgba(4,8,16,.55) 35%,rgba(4,8,16,.55) 65%,rgba(4,8,16,0))}
          #mcard.on{display:grid;animation:mcOut .4s 2.75s ease-in forwards}
          #mcard .in{display:grid;justify-items:center;gap:1.2vmin}
          #mcard .k{font:800 clamp(11px,2.6vmin,18px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.6em;padding-inline-start:.6em;color:#ffa826;opacity:0;animation:mcFade .3s .05s forwards;direction:ltr}
          #mcard .n{display:flex;direction:ltr;font:900 clamp(34px,11vmin,104px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.06em;color:#f4f8ff;text-shadow:0 0 22px rgba(57,215,255,.7),0 4px 0 rgba(10,40,70,.8)}
          #mcard .n span{opacity:0;transform:translateX(40px);animation:mcLet .32s cubic-bezier(.2,.9,.2,1) forwards;animation-delay:calc(var(--i) * 45ms + 150ms);white-space:pre}
          #mcard .l{width:min(70vw,720px);height:3px;background:linear-gradient(90deg,transparent,#39d7ff 25%,#fff 50%,#39d7ff 75%,transparent);box-shadow:0 0 14px #39d7ff;transform:scaleX(0);animation:mcLine .4s .65s cubic-bezier(.2,.9,.2,1) forwards}
          #mcard .s{font:600 clamp(10px,2.2vmin,15px)/1.3 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.3em;color:#b7c6d6;opacity:0;animation:mcFade .3s .85s forwards;text-align:center;max-width:90vw}
          #mcard[dir=rtl] .s{letter-spacing:0}
          #mcard .r{margin-top:1.4vmin;font:900 clamp(22px,6.5vmin,60px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.3em;padding-inline-start:.3em;color:#ffd24a;text-shadow:0 0 18px rgba(255,180,40,.9);opacity:0;animation:mcReady .38s 1.35s 3 both;direction:ltr}
          @keyframes mcFade{to{opacity:1}}
          @keyframes mcLet{to{opacity:1;transform:none}}
          @keyframes mcLine{to{transform:scaleX(1)}}
          @keyframes mcReady{0%{opacity:0;transform:scale(1.25)}25%{opacity:1;transform:none}70%{opacity:1}100%{opacity:0}}
          @keyframes mcOut{to{opacity:0}}
          #aban{position:absolute;z-index:9;left:50%;top:23%;transform:translate(-50%,0);display:none;grid-auto-flow:row;justify-items:center;gap:5px;pointer-events:none;text-align:center;white-space:nowrap}
          #aban.on{display:grid;animation:abIn 2.9s ease-out forwards}
          #aban .f{font:700 clamp(9px,2vmin,13px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.4em;color:var(--bc,#39d7ff)}
          #aban .a{font:800 clamp(16px,4.2vmin,34px)/1.1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.14em;color:#f4f8ff;text-shadow:0 0 16px var(--bc,#39d7ff)}
          #aban[dir=rtl] .a,#aban[dir=rtl] .f{letter-spacing:0}
          #aban .u{width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--bc,#39d7ff),transparent)}
          @keyframes abIn{0%{opacity:0;clip-path:inset(0 50% 0 50%)}12%{opacity:1;clip-path:inset(0 0 0 0)}80%{opacity:1}100%{opacity:0}}
          #stage.comm-on #aban,#stage.modal-on #aban,#stage.boss-intro #aban,#stage.ready-on #aban,#stage.in-hub #aban,#stage.in-hub #mcard,#stage.in-menu #mcard,#stage.modal-on #mcard{display:none!important}
          #stage.modal-on #hud{opacity:0;transition:opacity .2s}
          .px-res{display:grid;grid-template-columns:repeat(3,1fr) auto;gap:4px 14px;align-items:end;margin:0 auto;width:min(520px,100%);box-sizing:border-box;padding:9px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(57,215,255,.18);text-align:start;position:relative}
          .px-res span{grid-row:1;font-size:10px;letter-spacing:.12em;color:#8fa3b8;white-space:nowrap}
          .px-res b{grid-row:2;font:700 17px/1.1 var(--font,system-ui);color:#f4f8ff;text-align:start;direction:ltr;white-space:nowrap}
          .px-res[dir=rtl] b{text-align:end}
          .px-res b small{font-size:10px;font-weight:600;color:#8fa3b8}
          .px-res .rk{grid-column:4;grid-row:1/3;display:grid;justify-items:center;align-content:center;gap:2px;padding-inline-start:14px;border-inline-start:1px solid rgba(255,255,255,.1)}
          .px-res .rk span{grid-row:auto}
          .px-res .rk i{font:900 40px/1 var(--font,system-ui);font-style:italic;color:var(--rc);text-shadow:0 0 18px var(--rc);animation:pxStamp .45s .5s cubic-bezier(.2,1.6,.3,1) both}
          #overlay{overflow:auto}
          #stage.short #overlay .card{gap:8px;max-width:560px}
          #stage.short #overlay .card h1{font-size:clamp(26px,9vh,46px)}
          #stage.short #overlay .card p{font-size:12.5px;line-height:1.45}
          #stage.short #overlay .card .cta{padding:11px 26px}
          #stage.short #overlay .card{grid-template-columns:1fr 1fr} #stage.short #overlay .card > *{grid-column:1/-1} #stage.short #overlay .card > .cta{grid-column:auto;justify-self:stretch}
          @keyframes pxStamp{0%{opacity:0;transform:scale(3) rotate(-12deg)}100%{opacity:1;transform:none}}`;
        document.head.appendChild(st);
        card = document.createElement('div'); card.id = 'mcard'; ban = document.createElement('div'); ban.id = 'aban';
        stage().appendChild(card); stage().appendChild(ban);
    }
    function mission() {
        const L = lang(), name = 'AXON BREACH';
        card.dir = L === 'ar' ? 'rtl' : 'ltr';
        card.innerHTML = `<div class="in"><div class="k">MISSION 01</div>${window.AxonLogo ? `<div class="n ax-logo">${window.AxonLogo}</div>` : `<div class="n">${name.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>`}<div class="l"></div><div class="s">${T[L].sub}</div><div class="r">READY</div></div>`;
        card.classList.remove('on'); void card.offsetWidth; card.classList.add('on'); stage().classList.add('ready-on');
        tone('sawtooth', 140, 420, 0.45, 0.07, { lp: 1800 });
        [1.35, 1.73, 2.11].forEach((d, i) => tone('square', i === 2 ? 1320 : 880, i === 2 ? 1320 : 880, i === 2 ? 0.22 : 0.09, 0.07, { delay: d }));
        setTimeout(() => { card.classList.remove('on'); stage().classList.remove('ready-on'); }, 3200);
    }
    function banner(z, layout) {
        const L = lang(), plan = window.AxonSectors ? window.AxonSectors.PLAN : [], k = z.kind === 'start' ? 0 : z.kind === 'corridor' ? 1 + (plan[z.stage - 1] || 0) : z.kind === 'arena' ? 5 : z.kind === 'gauntlet' ? 6 : 7;
        const col = z.kind === 'boss' ? '#ff2a45' : z.kind === 'gauntlet' ? '#ffa826' : '#39d7ff';
        ban.dir = L === 'ar' ? 'rtl' : 'ltr'; ban.style.setProperty('--bc', col);
        ban.innerHTML = `<div class="f"><bdi>${T[L].floor} ${z.stage} / ${layout.stages}</bdi></div><div class="a">${z.kind === 'corridor' && plan[z.stage - 1] === 4 && window.AxonChase ? window.AxonChase.name() : T[L].area[k]}</div><div class="u"></div>`;
        ban.classList.remove('on'); void ban.offsetWidth; ban.classList.add('on');
        tone('triangle', 660, 990, 0.12, 0.05); tone('triangle', 990, 990, 0.1, 0.035, { delay: 0.1 });
        clearTimeout(banT); banT = setTimeout(() => ban.classList.remove('on'), 3000);
    }
    const fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    function results() {
        const ov = document.getElementById('overlay'), B = window.AxonBossRef;
        if (!ov || ov.hidden || !B || !B.isDead) return;
        const cd = ov.querySelector('.card'); if (!cd || cd.querySelector('.px-res')) return;
        const L = lang(), ratio = R.dmg / Math.max(1, R.max), rank = ratio < 0.5 && R.t < 900 ? 'S' : ratio < 1.5 ? 'A' : ratio < 3 ? 'B' : 'C', rc = { S: '#ffd24a', A: '#5cff8a', B: '#39d7ff', C: '#b7c6d6' }[rank];
        const d = document.createElement('div'); d.className = 'px-res'; d.dir = L === 'ar' ? 'rtl' : 'ltr'; d.style.setProperty('--rc', rc);
        d.innerHTML = `<span>${T[L].time}</span><b>${fmt(R.t)}</b><span>${T[L].dmg}</span><b>${Math.round(R.dmg)} <small>/ ${Math.round(R.max)}</small></b><span>${T[L].kills}</span><b>${R.kills}${R.total ? ' / ' + Math.max(R.total, R.kills) : ''}</b><div class="rk"><span>${T[L].rank}</span><i>${rank}</i></div>`;
        const btn = cd.querySelector('.cta'); cd.insertBefore(d, btn || null);
        setTimeout(() => { tone('square', 523, 523, 0.08, 0.06); tone('square', 784, 784, 0.08, 0.06, { delay: 0.09 }); tone('square', 1047, 1047, 0.25, 0.07, { delay: 0.18 }); }, 500);
    }
    setInterval(() => { try { results(); const s = stage().classList, ov = document.getElementById('overlay'); if (s.contains('in-hub') || s.contains('in-menu') || (ov && !ov.hidden)) fresh = true; } catch (e) { } }, 300);

    // every frame of the mission (level.js)
    function tick(api, player, layout, dt) {
        if (!built) build();
        const now = performance.now(), p = player.mesh.position, Z = layout.zones, B = window.AxonBossRef;
        while (zi < Z.length - 1 && p.z < Z[zi].z1) zi++; while (zi > 0 && p.z > Z[zi].z0) zi--;
        const z = Z[zi];
        if (fresh) {                                                                // a new run: deployed from the HQ, or retried after a result card
            fresh = false; R.t = R.dmg = R.kills = 0; R.hp = player.hp; R.max = player.maxHp || 100;
            R.total = api.enemies.filter(e => e.type !== 'boss').length + layout.arenas.reduce((n, a) => n + (a.state === 'clear' ? 0 : a.wave2.length), 0);
            seen = { ['start0']: 1 };   // (no mission card here: the loading screen names the mission and the game's own countdown starts it)
        }
        if (!api._pxKill) { api._pxKill = 1; const ok = api.onKill; api.onKill = e => { if (e && e.type !== 'boss') R.kills++; return ok && ok(e); }; }   // the game's own kill event: an exact count
        if (now - last > 1500) R.hp = player.hp;                                    // back from a pause: armour changes in between are not hits
        last = now;
        // ---- the run, for the results ----
        if (!(B && B.isDead)) R.t += dt;
        const mx = player.maxHp || 100; if (mx === R.max && player.hp < R.hp) R.dmg += R.hp - player.hp; R.max = mx; R.hp = player.hp;   // (a change of max armour is not damage)
        // ---- a new part of the facility ----
        const key = z.kind + z.stage;
        if (!seen[key] && !player.dead && (z.kind !== 'arena' || p.z < z.z0 - 4)) { seen[key] = 1; if (!stage().classList.contains('ready-on')) banner(z, layout); else seen[key] = 0; }
    }
    return { tick, stats: () => R };
})();
