// =====================================================================
//  AXON BREACH — TRAINING WING of the HQ (hub.js builds the room and calls in here)
//   • AxonSkills: moves learned with credits (saved) — Cyclone Edge (sword), Meteor Dive (jump); the rest are locked for now
//   • AxonTraining: the wing's text (5 languages), layout, props, three live trainees, the skills panel,
//     and the Meteor Dive logic used by game.js
//  Loaded by index.html before hub.js.
// =====================================================================
'use strict';

window.AxonSkills = (function () {
    const KEY = 'axon.skills';
    const LIST = [
        { id: 'cyclone', cat: 'sword', price: 650, ready: true, icon: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="M21 5l-3 1 1 3"/>' },
        { id: 'wave', cat: 'sword', icon: '<path d="M5 19c7-1 12-6 14-14"/><path d="M9 20c6-2 9-6 10-11"/>' },
        { id: 'dragon', cat: 'sword', icon: '<path d="M12 21V6"/><path d="M7 11l5-6 5 6"/><path d="M6 21h12"/>' },
        { id: 'phantom', cat: 'sword', icon: '<path d="M3 12h14"/><path d="M13 7l5 5-5 5"/><path d="M5 8h4M5 16h4"/>' },
        { id: 'dive', cat: 'jump', price: 550, ready: true, icon: '<path d="M12 3v11"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/><path d="M7 20l-2-3M17 20l2-3"/>' },
        { id: 'triple', cat: 'jump', icon: '<path d="M4 19c2-5 4-5 6 0M10 15c2-5 4-5 6 0M16 11c1-4 3-4 4 0"/>' },
        { id: 'skydash', cat: 'jump', icon: '<path d="M3 9h10M3 15h10"/><path d="M12 5l7 7-7 7"/>' },
        { id: 'wallrun', cat: 'jump', icon: '<path d="M19 3v18"/><path d="M5 17l5-3 3 2 4-6"/>' }
    ];
    let own = {};
    try { own = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { own = {}; }
    const has = id => !!own[id];
    function buy(id) {
        const s = LIST.find(x => x.id === id);
        if (!s || !s.ready || has(id) || !window.AxonShop || !window.AxonShop.spend(s.price)) return false;
        own[id] = 1;
        try { localStorage.setItem(KEY, JSON.stringify(own)); } catch (e) { }
        return true;
    }
    return { LIST, has, buy };
})();

window.AxonTraining = (function () {
    const TEXT = {
        en: { z_trn: 'TRAINING WING', train: 'Combat training', map_trn: 'TRAINING', tr_title: 'Combat training', tr_tag: 'TRAINING WING', tr_sub: 'New moves stay with you on every mission. The saber is unlocked in this wing — try them here.',
            tr_sword: 'SWORD MOVES', tr_jump: 'JUMP MOVES', tr_learn: 'Learn', tr_learned: 'LEARNED', tr_how: 'How', tr_new: 'New move learned',
            sk: { cyclone: ['Cyclone Edge', 'A fourth strike after the three-hit combo: a whirling cut that hits every enemy around you.', 'tap Attack once more after the third hit'],
                dive: ['Meteor Dive', 'Crash down from the air. The shockwave damages everything near the landing.', 'in the air, after the double jump, press Jump again'],
                wave: ['Crescent Wave', 'Throw a blade of light across the room.'], dragon: ['Rising Dragon', 'An uppercut that launches you and the enemy into the air.'], phantom: ['Phantom Rush', 'Dash through a line of enemies, cutting each one.'],
                triple: ['Triple Jump', 'A third jump for the highest ledges.'], skydash: ['Sky Dash', 'Chain two dashes in the air.'], wallrun: ['Wall Run', 'Run along a wall before you kick off.'] },
            sayLine: "Training wing's open. New moves — if you've earned the credits." },
        ar: { z_trn: 'جناح التدريب', train: 'التدريب القتالي', map_trn: 'التدريب', tr_title: 'التدريب القتالي', tr_tag: 'جناح التدريب', tr_sub: 'الحركات الجديدة تبقى معك في كل المهام. السيف مسموح في هذا الجناح — جرّبها هنا.',
            tr_sword: 'حركات السيف', tr_jump: 'حركات القفز', tr_learn: 'تعلّم', tr_learned: 'تم التعلّم', tr_how: 'الطريقة', tr_new: 'تعلّمت حركة جديدة',
            sk: { cyclone: ['نصل الإعصار', 'ضربة رابعة بعد الكومبو الثلاثي: دوران قاطع يصيب كل الأعداء من حولك.', 'اضغط الهجوم مرة أخرى بعد الضربة الثالثة'],
                dive: ['انقضاض النيزك', 'اهبط من الجو بقوة. موجة الصدمة تضرب كل ما حول نقطة الهبوط.', 'في الهواء بعد القفزة المزدوجة، اضغط القفز مرة أخرى'],
                wave: ['موجة الهلال', 'أطلق نصلاً من الضوء عبر الساحة.'], dragon: ['التنين الصاعد', 'ضربة صاعدة ترفعك أنت والعدو في الهواء.'], phantom: ['اندفاع الشبح', 'اخترق صفاً من الأعداء وأنت تقطع كل واحد منهم.'],
                triple: ['القفزة الثلاثية', 'قفزة ثالثة للوصول إلى أعلى الحواف.'], skydash: ['اندفاع السماء', 'اندفاعتان متتاليتان في الهواء.'], wallrun: ['الجري على الجدار', 'اركض على الجدار قبل أن تقفز منه.'] },
            sayLine: 'جناح التدريب مفتوح. حركات جديدة لمن جمع الرصيد.' },
        es: { z_trn: 'ALA DE ENTRENAMIENTO', train: 'Entrenamiento de combate', map_trn: 'ENTRENO', tr_title: 'Entrenamiento de combate', tr_tag: 'ENTRENAMIENTO', tr_sub: 'Los movimientos nuevos te acompañan en todas las misiones. El sable está permitido en esta ala: pruébalos aquí.',
            tr_sword: 'MOVIMIENTOS DE ESPADA', tr_jump: 'MOVIMIENTOS DE SALTO', tr_learn: 'Aprender', tr_learned: 'APRENDIDO', tr_how: 'Cómo', tr_new: 'Movimiento nuevo aprendido',
            sk: { cyclone: ['Filo Ciclón', 'Un cuarto golpe tras el combo de tres: un corte giratorio que alcanza a todos los enemigos a tu alrededor.', 'pulsa Ataque una vez más tras el tercer golpe'],
                dive: ['Caída Meteoro', 'Desplómate desde el aire. La onda expansiva daña todo lo que rodea el aterrizaje.', 'en el aire, tras el doble salto, pulsa Saltar otra vez'],
                wave: ['Onda Creciente', 'Lanza una hoja de luz a través de la sala.'], dragon: ['Dragón Ascendente', 'Un gancho que te eleva a ti y al enemigo.'], phantom: ['Embestida Fantasma', 'Atraviesa una fila de enemigos cortando a cada uno.'],
                triple: ['Triple Salto', 'Un tercer salto para las cornisas más altas.'], skydash: ['Impulso Aéreo', 'Encadena dos impulsos en el aire.'], wallrun: ['Carrera en Pared', 'Corre por la pared antes de impulsarte.'] },
            sayLine: 'El ala de entrenamiento está abierta. Movimientos nuevos, si tienes créditos.' },
        zh: { z_trn: '训练翼', train: '战斗训练', map_trn: '训练', tr_title: '战斗训练', tr_tag: '训练翼', tr_sub: '学会的新招式在所有任务中都可使用。本翼允许使用光剑——就在这里试试。',
            tr_sword: '剑术招式', tr_jump: '跳跃招式', tr_learn: '学习', tr_learned: '已学会', tr_how: '用法', tr_new: '学会了新招式',
            sk: { cyclone: ['旋风刃', '三连击之后的第四击：旋转斩，命中周围所有敌人。', '第三击后再按一次攻击'],
                dive: ['陨星坠击', '从空中猛然砸下，冲击波伤害落点附近的一切。', '在空中二段跳之后，再按一次跳跃'],
                wave: ['新月波', '向前方掷出一道光刃。'], dragon: ['升龙斩', '把你和敌人一起挑上空中的上挑斩。'], phantom: ['幻影突袭', '冲刺穿过一排敌人，逐一斩击。'],
                triple: ['三段跳', '第三次跳跃，登上最高的平台。'], skydash: ['凌空冲刺', '在空中连续冲刺两次。'], wallrun: ['墙面疾跑', '蹬墙之前先沿墙奔跑。'] },
            sayLine: '训练翼已开放。攒够点数就能学新招式。' },
        ja: { z_trn: '訓練棟', train: '戦闘訓練', map_trn: '訓練', tr_title: '戦闘訓練', tr_tag: '訓練棟', tr_sub: '覚えた技はすべてのミッションで使える。この棟ではセイバーが使用可能——ここで試そう。',
            tr_sword: '剣技', tr_jump: 'ジャンプ技', tr_learn: '習得', tr_learned: '習得済み', tr_how: '使い方', tr_new: '新しい技を習得',
            sk: { cyclone: ['サイクロンエッジ', '三連コンボの後の四撃目。回転斬りで周囲の敵すべてに当たる。', '三撃目の後にもう一度攻撃'],
                dive: ['メテオダイブ', '空中から急降下。着地の衝撃波が周囲にダメージを与える。', '空中で二段ジャンプの後、もう一度ジャンプ'],
                wave: ['クレセントウェーブ', '光の刃を前方へ飛ばす。'], dragon: ['ライジングドラゴン', '自分と敵を空中へ打ち上げる斬り上げ。'], phantom: ['ファントムラッシュ', '敵の列を駆け抜けながら斬る。'],
                triple: ['三段ジャンプ', '最も高い足場へ届く三回目のジャンプ。'], skydash: ['スカイダッシュ', '空中でダッシュを二回つなげる。'], wallrun: ['ウォールラン', '壁を蹴る前に壁を走る。'] },
            sayLine: '訓練棟は開いてる。クレジットがあれば新技を教える。' },
    };
    // layout handed to hub.js: the room, its corridor (gate included), the doorway cut into the hangar bay, the instructor
    const ZONE = { id: 'trn', key: 'z_trn', x: 42, z: 46, hw: 14, hd: 14, col: 0xff6b4a, trim: 0xff6b4a, light: 0xff9a7a, gaps: { w: [[46, 8]] } };
    const HALL = { x: 21, z: 46, len: 14, alongZ: false, neg: 'z_trn', pos: 'z_bay', negCol: 0xff6b4a, posCol: 0xffa826 };
    const BAY_GAP = [46, 8];
    const INSTRUCTOR = ['KAGE', 'm', 'ARCTIC', 0xc68a62, 0x2b2b35, 1.05, 'crossed', 37.6, 36.4, -0.7];
    const SPOT = { id: 'train', x: 42, z: 36.7, r: 2.3 };
    const ICON = '<path d="M5 19L16 8"/><path d="M14 6l4 4"/><path d="M4 20l2-1-1-1z"/><path d="M18 14v6M15 17l3 3 3-3"/>';

    // props that go into the HQ's merged world mesh (called before hub.js finishes its batch)
    function decor({ block, strip, frame }) {
        const TC = 0xff6b4a, TX = 42;
        block('wall', TX, 0.55, 33.9, 6, 1.1, 1.4, TC); strip(TC, TX, 1.12, 34.62, 6, 0.06, 0.06);          // skill terminal desk
        frame(TX, 4.7, 32.56, 9, 4.2, TC, 'z');                                                              // its wall screen
        block('wall', 50.6, 1.25, 38, 0.5, 2.5, 0.5, TC); block('wall', 50.6, 2.05, 38, 0.3, 0.24, 1.6, TC);   // sparring dummy: post + cross bar
        [[48, 35.2, 6.4, 0.08], [48, 40.8, 6.4, 0.08]].forEach(([x, z, w, d]) => strip(TC, x, 0.03, z, w, 0.04, d));   // mat outline
        [[44.8, 38, 0.08, 5.6], [51.2, 38, 0.08, 5.6]].forEach(([x, z, w, d]) => strip(TC, x, 0.03, z, w, 0.04, d));
        block('wall', 50, 0.7, 46, 2.6, 1.4, 2.6, TC); block('wall', 53.4, 1.4, 46, 2.6, 2.8, 2.6, TC);       // jump course: two rising steps
        strip(0xffd27a, 50, 1.42, 46, 2.2, 0.04, 0.08); strip(0xffd27a, 53.4, 2.82, 46, 2.2, 0.04, 0.08);
        block('wall', 37.5, 0.55, 55.5, 0.8, 1.1, 6, TC); strip(TC, 37.08, 1.12, 55.5, 0.06, 0.06, 6);       // firing line counter
        [53, 58].forEach(z => strip(0x39d7ff, 46.5, 0.03, z, 17, 0.04, 0.08));                               // range lanes
        for (let x = 41; x < 55; x += 3.5) strip(0x1d6fb8, x, 0.03, 55.5, 0.08, 0.04, 4.6);
    }

    const CSS = `
          #stage.in-hub.in-train #btn-attack{visibility:visible}
          #hub-train{z-index:28;display:grid;place-items:center;background:rgba(3,8,16,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
          .tr-card{width:min(940px,95%);border-color:rgba(255,107,74,.4)}
          .tr-card .hm-head small{color:#ff6b4a}
          .tr-card .hm-prog{color:var(--amber);font-weight:700;letter-spacing:.08em;font-size:13px}
          .tr-body{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;overflow:auto;min-height:0;align-content:start;padding-inline-end:4px}
          .tr-sub{grid-column:1/-1;margin:0;font-size:12px;line-height:1.5;color:var(--dim)}
          .tr-body section{display:grid;gap:8px;align-content:start}
          .tr-body h3{margin:0 0 2px;font:700 12px/1 var(--font);letter-spacing:.3em;color:#ff6b4a}
          .tr-row{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,107,74,.28);border-inline-start:3px solid #ff6b4a}
          .tr-row.own{border-color:rgba(92,240,160,.4);border-inline-start-color:#5cf0a0}
          .tr-row.lock{opacity:.55;border-color:rgba(255,255,255,.12);border-inline-start-color:rgba(255,255,255,.25)}
          .tr-ic{width:30px;height:30px;fill:none;stroke:#ffd9cc;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
          .tr-row.lock .tr-ic{stroke:#8ea3b8}
          .tr-t{min-width:0}
          .tr-t b{display:block;font:700 15px/1.25 var(--font);letter-spacing:.03em;color:var(--ink)}
          .tr-t p{margin:3px 0 0;font-size:12px;line-height:1.45;color:var(--dim)}
          .tr-how{display:block;margin-top:5px;font-size:11.5px;line-height:1.4;color:var(--amber)}
          .tr-buy{padding:10px 12px;font-size:12px;letter-spacing:.08em;white-space:nowrap}
          .tr-own{font:700 12px/1 var(--font);letter-spacing:.14em;color:#5cf0a0;white-space:nowrap}
          .tr-lock{display:grid;justify-items:center;gap:3px;font-size:10px;letter-spacing:.14em;color:#8ea3b8;white-space:nowrap}
          .tr-lock svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}
          .tr-lock b{font-weight:700}.tr-lock i{font-style:normal;color:var(--amber)}
          #stage.is-portrait .tr-body{grid-template-columns:1fr}
          #stage.is-portrait .tr-row{grid-template-columns:30px 1fr}
          #stage.is-portrait .tr-row > .tr-buy,#stage.is-portrait .tr-row > .tr-own,#stage.is-portrait .tr-row > .tr-lock{grid-column:1/-1;justify-self:start}
          #stage.is-portrait .tr-lock{display:flex;align-items:center;gap:6px}`;

    // everything alive in the wing + the skills panel. h = helpers of hub.js (same names as there)
    function build(h) {
        const { THREE, c, O, V, add, root, glow, flat, canvasTex, FONT, S, PALETTES, stage, AudioSys, el, speak } = h;
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        const trainTex = canvasTex(THREE, 512, 240, () => { });
        const paintTrain = () => {
            const cv = trainTex.image, g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
            g.clearRect(0, 0, W, Hh); g.fillStyle = '#0a0f1a'; g.fillRect(0, 0, W, Hh);
            g.strokeStyle = 'rgba(255,107,74,.25)'; g.lineWidth = 1;
            for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
            g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff6b4a'; g.shadowColor = '#ff6b4a'; g.shadowBlur = 18;
            g.font = `700 54px ${FONT}`; g.fillText(S('tr_tag'), W / 2, 92);
            g.shadowBlur = 0; g.fillStyle = '#ffd9cc'; g.font = `600 26px ${FONT}`; g.fillText(S('tr_sword') + '  ·  ' + S('tr_jump'), W / 2, 164);
            trainTex.needsUpdate = true;
        };
        paintTrain();
        add(new THREE.Mesh(new THREE.PlaneGeometry(8.7, 3.9), new THREE.MeshBasicMaterial({ map: trainTex })), 42, 4.7, 32.6);
        // firing range: three targets sliding along the east wall
        const tgtRing = new THREE.RingGeometry(0.42, 0.62, 28), tgtMid = new THREE.RingGeometry(0.16, 0.3, 24), tgtDot = new THREE.CircleGeometry(0.09, 16);
        const targets = [0, 1, 2].map(i => {
            const g = new THREE.Group(), m = glow(0xff6b4a);
            g.add(new THREE.Mesh(tgtRing, m), new THREE.Mesh(tgtMid, glow(0xffffff)), new THREE.Mesh(tgtDot, m));
            g.rotation.y = -Math.PI / 2; add(g, 55.38, 2.25, 53.9 + i * 1.6);
            return { g, m, z: 53.9 + i * 1.6, hit: 0 };
        });
        const boltGeo = new THREE.SphereGeometry(0.11, 8, 6), bolts = [0, 1].map(() => { const m = new THREE.Mesh(boltGeo, glow(0x9df3ff)); m.visible = false; m.scale.set(1, 1, 5); root.add(m); return { m, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() }; });
        flat(new THREE.RingGeometry(0.75, 0.9, 32), glow(0xffd27a, 0.7), 46.4, 46, 0.03);                      // jumper's floor mark

        // trainees are live hero rigs (low detail, one skinned mesh per material, no shadows), animated by the same
        // animation code as the player — only while you are near the wing
        const TRAINEES = [];
        function trainee(kind, type, pal, skin, hair, scale, x, z, face) {
            const H = window.AxonHero;
            const P = { mesh: new THREE.Group(), velocity: new THREE.Vector3(), isGrounded: true, isDashing: false, localF: 0, localS: 0, slashTimer: 0, hurtTimer: 0,
                charge: 0, aimTimer: 0, recoilTimer: 0, invincibleTimer: 0, dead: false, flipT: 0, rollT: 0, wallJumpT: 0, wallSlide: 0, skidT: 0, jumpCount: 0,
                lockedEnemy: null, lookTarget: null, headYaw: 0, headPitch: 0, aimPitch: 0, slashSide: 1, slashKind: 'h1', slashDur: 0.28, landT: 0 };
            H.build(P, type, 0.3);
            const p = PALETTES[pal], M = P.mats;
            M.pearl.color.setHex(p.armor); M.steel.color.setHex(p.under); M.trim.color.setHex(p.trim);
            M.glow.color.setHex(p.glow); M.glow.emissive.setHex(p.glow); M.accent.color.setHex(p.accent); M.accent.emissive.setHex(p.accent);
            M.iris.color.setHex(p.eye); M.skin.color.set(skin).convertSRGBToLinear(); M.skin.emissive.set(skin).multiplyScalar(0.55).convertSRGBToLinear(); M.hair.color.set(hair).convertSRGBToLinear();
            const keep = new Set([M.pearl, M.steel, M.trim, M.accent, M.glow, M.skin, M.hair]);
            // same split as the player: joints, saber, scarf and the eye parts (lids, iris, brows — they blink and look around)
            // stay separate; everything static inside each joint is merged per armour material
            const live = new Set([P.torso, P.chest, P.headGroup, P.armL, P.armR, P.elbowL, P.elbowR, P.legL, P.legR, P.kneeL, P.kneeR, P.footL, P.footR,
                P.sword, P.chargeOrb, P.muzzle, P.coreGem, P.mouth, P.mouthOpen, P.mouthClosed, ...(P.vanes || []), ...(P.thrusters || []), ...((P.scarf || []).flat())]);
            (P.eyes || []).forEach(e => { live.add(e); const u = e.userData; [u.lid, u.lidSkin, u.lash, u.iris, u.brow].forEach(o => o && live.add(o)); });
            c.PERF.skinRig(P.mesh, o => live.has(o), m => keep.has(m.material));
            P.mesh.traverse(o => { if (o.isMesh) o.castShadow = false; });
            P.mesh.scale.setScalar(scale); P.mesh.rotation.y = face; add(P.mesh, x, 0, z);
            const tr = { kind, P, x, z, face, t: 0.4 + TRAINEES.length * 0.5, step: 0, hitT: -1, air: null, shot: false };
            TRAINEES.push(tr); return tr;
        }
        trainee('sword', 'a', 'CRIMSON', 0xc68a62, 0x1c1411, 1.0, 48.5, 38, Math.PI / 2);
        trainee('jump', 'f', 'ARCTIC', 0xf1c9a8, 0xd9b36c, 0.97, 46.4, 46, Math.PI / 2);
        trainee('shoot', 'm', 'COBALT', 0x9c6644, 0x14100e, 1.03, 35.9, 55.5, Math.PI / 2);
        c.solids.push(new THREE.Box3(V(48.05, 0, 37.55), V(48.95, 3.1, 38.45)), new THREE.Box3(V(35.45, 0, 55.05), V(36.35, 3.2, 55.95)));
        const KIN = ['h1', 'h2', 'fin', 'spin'], KDUR = [0.28, 0.28, 0.44, 0.62], _tv = new THREE.Vector3(), JA = { x: 46.4, y: 0 }, JB = { x: 50, y: 1.4 };
        function update(dt, time, lx, lz) {
            const d2 = (lx - 42) ** 2 + (lz - 46) ** 2, seen = d2 < 34 * 34, live = seen;   // drawn from the gate inwards (46 m used to draw both trainees through the hangar wall)
            targets.forEach((tg, i) => { tg.g.visible = seen; if (!live) return; tg.g.position.z = O.z + tg.z + Math.sin(time * 0.9 + i * 2.1) * 0.45; tg.hit = Math.max(0, tg.hit - dt); tg.g.scale.setScalar(1 + tg.hit * 1.6); });
            for (const b of bolts) {
                if (!b.m.visible) continue;
                b.t += dt / 0.11; if (b.t >= 1) { b.m.visible = false; continue; }
                b.m.position.lerpVectors(b.from, b.to, b.t);
            }
            for (const tr of TRAINEES) {
                const P = tr.P; P.mesh.visible = seen; if (!live) continue;
                for (const k of ['slashTimer', 'aimTimer', 'recoilTimer', 'flipT']) if (P[k] > 0) P[k] -= dt;
                tr.t -= dt;
                if (tr.kind === 'sword') {
                    if (tr.t <= 0) {
                        const k = tr.step++ % 4;
                        P.slashKind = KIN[k]; P.slashDur = P.slashTimer = KDUR[k]; P.slashSide *= -1;
                        tr.t = KDUR[k] + (k === 3 ? 1.5 : 0.1); tr.hitT = KDUR[k] * 0.5; tr.spin = k === 3;
                    }
                    if (tr.hitT > 0 && (tr.hitT -= dt) <= 0 && c.fx) {
                        c.fx.sparks(V(50.3, 1.9, 38), 0xffd27a, 6, 6);
                        if (tr.spin) c.fx.shock(V(tr.x, 0.06, tr.z), 0xff6b4a, 3.4);
                    }
                } else if (tr.kind === 'jump') {
                    if (!tr.air && tr.t <= 0) {
                        const up = Math.abs(P.mesh.position.x - O.x - JA.x) < 0.5, a = up ? JA : JB, b = up ? JB : JA;
                        tr.air = { a, b, u: 0, flip: false }; P.isGrounded = false; P.jumpCount = 1; P.mesh.rotation.y = up ? Math.PI / 2 : -Math.PI / 2;
                    }
                    if (tr.air) {
                        const A = tr.air; A.u = Math.min(1, A.u + dt / 0.86);
                        const y = A.a.y + (A.b.y - A.a.y) * A.u + Math.sin(A.u * Math.PI) * 3.4, x = A.a.x + (A.b.x - A.a.x) * A.u;
                        P.velocity.set((A.b.x - A.a.x) / 0.86, Math.cos(A.u * Math.PI) * 12, 0);
                        P.mesh.position.set(O.x + x, O.y + y, O.z + tr.z);
                        if (!A.flip && A.u > 0.34) { A.flip = true; P.flipT = 0.46; P.jumpCount = 2; }
                        if (A.u >= 1) {
                            tr.air = null; P.isGrounded = true; P.jumpCount = 0; P.velocity.set(0, 0, 0); P.landT = 0.16; tr.t = 1.1;
                            if (c.fx) c.fx.shock(V(A.b.x, A.b.y + 0.06, tr.z), 0x39d7ff, 2);
                        }
                    }
                } else if (tr.t <= 0) {
                    const tg = targets[tr.step++ % targets.length];
                    tg.g.getWorldPosition(_tv);
                    const dx = _tv.x - P.mesh.position.x, dz = _tv.z - P.mesh.position.z;
                    P.mesh.rotation.y = Math.atan2(dx, dz); P.aimPitch = 0.02; P.aimTimer = 0.55; P.recoilTimer = 0.09;
                    tr.t = 0.95 + (tr.step % 3 === 0 ? 0.7 : 0); tr.shot = tg; tr.shotT = 0.17;
                }
                window.AxonHero.animate(P, dt, time, false);
                if (tr.shot && (tr.shotT -= dt) <= 0) {                // the bolt leaves the muzzle after the arm has come up
                    const tg = tr.shot; tr.shot = false;
                    const b = bolts.find(q => !q.m.visible);
                    if (b && P.muzzle) {
                        P.mesh.updateMatrixWorld(true); P.muzzle.getWorldPosition(b.from); tg.g.getWorldPosition(b.to);
                        b.t = 0; b.m.position.copy(b.from); b.m.lookAt(b.to); b.m.visible = true; tg.hit = 0.22;
                    }
                }
            }
        }
        const qY = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
        // ---------- TRAINING: skills panel (learn sword / jump moves with credits) ----------
        const trainEl = el('hub-train', 'div', 'ui-layer');
        const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
        function renderTrain() {
            const SK = window.AxonSkills, cr = window.AxonShop ? window.AxonShop.credits : 0, names = S('sk');
            const row = s => {
                const tx = names[s.id] || [s.id, ''], own = SK.has(s.id);
                const btn = !s.ready ? `<span class="tr-lock">${LOCK_SVG}<b>${S('locked')}</b><i>${S('soonS')}</i></span>`
                    : own ? `<span class="tr-own">✓ ${S('tr_learned')}</span>`
                    : `<button type="button" class="hm-go tr-buy" data-buy="${s.id}" ${cr < s.price ? 'disabled' : ''}>${S('tr_learn')} · <bdi>${s.price} CR</bdi></button>`;
                return `<div class="tr-row ${s.ready ? '' : 'lock'} ${own ? 'own' : ''}"><svg class="tr-ic" viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg>
                    <div class="tr-t"><b>${tx[0]}</b><p>${tx[1]}</p>${s.ready && tx[2] ? `<span class="tr-how">${S('tr_how')}: ${tx[2]}</span>` : ''}</div>${btn}</div>`;
            };
            const col = (cat, key) => `<section><h3>${S(key)}</h3>${SK.LIST.filter(s => s.cat === cat).map(row).join('')}</section>`;
            trainEl.innerHTML = `<div class="hm-card tr-card" role="dialog" aria-label="${S('tr_title')}">
                <div class="hm-head"><h2>${S('tr_title')}</h2><small>TRAINING</small><span class="hm-prog"><bdi>${cr >= 999999 ? '∞' : cr} CR</bdi></span></div>
                <button type="button" class="pn-close" data-x aria-label="${S('close')}">✕</button>
                <div class="tr-body"><p class="tr-sub">${S('tr_sub')}</p>${col('sword', 'tr_sword')}${col('jump', 'tr_jump')}</div></div>`;
        }
        function openTrain() {
            if (c.getState() !== 'hub') return;
            renderTrain(); trainEl.classList.add('show'); c.setState('hubmenu'); AudioSys.playUi('open');
        }
        function closeTrain() { trainEl.classList.remove('show'); if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input.flush(); } }
        trainEl.addEventListener('click', e => {
            if (e.target === trainEl || e.target.closest('[data-x]')) { AudioSys.playUi('close'); closeTrain(); return; }
            const b = e.target.closest('[data-buy]');
            if (!b) return;
            if (window.AxonSkills.buy(b.dataset.buy)) {
                AudioSys.playBuy(); renderTrain();
                speak(`<b>${S('tr_new')}</b>${(S('sk')[b.dataset.buy] || [''])[0]}`);
            } else AudioSys.playDeny();
        });

        return { update, open: openTrain, close: closeTrain, isOpen: () => trainEl.classList.contains('show'),
            relang() { paintTrain(); if (trainEl.classList.contains('show')) renderTrain(); } };
    }

    // ---------- METEOR DIVE (game.js calls these on the player; f = its effects and combat helpers) ----------
    // Drop like a stone from the air; the landing sends out a shockwave that hits everything around it. Higher drop = bigger blast.
    const dive = {
        start(P, f) {
            P.diving = true; P.diveY = P.mesh.position.y; P.jumpBuffer = 0; P.flipT = 0; P.wallSlide = 0;
            P.velocity.x *= 0.2; P.velocity.z *= 0.2; P.velocity.y = -54;
            f.audio.playDash(); f.shock(P.mesh.position.clone().setY(P.mesh.position.y + 1.2), P.mats.glow.color.getHex(), 2.4);
        },
        tick(P, dt, f) {                                   // straight down, fast; the air control is cut
            if (P.isDashing || P.ledge) { P.diving = false; return; }
            P.velocity.x *= 0.7; P.velocity.z *= 0.7; P.velocity.y = Math.min(P.velocity.y, -54);
            if ((P._dvFx = (P._dvFx || 0) - dt) <= 0) { P._dvFx = 0.03; f.sparks(P.mesh.position.clone().setY(P.mesh.position.y + 2.2), P.mats.glow.color.getHex(), 2, 3); }
        },
        impact(P, f) {
            const p = P.mesh.position, k = Math.max(0.6, Math.min(1.5, ((P.diveY || p.y) - p.y) / 7)), R = 5.2 * k, col = P.mats.glow.color.getHex();
            const g = p.clone(); g.y += 0.06;
            f.shock(g, col, 8 * k); f.shock(g, 0xffffff, 4.5 * k); f.flash(p.clone().setY(p.y + 0.8), 0x9df3ff, 2.6 * k, 0.25); f.sparks(g, 0xffd27a, 26, 16);
            f.shake(0.45); f.audio.playExplode(); P.landT = 0.2; P.invincibleTimer = Math.max(P.invincibleTimer, 0.3);
            let n = 0;
            for (const e of f.enemies()) {
                if (e.isDead) continue;
                const q = e.mesh.position, dx = q.x - p.x, dz = q.z - p.z;
                if (dx * dx + dz * dz > R * R || Math.abs(q.y - p.y) > 4.5) continue;
                e.takeDamage(Math.round((22 + 12 * k) * f.mul()), e.aimPoint(), true); f.combo(); n++;
            }
            if (n) f.stop(0.08);
        }
    };

    return { TEXT, ZONE, HALL, BAY_GAP, INSTRUCTOR, SPOT, ICON, decor, build, dive };
})();
""
