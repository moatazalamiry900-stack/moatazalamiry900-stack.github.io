// =====================================================================
//  AXON BREACH — COOL RUNNING (cool.js)
//  A phone that plays for ten minutes gets hot, and a hot phone slows its own processor down: the game that
//  held 60 starts to stutter between 45 and 60, which looks far worse than a steady lower rate.
//  This watches the frames that are really drawn. When the game has been missing its frame rate for a good
//  quarter of a minute (the dynamic resolution has had its chance by then), it steps the frame cap down to the
//  next EVEN rate of the screen (120 Hz: 60 → 40 → 30 · 60 Hz: 60 → 30): every frame the same length again, a
//  third less work, the phone cools. After a while it tries the higher rate again; each failed try waits longer.
//  The player's own choice in Settings is never lost — it comes back when the phone has cooled, and changing the
//  cap by hand resets this. Phones only. Off with localStorage 'axon.cool' = 'off'.
//  Loaded by index.html after perf.js (it wraps AxonPerf.FrameLimiter before game.js creates the limiter).
// =====================================================================
'use strict';

window.AxonCool = (function () {
    const T = { en: 'COOL MODE', ar: 'وضع التبريد', es: 'MODO FRESCO', zh: '降温模式', ja: 'クールモード' };
    const BACK = { en: 'FULL SPEED', ar: 'السرعة الكاملة', es: 'VELOCIDAD TOTAL', zh: '全速', ja: 'フルスピード' };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    let off = false; try { off = localStorage.getItem('axon.cool') === 'off'; } catch (e) { }
    const phone = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const S = { lim: null, user: 60, mine: 0, last: 0, sum: 0, n: 0, winT: 0, slow: 0, wait: 90, since: 0, level: 0 };

    function chip(text, col) {
        const st = document.getElementById('stage'); if (!st) return;
        let el = document.getElementById('cool-chip');
        if (!el) { el = document.createElement('div'); el.id = 'cool-chip'; el.style.cssText = 'position:absolute;z-index:9;left:50%;top:calc(max(8px,env(safe-area-inset-top)) + 4px);transform:translateX(-50%);padding:5px 14px;font:700 11px/1 var(--font,system-ui);letter-spacing:.14em;color:#07090d;pointer-events:none;opacity:0;transition:opacity .4s;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)'; st.appendChild(el); }
        el.textContent = text; el.style.background = col; el.style.opacity = 1; clearTimeout(chip.t); chip.t = setTimeout(() => { el.style.opacity = 0; }, 2600);
    }
    const steps = hz => hz >= 115 ? [60, 40, 30] : hz >= 85 ? [60, 45, 30] : [60, 30];
    // one drawn frame: now (ms), hz of the screen
    function frame(now, hz) {
        const L = S.lim; if (!L) return;
        if (L.cap !== S.mine && L.cap !== S.user) { S.user = L.cap; S.level = 0; S.mine = 0; S.slow = 0; S.wait = 90; }   // the player changed the cap by hand
        const d = now - S.last; S.last = now;
        if (d <= 0 || d > 250) { S.sum = 0; S.n = 0; S.winT = now; return; }                    // a pause, a loading stall, a tab switch: start measuring again
        S.sum += d; S.n++;
        if (now - S.winT < 5000) return;
        const avg = S.sum / S.n, target = 1000 / Math.min(L.cap || hz, hz); S.sum = 0; S.n = 0; S.winT = now;
        const list = steps(hz).filter(c => c <= S.user), at = Math.max(0, list.indexOf(L.cap));
        const next = list[at + 1], thr = next && L.cap / next >= 1.9 ? 1.4 : 1.17;                // halving the rate is a big step: only when it is really struggling
        if (avg > target * thr) {                                                               // missing the rate
            if (++S.slow >= 3 && S.user >= 60 && at < list.length - 1) {
                S.slow = 0; S.level = at + 1; S.mine = L.cap = list[S.level]; S.since = now;
                if (S.failed) S.wait = Math.min(480, S.wait * 2); S.failed = false;
                chip(T[lang()] + ' · ' + L.cap + ' FPS', '#5cf0a0');
            }
        } else {
            S.slow = 0;
            if (S.level > 0 && now - S.since > S.wait * 1000) {                                  // cooled down? try one step up
                S.level--; S.mine = L.cap = list[S.level] || S.user; S.since = now; S.failed = true; S.tryT = now;
                if (S.level === 0) { S.mine = 0; L.cap = S.user; chip(BACK[lang()] + ' · ' + L.cap + ' FPS', '#39d7ff'); }
            } else if (S.failed && now - S.tryT > 40000) { S.failed = false; S.wait = 90; }       // the higher rate held for 40 s: it was a success
        }
    }
    if (!off && phone && window.AxonPerf && window.AxonPerf.FrameLimiter) {
        const Orig = window.AxonPerf.FrameLimiter;
        window.AxonPerf.FrameLimiter = function () {
            const L = new Orig(), ok = L.ok;
            L.ok = ts => { const go = ok(ts); if (go) { try { frame(performance.now(), window.AxonPerf.Display.hz || 60); } catch (e) { } } return go; };
            S.lim = L; setTimeout(() => { S.user = L.cap; }, 0);
            return L;
        };
    }
    return { frame, state: S, attach(L) { S.lim = L; S.user = L.cap; } };
})();
