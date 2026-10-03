// =====================================================================
//  AXON BREACH — THE EYE DOORS (riddle.js)
//  Two arena gates of mission 01 are shut by a door with an eye, like the guardian's:
//   · THE WATCHER (floor 3): look through the eye — you see the machines waiting inside. Repeat the
//     eye's sequence of crystals before the time runs out and a meteor strike wipes the room: the sector
//     is cleared without a fight. Fail (or give up) and the door opens on them as they are.
//   · THE LOCK (floor 7): three rings round the pupil, each turn drags a neighbour. Line the three marks
//     up and the door opens. No clock.
//  Solo: the game waits while the panel is open. Co-op: the result is shared (coop.js 'pz'), kills are the host's.
//  level.js calls AxonRiddle.tick every frame of the mission. Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonRiddle = (function () {
    const T = {
        en: { peek: 'LOOK THROUGH THE EYE', unlock: 'SOLVE THE LOCK', a: 'THE WATCHER', b: 'THE LOCK', inside: 'hostiles inside', watch: 'Watch the sequence…', repeat: 'Repeat it', again: 'Wrong — watch again', give: 'Open the door and fight', win: 'METEOR STRIKE', winS: 'sector cleared', lose: 'THE DOOR OPENS', loseS: 'fight!', bHelp: 'Turn the rings until the three marks meet at the top. Each turn drags a neighbour.', open: 'UNLOCKED', openS: 'the way is open', close: 'Close', key: 'E' },
        ar: { peek: 'انظر من العين', unlock: 'حل القفل', a: 'العين الراصدة', b: 'القفل', inside: 'عدو في الداخل', watch: 'راقب التسلسل…', repeat: 'كرّره الآن', again: 'خطأ — راقب مرة ثانية', give: 'افتح الباب وقاتل', win: 'ضربة نيازك', winS: 'تم تطهير القطاع', lose: 'الباب ينفتح', loseS: 'قاتل!', bHelp: 'دوّر الحلقات حتى تلتقي العلامات الثلاث في الأعلى. كل دورة تسحب حلقة مجاورة.', open: 'انفتح القفل', openS: 'الطريق مفتوح', close: 'إغلاق', key: 'E' },
        es: { peek: 'MIRA POR EL OJO', unlock: 'RESUELVE EL CIERRE', a: 'EL VIGÍA', b: 'EL CIERRE', inside: 'enemigos dentro', watch: 'Observa la secuencia…', repeat: 'Repítela', again: 'Fallo — mira otra vez', give: 'Abrir la puerta y luchar', win: 'LLUVIA DE METEOROS', winS: 'sector despejado', lose: 'LA PUERTA SE ABRE', loseS: '¡lucha!', bHelp: 'Gira los anillos hasta que las tres marcas coincidan arriba. Cada giro arrastra un vecino.', open: 'DESBLOQUEADO', openS: 'camino abierto', close: 'Cerrar', key: 'E' },
        zh: { peek: '透过魔眼窥视', unlock: '解开锁', a: '监视之眼', b: '环锁', inside: '个敌人在里面', watch: '看好顺序…', repeat: '重复一遍', again: '错了 — 再看一次', give: '开门迎战', win: '陨石打击', winS: '区域已清除', lose: '门开了', loseS: '战斗！', bHelp: '转动圆环，让三个标记在顶部对齐。每次转动会带动相邻的环。', open: '已解锁', openS: '道路已开', close: '关闭', key: 'E' },
        ja: { peek: '魔眼をのぞく', unlock: 'ロックを解く', a: '監視の眼', b: 'リングロック', inside: '体の敵が中にいる', watch: '順番を見て…', repeat: '同じ順に', again: '違う — もう一度', give: '扉を開けて戦う', win: 'メテオストライク', winS: 'セクター制圧', lose: '扉が開く', loseS: '戦え！', bHelp: 'リングを回して三つの印を上でそろえる。回すと隣のリングも動く。', open: '解除', openS: '道は開いた', close: '閉じる', key: 'E' }
    };
    const lang = () => (window.AxonI18n && T[window.AxonI18n.lang]) ? window.AxonI18n.lang : 'en';
    const tx = k => T[lang()][k];
    const stage = () => document.getElementById('stage');
    const sfx = f => { try { const a = window.AxonAudio && window.AxonAudio.AudioSys; if (a && a.ctx) f(a); } catch (e) { } };
    const coop = () => window.AxonCoop && window.AxonCoop.on, guest = () => coop() && window.AxonCoop.guest;
    const GEM = [['#39d7ff', '◆', 523], ['#ff2a9d', '▲', 659], ['#ffc24a', '●', 784], ['#5cf0a0', '■', 988]];
    const TIME = 30, SEQ = 5, PW = 320, PH = 180;

    let built = null, doors = [], API = null, P = null;
    let go = null, panel = null, big = null, cur = null, frozen = false;      // cur: the door whose panel is open
    let rt = null, cam = null, buf = null, img = null, ctx2 = null, lut = null, peekT = 0;
    const _v = new THREE.Vector3();

    // ---------- the doors ----------
    function build(api, layout) {
        built = layout; doors = [];
        const SEC = window.AxonSectors; if (!SEC || !SEC.eyeDoor) return;
        [[2, 'a', 0xb58cff], [6, 'b', 0x5cf0a0]].forEach(([ai, kind, col]) => {
            const a = layout.arenas[ai]; if (!a || a.state !== 'idle') return;      // already cleared (checkpoint): no door
            const tmp = []; SEC.eyeDoor(api, a.entryZ, a.h, tmp); const d = tmp[0]; if (!d) return;
            d.beam.visible = false; d.iris.color.setHex(col); d.glow.color.setHex(col);
            Object.assign(d, { ai, kind2: kind, a, col, state: 'shut', ot: 0, met: null });
            doors.push(d);
        });
    }
    function openDoor(d) {
        if (d.state !== 'shut') return; d.state = 'opening'; d.ot = 0;
        const i = API.solids.indexOf(d.box); if (i > -1) API.solids.splice(i, 1);
        try { API.AudioSys.playGateOpen(); } catch (e) { } if (window.AxonSfx && window.AxonSfx.lift) window.AxonSfx.lift();
    }

    // ---------- screen ----------
    function dom() {
        if (panel) return;
        const st = document.createElement('style');
        st.textContent = `
          #rd-go{position:absolute;z-index:8;left:50%;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 74px);transform:translateX(-50%);display:none;align-items:center;gap:10px;padding:12px 22px;border:0;cursor:pointer;
            font:800 15px/1 var(--font,system-ui);letter-spacing:.12em;color:#07090d;background:var(--rc,#b58cff);clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);box-shadow:0 0 24px var(--rc,#b58cff);animation:rdPulse 1s ease-in-out infinite;pointer-events:auto;touch-action:manipulation}
          #rd-go.on{display:flex} #rd-go kbd{font:800 12px/1 var(--font,system-ui);padding:3px 6px;background:rgba(0,0,0,.25);color:#fff;border-radius:3px}
          #rd-go[dir=rtl]{letter-spacing:0;font-size:17px}
          #stage.modal-on #rd-go,#stage.comm-on #rd-go,#stage.rd-on #rd-go{display:none!important}
          #rd{position:absolute;inset:0;z-index:30;display:none;place-items:center;background:radial-gradient(ellipse at 50% 40%,rgba(8,6,16,.78),rgba(2,2,6,.94));font-family:var(--font,system-ui);color:#eef;pointer-events:auto;touch-action:manipulation}
          #rd.on{display:grid}
          #rd .card{--rc:#b58cff;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:22px;align-items:center;width:min(880px,94%);max-height:94%;padding:18px 22px;background:linear-gradient(160deg,rgba(26,20,40,.96),rgba(10,10,18,.97));
            border:1px solid color-mix(in srgb,var(--rc) 55%,transparent);box-shadow:0 0 40px color-mix(in srgb,var(--rc) 35%,transparent),inset 0 0 0 1px rgba(255,255,255,.04);clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}
          #rd .card.solo{grid-template-columns:1fr;width:min(460px,94%);justify-items:center;text-align:center}
          #rd .eye{position:relative;aspect-ratio:16/9;background:#000;clip-path:ellipse(50% 50% at 50% 50%);box-shadow:inset 0 0 0 3px var(--rc)}
          #rd .eye canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
          #rd .eye::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(0,0,0,.85) 100%),repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px)}
          #rd .cap{margin-top:8px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--rc)} #rd .cap b{font-size:20px;color:#fff}
          #rd h2{margin:0 0 4px;font-size:clamp(20px,3.6vw,30px);font-weight:900;font-style:italic;letter-spacing:.1em;color:#fff;text-shadow:0 0 16px var(--rc)}
          #rd .say{min-height:20px;font-size:14px;font-weight:600;color:#cfd3e6;line-height:1.5}
          #rd .say.bad{color:#ff5a7a}
          #rd .gems{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 10px;direction:ltr}
          #rd .gems button{aspect-ratio:1;border:0;cursor:pointer;font-size:clamp(22px,4.4vw,34px);color:rgba(0,0,0,.6);background:var(--g);opacity:.42;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);transition:opacity .12s,transform .12s,filter .12s;touch-action:manipulation}
          #rd .gems button.lit{opacity:1;transform:scale(1.12);filter:brightness(1.5) drop-shadow(0 0 14px var(--g))}
          #rd .gems.in button{opacity:.9} #rd .gems.in button:active{transform:scale(.92)}
          #rd .dots{display:flex;gap:6px;justify-content:center;margin-bottom:10px;direction:ltr} #rd .dots i{width:22px;height:5px;background:rgba(255,255,255,.14)} #rd .dots i.ok{background:var(--rc);box-shadow:0 0 8px var(--rc)}
          #rd .time{height:7px;background:rgba(255,255,255,.1);overflow:hidden} #rd .time i{display:block;height:100%;transform-origin:left;background:linear-gradient(90deg,#ff2a55,#ffc24a 40%,#5cf0a0)}
          #rd .alt{margin-top:12px;padding:9px 14px;width:100%;border:1px solid rgba(255,255,255,.22);background:transparent;color:#cfd3e6;font:700 12px/1 var(--font,system-ui);letter-spacing:.1em;cursor:pointer;touch-action:manipulation}
          #rd .rings{position:relative;width:min(230px,56vw,46vh);aspect-ratio:1;margin:10px auto}
          #rd .rings .r{position:absolute;border-radius:50%;border:3px solid color-mix(in srgb,var(--rc) 45%,#223);transition:transform .22s cubic-bezier(.3,1.5,.5,1)}
          #rd .rings .r::before{content:"";position:absolute;left:50%;top:-9px;width:14px;height:14px;margin-left:-7px;background:var(--rc);box-shadow:0 0 12px var(--rc);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
          #rd .rings .pup{position:absolute;inset:38%;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,var(--rc) 45%,#120818 75%)}
          #rd .rings .top{position:absolute;left:50%;top:-16px;margin-left:-1px;width:2px;height:16px;background:#fff}
          #rd .turn{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;direction:ltr} #rd .turn button{padding:13px 0;border:0;cursor:pointer;font:800 16px/1 var(--font,system-ui);color:#07090d;background:var(--rc);touch-action:manipulation} #rd .turn button:active{filter:brightness(1.4)}
          #rd.watch .puz{display:none} #rd.watch .card{grid-template-columns:1fr;width:min(720px,94%)}
          #rd [dir=rtl] h2,#rd [dir=rtl] .cap,#rd [dir=rtl] .alt{letter-spacing:0}
          #stage.short #rd .card{gap:14px;padding:12px 16px} #stage.short #rd .gems{margin:8px 0 6px} #stage.short #rd .rings{width:min(150px,40vh)}
          #stage.is-portrait #rd .card{grid-template-columns:1fr}
          #rd-big{position:absolute;z-index:31;left:50%;top:30%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;font-family:var(--font,system-ui);opacity:0;white-space:nowrap}
          #rd-big.on{animation:rdBig 2.4s ease-out both}
          #rd-big b{display:block;font-size:clamp(34px,9vw,78px);font-weight:900;font-style:italic;letter-spacing:.06em;color:#fff;text-shadow:0 0 28px var(--cc),0 0 5px var(--cc),0 4px 0 rgba(0,0,0,.6)}
          #rd-big span{font-size:14px;font-weight:700;letter-spacing:.3em;color:var(--cc);text-transform:uppercase}
          #rd-big[dir=rtl] b,#rd-big[dir=rtl] span{letter-spacing:0}
          @keyframes rdPulse{50%{filter:brightness(1.25)}}
          @keyframes rdBig{0%{opacity:0;transform:translate(-50%,-50%) scale(2.4)}10%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}`;
        document.head.appendChild(st);
        go = document.createElement('button'); go.id = 'rd-go'; panel = document.createElement('div'); panel.id = 'rd'; big = document.createElement('div'); big.id = 'rd-big';
        stage().appendChild(go); stage().appendChild(panel); stage().appendChild(big);
        go.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (near) show(near); });
        window.addEventListener('keydown', e => {
            if (cur && cur.phase !== 'watch') { const n = '1234'.indexOf(e.key); if (n >= 0) { e.preventDefault(); e.stopPropagation(); cur.kind2 === 'a' ? press(n) : n < 3 && turn(n); } else if (e.code === 'Escape' && cur.kind2 === 'b') { e.stopPropagation(); hide(); } }
            else if (!cur && near && e.code === 'KeyE') show(near);
        }, true);
    }
    function shout(a, b, col) { big.dir = lang() === 'ar' ? 'rtl' : 'ltr'; big.style.setProperty('--cc', col); big.innerHTML = `<b>${tx(a)}</b><span>${tx(b)}</span>`; big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); }
    const hexc = c => '#' + c.toString(16).padStart(6, '0');
    const alive = d => d.a.wave1.filter(e => !e.isDead);

    function show(d) {
        const sc = stage().classList; if (cur || d.state !== 'shut' || d.done || sc.contains('comm-on') || sc.contains('modal-on')) return;
        cur = d; d.phase = 'play'; go.classList.remove('on');
        const rtl = lang() === 'ar', A = d.kind2 === 'a';
        panel.className = 'on'; stage().classList.add('rd-on');
        panel.innerHTML = `<div class="card${A ? '' : ' solo'}" dir="${rtl ? 'rtl' : 'ltr'}" style="--rc:${hexc(d.col)}">` +
            (A ? `<div><div class="eye"><canvas width="${PW}" height="${PH}"></canvas></div><div class="cap"><b>${alive(d).length}</b> ${tx('inside')}</div></div>` : '') +
            `<div class="puz" style="width:100%"><h2>${tx(A ? 'a' : 'b')}</h2><div class="say"></div>` +
            (A ? `<div class="gems">${GEM.map((g, i) => `<button data-g="${i}" style="--g:${g[0]}">${g[1]}</button>`).join('')}</div><div class="dots">${'<i></i>'.repeat(SEQ)}</div><div class="time"><i></i></div><button class="alt" data-x="give">${tx('give')}</button>`
                : `<div class="rings"><span class="top"></span><div class="r" style="inset:0"></div><div class="r" style="inset:13%"></div><div class="r" style="inset:26%"></div><div class="pup"></div></div><div class="turn"><button data-t="0">↻ 1</button><button data-t="1">↻ 2</button><button data-t="2">↻ 3</button></div><button class="alt" data-x="close">${tx('close')}</button>`) +
            `</div></div>`;
        panel.onpointerdown = e => {
            const t = e.target.closest('button'); if (!t) return; e.preventDefault();
            if (t.dataset.g) press(+t.dataset.g); else if (t.dataset.t) turn(+t.dataset.t); else if (t.dataset.x === 'give') resolve(d, false); else if (t.dataset.x === 'close') hide();
        };
        frozen = !coop() && !!(window.AxonUI && window.AxonUI.freeze && window.AxonUI.freeze(true));
        sfx(a => { a.tone('sine', 220, 440, 0.25, 0.08); a.tone('triangle', 660, 990, 0.2, 0.05, { delay: 0.12 }); });
        if (A) { ctx2 = panel.querySelector('canvas').getContext('2d'); d.seq = d.seq || Array.from({ length: SEQ }, () => Math.random() * 4 | 0); d.left = d.left === undefined ? TIME : d.left; replay(d, 'watch', 0.7); }
        else { if (!d.r) { d.r = [0, 0, 0]; let n = 0; do { for (let k = 0; k < 9; k++) spin(d, Math.random() * 3 | 0); } while (d.r.every(x => x % 8 === 0) && n++ < 9); } d.rot = d.r.slice(); rings(d); say('bHelp'); }
        prev = performance.now(); if (!looping) { looping = true; requestAnimationFrame(loop); }
    }
    function hide() {
        if (!cur) return; cur = null; panel.className = ''; panel.innerHTML = ''; stage().classList.remove('rd-on');
        if (frozen && window.AxonUI && window.AxonUI.freeze) window.AxonUI.freeze(false); frozen = false;
    }
    function say(k, bad) { const s = panel.querySelector('.say'); if (s) { s.textContent = tx(k); s.classList.toggle('bad', !!bad); } }

    // ---------- puzzle A: repeat the eye's sequence ----------
    function replay(d, msg, wait) { d.mode = 'show'; d.si = -1; d.sw = wait; d.in = 0; say(msg, msg === 'again'); dots(d); const g = panel.querySelector('.gems'); if (g) g.classList.remove('in'); }
    function dots(d) { panel.querySelectorAll('.dots i').forEach((el, i) => el.classList.toggle('ok', i < d.in)); }
    function flash(n, t = 260) { const b = panel.querySelector(`.gems button[data-g="${n}"]`); if (!b) return; b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), t); sfx(a => a.tone('triangle', GEM[n][2], GEM[n][2], 0.22, 0.09)); }
    function press(n) {
        const d = cur; if (!d || d.kind2 !== 'a' || d.mode !== 'input') return;
        flash(n, 160);
        if (d.seq[d.in] === n) { d.in++; dots(d); if (d.in >= SEQ) resolve(d, true); }
        else { sfx(a => a.tone('sawtooth', 160, 90, 0.3, 0.1)); replay(d, 'again', 0.8); }
    }
    // ---------- puzzle B: the rings ----------
    function spin(d, k) { d.r[k] = (d.r[k] + 1) % 8; const o = (k + 1) % 3; d.r[o] = (d.r[o] + 7) % 8; }
    function rings(d) { panel.querySelectorAll('.rings .r').forEach((el, i) => { el.style.transform = `rotate(${d.rot[i] * 45}deg)`; }); }
    function turn(k) {
        const d = cur; if (!d || d.kind2 !== 'b' || d.phase !== 'play') return;
        spin(d, k); d.rot[k] += 1; d.rot[(k + 1) % 3] -= 1; rings(d);
        sfx(a => { a.tone('square', 300 + k * 120, 300 + k * 120, 0.05, 0.05); a.noise(0.04, 0.04, { type: 'highpass', f0: 2500 }); });
        if (d.r.every(x => x === 0)) { d.phase = 'done'; sfx(a => { [523, 659, 784, 1047].forEach((f, i) => a.tone('triangle', f, f, 0.2, 0.08, { delay: i * 0.09 })); }); setTimeout(() => resolve(d, true), 500); }
    }

    // ---------- the result ----------
    function resolve(d, ok, remote) {
        if (d.state !== 'shut' || d.done) return;
        d.done = true;
        if (!remote && coop() && window.AxonCoop.send) window.AxonCoop.send({ t: 'pz', i: d.ai, ok: ok ? 1 : 0 });
        if (d.kind2 === 'a' && ok) {                                             // the meteors: watch them through the eye
            if (cur === d) { d.phase = 'watch'; panel.classList.add('watch'); if (frozen && window.AxonUI) window.AxonUI.freeze(false); frozen = false; } else if (cur) hide();
            shout('win', 'winS', '#ffc24a');
            const list = alive(d), a = d.a; d.met = { t: 0, rocks: [] };
            const pts = list.map(e => e.mesh.position.clone()); while (pts.length < 7) pts.push(new THREE.Vector3((Math.random() - 0.5) * a.half * 1.5, a.h, a.cz + (Math.random() - 0.5) * a.half * 1.5));
            pts.forEach((to, k) => {
                const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
                const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 9, 7, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); tail.position.y = 4.6; m.add(tail);
                m.visible = false; API.scene.add(m);
                d.met.rocks.push({ m, to, from: to.clone().add(_v.set(9 + Math.random() * 6, 36, 5 + Math.random() * 6)), at: 0.5 + k * 0.2, e: list[k] || null, hit: false });
            });
            sfx(a2 => { a2.tone('sawtooth', 900, 120, 1.2, 0.1, { lp: 2000 }); a2.noise(1.2, 0.1, { type: 'bandpass', f0: 700 }); });
            return;
        }
        if (cur === d) hide(); else if (cur && remote) { /* another door's panel stays */ }
        if (d.kind2 === 'a') { shout('lose', 'loseS', '#ff2a55'); sfx(a => { a.tone('sawtooth', 220, 110, 0.5, 0.14); a.tone('square', 440, 440, 0.12, 0.08, { delay: 0.2 }); }); }
        else shout('open', 'openS', '#5cf0a0');
        openDoor(d);
    }
    function meteors(d, dt) {
        const M = d.met; M.t += dt; let left = 0;
        for (const r of M.rocks) {
            if (r.hit) continue; left++;
            const k = (M.t - r.at) / 0.55; if (k < 0) continue;
            r.m.visible = true; r.m.position.lerpVectors(r.from, r.to, Math.min(1, k)); r.m.lookAt(r.from); r.m.rotateX(Math.PI / 2);
            if (k >= 1) {
                r.hit = true; API.scene.remove(r.m);
                const p = r.to.clone().setY(r.to.y + 0.3);
                API.spawnFlash(p.clone().setY(p.y + 1), 0xffb060, 7, 0.25); API.spawnShockwave(p, 0xff7a2a, 9); API.spawnSparks(p.clone().setY(p.y + 0.8), 0xffc24a, 30, 18); API.spawnSparks(p, 0xff4a2a, 16, 10); API.shake(0.55);
                sfx(a => { a.noise(0.5, 0.22, { type: 'lowpass', f0: 1100, f1: 70 }); a.tone('sine', 150, 36, 0.45, 0.2); });
                if (!guest()) for (const e of d.a.wave1) if (!e.isDead && e.mesh.position.distanceTo(r.to) < 7) { try { e.takeDamage(99999, e.mesh.position.clone(), true); } catch (err) { } }
            }
        }
        if (!left && !M.endT) M.endT = M.t;
        if (M.endT && M.t > M.endT + 1.1) {
            d.met = null;
            if (!guest()) { for (const e of d.a.wave1) if (!e.isDead) { try { e.takeDamage(99999, e.mesh.position.clone(), true); } catch (err) { } } if (window.AxonArenaDir) window.AxonArenaDir.force(d.ai, 'clear'); }
            if (cur === d) hide();
            openDoor(d);
        }
    }

    // ---------- the look through the eye: the room rendered small, a few times a second ----------
    function peek(d) {
        const R = API.renderer; if (!R || !ctx2) return;
        if (!rt) { rt = new THREE.WebGLRenderTarget(PW, PH); cam = new THREE.PerspectiveCamera(72, PW / PH, 0.3, 260); buf = new Uint8Array(PW * PH * 4); img = new ImageData(PW, PH); lut = new Uint8Array(256); for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, 1 / 2.2)); }
        const a = d.a, t = performance.now() / 1000;
        cam.position.set(Math.sin(t * 0.5) * 1.2, a.h + 5.4, a.entryZ - 1.6); const L = alive(d); let cx = 0, cz = a.cz, n = 0; for (const e of L) { cx += e.mesh.position.x; cz += e.mesh.position.z; n++; } if (n) { cx /= n; cz = (cz - a.cz) / n; }
        cam.lookAt(cx * 0.7 + Math.sin(t * 0.33) * 4, a.h + 1.2, Math.min(cz, a.entryZ - 12));   // towards the machines, drifting a little
        try {
            const prevT = R.getRenderTarget(); R.setRenderTarget(rt); R.render(API.scene, cam); R.readRenderTargetPixels(rt, 0, 0, PW, PH, buf); R.setRenderTarget(prevT);
            const o = img.data; for (let y = 0; y < PH; y++) { const s = (PH - 1 - y) * PW * 4, t2 = y * PW * 4; for (let x = 0; x < PW * 4; x += 4) { o[t2 + x] = lut[buf[s + x]]; o[t2 + x + 1] = lut[buf[s + x + 1]]; o[t2 + x + 2] = lut[buf[s + x + 2]]; o[t2 + x + 3] = 255; } }
            ctx2.putImageData(img, 0, 0);
        } catch (e) { }
    }
    // the panel runs on its own clock (the game waits under it)
    let looping = false, prev = 0;
    function loop(now) {
        if (!cur) { looping = false; return; } requestAnimationFrame(loop);
        now = performance.now(); const dt = Math.max(0, Math.min(0.1, (now - prev) / 1000)); prev = now; const d = cur;
        if (stage().classList.contains('modal-on')) return;
        if (d.kind2 === 'a') {
            if ((peekT -= dt) <= 0) { peekT = d.phase === 'watch' ? 0.05 : 0.13; peek(d); const c = panel.querySelector('.cap b'); if (c) c.textContent = alive(d).length; }
            if (d.phase !== 'play') return;
            if (d.mode === 'show') { d.sw -= dt; if (d.sw <= 0) { d.si++; if (d.si >= SEQ) { d.mode = 'input'; say('repeat'); panel.querySelector('.gems').classList.add('in'); } else { flash(d.seq[d.si], 330); d.sw = 0.5; } } }
            else { d.left -= dt; if (d.left <= 0) { if (coop()) { d.seq = Array.from({ length: SEQ }, () => Math.random() * 4 | 0); d.left = TIME; sfx(a => a.tone('sawtooth', 160, 90, 0.3, 0.1)); replay(d, 'again', 0.8); return; } resolve(d, false); return; } if (d.left < 8 && Math.floor(d.left) !== Math.floor(d.left + dt)) sfx(a => a.tone('square', 990, 990, 0.05, 0.05)); }
            const f = panel.querySelector('.time i'); if (f) f.style.transform = `scaleX(${Math.max(0, d.left / TIME).toFixed(3)})`;
        }
    }

    // ---------- every frame of the mission (level.js) ----------
    let near = null;
    function tick(api, player, layout, dt) {
        API = api; P = player; dom();
        if (built !== layout) build(api, layout);
        const p = player.mesh.position; let n = null;
        for (const d of doors) {
            if (d.state === 'gone') continue;
            if (d.state === 'shut') {
                if (d.a.state !== 'idle' && !d.met) { d.done = true; if (cur === d) hide(); openDoor(d); continue; }      // the room woke up some other way (a teammate inside)
                const dz = p.z - d.z, t = performance.now() / 1000;
                const lid = dz > 0 && dz < 22 ? 1.15 : 0.5; d.lidU.rotation.x += (-lid - d.lidU.rotation.x) * Math.min(1, dt * 8); d.lidL.rotation.x += (Math.PI + lid - d.lidL.rotation.x) * Math.min(1, dt * 8);
                if (dz > 0 && dz < 30) d.ball.lookAt(_v.set(p.x, p.y + 1.6, p.z)); else d.ball.rotation.set(Math.sin(t * 0.43) * 0.12, Math.sin(t * 0.7) * 0.5, 0);
                if (!d.done && dz > 0.4 && dz < 8.5 && Math.abs(p.x) < 6 && Math.abs(p.y - d.h) < 4 && !player.dead) n = d;
                if (d.met) meteors(d, dt);
            } else if (d.state === 'opening') { d.ot += dt; const k = Math.min(1, d.ot / 1.3), e = k * k * (3 - 2 * k); d.g.position.y = d.h + e * 12.6; if (k >= 1) { d.state = 'gone'; d.g.visible = false; } }
        }
        if (n !== near || (n && !go.classList.contains('on') && !cur)) {
            near = n;
            if (n && !cur) { go.dir = lang() === 'ar' ? 'rtl' : 'ltr'; go.style.setProperty('--rc', hexc(n.col)); go.innerHTML = `<span>${n.kind2 === 'a' ? '👁' : '🔓'}</span><span>${tx(n.kind2 === 'a' ? 'peek' : 'unlock')}</span><kbd>E</kbd>`; go.classList.add('on'); }
            else go.classList.remove('on');
        }
    }
    // a teammate settled a door (coop.js)
    function remote(m) { const d = doors.find(x => x.ai === m.i); if (d) resolve(d, !!m.ok, true); }
    setInterval(() => { const c = stage() && stage().classList; if (c && (c.contains('in-hub') || c.contains('in-menu'))) { if (cur) hide(); if (go) go.classList.remove('on'); near = null; } }, 700);

    return { tick, remote, get doors() { return doors; }, show, press, turn, resolve };
})();
