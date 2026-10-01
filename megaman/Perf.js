// =====================================================================
//  AXON BREACH — performance toolkit
//   • World batching: every facility block / glow strip is merged into a handful of
//     big meshes (one per material) instead of hundreds of separate draw calls.
//   • mergeStatic: collapses rigid parts of the hero and enemies (per joint + material).
//   • SparkPool: all sparks in ONE InstancedMesh (no per-spark mesh/material allocation).
//   • segBlocked: line-of-sight / bullet-vs-wall tests against the collision boxes (no raycasts).
//   • FpsMeter: optional on-screen FPS / frame time / draw calls (Settings → FPS).
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonPerf = (function () {

    // ---------- tiny geometry merge (position / normal / uv, indexed) ----------
    function mergeGeometries(list) {           // list of { geo, matrix }
        let vCount = 0, iCount = 0;
        const hasUV = list.every(x => x.geo.attributes.uv);
        const hasNormal = list.every(x => x.geo.attributes.normal);
        for (const { geo } of list) { vCount += geo.attributes.position.count; iCount += geo.index ? geo.index.count : geo.attributes.position.count; }
        const pos = new Float32Array(vCount * 3), nor = hasNormal ? new Float32Array(vCount * 3) : null, uv = hasUV ? new Float32Array(vCount * 2) : null;
        const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
        const v = new THREE.Vector3(), nm = new THREE.Matrix3();
        let vo = 0, io = 0;
        for (const { geo, matrix } of list) {
            const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
            nm.getNormalMatrix(matrix);
            for (let i = 0; i < P.count; i++) {
                v.fromBufferAttribute(P, i).applyMatrix4(matrix); pos.set([v.x, v.y, v.z], (vo + i) * 3);
                if (nor) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
                if (uv) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
            }
            const flip = matrix.determinant() < 0, I = geo.index ? geo.index.array : null, n = I ? I.length : P.count;   // mirrored part: swap winding
            for (let k = 0; k < n; k += 3) { const a = I ? I[k] : k, b = I ? I[k + 1] : k + 1, c = I ? I[k + 2] : k + 2; idx[io++] = a + vo; idx[io++] = (flip ? c : b) + vo; idx[io++] = (flip ? b : c) + vo; }
            vo += P.count;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        if (nor) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        g.computeBoundingSphere(); g.computeBoundingBox();
        return g;
    }

    // ---------- world batching ----------
    // Blocks / edge lines / glow strips are merged per material AND per section of the level along z (CHUNK m),
    // so the camera's frustum (and the sun's shadow camera) skip every section that is out of view — one giant
    // mesh would be sent through the vertex shader and the shadow pass whole, every frame.
    function WorldBatcher(scene, CHUNK = 72) {
        const boxes = new Map(), strips = new Map(), edges = new Map();
        const m4 = new THREE.Matrix4(), ck = z => Math.floor(z / CHUNK);
        const bucket = (map, key) => { let a = map.get(key); if (!a) map.set(key, a = []); return a; };
        this.done = false;
        this.addBlock = (kind, x, y, z, w, h, d, rx, ry, edgeColor) => {
            const g = new THREE.BoxGeometry(w, h, d);
            const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);   // bake the texture repeat
            bucket(boxes, kind + '|' + ck(z)).push({ geo: g, matrix: m4.clone().makeTranslation(x, y, z) });
            const e = new THREE.EdgesGeometry(g).attributes.position.array, arr = bucket(edges, edgeColor + '|' + ck(z));
            for (let i = 0; i < e.length; i += 3) arr.push(e[i] + x, e[i + 1] + y, e[i + 2] + z);
        };
        this.addStrip = (color, x, y, z, w, h, d) => {
            bucket(strips, color + '|' + ck(z)).push({ geo: new THREE.BoxGeometry(w, h, d), matrix: m4.clone().makeTranslation(x, y, z) });
        };
        const still = o => { o.matrixAutoUpdate = false; o.updateMatrix(); return o; };   // never moves: no per-frame matrix work
        this.finish = (materials) => {
            const out = [];
            for (const [key, list] of boxes) {
                const kind = key.split('|')[0], mesh = new THREE.Mesh(mergeGeometries(list), materials[kind]);
                mesh.receiveShadow = true; mesh.castShadow = kind !== 'floor';
                scene.add(still(mesh)); out.push(mesh);
            }
            const lineMats = new Map(), glowMats = new Map();
            for (const [key, arr] of edges) {
                const color = +key.split('|')[0], g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeBoundingSphere();
                if (!lineMats.has(color)) lineMats.set(color, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
                scene.add(still(new THREE.LineSegments(g, lineMats.get(color))));
            }
            for (const [key, arr] of strips) {
                const color = +key.split('|')[0];
                if (!glowMats.has(color)) glowMats.set(color, new THREE.MeshBasicMaterial({ color }));
                scene.add(still(new THREE.Mesh(mergeGeometries(arr), glowMats.get(color))));
            }
            this.done = true;
            return out;
        };
    }

    // ---------- hidden subtrees cost nothing ----------
    // three.js recomputes the world matrix of EVERY object each frame, drawn or not. Objects flagged
    // userData.lazy skip that while they are hidden (the HQ during a mission, the facility in the HQ, enemies
    // beyond view range); the frame they show again they are brought up to date as usual.
    (function lazyHidden() {
        const P = THREE.Object3D.prototype, orig = P.updateMatrixWorld;
        P.updateMatrixWorld = function (force) { if (!this.visible && this.userData.lazy) return; return orig.call(this, force); };
    })();

    // ---------- merge rigid parts: per parent node, per material ----------
    // skip(mesh) → true keeps that mesh separate (animated / toggled / special parts)
    function mergeStatic(root, skip = () => false) {
        let before = 0, after = 0;
        const nodes = []; root.traverse(o => { if (!o.isMesh) nodes.push(o); });
        for (const node of nodes) {
            const groups = new Map();
            for (const c of node.children) {
                if (!c.isMesh || c.isInstancedMesh || c.children.length || skip(c) || !c.visible) continue;
                const g = c.geometry; if (!g || !g.attributes.position || g.morphAttributes && Object.keys(g.morphAttributes).length) continue;
                const k = c.material.uuid + (g.attributes.uv ? 'u' : '') + (g.attributes.normal ? 'n' : '');
                if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c);
            }
            for (const list of groups.values()) {
                before += list.length;
                if (list.length < 2) { after += 1; continue; }
                const parts = list.map(c => { c.updateMatrix(); return { geo: c.geometry, matrix: c.matrix.clone() }; });
                const merged = new THREE.Mesh(mergeGeometries(parts), list[0].material);
                merged.castShadow = list.some(c => c.castShadow); merged.receiveShadow = list.some(c => c.receiveShadow);
                merged.renderOrder = list[0].renderOrder;
                list.forEach(c => node.remove(c));
                node.add(merged); after += 1;
            }
        }
        return { before, after };
    }

    // ---------- sparks: one InstancedMesh for all ----------
    function SparkPool(scene, max = 320) {
        const geo = new THREE.BoxGeometry(0.07, 0.07, 0.55);
        const mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: false });
        const mesh = new THREE.InstancedMesh(geo, mat, max);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0;
        mesh.setColorAt(0, new THREE.Color()); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        // fixed particle table, swap-remove on death: zero garbage no matter how many sparks fly
        const P = [], obj = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Vector3();
        for (let i = 0; i < max; i++) P.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color() });
        let live = 0, lastN = 0, oldest = 0;
        this.spawn = (pos, color, n, speed) => {
            col.setHex(color);
            for (let i = 0; i < n; i++) {
                const s = live < max ? P[live++] : P[oldest = (oldest + 1) % max];   // full: recycle one
                s.v.set(Math.random() * 2 - 1, Math.random() * 1.2 - 0.2, Math.random() * 2 - 1).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
                s.life = s.max = 0.25 + Math.random() * 0.25; s.p.copy(pos); s.c.copy(col);
            }
        };
        this.update = dt => {
            for (let i = live - 1; i >= 0; i--) {
                const s = P[i]; s.life -= dt;
                if (s.life <= 0) { live--; P[i] = P[live]; P[live] = s; }
            }
            for (let n = 0; n < live; n++) {
                const s = P[n];
                s.v.y -= 30 * dt; s.p.addScaledVector(s.v, dt);
                const k = s.life / s.max;
                obj.position.copy(s.p); obj.lookAt(tmp.copy(s.p).add(s.v)); obj.scale.set(k, k, 0.4 + k * 0.6); obj.updateMatrix();
                mesh.setMatrixAt(n, obj.matrix); mesh.setColorAt(n, col.copy(s.c).multiplyScalar(0.4 + k * 0.6));
            }
            mesh.count = live;
            if (live || lastN) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; }   // idle: no GPU upload at all
            lastN = live;
        };
    }


    // ---------- broadphase: the collision boxes bucketed in a 2-D grid (x/z) ----------
    // Every body move, bullet and line-of-sight test used to scan ALL the level's boxes (hundreds) — the most
    // common CPU cost of action games on phones. Now only the few boxes in the cells the motion touches are tested.
    // The grid rebuilds itself whenever the array changes (gates added/removed, HQ ↔ mission swaps).
    const CELL = 12, _idx = new WeakMap();
    let _stamp = 1;
    function gridOf(solids) {
        let G = _idx.get(solids);
        const n = solids.length;
        if (G && G.n === n && G.a === solids[0] && G.m === solids[n >> 1] && G.z === solids[n - 1]) return G;
        G = { n, a: solids[0], m: solids[n >> 1], z: solids[n - 1], cells: new Map(), big: [] };
        for (const b of solids) {
            const x0 = Math.floor(b.min.x / CELL), x1 = Math.floor(b.max.x / CELL), z0 = Math.floor(b.min.z / CELL), z1 = Math.floor(b.max.z / CELL);
            if ((x1 - x0 + 1) * (z1 - z0 + 1) > 400) { G.big.push(b); continue; }       // huge slabs: always tested
            for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x * 100003 + z; let c = G.cells.get(k); if (!c) G.cells.set(k, c = []); c.push(b); }
        }
        _idx.set(solids, G);
        return G;
    }
    const _near = [];
    // boxes that may touch the rectangle [x0,x1] × [z0,z1] (a reused array — consume before the next call)
    function near(solids, x0, x1, z0, z1) {
        _near.length = 0;
        if (!solids.length) return _near;
        const G = gridOf(solids), st = ++_stamp;
        const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cz0 = Math.floor(z0 / CELL), cz1 = Math.floor(z1 / CELL);
        if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 300) { for (const b of solids) _near.push(b); return _near; }   // very long ray: plain scan
        for (const b of G.big) { b._q = st; _near.push(b); }
        for (let x = cx0; x <= cx1; x++) for (let z = cz0; z <= cz1; z++) {
            const c = G.cells.get(x * 100003 + z); if (!c) continue;
            for (const b of c) if (b._q !== st) { b._q = st; _near.push(b); }
        }
        return _near;
    }
    // character / enemy physics against the boxes (moved here from game.js; same rules, broadphase in front)
    function physics(solids) {
        const EPS = 1e-3;
        const overlapXZ = (s, x, z, r) => x + r > s.min.x && x - r < s.max.x && z + r > s.min.z && z - r < s.max.z;
        function moveBody(pos, vel, dt, r, bottomOff, height, stepUp, vertical) {
            const res = { grounded: false, ceiling: false, blocked: false };
            const feet = pos.y + bottomOff, lo = feet + stepUp, hi = feet + height;
            const mx = Math.abs(vel.x * dt) + r + 0.1, mz = Math.abs(vel.z * dt) + r + 0.1;
            const list = near(solids, pos.x - mx, pos.x + mx, pos.z - mz, pos.z + mz);   // (shared scratch array: nothing below calls near() again)
            if (vel.x !== 0) {
                let nx = pos.x + vel.x * dt;
                for (const s of list) {
                    if (s.max.y <= lo || s.min.y >= hi || pos.z + r <= s.min.z || pos.z - r >= s.max.z) continue;
                    if (vel.x > 0 && pos.x + r <= s.min.x + EPS && nx + r > s.min.x) { nx = s.min.x - r - EPS; res.blocked = true; res.wx = -1; }
                    else if (vel.x < 0 && pos.x - r >= s.max.x - EPS && nx - r < s.max.x) { nx = s.max.x + r + EPS; res.blocked = true; res.wx = 1; }
                }
                pos.x = nx;
            }
            if (vel.z !== 0) {
                let nz = pos.z + vel.z * dt;
                for (const s of list) {
                    if (s.max.y <= lo || s.min.y >= hi || pos.x + r <= s.min.x || pos.x - r >= s.max.x) continue;
                    if (vel.z > 0 && pos.z + r <= s.min.z + EPS && nz + r > s.min.z) { nz = s.min.z - r - EPS; res.blocked = true; res.wz = -1; }
                    else if (vel.z < 0 && pos.z - r >= s.max.z - EPS && nz - r < s.max.z) { nz = s.max.z + r + EPS; res.blocked = true; res.wz = 1; }
                }
                pos.z = nz;
            }
            if (vertical) {
                let ny = feet + vel.y * dt;
                const fr = r * 0.75;
                if (vel.y <= 0) {
                    let best = -Infinity;
                    for (const s of list) {
                        if (!overlapXZ(s, pos.x, pos.z, fr)) continue;
                        if (s.max.y <= feet + stepUp + EPS && s.max.y >= ny - EPS && s.max.y > best) best = s.max.y;
                    }
                    if (best > -Infinity) { ny = best; vel.y = 0; res.grounded = true; }
                } else {
                    let lim = Infinity;
                    for (const s of list) {
                        if (!overlapXZ(s, pos.x, pos.z, fr)) continue;
                        if (s.min.y >= hi - EPS && s.min.y < ny + height && s.min.y < lim) lim = s.min.y;
                    }
                    if (lim < Infinity) { ny = lim - height - EPS; vel.y = 0; res.ceiling = true; }
                }
                pos.y = ny - bottomOff;
            }
            return res;
        }
        function spotBlocked(x, z, r, y0, y1) {
            for (const s of near(solids, x - r, x + r, z - r, z + r)) if (s.max.y > y0 && s.min.y < y1 && overlapXZ(s, x, z, r)) return true;
            return false;
        }
        function freeSpot(p, r = 0.6, h = 3.1) {
            const ok = (x, z) => !spotBlocked(x, z, r, p.y + 0.35, p.y + h) && spotBlocked(x, z, 0.3, p.y - 1.5, p.y + 0.3);
            if (ok(p.x, p.z)) return p;
            for (let rad = 1.5; rad <= 15; rad += 1.5) for (let k = 0; k < 12; k++) {
                const a = k / 12 * Math.PI * 2, x = p.x + Math.sin(a) * rad, z = p.z + Math.cos(a) * rad;
                if (ok(x, z)) { p.x = x; p.z = z; return p; }
            }
            return p;
        }
        return { moveBody, spotBlocked, freeSpot };
    }

    // ---------- segment vs axis-aligned boxes: first hit fraction t in [0,1] or -1 ----------
    const _ax = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    function segHit(solids, a, b, pad = 0) {
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z; let best = 2;
        const list = near(solids, Math.min(a.x, b.x) - pad, Math.max(a.x, b.x) + pad, Math.min(a.z, b.z) - pad, Math.max(a.z, b.z) + pad);
        for (const s of list) {
            let t0 = 0, t1 = 1, ok = true;
            const A = _ax; A[0][0] = a.x; A[0][1] = dx; A[0][2] = s.min.x - pad; A[0][3] = s.max.x + pad; A[1][0] = a.y; A[1][1] = dy; A[1][2] = s.min.y - pad; A[1][3] = s.max.y + pad;
            A[2][0] = a.z; A[2][1] = dz; A[2][2] = s.min.z - pad; A[2][3] = s.max.z + pad;   // no per-box garbage
            for (const [o, d, lo, hi] of A) {
                if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } continue; }
                let u = (lo - o) / d, w = (hi - o) / d; if (u > w) { const q = u; u = w; w = q; }
                if (u > t0) t0 = u; if (w < t1) t1 = w; if (t0 > t1) { ok = false; break; }
            }
            if (ok && t0 < best) best = t0;
        }
        return best <= 1 ? best : -1;
    }

    // ---------- FPS meter + benchmark ----------
    // Live line: FPS over the last half second. Benchmark (Settings → Performance test): records EVERY frame for
    // N seconds — frame interval, game-logic CPU time, draw-submit CPU time, draw calls, triangles — then shows a
    // report the way game studios read a capture: average, 1 % / 0.1 % lows (the stutter you feel), the worst
    // frames, and whether the CPU or the GPU is the bottleneck. A single hitch (a screenshot, a notification)
    // barely moves the averages, and frames while the app is in the background are not counted at all.
    const BL = {
        ar: { title: 'تقرير الأداء', run: s => `قياس الأداء… ${s} ث — العب كالمعتاد`, avg: 'متوسط الإطارات', low1: 'أدنى 1%', low01: 'أدنى 0.1%', med: 'الإطار الوسيط', worst: 'أسوأ إطار',
            stut: 'تقطيعات', stutN: (a, b) => `${a} (منها ${b} فوق 50 ملي ث)`, cpu: 'منطق اللعبة (CPU)', sub: 'إرسال الرسم (CPU)', gpu: 'وقت كرت الشاشة (تقديري)', calls: 'أوامر الرسم', tris: 'مثلثات / إطار', res: 'دقة الرسم', set: 'الإعدادات',
            dur: 'المدة', frames: 'إطارات', close: 'إغلاق', copy: 'نسخ', copied: 'تم النسخ', again: 'إعادة', aborted: 'أُلغي القياس (خرجت من اللعبة)',
            vGpu: 'الحد: كرت الشاشة — خفّض الجودة أو الدقة', vCpu: 'الحد: المعالج — المنطق أو أوامر الرسم ثقيلة', vCap: 'ثابت على الحد الأقصى — الجهاز يتحمل أكثر', vStut: 'المتوسط جيد لكن فيه تقطيعات متفرقة (قفزات في زمن الإطار)', vOk: 'أداء متوازن', ms: 'ملي ث' },
        en: { title: 'Performance report', run: s => `Measuring… ${s} s — play as usual`, avg: 'Average FPS', low1: '1% low', low01: '0.1% low', med: 'Median frame', worst: 'Worst frame',
            stut: 'Stutters', stutN: (a, b) => `${a} (${b} over 50 ms)`, cpu: 'Game logic (CPU)', sub: 'Draw submit (CPU)', gpu: 'GPU time (estimate)', calls: 'Draw calls', tris: 'Triangles / frame', res: 'Render scale', set: 'Settings',
            dur: 'Duration', frames: 'frames', close: 'Close', copy: 'Copy', copied: 'Copied', again: 'Again', aborted: 'Test cancelled (app went to background)',
            vGpu: 'Bound by: GPU — lower quality or resolution', vCpu: 'Bound by: CPU — logic or draw submission is heavy', vCap: 'Pinned at the cap — the device has headroom', vStut: 'Good average, but with occasional stutters (frame-time spikes)', vOk: 'Balanced', ms: 'ms' },
        es: { title: 'Informe de rendimiento', run: s => `Midiendo… ${s} s — juega normal`, avg: 'FPS medio', low1: '1% bajo', low01: '0,1% bajo', med: 'Fotograma mediano', worst: 'Peor fotograma',
            stut: 'Tirones', stutN: (a, b) => `${a} (${b} de más de 50 ms)`, cpu: 'Lógica (CPU)', sub: 'Envío de dibujo (CPU)', gpu: 'Tiempo de GPU (estimado)', calls: 'Llamadas de dibujo', tris: 'Triángulos / fotograma', res: 'Escala de render', set: 'Ajustes',
            dur: 'Duración', frames: 'fotogramas', close: 'Cerrar', copy: 'Copiar', copied: 'Copiado', again: 'Repetir', aborted: 'Prueba cancelada (app en segundo plano)',
            vGpu: 'Límite: GPU — baja calidad o resolución', vCpu: 'Límite: CPU — lógica o envío de dibujo pesados', vCap: 'Fijo en el tope — el equipo da para más', vStut: 'Buena media, pero con tirones ocasionales', vOk: 'Equilibrado', ms: 'ms' },
        zh: { title: '性能报告', run: s => `测量中… ${s} 秒 — 正常游玩`, avg: '平均帧率', low1: '1% 低帧', low01: '0.1% 低帧', med: '帧时间中位数', worst: '最差帧',
            stut: '卡顿', stutN: (a, b) => `${a}（其中 ${b} 次超过 50 毫秒）`, cpu: '游戏逻辑（CPU）', sub: '绘制提交（CPU）', gpu: 'GPU 时间（估计）', calls: '绘制调用', tris: '三角形 / 帧', res: '渲染比例', set: '设置',
            dur: '时长', frames: '帧', close: '关闭', copy: '复制', copied: '已复制', again: '重测', aborted: '测试已取消（应用切到后台）',
            vGpu: '瓶颈：GPU — 降低画质或分辨率', vCpu: '瓶颈：CPU — 逻辑或绘制提交过重', vCap: '已达帧率上限 — 设备还有余量', vStut: '平均不错，但有偶发卡顿（帧时间尖峰）', vOk: '表现均衡', ms: '毫秒' },
        ja: { title: 'パフォーマンスレポート', run: s => `計測中… ${s} 秒 — 普通にプレイ`, avg: '平均FPS', low1: '1% Low', low01: '0.1% Low', med: 'フレーム中央値', worst: '最悪フレーム',
            stut: 'カクつき', stutN: (a, b) => `${a}（うち50ms超 ${b}）`, cpu: 'ゲームロジック（CPU）', sub: '描画送信（CPU）', gpu: 'GPU時間（推定）', calls: 'ドローコール', tris: '三角形 / フレーム', res: '描画スケール', set: '設定',
            dur: '時間', frames: 'フレーム', close: '閉じる', copy: 'コピー', copied: 'コピーしました', again: 'もう一度', aborted: '計測中止（バックグラウンドへ移動）',
            vGpu: 'ボトルネック：GPU — 画質か解像度を下げる', vCpu: 'ボトルネック：CPU — ロジックか描画送信が重い', vCap: '上限に張り付き — 余裕あり', vStut: '平均は良好だが時々カクつく（フレーム時間のスパイク）', vOk: 'バランス良好', ms: 'ms' }
    };
    const bl = (k, ...a) => { const L = BL[(window.AxonI18n && window.AxonI18n.lang) || 'en'] || BL.en, v = L[k] !== undefined ? L[k] : BL.en[k]; return typeof v === 'function' ? v(...a) : v; };
    // events of the current frame (kill, shot, save…), so the report can tell what the slow frames had in common
    let _marks = [], _marking = false;
    function mark(label) { if (_marking) _marks.push(label); }
    function gpuName(renderer) {
        try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return String((x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '?'); } catch (e) { return '?'; }
    }
    function FpsMeter(stage, renderer) {
        const el = document.createElement('div'); el.id = 'fps-meter'; el.hidden = true; stage.appendChild(el);
        const st = document.createElement('style');
        st.textContent = `#fps-meter{position:absolute;z-index:40;left:50%;top:max(4px,env(safe-area-inset-top));transform:translateX(-50%);pointer-events:none;
          font:700 11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#7dffb8;background:rgba(0,0,0,.55);padding:3px 8px;border-radius:6px;white-space:pre;text-align:center}
          #fps-meter.mid{color:#ffd36b} #fps-meter.bad{color:#ff5a7a}
          #bench-run{position:absolute;z-index:41;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);pointer-events:none;font:700 12px var(--font,system-ui);
            color:#ffd36b;background:rgba(0,0,0,.6);padding:6px 12px;border:1px solid rgba(255,168,38,.5);white-space:nowrap}
          #bench-rep{position:absolute;z-index:45;inset:0;display:grid;place-items:center;background:rgba(3,8,16,.6);font-family:var(--font,system-ui)}
          #bench-rep .bc{width:min(560px,94%);max-height:94%;overflow:auto;box-sizing:border-box;padding:14px 16px;display:grid;gap:8px;color:#e6eef6;
            background:linear-gradient(160deg,rgba(20,40,64,.96),rgba(8,16,30,.98));border:1px solid rgba(57,215,255,.3)}
          #bench-rep h3{margin:0;font-size:17px;display:flex;justify-content:space-between;gap:10px;align-items:baseline}
          #bench-rep h3 small{font-size:11px;color:#8a9bb0;font-weight:500}
          #bench-rep .big{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
          #bench-rep .big div{display:grid;gap:2px;padding:8px;background:rgba(255,255,255,.05);text-align:center}
          #bench-rep .big b{font:700 24px ui-monospace,Menlo,monospace;color:#7dffb8} #bench-rep .big b.mid{color:#ffd36b} #bench-rep .big b.bad{color:#ff5a7a}
          #bench-rep .big span,#bench-rep dt{font-size:11px;color:#8a9bb0}
          #bench-rep dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:12px} #bench-rep dd{margin:0;font-family:ui-monospace,Menlo,monospace;text-align:end}
          #bench-rep .verdict{font-size:13px;font-weight:700;color:#ffd36b;padding:6px 8px;background:rgba(255,168,38,.1);border-inline-start:3px solid #ffa826}
          #bench-rep canvas{width:100%;height:70px;background:rgba(0,0,0,.35)}
          #bench-rep .bb{display:flex;gap:8px;justify-content:flex-end} #bench-rep button{padding:8px 14px;font:700 12px var(--font,system-ui);color:#e6eef6;background:rgba(57,215,255,.1);border:1px solid rgba(57,215,255,.35);cursor:pointer}
          html.rtl-text #bench-rep .bc{direction:rtl} html.rtl-text #bench-rep dd{text-align:left} #bench-rep dd,#bench-rep .big b{direction:ltr;unicode-bidi:plaintext}`;
        document.head.appendChild(st);
        let frames = 0, acc = 0, worst = 0, last = performance.now(), cpuL = 0, cpuR = 0;
        this.fps = 60;
        this.show = on => { el.hidden = !on; };
        // CPU split of the frame just drawn (game.js): logic = simulation steps, draw = scene submission
        this.cpu = (logicMs, drawMs) => { cpuL = logicMs; cpuR = drawMs; };
        let B = null, runEl = null;
        this.bench = (secs = 30, info) => {
            if (B) return;
            Display.rec = []; Display.lim = { lag: [], per: [] }; B = { end: performance.now() + secs * 1000, secs, info, dt: [], vs: [], cl: [], cr: [], calls: [], tris: [], res: [], at: [], mk: [], skip: 2, aborted: false };
            _marking = true; _marks = [];
            if (!runEl) { runEl = document.createElement('div'); runEl.id = 'bench-run'; stage.appendChild(runEl); }
            runEl.hidden = false; runEl.textContent = bl('run', secs);
        };
        document.addEventListener('visibilitychange', () => { if (document.hidden && B) { B.aborted = true; finish(); } });
        const finish = () => {
            const R = B; B = null; _marking = false; R.raf = Display.rec || []; Display.rec = null; R.lim = Display.lim || { lag: [], per: [] }; Display.lim = null; if (runEl) runEl.hidden = true;
            if (R.aborted || R.dt.length < 30) { report(null); return; }
            report(R);
        };
        let lastVs = 0, vsDt = 0;
        this.vsync = ts => { vsDt = lastVs ? ts - lastVs : 0; lastVs = ts; };
        this.tick = () => {
            const now = performance.now(), ms = now - last; last = now;
            const fm = _marks; _marks = [];
            if (B) {
                if (B.skip > 0) B.skip--;                                  // the frame that opened the test is not counted
                else if (ms < 1000) {
                    const ri = renderer.info.render;
                    B.dt.push(ms); B.vs.push(vsDt); B.cl.push(cpuL); B.cr.push(cpuR); B.calls.push(ri.calls); B.tris.push(ri.triangles); B.res.push(this.res || 1); B.at.push(now); B.mk.push(fm.length ? fm : null);
                }
                const left = Math.ceil((B.end - now) / 1000);
                if (runEl && runEl._l !== left) { runEl._l = left; runEl.textContent = bl('run', Math.max(0, left)); }
                if (now >= B.end) finish();
            }
            frames++; acc += ms; worst = Math.max(worst, ms);
            if (acc >= 500) {
                this.fps = frames * 1000 / acc;
                if (!el.hidden) {
                    el.textContent = `${Math.round(this.fps)} FPS · ${(acc / frames).toFixed(1)} ms · max ${worst.toFixed(0)} · ${renderer.info.render.calls} calls · ${Math.round((this.res || 1) * 100)}%${this.tag ? '\n' + this.tag : ''}`;
                    el.className = this.fps >= 50 ? '' : this.fps >= 30 ? 'mid' : 'bad';
                }
                frames = 0; acc = 0; worst = 0;
            }
        };
        let repEl = null;
        const report = R => {
            if (!repEl) { repEl = document.createElement('div'); repEl.id = 'bench-rep'; stage.appendChild(repEl); }
            repEl.hidden = false;
            if (!R) { repEl.innerHTML = `<div class="bc"><h3>${bl('title')}</h3><p>${bl('aborted')}</p><div class="bb"><button data-b="x">${bl('close')}</button></div></div>`; wire(null); return; }
            const n = R.dt.length, sorted = R.dt.slice().sort((a, b) => a - b), sum = a => a.reduce((x, y) => x + y, 0), mean = a => sum(a) / a.length;
            const total = sum(R.dt), avgFps = n * 1000 / total, med = sorted[n >> 1];
            // 1% / 0.1% low = the average FPS of the slowest 1% / 0.1% of frames (the industry definition)
            const lowOf = f => { const k = Math.max(1, Math.round(n * f)), w = sorted.slice(n - k); return 1000 / mean(w); };
            const low1 = lowOf(0.01), low01 = lowOf(0.001), worst = sorted[n - 1];
            const stut = R.dt.filter(d => d > Math.max(med * 2, med + 8)).length, big = R.dt.filter(d => d > 50).length;
            const cl = mean(R.cl), cr = mean(R.cr), frameMs = total / n, cpu = cl + cr, gpu = Math.max(0, frameMs - cpu);
            const I = R.info ? R.info() : {}, hz = window.AxonPerf.Display.hz, peak = Math.max(hz, window.AxonPerf.Display.peak), cap = Math.min(I.cap || hz, hz), capMs = 1000 / cap;
            const verdict = low1 < cap * 0.6 && avgFps >= cap * 0.85 ? bl('vStut') : avgFps >= cap * 0.95 ? bl('vCap') : cpu > frameMs * 0.75 ? bl('vCpu') : frameMs > capMs * 1.1 ? bl('vGpu') : bl('vOk');
            const cls = f => f >= Math.min(55, cap * 0.92) ? '' : f >= 30 ? 'mid' : 'bad', f1 = v => v.toFixed(1);
            const rows = [
                [bl('med'), `${f1(med)} ${bl('ms')}`], [bl('worst'), `${f1(worst)} ${bl('ms')}`], [bl('stut'), bl('stutN', stut, big)],
                [bl('cpu'), `${f1(cl)} ${bl('ms')}`], [bl('sub'), `${f1(cr)} ${bl('ms')}`], [bl('gpu'), `≈ ${f1(gpu)} ${bl('ms')}`],
                [bl('calls'), `${Math.round(mean(R.calls))} (max ${Math.max(...R.calls)})`], [bl('tris'), `${Math.round(mean(R.tris) / 1000)}k`],
                [bl('res'), `${Math.round(mean(R.res) * 100)}%`], [bl('set'), `${I.tier || ''} · ${I.cap || ''} FPS cap · rAF ${hz} Hz · screen ${peak} Hz · DPR ${(window.devicePixelRatio || 1).toFixed(2)}`],
                ['GPU', gpuName(renderer)]
            ];
            // pacing: how many screen refreshes each frame lasted (1 refresh = 1000/hz ms). On a 60 cap at 120 Hz an
            // even game shows nearly all frames at 2; many at 3 means late frames (pacing / GPU), not the CPU.
            { const q = 1000 / peak, h = [0, 0, 0, 0, 0]; R.dt.forEach(d => h[Math.min(4, Math.max(0, Math.round(d / q) - 1))]++);
              const rf = R.raf.slice().sort((a, b) => a - b), rq = [0, 0, 0, 0]; R.raf.forEach(d => rq[Math.min(3, Math.max(0, Math.round(d / q) - 1))]++);
              if (rf.length) rows.push(['rAF callbacks', `median ${f1(rf[rf.length >> 1])} ms · ` + rq.map((c, i) => `${i < 3 ? i + 1 : '4+'}: ${Math.round(c / rf.length * 100)}%`).join(' · ')]);
              const lg = R.lim.lag.slice().sort((a, b) => a - b), pc4 = [0, 0, 0, 0]; R.lim.per.forEach(c => pc4[Math.min(3, c - 1)]++);
              if (lg.length) rows.push(['rAF lag (clock − timestamp)', `median ${f1(lg[lg.length >> 1])} ms · p90 ${f1(lg[Math.floor(lg.length * 0.9)])} ms`]);
              if (R.lim.per.length) rows.push(['Callbacks per drawn frame', pc4.map((c, i) => `${i < 3 ? i + 1 : '4+'}: ${Math.round(c / R.lim.per.length * 100)}%`).join(' · ')]);
              const hv = [0, 0, 0, 0, 0]; R.vs.forEach(d => d > 0 && hv[Math.min(4, Math.max(0, Math.round(d / q) - 1))]++); const nv = R.vs.filter(d => d > 0).length || 1;
              rows.push(['Pacing on screen (refreshes)', hv.map((c, i) => `${i < 4 ? i + 1 : '5+'}: ${Math.round(c / nv * 100)}%`).join(' · ')]);
              rows.push(['Pacing at frame end (refreshes)', h.map((c, i) => `${i < 4 ? i + 1 : '5+'}: ${Math.round(c / n * 100)}%`).join(' · ')]); }
            // ---- the slow frames, one by one: where did their time go, and what happened in them ----
            const lim = Math.max(med * 2, med + 8), spikes = [];
            for (let i = 0; i < n; i++) if (R.dt[i] > lim) spikes.push(i);
            let sLogic = 0, sDraw = 0, sOut = 0; const ev = new Map(), base = new Map();
            R.mk.forEach(m => m && new Set(m).forEach(k => base.set(k, (base.get(k) || 0) + 1)));
            spikes.forEach(i => {
                const l = R.cl[i], d = R.cr[i], o = R.dt[i] - l - d;
                if (l >= d && l >= o) sLogic++; else if (d >= o) sDraw++; else sOut++;
                if (R.mk[i]) new Set(R.mk[i]).forEach(k => ev.set(k, (ev.get(k) || 0) + 1));
            });
            const sp = spikes.length || 1, pc = v => Math.round(v / sp * 100) + '%';
            const avgOf = (arr) => spikes.length ? (spikes.reduce((a, i) => a + arr[i], 0) / spikes.length) : 0;
            const outAvg = spikes.length ? spikes.reduce((a, i) => a + R.dt[i] - R.cl[i] - R.cr[i], 0) / spikes.length : 0;
            // an event "explains" spikes when it shows up in slow frames far more often than in frames overall
            const evRows = [...ev.entries()].map(([k, c]) => ({ k, c, lift: (c / sp) / Math.max(1e-6, (base.get(k) || 1) / n) })).sort((a, b) => b.c - a.c).slice(0, 6);
            const spikeRows = spikes.length ? [
                ['Spikes', `${spikes.length} > ${f1(lim)} ms · avg ${f1(avgOf(R.dt))} ms`],
                ['  logic / draw / outside', `${pc(sLogic)} / ${pc(sDraw)} / ${pc(sOut)}`],
                ['  in spikes: logic · draw · outside', `${f1(avgOf(R.cl))} · ${f1(avgOf(R.cr))} · ${f1(outAvg)} ms`],
                ...evRows.map(r => ['  ' + r.k, `${r.c}× (${pc(r.c)} of spikes, ×${r.lift.toFixed(1)} vs normal)`])
            ] : [];
            rows.push(...spikeRows);
            const text = `${bl('title')} — ${bl('dur')} ${R.secs}s, ${n} ${bl('frames')}\n${bl('avg')}: ${f1(avgFps)} · ${bl('low1')}: ${f1(low1)} · ${bl('low01')}: ${f1(low01)}\n` + rows.map(r => `${r[0]}: ${r[1]}`).join('\n') + `\n${verdict}\n${navigator.userAgent}`;
            repEl.innerHTML = `<div class="bc"><h3>${bl('title')} <small>${bl('dur')} ${R.secs}s · ${n} ${bl('frames')}</small></h3>
                <div class="big"><div><b class="${cls(avgFps)}">${f1(avgFps)}</b><span>${bl('avg')}</span></div><div><b class="${cls(low1)}">${f1(low1)}</b><span>${bl('low1')}</span></div><div><b class="${cls(low01)}">${f1(low01)}</b><span>${bl('low01')}</span></div></div>
                <canvas width="520" height="70"></canvas>
                <div class="verdict">${verdict}</div>
                <dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>
                <div class="bb"><button data-b="c">${bl('copy')}</button><button data-b="r">${bl('again')}</button><button data-b="x">${bl('close')}</button></div></div>`;
            // frame-time graph: one bar per frame over the whole run, with the 60 / 30 FPS lines
            const cv = repEl.querySelector('canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height, top = Math.max(50, Math.min(120, sorted[Math.floor(n * 0.995)] * 1.2));
            g.clearRect(0, 0, W, H);
            for (const [v, c] of [[1000 / 60, 'rgba(125,255,184,.5)'], [1000 / 30, 'rgba(255,211,107,.5)']]) { const y = H - v / top * H; g.fillStyle = c; g.fillRect(0, y, W, 1); }
            const per = n / W;
            for (let x = 0; x < W; x++) {
                let m = 0; for (let i = Math.floor(x * per); i < Math.floor((x + 1) * per) || i === Math.floor(x * per); i++) if (i < n) m = Math.max(m, R.dt[i]);
                const h = Math.min(H, m / top * H); g.fillStyle = m > 50 ? '#ff5a7a' : m > 1000 / 30 ? '#ffd36b' : '#39d7ff'; g.fillRect(x, H - h, 1, h);
            }
            wire(text, R);
        };
        const wire = (text, R) => {
            repEl.onclick = e => {
                const b = e.target.closest('[data-b]'); if (!b) return;
                if (b.dataset.b === 'x') repEl.hidden = true;
                else if (b.dataset.b === 'r') { repEl.hidden = true; this.bench(R ? R.secs : 30, R ? R.info : null); }
                else if (b.dataset.b === 'c' && text) {
                    const done = () => { b.textContent = bl('copied'); };
                    try { navigator.clipboard.writeText(text).then(done, () => { prompt('', text); }); } catch (err) { prompt('', text); }
                }
            };
        };
    }

    // ---------- display refresh rate: measured continuously (median rAF interval of every 40-frame window,
    // keeping the fastest seen). The first measurement during loading is often too low, so it keeps learning.
    // hz: the rate rAF callbacks arrive at NOW (median of a 24-callback window, taken once two windows in a row
    // agree) — on Android the app can be voted down to 60 while the panel itself runs at 120, so this is what the
    // frame limiter must pace against. peak: the fastest rate seen (the panel). rec: raw intervals during a benchmark.
    const Display = { hz: 60, peak: 60, ready: false, rec: null, lim: null };
    (function probe() {
        const W = 24, d = new Float64Array(W); let k = 0, last = 0, cand = 0;
        const f = t => {
            if (last && document.visibilityState === 'visible') { const v = t - last; d[k++] = v; if (Display.rec && v < 1000) Display.rec.push(v); }
            last = t;
            if (k >= W) {
                d.sort(); k = 0;
                const hz = Math.round(1000 / d[W >> 1]);
                if (hz > 20 && hz < 250) {
                    if (hz > Display.peak) Display.peak = hz;
                    if (cand && Math.abs(hz - cand) / cand < 0.08) { Display.hz = hz; Display.ready = true; }
                    cand = hz;
                }
            }
            requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
    })();

    // ---------- frame limiter: skips rAF callbacks so the game runs at the chosen cap ----------
    function FrameLimiter() {
        // Clock pacing with half a refresh of slack: a frame is drawn once at least (interval - slack) has passed.
        // On a 120 Hz screen with a 60 cap the threshold (≈11.7 ms) sits between the refresh callbacks at 8.3 and
        // 16.7 ms, so jitter of a few ms either way never turns into a skipped refresh. (Counting callbacks failed on
        // Android WebView: after a drawn frame the next callback itself comes a refresh late — GPU back-pressure —
        // so "draw every 2nd callback" made 25 ms frames.) The schedule advances by whole intervals while on time,
        // which keeps non-multiple rates (90 Hz → 60) even, and resets after a real stall so it never bursts.
        let lastRun = 0;
        this.cap = 60;
        let skipped = 0, lastTs = 0;
        this.ok = ts => {
            const now = performance.now(), L = Display.lim;
            const go = this._go(ts || now);
            if (L) { L.lag.push(ts ? now - ts : 0); if (go) { L.per.push(skipped + 1); skipped = 0; } else skipped++; }
            else if (go) skipped = 0; else skipped++;
            return go;
        };
        // Decides on the rAF timestamp = the screen refresh the frame is aimed at (the callback itself runs 5–10 ms
        // later by a varying amount, so the real clock jitters). Whole multiples (120 Hz → 60 or 40) count the
        // refreshes since the last drawn frame: draw once 2 (or 3) have gone by. Callbacks the browser drops
        // (back-pressure after a heavy frame) are still counted, because the count comes from the timestamps.
        this._go = ts => {
            const hz = Display.hz;
            if (!this.cap || this.cap >= hz * 0.95) { lastRun = lastTs = ts; return true; }   // cap at/above the refresh rate: nothing to skip
            const q = 1000 / hz, r = hz / this.cap, whole = Math.abs(r - Math.round(r)) < 0.12;
            if (whole) {
                if (Math.round((ts - lastTs) / q) < Math.round(r)) return false;
                lastTs = lastRun = ts; return true;
            }
            const iv = 1000 / this.cap, slack = Math.min(q / 2, iv * 0.3), el = ts - lastRun;   // 90 Hz → 60: schedule on the clock
            if (el < iv - slack) return false;
            lastRun = el >= iv && el < iv * 2 ? lastRun + iv : ts; lastTs = ts;
            return true;
        };
    }

    // ---------- pool of additive FX meshes (shockwaves, flashes): no material creation during play ----------
    function FxPool(scene) {
        const free = new Map();
        this.get = (geo, color, opts = {}) => {
            const list = free.get(geo.uuid) || []; let m = list.pop();
            if (!m) { m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: opts.side || THREE.FrontSide })); m.userData.pooled = true; }
            m.material.color.setHex(color); m.material.opacity = 1; m.rotation.set(0, 0, 0); m.scale.setScalar(1); m.visible = true;
            scene.add(m); return m;
        };
        this.put = m => { scene.remove(m); const k = m.geometry.uuid; if (!free.has(k)) free.set(k, []); free.get(k).push(m); };
        this.prewarm = (geo, n, side) => { for (let i = 0; i < n; i++) this.put(this.get(geo, 0xffffff, { side })); };
    }

    // ---------- dynamic resolution: trims render scale while frames run long, restores it once there is
    // headroom (the console-game way to hold a frame rate). Each failed step back up waits longer.
    // down: how far over the frame budget the average may run before the resolution steps down. On a vsync-locked
    // phone a frame either makes the 16.7 ms slot or waits a whole extra one, so there it reacts already at +4 %
    // (frames just over budget) and keeps a margin, instead of waiting for +12 % (= many frames already missed).
    function DynRes(min = 0.7, down = 1.12) {
        this.scale = 1; let acc = 0, n = 0, good = 0, cool = 0, wait = 2, slow = 0, before = 0, block = 0;
        this.frame = (ms, target, dt) => {                 // → true when the scale changed
            cool -= dt; block -= dt; if (ms > 200) return false;       // tab switch / hitch outliers don't count
            acc += ms; if (++n < 24) return false;
            const avg = acc / n; acc = 0; n = 0;
            if (cool > 0) return false;
            // every change resizes the render targets (a costly reallocation, itself a hitch), so it only steps after
            // two slow windows in a row, and waits 3 s before the next change
            // proof: a step down that did not make frames at least 5 % faster means the frame time is not set by
            // pixels (vsync pacing, WebView, CPU) — undo it and stop trimming for a minute instead of blurring for nothing
            if (before) {
                const b = before; before = 0;
                if (avg > b * 0.95) { this.scale = Math.min(1, Math.round(this.scale * 10 + 1) / 10); block = 60; cool = 3; return true; }
            }
            if (avg > target * down) {
                good = 0; if (this.scale <= min || block > 0 || ++slow < 2) return false;
                slow = 0; before = avg; this.scale = Math.max(min, Math.round(this.scale * 10 - 1) / 10); cool = 3; wait = Math.min(wait * 1.6, 30); return true;
            }
            slow = 0;
            if (avg < target * Math.min(1.04, down - 0.01) && this.scale < 1 && (good += avg * 24 / 1000) > wait) {
                this.scale = Math.min(1, Math.round(this.scale * 10 + 1) / 10); good = 0; cool = 3; return true;
            }
            return false;
        };
    }

    // ---------- graphics tiers + automatic choice on first launch ----------
    //  MIN: for very low end devices, renders at 60% resolution with no shadows or bloom
    //  LO: native-ish resolution, no shadows, no bloom · MID: shadows · HI: shadows + bloom, sharper
    //  ULTRA: 2048 shadow map, strongest bloom, full retina resolution (desktops / flagship GPUs)
    const Quality = {
        TIERS: ['MIN', 'LO', 'MID', 'HI', 'ULTRA'],
        CFG: {
            MIN: { pr: 0.6, shadow: false, smap: 512, bloom: false },
            LO: { pr: 1, shadow: false, smap: 1024, bloom: false },
            MID: { pr: 1.25, shadow: true, smap: 1024, bloom: false },
            HI: { pr: 1.75, shadow: true, smap: 1024, bloom: true, bloomStr: 0.65 },
            ULTRA: { pr: 2.25, shadow: true, smap: 2048, bloom: true, bloomStr: 0.8 }
        },
        // score the device from its GPU name, memory, cores and screen, then map to a tier
        detect(renderer, mobile) {
            let gpu = '';
            try { 
                const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); 
                gpu = (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || ''; 
            } catch (e) { }
            const g = gpu.toLowerCase();
            const num = (re) => { const m = g.match(re); return m ? +m[1] : 0; };
            const adreno = num(/adreno[^0-9]*(\d{3})/), maliG = num(/mali-g(\d{2,3})/);
            
            let score = 2; // unknown GPU defaults to MID (score 2)
            if (/swiftshader|llvmpipe|software|mali-[34]|mali-t|powervr sgx|videocore/.test(g) || (adreno && adreno < 500)) score = 0;
            else if (adreno) score = adreno >= 800 ? 4 : adreno >= 700 ? 3 : adreno >= 640 ? 2 : adreno >= 600 ? 1 : 0;
            else if (/immortalis/.test(g)) score = 4;
            else if (maliG) score = maliG >= 710 ? 4 : maliG >= 76 ? 3 : maliG >= 72 ? 2 : 1;
            else if (/apple/.test(g)) score = mobile ? 3 : 4;
            else if (/nvidia|amd|intel/.test(g)) score = 4;
            
            return this.TIERS[Math.min(score, this.TIERS.length - 1)];
        },
        down(tier) {
            const idx = this.TIERS.indexOf(tier);
            return idx > 0 ? this.TIERS[idx - 1] : this.TIERS[0];
        }
    };

    // ---------- enemy LOD: far enemies drawn as low-poly silhouettes, one InstancedMesh per type ----------
    // (a whole crowd of distant enemies = 3 draw calls). Only those inside the camera view are packed in,
    // so anything behind the camera or out of range costs nothing.
    function Impostors(scene, max = 200) {
        const B = (w, h, d, x, y, z) => ({ geo: new THREE.BoxGeometry(w, h, d), matrix: new THREE.Matrix4().makeTranslation(x, y, z) });
        const Cy = (r, h, x, y, z) => ({ geo: new THREE.CylinderGeometry(r, r * 1.15, h, 8), matrix: new THREE.Matrix4().makeTranslation(x, y, z) });
        const drone = (() => {
            const body = new THREE.SphereGeometry(1.1, 10, 6); body.scale(1, 0.5, 1);
            const ring = new THREE.TorusGeometry(1.55, 0.09, 4, 20); ring.rotateX(Math.PI / 2);
            return mergeGeometries([{ geo: body, matrix: new THREE.Matrix4() }, { geo: ring, matrix: new THREE.Matrix4() }, B(0.5, 0.35, 0.3, 0, 0, 1.0)]);
        })();
        const runner = mergeGeometries([B(0.8, 0.95, 0.5, 0, 1.5, 0), B(0.42, 0.42, 0.42, 0, 2.2, 0), B(0.5, 1.05, 0.35, 0, 0.55, 0), B(1.3, 0.22, 0.3, 0, 1.8, 0)]);
        const heavy = mergeGeometries([B(2.2, 1.6, 1.4, 0, 1.75, 0), Cy(0.45, 1.7, -1.5, 1.3, 0), Cy(0.45, 1.7, 1.5, 1.3, 0), B(1.9, 1.0, 1.0, 0, 0.5, 0), B(0.9, 0.5, 0.6, 0, 2.8, 0.2)]);
        const mat = (color, emissive) => new THREE.MeshLambertMaterial({ color, emissive });
        const mk = (geo, m) => { const im = new THREE.InstancedMesh(geo, m, max); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
        const T = { drone: mk(drone, mat(0x8a93a3, 0x3a0a14)), runner: mk(runner, mat(0x8a93a3, 0x3a0a14)), heavy: mk(heavy, mat(0xb4521e, 0x401208)) };
        const n = { drone: 0, runner: 0, heavy: 0 }, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), ONE = new THREE.Vector3(1, 1, 1), SPH = new THREE.Sphere(new THREE.Vector3(), 2.6), UP = new THREE.Vector3(0, 1, 0);
        let fr = null;
        this.begin = frustum => { fr = frustum; n.drone = n.runner = n.heavy = 0; };
        this.add = e => {                                 // true when drawn
            const im = T[e.type]; if (!im || n[e.type] >= max) return false;
            SPH.center.copy(e.mesh.position); SPH.center.y += 1;
            if (fr && !fr.intersectsSphere(SPH)) return false;                   // behind / beside the camera
            M.compose(e.mesh.position, Q.setFromAxisAngle(UP, e.mesh.rotation.y), ONE);
            im.setMatrixAt(n[e.type]++, M); return true;
        };
        this.end = () => { for (const k in T) { T[k].count = n[k]; T[k].visible = n[k] > 0; if (n[k]) T[k].instanceMatrix.needsUpdate = true; } };   // none: no draw call
        this.showAll = () => { for (const k in T) T[k].visible = true; };                 // for shader pre-compiling
    }

    // ---------- rig-aware merge: every static piece is folded into the nearest ANIMATED joint above it,
    // one mesh per (joint, material). isLive(node) = the node moves / scales / toggles on its own and must stay
    // separate; canMerge(mesh) = its material may be shared. Animation is untouched, draw calls collapse.
    function mergeRig(root, isLive, canMerge) {
        root.updateMatrixWorld(true);
        const owner = o => { let p = o.parent; while (p && p !== root && !isLive(p)) p = p.parent; return p; };
        const buckets = new Map(), taken = [];
        root.traverse(o => {
            if (!o.isMesh || o.isInstancedMesh || isLive(o) || !o.visible || !canMerge(o)) return;
            let liveBelow = false; o.traverse(d => { if (d !== o && isLive(d)) liveBelow = true; }); if (liveBelow) return;
            const g = o.geometry; if (!g || !g.attributes.position || !g.attributes.normal || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return;
            const L = owner(o); if (!L) return;
            const key = o.material.uuid + (g.attributes.uv ? 'u' : '');
            if (!buckets.has(L)) buckets.set(L, new Map());
            const byMat = buckets.get(L); if (!byMat.has(key)) byMat.set(key, { mat: o.material, list: [], cast: false, recv: false, order: o.renderOrder });
            const b = byMat.get(key), inv = new THREE.Matrix4().copy(L.matrixWorld).invert();
            b.list.push({ geo: g, matrix: inv.multiply(o.matrixWorld) }); b.cast = b.cast || o.castShadow; b.recv = b.recv || o.receiveShadow;
            taken.push(o);
        });
        let before = taken.length, after = 0;
        taken.forEach(o => { if (o.parent) o.parent.remove(o); });
        buckets.forEach((byMat, L) => byMat.forEach(b => {
            const m = new THREE.Mesh(mergeGeometries(b.list), b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.order;
            L.add(m); after++;
        }));
        return { before, after };
    }

    // ---------- rig → skinned mesh: every static piece of a character becomes part of ONE SkinnedMesh per
    // material, rigidly bound to the animated joint it hangs from (the joints themselves become the bones).
    // The animation code keeps moving the same joint nodes; the body draws in ~8 calls instead of ~100.
    function skinRig(root, isLive, canMerge) {
        root.updateMatrixWorld(true);
        const owner = o => { let p = o.parent; while (p && p !== root && !isLive(p)) p = p.parent; return p; };
        const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
        const byMat = new Map(), taken = [], bones = [root], boneIx = new Map([[root, 0]]);
        root.traverse(o => {
            if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || isLive(o) || !canMerge(o)) return;
            for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return;
            let liveBelow = false; o.traverse(d => { if (d !== o && isLive(d)) liveBelow = true; }); if (liveBelow) return;
            const g = o.geometry; if (!g || !g.attributes.position || !g.attributes.normal || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return;
            const L = owner(o); if (!L) return;
            if (!boneIx.has(L)) { boneIx.set(L, bones.length); bones.push(L); }
            const key = o.material.uuid + (g.attributes.uv ? 'u' : '');
            if (!byMat.has(key)) byMat.set(key, { mat: o.material, list: [], bone: [], src: [], cast: false, recv: false, order: o.renderOrder });
            const b = byMat.get(key);
            b.list.push({ geo: g, matrix: new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld) }); b.bone.push(boneIx.get(L)); b.src.push(o);
            b.cast = b.cast || o.castShadow; b.recv = b.recv || o.receiveShadow; taken.push(o);
        });
        if (!taken.length) return null;
        taken.forEach(o => { if (o.parent) o.parent.remove(o); });
        root.updateMatrixWorld(true);
        const skeleton = new THREE.Skeleton(bones), meshes = [], pieces = [];         // bone inverses = the pose right now
        // three r128 keeps ONE shader program per material: a material shared with a separate (non-skinned) piece —
        // e.g. the glow of the chest gem, the accent of the scarf — would draw the skinned body without skinning and
        // leave its pieces frozen in place. Those get a private copy for the body, kept in sync with the original every frame.
        const stillUsed = new Set(); root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) stillUsed.add(o.material); });
        const proxyFor = src => {
            const m = src.clone(); m.skinning = true; m.onBeforeCompile = src.onBeforeCompile;
            m.userData.syncFrom = src; return m;
        };
        byMat.forEach(b => {
            if (stillUsed.has(b.mat)) b.mat = proxyFor(b.mat); else b.mat.skinning = true;
            const geo = mergeGeometries(b.list), n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
            const m = new THREE.SkinnedMesh(geo, b.mat);
            let v = 0;
            b.list.forEach((p, k) => { pieces.push({ src: b.src[k], mesh: m, offset: v }); const c = p.geo.attributes.position.count; for (let i = 0; i < c; i++, v++) { si[v * 4] = b.bone[k]; sw[v * 4] = 1; } });
            geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
            m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.order; m.frustumCulled = false;
            const src = b.mat.userData.syncFrom;
            if (src) m.onBeforeRender = () => {                                          // colour schemes, glow cycling, hurt flash
                const d = m.material; d.color.copy(src.color); if (src.emissive) { d.emissive.copy(src.emissive); d.emissiveIntensity = src.emissiveIntensity; }
                if (src.metalness !== undefined) { d.metalness = src.metalness; d.roughness = src.roughness; }
            };
            root.add(m); m.updateMatrixWorld(true); m.bind(skeleton, m.matrixWorld); meshes.push(m);
        });
        return { pieces, meshes, bones: bones.length };
    }
    // re-point a cloned character's skinned meshes at the clone's own joints (for copies like dash afterimages)
    function rebindClone(srcNodes, dstNodes) {
        const ix = new Map(srcNodes.map((o, k) => [o, k]));
        dstNodes.forEach(o => { if (o.isSkinnedMesh) o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => dstNodes[ix.get(b)]), o.skeleton.boneInverses), o.bindMatrix); });
    }

    return { mark, mergeGeometries, mergeStatic, mergeRig, skinRig, rebindClone, Impostors, WorldBatcher, SparkPool, segHit, near, physics, FpsMeter, Display, FrameLimiter, FxPool, DynRes, Quality };
})();
