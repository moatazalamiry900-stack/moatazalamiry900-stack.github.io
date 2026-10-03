// =====================================================================
//  AXON BREACH — Command HQ (the hub the game starts in)
//   • A walkable base of four wings joined by corridors and sliding blast gates:
//       HANGAR BAY (arrival, south) → COMMAND DECK (mission screen, centre)
//       OPERATIONS (west: operator desks, tactical table)   ARMORY WING (east: pods, armor studio)
//   • Gates slide open as you approach; a sign above each one names the wing behind it.
//   • Six operatives built from the same hero rig, baked into a few static meshes each;
//     only their heads move (they look at you).
//   • Walk up to the screen → mission select: 12 missions, only unlocked ones deploy.
//   • Minimap shows every wing, corridor, gate (open / shut) and point of interest.
//  Loaded by index.html after level.js, before game.js.
// =====================================================================
'use strict';

window.AxonHub = (function () {
    // ---------- text (5 languages; mission code names stay in English like AXON BREACH) ----------
    const L = {
        en: {
            hq: 'COMMAND HQ', obj: 'Head to the mission terminal', open: 'Open missions', armory: 'Armory', missions: 'Mission select',
            current: 'CURRENT', soon: 'COMING SOON', soonS: 'SOON', locked: 'LOCKED', cleared: 'CLEARED', deploy: 'Deploy', threat: 'Threat', prog: 'Progress', sector: 'Sector',
            deploying: 'Deploying…', close: 'Close', classified: 'Data classified — mission in preparation.',
            m1: 'Infiltrate a nine-floor facility, survive the lockdown arenas and defeat the guardian SENTINEL-Ω at the top.',
            names: ['The Ascending Facility', 'Neon Undercity', 'Frozen Vault', 'Skyrail Assault', 'Forge Core', 'Tidal Array', 'Silent Orbit', 'Crimson Grid', 'Dune Relay', 'Storm Spire', 'Null Cathedral', 'Omega Throne'],
            style: 'Armor studio', skinN: {}, styleSub: 'Tap a colour to try it on — buy it to keep it', equip: 'Equip', equipped: 'Equipped', buy: 'Buy', need: 'Need', tiers: ['STANDARD', 'RARE', 'EPIC', 'LEGENDARY'], owned: 'OWNED', say: ["Terminal's live. Mission one is waiting.", 'I tuned your core. Spend the energy wisely.', 'They say the guardian at the top shows no mercy.', "Come back in one piece. That's an order.", "Armory's open if you need gear.", 'Welcome back to HQ.'],
            map_term: 'TERMINAL', map_arm: 'ARMORY', map_sty: 'STUDIO',
            z_cmd: 'COMMAND DECK', z_ops: 'OPERATIONS', z_arm: 'ARMORY WING', z_bay: 'HANGAR BAY', exit: 'Exit base', map_exit: 'EXIT', exitSign: 'EXIT // OUTER ZONE', explore: 'Exploration', map_exp: 'RIFT', forge: 'Weapon forge', map_forge: 'FORGE', look: 'Bio-lab', map_look: 'BIO-LAB'
        },
        ar: {
            hq: 'مقر القيادة', obj: 'توجّه إلى شاشة المهام', open: 'افتح المهام', armory: 'المستودع', missions: 'اختيار المهمة',
            current: 'الحالية', soon: 'قريباً', soonS: 'قريباً', locked: 'مغلقة', cleared: 'مكتملة', deploy: 'انطلق', threat: 'الخطورة', prog: 'التقدم', sector: 'القطاع',
            deploying: 'جارٍ الإنزال…', close: 'إغلاق', classified: 'البيانات سرّية — المهمة قيد التجهيز.',
            m1: 'تسلّل إلى منشأة من تسعة طوابق، اصمد في ساحات الإغلاق واهزم الحارس SENTINEL-Ω في القمة.',
            names: ['المنشأة الصاعدة', 'المدينة السفلى', 'القبو الجليدي', 'هجوم القطار المعلّق', 'قلب المصهر', 'محطة المدّ', 'المدار الصامت', 'الشبكة القرمزية', 'محطة الكثبان', 'برج العاصفة', 'كاتدرائية العدم', 'عرش أوميغا'],
            style: 'استوديو الألوان', skinN: { EMBER: 'جمرة', ARCTIC: 'قطبي', JADE: 'يشم', COBALT: 'كوبالت', CRIMSON: 'قرمزي', ROSE: 'وردي', VOLT: 'فولت', ONYX: 'عقيق أسود', AURORA: 'شفق', OMEGA: 'أوميغا' }, styleSub: 'اضغط على لون لتجربته مباشرة — اشترِه ليصبح لك', equip: 'تفعيل', equipped: 'مفعّل', buy: 'شراء', need: 'ينقصك', tiers: ['عادي', 'نادر', 'ملحمي', 'أسطوري'], owned: 'مملوك', say: ['الشاشة جاهزة، المهمة الأولى بانتظارك.', 'ضبطت نواتك، استخدم الطاقة بحكمة.', 'يقولون إن الحارس في القمة لا يرحم.', 'ارجع سالماً، هذا أمر.', 'المستودع مفتوح إن احتجت عتاداً.', 'أهلاً بعودتك إلى المقر.'],
            map_term: 'المنصة', map_arm: 'المستودع', map_sty: 'الاستوديو',
            z_cmd: 'منصة القيادة', z_ops: 'غرفة العمليات', z_arm: 'جناح التسليح', z_bay: 'حظيرة الإنزال', exit: 'اخرج من المقر', map_exit: 'المخرج', exitSign: 'المخرج // المنطقة الخارجية', explore: 'استكشاف', map_exp: 'البوابة', forge: 'ورشة الأسلحة', map_forge: 'الورشة', look: 'المختبر الحيوي', map_look: 'المختبر'
        },
        es: {
            hq: 'CUARTEL GENERAL', obj: 'Ve a la terminal de misiones', open: 'Abrir misiones', armory: 'Armería', missions: 'Selección de misión',
            current: 'ACTUAL', soon: 'PRÓXIMAMENTE', soonS: 'PRONTO', locked: 'BLOQUEADA', cleared: 'COMPLETADA', deploy: 'Desplegar', threat: 'Amenaza', prog: 'Progreso', sector: 'Sector',
            deploying: 'Desplegando…', close: 'Cerrar', classified: 'Datos clasificados: misión en preparación.',
            m1: 'Infíltrate en una instalación de nueve pisos, sobrevive a las arenas bloqueadas y derrota al guardián SENTINEL-Ω en la cima.',
            names: ['La instalación ascendente', 'Ciudad subterránea', 'Bóveda helada', 'Asalto al monorraíl', 'Núcleo de la forja', 'Estación mareomotriz', 'Órbita silenciosa', 'Red carmesí', 'Repetidor de las dunas', 'Aguja de la tormenta', 'Catedral del vacío', 'Trono Omega'],
            style: 'Estudio de armadura', skinN: { EMBER: 'Brasa', ARCTIC: 'Ártico', JADE: 'Jade', COBALT: 'Cobalto', CRIMSON: 'Carmesí', ROSE: 'Rosa', VOLT: 'Voltio', ONYX: 'Ónice', AURORA: 'Aurora', OMEGA: 'Omega' }, styleSub: 'Toca un color para probarlo; cómpralo para quedártelo', equip: 'Equipar', equipped: 'Equipado', buy: 'Comprar', need: 'Faltan', tiers: ['ESTÁNDAR', 'RARO', 'ÉPICO', 'LEGENDARIO'], owned: 'TUYO', say: ['La terminal está lista. Te espera la misión uno.', 'Ajusté tu núcleo. Usa la energía con cabeza.', 'Dicen que el guardián de la cima no tiene piedad.', 'Vuelve de una pieza. Es una orden.', 'La armería está abierta si necesitas equipo.', 'Bienvenido de vuelta al cuartel.'],
            map_term: 'TERMINAL', map_arm: 'ARMERÍA', map_sty: 'ESTUDIO',
            z_cmd: 'PUENTE DE MANDO', z_ops: 'OPERACIONES', z_arm: 'ALA DE ARMERÍA', z_bay: 'HANGAR', exit: 'Salir de la base', map_exit: 'SALIDA', exitSign: 'SALIDA // ZONA EXTERIOR', explore: 'Exploración', map_exp: 'GRIETA', forge: 'Forja de armas', map_forge: 'FORJA', look: 'Biolaboratorio', map_look: 'BIOLAB'
        },
        zh: {
            hq: '指挥总部', obj: '前往任务终端', open: '打开任务', armory: '军械库', missions: '任务选择',
            current: '当前', soon: '即将推出', soonS: '即将推出', locked: '未解锁', cleared: '已完成', deploy: '出击', threat: '威胁', prog: '进度', sector: '区域',
            deploying: '部署中…', close: '关闭', classified: '资料保密——任务筹备中。',
            m1: '潜入九层设施，在封锁竞技场中生存，在顶层击败守卫 SENTINEL-Ω。',
            names: ['攀升设施', '霓虹地下城', '冰封宝库', '空轨突袭', '熔炉核心', '潮汐阵列', '寂静轨道', '赤红网格', '沙丘中继站', '风暴尖塔', '虚无大教堂', '欧米伽王座'],
            style: '装甲涂装工坊', skinN: { EMBER: '余烬', ARCTIC: '极地', JADE: '翡翠', COBALT: '钴蓝', CRIMSON: '绯红', ROSE: '玫瑰', VOLT: '伏特', ONYX: '黑玛瑙', AURORA: '极光', OMEGA: '欧米伽' }, styleSub: '点击颜色即可试穿，购买后永久拥有', equip: '装备', equipped: '已装备', buy: '购买', need: '还差', tiers: ['普通', '稀有', '史诗', '传说'], owned: '已拥有', say: ['终端已就绪，第一个任务在等你。', '我调校了你的核心，省着点用能量。', '听说顶层的守卫毫不留情。', '活着回来，这是命令。', '需要装备的话，军械库开着。', '欢迎回到总部。'],
            map_term: '终端', map_arm: '军械库', map_sty: '涂装室',
            z_cmd: '指挥甲板', z_ops: '作战室', z_arm: '军械翼', z_bay: '机库', exit: '离开基地', map_exit: '出口', exitSign: '出口 // 外围区域', explore: '探索', map_exp: '裂隙', forge: '武器工坊', map_forge: '工坊', look: '生物实验室', map_look: '实验室'
        },
        ja: {
            hq: '司令部', obj: 'ミッション端末へ向かえ', open: 'ミッションを開く', armory: '武器庫', missions: 'ミッション選択',
            current: '現在', soon: '近日公開', soonS: '近日公開', locked: 'ロック中', cleared: 'クリア', deploy: '出撃', threat: '脅威', prog: '進行度', sector: 'セクター',
            deploying: '出撃中…', close: '閉じる', classified: '機密データ — ミッション準備中。',
            m1: '9層の施設に潜入し、封鎖アリーナを生き抜き、頂上のガーディアンSENTINEL-Ωを倒せ。',
            names: ['上昇する施設', 'ネオン地下都市', '氷結の保管庫', '空中鉄道強襲', '溶鉱炉コア', '潮汐アレイ', '沈黙の軌道', '深紅のグリッド', '砂丘中継基地', '嵐の尖塔', '虚無の大聖堂', 'オメガの玉座'],
            style: 'アーマースタジオ', skinN: { EMBER: 'エンバー', ARCTIC: 'アークティック', JADE: 'ジェイド', COBALT: 'コバルト', CRIMSON: 'クリムゾン', ROSE: 'ローズ', VOLT: 'ボルト', ONYX: 'オニキス', AURORA: 'オーロラ', OMEGA: 'オメガ' }, styleSub: '色をタップして試着 — 購入すると自分のものに', equip: '装備', equipped: '装備中', buy: '購入', need: '不足', tiers: ['スタンダード', 'レア', 'エピック', 'レジェンド'], owned: '所持', say: ['端末は起動済み。最初の任務が待ってる。', 'コアを調整した。エネルギーは大事に使え。', '頂上のガーディアンは容赦ないらしい。', '無事に戻れ。命令だ。', '装備が要るなら武器庫は開いてる。', '司令部へおかえり。'],
            map_term: '端末', map_arm: '武器庫', map_sty: 'スタジオ',
            z_cmd: '指令デッキ', z_ops: '作戦室', z_arm: '武器庫ウィング', z_bay: '格納庫', exit: '基地を出る', map_exit: '出口', exitSign: '出口 // 外縁区域', explore: '探索', map_exp: '裂け目', forge: 'ウェポンフォージ', map_forge: '工房', look: 'バイオラボ', map_look: 'ラボ'
        }
    };
    const S = k => { const d = L[window.AxonI18n ? window.AxonI18n.lang : 'en'] || L.en; return d[k] !== undefined ? d[k] : L.en[k]; };

    // ---------- the 12 missions (only ready ones can deploy) ----------
    const ICONS = {
        climb: '<path d="M3 20h5v-4h4v-4h4V8h5"/><path d="M15 4h6v6"/>',
        city: '<path d="M3 21V11h4v10M7 21V6h5v15M12 21V9h4v12M16 21v-7h5v7"/><path d="M2 21h20"/>',
        ice: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><path d="M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>',
        rail: '<path d="M2 8h20M2 16h20"/><path d="M5 8v8M10 8v8M15 8v8M20 8v8"/>',
        flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z"/>',
        wave: '<path d="M2 9c3-3 5 3 8 0s5-3 8 0 3 1 4 0M2 15c3-3 5 3 8 0s5-3 8 0 3 1 4 0"/>',
        orbit: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/>',
        grid: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
        dune: '<circle cx="16" cy="7" r="3"/><path d="M2 19c4-6 8-6 11-2 2-3 5-4 9-1"/>',
        bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
        arch: '<path d="M4 22V10a8 8 0 0 1 16 0v12"/><path d="M8 22V11a4 4 0 0 1 8 0v11M12 2v3"/>',
        crown: '<path d="M3 18l2-11 5 5 2-7 2 7 5-5 2 11z"/><path d="M3 21h18"/>'
    };
    const MISSIONS = [
        ['AXON BREACH', '07', '#ffa826', 'climb', 3, true],
        ['NEON UNDERCITY', '11', '#ff2a6d', 'city', 2], ['CRYO VAULT', '14', '#7ff3ff', 'ice', 3],
        ['SKYRAIL ASSAULT', '19', '#57e2ff', 'rail', 3], ['FORGE CORE', '22', '#ff7a2a', 'flame', 3],
        ['TIDAL ARRAY', '26', '#39d7ff', 'wave', 4], ['SILENT ORBIT', '31', '#b48cff', 'orbit', 4],
        ['CRIMSON GRID', '35', '#ff3a5a', 'grid', 4], ['DUNE RELAY', '40', '#ffc24a', 'dune', 4],
        ['STORM SPIRE', '44', '#8fb8ff', 'bolt', 5], ['NULL CATHEDRAL', '49', '#c9a7ff', 'arch', 5],
        ['OMEGA THRONE', '52', '#ffe066', 'crown', 5]
    ].map(([code, sector, color, icon, threat, ready], i) => ({ i, code, sector, color, icon, threat, ready: !!ready }));
    const num = i => String(i + 1).padStart(2, '0');

    // ---------- base layout (local coordinates; -z = north) ----------
    //   rooms: centre, half sizes, openings per wall ([centre, width]), wall trim colour, mood light
    const ZONES = [
        { id: 'cmd', key: 'z_cmd', x: 0, z: 0, hw: 22, hd: 20, col: 0x39d7ff, trim: 0xff2a6d, light: 0x39d7ff, gaps: { s: [[0, 8]], w: [[0, 8]], e: [[0, 8]] } },
        { id: 'bay', key: 'z_bay', x: 0, z: 46, hw: 14, hd: 12, col: 0xffa826, trim: 0xffa826, light: 0xffc27a, gaps: { n: [[0, 8]], s: [[0, 14]] } },
        { id: 'ops', key: 'z_ops', x: -50, z: 0, hw: 14, hd: 14, col: 0x8f6bff, trim: 0x8f6bff, light: 0xa58bff, gaps: { e: [[0, 8]] } },
        { id: 'arm', key: 'z_arm', x: 50, z: 0, hw: 14, hd: 14, col: 0x5cf0a0, trim: 0x5cf0a0, light: 0x7ff3ff, gaps: { w: [[0, 8]] } }
    ];
    //   corridors (centre, length along its axis) and the gate in each one: label seen from the -side / +side
    const HALLS = [
        { x: 0, z: 27, len: 14, alongZ: true, neg: 'z_bay', pos: 'z_cmd', negCol: 0xffa826, posCol: 0x39d7ff },
        { x: -29, z: 0, len: 14, alongZ: false, neg: 'z_cmd', pos: 'z_ops', negCol: 0x39d7ff, posCol: 0x8f6bff },
        { x: 29, z: 0, len: 14, alongZ: false, neg: 'z_arm', pos: 'z_cmd', negCol: 0x5cf0a0, posCol: 0x39d7ff }
    ];
    const hexCss = n => '#' + n.toString(16).padStart(6, '0');

    // ---------- operatives: other colours / builds / skin tones of the hero rig ----------
    const PALETTES = {
        VOLT: { armor: 0xdfe3ea, under: 0x2a2438, trim: 0x6c4cff, glow: 0xb8ff3a, accent: 0x8f6bff, eye: 0x6a3cf0 },
        COBALT: { armor: 0x2d5bd6, under: 0x151a2a, trim: 0xe8e8f0, glow: 0x5ad1ff, accent: 0xf2f4f8, eye: 0x1e6fd9 },
        CRIMSON: { armor: 0xb3263a, under: 0x1c1820, trim: 0xd8d2c8, glow: 0xff5a5a, accent: 0xffd166, eye: 0xc0392b },
        ROSE: { armor: 0xe7a3c1, under: 0x2b2230, trim: 0xf6f2ee, glow: 0xff7ac8, accent: 0x7a4cff, eye: 0xd0439a },
        ONYX: { armor: 0x1f2229, under: 0x121318, trim: 0xc9a24a, glow: 0xffc24a, accent: 0xff3d5e, eye: 0xd99a12 },
        JADE: { armor: 0x2f8a6c, under: 0x1c2426, trim: 0xd9c38e, glow: 0xfff1b8, accent: 0xf2ece0, eye: 0x2c7d5f },
        ARCTIC: { armor: 0xf2f6fa, under: 0x2b3a4a, trim: 0x7fd6ff, glow: 0x7ff3ff, accent: 0x0fb5a6, eye: 0x2e9fd6 }
    };
    // name, build, palette, skin, hair, scale, pose, x, z, facing (radians, 0 = +z)
    const CREW = [
        ['VEGA', 'a', 'VOLT', 0xf1c9a8, 0x2b2b35, 0.97, 'console', -60.4, -7, -Math.PI / 2],        // OPERATIONS desks
        ['ORION', 'm', 'COBALT', 0x9c6644, 0x1c1411, 1.04, 'console', -60.4, 0, -Math.PI / 2],
        ['NOVA', 'm', 'CRIMSON', 0xc68a62, 0x8a5a2b, 1.02, 'talk', 8.2, 5.2, -2.2],                   // COMMAND DECK
        ['RAVEN', 'a', 'ROSE', 0xf4bf98, 0xa33a2a, 0.96, 'pad', 10.2, 3.4, 0.95],
        ['ATLAS', 'm', 'ONYX', 0x7a4b30, 0x14100e, 1.06, 'crossed', 38.6, -6.2, -Math.PI / 2 - 0.25], // ARMORY WING entrance
        ['KITE', 'a', 'JADE', 0xdca37c, 0xd9b36c, 0.98, 'guard', -6.5, 37.5, 0.35]                    // HANGAR BAY
    ];
    const POSES = {
        console: P => { P.armL.rotation.x = -0.62; P.armR.rotation.x = -0.66; P.elbowL.rotation.x = -1.05; P.elbowR.rotation.x = -0.95; P.headGroup.rotation.x += 0.3; },
        talk: P => { P.armR.rotation.x = -0.55; P.armR.rotation.y = -0.45; P.armR.rotation.z = 0; P.elbowR.rotation.x = -1.35; P.armL.rotation.x = 0.08; },
        pad: P => { P.armL.rotation.x = -0.4; P.armL.rotation.y = 0.55; P.armL.rotation.z = 0; P.elbowL.rotation.x = -1.7; P.headGroup.rotation.x += 0.22; },
        crossed: P => { P.armL.rotation.x = -0.45; P.armR.rotation.x = -0.45; P.armL.rotation.y = 0.9; P.armR.rotation.y = -0.9; P.armL.rotation.z = 0; P.armR.rotation.z = 0; P.elbowL.rotation.x = -1.9; P.elbowR.rotation.x = -1.9; },
        guard: P => { P.armL.rotation.x = 0.05; P.armR.rotation.x = 0.05; },
        commander: P => { POSES.crossed(P); if (P.backSaber) P.backSaber.visible = false; }   // arms crossed, no saber: his greatcoat hangs over the back (council.js)
    };

    // ---------- TRAINING WING (training.js): its text, room, corridor, doorway in the hangar bay and instructor join the tables above ----------
    const TRN = window.AxonTraining || null;
    if (TRN) {
        Object.keys(L).forEach(l => { const t = TRN.TEXT[l] || TRN.TEXT.en; Object.assign(L[l], t); L[l].say = L[l].say.concat([t.sayLine]); });
        ZONES.push(TRN.ZONE); HALLS.push(TRN.HALL); ZONES[1].gaps.e = [TRN.BAY_GAP]; CREW.push(TRN.INSTRUCTOR);
    }
    // ---------- WAR ROOM on the second floor (council.js): its text, room, staircase and the doorway in the hangar bay ----------
    const CNL = window.AxonCouncil || null;
    if (CNL) {
        Object.keys(L).forEach(l => Object.assign(L[l], CNL.hubText(l)));
        ZONES.push(CNL.ZONE); HALLS.push(CNL.HALL); ZONES[1].gaps.w = [CNL.BAY_GAP];
    }
    const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    // ---------- merge with mirrored parts kept front-facing ----------
    function merge(THREE, list) {
        let vc = 0, ic = 0; const uvOK = list.every(p => p.geo.attributes.uv);
        for (const p of list) { vc += p.geo.attributes.position.count; ic += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count; }
        const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = uvOK ? new Float32Array(vc * 2) : null;
        const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic), v = new THREE.Vector3(), nm = new THREE.Matrix3();
        let vo = 0, io = 0;
        for (const { geo, matrix } of list) {
            const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, flip = matrix.determinant() < 0;
            nm.getNormalMatrix(matrix);
            for (let i = 0; i < P.count; i++) {
                v.fromBufferAttribute(P, i).applyMatrix4(matrix); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
                if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z; }
                if (uv) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
            }
            const n = geo.index ? geo.index.count : P.count, I = geo.index ? geo.index.array : null;
            for (let k = 0; k < n; k += 3) {
                const a = I ? I[k] : k, b = I ? I[k + 1] : k + 1, c = I ? I[k + 2] : k + 2;
                idx[io++] = a + vo; idx[io++] = (flip ? c : b) + vo; idx[io++] = (flip ? b : c) + vo;
            }
            vo += P.count;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
        return g;
    }

    // ---------- bake one operative from the hero rig: body = one mesh per material, head = its own group ----------
    function bakeCrew(THREE, [name, type, pal, skin, hair, scale, pose], k = 0) {
        const H = window.AxonHero;
        const P = { mesh: new THREE.Group(), velocity: new THREE.Vector3(), isGrounded: true, isDashing: false, localF: 0, localS: 0, slashTimer: 0, hurtTimer: 0,
            charge: 0, aimTimer: 0, recoilTimer: 0, invincibleTimer: 0, dead: false, flipT: 0, rollT: 0, wallJumpT: 0, wallSlide: 0, skidT: 0, jumpCount: 0,
            lockedEnemy: null, lookTarget: null, headYaw: 0, headPitch: 0, aimPitch: 0, slashSide: 1, slashKind: 'h1', slashDur: 0.28 };
        H.build(P, type, 0.3);   // crew are seen from a few metres: a third of the hero's segments is plenty
        const p = PALETTES[pal], M = P.mats;
        M.pearl.color.setHex(p.armor); M.steel.color.setHex(p.under); M.trim.color.setHex(p.trim);
        M.glow.color.setHex(p.glow); M.glow.emissive.setHex(p.glow); M.accent.color.setHex(p.accent); M.accent.emissive.setHex(p.accent);
        M.iris.color.setHex(p.eye); M.skin.color.set(skin).convertSRGBToLinear(); M.skin.emissive.set(skin).multiplyScalar(0.55).convertSRGBToLinear(); M.hair.color.set(hair).convertSRGBToLinear();
        for (let i = 0; i < 45; i++) H.animate(P, 1 / 30, i / 30 + k, false);   // settle into the idle stance
        POSES[pose](P);
        P.mesh.updateMatrixWorld(true);
        const head = P.headGroup, inHead = new Set(); head.traverse(o => inHead.add(o));
        const hInv = new THREE.Matrix4().copy(head.matrixWorld).invert(), body = new Map(), hd = new Map();
        P.mesh.traverseVisible(o => {
            if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material === P.flameMat || o.material.blending === THREE.AdditiveBlending) return;
            const inH = inHead.has(o), m = inH ? new THREE.Matrix4().multiplyMatrices(hInv, o.matrixWorld) : o.matrixWorld.clone(), map = inH ? hd : body;
            if (!map.has(o.material)) map.set(o.material, []); map.get(o.material).push({ geo: o.geometry, matrix: m });
        });
        const g = new THREE.Group(), hg = new THREE.Group();
        const bake = (map, to) => map.forEach((list, mat) => { const mesh = new THREE.Mesh(merge(THREE, list), mat); mesh.castShadow = !COARSE; to.add(mesh); });   // phones: no crew shadows (each one is drawn a second time)
        bake(body, g); bake(hd, hg);
        head.matrixWorld.decompose(hg.position, hg.quaternion, hg.scale); g.add(hg);
        g.scale.setScalar(scale);
        return { g, hg, baseQ: hg.quaternion.clone() };
    }

    function canvasTex(THREE, w, h, draw) {
        const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
    }
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    // ======================================================================
    function create(c) {
        const { THREE, scene, player, cameraSystem, stage, AudioSys } = c;
        const O = new THREE.Vector3(0, 0, 400);
        const n0 = c.solids.length; let hubSolids = [], lvlStash = null;   // collision boxes: HQ ones vs the mission's                          // far from the facility: its enemies sleep
        const root = new THREE.Group(); root.visible = false; scene.add(root);
        const batcher = new c.PERF.WorldBatcher({ add: o => root.add(o) });
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const block = (kind, x, y, z, w, h, d, edge) => {
            c.solids.push(new THREE.Box3(V(x - w / 2, y - h / 2, z - d / 2), V(x + w / 2, y + h / 2, z + d / 2)));
            const fl = kind === 'floor', rx = fl ? w / 6 : Math.max(w, d) / 8, ry = fl ? d / 6 : h / 8;
            batcher.addBlock(kind, O.x + x, O.y + y, O.z + z, w, h, d, Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)), edge || (kind === 'door' ? 0xff2a6d : fl ? 0x57e2ff : 0x2a7dff));
        };
        const strip = (color, x, y, z, w, h, d) => batcher.addStrip(color, O.x + x, O.y + y, O.z + z, w, h, d);
        const add = (o, x, y, z) => { o.position.set(O.x + x, O.y + y, O.z + z); root.add(o); return o; };
        const glow = (color, op = 1, side) => new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: op >= 1, side: side || THREE.FrontSide });
        const frame = (x, y, z, w, h, col, ax) => {                    // glowing bezel around a wall panel
            const t = 0.12;
            if (ax === 'z') { strip(col, x, y + h / 2, z, w + t, t, 0.06); strip(col, x, y - h / 2, z, w + t, t, 0.06); strip(col, x - w / 2, y, z, t, h, 0.06); strip(col, x + w / 2, y, z, t, h, 0.06); }
            else { strip(col, x, y + h / 2, z, 0.06, t, w + t); strip(col, x, y - h / 2, z, 0.06, t, w + t); strip(col, x, y, z - w / 2, 0.06, h, t); strip(col, x, y, z + w / 2, 0.06, h, t); }
        };

        // ---------- rooms: floor + four walls cut open where a corridor or door meets them ----------
        const side = (fixed, a0, a1, alongX, gaps, inward, h, trim) => {
            const cuts = (gaps || []).map(([cc, w]) => [cc - w / 2, cc + w / 2]).sort((p, q) => p[0] - q[0]);
            let a = a0;
            for (const [g0, g1] of cuts.concat([[a1, a1]])) {
                if (g0 - a > 0.05) {
                    const len = g0 - a, mid = (a + g0) / 2, sIn = fixed + inward * 0.56;
                    if (alongX) { block('wall', mid, h / 2, fixed, len, h, 1); strip(0x39d7ff, mid, 0.32, sIn, len, 0.1, 0.1); strip(trim, mid, h - 2.4, sIn, len, 0.07, 0.1); }
                    else { block('wall', fixed, h / 2, mid, 1, h, len); strip(0x39d7ff, sIn, 0.32, mid, 0.1, 0.1, len); strip(trim, sIn, h - 2.4, mid, 0.1, 0.07, len); }
                }
                a = Math.max(a, g1);
            }
        };
        function room(r) {
            const { x, z, hw, hd, gaps, trim } = r, h = 12;
            block('floor', x, -0.5, z, hw * 2, 1, hd * 2);
            side(z - hd - 0.5, x - hw - 1, x + hw + 1, true, gaps.n, 1, h, trim);
            side(z + hd + 0.5, x - hw - 1, x + hw + 1, true, gaps.s, -1, h, trim);
            side(x - hw - 0.5, z - hd, z + hd, false, gaps.w, 1, h, trim);
            side(x + hw + 0.5, z - hd, z + hd, false, gaps.e, -1, h, trim);
            for (let k = z - hd + 4; k < z + hd; k += 8) strip(0x1a4a6e, x, h - 0.3, k, hw * 2, 0.35, 0.5);   // ceiling beams
        }
        // ---------- corridors: floor, two walls, guide lights, and a lintel over the gate ----------
        function hall(hl) {
            const { x, z, len } = hl, H = 10, wl = len - 2;
            if (hl.alongZ) {
                block('floor', x, -0.5, z, 10, 1, len);
                [-1, 1].forEach(s => {
                    block('wall', x + s * 4.5, H / 2, z, 1, H, wl);
                    strip(0x39d7ff, x + s * 3.94, 0.32, z, 0.1, 0.1, wl); strip(0x1d6fb8, x + s * 3.94, 6, z, 0.06, 0.08, wl);
                    strip(0x39d7ff, x + s * 3.3, 0.03, z, 0.08, 0.04, len);
                });
                block('wall', x, 8.5, z, 8, 3, 1.2);
                strip(0xbff4ff, x, H - 0.15, z, 1.6, 0.06, wl);
            } else {
                block('floor', x, -0.5, z, len, 1, 10);
                [-1, 1].forEach(s => {
                    block('wall', x, H / 2, z + s * 4.5, wl, H, 1);
                    strip(0x39d7ff, x, 0.32, z + s * 3.94, wl, 0.1, 0.1); strip(0x1d6fb8, x, 6, z + s * 3.94, wl, 0.08, 0.06);
                    strip(0x39d7ff, x, 0.03, z + s * 3.3, len, 0.04, 0.08);
                });
                block('wall', x, 8.5, z, 1.2, 3, 8);
                strip(0xbff4ff, x, H - 0.15, z, wl, 0.06, 1.6);
            }
        }
        ZONES.forEach(r => r.custom || room(r));
        HALLS.forEach(hl => hl.custom || hall(hl));

        // ---------- COMMAND DECK (centre) ----------
        const HW = 22, HD = 20;
        block('wall', 0, 0.55, -16.9, 10, 1.1, 1.4); strip(0xffa826, 0, 1.12, -16.18, 10, 0.06, 0.06);            // mission console
        [-1, 1].forEach(s => { block('wall', s * 17, 0.55, -12, 1.4, 1.1, 5); strip(0x39d7ff, s * 16.26, 1.12, -12, 0.06, 0.06, 5); });   // side consoles
        const SW = 13, SH = 6.5, SY = 5.4, SZ = -HD + 0.04;
        frame(0, SY, SZ, SW, SH, 0x39d7ff, 'z');

        // ---------- HANGAR BAY (south, arrival) ----------
        block('door', 0, 5, 58.5, 14, 10, 1); block('wall', 0, 11, 58.5, 14, 2, 1);                              // sealed hangar door
        strip(0xffa826, 0, 10.1, 57.94, 14.4, 0.14, 0.06); strip(0xffa826, -7.15, 5, 57.94, 0.14, 10, 0.06); strip(0xffa826, 7.15, 5, 57.94, 0.14, 10, 0.06);
        for (const [x, y, z] of [[-10, 1, 52], [-10, 3, 52], [-10, 1, 49.6], [10.5, 1, 39], [11, 1, 53.4], [-11, 1, 38.5]]) block('wall', x, y, z, 2.2, 2, 2.2, 0xffa826);   // cargo crates

        // ---------- OPERATIONS (west) ----------
        for (const z of [-7, 0, 7]) { block('wall', -62.3, 0.55, z, 1.6, 1.1, 4.2); strip(0x8f6bff, -61.46, 1.12, z, 0.06, 0.06, 4.2); frame(-63.95, 3.3, z, 3.8, 2.1, 0x8f6bff, 'x'); }
        block('wall', -50, 0.5, 0, 7.6, 1, 4.8, 0x8f6bff);                                                           // tactical table
        frame(-50, 5.2, -13.96, 11, 5.5, 0x8f6bff, 'z');                                                             // sector map wall screen

        // ---------- ARMORY WING (east) ----------
        for (const z of [-10, -6.5, -3]) { block('wall', 61.8, 0.2, z, 2.4, 0.4, 2.4); block('wall', 61.8, 4.3, z, 2.4, 0.4, 2.4); }   // pod bases / caps
        for (const x of [41, 46, 51]) { block('wall', x, 1.8, -13.1, 3.6, 3.6, 1.8, 0x5cf0a0); strip(0x5cf0a0, x, 2.6, -12.18, 3, 0.06, 0.06); strip(0x5cf0a0, x, 1.2, -12.18, 3, 0.06, 0.06); }   // weapon racks

        if (TRN) TRN.decor({ block, strip, frame });
        if (CNL) CNL.decor({ block, strip, frame });
        batcher.finish({ floor: c.blockMat('floor'), wall: c.blockMat('wall'), door: c.blockMat('door') });

        // ---------- MISSION CONTROL screen ----------
        let progress = +c.store.get('progress', '1') || 1;               // missions unlocked so far (1 = the first)
        // completion of a mission in %: sectors = its lockdown arenas + the guardian; cleared missions read 100
        const pct = m => {
            if (!m.ready) return 0;
            if (m.i < progress - 1) return 100;
            let ck = null; try { ck = JSON.parse(localStorage.getItem('axon.ckpt') || 'null'); } catch (e) { }
            const sectors = (window.AxonLevel && window.AxonLevel.STAGES) || 9;
            return ck && ck.m === m.i ? Math.min(99, Math.round((ck.a + 1) / sectors * 100)) : 0;
        };
        const isOpen = m => m.ready && m.i < progress;
        const current = () => Math.max(0, Math.min(MISSIONS.length - 1, progress - 1));
        const T0 = { x: 40, y: 96, w: 944, h: 360, gap: 14 };
        const tileRect = i => { const cw = (T0.w - 3 * T0.gap) / 4, ch = (T0.h - 2 * T0.gap) / 3; return { x: T0.x + (i % 4) * (cw + T0.gap), y: T0.y + Math.floor(i / 4) * (ch + T0.gap), w: cw, h: ch }; };
        const screenCanvas = document.createElement('canvas'); screenCanvas.width = 1024; screenCanvas.height = 512;
        const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.encoding = THREE.sRGBEncoding; screenTex.anisotropy = 4;
        function drawScreen() {
            const g = screenCanvas.getContext('2d'), W = 1024, H = 512, cur = current();
            const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#03101f'); bg.addColorStop(1, '#07213a');
            g.fillStyle = bg; g.fillRect(0, 0, W, H);
            g.strokeStyle = 'rgba(57,215,255,.07)'; g.lineWidth = 1;
            for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
            for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
            g.textBaseline = 'middle'; g.fillStyle = '#39d7ff'; g.font = `700 34px ${FONT}`; g.textAlign = 'left';
            g.fillText('◈ MISSION CONTROL', 40, 48);
            g.textAlign = 'right'; g.font = `600 16px ${FONT}`; g.fillStyle = '#8a9bb0'; g.fillText('MTZ // SECTOR COMMAND', 984, 48);
            g.fillStyle = 'rgba(57,215,255,.55)'; g.fillRect(40, 74, 944, 2);
            MISSIONS.forEach(m => {
                const r = tileRect(m.i), on = isOpen(m), isCur = m.i === cur;
                g.save();
                g.fillStyle = isCur ? 'rgba(255,168,38,.12)' : on ? 'rgba(57,215,255,.08)' : 'rgba(10,26,44,.85)'; g.fillRect(r.x, r.y, r.w, r.h);
                g.strokeStyle = isCur ? '#ffa826' : on ? 'rgba(57,215,255,.6)' : 'rgba(57,215,255,.18)'; g.lineWidth = isCur ? 3 : 1.5;
                if (isCur) { g.shadowColor = '#ffa826'; g.shadowBlur = 16; }
                g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); g.shadowBlur = 0;
                g.fillStyle = m.color; g.globalAlpha = on ? 1 : 0.35; g.fillRect(r.x, r.y, 5, r.h);
                g.textAlign = 'left'; g.font = `700 40px ${FONT}`; g.fillStyle = isCur ? '#ffa826' : on ? '#e6eef6' : '#3d5a78';
                g.fillText(num(m.i), r.x + 18, r.y + 34);
                g.font = `700 16px ${FONT}`; g.fillStyle = on ? '#e6eef6' : '#5b7390'; g.fillText(m.code, r.x + 18, r.y + 72);
                g.font = `600 12px ${FONT}`; g.fillStyle = isCur ? '#ffa826' : '#5b7390';
                g.fillText(isCur ? '▶ ACTIVE' : on ? 'READY' : 'LOCKED', r.x + 18, r.y + 94);
                if (on) {                                                   // completion %
                    const pc = pct(m); g.textAlign = 'right'; g.font = `700 22px ${FONT}`; g.fillStyle = isCur ? '#ffa826' : '#e6eef6';
                    g.fillText(pc + '%', r.x + r.w - 14, r.y + 34); g.textAlign = 'left';
                    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(r.x + 18, r.y + r.h - 10, r.w - 32, 4);
                    g.fillStyle = '#ffa826'; g.fillRect(r.x + 18, r.y + r.h - 10, (r.w - 32) * pc / 100, 4);
                }
                if (!on) {                                                 // padlock
                    const lx = r.x + r.w - 34, ly = r.y + 30; g.globalAlpha = 0.6; g.strokeStyle = '#5b7390'; g.lineWidth = 3;
                    g.beginPath(); g.arc(lx, ly - 4, 7, Math.PI, 0); g.stroke(); g.fillStyle = '#5b7390'; g.fillRect(lx - 10, ly - 4, 20, 15);
                }
                g.restore();
            });
            g.textAlign = 'left'; g.font = `600 15px ${FONT}`; g.fillStyle = '#39d7ff';
            g.fillText('SELECT MISSION  ·  ' + S('missions'), 40, 486);
            g.textAlign = 'right'; g.fillStyle = '#8a9bb0'; g.fillText(`${Math.min(progress, MISSIONS.filter(m => m.ready).length)} / 12`, 984, 486);
            screenTex.needsUpdate = true;
        }
        drawScreen();
        add(new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex })), 0, SY, SZ + 0.02);
        const px2w = (px, py) => [(px / 1024 - 0.5) * SW, SY + (0.5 - py / 512) * SH];
        // pulsing frame on the current mission + a scan line sweeping the screen
        const hiTex = canvasTex(THREE, 256, 128, (g, w, h) => { g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 14; g.strokeRect(12, 12, w - 24, h - 24); });
        const hi = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: hiTex, color: 0xffa826, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), 0, 0, SZ + 0.05);
        const placeHi = () => { const r = tileRect(current()), [x, y] = px2w(r.x + r.w / 2, r.y + r.h / 2); hi.position.set(O.x + x, O.y + y, O.z + SZ + 0.05); hi.scale.set(r.w / 1024 * SW * 1.12, r.h / 512 * SH * 1.2, 1); };
        placeHi();
        const scanTex = canvasTex(THREE, 4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const scan = add(new THREE.Mesh(new THREE.PlaneGeometry(SW, 0.5), new THREE.MeshBasicMaterial({ map: scanTex, color: 0x39d7ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })), 0, SY, SZ + 0.04);

        // ---------- OPERATIONS: desk monitors, sector map wall + tactical table with a holo globe ----------
        const dataTex = canvasTex(THREE, 256, 128, (g, w, h) => {
            g.fillStyle = '#041526'; g.fillRect(0, 0, w, h);
            g.strokeStyle = '#39d7ff'; g.lineWidth = 2; g.beginPath();
            for (let x = 0; x <= 150; x += 6) g.lineTo(10 + x, 70 - Math.sin(x * 0.09) * 18 - Math.cos(x * 0.21) * 8); g.stroke();
            g.fillStyle = '#ffa826'; for (let i = 0; i < 7; i++) g.fillRect(172 + i * 11, 100 - (i * 37 % 60) - 10, 7, (i * 37 % 60) + 10);
            g.fillStyle = 'rgba(57,215,255,.5)'; for (let i = 0; i < 6; i++) g.fillRect(10, 96 + i * 5, 40 + (i * 53 % 90), 2);
            g.strokeStyle = 'rgba(57,215,255,.4)'; g.strokeRect(1, 1, w - 2, h - 2);
        });
        const monMat = new THREE.MeshBasicMaterial({ map: dataTex });
        for (const z of [-7, 0, 7]) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.1), monMat), -63.93, 3.3, z); m.rotation.y = Math.PI / 2; }
        const intelTex = canvasTex(THREE, 512, 256, (g, w, h) => {
            g.fillStyle = '#070f24'; g.fillRect(0, 0, w, h);
            g.strokeStyle = 'rgba(143,107,255,.14)'; g.lineWidth = 1;
            for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
            for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
            const pts = MISSIONS.map((m, i) => [40 + i * 39, 140 + Math.sin(i * 1.3) * 70]);
            g.strokeStyle = 'rgba(57,215,255,.55)'; g.lineWidth = 2; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
            pts.forEach(([x, y], i) => { g.fillStyle = MISSIONS[i].color; g.globalAlpha = i ? 0.6 : 1; g.beginPath(); g.arc(x, y, i ? 6 : 10, 0, Math.PI * 2); g.fill(); });
            g.globalAlpha = 1; g.fillStyle = '#a58bff'; g.font = `700 18px ${FONT}`; g.textBaseline = 'middle'; g.fillText('SECTOR MAP // OPS', 16, 24);
            g.strokeStyle = 'rgba(143,107,255,.6)'; g.strokeRect(1, 1, w - 2, h - 2);
        });
        const intelMat = new THREE.MeshBasicMaterial({ map: intelTex });
        add(new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), intelMat), -50, 5.2, -13.95);
        const tableMap = add(new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), intelMat), -50, 1.03, 0); tableMap.rotation.x = -Math.PI / 2;
        const opsGlobe = add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.2, 1)),
            new THREE.LineBasicMaterial({ color: 0xa58bff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })), -50, 3.4, 0);
        const opsBeam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 2.3, 24, 1, true), glow(0x8f6bff, 0.07, THREE.DoubleSide)), -50, 2.2, 0);

        // ---------- COMMAND DECK centre: floating holo emblem over a floor emitter ----------
        const holo = add(new THREE.Group(), 0, 9.9, 1); holo.scale.setScalar(0.8);   // high enough to leave the screen in view
        const lineM = new THREE.LineBasicMaterial({ color: 0x39d7ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        const ico = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 1)), lineM); holo.add(ico);
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), glow(0xffa826)); holo.add(core);
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.035, 6, 72), glow(0x39d7ff, 0.8)); holo.add(ringA);
        const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.03, 6, 72), glow(0xffa826, 0.7)); holo.add(ringB);
        const beam = add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.2, 9.4, 32, 1, true), glow(0x39d7ff, 0.05, THREE.DoubleSide)), 0, 4.7, 1);
        const flat = (geo, mat, x, z, y = 0.02) => { const m = add(new THREE.Mesh(geo, mat), x, y, z); m.rotation.x = -Math.PI / 2; return m; };
        const emitM = glow(0x39d7ff, 0.55);
        flat(new THREE.RingGeometry(3.2, 3.45, 64), emitM, 0, 1); flat(new THREE.RingGeometry(4.7, 4.95, 6), emitM, 0, 1);
        const spinRing = flat(new THREE.RingGeometry(3.7, 3.8, 6, 1, 0, Math.PI * 1.2), glow(0xffa826, 0.7), 0, 1, 0.03);

        // ---------- HANGAR BAY: landing pad ----------
        flat(new THREE.RingGeometry(5, 5.3, 6), glow(0xffa826, 0.6), 0, 48); flat(new THREE.RingGeometry(7.4, 7.6, 48), glow(0x39d7ff, 0.45), 0, 48);
        const padSpin = flat(new THREE.RingGeometry(6.1, 6.25, 48, 1, 0, Math.PI * 0.6), glow(0xffa826, 0.8), 0, 48, 0.03);

        // ---------- ARMORY WING: glass pods with a rising ring ----------
        const podM = glow(0x39d7ff, 0.1, THREE.DoubleSide), podRingM = glow(0x7ff3ff, 0.8), podRings = [];
        const podGeo = new THREE.CylinderGeometry(0.95, 0.95, 3.7, 28, 1, true), podRingGeo = new THREE.TorusGeometry(0.96, 0.04, 6, 40);
        for (const z of [-10, -6.5, -3]) {
            add(new THREE.Mesh(podGeo, podM), 61.8, 2.25, z);
            const r = add(new THREE.Mesh(podRingGeo, podRingM), 61.8, 1, z); r.rotation.x = Math.PI / 2; podRings.push(r);
        }

        // ---------- path to the terminal (hangar → corridor → screen): faint chevrons + one bright runner ----------
        const chev = new THREE.Shape(); chev.moveTo(-0.9, -0.35); chev.lineTo(0, 0.35); chev.lineTo(0.9, -0.35); chev.lineTo(0.9, -0.05); chev.lineTo(0, 0.65); chev.lineTo(-0.9, -0.05);
        const chevGeo = new THREE.ShapeGeometry(chev); chevGeo.rotateX(-Math.PI / 2);
        const CH0 = 50, CH1 = -11.5, parts = [];
        for (let z = CH0; z >= CH1; z -= 2.1) if (Math.abs(z - 1) > 5.2 && Math.abs(z - 48) > 1.6) parts.push({ geo: chevGeo, matrix: new THREE.Matrix4().makeTranslation(O.x, O.y + 0.03, O.z + z) });
        root.add(new THREE.Mesh(c.PERF.mergeGeometries(parts), glow(0xffa826, 0.22)));
        const runner = add(new THREE.Mesh(chevGeo, glow(0xffa826, 0.95)), 0, 0.04, CH0);

        // ---------- blast gates: two panels retract into the jambs as you approach; a sign on each face ----------
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a3140, metalness: 0.8, roughness: 0.35, envMapIntensity: 1 });
        const doorGeo = new THREE.BoxGeometry(4, 7, 0.3), bandGeo = new THREE.BoxGeometry(4, 0.14, 0.36), edgeGeo = new THREE.BoxGeometry(0.1, 6.6, 0.38);
        const jambGeo = new THREE.BoxGeometry(0.12, 7, 1.3), headGeo = new THREE.BoxGeometry(8, 0.12, 1.3), lampGeo = new THREE.BoxGeometry(1.4, 0.2, 1.36);
        const signs = [];
        function paintSign(sg) {
            const g = sg.cv.getContext('2d'), W = sg.cv.width, H = sg.cv.height;
            g.clearRect(0, 0, W, H);
            g.fillStyle = '#04111f'; g.fillRect(0, 0, W, H);
            g.strokeStyle = sg.css; g.lineWidth = 4; g.strokeRect(3, 3, W - 6, H - 6);
            g.fillStyle = sg.css; g.fillRect(3, 3, 14, H - 6); g.fillRect(W - 17, 3, 14, H - 6);
            g.direction = window.AxonI18n && window.AxonI18n.lang === 'ar' ? 'rtl' : 'ltr';
            g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.shadowColor = sg.css; g.shadowBlur = 12; g.fillStyle = sg.css;
            g.fillText(S(sg.key), W / 2, H / 2 + 2, W - 70); g.shadowBlur = 0;
            sg.tex.needsUpdate = true;
        }
        const gates = HALLS.map(hl => {
            const gx = hl.gx !== undefined ? hl.gx : hl.x, g = add(new THREE.Group(), gx, hl.y || 0, hl.z); if (!hl.alongZ) g.rotation.y = Math.PI / 2;   // local x = across the doorway
            const edgeM = glow(0x39d7ff), lampM = new THREE.MeshBasicMaterial({ color: 0xffa826 });
            const panels = [-1, 1].map(s => {
                const p = new THREE.Group(); p.position.x = s * 4; g.add(p);
                const m = new THREE.Mesh(doorGeo, doorMat); m.position.set(-s * 2, 3.5, 0); m.castShadow = true; p.add(m);
                const b = new THREE.Mesh(bandGeo, edgeM); b.position.set(-s * 2, 3.5, 0); p.add(b);
                const e = new THREE.Mesh(edgeGeo, edgeM); e.position.set(-s * 0.08, 3.5, 0); p.add(e);
                return p;
            });
            [-1, 1].forEach(s => { const j = new THREE.Mesh(jambGeo, edgeM); j.position.set(s * 3.95, 3.5, 0); g.add(j); });
            const hd = new THREE.Mesh(headGeo, edgeM); hd.position.y = 7; g.add(hd);
            const lamp = new THREE.Mesh(lampGeo, lampM); lamp.position.y = 7.3; g.add(lamp);
            [[-1, hl.neg, hl.negCol], [1, hl.pos, hl.posCol]].forEach(([s, key, col]) => {   // sign facing each side names the wing behind the gate
                const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
                const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
                const sg = { cv, tex, key, css: hexCss(col) }; paintSign(sg); signs.push(sg);
                const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.12), new THREE.MeshBasicMaterial({ map: tex }));
                pl.position.set(0, 8.55, s * 0.62); if (s < 0) pl.rotation.y = Math.PI; g.add(pl);
            });
            return { x: gx, z: hl.z, alongZ: hl.alongZ, panels, lamp, edgeM, open: 0, near: false };
        });

        // ---------- exit sign over the hangar door (it leads out to the OUTER ZONE) ----------
        const exitCv = document.createElement('canvas'); exitCv.width = 512; exitCv.height = 96;
        const exitTex = new THREE.CanvasTexture(exitCv); exitTex.encoding = THREE.sRGBEncoding; exitTex.anisotropy = 4;
        const exitSg = { cv: exitCv, tex: exitTex, key: 'exitSign', css: '#ff2a9d' }; paintSign(exitSg); signs.push(exitSg);
        const exitSign = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: exitTex })), 0, 11, 57.93); exitSign.rotation.y = Math.PI;

        // ---------- interaction spots: mission console, armory pods, armor studio ----------
        const SPOTS = [{ id: 'exit', x: 0, z: 55.2, r: 2.6 }, { id: 'explore', x: -50, z: 8.6, r: 2.2 }, { id: 'missions', x: 0, z: -14.2, r: 3.3 }, { id: 'armory', x: 57.5, z: -6.5, r: 2.8 }, { id: 'style', x: 61.4, z: 7, r: 1.45 }, { id: 'forge', x: 46.25, z: 7.4, r: 2.0 }, { id: 'look', x: 49, z: -8.6, r: 1.35 }].concat(TRN ? [TRN.SPOT] : [], CNL ? [CNL.SPOT] : []);
        const zoneM = glow(0xffa826, 0.75), spotRings = SPOTS.map(s => flat(new THREE.RingGeometry(1.35, 1.55, 48), zoneM, s.x, s.z, (s.y || 0) + 0.03));
        const marker = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), glow(0xffa826)), 0, 3.6, -14.2); marker.scale.y = 1.5;

        // ---------- operatives ----------
        const crew = [];
        function operative(spec, k) {
            const [name, , , , , scale, , x, z, face] = spec, { g, hg, baseQ } = bakeCrew(THREE, spec, k);
            g.rotation.y = face; add(g, x, 0, z);
            c.solids.push(new THREE.Box3(V(x - 0.45, 0, z - 0.45), V(x + 0.45, 3.1 * scale, z + 0.45)));
            crew.push({ name, g, hg, baseQ, yaw: 0, face, x, z, scale, ph: k * 1.7, said: false, line: k });
        }
        CREW.forEach(operative);
        const qY = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);

        // ---------- DOM: HQ tag, action button, speech caption, fade, mission panel ----------
        const st = document.createElement('style');
        st.textContent = `
          #stage.in-hub #targets,#stage.in-hub #combo,#stage.in-hub #boss-bar{display:none!important}
          #stage.in-hub #btn-lock,#stage.in-hub #btn-shoot,#stage.in-hub #btn-attack{visibility:hidden}
          #hub-tag{position:absolute;z-index:6;left:max(16px,env(safe-area-inset-left));top:calc(max(12px,env(safe-area-inset-top)) + 235px);display:none;pointer-events:none;gap:3px;padding:8px 12px;border-inline-start:3px solid var(--cyan);background:linear-gradient(90deg,rgba(8,20,36,.8),rgba(8,20,36,0))}
          #stage.in-hub #hub-tag{display:grid}
          #stage.is-portrait #hub-tag{top:calc(max(12px,env(safe-area-inset-top)) + 245px)}
          #stage.in-menu #hub-tag,#stage.in-menu #hub-act,#stage.in-menu #hub-say{display:none!important}
          #hub-tag b{font:700 13px/1 var(--font);letter-spacing:.42em;color:var(--cyan);text-shadow:0 0 14px rgba(57,215,255,.6)}
          #hub-tag span{font-size:11px;color:var(--dim);letter-spacing:.08em}
          #hub-tag span.hz{font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--hz,var(--amber));text-shadow:0 0 10px currentColor}
          #hub-act{position:absolute;z-index:12;left:50%;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 84px);transform:translate(-50%,16px);opacity:0;pointer-events:none;
            display:flex;align-items:center;gap:10px;padding:12px 22px;font:700 14px/1 var(--font);letter-spacing:.14em;color:#1a0d00;background:var(--amber);border:0;cursor:pointer;
            clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);transition:opacity .2s,transform .2s;touch-action:manipulation}
          #hub-act.show{opacity:1;transform:translate(-50%,0);pointer-events:auto;animation:hubPulse 1.4s ease-in-out infinite}
          #hub-act svg{width:18px;height:18px;fill:none;stroke:#1a0d00;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
          #stage.is-portrait #hub-act{bottom:34%}
          @keyframes hubPulse{50%{box-shadow:0 0 0 6px rgba(255,168,38,.25)}}
          #hub-say{position:absolute;z-index:6;left:50%;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 150px);transform:translate(-50%,8px);max-width:min(520px,70%);
            padding:9px 14px;background:linear-gradient(90deg,rgba(8,20,36,.92),rgba(8,20,36,.75));border-inline-start:3px solid var(--cyan);font-size:13px;line-height:1.5;
            opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}
          #hub-say.show{opacity:1;transform:translate(-50%,0)}
          #hub-say b{display:block;font-size:10px;letter-spacing:.35em;color:var(--cyan)}
          #stage.is-portrait #hub-say{bottom:44%}
          #hub-fade{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:#02060c;opacity:0;pointer-events:none;transition:opacity .45s}
          #hub-fade.on{opacity:1;pointer-events:auto}
          #hub-fade div{display:grid;gap:8px;text-align:center}
          #hub-fade small{font-size:11px;letter-spacing:.45em;color:var(--cyan)}
          #hub-fade b{font:700 clamp(28px,7vmin,52px)/1 var(--font);letter-spacing:.1em;text-shadow:0 0 24px rgba(57,215,255,.4)}
          #hub-fade b em{font-style:normal;color:var(--amber)}
          #hub-fade span{font-size:12px;color:var(--dim);letter-spacing:.2em}
          #hub-panel{z-index:28;display:grid;place-items:center;background:rgba(3,8,16,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
          .hm-card{position:relative;width:min(900px,94%);max-height:92%;box-sizing:border-box;padding:16px 18px;display:grid;grid-template-rows:auto 1fr;gap:12px;overflow:hidden;
            background:linear-gradient(160deg,rgba(18,38,62,.94),rgba(6,14,28,.97));border:1px solid rgba(57,215,255,.3);
            clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}
          .hm-head{display:flex;align-items:baseline;gap:12px;padding-inline-end:44px}
          .hm-head h2{margin:0;font-size:20px;letter-spacing:.06em}
          .hm-head small{font-size:10px;letter-spacing:.4em;color:var(--cyan)}
          .hm-head .hm-prog{margin-inline-start:auto;font-size:11px;letter-spacing:.2em;color:var(--dim)}
          .hm-body{display:grid;grid-template-columns:1fr 250px;gap:14px;min-height:0}
          #stage.is-portrait .hm-body{grid-template-columns:1fr;grid-template-rows:auto auto;overflow:auto}
          .hm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow:auto;align-content:start;padding:2px}
          #stage.is-portrait .hm-grid{grid-template-columns:repeat(3,1fr);overflow:visible}
          #stage.is-portrait .hm-tile{min-height:88px}
          #stage.is-portrait .hm-det .art{display:none}
          .hm-tile{position:relative;display:grid;align-content:space-between;gap:6px;min-height:78px;padding:9px 10px 8px 13px;text-align:start;font:inherit;color:var(--ink);cursor:pointer;
            background:linear-gradient(150deg,rgba(255,255,255,.05),rgba(255,255,255,.015));border:1px solid rgba(57,215,255,.16);touch-action:manipulation;
            clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);transition:border-color .15s,background .15s,transform .15s}
          .hm-tile::before{content:'';position:absolute;inset-block:0;inset-inline-start:0;width:3px;background:var(--mc);opacity:.9}
          .hm-tile .n{font:700 22px/1 var(--font);letter-spacing:.04em}
          .hm-tile .c{font-size:10px;font-weight:700;letter-spacing:.14em;line-height:1.3}
          .hm-tile svg{position:absolute;top:8px;inset-inline-end:8px;width:22px;height:22px;fill:none;stroke:var(--mc);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
          .hm-tile .s{font-size:9px;letter-spacing:.08em;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .hm-tile.lock{color:#6f86a0}
          .hm-tile.lock svg{opacity:.35}
          .hm-tile.lock .s::before{content:'🔒 ';letter-spacing:0}
          .hm-tile.cur{border-color:var(--amber);background:linear-gradient(150deg,rgba(255,168,38,.18),rgba(255,168,38,.04));box-shadow:inset 0 0 22px rgba(255,168,38,.12)}
          .hm-tile.cur .n,.hm-tile.cur .s{color:var(--amber)}
          .hm-tile.sel{outline:2px solid var(--cyan);outline-offset:-2px}
          .hm-tile:hover,.hm-tile:focus-visible{border-color:rgba(57,215,255,.6);outline:none;transform:translateY(-1px)}
          .hm-det{display:grid;align-content:start;gap:10px;padding:14px;background:rgba(255,255,255,.035);border:1px solid rgba(57,215,255,.14);min-height:0;overflow:auto}
          .hm-det .art{height:74px;display:grid;place-items:center;background:radial-gradient(circle at 50% 60%,color-mix(in srgb,var(--mc) 30%,transparent),transparent 70%);border-bottom:1px solid rgba(255,255,255,.07)}
          .hm-det .art svg{width:46px;height:46px;fill:none;stroke:var(--mc);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px var(--mc))}
          .hm-det .k{font-size:10px;letter-spacing:.35em;color:var(--cyan)}
          .hm-det h3{margin:0;font-size:20px;letter-spacing:.06em;line-height:1.15}
          .hm-det .t{font-size:13px;color:#b7c6d6}
          .hm-det p{margin:0;font-size:12.5px;line-height:1.65;color:#b7c6d6}
          .hm-tile .pb,.hm-prog2 .pb{display:block;height:4px;background:rgba(255,255,255,.1);overflow:hidden}
          .hm-tile .pb i,.hm-prog2 .pb i{display:block;height:100%;background:linear-gradient(90deg,var(--amber),#ffd36b);box-shadow:0 0 8px rgba(255,168,38,.6)}
          .hm-tile .s b{color:var(--ink);font-variant-numeric:tabular-nums}
          .hm-prog2{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font-size:10px;letter-spacing:.25em;color:var(--dim)}
          .hm-prog2 .pb{height:6px}
          .hm-prog2 b{font:700 14px/1 var(--font);letter-spacing:.04em;color:var(--amber);font-variant-numeric:tabular-nums}
          .hm-pips{display:flex;align-items:center;gap:4px;font-size:10px;letter-spacing:.25em;color:var(--dim)}
          .hm-pips i{width:14px;height:5px;background:rgba(255,255,255,.12);transform:skewX(-20deg)}
          .hm-pips i.on{background:var(--magenta)}
          .hm-pips span{margin-inline-end:6px}
          .hm-go{padding:13px 16px;font:700 15px/1 var(--font);letter-spacing:.2em;color:#1a0d00;background:var(--amber);border:0;cursor:pointer;
            clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
          .hm-go:disabled{background:rgba(255,255,255,.08);color:#6f86a0;cursor:not-allowed}
          .hm-go:not(:disabled):hover{background:#ffbb4d}
          @media (prefers-reduced-motion:reduce){#hub-act.show{animation:none}}`;
        document.head.appendChild(st);
        const el = (id, tag = 'div', cls = '') => { const e = document.createElement(tag); e.id = id; if (cls) e.className = cls; stage.appendChild(e); return e; };
        const tag = el('hub-tag'), act = el('hub-act', 'button'), say = el('hub-say'), fade = el('hub-fade'), panel = el('hub-panel', 'div', 'ui-layer');
        act.type = 'button';
        const ACT_ICON = { train: TRN ? TRN.ICON : '', chief: CNL ? CNL.ICON : '', look: '<circle cx="12" cy="7.5" r="4"/><path d="M4.5 21c1.2-4.2 4-6.3 7.5-6.3s6.3 2.1 7.5 6.3"/><path d="M18 2.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>', forge: '<path d="M4 14h12l3-3H8z"/><path d="M9 14v3l-3 3h12l-3-3v-3"/><path d="M14 3l5 5-3 1-3-3z"/>', explore: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16M12 8a4 4 0 0 1 0 8"/>', exit: '<path d="M14 4h5v16h-5"/><path d="M3 12h11M7 8l-4 4 4 4"/>', missions: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4M7 8h4M7 11h7"/>', armory: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', style: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.8 0-1.1-.9-1.4-.9-2.4 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>' };
        let spot = null, sel = 0, on = false, t = 0, sayT = 0, busy = false, here = ZONES[0];
        const zoneAt = (x, z) => ZONES.find(r => Math.abs(x - r.x) <= r.hw && Math.abs(z - r.z) <= r.hd) || null;
        const labels = () => {
            tag.style.setProperty('--hz', hexCss(here.col));
            tag.innerHTML = `<b>◈ ${S('hq')}</b><span class="hz">▸ ${S(here.key)}</span><span>${S('obj')}</span>`;
            if (spot) act.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ACT_ICON[spot.id]}</svg>${spot.id === 'missions' ? S('open') : S(spot.id)}`;
        };
        const zoneLabel = () => { const sl = document.getElementById('stage-label'); if (sl && on) sl.textContent = S(here.key); };
        labels();
        if (window.AxonI18n) window.AxonI18n.onChange(() => { labels(); zoneLabel(); drawScreen(); signs.forEach(paintSign); if (panel.classList.contains('show')) renderPanel(); if (trn) trn.relang(); if (gd) gd.relang(); if (cnl) cnl.relang(); });

        function renderPanel() {
            const cur = current(), done = Math.min(progress - 1, MISSIONS.length);
            const tiles = MISSIONS.map(m => {
                const o = isOpen(m), status = m.i === cur && o ? S('current') : o ? S('cleared') : m.ready ? S('locked') : S('soonS');
                const pc = pct(m);
                return `<button type="button" class="hm-tile ${o ? '' : 'lock'} ${m.i === cur ? 'cur' : ''} ${m.i === sel ? 'sel' : ''}" data-m="${m.i}" style="--mc:${m.color}" aria-pressed="${m.i === sel}">
                    <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[m.icon]}</svg><span class="n">${num(m.i)}</span><span class="c">${m.code}</span><span class="s">${status}${o ? ` · <b><bdi>${pc}%</bdi></b>` : ''}</span>${o ? `<span class="pb"><i style="width:${pc}%"></i></span>` : ''}</button>`;
            }).join('');
            const m = MISSIONS[sel], o = isOpen(m);
            panel.innerHTML = `<div class="hm-card" role="dialog" aria-label="${S('missions')}">
                <div class="hm-head"><h2>${S('missions')}</h2><small>MISSION CONTROL</small><span class="hm-prog">${done} / 12</span></div>
                <button type="button" class="pn-close" data-x aria-label="${S('close')}">✕</button>
                <div class="hm-body"><div class="hm-grid">${tiles}</div>
                  <div class="hm-det" style="--mc:${m.color}">
                    <div class="art"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[m.icon]}</svg></div>
                    <span class="k"><bdi>${num(m.i)}</bdi> · <bdi>${S('sector')} ${m.sector}</bdi></span>
                    <h3>${m.code}</h3><span class="t">${S('names')[m.i]}</span>
                    ${m.ready ? `<div class="hm-prog2"><span>${S('prog')}</span><span class="pb"><i style="width:${pct(m)}\%"></i></span><b>${pct(m)}%</b></div>` : ''}
                    <div class="hm-pips"><span>${S('threat')}</span>${[0, 1, 2, 3, 4].map(k => `<i class="${k < m.threat ? 'on' : ''}"></i>`).join('')}</div>
                    <p>${m.ready ? S('m' + (m.i + 1)) : S('classified')}</p>
                    <button type="button" class="hm-go" data-go ${o ? '' : 'disabled'}>${o ? S('deploy') + ' ▶' : m.ready ? S('locked') : S('soon')}</button>
                  </div></div></div>`;
        }
        function openPanel() {
            if (c.getState() !== 'hub') return;
            sel = current(); renderPanel(); panel.classList.add('show'); c.setState('hubmenu'); AudioSys.playUi('open');
            setTimeout(() => { const b = panel.querySelector('.hm-go:not(:disabled)') || panel.querySelector('.hm-tile.cur'); b && b.focus({ preventScroll: true }); }, 60);
        }
        function closePanel() { panel.classList.remove('show'); if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input.flush(); } }
        panel.addEventListener('click', e => {
            if (e.target === panel || e.target.closest('[data-x]')) { AudioSys.playUi('close'); closePanel(); return; }
            const tl = e.target.closest('[data-m]');
            if (tl) { sel = +tl.dataset.m; if (isOpen(MISSIONS[sel])) AudioSys.playUi('select'); else AudioSys.playDeny(); renderPanel(); const f = panel.querySelector(`[data-m="${sel}"]`); f && f.focus({ preventScroll: true }); return; }
            if (e.target.closest('[data-go]') && isOpen(MISSIONS[sel])) deploy(sel);
        });
        act.addEventListener('click', () => { AudioSys.init(); if (!spot) return; if (spot.id === 'exit') { c.onExit && c.onExit(); } else if (spot.id === 'explore') { c.onExplore && c.onExplore(); } else if (spot.id === 'forge') { c.onForge && c.onForge(); } else if (spot.id === 'look') { c.onLook && c.onLook(); } else if (spot.id === 'missions') openPanel(); else if (spot.id === 'train') trn.open(); else if (spot.id === 'chief') cnl.open(); else if (spot.id === 'style') studio.open(); else { AudioSys.init(); window.AxonShop && window.AxonShop.show(); } });
        window.addEventListener('keydown', e => {
            if (panel.classList.contains('show') && e.code === 'Escape') { e.stopImmediatePropagation(); closePanel(); return; }
            if (trn && trn.isOpen() && e.code === 'Escape') { e.stopImmediatePropagation(); trn.close(); return; }
            if (studio.isOpen) { studio.key(e); return; }
            const ae = document.activeElement, typing = ae && /INPUT|TEXTAREA|BUTTON|SELECT/.test(ae.tagName) && ae.offsetParent !== null;
            if ((e.code === 'KeyE' || (e.code === 'Enter' && !typing)) && spot && c.getState() === 'hub') { e.preventDefault(); act.click(); }
        }, true);

        // ---------- TRAINING WING: trainees, targets and the skills panel live in training.js ----------
        const trn = TRN ? TRN.build({ THREE, c, O, V, add, root, glow, flat, canvasTex, FONT, S, PALETTES, stage, AudioSys, el,
            speak: html => { say.innerHTML = html; say.classList.add('show'); sayT = 3.2; } }) : null;

        const gd = window.AxonGuide ? window.AxonGuide.build({ THREE, c, O, add, glow, stage, AudioSys, el, FONT, camera: () => cameraSystem.camera }) : null;   // KENDEL, the guide (guide.js)

        // WAR ROOM (council.js): the map table, the five leaders, the door guards and the commander's briefing
        const cnl = CNL ? CNL.build({ THREE, c, O, V, add, root, glow, flat, canvasTex, FONT, PALETTES, bakeCrew, stage, AudioSys, el,
            speak: html => { say.innerHTML = html; say.classList.add('show'); sayT = 3.2; } }) : null;

        // ---------- ARMOR STUDIO: a Mega-Man-style upgrade capsule against the east wall of the ARMORY WING.
        // Step in → the camera swings to face you, the colour schemes appear, each one is tried on live,
        // bought with credits and equipped for good. ----------
        const studio = (() => {
            const X = 61.4, Z = 7, HK = window.AxonHero, SK = HK.SKINS, KEYS = Object.keys(SK);
            const cap = add(new THREE.Group(), X, 0, Z);
            const metal = new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.85, roughness: 0.3 });
            const shell = new THREE.MeshStandardMaterial({ color: 0xdfe6ef, metalness: 0.35, roughness: 0.28, side: THREE.DoubleSide });
            const m = (geo, mat, y = 0, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.rotation.x = rx; cap.add(o); return o; };
            m(new THREE.CylinderGeometry(1.62, 1.72, 0.05, 40), metal, 0.025);                                   // floor plate
            const padGlow = glow(0x39d7ff, 0.9);
            m(new THREE.RingGeometry(1.25, 1.38, 48), padGlow, 0.06, -Math.PI / 2);
            m(new THREE.RingGeometry(0.5, 0.56, 6), glow(0xffa826, 0.8), 0.06, -Math.PI / 2);
            const back = m(new THREE.CylinderGeometry(1.62, 1.62, 4.3, 36, 1, true, 0, Math.PI), shell, 2.2); back.rotation.y = 0;   // rear half-shell (wall side)
            [0.35, 1.2, 2.05, 2.9].forEach(a => { const r = m(new THREE.BoxGeometry(0.05, 4.1, 0.05), padGlow, 2.2); r.position.set(Math.sin(a) * 1.58, 2.2, Math.cos(a) * 1.58); });
            m(new THREE.CylinderGeometry(1.6, 1.6, 4.3, 36, 1, true, Math.PI, Math.PI), glow(0x7fe9ff, 0.07, THREE.DoubleSide), 2.2);   // glass front
            m(new THREE.CylinderGeometry(1.85, 1.7, 0.55, 40), metal, 4.6);                                     // crown
            m(new THREE.CylinderGeometry(1.5, 1.85, 0.3, 40), shell, 5.0);
            m(new THREE.TorusGeometry(1.7, 0.05, 8, 48), glow(0xffa826), 4.33, Math.PI / 2);
            const beamS = m(new THREE.CylinderGeometry(1.2, 1.45, 4.2, 32, 1, true), glow(0x39d7ff, 0.08, THREE.DoubleSide), 2.2);
            const rings = [0, 1, 2].map(() => m(new THREE.TorusGeometry(1.35, 0.03, 6, 48), glow(0x7ff3ff, 0.85), 0.2, Math.PI / 2));
            const signTex = canvasTex(THREE, 512, 96, (g, w, h) => { g.fillStyle = '#04111f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffa826'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
                g.fillStyle = '#ffa826'; g.font = `700 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ARMOR STUDIO', w / 2, h / 2 + 2); });
            const sign = m(new THREE.PlaneGeometry(2.6, 0.49), new THREE.MeshBasicMaterial({ map: signTex }), 4.6); sign.position.x = -1.87; sign.rotation.y = -Math.PI / 2;
            for (const a of [0.5, 1.57, 2.64]) c.solids.push(new THREE.Box3(V(X + Math.sin(a) * 1.62 - 0.2, 0, Z + Math.cos(a) * 1.62 - 0.2), V(X + Math.sin(a) * 1.62 + 0.2, 4.4, Z + Math.cos(a) * 1.62 + 0.2)));

            // ---- ownership (the scheme you wore before this studio existed stays yours) ----
            let owned = null; try { owned = JSON.parse(c.store.get('skinsOwned', 'null')); } catch (e) { }
            if (!Array.isArray(owned)) { owned = ['EMBER']; const k = c.store.get('skin', 'EMBER'); if (SK[k] && !owned.includes(k)) owned.push(k); }
            const saveOwned = () => c.store.set('skinsOwned', JSON.stringify(owned));
            saveOwned();

            // ---- panel ----
            const st = document.createElement('style');
            st.textContent = `#hub-style{z-index:28;display:flex;align-items:center;justify-content:flex-end;padding:0 max(14px,env(safe-area-inset-right)) 0 0;box-sizing:border-box}
              .ss-card{width:min(440px,50%);max-height:94%;overflow:auto;box-sizing:border-box;padding:14px 16px;display:grid;gap:10px;font-family:var(--font);
                background:linear-gradient(160deg,rgba(14,30,50,.93),rgba(6,12,24,.96));border:1px solid rgba(57,215,255,.3);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
              .ss-head{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center}
              .ss-head small{font-size:9px;letter-spacing:.4em;color:var(--cyan)}
              .ss-head h2{margin:2px 0 0;font-size:19px}
              .ss-head p{margin:2px 0 0;font-size:11px;color:var(--dim)}
              .ss-cr{font:700 15px var(--font);color:var(--amber);white-space:nowrap}.ss-cr i{font-style:normal;font-size:10px;opacity:.7;margin-inline-end:4px}
              .ss-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:var(--ink);cursor:pointer;font-size:15px}
              .ss-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
              .ss-sw{position:relative;display:grid;gap:4px;justify-items:center;padding:6px 4px 5px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);cursor:pointer;color:var(--ink);font-family:var(--font);min-width:0}
              .ss-sw i{width:100%;aspect-ratio:1;max-width:58px;border-radius:50%;box-shadow:inset 0 2px 4px rgba(255,255,255,.35),inset 0 -4px 8px rgba(0,0,0,.5)}
              .ss-sw b{font-size:9.5px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
              .ss-card[dir=rtl] .ss-sw b{font-size:11.5px;letter-spacing:0}
              .ss-card[dir=rtl] .ss-info b{letter-spacing:0}
              .ss-sw em{font-style:normal;font-size:9.5px;color:var(--amber);white-space:nowrap}
              .ss-sw.own em{color:#7fe9ff}
              .ss-sw.sel{border-color:var(--cyan);background:rgba(57,215,255,.12);box-shadow:0 0 12px rgba(57,215,255,.35)}
              .ss-sw.eq::after{content:'✓';position:absolute;top:3px;inset-inline-end:5px;font-size:11px;color:#7fe9ff}
              .ss-sw.t3 i{animation:ssLeg 2.4s linear infinite}
              @keyframes ssLeg{to{filter:hue-rotate(360deg)}}
              .ss-foot{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,.07)}
              .ss-info b{display:block;font-size:16px;letter-spacing:.12em}
              .ss-info span{font-size:10px;letter-spacing:.3em}
              .ss-info small{font-size:10px;letter-spacing:.2em;color:var(--dim);font-weight:400}
              .ss-t0{color:#9fb0c4}.ss-t1{color:#39d7ff}.ss-t2{color:#c49bff}
              .ss-t3{background:linear-gradient(90deg,#ffe38a,#ff7ad9,#7ff3ff,#ffe38a);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ssShine 3s linear infinite}
              @keyframes ssShine{to{background-position:300% 0}}
              .ss-go{min-width:150px;height:44px;padding:0 16px;font:700 14px var(--font);letter-spacing:.08em;color:#1a0d00;background:linear-gradient(180deg,#ffe28a,#ffb627);border:0;cursor:pointer;
                clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
              .ss-go.eqp{background:linear-gradient(180deg,#8ff0ff,#2fb8e0)}
              .ss-go:disabled{background:rgba(255,255,255,.08);color:var(--dim);cursor:default}
              #stage.is-portrait #hub-style{align-items:flex-end;justify-content:center;padding:0 0 max(10px,env(safe-area-inset-bottom))}
              #stage.is-portrait .ss-card{width:calc(100% - 20px);max-height:56%}
              #stage.short .ss-card{padding:10px 12px;gap:7px}
              #stage.short .ss-head p{display:none}
              #stage.short .ss-sw i{max-width:44px}
              #stage.in-studio #hud,#stage.in-studio #touch-ui,#stage.in-studio #slots,#stage.in-studio #hub-say,#stage.in-studio #hub-act,#stage.in-studio #hub-tag,#stage.in-studio #keys,#stage.in-studio #tipbar{display:none!important}
              @media (prefers-reduced-motion:reduce){.ss-sw.t3 i,.ss-t3{animation:none}}`;
            document.head.appendChild(st);
            const pnl = el('hub-style', 'div', 'ui-layer');
            const hx = n => '#' + n.toString(16).padStart(6, '0');
            const swatch = p => `background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.45),transparent 38%),conic-gradient(from 210deg,${hx(p.armor)} 0 42%,${hx(p.trim)} 42% 56%,${hx(p.under)} 56% 78%,${hx(p.glow)} 78% 90%,${hx(p.accent)} 90%);box-shadow:0 0 10px ${hx(p.glow)}88,inset 0 2px 4px rgba(255,255,255,.35),inset 0 -4px 8px rgba(0,0,0,.5)`;
            let isOpen = false, sel = 'EMBER', saved = null, burst = 0;
            const wearing = () => c.store.get('skin', 'EMBER');
            const nm = k => S('skinN')[k] || k;                                  // colour name in the chosen language
            function render() {
                const L = window.AxonI18n ? window.AxonI18n.lang : 'en', cr = window.AxonShop ? window.AxonShop.credits : 0, p = SK[sel], own = owned.includes(sel), eq = wearing() === sel;
                const lack = Math.max(0, p.price - cr), tiers = S('tiers');
                const btn = eq ? `<button type="button" class="ss-go" disabled>✓ ${S('equipped')}</button>`
                    : own ? `<button type="button" class="ss-go eqp" data-go>${S('equip')}</button>`
                    : lack ? `<button type="button" class="ss-go" disabled>${S('need')} ${lack} CR</button>`
                    : `<button type="button" class="ss-go" data-go>${S('buy')} · ${p.price} CR</button>`;
                pnl.innerHTML = `<div class="ss-card" dir="${L === 'ar' ? 'rtl' : 'ltr'}" role="dialog" aria-label="${S('style')}">
                    <div class="ss-head"><div><small>MTZ // ARMOR STUDIO</small><h2>${S('style')}</h2><p>${S('styleSub')}</p></div>
                      <div class="ss-cr"><i>CR</i>${cr}</div><button type="button" class="ss-x" data-x aria-label="${S('close')}">✕</button></div>
                    <div class="ss-grid">${KEYS.map(k => { const q = SK[k], o = owned.includes(k);
                        return `<button type="button" class="ss-sw t${q.tier}${o ? ' own' : ''}${k === sel ? ' sel' : ''}${k === wearing() ? ' eq' : ''}" data-k="${k}" aria-label="${nm(k)}"><i style="${swatch(q)}"></i><b>${nm(k)}</b><em>${o ? S('owned') : q.price + ' CR'}</em></button>`; }).join('')}</div>
                    <div class="ss-foot"><div class="ss-info"><b>${nm(sel)}${nm(sel) !== sel ? ` <small>${sel}</small>` : ''}</b><span class="ss-t${p.tier}">${tiers[p.tier]}</span></div>${btn}</div></div>`;
            }
            function pick(k) { if (!SK[k] || k === sel) return; sel = k; c.player.applySkin(k); AudioSys.playEquip(); render(); const f = pnl.querySelector(`[data-k="${k}"]`); f && f.focus({ preventScroll: true }); }
            function confirm() {
                const p = SK[sel];
                if (!owned.includes(sel)) {
                    if (!window.AxonShop || !window.AxonShop.spend(p.price)) { AudioSys.playDeny(); return; }
                    owned.push(sel); saveOwned(); burst = 1.2;
                    AudioSys.playUnlock();
                } else AudioSys.playEquip();
                c.store.set('skin', sel); render();
            }
            function open() {
                if (isOpen || c.getState() !== 'hub') return;
                isOpen = true; sel = wearing();
                saved = { r: cameraSystem.targetRadius, ph: cameraSystem.targetPhi };
                player.velocity.set(0, 0, 0); player.mesh.position.x = O.x + X; player.mesh.position.z = O.z + Z; player.mesh.rotation.y = -Math.PI / 2;
                cameraSystem.targetTheta = -Math.PI / 2; cameraSystem.targetPhi = 0.16; cameraSystem.targetRadius = 5.4; cameraSystem.manualTimer = 0;
                c.setState('hubmenu'); render(); pnl.classList.add('show'); stage.classList.add('in-studio'); AudioSys.playScan();
                setTimeout(() => { const f = pnl.querySelector('.ss-sw.sel'); f && f.focus({ preventScroll: true }); }, 60);
            }
            function close() {
                if (!isOpen) return; isOpen = false; pnl.classList.remove('show'); stage.classList.remove('in-studio');
                if (c.player.skin !== wearing()) c.player.applySkin(wearing());          // a colour only tried on comes off
                cameraSystem.targetRadius = saved.r; cameraSystem.targetPhi = saved.ph;
                if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input.flush(); }
                AudioSys.playUi('close');
            }
            pnl.addEventListener('click', e => {
                if (e.target === pnl || e.target.closest('[data-x]')) { close(); return; }
                const k = e.target.closest('[data-k]'); if (k) { pick(k.dataset.k); return; }
                if (e.target.closest('[data-go]')) confirm();
            });
            function key(e) {
                const i = KEYS.indexOf(sel), rtl = window.AxonI18n && window.AxonI18n.lang === 'ar';
                if (e.code === 'Escape') { e.stopImmediatePropagation(); close(); }
                else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); pick(KEYS[(i + ((e.code === 'ArrowRight') !== rtl ? 1 : -1) + KEYS.length) % KEYS.length]); }
                else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { e.preventDefault(); pick(KEYS[(i + (e.code === 'ArrowDown' ? 5 : -5) + KEYS.length) % KEYS.length]); }
                else if (e.code === 'Enter' || e.code === 'Space') { const a = document.activeElement; if (a && a.dataset && a.dataset.k) return; e.preventDefault(); confirm(); }
            }
            if (window.AxonI18n) window.AxonI18n.onChange(() => { if (isOpen) render(); });
            const portrait = () => stage.classList.contains('is-portrait');
            return {
                open, close, key, get isOpen() { return isOpen; },
                get shift() { return isOpen ? (portrait() ? [0, -0.9] : [1.25, 0]) : null; },
                update(dt) {
                    burst = Math.max(0, burst - dt);
                    const sp = 0.55 + burst * 2.2;
                    rings.forEach((r, i) => { r.position.y = 0.2 + ((t * sp + i / 3) % 1) * 4; r.material.opacity = 0.85 * (1 - ((t * sp + i / 3) % 1) * 0.7); });
                    beamS.material.opacity = 0.07 + Math.sin(t * 3) * 0.02 + burst * 0.25;
                    padGlow.color.setHex(isOpen ? 0x7ff3ff : 0x39d7ff);
                }
            };
        })();

        // ---------- enter / leave / deploy ----------
        const levelSpawn = player.mesh.position.clone(), levelYaw = player.mesh.rotation.y, levelTheta = cameraSystem.targetTheta;
        let lvlHidden = false;
        const hideLevel = h => {
            if (h === lvlHidden) return; lvlHidden = h;
            const mine = new Set(hubSolids);
            if (h) { lvlStash = c.solids.filter(b => !mine.has(b)); c.solids.length = 0; hubSolids.forEach(b => c.solids.push(b)); }   // in HQ: only the HQ's boxes
            else { c.solids.length = 0; (lvlStash || []).forEach(b => c.solids.push(b)); lvlStash = null; }                      // on a mission: only the mission's
            c.levelObjs.forEach(o => { if (h) { o.userData.hubVis = o.visible; o.visible = false; } else if (o.userData.hubVis !== undefined) o.visible = o.userData.hubVis; });
        };
        function show(v) {
            hideLevel(v);                                                // the facility stays hidden while you are in the HQ or outside
            on = v; root.visible = v;
            stage.classList.toggle('in-hub', v);
            if (v) zoneLabel();
            if (!v) { act.classList.remove('show'); say.classList.remove('show'); spot = null; }
        }
        // stepping out through the hangar door: the HQ disappears, the facility stays hidden
        function suspend() { on = false; root.visible = false; stage.classList.remove('in-hub'); act.classList.remove('show'); say.classList.remove('show'); spot = null; }
        const setZone = z => { here = z; labels(); zoneLabel(); stage.classList.toggle('in-train', z.id === 'trn'); };
        function enter() {
            setZone(ZONES[1]);                                             // arrive in the hangar bay
            show(true);
            player.mesh.position.set(O.x, O.y + 0.05, O.z + 52); player.lastSafePos.copy(player.mesh.position); player.velocity.set(0, 0, 0);
            player.mesh.rotation.y = Math.PI; cameraSystem.targetTheta = cameraSystem.theta = 0;
            c.roamLight.position.set(O.x + here.x, O.y + 9, O.z + here.z); c.roamLight.color.setHex(here.light); c.roamLight.intensity = baseLight; c.roamLight.userData.cur = null;
            crew.forEach(m => { m.said = false; });
            gates.forEach(d => { d.open = 0; d.near = false; });
            c.setState('hub'); if (gd) gd.enter();
            const U = window.AxonUI; if (U && U.tip) { U.tip('hq_terminal'); U.tip('hq_armory'); U.tip('saves'); }
        }
        // main-menu backdrop: the hero stands on the command deck facing the camera, key light in front of him
        const baseLight = c.roamLight.intensity;
        function preview() {
            setZone(ZONES[0]);
            show(true);
            player.mesh.position.set(O.x, O.y + 0.05, O.z + 7); player.velocity.set(0, 0, 0); player.mesh.rotation.y = 0;
            cameraSystem.targetTheta = cameraSystem.theta = 0;
            c.roamLight.position.set(O.x - 3, O.y + 5.5, O.z + 12); c.roamLight.color.setHex(0xbfe8ff); c.roamLight.intensity = 1.1; c.roamLight.userData.cur = null;
        }
        function toLevel() {
            show(false); c.roamLight.intensity = baseLight;
            player.mesh.position.copy(levelSpawn); player.lastSafePos.copy(levelSpawn); player.velocity.set(0, 0, 0);
            player.mesh.rotation.y = levelYaw; cameraSystem.targetTheta = cameraSystem.theta = levelTheta;
        }
        function deploy(i) {
            if (busy) return; busy = true;
            const m = MISSIONS[i];
            panel.classList.remove('show'); c.setState('hubmenu');
            AudioSys.playDeploy();
            const U = window.AxonUI;
            if (U && U.loading) {                          // briefing screen: the world swaps behind it, the countdown follows
                U.loading({ ctx: 'deploy', sub: `${num(i)} · ${S('sector')} ${m.sector} · ${U.ldLabel('deploy')}`, title: m.code.replace(' ', ' <em>') + '</em>',
                    mid: () => toLevel(), done: () => { busy = false; c.onDeploy(i); } });
                return;
            }
            fade.innerHTML = `<div><small><bdi>${num(i)}</bdi> · <bdi>${S('sector')} ${m.sector}</bdi></small><b>${m.code.replace(' ', ' <em>')}</em></b><span>${S('deploying')}</span></div>`;
            fade.classList.add('on');
            setTimeout(() => {
                toLevel();
                c.onDeploy(i);
                setTimeout(() => { fade.classList.remove('on'); busy = false; }, 650);
            }, 900);
        }

        // ---------- HQ minimap: every wing, corridor, gate, point of interest, crew and you ----------
        const minimapCanvas = document.getElementById('minimap');
        const mg = minimapCanvas ? minimapCanvas.getContext('2d') : null;
        let mapAcc = 0;
        const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
        function drawHubMap(player, dt) {
            if (!mg) return;
            mapAcc += dt; if (mapAcc < 0.08) return; mapAcc = 0;
            const W = minimapCanvas.width, Hh = minimapCanvas.height, R = W / 2 - 2;
            const cx = W / 2, cy = Hh / 2, VIEW = 74;
            const s = (2 * R) / VIEW;
            const lx = player.mesh.position.x - O.x, lz = player.mesh.position.z - O.z;
            const X = x => cx + (x - lx) * s, Y = z => cy + (z - lz) * s;

            mg.clearRect(0, 0, W, Hh);
            mg.save();
            mg.beginPath(); mg.arc(cx, cy, R, 0, Math.PI * 2);
            mg.fillStyle = 'rgba(4,12,24,0.72)'; mg.fill();
            mg.clip();

            // corridors
            mg.fillStyle = 'rgba(57,215,255,0.10)'; mg.strokeStyle = 'rgba(57,215,255,0.35)'; mg.lineWidth = 1;
            HALLS.forEach(hl => {
                const w = hl.alongZ ? 8 : hl.len, d = hl.alongZ ? hl.len : 8;
                mg.fillRect(X(hl.x - w / 2), Y(hl.z - d / 2), w * s, d * s);
                if (hl.alongZ) { mg.beginPath(); mg.moveTo(X(hl.x - 4), Y(hl.z - d / 2)); mg.lineTo(X(hl.x - 4), Y(hl.z + d / 2)); mg.moveTo(X(hl.x + 4), Y(hl.z - d / 2)); mg.lineTo(X(hl.x + 4), Y(hl.z + d / 2)); mg.stroke(); }
                else { mg.beginPath(); mg.moveTo(X(hl.x - w / 2), Y(hl.z - 4)); mg.lineTo(X(hl.x + w / 2), Y(hl.z - 4)); mg.moveTo(X(hl.x - w / 2), Y(hl.z + 4)); mg.lineTo(X(hl.x + w / 2), Y(hl.z + 4)); mg.stroke(); }
            });
            // wings (the one you are in glows brighter)
            ZONES.forEach(r => {
                const cur = r === here;
                mg.fillStyle = rgba(r.col, cur ? 0.16 : 0.07); mg.strokeStyle = rgba(r.col, cur ? 0.85 : 0.4); mg.lineWidth = cur ? 1.6 : 1;
                mg.fillRect(X(r.x - r.hw), Y(r.z - r.hd), r.hw * 2 * s, r.hd * 2 * s);
                mg.strokeRect(X(r.x - r.hw), Y(r.z - r.hd), r.hw * 2 * s, r.hd * 2 * s);
            });
            // gates: amber = shut, green = open
            mg.lineWidth = 3;
            gates.forEach(d => {
                mg.strokeStyle = d.open > 0.5 ? '#5cf0a0' : '#ffa826';
                mg.beginPath();
                if (d.alongZ) { mg.moveTo(X(d.x - 4), Y(d.z)); mg.lineTo(X(d.x + 4), Y(d.z)); }
                else { mg.moveTo(X(d.x), Y(d.z - 4)); mg.lineTo(X(d.x), Y(d.z + 4)); }
                mg.stroke();
            });
            // wing names
            mg.font = `600 8px ${FONT}`; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.shadowColor = '#000'; mg.shadowBlur = 3;
            ZONES.forEach(r => { mg.fillStyle = rgba(r.col, r === here ? 0.95 : 0.6); mg.fillText(S(r.key), X(r.x), Y(r.z - r.hd + 3)); });
            // points of interest
            SPOTS.forEach(sp => {
                const isHover = (spot === sp);
                mg.fillStyle = isHover ? 'rgba(255,168,38,0.45)' : 'rgba(255,168,38,0.2)';
                mg.strokeStyle = '#ffa826'; mg.lineWidth = 1;
                mg.beginPath(); mg.arc(X(sp.x), Y(sp.z), Math.max(3, sp.r * s), 0, Math.PI * 2); mg.fill(); mg.stroke();
            });
            mg.font = `600 10px ${FONT}`;
            const lab = [];
            SPOTS.forEach(sp => {
                if (spot !== sp && lab.some(q => Math.abs(q[0] - X(sp.x)) < 44 && Math.abs(q[1] - Y(sp.z)) < 13)) return; lab.push([X(sp.x), Y(sp.z)]);   // no two names on top of each other
                mg.fillStyle = spot === sp ? '#ffa826' : '#e6eef6';
                const textKey = { missions: 'map_term', armory: 'map_arm', style: 'map_sty', exit: 'map_exit', explore: 'map_exp', forge: 'map_forge', look: 'map_look', train: 'map_trn', chief: 'map_chief' }[sp.id];
                mg.fillText(S(textKey), X(sp.x), Y(sp.z) + Math.max(3, sp.r * s) + 7);
            });
            mg.shadowBlur = 0;
            // crew
            mg.fillStyle = '#b48cff';
            crew.forEach(cr => { mg.beginPath(); mg.arc(X(cr.x), Y(cr.z), 2.2, 0, Math.PI * 2); mg.fill(); });
            if (gd) gd.dot(mg, X, Y, lx, lz);
            // player arrow (always centred)
            const ry = player.mesh.rotation.y;
            mg.save(); mg.translate(cx, cy);
            mg.rotate(Math.atan2(Math.sin(ry), Math.cos(ry)) * -1 + Math.PI);
            mg.fillStyle = '#ffa826'; mg.strokeStyle = '#1a0d00'; mg.lineWidth = 1;
            mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
            mg.restore();
            mg.restore();
            // rim tinted by the current wing
            mg.lineWidth = 2; mg.strokeStyle = rgba(here.col, 0.5);
            mg.beginPath(); mg.arc(cx, cy, R, 0, Math.PI * 2); mg.stroke();
        }

        // ---------- per frame (only while the HQ is shown) ----------
        const pp = new THREE.Vector3(), _lp = new THREE.Vector3(), _lc = new THREE.Color();
        function update(dt, time) {
            t += dt;
            holo.rotation.y += dt * 0.35; ico.rotation.x += dt * 0.2; core.rotation.y -= dt * 1.2;
            ringA.rotation.x = 1.2 + Math.sin(t * 0.7) * 0.25; ringA.rotation.y += dt * 0.8; ringB.rotation.x = 1.9; ringB.rotation.z -= dt * 0.5;
            holo.position.y = O.y + 9.9 + Math.sin(t * 1.3) * 0.15; spinRing.rotation.z += dt * 0.6; padSpin.rotation.z -= dt * 0.4;
            beam.material.opacity = 0.045 + Math.sin(t * 2.1) * 0.012;
            opsGlobe.rotation.y += dt * 0.5; opsGlobe.rotation.x = Math.sin(t * 0.4) * 0.3; opsBeam.material.opacity = 0.06 + Math.sin(t * 2.6) * 0.02;
            scan.position.y = O.y + SY + SH / 2 - ((t * 0.35) % 1) * SH;
            hi.material.opacity = 0.55 + Math.sin(t * 4) * 0.35;
            marker.position.y = O.y + 3.6 + Math.sin(t * 2.6) * 0.18; marker.rotation.y += dt * 2;
            runner.position.z = O.z + CH0 - ((t * 9) % (CH0 - CH1));
            podRings.forEach((r, i) => { r.position.y = O.y + 0.6 + ((t * 0.9 + i * 0.33) % 1) * 3.4; });
            studio.update(dt);
            pp.copy(player.mesh.position); const lx = pp.x - O.x, lz = pp.z - O.z;
            // which wing you are in (corridors keep the last one)
            const zn = zoneAt(lx, lz);
            if (zn && zn !== here) { setZone(zn); if (c.getState() === 'hub') AudioSys.playZone(); }
            if (c.getState() !== 'title') {                                // the key light drifts into the wing you walk into
                const k = Math.min(1, dt * 2);
                c.roamLight.position.lerp(_lp.set(O.x + here.x, O.y + 9 + (here.y || 0), O.z + here.z), k);
                c.roamLight.color.lerp(_lc.setHex(here.light), k);
            }
            // blast gates: open when you are near, close behind you
            for (const d of gates) {
                const pd = (lx - d.x) ** 2 + (lz - d.z) ** 2, near = pd < 81 || !!(gd && gd.at(d.x, d.z)) || !!(window.AxonCoop && window.AxonCoop.nearAny(O.x + d.x, O.z + d.z, 81));   // you, KENDEL or a teammate
                if (near !== !!d.near && pd < 1600 && c.getState() === 'hub') AudioSys.playSlideDoor();
                d.near = near;
                d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 7);
                const k = Math.max(0.06, 1 - d.open * 0.94);
                d.panels.forEach(p => { p.scale.x = k; });
                d.lamp.material.color.setHex(d.open > 0.5 ? 0x5cf0a0 : 0xffa826);
            }
            // interaction spots
            let near = null;
            for (const s of SPOTS) if ((lx - s.x) ** 2 + (lz - s.z) ** 2 < s.r * s.r) near = s;
            spotRings.forEach((z, i) => { z.scale.setScalar(SPOTS[i] === near ? 1.15 + Math.sin(t * 6) * 0.05 : 1); });
            zoneM.opacity = near ? 1 : 0.55 + Math.sin(t * 3) * 0.2;
            if (near !== spot) { spot = near; labels(); act.classList.toggle('show', !!spot && c.getState() === 'hub'); if (spot) AudioSys.playSpot();
                if (spot && spot.id === 'style') setTimeout(() => { if (spot && spot.id === 'style') studio.open(); }, 350);
                if (spot && spot.id === 'look') setTimeout(() => { if (spot && spot.id === 'look' && c.onLook) c.onLook(); }, 350);   // step onto the pad → the bio-lab opens
                if (spot && spot.id === 'exit') setTimeout(() => { if (spot && spot.id === 'exit' && c.getState() === 'hub' && c.onExit) c.onExit(); }, 300); }   // step into the capsule → the studio opens
            else if (spot) act.classList.toggle('show', c.getState() === 'hub');
            // operatives: breathe, turn their heads to you, say a line when you walk up
            for (const m of crew) {
                const dx = lx - m.x, dz = lz - m.z, d2 = dx * dx + dz * dz;
                // other wings: not drawn. The rooms are closed boxes, so someone in another room is behind a wall unless you
                // are near enough to look through an open gate (26 m) — phones were drawing 3–4 hidden people (60 000 triangles)
                if (m.zone === undefined) m.zone = zoneAt(m.x, m.z);
                m.g.visible = d2 < 48 * 48 && (d2 < 26 * 26 || !zn || !m.zone || m.zone === zn); if (!m.g.visible) continue;
                m.g.scale.y = m.scale * (1 + Math.sin(time * 1.9 + m.ph) * 0.005);
                let want = 0;
                if (d2 < 90) { let a = Math.atan2(dx, dz) - m.face; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.9) want = Math.max(-1, Math.min(1, a)); }
                m.yaw += (want - m.yaw) * Math.min(1, dt * 4);
                m.hg.quaternion.copy(qY.setFromAxisAngle(UP, m.yaw)).multiply(m.baseQ);
                if (d2 < 12 && !m.said) { m.said = true; AudioSys.playComm(); say.innerHTML = `<b>${m.name}</b>${S('say')[m.line]}`; say.classList.add('show'); sayT = 3.2; }
            }
            if (sayT > 0 && (sayT -= dt) <= 0) say.classList.remove('show');
            if (trn) trn.update(dt, time, lx, lz);
            if (gd) gd.update(dt, time, lx, lz);
            if (cnl) cnl.update(dt, time, lx, lz, gd);

            drawHubMap(c.player, dt);
        }

        hubSolids = c.solids.slice(n0);
        return {
            root, enter, update, S, preview, toLevel, suspend, deploy,   // deploy(i): co-op teammates follow a deploy started by another player
            addSolids(a) { a.forEach(b => { hubSolids.push(b); if (lvlHidden || !lvlStash) c.solids.push(b); }); },   // forge.js
            get camShift() { return studio.shift; },
            get on() { return on; },
            // weapons stay holstered inside HQ
            holster(Input) { for (const a of ['Attack', 'Shoot', 'Lock']) { if (a === 'Attack' && here.id === 'trn') continue; Input.pressed[a] = false; Input.held[a] = false; } },   // the saber is allowed in the training wing
            cleared(i) { if (i + 1 >= progress) { progress = i + 2; c.store.set('progress', String(progress)); drawScreen(); placeHi(); } }
        };
    }

    return { create, MISSIONS, S, bakeCrew, PALETTES };
})();
