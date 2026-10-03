// =====================================================================
//  AXON BREACH — OPEN WORLD: the land outside the Command HQ
//   • Walk through the hangar door in the HANGAR BAY → you step out on the plaza in front of the HQ.
//   • The HQ COMPOUND: the building and its plaza stand inside perimeter walls with a watchtower and a sweeping
//     searchlight at every corner, four gates on the roads that slide open for you, and sentries posted at every
//     gate and at the HQ door (they turn their heads to you and speak when you walk up).
//   • One continuous world, 2.4 km × 2.4 km (5.8 km²), in nine regions with their own ground, scenery,
//     weather and hostiles: GREEN BELT (around the HQ), EMERALD GRID (forest), AMBER DUNES (desert),
//     FROST SECTOR (snow), MAGMA CORE (volcanic, lava burns), NEON DISTRICT (a city of towers),
//     TOXIC MARSH (swamp, toxic pools), CRYSTAL FIELDS and RUST CANYON (mesas). Regions blend into each other.
//   • DIGITAL DAY AND NIGHT: a full day lasts 10 minutes. The sun and the moon cross a gridded sky, the light,
//     the fog and the sky change colour through dawn, day, dusk and night, the stars and the neon grid of the
//     ground come up after dark. The clock is shown under the minimap.
//   • The world is streamed: it is cut in 160 m chunks, built as you approach (two draw calls each: everything
//     lit in one mesh, everything glowing in another) and dropped behind you, with their collision boxes.
//   • Roads: a cross through the HQ and a ring road. WARP PADS: eight on the plaza, one per region, and one in
//     every region that brings you back.
//   • 35 hostile nodes (ring + beacon); each region has one STRONGHOLD held by a maverick (aliens.js), marked by
//     a beam you can see from anywhere. Farther from the HQ = tougher. Purging pays a bonus.
//     Hostiles appear when you come near and the nodes are re-infested every time you head out.
//   • Walk back into the HQ door (amber beam, amber diamond on the minimap) to return inside.
//  Loaded by index.html after hub.js, before game.js.
// =====================================================================
'use strict';

window.AxonOutside = (function () {
    const L = {
        en: { base: 'HQ COMPOUND', sentry: 'SENTRY', say: ['Stay sharp out there. The nodes are crawling with hostiles.', 'Red beams mark the strongholds. Purge them for a bonus.', 'The gates open for you, operative.', 'Come back through the HQ door when you need repairs.'],
              hq: 'COMMAND HQ', zone: 'OPEN WORLD', enter: 'ENTER HQ', hostile: '⚠ HOSTILE NODES ACROSS THE WORLD', purged: 'NODE PURGED', hold: 'STRONGHOLD PURGED',
              leaving: 'Leaving the base…', returning: 'Returning to HQ…', warp: 'Warping…', plaza: 'HQ PLAZA', night: 'NIGHT FALLS', dawn: 'SUNRISE',
              down: 'You went down in the open world. The recovery team brought you back to HQ.',
              b0: 'GREEN BELT', b1: 'EMERALD GRID', b2: 'AMBER DUNES', b3: 'FROST SECTOR', b4: 'MAGMA CORE', b5: 'NEON DISTRICT', b6: 'TOXIC MARSH', b7: 'CRYSTAL FIELDS', b8: 'RUST CANYON' },
        ar: { base: 'مجمّع المقر', sentry: 'حارس', say: ['ابقَ متيقظاً هناك، العقد مليئة بالأعداء.', 'الأشعة الحمراء تدل على المعاقل، طهّرها لتحصل على مكافأة.', 'البوابات تُفتح لك أيها المقاتل.', 'ارجع من باب المقر إذا احتجت إصلاحات.'],
              hq: 'مقر القيادة', zone: 'العالم المفتوح', enter: 'ادخل المقر', hostile: '⚠ عقد معادية منتشرة في العالم', purged: 'تم تطهير العقدة', hold: 'تم تطهير المعقل',
              leaving: 'جارٍ الخروج من القاعدة…', returning: 'العودة إلى المقر…', warp: 'جارٍ الانتقال…', plaza: 'ساحة المقر', night: 'حلّ الليل', dawn: 'شروق الشمس',
              down: 'سقطت في العالم المفتوح، وأعادك فريق الإنقاذ إلى المقر.',
              b0: 'الحزام الأخضر', b1: 'الشبكة الزمردية', b2: 'كثبان الكهرمان', b3: 'قطاع الصقيع', b4: 'قلب الحمم', b5: 'حي النيون', b6: 'المستنقع السام', b7: 'حقول الكريستال', b8: 'وادي الصدأ' },
        es: { base: 'RECINTO DEL CUARTEL', sentry: 'CENTINELA', say: ['Mantente alerta. Los nodos están llenos de hostiles.', 'Los haces rojos marcan los bastiones. Púrgalos para una bonificación.', 'Las puertas se abren para ti, operativo.', 'Vuelve por la puerta del cuartel si necesitas reparaciones.'],
              hq: 'CUARTEL GENERAL', zone: 'MUNDO ABIERTO', enter: 'ENTRAR AL CUARTEL', hostile: '⚠ NODOS HOSTILES POR TODO EL MUNDO', purged: 'NODO PURGADO', hold: 'BASTIÓN PURGADO',
              leaving: 'Saliendo de la base…', returning: 'Volviendo al cuartel…', warp: 'Saltando…', plaza: 'PLAZA DEL CUARTEL', night: 'CAE LA NOCHE', dawn: 'AMANECE',
              down: 'Caíste en el mundo abierto. El equipo de rescate te trajo al cuartel.',
              b0: 'CINTURÓN VERDE', b1: 'RED ESMERALDA', b2: 'DUNAS ÁMBAR', b3: 'SECTOR HELADO', b4: 'NÚCLEO DE MAGMA', b5: 'DISTRITO NEÓN', b6: 'PANTANO TÓXICO', b7: 'CAMPOS DE CRISTAL', b8: 'CAÑÓN ÓXIDO' },
        zh: { base: '总部营地', sentry: '哨兵', say: ['外面小心，据点里全是敌人。', '红色光柱标记要塞，清除可获得奖励。', '大门为你敞开，特工。', '需要修理就从总部大门回来。'],
              hq: '指挥总部', zone: '开放世界', enter: '进入总部', hostile: '⚠ 世界各处出现敌对据点', purged: '据点已清除', hold: '要塞已清除',
              leaving: '正在离开基地…', returning: '正在返回总部…', warp: '传送中…', plaza: '总部广场', night: '夜幕降临', dawn: '日出',
              down: '你在开放世界倒下了，救援队把你带回了总部。',
              b0: '绿带', b1: '翡翠网格', b2: '琥珀沙丘', b3: '霜冻区', b4: '熔岩核心', b5: '霓虹街区', b6: '毒沼', b7: '水晶原野', b8: '锈蚀峡谷' },
        ja: { base: '司令部敷地', sentry: '歩哨', say: ['外では気を抜くな。ノードは敵だらけだ。', '赤い光柱は拠点の印だ。浄化すればボーナスが出る。', 'ゲートは君のために開く。', '修理が必要なら司令部の扉から戻れ。'],
              hq: '司令部', zone: 'オープンワールド', enter: '司令部へ入る', hostile: '⚠ 世界各地に敵性ノード', purged: 'ノード浄化', hold: '拠点浄化',
              leaving: '基地を出発中…', returning: '司令部へ帰還中…', warp: 'ワープ中…', plaza: '司令部広場', night: '夜が来た', dawn: '日の出',
              down: 'オープンワールドで倒れた。回収班が司令部へ連れ戻した。',
              b0: 'グリーンベルト', b1: 'エメラルドグリッド', b2: '琥珀の砂丘', b3: 'フロストセクター', b4: 'マグマコア', b5: 'ネオン街区', b6: '毒の沼地', b7: '水晶の平原', b8: '錆の峡谷' }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const S = k => { const d = L[lang()] || L.en; return d[k] !== undefined ? d[k] : L.en[k]; };
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    const WB = 1200, CH = 160, NC = WB * 2 / CH, DAY = 600;           // half size of the world · chunk · chunks per side · seconds in a day
    // regions: centre, two ground colours, what the fog leans to, weather, accent of its glow, who lives there
    const BIOMES = [
        { x: 0, z: 0, g: [0x4f9a3a, 0x3c7a34], fog: 0x9fe0b0, w: null, glow: 0x5cf0a0, den: 0.45, foes: ['runner', 'drone'] },
        { x: -650, z: -650, g: [0x1f6a2e, 0x15502a], fog: 0x6fc48a, w: 'spores', glow: 0x7dffb8, den: 1, foes: ['runner', 'swarm', 'drone'] },
        { x: -700, z: 620, g: [0xd9a654, 0xb9813a], fog: 0xffd9a0, w: 'dust', glow: 0xffc24a, den: 0.36, foes: ['shell', 'runner'] },
        { x: 100, z: -900, g: [0xc4d4e4, 0xa2bad2], fog: 0xe8f4ff, w: 'snow', glow: 0x9fe8ff, den: 0.5, foes: ['drone', 'shell'] },
        { x: 800, z: 760, g: [0x221a1c, 0x3a1410], fog: 0xff7a4a, w: 'embers', glow: 0xff5a1f, den: 0.45, foes: ['heavy', 'runner'] },
        { x: 760, z: -150, g: [0x23283a, 0x1a1e2e], fog: 0x8a9cff, w: null, glow: 0x39d7ff, den: 0.1, foes: ['drone', 'heavy', 'runner'] },
        { x: 60, z: 900, g: [0x3a3f24, 0x4a2f4a], fog: 0xb6e05a, w: 'spores', glow: 0xb6ff3a, den: 0.6, foes: ['swarm', 'runner'] },
        { x: 860, z: -860, g: [0x2a1f4f, 0x3c2a6e], fog: 0xd08cff, w: 'motes', glow: 0xe07aff, den: 0.5, foes: ['drone', 'swarm'] },
        { x: -960, z: -40, g: [0x9a4f2e, 0x7a3a24], fog: 0xffb080, w: 'dust', glow: 0xff8a4a, den: 0.4, foes: ['heavy', 'shell'] }
    ];
    const WEATHER = { dust: [0xf0d6a8, 3.2, -0.1, false], spores: [0xcaffb0, 0.3, 0.35, true], snow: [0xffffff, 0.6, -2.6, false], embers: [0xff8a3d, 0.4, 2.2, true], motes: [0xf0b8ff, 0.2, 0.25, true] };
    // the sky through the day: [hour, zenith, horizon / fog, light colour, light, fill, how bright the ground grid is]
    const SKY = [
        [0, 0x03051a, 0x0a1030, 0x8fa8ff, 0.5, 0.42, 1.0], [5, 0x060a26, 0x101a44, 0x8fa8ff, 0.5, 0.44, 1.0], [6.5, 0x2a2a66, 0xff8a6a, 0xffb080, 0.95, 0.62, 0.5],
        [9, 0x2f7fe0, 0x9fd4ff, 0xfff4dc, 1.35, 0.85, 0.14], [16, 0x2f7fe0, 0x9fd4ff, 0xfff4dc, 1.35, 0.85, 0.14], [18.5, 0x3a1a66, 0xff6a8a, 0xff8a60, 0.95, 0.6, 0.55],
        [20.5, 0x060a26, 0x101a44, 0x8fa8ff, 0.5, 0.44, 1.0], [24, 0x03051a, 0x0a1030, 0x8fa8ff, 0.5, 0.42, 1.0]
    ];

    // ---------- deterministic noise (the same world every launch) ----------
    const hash = (x, z, s = 0) => { let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(s + 1, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const smooth = t => t * t * (3 - 2 * t);
    const noise = (x, z, s = 0) => { const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
        const a = hash(ix, iz, s), b = hash(ix + 1, iz, s), c = hash(ix, iz + 1, s), d = hash(ix + 1, iz + 1, s); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; };
    const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // which region a point is in: the nearest centre once the map is warped by noise. → [nearest, second, weight of the nearest 0.5…1]
    const _bi = [0, 0, 1];
    function biomeAt(x, z) {
        const wx = x + (noise(x / 190, z / 190, 7) - 0.5) * 260, wz = z + (noise(x / 190, z / 190, 9) - 0.5) * 260;
        let a = 0, b = 0, da = 1e9, db = 1e9;
        for (let i = 0; i < BIOMES.length; i++) { const B = BIOMES[i], d = Math.hypot(wx - B.x, wz - B.z) * (i ? 1 : 1.35); if (d < da) { b = a; db = da; a = i; da = d; } else if (d < db) { b = i; db = d; } }
        _bi[0] = a; _bi[1] = b; _bi[2] = 0.5 + 0.5 * smooth(Math.min(1, (db - da) / 90)); return _bi;
    }
    // roads: the cross through the HQ and the ring road (half width 6)
    const RING = 800, RW = 6;
    const roadDist = (x, z) => Math.min(Math.abs(x), Math.abs(z), Math.abs(z) <= RING + RW ? Math.abs(Math.abs(x) - RING) : 1e9, Math.abs(x) <= RING + RW ? Math.abs(Math.abs(z) - RING) : 1e9);

    function create(c) {
        const { THREE, scene, player, cameraSystem, stage, AudioSys } = c;
        const O = new THREE.Vector3(0, 0, 5000);                      // far from the facility, the HQ (z ≈ 400) and the expedition worlds (x = 3000)
        const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const root = new THREE.Group(); root.visible = false; scene.add(root);
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const box = (list, x0, y0, z0, x1, y1, z1) => list.push(new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1)));
        const col = h => new THREE.Color(h).convertSRGBToLinear();   // palette colours are picked by eye (sRGB); the renderer works in linear light
        const canvasTex = (w, h, draw, srgb = true) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const glowMat = (color, op = 1, fog = true) => new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: op >= 1, side: THREE.DoubleSide, fog });

        // ---------- the two materials of the whole world ----------
        // ground texture: an 8 m plate. Scenery uses one plain texel of it (0.25, 0.25), so ground and scenery share a material.
        const rep = t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = COARSE ? 4 : 8; return t; };
        const gMap = rep(canvasTex(128, 128, (g, s) => { g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); g.fillStyle = '#eeeeee'; g.fillRect(s / 2, 0, s / 2, s / 2); g.fillRect(0, s / 2, s / 2, s / 2); g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s); g.fillStyle = '#fff'; g.fillRect(20, 20, 24, 24); }));
        const gEmi = rep(canvasTex(128, 128, (g, s) => { g.fillStyle = '#000'; g.fillRect(0, 0, s, s); g.fillStyle = '#fff'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s); g.fillStyle = '#666'; g.fillRect(s / 2, 0, 1, s); g.fillRect(0, s / 2, s, 1); g.fillStyle = '#000'; g.fillRect(20, 20, 24, 24); }, false));
        const litMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: gMap, emissiveMap: gEmi, emissive: 0x39d7ff, emissiveIntensity: 0.2 });
        const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true });

        // ---------- geometry builder: many props → one mesh ----------
        const tpl = (geo, lift = 0.5) => { geo.translate(0, lift, 0); const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return { p: g.attributes.position.array, n: g.attributes.normal.array }; };
        const T = { box: tpl(new THREE.BoxGeometry(1, 1, 1)), cone: tpl(new THREE.ConeGeometry(0.5, 1, 6, 1, true)), cyl: tpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
            ico: tpl(new THREE.IcosahedronGeometry(0.5, 0)), octa: tpl(new THREE.OctahedronGeometry(0.5, 0)), hex: tpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), 0.5) };
        function Buf(lit) { this.p = []; this.n = []; this.c = []; this.u = []; this.lit = lit; }
        Buf.prototype.add = function (S, x, y, z, sx, sy, sz, ry, c, k = 1) {
            const cs = Math.cos(ry), sn = Math.sin(ry), P = S.p, N = S.n, p = this.p, r = c.r * k, g = c.g * k, b = c.b * k, lit = this.lit;
            for (let i = 0; i < P.length; i += 3) {
                const px = P[i] * sx, pz = P[i + 2] * sz;
                p.push(x + px * cs + pz * sn, y + P[i + 1] * sy, z - px * sn + pz * cs); this.c.push(r, g, b);
                if (lit) { const nx = N[i] / sx, ny = N[i + 1] / sy, nz = N[i + 2] / sz, l = 1 / (Math.hypot(nx, ny, nz) || 1); this.n.push((nx * cs + nz * sn) * l, ny * l, (-nx * sn + nz * cs) * l); this.u.push(0.25, 0.25); }
            }
        };
        // a flat quad facing up; uv = null → the plain texel, else world position / 8 (the plated ground)
        Buf.prototype.flat = function (x0, z0, x1, z1, y, c0, c1, c2, c3, ux, uz) {
            const P = [x0, z0, c0, x0, z1, c1, x1, z0, c2, x1, z0, c2, x0, z1, c1, x1, z1, c3 || c0];
            for (let i = 0; i < 18; i += 3) { const x = P[i], z = P[i + 1], c = P[i + 2] || c0; this.p.push(x, y, z); this.c.push(c.r, c.g, c.b);
                if (this.lit) { this.n.push(0, 1, 0); if (ux === undefined) this.u.push(0.25, 0.25); else this.u.push((x + ux) / 8, (z + uz) / 8); } }
        };
        Buf.prototype.mesh = function (mat) {
            if (!this.p.length) return null;
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
            if (this.lit) { g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); }
            g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.receiveShadow = this.lit; m.matrixAutoUpdate = false; return m;
        };

        // ---------- colours ----------
        const BC = BIOMES.map(B => ({ a: col(B.g[0]), b: col(B.g[1]), glow: col(B.glow), fog: new THREE.Color(B.fog) }));
        const C = { trunk: col(0x5a3a22), leaf: col(0x3f9a3a), leaf2: col(0x6cc04a), pine: col(0x1f6a34), rock: col(0x7a7f8a), sand: col(0xc99a55), cactus: col(0x3f8a4a), snow: col(0xf4faff), ice: col(0x9fdcff),
            basalt: col(0x23202a), dead: col(0x3a2f2a), stem: col(0xd8d0c0), tower: col(0x1a2030), tower2: col(0x262c44), road: col(0x14171f), mesa: col(0xb0603a), mesa2: col(0x8a4428),
            lava: col(0xff5a1f), tox: col(0x9dff3a), cyan: col(0x39d7ff), mag: col(0xff2a9d), amber: col(0xffa826), white: col(0xffffff), dash: col(0x8fa0b8), lamp: col(0xffe2a8), wall: col(0x3a1a66) };
        const tmp = new THREE.Color(), mixc = (a, b, t, out) => out.setRGB(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
        const groundCol = (x, z) => { const [a, b, w] = biomeAt(x, z), n = noise(x / 34, z / 34, 3), A = BC[a], Bq = BC[b], sh = 0.86 + noise(x / 9, z / 9, 5) * 0.28;
            const ar = A.a.r + (A.b.r - A.a.r) * n, ag = A.a.g + (A.b.g - A.a.g) * n, ab = A.a.b + (A.b.b - A.a.b) * n, br = Bq.a.r + (Bq.b.r - Bq.a.r) * n, bg = Bq.a.g + (Bq.b.g - Bq.a.g) * n, bb = Bq.a.b + (Bq.b.b - Bq.a.b) * n;
            return new THREE.Color((br + (ar - br) * w) * sh, (bg + (ag - bg) * w) * sh, (bb + (ab - bb) * w) * sh); };

        // ---------- places: warp pads, hostile nodes, keep-outs ----------
        const DOOR = { x: 0, z: -14.6, r: 2.4 }, SPAWN = { x: 0, z: 7 };
        const pads = [{ x: 0, z: 24, to: -1, home: true }];            // [0] = arrival point on the plaza
        for (let k = 1; k < BIOMES.length; k++) {
            const a = (k - 4.5) * 0.34; pads.push({ x: Math.sin(a) * 40, z: 14 + Math.cos(a) * 40, to: k, biome: k, plaza: true });
            pads.push({ x: BIOMES[k].x, z: BIOMES[k].z, to: 0, biome: k });
        }
        const nodes = [];
        (function placeNodes() {
            const r = rng(4411);
            BIOMES.forEach((B, k) => {
                const lvlOf = (x, z) => Math.max(0, Math.min(8, Math.round(Math.hypot(x, z) / 150) - 1));
                if (k) nodes.push({ x: B.x + 70, z: B.z + 46, biome: k, hold: true, lvl: Math.min(8, lvlOf(B.x, B.z) + 1), style: ['RAZOR', 'TITAN', 'VOLT'][k % 3] });
                for (let n = 0, tries = 0; n < 3 && tries < 400; tries++) {
                    const a = r() * Math.PI * 2, d = (k ? 130 : 120) + r() * (k ? 330 : 230), x = B.x + Math.cos(a) * d, z = B.z + Math.sin(a) * d;
                    if (Math.abs(x) > WB - 90 || Math.abs(z) > WB - 90 || biomeAt(x, z)[0] !== k || roadDist(x, z) < 26 || nodes.some(o => Math.hypot(o.x - x, o.z - z) < 150)) continue;
                    nodes.push({ x, z, biome: k, hold: false, lvl: lvlOf(x, z) }); n++;
                }
            });
        })();
        const CW = { x0: -74, x1: 74, z0: -64, z1: 72 };                // the compound wall
        const GATES = [{ x: 0, z: CW.z1, rot: 0 }, { x: 0, z: CW.z0, rot: Math.PI }, { x: CW.x1, z: 0, rot: Math.PI / 2 }, { x: CW.x0, z: 0, rot: -Math.PI / 2 }];
        const keepOut = pads.map(p => [p.x, p.z, 11]).concat(nodes.map(n => [n.x, n.z, n.hold ? 24 : 17]));
        const blocked = (x, z, pad = 0) => roadDist(x, z) < RW + 2.5 + pad || (x > CW.x0 - 7 - pad && x < CW.x1 + 7 + pad && z > CW.z0 - 7 - pad && z < CW.z1 + 7 + pad) || keepOut.some(k => (x - k[0]) ** 2 + (z - k[1]) ** 2 < (k[2] + pad) ** 2);

        // ---------- one chunk: its ground, roads, scenery, glow and collision boxes ----------
        function buildChunk(ci, cj) {
            const x0 = -WB + ci * CH, z0 = -WB + cj * CH, lit = new Buf(true), neon = new Buf(false), solids = [], pools = [], r = rng(ci * 7919 + cj * 104729 + 17);
            const R = (a, b) => a + r() * (b - a);
            const solid = (x, z, hw, h, hd = hw) => box(solids, x0 + x - hw, 0, z0 + z - hd, x0 + x + hw, h, z0 + z + hd);
            // ground: 16 × 16 cells, coloured per corner so the regions flow into each other
            const N = 16, d = CH / N, gc = [];
            for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) gc.push(groundCol(x0 + i * d, z0 + j * d));
            for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) lit.flat(i * d, j * d, (i + 1) * d, (j + 1) * d, 0, gc[i * (N + 1) + j], gc[i * (N + 1) + j + 1], gc[(i + 1) * (N + 1) + j], gc[(i + 1) * (N + 1) + j + 1], x0, z0);
            // roads crossing the chunk, with a dashed centre line and lamps
            const road = (alongX, pos, a0, a1) => {
                const lo = Math.max(a0, alongX ? x0 : z0), hi = Math.min(a1, alongX ? x0 + CH : z0 + CH), q = alongX ? z0 : x0;
                if (hi <= lo || pos + RW < q || pos - RW > q + CH) return;
                const l0 = lo - (alongX ? x0 : z0), l1 = hi - (alongX ? x0 : z0), p = pos - q;
                if (alongX) lit.flat(l0, p - RW, l1, p + RW, 0.03, C.road); else lit.flat(p - RW, l0, p + RW, l1, 0.03, C.road);
                for (const e of [-RW + 0.3, RW - 0.3]) { if (alongX) neon.flat(l0, p + e - 0.1, l1, p + e + 0.1, 0.05, C.cyan); else neon.flat(p + e - 0.1, l0, p + e + 0.1, l1, 0.05, C.cyan); }
                for (let s = Math.ceil(lo / 10) * 10; s < hi; s += 10) {
                    const a = s - (alongX ? x0 : z0);
                    if (alongX) neon.flat(a, p - 0.12, a + 4, p + 0.12, 0.05, C.dash); else neon.flat(p - 0.12, a, p + 0.12, a + 4, 0.05, C.dash);
                    if (s % 40 === 0 && Math.hypot(alongX ? s : pos, alongX ? pos : s) > 60) {                    // a lamp every 40 m, alternating sides
                        const side = (s / 40) % 2 ? 1 : -1, lx = alongX ? a : p + side * (RW + 1), lz = alongX ? p + side * (RW + 1) : a;
                        lit.add(T.box, lx, 0, lz, 0.22, 5.2, 0.22, 0, C.tower2); neon.add(T.box, lx, 5.2, lz, 0.9, 0.22, 0.9, 0, C.lamp);
                    }
                }
            };
            road(true, 0, -WB, WB); road(false, 0, -WB, WB);
            for (const s of [-RING, RING]) { road(true, s, -RING - RW, RING + RW); road(false, s, -RING - RW, RING + RW); }
            // the edge of the world: a firewall
            if (ci === 0) neon.add(T.box, 0.2, 0, CH / 2, 0.3, 26, CH, 0, C.wall); if (ci === NC - 1) neon.add(T.box, CH - 0.2, 0, CH / 2, 0.3, 26, CH, 0, C.wall);
            if (cj === 0) neon.add(T.box, CH / 2, 0, 0.2, CH, 26, 0.3, 0, C.wall); if (cj === NC - 1) neon.add(T.box, CH / 2, 0, CH - 0.2, CH, 26, 0.3, 0, C.wall);
            // ----- scenery -----
            const P = {
                tree(x, z) { const s = R(0.8, 1.5); lit.add(T.cyl, x, 0, z, 0.55 * s, 2.4 * s, 0.55 * s, 0, C.trunk); lit.add(T.ico, x, 1.9 * s, z, 3.4 * s, 3 * s, 3.4 * s, R(0, 6), r() < 0.5 ? C.leaf : C.leaf2, R(0.8, 1.1)); solid(x, z, 0.4 * s, 3); },
                bush(x, z) { lit.add(T.ico, x, -0.2, z, R(1.2, 2.2), R(0.9, 1.4), R(1.2, 2.2), R(0, 6), C.leaf, R(0.7, 1)); },
                bloom(x, z, k) { neon.add(T.octa, x, 0.5, z, 0.3, 0.5, 0.3, R(0, 6), BC[k].glow); lit.add(T.box, x, 0, z, 0.06, 0.5, 0.06, 0, C.stem); },
                pine(x, z) { const s = R(0.9, 1.9); lit.add(T.cyl, x, 0, z, 0.45 * s, 1.6 * s, 0.45 * s, 0, C.trunk); lit.add(T.cone, x, 1.2 * s, z, 3.2 * s, 3.2 * s, 3.2 * s, R(0, 6), C.pine, R(0.85, 1.1)); lit.add(T.cone, x, 3.2 * s, z, 2.3 * s, 3 * s, 2.3 * s, R(0, 6), C.pine, R(0.95, 1.2)); solid(x, z, 0.4 * s, 4); },
                snowpine(x, z) { const s = R(0.9, 1.6); lit.add(T.cyl, x, 0, z, 0.45 * s, 1.6 * s, 0.45 * s, 0, C.dead); lit.add(T.cone, x, 1.2 * s, z, 3 * s, 3 * s, 3 * s, R(0, 6), C.pine, 0.9); lit.add(T.cone, x, 3.1 * s, z, 2.2 * s, 2.8 * s, 2.2 * s, R(0, 6), C.snow); solid(x, z, 0.4 * s, 4); },
                rock(x, z, c = C.rock) { const s = R(1.4, 4.2), h = s * R(0.5, 0.9); lit.add(T.ico, x, -0.25 * h, z, s, h * 1.3, s * R(0.7, 1.1), R(0, 6), c, R(0.7, 1.05)); solid(x, z, s * 0.33, h * 0.75); },
                cactus(x, z) { const s = R(0.8, 1.5), a = R(0, 6); lit.add(T.cyl, x, 0, z, 0.7 * s, 3.6 * s, 0.7 * s, 0, C.cactus); for (const e of [-1, 1]) { const ax = x + Math.cos(a) * 0.75 * s * e, az = z - Math.sin(a) * 0.75 * s * e; lit.add(T.box, x + Math.cos(a) * 0.4 * s * e, (1.3 + 0.4 * e) * s, z - Math.sin(a) * 0.4 * s * e, 0.9 * s, 0.4 * s, 0.4 * s, a, C.cactus, 0.92); lit.add(T.cyl, ax, (1.3 + 0.4 * e) * s, az, 0.42 * s, 1.3 * s, 0.42 * s, 0, C.cactus, 0.95); } solid(x, z, 0.4 * s, 3.4 * s); },
                mesa(x, z) { let w = R(16, 30), dd = R(14, 26), y = 0; const a = 0; for (let k = 0, n = 2 + Math.floor(r() * 2); k < n; k++) { const h = R(4, 8); lit.add(T.box, x, y, z, w, h, dd, a, k % 2 ? C.mesa2 : C.mesa, R(0.85, 1.05)); lit.add(T.box, x, y + h - 0.5, z, w + 0.4, 0.5, dd + 0.4, a, C.mesa2, 0.8); box(solids, x0 + x - w / 2, y, z0 + z - dd / 2, x0 + x + w / 2, y + h, z0 + z + dd / 2); y += h; w *= R(0.6, 0.8); dd *= R(0.6, 0.8); } },
                ice(x, z) { const s = R(1, 2.4), h = R(3, 8); lit.add(T.cone, x, 0, z, s, h, s, R(0, 6), C.ice, R(0.9, 1.15)); lit.add(T.cone, x + s * 0.6, 0, z + s * 0.3, s * 0.6, h * 0.55, s * 0.6, R(0, 6), C.ice); solid(x, z, s * 0.35, h * 0.6); },
                basalt(x, z) { for (let k = 0; k < 3; k++) { const h = R(2, 7), ox = Math.cos(k * 2.1) * 0.9, oz = Math.sin(k * 2.1) * 0.9; lit.add(T.cyl, x + ox, 0, z + oz, 1.5, h, 1.5, k, C.basalt, R(0.9, 1.3)); } solid(x, z, 1.4, 2.4); },
                vent(x, z) { const s = R(2.4, 4); lit.add(T.cone, x, 0, z, s, s * 0.8, s, R(0, 6), C.basalt, 1.2); neon.add(T.cyl, x, s * 0.42, z, s * 0.34, 0.2, s * 0.34, 0, C.lava); solid(x, z, s * 0.3, s * 0.5); },
                pool(x, z, c, dps) { const s = R(3.5, 7); neon.add(T.hex, x, -0.92, z, s * 2, 1, s * 2, R(0, 6), c, 0.85); pools.push({ x: x0 + x, z: z0 + z, r: s * 0.9, dps }); },
                dead(x, z) { const s = R(0.9, 1.6), a = R(0, 6); lit.add(T.cyl, x, 0, z, 0.4 * s, 4.2 * s, 0.4 * s, 0, C.dead); lit.add(T.box, x + Math.cos(a) * 0.9 * s, 2.6 * s, z - Math.sin(a) * 0.9 * s, 1.8 * s, 0.22 * s, 0.22 * s, a, C.dead); lit.add(T.box, x - Math.cos(a) * 0.7 * s, 3.4 * s, z + Math.sin(a) * 0.7 * s, 1.4 * s, 0.2 * s, 0.2 * s, a, C.dead); solid(x, z, 0.35 * s, 4); },
                shroom(x, z, k) { const s = R(0.8, 2.2); lit.add(T.cyl, x, 0, z, 0.3 * s, 1.5 * s, 0.3 * s, 0, C.stem); neon.add(T.cone, x, 1.4 * s, z, 2 * s, 0.8 * s, 2 * s, R(0, 6), BC[k].glow, R(0.6, 0.9)); },
                crystal(x, z, k) { const s = R(1, 2.4), h = R(3, 8); neon.add(T.octa, x, -h * 0.15, z, s, h, s, R(0, 6), r() < 0.5 ? BC[k].glow : C.cyan, R(0.55, 0.8)); if (r() < 0.6) neon.add(T.octa, x + s * 0.7, -h * 0.1, z + s * 0.4, s * 0.55, h * 0.5, s * 0.55, R(0, 6), C.mag, 0.6); solid(x, z, s * 0.35, h * 0.7); },
                tower(x, z, k) {                                                                                  // a city block: dark tower, neon edges, window bands
                    const w = R(16, 25), dd = R(16, 25), h = r() < 0.2 ? R(46, 76) : R(12, 36), cg = r() < 0.5 ? C.cyan : r() < 0.5 ? C.mag : C.amber;
                    lit.add(T.box, x, 0, z, w, h, dd, 0, r() < 0.5 ? C.tower : C.tower2, R(0.9, 1.3)); solid(x, z, w / 2, h, dd / 2);
                    for (const sx of [-1, 1]) for (const sz of [-1, 1]) neon.add(T.box, x + sx * w / 2, 0, z + sz * dd / 2, 0.3, h, 0.3, 0, cg, 0.8);
                    for (let y = 4, n = 0; y < h - 2 && n < 6; y += Math.max(5, h / 6), n++) { neon.add(T.box, x, y, z, w + 0.2, 0.5, dd * 0.7, 0, C.lamp, 0.55); neon.add(T.box, x, y, z, w * 0.7, 0.5, dd + 0.2, 0, C.lamp, 0.55); }
                    neon.add(T.box, x, h, z, w + 0.3, 0.3, dd + 0.3, 0, cg, 0.7); if (h > 40) neon.add(T.box, x, h, z, 0.3, 9, 0.3, 0, C.white);
                }
            };
            // the city is laid on a 40 m lattice; everywhere else scenery is scattered, and what grows depends on the region at that spot
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
                const x = 20 + i * 40, z = 20 + j * 40, wx = x0 + x, wz = z0 + z, v = r();
                if (biomeAt(wx, wz)[0] === 5 && v < 0.8 && !blocked(wx, wz, 15) && Math.abs(wx) < WB - 30 && Math.abs(wz) < WB - 30) P.tower(x, z, 5);
            }
            for (let n = 0; n < 78; n++) {
                const x = R(3, CH - 3), z = R(3, CH - 3), wx = x0 + x, wz = z0 + z, k = biomeAt(wx, wz)[0], v = r();
                if (r() > BIOMES[k].den || blocked(wx, wz, 2) || Math.abs(wx) > WB - 8 || Math.abs(wz) > WB - 8) continue;
                if (k === 0) v < 0.42 ? P.tree(x, z) : v < 0.7 ? P.bush(x, z) : v < 0.86 ? P.rock(x, z) : P.bloom(x, z, 0);
                else if (k === 1) v < 0.78 ? P.pine(x, z) : v < 0.86 ? P.rock(x, z) : v < 0.94 ? P.bush(x, z) : P.shroom(x, z, 1);
                else if (k === 2) v < 0.42 ? P.cactus(x, z) : v < 0.88 ? P.rock(x, z, C.sand) : !blocked(wx, wz, 18) ? P.mesa(x, z) : 0;
                else if (k === 3) v < 0.5 ? P.snowpine(x, z) : v < 0.84 ? P.ice(x, z) : P.rock(x, z, C.snow);
                else if (k === 4) v < 0.4 ? P.basalt(x, z) : v < 0.62 ? P.vent(x, z) : v < 0.8 ? P.rock(x, z, C.basalt) : !blocked(wx, wz, 8) ? P.pool(x, z, C.lava, 9) : 0;
                else if (k === 5) v < 0.5 ? P.bloom(x, z, 5) : 0;
                else if (k === 6) v < 0.42 ? P.dead(x, z) : v < 0.7 ? P.shroom(x, z, 6) : v < 0.84 ? P.bush(x, z) : !blocked(wx, wz, 8) ? P.pool(x, z, C.tox, 5) : 0;
                else if (k === 7) v < 0.7 ? P.crystal(x, z, 7) : v < 0.9 ? P.rock(x, z, BC[7].b) : P.bloom(x, z, 7);
                else v < 0.3 && !blocked(wx, wz, 18) ? P.mesa(x, z) : v < 0.75 ? P.rock(x, z, C.mesa) : P.cactus(x, z);
            }
            const g = new THREE.Group(); g.position.copy(V(x0, 0, z0)); g.matrixAutoUpdate = false; g.updateMatrix();
            for (const m of [lit.mesh(litMat), neon.mesh(neonMat)]) if (m) g.add(m);
            root.add(g); g.updateMatrixWorld(true);
            return { ci, cj, g, solids, pools };
        }

        // ---------- streaming: 5 × 5 chunks drawn around you, collision for the inner 3 × 3 ----------
        const chunks = new Map(), queue = [], baseSolids = [];
        box(baseSolids, -WB - 60, -1, -WB - 60, WB + 60, 0, WB + 60);
        box(baseSolids, -WB - 2, -1, -WB - 2, -WB, 60, WB + 2); box(baseSolids, WB, -1, -WB - 2, WB + 2, 60, WB + 2); box(baseSolids, -WB, -1, -WB - 2, WB, 60, -WB); box(baseSolids, -WB, -1, WB, WB, 60, WB + 2);
        let pci = -99, pcj = -99, stash = null;
        const cidx = v => Math.max(0, Math.min(NC - 1, Math.floor((v + WB) / CH)));
        function setSolids() {
            const s = c.solids; s.length = 0; baseSolids.forEach(b => s.push(b));
            for (let i = pci - 1; i <= pci + 1; i++) for (let j = pcj - 1; j <= pcj + 1; j++) { const ch = chunks.get(i * 64 + j); if (ch) ch.solids.forEach(b => s.push(b)); }
            s.push(new THREE.Box3(V(0, -900, 0), V(1, -899, 1)));        // a fresh last box: the collision grid sees that the list changed
        }
        function stream(lx, lz, now) {
            const ci = cidx(lx), cj = cidx(lz);
            if (ci === pci && cj === pcj && !now) return;
            pci = ci; pcj = cj; queue.length = 0;
            for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) if (i >= 0 && j >= 0 && i < NC && j < NC && !chunks.has(i * 64 + j)) queue.push([i, j, Math.max(Math.abs(i - ci), Math.abs(j - cj))]);
            queue.sort((a, b) => b[2] - a[2]);                             // nearest last: popped first
            if (now) while (queue.length) { const q = queue.pop(); chunks.set(q[0] * 64 + q[1], buildChunk(q[0], q[1])); }
            chunks.forEach((ch, k) => {
                const d = Math.max(Math.abs(ch.ci - ci), Math.abs(ch.cj - cj)); ch.g.visible = d <= 2;
                if (d > 3) { ch.g.children.forEach(m => m.geometry.dispose()); root.remove(ch.g); chunks.delete(k); }   // far behind: freed
            });
            setSolids();
        }

        // ---------- the HQ and its plaza (always there) ----------
        const signs = [];
        const sign = (key, css, w, h, x, y, z, ry = 0) => {
            const tex = canvasTex(512, 128, () => { }), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
            m.position.copy(V(x, y, z)); m.rotation.y = ry; root.add(m); const s = { key, css, tex, m }; signs.push(s); paint(s); return m;
        };
        function paint(s) {
            const g = s.tex.image.getContext('2d'); g.clearRect(0, 0, 512, 128); g.fillStyle = 'rgba(4,8,18,.82)'; g.fillRect(6, 14, 500, 100); g.strokeStyle = s.css; g.lineWidth = 5; g.strokeRect(6, 14, 500, 100);
            g.direction = lang() === 'ar' ? 'rtl' : 'ltr'; g.fillStyle = s.css; g.shadowColor = s.css; g.shadowBlur = 14; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S(s.key), 256, 68, 470); g.shadowBlur = 0;
            s.tex.needsUpdate = true;
        }
        const padMarks = [];
        (function plaza() {
            const lit = new Buf(true), neon = new Buf(false);
            lit.add(T.box, 0, 0, -32, 60, 26, 32, 0, C.tower, 1.4); lit.add(T.box, -40, 0, -30, 20, 16, 24, 0, C.tower2, 1.2); lit.add(T.box, 40, 0, -30, 20, 16, 24, 0, C.tower2, 1.2); lit.add(T.box, 0, 26, -34, 22, 18, 18, 0, C.tower2, 1.3);
            box(baseSolids, -30, 0, -48, 30, 26, -16); box(baseSolids, -50, 0, -42, -30, 16, -18); box(baseSolids, 30, 0, -42, 50, 16, -18);
            for (const [x, y, z, w, h, d, cc] of [[0, 26, -32, 60.4, 0.4, 32.4, C.cyan], [0, 44, -34, 22.4, 0.4, 18.4, C.amber], [0, 9, -15.9, 60, 0.3, 0.2, C.cyan], [0, 17, -15.9, 60, 0.3, 0.2, C.mag],
                [-4.2, 0, -15.85, 0.4, 7, 0.3, C.amber], [4.2, 0, -15.85, 0.4, 7, 0.3, C.amber], [0, 7, -15.85, 8.8, 0.4, 0.3, C.amber], [0, 44, -34, 0.5, 30, 0.5, C.white]]) neon.add(T.box, x, y, z, w, h, d, 0, cc, 0.9);
            lit.add(T.box, 0, 0, -15.9, 8, 7, 0.3, 0, C.road, 0.6);                                              // the door
            neon.add(T.hex, DOOR.x, -0.94, DOOR.z + 0.6, 5.2, 1, 5.2, 0, C.amber, 0.7);
            for (const p of pads) { const cc = p.home ? C.amber : BC[p.biome].glow; lit.add(T.hex, p.x, -0.95, p.z, 7, 1, 7, 0, C.tower2, 1.4); neon.add(T.hex, p.x, -0.92, p.z, 5.2, 1, 5.2, 0, cc, 0.8); lit.add(T.hex, p.x, -0.89, p.z, 4.2, 1, 4.2, 0, C.road); }
            for (let a = 0; a < 24; a++) neon.add(T.box, Math.sin(a * 0.2618) * 58, 0.02, -4 + Math.cos(a * 0.2618) * 58, 6, 0.06, 0.25, a * 0.2618, C.cyan, 0.7);   // plaza ring
            // perimeter wall (7 m, a 14 m gap at each gate), gate pillars, a watchtower on every corner
            const wall = (xa, za, xb, zb) => { const w = Math.abs(xb - xa) + 2, d = Math.abs(zb - za) + 2, x = (xa + xb) / 2, z = (za + zb) / 2;
                lit.add(T.box, x, 0, z, w, 7, d, 0, C.tower2, 1.5); neon.add(T.box, x, 7, z, w + 0.1, 0.25, d + 0.1, 0, C.cyan, 0.85); neon.add(T.box, x, 3.4, z, w + 0.12, 0.14, d + 0.12, 0, C.mag, 0.6);
                box(baseSolids, x - w / 2, 0, z - d / 2, x + w / 2, 7, z + d / 2); };
            for (const z of [CW.z0, CW.z1]) { wall(CW.x0, z, -8, z); wall(8, z, CW.x1, z); }
            for (const x of [CW.x0, CW.x1]) { wall(x, CW.z0, x, -8); wall(x, 8, x, CW.z1); }
            for (const G of GATES) for (const e of [-1, 1]) { const px = G.x + Math.cos(G.rot) * 8 * e, pz = G.z - Math.sin(G.rot) * 8 * e;
                lit.add(T.box, px, 0, pz, 2.6, 10.5, 2.6, 0, C.tower, 1.6); neon.add(T.box, px, 10.5, pz, 2.8, 0.3, 2.8, 0, C.amber, 0.9); box(baseSolids, px - 1.3, 0, pz - 1.3, px + 1.3, 10.5, pz + 1.3); }
            for (const x of [CW.x0, CW.x1]) for (const z of [CW.z0, CW.z1]) { lit.add(T.box, x, 0, z, 7, 15, 7, 0, C.tower, 1.5); lit.add(T.box, x, 15, z, 9, 1.2, 9, 0, C.tower2, 1.5); neon.add(T.box, x, 16.2, z, 9.2, 0.3, 9.2, 0, C.cyan, 0.9); neon.add(T.box, x, 16.5, z, 1.2, 1.2, 1.2, 0, C.white); box(baseSolids, x - 3.5, 0, z - 3.5, x + 3.5, 16, z + 3.5); }
            const g = new THREE.Group(); g.position.copy(V(0, 0, 0)); g.add(lit.mesh(litMat), neon.mesh(neonMat)); root.add(g); g.updateMatrixWorld(true);
            // pads that are far from the plaza are their own small meshes
            for (const p of pads) if (!p.plaza && !p.home) {
                const l = new Buf(true), n = new Buf(false); l.add(T.hex, 0, -0.95, 0, 7, 1, 7, 0, C.tower2, 1.4); n.add(T.hex, 0, -0.92, 0, 5.2, 1, 5.2, 0, C.amber, 0.8); l.add(T.hex, 0, -0.89, 0, 4.2, 1, 4.2, 0, C.road);
                const pg = new THREE.Group(); pg.position.copy(V(p.x, 0, p.z)); pg.add(l.mesh(litMat), n.mesh(neonMat)); root.add(pg); pg.updateMatrixWorld(true); p.g = pg;
            }
            for (const p of pads) if (!p.home) {
                const css = '#' + (p.plaza ? BIOMES[p.biome].glow : 0xffa826).toString(16).padStart(6, '0'), m = sign(p.plaza ? 'b' + p.biome : 'plaza', css, 6.4, 1.6, p.x, 3.6, p.z, p.plaza ? Math.atan2(-p.x, 14 - p.z) : 0);
                const col2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 7, 12, 1, true), glowMat(p.plaza ? BIOMES[p.biome].glow : 0xffa826, 0.07)); col2.position.copy(V(p.x, 3.5, p.z)); root.add(col2);
                padMarks.push({ p, m, col2 }); if (p.g) { p.g.add(m); p.g.add(col2); m.position.set(0, 3.6, 0); col2.position.set(0, 3.5, 0); }
            }
            sign('enter', '#ffa826', 7, 1.75, 0, 8.6, -15.6);
        })();

        // ---------- outer gates: two panels that retract into the pillars as you come near ----------
        const UPV = new THREE.Vector3(0, 1, 0);
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x2a3140 }), gDoorGeo = new THREE.BoxGeometry(7, 8, 0.5), gTrimGeo = c.PERF.mergeGeometries([[0, 2.4, 7, 0.16], [0, 5.6, 7, 0.16], [3.44, 4, 0.12, 7.6]].map(([x, y, w, h]) => ({ geo: new THREE.BoxGeometry(w, h, 0.56), matrix: new THREE.Matrix4().makeTranslation(x, y, 0) })));
        const gates = GATES.map(G => {
            const g = new THREE.Group(); g.position.copy(V(G.x, 0, G.z)); g.rotation.y = G.rot; root.add(g);
            const edgeM = glowMat(0xff2a6d), panels = [-1, 1].map(sd => {
                const p = new THREE.Group(); p.position.x = sd * 7; p.scale.z = 1; g.add(p);                    // hinged at the pillar: scaling x slides it in
                const m = new THREE.Mesh(gDoorGeo, doorMat); m.position.set(-sd * 3.5, 4, 0); p.add(m);
                const tr = new THREE.Mesh(gTrimGeo, edgeM); tr.position.x = -sd * 3.5; tr.scale.x = -sd; p.add(tr);
                return p;
            });
            const outS = sign('base', '#39d7ff', 9, 2.25, 0, 0, 0), inS = sign('zone', '#ff2a9d', 9, 2.25, 0, 0, 0);
            g.add(outS, inS); outS.position.set(0, 10.6, 0.5); outS.rotation.y = 0; inS.position.set(0, 10.6, -0.5); inS.rotation.y = Math.PI;   // from outside: the compound · from inside: the world
            return { x: G.x, z: G.z, rot: G.rot, g, panels, edgeM, open: 0, near: false };
        });
        // searchlights sweeping from the corner towers
        const searchlights = [];
        for (const x of [CW.x0, CW.x1]) for (const z of [CW.z0, CW.z1]) {
            const g = new THREE.Group(); g.position.copy(V(x, 16.8, z)); root.add(g);
            const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 30, 12, 1, true), glowMat(0xbfe6ff, 0.07)); cone.rotation.z = Math.PI / 2 + 0.5; cone.position.set(13, -7.2, 0); g.add(cone);
            searchlights.push({ g, m: cone.material, sp: (x > 0 ? 1 : -1) * (z > 0 ? 0.5 : 0.38) });
        }

        // ---------- sentries: two builds of the hero rig, baked once, drawn as instances at every post ----------
        const guards = [], guardSets = [], _hm = new THREE.Matrix4(), _hq = new THREE.Quaternion(), _sph = new THREE.Sphere(new THREE.Vector3(), 2), GR = COARSE ? 62 : 90;
        function placeGuards() {                                          // only the sentries in view and near enough are drawn at all
            const fr = cameraSystem.frustum, cam = cameraSystem.camera.position;
            for (const set of guardSets) {
                let n = 0;
                for (const g of set.list) {
                    const dx = O.x + g.x - cam.x, dz = O.z + g.z - cam.z;
                    if (dx * dx + dz * dz > GR * GR) continue;
                    _sph.center.set(O.x + g.x, O.y + 1.6, O.z + g.z); if (fr && !fr.intersectsSphere(_sph)) continue;
                    set.bodies.forEach(im => im.setMatrixAt(n, g.base));
                    _hm.compose(set.hp, _hq.setFromAxisAngle(UPV, g.yaw).multiply(set.hq), set.hs).premultiply(g.base);
                    set.heads.forEach(im => im.setMatrixAt(n, _hm)); n++;
                }
                set.all.forEach(im => { im.count = n; im.visible = n > 0; if (n) im.instanceMatrix.needsUpdate = true; });
            }
        }
        const HubM = window.AxonHub;
        if (HubM && HubM.bakeCrew) {
            const variants = [['', 'm', 'ARCTIC', 0xc68a62, 0x1c1411, 1.04, 'guard'], ['', 'a', 'COBALT', 0xf1c9a8, 0x2b2b35, 1.0, 'crossed']].map((sp, k) => HubM.bakeCrew(THREE, sp, k * 3 + 1));
            const posts = [[-6.5, -13.6, 0], [6.5, -13.6, 0]];                                                   // either side of the HQ door, and two inside every gate
            GATES.forEach(G => { const ax = Math.cos(G.rot), az = -Math.sin(G.rot), ox = Math.sin(G.rot), oz = Math.cos(G.rot); [-1, 1].forEach(sd => posts.push([G.x + ax * 11 * sd - ox * 3, G.z + az * 11 * sd - oz * 3, G.rot + Math.PI])); });
            posts.forEach(([x, z, face], i) => { box(baseSolids, x - 0.45, 0, z - 0.45, x + 0.45, 3.2, z + 0.45); guards.push({ x, z, face, vi: i % 2, yaw: 0, said: false, line: i % 4 }); });
            variants.forEach((v, vi) => {
                const list = guards.filter(g => g.vi === vi), sc = v.g.scale.x;
                const inst = mesh => { const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length); im.castShadow = !COARSE; im.frustumCulled = false; root.add(im); return im; };
                const bodies = v.g.children.filter(o => o.isMesh).map(inst), heads = v.hg.children.filter(o => o.isMesh).map(inst);
                list.forEach(g => { g.base = new THREE.Matrix4().compose(V(g.x, 0, g.z), new THREE.Quaternion().setFromAxisAngle(UPV, g.face), new THREE.Vector3(sc, sc, sc)); });
                guardSets.push({ list, bodies, heads, all: bodies.concat(heads), hp: v.hg.position.clone(), hq: v.baseQ.clone(), hs: v.hg.scale.clone() });
            });
        }

        // ---------- hostile nodes ----------
        const ringGeo = new THREE.RingGeometry(7.2, 8, 40), beaconGeo = new THREE.OctahedronGeometry(0.9, 0), beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 60, 8, 1, true);
        for (const n of nodes) {
            n.mat = glowMat(0xff2a6d); n.beamM = glowMat(0xff2a6d, 0.22);
            const g = n.g = new THREE.Group(); g.position.copy(V(n.x, 0, n.z)); root.add(g);
            const ring = new THREE.Mesh(ringGeo, n.mat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.scale.setScalar(n.hold ? 1.7 : 1); g.add(ring);
            n.beacon = new THREE.Mesh(beaconGeo, n.mat); n.beacon.position.y = 7; n.beacon.scale.setScalar(n.hold ? 2 : 1); g.add(n.beacon);
            const beam = new THREE.Mesh(beamGeo, n.beamM); beam.position.y = 30; beam.scale.set(n.hold ? 2.4 : 1, 1, n.hold ? 2.4 : 1); g.add(beam);
            n.enemies = []; n.cleared = false; n.live = false;
        }
        // beams you can see from anywhere: the HQ and the strongholds, drawn on the horizon when they are beyond the fog
        const far = [{ x: 0, z: -34, color: 0xffa826 }].concat(nodes.filter(n => n.hold));
        for (const f of far) { f.farM = glowMat(f.color || 0xff2a6d, 0.5, false); f.far = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 150, 6, 1, true), f.farM); f.far.renderOrder = -1; root.add(f.far); }

        const drop = e => { if (e.isDead) return; e.isDead = true; scene.remove(e.mesh); const k = c.enemies.indexOf(e); if (k > -1) c.enemies.splice(k, 1); };
        function spawnNode(n) {
            n.live = true; n.enemies = [];
            const AL = window.AxonAliens ? window.AxonAliens.get(c.api) : null, foes = BIOMES[n.biome].foes;
            let budget = (n.hold ? 5 : 4) + n.lvl, i = 0;
            const at = () => { const a = i * 2.4 + n.x, d = 4 + (i % 4) * 2.6; i++; return [O.x + n.x + Math.cos(a) * d, O.z + n.z + Math.sin(a) * d]; };
            if (n.hold && AL) { const [x, z] = at(); n.enemies.push(new AL.Maverick(x, O.y, z, n.lvl, n.style)); }
            for (let k = 0; budget > 0 && k < 14; k++) {
                const kind = foes[k % foes.length], [x, z] = at();
                if (kind === 'swarm' && AL) { AL.swarm(x, O.y, z, n.lvl, 5).forEach(e => { e.noReward = true; n.enemies.push(e); }); budget -= 2; }   // motes pay nothing each: the node's bonus covers them
                else if (kind === 'shell' && AL) { n.enemies.push(new AL.Shell(x, O.y, z, n.lvl)); budget -= 2; }
                else { const t = kind === 'swarm' || kind === 'shell' ? 'runner' : kind; n.enemies.push(new c.api.Enemy(x, O.y, z, t, n.lvl)); budget -= t === 'heavy' ? 3 : 1; }
            }
        }
        const setNode = (n, h) => { n.mat.color.setHex(h); n.beamM.color.setHex(h); if (n.farM) n.farM.color.setHex(h); };

        // ---------- sky: dome, grid, stars, sun and moon ----------
        const SR = 370;
        const sky = new THREE.Group(); root.add(sky);
        const domeGeo = new THREE.SphereGeometry(SR, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.56); domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(domeGeo.attributes.position.count * 3), 3));
        const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -5; sky.add(dome);
        const gridM = new THREE.LineBasicMaterial({ color: 0x39d7ff, transparent: true, opacity: 0.1, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
        const grid = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(SR - 6, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), gridM); grid.renderOrder = -4; sky.add(grid);
        const starGeo = new THREE.BufferGeometry();
        { const p = [], r = rng(99); for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, e = Math.asin(0.05 + r() * 0.95); p.push(Math.cos(a) * Math.cos(e) * (SR - 12), Math.sin(e) * (SR - 12), Math.sin(a) * Math.cos(e) * (SR - 12)); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
        const starM = new THREE.PointsMaterial({ color: 0xcfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
        const stars = new THREE.Points(starGeo, starM); stars.renderOrder = -4; sky.add(stars);
        // the sun: a hexagon inside two thin rings · the moon: a ring with a pixel face
        const disc = (r, seg, color, op) => new THREE.Mesh(new THREE.CircleGeometry(r, seg), glowMat(color, op, false));
        const sunG = new THREE.Group(), moonG = new THREE.Group(); sky.add(sunG, moonG);
        const sunCore = disc(17, 6, 0xfff2c0, 0.999); sunG.add(sunCore, new THREE.Mesh(new THREE.RingGeometry(21, 22.2, 6), glowMat(0xffd27a, 0.7, false)), new THREE.Mesh(new THREE.RingGeometry(27, 27.7, 6), glowMat(0xffd27a, 0.35, false)));
        moonG.add(new THREE.Mesh(new THREE.RingGeometry(11, 13, 24), glowMat(0xcfe0ff, 0.9, false)), disc(10.8, 24, 0x8fa8ff, 0.3));
        for (const [x, y, s] of [[-4, 3, 3], [3, -2, 4], [5, 5, 2], [-3, -5, 2.4]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), glowMat(0xcfe0ff, 0.5, false)); m.position.set(x, y, 0.1); moonG.add(m); }
        sky.traverse(o => { if (o.isMesh || o.isPoints || o.isLineSegments) o.frustumCulled = false; });
        const sunDir = new THREE.Vector3(0.4, 0.8, 0.3), zen = new THREE.Color(), hor = new THREE.Color(), lightC = new THREE.Color(), fogBias = new THREE.Color(0x9fe0b0);
        const hemi = scene.children.find(o => o.isHemisphereLight), amb = scene.children.find(o => o.isAmbientLight);
        let hour = 9, nightK = 0, wasNight = false, skyT = 0, env = null;
        const c1 = new THREE.Color(), c2 = new THREE.Color();
        function applySky() {
            let i = 0; while (i < SKY.length - 2 && hour >= SKY[i + 1][0]) i++;
            const A = SKY[i], Bk = SKY[i + 1], k = (hour - A[0]) / (Bk[0] - A[0]), lerp = (a, b) => a + (b - a) * k;
            mixc(c1.setHex(A[1]), c2.setHex(Bk[1]), k, zen); mixc(c1.setHex(A[2]), c2.setHex(Bk[2]), k, hor); mixc(c1.setHex(A[3]), c2.setHex(Bk[3]), k, lightC);
            const gk = lerp(A[6], Bk[6]); nightK = Math.max(0, Math.min(1, (gk - 0.14) / 0.86));
            hor.lerp(fogBias, 0.22 * (1 - nightK * 0.6));                                                         // every region tints its own air
            zen.convertSRGBToLinear(); hor.convertSRGBToLinear(); lightC.convertSRGBToLinear();
            scene.background.copy(hor); scene.fog.color.copy(hor);
            if (c.dirLight) { c.dirLight.color.copy(lightC); c.dirLight.intensity = lerp(A[4], Bk[4]); }
            if (hemi) { hemi.intensity = lerp(A[5], Bk[5]); hemi.color.copy(zen).lerp(C.white, 0.45); hemi.groundColor.copy(hor).multiplyScalar(0.35); }
            if (amb) amb.intensity = 0.35 + 0.25 * (1 - nightK);
            litMat.emissiveIntensity = gk; gridM.opacity = 0.05 + 0.2 * nightK; starM.opacity = nightK * 0.95; stars.visible = nightK > 0.02;
            const P = domeGeo.attributes.position, Cc = domeGeo.attributes.color;
            for (let v = 0; v < P.count; v++) { const h = Math.pow(Math.max(0, P.getY(v) / SR), 0.55); Cc.setXYZ(v, hor.r + (zen.r - hor.r) * h, hor.g + (zen.g - hor.g) * h, hor.b + (zen.b - hor.b) * h); }
            Cc.needsUpdate = true;
            // the sun rises in the east at 06:00 and sets in the west at 18:00; the moon is opposite
            const a = (hour - 6) / 12 * Math.PI, sx = Math.cos(a), sy = Math.sin(a), up = sy >= 0 ? 1 : -1;
            sunG.position.set(sx * (SR - 20), sy * (SR - 20), -70); sunG.lookAt(sky.position); moonG.position.set(-sx * (SR - 20), -sy * (SR - 20), 70); moonG.lookAt(sky.position);
            sunG.visible = sy > -0.12; moonG.visible = sy < 0.12;
            sunDir.set(sx * up, Math.max(0.3, Math.abs(sy)), -0.25 * up).normalize();                             // the light comes from whichever is up (never flatter than 17°: no endless shadows)
        }
        const clock = () => { const m = Math.floor(hour * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

        // ---------- weather: one small cloud of points that travels with you ----------
        const WN = COARSE ? 180 : 320, wGeo = new THREE.BufferGeometry(), wPh = new Float32Array(WN);
        { const p = new Float32Array(WN * 3), r = rng(5); for (let i = 0; i < WN; i++) { p[i * 3] = (r() - 0.5) * 70; p[i * 3 + 1] = r() * 26; p[i * 3 + 2] = (r() - 0.5) * 70; wPh[i] = r() * 6.28; } wGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); }
        const wMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8, depthWrite: false });
        const wPts = new THREE.Points(wGeo, wMat); wPts.frustumCulled = false; wPts.visible = false; root.add(wPts);
        let wKind = null, wNeed = true;

        // ---------- screen: fade for the door and the warp pads ----------
        const st = document.createElement('style');
        st.textContent = `#ox-fade{position:absolute;inset:0;z-index:44;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#0b0620,#010207 70%);opacity:0;pointer-events:none;transition:opacity .4s}
          #ox-fade.on{opacity:1;pointer-events:auto}
          #ox-fade div{display:grid;gap:8px;text-align:center}
          #ox-fade small{font-size:11px;letter-spacing:.45em;color:var(--magenta)}
          #ox-fade b{font:700 clamp(28px,7vmin,52px)/1 var(--font);letter-spacing:.1em;text-shadow:0 0 24px rgba(255,42,157,.45)}
          #ox-fade span{font-size:12px;color:var(--dim);letter-spacing:.2em}`;
        document.head.appendChild(st);
        const fade = document.createElement('div'); fade.id = 'ox-fade'; stage.appendChild(fade);
        const show = (small, big, sub) => { fade.dir = lang() === 'ar' ? 'rtl' : 'ltr'; fade.innerHTML = `<div><small>MTZ // ${small}</small><b>${big}</b><span>${sub}</span></div>`; fade.classList.add('on'); };

        // ---------- state ----------
        let on = false, busy = false, t = 0, region = -1, nodeT = 0, enterT = 0, padT = 0, padOff = 1.5, labelT = 0, burnT = 0, sayT = 0;
        const put = (x, z, ry) => {
            player.mesh.position.set(O.x + x, O.y + 0.05, O.z + z); player.lastSafePos.copy(player.mesh.position); player.velocity.set(0, 0, 0);
            if (ry !== undefined) { player.mesh.rotation.y = ry; cameraSystem.targetTheta = cameraSystem.theta = ry; cameraSystem.targetPhi = 0.3; cameraSystem.manualTimer = 1.5; }
            stream(x, z, true); wNeed = true;
        };
        function enter() {
            on = true; root.visible = true;
            stash = c.solids.splice(0);                                   // everything else is parked until you go back in
            env = { bg: scene.background.getHex(), fog: scene.fog.color.getHex(), den: scene.fog.density, dl: c.dirLight ? c.dirLight.intensity : 0, dc: c.dirLight ? c.dirLight.color.getHex() : 0,
                hi: hemi ? hemi.intensity : 0, hc: hemi ? hemi.color.getHex() : 0, hg: hemi ? hemi.groundColor.getHex() : 0, ai: amb ? amb.intensity : 0 };
            scene.fog.density = 0.0062;
            pci = pcj = -99; put(SPAWN.x, SPAWN.z, 0);
            c.roamLight.userData.cur = null;
            nodes.forEach(n => { n.enemies.forEach(drop); n.enemies = []; n.live = false; n.cleared = false; setNode(n, 0xff2a6d); });
            guards.forEach(g => { g.said = false; g.yaw = 0; }); gates.forEach(d => { d.open = 0; d.near = false; });
            region = -1; enterT = 0; padOff = 1.5; wasNight = hour >= 19.5 || hour < 6; applySky();
            c.setState('outside');
        }
        function leave() {
            nodes.forEach(n => { n.enemies.forEach(drop); n.enemies = []; n.live = false; });
            for (let i = c.enemyShots.length - 1; i >= 0; i--) { scene.remove(c.enemyShots[i].mesh); c.enemyShots.splice(i, 1); }
            c.solids.length = 0; if (stash) stash.forEach(b => c.solids.push(b)); stash = null;
            if (env) {
                scene.background.setHex(env.bg); scene.fog.color.setHex(env.fog); scene.fog.density = env.den;
                if (c.dirLight) { c.dirLight.intensity = env.dl; c.dirLight.color.setHex(env.dc); }
                if (hemi) { hemi.intensity = env.hi; hemi.color.setHex(env.hc); hemi.groundColor.setHex(env.hg); } if (amb) amb.intensity = env.ai;
            }
            player.lockedEnemy = null; player.attentionEnemy = null; player.combatTarget = null;
            const say = document.getElementById('hub-say'); if (say) say.classList.remove('show');
            root.visible = false; on = false;
        }
        function travel(out) {
            if (busy) return; busy = true;
            c.setState('travel');
            show(out ? 'EXIT' : 'ENTRY', out ? S('zone') : S('hq'), out ? S('leaving') : S('returning'));
            try { AudioSys.playAirlock(out); } catch (e) { }
            setTimeout(() => {
                if (out) { c.hub.suspend(); enter(); } else { leave(); c.hub.enter(); }
                c.onTravel && c.onTravel(out);
                setTimeout(() => { fade.classList.remove('on'); busy = false; if (out) setTimeout(() => { if (on) c.toast(S('hostile')); }, 700); }, 450);
            }, 520);
        }
        function warp(p) {
            if (busy) return; busy = true; c.setState('travel');
            const d = p.to ? pads.find(q => q.biome === p.to && !q.plaza) : pads[0];
            show('WARP', p.to ? S('b' + p.to) : S('plaza'), S('warp'));
            try { AudioSys.playAirlock(true); } catch (e) { }
            setTimeout(() => {
                put(d.x + (p.to ? 0 : 0), d.z + 7, 0); padOff = 2;
                setTimeout(() => { fade.classList.remove('on'); busy = false; if (on) c.setState('outside'); }, 350);
            }, 450);
        }
        if (window.AxonI18n) window.AxonI18n.onChange(() => { signs.forEach(paint); region = -1; labelT = 0; });

        // ---------- minimap ----------
        const mm = document.getElementById('minimap'), mg = mm ? mm.getContext('2d') : null;
        let mapAcc = 0;
        function drawMap(dt) {
            if (!mg || (mapAcc += dt) < 0.1) return; mapAcc = 0;
            const W = mm.width, H = mm.height, Rr = W / 2 - 2, cx = W / 2, cy = H / 2, VIEW = 340, s = 2 * Rr / VIEW;
            const lx = player.mesh.position.x - O.x, lz = player.mesh.position.z - O.z;
            const X = x => cx + (x - lx) * s, Y = z => cy + (z - lz) * s;
            const rim = (px, py, pad = 7) => { const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy); return d > Rr - pad ? [cx + dx / d * (Rr - pad), cy + dy / d * (Rr - pad), true] : [px, py, false]; };
            mg.clearRect(0, 0, W, H); mg.save();
            mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.fillStyle = 'rgba(3,4,14,0.82)'; mg.fill(); mg.clip();
            for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {                                             // the regions around you
                const wx = Math.round(lx / 50) * 50 + i * 50, wz = Math.round(lz / 50) * 50 + j * 50; if (Math.abs(wx) > WB || Math.abs(wz) > WB) continue;
                mg.fillStyle = '#' + BIOMES[biomeAt(wx, wz)[0]].g[0].toString(16).padStart(6, '0'); mg.globalAlpha = 0.42; mg.fillRect(X(wx - 25), Y(wz - 25), 50 * s + 0.6, 50 * s + 0.6);
            }
            mg.globalAlpha = 1;
            mg.strokeStyle = 'rgba(255,42,157,0.7)'; mg.lineWidth = 2; mg.strokeRect(X(-WB), Y(-WB), WB * 2 * s, WB * 2 * s);
            mg.strokeStyle = 'rgba(160,220,255,0.5)'; mg.lineWidth = Math.max(1.5, 12 * s);
            mg.beginPath(); mg.moveTo(X(0), Y(-WB)); mg.lineTo(X(0), Y(WB)); mg.moveTo(X(-WB), Y(0)); mg.lineTo(X(WB), Y(0)); mg.stroke(); mg.strokeRect(X(-RING), Y(-RING), RING * 2 * s, RING * 2 * s);
            mg.fillStyle = 'rgba(57,215,255,0.08)'; mg.fillRect(X(CW.x0), Y(CW.z0), (CW.x1 - CW.x0) * s, (CW.z1 - CW.z0) * s);
            mg.strokeStyle = 'rgba(255,42,109,0.85)'; mg.lineWidth = 1.5; mg.strokeRect(X(CW.x0), Y(CW.z0), (CW.x1 - CW.x0) * s, (CW.z1 - CW.z0) * s);
            mg.fillStyle = 'rgba(57,215,255,0.55)'; mg.fillRect(X(-30), Y(-48), 60 * s, 32 * s);
            mg.lineWidth = 3;
            for (const d of gates) { const ax = Math.cos(d.rot), az = -Math.sin(d.rot); mg.strokeStyle = d.open > 0.5 ? '#5cf0a0' : '#ffa826'; mg.beginPath(); mg.moveTo(X(d.x - ax * 7), Y(d.z - az * 7)); mg.lineTo(X(d.x + ax * 7), Y(d.z + az * 7)); mg.stroke(); }
            mg.fillStyle = '#b48cff'; for (const g of guards) { mg.beginPath(); mg.arc(X(g.x), Y(g.z), 1.6, 0, Math.PI * 2); mg.fill(); }
            for (const p of pads) { if (p.home) continue; const [px, py, far] = rim(X(p.x), Y(p.z)); if (far) continue; mg.fillStyle = '#39d7ff'; mg.fillRect(px - 2.5, py - 2.5, 5, 5); }
            for (const n of nodes) {
                const [px, py, far] = rim(X(n.x), Y(n.z)), cc = n.cleared ? '92,240,160' : '255,42,109';
                if (!far) { mg.fillStyle = `rgba(${cc},0.16)`; mg.strokeStyle = `rgba(${cc},0.95)`; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(px, py, n.hold ? 6 : 4, 0, Math.PI * 2); mg.fill(); mg.stroke(); }
                else if (n.hold && !n.cleared) { mg.fillStyle = `rgb(${cc})`; mg.beginPath(); mg.arc(px, py, 3, 0, Math.PI * 2); mg.fill(); }
            }
            mg.fillStyle = '#ff4a5a';
            for (const n of nodes) if (n.live) for (const e of n.enemies) if (!e.isDead) { const ex = X(e.mesh.position.x - O.x), ey = Y(e.mesh.position.z - O.z); mg.fillRect(ex - 1.5, ey - 1.5, 3, 3); }
            const [hx, hy] = rim(X(DOOR.x), Y(DOOR.z));                                                          // way home: amber diamond
            mg.fillStyle = '#ffa826'; mg.strokeStyle = '#1a0d00'; mg.lineWidth = 1;
            mg.beginPath(); mg.moveTo(hx, hy - 5); mg.lineTo(hx + 4, hy); mg.lineTo(hx, hy + 5); mg.lineTo(hx - 4, hy); mg.closePath(); mg.fill(); mg.stroke();
            const ry = player.mesh.rotation.y;
            mg.save(); mg.translate(cx, cy); mg.rotate(Math.atan2(Math.sin(ry), Math.cos(ry)) * -1 + Math.PI);
            mg.fillStyle = '#ffa826'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
            mg.restore(); mg.restore();
            mg.lineWidth = 2; mg.strokeStyle = nightK > 0.5 ? 'rgba(127,156,255,0.6)' : 'rgba(255,210,122,0.6)'; mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.stroke();
        }

        // ---------- per frame (only while outside) ----------
        function update(dt) {
            t += dt;
            const cam = cameraSystem.camera, pp = player.mesh.position, lx = pp.x - O.x, lz = pp.z - O.z, playing = c.getState() === 'outside';
            // time of day
            if (playing) hour = (hour + dt * 24 / DAY) % 24;
            sky.position.set(cam.position.x, O.y - 6, cam.position.z); grid.rotation.y += dt * 0.01;
            if ((skyT -= dt) <= 0) {
                skyT = 0.2; const B = biomeAt(lx, lz); fogBias.lerp(BC[B[0]].fog, 0.06); applySky();
                const night = hour >= 19.5 || hour < 6; if (night !== wasNight) { wasNight = night; if (playing) { c.toast(S(night ? 'night' : 'dawn')); try { AudioSys.playZone(); } catch (e) { } } }
                if (B[0] !== region) { region = B[0]; labelT = 0; const W = BIOMES[region].w; if (W !== wKind) { wKind = W; wNeed = true; } }
            }
            if ((labelT -= dt) <= 0) { labelT = 1; const sl = document.getElementById('stage-label'); if (sl && region >= 0) sl.textContent = `${S('b' + region)} · ${clock()} ${nightK > 0.5 ? '☾' : '☀'}`; }
            // the world around you
            stream(lx, lz, false);
            if (queue.length) { const q = queue.pop(); chunks.set(q[0] * 64 + q[1], buildChunk(q[0], q[1])); if (Math.max(Math.abs(q[0] - pci), Math.abs(q[1] - pcj)) <= 1) setSolids(); }   // one chunk a frame
            // weather
            if (wNeed) { wNeed = false; const W = WEATHER[wKind]; wPts.visible = !!W; if (W) { wMat.color.setHex(W[0]); wMat.blending = W[3] ? THREE.AdditiveBlending : THREE.NormalBlending; wMat.needsUpdate = true; const a = wGeo.attributes.position.array; for (let i = 0; i < WN; i++) { a[i * 3] = pp.x + (hash(i, 1) - 0.5) * 70; a[i * 3 + 2] = pp.z + (hash(i, 2) - 0.5) * 70; } } }
            if (wPts.visible) {
                const W = WEATHER[wKind], at = wGeo.attributes.position, a = at.array;
                for (let i = 0; i < WN; i++) { const k = i * 3; a[k] += (W[1] + Math.sin(t * 0.7 + wPh[i]) * 0.4) * dt; a[k + 1] += (W[2] + Math.sin(t + wPh[i]) * 0.15) * dt; a[k + 2] += Math.cos(t * 0.6 + wPh[i]) * 0.4 * dt;
                    if (a[k] - pp.x > 35) a[k] -= 70; else if (a[k] - pp.x < -35) a[k] += 70; if (a[k + 2] - pp.z > 35) a[k + 2] -= 70; else if (a[k + 2] - pp.z < -35) a[k + 2] += 70;
                    if (a[k + 1] > 26) a[k + 1] -= 26; else if (a[k + 1] < 0) a[k + 1] += 26; }
                at.needsUpdate = true;
            }
            // light: the key light hangs over you, tinted by the hour
            c.roamLight.position.set(pp.x, pp.y + 16, pp.z + 3); c.roamLight.color.copy(lightC);
            // lava and toxic pools burn while you stand in them
            if (playing && player.isGrounded && (burnT -= dt) <= 0) {
                const ch = chunks.get(pci * 64 + pcj);
                if (ch) for (const q of ch.pools) if ((pp.x - q.x) ** 2 + (pp.z - q.z) ** 2 < q.r * q.r && pp.y < O.y + 0.6) { burnT = 0.6; player.takeDamage(q.dps); c.api.spawnSparks(pp.clone().setY(pp.y + 0.4), q.dps > 6 ? 0xff5a1f : 0x9dff3a, 8, 6); break; }
            }
            // nodes: hostiles appear when you come near, leave when you are far, purged when all are down
            for (const n of nodes) { n.beacon.rotation.y += dt * 1.5; n.beacon.position.y = 7 + Math.sin(t * 2 + n.x) * 0.3; }
            if ((nodeT -= dt) <= 0) {
                nodeT = 0.35;
                for (const n of nodes) {
                    const d2 = (lx - n.x) ** 2 + (lz - n.z) ** 2; n.g.visible = d2 < 380 * 380;
                    if (!n.cleared && !n.live && d2 < 105 * 105 && playing) spawnNode(n);
                    else if (n.live && !n.cleared && d2 > 240 * 240) { n.enemies.forEach(drop); n.enemies = []; n.live = false; }
                    else if (n.live && !n.cleared && n.enemies.length && n.enemies.every(e => e.isDead)) {
                        n.cleared = true; setNode(n, 0x5cf0a0);
                        if (window.AxonShop) window.AxonShop.add(n.hold ? 60 + 20 * n.lvl : 15 + 10 * n.lvl, V(n.x, 8, n.z), S(n.hold ? 'hold' : 'purged'));
                        c.toast(S(n.hold ? 'hold' : 'purged')); try { AudioSys.playPurge(); } catch (e) { }
                    }
                }
                for (const m of padMarks) if (m.p.g) m.p.g.visible = (lx - m.p.x) ** 2 + (lz - m.p.z) ** 2 < 380 * 380;
            }
            // beams on the horizon
            for (const f of far) {
                const dx = f.x - lx, dz = f.z - lz, d = Math.hypot(dx, dz) || 1, k = Math.min(1, 330 / d);
                f.far.position.set(pp.x + dx * k, O.y + 75 * k, pp.z + dz * k); f.far.scale.setScalar(k); f.farM.opacity = 0.28 + 0.2 * k + Math.sin(t * 3 + f.x) * 0.06;
            }
            for (const m of padMarks) { m.col2.material.opacity = (0.05 + Math.sin(t * 3 + m.p.x) * 0.02) * (1 + nightK * 2); }
            // the compound: gates slide open as you come near, searchlights sweep (brighter at night), sentries watch you
            if (lx * lx + lz * lz < 260 * 260) {
                for (const d of gates) {
                    const near = (lx - d.x) ** 2 + (lz - d.z) ** 2 < 15 * 15 || !!(window.AxonCoop && window.AxonCoop.nearAny(O.x + d.x, O.z + d.z, 225));   // you or a teammate
                    if (near && !d.near && playing) { try { AudioSys.playGateOpen(); } catch (e) { } }
                    d.near = near; d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 6);
                    const k = Math.max(0.05, 1 - d.open * 0.95); d.panels.forEach(p => { p.scale.x = k; });
                    d.edgeM.color.setHex(d.open > 0.5 ? 0x5cf0a0 : 0xff2a6d);
                }
                searchlights.forEach(sl => { sl.g.rotation.y += sl.sp * dt; sl.m.opacity = 0.03 + 0.11 * nightK; });
                const say = document.getElementById('hub-say');
                for (const g of guards) {
                    const dx = lx - g.x, dz = lz - g.z, d2 = dx * dx + dz * dz;
                    let want = 0;
                    if (d2 < 225) { let a = Math.atan2(dx, dz) - g.face; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.9) want = Math.max(-1, Math.min(1, a)); }
                    g.yaw += (want - g.yaw) * Math.min(1, dt * 4);
                    if (playing && d2 < 16 && !g.said && say) { g.said = true; try { AudioSys.playComm(); } catch (e) { } say.innerHTML = `<b>${S('sentry')}</b>${S('say')[g.line]}`; say.classList.add('show'); sayT = 3.2; }
                }
                if (sayT > 0 && (sayT -= dt) <= 0 && say) say.classList.remove('show');
            }
            placeGuards();
            // warp pads and the HQ door
            if (padOff > 0) padOff -= dt;
            let onPad = null; if (playing && !busy && padOff <= 0) for (const p of pads) if (!p.home && (lx - p.x) ** 2 + (lz - p.z) ** 2 < 2.3 * 2.3) onPad = p;
            if (onPad) { if ((padT += dt) > 0.6) { padT = 0; warp(onPad); } } else padT = 0;
            if (playing && !busy && (lx - DOOR.x) ** 2 + (lz - DOOR.z) ** 2 < DOOR.r * DOOR.r) { if ((enterT += dt) > 0.25) travel(false); } else enterT = 0;
            drawMap(dt);
        }

        return { travel, update, showAll: () => { guardSets.forEach(set => set.all.forEach(im => { im.visible = true; })); }, get on() { return on; }, root, sunDir,
            get hour() { return hour; }, set hour(v) { hour = ((v % 24) + 24) % 24; if (on) applySky(); },
            warpTo: k => { if (on) { const d = k ? pads.find(q => q.biome === k && !q.plaza) : pads[0]; put(d.x, d.z + 7, 0); } },
            alive: () => nodes.reduce((n, nd) => n + (nd.live ? nd.enemies.filter(e => !e.isDead).length : 0), 0) };
    }

    return { create, S };
})();
