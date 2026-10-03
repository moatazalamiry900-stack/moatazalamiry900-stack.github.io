// =====================================================================
//  AXON BREACH — hero model (colour schemes + the procedural AXON mesh)
//  Loaded by index.html before game.js. Kept separate so each file stays small.
// =====================================================================
'use strict';

window.AxonHero = (function () {
    const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

    // Colour schemes — bought and equipped in the ARMOR STUDIO capsule at HQ (hub.js). Ordered by price:
    // the dearer the scheme, the richer the finish (metal, clear-coat, living glow that shifts colour).
    //   price in credits · tier · metal/rough = armour finish · cyc = glow colours it flows through
    const SKINS = {
        EMBER:   { armor: 0xe9e3d7, under: 0x262a33, trim: 0xb56a2e, glow: 0xffa826, accent: 0x2fd6c3, eye: 0x13a394, price: 0, tier: 0 },
        ARCTIC:  { armor: 0xf2f6fa, under: 0x2b3a4a, trim: 0x7fd6ff, glow: 0x7ff3ff, accent: 0x0fb5a6, eye: 0x2e9fd6, price: 120, tier: 0 },
        JADE:    { armor: 0x2f8a6c, under: 0x1c2426, trim: 0xd9c38e, glow: 0xfff1b8, accent: 0xf2ece0, eye: 0x2c7d5f, price: 200, tier: 0 },
        COBALT:  { armor: 0x2d5bd6, under: 0x151a2a, trim: 0xe8e8f0, glow: 0x5ad1ff, accent: 0xf2f4f8, eye: 0x1e6fd9, price: 300, tier: 1, metal: 0.3 },
        CRIMSON: { armor: 0xb3263a, under: 0x1c1820, trim: 0xd8d2c8, glow: 0xff5a5a, accent: 0xffd166, eye: 0xc0392b, price: 420, tier: 1, metal: 0.3 },
        ROSE:    { armor: 0xe7a3c1, under: 0x2b2230, trim: 0xf6f2ee, glow: 0xff7ac8, accent: 0x7a4cff, eye: 0xd0439a, price: 560, tier: 1, metal: 0.25 },
        VOLT:    { armor: 0xdfe3ea, under: 0x2a2438, trim: 0x6c4cff, glow: 0xb8ff3a, accent: 0x8f6bff, eye: 0x6a3cf0, price: 750, tier: 2, metal: 0.35, rough: 0.3 },
        ONYX:    { armor: 0x1f2229, under: 0x121318, trim: 0xc9a24a, glow: 0xffc24a, accent: 0xff3d5e, eye: 0xd99a12, price: 1000, tier: 2, metal: 0.55, rough: 0.26 },
        AURORA:  { armor: 0xf4f1ff, under: 0x1e1b33, trim: 0xb9c7ff, glow: 0x5ff8ff, accent: 0xc06bff, eye: 0x8a5cff, price: 1400, tier: 3, metal: 0.4, rough: 0.2, cyc: [0x5ff8ff, 0xc06bff, 0xff7ad9] },
        OMEGA:   { armor: 0x14151c, under: 0x0b0c10, trim: 0xf2c75c, glow: 0xff3df2, accent: 0x3de8ff, eye: 0xffc93c, price: 2000, tier: 3, metal: 0.9, rough: 0.16, cyc: [0xff3df2, 0x3de8ff, 0xffc93c] }
    };
    const TIERS = ['STANDARD', 'RARE', 'EPIC', 'LEGENDARY'];
    // put a scheme on a built character (the player, or the preview)
    function applySkin(P, key) {
        if (!SKINS[key]) key = 'EMBER';
        const p = SKINS[key], M = P.mats;
        P.skin = key;
        M.pearl.color.setHex(p.armor); M.steel.color.setHex(p.under); M.trim.color.setHex(p.trim);
        M.glow.color.setHex(p.glow); M.glow.emissive.setHex(p.glow);
        M.accent.color.setHex(p.accent); M.accent.emissive.setHex(p.accent);
        M.iris.color.setHex(p.eye);
        M.pearl.metalness = p.metal ?? 0.2; M.pearl.roughness = p.rough ?? 0.38; M.pearl.clearcoat = p.tier >= 2 ? 1 : 0.7;
        M.trim.roughness = p.tier >= 3 ? 0.12 : 0.2;
        if (P.flameMat) P.flameMat.color.setHex(p.glow);
        P.cyc = p.cyc ? p.cyc.map(c => new THREE.Color(c)) : null;
        if (P.look) applyLook(P, P.look);
    }

    // ---------- appearance (free, chosen in the BIO-LAB in the HQ armory wing): skin tone, eye and hair colour ----------
    // look = { skin, eye, hair } as hex numbers; null / missing = the default of the build (eye: the armour scheme's)
    const LOOK = {
        skin: [0xf7d7bd, 0xf1c4a0, 0xe3aa82, 0xcc9066, 0xb07548, 0x8d5a37, 0x6e4229, 0x4b2c1d],
        eye: [0x2e9fd6, 0x13a394, 0x2c9a4f, 0x7a4a2a, 0xd99a12, 0x8a5cff, 0xd0439a, 0xc0392b, 0x8a96a8],
        hair: [0x14100e, 0x3b2416, 0x6b4226, 0xc9a06a, 0xd9d9e0, 0xa33a2a, 0x2f5fd6, 0xb04cff]
    };
    const LOOK_KEY = 'axon.look';
    function loadLook() { try { const d = JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; } }
    function saveLook(look) { try { localStorage.setItem(LOOK_KEY, JSON.stringify(look || {})); } catch (e) { } }
    function applyLook(P, look) {
        const M = P.mats; if (!M) return;
        P.look = look || {};
        const D = P.lookDefault || {};
        const skin = P.look.skin ?? D.skin, hair = P.look.hair ?? D.hair;
        if (skin != null) {
            M.skin.color.set(skin).convertSRGBToLinear(); M.skin.emissive.set(skin).multiplyScalar(0.55).convertSRGBToLinear();
            if (M.lid) { M.lid.color.copy(M.skin.color).multiplyScalar(0.8); M.lid.emissive.copy(M.skin.emissive); }
        }
        if (hair != null) {
            M.hair.color.set(hair).convertSRGBToLinear();
            (P.browMats || []).forEach(b => b.color.set(hair).multiplyScalar(0.55));
        }
        if (P.look.eye != null) M.iris.color.setHex(P.look.eye);
        else if (P.skin && SKINS[P.skin]) M.iris.color.setHex(SKINS[P.skin].eye);
    }
    const _cc = new THREE.Color();
    const SKIN_KEYS = Object.keys(SKINS);

    // ---------- model detail ----------
    // The hero is sculpted for close-ups (~106 000 triangles). On a phone he covers a small part of the screen and is
    // drawn twice a frame (scene + shadow), plus up to 7 dash afterimages — far more than the rest of the world together.
    // DK scales every segment count while the body is built: 0.5 ≈ a quarter of the triangles, same shapes.
    // Settings → Character detail: auto (phones 0.5, desktop 1) · high · low.
    let DK = 1;
    function detailK() {
        let v = 'auto'; try { v = localStorage.getItem('axon.heroDetail') || 'auto'; } catch (e) { }
        if (v === 'high') return 1;
        if (v === 'low') return 0.5;
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 0.5 : 1;
    }
    // below 0.4 = background characters (HQ crew, trainees): the minimums drop too, they are never seen up close
    const dseg = (n, min = 1) => Math.min(n, Math.max(DK < 0.4 ? Math.max(1, Math.ceil(min * 0.6)) : min, Math.round(n * DK)));

    // Bevelled box (rounded edges → faceted, sculpted armor plates)
    const rbCache = new Map();
    function RB(w, h, d, r = 0.04) {
        const key = [w, h, d, r, DK].join('|');
        if (rbCache.has(key)) return rbCache.get(key);
        r = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
        const hw = w / 2 - r, hh = h / 2 - r, s = new THREE.Shape();
        s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.lineTo(-hw, -hh);
        const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: dseg(2), curveSegments: 1 });
        g.center();
        rbCache.set(key, g);
        return g;
    }

    // ---------- sculpting helpers: smooth, organic armour instead of plain boxes ----------
    // Rounded "pillow" block: every vertex is pushed onto a rounded surface (true fillets, seamless normals),
    // then optionally tapered (narrower top/bottom) and bulged (curved front), like cast or pressed armour.
    function pillow(w, h, d, r = 0.05, o = {}) {
        const seg = dseg(o.seg || 6, 3);
        const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
        const pos = g.attributes.position, nor = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
        const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
        const top = o.top ?? 1, bot = o.bot ?? 1, bulge = o.bulge || 0, side = o.side || 0;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
            n.subVectors(v, c); if (n.lengthSq() > 1e-12) n.normalize(); else n.fromBufferAttribute(nor, i);
            v.copy(c).addScaledVector(n, r);
            const t = v.y / h + 0.5, sc = bot + (top - bot) * t;          // taper
            v.x *= sc; v.z *= sc;
            const u = 1 - Math.pow(v.x / (w / 2), 2), q = 1 - Math.pow(v.y / (h / 2), 2);
            if (v.z > 0) v.z += bulge * Math.max(0, u) * Math.max(0, q);    // curved front face
            v.x += side * Math.max(0, q) * Math.sign(v.x) * Math.max(0, 1 - Math.pow(v.z / (d / 2), 2));
            pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, n.x, n.y, n.z);
        }
        if (top !== 1 || bot !== 1 || bulge || side) g.computeVertexNormals();
        return g;
    }
    // Turned part from a profile [[radius, y], …] (bottom → top): limbs, collars, nozzles, barrels
    const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), dseg(seg, 10));
    // Plate cut from a smooth outline [[x, y], …], extruded with soft rounded edges
    function plate(pts, depth, bevel = 0.02, sideways = false) {
        const sh = new THREE.Shape();
        sh.moveTo(pts[0][0], pts[0][1]);
        sh.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0], p[1])));
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: dseg(3), curveSegments: dseg(24, 10) });
        g.translate(0, 0, -depth / 2);
        if (sideways) g.rotateY(-Math.PI / 2);   // outline drawn as (forward, up), extruded across the body's width
        g.computeVertexNormals();
        return g;
    }

    // Builds every mesh of the hero onto player P (P.mesh must already exist).
    // Two playable builds share one rig:  'a' = AXON (slim, agile)   'm' = KAEL (broader young man)
    const BUILDS = { a: { name: 'AXON', tag: 'MK-VII · AGILE FRAME', tagKey: 'frame_a' }, m: { name: 'KAEL', tag: 'MK-IX · VANGUARD FRAME', tagKey: 'frame_m' }, f: { name: 'LYRA', tag: 'MK-VIII · LYNX FRAME', tagKey: 'frame_f' } };
    // Undersuit fabric: a fine twill weave baked into a small normal map (shared by every character), so the
    // suit reads as woven material under the light instead of flat plastic
    let weaveTex = null;
    function weave() {
        if (weaveTex) return weaveTex;
        const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
        const g = c.getContext('2d'), img = g.createImageData(S, S), h = new Float32Array(S * S);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {                    // height field: diagonal twill ribs
            const u = ((x + y) % 8) / 8, w = ((x - y + 64) % 16) / 16;
            h[y * S + x] = Math.sin(u * Math.PI) * 0.8 + (w < 0.5 ? 0.2 : 0);
        }
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
            const hx = h[y * S + (x + 1) % S] - h[y * S + (x + S - 1) % S], hy = h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x];
            const nx = -hx, ny = -hy, nz = 2.2, l = Math.hypot(nx, ny, nz), i = (y * S + x) * 4;
            img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        weaveTex = new THREE.CanvasTexture(c); weaveTex.wrapS = weaveTex.wrapT = THREE.RepeatWrapping; weaveTex.repeat.set(10, 10);
        return weaveTex;
    }

    function build(P, type = 'a', detail) {   // detail: optional segment scale (HQ trainees are built lighter than the hero)
        DK = detail > 0 ? Math.min(1, detail) : detailK();
        return window.AxonPerf && window.AxonPerf.withDetail ? window.AxonPerf.withDetail(DK, () => buildBody(P, type)) : buildBody(P, type);
    }
    function buildBody(P, type = 'a') {
            P._feet = null; P._stepSide = undefined; P._sp = null; P._pv = null;   // new body: fresh feet cache, joint springs, momentum            // new body = new feet: drop the cached ones of the old body
            const MALE = type === 'm', FEMALE = type === 'f';   // 'a' AXON (male, agile) · 'm' KAEL (male, strong) · 'f' LYRA (female)
            P.bodyType = MALE ? 'm' : FEMALE ? 'f' : 'a';
            const M = P.mats = {
                // armour: painted metal with a glossy clear-coat layer
                pearl: new THREE.MeshPhysicalMaterial({ metalness: 0.2, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.15, envMapIntensity: 0.8, side: THREE.DoubleSide }),
                steel: new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.5, envMapIntensity: 1, normalMap: weave(), normalScale: new THREE.Vector2(0.45, 0.45) }),
                trim: new THREE.MeshStandardMaterial({ metalness: 0.95, roughness: 0.2, envMapIntensity: 1.2 }),
                glow: new THREE.MeshStandardMaterial({ emissiveIntensity: 2.2, roughness: 0.4 }),
                skin: new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf4bf98).convertSRGBToLinear(), roughness: 0.75, metalness: 0, emissive: new THREE.Color(0xc0643a).convertSRGBToLinear(), emissiveIntensity: 0.35, envMapIntensity: 0.2 }),
                hair: new THREE.MeshStandardMaterial({ color: new THREE.Color(0x4a2c1a).convertSRGBToLinear(), roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide }),
                iris: new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
                accent: new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide, emissiveIntensity: 0.35 })
            };
            // rim light: a soft cool edge glow on armour and suit so the silhouette separates from dark rooms
            const rim = (m, k) => { m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
                totalEmissiveRadiance += vec3(0.55, 0.78, 1.0) * pow(rimF, 3.0) * ${k.toFixed(2)};`); }; };
            rim(M.pearl, 0.35); rim(M.steel, 0.28);
            if (MALE) {
                M.skin.color.set(0xdca37c).convertSRGBToLinear(); M.skin.emissive.set(0xa0512c).convertSRGBToLinear();
                M.hair.color.set(0x1c1411).convertSRGBToLinear();
            }
            P.flameMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
            const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
            const C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
            const part = (geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
                const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
                m.castShadow = true; parent.add(m); return m;
            };

            // --- body: a continuous undersuit with human anatomy, armour plates sitting on top ---
            // proportions: long legs (hips at ~42% of height), narrow waist, V-shaped ribcage, slim neck
            P.torsoBase = 1.6;
            P.torso = new THREE.Group(); P.torso.position.y = P.torsoBase; P.mesh.add(P.torso);
            const hips = part(lathe([[0.02, -0.46], [0.1, -0.44], [0.165, -0.38], [0.192, -0.28], [0.178, -0.16], [0.142, -0.04], [0.122, 0.06], [0.132, 0.16]], 28), M.steel, P.torso);
            hips.scale.set(MALE ? 1.42 : 1.12, 1, MALE ? 1.0 : 0.78);                                                                        // pelvis → waist
            const belt = part(new THREE.TorusGeometry(0.162, 0.024, 10, 40), M.trim, P.torso, 0, -0.1, 0, Math.PI / 2, 0, 0);
            belt.scale.set(MALE ? 1.44 : 1.13, MALE ? 1.02 : 0.8, 1);
            part(C(0.04, 0.04, 0.03, 16), M.glow, P.torso, 0, -0.1, MALE ? 0.168 : 0.132, Math.PI / 2, 0, 0);                     // buckle light
            part(plate([[-0.09, 0.06], [0.09, 0.06], [0.065, -0.05], [0, -0.1], [-0.065, -0.05]], 0.035, 0.014), M.pearl, P.torso, 0, -0.26, MALE ? 0.17 : 0.135, -0.18, 0, 0);
            [-1, 1].forEach(s => {                                                                                  // tassets over the hips
                part(pillow(0.12, 0.22, 0.24, 0.045, { bot: 0.82, bulge: 0.02 }), M.pearl, P.torso, s * 0.21, -0.25, 0.01, 0, s * 0.12, s * 0.22);
                part(B(0.02, 0.15, 0.015), M.accent, P.torso, s * 0.245, -0.25, 0.13, 0, 0, s * 0.22);
            });
            [0, 1, 2].forEach(i => part(pillow((0.2 - i * 0.02) * (MALE ? 1.25 : 1), 0.06, 0.05, 0.02, { bulge: 0.01 }), M.pearl, P.torso, 0, -0.02 + i * 0.075, (MALE ? 0.142 : 0.108) + i * 0.004));   // segmented abdominal plates

            P.chest = new THREE.Group(); P.chest.position.y = 0.42; P.torso.add(P.chest);
            const rib = part(lathe([[0.112, -0.32], [0.144, -0.2], [0.19, -0.04], [0.214, 0.08], [0.204, 0.18], [0.152, 0.26], [0.078, 0.31], [0.064, 0.34], [0.062, 0.5]], 28), M.steel, P.chest);
            rib.scale.set(MALE ? 1.55 : 1.25, 1, MALE ? 1.0 : 0.8);                                                                          // ribcage → shoulders → neck
            part(pillow(0.44, 0.34, 0.14, 0.06, { bot: 0.72, bulge: 0.035 }), M.pearl, P.chest, 0, 0.03, 0.115);  // breastplate
            [-1, 1].forEach(s => {
                const pec = plate([[0, 0.14], [0.155, 0.12], [0.175, -0.03], [0.08, -0.14], [-0.015, -0.08]].map(p => [p[0] * s, p[1]]), 0.04, 0.018);
                part(pec, M.pearl, P.chest, s * 0.02, 0.05, 0.195, 0, s * 0.28, 0);
                part(B(0.13, 0.022, 0.022), M.accent, P.chest, s * 0.075, -0.1, 0.2, 0, 0, s * 0.5);
            });
            part(new THREE.TorusGeometry(0.085, 0.02, 12, 32), M.trim, P.chest, 0, 0.05, 0.225);
            P.coreGem = part(new THREE.OctahedronGeometry(0.062, 1), M.glow, P.chest, 0, 0.05, 0.24);
            [-1, 1].forEach(s => {
                const gl = part(new THREE.SphereGeometry(0.1, 18, 12), M.steel, P.torso, s * 0.075, -0.3, -(MALE ? 0.125 : 0.095));   // glutes
                gl.scale.set(MALE ? 1.15 : 1.05, 1, 0.8);
                part(pillow(0.2, 0.07, 0.17, 0.03), M.steel, P.chest, s * 0.17, 0.255, -0.015, 0, 0, s * -0.42);                     // trapezius: neck → shoulder slope
                const ob = part(pillow(0.05, 0.2, 0.09, 0.022), M.steel, P.torso, s * (MALE ? 0.15 : 0.122), -0.17, (MALE ? 0.085 : 0.065), 0, 0, s * 0.42);   // obliques: the V from waist to groin
                ob.userData.keepX = true;
            });
            const backPlate = part(pillow(0.42, 0.36, 0.12, 0.05, { bot: 0.8, bulge: 0.02 }), M.pearl, P.chest, 0, 0.05, -0.115, 0, Math.PI, 0);   // back plate
            // --- the back: shoulder-blade plates beside the pack, segmented lower-back armour, rear hip guard, belt pouches ---
            P._scBody = [rib, backPlate]; P._scHips = [hips, belt];               // collision shapes for the scarf (setupScarf)
            [-1, 1].forEach(s => {
                const yaw = s * (Math.PI - 0.55);                                   // faces back and a little outward
                const sc = part(pillow(0.13, 0.25, 0.05, 0.022, { bot: 0.7, bulge: 0.012 }), M.pearl, P.chest, s * 0.2, 0.1, -0.13, 0.1, yaw, 0);
                part(B(0.012, 0.17, 0.012), M.glow, P.chest, s * 0.216, 0.1, -0.157, 0.1, yaw, 0);
                part(B(0.06, 0.012, 0.012), M.trim, P.chest, s * 0.213, 0.215, -0.15, 0.1, yaw, 0);
                P._scBody.push(sc);
            });
            const wz = MALE ? 0.142 : 0.108;                                        // waist depth (matches the front ab plates)
            [0, 1, 2].forEach(i => P._scHips.push(part(pillow((0.2 - i * 0.02) * (MALE ? 1.25 : 1), 0.06, 0.05, 0.02, { bulge: 0.01 }), M.pearl, P.torso, 0, -0.02 + i * 0.075, -(wz + i * 0.004), 0, Math.PI, 0)));
            P._scHips.push(part(B(0.02, 0.2, 0.012), M.glow, P.torso, 0, 0.055, -(wz + 0.03)));   // spine light between the plates
            const hz = MALE ? 0.2 : 0.158;                                          // hip depth
            P._scHips.push(part(plate([[-0.11, 0.06], [0.11, 0.06], [0.085, -0.06], [0, -0.11], [-0.085, -0.06]].map(p => [p[0] * (MALE ? 1.25 : 1), p[1]]), 0.035, 0.014), M.pearl, P.torso, 0, -0.24, -hz, 0.22, Math.PI, 0));
            [-1, 1].forEach(s => P._scHips.push(part(pillow(0.085, 0.075, 0.05, 0.018, { bulge: 0.008 }), M.steel, P.torso, s * (MALE ? 0.13 : 0.1), -0.11, -((MALE ? 0.165 : 0.13) + 0.03), 0, Math.PI, 0)));
            const col = part(new THREE.TorusGeometry(0.085, 0.026, 10, 32), M.trim, P.chest, 0, 0.31, 0, Math.PI / 2, 0, 0);
            col.scale.set(1.1, 0.95, 1);                                                                           // collar ring
            // pauldrons resting on the shoulder joints
            [-1, 1].forEach(s => {
                const sh = new THREE.Group(); sh.position.set(s * 0.36, 0.25, 0); sh.rotation.z = s * -0.38; sh.scale.setScalar(0.56); P.chest.add(sh);
                const dome = part(new THREE.SphereGeometry(0.3, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.pearl, sh, 0, -0.02, 0);
                dome.scale.set(0.95, 0.72, 1.1);
                const rim = part(new THREE.TorusGeometry(0.284, 0.026, 10, 40), M.trim, sh, 0, -0.035, 0, Math.PI / 2, 0, 0);
                rim.scale.set(0.95, 1.1, 1);
                const skirt = part(new THREE.SphereGeometry(0.27, 24, 6, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.2), M.steel, sh, 0, -0.03, 0);
                skirt.scale.set(0.95, 0.8, 1.08);
                part(new THREE.TorusGeometry(0.2, 0.014, 6, 24, Math.PI * 0.7), M.glow, sh, s * 0.2, 0.02, 0, 0, Math.PI / 2, Math.PI * 0.15);
            });

            // --- back pack with thrusters and flaring vanes ---
            const pack = P.pack = new THREE.Group(); pack.position.set(0, 0.04, -0.22); pack.scale.setScalar(0.72); P.chest.add(pack);
            P._scPack = [part(pillow(0.6, 0.5, 0.22, 0.08, { top: 0.9, bulge: 0.02 }), M.steel, pack, 0, 0, 0, 0, Math.PI, 0)];
            P._scPack.push(part(pillow(0.36, 0.38, 0.06, 0.025, { bot: 0.82, bulge: 0.015 }), M.pearl, pack, 0, -0.01, -0.125, 0, Math.PI, 0));   // armoured cover
            part(pillow(0.44, 0.03, 0.04, 0.012), M.glow, pack, 0, 0.205, -0.115);                                  // light bar over the cover
            part(new THREE.TorusGeometry(0.062, 0.014, 8, 6), M.trim, pack, 0, 0.06, -0.165, 0, 0, Math.PI / 6);      // hex emblem
            part(C(0.044, 0.044, 0.02, 6), M.glow, pack, 0, 0.06, -0.162, Math.PI / 2, 0, Math.PI / 6);
            [-0.06, -0.095, -0.13].forEach(y => part(pillow(0.2, 0.018, 0.02, 0.007), M.steel, pack, 0, y, -0.166));   // vent slats
            [[-0.15, 0.15], [0.15, 0.15], [-0.13, -0.17], [0.13, -0.17]].forEach(([x, y]) => part(new THREE.SphereGeometry(0.014, 8, 6), M.trim, pack, x, y, -0.158));   // bolts
            [-1, 1].forEach(s => {                                                                                    // side power cells
                P._scPack.push(part(C(0.05, 0.05, 0.34, 14), M.trim, pack, s * 0.28, -0.01, -0.03));
                [0.06, -0.08].forEach(y => part(new THREE.TorusGeometry(0.052, 0.009, 6, 20), M.glow, pack, s * 0.28, y, -0.03, Math.PI / 2, 0, 0));
                part(C(0.034, 0.05, 0.04, 14), M.steel, pack, s * 0.28, 0.185, -0.03);
            });
            part(pillow(0.42, 0.04, 0.15, 0.015), M.trim, pack, 0, 0.245, 0);                                          // top ridge
            P.thrusters = [];
            [-0.17, 0.17].forEach(x => {
                P._scPack.push(part(lathe([[0.12, -0.13], [0.1, -0.09], [0.07, 0.0], [0.065, 0.1], [0.08, 0.13]]), M.trim, pack, x, -0.3, -0.02));
                const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 16), P.flameMat);
                f.position.set(x, -0.6, -0.02); f.rotation.x = Math.PI; f.scale.set(1, 0.001, 1); pack.add(f);
                P.thrusters.push(f);
            });
            P.vanes = [];
            [-1, 1].forEach(s => {
                const v = new THREE.Group(); v.position.set(s * 0.22, 0.15, -0.08); pack.add(v);
                part(plate([[-0.05, 0], [0.05, 0.02], [0.05, 0.42], [0, 0.68], [-0.035, 0.5]], 0.1, 0.02, true), M.pearl, v, 0, 0, 0);
                part(B(0.02, 0.46, 0.03), M.glow, v, s * 0.07, 0.28, 0);
                part(pillow(0.07, 0.18, 0.1, 0.03), M.accent, v, 0, 0.6, 0);
                v.rotation.set(-0.25, 0, -s * 0.5); v.userData.s = s;
                P.vanes.push(v);
            });

            // --- energy scarf: a two-layer wrap around the neck; its cloth tails are made in setupScarf() ---
            P.scarf = [];
            const wrap = P.scarfWrap = part(new THREE.TorusGeometry(0.15, 0.05, 12, 40), M.accent, P.chest, 0, 0.3, -0.01, Math.PI / 2 + 0.2, 0, 0);
            wrap.scale.set(1.1, 0.95, 1.15);
            const wrap2 = part(new THREE.TorusGeometry(0.135, 0.034, 10, 36), M.accent, P.chest, 0, 0.345, -0.015, Math.PI / 2 + 0.08, 0, 0.3);
            wrap2.scale.set(1.08, 0.95, 1);
            wrap.userData.keep = wrap2.userData.keep = true;

            // --- head: open-face helmet with a human face ---
            const h = P.headGroup = new THREE.Group(); h.position.y = 0.43; h.scale.setScalar(0.9); P.chest.add(h);
            part(C(0.09, 0.11, 0.16, 10), M.skin, h, 0, -0.08, 0);
            // face: one sculpted surface — rounded cranium, soft cheeks, V-shaped jaw, small nose bridge
            const faceGeo = new THREE.SphereGeometry(0.25, 48, 36);
            {
                const pos = faceGeo.attributes.position, v = new THREE.Vector3();
                const g2 = (x, y, sx, sy) => Math.exp(-((x * x) / (sx * sx) + (y * y) / (sy * sy)));
                const R = 0.25, sgn = Math.sign;
                for (let i = 0; i < pos.count; i++) {
                    v.fromBufferAttribute(pos, i);
                    const nx = v.x / R, ny = v.y / R, nz = v.z / R;
                    let x = v.x * (MALE ? 0.9 : 0.84), y = v.y * 1.07, z = v.z * 0.92;               // head: narrower than it is deep, a bit taller
                    if (ny > 0.1) x *= 1 - 0.08 * Math.min(1, (ny - 0.1) / 0.5);      // temples
                    const t = Math.min(1, Math.max(0, (-ny - 0.05) / 0.95));          // 0 under the cheekbones → 1 at the chin
                    x *= 1 - (MALE ? 0.24 : 0.43) * Math.pow(t, MALE ? 2.0 : 1.1);   // male: wider, squarer jaw                                  // jaw line tapering to the chin
                    if (nz < 0) z *= 1 - 0.45 * t;                                     // jaw tucks back into the neck
                    else z *= 1 - 0.08 * t;
                    if (nz > 0.25) {                                                   // flatter front plane, as in anime faces
                        const flat = Math.min(1, (nz - 0.25) / 0.6);
                        z -= 0.018 * flat * Math.max(0, 1 - (x / 0.13) * (x / 0.13));
                    }
                    if (nz > 0) {
                        z += 0.016 * g2(x, y + 0.06, 0.015, 0.028) + 0.006 * g2(x, y + 0.02, 0.011, 0.04);   // nose tip + bridge
                        z += (MALE ? 0.012 : 0.007) * (g2(x - 0.085, y - 0.05, 0.05, 0.02) + g2(x + 0.085, y - 0.05, 0.05, 0.02));   // brow ridge
                        z -= 0.008 * (g2(x - 0.088, y + 0.015, 0.035, 0.03) + g2(x + 0.088, y + 0.015, 0.035, 0.03)); // eye sockets
                        z += 0.005 * (g2(x - 0.1, y + 0.055, 0.035, 0.03) + g2(x + 0.1, y + 0.055, 0.035, 0.03));  // cheekbones
                        z += 0.006 * g2(x, y + 0.118, 0.03, 0.018);                                                 // lips
                        z += (MALE ? 0.014 : 0.01) * g2(x, y + 0.2, MALE ? 0.055 : 0.035, 0.03);                                                    // chin
                    }
                    x += sgn(x) * 0.006 * g2(Math.abs(x) - 0.17, y + 0.04, 0.03, 0.04) * Math.max(0, nz + 0.3);  // cheekbone width
                    pos.setXYZ(i, x, y, z);
                }
                faceGeo.computeVertexNormals();
            }
            const face = part(faceGeo, M.skin, h, 0, 0.13, 0.03);
            // find points on the face surface (so every feature sits exactly on the skin)
            const probe = new THREE.Mesh(faceGeo); probe.position.copy(face.position); probe.updateMatrixWorld(true);
            const ray = new THREE.Raycaster();
            const onFace = (x, y) => {
                ray.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
                const hit = ray.intersectObject(probe)[0];
                return hit ? { p: hit.point, n: hit.face.normal.clone() } : { p: new THREE.Vector3(x, y, 0.24), n: new THREE.Vector3(0, 0, 1) };
            };
            const sm = (geo, mat, x, y, z, parent = h) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
            const layer = (c, o) => new THREE.MeshBasicMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -o, polygonOffsetUnits: -o });
            const shapeGeo = (pts, mirror = 1) => {
                const sh = new THREE.Shape(); const q = pts.map(p => new THREE.Vector2(p[0] * mirror, p[1]));
                sh.moveTo(q[0].x, q[0].y); sh.splineThru(q.slice(1).concat([q[0]]));
                return new THREE.ShapeGeometry(sh, 24);
            };
            // iris texture: grey-scale (tinted by the colour scheme), dark rim, lighter lower half, fibres
            const irisTex = (() => {
                const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
                const gr = g.createRadialGradient(64, 78, 6, 64, 64, 64);
                gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#c8c8c8'); gr.addColorStop(0.82, '#7a7a7a'); gr.addColorStop(1, '#1c1c1c');
                g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
                g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
                for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18); g.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); g.stroke(); }
                const top = g.createLinearGradient(0, 0, 0, 60); top.addColorStop(0, 'rgba(0,0,0,0.55)'); top.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = top; g.fillRect(0, 0, 128, 60);                    // shadow cast by the upper lid
                g.fillStyle = '#050505'; g.beginPath(); g.ellipse(64, 66, 17, 22, 0, 0, Math.PI * 2); g.fill();   // pupil
                const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
            })();
            M.iris.map = irisTex; M.iris.needsUpdate = true;
            const skinLid = M.lid = new THREE.MeshStandardMaterial({ color: M.skin.color.clone().multiplyScalar(0.8), emissive: M.skin.emissive, emissiveIntensity: 0.22, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
            const white = layer(0xf7f7f2, 1), lashM = layer(0x160d0a, 7), lowM = layer(0x5a3328, 6), shine = layer(0xffffff, 4);
            // eye outline (outer corner = +x), big anime proportions with a sharp upper lid
            const EYE = [[-0.034, 0.024], [-0.004, 0.04], [0.03, 0.038], [0.042, 0.012], [0.032, -0.03], [0.004, -0.044], [-0.026, -0.034], [-0.038, -0.004]];
            P.eyes = [];
            [-1, 1].forEach(s => {
                const sp = onFace(s * 0.088, 0.115);
                const e = new THREE.Group(); e.position.copy(sp.p).addScaledVector(sp.n, 0.002);
                e.lookAt(e.position.clone().add(sp.n)); h.add(e);
                sm(shapeGeo(EYE, s), white, 0, 0, 0, e);
                if (MALE) e.scale.set(0.92, 0.72, 1); else if (FEMALE) e.scale.set(1.05, 1.06, 1);                                                 // narrower, sharper eyes
                const iris = new THREE.Group(); iris.position.set(-s * 0.003, -0.006, 0.0015); e.add(iris);
                const ir = new THREE.Mesh(new THREE.CircleGeometry(0.029, 32), M.iris); ir.scale.set(0.92, 1.08, 1); iris.add(ir);
                sm(new THREE.CircleGeometry(0.0085, 16), shine, s * 0.011, 0.014, 0.002, iris);    // key highlight
                sm(new THREE.CircleGeometry(0.0045, 12), shine, -s * 0.009, -0.014, 0.002, iris);  // bounce highlight
                // upper eyelid (skin) that slides down for blinks and squints, with its thick lash line
                const lid = new THREE.Group(); lid.position.set(0, 0.046, 0.003); e.add(lid);
                const lidSkin = sm(shapeGeo([[-0.04, -0.012], [-0.006, 0.0], [0.034, -0.002], [0.047, -0.03], [0.046, -0.095], [-0.042, -0.095]], s), skinLid, 0, 0, 0, lid);
                const lash = sm(shapeGeo([[-0.038, -0.02], [-0.004, -0.004], [0.032, -0.006], [0.054, -0.012], [0.046, -0.022], [0.028, -0.016], [-0.004, -0.014], [-0.036, -0.03]], s), lashM, 0, 0, 0.001, lid);
                if (!MALE) sm(shapeGeo([[0.012, -0.042], [0.034, -0.03], [0.04, -0.022], [0.03, -0.034], [0.01, -0.046]], s), lowM, 0, 0, 0.001, e);   // lower lash
                e.userData = { lid, lidSkin, lash, iris, s };
                P.eyes.push(e);
                // brow: thick at the inner end, tapering outward, angled for a determined look
                const bp = onFace(s * 0.09, 0.185);
                const brow = new THREE.Mesh(shapeGeo([[-0.045, -0.006], [-0.01, 0.01], [0.03, 0.012], [0.05, 0.004], [0.02, 0.0], [-0.02, -0.004], [-0.046, -0.016]], s), layer(MALE ? 0x1a110d : 0x3a2215, 3));
                (P.browMats = P.browMats || []).push(brow.material);
                if (FEMALE) brow.scale.set(1, 0.75, 1);                                               // finer brows
                brow.position.copy(bp.p).addScaledVector(bp.n, 0.003); brow.lookAt(brow.position.clone().add(bp.n)); brow.rotateZ(-s * (MALE ? 0.14 : 0.22)); if (MALE) brow.scale.set(1.15, 2.1, 1); h.add(brow);
                e.userData.brow = brow; e.userData.browY = brow.position.y;
            });
            // mouth: closed line, and an open "shout" (teeth + tongue) for attacks
            const mp = onFace(0, 0.012);
            const mouth = new THREE.Group(); mouth.position.copy(mp.p).addScaledVector(mp.n, 0.002); mouth.lookAt(mouth.position.clone().add(mp.n)); h.add(mouth);
            const closed = sm(shapeGeo([[-0.028, 0.003], [0, -0.002], [0.028, 0.003], [0.026, -0.003], [0, -0.009], [-0.026, -0.003]]), layer(0x4a1812, 3), 0, 0, 0, mouth);
            const open = new THREE.Group(); mouth.add(open);
            sm(shapeGeo([[-0.03, 0.008], [0, 0.012], [0.03, 0.008], [0.022, -0.02], [0, -0.034], [-0.022, -0.02]]), layer(0x3a0f12, 3), 0, 0, 0, open);
            sm(shapeGeo([[-0.024, 0.008], [0, 0.011], [0.024, 0.008], [0.02, 0.0], [-0.02, 0.0]]), layer(0xfaf6ee, 5), 0, 0, 0.0005, open);   // teeth
            sm(shapeGeo([[-0.016, -0.02], [0, -0.014], [0.016, -0.02], [0, -0.032]]), layer(0xc0505a, 5), 0, 0, 0.0005, open);                 // tongue
            open.scale.y = 0.01; open.visible = false;
            mouth.scale.set(MALE ? 1.45 : 1.25, 1.25, 1.25);
            P.mouth = mouth; P.mouthClosed = closed; P.mouthOpen = open;
            P.eyeLid = 0; P.mouthAmt = 0; P.gaze = new THREE.Vector2();
            // helmet: one sculpted shell — longer at the back, slimmer at the sides, a crown ridge,
            // a nape guard, and a face opening that narrows into cheek guards along the jaw
            const HC = 0.14;
            const D = v => {                                   // helmet shaping, shared by every helmet piece
                const ly = v.y - HC;
                v.x *= 0.93;
                if (v.z < 0) {
                    v.z *= 1.13;
                    if (ly < 0) { const k = Math.min(1, -ly / 0.22) * Math.min(1, -v.z / 0.3); v.y -= 0.045 * k; v.z *= 1 + 0.08 * k; }   // nape guard
                }
                if (ly > 0) { const r = Math.exp(-(v.x * v.x) / (0.03 * 0.03)) * (ly / 0.3) * 0.014; const l = Math.hypot(ly, v.z) || 1; v.y += r * ly / l; v.z += r * v.z / l; }  // crown ridge
                return v;
            };
            {
                const R = 0.3, NX = 60, NY = 34, T1 = Math.PI * 0.82;
                const open = th => th < 0.95 ? 0 : th < 1.12 ? (th - 0.95) / 0.17 * 1.0 : th < 1.7 ? 1.0 : th < 2.05 ? 1.0 - (th - 1.7) / 0.35 * 0.2 : 0.8 + Math.min(1, (th - 2.05) / 0.45) * 0.75;   // opens again under the chin
                const pts = [], idx = [], rimL = [], rimR = [], v = new THREE.Vector3();
                for (let j = 0; j <= NY; j++) {
                    const th = T1 * j / NY, a = open(th), y = HC + R * Math.cos(th), rh = R * Math.sin(th);
                    for (let i = 0; i <= NX; i++) {
                        const ph = a + (Math.PI * 2 - 2 * a) * i / NX;
                        D(v.set(rh * Math.sin(ph), y, rh * Math.cos(ph))); pts.push(v.x, v.y, v.z);
                    }
                    if (th > 1.12 && th < 2.35) {
                        rimL.push(D(new THREE.Vector3((rh + 0.006) * Math.sin(a), y, (rh + 0.006) * Math.cos(a))));
                        rimR.push(D(new THREE.Vector3(-(rh + 0.006) * Math.sin(a), y, (rh + 0.006) * Math.cos(a))));
                    }
                }
                for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
                    const q = j * (NX + 1) + i, w = q + NX + 1;
                    idx.push(q, w, q + 1, w, w + 1, q + 1);
                }
                const hg = new THREE.BufferGeometry();
                hg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); hg.setIndex(idx); hg.computeVertexNormals();
                part(hg, M.pearl, h);
                [rimL, rimR].forEach(r => part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 40, 0.01, 8), M.trim, h));   // rolled edge of the face opening
            }
            // forehead guard: the helmet comes down over the forehead to just above the brows,
            // dipping to a point at the centre and sweeping up over the temples
            {
                const HR = 0.306, PH = 1.08, NX = 44, NY = 10, vv = new THREE.Vector3();
                const edgeY = x => { const a = Math.abs(x); return a < 0.1 ? 0.205 + 0.5 * a : a < 0.17 ? 0.255 : 0.255 - (a - 0.17) * 0.9; };
                const topY = HC + HR * Math.cos(0.5);
                const pts = [], idx = [], edge = [];
                for (let i = 0; i <= NX; i++) {
                    const ph = -PH + (2 * PH) * i / NX, ex = HR * Math.sin(ph), yb = edgeY(ex);
                    for (let j = 0; j <= NY; j++) {
                        const y = yb + (topY - yb) * j / NY, rh = Math.sqrt(Math.max(0, HR * HR - (y - HC) * (y - HC)));
                        D(vv.set(rh * Math.sin(ph), y, rh * Math.cos(ph))); pts.push(vv.x, vv.y, vv.z);
                    }
                    const rh0 = Math.sqrt(HR * HR - (yb - HC) * (yb - HC)) + 0.004;
                    edge.push(D(new THREE.Vector3(rh0 * Math.sin(ph), yb, rh0 * Math.cos(ph))));
                }
                for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
                    const a = i * (NY + 1) + j, b = a + NY + 1;
                    idx.push(a, b, a + 1, b, b + 1, a + 1);
                }
                const vg = new THREE.BufferGeometry();
                vg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); vg.setIndex(idx); vg.computeVertexNormals();
                part(vg, M.pearl, h);
                part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 80, 0.011, 8), M.trim, h);        // rolled rim along the edge
                // emblem: a slim glowing arrowhead pointing down to the V of the guard
                const em = new THREE.Shape(); em.moveTo(0, -0.05); em.lineTo(0.045, 0.02); em.lineTo(0.028, 0.03); em.lineTo(0, -0.012); em.lineTo(-0.028, 0.03); em.lineTo(-0.045, 0.02); em.closePath();
                const emb = part(new THREE.ExtrudeGeometry(em, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), M.glow, h, 0, 0.3, 0.262);
                emb.rotation.x = -0.52;
                part(new THREE.SphereGeometry(0.018, 14, 10), M.accent, h, 0, 0.345, 0.24);
            }
            // hair: tapered, curved locks that fall from under the helmet rim and follow the forehead
            const strand = (pts, w, th, face, seg = 14, rad = 8) => {
                const curve = new THREE.CatmullRomCurve3(pts);
                const P3 = [], idx = [], fdir = face.clone().normalize();
                for (let i = 0; i <= seg; i++) {
                    const u = i / seg, c = curve.getPointAt(u), T = curve.getTangentAt(u);
                    const W = new THREE.Vector3().crossVectors(T, fdir).normalize(), Th = new THREE.Vector3().crossVectors(W, T).normalize();
                    const wr = Math.max(0.0012, w * Math.pow(1 - u, 0.75)), tr = Math.max(0.001, th * (1 - 0.75 * u));
                    for (let j = 0; j <= rad; j++) {
                        const a = j / rad * Math.PI * 2;
                        const q = c.clone().addScaledVector(W, Math.cos(a) * wr).addScaledVector(Th, Math.sin(a) * tr);
                        P3.push(q.x, q.y, q.z);
                    }
                }
                for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
                    const A = i * (rad + 1) + j, Bq = A + rad + 1;
                    idx.push(A, Bq, A + 1, Bq, Bq + 1, A + 1);
                }
                const gg = new THREE.BufferGeometry();
                gg.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); gg.setIndex(idx); gg.computeVertexNormals();
                return gg;
            };
            const skinPt = (x, y, off) => { const f = onFace(x, y); return f.p.clone().addScaledVector(f.n, off); };
            (MALE ? [[-0.14, 0.215, -0.02], [-0.07, 0.195, -0.03], [0.0, 0.2, 0.02], [0.075, 0.19, 0.035], [0.145, 0.215, 0.03]]      // shorter, spikier cut
                  : [[-0.145, 0.205, -0.035], [-0.095, 0.172, -0.022], [-0.045, 0.19, -0.006], [0.004, 0.158, 0.008], [0.052, 0.186, 0.02], [0.1, 0.17, 0.03], [0.147, 0.208, 0.04]])
                .forEach(([x, tipY, sw], i) => {
                    const root = new THREE.Vector3(x * 0.95, 0.335, 0.17);                         // tucked under the rim
                    const pts = [root, skinPt(x, 0.285, 0.016), skinPt(x + sw * 0.5, 0.235, 0.012), skinPt(x + sw, tipY, 0.006)];
                    part(strand(pts, 0.036 + (i % 2) * 0.006, 0.011, new THREE.Vector3(x, 0, 1)), M.hair, h);
                });
            [-1, 1].forEach(s => {                                                                 // sideburns in front of the ears
                const pts = [new THREE.Vector3(s * 0.19, 0.3, 0.06), skinPt(s * 0.175, 0.22, 0.01), skinPt(s * 0.17, 0.14, 0.008), skinPt(s * 0.165, 0.08, 0.004)];
                part(strand(pts, 0.03, 0.01, new THREE.Vector3(s, 0, 0.6)), M.hair, h);
                if (FEMALE) {                                                                      // long locks framing the face, down to the jaw
                    const lk = [new THREE.Vector3(s * 0.2, 0.31, 0.1), skinPt(s * 0.19, 0.2, 0.022), skinPt(s * 0.185, 0.07, 0.02), skinPt(s * 0.17, -0.04, 0.016), skinPt(s * 0.15, -0.1, 0.012)];
                    part(strand(lk, 0.05, 0.014, new THREE.Vector3(s, 0, 0.7), 18), M.hair, h);
                }
            });
            if (FEMALE) {                                                                          // ponytail out of the back of the helmet, with a glowing tie
                [[0, 0.12, 0.075], [-0.035, 0.1, 0.055], [0.035, 0.1, 0.055]].forEach(([dx, w, t], k) => {
                    const pt = [new THREE.Vector3(dx * 0.5, 0.15, -0.27), new THREE.Vector3(dx * 0.8, 0.05, -0.38), new THREE.Vector3(dx, -0.1, -0.45), new THREE.Vector3(dx * 1.2 + 0.01, -0.26, -0.48), new THREE.Vector3(dx * 1.4 + 0.02, -0.38 + k * 0.05, -0.47)];
                    part(strand(pt, w, t, new THREE.Vector3(1, 0, 0.2), 20, 10), M.hair, h);
                });
                part(new THREE.TorusGeometry(0.05, 0.016, 8, 20), M.accent, h, 0, 0.09, -0.335, 1.05, 0, 0);
            }
            // round ear receptors with a glowing ring, swept-back fins, and a crest fin along the crown
            [-1, 1].forEach(s => {
                part(C(0.092, 0.1, 0.07, 32), M.trim, h, s * 0.272, 0.12, -0.02, 0, 0, Math.PI / 2);
                part(new THREE.TorusGeometry(0.058, 0.011, 8, 32), M.glow, h, s * 0.308, 0.12, -0.02, 0, Math.PI / 2, 0);
                const cap = part(new THREE.SphereGeometry(0.045, 16, 10), M.pearl, h, s * 0.3, 0.12, -0.02); cap.scale.set(0.5, 1, 1);
                const fin = part(plate([[0, 0], [0.08, 0.015], [0.2, 0.08], [0.33, 0.17], [0.3, 0.2], [0.14, 0.12], [0.01, 0.065]], 0.022, 0.007), M.pearl, h, s * 0.275, 0.17, -0.06, 0, Math.PI / 2, s * 0.12);
                part(B(0.012, 0.012, 0.2), M.glow, fin, 0.17, 0.085, s * 0.018, 0, Math.PI / 2, 0.55);
            });
            const crest = part(plate([[-0.02, 0], [0.12, 0.02], [0.3, 0.05], [0.42, 0.1], [0.36, 0.11], [0.12, 0.075], [-0.03, 0.05]], 0.026, 0.008), M.pearl, h, 0, 0.415, 0.12, 0, Math.PI / 2, 0);
            crest.rotation.z = -0.35;
            part(B(0.012, 0.01, 0.26), M.accent, crest, 0.2, 0.06, 0, 0, Math.PI / 2, 0.2);
            P.blinkTimer = rand(2, 4);

            // --- arms: undersuit limbs with deltoid, bicep and forearm shapes; armour only where it protects ---
            const arm = s => {
                const g = new THREE.Group(); g.position.set(s * 0.36, 0.2, 0); P.chest.add(g);
                const dl = part(new THREE.SphereGeometry(0.096, 20, 14), M.steel, g); dl.scale.set(1, 1.08, 1);    // shoulder joint / deltoid
                const up = part(lathe([[0.058, -0.4], [0.07, -0.33], [0.086, -0.22], [0.088, -0.12], [0.084, -0.04], [0.08, 0.0]]), M.steel, g); up.scale.z = 0.9;   // biceps / triceps
                part(pillow(0.04, 0.2, 0.13, 0.018, { bulge: 0.01 }), M.pearl, g, s * 0.068, -0.2, 0, 0, s * Math.PI / 2, 0);   // bicep guard
                const el = new THREE.Group(); el.position.y = -0.4; g.add(el);
                part(new THREE.SphereGeometry(0.062, 18, 12), M.trim, el);
                part(C(0.034, 0.034, 0.15, 16), M.steel, el, 0, 0, 0, 0, 0, Math.PI / 2);
                g.userData.elbow = el;
                return g;
            };
            P.armL = arm(-1); P.elbowL = P.armL.userData.elbow;
            const eL = P.elbowL;
            part(lathe([[0.042, -0.42], [0.05, -0.33], [0.066, -0.14], [0.058, 0.0]]), M.steel, eL);              // forearm
            part(lathe([[0.082, -0.43], [0.098, -0.38], [0.1, -0.24], [0.086, -0.15], [0.07, -0.12]], 24), M.pearl, eL);   // gauntlet
            part(new THREE.TorusGeometry(0.097, 0.01, 8, 32), M.glow, eL, 0, -0.22, 0, Math.PI / 2, 0, 0);
            part(pillow(0.025, 0.18, 0.12, 0.01), M.accent, eL, -0.105, -0.3, 0);
            // hand: an articulated glove — sculpted palm with a thenar pad, four three-jointed fingers of
            // human proportions (middle longest, pinky short), fanned and relaxed into a natural curl toward the
            // palm, an opposable thumb, armoured knuckle guard and finger plates on the back. Built from nested
            // joints, then baked into one mesh per material (three draw calls for the whole hand).
            {
                const root = new THREE.Group(), lists = new Map();
                const node = (par, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); par.add(o); return o; };
                const put = (mat, geo, o, sx = 1, sy = 1, sz = 1) => { o.scale.set(sx, sy, sz); if (!lists.has(mat)) lists.set(mat, []); lists.get(mat).push({ geo, o }); };
                const cyl = (r0, r1, len) => { const c = new THREE.CylinderGeometry(r0, r1, len, 12, 1, true); c.translate(0, -len / 2, 0); return c; };
                const ball = r => new THREE.SphereGeometry(r, 12, 9);
                root.position.set(0, -0.44, 0.004); root.scale.setScalar(1.3);                                    // sized to the gauntlet
                const Wr = node(root, 0, 0, 0);                                                         // wrist (palm faces +x, toward the body)
                put(M.steel, ball(0.04), node(Wr, 0, 0, 0), 0.85, 0.7, 1);
                put(M.trim, new THREE.TorusGeometry(0.043, 0.008, 8, 24), node(Wr, 0, 0.004, 0, Math.PI / 2, 0, 0), 0.85, 1, 1);   // wrist cuff
                put(M.steel, pillow(0.05, 0.112, 0.102, 0.022, { top: 0.82 }), node(Wr, 0.002, -0.062, 0));        // palm, wider at the knuckles
                put(M.steel, ball(0.03), node(Wr, 0.02, -0.048, 0.03), 0.55, 1.1, 0.75);                           // thenar pad under the thumb
                put(M.steel, ball(0.026), node(Wr, 0.02, -0.075, -0.03), 0.45, 1.2, 0.7);                          // outer heel of the palm
                put(M.pearl, pillow(0.09, 0.086, 0.016, 0.007, { bulge: 0.008, top: 0.8 }), node(Wr, -0.029, -0.06, 0, 0, -Math.PI / 2, 0));   // back-of-hand plate
                put(M.glow, new THREE.BoxGeometry(0.006, 0.052, 0.007), node(Wr, -0.0395, -0.06, 0));                // light line on the plate
                put(M.trim, pillow(0.018, 0.024, 0.106, 0.008), node(Wr, -0.016, -0.118, 0));                      // knuckle guard
                const FING = [[0.036, 0.9, -0.06, 0.38], [0.012, 0.95, -0.015, 0.45], [-0.012, 0.9, 0.03, 0.5], [-0.035, 0.75, 0.08, 0.58]];   // z, length, fan, curl
                FING.forEach(([z, L, fan, curl]) => {
                    const lens = [0.047 * L, 0.031 * L, 0.025 * L], rads = [0.0152, 0.014, 0.0128];
                    let seg = node(Wr, 0.004, -0.118, z, fan, 0, 0);
                    lens.forEach((len, j) => {
                        seg = node(seg, 0, j ? -lens[j - 1] : 0, 0, 0, 0, j === 0 ? curl : j === 1 ? curl * 1.35 : curl * 1.05);
                        put(M.steel, ball(rads[j] * 1.1), node(seg, 0, 0, 0));                                  // joint
                        put(M.steel, cyl(rads[j] * 0.94, rads[j], len), node(seg, 0, 0, 0));                     // phalanx
                        if (j < 2) put(j ? M.trim : M.pearl, pillow(0.008, len * 0.7, rads[j] * 2.05, 0.0035), node(seg, -rads[j] * 0.95, -len * 0.5, 0));   // back plates
                    });
                    put(M.steel, ball(rads[2] * 0.98), node(seg, 0, -lens[2], 0), 1, 1.15, 1);                 // rounded fingertip
                });
                // thumb: swung forward out of the palm, turned toward the fingers, two gentle bends
                let th = node(Wr, 0.012, -0.03, 0.04, -0.5, 0, 0.22);
                [[0.038, 0.018, 0], [0.03, 0.0162, 0.16], [0.025, 0.0148, 0.22]].forEach(([len, r, bend], j, A) => {
                    th = node(th, 0, j ? -A[j - 1][0] : 0, 0, 0, 0, bend);
                    put(M.steel, ball(r * 1.08), node(th, 0, 0, 0));
                    put(M.steel, cyl(r * 0.94, r, len), node(th, 0, 0, 0));
                    if (j === 1) put(M.pearl, pillow(0.008, len * 0.75, r * 2.1, 0.0035), node(th, -r * 0.95, -len * 0.5, 0));
                    if (j === 2) put(M.steel, ball(r * 0.98), node(th, 0, -len, 0), 1, 1.15, 1);
                });
                root.updateMatrixWorld(true);
                lists.forEach((list, mat) => part(window.AxonPerf.mergeGeometries(list.map(e => ({ geo: e.geo, matrix: e.o.matrixWorld }))), mat, eL));
            }

            // right forearm: the buster cannon, sized to the arm
            P.armR = arm(1); P.elbowR = P.armR.userData.elbow;
            P.armR.rotation.order = 'YXZ'; P.armL.rotation.order = 'YXZ';
            const eR = P.elbowR;
            part(lathe([[0.118, -0.46], [0.133, -0.42], [0.138, -0.22], [0.126, -0.1], [0.085, -0.02]], 28), M.pearl, eR);
            part(new THREE.TorusGeometry(0.134, 0.013, 8, 36), M.trim, eR, 0, -0.1, 0, Math.PI / 2, 0, 0);
            part(new THREE.TorusGeometry(0.132, 0.013, 8, 36), M.trim, eR, 0, -0.42, 0, Math.PI / 2, 0, 0);
            part(new THREE.TorusGeometry(0.139, 0.008, 8, 36), M.glow, eR, 0, -0.2, 0, Math.PI / 2, 0, 0);
            [-1, 1].forEach(s => {
                part(pillow(0.032, 0.24, 0.13, 0.013, { bot: 0.8 }), M.pearl, eR, s * 0.143, -0.28, -0.03);
                part(B(0.008, 0.18, 0.026), M.accent, eR, s * 0.161, -0.28, -0.03);
            });
            [-0.22, -0.26, -0.3].forEach(y => part(pillow(0.075, 0.015, 0.02, 0.006), M.steel, eR, 0, y, 0.135));
            part(lathe([[0.09, -0.56], [0.084, -0.535], [0.07, -0.5], [0.064, -0.465], [0.084, -0.43]], 28), M.steel, eR);
            part(C(0.045, 0.045, 0.13, 20), M.steel, eR, 0, -0.5, 0);
            const muzRing = part(new THREE.TorusGeometry(0.073, 0.015, 10, 32), M.glow, eR, 0, -0.555, 0); muzRing.rotation.x = Math.PI / 2;
            P.muzzle = new THREE.Object3D(); P.muzzle.position.y = -0.58; eR.add(P.muzzle);
            P.chargeOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
                new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
            P.chargeOrb.visible = false; P.chargeOrb.scale.setScalar(0.7); P.muzzle.add(P.chargeOrb);

            // energy saber (extends from the gauntlet)
            P.sword = new THREE.Group(); P.sword.position.y = -0.54; eR.add(P.sword);
            
            const bladeCore = new THREE.Mesh(
                B(0.025, 2.2, 0.10), // تم تنحيف القلب هنا ليكون حاداً كالسيف
                new THREE.MeshStandardMaterial({ 
                    color: 0xffffff, 
                    emissive: 0xfff6e0, 
                    emissiveIntensity: 4.0 
                })
            );
            
            const glowShader = {
                uniforms: {
                    glowColor: { value: new THREE.Color(0xff8a1a) }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        vViewPosition = -mvPosition.xyz;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    void main() {
                        vec3 normal = normalize(vNormal);
                        vec3 viewDir = normalize(vViewPosition);
                        float intensity = pow(max(dot(normal, viewDir), 0.0), 1.5) * 0.85; 
                        gl_FragColor = vec4(glowColor, intensity);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            };
            
            // تم تضييق قطر الهالة المتوهجة لتلائم النصل الحاد
            const bladeGlow = new THREE.Mesh(C(0.075, 0.075, 2.3, 16), new THREE.ShaderMaterial(glowShader));

            bladeCore.position.y = bladeGlow.position.y = -1.15;
            P.sword.add(bladeCore, bladeGlow); P.sword.visible = false;

            // physical saber hilt: it rides on the back (P.backSaber) and docks on the buster when drawn (P.handHilt);
            // the energy blade ignites from its emitter. Both start hidden so compact() leaves them as separate pieces.
            const hilt = parent => {                                        // pommel at the origin, emitter 0.3 below
                const g = new THREE.Group(); parent.add(g);
                part(C(0.05, 0.04, 0.05, 14), M.trim, g, 0, -0.025, 0);
                part(C(0.036, 0.036, 0.17, 14), M.steel, g, 0, -0.14, 0);
                [-0.08, -0.13, -0.18].forEach(y => part(new THREE.TorusGeometry(0.038, 0.008, 6, 18), M.accent, g, 0, y, 0, Math.PI / 2, 0, 0));
                part(B(0.17, 0.035, 0.075), M.trim, g, 0, -0.235, 0);
                part(B(0.13, 0.012, 0.08), M.glow, g, 0, -0.235, 0);
                part(C(0.045, 0.052, 0.05, 14), M.steel, g, 0, -0.275, 0);
                part(new THREE.TorusGeometry(0.047, 0.01, 6, 18), M.glow, g, 0, -0.3, 0, Math.PI / 2, 0, 0);
                return g;
            };
            // the saber lives in the real hand (armL / elbowL, the hero's sword hand), held in the fist, tilted forward
            const eH = P.elbowL, tilt = -0.55, fist = new THREE.Vector3(0.022, -0.6, 0.005);
            const along = d => fist.clone().add(new THREE.Vector3(0, -d, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
            P.handHilt = hilt(eH); P.handHilt.position.copy(along(-0.14)); P.handHilt.rotation.x = tilt; P.handHilt.visible = false;   // grip centred in the fist
            eH.add(P.sword); P.sword.position.copy(along(0.16)); P.sword.rotation.x = tilt;                                            // blade from the emitter
            // on the back: the whole saber, blade lit at full length, hilt up over the sword-hand shoulder
            const bs = P.backSaber = new THREE.Group(); bs.position.set(-0.04, 0.12, -0.37); bs.rotation.set(-0.1, 0, 0.36); P.chest.add(bs);
            hilt(bs).position.y = 0.52;
            P.backBlade = new THREE.Group(); P.backBlade.position.y = 0.22; P.backBlade.rotation.y = Math.PI / 2; bs.add(P.backBlade);   // flat side on the back
            P.backBlade.add(bladeCore.clone(), bladeGlow.clone());
            part(B(0.2, 0.05, 0.1), M.trim, bs, 0, 0.12, 0.05); part(B(0.2, 0.05, 0.1), M.trim, bs, 0, -0.32, 0.06);   // clamps onto the pack
            bs.visible = false; P.drawn = false;

            // --- legs: long thighs and shins, knee-high greaves that taper to the ankle, low sleek boots ---
            const greaveGeo = plate([[-0.13, 0.27], [0.115, 0.29], [0.145, 0.12], [0.118, -0.12], [0.108, -0.27], [-0.095, -0.29], [-0.118, -0.1], [-0.162, 0.08]], 0.19, 0.03, true);
            const toeGeo = plate([[-0.05, 0.075], [0.15, 0.066], [0.26, 0.012], [0.29, -0.045], [-0.05, -0.045]], 0.18, 0.024, true);
            const leg = s => {
                const g = new THREE.Group(); g.position.set(s * 0.125, -0.36, 0); P.torso.add(g);
                const th = part(lathe([[0.08, -0.52], [0.098, -0.44], [0.126, -0.3], [0.144, -0.15], [0.14, -0.03], [0.125, 0.04]], 24), M.steel, g); th.scale.z = 0.95;
                part(pillow(0.16, 0.3, 0.07, 0.032, { bot: 0.78, bulge: 0.022 }), M.pearl, g, 0, -0.25, 0.092);    // thigh plate
                part(pillow(0.05, 0.28, 0.16, 0.022, { bot: 0.85 }), M.pearl, g, s * 0.105, -0.23, 0);
                const knee = new THREE.Group(); knee.position.y = -0.52; g.add(knee);
                part(C(0.05, 0.05, 0.2, 16), M.steel, knee, 0, 0, 0, 0, 0, Math.PI / 2);
                const cap = part(new THREE.SphereGeometry(0.095, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.pearl, knee, 0, 0.0, 0.045, Math.PI / 2, 0, 0);
                cap.scale.set(1, 0.9, 1.2);
                part(new THREE.OctahedronGeometry(0.032, 0), M.glow, knee, 0, 0.0, 0.15);
                const boot = new THREE.Group(); boot.position.y = -0.3; knee.add(boot);
                part(lathe([[0.055, -0.3], [0.07, -0.12], [0.09, 0.06], [0.08, 0.26]], 20), M.steel, boot);            // calf (under the greave)
                part(greaveGeo, M.pearl, boot);
                part(pillow(0.26, 0.045, 0.3, 0.018), M.trim, boot, 0, 0.285, -0.005);
                part(B(0.014, 0.2, 0.035), M.glow, boot, s * 0.126, 0.03, 0.08);
                part(B(0.014, 0.22, 0.035), M.accent, boot, s * 0.126, -0.02, -0.05, 0.45, 0, 0);
                part(pillow(0.1, 0.028, 0.015, 0.007), M.glow, boot, 0, -0.16, -0.12);
                const foot = new THREE.Group(); foot.position.y = -0.3; boot.add(foot);
                part(new THREE.SphereGeometry(0.058, 16, 10), M.steel, foot, 0, 0.02, 0);                            // ankle joint
                part(toeGeo, M.pearl, foot);
                part(pillow(0.26, 0.045, 0.48, 0.018), M.steel, foot, 0, -0.085, 0.06);
                part(pillow(0.2, 0.075, 0.13, 0.028), M.steel, foot, 0, -0.04, -0.12);
                g.userData.knee = knee; g.userData.foot = foot;
                return g;
            };
            P.legL = leg(-1); P.legR = leg(1);
            P.kneeL = P.legL.userData.knee; P.kneeR = P.legR.userData.knee;
            P.footL = P.legL.userData.foot; P.footR = P.legR.userData.foot;
            P.gait = 0; P.landT = 0;

            // --- limb calibration to human ratios (height ≈ 3.15): legs ≈ 47% of height,
            //     elbow at the waist line, wrist at the hip line, knee at ~28% of height ---
            const stretch = (grp, k) => grp.children.forEach(c => { if (!c.isMesh || (c.geometry.type === 'SphereGeometry' && c.position.y === 0)) return; c.scale.y *= k; c.position.y *= k; });   // joints keep their shape
            [P.armL, P.armR].forEach(a => { stretch(a, 1.25); a.userData.elbow.position.y = -0.5; });           // upper arm 0.40 → 0.50
            [P.legL, P.legR].forEach(l => {
                stretch(l, 1.27); l.userData.knee.position.y = -0.66;                                              // thigh 0.52 → 0.66
                const boot = l.userData.knee.children.find(c => c.isGroup);
                stretch(boot, 1.2); boot.position.y = -0.36; l.userData.foot.position.y = -0.36;                   // shin 0.60 → 0.72
            });
            P.torsoBase = 1.86; P.torso.position.y = P.torsoBase;

            // --- KAEL: broader shoulders and chest, thicker waist, neck and limbs (meshes only, joints untouched) ---
            if (MALE) {
                const widen = (grp, sx, sz, px = sx, pz = sz) => grp.children.forEach(m => {
                    if (!m.isMesh) return;
                    const flat = Math.abs(Math.abs(m.rotation.x) - Math.PI / 2) < 0.01;
                    m.scale.x *= sx; if (flat) m.scale.y *= sz; else m.scale.z *= sz;
                    m.position.x *= px; m.position.z *= pz;
                });
                P.chest.children.forEach(m => { if (m.isMesh && m.geometry.type !== 'LatheGeometry' && !m.userData.keep) { m.scale.x *= 1.25; m.scale.z *= 1.1; m.position.x *= 1.25; m.position.z *= 1.24; } });
                P.chest.children.forEach(g => { if (g.isGroup && Math.abs(g.position.x) > 0.3) { g.position.x *= 1.28; if (g !== P.armL && g !== P.armR) g.scale.multiplyScalar(1.25); } });
                P.torso.children.forEach(m => { if (m.isMesh && !m.userData.keepX && Math.abs(m.position.x) > 0.15) m.position.x *= 1.26; });   // tassets follow the hips
                [P.armL, P.armR].forEach(a => widen(a, 1.36, 1.34, 1.25, 1.2));
                widen(P.elbowL, 1.26, 1.24); widen(P.elbowR, 1.15, 1.15);
                [P.legL, P.legR].forEach(l => { l.position.x *= 1.25; widen(l, 1.3, 1.24); });
                widen(P.kneeL, 1.18, 1.14); widen(P.kneeR, 1.18, 1.14);
                [P.kneeL, P.kneeR].forEach(k => widen(k.children.find(c => c.isGroup), 1.15, 1.08));
                P.pack.position.z = -0.29; P.pack.scale.multiplyScalar(1.15);
                P.backSaber.position.z -= 0.08;
                [wrap, wrap2].forEach(w => { w.scale.x *= 1.2; w.scale.y *= 1.15; });   // thicker neck: a looser wrap
                P.headGroup.scale.setScalar(0.92);
            }
            // --- LYRA: narrower shoulders and waist, wider hips, a shaped breastplate (meshes only, joints untouched) ---
            if (FEMALE) {
                const hipsM = P._scHips[0]; hipsM.scale.x *= 1.15; hipsM.scale.z *= 1.08;
                P.torso.children.forEach(m => { if (m.isMesh && !m.userData.keepX && Math.abs(m.position.x) > 0.15) m.position.x *= 1.1; });   // tassets follow the hips
                [P.legL, P.legR].forEach(l => { l.position.x *= 1.08; });
                const ribM = P._scBody[0]; ribM.scale.x *= 0.88;
                P.chest.children.forEach(g => { if (g.isGroup && Math.abs(g.position.x) > 0.3) { g.position.x *= 0.93; if (g !== P.armL && g !== P.armR) g.scale.multiplyScalar(0.92); } });
                [P.armL, P.armR].forEach(a => a.children.forEach(m => { if (m.isMesh) { m.scale.x *= 0.9; m.scale.z *= 0.9; } }));
                [-1, 1].forEach(s => {                                                             // armoured chest contour under the breastplate
                    const b = part(new THREE.SphereGeometry(0.105, 22, 16), M.pearl, P.chest, s * 0.1, 0.0, 0.17, 0, s * 0.3, 0);
                    b.scale.set(1, 0.85, 0.55);
                });
                P.headGroup.scale.multiplyScalar(0.98);
            }
            P.lookDefault = { skin: MALE ? 0xdca37c : 0xf4bf98, hair: MALE ? 0x1c1411 : FEMALE ? 0x3b2416 : 0x4a2c1a };
            setupScarf(P);

    }

    // =====================================================================
    //  Energy scarf: the tails are real cloth now — two verlet ropes hanging from a knot at the back of the
    //  neck wrap. They lie over the top of the pack, fall down its back, drape over the stowed saber and
    //  stream behind him when he runs, dashes or falls. Collision against simple boxes taken from the
    //  actual armour (body, pack, hips) and a capsule around the saber keeps them on the body, never in the air.
    // =====================================================================
    const SC_SEG = 0.115, SC_G = 16;
    const _sA = new THREE.Vector3(), _sB = new THREE.Vector3(), _sL = new THREE.Vector3(), _sT = new THREE.Vector3(), _sS = new THREE.Vector3(),
        _sV = new THREE.Vector3(), _sW = new THREE.Vector3(), _sInv = new THREE.Matrix4();
    function setupScarf(P) {
        P.mesh.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(P.chest.matrixWorld).invert(), pad = 0.025;
        const box = (list, p = pad) => { const b = new THREE.Box3(); list.forEach(o => b.expandByObject(o)); b.applyMatrix4(inv); b.min.addScalar(-p); b.max.addScalar(p); return b; };
        const S = P._sc = { boxes: [box(P._scPack), box(P._scBody), box(P._scHips)], tails: [] };
        const pk = S.boxes[0], wb = box([P.scarfWrap], 0);
        const top = pk.max.y, back = pk.min.z, nz = wb.min.z + 0.03, ny = (wb.min.y + wb.max.y) / 2 - 0.015;
        // the knot the tails come out of, sitting on top of the pack
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), P.mats.accent);
        knot.position.set(0, ny - 0.012, wb.min.z + 0.022); knot.scale.set(1.55, 0.95, 0.8); knot.castShadow = true; P.chest.add(knot);
        P.scarf = [];
        [[-1, 10, 0.12, 0], [1, 8, 0.11, 1.9]].forEach(([s, n, w, ph]) => {
            const x = s * 0.066;
            const k = [new THREE.Vector3(x, ny, nz), new THREE.Vector3(x * 1.04, top, (nz + back) / 2), new THREE.Vector3(x * 1.08, top - 0.012, back + 0.004)];
            const N = k.length + n, geo = new THREE.BufferGeometry(), idx = [], uv = new Float32Array(N * 4);
            for (let i = 0; i < N; i++) { uv[i * 4] = 0; uv[i * 4 + 1] = uv[i * 4 + 3] = 1 - i / (N - 1); uv[i * 4 + 2] = 1; }
            for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3).setUsage(THREE.DynamicDrawUsage));
            geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
            geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
            const mesh = new THREE.Mesh(geo, P.mats.accent); mesh.castShadow = true; mesh.frustumCulled = false; P.chest.add(mesh);
            P.scarf.push([mesh]);                                                  // game.js keeps these out of the merged body
            const V = () => new THREE.Vector3();
            S.tails.push({ mesh, geo, k, w, ph, p: [...Array(N)].map(V), q: [...Array(N)].map(V), loc: [...Array(N)].map(V), last: V(), ready: false });
            writeTail(S.tails[S.tails.length - 1], true);
        });
    }
    // push a chest-local point out of a box through its nearest face (never through the front: that is the body)
    function outBox(v, b) {
        if (v.x <= b.min.x || v.x >= b.max.x || v.y <= b.min.y || v.y >= b.max.y || v.z <= b.min.z || v.z >= b.max.z) return false;
        let d = v.z - b.min.z, ax = 0;
        const up = b.max.y - v.y, dn = v.y - b.min.y, l = v.x - b.min.x, r = b.max.x - v.x;
        if (up < d) { d = up; ax = 1; } if (dn < d) { d = dn; ax = 2; } if (l < d) { d = l; ax = 3; } if (r < d) { ax = 4; }
        if (ax === 0) v.z = b.min.z; else if (ax === 1) v.y = b.max.y; else if (ax === 2) v.y = b.min.y; else if (ax === 3) v.x = b.min.x; else v.x = b.max.x;
        return true;
    }
    function collide(P, p, cw, saber, floor) {
        const v = _sL.copy(p).applyMatrix4(_sInv);
        let hit = false;
        for (let r = 0; r < 2; r++) for (const b of P._sc.boxes) hit = outBox(v, b) || hit;
        if (saber) {                                                              // the stowed saber: cloth drapes over it, on its outer side
            _sT.subVectors(_sB, _sA);
            const t = clamp(_sV.subVectors(v, _sA).dot(_sT) / _sT.lengthSq(), 0, 1);
            _sW.copy(_sA).addScaledVector(_sT, t); _sV.subVectors(v, _sW);
            const d = _sV.length(), R = 0.085;
            if (d < R) { if (_sV.z > 0) _sV.z = -_sV.z; if (d < 1e-4) _sV.set(0, 0, -1); v.copy(_sW).addScaledVector(_sV.normalize(), R); hit = true; }
        }
        if (hit) p.copy(v.applyMatrix4(cw));
        if (p.y < floor) p.y = floor;
    }
    // ribbon geometry (chest-local) from the simulated points; init = straight hang, no simulation yet
    function writeTail(T, init) {
        const N = T.p.length, K = T.k.length, L = T.loc, pos = T.geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
            if (i < K) L[i].copy(T.k[i]);
            else if (init) L[i].copy(L[i - 1]).y -= SC_SEG;
            else L[i].copy(T.p[i]).applyMatrix4(_sInv);
        }
        for (let i = 0; i < N; i++) {
            _sT.subVectors(L[Math.min(N - 1, i + 1)], L[Math.max(0, i - 1)]).normalize();
            _sS.set(1, 0, 0).addScaledVector(_sT, -_sT.x);
            if (_sS.lengthSq() < 1e-4) _sS.set(0, 0, 1); _sS.normalize();
            const u = i < K ? 0 : (i - K + 1) / (N - K), w = T.w * (i === N - 1 ? 0.22 : 1 - 0.38 * u) * 0.5;
            const o = i * 6, c = L[i];
            pos[o] = c.x - _sS.x * w; pos[o + 1] = c.y - _sS.y * w; pos[o + 2] = c.z - _sS.z * w;
            pos[o + 3] = c.x + _sS.x * w; pos[o + 4] = c.y + _sS.y * w; pos[o + 5] = c.z + _sS.z * w;
        }
        T.geo.attributes.position.needsUpdate = true; T.geo.computeVertexNormals();
    }
    function updateScarf(P, dt, time, speed) {
        const S = P._sc; if (!S) return;
        P.chest.updateWorldMatrix(true, false);
        const cw = P.chest.matrixWorld; _sInv.copy(cw).invert();
        let saber = false;
        if (P.backSaber && P.backSaber.visible && P.backBlade) {
            const bs = P.backSaber, bb = P.backBlade; bs.updateMatrix(); bb.updateMatrix();
            _sA.set(0, 0.5, 0).applyMatrix4(bs.matrix); _sB.set(0, -2.25, 0).applyMatrix4(bb.matrix).applyMatrix4(bs.matrix); saber = true;
        }
        const floor = P.mesh.position.y + 0.03, dt2 = dt * dt, keep = Math.pow(0.965, dt * 60);   // air drag: tails trail behind when he moves
        const side = _sW.setFromMatrixColumn(cw, 0).normalize().clone(), flap = 0.5 + Math.min(1, speed / 16) * 2.2 + (P.isDashing ? 1.5 : 0);
        for (const T of S.tails) {
            const N = T.p.length, K = T.k.length;
            for (let i = 0; i < K; i++) T.p[i].copy(T.k[i]).applyMatrix4(cw);
            if (!T.ready || T.p[0].distanceToSquared(T.last) > 2.25) {              // first frame or a teleport: hang straight down
                for (let i = K; i < N; i++) { T.p[i].copy(T.p[i - 1]); T.p[i].y -= SC_SEG; collide(P, T.p[i], cw, saber, floor); T.q[i].copy(T.p[i]); }
                T.ready = true;
            }
            T.last.copy(T.p[0]);
            for (let i = K; i < N; i++) {                                         // verlet step: inertia, gravity, a flutter that grows with speed
                const p = T.p[i], q = T.q[i], u = (i - K + 1) / (N - K);
                _sV.subVectors(p, q).multiplyScalar(keep); q.copy(p); p.add(_sV);
                p.y -= SC_G * dt2;
                const f = Math.sin(time * (6 + flap * 2.5) - i * 0.85 + T.ph) * flap * u;
                p.addScaledVector(side, f * 1.6 * dt2); p.y += Math.abs(f) * 0.8 * dt2;
            }
            for (let it = 0; it < 5; it++) {                                      // keep the segment lengths, stay out of the armour
                for (let i = K; i < N; i++) {
                    const a = T.p[i - 1], b = T.p[i]; _sT.subVectors(b, a);
                    const d = _sT.length() || 1e-6, k = (d - SC_SEG) / d;
                    if (i === K) b.addScaledVector(_sT, -k);
                    else { a.addScaledVector(_sT, k * 0.5); b.addScaledVector(_sT, -k * 0.5); }
                }
                for (let i = K; i < N; i++) collide(P, T.p[i], cw, saber, floor);
            }
            writeTail(T, false);
        }
    }


    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const damp = (a, b, k, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));

    // the animation (run cycle, jumps, saber cuts, springs) lives in hero-anim.js, which adds
    // AxonHero.animate / AxonHero.updateTrail; it borrows these helpers from here
    const _shared = { clamp, damp, rand, updateScarf };

    return { SKINS, SKIN_KEYS, TIERS, BUILDS, build, _shared, applySkin, applyLook, loadLook, saveLook, LOOK };
})();
