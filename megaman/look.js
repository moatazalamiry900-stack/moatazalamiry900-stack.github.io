// =====================================================================
//  AXON BREACH — the look of the facility (mission 01): a base dug into a giant GEODE.
//  Every sector is a different gemstone — aquamarine, tourmaline, citrine, amethyst, emerald, ruby,
//  peridot, diamond, and the guardian's blood-red core. surfaces.js paints the cut crystal in greys;
//  here each block takes the colour of its sector, a baked shade, light that flows through the
//  crystal towards the guardian, and clusters of real crystals grow along the walls.
//  Used by perf.js (WorldBatcher) while level.js builds the world, and by level.js once (dress).
// =====================================================================
'use strict';

window.AxonLook = (function () {
    // the same pairs as level.js: [the sector's gem, its second colour]
    const THEME = [[0x39d7ff, 0xffa826], [0xff2a9d, 0x39d7ff], [0xffa826, 0xff2a6d], [0x8f6bff, 0x5cf0a0], [0x2fd6c3, 0xff7a2a], [0xff3a4a, 0xffe066], [0x9dff3a, 0x8f6bff], [0xcfe8ff, 0xff2a9d], [0xff2a6d, 0xffc24a]];
    let seed = 91; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const mats = new Map(), c = new THREE.Color(), white = new THREE.Color(0xffffff);
    const pair = th => THEME[((th % THEME.length) + THEME.length) % THEME.length];
    // light travels through the crystal along the level, towards the guardian (one shared clock)
    const clock = { value: 0 };
    (function run(t) { clock.value = (t || 0) / 1000; requestAnimationFrame(run); })();
    const flow = (m, depth) => {
        m.onBeforeCompile = sh => {
            sh.uniforms.uLookT = clock;
            sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLookP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLookP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLookP;\nuniform float uLookT;')
                .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                { float w = 0.5 + 0.5 * sin(vLookP.z * 0.42 + vLookP.x * 0.17 + vLookP.y * 0.31 + uLookT * 1.9);
                  float tw = 0.5 + 0.5 * sin(vLookP.z * 2.3 - vLookP.x * 3.1 + uLookT * 0.9);
                  totalEmissiveRadiance *= ${(1 - depth).toFixed(2)} + ${(depth * 1.7).toFixed(2)} * w * w * w + ${(depth * 0.35).toFixed(2)} * tw; }`);
        };
        return m;
    };
    return {
        cur: -1, THEME,                                                               // -1 = not building the facility (the HQ and the compound are left alone)
        // baked shade in vertex colours (multiplies the painted texture)
        shade(g, kind, h) {
            const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3);
            const tone = 0.84 + rnd() * 0.32, warm = (rnd() - 0.5) * 0.08;
            for (let i = 0; i < P.count; i++) {
                let k = tone;
                if (kind === 'floor') k *= N.getY(i) > 0.5 ? 1 : 0.62;                            // the sides of a slab sit in shadow
                else if (h > 5) k *= 1.1 - 0.7 * (P.getY(i) / h + 0.5);                            // tall walls: bright at the floor, lost in the dark above
                col[i * 3] = k * (1 + warm); col[i * 3 + 1] = k; col[i * 3 + 2] = k * (1 - warm);
            }
            g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        },
        // the material of a block kind in a sector: the same cut, another gemstone
        mat(base, kind, th) {
            const key = kind + th; if (mats.has(key)) return mats.get(key);
            const m = base.clone(), [a, b] = pair(th);
            m.vertexColors = true;
            if (kind === 'floor') { m.color.copy(white).lerp(c.setHex(a), 0.42); m.emissive.setHex(a); m.emissiveIntensity = 1.25; m.roughness = 0.36; m.metalness = 0.55; flow(m, 0.62); }
            else if (kind === 'wall') { m.color.copy(white).lerp(c.setHex(a), 0.8); m.emissive.setHex(a); m.emissiveIntensity = 0.85; m.roughness = 0.28; m.metalness = 0.35; flow(m, 0.7); }
            else { m.emissive.setHex(b); m.emissiveIntensity = 1.6; m.roughness = 0.3; m.metalness = 0.9; flow(m, 0.4); }
            mats.set(key, m); return m;
        },
        edge(kind, th) { return kind === 'door' ? 0x3a260c : kind === 'floor' ? 0x07080b : 0x050608; },
        // crystals grow out of the foot of the walls, all along the level (level.js, once the world stands)
        dress(api, layout) {
            if (this.done) return; this.done = true;
            const S = api.solids, MG = window.AxonPerf.mergeGeometries, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3();
            const shard = (r, h) => { const b = new THREE.CylinderGeometry(r * 0.78, r, h * 0.72, 6, 1, true).toNonIndexed(); b.translate(0, h * 0.36, 0); const t = new THREE.ConeGeometry(r * 0.78, h * 0.28, 6, 1, true).toNonIndexed(); t.translate(0, h * 0.86, 0); return MG([{ geo: b, matrix: new THREE.Matrix4() }, { geo: t, matrix: new THREE.Matrix4() }]); };
            const unit = shard(1, 1);
            const ground = (x, z, y0) => {                                                         // a floor under this point, with head room
                let best = null;
                for (const b of S) { if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; const t = b.max.y; if (t < y0 - 1 || t > y0 + 18 || t - b.min.y > 12) continue; if (best === null || t < best) best = t; }
                if (best === null) return null;
                for (const b of S) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.min.y < best + 2.2 && b.max.y > best + 0.2) return null;
                return best;
            };
            for (const z of layout.zones) {
                if (z.kind === 'gauntlet') continue;
                const parts = [], half = z.x1, st = Math.max(0, (z.stage || 1) - 1);
                for (const sx of [-1, 1]) for (let zz = z.z0 - 2 - rnd() * 5; zz > z.z1 + 2; zz -= 6 + rnd() * 9) {
                    const x = sx * (half - 0.5), y = ground(x, zz, z.y); if (y === null) continue;
                    const big = rnd() < 0.22 ? 1.9 : 1, n = 3 + (rnd() * 4 | 0);
                    for (let k = 0; k < n; k++) {
                        const r = (0.16 + rnd() * 0.26) * big, h = (0.7 + rnd() * 1.9) * big * (k ? 0.75 : 1.25);
                        e.set((rnd() - 0.5) * 0.7, rnd() * 6.3, -sx * (0.12 + rnd() * 0.5)); q.setFromEuler(e);
                        parts.push({ geo: unit, matrix: m4.clone().compose(v.set(x - sx * rnd() * 0.5 * big, y - 0.05, zz + (rnd() - 0.5) * 1.6 * big), q, one.set(r, h, r)) });
                    }
                }
                if (!parts.length) continue;
                const [a] = pair(st), g = MG(parts); g.computeVertexNormals();
                const m = flow(new THREE.MeshStandardMaterial({ color: a, emissive: a, emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.2, flatShading: true, envMapIntensity: 1.4 }), 0.55);
                const mesh = new THREE.Mesh(g, m); mesh.matrixAutoUpdate = false; mesh.castShadow = false; api.scene.add(mesh);
            }
        }
    };
})();
