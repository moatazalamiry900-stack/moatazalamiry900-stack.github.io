// =====================================================================
//  AXON BREACH — KENDEL, the HQ guide (guide.js)
//   He waits just inside the hangar door, greets you, then walks you through every wing: he speaks in subtitles
//   (all game languages), stops where there is something to explain and waits if you fall behind.
//   A marker over his head, an arrow on the HUD and a gold dot on the minimap show where to follow him.
//   The whole talk can be skipped (SKIP) or stepped line by line (tap the box / NEXT).
//   Once the tour is over he returns to the door; walk up to him to take it again.
//  hub.js builds him (build) and calls update / enter / relang / dot. Loaded by index.html before hub.js.
// =====================================================================
'use strict';

window.AxonGuide = (function () {
    const NAME = 'KENDEL', KEY = 'axon.guide';
    const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const HOME = { x: 2.2, z: 46.5 };                         // his post: just inside the hangar door
    // the tour: where he stops, the way there (through the gates), what he looks at while he talks, his lines
    const STOPS = [
        { id: 'bay', x: 2.2, z: 46.5, look: [0, 55.2], path: [], n: 3 },
        { id: 'trn', x: 31, z: 46, look: [42, 46], path: [[9, 46], [21, 46]], n: 3 },
        { id: 'cmd', x: 3.4, z: -8.2, look: [0, -14.2], path: [[21, 46], [6, 44], [0, 36], [0, 27], [0, 18], [8, 12], [13, 0], [9, -6]], n: 3 },
        { id: 'ops', x: -45, z: 3.5, look: [-50, 8.6], path: [[-4, -7.5], [-14, -3], [-22, 0], [-29, 0], [-38, 0]], n: 2 },
        { id: 'arm', x: 52, z: -3.5, look: [57.5, -6.5], path: [[-38, 0], [-29, 0], [-22, 0], [-14, -7], [0, -9.5], [14, -7], [22, 0], [29, 0], [40, 0]], n: 2 },
        { id: 'forge', x: 49, z: 3.2, look: [46.25, 7.4], path: [[49, 0]], n: 2 },
        { id: 'style', x: 55.5, z: 3.5, look: [61.4, 7], path: [], n: 3 },
        { id: 'end', x: 55.5, z: 3.5, look: null, path: [], n: 2 }
    ];
    const TEXT = {
        en: {
            follow: 'FOLLOW KENDEL', skip: 'SKIP', next: 'NEXT', tour: 'TAKE THE TOUR', role: 'HQ GUIDE', wait: 'This way — keep up with me.',
            again: 'Back again? I can walk you through the base whenever you like.', bye: 'Understood. I am at the hangar door if you need the tour.',
            go: { trn: 'Follow me — the training wing is through this door.', cmd: 'Next: the command deck. Stay close.', ops: 'Now west, to operations.', arm: 'Last wing: the armory. This way.', forge: 'A few steps more — the forge.', style: 'And over here…' },
            bay: ['Welcome to headquarters. I am Kendel, your guide. Let me show you around.', 'This is the hangar bay. The lit doorway behind you leads outside the base.', 'Every wing has its own colour — the map in the corner always shows where you are.'],
            trn: ['This is the training wing. The saber is allowed in here, so cut freely.', 'Instructor Kage sells new saber moves and jump moves for credits.', 'Anything you learn here stays with you on every mission.'],
            cmd: ['The command deck, the heart of the base.', 'The mission terminal is right there. Step on the ring to pick a mission and deploy.', 'Clearing a mission unlocks the next one.'],
            ops: ['Operations. The crew tracks every sector from these desks.', 'That pad starts free exploration: no mission, just you and the facility.'],
            arm: ['The armory wing. The supply shop is at the far wall.', 'Spend credits there on repair kits, energy cells and shields before a mission.'],
            forge: ['This is the forge.', 'Bring what you find in the field here and turn it into permanent upgrades.'],
            style: ['That capsule is the armor studio — step in to try and buy new armor colours.', 'Next to it, the bio-lab pad changes your look.', 'Neither changes your power — only your style.'],
            end: ['That is the whole base. The terminal on the command deck is waiting when you are ready.', 'If you want the tour again, find me at the hangar door. Good luck out there.']
        },
        ar: {
            follow: 'اتبع كِندل', skip: 'تخطي', next: 'التالي', tour: 'ابدأ الجولة', role: 'مرشد المقر', wait: 'من هنا — ابقَ قريباً مني.',
            again: 'عدتَ من جديد؟ أستطيع أن آخذك في جولة داخل المقر متى شئت.', bye: 'مفهوم. ستجدني عند باب الحظيرة إذا أردت الجولة.',
            go: { trn: 'اتبعني — جناح التدريب خلف هذا الباب.', cmd: 'التالي: منصة القيادة. ابقَ قريباً.', ops: 'والآن غرباً، إلى العمليات.', arm: 'آخر جناح: الترسانة. من هنا.', forge: 'بضع خطوات أخرى — المصهر.', style: 'وهنا…' },
            bay: ['أهلاً بك في المقر. أنا كِندل، مرشدك. دعني أعرّفك على المكان.', 'هذه حظيرة الانطلاق. الباب المضيء خلفك يأخذك إلى خارج المقر.', 'لكل جناح لونه الخاص — والخريطة في الزاوية تبيّن لك دائماً أين أنت.'],
            trn: ['هذا جناح التدريب. السيف مسموح هنا، فاضرب كما تشاء.', 'المدرب كاغي يبيعك حركات سيف وحركات قفز جديدة مقابل الرصيد.', 'كل ما تتعلمه هنا يبقى معك في كل المهام.'],
            cmd: ['منصة القيادة، قلب المقر.', 'محطة المهام هناك. قف على الحلقة لتختار مهمة وتنطلق.', 'إنهاء مهمة يفتح لك المهمة التي بعدها.'],
            ops: ['قسم العمليات. الطاقم يراقب كل القطاعات من هذه المكاتب.', 'هذه المنصة تبدأ الاستكشاف الحر: بلا مهمة، أنت والمنشأة فقط.'],
            arm: ['جناح الترسانة. متجر الإمدادات عند الجدار البعيد.', 'اصرف رصيدك هناك على عُدد الإصلاح وخلايا الطاقة والدروع قبل المهمة.'],
            forge: ['هذا هو المصهر.', 'أحضر ما تجده في الميدان إلى هنا وحوّله إلى ترقيات دائمة.'],
            style: ['تلك الكبسولة هي استوديو الدروع — ادخلها لتجرّب وتشتري ألوان دروع جديدة.', 'وبجانبها منصة المختبر الحيوي لتغيير مظهرك.', 'كلاهما لا يغيّر قوتك — فقط أسلوبك.'],
            end: ['هذا هو المقر كله. محطة المهام في منصة القيادة بانتظارك متى كنت جاهزاً.', 'إذا أردت الجولة مرة أخرى فستجدني عند باب الحظيرة. بالتوفيق.']
        },
        es: {
            follow: 'SIGUE A KENDEL', skip: 'SALTAR', next: 'SIGUIENTE', tour: 'HACER EL RECORRIDO', role: 'GUÍA DEL CUARTEL', wait: 'Por aquí, no te quedes atrás.',
            again: '¿De vuelta? Puedo enseñarte la base cuando quieras.', bye: 'Entendido. Estaré en la puerta del hangar si quieres el recorrido.',
            go: { trn: 'Sígueme: el ala de entrenamiento está tras esta puerta.', cmd: 'Ahora, el puente de mando. No te alejes.', ops: 'Ahora al oeste, a operaciones.', arm: 'La última ala: la armería. Por aquí.', forge: 'Unos pasos más: la forja.', style: 'Y por aquí…' },
            bay: ['Bienvenido al cuartel general. Soy Kendel, tu guía. Deja que te lo enseñe.', 'Esto es el hangar. La puerta iluminada detrás de ti lleva al exterior de la base.', 'Cada ala tiene su color: el mapa de la esquina siempre te dice dónde estás.'],
            trn: ['Esta es el ala de entrenamiento. Aquí se permite el sable, así que corta sin miedo.', 'El instructor Kage vende nuevos movimientos de sable y de salto por créditos.', 'Lo que aprendas aquí te acompaña en todas las misiones.'],
            cmd: ['El puente de mando, el corazón de la base.', 'Ahí está la terminal de misiones. Pisa el anillo para elegir misión y desplegarte.', 'Completar una misión desbloquea la siguiente.'],
            ops: ['Operaciones. El equipo vigila cada sector desde estas mesas.', 'Esa plataforma inicia la exploración libre: sin misión, solo tú y la instalación.'],
            arm: ['El ala de la armería. La tienda de suministros está al fondo.', 'Gasta créditos allí en kits de reparación, células de energía y escudos antes de una misión.'],
            forge: ['Esta es la forja.', 'Trae aquí lo que encuentres en el campo y conviértelo en mejoras permanentes.'],
            style: ['Esa cápsula es el estudio de armaduras: entra para probar y comprar nuevos colores.', 'Al lado, la plataforma del biolaboratorio cambia tu aspecto.', 'Ninguna cambia tu poder, solo tu estilo.'],
            end: ['Esa es toda la base. La terminal del puente de mando te espera cuando estés listo.', 'Si quieres repetir el recorrido, búscame en la puerta del hangar. Buena suerte.']
        },
        zh: {
            follow: '跟随 KENDEL', skip: '跳过', next: '下一句', tour: '开始参观', role: '总部向导', wait: '这边走——跟紧我。',
            again: '又见面了？只要你愿意，我随时可以带你参观基地。', bye: '明白。需要参观的话，我就在机库门口。',
            go: { trn: '跟我来——训练翼就在这扇门后面。', cmd: '下一站：指挥甲板。跟紧。', ops: '现在往西，去作战部。', arm: '最后一个区域：军械库。这边。', forge: '再走几步——锻造台。', style: '还有这边……' },
            bay: ['欢迎来到总部。我是 Kendel，你的向导。让我带你四处看看。', '这里是机库。你身后亮着的门通向基地外面。', '每个区域都有自己的颜色——角落的地图随时告诉你身在何处。'],
            trn: ['这里是训练翼。这里允许使用光剑，尽管挥砍。', '教官 Kage 出售新的剑技和跳跃技，用点数购买。', '在这里学到的招式，所有任务都能使用。'],
            cmd: ['指挥甲板，基地的核心。', '任务终端就在那里。站到光环上选择任务并出击。', '完成一个任务会解锁下一个。'],
            ops: ['作战部。队员们在这些工作台监视每个区域。', '那个平台开启自由探索：没有任务，只有你和设施。'],
            arm: ['军械库。补给商店在最里面的墙边。', '出任务前，在那里用点数购买修复包、能量电池和护盾。'],
            forge: ['这是锻造台。', '把在战场上找到的东西带到这里，换成永久强化。'],
            style: ['那个舱是装甲工作室——走进去试穿并购买新的装甲配色。', '旁边的生物实验室平台可以改变你的外貌。', '它们都不会改变你的战力——只改变你的风格。'],
            end: ['基地就是这些了。准备好之后，指挥甲板的终端在等你。', '想再参观一次，就到机库门口找我。祝你好运。']
        },
        ja: {
            follow: 'KENDEL について行く', skip: 'スキップ', next: '次へ', tour: '案内を受ける', role: '本部ガイド', wait: 'こちらです——離れないで。',
            again: 'また来ましたね。基地の案内はいつでもできますよ。', bye: '了解。案内が必要なら格納庫の扉にいます。',
            go: { trn: 'ついて来て——この扉の先が訓練棟です。', cmd: '次は司令デッキ。離れないで。', ops: '今度は西、オペレーションへ。', arm: '最後の区画、武器庫です。こちらへ。', forge: 'もう少し先——フォージです。', style: 'そしてこちら…' },
            bay: ['本部へようこそ。私は Kendel、あなたのガイドです。案内しましょう。', 'ここは格納庫。後ろの光っている扉が基地の外へ続いています。', '各区画には固有の色があります——隅のマップで現在地がいつでも分かります。'],
            trn: ['ここが訓練棟。ここではセイバーが使えるので、自由に振ってください。', '教官の Kage が新しい剣技とジャンプ技をクレジットで教えてくれます。', 'ここで覚えた技は、すべてのミッションで使えます。'],
            cmd: ['司令デッキ、基地の中心です。', 'あそこがミッション端末。リングに乗ってミッションを選び、出撃します。', 'ミッションをクリアすると次が解放されます。'],
            ops: ['オペレーション。クルーがここで全セクターを監視しています。', 'あのパッドは自由探索の開始地点。ミッションなし、あなたと施設だけです。'],
            arm: ['武器庫です。補給ショップは奥の壁際にあります。', '出撃前にそこでリペアキット、エネルギーセル、シールドを買いましょう。'],
            forge: ['ここがフォージです。', '現地で見つけた物を持ち込めば、恒久的な強化に変えられます。'],
            style: ['あのカプセルはアーマースタジオ——入って新しいアーマーカラーを試着・購入できます。', '隣のバイオラボのパッドでは見た目を変えられます。', 'どちらも強さは変わりません——変わるのはスタイルだけ。'],
            end: ['基地は以上です。準備ができたら司令デッキの端末へ。', 'もう一度案内が必要なら、格納庫の扉にいます。幸運を。']
        }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const T = () => TEXT[lang()] || TEXT.en;
    const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch (e) { } } };

    let API = null;
    function build(o) {
        const { THREE, c, O, add, glow, stage, AudioSys, el, camera } = o;
        const H = window.AxonHero;

        // ---------- the man himself: a live hero rig in white and gold, taller than the crew, with a halo, a holo-slate
        // drone at his shoulder and his name floating over his head ----------
        const P = { mesh: new THREE.Group(), velocity: new THREE.Vector3(), isGrounded: true, isDashing: false, localF: 0, localS: 0, slashTimer: 0, hurtTimer: 0,
            charge: 0, aimTimer: 0, recoilTimer: 0, invincibleTimer: 0, dead: false, flipT: 0, rollT: 0, wallJumpT: 0, wallSlide: 0, skidT: 0, jumpCount: 0,
            lockedEnemy: null, lookTarget: null, headYaw: 0, headPitch: 0, aimPitch: 0, slashSide: 1, slashKind: 'h1', slashDur: 0.28, landT: 0, gait: 0 };   // gait: the run cycle's phase (the animation adds to it)
        H.build(P, 'm', COARSE ? 0.32 : 0.5);   // phones: the same light build as the rest of the crew (22 000 triangles instead of 39 000)
        const M = P.mats, GOLD = 0xffc24a, MAG = 0xff4fd8;
        M.pearl.color.setHex(0x5a2aa8); M.steel.color.setHex(0x1a1026); M.trim.color.setHex(GOLD);
        M.glow.color.setHex(MAG); M.glow.emissive.setHex(MAG); M.accent.color.setHex(GOLD); M.accent.emissive.setHex(GOLD);
        M.iris.color.setHex(0xd99a12); M.skin.color.set(0xb9794f).convertSRGBToLinear(); M.skin.emissive.set(0xb9794f).multiplyScalar(0.55).convertSRGBToLinear(); M.hair.color.set(0xf2f2f6).convertSRGBToLinear();
        const keep = new Set([M.pearl, M.steel, M.trim, M.accent, M.glow, M.skin, M.hair]);
        const live = new Set([P.torso, P.chest, P.headGroup, P.armL, P.armR, P.elbowL, P.elbowR, P.legL, P.legR, P.kneeL, P.kneeR, P.footL, P.footR,
            P.sword, P.chargeOrb, P.muzzle, P.coreGem, P.mouth, P.mouthOpen, P.mouthClosed, ...(P.vanes || []), ...(P.thrusters || []), ...((P.scarf || []).flat())]);
        (P.eyes || []).forEach(e => { live.add(e); const u = e.userData; [u.lid, u.lidSkin, u.lash, u.iris, u.brow].forEach(q => q && live.add(q)); });
        c.PERF.skinRig(P.mesh, q => live.has(q), m => keep.has(m.material));
        P.mesh.traverse(q => { if (q.isMesh) q.castShadow = false; });
        const SCALE = 1.1; P.mesh.scale.setScalar(SCALE);
        add(P.mesh, HOME.x, 0, HOME.z);

        const extra = new THREE.Group(); P.mesh.add(extra); P.extra = extra; window.AxonGuideRef = P;   // comm.js takes his portrait from the model
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 28), glow(GOLD, 0.95)); halo.rotation.x = Math.PI / 2; halo.position.y = 3.55; extra.add(halo);
        const drone = new THREE.Group(); extra.add(drone);
        drone.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glow(MAG, 0.95)));
        const slate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), glow(GOLD, 0.35)); slate.material.side = THREE.DoubleSide; slate.position.set(0, 0.42, 0); drone.add(slate);
        const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 5, 20), glow(GOLD, 0.8)); drone.add(dRing);
        // name tag + follow chevron (sprites: always face the camera)
        const tagCv = document.createElement('canvas'); tagCv.width = 256; tagCv.height = 64;
        (function () { const g = tagCv.getContext('2d'); g.fillStyle = 'rgba(20,10,28,0.78)'; g.fillRect(8, 10, 240, 44); g.strokeStyle = '#ffc24a'; g.lineWidth = 3; g.strokeRect(8, 10, 240, 44);
            g.fillStyle = '#ffc24a'; g.font = '700 30px ' + (o.FONT || 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(NAME, 128, 34); })();
        const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tagCv), transparent: true, depthWrite: false }));
        tag.scale.set(1.9, 0.48, 1); tag.position.y = 4.15; extra.add(tag);
        const chev = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 4), glow(GOLD, 0.95)); chev.rotation.x = Math.PI; chev.position.y = 5.0; extra.add(chev);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 40), glow(GOLD, 0.7)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; extra.add(ring);
        extra.scale.setScalar(1 / SCALE);
        extra.traverse(q => { q.frustumCulled = false; });

        // ---------- subtitles, skip / next buttons, HUD arrow ----------
        const css = document.createElement('style');
        css.textContent = `
          #kd-box{position:absolute;z-index:12;left:50%;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 8px);transform:translate(-50%,14px);width:min(520px,44%);
            padding:10px 14px 10px;background:linear-gradient(180deg,rgba(26,12,34,.92),rgba(10,8,20,.94));border:1px solid rgba(255,194,74,.65);border-left:4px solid #ffc24a;
            color:#f3eee2;font:500 14px/1.45 var(--font,system-ui);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}
          #kd-box.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
          #kd-box .kd-h{display:flex;align-items:center;gap:8px;margin-bottom:3px}
          #kd-box .kd-n{font-weight:800;font-size:12px;letter-spacing:.3em;color:#ffc24a}
          #kd-box .kd-r{font-size:9px;letter-spacing:.2em;color:#ff8fe6;opacity:.9}
          #kd-box .kd-c{margin-inline-start:auto;font-size:10px;color:#b9a98a;letter-spacing:.1em}
          #kd-box .kd-t{min-height:2.9em}
          #kd-box .kd-b{display:flex;gap:8px;justify-content:flex-end;margin-top:6px}
          #kd-box button{font:700 11px/1 var(--font,system-ui);letter-spacing:.14em;padding:8px 12px;border:1px solid rgba(255,194,74,.7);background:rgba(255,194,74,.12);color:#ffc24a;cursor:pointer}
          #kd-box button.kd-skip{border-color:rgba(255,255,255,.35);background:transparent;color:#d8d2c6}
          #kd-box button:active{background:rgba(255,194,74,.35)}
          #kd-box[dir=rtl]{border-left:1px solid rgba(255,194,74,.65);border-right:4px solid #ffc24a}
          #kd-box[dir=rtl] .kd-n,#kd-box[dir=rtl] .kd-r,#kd-box[dir=rtl] button{letter-spacing:0}
          #stage.is-portrait #kd-box{width:92%;bottom:46%}
          #stage.short #kd-box{font-size:12.5px;padding:7px 12px}
          #stage.kd-on.in-hub #slots,#stage.kd-on #hub-say{display:none!important}
          #kd-go{position:absolute;z-index:6;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 52px);transform:translateX(-50%);display:none;align-items:center;gap:9px;
            padding:6px 12px;background:rgba(20,10,28,.82);border:1px solid rgba(255,194,74,.7);color:#ffc24a;font:700 11px/1 var(--font,system-ui);letter-spacing:.14em;pointer-events:none;white-space:nowrap}
          #kd-go.show{display:flex}
          #kd-go svg{width:18px;height:18px;fill:#ffc24a;animation:kdp 1s ease-in-out infinite}
          #kd-go span.d{color:#f3eee2;letter-spacing:0}
          @keyframes kdp{50%{opacity:.45}}
          #stage:not(.in-hub) #kd-box,#stage:not(.in-hub) #kd-go,#stage.in-menu #kd-box,#stage.in-menu #kd-go,#stage.in-studio #kd-box,#stage.in-studio #kd-go{display:none!important}`;
        document.head.appendChild(css);
        const box = el('kd-box'), go = el('kd-go');
        box.innerHTML = `<div class="kd-h"><span class="kd-n">${NAME}</span><span class="kd-r"></span><span class="kd-c"></span></div><div class="kd-t"></div>
            <div class="kd-b"><button class="kd-skip" type="button"></button><button class="kd-next" type="button"></button></div>`;
        go.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2l8 18-8-5-8 5z"/></svg><span class="l"></span><span class="d"></span>`;
        const $ = q => box.querySelector(q), txt = $('.kd-t'), cnt = $('.kd-c'), bSkip = $('.kd-skip'), bNext = $('.kd-next'), goArrow = go.querySelector('svg'), goL = go.querySelector('.l'), goD = go.querySelector('.d');

        // ---------- state ----------
        //  mode: 'idle' (at his post) · 'talk' (speaking at a stop) · 'walk' (leading you to the next stop) · 'home' (walking back to the door)
        let mode = 'idle', stop = 0, line = 0, full = '', shown = 0, hold = 0, route = [], wi = 0, waitT = 0, offer = false, offerOff = false, byeT = 0, cur = null, t = 0;
        const pos = P.mesh.position, lp = () => ({ x: pos.x - O.x, z: pos.z - O.z });
        let faceWant = 0;

        const showBox = v => { box.classList.toggle('show', v); stage.classList.toggle('kd-on', v); };
        function labels() {
            const L = T(); box.dir = lang() === 'ar' ? 'rtl' : 'ltr';
            $('.kd-r').textContent = L.role; bSkip.textContent = L.skip + ' ▸▸'; goL.textContent = L.follow;
            bNext.textContent = offer ? L.tour : L.next + ' ▸';
        }
        function say(s, key) {
            cur = key; full = s; shown = 0; hold = 2.2 + s.length * (/[　-鿿]/.test(s) ? 0.16 : 0.055);
            txt.textContent = ''; showBox(true); labels();
            try { AudioSys.playComm(); } catch (e) { }
        }
        const text = key => { const L = T(); if (key.go) return L.go[key.go]; if (key.k) return L[key.k]; return L[STOPS[key.s].id][key.i]; };
        function sayLine() {
            const s = STOPS[stop]; cnt.textContent = (stop + 1) + ' / ' + STOPS.length;
            say(text({ s: stop, i: line }), { s: stop, i: line });
        }
        function startTour() { offer = false; stop = 0; line = 0; mode = 'talk'; sayLine(); }
        function nextLine() {
            if (shown < full.length) { shown = full.length; txt.textContent = full; return; }      // first tap: finish the typing
            if (offer) { startTour(); return; }
            if (mode !== 'talk') return;
            if (++line < STOPS[stop].n) { sayLine(); return; }
            if (stop + 1 >= STOPS.length) { finish(false); return; }
            stop++; line = 0;
            const s = STOPS[stop];
            if (!s.path.length && Math.hypot(s.x - lp().x, s.z - lp().z) < 0.5) { sayLine(); return; }   // same spot: just keep talking
            route = s.path.concat([[s.x, s.z]]); wi = 0; mode = 'walk'; cnt.textContent = (stop + 1) + ' / ' + STOPS.length;
            say(T().go[s.id] || T().wait, { go: T().go[s.id] ? s.id : null, k: 'wait' });
        }
        function finish(skipped) {
            store.set('done'); offer = false;
            if (skipped) { say(T().bye, { k: 'bye' }); byeT = 2.6; } else showBox(false);
            const p = lp(); route = backRoute(p); wi = 0; mode = 'home'; go.classList.remove('show');
        }
        // the way back to the door from wherever he is: out of the wing through its gate, round the command deck, down the south corridor
        function backRoute(p) {
            const pts = [], S = p.x < 0 ? -1 : 1;
            if (p.z > 30) { if (p.x > 6) [[21, 46], [9, 46]].forEach(q => { if (q[0] < p.x - 0.5) pts.push(q); }); }
            else {
                if (Math.abs(p.x) > 16) [[40, 0], [29, 0], [22, 0]].forEach(q => { if (q[0] < Math.abs(p.x) - 0.5) pts.push([q[0] * S, 0]); });
                if (p.z < -4 && Math.abs(p.x) <= 16) pts.push([9 * S, -6]);
                if (p.z < 6) pts.push([13 * S, 0]);
                if (p.z < 12) pts.push([8 * S, 12]);
                [[0, 18], [0, 27], [0, 36]].forEach(q => { if (q[1] > p.z + 0.5) pts.push(q); });
            }
            pts.push([HOME.x, HOME.z]);
            return pts;
        }
        bNext.addEventListener('click', e => { e.stopPropagation(); nextLine(); });
        bSkip.addEventListener('click', e => { e.stopPropagation(); if (offer) { offer = false; offerOff = true; showBox(false); } else if (mode === 'talk' || mode === 'walk') finish(true); else showBox(false); });
        box.addEventListener('click', nextLine);
        ['pointerdown', 'touchstart'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
        window.addEventListener('keydown', e => {
            if (!box.classList.contains('show') || !stage.classList.contains('in-hub') || c.getState() !== 'hub') return;
            if (e.code === 'Enter' || e.code === 'KeyE') { if (!e.repeat) nextLine(); }
            else if (e.code === 'KeyX' || e.code === 'Backspace') { if (!e.repeat) bSkip.click(); }
        });

        // ---------- per frame ----------
        const SPEED = 8.5;
        let spd = 0;                                                     // he speeds up and slows down like a person, never in one frame
        function walkTo(dt, tx, tz, speed, last) {
            const p = lp(), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
            if (d < (last ? 0.2 : 0.7)) return true;                     // corners are cut: he does not stop at every waypoint
            const want = last ? Math.min(speed, 1.2 + d * 3.5) : speed;  // eases into the final spot
            spd += (want - spd) * Math.min(1, dt * 5);
            const v = Math.min(spd, d / Math.max(dt, 1e-3));
            P.velocity.set(dx / d * v, 0, dz / d * v);
            pos.x += dx / d * v * dt; pos.z += dz / d * v * dt;
            faceWant = Math.atan2(dx, dz);
            return false;
        }
        function update(dt, time, lx, lz) {
            t += dt;
            const p = lp(), dx = lx - p.x, dz = lz - p.z, dist = Math.hypot(dx, dz), hubOn = c.getState() === 'hub';
            P.mesh.visible = dist < 46;
            let moving = false;
            const v0x = P.velocity.x, v0z = P.velocity.z;
            if (hubOn) {
                // typing + auto-advance
                if (box.classList.contains('show') && shown < full.length) { const s0 = Math.floor(shown); shown = Math.min(full.length, shown + dt * 46); txt.textContent = full.slice(0, Math.floor(shown)); if (Math.floor(shown) !== s0 && window.AxonSfx) window.AxonSfx.type(1); }
                else if (mode === 'talk' && !offer && box.classList.contains('show') && (hold -= dt) <= 0) nextLine();
                if (byeT > 0 && (byeT -= dt) <= 0 && mode !== 'talk' && !offer) showBox(false);

                if (mode === 'talk') {
                    P.velocity.set(0, 0, 0);
                    const s = STOPS[stop], speaking = shown < full.length;
                    faceWant = s.look && line > 0 && !speaking ? Math.atan2(s.look[0] - p.x, s.look[1] - p.z) : Math.atan2(dx, dz);   // looks at you, then at the thing
                } else if (mode === 'walk') {
                    if (dist > 13 && !(dx * Math.sin(faceWant) + dz * Math.cos(faceWant) > 0)) {      // you fell behind: he stops and calls you
                        P.velocity.set(0, 0, 0); faceWant = Math.atan2(dx, dz);
                        if ((waitT -= dt) <= 0) { waitT = 7; say(T().wait, { k: 'wait' }); }
                    } else {
                        waitT = Math.min(waitT, 1.5);
                        const w = route[wi]; moving = true;
                        if (walkTo(dt, w[0], w[1], SPEED, wi === route.length - 1)) { if (++wi >= route.length) { mode = 'arrive'; moving = false; } }
                    }
                } else if (mode === 'arrive') {                                      // at the stop: wait until you are next to him
                    faceWant = Math.atan2(dx, dz);
                    if (dist < 9) { mode = 'talk'; line = 0; sayLine(); }
                    else if ((waitT -= dt) <= 0) { waitT = 7; say(T().wait, { k: 'wait' }); }
                } else if (mode === 'home') {
                    if (!P.mesh.visible) { pos.set(O.x + HOME.x, O.y, O.z + HOME.z); wi = route.length - 1; spd = 0; P.velocity.set(0, 0, 0); }   // nobody is watching: he is simply back at his post
                    const w = route[wi]; moving = true;
                    if (walkTo(dt, w[0], w[1], SPEED * 1.2, wi === route.length - 1)) { if (++wi >= route.length) { mode = 'idle'; moving = false; offerOff = true; } }
                } else {                                                             // idle at his post
                    faceWant = dist < 16 ? Math.atan2(dx, dz) : 0;
                    if (dist < 3.4 && !offer && !offerOff && !(byeT > 0)) { offer = true; cnt.textContent = ''; say(T().again, { k: 'again' }); }
                    else if (dist > 5.5) { offerOff = false; if (offer) { offer = false; showBox(false); } }
                }
            } else P.velocity.set(0, 0, 0);

            // body
            let a = faceWant - P.mesh.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
            P.mesh.rotation.y += a * Math.min(1, dt * (moving ? 10 : 5));
            if (!moving) { spd = Math.max(0, spd - dt * 60); const h = Math.hypot(v0x, v0z); if (h > 0.01 && spd > 0.3) { P.velocity.set(v0x / h * spd, 0, v0z / h * spd); pos.x += P.velocity.x * dt; pos.z += P.velocity.z * dt; } else P.velocity.set(0, 0, 0); }   // a short stop, not a freeze
            const ry = P.mesh.rotation.y; const sp = Math.hypot(P.velocity.x, P.velocity.z);
            if (sp > 0.5) {                                                  // same as the player: the move direction in his own frame, -1..1
                const vx = P.velocity.x / sp, vz = P.velocity.z / sp, k = Math.min(1, dt * 12);
                P.localF += (vx * Math.sin(ry) + vz * Math.cos(ry) - P.localF) * k; P.localS += (vx * Math.cos(ry) - vz * Math.sin(ry) - P.localS) * k;
            }
            if (P.mesh.visible) {
                H.animate(P, dt, time, sp > 2); if (P.sword) P.sword.visible = false;   // a guide, not a fighter
                if (sp < 0.5 && box.classList.contains('show') && shown < full.length && P.armR) {   // he gestures while he speaks
                    P.armR.rotation.x = -0.75 + Math.sin(t * 5) * 0.12; P.armR.rotation.y = -0.35; if (P.elbowR) P.elbowR.rotation.x = -1.2 + Math.sin(t * 7) * 0.15;
                }
                halo.rotation.z += dt * 1.6; halo.position.y = 3.55 + Math.sin(t * 2.2) * 0.05;
                drone.position.set(Math.cos(t * 0.9) * 0.95, 2.75 + Math.sin(t * 2.6) * 0.12, Math.sin(t * 0.9) * 0.95);
                dRing.rotation.x += dt * 2.4; dRing.rotation.y += dt * 1.3; slate.rotation.y = -ry;
                const lead = mode === 'walk' || mode === 'arrive';
                chev.visible = ring.visible = lead || (mode === 'idle' && !offerOff && store.get() !== 'done');
                chev.position.y = 5.0 + Math.sin(t * 5) * 0.2; chev.rotation.y += dt * 3; ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
            }
            // HUD arrow: which way he is, and how far
            const lead = hubOn && (mode === 'walk' || mode === 'arrive') && dist > 5;
            go.classList.toggle('show', lead);
            if (lead) {
                const cam = camera(), e = cam.matrixWorld.elements, fx = -e[8], fz = -e[10];           // camera forward on the floor
                const ang = Math.atan2(dx * -1, dz * -1) - Math.atan2(fx, fz);                         // direction player → Kendel, relative to the view
                goArrow.style.transform = `rotate(${(-ang * 180 / Math.PI).toFixed(0)}deg)`;
                goD.textContent = Math.round(dist) + ' m';
            }
        }

        function enter() {
            pos.set(O.x + HOME.x, O.y, O.z + HOME.z); P.velocity.set(0, 0, 0); P.mesh.rotation.y = faceWant = 0; spd = 0;
            offer = false; offerOff = false; byeT = 0; mode = 'idle'; showBox(false); go.classList.remove('show');
            if (store.get() !== 'done') startTour();                    // first visit: he greets you at the door
        }
        function relang() { labels(); if (cur && box.classList.contains('show')) { const key = cur; full = key.go ? T().go[key.go] : key.k ? T()[key.k] : T()[STOPS[key.s].id][key.i]; shown = full.length; txt.textContent = full; } }
        // minimap: a gold diamond, and a dashed line to him while he is leading you
        function dot(g, X, Y, lx, lz) {
            const p = lp(), x = X(p.x), y = Y(p.z);
            if (mode === 'walk' || mode === 'arrive') { g.save(); g.strokeStyle = 'rgba(255,194,74,0.7)'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(lx), Y(lz)); g.lineTo(x, y); g.stroke(); g.restore(); }
            g.fillStyle = '#ffc24a'; g.strokeStyle = '#1a0d00'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x, y - 4.5); g.lineTo(x + 4.5, y); g.lineTo(x, y + 4.5); g.lineTo(x - 4.5, y); g.closePath(); g.fill(); g.stroke();
        }
        labels();
        return API = { at: (x, z) => { const p = lp(); return (p.x - x) ** 2 + (p.z - z) ** 2 < 42; }, o, backRoute, update, enter, relang, dot, P, get state() { return { mode, stop, line, offer, text: full, x: lp().x, z: lp().z }; }, next: nextLine, skip: () => bSkip.click() };
    }

    return { build, TEXT, STOPS, HOME, NAME, get live() { return API; } };
})();
