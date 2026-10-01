// =====================================================================
//  AXON BREACH — WEAPON FORGE (a corner of the ARMORY WING in the HQ)
//   • A wall of eight neon weapons spinning as holograms, an anvil and a glowing hearth.
//   • Walk up and tap "Weapon forge": the camera turns to the wall, the forge panel slides in.
//   • Z-SABER — the blade the hero carries — is the only one open: upgrade it for more power and
//     a longer edge (the same upgrade as SABER EDGE in the armory shop, one level shared by both).
//   • Thunder Axe, Mushajo, War Club, Void Scythe, Photon Lance, Twin Fangs, Nova Hammer:
//     locked for now, shown in full colour so you know what is coming.
//  Loaded by index.html after explore.js, before game.js.
// =====================================================================
'use strict';

window.AxonForge = (function () {
    const L = {
        en: { title: 'WEAPON FORGE', sub: 'Pick a weapon · upgrade your saber', power: 'POWER', speed: 'SPEED', reach: 'REACH', upgrade: 'Upgrade', max: 'MAX LEVEL', locked: 'LOCKED',
              soon: 'Unlocks in a future update', equipped: 'EQUIPPED', need: 'Need', lv: 'LV', close: 'Close', done: 'SABER UPGRADED',
              n: { saber: 'Z-SABER', axe: 'THUNDER AXE', mushajo: 'MUSHAJO', club: 'WAR CLUB', scythe: 'VOID SCYTHE', lance: 'PHOTON LANCE', fangs: 'TWIN FANGS', hammer: 'NOVA HAMMER' },
              d: { saber: 'Your plasma blade. Upgrade it: more power and a longer edge.', axe: 'Crackling heavy axe: slow swings that split armour and chain lightning.', mushajo: 'Twin neon batons on a chain: a storm of fast, spinning hits.', club: 'Spiked battle club: stuns with every blow and shatters shields.',
                   scythe: 'A crescent of void energy: wide sweeping arcs that reap whole groups.', lance: 'Photon spear with the longest reach: piercing thrusts from a safe range.', fangs: 'Twin daggers built for speed: dash-cuts and critical backstabs.', hammer: 'A star-forged hammer: ground slams that blast everything around you.' } },
        ar: { title: 'ورشة الأسلحة', sub: 'اختر سلاحاً · طوّر سيفك', power: 'القوة', speed: 'السرعة', reach: 'المدى', upgrade: 'تطوير', max: 'أقصى مستوى', locked: 'مقفل',
              soon: 'يُفتح في تحديث قادم', equipped: 'مجهّز', need: 'ينقصك', lv: 'مستوى', close: 'إغلاق', done: 'تم تطوير السيف',
              n: { saber: 'السيف الضوئي', axe: 'فأس الرعد', mushajo: 'موشاجو', club: 'الهراوة القتالية', scythe: 'منجل العدم', lance: 'رمح الفوتون', fangs: 'الأنياب التوأم', hammer: 'مطرقة نوفا' },
              d: { saber: 'نصلك البلازمي. طوّره: قوة أكبر ونصل أطول.', axe: 'فأس ثقيلة يتطاير منها البرق: ضربات بطيئة تشق الدروع وتطلق صواعق متسلسلة.', mushajo: 'عصوان نيون تربطهما سلسلة: عاصفة من الضربات الدوّارة السريعة.', club: 'هراوة قتالية مسننة: تشلّ الخصم مع كل ضربة وتحطّم الدروع.',
                   scythe: 'هلال من طاقة العدم: أقواس واسعة تحصد المجموعات بالكامل.', lance: 'رمح فوتوني بأطول مدى: طعنات خارقة من مسافة آمنة.', fangs: 'خنجران صُنعا للسرعة: ضربات اندفاع وطعنات حرجة من الخلف.', hammer: 'مطرقة مصهورة من قلب نجم: ضربات أرضية تفجّر كل ما حولك.' } },
        es: { title: 'FORJA DE ARMAS', sub: 'Elige un arma · mejora tu sable', power: 'PODER', speed: 'VELOCIDAD', reach: 'ALCANCE', upgrade: 'Mejorar', max: 'NIVEL MÁX.', locked: 'BLOQUEADA',
              soon: 'Se desbloquea en una próxima actualización', equipped: 'EQUIPADA', need: 'Faltan', lv: 'NV', close: 'Cerrar', done: 'SABLE MEJORADO',
              n: { saber: 'SABLE Z', axe: 'HACHA TRUENO', mushajo: 'MUSHAJO', club: 'MAZA DE GUERRA', scythe: 'GUADAÑA DEL VACÍO', lance: 'LANZA FOTÓNICA', fangs: 'COLMILLOS GEMELOS', hammer: 'MARTILLO NOVA' },
              d: { saber: 'Tu hoja de plasma. Mejórala: más poder y un filo más largo.', axe: 'Hacha pesada eléctrica: golpes lentos que parten blindajes y encadenan rayos.', mushajo: 'Dos bastones de neón unidos por cadena: una tormenta de golpes giratorios.', club: 'Maza con púas: aturde en cada golpe y rompe escudos.',
                   scythe: 'Una media luna de energía del vacío: arcos amplios que siegan grupos enteros.', lance: 'Lanza de fotones con el mayor alcance: estocadas perforantes a distancia segura.', fangs: 'Dagas gemelas hechas para la velocidad: cortes en carrera y críticos por la espalda.', hammer: 'Un martillo forjado en una estrella: golpes al suelo que arrasan todo a tu alrededor.' } },
        zh: { title: '武器工坊', sub: '选择武器 · 强化光剑', power: '威力', speed: '速度', reach: '范围', upgrade: '强化', max: '已满级', locked: '未解锁',
              soon: '将在后续更新中解锁', equipped: '已装备', need: '还差', lv: '等级', close: '关闭', done: '光剑已强化',
              n: { saber: 'Z光剑', axe: '雷霆战斧', mushajo: 'MUSHAJO', club: '战棍', scythe: '虚空镰刀', lance: '光子长枪', fangs: '双生獠牙', hammer: '新星战锤' },
              d: { saber: '你的等离子光刃。强化它：更强的威力，更长的刃。', axe: '雷光重斧：挥砍缓慢，却能劈开装甲并释放连锁闪电。', mushajo: '锁链相连的双霓虹短棍：迅疾的旋转连击风暴。', club: '尖刺战棍：每一击都能震慑敌人、粉碎护盾。',
                   scythe: '虚空能量之月：大范围横扫，收割成群敌人。', lance: '射程最长的光子长枪：在安全距离发动贯穿突刺。', fangs: '为速度而生的双匕：冲刺斩与致命背刺。', hammer: '星核锻造的战锤：砸地冲击，横扫四周一切。' } },
        ja: { title: 'ウェポンフォージ', sub: '武器を選ぶ · セイバーを強化', power: '威力', speed: '速さ', reach: 'リーチ', upgrade: '強化', max: '最大レベル', locked: 'ロック中',
              soon: '今後のアップデートで解放', equipped: '装備中', need: '不足', lv: 'Lv', close: '閉じる', done: 'セイバー強化完了',
              n: { saber: 'Zセイバー', axe: 'サンダーアクス', mushajo: 'ムシャジョー', club: 'ウォークラブ', scythe: 'ヴォイドサイス', lance: 'フォトンランス', fangs: 'ツインファング', hammer: 'ノヴァハンマー' },
              d: { saber: '君のプラズマブレード。強化で威力アップ、刃も長くなる。', axe: '雷をまとう重斧。遅いが装甲を割り、連鎖雷を放つ。', mushajo: '鎖でつながる二本のネオン棍。高速回転の連撃。', club: 'トゲ付き戦棍。一撃ごとに怯ませ、シールドを砕く。',
                   scythe: '虚無のエネルギーの三日月。広範囲の薙ぎ払いで敵群を刈る。', lance: '最長リーチのフォトン槍。安全な間合いから貫く突き。', fangs: '速さのための双短剣。ダッシュ斬りと背後からのクリティカル。', hammer: '星で鍛えたハンマー。地面への一撃で周囲を吹き飛ばす。' } }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const S = k => { const d = L[lang()] || L.en; return d[k] !== undefined ? d[k] : L.en[k]; };
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    // the eight weapons: neon colour, stats 0..5 (the saber's grow with its level), open or locked
    const WEAPONS = [
        { id: 'saber', col: 0xffa826, st: [2, 5, 2], open: true },
        { id: 'axe', col: 0x39d7ff, st: [5, 2, 3] }, { id: 'mushajo', col: 0xff2a9d, st: [2, 5, 2] }, { id: 'club', col: 0x7dff5a, st: [4, 3, 2] },
        { id: 'scythe', col: 0xb48cff, st: [4, 3, 5] }, { id: 'lance', col: 0x9fe8ff, st: [3, 3, 5] }, { id: 'fangs', col: 0xff3a5a, st: [2, 5, 1] }, { id: 'hammer', col: 0xffe066, st: [5, 1, 3] }
    ];
    const hex = n => '#' + n.toString(16).padStart(6, '0');

    // ---------- 2D neon icons (panel cards and the big preview), drawn along a 200-unit vertical axis ----------
    const ICON = {
        saber(g, c) { rr(g, -7, 38, 14, 34, 4, '#2a3140'); rr(g, -20, 30, 40, 8, 3, '#8a93a3'); blade(g, c, () => rrPath(g, -6, -78, 12, 110, 6)); },
        axe(g, c) { rr(g, -5, -70, 10, 150, 4, '#2a3140'); rr(g, -8, 40, 16, 34, 4, '#454e5e'); blade(g, c, () => { g.beginPath(); g.moveTo(5, -70); g.quadraticCurveTo(82, -66, 64, 2); g.quadraticCurveTo(44, -24, 5, -18); g.closePath(); g.moveTo(-5, -62); g.quadraticCurveTo(-46, -54, -40, -18); g.quadraticCurveTo(-26, -30, -5, -28); g.closePath(); }); bolt(g, 36, -40); },
        mushajo(g, c) {
            g.save(); g.rotate(0.35); blade(g, c, () => rrPath(g, -8, -80, 16, 70, 7)); rr(g, -9, -84, 18, 10, 3, '#8a93a3'); g.restore();
            g.save(); g.translate(20, 20); g.rotate(-0.7); blade(g, c, () => rrPath(g, -8, 0, 16, 70, 7)); rr(g, -9, -4, 18, 10, 3, '#8a93a3'); g.restore();
            g.fillStyle = '#c9d2de'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-6 + k * 5, -12 + k * 6, 3, 0, Math.PI * 2); g.fill(); }
        },
        club(g, c) { g.fillStyle = '#2a3140'; g.beginPath(); g.moveTo(-6, 80); g.lineTo(6, 80); g.lineTo(18, -60); g.lineTo(-18, -60); g.closePath(); g.fill(); rr(g, -8, 44, 16, 36, 4, '#454e5e');
            blade(g, c, () => { g.beginPath(); for (const y of [-54, -28, -2]) { const w = 18 - (y + 54) * 0.12; g.rect(-w - 2, y - 3, w * 2 + 4, 6); for (const s of [-1, 1]) { g.moveTo(s * (w + 2), y - 5); g.lineTo(s * (w + 16), y); g.lineTo(s * (w + 2), y + 5); } } }); },
        scythe(g, c) { rr(g, -4, -80, 8, 165, 4, '#2a3140'); blade(g, c, () => { g.beginPath(); g.moveTo(2, -78); g.quadraticCurveTo(-90, -86, -96, -8); g.quadraticCurveTo(-66, -60, 2, -58); g.closePath(); }); },
        lance(g, c) { rr(g, -4, -40, 8, 124, 4, '#2a3140'); blade(g, c, () => { g.beginPath(); g.moveTo(0, -96); g.lineTo(14, -48); g.lineTo(0, -36); g.lineTo(-14, -48); g.closePath(); g.rect(-12, -30, 24, 5); g.rect(-10, -18, 20, 4); }); },
        fangs(g, c) { for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.55); rr(g, -5, 30, 10, 36, 4, '#2a3140'); rr(g, -14, 24, 28, 7, 3, '#8a93a3'); blade(g, c, () => { g.beginPath(); g.moveTo(-6, 24); g.quadraticCurveTo(-10, -30, s * 12, -70); g.quadraticCurveTo(12, -20, 6, 24); g.closePath(); }); g.restore(); } },
        hammer(g, c) { rr(g, -5, -30, 10, 112, 4, '#2a3140'); rr(g, -48, -70, 96, 44, 8, '#3a4252'); blade(g, c, () => { rrPath(g, -54, -70, 8, 44, 3); rrPath(g, 46, -70, 8, 44, 3); g.rect(-40, -52, 80, 6); }); }
    };
    function rrPath(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function rr(g, x, y, w, h, r, fill) { rrPath(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); }
    function blade(g, c, path) {                                     // neon: wide coloured glow, then a hot white core
        g.save(); path(); g.shadowColor = c; g.shadowBlur = 26; g.fillStyle = c; g.fill(); g.shadowBlur = 10; g.fill();
        g.globalAlpha = 0.55; g.shadowBlur = 0; g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.stroke(); g.restore();
    }
    function bolt(g, x, y) { g.save(); g.translate(x, y); g.fillStyle = '#ffffff'; g.shadowColor = '#fff'; g.shadowBlur = 8; g.beginPath(); g.moveTo(4, -14); g.lineTo(-6, 2); g.lineTo(0, 2); g.lineTo(-4, 14); g.lineTo(6, -2); g.lineTo(0, -2); g.closePath(); g.fill(); g.restore(); }
    function iconURL(w, size, tilt = -0.6) {
        const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
        g.translate(size / 2, size / 2); g.rotate(tilt); g.scale(size / 220, size / 220); ICON[w.id](g, hex(w.col));
        return cv.toDataURL();
    }

    function create(c) {
        const { THREE, stage, AudioSys, player, cameraSystem } = c;
        const O = new THREE.Vector3(0, 0, 400);                         // the HQ's origin
        const FX = 46.25, FZ = 13.2;                                    // weapon wall: armory wing, south side
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const root = new THREE.Group(); if (c.hub && c.hub.root) c.hub.root.add(root);
        const shop = () => window.AxonShop;
        const lvl = () => (shop() && shop().level ? shop().level('saber') : 0);
        const std = (color, m = 0.8, r = 0.3) => new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r });
        const metal = std(0x1c2230), trim = std(0x8a93a3, 0.9, 0.25);
        const add = (o, x, y, z) => { o.position.copy(V(x, y, z)); root.add(o); return o; };

        // ---------- the corner: wall panel, shelves, anvil and hearth ----------
        const wallTex = new THREE.CanvasTexture((() => {
            const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
            g.fillStyle = '#070b16'; g.fillRect(0, 0, 512, 256); g.strokeStyle = 'rgba(57,215,255,0.16)'; g.lineWidth = 1.5;
            for (let y = 0; y < 256 + 20; y += 22) for (let x = 0; x < 512 + 26; x += 38) { const ox = (Math.floor(y / 22) % 2) * 19; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + ox + Math.cos(a) * 12, y + Math.sin(a) * 12); } g.closePath(); g.stroke(); }
            return cv;
        })()); wallTex.encoding = THREE.sRGBEncoding;
        const panel = add(new THREE.Mesh(new THREE.PlaneGeometry(12.6, 6.4), new THREE.MeshBasicMaterial({ map: wallTex })), FX, 3.35, FZ + 0.7); panel.rotation.y = Math.PI;
        const edgeM = new THREE.MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false });
        [[0, 6.6, 12.8, 0.08], [0, 0.1, 12.8, 0.08], [-6.35, 3.35, 0.08, 6.5], [6.35, 3.35, 0.08, 6.5]].forEach(([x, y, w, h]) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), edgeM), FX + x, y, FZ + 0.66));
        const slots = [];
        WEAPONS.forEach((w, i) => {
            const col = i % 4, row = Math.floor(i / 4), x = FX - (col - 1.5) * 2.95, y = row ? 1.95 : 4.55;   // seen from the room: +x is on the left
            slots.push({ x, y });
            add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.9), metal), x, y - 1.05, FZ + 0.2);
            add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(w.col).convertSRGBToLinear(), toneMapped: false })), x, y - 0.98, FZ - 0.26);
        });
        const anvil = new THREE.Group(); add(anvil, FX - 3.4, 0, 8.8);   // anvil and hearth off to one side: the wall stays in clear view
        const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; anvil.add(m); return m; };
        part(new THREE.BoxGeometry(1.4, 0.7, 0.9), metal, 0, 0.35, 0); part(new THREE.BoxGeometry(0.7, 0.35, 0.55), metal, 0, 0.87, 0);
        part(new THREE.BoxGeometry(2.1, 0.32, 0.8), trim, 0, 1.2, 0); part(new THREE.ConeGeometry(0.3, 0.9, 4).rotateZ(Math.PI / 2), trim, 1.45, 1.2, 0);
        const hearthM = new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false });
        const hearth = part(new THREE.BoxGeometry(1.3, 0.12, 0.7), hearthM, -3.3, 0.95, 0.2); part(new THREE.BoxGeometry(1.6, 0.9, 1.0), metal, -3.3, 0.45, 0.2);
        const embers = part(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }), -3.3, 1.0, 0.2);
        const box = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1));   // the anvil and hearth block the way (HQ boxes)
        const myBoxes = [box(FX - 4.5, 0, 8.35, FX - 1.5, 1.4, 9.25), box(FX - 7.5, 0, 8.5, FX - 5.9, 1.0, 9.6)];
        if (c.hub && c.hub.addSolids) c.hub.addSolids(myBoxes);
        const signCv = document.createElement('canvas'); signCv.width = 512; signCv.height = 96;
        const signTex = new THREE.CanvasTexture(signCv); signTex.encoding = THREE.sRGBEncoding;
        const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(6, 1.12), new THREE.MeshBasicMaterial({ map: signTex, transparent: true })), FX, 7.35, FZ + 0.6); sign.rotation.y = Math.PI;
        function paintSign() {
            const g = signCv.getContext('2d'); g.clearRect(0, 0, 512, 96); g.fillStyle = 'rgba(8,6,16,0.9)'; g.fillRect(0, 0, 512, 96);
            g.strokeStyle = '#ff7a2a'; g.lineWidth = 4; g.strokeRect(3, 3, 506, 90); g.direction = lang() === 'ar' ? 'rtl' : 'ltr';
            g.font = `700 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff7a2a'; g.shadowBlur = 16; g.fillStyle = '#ffd2a8';
            g.fillText(S('title'), 256, 50, 480); signTex.needsUpdate = true;
        }
        paintSign();

        // ---------- the eight neon weapons (hologram-spun on the wall) ----------
        const lin = col => new THREE.Color(col).convertSRGBToLinear();                     // sRGB output: pick the colour in linear space → deep, saturated neon
        const neon = col => ({ core: new THREE.MeshBasicMaterial({ color: lin(col).lerp(new THREE.Color(0xffffff), 0.35), toneMapped: false }), neon: new THREE.MeshBasicMaterial({ color: lin(col), toneMapped: false }),   // untouched by tone mapping: full neon
            halo: new THREE.MeshBasicMaterial({ color: lin(col), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }) });
        const extr = (pts, depth = 0.07) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) { const p = pts[k]; if (p.length === 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]); } sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); return g; };
        const M = (grp, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.setScalar(s); grp.add(m); return m; };
        const cyl = (r, h, rb = r) => new THREE.CylinderGeometry(r, rb, h, 12);
        const haloOf = (grp, geo, mat, x, y, z, rz = 0) => M(grp, geo, mat, x, y, z, 0, 0, rz, 1.18);
        const BUILD = {
            saber(g, n) { M(g, cyl(0.07, 0.45), metal, 0, -0.85); M(g, new THREE.BoxGeometry(0.34, 0.07, 0.14), trim, 0, -0.6); M(g, new THREE.TorusGeometry(0.08, 0.025, 6, 16), n.neon, 0, -0.55, 0, Math.PI / 2);
                const bg = new THREE.BoxGeometry(0.07, 1.5, 0.12); M(g, bg, n.core, 0, 0.2); M(g, new THREE.BoxGeometry(0.2, 1.6, 0.3), n.halo, 0, 0.2); },
            axe(g, n) { M(g, cyl(0.05, 1.9), metal); M(g, cyl(0.07, 0.35), trim, 0, -0.75); const hd = extr([[0.05, 0.9], [0.8, 0.88, 0.62, 0.2], [0.42, 0.45, 0.05, 0.4]]); M(g, hd, n.neon); haloOf(g, hd, n.halo, -0.01, -0.02, 0);
                const bk = extr([[-0.05, 0.85], [-0.45, 0.78, -0.4, 0.42], [-0.26, 0.55, -0.05, 0.55]]); M(g, bk, n.neon); M(g, extr([[0.34, 0.74], [0.2, 0.58], [0.3, 0.58], [0.24, 0.44], [0.4, 0.62], [0.3, 0.62]], 0.1), n.core); },
            mushajo(g, n) { const st = cyl(0.07, 0.8); M(g, st, n.neon, -0.18, 0.4, 0, 0, 0, 0.3); M(g, st, n.neon, 0.24, -0.38, 0, 0, 0, -0.7); const cap = cyl(0.085, 0.1); M(g, cap, trim, -0.3, 0.78, 0, 0, 0, 0.3); M(g, cap, trim, 0.52, -0.66, 0, 0, 0, -0.7);
                const hs = cyl(0.13, 0.84); M(g, hs, n.halo, -0.18, 0.4, 0, 0, 0, 0.3); M(g, hs, n.halo, 0.24, -0.38, 0, 0, 0, -0.7);
                const link = new THREE.TorusGeometry(0.035, 0.012, 5, 10); for (let k = 0; k < 5; k++) M(g, link, trim, -0.06 + k * 0.045, 0.02 - k * 0.05, 0, 0, k % 2 ? Math.PI / 2 : 0, 0); },
            club(g, n) { M(g, cyl(0.17, 1.5, 0.06), metal, 0, 0.1); M(g, cyl(0.07, 0.4), trim, 0, -0.78); const sp = new THREE.ConeGeometry(0.05, 0.2, 5);
                [0.25, 0.5, 0.75].forEach(y => { const r = 0.08 + y * 0.1; M(g, new THREE.TorusGeometry(r + 0.02, 0.03, 6, 20), n.neon, 0, y, 0, Math.PI / 2); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; M(g, sp, n.core, Math.cos(a) * (r + 0.12), y, Math.sin(a) * (r + 0.12), 0, 0, 0).lookAt(Math.cos(a) * 3, y, Math.sin(a) * 3); } });
                M(g, cyl(0.26, 1.0, 0.12), n.halo, 0, 0.45); },
            scythe(g, n) { M(g, cyl(0.045, 2.0), metal); M(g, cyl(0.06, 0.2), trim, 0, 0.95); const bl = extr([[0.02, 0.95], [-0.95, 1.05, -1.0, 0.1], [-0.7, 0.72, 0.02, 0.75]]); M(g, bl, n.neon); haloOf(g, bl, n.halo, 0.04, -0.05, 0); M(g, new THREE.TorusGeometry(0.08, 0.02, 6, 16), n.core, 0, -0.95, 0, Math.PI / 2); },
            lance(g, n) { M(g, cyl(0.04, 1.9), metal, 0, -0.15); const tip = new THREE.OctahedronGeometry(1, 0); M(g, tip, n.core, 0, 1.05, 0).scale.set(0.13, 0.42, 0.06); M(g, tip, n.halo, 0, 1.05, 0).scale.set(0.24, 0.55, 0.14);
                [0.56, 0.44].forEach((y, k) => M(g, new THREE.TorusGeometry(0.1 - k * 0.02, 0.025, 6, 16), n.neon, 0, y, 0, Math.PI / 2)); M(g, new THREE.ConeGeometry(0.06, 0.2, 8), trim, 0, -1.2, 0, Math.PI); },
            fangs(g, n) { [-1, 1].forEach(s => { const d = new THREE.Group(); d.rotation.z = s * 0.5; g.add(d); M(d, cyl(0.045, 0.34), metal, 0, -0.55); M(d, new THREE.BoxGeometry(0.26, 0.05, 0.08), trim, 0, -0.36);
                const bl = extr([[-0.06, -0.33], [-0.09, 0.3, s * 0.1, 0.72], [0.1, 0.2, 0.06, -0.33]]); M(d, bl, n.neon); M(d, bl, n.halo, 0, 0, 0, 0, 0, 0, 1.15); }); },
            hammer(g, n) { M(g, cyl(0.05, 1.4), metal, 0, -0.25); M(g, cyl(0.07, 0.3), trim, 0, -0.85); M(g, new THREE.BoxGeometry(0.85, 0.42, 0.42), metal, 0, 0.62);
                [-1, 1].forEach(s => M(g, new THREE.BoxGeometry(0.04, 0.44, 0.44), n.core, s * 0.445, 0.62)); M(g, new THREE.BoxGeometry(0.87, 0.06, 0.44), n.neon, 0, 0.62); M(g, new THREE.BoxGeometry(1.05, 0.6, 0.6), n.halo, 0, 0.62); }
        };
        const lockTex = new THREE.CanvasTexture((() => {
            const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
            g.fillStyle = 'rgba(20,6,12,0.9)'; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ff3a5a'; g.lineWidth = 4; g.stroke();
            g.strokeStyle = '#ffd6de'; g.lineWidth = 5; g.beginPath(); g.arc(32, 26, 9, Math.PI, 0); g.stroke(); g.fillStyle = '#ffd6de'; g.fillRect(19, 26, 26, 18); return cv;
        })());
        const beamG = new THREE.CylinderGeometry(0.55, 0.8, 1.9, 20, 1, true), ringG = new THREE.RingGeometry(0.62, 0.72, 32);
        const items = WEAPONS.map((w, i) => {
            const s = slots[i], n = neon(w.col), grp = new THREE.Group(); BUILD[w.id](grp, n); grp.scale.setScalar(0.95);
            const holder = add(new THREE.Group(), s.x, s.y, FZ - 0.25); holder.add(grp); grp.rotation.z = -0.35;
            const beam = add(new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: lin(w.col), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), s.x, s.y - 0.05, FZ - 0.25);
            const ring = add(new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: lin(w.col), transparent: true, opacity: 0.8, toneMapped: false })), s.x, s.y - 0.97, FZ - 0.25); ring.rotation.x = -Math.PI / 2;
            if (!w.open) { const lk = add(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: lockTex, transparent: true })), s.x - 0.95, s.y - 0.72, FZ - 0.72); lk.rotation.y = Math.PI; }
            return { w, grp, holder, halo: n.halo, beam, ph: i * 0.8 };
        });

        // ---------- the panel ----------
        const st = document.createElement('style');
        st.textContent = `#forge{z-index:28;display:flex;align-items:center;justify-content:flex-start;padding:0 0 0 max(14px,env(safe-area-inset-left));box-sizing:border-box}
          .fg-card{width:min(460px,52%);max-height:94%;overflow:auto;box-sizing:border-box;padding:14px 16px;display:grid;gap:10px;font-family:var(--font);
            background:linear-gradient(160deg,rgba(24,14,10,.94),rgba(8,8,18,.97));border:1px solid rgba(255,122,42,.4);clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
          .fg-head{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center}
          .fg-head small{font-size:9px;letter-spacing:.4em;color:#ff9a4a}
          .fg-head h2{margin:2px 0 0;font-size:19px;color:#ffe2c6;text-shadow:0 0 14px rgba(255,122,42,.45)}
          .fg-head p{margin:2px 0 0;font-size:11px;color:var(--dim)}
          .fg-cr{font:700 15px var(--font);color:var(--amber);white-space:nowrap}.fg-cr i{font-style:normal;font-size:10px;opacity:.7;margin-inline-end:4px}
          .fg-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:var(--ink);cursor:pointer;font-size:15px}
          .fg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
          .fg-w{position:relative;display:grid;justify-items:center;gap:2px;padding:6px 4px 5px;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--wc) 16%,transparent),rgba(255,255,255,.02) 70%);
            border:1px solid rgba(255,255,255,.08);cursor:pointer;color:var(--ink);font-family:var(--font);min-width:0;transition:border-color .15s,transform .15s}
          .fg-w img{width:100%;max-width:74px;aspect-ratio:1;filter:drop-shadow(0 0 6px var(--wc))}
          .fg-w b{font-size:9px;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
          .fg-w.lock img{opacity:.8;filter:drop-shadow(0 0 6px var(--wc)) saturate(.85)}
          .fg-w.lock::after{content:'';position:absolute;top:5px;inset-inline-end:5px;width:14px;height:14px;border-radius:50%;background:#2a0a12 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23ffd6de' stroke-width='3' d='M7 11V8a5 5 0 0 1 10 0v3'/%3E%3Crect x='5' y='11' width='14' height='10' fill='%23ffd6de'/%3E%3C/svg%3E") center/9px no-repeat;border:1px solid #ff3a5a}
          .fg-w.sel{border-color:var(--wc);box-shadow:0 0 14px color-mix(in srgb,var(--wc) 55%,transparent),inset 0 0 12px color-mix(in srgb,var(--wc) 20%,transparent);transform:translateY(-2px)}
          .fg-det{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-inline-start:3px solid var(--wc)}
          .fg-det img{width:120px;height:120px;filter:drop-shadow(0 0 12px var(--wc));animation:fgFloat 3s ease-in-out infinite}
          @keyframes fgFloat{50%{transform:translateY(-4px) rotate(2deg)}}
          .fg-det h3{margin:0;font-size:17px;letter-spacing:.06em;color:var(--wc);text-shadow:0 0 12px color-mix(in srgb,var(--wc) 60%,transparent)}
          .fg-det p{margin:4px 0 8px;font-size:12px;line-height:1.55;color:#c3cedb}
          .fg-bar{display:grid;grid-template-columns:62px 1fr;align-items:center;gap:8px;font-size:9.5px;letter-spacing:.12em;color:var(--dim);margin-top:3px}
          .fg-bar span{display:flex;gap:3px}.fg-bar i{flex:1;height:5px;background:rgba(255,255,255,.1);transform:skewX(-20deg)}
          .fg-bar i.on{background:var(--wc);box-shadow:0 0 6px var(--wc)}
          .fg-foot{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}
          .fg-pips{display:flex;align-items:center;gap:4px;font-size:10px;letter-spacing:.2em;color:var(--dim)}
          .fg-pips i{width:16px;height:6px;background:rgba(255,255,255,.12);transform:skewX(-20deg)}.fg-pips i.on{background:var(--amber);box-shadow:0 0 6px var(--amber)}
          .fg-go{min-width:150px;height:44px;padding:0 16px;font:700 14px var(--font);letter-spacing:.06em;color:#1a0d00;background:linear-gradient(180deg,#ffd08a,#ff8a2a);border:0;cursor:pointer;
            clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
          .fg-go:disabled{background:rgba(255,255,255,.08);color:var(--dim);cursor:default}
          .fg-go.lk:disabled{color:#ff8aa0}
          .fg-soon{font-size:10.5px;color:#ff8aa0}
          .fg-card[dir=rtl] .fg-w b,.fg-card[dir=rtl] .fg-bar{letter-spacing:0}
          #stage.is-portrait #forge{align-items:flex-end;justify-content:center;padding:0 0 max(10px,env(safe-area-inset-bottom))}
          #stage.is-portrait .fg-card{width:calc(100% - 20px);max-height:58%}
          #stage.short .fg-card{padding:10px 12px;gap:7px}#stage.short .fg-head p{display:none}#stage.short .fg-w img{max-width:52px}#stage.short .fg-det{grid-template-columns:84px 1fr}#stage.short .fg-det img{width:84px;height:84px}
          @media (prefers-reduced-motion:reduce){.fg-det img{animation:none}}`;
        document.head.appendChild(st);
        const pnl = document.createElement('div'); pnl.id = 'forge'; pnl.className = 'ui-layer'; stage.appendChild(pnl);
        const icons = {}; WEAPONS.forEach(w => { icons[w.id] = { s: iconURL(w, 128), b: iconURL(w, 240, -0.5) }; });
        let isOpen = false, sel = 0, saved = null;
        const HX = 10.5, portrait = () => stage.classList.contains('is-portrait');
        const statsOf = w => w.id === 'saber' ? [Math.min(5, 2 + Math.ceil(lvl() * 0.6)), 5, Math.min(5, 2 + Math.ceil(lvl() * 0.6))] : w.st;
        function render() {
            const w = WEAPONS[sel], cr = shop() ? shop().credits : 0, N = S('n'), D = S('d'), L0 = lvl(), MAX = shop() && shop().maxLevel || 5;
            const price = shop() && shop().priceOf ? shop().priceOf('saber') : 0, rtl = lang() === 'ar';
            let btn;
            if (!w.open) btn = `<button type="button" class="fg-go lk" disabled>🔒 ${S('locked')}</button>`;
            else if (L0 >= MAX) btn = `<button type="button" class="fg-go" disabled>★ ${S('max')}</button>`;
            else if (cr < price) btn = `<button type="button" class="fg-go" disabled>${S('need')} ${price - cr} CR</button>`;
            else btn = `<button type="button" class="fg-go" data-up>${S('upgrade')} · ${price} CR</button>`;
            const bars = [S('power'), S('speed'), S('reach')].map((t, k) => `<div class="fg-bar">${t}<span>${[0, 1, 2, 3, 4].map(q => `<i class="${q < statsOf(w)[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
            pnl.innerHTML = `<div class="fg-card" dir="${rtl ? 'rtl' : 'ltr'}" role="dialog" aria-label="${S('title')}">
                <div class="fg-head"><div><small>MTZ // WEAPON FORGE</small><h2>${S('title')}</h2><p>${S('sub')}</p></div><div class="fg-cr"><i>CR</i>${cr}</div><button type="button" class="fg-x" data-x aria-label="${S('close')}">✕</button></div>
                <div class="fg-grid">${WEAPONS.map((q, k) => `<button type="button" class="fg-w${q.open ? '' : ' lock'}${k === sel ? ' sel' : ''}" data-k="${k}" style="--wc:${hex(q.col)}" aria-label="${N[q.id]}"><img src="${icons[q.id].s}" alt=""><b>${N[q.id]}</b></button>`).join('')}</div>
                <div class="fg-det" style="--wc:${hex(w.col)}"><img src="${icons[w.id].b}" alt=""><div><h3>${N[w.id]}</h3><p>${D[w.id]}</p>${bars}</div></div>
                <div class="fg-foot"><div>${w.open ? `<div class="fg-pips">${S('lv')} ${[...Array(MAX)].map((_, q) => `<i class="${q < L0 ? 'on' : ''}"></i>`).join('')}</div><div class="fg-soon" style="color:var(--dim)">${S('equipped')}</div>` : `<div class="fg-soon">${S('soon')}</div>`}</div>${btn}</div></div>`;
        }
        function pick(k) { if (k === sel || k < 0 || k >= WEAPONS.length) return; sel = k; try { AudioSys.playUi('select'); } catch (e) { } render(); const f = pnl.querySelector(`[data-k="${k}"]`); f && f.focus({ preventScroll: true }); }
        function upgrade() {
            if (!WEAPONS[sel].open || !shop() || !shop().upgrade) return;
            if (shop().upgrade('saber')) {
                try { AudioSys.playUnlock(); AudioSys.playSaberHit(true, 0); } catch (e) { }
                if (c.toast) c.toast(S('done') + ' · ' + S('lv') + ' ' + lvl());
                items[0].pop = 1;                                             // the saber on the wall flares
            } else { try { AudioSys.playDeny(); } catch (e) { } }
            render();
        }
        function open() {
            if (isOpen || c.getState() !== 'hub') return;
            isOpen = true; sel = 0;
            saved = { r: cameraSystem.targetRadius, ph: cameraSystem.targetPhi, th: cameraSystem.targetTheta, p: player.mesh.position.clone(), ry: player.mesh.rotation.y };
            // the hero steps aside (behind the panel) and faces the wall; the camera slides over so the weapon wall fills the free side
            player.velocity.set(0, 0, 0); player.mesh.position.copy(V(FX + HX, 0.05, 6)); player.mesh.rotation.y = 0;
            cameraSystem.targetTheta = Math.PI; cameraSystem.targetPhi = 0.16; cameraSystem.targetRadius = portrait() ? 12 : 6; cameraSystem.manualTimer = 0;
            c.setState('hubmenu'); render(); pnl.classList.add('show'); stage.classList.add('in-studio');
            try { AudioSys.playUi('open'); AudioSys.playScan(); } catch (e) { }
            setTimeout(() => { const f = pnl.querySelector('.fg-w.sel'); f && f.focus({ preventScroll: true }); }, 60);
        }
        function close() {
            if (!isOpen) return; isOpen = false; pnl.classList.remove('show'); stage.classList.remove('in-studio');
            cameraSystem.targetRadius = saved.r; cameraSystem.targetPhi = saved.ph; cameraSystem.targetTheta = saved.th;
            player.mesh.position.copy(saved.p); player.mesh.rotation.y = saved.ry; player.velocity.set(0, 0, 0);
            if (c.getState() === 'hubmenu') { c.setState('hub'); c.Input && c.Input.flush(); }
            try { AudioSys.playUi('close'); } catch (e) { }
        }
        pnl.addEventListener('click', e => {
            if (e.target === pnl || e.target.closest('[data-x]')) { close(); return; }
            const k = e.target.closest('[data-k]'); if (k) { pick(+k.dataset.k); return; }
            if (e.target.closest('[data-up]')) upgrade();
        });
        window.addEventListener('keydown', e => {
            if (!isOpen) return;
            const rtl = lang() === 'ar';
            if (e.code === 'Escape') { e.stopImmediatePropagation(); close(); }
            else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); pick((sel + ((e.code === 'ArrowRight') !== rtl ? 1 : -1) + 8) % 8); }
            else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { e.preventDefault(); pick((sel + 4) % 8); }
            else if (e.code === 'Enter' || e.code === 'Space') { const a = document.activeElement; if (a && a.dataset && a.dataset.k) return; e.preventDefault(); upgrade(); }
        }, true);
        if (window.AxonI18n) window.AxonI18n.onChange(() => { paintSign(); if (isOpen) render(); });

        // ---------- per frame while the HQ is shown ----------
        let t = 0;
        function tick(dt) {
            t += dt;
            const p = player.mesh.position, near = (p.x - (O.x + FX)) ** 2 + (p.z - (O.z + 8)) ** 2 < 42 * 42;   // only drawn in the armory wing
            root.visible = near; if (!near) return;
            items.forEach((it, k) => {
                const hot = isOpen && k === sel, pop = it.pop || 0;
                it.holder.rotation.y += dt * (hot ? 1.6 : 0.6); it.holder.position.y = O.y + slots[k].y + Math.sin(t * 1.4 + it.ph) * 0.06;
                it.holder.scale.setScalar(1 + (hot ? 0.14 : 0) + pop * 0.3);
                it.halo.opacity = (hot ? 0.5 : 0.28) + Math.sin(t * 3 + it.ph) * 0.08 + pop * 0.5; it.beam.material.opacity = (hot ? 0.22 : 0.08) + pop * 0.3;
                if (pop) it.pop = Math.max(0, pop - dt * 1.5);
            });
            hearthM.color.setHSL(0.06 + Math.sin(t * 5) * 0.01, 1, 0.5 + Math.sin(t * 7) * 0.06); embers.scale.y = 0.3 + Math.sin(t * 6) * 0.08;
        }
        // camera slide: landscape → wall centred in the part of the screen the panel leaves free (≈ 68% across); portrait → wall above the panel
        function shift() {
            const a = cameraSystem.camera.aspect || 1.8, t = Math.tan(33 * Math.PI / 180);
            if (portrait()) return [HX, -4];
            return [HX - 0.37 * 12.9 * t * a, 0];
        }
        return { open, close, tick, get isOpen() { return isOpen; }, get camShift() { return isOpen ? shift() : null; } };
    }

    return { create, S, WEAPONS };
})();
