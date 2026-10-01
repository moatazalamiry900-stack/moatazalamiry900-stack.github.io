// =====================================================================
//  AXON BREACH — BIO-LAB: a free appearance booth on the north side of the HQ ARMORY WING
//   • Step onto the pad: the camera turns to face you and the panel opens.
//   • Body: AXON (male, agile) · KAEL (male, strong) · LYRA (female)
//   • Skin tone, eye colour (or "match armor") and hair colour — all free, saved at once, shown live.
//  Loaded by index.html after forge.js, before game.js; game.js builds it with AxonBioLab.create({...}).
// =====================================================================
'use strict';

window.AxonBioLab = (function () {
    const L = {
        en: { look: 'Bio-lab', lookSub: 'Free · change your look any time', gender: 'BODY', male: 'Male', female: 'Female', agile: 'Agile', strong: 'Strong', skinT: 'SKIN TONE', eyesT: 'EYES', hairT: 'HAIR', auto: 'Match armor', free: 'FREE', map_look: 'BIO-LAB', zoomFace: 'Face', zoomBody: 'Full body', close: 'Close' },
        ar: { look: 'المختبر الحيوي', lookSub: 'مجاني · غيّر مظهرك متى شئت', gender: 'الجسم', male: 'ذكر', female: 'أنثى', agile: 'رشيق', strong: 'قوي', skinT: 'لون البشرة', eyesT: 'العيون', hairT: 'الشعر', auto: 'مثل الدرع', free: 'مجاني', map_look: 'المختبر', zoomFace: 'الوجه', zoomBody: 'الجسم كامل', close: 'إغلاق' },
        es: { look: 'Biolaboratorio', lookSub: 'Gratis · cambia tu aspecto cuando quieras', gender: 'CUERPO', male: 'Hombre', female: 'Mujer', agile: 'Ágil', strong: 'Fuerte', skinT: 'TONO DE PIEL', eyesT: 'OJOS', hairT: 'PELO', auto: 'Como la armadura', free: 'GRATIS', map_look: 'BIOLAB', zoomFace: 'Cara', zoomBody: 'Cuerpo entero', close: 'Cerrar' },
        zh: { look: '生物实验室', lookSub: '免费 · 随时更改外观', gender: '体型', male: '男', female: '女', agile: '敏捷', strong: '强壮', skinT: '肤色', eyesT: '眼睛', hairT: '头发', auto: '跟随装甲', free: '免费', map_look: '实验室', zoomFace: '面部', zoomBody: '全身', close: '关闭' },
        ja: { look: 'バイオラボ', lookSub: '無料 · いつでも見た目を変更できる', gender: 'ボディ', male: '男性', female: '女性', agile: '俊敏', strong: '屈強', skinT: '肌の色', eyesT: '瞳', hairT: '髪', auto: 'アーマーに合わせる', free: '無料', map_look: 'ラボ', zoomFace: '顔', zoomBody: '全身', close: '閉じる' }
    };
    const S = k => { const d = L[window.AxonI18n ? window.AxonI18n.lang : 'en'] || L.en; return d[k] !== undefined ? d[k] : L.en[k]; };
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    function create(c) {
        const { THREE, stage, AudioSys, player, cameraSystem } = c;
        const O = new THREE.Vector3(0, 0, 400);                        // the HQ's origin
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const root = new THREE.Group(); if (c.hub && c.hub.root) c.hub.root.add(root);
        const add = (o, x, y, z) => { o.position.copy(V(x, y, z)); root.add(o); return o; };
        const glow = (color, op = 1, side) => new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: op >= 1, side: side || THREE.FrontSide });
        const canvasTex = (T, w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 4; return tx; };
        let t = 0;
        // ---------- BIO-LAB: a free appearance booth on the north side of the ARMORY WING.
        // Step onto the pad: the camera turns to face you, and body (male agile / male strong / female),
        // skin tone, eye and hair colour can be changed live, at no cost. Choices are saved at once. ----------
        
            const X = 49, Z = -8.6, HK = window.AxonHero, LK = HK.LOOK;
            const booth = add(new THREE.Group(), X, 0, Z);
            const metal = new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.85, roughness: 0.3 });
            const m = (geo, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; booth.add(o); return o; };
            m(new THREE.CylinderGeometry(1.5, 1.62, 0.12, 40), metal, 0, 0.06, 0);
            const padG = glow(0xff7ad9, 0.9);
            m(new THREE.RingGeometry(1.15, 1.28, 48), padG, 0, 0.13, 0, -Math.PI / 2);
            m(new THREE.RingGeometry(0.42, 0.48, 6), glow(0x7ff3ff, 0.8), 0, 0.13, 0, -Math.PI / 2);
            // the mirror: a tall holo panel behind the pad, in a metal frame between two lit pillars
            const mirTex = canvasTex(THREE, 256, 384, (g, w, h) => {
                const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120a24'); gr.addColorStop(0.55, '#0a1630'); gr.addColorStop(1, '#1a0c26'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
                g.strokeStyle = 'rgba(255,122,217,.16)'; g.lineWidth = 1; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
                g.strokeStyle = 'rgba(127,243,255,.55)'; g.lineWidth = 3;                                   // a faint body outline, like a scan
                g.beginPath(); g.arc(w / 2, 92, 34, 0, Math.PI * 2); g.stroke();
                g.beginPath(); g.moveTo(w / 2 - 70, 330); g.quadraticCurveTo(w / 2 - 74, 150, w / 2, 140); g.quadraticCurveTo(w / 2 + 74, 150, w / 2 + 70, 330); g.stroke();
            });
            const mirror = m(new THREE.PlaneGeometry(2.6, 3.9), new THREE.MeshBasicMaterial({ map: mirTex, transparent: true, opacity: 0.92 }), 0, 2.45, -1.9);
            m(new THREE.BoxGeometry(2.9, 4.2, 0.18), metal, 0, 2.45, -2.02);
            [-1, 1].forEach(s => {
                m(new THREE.BoxGeometry(0.4, 5, 0.5), metal, s * 1.75, 2.5, -1.9);
                m(new THREE.BoxGeometry(0.06, 4.4, 0.06), glow(0xff7ad9), s * 1.53, 2.5, -1.62);
                m(new THREE.BoxGeometry(0.06, 4.4, 0.06), glow(0x7ff3ff), s * 1.97, 2.5, -1.62);
            });
            m(new THREE.BoxGeometry(3.9, 0.3, 0.5), metal, 0, 5.1, -1.9);
            const signCv = document.createElement('canvas'); signCv.width = 512; signCv.height = 96;
            const signTex = new THREE.CanvasTexture(signCv); signTex.encoding = THREE.sRGBEncoding;
            m(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }), 0, 5.65, -1.84);
            function paintSign() {
                const g = signCv.getContext('2d'); g.clearRect(0, 0, 512, 96); g.fillStyle = 'rgba(12,6,22,.92)'; g.fillRect(0, 0, 512, 96);
                g.strokeStyle = '#ff7ad9'; g.lineWidth = 4; g.strokeRect(3, 3, 506, 90); g.direction = window.AxonI18n && window.AxonI18n.lang === 'ar' ? 'rtl' : 'ltr';
                g.font = `700 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff7ad9'; g.shadowBlur = 14; g.fillStyle = '#ffd6f2';
                g.fillText(S('look'), 256, 50, 480); signTex.needsUpdate = true;
            }
            paintSign();
            const scanR = m(new THREE.TorusGeometry(1.2, 0.03, 6, 48), glow(0xff7ad9, 0.8), 0, 0.2, 0, Math.PI / 2);
            const beamL = m(new THREE.CylinderGeometry(1.1, 1.3, 4.2, 32, 1, true), glow(0xff7ad9, 0.06, THREE.DoubleSide), 0, 2.2, 0);
            if (c.hub && c.hub.addSolids) c.hub.addSolids([new THREE.Box3(V(X - 2.1, 0, Z - 2.3), V(X + 2.1, 5.3, Z - 1.6))]);

            // ---- panel ----
            const st = document.createElement('style');
            st.textContent = `#hub-look{z-index:28;display:flex;align-items:center;justify-content:flex-end;padding:0 max(14px,env(safe-area-inset-right)) 0 0;box-sizing:border-box}
              #stage.is-portrait #hub-look{align-items:flex-end;justify-content:center;padding:0 0 max(10px,env(safe-area-inset-bottom))}
              .lk-card{border-color:rgba(255,122,217,.35)!important}
              .lk-sec{display:grid;gap:6px}
              .lk-sec h4{margin:0;font-size:10px;letter-spacing:.3em;color:var(--dim);font-weight:600}
              .lk-card[dir=rtl] .lk-sec h4{letter-spacing:0;font-size:12px}
              .lk-gen{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
              .lk-gen button{display:grid;gap:2px;justify-items:center;padding:8px 4px;font-family:var(--font);color:var(--ink);cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
              .lk-gen button i{font-style:normal;font-size:18px;line-height:1;color:var(--dim)}
              .lk-gen button b{font-size:13px;letter-spacing:.08em}
              .lk-gen button small{font-size:10px;color:var(--dim)}
              .lk-gen button.on{border-color:#ff7ad9;background:rgba(255,122,217,.12);box-shadow:0 0 12px rgba(255,122,217,.35)}
              .lk-gen button.on i{color:#ff9ce4}
              .lk-sw{display:flex;flex-wrap:wrap;gap:8px}
              .lk-sw button{width:30px;height:30px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.22);cursor:pointer;box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.4)}
              .lk-sw button.on{outline:2px solid #7ff3ff;outline-offset:2px}
              .lk-sw button.auto{width:auto;padding:0 10px;border-radius:15px;font:600 11px var(--font);color:var(--ink);background:rgba(255,255,255,.06);box-shadow:none}
              .lk-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07)}
              .lk-free{font:700 12px var(--font);letter-spacing:.2em;color:#7dffb8}
              .lk-zoom{padding:8px 12px;font:600 12px var(--font);color:var(--ink);background:rgba(127,243,255,.08);border:1px solid rgba(127,243,255,.35);cursor:pointer}
              #stage.short .lk-sw button{width:26px;height:26px}#stage.short .lk-gen button{padding:5px 3px}`;
            document.head.appendChild(st);
            const pnl = document.createElement('div'); pnl.id = 'hub-look'; pnl.className = 'ui-layer'; stage.appendChild(pnl);
            const hx = n => '#' + n.toString(16).padStart(6, '0');
            let isOpen = false, saved = null, close_ = false, burst = 0;
            const P = () => c.player;
            function render() {
                const L = window.AxonI18n ? window.AxonI18n.lang : 'en', p = P(), lk = p.look || {}, bt = p.bodyType;
                const gen = [['a', '♂', 'AXON', S('male') + ' · ' + S('agile')], ['m', '♂', 'KAEL', S('male') + ' · ' + S('strong')], ['f', '♀', 'LYRA', S('female')]]
                    .map(([t, ic, n, d]) => `<button type="button" class="${bt === t ? 'on' : ''}" data-b="${t}"><i>${ic}</i><b>${n}</b><small>${d}</small></button>`).join('');
                const sw = (key, list, auto) => (auto ? `<button type="button" class="auto${lk[key] == null ? ' on' : ''}" data-k="${key}" data-v="">${S('auto')}</button>` : '') +
                    list.map(v => `<button type="button" class="${lk[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}" style="background:${hx(v)}" aria-label="${hx(v)}"></button>`).join('');
                pnl.innerHTML = `<div class="ss-card lk-card" dir="${L === 'ar' ? 'rtl' : 'ltr'}" role="dialog" aria-label="${S('look')}">
                    <div class="ss-head"><div><small style="color:#ff9ce4">MTZ // BIO-LAB</small><h2>${S('look')}</h2><p>${S('lookSub')}</p></div>
                      <span class="lk-free">${S('free')}</span><button type="button" class="ss-x" data-x aria-label="${S('close')}">✕</button></div>
                    <div class="lk-sec"><h4>${S('gender')}</h4><div class="lk-gen">${gen}</div></div>
                    <div class="lk-sec"><h4>${S('skinT')}</h4><div class="lk-sw">${sw('skin', LK.skin)}</div></div>
                    <div class="lk-sec"><h4>${S('eyesT')}</h4><div class="lk-sw">${sw('eye', LK.eye, true)}</div></div>
                    <div class="lk-sec"><h4>${S('hairT')}</h4><div class="lk-sw">${sw('hair', LK.hair)}</div></div>
                    <div class="lk-row"><span></span><button type="button" class="lk-zoom" data-z>🔍 ${close_ ? S('zoomBody') : S('zoomFace')}</button></div></div>`;
            }
            function frame(face) { close_ = face; cameraSystem.targetRadius = face ? 2.0 : 4.8; cameraSystem.targetPhi = face ? 0.0 : 0.12; }
            function setLook(key, v) {
                const p = P(), look = Object.assign({}, p.look || {});
                if (v === '' || v == null) delete look[key]; else look[key] = +v;
                HK.saveLook(look); HK.applyLook(p, look); burst = 0.6;
                AudioSys.playEquip(); if (key !== 'skin') frame(true);
                render();
            }
            function setBody(t) {
                const p = P(); if (p.bodyType === t) return;
                p.setBody(t); p.look = HK.loadLook(); HK.applyLook(p, p.look);
                p.mesh.rotation.y = 0; burst = 1.2; AudioSys.playScan(); frame(false); render();
            }
            function open() {
                if (isOpen || c.getState() !== 'hub') return;
                isOpen = true;
                saved = { r: cameraSystem.targetRadius, ph: cameraSystem.targetPhi };
                player.velocity.set(0, 0, 0); player.mesh.position.x = O.x + X; player.mesh.position.z = O.z + Z; player.mesh.rotation.y = 0;   // facing out of the booth
                cameraSystem.targetTheta = 0; cameraSystem.manualTimer = 0; frame(false);
                c.setState('hubmenu'); render(); pnl.classList.add('show'); stage.classList.add('in-studio'); AudioSys.playScan();
                setTimeout(() => { const f = pnl.querySelector('.lk-gen .on'); f && f.focus({ preventScroll: true }); }, 60);
            }
            function close() {
                if (!isOpen) return; isOpen = false; pnl.classList.remove('show'); stage.classList.remove('in-studio');
                cameraSystem.targetRadius = saved.r; cameraSystem.targetPhi = saved.ph;
                if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input.flush(); }
                AudioSys.playUi('close');
            }
            pnl.addEventListener('click', e => {
                if (e.target === pnl || e.target.closest('[data-x]')) { close(); return; }
                const b = e.target.closest('[data-b]'); if (b) { setBody(b.dataset.b); return; }
                const k = e.target.closest('[data-k]'); if (k) { setLook(k.dataset.k, k.dataset.v); return; }
                if (e.target.closest('[data-z]')) { frame(!close_); AudioSys.playUi('select'); render(); }
            });
            window.addEventListener('keydown', e => { if (isOpen && e.code === 'Escape') { e.stopImmediatePropagation(); close(); } }, true);
            if (window.AxonI18n) window.AxonI18n.onChange(() => { paintSign(); if (isOpen) render(); });
            const portrait = () => stage.classList.contains('is-portrait');
            return {
                open, close, get isOpen() { return isOpen; },
                get camShift() { if (!isOpen) return null; const r = cameraSystem.radius || 4.8; return portrait() ? [0, -r * 0.16] : [r * 0.25, 0]; },
                tick(dt) {
                    t += dt; burst = Math.max(0, burst - dt);
                    const pp = player.mesh.position; booth.visible = (pp.x - (O.x + X)) ** 2 + (pp.z - (O.z + Z)) ** 2 < 42 * 42;   // only drawn in the armory wing
                    if (!booth.visible) return;
                    scanR.position.y = 0.2 + ((t * (0.5 + burst * 2)) % 1) * 4.1; scanR.material.opacity = 0.85 * (1 - ((t * 0.5) % 1) * 0.6);
                    beamL.material.opacity = 0.05 + Math.sin(t * 2.4) * 0.02 + burst * 0.2; padG.opacity = isOpen ? 1 : 0.7 + Math.sin(t * 3) * 0.2;
                    mirror.material.opacity = 0.85 + Math.sin(t * 5) * 0.05;
                }
            };
    }

    return { create, S };
})();
