// =====================================================================
//  AXON BREACH — "RETURN TO HQ" button on the mission HUD
//   • Always shown during a mission (not in HQ, the outer zone or exploration).
//   • Flashes after a sector is cleared, and keeps flashing while HP is low (≤ 30%).
//   • Tap once → it asks to confirm; tap again within 3 s → back to HQ (credits earned are kept).
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonRetreat = (function () {
    const L = {
        en: { go: 'Return to HQ', sure: 'Tap again to return', low: 'Low HP — retreat to HQ?' },
        ar: { go: 'العودة للمقر', sure: 'اضغط مرة ثانية للعودة', low: 'صحتك منخفضة — ترجع للمقر؟' },
        es: { go: 'Volver al cuartel', sure: 'Toca otra vez para volver', low: 'Vida baja — ¿volver al cuartel?' },
        zh: { go: '返回基地', sure: '再点一次返回', low: '生命值低 — 返回基地？' },
        ja: { go: '基地に戻る', sure: 'もう一度タップで帰還', low: 'HP低下 — 基地に戻る？' }
    };
    const S = k => { const l = window.AxonI18n ? window.AxonI18n.lang : 'en'; return (L[l] || L.en)[k]; };

    function create(c) {
        const st = document.createElement('style');
        st.textContent = `#btn-hq{display:none;border-color:rgba(255,168,38,.55);color:#ffe2c6}
          #btn-hq.on{display:flex}
          #btn-hq svg{stroke:var(--amber)}
          #btn-hq.flash{animation:hqFlash .7s ease-in-out infinite;background:rgba(255,122,42,.25)}
          #btn-hq.low.flash{animation-name:hqLow;border-color:#ff3a5a}
          #btn-hq.ask{background:linear-gradient(180deg,#ffd08a,#ff8a2a);color:#1a0d00;animation:none}
          #btn-hq.ask svg{stroke:#1a0d00}
          @keyframes hqFlash{50%{background:rgba(255,168,38,.75);color:#1a0d00;box-shadow:0 0 18px rgba(255,168,38,.9)}}
          @keyframes hqLow{50%{background:rgba(255,58,90,.8);color:#fff;box-shadow:0 0 18px rgba(255,58,90,.9)}}
          #stage.is-portrait #btn-hq b{display:none}
          #stage.is-portrait #btn-hq.ask b,#stage.is-portrait #btn-hq.flash b{display:inline}
          @media (prefers-reduced-motion:reduce){#btn-hq.flash{animation:none;background:rgba(255,168,38,.6)}}`;
        document.head.appendChild(st);
        const b = document.createElement('button');
        b.className = 'chip'; b.id = 'btn-hq'; b.type = 'button';
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg><b></b>`;
        const sys = document.querySelector('.hud-right .sys');
        if (sys) sys.insertBefore(b, sys.firstChild); else c.stage.appendChild(b);
        const lab = b.querySelector('b');
        let active = false, askT = 0, flashT = 0, low = false, lowSaid = false;
        const label = () => { lab.textContent = askT > 0 ? S('sure') : S('go'); b.setAttribute('aria-label', S('go')); };
        label();
        if (window.AxonI18n) window.AxonI18n.onChange(label);
        b.addEventListener('click', () => {
            if (!active) return;
            try { c.AudioSys.init(); } catch (e) { }
            if (askT > 0) { try { c.AudioSys.playUi('open'); } catch (e) { } c.go(); return; }
            askT = 3; label(); b.classList.add('ask');
            try { c.AudioSys.playUi('select'); } catch (e) { }
        });
        return {
            // a sector was just cleared: flash for a while
            flash() { flashT = 8; },
            // every frame: on = a mission is being played, hurt = HP low
            update(dt, on, hurt) {
                if (on !== active) { active = on; b.classList.toggle('on', on); if (!on) { askT = 0; flashT = 0; b.classList.remove('ask', 'flash', 'low'); label(); } }
                if (!on) return;
                if (askT > 0 && (askT -= dt) <= 0) { askT = 0; b.classList.remove('ask'); label(); }
                if (flashT > 0) flashT -= dt;
                if (hurt && !low && !lowSaid && c.toast) { c.toast(S('low')); lowSaid = true; }
                if (!hurt) lowSaid = false;
                low = hurt;
                b.classList.toggle('low', low);
                b.classList.toggle('flash', low || flashT > 0);
            }
        };
    }
    return { create, S };
})();
