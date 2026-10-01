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
    const SURF = {
        floor: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#0c1a29'; g.fillRect(0, 0, S, S);
                for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
                    const v = 20 + ((i * 7 + j * 13) % 5) * 3;
                    g.fillStyle = `rgb(${v * 0.55},${v * 0.9},${v * 1.35})`; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
                }
                g.strokeStyle = '#1b3550'; g.lineWidth = 2;
                for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#1aa6d6'; g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S);
                g.fillStyle = '#7ff3ff';
                for (let i = 0; i < S; i += 128) for (let j = 0; j < S; j += 128) g.fillRect(i + 60, j + 60, 6, 6);
            })
        },
        wall: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#0a1522'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#122338'; g.fillRect(8, 8, S - 16, 100); g.fillRect(8, 148, 116, 100); g.fillRect(132, 148, 116, 100);
                g.fillStyle = '#0d1a2b'; for (let y = 20; y < 100; y += 10) g.fillRect(24, y, 90, 4);
                g.strokeStyle = '#223d5c'; g.lineWidth = 2; g.strokeRect(8, 8, S - 16, 100); g.strokeRect(8, 148, 116, 100); g.strokeRect(132, 148, 116, 100);
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#29b8ff'; g.fillRect(8, 124, S - 16, 5);
                g.fillStyle = '#ff2a6d'; g.fillRect(200, 30, 30, 6);
                g.fillStyle = '#7ff3ff'; g.fillRect(150, 30, 30, 6);
            })
        },
        door: {
            map: makeCanvas((g, S) => {
                g.fillStyle = '#16121e'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#231a2c';
                for (let i = -S; i < S * 2; i += 48) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 24, 0); g.lineTo(i + 24 - S, S); g.lineTo(i - S, S); g.fill(); }
            }),
            emi: makeCanvas((g, S) => {
                g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
                g.fillStyle = '#ff2a6d'; g.fillRect(0, 0, S, 6); g.fillRect(0, S - 6, S, 6);
            })
        }
    };


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
