// =====================================================================
//  AXON BREACH — front-end: Mtz Games splash, loading screen, main menu,
//  pause menu, settings and how-to-play panels.
//  Loaded by index.html before game.js; game.js calls AxonUI.init(api) when the world is ready.
// =====================================================================
'use strict';

// ---------- cheats: locked until the password is typed into the Cheats panel; each one is an on/off switch ----------
//   money: purchases cost nothing (shop.js) · hp: no damage · en: energy is never spent (game.js)
window.AxonCheats = (function () {
    const KEY = 'axon.cheats', PASS = 'rockmanfan';
    const st = { ok: false, money: false, hp: false, en: false };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
    return {
        get unlocked() { return !!st.ok; },
        on: k => !!(st.ok && st[k]),
        tryPass(v) { if (String(v).trim().toLowerCase() !== PASS) return false; st.ok = true; save(); return true; },
        toggle(k) { if (!st.ok || !(k in st) || k === 'ok') return; st[k] = !st[k]; save(); if (window.AxonShop && window.AxonShop.refresh) window.AxonShop.refresh(); }
    };
})();

window.AxonUI = (function () {
    const $ = id => document.getElementById(id);
    const I = window.AxonI18n, T = I.t;
    const boot = { t0: performance.now(), splashDone: false, ready: false, pct: 0 };
    let api = null, menuEl = null, pauseEl = null, panelEl = null, paused = false;
    const skipSplash = (() => { try { const v = sessionStorage.getItem('axon.skipSplash'); sessionStorage.removeItem('axon.skipSplash'); return v === '1'; } catch (e) { return false; } })();

    // ---------- boot: splash → loading → menu ----------
    // The bar is drawn by its own animation loop: it glides toward the real progress (never jumps, never goes
    // back), and while a heavy step runs it keeps creeping a little so the screen never looks frozen.
    boot.shown = 0; const BOOT_MIN = 5000;             // every loading screen stays up at least 5 s
    function setProgress(p, label) {
        boot.pct = Math.max(boot.pct, p);
        const lab = $('load-label'); if (lab && label) lab.textContent = label;
        if (!boot.anim) { boot.anim = true; let last = performance.now();
            const step = now => {
                const dt = Math.min(0.1, (now - last) / 1000); last = now;
                // paced by time as well: the bar spans the whole 5 s screen instead of racing to 100 and sitting there
                const tf = boot.loadAt ? Math.max(0, Math.min(1, (now - boot.loadAt) / BOOT_MIN)) : 0, lim = 3 + tf * 97;
                const real = Math.min(boot.pct, lim), cap = Math.min(real >= 100 ? 100 : Math.min(97, real + 9), lim);   // creep ceiling while waiting
                const goal = boot.shown < real ? real : cap, rate = boot.shown < real ? 10 : 0.35;
                boot.shown = Math.min(goal, boot.shown + Math.max(0.02, (goal - boot.shown) * Math.min(1, dt * rate)));
                if (real >= 100 && 100 - boot.shown < 1.5) boot.shown = 100;
                const bar = $('load-fill'), txt = $('load-pct');
                if (bar) bar.style.transform = `scaleX(${boot.shown / 100})`;
                if (txt) txt.textContent = Math.floor(boot.shown) + '%';
                if ($('boot')) requestAnimationFrame(step); };
            requestAnimationFrame(step); }
    }
    function scriptLoaded() {                          // called by each <script onload> in index.html
        boot.scripts = (boot.scripts || 0) + 1;
        setProgress(Math.min(60, boot.scripts / 14 * 60), T('load_engine'));
    }
    let bootCtx = 'menu', bootTipAt = 0, bootTipT = 0;
    try { const ss = sessionStorage; bootCtx = ss.getItem('axon.hub') === '1' ? 'to_hq' : ss.getItem('axon.autostart') === '1' ? 'retry' : 'menu'; } catch (e) { }
    function bootTip() {                                  // rotate briefings on the loading screen, each held long enough to read
        const el = document.querySelector('.ld-tip'); if (!el) return;
        const txt = pickTip(bootCtx); el.removeAttribute('data-i18n');
        el.innerHTML = `<b style="display:block;color:var(--amber);font-size:12px;letter-spacing:.2em;margin-bottom:4px">${txt[0]}</b>${txt[1]}`;
        el.dir = I.lang === 'ar' ? 'rtl' : 'ltr'; bootTipAt = performance.now();
        bootTipT = setTimeout(bootTip, Math.max(BOOT_MIN + 2500, readTime(txt) * 1000 + 800));   // rotates only if loading really takes that long
    }
    // Leaving the loading screen, the way big studio games do it: the bar must actually reach 100 %, the screen
    // must have been up at least 5 s (time to read the tip in full), and the first frames of the scene are drawn
    // behind the curtain so what appears is already smooth. Then a short "ready" beat, and a fade — no artificial waiting beyond that.
    const bootHold = f => {
        const min = BOOT_MIN;
        let frames = 0;
        const wait = () => {
            if (boot.shown < 100 || !boot.loadAt || performance.now() - boot.loadAt < min || frames++ < 3) { requestAnimationFrame(wait); return; }
            setTimeout(() => { clearTimeout(bootTipT); f(); }, 220);
        };
        requestAnimationFrame(wait);
    };
    function showLoading() {
        const s = $('boot-splash'), l = $('boot-load');
        const fromSplash = s && !skipSplash;
        if (s) s.classList.add('gone');
        // after the studio logo: a beat of black, then the title fades in (no cross-fade of the two)
        // (a CSS delay, not a timer, so it still happens on time while the world is being built)
        if (l) { l.classList.toggle('late', !!fromSplash); l.classList.add('show'); }
        boot.loadAt = performance.now() + (fromSplash ? 380 : 0);
        const t = document.querySelector('.ld-title');
        if (t && bootCtx !== 'menu') t.innerHTML = `${ldLabel(bootCtx)}`;
        bootTip();
    }
    function finishBoot() {
        const b = $('boot');
        if (!b) return;
        setProgress(100, T('load_ready'));
        bootHold(() => { b.classList.add('gone'); setTimeout(() => b.remove(), 600); showMenu(); });
    }
    function maybeFinish() { if (boot.splashDone && boot.ready) finishBoot(); }
    function startSplash() {
        const s = $('boot-splash');
        if (skipSplash || !s) { boot.splashDone = true; showLoading(); return; }
        const end = () => { if (boot.splashDone) return; boot.splashDone = true; showLoading(); maybeFinish(); };
        setTimeout(end, 7000);                        // the studio intro plays in full: 7 s (no tap-to-skip)
    }

    // ---------- main menu ----------
    const ICON = {
        play: '<path d="M8 5l11 7-11 7z"/>',
        hero: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
        resume: '<path d="M8 5l11 7-11 7z"/>',
        retry: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
        hq: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
        home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        cheat: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
        team: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20c.8-3.4 3-5.2 5.5-5.2s4.7 1.8 5.5 5.2M14 14.6c.8-.4 1.6-.6 2.5-.6 2.2 0 4 1.5 4.8 4.6"/>'
    };
    const ico = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
    // label in the chosen language, with the English name underneath (hidden when the language is English)
    const btn = (id, icon, key, cls = '') => {
        const en = I.lang === 'en' ? '' : `<small>${EN[key] || ''}</small>`;
        return `<button class="mm-btn ${cls}" type="button" data-act="${id}">${ico(icon)}<span><b>${T(key)}</b>${en}</span></button>`;
    };
    const EN = { cheats: 'CHEATS', coop: 'CO-OP · ONLINE', start: 'ENTER HQ', back_hq: 'RETURN TO HQ', character: 'CHARACTER', settings: 'SETTINGS', help: 'HOW TO PLAY', about: 'ABOUT', resume: 'RESUME', restart: 'RESTART', main_menu: 'MAIN MENU' };

    function renderMenu() {
        const pickOpen = menuEl.querySelector('.mm-pick') && !menuEl.querySelector('.mm-pick').hidden;
        menuEl.innerHTML = `
          <div class="mm-side">
            <div class="mm-brand"><span class="mm-kicker">${T('presents')}</span>
              <h1 class="ax-logo">${window.AxonLogo || 'AXON <em>BREACH</em>'}</h1><span class="mm-sub">${T('menu_sub')}</span></div>
            <nav class="mm-nav">
              ${btn('start', 'play', 'start', 'primary')}
              ${btn('coop', 'team', 'coop')}
              ${btn('hero', 'hero', 'character')}
              <div class="mm-pick" ${pickOpen ? '' : 'hidden'}>
                <button type="button" class="pick-btn" data-hero="a"><b>AXON</b><span>${T('pick_a')}</span></button>
                <button type="button" class="pick-btn" data-hero="m"><b>KAEL</b><span>${T('pick_m')}</span></button>
              </div>
              ${btn('settings', 'gear', 'settings')}
              ${btn('help', 'help', 'help')}
              ${btn('about', 'info', 'about')}
              ${btn('cheats', 'cheat', 'cheats')}
            </nav>
            <div class="mm-foot">© ${new Date().getFullYear()} Mtz Games · v1.1</div>
          </div>`;
        markPick();
    }
    function buildMenu() {
        menuEl = document.createElement('div'); menuEl.id = 'menu'; menuEl.className = 'ui-layer';
        api.stage.appendChild(menuEl); renderMenu();
        menuEl.addEventListener('click', e => {
            const b = e.target.closest('[data-act],[data-hero]'); if (!b) return;
            api.AudioSys.init(); api.AudioSys.playLock();
            if (b.dataset.hero) { api.setBody(b.dataset.hero); markPick(); return; }
            const act = b.dataset.act;
            if (act === 'start') { hideMenu(); api.start(); }
            else if (act === 'hero') { const p = menuEl.querySelector('.mm-pick'); p.hidden = !p.hidden; markPick(); }
            else if (act === 'coop') { if (window.AxonNet) window.AxonNet.openLobby(); }
            else openPanel(act);
        });
    }
    function markPick() { menuEl.querySelectorAll('.pick-btn').forEach(b => b.classList.toggle('on', b.dataset.hero === api.bodyType())); }
    function showMenu() {
        api.stage.classList.add('in-menu');
        menuEl.classList.add('show'); markPick();
        if (api.menuMusic) api.menuMusic();              // menu theme (sounds/menumusic.mp3)
        setTimeout(() => { const f = menuEl.querySelector('.mm-btn.primary'); f && f.focus({ preventScroll: true }); }, 50);
    }
    function hideMenu() { menuEl.classList.remove('show'); api.stage.classList.remove('in-menu'); closePanel(); }

    // ---------- pause ----------
    function renderPause() {
        pauseEl.innerHTML = `<div class="pz-card">
            <div class="ax-logo pz-logo">${window.AxonLogo || ''}</div>
            <div class="pz-head"><b>${T('paused')}</b><span>${T('paused_sub')}</span></div>
            <nav class="mm-nav">
              ${btn('resume', 'resume', 'resume', 'primary')}
              ${btn('settings', 'gear', 'settings')}
              ${btn('help', 'help', 'help')}
              ${btn('cheats', 'cheat', 'cheats')}
              ${btn('retry', 'retry', 'restart')}
              ${btn('hq', 'hq', 'back_hq')}
              ${btn('menu', 'home', 'main_menu')}
            </nav></div>`;
    }
    function buildPause() {
        pauseEl = document.createElement('div'); pauseEl.id = 'pause'; pauseEl.className = 'ui-layer';
        renderPause();
        api.stage.appendChild(pauseEl);
        pauseEl.addEventListener('click', e => {
            const b = e.target.closest('[data-act]'); if (!b) return;
            api.AudioSys.playLock();
            const act = b.dataset.act;
            if (act === 'resume') setPaused(false);
            else if (act === 'retry') restart('autostart');
            else if (act === 'hq') restart('hub');
            else if (act === 'menu') restart();
            else openPanel(act);
        });
        $('btn-pause').addEventListener('click', () => { api.AudioSys.init(); setPaused(!paused); });
        window.addEventListener('keydown', e => {
            if (e.code !== 'KeyP' && e.code !== 'Escape') return;
            if (panelEl && panelEl.classList.contains('show')) { closePanel(); return; }
            if (window.AxonShop && window.AxonShop.isOpen) return;          // Esc closes the shop first
            setPaused(!paused);
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden && !paused && api.canPause()) setPaused(true); });
    }
    function setPaused(on) {
        if (on === paused) return;
        if (on && !api.canPause()) return;
        paused = on; api.pause(on);
        pauseEl.classList.toggle('show', on);
        if (!on) closePanel();
        else setTimeout(() => { const f = pauseEl.querySelector('.mm-btn.primary'); f && f.focus({ preventScroll: true }); }, 50);
    }
    // restart the mission (skip straight past the splash) or go back to the main menu
    function restart(to) {             // to: 'autostart' (mission) · 'hub' (HQ) · nothing (main menu)
        const N = window.AxonNet;
        if (N && N.on) { if (to) N.goto(to); else N.leave(); return; }   // co-op: the whole team moves; the main menu = leave the room
        try { sessionStorage.setItem('axon.skipSplash', '1'); if (to) sessionStorage.setItem('axon.' + to, '1'); } catch (e) { }
        location.reload();
    }

    // ---------- panels: settings / help / about ----------
    function panelHTML(kind) {
        const sub = k => I.lang === 'en' ? '' : ` <small>${{ settings: 'SETTINGS', help: 'HOW TO PLAY', about: 'ABOUT', cheats: 'CHEATS' }[k]}</small>`;
        if (kind === 'settings') {
            const row = (id, key) => `<div class="st-row"><span><b>${T(key)}</b></span><button type="button" class="st-val" data-set="${id}"></button></div>`;
            return `<h2>${T('settings')}${sub('settings')}</h2>
              ${row('lang', 'set_lang')}${row('music', 'set_music')}${row('fx', 'set_fx')}${row('bloom', 'set_bloom')}${row('shadow', 'set_shadow')}${row('res', 'set_res')}${row('hero', 'set_hero')}${row('cap', 'set_cap')}${row('fps', 'set_fps')}${row('orient', 'set_orient')}${row('ctl', 'set_ctl')}${row('bench', 'set_bench')}`;
        }
        if (kind === 'cheats') {   // locked: a password box (it opens by itself once the word is typed) · unlocked: three switches
            const C = window.AxonCheats;
            if (!C.unlocked) return `<h2>${T('cheats')}${sub('cheats')}</h2><p class="ch-note">${T('ch_enter')}</p>
              <input class="ch-pw" type="text" data-cheat-pw autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${T('ch_pass')}" aria-label="${T('ch_pass')}">`;
            const sw = (id, key) => `<div class="st-row"><span><b>${T(key)}</b></span><button type="button" class="st-val ch-sw ${C.on(id) ? 'on' : ''}" data-cheat="${id}" aria-pressed="${C.on(id)}">${T(C.on(id) ? 'on' : 'off')}</button></div>`;
            return `<h2>${T('cheats')}${sub('cheats')}</h2><p class="ch-note ok">✓ ${T('ch_ok')}</p>${sw('money', 'ch_money')}${sw('hp', 'ch_hp')}${sw('en', 'ch_en')}`;
        }
        if (kind === 'ctl') return Ctl.html();
        if (kind === 'help') {
            const rows = ['h_stick', 'h_jump', 'h_dash', 'h_slash', 'h_shot', 'h_lock', 'h_items', 'h_shop', 'h_pause'].map(k => { const [a, b] = T(k); return `<div><b>${a}</b><span>${b}</span></div>`; }).join('');
            return `<h2>${T('help')}${sub('help')}</h2><div class="hp-grid">${rows}</div>
            <p class="hp-keys">Keyboard: WASD · Space · Shift · J · K · L · U · I · 1 2 3 · B · P</p>`;
        }
        return `<h2>${T('about')}${sub('about')}</h2>
            <div class="ax-logo ab-game">${window.AxonLogo || ''}</div>
            <div class="ab-logo">${LOGO_SVG}</div>
            <p>${T('about1')}</p>
            <p class="ab-dim">${T('about2')}</p>`;
    }
    function syncSettings() {
        if (!panelEl) return;
        const vals = {
            lang: () => I.NAMES[I.lang],
            fps: () => api.fpsOn() ? T('on') : T('off'),
            cap: () => api.capLabel(),
            bloom: () => api.fxOpt('bloom'), shadow: () => api.fxOpt('shadow'), res: () => api.fxOpt('res'), hero: () => api.fxOpt('hero'),
            music: () => ($('btn-music') && $('btn-music').classList.contains('off')) ? T('off') : T('on'),
            fx: () => { const l = $('fx-label'); if (!l) return 'HI'; const tier = T('q_' + (l.dataset.tier || 'HI'));
                return l.dataset.mode === 'AUTO' ? T('q_auto') + ' · ' + tier : tier; },
            orient: () => ($('orient-label') || {}).textContent || '',
            bench: () => T('bench_go'),
            ctl: () => Ctl.label()
        };
        panelEl.querySelectorAll('[data-set]').forEach(b => { const f = vals[b.dataset.set]; if (f) b.textContent = f(); });
    }
    function openPanel(kind) {
        if (!panelEl) {
            panelEl = document.createElement('div'); panelEl.id = 'ui-panel'; panelEl.className = 'ui-layer';
            api.stage.appendChild(panelEl);
            panelEl.addEventListener('click', e => {
                if (e.target === panelEl || e.target.closest('.pn-close')) { closePanel(); return; }
                const ch = e.target.closest('[data-cheat]');
                if (ch) { window.AxonCheats.toggle(ch.dataset.cheat); api.AudioSys.playLock(); openPanel('cheats'); return; }
                const s = e.target.closest('[data-set]');
                if (e.target.closest('[data-ctl-back]')) { openPanel('settings'); return; }
                if (e.target.closest('[data-ctl-reset]')) { Ctl.reset(); openPanel('ctl'); return; }
                if (s && s.dataset.set === 'ctl') { openPanel('ctl'); return; }
                if (s && s.dataset.set === 'bench') { closePanel(); if (paused) setPaused(false); if (api.bench) api.bench(30); return; }   // 30 s performance capture while you play
                if (s && s.dataset.set === 'lang') { I.next(); return; }
                if (s && s.dataset.set === 'cap') { api.cycleCap(); syncSettings(); return; }
                if (s && (s.dataset.set === 'bloom' || s.dataset.set === 'shadow' || s.dataset.set === 'res' || s.dataset.set === 'hero')) { api.cycleFxOpt(s.dataset.set); syncSettings(); return; }
                if (s && s.dataset.set === 'fps') { api.toggleFps(); syncSettings(); return; }
                if (s) {
                    const map = { music: 'btn-music', fx: 'btn-fx', orient: 'btn-orient' };
                    const b = $(map[s.dataset.set]); b && b.click(); setTimeout(syncSettings, 30);
                }
            });
            panelEl.addEventListener('input', e => {
                const r = e.target.closest('[data-ctl]'); if (r) Ctl.input(r);
                const pw = e.target.closest('[data-cheat-pw]');
                if (pw && window.AxonCheats.tryPass(pw.value)) { pw.blur(); api.AudioSys.playChargeFull(); openPanel('cheats'); }   // the right word: the switches appear
            });
            // typing in the password box must not reach the game's keyboard controls (W A S D, K…)
            ['keydown', 'keyup'].forEach(t => panelEl.addEventListener(t, e => { if (e.target.closest('[data-cheat-pw]')) e.stopPropagation(); }));
            const cs = document.createElement('style');
            cs.textContent = '.ch-note{margin:0 0 10px;font-size:12px;line-height:1.5;color:var(--dim)}.ch-note.ok{color:#5cf0a0;font-weight:700;letter-spacing:.06em}'
                + '.ch-pw{width:100%;box-sizing:border-box;padding:12px 14px;font:700 16px var(--font);letter-spacing:.14em;text-align:center;color:var(--ink);background:rgba(255,255,255,.06);border:1px solid rgba(255,168,38,.5);outline:none}'
                + '.ch-pw:focus{border-color:var(--amber);box-shadow:0 0 0 2px rgba(255,168,38,.25)}.ch-sw.on{color:#06140c;background:#5cf0a0;border-color:#5cf0a0}';
            document.head.appendChild(cs);
        }
        panelKind = kind;
        panelEl.classList.toggle('ctl', kind === 'ctl');
        api.stage.classList.toggle('ctl-preview', kind === 'ctl');
        panelEl.innerHTML = `<div class="pn-card"><button class="pn-close" type="button" aria-label="Close">×</button>${panelHTML(kind)}</div>`;
        panelEl.classList.add('show'); syncSettings();
    }
    function closePanel() { if (panelEl) panelEl.classList.remove('show'); if (api && api.stage) api.stage.classList.remove('ctl-preview'); }

    // ---------- controls size: every on-screen control can be resized on its own, or all together ----------
    // The sizes are CSS variables on #stage (--ui-all, --ui-dash…), multiplied into the base size of each control,
    // so nothing has to be re-laid-out by script. Saved in localStorage ('axon.ctlSize').
    const Ctl = (() => {
        const KEY = 'axon.ctlSize', MIN = 50, MAX = 160, STEP = 5;
        const ITEMS = [                       // id · label key
            ['all', 'ctl_all'], ['joy', 'ctl_joy'], ['dash', 'b_dash'], ['jump', 'b_jump'], ['shoot', 'b_buster'],
            ['atk', 'b_saber'], ['guard', 'b_guard'], ['lock', 'b_lock'], ['slots', 'ctl_slots'], ['top', 'ctl_top']
        ];
        let v = {};
        try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && typeof d === 'object') v = d; } catch (e) { }
        const get = id => { const n = Math.round(+v[id] || 100); return Math.min(MAX, Math.max(MIN, n)); };
        const save = () => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
        const CSS = `
          /* combat pad: base size (--s) × own scale (--k) × global scale */
          #stage .btn{--S:calc(var(--s) * var(--k,1) * var(--ui-all,1));width:var(--S);height:var(--S)}
          #stage .btn svg{width:calc(var(--S) * .44);height:calc(var(--S) * .44)}
          #stage #btn-lock svg{width:calc(var(--S) * .56);height:calc(var(--S) * .56)}
          #stage .btn .lbl{font-size:max(7px,calc(var(--S) * .125))}
          html.rtl-text #stage .btn .lbl{font-size:max(9px,calc(var(--S) * .155))}
          html:lang(zh) #stage .btn .lbl,html:lang(ja) #stage .btn .lbl{font-size:max(8px,calc(var(--S) * .14))}
          #stage #btn-dash{--k:var(--ui-dash,1)} #stage #btn-jump{--k:var(--ui-jump,1)} #stage #btn-shoot{--k:var(--ui-shoot,1)}
          #stage #btn-attack{--k:var(--ui-atk,1)} #stage #btn-lock{--k:var(--ui-lock,1)} #stage #btn-guard{--k:var(--ui-guard,1)}
          #stage #pad{grid-template-columns:repeat(3,auto);grid-template-rows:repeat(2,auto);gap:calc(9px * var(--ui-all,1));align-items:center;justify-items:center}
          /* phone held sideways (short screen): the pad was oversized there — smaller, tighter to the corner */
          #stage.short .btn{--s:58px}
          #stage.short #btn-shoot,#stage.short #btn-attack{--s:64px}
          #stage.short #btn-lock{--s:46px}
          #stage.short #pad{right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom))}
          /* joystick */
          #stage #touch-ui #joy-base{--jb:136px;width:calc(var(--jb) * var(--ui-joy,1) * var(--ui-all,1));height:calc(var(--jb) * var(--ui-joy,1) * var(--ui-all,1))}
          #stage.is-portrait #touch-ui #joy-base{--jb:116px}
          #stage.short #touch-ui #joy-base{--jb:118px}
          #stage #touch-ui #joystick-handle{width:calc(var(--jb) * .4 * var(--ui-joy,1) * var(--ui-all,1));height:calc(var(--jb) * .4 * var(--ui-joy,1) * var(--ui-all,1))}
          /* quick slots */
          #stage #slots .slot{--sw:58px;width:calc(var(--sw) * var(--ui-slots,1) * var(--ui-all,1));height:calc(var(--sw) * 1.07 * var(--ui-slots,1) * var(--ui-all,1))}
          #stage.is-portrait #slots .slot,#stage.short #slots .slot{--sw:50px}
          #stage #slots{gap:calc(8px * var(--ui-slots,1) * var(--ui-all,1))}
          #stage.short #slots{bottom:max(12px,env(safe-area-inset-bottom))}
          #stage.is-portrait #slots{bottom:calc(56px + 134px * var(--ui-all,1) * max(var(--ui-shoot,1),var(--ui-atk,1),var(--ui-jump,1),var(--ui-dash,1)))}
          /* top buttons (pause, shop, zoom, music…) */
          #stage #hud .chip{--t:calc(var(--ui-top,1) * var(--ui-all,1));font-size:calc(12px * var(--t));padding:calc(9px * var(--t)) calc(12px * var(--t))}
          #stage #hud .zoom .chip{padding:calc(8px * var(--t)) calc(10px * var(--t))}
          #stage.short #hud .chip,#stage.is-portrait #hud .chip{font-size:calc(11px * var(--t));padding:calc(7px * var(--t)) calc(9px * var(--t))}
          #stage #hud .chip svg{width:calc(15px * var(--t));height:calc(15px * var(--t))}
          /* live preview while the size panel is open: the controls show above the panel's dimmed backdrop */
          #stage.ctl-preview #touch-ui{display:block!important;z-index:30}
          #stage.ctl-preview #slots{display:flex!important;z-index:30;pointer-events:none}
          #stage.ctl-preview #slots > *,#stage.ctl-preview #pad .btn{pointer-events:none}
          #stage.ctl-preview #joy-base{opacity:1}
          #stage.ctl-preview #btn-lock,#stage.ctl-preview #btn-shoot,#stage.ctl-preview #btn-attack{visibility:visible}
          #ui-panel.ctl{background:rgba(3,8,16,.3);-webkit-backdrop-filter:none;backdrop-filter:none;place-items:start center;padding-top:max(56px,env(safe-area-inset-top))}
          #ui-panel.ctl .pn-card{width:min(400px,46%);max-height:calc(100% - 150px);gap:6px;padding:14px 16px}
          #stage.is-portrait #ui-panel.ctl .pn-card{width:calc(100% - 28px);max-height:calc(100% - 330px)}
          #stage.is-portrait #ui-panel.ctl{padding-top:calc(max(12px,env(safe-area-inset-top)) + 150px)}
          .ctl-hint{margin:0;font-size:11px;color:var(--dim);line-height:1.5}
          .ctl-row{display:grid;grid-template-columns:minmax(80px,auto) 1fr 44px;align-items:center;gap:10px;padding:4px 0}
          .ctl-row b{font-size:13px;font-weight:600}
          .ctl-row.all b{color:var(--amber)}
          .ctl-row input{width:100%;accent-color:var(--cyan);margin:0;touch-action:pan-y;direction:ltr}
          .ctl-row.all input{accent-color:var(--amber)}
          .ctl-row output{font:700 12px var(--font);color:var(--amber);text-align:end;font-variant-numeric:tabular-nums}
          .ctl-foot{display:flex;gap:8px;justify-content:flex-end;padding-top:6px}
          .ctl-foot button{padding:8px 14px;font:700 12px var(--font);letter-spacing:.08em;color:var(--ink);background:rgba(57,215,255,.1);border:1px solid var(--line);cursor:pointer}
          .ctl-foot button[data-ctl-reset]{color:var(--amber);background:rgba(255,168,38,.1);border-color:rgba(255,168,38,.4)}
          html.rtl-text #ui-panel.ctl .pn-card{direction:rtl}
          #stage.short #ui-panel.ctl{padding-top:max(8px,env(safe-area-inset-top))}
          #stage.short #ui-panel.ctl .pn-card{max-height:calc(100% - 120px);padding:10px 14px}
          #stage.short .ctl-row{padding:2px 0}`;
        function apply() {
            if (!api || !api.stage) return;
            ITEMS.forEach(([id]) => api.stage.style.setProperty('--ui-' + id, String(get(id) / 100)));
        }
        return {
            install() {
                if (!document.getElementById('ctl-size-css')) { const st = document.createElement('style'); st.id = 'ctl-size-css'; st.textContent = CSS; document.head.appendChild(st); }
                apply();
            },
            html() {
                const rows = ITEMS.map(([id, key]) => `<label class="ctl-row${id === 'all' ? ' all' : ''}"><b>${T(key)}</b>
                    <input type="range" min="${MIN}" max="${MAX}" step="${STEP}" value="${get(id)}" data-ctl="${id}" aria-label="${T(key)}"><output>${get(id)}%</output></label>`).join('');
                return `<h2>${T('ctl_title')}</h2><p class="ctl-hint">${T('ctl_hint')}</p>${rows}
                    <div class="ctl-foot"><button type="button" data-ctl-reset>${T('ctl_reset')}</button><button type="button" data-ctl-back>${T('ctl_back')}</button></div>`;
            },
            input(r) {
                const id = r.dataset.ctl; v[id] = Math.min(MAX, Math.max(MIN, +r.value || 100));
                const o = r.parentNode.querySelector('output'); if (o) o.textContent = v[id] + '%';
                apply(); save();
            },
            reset() { v = {}; save(); apply(); },
            label() {
                const custom = ITEMS.some(([id]) => id !== 'all' && get(id) !== 100);
                return get('all') + '%' + (custom ? ' · ' + T('ctl_custom') : '');
            }
        };
    })();

    const LOGO_SVG = `<svg viewBox="0 0 120 120" class="mtz-mark" aria-hidden="true">
        <defs><linearGradient id="mtzg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#39d7ff"/><stop offset="1" stop-color="#ffa826"/></linearGradient></defs>
        <path class="hx" d="M60 6l47 27v54L60 114 13 87V33z"/>
        <path class="mz" d="M32 82V40l18 24 10-14 10 14 18-24v42"/>
      </svg>`;

    let panelKind = null;
    I.onChange(() => setTimeout(() => {          // after game.js has relabelled its own controls
        if (menuEl) renderMenu();
        if (pauseEl) renderPause();
        if (panelEl && panelEl.classList.contains('show') && panelKind) openPanel(panelKind);
    }, 0));

    // ---------- tip bar: short briefings shown at the right moment, each only a couple of times ----------
    const TIP_K = { ar: 'تلميح', en: 'TIP', es: 'CONSEJO', zh: '提示', ja: 'ヒント' };
    const TIPS = {
        hq_terminal: { critical: true, n: 2, i: 'screen',
            ar: ['اختيار المهمة', 'امشِ إلى الشاشة الكبيرة وقف داخل الدائرة الذهبية، ثم اضغط "افتح المهام".'],
            en: ['Mission select', 'Walk to the big screen, step into the gold circle, then tap “Open missions”.'],
            es: ['Elegir misión', 'Camina hasta la pantalla grande, entra en el círculo dorado y pulsa “Abrir misiones”.'],
            zh: ['选择任务', '走到大屏幕前，站进金色圆圈，然后点“打开任务”。'],
            ja: ['ミッション選択', '大きなスクリーンまで歩き、金色の円に入って「ミッションを開く」をタップ。'] },
        hq_armory: { critical: true, n: 2, i: 'cart',
            ar: ['المستودع', 'كبسولات الدروع على الجدار الأيمن: اشترِ الإمدادات وطوّر أسلحتك برصيدك.'],
            en: ['Armory', 'The armor pods on the right wall: buy supplies and upgrade your weapons with credits.'],
            es: ['Armería', 'Las cápsulas de la pared derecha: compra suministros y mejora tus armas con créditos.'],
            zh: ['军械库', '右侧墙边的装甲舱：用点数购买补给、升级武器。'],
            ja: ['武器庫', '右の壁のアーマーポッド：クレジットで補給品を買い、武器を強化。'] },
        saves: { critical: true, n: 2, i: 'save',
            ar: ['الحفظ التلقائي', 'رصيدك وتطويراتك تُحفظ تلقائياً، وكل ساحة تنظّفها تصبح نقطة حفظ داخل المهمة.'],
            en: ['Autosave', 'Credits and upgrades save automatically, and every arena you clear becomes a checkpoint.'],
            es: ['Autoguardado', 'Créditos y mejoras se guardan solos, y cada arena despejada es un punto de control.'],
            zh: ['自动保存', '点数和升级会自动保存，每清理一个竞技场就成为一个存档点。'],
            ja: ['オートセーブ', 'クレジットと強化は自動保存。アリーナを制圧するたびにチェックポイントになる。'] },
        lockdown: { critical: true, n: 2, i: 'lock',
            ar: ['ساحات الإغلاق', 'عند دخول أي ساحة تُغلق البوابات حتى تقضي على الموجتين، وتنظيفها يحفظ تقدمك.'],
            en: ['Lockdown arenas', 'Entering an arena seals the gates until both waves are down. Clearing it saves your progress.'],
            es: ['Arenas bloqueadas', 'Al entrar en una arena las puertas se cierran hasta vencer ambas oleadas. Despejarla guarda tu progreso.'],
            zh: ['封锁竞技场', '进入竞技场后大门会关闭，直到消灭两波敌人。清理后会保存进度。'],
            ja: ['ロックダウン', 'アリーナに入るとゲートが閉まり、2つのウェーブを倒すまで開かない。制圧すると進行がセーブされる。'] },
        fall: { critical: true, n: 2, i: 'warn',
            ar: ['لا تسقط', 'إذا سقطت في المعركة تخسر رصيد هذه الجولة وكل ما أنجزته منذ الانطلاق.'],
            en: ["Don't fall", "If you fall in battle, you lose this run's credits and every sector cleared since deploying."],
            es: ['No caigas', 'Si caes en combate pierdes los créditos de esta incursión y los sectores despejados desde el despliegue.'],
            zh: ['不要倒下', '若在战斗中倒下，将失去本次出击获得的点数和已清理的区域。'],
            ja: ['倒れるな', '戦闘で倒れると、今回の出撃で得たクレジットと制圧したセクターを失う。'] },
        retreat: { critical: true, n: 3, i: 'home',
            ar: ['يمكنك الانسحاب', 'تقدمك محفوظ. من زر الإيقاف ⏸ اختر "العودة للمقر" لتطوّر عتادك، وستكمل من هنا.'],
            en: ['You can pull back', 'Progress saved. Pause ⏸ → “Return to HQ” to upgrade your gear — you will resume right here.'],
            es: ['Puedes retirarte', 'Progreso guardado. Pausa ⏸ → “Volver al cuartel” para mejorar tu equipo; continuarás aquí.'],
            zh: ['可以撤退', '进度已保存。暂停 ⏸ →“返回总部”升级装备，回来时从这里继续。'],
            ja: ['撤退できる', '進行はセーブ済み。一時停止 ⏸ →「司令部へ戻る」で装備を強化し、ここから再開できる。'] },
        energy: { n: 2, i: 'bolt',
            ar: ['نفدت الطاقة', 'الطاقة تتجدد بعد لحظة من التوقف عن الإطلاق، أو استخدم خلية الطاقة من الخانة 2.'],
            en: ['Out of energy', 'Energy refills shortly after you stop firing — or use an energy cell from slot 2.'],
            es: ['Sin energía', 'La energía se recarga al dejar de disparar, o usa una célula de energía de la ranura 2.'],
            zh: ['能量耗尽', '停止射击片刻后能量会恢复，也可以使用2号栏的能量电池。'],
            ja: ['エネルギー切れ', '撃つのをやめると回復する。スロット2のエネルギーセルも使える。'] },
        dodge: { n: 2, i: 'dash',
            ar: ['تفادَ الهجمات', 'أثناء الاندفاع بزر DASH لا تُصاب، والقفز يعبر فوق الكرات الحمراء.'],
            en: ['Dodge', 'You are untouchable mid-DASH, and jumping clears the red orbs.'],
            es: ['Esquiva', 'Durante el DASH eres invulnerable, y saltar esquiva los orbes rojos.'],
            zh: ['闪避', '冲刺过程中无敌，跳跃可以躲过红色光球。'],
            ja: ['回避', 'ダッシュ中は無敵。ジャンプで赤い弾をかわせる。'] },
        traps: { critical: true, n: 2, i: 'warn',
            ar: ['ممر العقبات', 'اقفز بين المنصات فوق الهاوية، والسقوط يعني الموت. الدبابيس تتوهج قبل أن تخرج، والأسطوانات الشائكة اقفز فوقها.'],
            en: ['Gauntlet', 'Jump the platforms over the abyss — falling is fatal. Spikes glow before they strike; jump the spiked rollers.'],
            es: ['Recorrido', 'Salta entre las plataformas sobre el abismo: caer es mortal. Los pinchos brillan antes de salir; salta los rodillos.'],
            zh: ['障碍通道', '在深渊上的平台间跳跃，掉下去必死。尖刺弹出前会发光，带刺滚筒要跳过去。'],
            ja: ['障害コース', '奈落の上の足場を跳び移れ。落ちたら終わりだ。スパイクは出る前に光る。トゲのローラーは飛び越えろ。'] },
        boss: { critical: true, n: 2, i: 'warn', urgent: true,
            ar: ['الحارس', 'راقب توهجه قبل الاندفاع، واقفز أو اندفع عبر موجة الصدمة الأرضية.'],
            en: ['The guardian', 'Watch for the glow before it charges, and jump or dash through its ground shockwave.'],
            es: ['El guardián', 'Atento al brillo antes de su embestida; salta o usa DASH para cruzar su onda de choque.'],
            zh: ['守卫', '注意它冲锋前的发光，跳跃或冲刺穿过地面冲击波。'],
            ja: ['ガーディアン', '突進前の発光に注意。地面の衝撃波はジャンプかダッシュで抜けろ。'] }
    };
    const TIP_ICON = {
        screen: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
        cart: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
        lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
        home: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
        bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
        dash: '<path d="M9 5l9 7-9 7 2.5-7z"/><path d="M2 9h6M1 12h7M2 15h6"/>'
    };
    let tipEl = null, tipQ = [], tipBusy = false, tipT = 0;
    const tipCount = id => { try { return +(JSON.parse(localStorage.getItem('axon.tips') || '{}')[id] || 0); } catch (e) { return 9; } };
    const tipUnmark = id => { try { const d = JSON.parse(localStorage.getItem('axon.tips') || '{}'); d[id] = Math.max(0, (d[id] || 1) - 1); localStorage.setItem('axon.tips', JSON.stringify(d)); } catch (e) { } };
    const tipMark = id => { try { const d = JSON.parse(localStorage.getItem('axon.tips') || '{}'); d[id] = (d[id] || 0) + 1; localStorage.setItem('axon.tips', JSON.stringify(d)); } catch (e) { } };
    function tipBuild() {
        const st = document.createElement('style');
        st.textContent = `#tipbar{position:absolute;z-index:13;left:50%;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 84px);width:min(420px,48%);box-sizing:border-box;
            display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:10px 10px 12px 12px;opacity:0;transform:translate(-50%,14px);pointer-events:none;
            transition:opacity .28s,transform .28s;background:linear-gradient(100deg,rgba(8,22,40,.95),rgba(8,22,40,.84));border:1px solid rgba(57,215,255,.26);
            border-inline-start:3px solid var(--cyan);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px));font-family:var(--font)}
          #tipbar.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
          #tipbar.warn{border-inline-start-color:var(--magenta)}
          #tipbar .ti{width:30px;height:30px;display:grid;place-items:center;border:1px solid rgba(57,215,255,.4);background:rgba(57,215,255,.08);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
          #tipbar.warn .ti{border-color:rgba(255,42,109,.5);background:rgba(255,42,109,.1)}
          #tipbar .ti svg{width:16px;height:16px;fill:none;stroke:var(--cyan);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
          #tipbar.warn .ti svg{stroke:var(--magenta)}
          #tipbar .tx{display:grid;gap:2px;min-width:0}
          #tipbar .tk{font-size:9px;letter-spacing:.35em;color:var(--cyan)}
          #tipbar.warn .tk{color:var(--magenta)}
          #tipbar b{font-size:14px;color:var(--ink)}
          #tipbar p{margin:0;font-size:12.5px;line-height:1.55;color:#b7c6d6}
          #tipbar button{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:var(--dim);font-size:13px;cursor:pointer;padding:0}
          #tipbar i.tp{position:absolute;left:0;bottom:0;height:2px;width:100%;background:var(--cyan);transform-origin:0 50%}
          #tipbar.warn i.tp{background:var(--magenta)}
          #tipbar.show i.tp{animation:tipTime var(--d,7s) linear forwards}
          @keyframes tipTime{from{transform:scaleX(1)}to{transform:scaleX(0)}}
          #tipbar.urgent{bottom:auto;top:calc(max(10px,env(safe-area-inset-top)) + 56px);width:min(400px,46%);padding:6px 8px 8px 10px;gap:8px;align-items:center;background:rgba(8,22,40,.78)}
          #tipbar.urgent .ti{width:24px;height:24px}
          #tipbar.urgent .tk{display:none}
          #tipbar.urgent b{font-size:12px}
          #tipbar.urgent p{font-size:11.5px;line-height:1.4}
          #stage.in-hub #tipbar{bottom:auto;top:calc(max(12px,env(safe-area-inset-top)) + 64px)}
          #stage.is-portrait #tipbar{width:calc(100% - 32px);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 200px)}
          #stage.in-menu #tipbar{display:none}
          #overlay:not([hidden]) ~ #tipbar{display:none}
          @media (prefers-reduced-motion:reduce){#tipbar{transition:none}#tipbar.show i.tp{animation:none}}`;
        document.head.appendChild(st);
        tipEl = document.createElement('div'); tipEl.id = 'tipbar'; tipEl.setAttribute('role', 'status');
        api.stage.appendChild(tipEl);
        tipEl.addEventListener('click', e => { if (e.target.closest('button')) tipHide(); });
    }
    function tipHide() { clearTimeout(tipT); clearInterval(tipWatch); if (!tipEl) return; tipEl.classList.remove('show'); tipT = setTimeout(() => { tipBusy = false; tipNext(); }, 450); }
    // tips never cover a fight: they wait until no enemy is close, no arena is locked and he hasn't been hit
    // for a few seconds (the countdown before a mission is the ideal moment). Only 'urgent' ones (the guardian)
    // show during combat, as a slim strip at the top edge. A calm tip that gets interrupted steps aside and returns later.
    let tipWait = 0, tipWatch = 0;
    const calm = () => !api.calm || api.calm();
    function tipNext() {
        if (tipBusy || !tipQ.length) return;
        if (tpEl && tpEl.classList.contains('show')) { clearTimeout(tipWait); tipWait = setTimeout(tipNext, 700); return; }
        const c = calm(), k = tipQ.findIndex(id => c || TIPS[id].urgent);
        if (k < 0) { clearTimeout(tipWait); tipWait = setTimeout(tipNext, 700); return; }
        const id = tipQ.splice(k, 1)[0], d = TIPS[id], L = I.lang, txt = d[L] || d.en, dur = (d.urgent ? 5 : 7) + txt[1].length / 40;
        if (!tipEl) tipBuild();
        tipBusy = true; tipMark(id);
        tipEl.className = (d.i === 'warn' ? 'warn' : '') + (d.urgent ? ' urgent' : '');
        clearInterval(tipWatch);
        if (!d.urgent) tipWatch = setInterval(() => {
            if (calm() || !tipEl.classList.contains('show')) return;
            clearInterval(tipWatch); tipUnmark(id); if (!tipQ.includes(id)) tipQ.unshift(id); tipHide();
        }, 250);
        tipEl.dir = L === 'ar' ? 'rtl' : 'ltr';
        tipEl.style.setProperty('--d', dur + 's');
        tipEl.innerHTML = `<span class="ti"><svg viewBox="0 0 24 24" aria-hidden="true">${TIP_ICON[d.i]}</svg></span>
            <span class="tx"><span class="tk">${TIP_K[L] || TIP_K.en}</span><b>${txt[0]}</b><p>${txt[1]}</p></span>
            <button type="button" aria-label="✕">✕</button><i class="tp"></i>`;
        requestAnimationFrame(() => tipEl.classList.add('show'));
        tipT = setTimeout(tipHide, dur * 1000);
    }
    // queue a tip by id; ignored once it has been shown its allotted number of times (remembered on the device)
    function tip(id) {
        const d = TIPS[id]; if (!d) return;
        if (!tipRead.has(id) && !tipNew.includes(id)) { tipNew.push(id); tipSaveSets(); chipSync(); }
        // important and never read: open it right away, game frozen, so it can't be missed
        if (d.critical && !tipRead.has(id) && !brief.includes(id)) { brief.push(id); briefSoon(350); }
        if (!tipAuto || tipQ.includes(id) || tipCount(id) >= d.n) return;
        tipQ.push(id); setTimeout(tipNext, 400);
    }

    // ---------- the "i" chip + tips panel: open any time; the game freezes while it is open ----------
    const TIP_ORDER = ['hq_terminal', 'hq_armory', 'saves', 'lockdown', 'fall', 'traps', 'retreat', 'energy', 'dodge', 'boss'];
    const TP = {
        head: { ar: 'التعليمات', en: 'Field guide', es: 'Guía', zh: '指南', ja: 'ガイド' },
        auto: { ar: 'إظهار التلميحات تلقائياً أثناء اللعب', en: 'Show tips automatically while playing', es: 'Mostrar consejos automáticamente', zh: '游戏中自动显示提示', ja: 'プレイ中に自動でヒントを表示' },
        fresh: { ar: 'جديد', en: 'NEW', es: 'NUEVO', zh: '新', ja: 'NEW' },
        must: { ar: 'تعليمات مهمة', en: 'Important briefing', es: 'Instrucciones importantes', zh: '重要说明', ja: '重要な説明' },
        next: { ar: 'التالي', en: 'Next', es: 'Siguiente', zh: '下一条', ja: '次へ' },
        ok: { ar: 'فهمت، متابعة ✓', en: 'Got it — continue ✓', es: 'Entendido, continuar ✓', zh: '明白，继续 ✓', ja: '了解、続ける ✓' },
        paused: { ar: 'اللعبة متوقفة', en: 'Game paused', es: 'Juego en pausa', zh: '游戏已暂停', ja: '一時停止中' }
    };
    const tl = k => TP[k][I.lang] || TP[k].en;
    let tipAuto = false, tipNew = [], tipRead = new Set(), tpEl = null, tpIdx = 0, chip = null;
    try { tipAuto = localStorage.getItem('axon.tipAuto') === '1'; tipNew = JSON.parse(localStorage.getItem('axon.tipsNew') || '[]'); tipRead = new Set(JSON.parse(localStorage.getItem('axon.tipsRead') || '[]')); } catch (e) { }
    function tipSaveSets() { try { localStorage.setItem('axon.tipsNew', JSON.stringify(tipNew)); localStorage.setItem('axon.tipsRead', JSON.stringify([...tipRead])); } catch (e) { } }
    function chipSync() {
        if (!chip) return;
        const n = tipNew.length; chip.classList.toggle('has-new', n > 0);
        chip.querySelector('b').textContent = n ? n : '';
    }
    function buildTipsUI() {
        const st = document.createElement('style');
        st.textContent = `#btn-tips{position:relative;width:38px;height:38px;padding:0;border:0;background:none;clip-path:none;border-radius:50%;display:grid;place-items:center;flex:none}
          #btn-tips .ring{position:absolute;inset:0;border-radius:50%;padding:2px;box-sizing:border-box;
            background:linear-gradient(145deg,#b9a468,#4a3f22 45%,#a8925a 70%,#5b4c26)}
          #btn-tips .core{position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:50%;overflow:hidden;
            background:radial-gradient(circle at 35% 28%,#1f3a5c,#081322 68%);box-shadow:inset 0 2px 3px rgba(255,255,255,.12),inset 0 -3px 6px rgba(0,0,0,.6)}
          #btn-tips svg{width:22px;height:22px;fill:none;stroke:#e8dcb4;stroke-width:3;stroke-linecap:round}
          #btn-tips svg .dot{fill:#e8dcb4;stroke:none}
          #btn-tips b{position:absolute;top:-5px;inset-inline-end:-6px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;
            font:800 11px/18px var(--font);color:#2a1600;text-align:center;display:none;
            background:linear-gradient(180deg,#fff4c2,#ffc93c 55%,#d18f12);box-shadow:0 0 8px rgba(255,190,50,.9),0 1px 0 #7a4d00}
          /* something new to read: polished gold ring, a light sweep across it, and a beacon pulse */
          #btn-tips.has-new b{display:block;animation:tipsBadge 1.2s ease-in-out infinite}
          #btn-tips.has-new .ring{background:linear-gradient(135deg,#fffbe6 0%,#ffe07a 18%,#e0a21c 40%,#fff3bf 55%,#f2b72a 72%,#9a650a 100%);animation:tipsRing 1.2s ease-in-out infinite}
          #btn-tips.has-new svg{stroke:url(#tipsGold)}
          #btn-tips.has-new svg .dot{fill:url(#tipsGold)}
          #btn-tips.has-new .core::after{content:'';position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,244,200,.75) 50%,transparent 58%);animation:tipsShine 2.2s ease-in-out infinite}
          #btn-tips.has-new::after{content:'';position:absolute;inset:-2px;border-radius:50%;border:2px solid #ffd35a;animation:tipsBeacon 1.2s ease-out infinite;pointer-events:none}
          @keyframes tipsRing{0%,100%{transform:scale(1);filter:drop-shadow(0 0 3px rgba(255,200,60,.6))}50%{transform:scale(1.1);filter:drop-shadow(0 0 10px rgba(255,210,80,1))}}
          @keyframes tipsBeacon{0%{transform:scale(1);opacity:.95}100%{transform:scale(1.9);opacity:0}}
          @keyframes tipsShine{0%,35%{transform:translateX(-70%)}75%,100%{transform:translateX(70%)}}
          @keyframes tipsBadge{50%{transform:translateY(-2px) scale(1.08)}}
          @media (prefers-reduced-motion:reduce){#btn-tips.has-new .ring,#btn-tips.has-new::after,#btn-tips.has-new .core::after,#btn-tips.has-new b{animation:none}}
          #tips-panel{z-index:29;display:grid;place-items:center;background:rgba(3,8,16,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
          .tp-card{position:relative;width:min(520px,92%);max-height:92%;overflow:auto;box-sizing:border-box;padding:16px 18px;display:grid;gap:12px;
            background:linear-gradient(160deg,rgba(20,40,64,.94),rgba(8,16,30,.97));border:1px solid rgba(57,215,255,.3);
            clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
          .tp-head{display:flex;align-items:baseline;gap:10px;padding-inline-end:44px}
          .tp-head h2{margin:0;font-size:19px}
          .tp-head small{font-size:10px;letter-spacing:.3em;color:var(--dim)}
          .tp-body{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;min-height:108px;padding:14px;background:rgba(255,255,255,.035);border:1px solid rgba(57,215,255,.14);border-inline-start:3px solid var(--cyan)}
          .tp-body.warn{border-inline-start-color:var(--magenta)}
          .tp-body .ti{width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(57,215,255,.4);background:rgba(57,215,255,.08);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
          .tp-body.warn .ti{border-color:rgba(255,42,109,.5);background:rgba(255,42,109,.1)}
          .tp-body .ti svg{width:22px;height:22px;fill:none;stroke:var(--cyan);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
          .tp-body.warn .ti svg{stroke:var(--magenta)}
          .tp-body b{display:flex;align-items:center;gap:8px;font-size:16px}
          .tp-body b i{font:700 9px/1 var(--font);font-style:normal;letter-spacing:.2em;padding:4px 6px;color:#1a0d00;background:var(--amber)}
          .tp-body p{margin:6px 0 0;font-size:13.5px;line-height:1.7;color:#c3d0de}
          .tp-nav{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}
          .tp-nav button{width:42px;height:42px;font:700 18px/1 var(--font);color:var(--ink);background:rgba(57,215,255,.08);border:1px solid rgba(57,215,255,.35);cursor:pointer;
            clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
          .tp-nav button:disabled{opacity:.3;cursor:default}
          .tp-dots{display:flex;justify-content:center;flex-wrap:wrap;gap:6px}
          .tp-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.18);cursor:pointer}
          .tp-dots i.new{background:var(--amber)}
          .tp-dots i.on{background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
          .tp-auto{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12.5px;color:var(--dim);padding-top:8px;border-top:1px solid rgba(255,255,255,.07)}
          .tp-auto button{min-width:70px;padding:7px 10px;font:700 12px var(--font);letter-spacing:.1em;color:var(--amber);background:rgba(255,168,38,.1);border:1px solid rgba(255,168,38,.4);cursor:pointer}
          .tp-card.brief{border-color:rgba(255,190,60,.45)}
          .tp-card.brief .tp-head h2{color:#ffd35a;text-shadow:0 0 14px rgba(255,190,60,.45)}
          .tp-seg{display:flex;gap:5px}
          .tp-seg i{flex:1;height:4px;background:rgba(255,255,255,.12);transition:background .3s}
          .tp-seg i.done{background:rgba(255,200,70,.55)}
          .tp-seg i.on{background:#ffd35a;box-shadow:0 0 8px rgba(255,200,70,.8)}
          .tp-body.inf{animation:tpInF .34s cubic-bezier(.2,.8,.25,1)}
          .tp-body.inb{animation:tpInB .34s cubic-bezier(.2,.8,.25,1)}
          [dir=rtl] .tp-body.inf{animation-name:tpInB}
          [dir=rtl] .tp-body.inb{animation-name:tpInF}
          @keyframes tpInF{from{opacity:0;transform:translateX(34px)}to{opacity:1;transform:none}}
          @keyframes tpInB{from{opacity:0;transform:translateX(-34px)}to{opacity:1;transform:none}}
          .tp-bnav{display:grid;grid-template-columns:auto 1fr;gap:10px}
          .tp-bnav button{height:44px;min-width:44px;font:700 15px/1 var(--font);color:var(--ink);background:rgba(57,215,255,.08);border:1px solid rgba(57,215,255,.35);cursor:pointer;
            clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
          .tp-bnav .go{position:relative;overflow:hidden;color:#1a0d00;letter-spacing:.06em;background:linear-gradient(180deg,#ffe28a,#ffb627);border:0}
          .tp-bnav .go i{position:absolute;inset-inline-start:0;bottom:0;height:3px;width:100%;background:rgba(80,40,0,.55);transform-origin:0 50%;animation:tpRead var(--rt,3s) linear forwards}
          [dir=rtl] .tp-bnav .go i{transform-origin:100% 50%}
          @keyframes tpRead{from{transform:scaleX(0)}to{transform:scaleX(1)}}
          @media (prefers-reduced-motion:reduce){.tp-body.inf,.tp-body.inb,.tp-bnav .go i{animation:none}}
          #stage.short .tp-card{padding:12px 14px;gap:8px}
          #stage.short .tp-body{min-height:0;padding:10px}`;
        document.head.appendChild(st);
        const sys = document.querySelector('.sys');
        chip = document.createElement('button'); chip.type = 'button'; chip.className = 'chip'; chip.id = 'btn-tips'; chip.setAttribute('aria-label', 'Tips');
        chip.innerHTML = '<span class="ring"><span class="core"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tipsGold" gradientUnits="userSpaceOnUse" x1="8" y1="4" x2="16" y2="20"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#ffc93c"/><stop offset="1" stop-color="#c98a12"/></linearGradient></defs><path d="M12 10.5v7.5"/><circle cx="12" cy="6.4" r="1.6" class="dot"/></svg></span></span><b></b>';
        if (sys) sys.insertBefore(chip, sys.firstChild);
        chip.addEventListener('click', () => { api.AudioSys.init(); tipsOpen(); });
        tpEl = document.createElement('div'); tpEl.id = 'tips-panel'; tpEl.className = 'ui-layer'; api.stage.appendChild(tpEl);
        tpEl.addEventListener('click', e => {
            const b = e.target.closest('[data-tp]');
            if (bMode) { if (b) briefStep(b.dataset.tp === 'bprev' ? -1 : 1); return; }   // no backdrop close: read them through
            if (e.target === tpEl || (b && b.dataset.tp === 'x')) { tipsClose(); return; }
            if (!b) return;
            api.AudioSys.playLock();
            if (b.dataset.tp === 'prev') tpIdx = Math.max(0, tpIdx - 1);
            else if (b.dataset.tp === 'next') tpIdx = Math.min(TIP_ORDER.length - 1, tpIdx + 1);
            else if (b.dataset.tp === 'auto') { tipAuto = !tipAuto; try { localStorage.setItem('axon.tipAuto', tipAuto ? '1' : '0'); } catch (err) { } }
            else if (b.dataset.i) tpIdx = +b.dataset.i;
            tipsRender();
        });
        window.addEventListener('keydown', e => {
            if (bMode && tpEl.classList.contains('show')) {
                if (['Enter', 'Space', 'Escape', 'KeyI'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) briefStep(1); }
                else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.stopImmediatePropagation(); briefStep((e.code === 'ArrowRight') !== (I.lang === 'ar') ? 1 : -1); }
                return;
            }
            if (e.code === 'KeyI' && !e.repeat) { tpEl.classList.contains('show') ? tipsClose() : tipsOpen(); }
            else if (tpEl.classList.contains('show')) {
                if (e.code === 'Escape') { e.stopImmediatePropagation(); tipsClose(); }
                else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { tpIdx = Math.max(0, Math.min(TIP_ORDER.length - 1, tpIdx + ((e.code === 'ArrowRight') !== (I.lang === 'ar') ? 1 : -1))); tipsRender(); }
            }
        }, true);
        I.onChange(() => { if (tpEl.classList.contains('show')) tipsRender(); });
        chipSync();
    }
    // ---------- briefing: every important tip not read yet is collected (several often fire together, e.g. on
    // entering HQ) and shown back to back in one frozen panel — Next, Next, Continue — so none is ever lost.
    // It waits for a safe moment: not during a loading screen, a menu, or while dead. ----------
    let brief = [], briefT = 0, bMode = false, bList = [], bIdx = 0, bDir = 1;
    const ldOn = () => { const l = document.getElementById('ldx'); return !!(l && l.classList.contains('on')) || !!document.getElementById('boot'); };
    function briefSoon(ms) { clearTimeout(briefT); briefT = setTimeout(briefTry, ms); }
    function briefTry() {
        brief = brief.filter(id => !tipRead.has(id)); if (!brief.length || !tpEl) return;
        if (tpEl.classList.contains('show')) { if (bMode) { brief.forEach(id => bList.includes(id) || bList.push(id)); tipsRender(); } else briefSoon(600); return; }
        if (ldOn() || (api.canFreeze && !api.canFreeze())) { briefSoon(500); return; }
        bList = brief.slice().sort((a, b) => TIP_ORDER.indexOf(a) - TIP_ORDER.indexOf(b)); bIdx = 0; bDir = 1; bMode = true;
        tipsOpen();
    }
    function briefStep(dir) {
        if (dir > 0 && bIdx >= bList.length - 1) { tipsClose(); return; }
        bDir = dir; bIdx = Math.max(0, Math.min(bList.length - 1, bIdx + dir)); api.AudioSys.playLock(); tipsRender();
    }
    function briefRender() {
        const id = bList[bIdx], d = TIPS[id], L = I.lang, txt = d[L] || d.en, last = bIdx === bList.length - 1, rt = L === 'ar';
        tipRead.add(id); tipNew = tipNew.filter(x => x !== id); brief = brief.filter(x => x !== id); tipSaveSets(); chipSync();
        tpEl.innerHTML = `<div class="tp-card brief" role="dialog" aria-label="${tl('must')}" dir="${rt ? 'rtl' : 'ltr'}">
            <div class="tp-head"><h2>${tl('must')}</h2><small>${tl('paused')} · ${bIdx + 1}/${bList.length}</small></div>
            <div class="tp-seg">${bList.map((t, k) => `<i class="${k < bIdx ? 'done' : k === bIdx ? 'on' : ''}"></i>`).join('')}</div>
            <div class="tp-body ${d.i === 'warn' ? 'warn' : ''} in${bDir > 0 ? 'f' : 'b'}"><span class="ti"><svg viewBox="0 0 24 24" aria-hidden="true">${TIP_ICON[d.i]}</svg></span>
              <div><b>${txt[0]}</b><p>${txt[1]}</p></div></div>
            <div class="tp-bnav">${bIdx ? `<button type="button" data-tp="bprev" aria-label="‹">${rt ? '›' : '‹'}</button>` : '<span></span>'}
              <button type="button" class="go" data-tp="bnext" style="--rt:${readTime(txt)}s">${last ? tl('ok') : tl('next') + ' ' + (rt ? '‹' : '›')}<i></i></button></div></div>`;
    }
    function tipsRender() {
        if (bMode) { briefRender(); return; }
        const id = TIP_ORDER[tpIdx], d = TIPS[id], L = I.lang, txt = d[L] || d.en;
        if (!tipRead.has(id)) { tipRead.add(id); tipNew = tipNew.filter(x => x !== id); tipSaveSets(); chipSync(); }
        const wasNew = tpEl.dataset.fresh && tpEl.dataset.fresh.split(',').includes(id);
        tpEl.innerHTML = `<div class="tp-card" role="dialog" aria-label="${tl('head')}" dir="${L === 'ar' ? 'rtl' : 'ltr'}">
            <div class="tp-head"><h2>${tl('head')}</h2><small>${tl('paused')} · ${tpIdx + 1}/${TIP_ORDER.length}</small></div>
            <button type="button" class="pn-close" data-tp="x" aria-label="✕">✕</button>
            <div class="tp-body ${d.i === 'warn' ? 'warn' : ''}"><span class="ti"><svg viewBox="0 0 24 24" aria-hidden="true">${TIP_ICON[d.i]}</svg></span>
              <div><b>${txt[0]}${wasNew ? ` <i>${tl('fresh')}</i>` : ''}</b><p>${txt[1]}</p></div></div>
            <div class="tp-nav"><button type="button" data-tp="prev" ${tpIdx ? '' : 'disabled'} aria-label="‹">${L === 'ar' ? '›' : '‹'}</button>
              <div class="tp-dots">${TIP_ORDER.map((t, k) => `<i data-tp="dot" data-i="${k}" class="${k === tpIdx ? 'on' : ''} ${tpEl.dataset.fresh && tpEl.dataset.fresh.split(',').includes(t) && k !== tpIdx ? 'new' : ''}"></i>`).join('')}</div>
              <button type="button" data-tp="next" ${tpIdx < TIP_ORDER.length - 1 ? '' : 'disabled'} aria-label="›">${L === 'ar' ? '‹' : '›'}</button></div>
            <div class="tp-auto"><span>${tl('auto')}</span><button type="button" data-tp="auto">${tipAuto ? T('on') : T('off')}</button></div></div>`;
    }
    function tipsOpen(focus) {
        if (!tpEl || tpEl.classList.contains('show') || (api.canFreeze && !api.canFreeze())) return;
        tpEl.dataset.fresh = tipNew.join(',');
        const first = typeof focus === 'string' ? TIP_ORDER.indexOf(focus) : TIP_ORDER.findIndex(id => tipNew.includes(id)); if (first >= 0) tpIdx = first;
        if (tipEl) { tipEl.classList.remove('show'); }
        api.freeze && api.freeze(true); tipsRender(); tpEl.classList.add('show'); api.AudioSys.playLock();
    }
    function tipsClose() {
        if (!tpEl || !tpEl.classList.contains('show')) return; tpEl.classList.remove('show'); bMode = false;
        api.freeze && api.freeze(false); api.AudioSys.playLock(); if (brief.length) briefSoon(700);
    }

    // ---------- smart loading: a short briefing screen whenever you travel (HQ ↔ mission). Its length follows
    // how much there is to read (≈ 1.6 s + 1 s per 28 characters, 2.4–4.2 s); heavy work runs behind it ----------
    const LD = {
        deploy: { ar: 'الانطلاق إلى المهمة', en: 'DEPLOYING', es: 'DESPLEGANDO', zh: '部署中', ja: '出撃' },
        to_hq: { ar: 'العودة إلى المقر', en: 'RETURNING TO HQ', es: 'VOLVIENDO AL CUARTEL', zh: '返回总部', ja: '司令部へ帰還' },
        retry: { ar: 'إعادة الانتشار', en: 'REDEPLOYING', es: 'REDESPLEGANDO', zh: '重新部署', ja: '再出撃' }
    };
    const POOL = { deploy: ['lockdown', 'fall', 'traps', 'dodge', 'energy'], retry: ['fall', 'dodge', 'traps', 'energy', 'lockdown'], to_hq: ['hq_armory', 'saves', 'retreat', 'hq_terminal'], menu: ['saves', 'hq_terminal', 'dodge'] };
    let poolK = {};
    const pickTip = ctx => { const P = POOL[ctx] || POOL.menu; poolK[ctx] = ((poolK[ctx] ?? Math.floor(Math.random() * P.length)) + 1) % P.length; const d = TIPS[P[poolK[ctx]]]; return d[I.lang] || d.en; };
    const readTime = txt => Math.max(2.4, Math.min(4.2, 1.6 + (txt[0].length + txt[1].length) / 28));
    let ldEl = null;
    function loading({ title, sub, ctx = 'deploy', mid, done }) {
        if (!ldEl) {
            const st = document.createElement('style');
            st.textContent = `#ldx{position:absolute;inset:0;z-index:45;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 40%,#0a1a2e,#02060c 75%);opacity:0;pointer-events:none;transition:opacity .35s}
              #ldx.on{opacity:1;pointer-events:auto}
              #ldx .lc{width:min(520px,86%);display:grid;gap:12px;text-align:center}
              #ldx small{font-size:11px;letter-spacing:.45em;color:var(--cyan)}
              #ldx h2{margin:0;font:700 clamp(26px,6.5vmin,46px)/1.05 var(--font);letter-spacing:.08em;text-shadow:0 0 24px rgba(57,215,255,.35)}
              #ldx h2 em{font-style:normal;color:var(--amber)}
              #ldx .bar{height:5px;background:rgba(57,215,255,.12);overflow:hidden;clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)}
              #ldx .bar{position:relative}
              #ldx .bar i{display:block;height:100%;transform-origin:0 50%;transform:scaleX(0);transition:transform var(--t,.4s) cubic-bezier(.25,.7,.3,1);background:linear-gradient(90deg,var(--cyan),var(--amber))}
              #ldx .bar::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);width:30%;animation:ldxSheen 1.1s linear infinite}
              [dir=rtl] #ldx .bar i{transform-origin:100% 50%}
              @keyframes ldxSheen{from{transform:translateX(-100%)}to{transform:translateX(340%)}}
              #ldx .tipc{display:grid;gap:4px;margin-top:6px;padding:12px 14px;background:rgba(255,255,255,.04);border-inline-start:3px solid var(--amber);text-align:start}
              #ldx .tipc span{font-size:10px;letter-spacing:.35em;color:var(--amber)}
              #ldx .tipc b{font-size:14px}
              #ldx .tipc p{margin:0;font-size:13px;line-height:1.65;color:#b7c6d6}
              @media (prefers-reduced-motion:reduce){#ldx .bar::after{animation:none}}`;
            document.head.appendChild(st);
            ldEl = document.createElement('div'); ldEl.id = 'ldx'; api.stage.appendChild(ldEl);
        }
        const txt = pickTip(ctx), L = I.lang, t0 = performance.now(), MIN = 5000;
        ldEl.innerHTML = `<div class="lc" dir="${L === 'ar' ? 'rtl' : 'ltr'}"><div class="ax-logo ldx-logo">${window.AxonLogo || ''}</div><small>${sub || ''}</small><h2>${title}</h2><div class="bar"><i></i></div>
            <div class="tipc"><span>${TIP_K[L] || TIP_K.en}</span><b>${txt[0]}</b><p>${txt[1]}</p></div></div>`;
        ldEl.classList.remove('on'); void ldEl.offsetWidth; ldEl.classList.add('on');
        // a studio-style trip: fade to the briefing (0.35 s) → swap the world while it's opaque → draw a few frames
        // of the new scene behind it (shaders, shadows, first-frame hitches) → at least 5 s on screen so the tip is
        // read in full → bar completes → fade out. The bar follows those real steps.
        const bar = ldEl.querySelector('.bar i'), fill = (k, t) => { bar.style.setProperty('--t', t + 's'); bar.style.transform = `scaleX(${k})`; };
        requestAnimationFrame(() => fill(0.15, 0.35));
        setTimeout(() => {
            mid && mid(); fill(0.35, 1.2);                                         // swap worlds while the screen is opaque
            let n = 0; const warm = () => {
                if (n++ < 4) { requestAnimationFrame(warm); return; }
                const left = Math.max(0, MIN - (performance.now() - t0));
                fill(0.9, Math.max(0.3, left / 1000 - 0.35));
                setTimeout(() => { fill(1, 0.3); setTimeout(() => { ldEl.classList.remove('on'); done && done(); }, 380); }, Math.max(0, left - 350));
            };
            requestAnimationFrame(warm);
        }, 380);
    }
    const ldLabel = ctx => (LD[ctx] && (LD[ctx][I.lang] || LD[ctx].en)) || '';


    // ---------- 3 · 2 · 1 · GO before a mission: the game stays frozen until GO ----------
    const CD = { ready: { ar: 'استعد', en: 'GET READY', es: 'PREPÁRATE', zh: '准备', ja: 'READY' }, go: { ar: 'انطلق!', en: 'GO!', es: '¡YA!', zh: '出发！', ja: 'GO!' } };
    let cdEl = null, cdTimers = [];
    function countdown(onGo, delay = 0) {
        if (!cdEl) {
            const st = document.createElement('style');
            st.textContent = `#countdown{position:absolute;inset:0;z-index:15;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .2s}
              #countdown.on{opacity:1}
              #countdown .cd{position:relative;display:grid;place-items:center;width:min(42vmin,220px);aspect-ratio:1}
              #countdown svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
              #countdown circle{fill:none;stroke-width:3}
              #countdown .bg{stroke:rgba(57,215,255,.18)}
              #countdown .ring{stroke:var(--cyan);stroke-linecap:round;stroke-dasharray:289;filter:drop-shadow(0 0 8px var(--cyan))}
              #countdown .ring.run{animation:cdRing .8s linear forwards}
              #countdown .hex{position:absolute;inset:14%;border:1.5px solid rgba(255,168,38,.45);clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);background:radial-gradient(circle,rgba(8,20,36,.75),rgba(8,20,36,.35))}
              #countdown b{position:relative;font:700 clamp(64px,20vmin,120px)/1 var(--font);color:var(--amber);text-shadow:0 0 24px rgba(255,168,38,.8),0 0 60px rgba(255,120,20,.35)}
              #countdown b.pop{animation:cdPop .8s cubic-bezier(.2,.9,.25,1) forwards}
              #countdown b.go{font-size:clamp(44px,13vmin,84px);color:#fff;text-shadow:0 0 22px var(--cyan),0 0 60px rgba(57,215,255,.6);letter-spacing:.08em}
              #countdown small{position:absolute;top:calc(50% - min(21vmin,110px) - 26px);font:700 12px/1 var(--font);letter-spacing:.5em;color:var(--cyan);text-shadow:0 0 10px rgba(57,215,255,.7)}
              @keyframes cdPop{0%{transform:scale(1.8);opacity:0}25%{transform:scale(1);opacity:1}80%{opacity:1}100%{transform:scale(.85);opacity:0}}
              @keyframes cdRing{from{stroke-dashoffset:0}to{stroke-dashoffset:289}}
              @media (prefers-reduced-motion:reduce){#countdown b.pop,#countdown .ring.run{animation:none}}`;
            document.head.appendChild(st);
            cdEl = document.createElement('div'); cdEl.id = 'countdown';
            cdEl.innerHTML = '<small></small><div class="cd"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="46"/><circle class="ring" cx="50" cy="50" r="46"/></svg><div class="hex"></div><b></b></div>';
            api.stage.appendChild(cdEl);
        }
        cdTimers.forEach(clearTimeout); cdTimers = [];
        const L = I.lang, b = cdEl.querySelector('b'), ring = cdEl.querySelector('.ring'), A = api.AudioSys;
        cdEl.querySelector('small').textContent = CD.ready[L] || CD.ready.en;
        const show = (txt, go) => {
            b.textContent = txt; b.className = go ? 'go' : '';
            void b.offsetWidth; b.className = (go ? 'go ' : '') + 'pop';
            ring.classList.remove('run'); void ring.getBoundingClientRect(); if (!go) ring.classList.add('run');
            try { if (go) { A.playTone('square', 880, 1760, 0.28, 0.06); } else A.playTone('square', 620, 620, 0.12, 0.05); } catch (e) { }
        };
        // each step schedules the next, so a slow first frame can't squeeze the numbers together
        const steps = [() => { cdEl.classList.add('on'); show('3'); }, () => show('2'), () => show('1'),
            () => { show(CD.go[L] || CD.go.en, true); onGo && onGo(); }, () => cdEl.classList.remove('on')];
        const held = () => tpEl && tpEl.classList.contains('show');
        const run = (i, wait) => cdTimers.push(setTimeout(() => {
            if (i < 4 && held()) { cdEl.classList.remove('on'); run(0, 400); return; }  // briefing open: hold, then 3-2-1 again
            steps[i](); if (i + 1 < steps.length) run(i + 1, i === 3 ? 700 : 800); }, wait));
        run(0, delay);
    }

    return {
        setProgress, scriptLoaded, LOGO_SVG, countdown, tip, loading, ldLabel, tipsOpen, freeze: on => { if (api && api.freeze && (!on || !api.canFreeze || api.canFreeze())) { api.freeze(on); return true; } return false; },
        get paused() { return paused; },
        init(a) {
            api = a; Ctl.install(); buildMenu(); buildPause();
            // short screens (phone in landscape): compact two-column menus — measured on the stage itself,
            // so it also works when the game rotates the page by CSS
            const fit = () => api.stage.classList.toggle('short', api.stage.clientHeight > 0 && api.stage.clientHeight < 540);
            fit(); window.addEventListener('resize', () => setTimeout(fit, 150));
            if (window.ResizeObserver) new ResizeObserver(fit).observe(api.stage);
            boot.ready = true;
            let auto = false, hub = false;
            try { const ss = sessionStorage; auto = ss.getItem('axon.autostart') === '1'; hub = ss.getItem('axon.hub') === '1'; ss.removeItem('axon.autostart'); ss.removeItem('axon.hub'); } catch (e) { }
            buildTipsUI();
            if (auto || hub) {                         // restart: straight into the mission (or the HQ), controls visible
                boot.splashDone = true; setProgress(100, T('load_ready'));
                bootHold(() => { api.stage.classList.remove('in-menu'); (auto && api.startDirect ? api.startDirect : api.start)();   // the new scene starts behind the curtain…
                    requestAnimationFrame(() => requestAnimationFrame(() => { const b = $('boot'); if (b) { b.classList.add('gone'); setTimeout(() => b.remove(), 600); } })); });   // …then it lifts
                return;
            }   // restart: straight into play, controls visible
            maybeFinish();
        },
        bootStart: startSplash
    };
})();
