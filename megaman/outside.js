// =====================================================================
//  AXON BREACH — OUTER ZONE: the world outside the Command HQ
//   • Walk through the hangar door in the HANGAR BAY → you step out in front of the HQ building.
//   • The HQ compound: the building seen from outside, perimeter walls, watchtowers with sweeping
//     searchlights, four outer gates that slide open for you, sentries posted at every gate.
//   • Beyond the walls: a wide cyber landscape under a black, sunless sky — DATA SPIRES (north-east),
//     MONOLITH RIDGE (north-west), CIRCUIT CANYON (south) and the NEON WASTES (east / west).
//   • Six hostile nodes, each marked by a red beam you can see from afar, guarded by a cluster of the
//     same drones / stalkers / bulwarks as in mission 01 — farther from the base = tougher.
//     Purging a node pays a credit bonus. Nodes are re-infested every time you head out.
//   • Walk back into the HQ door to return inside.
//  Loaded by index.html after hub.js, before game.js.
// =====================================================================
'use strict';

window.AxonOutside = (function () {
    const L = {
        en: { hq: 'COMMAND HQ', zone: 'OUTER ZONE', base: 'HQ COMPOUND', spires: 'DATA SPIRES', ridge: 'MONOLITH RIDGE', canyon: 'CIRCUIT CANYON', wastes: 'NEON WASTES',
              gateIn: 'HQ COMPOUND', gateOut: 'OUTER ZONE', enter: 'ENTER HQ', hostile: '⚠ HOSTILE NODES DETECTED', purged: 'NODE PURGED',
              leaving: 'Leaving the base…', returning: 'Returning to HQ…', down: 'You went down in the outer zone. The recovery team brought you back to HQ.', sentry: 'SENTRY',
              say: ['Stay sharp out there. The nodes are crawling with drones.', 'Red beams mark hostile nodes. Purge them for a bonus.', 'The gates open for you, operative.', 'Come back through the HQ door when you need repairs.'] },
        ar: { hq: 'مقر القيادة', zone: 'المنطقة الخارجية', base: 'مجمّع المقر', spires: 'أبراج البيانات', ridge: 'سلسلة المونوليث', canyon: 'وادي الدوائر', wastes: 'القفار النيونية',
              gateIn: 'مجمّع المقر', gateOut: 'المنطقة الخارجية', enter: 'ادخل المقر', hostile: '⚠ تم رصد تجمعات معادية', purged: 'تم تطهير العقدة',
              leaving: 'جارٍ الخروج من القاعدة…', returning: 'العودة إلى المقر…', down: 'سقطت في المنطقة الخارجية، وأعادك فريق الإنقاذ إلى المقر.', sentry: 'حارس',
              say: ['ابقَ متيقظاً هناك، العقد مليئة بالدرونز.', 'الأشعة الحمراء تدل على عقد معادية، طهّرها لتحصل على مكافأة.', 'البوابات تُفتح لك أيها المقاتل.', 'ارجع من باب المقر إذا احتجت إصلاحاً.'] },
        es: { hq: 'CUARTEL GENERAL', zone: 'ZONA EXTERIOR', base: 'RECINTO DEL CUARTEL', spires: 'AGUJAS DE DATOS', ridge: 'CRESTA MONOLITO', canyon: 'CAÑÓN DE CIRCUITOS', wastes: 'PÁRAMO NEÓN',
              gateIn: 'RECINTO DEL CUARTEL', gateOut: 'ZONA EXTERIOR', enter: 'ENTRAR AL CUARTEL', hostile: '⚠ NODOS HOSTILES DETECTADOS', purged: 'NODO PURGADO',
              leaving: 'Saliendo de la base…', returning: 'Volviendo al cuartel…', down: 'Caíste en la zona exterior. El equipo de rescate te trajo al cuartel.', sentry: 'CENTINELA',
              say: ['Mantente alerta. Los nodos están llenos de drones.', 'Los haces rojos marcan nodos hostiles. Púrgalos para una bonificación.', 'Las puertas se abren para ti, operativo.', 'Vuelve por la puerta del cuartel si necesitas reparaciones.'] },
        zh: { hq: '指挥总部', zone: '外围区域', base: '总部营地', spires: '数据尖塔', ridge: '巨石山脊', canyon: '电路峡谷', wastes: '霓虹荒原',
              gateIn: '总部营地', gateOut: '外围区域', enter: '进入总部', hostile: '⚠ 侦测到敌对据点', purged: '据点已清除',
              leaving: '正在离开基地…', returning: '正在返回总部…', down: '你在外围区域倒下了，救援队把你带回了总部。', sentry: '哨兵',
              say: ['外面小心，据点里全是无人机。', '红色光柱标记敌对据点，清除可获得奖励。', '大门为你敞开，特工。', '需要修理就从总部大门回来。'] },
        ja: { hq: '司令部', zone: '外縁区域', base: '司令部敷地', spires: 'データ尖塔', ridge: 'モノリス尾根', canyon: '回路渓谷', wastes: 'ネオン荒野',
              gateIn: '司令部敷地', gateOut: '外縁区域', enter: '司令部へ入る', hostile: '⚠ 敵性ノードを検知', purged: 'ノード浄化',
              leaving: '基地を出発中…', returning: '司令部へ帰還中…', down: '外縁区域で倒れた。回収班が司令部へ連れ戻した。', sentry: '歩哨',
              say: ['外では気を抜くな。ノードはドローンだらけだ。', '赤い光柱は敵性ノードの印だ。浄化すればボーナスが出る。', 'ゲートは君のために開く。', '修理が必要なら司令部の扉から戻れ。'] }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const S = k => { const d = L[lang()] || L.en; return d[k] !== undefined ? d[k] : L.en[k]; };
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    // ---------- layout (local coordinates around the zone origin; -z = north) ----------
    const WB = 230;                                                   // world half size (460 × 460 m)
    const CW = { x0: -70, x1: 70, z0: -60, z1: 50 };                  // compound walls
    const GATES = [{ x: 0, z: 50, rot: 0 }, { x: 0, z: -60, rot: Math.PI }, { x: -70, z: 0, rot: -Math.PI / 2 }, { x: 70, z: 0, rot: Math.PI / 2 }];   // rot: local +z points out
    const CAMPS = [
        { x: 120, z: -130, lvl: 0, n: 4 }, { x: -130, z: -125, lvl: 1, n: 5 }, { x: -175, z: 40, lvl: 1, n: 5 },
        { x: 165, z: 70, lvl: 1, n: 5 }, { x: 40, z: 178, lvl: 2, n: 6 }, { x: -95, z: 165, lvl: 2, n: 6 }
    ];
    const DOOR = { x: 0, z: -3.6, r: 2.8 };                           // step here to go back inside
    const regionAt = (x, z) => {
        if (x > CW.x0 - 2 && x < CW.x1 + 2 && z > CW.z0 - 2 && z < CW.z1 + 2) return 'base';
        if (z < -40) return x >= 0 ? 'spires' : 'ridge';
        if (z > 70 && Math.abs(x) < 120) return 'canyon';
        return 'wastes';
    };

    function create(c) {
        const { THREE, scene, player, cameraSystem, stage, AudioSys } = c;
        const O = new THREE.Vector3(0, 0, 1200);                      // far from the facility (z ≤ 16) and the HQ (z ≈ 400)
        let seed = 918273;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };   // same world every launch
        const R = (a, b) => a + rnd() * (b - a);
        const root = new THREE.Group(); root.visible = false; scene.add(root);
        const mySolids = [];                                          // only in the shared list while you are outside
        const batcher = new c.PERF.WorldBatcher({ add: o => root.add(o) });
        const UPV = new THREE.Vector3(0, 1, 0);
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const box = (x0, y0, z0, x1, y1, z1) => mySolids.push(new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1)));
        const block = (kind, x, y, z, w, h, d, edge) => {
            box(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
            const fl = kind === 'floor', rx = fl ? w / 6 : Math.max(w, d) / 8, ry = fl ? d / 6 : h / 8;
            batcher.addBlock(kind, O.x + x, O.y + y, O.z + z, w, h, d, Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)), edge || (kind === 'door' ? 0xff2a6d : fl ? 0x3a1a66 : 0x2a7dff));
        };
        const strip = (color, x, y, z, w, h, d) => batcher.addStrip(color, O.x + x, O.y + y, O.z + z, w, h, d);
        const add = (o, x, y, z) => { o.position.set(O.x + x, O.y + y, O.z + z); root.add(o); return o; };
        const glow = (color, op = 1, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: op >= 1, side: o.side || THREE.FrontSide, fog: o.fog !== false });
        const flat = (geo, mat, x, z, y = 0.03) => { const m = add(new THREE.Mesh(geo, mat), x, y, z); m.rotation.x = -Math.PI / 2; return m; };
        const M4 = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(UPV, ry), new THREE.Vector3(sx, sy, sz));
        const mergedMesh = (list, mat) => { if (!list.length) return null; const m = new THREE.Mesh(c.PERF.mergeGeometries(list), mat); root.add(m); return m; };
        const canvasTex = (w, h, draw, srgb = true) => {
            const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
            const t = new THREE.CanvasTexture(cv); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
        };
        const edges = (x, y, z, w, d, col) => {                       // glowing rim around a flat top
            strip(col, x, y, z - d / 2 + 0.07, w, 0.08, 0.14); strip(col, x, y, z + d / 2 - 0.07, w, 0.08, 0.14);
            strip(col, x - w / 2 + 0.07, y, z, 0.14, 0.08, d); strip(col, x + w / 2 - 0.07, y, z, 0.14, 0.08, d);
        };

        // ---------- ground: black plating with a neon grid, and the firewall at the edge of the world ----------
        const repeatTex = (draw, srgb) => { const t = canvasTex(256, 256, draw, srgb); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
        const gMap = repeatTex((g, s) => {
            g.fillStyle = '#04050b'; g.fillRect(0, 0, s, s);
            g.fillStyle = '#080a16'; g.fillRect(6, 6, s / 2 - 12, s / 2 - 12); g.fillRect(s / 2 + 6, s / 2 + 6, s / 2 - 12, s / 2 - 12);
            g.strokeStyle = '#141a33'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
        }, true);
        const gEmi = repeatTex((g, s) => {
            g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
            g.fillStyle = '#b01d7a'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
            g.fillStyle = '#123f6e'; g.fillRect(0, s / 2, s, 1); g.fillRect(s / 2, 0, 1, s);
            g.fillStyle = '#39d7ff'; g.fillRect(s / 2 - 2, s / 2 - 2, 5, 5);
        }, false);
        const groundMat = new THREE.MeshLambertMaterial({ map: gMap, emissiveMap: gEmi, emissive: 0xffffff, emissiveIntensity: 0.6 });   // cheap: it fills most of the screen
        block('floor', 0, -0.5, 0, WB * 2, 1, WB * 2);
        box(-WB - 2, -1, -WB - 2, -WB, 60, WB + 2); box(WB, -1, -WB - 2, WB + 2, 60, WB + 2);   // invisible edge of the world
        box(-WB, -1, -WB - 2, WB, 60, -WB); box(-WB, -1, WB, WB, 60, WB + 2);
        const fwTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, 0, 2, h); g.fillRect(0, 0, w, 1); g.globalAlpha = 0.35; g.fillRect(31, 0, 1, h); }, false);
        fwTex.wrapS = fwTex.wrapT = THREE.RepeatWrapping; fwTex.repeat.set(70, 5);
        const fwMat = new THREE.MeshBasicMaterial({ map: fwTex, color: 0xff2a9d, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        [[0, -WB, 0], [0, WB, Math.PI], [-WB, 0, Math.PI / 2], [WB, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(WB * 2, 36), fwMat), x, 18, z); m.rotation.y = ry; });

        // ---------- the HQ building, seen from outside ----------
        block('wall', 0, 8, -22, 56, 16, 30, 0x39d7ff);                                                  // main hall
        block('wall', 0, 20, -26, 36, 8, 20, 0x39d7ff);                                                  // upper tier
        block('wall', 0, 30, -28, 10, 12, 10, 0xff2a6d);                                                 // command tower
        [-1, 1].forEach(s => {
            block('wall', s * 38, 5, -20, 20, 10, 22, 0x2a7dff);                                         // side wings (OPS / ARMORY)
            block('wall', s * 38, 12, -24, 8, 4, 8, 0x2a7dff);
            strip(0x39d7ff, s * 38, 10.06, -8.95, 20, 0.12, 0.12);
            for (const y of [3.6, 6.6]) strip(0x7ff3ff, s * 38, y, -8.94, 16, 0.14, 0.06);
            strip(0xffa826, s * 38, 1.2, -8.94, 18, 0.08, 0.06);
            for (const y of [11.4, 13.8]) strip(0x39d7ff, s * 17, y, -6.95, 18, 0.14, 0.06);             // window bands of the main hall
        });
        block('door', 0, 5, -6.6, 14, 10, 0.8);                                                          // the hangar door you came out of
        strip(0xffa826, 0, 10.2, -6.12, 14.8, 0.18, 0.1); [-1, 1].forEach(s => strip(0xffa826, s * 7.3, 5, -6.12, 0.18, 10.4, 0.1));
        strip(0x39d7ff, 0, 16.06, -7.02, 56, 0.12, 0.12);
        strip(0xff2a6d, 0, 24.06, -15.98, 36, 0.12, 0.12);
        strip(0xff2a6d, 0, 36.06, -22.98, 10, 0.12, 0.12); strip(0xff2a6d, 0, 30, -22.95, 0.3, 10, 0.06);
        edges(0, 16.05, -22, 56, 30, 0x1d6fb8); edges(0, 24.05, -26, 36, 20, 0x1d6fb8);

        // ---------- compound: perimeter walls with four gates, watchtowers at the corners ----------
        const WH = 6, wallSeg = (x, z, w, d) => {
            block('wall', x, WH / 2, z, w, WH, d, 0xff2a6d);
            strip(0xff2a6d, x, WH + 0.06, z, w, 0.12, d);
            if (w > d) { strip(0x39d7ff, x, 3, z - d / 2 - 0.03, w, 0.1, 0.06); strip(0x39d7ff, x, 3, z + d / 2 + 0.03, w, 0.1, 0.06); }
            else { strip(0x39d7ff, x - w / 2 - 0.03, 3, z, 0.06, 0.1, d); strip(0x39d7ff, x + w / 2 + 0.03, 3, z, 0.06, 0.1, d); }
        };
        [CW.z1, CW.z0].forEach(z => [-1, 1].forEach(s => wallSeg(s * 38, z, 64, 1.5)));
        [CW.x0, CW.x1].forEach(x => { wallSeg(x, -33, 1.5, 54); wallSeg(x, 28, 1.5, 44); });
        GATES.forEach(G => {
            const ax = Math.cos(G.rot), az = -Math.sin(G.rot);                                           // across the doorway
            [-1, 1].forEach(s => { block('wall', G.x + ax * 7.5 * s, 5, G.z + az * 7.5 * s, 3, 10, 3, 0x39d7ff); strip(0x7ff3ff, G.x + ax * 7.5 * s, 10.1, G.z + az * 7.5 * s, 3.1, 0.2, 3.1); });
            block('wall', G.x, 9.5, G.z, Math.abs(ax) * 12 + Math.abs(az) * 2.2, 1.6, Math.abs(az) * 12 + Math.abs(ax) * 2.2, 0x39d7ff);
        });
        const TOWERS = [[CW.x0, CW.z0], [CW.x1, CW.z0], [CW.x0, CW.z1], [CW.x1, CW.z1]];
        TOWERS.forEach(([x, z]) => {
            block('wall', x, 7, z, 5, 14, 5, 0xffa826); block('wall', x, 15.5, z, 7, 3, 7, 0xffa826);
            strip(0x7ff3ff, x, 15.6, z, 7.1, 0.5, 7.1); strip(0xff2a6d, x, 17.2, z, 1.2, 0.4, 1.2);
        });

        // ---------- inside the compound: road, lamp posts, landing pads, a parked shuttle, crates ----------
        [-4.5, 4.5].forEach(x => strip(0x39d7ff, x, 0.03, 21.5, 0.12, 0.04, 55));
        for (let z = -4; z < 48; z += 5) strip(0xffa826, 0, 0.03, z, 0.18, 0.04, 2.4);
        for (let z = 5; z <= 45; z += 10) [-9, 9].forEach(x => { block('wall', x, 3, z, 0.4, 6, 0.4, 0x39d7ff); strip(0x7ff3ff, x, 6.2, z, 0.9, 0.3, 0.9); });
        block('wall', -36, 2.2, 22, 6, 2.6, 13, 0xffa826); block('wall', -36, 2, 24, 17, 0.5, 4, 0xffa826);      // shuttle hull + wings
        block('wall', -36, 4.4, 27.5, 0.6, 3, 3, 0xffa826); strip(0x7ff3ff, -36, 2.9, 15.45, 3.6, 0.8, 0.06);
        [-1.8, 1.8].forEach(dx => strip(0xff7a2a, -36 + dx, 2.2, 28.55, 1.2, 1.2, 0.06));
        for (const [x, y, z] of [[52, 1, -40], [52, 3, -40], [55, 1, -40], [-55, 1, -45], [-52, 1, -45], [58, 1, 38], [-60, 1, 5]]) block('wall', x, y, z, 2.2, 2, 2.2, 0xffa826);

        // ---------- roads from every gate out to the edge ----------
        GATES.forEach(G => {
            const ox = Math.round(Math.sin(G.rot)), oz = Math.round(Math.cos(G.rot)), from = Math.abs(ox) ? Math.abs(G.x) : Math.abs(G.z), len = WB - 6 - from;
            const mid = from + len / 2;
            [-5, 5].forEach(s => { if (ox) strip(0x1d6fb8, ox * mid, 0.03, s, len, 0.04, 0.14); else strip(0x1d6fb8, s, 0.03, oz * mid, 0.14, 0.04, len); });
            for (let k = from + 4; k < WB - 8; k += 7) { if (ox) strip(0x39d7ff, ox * k, 0.03, 0, 3, 0.04, 0.2); else strip(0x39d7ff, 0, 0.03, oz * k, 0.2, 0.04, 3); }
        });

        // ---------- the cyber landscape beyond the walls (placed once, same every time) ----------
        const placed = [];
        const free = (x, z, r) => {
            if (Math.abs(x) > WB - 8 - r || Math.abs(z) > WB - 8 - r) return false;
            if (x > CW.x0 - 18 - r && x < CW.x1 + 18 + r && z > CW.z0 - 18 - r && z < CW.z1 + 18 + r) return false;
            if ((Math.abs(x) < 9 + r && (z > CW.z1 || z < CW.z0)) || (Math.abs(z) < 9 + r && (x > CW.x1 || x < CW.x0))) return false;   // keep the roads clear
            for (const cp of CAMPS) if ((x - cp.x) ** 2 + (z - cp.z) ** 2 < (18 + r) ** 2) return false;
            for (const p of placed) if ((x - p.x) ** 2 + (z - p.z) ** 2 < (p.r + r + 3) ** 2) return false;
            placed.push({ x, z, r }); return true;
        };
        const scatter = (gen, r, n, fn) => { let k = 0, tries = 0; while (k < n && tries++ < n * 60) { const [x, z] = gen(); const rr = typeof r === 'function' ? r() : r; if (free(x, z, rr)) { fn(x, z, rr); k++; } } };

        // DATA SPIRES (north-east): towering neon crystals
        const octa = new THREE.OctahedronGeometry(1, 0), ringG = new THREE.RingGeometry(1, 1.12, 6); ringG.rotateX(-Math.PI / 2);
        const SPIRE_COLS = [0x39d7ff, 0xff2a9d, 0x8f6bff], spireParts = SPIRE_COLS.map(() => []), spireRings = [];
        const spire = (x, z, r, h) => {
            const k = Math.floor(rnd() * 3);
            spireParts[k].push({ geo: octa, matrix: M4(x, h, z, r, h, r, rnd() * Math.PI) });
            for (let i = 0; i < 3; i++) { const a = rnd() * Math.PI * 2, d = r * R(1.3, 2.2), hh = h * R(0.15, 0.35); spireParts[k].push({ geo: octa, matrix: M4(x + Math.cos(a) * d, hh, z + Math.sin(a) * d, r * 0.35, hh, r * 0.35, rnd()) }); }
            spireRings.push({ geo: ringG, matrix: M4(x, 0.04, z, r * 2.4, 1, r * 2.4) });
            box(x - r * 0.7, 0, z - r * 0.7, x + r * 0.7, h * 1.7, z + r * 0.7);
        };
        scatter(() => [R(80, 220), R(-220, -75)], 3, 26, (x, z) => spire(x, z, R(1.6, 3.2), R(8, 26)));
        scatter(() => [R(-220, 220), R(-220, 220)], 2, 18, (x, z) => spire(x, z, R(1, 2), R(4, 10)));

        // MONOLITH RIDGE (north-west): stepped plateaus you can climb, and tall standing slabs
        scatter(() => [R(-218, -80), R(-218, -75)], 17, 8, (x, z) => {
            const w = R(14, 24), d = R(14, 24), h = R(1.6, 2.4);
            block('wall', x, h / 2, z, w, h, d, 0x8f6bff); edges(x, h + 0.04, z, w, d, 0x8f6bff);
            if (rnd() < 0.75) {
                const w2 = w * R(0.4, 0.6), d2 = d * R(0.4, 0.6), h2 = h + R(1.8, 2.6), x2 = x + R(-2, 2), z2 = z + R(-2, 2);
                block('wall', x2, (h + h2) / 2, z2, w2, h2 - h, d2, 0x8f6bff); edges(x2, h2 + 0.04, z2, w2, d2, 0xff2a9d);
                if (rnd() < 0.5) { const sh = R(8, 14); block('wall', x2, h2 + sh / 2, z2, 2, sh, 5, 0x8f6bff); strip(0xff2a9d, x2, h2 + sh / 2, z2 + 2.55, 0.2, sh * 0.8, 0.06); }
            }
        });
        scatter(() => [R(-218, -80), R(-218, -60)], 4, 12, (x, z) => {
            const h = R(8, 20), thin = rnd() < 0.5, w = thin ? 2.5 : R(5, 9), d = thin ? R(5, 9) : 2.5;
            block('wall', x, h / 2, z, w, h, d, 0xff2a9d);
            if (thin) { strip(0xff2a9d, x - 1.3, h / 2, z, 0.06, h * 0.8, 0.2); strip(0xff2a9d, x + 1.3, h / 2, z, 0.06, h * 0.8, 0.2); }
            else { strip(0xff2a9d, x, h / 2, z - 1.3, 0.2, h * 0.8, 0.06); strip(0xff2a9d, x, h / 2, z + 1.3, 0.2, h * 0.8, 0.06); }
        });

        // CIRCUIT CANYON (south): long ridges carrying glowing traces, circuitry etched into the floor
        scatter(() => [R(-115, 115), R(88, 205)], 20, 12, (x, z) => {
            const len = R(24, 40), wd = R(3, 5), h = R(3.5, 7), alongZ = rnd() < 0.65;
            if (alongZ) { block('wall', x, h / 2, z, wd, h, len, 0x39d7ff); strip(0x39d7ff, x, h + 0.05, z, 0.25, 0.06, len - 2); strip(0xff2a9d, x - wd / 2 - 0.03, h * 0.5, z, 0.06, 0.12, len - 3); strip(0xff2a9d, x + wd / 2 + 0.03, h * 0.5, z, 0.06, 0.12, len - 3); }
            else { block('wall', x, h / 2, z, len, h, wd, 0x39d7ff); strip(0x39d7ff, x, h + 0.05, z, len - 2, 0.06, 0.25); strip(0xff2a9d, x, h * 0.5, z - wd / 2 - 0.03, len - 3, 0.12, 0.06); strip(0xff2a9d, x, h * 0.5, z + wd / 2 + 0.03, len - 3, 0.12, 0.06); }
        });
        for (let i = 0; i < 46; i++) {
            let x = R(-120, 120), z = R(80, 215); if (Math.abs(x) < 10) continue;
            const col = rnd() < 0.8 ? 0x1d6fb8 : 0xff2a9d, a = R(6, 22) * (rnd() < 0.5 ? -1 : 1), b = R(6, 22) * (rnd() < 0.5 ? -1 : 1);
            strip(col, x + a / 2, 0.035, z, Math.abs(a), 0.04, 0.16); strip(col, x + a, 0.035, z + b / 2, 0.16, 0.04, Math.abs(b));
            strip(col, x, 0.04, z, 0.9, 0.05, 0.9); strip(col, x + a, 0.04, z + b, 0.9, 0.05, 0.9);
        }

        // NEON WASTES (east / west): pylons strung with light, pools of liquid data, wreckage
        const pylons = { e: [], w: [] };
        ['e', 'w'].forEach(sd => {
            const sg = sd === 'e' ? 1 : -1;
            scatter(() => [sg * R(82, 215), R(-35, 215)], 2, 14, (x, z) => { block('wall', x, 8, z, 1, 16, 1, 0x39d7ff); strip(0x7ff3ff, x, 16.3, z, 1.7, 0.6, 1.7); pylons[sd].push([x, z]); });
            scatter(() => [sg * R(82, 215), R(-35, 215)], 3, 12, (x, z) => { const s = R(1.5, 4); block('wall', x, s / 2, z, s, s, s, 0xff2a9d); if (rnd() < 0.4) block('wall', x + R(-1, 1), s + 0.6, z + R(-1, 1), 1.2, 1.2, 1.2, 0xff2a9d); });
        });
        const cablePts = [];
        ['e', 'w'].forEach(sd => {
            const P = pylons[sd], done = new Set();
            P.forEach((p, i) => {
                let best = -1, bd = Infinity;
                P.forEach((q, j) => { if (i === j) return; const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd && !done.has(j + ':' + i)) { bd = d; best = j; } });
                if (best < 0 || bd > 90 * 90) return; done.add(i + ':' + best);
                const a = V(p[0], 15.8, p[1]), b = V(P[best][0], 15.8, P[best][1]), m = a.clone().lerp(b, 0.5); m.y -= 2.5;
                cablePts.push(a.x, a.y, a.z, m.x, m.y, m.z, m.x, m.y, m.z, b.x, b.y, b.z);
            });
        });
        if (cablePts.length) {
            const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cablePts, 3));
            root.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
        }
        const poolTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#021a26'; g.fillRect(0, 0, w, h); g.fillStyle = '#39d7ff'; for (let y = 0; y < h; y += 8) { g.globalAlpha = 0.25 + (y % 24 === 0 ? 0.45 : 0); g.fillRect(0, y, w, 2); } g.globalAlpha = 1; }, false);
        poolTex.wrapS = poolTex.wrapT = THREE.RepeatWrapping; poolTex.repeat.set(3, 3);
        const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: 0x39d7ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        const poolRim = glow(0x7ff3ff, 0.8), decor = [];                 // things hidden when far away
        ['e', 'w'].forEach(sd => scatter(() => [(sd === 'e' ? 1 : -1) * R(85, 212), R(-30, 212)], 10, 5, (x, z) => {
            const rad = R(6, 10); decor.push(flat(new THREE.CircleGeometry(rad, 40), poolMat, x, z, 0.035), flat(new THREE.RingGeometry(rad, rad + 0.35, 48), poolRim, x, z, 0.04));
        }));

        // ---------- hostile nodes: a red pylon, a ring on the ground, cover, and a beam you can see from afar ----------
        const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 70, 8, 1, true), campRingGeo = new THREE.RingGeometry(11.5, 12, 64), hexGeo = new THREE.RingGeometry(3, 3.4, 6);
        const campMarkGeo = c.PERF.mergeGeometries([{ geo: campRingGeo, matrix: new THREE.Matrix4() }, { geo: hexGeo, matrix: new THREE.Matrix4() }]);
        const camps = CAMPS.map(cp => {
            block('wall', cp.x, 3, cp.z, 2, 6, 2, 0xff2a6d);
            for (let i = 0; i < 3; i++) {
                const a = i / 3 * Math.PI * 2 + 0.6, h = R(1.4, 2.4), long = rnd() < 0.5;
                block('wall', cp.x + Math.cos(a) * 8, h / 2, cp.z + Math.sin(a) * 8, long ? R(3.5, 5) : 1.8, h, long ? 1.8 : R(3.5, 5), 0xff2a6d);
            }
            const ringM = glow(0xff2a6d, 0.8), beamM = glow(0xff2a6d, 0.22, { side: THREE.DoubleSide, fog: false }), beaconM = glow(0xff2a6d);
            decor.push(flat(campMarkGeo, ringM, cp.x, cp.z));
            add(new THREE.Mesh(beamGeo, beamM), cp.x, 41, cp.z);
            const beacon = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), beaconM), cp.x, 7.2, cp.z); decor.push(beacon);
            return { ...cp, enemies: [], cleared: false, beacon, beamM, setColor(h) { ringM.color.setHex(h); beamM.color.setHex(h); beaconM.color.setHex(h); } };
        });

        batcher.finish({ floor: groundMat, wall: c.blockMat('wall'), door: c.blockMat('door') });

        const spireMats = SPIRE_COLS.map(col => new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 1.1 }));   // glowing crystals: no PBR needed
        spireParts.forEach((list, k) => { const m = mergedMesh(list, spireMats[k]); if (m) m.castShadow = true; });
        mergedMesh(spireRings, glow(0x8f6bff, 0.55, { side: THREE.DoubleSide }));

        // HQ details: antenna with a blinking beacon, sign over the door, entrance ring
        const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.9, roughness: 0.3 })), 0, 42, -28);
        mast.castShadow = true;
        const hqBeacon = add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), glow(0xff2a6d)), 0, 48.4, -28);
        const hqSign = canvasTex(1024, 144, (g, w, h) => {
            g.fillStyle = '#04111f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#39d7ff'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
            g.font = `700 76px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#39d7ff'; g.shadowBlur = 16;
            g.fillStyle = '#e6eef6'; g.fillText('MTZ', w / 2 - 250, h / 2 + 4); g.fillStyle = '#39d7ff'; g.fillText('//', w / 2 - 120, h / 2 + 4); g.fillStyle = '#ffa826'; g.fillText('COMMAND HQ', w / 2 + 130, h / 2 + 4);
        });
        add(new THREE.Mesh(new THREE.PlaneGeometry(13, 1.83), new THREE.MeshBasicMaterial({ map: hqSign })), 0, 12.6, -6.93);
        const doorRingM = glow(0xffa826, 0.8);
        const doorRing = flat(new THREE.RingGeometry(DOOR.r - 0.3, DOOR.r, 48), doorRingM, DOOR.x, DOOR.z);
        const doorMarker = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), glow(0xffa826)), DOOR.x, 3.4, DOOR.z); doorMarker.scale.y = 1.5;
        flat(new THREE.RingGeometry(5.3, 5.6, 6), glow(0x39d7ff, 0.5), 36, 22); flat(new THREE.RingGeometry(7.2, 7.4, 48), glow(0xffa826, 0.5), 36, 22);   // empty landing pad
        flat(new THREE.RingGeometry(7.2, 7.4, 48), glow(0xffa826, 0.5), -36, 22);

        // watchtower searchlights sweeping the ground
        const coneG = new THREE.ConeGeometry(5, 26, 24, 1, true); coneG.translate(0, -13, 0);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });
        const searchlights = TOWERS.map(([x, z], i) => {
            const g = add(new THREE.Group(), x, 16.5, z); const b = new THREE.Mesh(coneG, beamMat); b.rotation.z = 1.0; g.add(b);
            g.rotation.y = i * 1.6; return { g, sp: (i % 2 ? -1 : 1) * R(0.35, 0.55) };
        });

        // ---------- sign painting (localised, repainted on language change) ----------
        const signs = [];
        function paintSign(sg) {
            const g = sg.cv.getContext('2d'), W = sg.cv.width, H = sg.cv.height;
            g.clearRect(0, 0, W, H); g.fillStyle = '#04111f'; g.fillRect(0, 0, W, H);
            g.strokeStyle = sg.css; g.lineWidth = 4; g.strokeRect(3, 3, W - 6, H - 6);
            g.fillStyle = sg.css; g.fillRect(3, 3, 14, H - 6); g.fillRect(W - 17, 3, 14, H - 6);
            g.direction = lang() === 'ar' ? 'rtl' : 'ltr';
            g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.shadowColor = sg.css; g.shadowBlur = 12; g.fillStyle = sg.css;
            g.fillText(S(sg.key), W / 2, H / 2 + 2, W - 70); g.shadowBlur = 0;
            sg.tex.needsUpdate = true;
        }
        const signPlane = (key, css, w, h) => {
            const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
            const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
            const sg = { cv, tex, key, css }; paintSign(sg); signs.push(sg);
            return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
        };
        const enterSign = add(signPlane('enter', '#ffa826', 4.2, 0.8), DOOR.x, 3.9 + 0.8, DOOR.z - 0.4);

        // ---------- outer gates: panels retract into the pillars as you come near ----------
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a3140, metalness: 0.8, roughness: 0.35, envMapIntensity: 1 });
        const gDoorGeo = new THREE.BoxGeometry(6, 8, 0.4), gBandGeo = new THREE.BoxGeometry(6, 0.16, 0.46), gEdgeGeo = new THREE.BoxGeometry(0.12, 7.6, 0.48);
        const gates = GATES.map(G => {
            const g = add(new THREE.Group(), G.x, 0, G.z); g.rotation.y = G.rot;
            const edgeM = glow(0xff2a6d), panels = [-1, 1].map(s => {
                const p = new THREE.Group(); p.position.x = s * 6; g.add(p);
                const m = new THREE.Mesh(gDoorGeo, doorMat); m.position.set(-s * 3, 4, 0); m.castShadow = true; p.add(m);
                const tr = (geo, x, y) => ({ geo, matrix: new THREE.Matrix4().makeTranslation(x, y, 0) });
                p.add(new THREE.Mesh(c.PERF.mergeGeometries([tr(gBandGeo, -s * 3, 2.4), tr(gBandGeo, -s * 3, 5.6), tr(gEdgeGeo, -s * 0.1, 4)]), edgeM));   // glowing trim: one mesh
                return p;
            });
            const outS = signPlane('gateIn', '#39d7ff', 8, 1.2); outS.position.set(0, 9.5, 1.12); g.add(outS);                // seen from outside: the compound
            const inS = signPlane('gateOut', '#ff2a9d', 8, 1.2); inS.position.set(0, 9.5, -1.12); inS.rotation.y = Math.PI; g.add(inS);   // seen from inside: the outer zone
            decor.push(g);
            return { x: G.x, z: G.z, rot: G.rot, panels, edgeM, open: 0, near: false };
        });

        // ---------- sentries: two builds of the hero rig, baked once, cloned to every post ----------
        const guards = [], guardSets = [], _hm = new THREE.Matrix4(), _hq = new THREE.Quaternion(), _sph = new THREE.Sphere(new THREE.Vector3(), 2);
        function placeHeads() {                                           // pack only the sentries in view and within 90 m
            const fr = cameraSystem.frustum, cam = cameraSystem.camera.position;
            for (const set of guardSets) {
                let n = 0;
                for (const g of set.list) {
                    const dx = O.x + g.x - cam.x, dz = O.z + g.z - cam.z;
                    if (dx * dx + dz * dz > 90 * 90) continue;
                    _sph.center.set(O.x + g.x, O.y + 1.6, O.z + g.z); if (fr && !fr.intersectsSphere(_sph)) continue;
                    set.bodies.forEach(im => im.setMatrixAt(n, g.base));
                    _hm.compose(set.hp, _hq.setFromAxisAngle(UPV, g.yaw).multiply(set.hq), set.hs).premultiply(g.base);
                    set.heads.forEach(im => im.setMatrixAt(n, _hm)); n++;
                }
                set.bodies.concat(set.heads).forEach(im => { im.count = n; im.visible = n > 0; if (n) im.instanceMatrix.needsUpdate = true; });   // none in view: no draw call at all
            }
        }
        const HubM = window.AxonHub;
        if (HubM && HubM.bakeCrew) {
            const variants = [['', 'm', 'ARCTIC', 0xc68a62, 0x1c1411, 1.04, 'guard'], ['', 'a', 'COBALT', 0xf1c9a8, 0x2b2b35, 1.0, 'crossed']].map((s, k) => HubM.bakeCrew(THREE, s, k * 3 + 1));
            const posts = [[-6.5, -3, 0], [6.5, -3, 0]];
            GATES.forEach(G => { const ax = Math.cos(G.rot), az = -Math.sin(G.rot), ox = Math.sin(G.rot), oz = Math.cos(G.rot); [-1, 1].forEach(s => posts.push([G.x + ax * 10 * s - ox * 2.5, G.z + az * 10 * s - oz * 2.5, G.rot + Math.PI])); });   // backs to the wall, watching the compound
            posts.forEach(([x, z, face], i) => { box(x - 0.45, 0, z - 0.45, x + 0.45, 3.2, z + 0.45); guards.push({ x, z, face, vi: i % 2, k: 0, yaw: 0, dirty: true, said: false, line: i % 4 }); });
            // every sentry of one build shares one InstancedMesh per material: a handful of draw calls for all of them
            variants.forEach((v, vi) => {
                const list = guards.filter(g => g.vi === vi), sc = v.g.scale.x; list.forEach((g, k) => { g.k = k; });
                const inst = mesh => { const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length); im.castShadow = true; im.frustumCulled = false; root.add(im); return im; };
                const bodies = v.g.children.filter(o => o.isMesh).map(inst), heads = v.hg.children.filter(o => o.isMesh).map(inst);
                list.forEach(g => { g.base = new THREE.Matrix4().compose(V(g.x, 0, g.z), new THREE.Quaternion().setFromAxisAngle(UPV, g.face), new THREE.Vector3(sc, sc, sc)); bodies.forEach(im => im.setMatrixAt(g.k, g.base)); });
                guardSets.push({ list, bodies, heads, hp: v.hg.position.clone(), hq: v.baseQ.clone(), hs: v.hg.scale.clone() });
            });
        }

        // ---------- sky: black, no sun — stars, a horizon glow, a vast wireframe datasphere and a halo ring ----------
        const sky = new THREE.Group(); root.add(sky);
        {
            const N = 1800, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tc = new THREE.Color();
            for (let i = 0; i < N; i++) {
                const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.02, r = Math.sqrt(1 - y * y), d = 340;
                pos[i * 3] = Math.cos(a) * r * d; pos[i * 3 + 1] = y * d; pos[i * 3 + 2] = Math.sin(a) * r * d;
                const k = rnd(); tc.setHex(k < 0.7 ? 0xffffff : k < 0.85 ? 0x7ff3ff : 0xff7ad9).multiplyScalar(0.5 + rnd() * 0.5);
                col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
            }
            const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
            const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.95, depthWrite: false }));
            stars.frustumCulled = false; sky.add(stars);
        }
        const hzTex = canvasTex(4, 256, (g, w, h) => {
            const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(60,20,120,0.18)'); gr.addColorStop(0.9, 'rgba(255,42,157,0.45)'); gr.addColorStop(1, 'rgba(255,42,157,0.6)');
            g.fillStyle = gr; g.fillRect(0, 0, w, h);
        });
        const horizon = new THREE.Mesh(new THREE.CylinderGeometry(335, 335, 140, 64, 1, true),
            new THREE.MeshBasicMaterial({ map: hzTex, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false, depthWrite: false }));
        horizon.position.y = 60; horizon.frustumCulled = false; sky.add(horizon);
        const datasphere = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(60, 1)),
            new THREE.LineBasicMaterial({ color: 0x8f6bff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
        datasphere.position.set(-150, 170, -220); datasphere.frustumCulled = false; sky.add(datasphere);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(120, 0.8, 6, 160), glow(0x39d7ff, 0.35, { fog: false }));
        halo.position.set(40, 180, 160); halo.rotation.set(1.2, 0.3, 0); halo.frustumCulled = false; sky.add(halo);

        // floating wireframe cubes and rings drifting over the landscape
        // all cubes of one colour live in ONE line mesh (2 draw calls for 26 cubes); vertices re-posed on the CPU each frame
        const cubeE = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)).attributes.position.array;
        const cubeMats = [0x39d7ff, 0xff2a9d].map(col => new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
        const cubes = [[], []];
        for (let i = 0, tries = 0; i < 26 && tries < 400; tries++) {
            const x = R(-WB + 20, WB - 20), z = R(-WB + 20, WB - 20);
            if (x > CW.x0 - 10 && x < CW.x1 + 10 && z > CW.z0 - 10 && z < CW.z1 + 10) continue;
            cubes[i % 2].push({ p: V(x, R(18, 42), z), s: R(3, 8), rx: rnd() * 6, ry: rnd() * 6, sx: R(-0.4, 0.4), sy: R(0.2, 0.6), ph: rnd() * 6 }); i++;
        }
        const cubeLines = cubes.map((list, ci) => {
            const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(list.length * cubeE.length), 3));
            geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
            const l = new THREE.LineSegments(geo, cubeMats[ci]); l.frustumCulled = false; root.add(l); return l;
        });
        const _cm = new THREE.Matrix4(), _ce = new THREE.Euler(), _cq = new THREE.Quaternion(), _cs = new THREE.Vector3(), _cv = new THREE.Vector3(), _cp = new THREE.Vector3();
        function poseCubes() {
            cubes.forEach((list, ci) => {
                const a = cubeLines[ci].geometry.attributes.position, arr = a.array;
                list.forEach((cb, k) => {
                    _cm.compose(_cp.set(cb.p.x, cb.p.y + Math.sin(t * 0.5 + cb.ph) * 1.5, cb.p.z), _cq.setFromEuler(_ce.set(cb.rx, cb.ry, 0)), _cs.setScalar(cb.s));
                    for (let v = 0, o = k * cubeE.length; v < cubeE.length; v += 3) { _cv.set(cubeE[v], cubeE[v + 1], cubeE[v + 2]).applyMatrix4(_cm); arr[o + v] = _cv.x; arr[o + v + 1] = _cv.y; arr[o + v + 2] = _cv.z; }
                });
                a.needsUpdate = true;
            });
        }
        // rings: one InstancedMesh per colour (unit torus scaled per ring)
        const torus = new THREE.TorusGeometry(1, 0.014, 6, 64), rings = [[], []];
        for (let i = 0, tries = 0; i < 8 && tries < 200; tries++) {
            const x = R(-WB + 30, WB - 30), z = R(-WB + 30, WB - 30);
            if (x > CW.x0 - 20 && x < CW.x1 + 20 && z > CW.z0 - 20 && z < CW.z1 + 20) continue;
            rings[i % 2].push({ p: V(x, R(22, 45), z), s: R(6, 14), rx: R(0, 3), ry: R(0, 3), sx: R(0.1, 0.3), sy: R(-0.3, 0.3), ph: rnd() * 6 }); i++;
        }
        const ringIM = rings.map((list, ci) => { const im = new THREE.InstancedMesh(torus, glow(ci ? 0xff2a9d : 0x39d7ff, 0.7), list.length); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(im); return im; });
        function poseRings() {
            rings.forEach((list, ci) => {
                list.forEach((r, k) => { _cm.compose(_cp.set(r.p.x, r.p.y + Math.sin(t * 0.5 + r.ph) * 1.5, r.p.z), _cq.setFromEuler(_ce.set(r.rx, r.ry, 0)), _cs.setScalar(r.s)); ringIM[ci].setMatrixAt(k, _cm); });
                ringIM[ci].instanceMatrix.needsUpdate = true;
            });
        }

        // ---------- travel fade (in and out of the HQ) ----------
        const st = document.createElement('style');
        st.textContent = `#ox-fade{position:absolute;inset:0;z-index:44;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#0b0620,#010207 70%);opacity:0;pointer-events:none;transition:opacity .45s}
          #ox-fade.on{opacity:1;pointer-events:auto}
          #ox-fade div{display:grid;gap:8px;text-align:center}
          #ox-fade small{font-size:11px;letter-spacing:.45em;color:var(--magenta)}
          #ox-fade b{font:700 clamp(28px,7vmin,52px)/1 var(--font);letter-spacing:.1em;text-shadow:0 0 24px rgba(255,42,157,.45)}
          #ox-fade span{font-size:12px;color:var(--dim);letter-spacing:.2em}`;
        document.head.appendChild(st);
        const fade = document.createElement('div'); fade.id = 'ox-fade'; stage.appendChild(fade);

        // ---------- state ----------
        let cullT = 0, stash = null, on = false, busy = false, t = 0, region = null, campT = 0, enterT = 0, sayT = 0, saved = null;
        const drop = e => { if (e.isDead) return; e.isDead = true; scene.remove(e.mesh); const k = c.enemies.indexOf(e); if (k > -1) c.enemies.splice(k, 1); };
        function spawnCamps() {
            for (const cp of camps) {
                cp.enemies.forEach(drop); cp.enemies = []; cp.cleared = false; cp.setColor(0xff2a6d);
                for (let i = 0; i < cp.n; i++) {
                    const a = i / cp.n * Math.PI * 2 + Math.random() * 0.8, r = 4 + Math.random() * 7, rr = Math.random(), heavy = 0.08 + 0.12 * cp.lvl;
                    const type = rr < heavy ? 'heavy' : rr < heavy + 0.38 ? 'drone' : 'runner';
                    cp.enemies.push(new c.api.Enemy(O.x + cp.x + Math.cos(a) * r, O.y, O.z + cp.z + Math.sin(a) * r, type, cp.lvl));
                }
            }
        }
        function enter() {
            on = true; root.visible = true;
            stash = c.solids.splice(0); mySolids.forEach(b => c.solids.push(b));   // everything else is parked until you go back in
            saved = { bg: scene.background.getHex(), fog: scene.fog.color.getHex(), den: scene.fog.density, dl: c.dirLight ? c.dirLight.intensity : 0, dc: c.dirLight ? c.dirLight.color.getHex() : 0 };
            scene.background.setHex(0x010208); scene.fog.color.setHex(0x010208); scene.fog.density = 0.0068;
            if (c.dirLight) { c.dirLight.intensity = 0.55; c.dirLight.color.setHex(0x8fa4ff); }
            player.mesh.position.set(O.x, O.y + 0.05, O.z + 5); player.lastSafePos.copy(player.mesh.position); player.velocity.set(0, 0, 0);
            player.mesh.rotation.y = 0;                                  // facing out; the camera starts in front so the HQ fills the view behind him
            cameraSystem.targetTheta = cameraSystem.theta = 0; cameraSystem.targetPhi = 0.3; cameraSystem.manualTimer = 1.5;
            c.roamLight.userData.cur = null;
            spawnCamps();
            guards.forEach(g => { g.said = false; }); gates.forEach(d => { d.open = 0; d.near = false; });
            region = null; enterT = 0;
            c.setState('outside');
        }
        function leave() {
            camps.forEach(cp => { cp.enemies.forEach(drop); cp.enemies = []; });
            for (let i = c.enemyShots.length - 1; i >= 0; i--) { scene.remove(c.enemyShots[i].mesh); c.enemyShots.splice(i, 1); }
            c.solids.length = 0; if (stash) stash.forEach(b => c.solids.push(b)); stash = null;
            if (saved) {
                scene.background.setHex(saved.bg); scene.fog.color.setHex(saved.fog); scene.fog.density = saved.den;
                if (c.dirLight) { c.dirLight.intensity = saved.dl; c.dirLight.color.setHex(saved.dc); }
            }
            player.lockedEnemy = null; player.attentionEnemy = null; player.combatTarget = null;
            const say = document.getElementById('hub-say'); if (say) say.classList.remove('show');
            root.visible = false; on = false;
        }
        function travel(out) {
            if (busy) return; busy = true;
            c.setState('travel');
            fade.dir = lang() === 'ar' ? 'rtl' : 'ltr';
            fade.innerHTML = `<div><small>MTZ // ${out ? 'EXIT' : 'ENTRY'}</small><b>${out ? S('zone') : S('hq')}</b><span>${out ? S('leaving') : S('returning')}</span></div>`;
            fade.classList.add('on');
            try { AudioSys.playAirlock(out); } catch (e) { }
            setTimeout(() => {
                if (out) { c.hub.suspend(); enter(); } else { leave(); c.hub.enter(); }
                c.onTravel && c.onTravel(out);
                setTimeout(() => { fade.classList.remove('on'); busy = false; if (out) setTimeout(() => { if (on) c.toast(S('hostile')); }, 700); }, 450);
            }, 520);
        }
        if (window.AxonI18n) window.AxonI18n.onChange(() => { signs.forEach(paintSign); region = null; });

        // ---------- minimap ----------
        const mm = document.getElementById('minimap'), mg = mm ? mm.getContext('2d') : null;
        let mapAcc = 0;
        function drawMap(dt) {
            if (!mg || (mapAcc += dt) < 0.08) return; mapAcc = 0;
            const W = mm.width, H = mm.height, Rr = W / 2 - 2, cx = W / 2, cy = H / 2, VIEW = 150, s = 2 * Rr / VIEW;
            const lx = player.mesh.position.x - O.x, lz = player.mesh.position.z - O.z;
            const X = x => cx + (x - lx) * s, Y = z => cy + (z - lz) * s;
            const rim = (px, py, pad = 7) => { const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy); return d > Rr - pad ? [cx + dx / d * (Rr - pad), cy + dy / d * (Rr - pad), true] : [px, py, false]; };
            mg.clearRect(0, 0, W, H); mg.save();
            mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.fillStyle = 'rgba(3,4,14,0.8)'; mg.fill(); mg.clip();
            mg.strokeStyle = 'rgba(255,42,157,0.6)'; mg.lineWidth = 2; mg.strokeRect(X(-WB), Y(-WB), WB * 2 * s, WB * 2 * s);
            mg.strokeStyle = 'rgba(57,215,255,0.18)'; mg.lineWidth = Math.max(1, 9 * s);                      // roads
            mg.beginPath(); mg.moveTo(X(0), Y(CW.z1)); mg.lineTo(X(0), Y(WB)); mg.moveTo(X(0), Y(CW.z0)); mg.lineTo(X(0), Y(-WB));
            mg.moveTo(X(CW.x0), Y(0)); mg.lineTo(X(-WB), Y(0)); mg.moveTo(X(CW.x1), Y(0)); mg.lineTo(X(WB), Y(0)); mg.stroke();
            mg.fillStyle = 'rgba(57,215,255,0.07)'; mg.fillRect(X(CW.x0), Y(CW.z0), (CW.x1 - CW.x0) * s, (CW.z1 - CW.z0) * s);
            mg.strokeStyle = 'rgba(255,42,109,0.75)'; mg.lineWidth = 1.5; mg.strokeRect(X(CW.x0), Y(CW.z0), (CW.x1 - CW.x0) * s, (CW.z1 - CW.z0) * s);
            mg.fillStyle = 'rgba(57,215,255,0.4)'; mg.fillRect(X(-28), Y(-37), 56 * s, 30 * s); mg.fillRect(X(-48), Y(-31), 20 * s, 22 * s); mg.fillRect(X(28), Y(-31), 20 * s, 22 * s);
            mg.lineWidth = 3;
            gates.forEach(d => {                                                                       // gates: green open, amber shut
                const ax = Math.cos(d.rot), az = -Math.sin(d.rot);
                mg.strokeStyle = d.open > 0.5 ? '#5cf0a0' : '#ffa826';
                mg.beginPath(); mg.moveTo(X(d.x - ax * 6), Y(d.z - az * 6)); mg.lineTo(X(d.x + ax * 6), Y(d.z + az * 6)); mg.stroke();
            });
            for (const cp of camps) {                                                                   // nodes (pinned to the rim when far)
                const [px, py, far] = rim(X(cp.x), Y(cp.z)), col = cp.cleared ? '92,240,160' : '255,42,109';
                if (!far) { mg.fillStyle = `rgba(${col},0.14)`; mg.strokeStyle = `rgba(${col},0.9)`; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(px, py, Math.max(4, 12 * s), 0, Math.PI * 2); mg.fill(); mg.stroke(); }
                else if (!cp.cleared) { mg.fillStyle = `rgb(${col})`; mg.beginPath(); mg.arc(px, py, 3.2, 0, Math.PI * 2); mg.fill(); }
            }
            mg.fillStyle = '#ff4a5a';
            for (const cp of camps) for (const e of cp.enemies) if (!e.isDead) { const ex = X(e.mesh.position.x - O.x), ey = Y(e.mesh.position.z - O.z); mg.fillRect(ex - 1.5, ey - 1.5, 3, 3); }
            mg.fillStyle = '#b48cff'; guards.forEach(g => { mg.beginPath(); mg.arc(X(g.x), Y(g.z), 2, 0, Math.PI * 2); mg.fill(); });
            const [hx, hy] = rim(X(DOOR.x), Y(DOOR.z));                                                // way home: amber diamond
            mg.fillStyle = '#ffa826'; mg.strokeStyle = '#1a0d00'; mg.lineWidth = 1;
            mg.beginPath(); mg.moveTo(hx, hy - 5); mg.lineTo(hx + 4, hy); mg.lineTo(hx, hy + 5); mg.lineTo(hx - 4, hy); mg.closePath(); mg.fill(); mg.stroke();
            const ry = player.mesh.rotation.y;
            mg.save(); mg.translate(cx, cy); mg.rotate(Math.atan2(Math.sin(ry), Math.cos(ry)) * -1 + Math.PI);
            mg.fillStyle = '#ffa826'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
            mg.restore(); mg.restore();
            mg.lineWidth = 2; mg.strokeStyle = 'rgba(255,42,157,0.5)'; mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.stroke();
        }

        // ---------- per frame (only while outside) ----------
        const qY = new THREE.Quaternion();
        function update(dt, time) {
            t += dt;
            const cam = cameraSystem.camera, pp = player.mesh.position, lx = pp.x - O.x, lz = pp.z - O.z, playing = c.getState() === 'outside';
            sky.position.set(cam.position.x, O.y, cam.position.z);
            datasphere.rotation.y += dt * 0.03; datasphere.rotation.x += dt * 0.012; halo.rotation.z += dt * 0.02;
            spireMats.forEach((m, k) => { m.emissiveIntensity = 1.05 + Math.sin(t * 1.3 + k * 2.1) * 0.35; });
            for (const L of [cubes, rings]) for (const list of L) for (const f of list) { f.rx += f.sx * dt; f.ry += f.sy * dt; }   // (no new array every step)
            poseCubes(); poseRings();
            searchlights.forEach(sl => { sl.g.rotation.y += sl.sp * dt; });
            hqBeacon.visible = (t % 1.4) < 0.7;
            fwTex.offset.y -= dt * 0.15; poolTex.offset.y += dt * 0.08;
            doorMarker.position.y = O.y + 3.4 + Math.sin(t * 2.6) * 0.18; doorMarker.rotation.y += dt * 2; doorRingM.opacity = 0.55 + Math.sin(t * 3) * 0.25;
            enterSign.position.y = O.y + 4.7 + Math.sin(t * 2.6) * 0.1;
            for (const cp of camps) { cp.beacon.rotation.y += dt * 1.5; cp.beacon.position.y = O.y + 7.2 + Math.sin(t * 2 + cp.x) * 0.3; cp.beamM.opacity = 0.18 + Math.sin(t * 3 + cp.z) * 0.06; }
            if ((cullT -= dt) <= 0) {                                        // far decoration: hidden past 170 m (lost in the fog anyway)
                cullT = 0.25;
                for (const o of decor) { const dx = o.position.x - pp.x, dz = o.position.z - pp.z; o.visible = dx * dx + dz * dz < 170 * 170; }
            }
            // the key light hangs over you (no sun out here)
            c.roamLight.position.set(pp.x, pp.y + 16, pp.z + 3); c.roamLight.color.setHex(0x8a7bff);
            // outer gates
            for (const d of gates) {
                const near = (lx - d.x) ** 2 + (lz - d.z) ** 2 < 14 * 14;
                if (near && !d.near && playing) { try { AudioSys.playGateOpen(); } catch (e) { } }
                d.near = near; d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 6);
                const k = Math.max(0.05, 1 - d.open * 0.95); d.panels.forEach(p => { p.scale.x = k; });
                d.edgeM.color.setHex(d.open > 0.5 ? 0x5cf0a0 : 0xff2a6d);
            }
            // sentries turn their heads to you and say a line when you walk up
            const say = document.getElementById('hub-say');
            for (const g of guards) {
                const dx = lx - g.x, dz = lz - g.z, d2 = dx * dx + dz * dz;
                let want = 0;
                if (d2 < 225) { let a = Math.atan2(dx, dz) - g.face; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.9) want = Math.max(-1, Math.min(1, a)); }
                const ny = g.yaw + (want - g.yaw) * Math.min(1, dt * 4);
                g.yaw = ny;
                if (playing && d2 < 16 && !g.said && say) { g.said = true; try { AudioSys.playComm(); } catch (e) { } say.innerHTML = `<b>${S('sentry')}</b>${S('say')[g.line]}`; say.classList.add('show'); sayT = 3.2; }
            }
            placeHeads();
            if (sayT > 0 && (sayT -= dt) <= 0 && say) say.classList.remove('show');
            // region name under the minimap
            const rg = regionAt(lx, lz);
            if (rg !== region) { region = rg; const sl = document.getElementById('stage-label'); if (sl) sl.textContent = S(rg); }
            // hostile nodes: purged once every enemy of the cluster is down
            if ((campT -= dt) <= 0) {
                campT = 0.4;
                for (const cp of camps) if (!cp.cleared && cp.enemies.length && cp.enemies.every(e => e.isDead)) {
                    cp.cleared = true; cp.setColor(0x5cf0a0);
                    const bonus = 15 + 10 * cp.lvl;
                    if (window.AxonShop) window.AxonShop.add(bonus, V(cp.x, 8, cp.z), S('purged'));
                    c.toast(S('purged')); try { AudioSys.playPurge(); } catch (e) { }
                }
            }
            // back inside through the HQ door
            if (playing && !busy && (lx - DOOR.x) ** 2 + (lz - DOOR.z) ** 2 < DOOR.r * DOOR.r) { if ((enterT += dt) > 0.25) travel(false); } else enterT = 0;
            drawMap(dt);
        }

        // make every piece drawable for one pass so all shaders compile behind the fade, not mid-fight
        root.traverse(o => { if (o.isMesh && !o.isInstancedMesh) o.castShadow = false; });   // no sun outside: the scenery casts no shadows (saves a whole redraw of the zone every frame)
        const showAll = () => { guardSets.forEach(set => set.bodies.concat(set.heads).forEach(im => { im.visible = true; })); };
        return { travel, update, showAll, get on() { return on; }, root, alive: () => camps.reduce((n, cp) => n + cp.enemies.filter(e => !e.isDead).length, 0) };
    }

    return { create, S };
})();
