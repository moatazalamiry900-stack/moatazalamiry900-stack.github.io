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
        clearTimeout(hideT); hideT = setTimeout(() => el.classList.remove('on'), (opts.hold || 3.2) * 1000);
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
    let el = null, audio = null, hideT = 0;
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
    function show() {
        if (!el) build();
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        clearTimeout(hideT); hideT = setTimeout(() => { el.classList.remove('on'); if (audio && !audio.paused) { try { audio.pause(); } catch (e) { } } }, N * BEAT * 1000 + 600);
        preload();
        try { audio.currentTime = 0; audio.volume = 0.85; const p = audio.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
    }
    return { show, preload };
})();
