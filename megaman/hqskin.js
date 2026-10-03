// =====================================================================
//  AXON BREACH — HQ INTERFACE, FINISHED (hqskin.js)
//  1 MISSION SELECT, as a target board: every mission tile carries a portrait frame — the guardian's real
//    picture where the mission is built, a dimmed "unknown unit" with a question mark where it is not — the
//    tiles come in one after the other, the selected one is held in pulsing brackets, the details panel
//    shows the target under a turning reticle with a TARGET tag, the deploy button has a moving sheen, and
//    the game's logo sits in the header.
//  2 THE HQ HUD: the location / objective block and the action prompt get the look of the menus (cut
//    corners, light rails), and the name of each wing slides in when you walk into it.
//  It only decorates what hub.js draws (styles + a few added elements); hub.js is not changed for it.
//  Loaded by index.html before hub.js.
// =====================================================================
'use strict';

(function () {
    const UNKNOWN = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8c9 0 15 6 15 15v7c0 4-2 7-5 9v4l12 5c4 2 6 5 6 9v7H4v-7c0-4 2-7 6-9l12-5v-4c-3-2-5-5-5-9v-7c0-9 6-15 15-15z" fill="currentColor"/><path d="M21 24h22v6H21z" fill="#04080f"/></svg>';
    const st = document.createElement('style');
    st.textContent = `
      /* ---------- mission select ---------- */
      #stage #hub-panel .hm-card{background:
          linear-gradient(160deg,rgba(18,38,62,.95),rgba(5,12,24,.98)),
          repeating-linear-gradient(0deg,rgba(57,215,255,.05) 0 1px,transparent 1px 28px);
        box-shadow:0 0 0 1px rgba(57,215,255,.12),0 24px 70px rgba(0,0,0,.6)}
      #stage #hub-panel .hm-card::before{content:'';position:absolute;inset:0;pointer-events:none;background:
          repeating-linear-gradient(90deg,rgba(57,215,255,.045) 0 1px,transparent 1px 28px),
          repeating-linear-gradient(0deg,rgba(57,215,255,.045) 0 1px,transparent 1px 28px);
        -webkit-mask-image:radial-gradient(ellipse at 30% 40%,#000 20%,transparent 78%);mask-image:radial-gradient(ellipse at 30% 40%,#000 20%,transparent 78%)}
      #stage #hub-panel .hm-card::after{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--cyan),#fff,var(--amber),transparent);opacity:.9}
      #stage #hub-panel .hm-head{align-items:center;position:relative}
      #stage #hub-panel .hq-lg{flex:none;width:86px;line-height:0}
      #stage #hub-panel .hq-lg .ax-logo-svg{width:86px;filter:none}
      #stage.is-portrait #hub-panel .hq-lg{width:64px} #stage.is-portrait #hub-panel .hq-lg .ax-logo-svg{width:64px}
      #stage #hub-panel .hm-tile .c{letter-spacing:.03em;font-size:9.5px}
      #stage #hub-panel .hm-tile{padding-inline-start:66px;padding-inline-end:6px;min-height:84px;overflow:hidden;
        clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));
        }
      #stage #hub-panel.hq-in .hm-tile{animation:hqTile .34s cubic-bezier(.2,.9,.2,1) both;animation-delay:calc(var(--k,0) * 28ms)}
      #stage.is-portrait #hub-panel .hm-tile{padding-inline-start:10px;padding-top:54px}
      #stage #hub-panel .hm-tile .pt{position:absolute;inset-inline-start:8px;top:9px;bottom:9px;width:50px;display:grid;place-items:center;overflow:hidden;
        border:1px solid var(--mc);background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.13),rgba(4,8,16,.92) 72%);color:rgba(255,255,255,.2)}
      #stage.is-portrait #hub-panel .hm-tile .pt{bottom:auto;height:40px;width:40px;top:8px}
      #stage #hub-panel .hm-tile .pt svg{position:static;width:78%;height:78%;stroke:none;fill:currentColor;opacity:1}
      #stage #hub-panel .hm-tile .pt::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px);pointer-events:none}
      #stage #hub-panel .hm-tile .pt b{position:absolute;font:900 24px/1 var(--font);color:var(--mc);text-shadow:0 0 10px var(--mc);opacity:.9}
      #stage #hub-panel .hm-tile.lock .pt{border-color:rgba(255,255,255,.14)} #hub-panel .hm-tile.lock .pt b{color:#7f93a8;text-shadow:none}
      #stage #hub-panel .hm-tile .bossimg{top:9px;bottom:9px;inset-inline-start:8px;inset-inline-end:auto;width:50px;max-width:50px;height:calc(100% - 18px);object-fit:cover;object-position:50% 20%;z-index:1;filter:none}
      #stage.is-portrait #hub-panel .hm-tile .bossimg{height:40px;width:40px;max-width:40px;top:8px;bottom:auto}
      #stage #hub-panel .hm-tile.hasboss .pt{border-color:#ff2a45;box-shadow:0 0 12px rgba(255,42,69,.45);background:radial-gradient(circle at 50% 40%,rgba(255,42,69,.35),rgba(4,8,16,.92) 72%)}
      #stage #hub-panel .hm-tile.hasboss > svg{display:block}
      #stage #hub-panel .hm-tile.sel{outline:none;border-color:var(--cyan);box-shadow:inset 0 0 0 1px var(--cyan),0 0 22px rgba(57,215,255,.3)}
      #stage #hub-panel .hm-tile.sel::after{content:'';position:absolute;inset:3px;pointer-events:none;
        background:linear-gradient(var(--cyan),var(--cyan)) 0 0/14px 2px no-repeat,linear-gradient(var(--cyan),var(--cyan)) 0 0/2px 14px no-repeat,
          linear-gradient(var(--cyan),var(--cyan)) 100% 100%/14px 2px no-repeat,linear-gradient(var(--cyan),var(--cyan)) 100% 100%/2px 14px no-repeat;
        animation:hqBr 1.1s ease-in-out infinite}
      #stage #hub-panel .hm-det{position:relative;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);border-color:rgba(57,215,255,.25)}
      #stage #hub-panel .hm-det .art{position:relative;overflow:hidden}
      #stage #hub-panel .hm-det .art::before{content:'';position:absolute;left:50%;top:50%;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;
        border:2px dashed var(--mc);opacity:.55;animation:hqSpin 16s linear infinite}
      #stage #hub-panel .hm-det .art.boss::before{border-color:#ff2a45;width:92px;height:92px;margin:-46px 0 0 -46px}
      #stage #hub-panel .hm-det .art::after{content:'TARGET';position:absolute;inset-inline-end:8px;top:6px;font:800 9px/1 var(--font);letter-spacing:.3em;color:var(--mc);opacity:.9;animation:hqBlink 1.2s steps(2) infinite}
      #stage #hub-panel .hm-det .art.boss::after{color:#ff5c6e}
      #stage #hub-panel .hm-det .art.boss img{position:relative;z-index:1}
      #stage #hub-panel .hm-go{position:relative;overflow:hidden}
      #stage #hub-panel .hm-go:not(:disabled)::before{content:'';position:absolute;top:0;bottom:0;width:36%;left:-45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);animation:hqSheen 2.6s ease-in-out infinite}
      #stage.short #hub-panel .hm-det .art.boss{height:66px;min-height:66px} #stage.short #hub-panel .hm-det .art.boss img{height:66px;width:66px}
      #stage.short #hub-panel .hm-det .art.boss::before{width:62px;height:62px;margin:-31px 0 0 -31px}
      #stage.short #hub-panel .hm-det{gap:7px;padding:10px 12px}
      /* tiles too narrow for a portrait beside the text (small phones): the portrait sits behind the text, at the far end */
      #stage #hub-panel.hq-narrow .hm-tile{padding-inline-start:13px;padding-inline-end:8px;min-height:70px}
      #stage #hub-panel.hq-narrow .hm-tile > svg{display:none}
      #stage #hub-panel.hq-narrow .hm-tile .pt{inset-inline-start:auto;inset-inline-end:5px;top:5px;bottom:5px;width:44px;opacity:.42;border-color:transparent;background:none}
      #stage #hub-panel.hq-narrow .hm-tile .pt::after{display:none}
      #stage #hub-panel.hq-narrow .hm-tile .bossimg{inset-inline-start:auto;inset-inline-end:5px;top:5px;bottom:5px;width:46px;max-width:46px;height:calc(100% - 10px);opacity:.9}
      #stage #hub-panel.hq-narrow .hm-tile.hasboss .pt{opacity:1;border-color:#ff2a45}
      #stage #hub-panel.hq-narrow .hm-tile .n,#stage #hub-panel.hq-narrow .hm-tile .c,#stage #hub-panel.hq-narrow .hm-tile .s{position:relative;z-index:2;text-shadow:0 1px 3px #000}
      #stage:not(.is-portrait) #hub-panel .hm-det .hm-go{position:sticky;bottom:0;z-index:3;box-shadow:0 -10px 12px 4px rgba(9,20,36,.96)}
      #stage:not(.is-portrait) #hub-panel .hm-det{padding-bottom:10px}
      @keyframes hqTile{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
      @keyframes hqBr{50%{inset:6px;opacity:.55}}
      @keyframes hqSpin{to{transform:rotate(360deg)}}
      @keyframes hqBlink{50%{opacity:.25}}
      @keyframes hqSheen{0%,55%{left:-45%}100%{left:120%}}
      /* ---------- the HQ HUD ---------- */
      #stage #hub-tag{padding:9px 16px 10px 12px;gap:4px;border-inline-start:3px solid var(--amber);
        background:linear-gradient(90deg,rgba(8,20,36,.92),rgba(8,20,36,.55) 70%,rgba(8,20,36,0));
        clip-path:polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))}
      #stage #hub-tag::before{content:'';position:absolute;left:0;right:30%;top:0;height:1px;background:linear-gradient(90deg,var(--cyan),transparent)}
      #stage #hub-tag b{font-size:11px;letter-spacing:.34em}
      #stage #hub-tag span.hz{font-size:14px;letter-spacing:.08em}
      #stage #hub-act{padding:13px 26px 13px 20px;font-size:15px;overflow:hidden;box-shadow:0 0 26px rgba(255,168,38,.5);
        background:linear-gradient(100deg,#ffd24a,#ffa826 55%,#ff7a1f)}
      #stage #hub-act::after{content:'';position:absolute;top:0;bottom:0;width:34%;left:-45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);animation:hqSheen 2.2s ease-in-out infinite}
      #hqban{position:absolute;z-index:9;left:50%;top:21%;transform:translateX(-50%);display:none;justify-items:center;gap:5px;pointer-events:none;white-space:nowrap;text-align:center}
      #hqban.on{display:grid;animation:hqBan 2.6s ease-out forwards}
      #hqban small{font:700 clamp(9px,2vmin,12px)/1 var(--font);letter-spacing:.42em;color:var(--cyan)}
      #hqban b{font:800 clamp(18px,4.6vmin,36px)/1.1 var(--font);letter-spacing:.12em;color:#f4f8ff;text-shadow:0 0 18px rgba(57,215,255,.7)}
      #hqban[dir=rtl] b,#hqban[dir=rtl] small{letter-spacing:0}
      #hqban i{display:block;width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--amber),transparent)}
      @keyframes hqBan{0%{opacity:0;clip-path:inset(0 50% 0 50%)}14%{opacity:1;clip-path:inset(0 0 0 0)}78%{opacity:1}100%{opacity:0}}
      #stage:not(.in-hub) #hqban,#stage.in-menu #hqban,#stage.modal-on #hqban{display:none!important}`;
    document.head.appendChild(st);

    let lastZone = '', ban = null, banT = 0, watched = null, wasShown = false, inT = 0;
    // mission select: hub.js redraws the whole card on every tap. The portraits and the logo are put back in the
    // SAME frame (a MutationObserver runs before the browser paints), so nothing flickers; the tiles animate in
    // only when the panel opens.
    function decorate(panel) {
        const tiles = panel.querySelectorAll('.hm-tile'); if (!tiles.length) return;
        try { if (window.AxonComm && window.AxonComm.missionArt) window.AxonComm.missionArt(); } catch (e) { }
        tiles.forEach((t, k) => {
            if (!t.querySelector('.pt')) { const d = document.createElement('span'); d.className = 'pt'; d.innerHTML = UNKNOWN + (t.querySelector('.bossimg') ? '' : '<b>?</b>'); t.insertBefore(d, t.firstChild); }
            t.style.setProperty('--k', k);
        });
        const head = panel.querySelector('.hm-head'); if (head && !head.querySelector('.hq-lg') && window.AxonLogo) { const l = document.createElement('span'); l.className = 'hq-lg ax-logo'; l.innerHTML = window.AxonLogo; head.insertBefore(l, head.firstChild); }
        const w = tiles[0].getBoundingClientRect().width; if (w > 0) panel.classList.toggle('hq-narrow', w < 150 && !document.getElementById('stage').classList.contains('is-portrait'));
    }
    function watch(panel) {
        watched = panel;
        new MutationObserver(() => decorate(panel)).observe(panel, { childList: true });
        new MutationObserver(() => { const s = panel.classList.contains('show'); if (s && !wasShown) { panel.classList.add('hq-in'); clearTimeout(inT); inT = setTimeout(() => panel.classList.remove('hq-in'), 800); decorate(panel); } wasShown = s; }).observe(panel, { attributes: true, attributeFilter: ['class'] });
        decorate(panel);
    }
    function tick() {
        const stage = document.getElementById('stage'); if (!stage) return;
        const panel = document.getElementById('hub-panel'); if (panel && panel !== watched) watch(panel);
        // ---- the name of the wing you walked into ----
        const hz = document.querySelector('#hub-tag .hz'), hq = document.querySelector('#hub-tag b');
        if (hz && stage.classList.contains('in-hub') && !stage.classList.contains('in-menu')) {
            const name = hz.textContent.replace(/^[▸\s]+/, '');
            if (name && name !== lastZone) {
                lastZone = name;
                if (!ban) { ban = document.createElement('div'); ban.id = 'hqban'; stage.appendChild(ban); }
                ban.dir = /[؀-ۿ]/.test(name) ? 'rtl' : 'ltr';
                ban.innerHTML = `<small>${hq ? hq.textContent.replace(/^[◈\s]+/, '') : ''}</small><b>${name}</b><i></i>`;
                ban.classList.remove('on'); void ban.offsetWidth; ban.classList.add('on');
                try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) { a.tone('triangle', 520, 780, 0.12, 0.04); a.tone('triangle', 780, 780, 0.1, 0.03, { delay: 0.1 }); } } catch (e) { }
                clearTimeout(banT); banT = setTimeout(() => ban.classList.remove('on'), 2700);
            }
        } else if (!stage.classList.contains('in-hub')) lastZone = '';
    }
    setInterval(() => { try { tick(); } catch (e) { } }, 200);
})();
