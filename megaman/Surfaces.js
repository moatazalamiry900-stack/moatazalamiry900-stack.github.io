// =====================================================================
//  AXON BREACH — painted surface textures (floor, wall, door: colour + glow maps) on 256 px canvases,
//  and the scene lighting (environment reflections, fill lights, sun).
//  Loaded before game.js, which builds its CanvasTextures from AxonSurf.SURF.
// =====================================================================
'use strict';

window.AxonSurf = (function () {
    function makeCanvas(draw) {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        draw(c.getContext('2d'), 256); return c;
    }
    // ---- helpers for the HQ's surfaces (512 px, painted once at start-up) ----
    const big = draw => { const c = document.createElement('canvas'); c.width = c.height = 512; draw(c.getContext('2d'), 512); return c; };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // fine grain + a few long scratches: what makes a flat colour read as a material
    const grain = (g, S, amt, scratches) => {
        const d = g.getImageData(0, 0, S, S), p = d.data;
        for (let k = 0; k < p.length; k += 4) { const n = (rnd() - 0.5) * amt; p[k] += n; p[k + 1] += n; p[k + 2] += n; }
        g.putImageData(d, 0, 0);
        g.lineWidth = 1;
        for (let k = 0; k < scratches; k++) { const x = rnd() * S, y = rnd() * S, l = 20 + rnd() * 90, a = rnd() * 6.3; g.strokeStyle = `rgba(190,225,255,${0.03 + rnd() * 0.05})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    };
    // a panel: body gradient, a light top-left bevel, a dark bottom-right one, a thin dark gap all round
    const panel = (g, x, y, w, h, c0, c1, r = 0) => {
        g.fillStyle = '#03070d'; g.fillRect(x, y, w, h);
        const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
        g.fillStyle = gr; g.fillRect(x + 2, y + 2, w - 4, h - 4);
        g.fillStyle = 'rgba(150,210,255,.16)'; g.fillRect(x + 2, y + 2, w - 4, 2); g.fillRect(x + 2, y + 2, 2, h - 4);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 2, y + h - 4, w - 4, 2); g.fillRect(x + w - 4, y + 2, 2, h - 4);
        if (r) { g.fillStyle = '#060c14'; for (const [bx, by] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]]) { g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill(); g.fillStyle = 'rgba(150,210,255,.22)'; g.beginPath(); g.arc(bx - 0.7, by - 0.7, r * 0.45, 0, 7); g.fill(); g.fillStyle = '#060c14'; } }
    };
    const label = (g, t, x, y, size = 13, a = 0.2) => { g.fillStyle = `rgba(160,215,255,${a})`; g.font = `700 ${size}px monospace`; g.textBaseline = 'top'; g.fillText(t, x, y); };
    // ---- the COMMAND HQ: a clean, cold, well-kept base — deep blue composite panels with bevels and fasteners,
    //      inlaid light channels, vents, hatches, stencilled sector marks and small status lights ----
    const SURF = {
        floor: {
            map: big((g, S) => {
                g.fillStyle = '#04090f'; g.fillRect(0, 0, S, S);
                // one large plate cut in four: two plain, one with an inner hatch, one with anti-slip ribs
                panel(g, 0, 0, 256, 256, '#16304a', '#0f2236', 3.2); panel(g, 256, 256, 256, 256, '#15304a', '#0e2034', 3.2);
                panel(g, 256, 0, 256, 256, '#122a42', '#0c1c2e', 3.2); panel(g, 0, 256, 256, 256, '#132c44', '#0d1e31', 3.2);
                panel(g, 296, 40, 176, 176, '#1b3854', '#13283e'); label(g, 'HQ-07', 312, 54, 15, 0.26);                 // hatch
                g.strokeStyle = 'rgba(120,200,255,.18)'; g.lineWidth = 2; g.strokeRect(330, 96, 108, 88);
                g.fillStyle = '#0a1826'; for (let y = 300; y < 480; y += 14) g.fillRect(40, y, 176, 6);                      // ribs
                g.fillStyle = 'rgba(150,210,255,.10)'; for (let y = 300; y < 480; y += 14) g.fillRect(40, y, 176, 1);
                g.fillStyle = '#c9a23a'; g.globalAlpha = 0.5; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(20 + k * 16, 232); g.lineTo(28 + k * 16, 232); g.lineTo(20 + k * 16, 244); g.lineTo(12 + k * 16, 244); g.fill(); } g.globalAlpha = 1;   // a short hazard tab
                label(g, 'A', 468, 470, 22, 0.16); label(g, '▲', 22, 20, 14, 0.2);
                grain(g, S, 9, 26);
            }),
            emi: big((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#0f6f9a'; g.fillRect(0, 254, S, 4); g.fillRect(254, 0, 4, S);                                  // light channels in the joints
                g.fillStyle = '#6fe6ff'; g.fillRect(0, 255, S, 2); g.fillRect(255, 0, 2, S);
                g.fillStyle = '#bff6ff'; g.fillRect(248, 248, 16, 16);
                g.fillStyle = '#39d7ff'; for (const p of [64, 192, 320, 448]) { g.fillRect(p - 5, 253, 10, 6); g.fillRect(253, p - 5, 6, 10); }
                g.fillStyle = '#1c86b4'; g.fillRect(330, 96, 108, 2); g.fillRect(330, 182, 108, 2);                          // hatch outline
                g.fillStyle = '#ffb040'; g.fillRect(452, 60, 8, 8);
            })
        },
        wall: {
            map: big((g, S) => {
                g.fillStyle = '#03070c'; g.fillRect(0, 0, S, S);
                panel(g, 0, 0, 512, 232, '#17324c', '#0e2135', 3);                                                           // upper skin
                panel(g, 28, 30, 250, 150, '#0b1826', '#08121d');                                                            // a recessed vent bay
                for (let y = 44; y < 170; y += 13) { g.fillStyle = '#050b12'; g.fillRect(42, y, 222, 7); g.fillStyle = 'rgba(150,210,255,.10)'; g.fillRect(42, y + 7, 222, 1); }
                panel(g, 306, 30, 178, 96, '#1c3a57', '#132a40', 2.4); label(g, 'AXON', 322, 44, 22, 0.24); label(g, 'SECTOR 07 // HQ', 322, 74, 11, 0.2);
                panel(g, 306, 136, 84, 44, '#122840', '#0c1c2e'); panel(g, 400, 136, 84, 44, '#122840', '#0c1c2e');
                g.fillStyle = '#060d15'; g.fillRect(0, 232, S, 28);                                                           // the light rail's housing
                panel(g, 0, 260, 256, 252, '#142d46', '#0c1d30', 3); panel(g, 256, 260, 256, 252, '#132b43', '#0b1b2d', 3);  // lower skin
                panel(g, 40, 300, 176, 130, '#193652', '#11263b', 2.4);                                                      // access hatch with a handle
                g.fillStyle = '#060d15'; g.fillRect(104, 356, 48, 10); g.fillStyle = 'rgba(150,210,255,.25)'; g.fillRect(104, 356, 48, 2);
                g.strokeStyle = '#0a1622'; g.lineWidth = 6; g.beginPath(); g.moveTo(300, 290); g.lineTo(300, 440); g.lineTo(470, 440); g.stroke();   // a conduit
                g.strokeStyle = 'rgba(150,210,255,.14)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(298, 290); g.lineTo(298, 442); g.lineTo(470, 442); g.stroke();
                g.fillStyle = '#c9a23a'; g.globalAlpha = 0.42; for (let x = 0; x < S; x += 28) { g.beginPath(); g.moveTo(x, 512); g.lineTo(x + 14, 512); g.lineTo(x + 26, 494); g.lineTo(x + 12, 494); g.fill(); } g.globalAlpha = 1;   // kick strip
                label(g, '07', 420, 300, 40, 0.13);
                grain(g, S, 8, 18);
            }),
            emi: big((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                const gr = g.createLinearGradient(0, 238, 0, 254); gr.addColorStop(0, '#0d5f86'); gr.addColorStop(0.5, '#8fefff'); gr.addColorStop(1, '#0d5f86');
                g.fillStyle = gr; g.fillRect(16, 238, S - 32, 16);                                                            // the light rail
                g.fillStyle = '#ff2a6d'; g.fillRect(412, 152, 22, 5); g.fillStyle = '#7ff3ff'; g.fillRect(442, 152, 22, 5); g.fillStyle = '#5cf0a0'; g.fillRect(320, 152, 10, 5); g.fillStyle = '#ffb040'; g.fillRect(336, 152, 10, 5);
                g.fillStyle = '#145a7c'; for (let y = 44; y < 170; y += 26) g.fillRect(42, y + 2, 222, 2);                     // a glow inside the vents
                g.fillStyle = '#39d7ff'; g.fillRect(226, 312, 4, 26);
            })
        },
        door: {
            map: big((g, S) => {
                g.fillStyle = '#120d1c'; g.fillRect(0, 0, S, S);
                for (let i = -S; i < S * 2; i += 96) { const gr = g.createLinearGradient(i, 0, i + 48, 0); gr.addColorStop(0, '#3a2148'); gr.addColorStop(1, '#22142e'); g.fillStyle = gr; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 48, 0); g.lineTo(i + 48 - S, S); g.lineTo(i - S, S); g.fill(); }
                panel(g, 0, 0, S, 26, '#2a1838', '#1a0f26'); panel(g, 0, S - 26, S, 26, '#2a1838', '#1a0f26');
                grain(g, S, 8, 10);
            }),
            emi: big((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#ff2a6d'; g.fillRect(0, 8, S, 8); g.fillRect(0, S - 16, S, 8);
                g.fillStyle = '#ff8fb0'; g.fillRect(0, 11, S, 2); g.fillRect(0, S - 13, S, 2);
            })
        }
    };
    // ---- the FACILITY of mission 01 has its own surfaces, nothing like the HQ's navy panels and cyan grid:
    //      warm where the HQ is cold, light where it is dark — sand-coloured tread-plate floors, rust-red ribbed walls
    //      with rivets and a hazard band, yellow striped gate frames, orange seams.
    Object.assign(SURF, {
        mfloor: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, S, S);
                for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {                       // four bevelled plates
                    const x = i * 128, y = j * 128, v = ((i + j) % 2) * 14;
                    g.fillStyle = `rgb(${150 + v},${122 + v},${86 + v})`; g.fillRect(x + 3, y + 3, 122, 122);
                    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x + 3, y + 3, 122, 3); g.fillRect(x + 3, y + 3, 3, 122);
                    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 3, y + 122, 122, 3); g.fillRect(x + 122, y + 3, 3, 122);
                    g.strokeStyle = 'rgba(60,36,16,.4)'; g.lineWidth = 3; g.lineCap = 'round';       // tread: short diagonal bars, alternating
                    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) { const cx = x + 20 + a * 22, cy = y + 20 + b * 22, d = (a + b) % 2 ? 5 : -5; g.beginPath(); g.moveTo(cx - 5, cy - d); g.lineTo(cx + 5, cy + d); g.stroke(); }
                    g.fillStyle = '#4a3420'; for (const [bx, by] of [[10, 10], [114, 10], [10, 114], [114, 114]]) { g.beginPath(); g.arc(x + bx, y + by, 3, 0, 7); g.fill(); }   // bolts
                }
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#b8501a'; g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S);
                g.fillStyle = '#ffd08a'; g.fillRect(123, 123, 10, 10);
            })
        },
        mwall: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#3c1810'; g.fillRect(0, 0, S, S);
                for (let x = 0; x < S; x += 32) {                                               // vertical ribs
                    g.fillStyle = '#8a3a26'; g.fillRect(x + 4, 0, 20, S);
                    g.fillStyle = 'rgba(255,200,160,.16)'; g.fillRect(x + 4, 0, 2, S); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 22, 0, 2, S);
                }
                g.fillStyle = '#5a2418'; g.fillRect(0, 104, S, 30);                             // a belt with rivets
                g.fillStyle = '#c08a5a'; for (let x = 8; x < S; x += 16) { g.beginPath(); g.arc(x, 119, 3, 0, 7); g.fill(); }
                g.save(); g.beginPath(); g.rect(0, 226, S, 30); g.clip();                        // hazard band along the bottom
                g.fillStyle = '#1c160a'; g.fillRect(0, 226, S, 30); g.fillStyle = '#d6a81e';
                for (let x = -40; x < S + 40; x += 32) { g.beginPath(); g.moveTo(x, 256); g.lineTo(x + 16, 256); g.lineTo(x + 46, 226); g.lineTo(x + 30, 226); g.fill(); }
                g.restore();
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#ffb060'; g.fillRect(44, 40, 4, 44); g.fillRect(204, 150, 4, 44);
                g.fillStyle = '#8a3a10'; g.fillRect(0, 103, S, 2);
            })
        },
        mdoor: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#1c180a'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#e0b020';
                for (let i = -S; i < S * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - S, S); g.lineTo(i - S, S); g.fill(); }
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#ffa826'; g.fillRect(0, 0, S, 5); g.fillRect(0, S - 5, S, 5);
            })
        }
    });

    // scene lighting: a tiny emissive room baked into an environment map (metal reflections), sky/ground fill,
    // ambient and the shadow-casting sun. Returns the lights game.js keeps adjusting.
    function lights(scene, renderer) {
        (function buildEnvironment() {
            const pm = new THREE.PMREMGenerator(renderer);
            const s = new THREE.Scene();
            s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x0a1828, side: THREE.BackSide })));
            const panel = (c, k, x, y, z, w, h) => {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
                m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
            };
            panel(0xffffff, 2.2, 0, 12, 0, 14, 6);
            panel(0x39d7ff, 2.5, -13, 3, 0, 3, 18);
            panel(0x39d7ff, 1.6, 13, 3, 4, 2, 14);
            panel(0xff2a6d, 1.8, 0, 2, -13, 10, 2);
            panel(0xffa826, 1.2, 0, -4, 13, 12, 1.5);
            scene.environment = pm.fromScene(s, 0.04).texture;
            pm.dispose();
        })();

        const hemi = new THREE.HemisphereLight(0x5fa8ff, 0x0a0710, 0.7); scene.add(hemi);
        scene.add(new THREE.AmbientLight(0x1a2d4a, 0.6));
        const dirLight = new THREE.DirectionalLight(0xbfe6ff, 1.2);
        dirLight.position.set(20, 40, 15); dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        Object.assign(dirLight.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 });
        dirLight.shadow.bias = -0.0008;
        scene.add(dirLight); scene.add(dirLight.target);
        return { hemi, dirLight };
    }


    // rising "data motes" over the whole facility: positions never change on the CPU — the vertex shader moves
    // them up and wraps them around (one uniform per frame instead of rewriting and re-uploading ~900 points)
    function motes(scene, layout, count, map) {
        const pos = new Float32Array(count * 3), len = layout.startZ - layout.endZ + 40, top = layout.top + 29;
        for (let i = 0; i < count * 3; i += 3) { pos[i] = (Math.random() - 0.5) * 100; pos[i + 1] = Math.random() * (top + 5) - 5; pos[i + 2] = 20 - Math.random() * len; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x7fe9ff, size: 0.45, map, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
        const U = { uT: { value: 0 }, uTop: { value: top } };
        mat.onBeforeCompile = sh => {
            Object.assign(sh.uniforms, U);
            sh.vertexShader = 'uniform float uT;\nuniform float uTop;\n' + sh.vertexShader.replace('#include <begin_vertex>',
                'vec3 transformed = vec3( position );\ntransformed.y = mod( position.y + 5.0 + uT * 3.0, uTop + 5.0 ) - 5.0;');
        };
        const pts = new THREE.Points(g, mat); pts.matrixAutoUpdate = false; scene.add(pts);
        return { points: pts, tick(t) { U.uT.value = t; } };
    }

    return { makeCanvas, SURF, lights, motes };
})();
