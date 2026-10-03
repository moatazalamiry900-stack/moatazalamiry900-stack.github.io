// =====================================================================
//  AXON BREACH — WINNER: the victory moment (winner.js)
//   • AxonWinner.show({ sub, music }) — the word WINNER comes up across the screen (letters rising one after the
//     other, a gold-to-white sheen, a line of light opening under it, sparks), with an optional line under it,
//     and sounds/victory-march.mp3 plays while the game's own music steps back.
//   • AxonWinner.stop() — fades the march out and brings the game's music back.
//  Called when the guardian falls (level.js) and when an expedition is cleared (explore.js).
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonWinner = (function () {
    const SRC = 'sounds/victory-march.mp3', WORD = 'WINNER';
    let el = null, audio = null, hideT = 0, stopT = 0, fadeId = 0;

    function build() {
        const st = document.createElement('style');
        st.textContent = `
          #winner{position:absolute;inset:0;z-index:70;display:grid;place-items:center;pointer-events:none;opacity:0;overflow:hidden;
            background:radial-gradient(ellipse at 50% 50%,rgba(255,194,74,.16),rgba(4,6,14,.72) 62%);transition:opacity .35s}
          #winner.on{opacity:1}
          #stage.winner-on #overlay{visibility:hidden}
          #stage.modal-on #toast,#stage.modal-on #tipbar,#stage.modal-on #boss-bar,#stage.modal-on #bdlg{opacity:0!important;visibility:hidden}
          #winner .band{position:absolute;left:-10%;right:-10%;top:50%;height:34vmin;transform:translateY(-50%) scaleY(0);
            background:linear-gradient(180deg,transparent,rgba(255,210,122,.14) 30%,rgba(255,255,255,.2) 50%,rgba(255,210,122,.14) 70%,transparent)}
          #winner.on .band{animation:wnBand .5s cubic-bezier(.2,.9,.2,1) forwards}
          #winner .box{position:relative;display:grid;justify-items:center;gap:1.6vmin;transform:skewX(-8deg)}
          #winner .word{display:flex;direction:ltr;font:900 clamp(54px,19vmin,190px)/0.92 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.04em;
            filter:drop-shadow(0 0 22px rgba(255,170,40,.75)) drop-shadow(0 6px 0 rgba(120,40,0,.55))}
          #winner .word span{display:block;opacity:0;transform:translateY(60%) scale(1.5);
            background:linear-gradient(180deg,#fff 0%,#ffe9a8 34%,#ffb52e 62%,#ff7a1f 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.55)}
          #winner.on .word span{animation:wnLetter .5s cubic-bezier(.16,1.3,.3,1) forwards;animation-delay:calc(var(--i) * 70ms + 120ms)}
          #winner .line{width:min(74vw,900px);height:3px;background:linear-gradient(90deg,transparent,#fff 20%,#ffc24a 50%,#fff 80%,transparent);transform:scaleX(0);box-shadow:0 0 18px #ffc24a}
          #winner.on .line{animation:wnLine .55s .55s cubic-bezier(.2,.9,.2,1) forwards}
          #winner .sub{font:700 clamp(12px,3.2vmin,24px)/1.2 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.4em;color:#fff3d6;text-shadow:0 0 14px rgba(255,170,40,.9);opacity:0;max-width:88vw;text-align:center;padding-inline-start:.4em}
          @media (max-aspect-ratio:1/1){#winner .sub{letter-spacing:.14em;font-size:clamp(11px,3.4vw,18px)}}
          #winner .sub[dir=rtl]{letter-spacing:0}
          #winner.on .sub{animation:wnSub .5s .8s ease-out forwards}
          #winner .shine{position:absolute;top:-20%;bottom:-20%;width:22%;left:-30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);mix-blend-mode:screen;opacity:0}
          #winner.on .shine{animation:wnShine .9s .75s ease-in-out forwards}
          #winner i{position:absolute;left:50%;top:50%;width:3px;height:16px;border-radius:2px;background:#ffd27a;box-shadow:0 0 8px #ffb52e;opacity:0}
          #winner.on i{animation:wnSpark 1.1s .35s ease-out forwards}
          @keyframes wnBand{to{transform:translateY(-50%) scaleY(1)}}
          @keyframes wnLetter{60%{opacity:1}to{opacity:1;transform:none}}
          @keyframes wnLine{to{transform:scaleX(1)}}
          @keyframes wnSub{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          @keyframes wnShine{0%{opacity:1;left:-30%}85%{opacity:1}100%{opacity:0;left:110%}}
          @keyframes wnSpark{0%{opacity:1;transform:rotate(var(--a)) translateY(0) scaleY(1)}100%{opacity:0;transform:rotate(var(--a)) translateY(calc(var(--d) * -1)) scaleY(.3)}}
          @media (prefers-reduced-motion:reduce){#winner *{animation-duration:.01s!important;animation-delay:0s!important}}`;
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'winner'; el.setAttribute('aria-live', 'polite');
        let sparks = ''; for (let k = 0; k < 22; k++) sparks += `<i style="--a:${Math.round(k * 360 / 22 + (k % 2) * 7)}deg;--d:${28 + (k * 37 % 22)}vmin"></i>`;
        el.innerHTML = `<div class="band"></div>${sparks}<div class="box"><div class="word">${WORD.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div><div class="line"></div><div class="sub"></div><div class="shine"></div></div>`;
        (document.getElementById('stage') || document.body).appendChild(el);
    }
    const musicOn = () => { try { return localStorage.getItem('axon.music') !== '0'; } catch (e) { return true; } };
    // the game's own music (game.js exposes it): down while the march plays, back afterwards
    const duck = down => { const M = window.AxonMusic; if (!M || !M.el) return; try { if (down) M.fade(M.el, 0, 300); else if (M.on && M.started) M.fade(M.el, M.vol, 900); } catch (e) { } };
    function fadeOut(ms) {
        if (!audio) return; const a = audio, id = ++fadeId, v0 = a.volume, t0 = performance.now();
        const step = () => { if (id !== fadeId) return; const k = Math.min(1, (performance.now() - t0) / ms); a.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(step); else { try { a.pause(); } catch (e) { } } };
        step();
    }
    // opts: sub = the line under the word · hold = seconds the word stays (default 3.2) · music = seconds of the march (0 = to its end)
    function show(opts = {}) {
        if (!el) build();
        const sub = el.querySelector('.sub'); sub.textContent = opts.sub || ''; sub.dir = /[؀-ۿ]/.test(opts.sub || '') ? 'rtl' : 'ltr';
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');                        // restart the animation
        if (window.AxonSfx) window.AxonSfx.fanfare();
        const stg = document.getElementById('stage'); if (stg) stg.classList.add('winner-on');          // the result card waits behind it (CSS below)
        clearTimeout(hideT); hideT = setTimeout(() => { el.classList.remove('on'); setTimeout(() => { if (stg && !el.classList.contains('on')) stg.classList.remove('winner-on'); }, 380); }, (opts.hold || 3.2) * 1000);
        clearTimeout(stopT); fadeId++;
        if (musicOn()) {
            try {
                if (!audio) { audio = new Audio(SRC); audio.preload = 'auto'; audio.addEventListener('ended', () => duck(false)); audio.addEventListener('error', () => { console.warn('winner: ' + SRC + ' not found'); duck(false); }); }
                audio.currentTime = 0; audio.volume = 0.75; duck(true);
                const p = audio.play(); if (p && p.catch) p.catch(() => duck(false));
                if (opts.music > 0) stopT = setTimeout(stop, opts.music * 1000);
            } catch (e) { duck(false); }
        }
    }
    function stop() { clearTimeout(stopT); if (audio && !audio.paused) fadeOut(900); duck(false); }
    // load the file ahead, so the march starts on the beat
    function preload() { try { if (!audio && musicOn()) { audio = new Audio(SRC); audio.preload = 'auto'; audio.addEventListener('ended', () => duck(false)); audio.addEventListener('error', () => { console.warn('winner: ' + SRC + ' not found'); duck(false); }); } } catch (e) { } }
    return { show, stop, preload };
})();

// =====================================================================
//  WARNING: the guardian wakes up. AxonWarning.show() — a red WARNING between two hazard bars lights up four
//  times across the screen while sounds/warning.mp3 plays. Called by level.js when the boss activates.
// =====================================================================
window.AxonWarning = (function () {
    const SRC = 'sounds/warning.mp3', N = 4, BEAT = 0.72;
    let el = null, audio = null, hideT = 0, watch = 0;
    function build() {
        const st = document.createElement('style');
        st.textContent = `
          #warn{position:absolute;inset:0;z-index:69;display:none;place-items:center;pointer-events:none;overflow:hidden}
          #warn.on{display:grid}
          #warn .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(255,20,40,.42) 100%);opacity:0}
          #warn .box{position:relative;width:100%;display:grid;justify-items:center;gap:1.2vmin;padding:1.6vmin 0;opacity:0;
            background:linear-gradient(180deg,transparent,rgba(40,0,6,.78) 18%,rgba(40,0,6,.78) 82%,transparent)}
          #warn .bar{width:120%;height:2.6vmin;background:repeating-linear-gradient(-55deg,#ff1f3a 0 3.2vmin,#1a0206 3.2vmin 6.4vmin);box-shadow:0 0 18px rgba(255,30,60,.8)}
          #warn .bar.a{animation:wrSlide 1.2s linear infinite}
          #warn .bar.b{animation:wrSlide 1.2s linear infinite reverse}
          #warn .word{direction:ltr;font:900 clamp(40px,15vmin,150px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.14em;padding-inline-start:.14em;transform:skewX(-8deg);
            color:#ff2a45;-webkit-text-stroke:1px rgba(255,200,205,.8);text-shadow:0 0 12px #ff1f3a,0 0 38px rgba(255,20,50,.85),0 4px 0 #5a000c}
          #warn .sub{direction:ltr;font:700 clamp(9px,2.4vmin,18px)/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.5em;color:#ffb3bc;text-shadow:0 0 10px #ff1f3a}
          #warn.on .box,#warn.on .vig{animation:wrFlash ${BEAT}s ease-in-out ${N} both}
          @keyframes wrFlash{0%{opacity:0}18%{opacity:1}62%{opacity:1}100%{opacity:0}}
          @keyframes wrSlide{to{transform:translateX(-6.4vmin)}}
          @media (prefers-reduced-motion:reduce){#warn .bar{animation:none!important}}`;
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'warn'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="vig"></div><div class="box"><div class="bar a"></div><div class="word">WARNING</div><div class="sub">GUARDIAN DETECTED</div><div class="bar b"></div></div>';
        (document.getElementById('stage') || document.body).appendChild(el);
    }
    function preload() { try { if (!audio) { audio = new Audio(SRC); audio.preload = 'auto'; audio.addEventListener('error', () => console.warn('warning: ' + SRC + ' not found')); } } catch (e) { } }
    const paused = () => { const t = document.getElementById('tips-panel'); return !!(t && t.classList.contains('show')); };
    function play() {
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        clearTimeout(hideT); hideT = setTimeout(() => { el.classList.remove('on'); if (audio && !audio.paused) { try { audio.pause(); } catch (e) { } } }, N * BEAT * 1000 + 600);
        try { audio.currentTime = 0; audio.volume = 0.85; const p = audio.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
    }
    // The first meeting with the guardian also opens the field guide (the game freezes under it) a moment after
    // it wakes: the warning would flash unseen behind that panel. So it plays at once, and if the guide comes up
    // in the next second it is stopped and played again, in full, when the guide is closed.
    function show() {
        if (!el) build(); preload();
        clearInterval(watch); let n = 0, held = false;
        if (paused()) held = true; else play();
        watch = setInterval(() => {
            const p = paused();
            if (p && !held) { held = true; clearTimeout(hideT); el.classList.remove('on'); try { audio.pause(); } catch (e) { } }
            else if (!p && held) { clearInterval(watch); setTimeout(play, 250); }
            else if (!held && ++n > 12) clearInterval(watch);
        }, 100);
    }
    return { show, preload };
})();

// =====================================================================
//  BOSS INTRO: what happens between the guardian waking and the fight (called by level.js every frame of it).
//   1 the game's music stops and WARNING flashes four times with its siren;
//   2 the hero and SENTINEL-Ω talk — six lines in a box at the bottom, typed out letter by letter; tap the box
//     (or press Enter) to finish a line / go on, otherwise each line moves on by itself;
//   3 the guardian's life bar appears empty and fills up notch by notch, ticking;
//   4 the music comes back and the fight starts. Until then the guardian neither attacks nor takes damage.
//  It runs on game time, so it waits while the field guide has the game frozen.
// =====================================================================
window.AxonBossIntro = (function () {
    const NAME = { ar: 'أنت', en: 'YOU', es: 'TÚ', zh: '你', ja: 'あなた' };
    // [speaker (0 hero, 1 guardian), line]
    const TALK = {
        ar: [[1, 'توقّف. هذه القاعة آخر ما ستراه، أيها الدخيل.'], [0, 'أنت الحارس إذن. افتح الطريق إلى القلب، ولن أضطر لتفكيكك.'], [1, 'أنا SENTINEL-Ω. بُنيت لأحمي هذه المنشأة، لا لأفاوض.'], [0, 'من بناك تخلّى عنك. المنشأة سقطت، وأنت تحرس ركاماً.'], [1, 'أوامري لا تسقط. تحليل التهديد اكتمل… النتيجة: إبادة.'], [0, 'إذن سأعبر من فوق حطامك.']],
        en: [[1, 'Halt. This chamber is the last thing you will see, intruder.'], [0, 'So you are the guardian. Open the way to the core and I won\'t have to take you apart.'], [1, 'I am SENTINEL-Ω. I was built to protect this facility, not to negotiate.'], [0, 'Whoever built you walked away. The facility has fallen — you are guarding rubble.'], [1, 'My orders do not fall. Threat analysis complete… result: annihilation.'], [0, 'Then I\'ll walk over your wreckage.']],
        es: [[1, 'Alto. Esta sala es lo último que verás, intruso.'], [0, 'Así que tú eres el guardián. Abre el paso al núcleo y no tendré que desmontarte.'], [1, 'Soy SENTINEL-Ω. Me construyeron para proteger esta instalación, no para negociar.'], [0, 'Quien te construyó te abandonó. La instalación ha caído: custodias escombros.'], [1, 'Mis órdenes no caen. Análisis de amenaza completo… resultado: aniquilación.'], [0, 'Entonces pasaré por encima de tus restos.']],
        zh: [[1, '站住。入侵者，这间大厅就是你看到的最后景象。'], [0, '原来你就是守卫。打开通往核心的路，我就不必拆了你。'], [1, '我是 SENTINEL-Ω。我为守护这座设施而造，不为谈判。'], [0, '造你的人早已抛弃你。设施已经陷落，你守的只是废墟。'], [1, '我的命令不会陷落。威胁分析完成……结论：歼灭。'], [0, '那我就踏着你的残骸过去。']],
        ja: [[1, '止まれ。侵入者よ、この広間がお前の見る最後の景色だ。'], [0, 'お前がガーディアンか。コアへの道を開けろ。そうすれば壊さずに済む。'], [1, '私は SENTINEL-Ω。この施設を守るために造られた。交渉のためではない。'], [0, '造った者はお前を捨てた。施設はもう落ちた。お前が守っているのは瓦礫だ。'], [1, '私の命令は落ちない。脅威分析完了……結論：殲滅。'], [0, 'なら、お前の残骸を踏み越えて行く。']]
    };
    const NOTCH = 28, FILL = 1.7;
    let el = null, S = null;
    const lang = () => (window.AxonI18n && TALK[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const stage = () => document.getElementById('stage') || document.body;
    function build() {
        const st = document.createElement('style');
        st.textContent = `
          #stage.boss-intro #boss-bar{visibility:hidden}
          #bdlg{position:absolute;z-index:68;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 12px);transform:translate(-50%,16px);width:min(680px,92%);box-sizing:border-box;
            display:none;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:12px 16px 14px 12px;cursor:pointer;opacity:0;transition:opacity .2s,transform .2s;
            background:linear-gradient(180deg,rgba(10,14,26,.94),rgba(6,8,16,.96));border:1px solid var(--c);border-inline-start:5px solid var(--c);
            clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));box-shadow:0 0 26px rgba(0,0,0,.6)}
          #bdlg.on{display:grid}#bdlg.in{opacity:1;transform:translate(-50%,0)}
          #bdlg.s0{--c:#39d7ff}#bdlg.s1{--c:#ff2a45}
          #bdlg .pf{width:64px;height:64px;display:grid;place-items:center;border:2px solid var(--c);background:radial-gradient(circle,rgba(255,255,255,.12),transparent 70%);overflow:hidden;box-shadow:0 0 12px var(--c)}
          #bdlg .pf img{display:block;width:100%;height:100%;object-fit:cover}
          #bdlg .pf i{display:block;border-radius:50%;background:var(--c);box-shadow:0 0 14px var(--c)}
          #bdlg.s0 .pf i{width:26px;height:10px;border-radius:3px}#bdlg.s1 .pf i{width:20px;height:20px;animation:bdEye 1.1s ease-in-out infinite}
          #bdlg .nm{font:800 12px/1 var(--font,'Chakra Petch',system-ui,sans-serif);letter-spacing:.22em;color:var(--c);margin-bottom:6px;direction:ltr;text-align:start}
          #bdlg[dir=rtl] .nm{text-align:right}
          #bdlg .tx{font:600 clamp(14px,2.5vmin,19px)/1.5 var(--font,'Chakra Petch',system-ui,sans-serif);color:#f2f6ff;min-height:3em}
          #bdlg .go{position:absolute;inset-inline-end:14px;bottom:6px;font-size:11px;color:var(--c);opacity:0}
          #bdlg.full .go{opacity:1;animation:bdGo .7s ease-in-out infinite}
          #stage.is-portrait #bdlg{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 230px)}
          @keyframes bdEye{50%{transform:scale(.6);opacity:.6}}
          @keyframes bdGo{50%{transform:translateY(3px)}}`;
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'bdlg';
        el.innerHTML = '<div class="pf"><i></i></div><div><div class="nm"></div><div class="tx"></div></div><span class="go">▼</span>';
        stage().appendChild(el);
        const next = e => { if (S && S.ph === 'talk') { S.tap = true; if (e) { e.preventDefault(); e.stopPropagation(); } } };
        el.addEventListener('pointerdown', next);
        window.addEventListener('keydown', e => { if (e.code === 'Enter' && S && S.ph === 'talk') next(e); }, true);
    }
    const duck = down => { const M = window.AxonMusic; if (!M || !M.el) return; try { if (down) M.fade(M.el, 0, 300); else if (M.on && M.started) M.fade(M.el, M.vol, 1200); } catch (e) { } };
    function line(k) {
        const L = lang(), [who, txt] = TALK[L][k];
        S.k = k; S.txt = txt; S.c = 0; S.w = 0; S.tap = false;
        el.dir = L === 'ar' ? 'rtl' : 'ltr'; el.className = 'on in s' + who;
        el.querySelector('.nm').textContent = who ? 'SENTINEL-Ω' : NAME[L]; el.querySelector('.tx').textContent = '';
        let pic = null; try { pic = window.AxonComm && window.AxonComm.face ? window.AxonComm.face(who ? 2 : 0) : null; } catch (e) { }   // the real faces, from the models (comm.js)
        el.querySelector('.pf').innerHTML = pic ? `<img alt="" src="${pic}">` : '<i></i>';
    }
    function begin(boss) {
        if (!el) build();
        S = { ph: 'warn', t: 0, hp: boss.maxHp, n: -1 };
        stage().classList.add('boss-intro'); duck(true);
        if (window.AxonWarning) window.AxonWarning.show();
    }
    // every frame while the intro runs; true = the fight starts now
    function tick(boss, dt, api) {
        if (!S) return true;
        S.t += dt;
        if (S.ph === 'warn') {
            const w = document.getElementById('warn');
            if (S.t > 1 && !(w && w.classList.contains('on')) || S.t > 9) { S.ph = 'talk'; line(0); }
        } else if (S.ph === 'talk') {
            const full = S.c >= S.txt.length;
            if (!full) { const c0 = S.c | 0; S.c = S.tap ? S.txt.length : S.c + dt * 38; S.tap = false; if ((S.c | 0) !== c0) { el.querySelector('.tx').textContent = S.txt.slice(0, S.c | 0); if (window.AxonSfx) window.AxonSfx.type(TALK[lang()][S.k][0] ? 2 : 0); } }
            else {
                el.classList.add('full'); S.w += dt;
                if (S.tap || S.w > 2.6 + S.txt.length / 45) {
                    if (window.AxonSfx) window.AxonSfx.next();
                    if (S.k + 1 < TALK[lang()].length) line(S.k + 1);
                    else { el.classList.remove('in'); setTimeout(() => el.classList.remove('on'), 250); S.ph = 'fill'; S.t = 0; boss.hp = 0; stage().classList.remove('boss-intro'); }
                }
            }
        } else {
            const n = Math.min(NOTCH, Math.floor(S.t / FILL * NOTCH));
            if (n !== S.n) { S.n = n; boss.hp = Math.round(S.hp * n / NOTCH); api.AudioSys.playTone('square', 620 + n * 14, 620 + n * 14, 0.045, 0.05); }
            if (S.t >= FILL + 0.35) { boss.hp = S.hp; S = null; duck(false); api.AudioSys.playTone('sawtooth', 220, 880, 0.35, 0.09); return true; }
        }
        return false;
    }
    return { begin, tick, on: () => !!S };
})();

// =====================================================================
//  One text at a time: while a full-screen card is up (mission complete / game over, the field guide, a menu
//  panel) the small floating texts of the HUD — toast, tip bar, guardian's bar — are put away, so nothing is
//  ever written across something else. (#stage.modal-on; the rule is in the WINNER styles above.)
// =====================================================================
(function () {
    const shown = id => { const e = document.getElementById(id); return !!e && !e.hidden && (id === 'overlay' ? !e.classList.contains('title') : e.classList.contains('show')); };
    const css = document.createElement('style');
    css.textContent = '#stage.modal-on #toast,#stage.modal-on #tipbar,#stage.modal-on #boss-bar,#stage.modal-on #bdlg{opacity:0!important;visibility:hidden}#stage.winner-on #toast,#stage.winner-on #tipbar{opacity:0!important}#stage.boss-intro #tipbar,#stage.boss-intro #toast{opacity:0!important}#stage.boss-intro #touch-ui,#stage.boss-intro #slots{opacity:0!important;transition:opacity .3s}';
    document.head.appendChild(css);
    setInterval(() => { const st = document.getElementById('stage'); if (st) st.classList.toggle('modal-on', shown('overlay') || shown('tips-panel') || shown('ui-panel')); }, 200);
})();
