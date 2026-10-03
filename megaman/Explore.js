// =====================================================================
//  AXON BREACH — EXPLORATION: an endless run of random alien worlds
//   • Entered through the rift gate in the OPERATIONS wing of the HQ.
//   • Every expedition rolls a new world: one of 8 biomes (desert, jungle, frozen tundra, volcanic
//     wastes, toxic marsh, crystal fields, dead moon, sunken reef), often with its whole palette
//     shifted into strange colours, its own sky, fog, light, weather particles and scenery.
//   • A fixed number of aliens arrives in successive waves; the deeper you go, the more waves,
//     the more aliens and the tougher they are. Depth has no end.
//   • Kills pay nothing here — clearing the expedition pays one small prize (so it never makes you rich).
//     Then two rifts open: GO DEEPER (a brand-new world) or RETURN TO HQ. Your depth is remembered.
//   • Who arrives, in what order and in which formation: see spawnWave here and the wave planner in aliens.js
//     (packs of motes, carapaces, and a maverick on the last wave from depth 2).
//  Loaded by index.html after outside.js and aliens.js, before game.js.
// =====================================================================
'use strict';

window.AxonExplore = (function () {
    const L = {
        en: { title: 'EXPLORATION', depth: 'DEPTH', wave: (n, t) => `WAVE ${n}/${t}`, waveClear: 'WAVE CLEARED', cleared: 'EXPEDITION CLEARED', deeper: 'GO DEEPER', home: 'RETURN TO HQ',
              opening: 'Opening a rift…', returning: 'Returning to HQ…', hostiles: n => `⚠ ${n} HOSTILES INBOUND`, reward: 'PRIZE',
              down: 'You fell beyond the rift. The recovery team brought you back to HQ — your depth is kept.', next: n => `NEXT: DEPTH ${n}`,
              b_desert: 'DESERT', b_jungle: 'JUNGLE', b_tundra: 'FROZEN TUNDRA', b_volcano: 'VOLCANIC WASTES', b_toxic: 'TOXIC MARSH', b_crystal: 'CRYSTAL FIELDS', b_moon: 'DEAD MOON', b_reef: 'SUNKEN REEF', odd: 'ANOMALOUS' },
        ar: { title: 'استكشاف', depth: 'العمق', wave: (n, t) => `الموجة ${n}/${t}`, waveClear: 'تم صدّ الموجة', cleared: 'اكتملت الرحلة', deeper: 'تعمّق أكثر', home: 'العودة للمقر',
              opening: 'جارٍ فتح بوابة…', returning: 'العودة إلى المقر…', hostiles: n => `⚠ ${n} كائنات معادية قادمة`, reward: 'الجائزة',
              down: 'سقطت خلف البوابة، وأعادك فريق الإنقاذ إلى المقر — العمق الذي وصلته محفوظ.', next: n => `التالي: العمق ${n}`,
              b_desert: 'الصحراء', b_jungle: 'الأدغال', b_tundra: 'التندرا المتجمدة', b_volcano: 'الأراضي البركانية', b_toxic: 'المستنقع السام', b_crystal: 'حقول الكريستال', b_moon: 'القمر الميت', b_reef: 'الشعاب الغارقة', odd: 'غريبة' },
        es: { title: 'EXPLORACIÓN', depth: 'PROFUNDIDAD', wave: (n, t) => `OLEADA ${n}/${t}`, waveClear: 'OLEADA SUPERADA', cleared: 'EXPEDICIÓN COMPLETADA', deeper: 'MÁS PROFUNDO', home: 'VOLVER AL CUARTEL',
              opening: 'Abriendo una grieta…', returning: 'Volviendo al cuartel…', hostiles: n => `⚠ ${n} HOSTILES EN CAMINO`, reward: 'PREMIO',
              down: 'Caíste tras la grieta. El equipo de rescate te trajo al cuartel; tu profundidad se conserva.', next: n => `SIGUIENTE: PROFUNDIDAD ${n}`,
              b_desert: 'DESIERTO', b_jungle: 'JUNGLA', b_tundra: 'TUNDRA HELADA', b_volcano: 'TIERRAS VOLCÁNICAS', b_toxic: 'PANTANO TÓXICO', b_crystal: 'CAMPOS DE CRISTAL', b_moon: 'LUNA MUERTA', b_reef: 'ARRECIFE HUNDIDO', odd: 'ANÓMALO' },
        zh: { title: '探索', depth: '深度', wave: (n, t) => `第 ${n}/${t} 波`, waveClear: '本波已击退', cleared: '探索完成', deeper: '继续深入', home: '返回总部',
              opening: '正在开启裂隙…', returning: '正在返回总部…', hostiles: n => `⚠ ${n} 个敌人来袭`, reward: '奖励',
              down: '你在裂隙彼端倒下了，救援队把你带回总部——深度已保留。', next: n => `下一站：深度 ${n}`,
              b_desert: '沙漠', b_jungle: '丛林', b_tundra: '冰冻苔原', b_volcano: '火山荒原', b_toxic: '毒沼', b_crystal: '水晶原野', b_moon: '死寂之月', b_reef: '沉没珊瑚礁', odd: '异变' },
        ja: { title: '探索', depth: '深度', wave: (n, t) => `ウェーブ ${n}/${t}`, waveClear: 'ウェーブ撃退', cleared: '探索完了', deeper: 'さらに深く', home: '司令部へ帰還',
              opening: '裂け目を開いています…', returning: '司令部へ帰還中…', hostiles: n => `⚠ 敵 ${n} 体接近中`, reward: '報酬',
              down: '裂け目の向こうで倒れた。回収班が司令部へ連れ戻した——深度は保持される。', next: n => `次：深度 ${n}`,
              b_desert: '砂漠', b_jungle: 'ジャングル', b_tundra: '凍てつくツンドラ', b_volcano: '火山地帯', b_toxic: '毒の沼地', b_crystal: '水晶の平原', b_moon: '死の月', b_reef: '沈んだ珊瑚礁', odd: '異常' }
    };
    const lang = () => (window.AxonI18n ? window.AxonI18n.lang : 'en');
    const S = (k, ...a) => { const d = L[lang()] || L.en, v = d[k] !== undefined ? d[k] : L.en[k]; return typeof v === 'function' ? v(...a) : v; };
    const FONT = "'Chakra Petch','IBM Plex Sans Arabic',system-ui,sans-serif";

    // Biomes, as HSL triples [hue, saturation, lightness] so a whole palette can be shifted at once.
    // props: scenery type → how many (inside the arena half; the horizon ring gets more)
    const BIOMES = [
        { id: 'desert', sky: [0.58, 0.45, 0.62], hor: [0.08, 0.55, 0.72], ground: [0.09, 0.5, 0.55], ground2: [0.07, 0.45, 0.44], rock: [0.06, 0.35, 0.42], plant: [0.3, 0.4, 0.32], glow: [0.08, 1, 0.6], alien: [0.05, 0.6, 0.35], den: 0.010, sun: 0xfff1c9, weather: 'dust', props: { rock: 22, cactus: 18, mesa: 5 } },
        { id: 'jungle', sky: [0.45, 0.35, 0.55], hor: [0.3, 0.35, 0.55], ground: [0.28, 0.45, 0.26], ground2: [0.25, 0.5, 0.18], rock: [0.1, 0.12, 0.32], plant: [0.33, 0.55, 0.3], glow: [0.42, 1, 0.6], alien: [0.9, 0.55, 0.4], den: 0.017, sun: 0xfff6d8, weather: 'spores', props: { tree: 26, fern: 34, rock: 10 } },
        { id: 'tundra', sky: [0.58, 0.4, 0.72], hor: [0.56, 0.3, 0.86], ground: [0.57, 0.22, 0.86], ground2: [0.58, 0.3, 0.72], rock: [0.6, 0.15, 0.48], plant: [0.52, 0.45, 0.78], glow: [0.52, 1, 0.7], alien: [0.62, 0.6, 0.45], den: 0.015, sun: 0xeaf6ff, weather: 'snow', props: { spike: 20, pine: 18, rock: 14 } },
        { id: 'volcano', sky: [0.02, 0.6, 0.1], hor: [0.03, 0.8, 0.28], ground: [0.02, 0.12, 0.13], ground2: [0.04, 0.8, 0.35], rock: [0.0, 0.06, 0.1], plant: [0.05, 0.9, 0.45], glow: [0.06, 1, 0.55], alien: [0.0, 0.1, 0.25], den: 0.014, sun: 0, weather: 'embers', props: { obsidian: 22, rock: 22, lava: 7 } },
        { id: 'toxic', sky: [0.22, 0.55, 0.3], hor: [0.2, 0.65, 0.42], ground: [0.8, 0.22, 0.2], ground2: [0.25, 0.55, 0.28], rock: [0.8, 0.15, 0.24], plant: [0.22, 0.85, 0.48], glow: [0.24, 1, 0.55], alien: [0.78, 0.6, 0.35], den: 0.018, sun: 0, weather: 'spores', props: { mushroom: 26, pipe: 8, rock: 10 } },
        { id: 'crystal', sky: [0.75, 0.6, 0.09], hor: [0.8, 0.55, 0.24], ground: [0.72, 0.3, 0.12], ground2: [0.7, 0.4, 0.2], rock: [0.72, 0.2, 0.18], plant: [0.8, 0.9, 0.6], glow: [0.85, 1, 0.65], alien: [0.5, 0.7, 0.45], den: 0.011, sun: 0, stars: true, planet: true, weather: 'motes', props: { crystal: 30, rock: 12 } },
        { id: 'moon', sky: [0.62, 0.3, 0.03], hor: [0.62, 0.25, 0.1], ground: [0.6, 0.05, 0.42], ground2: [0.6, 0.05, 0.3], rock: [0.6, 0.04, 0.34], plant: [0.5, 0.2, 0.5], glow: [0.5, 1, 0.7], alien: [0.08, 0.6, 0.4], den: 0.008, sun: 0, stars: true, planet: true, weather: null, props: { rock: 30, crater: 8 } },
        { id: 'reef', sky: [0.5, 0.6, 0.28], hor: [0.49, 0.6, 0.4], ground: [0.12, 0.35, 0.55], ground2: [0.5, 0.35, 0.35], rock: [0.5, 0.2, 0.3], plant: [0.95, 0.7, 0.6], glow: [0.48, 1, 0.6], alien: [0.12, 0.8, 0.5], den: 0.021, sun: 0, weather: 'bubbles', props: { coral: 30, rock: 12 } }
    ];
    const WEATHER = {
        dust: { n: 420, col: 0xf0d6a8, size: 0.16, vx: 3.2, vy: -0.1, add: false },
        spores: { n: 380, col: 0xcaffb0, size: 0.2, vx: 0.3, vy: 0.35, add: true },
        snow: { n: 600, col: 0xffffff, size: 0.22, vx: 0.6, vy: -2.6, add: false },
        embers: { n: 420, col: 0xff8a3d, size: 0.2, vx: 0.4, vy: 2.2, add: true },
        motes: { n: 360, col: 0xf0b8ff, size: 0.18, vx: 0.2, vy: 0.25, add: true },
        bubbles: { n: 380, col: 0xcff8ff, size: 0.22, vx: 0.1, vy: 1.6, add: true }
    };

    function create(c) {
        const { THREE, scene, player, cameraSystem, stage, AudioSys } = c;
        const O = new THREE.Vector3(3000, 0, 0);                       // far from the mission, the HQ and the outer zone
        const V = (x, y, z) => new THREE.Vector3(O.x + x, O.y + y, O.z + z);
        const root = new THREE.Group(); root.visible = false; scene.add(root);
        let mySolids = [], stash = null, saved = null, on = false, busy = false, t = 0, run = null, world = null, lastBiome = -1, labelT = 0;
        let depth = Math.max(1, Math.floor(+c.store.get('exploreDepth', '1') || 1));
        let seed = 1;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        const R = (a, b) => a + rnd() * (b - a);
        const box = (x0, y0, z0, x1, y1, z1) => mySolids.push(new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1)));
        const trash = [], keep = o => { trash.push(o); return o; };          // everything a world allocates, freed when the next one is rolled
        const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l)));
        const cssOf = col => '#' + col.getHexString();
        const canvas = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return cv; };

        // shared, never freed: unit shapes (base at y = 0 where it matters) and the rift swirl
        const G = {
            rock: new THREE.DodecahedronGeometry(1, 0), cyl: new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), cone: new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0),
            ball: new THREE.SphereGeometry(1, 10, 7), cap: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), octa: new THREE.OctahedronGeometry(1, 0),
            torus: new THREE.TorusGeometry(1, 0.3, 6, 18), disc: new THREE.CircleGeometry(1, 28)
        };
        const swirlTex = new THREE.CanvasTexture(canvas(256, 256, (g, w) => {
            const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(200,160,255,0.55)'); gr.addColorStop(1, 'rgba(40,10,80,0)');
            g.fillStyle = gr; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
            for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); for (let a = 0; a < 5; a += 0.1) g.lineTo(Math.cos(a) * a * 22, Math.sin(a) * a * 22); g.stroke(); }
        }));
        const M4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

        // ---------- the rift gate in the HQ (OPERATIONS wing, south side) ----------
        const hqGate = new THREE.Group(); hqGate.position.set(-50, 0, 411.5); if (c.hub && c.hub.root) c.hub.root.add(hqGate);
        const riftRingM = new THREE.MeshBasicMaterial({ color: 0xb48cff }), riftDiscM = new THREE.MeshBasicMaterial({ map: swirlTex, color: 0xc9a7ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const hqRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.16, 8, 48), riftRingM); hqRing.position.y = 2.7; hqGate.add(hqRing);
        const hqDisc = new THREE.Mesh(G.disc, riftDiscM); hqDisc.scale.setScalar(2.15); hqDisc.position.y = 2.7; hqGate.add(hqDisc);
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.35, 32), new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.85, roughness: 0.3 })); plinth.position.y = 0.17; hqGate.add(plinth);
        const hqSignCv = document.createElement('canvas'); hqSignCv.width = 512; hqSignCv.height = 128;
        const hqSignTex = new THREE.CanvasTexture(hqSignCv); hqSignTex.encoding = THREE.sRGBEncoding;
        const hqSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: hqSignTex, transparent: true })); hqSign.position.set(0, 5.7, 0); hqGate.add(hqSign);
        function paintHqSign() {
            const g = hqSignCv.getContext('2d'); g.clearRect(0, 0, 512, 128); g.fillStyle = 'rgba(8,4,24,0.85)'; g.fillRect(0, 0, 512, 128);
            g.strokeStyle = '#b48cff'; g.lineWidth = 4; g.strokeRect(3, 3, 506, 122);
            g.direction = lang() === 'ar' ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillStyle = '#e6d6ff'; g.shadowColor = '#b48cff'; g.shadowBlur = 14; g.font = `700 46px ${FONT}`; g.fillText(S('title'), 256, 48, 470);
            g.shadowBlur = 0; g.fillStyle = '#ffa826'; g.font = `600 26px ${FONT}`; g.fillText(`${S('depth')} ${depth}`, 256, 98, 470);
            hqSignTex.needsUpdate = true;
        }
        paintHqSign();
        function hubTick(dt) { hqDisc.rotation.z += dt * 1.2; riftDiscM.opacity = 0.75 + Math.sin(performance.now() / 300) * 0.2; hqRing.rotation.z -= dt * 0.3; }

        // ---------- rolling a world ----------
        function buildWorld() {
            while (root.children.length) root.remove(root.children[0]);
            trash.forEach(o => o.dispose && o.dispose()); trash.length = 0; mySolids = [];
            seed = 1 + Math.floor(Math.random() * 2147483645);
            let bi; do { bi = Math.floor(rnd() * BIOMES.length); } while (bi === lastBiome && BIOMES.length > 1); lastBiome = bi;
            const B = BIOMES[bi], odd = rnd() < 0.3, shift = odd ? R(0.18, 0.82) : R(-0.04, 0.04);     // 30 %: the whole palette turns strange
            const col = (a, dl = 0, ds = 0) => hsl(a[0] + shift, a[1] + ds, a[2] + dl);
            const A = Math.round(R(48, 60));                                                                 // arena half size
            world = { B, A, odd, glow: col(B.glow), hor: col(B.hor), sky: col(B.sky), alien: col(B.alien), eye: col(B.glow, 0.05), name: (odd ? S('odd') + ' ' : '') + S('b_' + B.id) };

            // ground: blotchy two-tone texture, then collision floor and invisible walls
            const gTex = keep(new THREE.CanvasTexture(canvas(256, 256, (g, w) => {
                g.fillStyle = cssOf(col(B.ground)); g.fillRect(0, 0, w, w);
                for (let i = 0; i < 26; i++) { g.globalAlpha = R(0.25, 0.6); g.fillStyle = cssOf(col(B.ground2, R(-0.05, 0.05))); g.beginPath(); g.ellipse(R(0, w), R(0, w), R(10, 60), R(8, 40), R(0, 3), 0, Math.PI * 2); g.fill(); }
                for (let i = 0; i < 1400; i++) { g.globalAlpha = R(0.15, 0.4); g.fillStyle = rnd() < 0.5 ? '#000' : '#fff'; g.fillRect(R(0, w), R(0, w), 2, 2); }
            })));
            gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping; gTex.encoding = THREE.sRGBEncoding; gTex.anisotropy = 8;
            const gSize = (A + 90) * 2; gTex.repeat.set(gSize / 26, gSize / 26);
            const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(gSize, gSize)), keep(new THREE.MeshLambertMaterial({ map: gTex })));
            ground.rotation.x = -Math.PI / 2; ground.position.copy(V(0, 0, 0)); ground.receiveShadow = true; root.add(ground);
            box(-A - 90, -1, -A - 90, A + 90, 0, A + 90);
            box(-A - 2, -1, -A - 2, -A, 40, A + 2); box(A, -1, -A - 2, A + 2, 40, A + 2); box(-A, -1, -A - 2, A, 40, -A); box(-A, -1, A, A, 40, A + 2);

            // the rim of the arena: a soft wall of light in the world's glow colour
            const rimTex = keep(new THREE.CanvasTexture(canvas(4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })));
            const rimM = keep(new THREE.MeshBasicMaterial({ map: rimTex, color: world.glow, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
            const rimG = keep(new THREE.PlaneGeometry(A * 2, 10));
            [[0, -A, 0], [0, A, Math.PI], [-A, 0, Math.PI / 2], [A, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const m = new THREE.Mesh(rimG, rimM); m.position.copy(V(x, 5, z)); m.rotation.y = ry; root.add(m); });

            // scenery: every piece of one material is merged into one mesh (a handful of draw calls per world)
            const mats = {
                rock: keep(new THREE.MeshLambertMaterial({ color: col(B.rock) })), rock2: keep(new THREE.MeshLambertMaterial({ color: col(B.rock, 0.08) })),
                plant: keep(new THREE.MeshLambertMaterial({ color: col(B.plant) })), plant2: keep(new THREE.MeshLambertMaterial({ color: col(B.plant, -0.1, 0.1) })),
                trunk: keep(new THREE.MeshLambertMaterial({ color: col([0.07, 0.35, 0.2]) })), glow: keep(new THREE.MeshBasicMaterial({ color: world.glow }))
            };
            const parts = {}; Object.keys(mats).forEach(k => { parts[k] = []; });
            const put = (m, geo, x, y, z, sx, sy, sz, rx, ry, rz) => parts[m].push({ geo, matrix: M4(x, y, z, sx, sy, sz, rx, ry, rz) });
            const solid = (x, z, r, h) => box(x - r, 0, z - r, x + r, h, z + r);
            const P = {
                rock: (x, z, s, sol) => { put(rnd() < 0.5 ? 'rock' : 'rock2', G.rock, x, s * 0.35, z, s * R(0.8, 1.3), s * R(0.5, 1), s * R(0.8, 1.3), rnd() * 3, rnd() * 3, rnd() * 3); if (sol && s > 1.3) solid(x, z, s * 0.75, s * 1.1); },
                cactus: (x, z, s, sol) => {
                    const h = 3 * s; put('plant', G.cyl, x, 0, z, 0.35 * s, h, 0.35 * s);
                    [-1, 1].forEach(k => { if (rnd() < 0.7) { const ay = h * R(0.35, 0.6); put('plant', G.cyl, x + k * 0.35 * s, ay, z, 0.2 * s, 0.7 * s, 0.2 * s, 0, 0, -k * Math.PI / 2); put('plant', G.cyl, x + k * 1.0 * s, ay, z, 0.2 * s, h * 0.35, 0.2 * s); } });
                    if (sol) solid(x, z, 0.4 * s, h);
                },
                mesa: (x, z, s, sol) => { const h = R(5, 11) * s * 0.5, r = R(4, 7) * s * 0.5; put('rock', G.cyl, x, 0, z, r, h, r * R(0.7, 1)); put('rock2', G.cyl, x, h, z, r * 0.8, h * 0.15, r * 0.8 * R(0.7, 1)); if (sol) solid(x, z, r * 0.8, h * 1.15); },
                tree: (x, z, s, sol) => { const h = R(3.5, 6) * s; put('trunk', G.cyl, x, 0, z, 0.3 * s, h, 0.3 * s); for (let k = 0; k < 3; k++) put(k ? 'plant' : 'plant2', G.ball, x + R(-1, 1) * s, h + R(-0.5, 1) * s, z + R(-1, 1) * s, R(1.4, 2.2) * s, R(1.1, 1.7) * s, R(1.4, 2.2) * s); if (sol) solid(x, z, 0.4 * s, h); },
                fern: (x, z, s) => { for (let k = 0; k < 5; k++) put('plant', G.cone, x, 0, z, 0.25 * s, 1.6 * s, 0.6 * s, R(0.4, 0.9), k * 1.26 + rnd(), 0); },
                spike: (x, z, s, sol) => { const h = R(3, 8) * s; put(rnd() < 0.6 ? 'plant' : 'plant2', G.cone, x, 0, z, 0.8 * s, h, 0.8 * s, R(-0.2, 0.2), 0, R(-0.2, 0.2)); if (sol) solid(x, z, 0.6 * s, h); },
                pine: (x, z, s, sol) => { const h = R(4, 7) * s; put('trunk', G.cyl, x, 0, z, 0.25 * s, h * 0.4, 0.25 * s); for (let k = 0; k < 3; k++) put('plant', G.cone, x, h * (0.25 + k * 0.22), z, (1.8 - k * 0.45) * s, h * 0.45, (1.8 - k * 0.45) * s); if (sol) solid(x, z, 0.5 * s, h); },
                obsidian: (x, z, s, sol) => { const h = R(2, 6) * s; put('rock', G.octa, x, h, z, 0.9 * s, h, 0.9 * s, 0, rnd() * 3, R(-0.15, 0.15)); if (rnd() < 0.5) put('glow', G.octa, x + 0.9 * s, h * 0.3, z, 0.12 * s, h * 0.3, 0.12 * s); if (sol) solid(x, z, 0.7 * s, h * 1.8); },
                lava: (x, z, s) => { put('glow', G.disc, x, 0.04, z, R(3, 6) * s, R(3, 6) * s, 1, -Math.PI / 2, 0, rnd() * 3); },
                mushroom: (x, z, s, sol) => { const h = R(1.5, 4) * s, r = R(1.2, 2.6) * s; put('rock2', G.cyl, x, 0, z, 0.3 * s, h, 0.3 * s); put('glow', G.cap, x, h, z, r, r * 0.55, r); put('plant', G.torus, x, h + 0.05, z, r * 0.95, r * 0.95, r * 0.5, Math.PI / 2, 0, 0); if (sol) solid(x, z, 0.45 * s, h + 0.5); },
                pipe: (x, z, s, sol) => { const r = R(2.5, 4.5) * s; put('rock', G.torus, x, 0, z, r, r, r * 0.9, 0, rnd() * 3, 0); if (sol) solid(x, z, r * 0.6, r * 0.9); },
                crystal: (x, z, s, sol) => { const n = 1 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const h = R(1.5, 5) * s; put(k ? 'plant' : 'glow', G.octa, x + R(-1, 1) * s, h * 0.9, z + R(-1, 1) * s, 0.6 * s, h, 0.6 * s, R(-0.3, 0.3), rnd() * 3, R(-0.3, 0.3)); } if (sol) solid(x, z, 0.8 * s, 5 * s); },
                crater: (x, z, s) => { put('rock2', G.torus, x, 0, z, R(4, 8) * s, R(4, 8) * s, 1.1, Math.PI / 2, 0, 0); },
                coral: (x, z, s, sol) => { const m = rnd() < 0.5 ? 'plant' : 'glow'; for (let k = 0; k < 4; k++) put(m, G.cyl, x, 0, z, 0.22 * s, R(1.5, 3.5) * s, 0.22 * s, R(-0.6, 0.6), rnd() * 3, R(-0.6, 0.6)); put('plant2', G.ball, x, 0.3 * s, z, 0.8 * s, 0.5 * s, 0.8 * s); if (sol) solid(x, z, 0.6 * s, 2.5 * s); }
            };
            const placeInside = (fn, n, smin, smax) => { for (let i = 0, k = 0; k < n && i < n * 20; i++) { const x = R(-A + 4, A - 4), z = R(-A + 4, A - 4); if (x * x + z * z < 18 * 18) continue; fn(x, z, R(smin, smax), true); k++; } };
            const placeOutside = (fn, n, smin, smax) => { for (let k = 0; k < n; k++) { const a = rnd() * Math.PI * 2, d = R(A + 5, A + 75); const x = Math.max(-A - 85, Math.min(A + 85, Math.cos(a) * d * 1.3)), z = Math.max(-A - 85, Math.min(A + 85, Math.sin(a) * d * 1.3)); if (Math.abs(x) < A + 3 && Math.abs(z) < A + 3) continue; fn(x, z, R(smin, smax), false); } };
            Object.entries(B.props).forEach(([id, n]) => { placeInside(P[id], n, 0.8, 1.6); placeOutside(P[id], Math.round(n * 1.4), 1.2, 2.6); });
            placeInside(P.rock, 7, 2.2, 3.6);                                                             // big cover rocks
            Object.entries(parts).forEach(([k, list]) => {
                if (!list.length) return;
                const m = new THREE.Mesh(keep(c.PERF.mergeGeometries(list)), mats[k]); m.castShadow = k !== 'glow'; m.receiveShadow = k !== 'glow'; root.add(m);
            });

            // sky: gradient dome (+ sun, or stars and a looming planet) that follows the camera
            const sky = world.skyGroup = new THREE.Group(); root.add(sky);
            const dome = keep(new THREE.SphereGeometry(320, 24, 14)), pos = dome.attributes.position, cols = new Float32Array(pos.count * 3), tc = new THREE.Color();
            for (let i = 0; i < pos.count; i++) { const k = Math.min(1, Math.max(0, pos.getY(i) / 320 * 1.5)); tc.copy(world.hor).lerp(world.sky, Math.pow(k, 0.7)); cols[i * 3] = tc.r; cols[i * 3 + 1] = tc.g; cols[i * 3 + 2] = tc.b; }
            dome.setAttribute('color', new THREE.BufferAttribute(cols, 3));
            const domeM = new THREE.Mesh(dome, keep(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
            domeM.renderOrder = -10; domeM.frustumCulled = false; sky.add(domeM);
            const dir = new THREE.Vector3(R(-1, 1), R(0.35, 0.7), R(-1, 1)).normalize();
            if (B.sun) {
                const sunC = new THREE.Color(B.sun).lerp(world.glow, odd ? 0.5 : 0.15);
                [[16, 1], [34, 0.28]].forEach(([r, o]) => { const d = new THREE.Mesh(G.disc, keep(new THREE.MeshBasicMaterial({ color: sunC, transparent: true, opacity: o, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }))); d.scale.setScalar(r); d.position.copy(dir).multiplyScalar(290); d.lookAt(0, 0, 0); d.frustumCulled = false; sky.add(d); });
            }
            if (B.stars) {
                const n = 900, sp = new Float32Array(n * 3);
                for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, y = R(0.05, 1), r = Math.sqrt(1 - y * y); sp[i * 3] = Math.cos(a) * r * 300; sp[i * 3 + 1] = y * 300; sp[i * 3 + 2] = Math.sin(a) * r * 300; }
                const sg = keep(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
                const st = new THREE.Points(sg, keep(new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, fog: false, transparent: true, depthWrite: false }))); st.frustumCulled = false; sky.add(st);
            }
            if (B.planet) {
                const pl = new THREE.Mesh(G.ball, keep(new THREE.MeshBasicMaterial({ color: col(B.rock, 0.25), fog: false })));
                pl.scale.setScalar(R(45, 70)); pl.position.copy(dir).multiplyScalar(260); pl.frustumCulled = false; sky.add(pl);
                const ring = new THREE.Mesh(G.torus, keep(new THREE.MeshBasicMaterial({ color: world.glow, transparent: true, opacity: 0.4, fog: false })));
                ring.scale.set(pl.scale.x * 1.7, pl.scale.x * 1.7, 0.4); ring.position.copy(pl.position); ring.rotation.set(1.2, R(0, 3), 0.3); ring.frustumCulled = false; sky.add(ring);
            }

            // weather: one Points cloud that wraps around the hero
            const W = B.weather && WEATHER[B.weather];
            world.weather = null;
            if (W) {
                const wp = new Float32Array(W.n * 3), ph = new Float32Array(W.n);
                for (let i = 0; i < W.n; i++) { wp[i * 3] = O.x + R(-35, 35); wp[i * 3 + 1] = R(0, 26); wp[i * 3 + 2] = O.z + R(-35, 35); ph[i] = rnd() * 6; }
                const wg = keep(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wg.attributes.position.setUsage(THREE.DynamicDrawUsage);
                const wc = odd ? new THREE.Color(W.col).lerp(world.glow, 0.5) : new THREE.Color(W.col);
                const pts = new THREE.Points(wg, keep(new THREE.PointsMaterial({ color: wc, size: W.size, transparent: true, opacity: 0.85, depthWrite: false, blending: W.add ? THREE.AdditiveBlending : THREE.NormalBlending })));
                pts.frustumCulled = false; root.add(pts); world.weather = { W, pts, ph };
            }
            world.portals = [];
        }

        // ---------- expedition: waves of aliens ----------
        const drop = e => { if (e.isDead) return; e.isDead = true; scene.remove(e.mesh); const k = c.enemies.indexOf(e); if (k > -1) c.enemies.splice(k, 1); };
        // The order of battle comes from aliens.js: every wave has a theme (patrol, swarm, siege, armor, and from depth 2
        // a maverick on the last wave) and is a list of units; a pack of motes is one unit but several enemies.
        const AL = window.AxonAliens;
        function startRun() {
            const waves = Math.min(6, 2 + Math.floor((depth - 1) / 2)), budget = Math.min(36, 6 + depth * 2), sum = waves * (waves + 1) / 2, bud = [];
            let left = budget; for (let k = 0; k < waves; k++) { const n = k === waves - 1 ? left : Math.max(2, Math.round(budget * (k + 1) / sum)); bud.push(n); left -= n; }
            const plan = AL.plan(depth, bud), per = plan.map(w => AL.count(w, depth)), total = per.reduce((a, b) => a + b, 0);
            run = { waves, per, plan, wave: -1, state: 'intro', t: 3, alive: [], lvl: Math.min(10, Math.floor((depth - 1) / 2)), total };
            setTimeout(() => { if (on && run) c.toast(S('hostiles', total)); }, 900);
        }
        function alienize(e) {                                                        // recoloured to the world: they belong here, not in the facility
            const m = e.mats; if (!m || m.length < 4) return;
            m[3].color.copy(world.alien);
            m[2].color.copy(world.eye); if (m[2].emissive) m[2].emissive.copy(world.eye); if (m[2].userData && m[2].userData.e) m[2].userData.e.copy(world.eye);
        }
        // Each kind arrives in its own formation around the hero (a0 = where the wave comes from):
        //   stalkers in a line from the front, bulwarks behind them, seekers from the rear, packs of motes on both
        //   flanks, carapaces in an even ring all around, and a maverick alone, front and centre.
        function spawnWave(k) {
            run.wave = k; run.state = 'fight';
            const A = world.A, pp = player.mesh.position, px = pp.x - O.x, pz = pp.z - O.z, a0 = Math.random() * Math.PI * 2;
            const units = run.plan[k].units, of = kind => units.filter(u => u.split(':')[0] === kind), aliens = AL.get(c.api), seen = {};
            const at = (a, d) => [Math.max(-A + 4, Math.min(A - 4, px + Math.cos(a) * d)), Math.max(-A + 4, Math.min(A - 4, pz + Math.sin(a) * d))];
            const born = e => {
                e.noReward = true; alienize(e);
                if (depth > 20) { e.hp = e.maxHp = Math.round(e.maxHp * (1 + 0.06 * (depth - 20))); }   // endless: past depth 20 they keep getting sturdier
                if (e.alertNow) e.alertNow(pp);
                run.alive.push(e);
            };
            const flare = (e, size) => { const q = e.aimPoint(); c.api.spawnFlash(q, world.glow.getHex(), 2.4 * size, 0.3); c.api.spawnShockwave(q.setY(O.y + 0.1), world.glow.getHex(), 5 * size); };
            for (const u of units) {
                const [kind, style] = u.split(':'), i = seen[kind] = (seen[kind] || 0) + 1, n = of(kind).length, mid = i - (n + 1) / 2;
                if (kind === 'runner') { const [x, z] = at(a0 + mid * 0.11, 24 + (i % 2) * 2.5); const e = new c.api.Enemy(O.x + x, O.y, O.z + z, 'runner', run.lvl); born(e); flare(e, 1); }
                else if (kind === 'heavy') { const [x, z] = at(a0 + mid * 0.24, 31); const e = new c.api.Enemy(O.x + x, O.y, O.z + z, 'heavy', run.lvl); born(e); flare(e, 1.3); }
                else if (kind === 'drone') { const [x, z] = at(a0 + Math.PI + mid * 0.2, 21 + (i % 2) * 3); const e = new c.api.Enemy(O.x + x, O.y, O.z + z, 'drone', run.lvl); born(e); flare(e, 1); }
                else if (kind === 'shell') { const [x, z] = at(a0 + Math.PI / n + (i - 1) * Math.PI * 2 / n, 19); const e = new aliens.Shell(O.x + x, O.y, O.z + z, run.lvl); born(e); flare(e, 1.2); }
                else if (kind === 'swarm') {
                    const [x, z] = at(a0 + (i % 2 ? 1 : -1) * (Math.PI / 2 + Math.floor((i - 1) / 2) * 0.5), 17);
                    const pack = aliens.swarm(O.x + x, O.y, O.z + z, run.lvl, AL.packSize(depth)); pack.forEach(born); flare(pack[0], 1.2);
                } else {
                    const [x, z] = at(a0 + mid * 0.5, 26); const e = new aliens.Maverick(O.x + x, O.y, O.z + z, run.lvl, style); born(e); flare(e, 2.2);
                    setTimeout(() => { if (on && run && !e.isDead) c.toast(aliens.eliteText(e.name)); }, 1300 + i * 900);
                    try { AudioSys.playBossRoar(); } catch (err) { }
                }
            }
            c.toast(S('wave', k + 1, run.waves)); try { AudioSys.playBossLeap(); AudioSys.playAlert(10, 0); } catch (err) { }
        }
        function finish() {
            run.state = 'clear';
            const prize = 20 + 2 * Math.min(depth, 10);                                  // small on purpose: 22 … 40 CR, however deep you go
            if (window.AxonShop) window.AxonShop.add(prize, player.mesh.position.clone().setY(player.mesh.position.y + 3.2), S('reward'));
            c.toast(S('cleared')); try { AudioSys.playPurge(); } catch (err) { }
            if (window.AxonWinner) window.AxonWinner.show({ sub: `${S('cleared')} · ${S('depth')} ${depth}`, music: 14 });   // the last wave is down: WINNER, and the victory march
            depth++; c.store.set('exploreDepth', String(depth)); c.store.set('exploreBest', String(Math.max(depth - 1, +c.store.get('exploreBest', '0') || 0))); paintHqSign();
            buildPortals();
        }
        function clearRun() { if (run) run.alive.forEach(drop); run = null; }

        // two rifts open once the world is cleared
        function buildPortals() {
            world.portals = [['deeper', -7, world.glow], ['home', 7, new THREE.Color(0x39d7ff)]].map(([id, x, colr]) => {
                const g = new THREE.Group(); g.position.copy(V(x, 0, -4)); root.add(g);
                const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(2.2, 0.16, 8, 48)), keep(new THREE.MeshBasicMaterial({ color: colr }))); ring.position.y = 2.6; g.add(ring);
                const disc = new THREE.Mesh(G.disc, keep(new THREE.MeshBasicMaterial({ map: swirlTex, color: colr, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))); disc.scale.setScalar(2.05); disc.position.y = 2.6; g.add(disc);
                const pad = new THREE.Mesh(keep(new THREE.RingGeometry(1.7, 2, 40)), keep(new THREE.MeshBasicMaterial({ color: colr, transparent: true, opacity: 0.8 }))); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; g.add(pad);
                const cv = canvas(512, 96, (gx, w, h) => {
                    gx.fillStyle = 'rgba(6,8,20,0.85)'; gx.fillRect(0, 0, w, h); gx.strokeStyle = cssOf(colr); gx.lineWidth = 4; gx.strokeRect(3, 3, w - 6, h - 6);
                    gx.direction = lang() === 'ar' ? 'rtl' : 'ltr'; gx.fillStyle = cssOf(colr); gx.font = `700 40px ${FONT}`; gx.textAlign = 'center'; gx.textBaseline = 'middle';
                    gx.fillText(id === 'deeper' ? `${S('deeper')} · ${depth}` : S('home'), w / 2, h / 2 + 2, w - 40);
                });
                const tex = keep(new THREE.CanvasTexture(cv)); tex.encoding = THREE.sRGBEncoding;
                const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(5, 0.95)), keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true }))); sign.position.y = 5.5; g.add(sign);
                c.api.spawnShockwave(V(x, 0.1, -4), colr.getHex(), 6);
                return { id, x, z: -4, disc, t: 0 };
            });
        }

        // ---------- entering / leaving ----------
        function applyEnv() {
            if (!saved) saved = { bg: scene.background.getHex(), fog: scene.fog.color.getHex(), den: scene.fog.density, dl: c.dirLight.intensity, dc: c.dirLight.color.getHex() };
            scene.background.copy(world.hor); scene.fog.color.copy(world.hor); scene.fog.density = world.B.den * R(0.85, 1.15);
            c.dirLight.intensity = world.B.sun ? 1.05 : 0.55; c.dirLight.color.copy(world.B.sun ? new THREE.Color(world.B.sun) : world.glow.clone().lerp(new THREE.Color(0xffffff), 0.5));
        }
        function placeHero() {
            player.mesh.position.copy(V(0, 0.05, 10)); player.lastSafePos.copy(player.mesh.position); player.velocity.set(0, 0, 0);
            player.mesh.rotation.y = Math.PI; cameraSystem.targetTheta = cameraSystem.theta = 0; cameraSystem.manualTimer = 1;
        }
        function enterWorld() {
            c.solids.length = 0; mySolids.forEach(b => c.solids.push(b));
            applyEnv(); placeHero(); startRun(); labelT = 0;
            c.roamLight.userData.cur = null;
            c.setState('outside');                                                   // same open-field rules as the outer zone
        }
        function enter() { on = true; root.visible = true; stash = c.solids.splice(0); buildWorld(); enterWorld(); }
        function leave() {
            clearRun();
            for (let i = c.enemyShots.length - 1; i >= 0; i--) { scene.remove(c.enemyShots[i].mesh); c.enemyShots.splice(i, 1); }
            c.solids.length = 0; if (stash) stash.forEach(b => c.solids.push(b)); stash = null;
            if (saved) { scene.background.setHex(saved.bg); scene.fog.color.setHex(saved.fog); scene.fog.density = saved.den; c.dirLight.intensity = saved.dl; c.dirLight.color.setHex(saved.dc); saved = null; }
            player.lockedEnemy = null; player.attentionEnemy = null; player.combatTarget = null;
            root.visible = false; on = false;
        }
        const st = document.createElement('style');
        st.textContent = `#xp-fade{position:absolute;inset:0;z-index:44;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#1a0b33,#04020a 70%);opacity:0;pointer-events:none;transition:opacity .45s}
          #xp-fade.on{opacity:1;pointer-events:auto}
          #xp-fade div{display:grid;gap:8px;text-align:center}
          #xp-fade small{font-size:11px;letter-spacing:.45em;color:#b48cff}
          #xp-fade b{font:700 clamp(28px,7vmin,52px)/1 var(--font);letter-spacing:.1em;text-shadow:0 0 24px rgba(180,140,255,.5)}
          #xp-fade span{font-size:12px;color:var(--dim);letter-spacing:.2em}`;
        document.head.appendChild(st);
        const fade = document.createElement('div'); fade.id = 'xp-fade'; stage.appendChild(fade);
        // mode: 'in' (from the HQ gate) · 'deeper' (a new world) · 'home' (back to the HQ gate)
        function travel(mode) {
            if (busy) return; busy = true;
            if (window.AxonWinner) window.AxonWinner.stop();
            c.setState('travel');
            fade.dir = lang() === 'ar' ? 'rtl' : 'ltr';
            fade.innerHTML = `<div><small>MTZ // RIFT</small><b>${mode === 'home' ? S('home') : S('depth') + ' ' + depth}</b><span>${mode === 'home' ? S('returning') : S('opening')}</span></div>`;
            fade.classList.add('on');
            try { AudioSys.playAirlock(mode !== 'home'); AudioSys.playShieldUp(); } catch (e) { }
            setTimeout(() => {
                if (mode === 'in') { c.hub.suspend(); enter(); }
                else if (mode === 'deeper') { clearRun(); buildWorld(); enterWorld(); }
                else {
                    leave(); c.hub.enter();
                    player.mesh.position.set(-50, 0.05, 405.5); player.lastSafePos.copy(player.mesh.position); player.velocity.set(0, 0, 0);   // back out of the rift gate
                    player.mesh.rotation.y = Math.PI; cameraSystem.targetTheta = cameraSystem.theta = 0;
                }
                c.onTravel && c.onTravel(mode);
                setTimeout(() => { fade.classList.remove('on'); busy = false; }, 450);
            }, 520);
        }
        if (window.AxonI18n) window.AxonI18n.onChange(() => { paintHqSign(); if (world) world.name = (world.odd ? S('odd') + ' ' : '') + S('b_' + world.B.id); labelT = 0; });

        // ---------- minimap ----------
        const mm = document.getElementById('minimap'), mg = mm ? mm.getContext('2d') : null;
        let mapAcc = 0;
        function drawMap(dt) {
            if (!mg || (mapAcc += dt) < 0.08) return; mapAcc = 0;
            const W = mm.width, H = mm.height, Rr = W / 2 - 2, cx = W / 2, cy = H / 2, s = 2 * Rr / 120, A = world.A;
            const lx = player.mesh.position.x - O.x, lz = player.mesh.position.z - O.z, X = x => cx + (x - lx) * s, Y = z => cy + (z - lz) * s;
            mg.clearRect(0, 0, W, H); mg.save(); mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.fillStyle = 'rgba(6,4,16,0.78)'; mg.fill(); mg.clip();
            mg.fillStyle = 'rgba(180,140,255,0.08)'; mg.fillRect(X(-A), Y(-A), A * 2 * s, A * 2 * s);
            mg.strokeStyle = cssOf(world.glow); mg.lineWidth = 2; mg.strokeRect(X(-A), Y(-A), A * 2 * s, A * 2 * s);
            world.portals.forEach(p => { mg.fillStyle = p.id === 'home' ? '#39d7ff' : cssOf(world.glow); mg.beginPath(); mg.arc(X(p.x), Y(p.z), 4, 0, Math.PI * 2); mg.fill(); });
            mg.fillStyle = '#ff4a5a'; if (run) run.alive.forEach(e => { if (!e.isDead) mg.fillRect(X(e.mesh.position.x - O.x) - 1.5, Y(e.mesh.position.z - O.z) - 1.5, 3, 3); });
            const ry = player.mesh.rotation.y; mg.save(); mg.translate(cx, cy); mg.rotate(Math.atan2(Math.sin(ry), Math.cos(ry)) * -1 + Math.PI);
            mg.fillStyle = '#ffa826'; mg.strokeStyle = '#1a0d00'; mg.lineWidth = 1; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
            mg.restore(); mg.restore();
            mg.lineWidth = 2; mg.strokeStyle = cssOf(world.glow); mg.beginPath(); mg.arc(cx, cy, Rr, 0, Math.PI * 2); mg.stroke();
        }

        // ---------- per frame (only while exploring) ----------
        function update(dt) {
            t += dt;
            const cam = cameraSystem.camera, pp = player.mesh.position, playing = c.getState() === 'outside';
            world.skyGroup.position.set(cam.position.x, O.y, cam.position.z);
            const w = world.weather;                                                     // weather drifts and wraps around the hero
            if (w) {
                const a = w.pts.geometry.attributes.position, arr = a.array, W = w.W;
                for (let i = 0; i < w.ph.length; i++) {
                    const k = i * 3; arr[k] += (W.vx + Math.sin(t * 0.7 + w.ph[i]) * 0.4) * dt; arr[k + 1] += (W.vy + Math.sin(t + w.ph[i]) * 0.15) * dt; arr[k + 2] += Math.cos(t * 0.6 + w.ph[i]) * 0.4 * dt;
                    if (arr[k] - pp.x > 35) arr[k] -= 70; else if (arr[k] - pp.x < -35) arr[k] += 70;
                    if (arr[k + 2] - pp.z > 35) arr[k + 2] -= 70; else if (arr[k + 2] - pp.z < -35) arr[k + 2] += 70;
                    if (arr[k + 1] > 26) arr[k + 1] -= 26; else if (arr[k + 1] < 0) arr[k + 1] += 26;
                }
                a.needsUpdate = true;
            }
            c.roamLight.position.set(pp.x, pp.y + 14, pp.z + 3); c.roamLight.color.copy(world.glow);
            if ((labelT -= dt) <= 0) { labelT = 1; const sl = document.getElementById('stage-label'); if (sl) sl.textContent = `${S('depth')} ${depth} · ${world.name}`; }
            if (run && playing) {
                if (run.state === 'intro' || run.state === 'between') { if ((run.t -= dt) <= 0) spawnWave(run.wave + 1); }
                else if (run.state === 'fight' && run.alive.length && run.alive.every(e => e.isDead)) {
                    if (run.wave < run.waves - 1) { run.state = 'between'; run.t = 2.8; c.toast(S('waveClear')); try { AudioSys.playChargeFull(); } catch (e) { } }
                    else finish();
                }
            }
            for (const p of world.portals) {
                p.disc.rotation.z += dt * 1.4;
                if (playing && !busy && (pp.x - O.x - p.x) ** 2 + (pp.z - O.z - p.z) ** 2 < 1.8 * 1.8) { if ((p.t += dt) > 0.25) travel(p.id === 'home' ? 'home' : 'deeper'); } else p.t = 0;
            }
            drawMap(dt);
        }
        // enemies still to beat: alive now + those waiting in later waves
        const alive = () => { if (!run) return 0; let n = run.alive.filter(e => !e.isDead).length; for (let k = run.wave + 1; k < run.waves; k++) n += run.per[k]; return n; };

        return { travel, update, hubTick, alive, get on() { return on; }, get depth() { return depth; }, root };
    }

    return { create, S };
})();

