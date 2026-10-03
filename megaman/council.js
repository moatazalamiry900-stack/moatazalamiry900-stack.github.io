// =====================================================================
//  AXON BREACH — WAR ROOM: the second floor of the HQ (council.js)
//   • A doorway in the west wall of the HANGAR BAY opens onto a staircase (+5 m) up to the war room.
//   • Two guards stand at the door at the top of the stairs.
//   • Inside: a long command table carrying an electronic tactical map (with a hologram of the mission-one
//     facility), and the five leaders of the base around it — three women and two men. The tall one in the
//     greatcoat and the commander's cap is COMMANDER RHODES: walk up to him and he briefs you on mission one.
//   • KENDEL's tour (guide.js) now ends here: he leads you up, introduces the commander and sends you to him.
//  All text in the five game languages. hub.js builds the room (decor) and the live parts (build).
//  Loaded by index.html after guide.js, before hub.js.
// =====================================================================
'use strict';

window.AxonCouncil = (function () {
    const Y = 5, RX = -42, RZ = 46, GOLD = 0xffc24a;                 // floor height of the room · its centre
    const CHIEF = { x: -51.8, z: 46 };
    const TEXT = {
        en: { z_war: 'WAR ROOM', chief: 'Talk to the commander', map_chief: 'COMMANDER', cname: 'COMMANDER RHODES', crole: 'HIGH COMMAND', next: 'NEXT', close: 'CLOSE', done: 'UNDERSTOOD',
            after: 'Mission terminal: COMMAND DECK', wall: 'HIGH COMMAND',
            brief: ['So you are the operative Kendel told me about. Welcome to the war room.',
                'Your first mission is AXON BREACH, sector 07: a nine-floor facility that has fallen to a rogue guardian.',
                'Every floor is a corridor, then an arena. The arena locks the moment you step in — two waves, and the gates open only when it is empty.',
                'Between sectors you cross gauntlets over the abyss. Do not fall. Every arena you clear is saved, so you can pull back to HQ and return.',
                'At the top waits SENTINEL-Ω. Bring it down. The mission terminal is on the command deck — deploy when you are ready. Dismissed.'],
            guard: ['GUARD', 'The council is in session. Go on in, operative.'],
            say: { selene: 'Intel counts dozens of hostiles inside the facility. Watch the drones.', mira: 'Supplies are in the armory. Do not deploy with empty slots.', iris: 'The guardian changes at half strength. It gets faster.', brant: 'Stairs, arenas, pits. Keep moving and you will live.' },
            kendel: { go: 'One last place — upstairs, the war room.', lines: ['This is the war room, the second floor of the base. The command council meets around that table.', 'The tall one in the long coat and the cap is Commander Rhodes. He leads this base.', 'Go ahead, the commander is waiting — he will brief you on your first mission. If you want the tour again, find me at the hangar door.'] } },
        ar: { z_war: 'غرفة القيادة العليا', chief: 'تحدّث مع القائد', map_chief: 'القائد', cname: 'القائد رودس', crole: 'القيادة العليا', next: 'التالي', close: 'إغلاق', done: 'مفهوم',
            after: 'محطة المهام: منصة القيادة', wall: 'القيادة العليا',
            brief: ['إذن أنت المقاتل الذي حدّثني عنه كِندل. أهلاً بك في غرفة القيادة.',
                'مهمتك الأولى هي AXON BREACH في القطاع 07: منشأة من تسعة طوابق سقطت بيد حارس متمرّد.',
                'كل طابق ممر ثم ساحة. الساحة تُغلق لحظة دخولك — موجتان من الأعداء، ولا تُفتح البوابات حتى تخلو تماماً.',
                'بين القطاعات تعبر ممرات عقبات فوق الهاوية، فلا تسقط. كل ساحة تنظّفها تُحفظ، فتستطيع الانسحاب إلى المقر ثم العودة.',
                'في القمة ينتظرك SENTINEL-Ω. أسقِطه. محطة المهام في منصة القيادة — انطلق متى كنت جاهزاً. انصراف.'],
            guard: ['الحارس', 'المجلس منعقد. تفضّل بالدخول أيها المقاتل.'],
            say: { selene: 'الاستخبارات تُحصي عشرات الأعداء داخل المنشأة. انتبه للدرونز.', mira: 'الإمدادات في الترسانة. لا تنطلق وخاناتك فارغة.', iris: 'الحارس يتغيّر عند نصف قوته، ويصبح أسرع.', brant: 'درج، ساحات، حُفر. ابقَ متحركاً تبقَ حيّاً.' },
            kendel: { go: 'بقي مكان أخير — في الطابق العلوي، غرفة القيادة.', lines: ['هذه غرفة القيادة، الطابق الثاني من المقر. مجلس القيادة يجتمع حول تلك الطاولة.', 'الطويل صاحب المعطف والقبعة هو القائد رودس، زعيم هذا المقر.', 'تفضّل عند الزعيم، فهو بانتظارك ليحدّثك عن مهمتك الأولى. وإذا أردت الجولة مرة أخرى فستجدني عند باب الحظيرة.'] } },
        es: { z_war: 'SALA DE GUERRA', chief: 'Hablar con el comandante', map_chief: 'COMANDANTE', cname: 'COMANDANTE RHODES', crole: 'ALTO MANDO', next: 'SIGUIENTE', close: 'CERRAR', done: 'ENTENDIDO',
            after: 'Terminal de misiones: PUENTE DE MANDO', wall: 'ALTO MANDO',
            brief: ['Así que tú eres el operativo del que me habló Kendel. Bienvenido a la sala de guerra.',
                'Tu primera misión es AXON BREACH, sector 07: una instalación de nueve pisos tomada por un guardián rebelde.',
                'Cada piso es un pasillo y luego una arena. La arena se bloquea al entrar: dos oleadas, y las puertas solo se abren cuando queda vacía.',
                'Entre sectores cruzarás recorridos sobre el abismo. No caigas. Cada arena despejada se guarda, así que puedes volver al cuartel y regresar.',
                'En la cima espera SENTINEL-Ω. Derríbalo. La terminal de misiones está en el puente de mando: despliega cuando estés listo. Retírate.'],
            guard: ['GUARDIA', 'El consejo está reunido. Adelante, operativo.'],
            say: { selene: 'Inteligencia cuenta decenas de hostiles en la instalación. Cuidado con los drones.', mira: 'Los suministros están en la armería. No despliegues con las ranuras vacías.', iris: 'El guardián cambia a media vida. Se vuelve más rápido.', brant: 'Escaleras, arenas, fosos. Sigue moviéndote y vivirás.' },
            kendel: { go: 'Queda un último lugar: arriba, la sala de guerra.', lines: ['Esta es la sala de guerra, el segundo piso de la base. El consejo de mando se reúne alrededor de esa mesa.', 'El alto del abrigo largo y la gorra es el comandante Rhodes. Él dirige esta base.', 'Adelante, el comandante te espera: te informará sobre tu primera misión. Si quieres repetir el recorrido, búscame en la puerta del hangar.'] } },
        zh: { z_war: '作战指挥室', chief: '与指挥官交谈', map_chief: '指挥官', cname: '指挥官 RHODES', crole: '最高指挥部', next: '下一句', close: '关闭', done: '明白',
            after: '任务终端：指挥甲板', wall: '最高指挥部',
            brief: ['你就是 Kendel 提到的那位特工。欢迎来到作战指挥室。',
                '你的第一个任务是 AXON BREACH，07 区：一座九层设施，已被失控的守卫占据。',
                '每一层都是走廊加竞技场。你一踏入，竞技场就会封锁——两波敌人，清空后大门才会开启。',
                '区域之间要穿越深渊上的障碍通道，不要掉下去。每清理一个竞技场都会存档，你可以撤回总部再回来。',
                '顶层等着你的是 SENTINEL-Ω。击倒它。任务终端在指挥甲板——准备好就出击。解散。'],
            guard: ['守卫', '委员会正在开会。请进，特工。'],
            say: { selene: '情报显示设施内有数十个敌人。小心无人机。', mira: '补给在军械库。别空着快捷栏出击。', iris: '守卫在半血时会变化，速度更快。', brant: '楼梯、竞技场、深坑。不停移动才能活下来。' },
            kendel: { go: '还有最后一处——楼上的作战指挥室。', lines: ['这里是作战指挥室，基地的二层。指挥委员会就围着那张桌子开会。', '那位穿长外套、戴军帽的高个子就是 Rhodes 指挥官，这座基地由他领导。', '请到指挥官那里去，他正等着向你说明第一个任务。想再参观一次，就到机库门口找我。'] } },
        ja: { z_war: '作戦司令室', chief: '司令官と話す', map_chief: '司令官', cname: 'RHODES 司令官', crole: '最高司令部', next: '次へ', close: '閉じる', done: '了解',
            after: 'ミッション端末：司令デッキ', wall: '最高司令部',
            brief: ['君が Kendel の言っていたオペレーターか。作戦司令室へようこそ。',
                '最初の任務は AXON BREACH、セクター07。暴走したガーディアンに占拠された9層の施設だ。',
                '各フロアは通路、そしてアリーナ。踏み込んだ瞬間に封鎖される——ウェーブは2つ、全滅させるまでゲートは開かない。',
                'セクターの間には奈落の上の障害コースがある。落ちるな。制圧したアリーナはセーブされる。司令部へ退いて、また戻ればいい。',
                '頂上には SENTINEL-Ω が待っている。倒せ。ミッション端末は司令デッキにある——準備ができたら出撃しろ。以上だ。'],
            guard: ['衛兵', '評議会は会議中です。どうぞ中へ。'],
            say: { selene: '諜報によれば施設内の敵は数十体。ドローンに注意して。', mira: '補給品は武器庫に。スロットが空のまま出撃しないで。', iris: 'ガーディアンは体力半分で変化する。速くなるわ。', brant: '階段、アリーナ、落とし穴。動き続ければ生き残れる。' },
            kendel: { go: '最後にもう一か所——上の階、作戦司令室です。', lines: ['ここが作戦司令室、基地の2階です。司令評議会はあのテーブルを囲んで集まります。', 'ロングコートに軍帽の背の高い方が Rhodes 司令官。この基地の指揮官です。', 'どうぞ司令官のもとへ。最初のミッションについて説明してくれます。もう一度案内が必要なら、格納庫の扉にいます。'] } }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const tr = k => { const d = TEXT[lang()] || TEXT.en; return d[k] !== undefined ? d[k] : TEXT.en[k]; };
    const hubText = l => { const t = TEXT[l] || TEXT.en; return { z_war: t.z_war, chief: t.chief, map_chief: t.map_chief }; };

    // layout handed to hub.js (custom: this file builds the room and the staircase itself)
    const ZONE = { id: 'war', key: 'z_war', x: RX, z: RZ, hw: 14, hd: 12, y: Y, col: GOLD, trim: GOLD, light: 0xffd9a0, custom: true, gaps: {} };
    const HALL = { x: -21, z: 46, len: 14, alongZ: false, neg: 'z_bay', pos: 'z_war', negCol: 0xffa826, posCol: GOLD, custom: true, gx: -27.5, y: Y };   // gx / y: where its gate stands
    const BAY_GAP = [46, 8];
    const SPOT = { id: 'chief', x: -53.2, z: 46, r: 3.4, y: Y };   // all around the commander: reached from either side of the table
    const ICON = '<path d="M4 11c0-4 3.5-6 8-6s8 2 8 6z"/><path d="M3 11h18l1 3H2z"/><path d="M12 7.2l.9 1.6-.9 1.4-.9-1.4z"/><path d="M7 17c1.5 2.5 3 3.5 5 3.5s3.5-1 5-3.5"/>';

    // floor height at a point of the HQ (the stairs and the room; everywhere else 0) — used for KENDEL
    function heightAt(x, z) {
        if (x > -15 || x < -57 || z < 33 || z > 59) return 0;
        return Math.min(Y, (-15 - x) / 10 * Y);
    }

    // ---------- KENDEL's tour ends in the war room (guide.js keeps its own logic; only the last stop changes) ----------
    (function patchGuide() {
        const G = window.AxonGuide; if (!G || !G.STOPS) return;
        const S = G.STOPS; if (S.length && S[S.length - 1].id === 'end') S.pop();
        S.push({ id: 'war', x: -31.5, z: 44.2, look: [CHIEF.x, CHIEF.z], n: 3,
            path: [[40, 0], [29, 0], [22, 0], [13, 0], [8, 12], [0, 18], [0, 27], [0, 36], [-6, 45], [-14, 46], [-26, 46]] });
        Object.keys(G.TEXT).forEach(l => { const k = (TEXT[l] || TEXT.en).kendel; G.TEXT[l].go.war = k.go; G.TEXT[l].war = k.lines; });
    })();

    // ---------- static parts, merged into the HQ's world mesh (called by hub.js before it finishes its batch) ----------
    function decor({ block, strip, frame }) {
        // staircase: 14 steps from the hangar bay's west doorway up to the landing
        block('floor', -14.5, -0.5, 46, 1, 1, 8);
        const N = 14, D = 10 / N;
        for (let k = 0; k < N; k++) {
            const top = (k + 1) * Y / N, xc = -15 - (k + 0.5) * D;
            block('floor', xc, (top - 1) / 2, 46, D, top + 1, 8);
            strip(GOLD, xc + D / 2 + 0.02, top - 0.07, 46, 0.04, 0.05, 7.6);                     // a light on every riser
        }
        block('floor', -26.5, 2, 46, 3, 6, 8, GOLD);                                               // landing
        [-1, 1].forEach(s => { block('wall', -21.5, 7.5, 46 + s * 4.5, 13, 15, 1); strip(GOLD, -21.5, 11, 46 + s * 3.94, 13, 0.08, 0.06); strip(0x1d6fb8, -21.5, 8, 46 + s * 3.94, 13, 0.06, 0.06); });
        // the room: raised floor, four walls (doorway in the east one)
        block('floor', RX, Y - 0.5, RZ, 28, 1, 24, GOLD);
        block('wall', -56.5, 7.5, RZ, 1, 15, 24); block('wall', RX, 7.5, 33.5, 30, 15, 1); block('wall', RX, 7.5, 58.5, 30, 15, 1);
        block('wall', -27.5, 7.5, 38, 1, 15, 8); block('wall', -27.5, 7.5, 54, 1, 15, 8); block('wall', -27.5, 13.5, 46, 1, 3, 8);
        [[34.06], [57.94]].forEach(([z]) => { strip(GOLD, RX, Y + 0.32, z, 28, 0.1, 0.1); strip(GOLD, RX, Y + 7.6, z, 28, 0.07, 0.1); });
        strip(GOLD, -55.94, Y + 0.32, RZ, 0.1, 0.1, 24); strip(GOLD, -55.94, Y + 7.6, RZ, 0.1, 0.07, 24);
        for (let z = 37; z <= 55; z += 6) strip(0x4a3a1a, RX, Y + 9.7, z, 28, 0.35, 0.5);         // ceiling beams
        [44.6, 47.4].forEach(z => strip(0x8a6a22, -32.6, Y + 0.03, z, 9.2, 0.04, 0.1));            // runner from the door to the table
        // the long command table
        block('wall', -44, Y + 0.5, 46, 12, 1, 3.4, GOLD);
        [-1.72, 1.72].forEach(dz => strip(GOLD, -44, Y + 1.02, 46 + dz, 12, 0.05, 0.05));
        [-50.02, -37.98].forEach(x => strip(GOLD, x, Y + 1.02, 46, 0.05, 0.05, 3.4));
        // side consoles and the frame of the wall screen behind the commander
        for (const x of [-48, -36]) for (const [z, f] of [[35.2, 1], [56.8, -1]]) { block('wall', x, Y + 0.55, z, 5, 1.1, 1.4, GOLD); strip(GOLD, x, Y + 1.12, z + f * 0.72, 5, 0.06, 0.06); }
        frame(-55.95, Y + 5, 46, 9.8, 4.4, GOLD, 'x');
    }

    // ---------- live parts: the map, the council, the guards, the briefing. h = helpers of hub.js ----------
    function build(h) {
        const { THREE, c, O, V, add, root, glow, canvasTex, FONT, PALETTES, bakeCrew, stage, AudioSys, el, speak } = h;
        const grp = new THREE.Group(); root.add(grp);
        const put = (o, x, y, z) => { o.position.set(O.x + x, O.y + y, O.z + z); grp.add(o); return o; };

        // ---- electronic map on the table + hologram of the mission-one facility ----
        const MK = 6, node = i => [70 + i * 80, 128 + Math.sin(i * 1.3) * 70];                      // MK: the mission-one node
        const mapTex = canvasTex(THREE, 1024, 256, (g, w, hh) => {
            g.fillStyle = '#04101c'; g.fillRect(0, 0, w, hh);
            g.strokeStyle = 'rgba(255,194,74,.10)'; g.lineWidth = 1;
            for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); }
            for (let y = 0; y < hh; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
            g.strokeStyle = 'rgba(57,215,255,.22)';
            [[210, 90], [520, 170], [800, 80], [930, 190]].forEach(([x, y]) => { for (let r = 22; r < 110; r += 22) { g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0.3, 0, Math.PI * 2); g.stroke(); } });
            g.strokeStyle = 'rgba(57,215,255,.7)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath();
            for (let i = 0; i < 12; i++) { const [x, y] = node(i); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.setLineDash([]);
            for (let i = 0; i < 12; i++) { if (i === MK) continue; const [x, y] = node(i); g.fillStyle = 'rgba(57,215,255,.75)'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
            const [fx, fy] = node(MK); g.strokeStyle = '#ffc24a'; g.lineWidth = 3; g.shadowColor = '#ffc24a'; g.shadowBlur = 14;
            g.beginPath(); g.arc(fx, fy, 22, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(fx, fy, 32, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
            g.fillStyle = '#ffc24a'; g.font = `700 20px ${FONT}`; g.textBaseline = 'middle'; g.fillText('S-07 · AXON BREACH', fx + 44, fy - 40);
            g.fillStyle = 'rgba(255,194,74,.8)'; g.font = `700 16px ${FONT}`; g.fillText('TACTICAL MAP // HIGH COMMAND', 16, 18);
            g.strokeStyle = 'rgba(255,194,74,.7)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, hh - 4);
        });
        const map = put(new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.9), new THREE.MeshBasicMaterial({ map: mapTex })), -44, Y + 1.03, 46); map.rotation.x = -Math.PI / 2;
        const HX = -44 + (node(MK)[0] / 1024 - 0.5) * 11.4, HZ = 46 + (node(MK)[1] / 256 - 0.5) * 2.9;      // the mission-one node on the table
        const tower = put(new THREE.Group(), HX, Y + 1.06, HZ); tower.scale.setScalar(0.6);
        {
            const e = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)).attributes.position.array, pts = [];
            for (let f = 0; f < 9; f++) { const s = 0.62 - f * 0.035, y = 0.12 + f * 0.17; for (let i = 0; i < e.length; i += 3) pts.push(e[i] * s, y + e[i + 1] * 0.13, e[i + 2] * s); }
            const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            tower.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));
        }
        const boss = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glow(0xff2a6d)); boss.position.y = 1.85; tower.add(boss);
        const cone = put(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 1.2, 20, 1, true), glow(GOLD, 0.07, THREE.DoubleSide)), HX, Y + 1.65, HZ);
        const ping = put(new THREE.Mesh(new THREE.RingGeometry(0.3, 0.34, 40), glow(GOLD, 0.8, THREE.DoubleSide)), HX, Y + 1.05, HZ); ping.rotation.x = -Math.PI / 2;
        const sweep = put(new THREE.Mesh(new THREE.PlaneGeometry(0.08, 2.9), glow(0x7ff3ff, 0.55, THREE.DoubleSide)), -44, Y + 1.05, 46); sweep.rotation.x = -Math.PI / 2;

        // ---- wall screen behind the commander ----
        const wallTex = canvasTex(THREE, 512, 224, () => { });
        function paintWall() {
            const g = wallTex.image.getContext('2d'), w = 512, hh = 224;
            g.clearRect(0, 0, w, hh); g.fillStyle = '#0a0a14'; g.fillRect(0, 0, w, hh);
            g.strokeStyle = 'rgba(255,194,74,.16)'; g.lineWidth = 1; for (let x = 0; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); }
            g.save(); g.translate(w / 2, 74); g.strokeStyle = '#ffc24a'; g.lineWidth = 4; g.shadowColor = '#ffc24a'; g.shadowBlur = 16; g.beginPath();
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); } g.closePath(); g.stroke();
            g.beginPath(); g.moveTo(-22, 18); g.lineTo(-22, -16); g.lineTo(0, 6); g.lineTo(22, -16); g.lineTo(22, 18); g.stroke(); g.restore();
            g.direction = lang() === 'ar' ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillStyle = '#ffe2a8'; g.shadowColor = '#ffc24a'; g.shadowBlur = 14; g.font = `700 40px ${FONT}`; g.fillText(tr('z_war'), w / 2, 156, w - 40);
            g.shadowBlur = 0; g.fillStyle = '#ff8fa8'; g.font = `600 20px ${FONT}`; g.fillText(tr('wall'), w / 2, 196, w - 40);
            wallTex.needsUpdate = true;
        }
        paintWall();
        const wall = put(new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.2), new THREE.MeshBasicMaterial({ map: wallTex })), -55.92, Y + 5, 46); wall.rotation.y = Math.PI / 2;

        // ---- the people ----
        PALETTES.CHIEF = { armor: 0x14161d, under: 0x0c0d12, trim: 0xe2b64a, glow: 0xff3d4a, accent: 0xe2b64a, eye: 0xd99a12 };
        PALETTES.SENTRY = { armor: 0x2a2f3a, under: 0x101218, trim: 0xe2b64a, glow: 0xffc24a, accent: 0x8a1f2c, eye: 0xd99a12 };
        const people = [];
        //            id        name            build pal        skin      hair      scale pose       x      z     facing
        const CAST = [
            ['chief', 'CDR. RHODES', 'm', 'CHIEF', 0xc68a62, 0xd9d9e0, 1.2, 'commander', CHIEF.x, CHIEF.z, Math.PI / 2],
            ['selene', 'SELENE', 'f', 'ARCTIC', 0xf1c9a8, 0x14100e, 1.0, 'console', -47, 43.5, 0],
            ['brant', 'BRANT', 'm', 'COBALT', 0x7a4b30, 0x14100e, 1.05, 'talk', -41, 43.5, 0],
            ['mira', 'MIRA', 'f', 'ROSE', 0x8d5a37, 0x3b2416, 0.98, 'pad', -47, 48.5, Math.PI],
            ['iris', 'IRIS', 'f', 'JADE', 0xe3aa82, 0xa33a2a, 1.0, 'console', -41, 48.5, Math.PI],
            ['guard', '', 'm', 'SENTRY', 0x9c6644, 0x14100e, 1.08, 'guard', -25.9, 42.8, Math.PI / 2],
            ['guard', '', 'a', 'SENTRY', 0xdca37c, 0x1c1411, 1.06, 'guard', -25.9, 49.2, Math.PI / 2]
        ];
        const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const cloth = new THREE.MeshStandardMaterial({ color: 0x0f1322, metalness: 0.15, roughness: 0.7 });
        const lining = new THREE.MeshStandardMaterial({ color: 0x6e1220, metalness: 0.1, roughness: 0.7, side: THREE.BackSide });
        const gold = new THREE.MeshStandardMaterial({ color: 0xf0c050, metalness: 0.55, roughness: 0.3, emissive: 0x7a5410, emissiveIntensity: 0.55, side: THREE.DoubleSide });
        const red = new THREE.MeshStandardMaterial({ color: 0x861626, metalness: 0.15, roughness: 0.55, emissive: 0x260408, emissiveIntensity: 0.5 });
        const gloss = new THREE.MeshStandardMaterial({ color: 0x07080c, metalness: 0.6, roughness: 0.18, side: THREE.DoubleSide });
        // the commander's uniform: a greatcoat worn over the shoulders (ankle length, open at the front, red lining, gold piping,
        // epaulettes, a chain clasp across the chest, the base's crest on the back) and the peaked cap. Sizes are in his own
        // body space: he is 3.14 tall, 1.34 across the shoulders, and his back gear reaches 0.53 behind him.
        // one mesh per material: his uniform is 40 separate parts (40 draw calls, and 40 more in the shadow pass)
        const flatten = g => {
            g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), old = [];
            g.traverse(o => { if (!o.isMesh) return; old.push(o); if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push({ geo: o.geometry, matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) }); });
            old.forEach(o => o.parent.remove(o)); g.children.filter(o => o.isGroup).forEach(o => g.remove(o));
            by.forEach((list, mat) => { const mesh = new THREE.Mesh(window.AxonPerf.mergeGeometries(list), mat); mesh.castShadow = !COARSE; g.add(mesh); });
        };
        function dress(b) {
            const body = new THREE.Group(), cap = new THREE.Group(); b.g.add(body); b.hg.add(cap); b = { g: body, hg: cap };   // everything he wears, merged per material below
            const m = (par, geo, mat, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; o.rotation.z = rz; o.castShadow = !COARSE; par.add(o); return o; };
            const ZS = 0.8, A0 = Math.PI * 0.21, AL = Math.PI * 1.58;                     // flattened front to back · open over the chest
            const PROF = [[0.86, 0.2], [0.8, 0.6], [0.72, 1.2], [0.69, 1.75], [0.74, 2.2], [0.77, 2.5], [0.75, 2.66], [0.66, 2.77], [0.52, 2.83], [0.41, 2.86], [0.4, 2.9]];
            const fold = (a, y) => 1 + 0.07 * Math.max(0, 1 - y / 2.3) * Math.sin(a * 11);                                       // the cloth hangs in folds, deeper towards the hem
            const shell = (prof, off) => {                                                 // a lathe around the body, folded and flattened
                const geo = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] + off, q[1])), COARSE ? 30 : 44, A0, AL), p = geo.attributes.position;
                for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), f = fold(Math.atan2(x, z), p.getY(k)); p.setXYZ(k, x * f, p.getY(k), z * f * ZS); }
                geo.computeVertexNormals(); return geo;
            };
            const coat = shell(PROF, 0);
            m(b.g, coat, cloth, 0, 0, 0); m(b.g, coat, lining, 0, 0, 0);                  // the same shell, seen from outside and from inside
            m(b.g, shell([[0.86, 0.2], [0.848, 0.31]], 0.008), gold, 0, 0, 0);            // hem braid
            for (const a of [A0, A0 + AL]) {                                               // gold piping down both front edges
                const curve = new THREE.CatmullRomCurve3(PROF.map(([r, y]) => { const f = fold(a, y) * r; return new THREE.Vector3(Math.sin(a) * f, y, Math.cos(a) * f * ZS); }));
                m(b.g, new THREE.TubeGeometry(curve, 28, 0.02, 6), gold, 0, 0, 0);
            }
            [-1, 1].forEach(s => {                                                         // epaulettes, lying on the coat's shoulders
                const e = new THREE.Group(); e.position.set(s * 0.62, 2.795, -0.02); e.rotation.z = -s * 0.58; body.add(e);
                m(e, new THREE.BoxGeometry(0.3, 0.035, 0.24), gold, 0, 0, 0);
                m(e, new THREE.CylinderGeometry(0.12, 0.12, 0.036, 14), gold, s * 0.15, 0, 0);
                m(e, new THREE.BoxGeometry(0.2, 0.012, 0.07), red, -s * 0.02, 0.022, 0);
                for (let k = -2; k <= 2; k++) m(e, new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5), gold, s * (0.2 + 0.035 * Math.cos(k * 0.6)), -0.055, k * 0.05);   // fringe
            });
            const xE = Math.sin(A0) * 0.76, zE = Math.cos(A0) * 0.76 * ZS, chain = new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map(u => new THREE.Vector3(u * xE, 2.6 - 0.14 * (1 - u * u), zE + 0.1 * (1 - u * u))));
            m(b.g, new THREE.TubeGeometry(chain, 20, 0.016, 5), gold, 0, 0, 0);          // chain clasp across the chest
            [-1, 1].forEach(s => m(b.g, new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), gold, s * xE, 2.6, zE + 0.01, Math.PI / 2));
            [0, 1, 2].forEach(k => m(b.g, new THREE.BoxGeometry(0.075, 0.045, 0.02), k === 1 ? red : gold, 0.6 + k * 0.045, 2.32, 0.375 - k * 0.05).rotation.y = 0.85);   // ribbons on the breast
            m(b.g, new THREE.TorusGeometry(0.17, 0.018, 5, 6), gold, 0, 2.3, -0.625, 0, Math.PI / 6);                      // crest on the back
            m(b.g, new THREE.OctahedronGeometry(0.06, 0), red, 0, 2.3, -0.625);
            // peaked cap (head space: the head is ±0.32 wide and its top is at 0.48)
            m(b.hg, new THREE.CylinderGeometry(0.335, 0.325, 0.13, 24), red, 0, 0.36, -0.02);                               // band
            m(b.hg, new THREE.TorusGeometry(0.336, 0.016, 6, 28), gold, 0, 0.31, -0.02, Math.PI / 2);
            m(b.hg, new THREE.TorusGeometry(0.338, 0.012, 6, 28), gold, 0, 0.42, -0.02, Math.PI / 2);
            m(b.hg, new THREE.CylinderGeometry(0.41, 0.335, 0.13, 24), cloth, 0, 0.49, -0.02, 0.1);                          // crown, raised at the front
            m(b.hg, new THREE.CylinderGeometry(0.41, 0.41, 0.03, 24), cloth, 0, 0.568, -0.027, 0.1);
            m(b.hg, new THREE.CylinderGeometry(0.36, 0.36, 0.022, 20, 1, false, -0.85, 1.7), gloss, 0, 0.3, 0.1, 0.28);     // visor
            m(b.hg, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 6), gold, 0, 0.47, 0.375, Math.PI / 2 + 0.1);            // badge
            m(b.hg, new THREE.OctahedronGeometry(0.04, 0), red, 0, 0.47, 0.39);
            flatten(body); flatten(cap);
            // name plate over his head
            const cv = document.createElement('canvas'); cv.width = 320; cv.height = 64; const g = cv.getContext('2d');
            g.fillStyle = 'rgba(16,10,6,.8)'; g.fillRect(6, 10, 308, 44); g.strokeStyle = '#ffc24a'; g.lineWidth = 3; g.strokeRect(6, 10, 308, 44);
            g.fillStyle = '#ffc24a'; g.font = `700 28px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CDR. RHODES', 160, 34);
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); sp.scale.set(2.1, 0.42, 1); sp.position.y = 3.95; body.add(sp);
        }
        CAST.forEach(([id, name, type, pal, skin, hair, scale, pose, x, z, face], k) => {
            const b = bakeCrew(THREE, [name, type, pal, skin, hair, scale, pose], k + 9);
            if (id === 'chief') dress(b);
            b.g.rotation.y = face; put(b.g, x, Y, z);
            c.solids.push(new THREE.Box3(V(x - 0.45, Y, z - 0.45), V(x + 0.45, Y + 3.2 * scale, z + 0.45)));
            people.push({ id, name, g: b.g, hg: b.hg, baseQ: b.baseQ, yaw: 0, face, x, z, scale, ph: k * 1.3, said: false });
        });
        let talked = false; try { talked = localStorage.getItem('axon.chief') === '1'; } catch (e) { }
        const mark = put(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 4), glow(GOLD)), CHIEF.x, Y + 5.7, CHIEF.z); mark.rotation.x = Math.PI; mark.visible = !talked;

        // ---- the commander's briefing (subtitles; the game stands still while he speaks) ----
        const css = document.createElement('style');
        css.textContent = `
          #cn-box{position:absolute;z-index:12;left:50%;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 8px);transform:translate(-50%,14px);width:min(560px,48%);box-sizing:border-box;
            padding:11px 14px;background:linear-gradient(180deg,rgba(30,14,10,.94),rgba(10,8,14,.96));border:1px solid rgba(255,194,74,.7);border-inline-start:4px solid #ff3d4a;
            color:#f3eee2;font:500 14px/1.5 var(--font,system-ui);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}
          #cn-box.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
          #cn-box .h{display:flex;align-items:center;gap:8px;margin-bottom:4px}
          #cn-box .n{font-weight:800;font-size:12px;letter-spacing:.24em;color:#ffc24a}
          #cn-box .r{font-size:9px;letter-spacing:.2em;color:#ff8f98}
          #cn-box .k{margin-inline-start:auto;font-size:10px;color:#b9a98a;letter-spacing:.1em}
          #cn-box .t{min-height:3em;animation:cnIn .3s}
          @keyframes cnIn{from{opacity:0;transform:translateY(5px)}}
          #cn-box .b{display:flex;gap:8px;justify-content:flex-end;margin-top:7px}
          #cn-box button{font:700 11px/1 var(--font,system-ui);letter-spacing:.14em;padding:9px 13px;border:1px solid rgba(255,194,74,.7);background:rgba(255,194,74,.14);color:#ffc24a;cursor:pointer}
          #cn-box button.x{border-color:rgba(255,255,255,.35);background:transparent;color:#d8d2c6}
          #cn-box[dir=rtl] .n,#cn-box[dir=rtl] .r,#cn-box[dir=rtl] button{letter-spacing:0}
          #stage.is-portrait #cn-box{width:92%;bottom:46%}
          #stage.short #cn-box{font-size:12.5px;padding:8px 12px}
          #stage.cn-on #kd-box,#stage.cn-on #kd-go,#stage.cn-on #hub-say,#stage.cn-on #hub-act,#stage.cn-on #slots{display:none!important}
          #stage:not(.in-hub) #cn-box,#stage.in-menu #cn-box{display:none!important}
          @media (prefers-reduced-motion:reduce){#cn-box .t{animation:none}}`;
        document.head.appendChild(css);
        const box = el('cn-box');
        let isOpen = false, idx = 0, openedAt = 0, savedR = 0;
        function render() {
            const lines = tr('brief'), last = idx >= lines.length - 1;
            box.dir = lang() === 'ar' ? 'rtl' : 'ltr';
            box.innerHTML = `<div class="h"><span class="n">${tr('cname')}</span><span class="r">${tr('crole')}</span><span class="k">${idx + 1} / ${lines.length}</span></div>
                <div class="t">${lines[idx]}</div><div class="b"><button type="button" class="x" data-c="x">${tr('close')}</button><button type="button" data-c="n">${last ? tr('done') + ' ✓' : tr('next') + ' ▸'}</button></div>`;
            try { AudioSys.playComm(); } catch (e) { }
        }
        function open() {
            if (isOpen || c.getState() !== 'hub') return;
            isOpen = true; idx = 0; openedAt = performance.now();
            const P = c.player, cs = c.cameraSystem;
            P.velocity.set(0, 0, 0); P.mesh.rotation.y = Math.atan2(O.x + CHIEF.x - P.mesh.position.x, O.z + CHIEF.z - P.mesh.position.z);
            if (cs) { savedR = cs.targetRadius; cs.targetRadius = Math.min(savedR, 6); }
            c.setState('hubmenu'); stage.classList.add('cn-on'); render(); box.classList.add('show');
        }
        function close(done) {
            if (!isOpen) return; isOpen = false; box.classList.remove('show'); stage.classList.remove('cn-on');
            if (c.cameraSystem && savedR) c.cameraSystem.targetRadius = savedR;
            if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input.flush(); }
            if (done) {
                talked = true; mark.visible = false; try { localStorage.setItem('axon.chief', '1'); } catch (e) { }
                try { AudioSys.playChargeFull(); } catch (e) { }
                speak(`<b>${tr('cname')}</b>${tr('after')}`);
            } else { try { AudioSys.playUi('close'); } catch (e) { } }
        }
        function next() { if (idx >= tr('brief').length - 1) { close(true); return; } idx++; render(); }
        box.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b && b.dataset.c === 'x') close(false); else next(); });
        ['pointerdown', 'touchstart'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
        window.addEventListener('keydown', e => {
            if (!isOpen) return;
            if (performance.now() - openedAt < 250) { e.stopImmediatePropagation(); return; }          // the key press that opened it
            if (e.code === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(false); }
            else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) next(); }
        }, true);

        // ---- per frame (while the HQ is shown) ----
        const qY = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
        let t = 0;
        function update(dt, time, lx, lz, gd) {
            t += dt;
            if (gd && gd.P) { const p = gd.P.mesh.position; p.y = O.y + heightAt(p.x - O.x, p.z - O.z); }   // KENDEL climbs the stairs too
            const d2 = (lx - RX) ** 2 + (lz - RZ) ** 2;
            grp.visible = d2 < 38 * 38; if (!grp.visible) return;                      // from the stairs inwards (seven people: not drawn from the other wings)
            if (d2 > 45 * 45) people.forEach(m => { m.said = false; });
            tower.rotation.y += dt * 0.5; boss.rotation.y -= dt * 2; boss.scale.setScalar(1 + Math.sin(t * 6) * 0.25);
            cone.material.opacity = 0.06 + Math.sin(t * 2.4) * 0.02;
            const k = (t * 0.7) % 1; ping.scale.setScalar(1 + k * 2.2); ping.material.opacity = 0.8 * (1 - k);
            sweep.position.x = O.x - 44 + Math.sin(t * 0.6) * 5.6;
            mark.position.y = O.y + Y + 5.7 + Math.sin(t * 3) * 0.15; mark.rotation.y += dt * 2.5;
            const hubOn = c.getState() === 'hub';
            for (const m of people) {
                const dx = lx - m.x, dz = lz - m.z, q2 = dx * dx + dz * dz;
                m.g.scale.y = m.scale * (1 + Math.sin(time * 1.9 + m.ph) * 0.005);
                let want = 0;
                if (q2 < 110) { let a = Math.atan2(dx, dz) - m.face; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.9) want = Math.max(-1, Math.min(1, a)); }
                m.yaw += (want - m.yaw) * Math.min(1, dt * 4);
                m.hg.quaternion.copy(qY.setFromAxisAngle(UP, m.yaw)).multiply(m.baseQ);
                if (m.id === 'chief' || m.said || !hubOn || q2 > 9) continue;
                if (m.id === 'guard') { people.forEach(o => { if (o.id === 'guard') o.said = true; }); const gl = tr('guard'); try { AudioSys.playComm(); } catch (e) { } speak(`<b>${gl[0]}</b>${gl[1]}`); }
                else { m.said = true; try { AudioSys.playComm(); } catch (e) { } speak(`<b>${m.name}</b>${tr('say')[m.id]}`); }
            }
        }
        return { update, open, close: () => close(false), isOpen: () => isOpen, relang() { paintWall(); if (isOpen) render(); } };
    }

    return { TEXT, hubText, ZONE, HALL, BAY_GAP, SPOT, ICON, heightAt, decor, build };
})();
