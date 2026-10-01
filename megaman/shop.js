// =====================================================================
//  AXON BREACH — ARMORY: credits, supplies and weapon upgrades
//  Loaded by index.html before game.js. Credits are earned by defeating enemies
//  (tougher enemies and deeper stages pay more) and by clearing zones.
// =====================================================================
'use strict';

window.AxonShop = (function () {
    const I = window.AxonI18n, T = I.t;
    const ICON = {
        medkit: '<rect x="6" y="3" width="12" height="18" rx="3.5"/><path d="M9 3V1.5h6V3M12 8.5v7M8.5 12h7"/>',
        cell: '<rect x="6" y="3" width="12" height="18" rx="3.5"/><path d="M9 3V1.5h6V3M13 7l-3 5h4l-3 5"/>',
        power: '<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
        rapid: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>',
        charge: '<circle cx="12" cy="12" r="9"/><path d="M13 5l-4 8h4l-2 6 6-9h-4l2-5z"/>',
        saber: '<path d="M4 20l3-3M7 17l1.5 1.5M5.5 15.5L7 17M8 16L20 4"/><path d="M17 4h3v3"/>',
        armor: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
        core: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z"/><circle cx="12" cy="12" r="3"/>',
        shield: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5l4.5 1.8v3.4c0 3-2 4.8-4.5 5.8-2.5-1-4.5-2.8-4.5-5.8V8.3z"/>'
    };
    // supplies go into the three quick slots (up to STACK each); upgrades are permanent for the run
    const ITEMS = [
        { id: 'medkit', kind: 'item', en: 'MEDKIT', price: 80, slot: 0 },
        { id: 'cell', kind: 'item', en: 'ENERGY CELL', price: 45, slot: 1 },
        { id: 'shield', kind: 'item', en: 'BARRIER', price: 120, slot: 2 },
        { id: 'power', kind: 'up', en: 'BUSTER POWER', base: 130 },
        { id: 'rapid', kind: 'up', en: 'RAPID FIRE', base: 110 },
        { id: 'charge', kind: 'up', en: 'CHARGE CORE', base: 100 },
        { id: 'saber', kind: 'up', en: 'SABER EDGE', base: 130 },
        { id: 'armor', kind: 'up', en: 'ARMOR PLATING', base: 150 },
        { id: 'core', kind: 'up', en: 'ENERGY CORE', base: 110 }
    ];
    const STACK = 5, SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3'];
    const inv = { medkit: 0, cell: 0, shield: 0 };
    let slotCool = 0;
    const MAX_LVL = 5;
    // economy (progress is saved, so it is tuned for the long run): a full run of mission 01 pays ~1,500 CR,
    // one upgrade level costs 100-600, maxing everything takes several runs
    const REWARD = { drone: 6, runner: 7, heavy: 14, boss: 250 };
    const lv = { power: 0, rapid: 0, charge: 0, saber: 0, armor: 0, core: 0 };
    let credits = 0, api = null, root = null, open = false;

    // ---------- save: credits, stored supplies and upgrade levels survive restarts ----------
    const SAVE_KEY = 'axon.save';
    let saveT = 0;
    function load() {
        try {
            const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (!d) return;
            credits = Math.max(0, Math.floor(+d.credits || 0));
            if (!(d.v >= 2)) credits = Math.round(credits * 0.35);      // one-time: savings from the old, over-generous economy
            for (const k in inv) inv[k] = Math.max(0, Math.min(STACK, Math.floor(+(d.inv || {})[k] || 0)));
            for (const k in lv) lv[k] = Math.max(0, Math.min(MAX_LVL, Math.floor(+(d.lv || {})[k] || 0)));
        } catch (e) { /* corrupt or blocked storage: start fresh */ }
    }
    function save() {                                 // batched: many kills in a second = one write
        clearTimeout(saveT);
        // localStorage writes are synchronous disk I/O on phones (a frame hitch in the middle of a fight):
        // one write per few seconds of play, and a final one whenever the app is put away or closed
        saveT = setTimeout(flushSave, 3000);
    }
    function flushSave() { if (window.AxonPerf && window.AxonPerf.mark) window.AxonPerf.mark('save'); clearTimeout(saveT); saveT = 0; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, credits, inv, lv })); } catch (e) { } }
    document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) flushSave(); });
    window.addEventListener('pagehide', () => { if (saveT) flushSave(); });
    window.addEventListener('beforeunload', () => { if (saveT) flushSave(); });
    function applyUpgrades(full) {                    // armor / core raise the hero's max HP and EN
        const P = api && api.player(); if (!P) return;
        P.maxHp = 100 + 15 * lv.armor; P.maxEnergy = 100 + 20 * lv.core;
        if (full) { P.hp = P.maxHp; P.energy = P.maxEnergy; }
    }

    // live multipliers read by the game every frame
    const stats = {
        get shotMul() { return 1 + 0.25 * lv.power; },
        get fireMul() { return 1 - 0.12 * lv.rapid; },
        get chargeMul() { return 1 - 0.15 * lv.charge; },
        get meleeMul() { return 1 + 0.2 * lv.saber; },
        get meleeExtra() { return 0.15 * lv.saber; },
        get regenMul() { return 1 + 0.2 * lv.core; }
    };
    const priceOf = it => it.kind === 'item' ? it.price : Math.round(it.base * Math.pow(1.65, lv[it.id]) / 5) * 5;

    const CSS = `
    #btn-shop .cr{color:var(--amber);font-variant-numeric:tabular-nums;min-width:2.5ch;text-align:end}
    #btn-shop.bump{animation:shopBump .35s}
    @keyframes shopBump{40%{transform:scale(1.12);background:rgba(255,168,38,.3)}}
    .coin-pop{position:absolute;z-index:8;pointer-events:none;font:700 15px/1 var(--font);color:#ffd36b;letter-spacing:.06em;
      text-shadow:0 0 10px rgba(255,168,38,.8),0 1px 0 #1a0d00;transform:translate(-50%,-50%);animation:coinUp .95s ease-out forwards;white-space:nowrap}
    @keyframes coinUp{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-260%) scale(1)}}
    #shop{position:absolute;inset:0;z-index:30;display:grid;place-items:center;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr);padding:max(12px,env(safe-area-inset-top)) 12px 12px;box-sizing:border-box;
      background:radial-gradient(ellipse at 50% 30%,rgba(10,30,52,.55),rgba(3,8,16,.9));-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
      opacity:0;pointer-events:none;transition:opacity .2s}
    #shop.open{opacity:1;pointer-events:auto}
    .sh-panel{width:100%;max-width:880px;max-height:100%;min-height:0;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;padding:16px 16px 18px;
      background:linear-gradient(160deg,rgba(20,40,64,.82),rgba(8,16,30,.9));border:1px solid rgba(57,215,255,.28);
      box-shadow:0 20px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);
      clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px);transform:translateY(12px) scale(.98);transition:transform .25s}
    #shop.open .sh-panel{transform:none}
    .sh-head{display:flex;align-items:center;gap:12px}
    .sh-title{display:grid;gap:2px;flex:1}
    .sh-title b{font-size:22px;letter-spacing:.32em;color:var(--ink)}
    .sh-title span{font-size:11px;letter-spacing:.18em;color:var(--cyan)}
    .sh-cr{display:flex;align-items:center;gap:8px;padding:8px 14px;font-weight:700;font-size:18px;color:#ffd36b;background:rgba(255,168,38,.1);
      border:1px solid rgba(255,168,38,.4);font-variant-numeric:tabular-nums;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
    .sh-cr i{font-style:normal;font-size:13px;color:var(--amber);opacity:.8}
    .sh-x{width:40px;height:40px;display:grid;place-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:var(--ink);
      font-size:20px;cursor:pointer;border-radius:50%;touch-action:manipulation}
    .sh-x:focus-visible,.sh-buy:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
    .sh-body{overflow-y:auto;min-height:0;display:grid;gap:14px;padding-inline-end:2px;overscroll-behavior:contain}
    .sh-sec{font-size:11px;letter-spacing:.35em;color:var(--dim);display:flex;align-items:center;gap:10px}
    .sh-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(57,215,255,.35),transparent)}
    .sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;min-width:0}
    .sh-card{position:relative;display:grid;grid-template-columns:40px 1fr;gap:6px 10px;align-items:start;padding:12px;background:rgba(255,255,255,.035);
      border:1px solid rgba(255,255,255,.08);transition:border-color .15s,background .15s}
    .sh-card:hover{border-color:rgba(57,215,255,.4);background:rgba(57,215,255,.06)}
    .sh-card.flash{animation:cardFlash .45s}
    @keyframes cardFlash{30%{background:rgba(255,168,38,.22);border-color:var(--amber)}}
    .sh-ico{width:40px;height:40px;display:grid;place-items:center;background:rgba(57,215,255,.1);border:1px solid rgba(57,215,255,.3);border-radius:10px}
    .sh-card[data-kind=item] .sh-ico{background:rgba(125,255,184,.1);border-color:rgba(125,255,184,.35)}
    .sh-ico svg{width:22px;height:22px;fill:none;stroke:var(--cyan);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .sh-card[data-kind=item] .sh-ico svg{stroke:#7dffb8}
    .sh-name{display:grid;gap:1px}
    .sh-name b{font-size:13px;letter-spacing:.14em;color:var(--ink)}
    .sh-name span{font-size:12px;color:var(--dim)}
    .sh-desc{grid-column:1/-1;font-size:12px;line-height:1.5;color:#b7c6d6;min-height:2.4em;direction:rtl;text-align:right}
    .sh-card{min-width:0}
    .sh-foot{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .sh-pips{display:flex;gap:3px}
    .sh-pips i{width:14px;height:5px;background:rgba(255,255,255,.12);transform:skewX(-20deg)}
    .sh-pips i.on{background:var(--amber);box-shadow:0 0 6px rgba(255,168,38,.6)}
    .sh-buy{font:700 13px/1 var(--font);letter-spacing:.06em;padding:9px 12px;min-width:84px;color:#1a0d00;background:var(--amber);border:0;cursor:pointer;
      touch-action:manipulation;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
    .sh-buy:disabled{cursor:default;background:rgba(255,255,255,.08);color:var(--dim)}
    .sh-buy.poor:disabled{color:#ff6b8a}
    .sh-hint{font-size:11px;color:var(--dim);text-align:center;letter-spacing:.08em}
    #stage.is-portrait .sh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    #stage.is-portrait .sh-title b{font-size:18px;letter-spacing:.25em}
    #stage.is-portrait .sh-buy{min-width:0;width:100%}
    #stage.is-portrait .sh-foot{flex-direction:column;align-items:stretch}
    #stage.is-portrait .sh-card{grid-template-columns:1fr;padding:10px}
    @media (prefers-reduced-motion:reduce){#shop,.sh-panel,.coin-pop{transition:none;animation:none}}`;

    function build() {
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        root = document.createElement('div'); root.id = 'shop'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Armory'); root.hidden = true;
        api.stage.appendChild(root);
        fill();
        root.addEventListener('click', e => {
            if (e.target.closest('.sh-x')) { close(); return; }
            const bt = e.target.closest('.sh-buy'); if (!bt) return;
            const c = bt.closest('.sh-card'); buy(ITEMS.find(i => i.id === c.dataset.id), c);
        });
        buildSlots();
        I.onChange(() => { fill(); if (open) render(); labelSlots(); });
        root.addEventListener('pointerdown', e => { if (e.target === root) close(); });
        const sb = document.getElementById('btn-shop');            // top chip = credit counter only: buying happens at the armory in HQ
        sb.tabIndex = -1; sb.setAttribute('aria-label', 'Credits'); sb.addEventListener('click', e => e.preventDefault());
        window.addEventListener('keydown', e => {
            const si = SLOT_KEYS.indexOf(e.code);
            if (si >= 0 && !e.repeat) { useSlot(si); return; }
            if (e.code === 'Escape' && open) { e.stopImmediatePropagation(); close(); }   // don't also open the pause menu
        });
    }

    // (re)write all shop text in the current language
    function fill() {
        const sub = I.lang === 'en' ? '' : ' · ';
        root.innerHTML = `<div class="sh-panel">
            <div class="sh-head">
              <div class="sh-title"><b>${T('armory')}</b><span>${T('shop_sub')}</span></div>
              <div class="sh-cr"><i>CR</i><span id="sh-credits">${credits}</span></div>
              <button class="sh-x" type="button" aria-label="Close">×</button>
            </div>
            <div class="sh-body">
              <div class="sh-sec">${T('supplies')}</div><div class="sh-grid" data-g="item"></div>
              <div class="sh-sec">${T('upgrades')}</div><div class="sh-grid" data-g="up"></div>
              <div class="sh-hint">${T('shop_hint')}</div>
            </div></div>`;
        ITEMS.forEach(it => {
            const c = document.createElement('div'); c.className = 'sh-card'; c.dataset.kind = it.kind; c.dataset.id = it.id;
            const local = I.lang === 'en' ? '' : `<span>${it.en}</span>`;
            c.innerHTML = `<div class="sh-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[it.id]}</svg></div>
                <div class="sh-name"><b>${I.lang === 'en' ? it.en : T(it.id + '_n')}</b>${local}</div>
                <div class="sh-desc">${T(it.id + '_d')}</div>
                <div class="sh-foot"><div class="sh-pips">${it.kind === 'up' ? '<i></i>'.repeat(MAX_LVL) : '<span class="sh-own"></span>'}</div><button class="sh-buy" type="button"></button></div>`;
            root.querySelector(`[data-g="${it.kind}"]`).appendChild(c);
        });
    }

    // ---------- quick slots (HUD) ----------
    const SLOT_CSS = `
    #slots{position:absolute;z-index:11;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;pointer-events:none}
    #slots > *{pointer-events:auto}
    #stage.is-portrait #slots{left:auto;right:16px;transform:none;bottom:190px}
    #stage.in-menu #slots{display:none}
    .slot{--c:var(--cyan);position:relative;width:58px;height:62px;padding:0;border:0;cursor:pointer;touch-action:manipulation;
      background:linear-gradient(160deg,#e9f1f8,#7d8a99 40%,#2a313b 62%,#9aa7b5);
      clip-path:polygon(50% 0,100% 24%,100% 76%,50% 100%,0 76%,0 24%);transition:transform .12s,opacity .2s}
    .slot::before{content:"";position:absolute;inset:3px;clip-path:inherit;background:linear-gradient(160deg,var(--c),color-mix(in srgb,var(--c) 30%,#000) 75%)}
    .slot .face{position:absolute;inset:6px;clip-path:polygon(50% 0,100% 24%,100% 76%,50% 100%,0 76%,0 24%);display:grid;place-items:center;
      background:radial-gradient(circle at 50% 30%,rgba(40,70,100,.95),rgba(6,12,22,.97) 72%)}
    .slot svg{width:64%;height:64%;filter:drop-shadow(0 0 3px var(--c))}
    .slot .n{position:absolute;left:50%;bottom:1px;transform:translateX(-50%);min-width:18px;height:15px;padding:0 3px;box-sizing:border-box;
      font:700 10px/15px var(--font);color:#061220;background:var(--c);text-align:center;font-variant-numeric:tabular-nums;
      clip-path:polygon(4px 0,calc(100% - 4px) 0,100% 50%,calc(100% - 4px) 100%,4px 100%,0 50%)}
    .slot .k{position:absolute;left:50%;top:3px;transform:translateX(-50%);font:700 8px var(--font);color:#061220;opacity:.8}
    .slot.empty{opacity:.5} .slot.empty .n{background:rgba(255,255,255,.3)}
    .slot:active{transform:scale(.9)}
    .slot.alert{animation:slotAlert .8s ease-in-out infinite}
    @keyframes slotAlert{0%,100%{filter:none;transform:none}50%{filter:brightness(1.9) drop-shadow(0 0 10px var(--c));transform:scale(1.1)}}
    #btn-shop.alert{animation:shopAlert .8s ease-in-out infinite;border-color:var(--amber)}
    #btn-shop.alert::after{content:"!";position:absolute;top:3px;right:6px;width:16px;height:16px;border-radius:50%;background:#ff3a5a;color:#fff;
      font:700 11px/16px var(--font);text-align:center}
    @keyframes shopAlert{0%,100%{background:var(--panel)}50%{background:rgba(255,168,38,.45);box-shadow:0 0 14px rgba(255,168,38,.8)}}
    #btn-shop{position:relative;pointer-events:none;cursor:default}
    #nudge{position:absolute;z-index:12;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:0;
      transform:translate(-50%,-100%);opacity:0;transition:opacity .2s}
    #nudge.show{opacity:1}
    #nudge svg{width:30px;height:30px;fill:#ffd36b;filter:drop-shadow(0 0 6px rgba(255,168,38,.9)) drop-shadow(0 2px 0 #1a0d00);animation:nudgeBob .6s ease-in-out infinite}
    #nudge span{order:-1;font:700 11px/1 var(--font);letter-spacing:.14em;color:#ffd36b;text-shadow:0 0 6px rgba(255,168,38,.8),0 1px 0 #000;margin-bottom:2px}
    #nudge.up{transform:translate(-50%,0)}
    #nudge.up svg{transform:rotate(180deg);animation-name:nudgeBobUp}
    #nudge.up span{order:1;margin:2px 0 0}
    @keyframes nudgeBob{50%{transform:translateY(7px)}}
    @keyframes nudgeBobUp{0%,100%{transform:rotate(180deg)}50%{transform:rotate(180deg) translateY(7px)}}
    #stage.in-menu #nudge{display:none}
    .slot.used{animation:slotUse .4s} .slot.deny{animation:slotDeny .35s}
    @keyframes slotUse{35%{transform:scale(1.15);filter:brightness(1.6)}}
    @keyframes slotDeny{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
    #stage.is-portrait .slot{width:50px;height:54px}
    @media (hover:hover) and (pointer:fine){ .slot .k{color:var(--ink)} }
    .sh-own{font-size:11px;color:var(--dim);letter-spacing:.06em}
    html.rtl-text .sh-desc,html.rtl-text .sh-title span,html.rtl-text .sh-hint,html.rtl-text .sh-name span{direction:rtl}
    html:not(.rtl-text) .sh-desc{direction:ltr;text-align:left}`;
    // quick-slot art: tank-style canisters (liquid level shows the stock) and a barrier crystal
    const SLOT_ART = {
        medkit: c => `<rect x="6" y="2.5" width="12" height="19" rx="3.8" fill="#0b1a14" stroke="${c}" stroke-width="1.6"/><rect x="8" y="1" width="8" height="2.4" rx="1" fill="${c}"/>
            <rect class="lvl" x="7.6" y="5" width="8.8" height="15" rx="2.6" fill="${c}" opacity=".35"/><path d="M10.6 8.2h2.8v2.9h2.9v2.8h-2.9v2.9h-2.8v-2.9H7.7v-2.8h2.9z" fill="#fff"/>`,
        cell: c => `<rect x="6" y="2.5" width="12" height="19" rx="3.8" fill="#07121c" stroke="${c}" stroke-width="1.6"/><rect x="8" y="1" width="8" height="2.4" rx="1" fill="${c}"/>
            <rect class="lvl" x="7.6" y="5" width="8.8" height="15" rx="2.6" fill="${c}" opacity=".35"/><path d="M13.4 6.5l-4.2 6.2h3l-1.2 5 4.4-6.6h-3.1z" fill="#fff"/>`,
        shield: c => `<path d="M12 1.8l8.6 5v10.4L12 22.2l-8.6-5V6.8z" fill="#120b1e" stroke="${c}" stroke-width="1.6"/><path d="M12 5.5l5.2 3v6.2L12 18l-5.2-3.3V8.5z" fill="${c}" opacity=".45"/>
            <path d="M12 5.5l5.2 3L12 11.6 6.8 8.5z" fill="#fff" opacity=".75"/>`
    };
    const SLOT_COL = ['#5cf0a0', '#39d7ff', '#b48cff'];
    let slotsEl = null, noteEl = null;
    function buildSlots() {
        const st = document.createElement('style'); st.textContent = SLOT_CSS; document.head.appendChild(st);
        slotsEl = document.createElement('div'); slotsEl.id = 'slots';
        slotsEl.innerHTML = ['medkit', 'cell', 'shield'].map((id, i) =>
            `<button class="slot" type="button" data-i="${i}" style="--c:${SLOT_COL[i]}"><span class="face"><svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ART[id](SLOT_COL[i])}</svg></span><span class="k">${i + 1}</span><span class="n">0</span></button>`).join('');
        api.stage.appendChild(slotsEl);
        slotsEl.addEventListener('pointerdown', e => { const b = e.target.closest('.slot'); if (!b) return; e.preventDefault(); e.stopPropagation(); useSlot(+b.dataset.i); });
        noteEl = document.getElementById('toast');
        labelSlots(); showSlots();
    }
    function labelSlots() { if (slotsEl) slotsEl.querySelectorAll('.slot').forEach((b, i) => b.setAttribute('aria-label', T(['medkit', 'cell', 'shield'][i] + '_n'))); }
    function showSlots() {
        if (!slotsEl) return;
        ['medkit', 'cell', 'shield'].forEach((id, i) => {
            const b = slotsEl.children[i]; b.querySelector('.n').textContent = inv[id]; b.classList.toggle('empty', inv[id] === 0);
            const lv = b.querySelector('.lvl'); if (lv) { const h = 15 * inv[id] / STACK; lv.setAttribute('y', 20 - h); lv.setAttribute('height', h); lv.setAttribute('opacity', inv[id] ? .9 : .2); }
        });
    }
    function flashSlot(i, cls) { const b = slotsEl.children[i]; b.classList.remove('used', 'deny'); requestAnimationFrame(() => b.classList.add(cls)); }
    function useSlot(i) {
        if (!api.canOpen() || open) return;
        const now = performance.now(); if (now < slotCool) return;
        const id = ['medkit', 'cell', 'shield'][i], P = api.player();
        if (!inv[id]) { flashSlot(i, 'deny'); api.AudioSys.playDeny(); return; }
        if (id === 'medkit' && P.hp >= P.maxHp) { flashSlot(i, 'deny'); api.AudioSys.playDeny(); api.toast && api.toast(T('need_hp')); return; }
        if (id === 'cell' && P.energy >= P.maxEnergy - 0.5) { flashSlot(i, 'deny'); api.AudioSys.playDeny(); api.toast && api.toast(T('need_en')); return; }
        inv[id]--; slotCool = now + 400; save();
        if (id === 'medkit') P.hp = Math.min(P.maxHp, P.hp + 40);
        else if (id === 'cell') P.energy = P.maxEnergy;
        else P.shieldT = 6;
        api.onUse && api.onUse(id);
        flashSlot(i, 'used'); showSlots(); api.refreshHud(); api.AudioSys.playItem(id);
    }

    // danger reminders: blink the slot that fixes the problem, or the shop when that slot is empty and you can afford a refill
    let alertT = 0;
    function alerts(P, dt) {
        if ((alertT -= dt) > 0 || !slotsEl) return; alertT = 0.25;
        const lowHp = P.hp > 0 && P.hp <= P.maxHp * 0.3, lowEn = P.energy <= P.maxEnergy * 0.2;
        const need = { medkit: lowHp, cell: lowEn, shield: P.hp > 0 && P.hp <= P.maxHp * 0.2 };
        let shopNeed = false;
        ['medkit', 'cell', 'shield'].forEach((id, i) => {
            const b = slotsEl.children[i], have = inv[id] > 0;
            b.classList.toggle('alert', need[id] && have);
            if (need[id] && !have && id !== 'shield' && credits >= priceOf(ITEMS.find(x => x.id === id))) shopNeed = true;
        });
        const sb = document.getElementById('btn-shop');
        if (sb) sb.classList.remove('alert');
        // one bouncing arrow on a ready slot (the shop itself is only in HQ now)
        const target = slotsEl.querySelector('.slot.alert');
        nudge(target);
    }
    let nudgeEl = null;
    function nudge(el) {
        if (!nudgeEl) {
            nudgeEl = document.createElement('div'); nudgeEl.id = 'nudge';
            nudgeEl.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22L3 11h5V2h8v9h5z"/></svg><span></span>`;
            api.stage.appendChild(nudgeEl);
        }
        if (!el || !api.canOpen()) { nudgeEl.classList.remove('show'); nudge.el = null; return; }
        // reading an element's box forces a layout: done once per target (and on resize), not four times a second
        const key = el.dataset.i + '|' + api.View.W + 'x' + api.View.H;
        if (nudge.key === key && nudge.el === el) { nudgeEl.classList.add('show'); return; }
        nudge.key = key; nudge.el = el;
        const r = el.getBoundingClientRect();
        const c = api.View.toLocal(r.left + r.width / 2, r.top + r.height / 2);
        const a = api.View.toLocal(r.left, r.top), b = api.View.toLocal(r.right, r.bottom);
        const h = Math.abs(b.y - a.y), below = c.y < api.View.H * 0.4;      // top-of-screen target → arrow sits under it, pointing up
        nudgeEl.classList.toggle('up', below);
        nudgeEl.style.left = c.x + 'px';
        nudgeEl.style.top = (below ? c.y + h / 2 + 4 : c.y - h / 2 - 4) + 'px';
        nudgeEl.querySelector('span').textContent = T('tap');
        nudgeEl.classList.add('show');
    }

    // why an item can't be bought right now (null = it can)
    function blocked(it) {
        const P = api.player();
        if (it.kind === 'item' && inv[it.id] >= STACK) return 'FULL';
        if (it.kind === 'up' && lv[it.id] >= MAX_LVL) return 'MAX';
        if (credits < priceOf(it)) return 'POOR';
        return null;
    }
    function render() {
        if (!root) return;
        root.querySelector('#sh-credits').textContent = credits;
        root.querySelectorAll('.sh-card').forEach(c => {
            const it = ITEMS.find(i => i.id === c.dataset.id), why = blocked(it), btn = c.querySelector('.sh-buy');
            btn.disabled = !!why; btn.classList.toggle('poor', why === 'POOR');
            btn.textContent = why === 'MAX' ? T('max') : why === 'FULL' ? T('full') : `CR ${priceOf(it)}`;
            if (it.kind === 'item') c.querySelector('.sh-own').textContent = `${T('owned')} ${inv[it.id]}/${STACK}`;
            btn.setAttribute('aria-label', `${it.en} ${btn.textContent}`);
            if (it.kind === 'up') c.querySelectorAll('.sh-pips i').forEach((p, i) => p.classList.toggle('on', i < lv[it.id]));
        });
    }
    function showCredits(bump) {
        const el = document.getElementById('credits'); if (el) el.textContent = credits;
        const b = document.getElementById('btn-shop');
        if (bump && b) { b.classList.remove('bump'); requestAnimationFrame(() => b.classList.add('bump')); }
    }
    function buy(it, card) {
        if (blocked(it)) { api.AudioSys.playDeny(); return; }
        const P = api.player();
        credits -= priceOf(it);
        if (it.kind === 'item') { inv[it.id]++; showSlots(); }
        else {
            lv[it.id]++; applyUpgrades(false); if (api.onUpgrade) api.onUpgrade(it.id);
            if (it.id === 'armor') P.hp = Math.min(P.maxHp, P.hp + 15);
            if (it.id === 'core') P.energy = Math.min(P.maxEnergy, P.energy + 20);
        }
        save();
        api.AudioSys.playBuy(); api.refreshHud();
        card.classList.remove('flash'); requestAnimationFrame(() => card.classList.add('flash'));
        render(); showCredits(false);
    }
    function openShop() {
        if (open || !api.canOpen()) return;
        open = true; api.pause(true); root.hidden = false; render();
        requestAnimationFrame(() => root.classList.add('open'));
        api.AudioSys.playLock();
        setTimeout(() => { const b = root.querySelector('.sh-buy:not(:disabled)') || root.querySelector('.sh-x'); b && b.focus({ preventScroll: true }); }, 60);
    }
    function close() {
        if (!open) return;
        open = false; root.classList.remove('open'); api.pause(false); api.AudioSys.playLock();
        setTimeout(() => { if (!open) root.hidden = true; }, 220);
    }

    // floating "+CR" at a world position
    function pop(text, worldPos) {
        const cam = api.camera(); if (!cam || !worldPos) return;
        const v = worldPos.clone().project(cam);
        if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
        // a small ring of reused elements (no element created / destroyed per kill)
        if (!pop.els) { pop.els = []; pop.i = 0; for (let k = 0; k < 8; k++) { const d = document.createElement('div'); d.className = 'coin-pop'; d.style.display = 'none'; api.stage.appendChild(d); pop.els.push(d); } }
        const el = pop.els[pop.i = (pop.i + 1) % pop.els.length];
        el.style.display = 'none'; void el.offsetWidth;          // restart its animation
        el.textContent = text; el.style.left = ((v.x + 1) / 2 * api.View.W) + 'px'; el.style.top = ((1 - v.y) / 2 * api.View.H) + 'px'; el.style.display = '';
        clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 1000);
    }
    function add(n, worldPos, label) {
        if (!(n > 0)) return;
        credits += n; showCredits(true); if (open) render(); save();
        if (api && api.AudioSys) api.AudioSys.playCoin();
        pop(`+${n} CR${label ? ' · ' + label : ''}`, worldPos);
    }
    // enemy defeated: base value by type, +15% per stage level
    function reward(e) {
        const base = REWARD[e.type] || 10;
        const n = Math.round(base * (1 + 0.06 * (e.lvl || 0)));
        add(n, e.aimPoint ? e.aimPoint() : null);
    }

    return {
        stats, reward, add, alerts, get credits() { return credits; }, get isOpen() { return open; },
        level: id => lv[id] || 0, maxLevel: MAX_LVL, priceOf: id => priceOf(ITEMS.find(i => i.id === id)),
        upgrade(id) {                                                                                  // weapon forge (forge.js)
            const it = ITEMS.find(i => i.id === id); if (!it || it.kind !== 'up' || blocked(it)) return false;
            credits -= priceOf(it); lv[id]++; applyUpgrades(false); save(); showCredits(true); if (open) render();
            if (api.refreshHud) api.refreshHud(); if (api.onUpgrade) api.onUpgrade(id); return true;
        },
        show() { if (!open) openShop(); },                                                            // HQ armory counter (hub.js)
        spend(n) { if (!(n >= 0) || credits < n) return false; credits -= n; showCredits(true); if (open) render(); save(); return true; },   // armor studio (hub.js)
        init(a) { api = a; load(); build(); showCredits(false); showSlots(); applyUpgrades(true); if (api.refreshHud) api.refreshHud(); },
        // a mission run: remember the wallet at deploy; dying rolls it back (money, supplies and upgrades bought on the run)
        snapshot() { return JSON.stringify({ credits, inv, lv }); },
        restore(snap) {
            try {
                const d = JSON.parse(snap); credits = d.credits; Object.assign(inv, d.inv); Object.assign(lv, d.lv);
                clearTimeout(saveT); localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, credits, inv, lv }));
            } catch (e) { }
            showCredits(false); showSlots(); applyUpgrades(false);
        },
        save, resetSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
    };
})();
