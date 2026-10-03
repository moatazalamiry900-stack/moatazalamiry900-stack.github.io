// =====================================================================
//  AXON BREACH — MENU SKIN: the game's logo and the look of every menu (menuskin.js)
//   • AxonLogo: the logo as an SVG — AXON in heavy slanted chrome letters drawn by hand (white-to-blue chrome with a
//     dark horizon line, navy outline, a hard drop shadow), its X oversized in hot orange and cut by a blade of
//     light, BREACH on a slanted plate under it, and a glint that sweeps across now and then.
//   • The styles of the main menu, the pause card, the panels (settings, help, about …) and the end screens:
//     cut corners, an accent bar, numbered entries that slide in one after the other, a sheen on the main button.
//  Loaded by index.html before ui.js (which puts AxonLogo in the menu).
// =====================================================================
'use strict';

(function () {
    // letters on a 100-high grid, slanted as a group
    const L = {
        A: 'M0 100L34 0H60L94 100H66L59 77H35L28 100ZM41 55H53L47 30Z',
        X: 'M0 0H32L50 31L68 0H100L66 50L100 100H68L50 69L32 100H0L34 50Z',
        O: 'M22 0H74L96 22V78L74 100H22L0 78V22ZM31 27L27 31V69L31 73H65L69 69V31L65 27Z',
        N: 'M0 100V0H28L66 58V0H94V100H66L28 42V100Z'
    };
    const word = (dx, dy) => `<g transform="translate(${dx} ${dy}) skewX(-13)">
        <path d="${L.A}" transform="translate(0 40)"/><path d="${L.O}" transform="translate(236 40)"/><path d="${L.N}" transform="translate(346 40)"/></g>`;
    const bigX = (dx, dy) => `<g transform="translate(${dx} ${dy}) skewX(-13)"><path d="${L.X}" transform="translate(98 6) scale(1.36 1.66)"/></g>`;
    const LOGO = `<svg class="ax-logo-svg" viewBox="0 0 500 250" role="img" aria-label="AXON BREACH">
      <defs>
        <linearGradient id="axChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#bfe6ff"/><stop offset=".49" stop-color="#4fa8ee"/>
          <stop offset=".5" stop-color="#0a2550"/><stop offset=".62" stop-color="#1558b0"/><stop offset="1" stop-color="#a8ecff"/>
        </linearGradient>
        <linearGradient id="axHot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff6c8"/><stop offset=".34" stop-color="#ffc23a"/><stop offset=".5" stop-color="#ff7a1a"/>
          <stop offset=".52" stop-color="#b3200c"/><stop offset=".7" stop-color="#ff5a1a"/><stop offset="1" stop-color="#ffe08a"/>
        </linearGradient>
        <linearGradient id="axPlate" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a1f"/><stop offset=".55" stop-color="#ffc23a"/><stop offset="1" stop-color="#ff5a1a"/></linearGradient>
        <linearGradient id="axBlade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#39d7ff" stop-opacity="0"/><stop offset=".4" stop-color="#bff6ff"/><stop offset="1" stop-color="#39d7ff" stop-opacity="0"/></linearGradient>
        <linearGradient id="axGlint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <clipPath id="axClip">${word(26, 6)}${bigX(26, 6)}</clipPath>
      </defs>
      <path d="M-10 118L470 86L500 92L20 132Z" fill="url(#axBlade)" opacity=".9"/>
      <path d="M40 150L420 128L410 136L30 160Z" fill="#39d7ff" opacity=".35"/>
      <g fill="#050c1c">${word(33, 14)}${bigX(33, 14)}</g>
      <g fill="url(#axChrome)" stroke="#071a3c" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${word(26, 6)}</g>
      <g fill="none" stroke="#eaf8ff" stroke-width="1.4" opacity=".9">${word(26, 6)}</g>
      <g fill="url(#axHot)" stroke="#3a0a04" stroke-width="8" stroke-linejoin="round" paint-order="stroke">${bigX(26, 6)}</g>
      <g fill="none" stroke="#fff3c4" stroke-width="1.6">${bigX(26, 6)}</g>
      <g clip-path="url(#axClip)"><rect class="ax-glint" x="-140" y="0" width="110" height="250" fill="url(#axGlint)" transform="skewX(-22)"/></g>
      <path d="M214 32l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#fff" class="ax-star"/>
      <g transform="translate(150 178) skewX(-13)">
        <path d="M0 0H318L332 14V50H14L0 36Z" fill="#06101f" transform="translate(6 7)"/>
        <path d="M0 0H318L332 14V50H14L0 36Z" fill="url(#axPlate)" stroke="#3a1400" stroke-width="3"/>
        <path d="M6 5H314L326 17" fill="none" stroke="#fff3c4" stroke-width="1.6" opacity=".8"/>
        <text x="166" y="38" text-anchor="middle" font-family="'Chakra Petch','Arial Black',Impact,sans-serif" font-weight="900" font-size="38" letter-spacing="11" fill="#1a0a00">BREACH</text>
      </g>
      <path d="M38 204H138M38 214H110" stroke="#39d7ff" stroke-width="4" opacity=".8"/>
    </svg>`;

    // ONE logo for the whole game. Every place that shows the game's name uses this drawing: the loading screen,
    // the main menu, the pause card, the About panel and the mission card. Each copy gets its own gradient ids
    // (a copy inside a hidden screen would otherwise switch the gradients of the others off).
    let copies = 0;
    Object.defineProperty(window, 'AxonLogo', { configurable: true, get() { const n = ++copies; return LOGO.replace(/ax(Chrome|Hot|Plate|Blade|Glint|Clip)\b/g, 'ax$1' + n); } });
    const ld = document.querySelector('#boot-load .ld-title'); if (ld) { ld.classList.add('ax-logo'); ld.innerHTML = window.AxonLogo; }

    const css = `
      .ax-logo{margin:0;font-size:0;line-height:0}
      .ax-logo-svg{display:block;width:min(100%,270px);height:auto;overflow:visible;filter:drop-shadow(0 0 22px rgba(57,215,255,.35))}
      #stage.short #menu .ax-logo-svg{width:min(100%,205px)} #stage.is-portrait #menu .ax-logo-svg{width:min(78%,300px)}
      .ld-title.ax-logo .ax-logo-svg{width:min(72vw,300px);margin:0 auto}
      .ldx-logo .ax-logo-svg{width:min(46vw,210px);margin:0 auto 4px} #stage.short .ldx-logo .ax-logo-svg{width:150px}
      .pz-logo .ax-logo-svg{width:150px;margin:0 auto 2px} .ab-game .ax-logo-svg{width:min(70%,220px);margin:0 auto 6px}
      #mcard .n.ax-logo{display:block;animation:mcLogo .5s .12s cubic-bezier(.2,1.3,.3,1) both} #mcard .n.ax-logo .ax-logo-svg{width:min(60vw,36vh,300px);min-width:190px;margin:0 auto}
      @keyframes mcLogo{from{opacity:0;transform:scale(1.5)}to{opacity:1;transform:none}}
      .ax-glint{animation:axGlint 4.6s 1.2s ease-in-out infinite} .ax-star{transform-origin:214px 50px;animation:axStar 4.6s 1.2s ease-in-out infinite}
      @keyframes axGlint{0%,62%{transform:translateX(0) skewX(-22deg)}86%,100%{transform:translateX(820px) skewX(-22deg)}}
      @keyframes axStar{0%,60%,100%{transform:scale(.2) rotate(0);opacity:0}72%{transform:scale(1.25) rotate(40deg);opacity:1}84%{transform:scale(.5) rotate(80deg);opacity:.2}}
      /* ---- main menu ---- */
      #menu{background:linear-gradient(90deg,rgba(2,6,14,.93) 0,rgba(3,9,20,.74) 26%,rgba(3,9,20,.2) 46%,rgba(3,9,20,0) 60%)}
      #stage.is-portrait #menu{background:linear-gradient(0deg,rgba(2,6,14,.96) 0,rgba(3,9,20,.74) 42%,rgba(3,9,20,0) 66%)}
      .mm-side{position:relative;gap:10px}
      #stage.short .mm-btn:after,#stage.is-portrait .mm-btn:not(.primary):after{display:none}
      #stage.short .mm-btn svg,#stage.is-portrait .mm-btn svg{padding:3px;width:20px;height:20px}
      #stage.short .mm-btn small,#stage.is-portrait .mm-btn small{letter-spacing:.14em}
      .mm-side:before{content:"";position:absolute;inset-block:8% 8%;inset-inline-start:calc(max(14px,env(safe-area-inset-left)));width:3px;background:linear-gradient(180deg,transparent,var(--cyan) 18%,var(--amber) 82%,transparent);opacity:.75}
      #stage.is-portrait .mm-side:before{display:none}
      .mm-kicker{letter-spacing:.42em}
      .mm-sub{color:#cfe8ff;border-inline-start:3px solid var(--amber);padding-inline-start:8px;margin-top:2px}
      .mm-nav{counter-reset:mm;gap:7px}
      .mm-btn{position:relative;overflow:hidden;counter-increment:mm;border:0;border-inline-start:3px solid rgba(57,215,255,.55);padding:8px 14px;
        background:linear-gradient(90deg,rgba(18,40,66,.82),rgba(10,22,40,.5) 70%,rgba(10,22,40,.18));
        clip-path:polygon(0 0,calc(100% - 13px) 0,100% 13px,100% 100%,0 100%);transition:transform .16s,background .16s,border-color .16s,filter .16s;
        opacity:0;animation:mmIn .34s cubic-bezier(.2,.9,.2,1) forwards}
      #menu.show .mm-btn{animation-play-state:running}
      .mm-btn:nth-of-type(1){animation-delay:.05s}.mm-btn:nth-of-type(2){animation-delay:.1s}.mm-btn:nth-of-type(3){animation-delay:.15s}.mm-btn:nth-of-type(4){animation-delay:.2s}.mm-btn:nth-of-type(5){animation-delay:.25s}.mm-btn:nth-of-type(6){animation-delay:.3s}.mm-btn:nth-of-type(7){animation-delay:.35s}
      @keyframes mmIn{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}
      .mm-btn:after{content:counter(mm,decimal-leading-zero);margin-inline-start:auto;font:700 11px/1 var(--font);letter-spacing:.12em;color:rgba(160,215,255,.38)}
      .mm-btn svg{width:22px;height:22px;padding:5px;box-sizing:content-box;background:rgba(57,215,255,.1);clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
      .mm-btn b{font-size:15.5px;font-weight:700;letter-spacing:.02em}
      .mm-btn:hover,.mm-btn:focus-visible{background:linear-gradient(90deg,rgba(57,215,255,.3),rgba(57,215,255,.1) 70%,rgba(57,215,255,.02));border-color:#bff6ff;transform:translateX(6px);filter:brightness(1.15)}
      html.rtl-text .mm-btn:hover,html.rtl-text .mm-btn:focus-visible{transform:translateX(-6px)}
      .mm-btn.primary{border:0;border-inline-start:5px solid #fff3c4;background:linear-gradient(100deg,#ffc23a,#ff8a1f 62%,#ff5a1a);color:#1a0900;padding-block:13px;box-shadow:0 0 26px rgba(255,150,40,.35)}
      .mm-btn.primary b{font-size:17px;letter-spacing:.04em}
      .mm-btn.primary svg{background:rgba(26,9,0,.16)}
      .mm-btn.primary:after{color:rgba(26,9,0,.5)}
      .mm-btn.primary:before{content:"";position:absolute;top:0;bottom:0;width:38%;left:-45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);animation:mmSheen 3.2s 1s ease-in-out infinite}
      @keyframes mmSheen{0%,55%{left:-45%}100%{left:120%}}
      .mm-btn.primary:hover,.mm-btn.primary:focus-visible{background:linear-gradient(100deg,#ffd45a,#ff9a2f 62%,#ff6a2a)}
      .mm-foot{letter-spacing:.2em;opacity:.75}
      .pick-btn{clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}
      /* ---- pause card, panels, end screens ---- */
      .pz-card,.pn-card{border:0;border-top:3px solid var(--cyan);background:linear-gradient(165deg,rgba(18,40,66,.94),rgba(6,13,26,.97));box-shadow:0 0 0 1px rgba(57,215,255,.28),0 24px 60px rgba(0,0,0,.6),0 0 44px rgba(57,215,255,.12);
        clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))}
      .pz-head b{background:linear-gradient(180deg,#fff,#9fdcff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .pz-head:after{content:"";display:block;height:2px;margin-top:8px;background:linear-gradient(90deg,transparent,var(--cyan),var(--amber),transparent)}
      .pn-card h2{padding-bottom:8px;border-bottom:2px solid;border-image:linear-gradient(90deg,var(--cyan),var(--amber),transparent) 1}
      #overlay .card h1{background:linear-gradient(180deg,#fff 10%,#bfe6ff 48%,#2f7fd6 52%,#a8ecff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(4,14,34,.9)) drop-shadow(0 0 20px rgba(57,215,255,.4))}
      #overlay .card h1 em{background:linear-gradient(180deg,#fff6c8,#ffc23a 45%,#ff5a1a);-webkit-background-clip:text;background-clip:text;color:transparent}
      .cta{position:relative;overflow:hidden;background:linear-gradient(100deg,#ffc23a,#ff8a1f 62%,#ff5a1a);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px));box-shadow:0 0 24px rgba(255,150,40,.4)}
      @media (prefers-reduced-motion:reduce){.mm-btn{animation:none;opacity:1}.ax-glint,.ax-star,.mm-btn.primary:before{animation:none}}`;
    const st = document.createElement('style'); st.id = 'ax-menuskin'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
})();
