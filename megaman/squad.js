// =====================================================================
//  AXON BREACH — SQUAD BOARD + FLAIRS (squad.js)
//  Two things that make a mission worth playing again, and worth playing together:
//   FLAIRS      a glowing sigil under the hero and a trail of sparks in his steps. Each one is EARNED by a feat
//               (out-running the surge untouched, calling the meteors, an S rank, bringing the guardian down…),
//               kept for good, and chosen in the HQ (the ✦ button). Teammates see each other's flair.
//   SQUAD BOARD at the end of a co-op mission: every player's kills, damage taken and falls, with the titles
//               MVP / UNTOUCHABLE / LAST ONE STANDING — who carried the team is on the screen.
//  Other files report feats with AxonSquad.earn(id); level.js calls AxonSquad.tick every frame of the mission;
//  co-op stats travel as coop.js 'sc' messages. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonSquad = (function () {
    const L = {
        en: { title: 'FLAIRS', pick: 'Choose the mark you wear. Earn more in the missions.', none: 'NONE', on: 'WORN', lock: 'LOCKED', got: 'NEW FLAIR', board: 'SQUAD BOARD', k: 'KILLS', d: 'DAMAGE', f: 'FALLS', mvp: 'MVP', clean: 'UNTOUCHABLE', iron: 'NEVER FELL', close: 'Close', you: 'you',
            how: { run: 'Escape the surge run', storm: 'Escape the surge run without being touched', meteor: 'Call the meteor strike at the Watcher', lock: 'Open the ring lock', crush: 'Destroy 4 machines with one device', boss: 'Bring the guardian down', srank: 'Finish a mission with rank S' } },
        ar: { title: 'الشارات', pick: 'اختر الشارة اللي بتلبسها. اكسب غيرها من المهمات.', none: 'بدون', on: 'ملبوسة', lock: 'مقفلة', got: 'شارة جديدة', board: 'لوحة الفريق', k: 'قتلى', d: 'ضرر', f: 'سقوط', mvp: 'الأفضل', clean: 'ما انلمس', iron: 'ما سقط', close: 'إغلاق', you: 'أنت',
            how: { run: 'انجُ من مطاردة الموجة', storm: 'انجُ من الموجة بدون ولا لمسة', meteor: 'استدعِ ضربة النيازك عند العين الراصدة', lock: 'افتح قفل الحلقات', crush: 'دمّر 4 آليين بأداة واحدة', boss: 'أسقط الحارس', srank: 'أنهِ مهمة بتقييم S' } },
        es: { title: 'EMBLEMAS', pick: 'Elige la marca que llevas. Gana más en las misiones.', none: 'NINGUNO', on: 'PUESTO', lock: 'BLOQUEADO', got: 'NUEVO EMBLEMA', board: 'TABLA DEL EQUIPO', k: 'BAJAS', d: 'DAÑO', f: 'CAÍDAS', mvp: 'MVP', clean: 'INTOCABLE', iron: 'NUNCA CAYÓ', close: 'Cerrar', you: 'tú',
            how: { run: 'Escapa de la oleada', storm: 'Escapa de la oleada sin ser tocado', meteor: 'Llama a los meteoros en el Vigía', lock: 'Abre el cierre de anillos', crush: 'Destruye 4 máquinas con un dispositivo', boss: 'Derriba al guardián', srank: 'Termina una misión con rango S' } },
        zh: { title: '徽记', pick: '选择你佩戴的徽记。在任务中赢得更多。', none: '无', on: '已佩戴', lock: '未解锁', got: '新徽记', board: '小队榜', k: '击杀', d: '受伤', f: '倒下', mvp: 'MVP', clean: '毫发无伤', iron: '从未倒下', close: '关闭', you: '你',
            how: { run: '逃出晶潮通道', storm: '毫发无伤逃出晶潮', meteor: '在监视之眼召唤陨石', lock: '解开环锁', crush: '用一个装置摧毁4台机器', boss: '击倒守卫', srank: '以S评价完成任务' } },
        ja: { title: 'フレア', pick: '身につける印を選ぼう。ミッションでさらに獲得。', none: 'なし', on: '装備中', lock: '未解放', got: '新フレア', board: 'スクワッドボード', k: '撃破', d: '被ダメ', f: 'ダウン', mvp: 'MVP', clean: 'ノーダメージ', iron: 'ノーダウン', close: '閉じる', you: 'あなた',
            how: { run: 'サージ・ランを脱出', storm: 'サージに触れられずに脱出', meteor: '監視の眼でメテオを呼ぶ', lock: 'リングロックを解く', crush: '一つの装置で4体撃破', boss: 'ガーディアンを倒す', srank: 'ランクSでクリア' } }
    };
    const lang = () => (window.AxonI18n && L[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const TX = () => L[lang()];
    // id → [name, colour, second colour, sides of the sigil]
    const FLAIR = { run: ['EMBER STEP', 0xff7a2a, 0xffc24a, 3], storm: ['STORMSTEP', 0x39d7ff, 0xffffff, 4], meteor: ['METEOR CROWN', 0xffc24a, 0xff4a2a, 5], lock: ['KEYWARDEN', 0x5cf0a0, 0xcffff0, 6], crush: ['CRUSHER', 0xb58cff, 0xff2a9d, 8], boss: ['GUARDIAN SLAYER', 0xffd24a, 0xffffff, 12], srank: ['S-RANK', 0xff2a6d, 0xffe066, 40] };
    const IDS = Object.keys(FLAIR), KEY = 'axon.flair';
    const hex = c => '#' + c.toString(16).padStart(6, '0');
    const stage = () => document.getElementById('stage');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const net = () => window.AxonNet, coop = () => window.AxonCoop && window.AxonCoop.on;
    let save = { owned: [], on: '' }; try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
    const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { } };

    // ---------- feats ----------
    let toastEl = null, btn = null, panel = null;
    function css() {
        if (document.getElementById('sq-css')) return;
        const st = document.createElement('style'); st.id = 'sq-css';
        st.textContent = `
          #sq-got{position:absolute;z-index:32;left:50%;top:18%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;font-family:var(--font,system-ui);opacity:0;white-space:nowrap}
          #sq-got.on{animation:sqGot 3.2s ease-out both}
          #sq-got small{display:block;font-size:11px;font-weight:800;letter-spacing:.34em;color:var(--fc)}
          #sq-got b{display:block;margin-top:3px;padding:6px 22px;font-size:clamp(18px,4.4vw,30px);font-weight:900;font-style:italic;letter-spacing:.1em;color:#07090d;background:linear-gradient(90deg,var(--fc),var(--fd));clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);box-shadow:0 0 30px var(--fc)}
          #sq-btn{display:none;align-items:center;gap:6px;padding:7px 12px;margin-top:2px;border:1px solid rgba(255,255,255,.25);background:rgba(8,14,24,.8);color:#fff;font:800 11px/1 var(--font,system-ui);letter-spacing:.14em;cursor:pointer;pointer-events:auto;touch-action:manipulation;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
          #sq-btn i{font-style:normal;color:var(--fc,#ffd24a);font-size:14px;text-shadow:0 0 8px var(--fc,#ffd24a)}
          #stage.in-hub:not(.in-menu):not(.modal-on) #sq-btn{display:inline-flex}
          #sq-btn .n{background:#ff2a55;color:#fff;border-radius:9px;padding:2px 6px;font-size:10px}
          #sq{position:absolute;inset:0;z-index:31;display:none;place-items:center;background:rgba(3,6,12,.86);font-family:var(--font,system-ui);color:#eef;pointer-events:auto}
          #sq.on{display:grid}
          #sq .card{width:min(700px,94%);max-height:92%;overflow:auto;padding:16px 18px;background:linear-gradient(160deg,rgba(22,30,48,.97),rgba(8,10,18,.98));border:1px solid rgba(255,210,74,.4);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
          #sq h2{margin:0;font-size:22px;font-weight:900;font-style:italic;letter-spacing:.12em} #sq p{margin:4px 0 12px;font-size:12.5px;color:#aab6c8}
          #sq .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:7px}
          #sq .f{position:relative;display:grid;gap:5px;padding:10px 10px 9px 44px;min-height:56px;text-align:start;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#eef;font:inherit;cursor:pointer;touch-action:manipulation}
          #sq .f::before{content:"";position:absolute;inset-inline-start:10px;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:50%;background:radial-gradient(circle,var(--fd) 0 25%,var(--fc) 60%,transparent 72%);box-shadow:0 0 12px var(--fc)}
          #sq .f b{font-size:12.5px;letter-spacing:.08em} #sq .f small{font-size:10.5px;line-height:1.35;color:#9fb0c6}
          #sq .f.cur{border-color:var(--fc);box-shadow:inset 0 0 0 1px var(--fc),0 0 16px color-mix(in srgb,var(--fc) 45%,transparent)}
          #sq .f.lk{opacity:.5;cursor:default} #sq .f.lk::before{background:#333;box-shadow:none}
          #sq .x{position:sticky;bottom:0;margin-top:12px;width:100%;padding:11px;border:0;background:#ffd24a;color:#1a0d00;font:800 13px/1 var(--font,system-ui);letter-spacing:.14em;cursor:pointer}
          #sq [dir=rtl] h2,#sq [dir=rtl] .f b,#sq [dir=rtl] .x{letter-spacing:0}
          .sq-board{margin:10px auto 0;width:min(520px,100%);box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);font-family:var(--font,system-ui)}
          .sq-board h4{margin:0 0 6px;font-size:11px;letter-spacing:.3em;color:#ffd24a;text-align:center}
          .sq-board .r{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,.7fr));gap:8px;align-items:center;padding:5px 0;border-top:1px solid rgba(255,255,255,.07);font-size:13px;color:#f4f8ff}
          .sq-board .r.h{border:0;font-size:9.5px;letter-spacing:.14em;color:#8fa3b8}
          .sq-board .r > *{text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .sq-board .r > :first-child{text-align:start}
          .sq-board .nm{display:flex;align-items:center;gap:6px;font-weight:700} .sq-board .nm i{flex:0 0 auto;width:8px;height:8px;background:var(--pc)}
          .sq-board .tg{display:inline-block;margin-inline-start:5px;padding:2px 6px;font-size:9px;font-weight:800;letter-spacing:.08em;color:#07090d;background:#ffd24a}
          .sq-board .tg.c{background:#5cf0a0} .sq-board .tg.i{background:#39d7ff}
          .sq-board b.best{color:#ffd24a}
          /* playing together is the first thing the menu says */
          #stage.in-menu [data-act="coop"]{position:relative;box-shadow:0 0 0 1px #5cf0a0,0 0 18px rgba(92,240,160,.45)}
          #stage.in-menu [data-act="coop"]::after{content:"1–4 ★";position:absolute;top:-8px;inset-inline-end:8px;padding:3px 7px;font:800 10px/1 var(--font,system-ui);letter-spacing:.08em;color:#07090d;background:#5cf0a0}
          @keyframes sqGot{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}10%{opacity:1;transform:translate(-50%,-50%) scale(1)}82%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}`;
        document.head.appendChild(st);
    }
    function dom() {
        if (toastEl || !stage()) return; css();
        toastEl = document.createElement('div'); toastEl.id = 'sq-got'; stage().appendChild(toastEl);
        btn = document.createElement('button'); btn.id = 'sq-btn'; btn.type = 'button'; (document.querySelector('#hud .hud-right') || stage()).appendChild(btn);
        btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); open(); });
        panel = document.createElement('div'); panel.id = 'sq'; stage().appendChild(panel);
        panel.addEventListener('pointerdown', e => {
            const f = e.target.closest('[data-f]'), x = e.target.closest('.x'); if (!f && !x && e.target !== panel) return; e.preventDefault();
            if (f) { const id = f.dataset.f; if (id === '' || save.owned.includes(id)) { save.on = id; save.seen = save.owned.length; store(); sfx(a => a.tone('triangle', 660, 990, 0.1, 0.07)); render(); label(); } return; }
            panel.classList.remove('on');
        });
        label();
    }
    function label() { if (!btn) return; const f = FLAIR[save.on], n = save.owned.length - (save.seen || 0); btn.style.setProperty('--fc', f ? hex(f[1]) : '#ffd24a'); btn.innerHTML = `<i>✦</i><span>${f ? f[0] : TX().title}</span>${n > 0 ? `<span class="n">${n}</span>` : ''}`; }
    function render() {
        const t = TX(), rtl = lang() === 'ar';
        panel.innerHTML = `<div class="card" dir="${rtl ? 'rtl' : 'ltr'}"><h2>✦ ${t.title} <small style="font-size:12px;opacity:.6">${save.owned.length} / ${IDS.length}</small></h2><p>${t.pick}</p><div class="g">` +
            `<button class="f${save.on === '' ? ' cur' : ''}" data-f="" style="--fc:#8fa3b8;--fd:#fff"><b>${t.none}</b><small>&nbsp;</small></button>` +
            IDS.map(id => { const f = FLAIR[id], own = save.owned.includes(id); return `<button class="f${save.on === id ? ' cur' : ''}${own ? '' : ' lk'}" ${own ? `data-f="${id}"` : ''} style="--fc:${hex(f[1])};--fd:${hex(f[2])}"><b>${f[0]}</b><small>${own ? (save.on === id ? t.on : '&nbsp;') : '🔒 ' + t.how[id]}</small></button>`; }).join('') +
            `</div><button class="x" type="button">${t.close}</button></div>`;
    }
    function open() { dom(); save.seen = save.owned.length; store(); render(); panel.classList.add('on'); label(); }
    function earn(id) {
        if (!FLAIR[id] || save.owned.includes(id)) return false;
        save.owned.push(id); if (!save.on) save.on = id; store(); dom(); label();
        const f = FLAIR[id]; toastEl.style.setProperty('--fc', hex(f[1])); toastEl.style.setProperty('--fd', hex(f[2])); toastEl.dir = lang() === 'ar' ? 'rtl' : 'ltr';
        toastEl.innerHTML = `<small>✦ ${TX().got} ✦</small><b>${f[0]}</b>`; toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
        sfx(a => { [523, 659, 784, 1047, 1319].forEach((q, i) => a.tone('triangle', q, q, 0.22, 0.08, { delay: 0.3 + i * 0.08 })); a.noise(0.3, 0.05, { type: 'highpass', f0: 4000, delay: 0.3 }); });
        return true;
    }

    // ---------- the flair in the world: a sigil under the feet, sparks in the steps ----------
    const sig = new Map();                     // key ('me' / slot) → { mesh, id }
    function sigil(scene, key, id) {
        let s = sig.get(key);
        if (s && (s.id !== id || s.mesh.parent !== scene)) { if (s.mesh.parent) s.mesh.parent.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); sig.delete(key); s = null; }
        if (!s && FLAIR[id]) {
            const f = FLAIR[id], m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.86, f[3], 1), new THREE.MeshBasicMaterial({ color: f[1], transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
            m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); s = { mesh: m, id, lx: 0, lz: 0, t: 0 }; sig.set(key, s);
        }
        return s;
    }
    function wear(scene, key, id, p, show, dt, api) {
        const s = sigil(scene, key, show ? id : ''); if (!s) return;
        const t = performance.now() / 1000, f = FLAIR[id];
        s.mesh.position.set(p.x, p.y + 0.07, p.z); s.mesh.rotation.z = t * 1.4; s.mesh.scale.setScalar(1 + 0.07 * Math.sin(t * 5)); s.mesh.material.opacity = 0.55 + 0.2 * Math.sin(t * 5);
        const moved = (p.x - s.lx) ** 2 + (p.z - s.lz) ** 2; s.t -= dt;
        if (api && moved > 0.02 && s.t <= 0) { s.t = 0.09; s.lx = p.x; s.lz = p.z; api.spawnSparks(_v.set(p.x, p.y + 0.25, p.z), Math.random() < 0.5 ? f[1] : f[2], 2, 3); }
    }
    const _v = new THREE.Vector3();

    // ---------- co-op: everyone's numbers ----------
    const others = new Map();                  // slot → { k, d, f, fl }
    let me = { k: 0, d: 0, f: 0 }, API = null, hooked = null, hp0 = null, wasDead = false, sendT = 0, bossSeen = false, boardFor = null, lastTick = 0;
    function remote(m, from) { if (from === undefined || from === (net() && net().slot)) return; others.set(from, { k: m.k | 0, d: m.d | 0, f: m.f | 0, fl: String(m.fl || '') }); }
    function board() {
        const ov = document.getElementById('overlay'), card = ov && !ov.hidden && ov.querySelector('.card');
        if (!card || !coop() || !net() || card.querySelector('.sq-board')) return;
        const N = net(), t = TX(), rows = [{ slot: N.slot, k: me.k, d: me.d, f: me.f }]; others.forEach((o, slot) => rows.push({ slot, k: o.k, d: o.d, f: o.f }));
        if (rows.length < 2) return;
        rows.sort((a, b) => b.k - a.k || a.d - b.d);
        const bestK = Math.max(...rows.map(r => r.k)), leastD = Math.min(...rows.map(r => r.d));
        const el = document.createElement('div'); el.className = 'sq-board'; el.dir = lang() === 'ar' ? 'rtl' : 'ltr';
        el.innerHTML = `<h4>${t.board}</h4><div class="r h"><span></span><span>${t.k}</span><span>${t.d}</span><span>${t.f}</span></div>` + rows.map(r => {
            const nm = String(N.nameOf(r.slot)).replace(/[<>&"]/g, '') + (r.slot === N.slot ? ` (${t.you})` : '');
            const tags = (r.k === bestK && bestK > 0 ? `<span class="tg">${t.mvp}</span>` : '') + (r.d === leastD && r.d < 30 ? `<span class="tg c">${t.clean}</span>` : '') + (r.f === 0 ? `<span class="tg i">${t.iron}</span>` : '');
            return `<div class="r"><span class="nm" style="--pc:${hex((N.COLORS || [])[r.slot] || 0xffffff)}"><i></i><bdi>${nm}</bdi>${tags}</span><b class="${r.k === bestK && bestK > 0 ? 'best' : ''}">${r.k}</b><b>${r.d}</b><b>${r.f}</b></div>`;
        }).join('');
        const anchor = card.querySelector('.px-res'); if (anchor && anchor.nextSibling) card.insertBefore(el, anchor.nextSibling); else { const cta = card.querySelector('.cta'); cta ? card.insertBefore(el, cta) : card.appendChild(el); }
    }

    // ---------- every frame of the mission (level.js) ----------
    function tick(api, player, layout, dt) {
        API = api; lastTick = performance.now(); dom();
        if (boardFor !== layout) { boardFor = layout; me = { k: 0, d: 0, f: 0 }; others.clear(); hp0 = null; wasDead = false; bossSeen = false; }
        if (hooked !== api) {                                                   // my own kills (co-op: the ones credited to me)
            hooked = api; const ok = api.onKill;
            api.onKill = e => { try { const N = net(), mine = !coop() ? true : (N.role === 'host' ? !(e._by > 0) : e._killer === N.slot); if (mine && e.type !== 'boss') me.k++; } catch (err) { } return ok(e); };
        }
        if (hp0 !== null && player.hp < hp0 - 0.5 && !player.dead) me.d += Math.round(hp0 - player.hp); hp0 = player.hp;
        if (player.dead && !wasDead) me.f++; wasDead = !!player.dead;
        const B = window.AxonBossRef; if (B && B.isDead && !bossSeen) { bossSeen = true; earn('boss'); }
        if (coop() && (sendT -= dt) <= 0) { sendT = 1.5; window.AxonCoop.send && window.AxonCoop.send({ t: 'sc', k: me.k, d: me.d, f: me.f, fl: save.on }); }
    }
    // the sigils, the end card and the S rank are looked after on their own clock (HQ and menus included)
    let prevT = 0;
    (function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.1, Math.max(0, ((now || 0) - prevT) / 1000)); prevT = now || 0;
        const P = window.__axonPlayer; if (!P || !P.mesh || !P.mesh.parent) return;
        const scene = P.mesh.parent, live = performance.now() - lastTick < 400 ? API : null, st = stage();
        const menu = st && st.classList.contains('in-menu');
        wear(scene, 'me', save.on, P.mesh.position, !!save.on && P.mesh.visible && !P.dead && !menu, dt, live);
        if (coop() && window.AxonCoop.mates) { const seen = new Set(); for (const m of window.AxonCoop.mates()) { const o = others.get(m.slot); seen.add(m.slot); wear(scene, m.slot, o ? o.fl : '', m.p, !!(o && o.fl && m.here), dt, live); } sig.forEach((s, k) => { if (k !== 'me' && !seen.has(k)) sigil(scene, k, ''); }); }
        else sig.forEach((s, k) => { if (k !== 'me') sigil(scene, k, ''); });
    })();
    setInterval(() => {
        try { dom(); board(); const rk = document.querySelector('#overlay:not([hidden]) .px-res .rk i'); if (rk && rk.textContent.trim() === 'S') earn('srank'); if (coop() && window.AxonCoop.send && performance.now() - lastTick > 2000) window.AxonCoop.send({ t: 'sc', k: me.k, d: me.d, f: me.f, fl: save.on }); } catch (e) { }
    }, 2500);

    return { tick, earn, remote, open, FLAIR, get save() { return save; }, get me() { return me; } };
})();
