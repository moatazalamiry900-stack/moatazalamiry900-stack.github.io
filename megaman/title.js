// =====================================================================
//  AXON BREACH — TITLE SHOT: the picture behind the main menu (title.js)
//  A slow-motion sword form in front of a fantasy sky:
//   • the HQ is hidden behind a painted sky dome (dusk gradient, stars, ringed moon, sun on the horizon, aurora,
//     cloud sea, floating islands) and the hero stands on a rune-lit stone platform above the clouds;
//   • he holds the saber up as a guard, then cuts — across, rising, overhead — all in slow motion, and returns
//     to the guard. The cuts are the game's own ones, played through the real animation with long timers;
//   • the camera sits low, looking up at him, drifting slowly; petals of light rise around him.
//  Everything here exists only while the menu is up: game.js calls AxonTitle.shot(...) every frame of the title,
//  and when the calls stop the stage is cleared and the hero is himself again.
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonTitle = (function () {
    const hidden = new Set();
    let fx = null, last = 0, timer = 0, hero = null, light = null, lightWas = null, clock = 0;
    const N = 110;
    // the form: [start, length, kind] inside a LOOP-second cycle; between cuts he holds the guard
    const LOOP = 13, CUTS = [[3.0, 2.3, 'h1'], [5.5, 2.3, 'h2'], [8.0, 2.9, 'fin']];

    function paintSky() {
        const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const x = cv.getContext('2d'), hz = H * 0.56, sx = W * 0.5;
        let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
        let g = x.createLinearGradient(0, 0, 0, hz);
        g.addColorStop(0, '#070824'); g.addColorStop(0.32, '#1c1458'); g.addColorStop(0.6, '#5a2a8c'); g.addColorStop(0.8, '#c24a86'); g.addColorStop(0.93, '#ff9a5c'); g.addColorStop(1, '#ffe2a0');
        x.fillStyle = g; x.fillRect(0, 0, W, hz);
        g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#ffd9a8'); g.addColorStop(0.12, '#b0689c'); g.addColorStop(0.45, '#3a2468'); g.addColorStop(1, '#0c0a26');
        x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
        // stars
        for (let k = 0; k < 900; k++) { const y = Math.pow(rnd(), 1.6) * hz * 0.8, r = rnd() < 0.06 ? 2.2 : 0.6 + rnd() * 0.9; x.fillStyle = `rgba(${220 + rnd() * 35 | 0},${220 + rnd() * 35 | 0},255,${(0.35 + rnd() * 0.65) * (1 - y / hz)})`; x.beginPath(); x.arc(rnd() * W, y, r, 0, 6.3); x.fill(); }
        x.globalCompositeOperation = 'lighter';
        // aurora ribbons
        for (let b = 0; b < 3; b++) {
            const y0 = hz - 300 + b * 40, c = ['60,255,200', '90,170,255', '200,110,255'][b];
            for (let i = 0; i < W; i += 6) { const y = y0 + Math.sin(i * 0.012 + b * 2) * 26 + Math.sin(i * 0.017 + b) * 10, h = 60 + Math.sin(i * 0.011 + b * 3) * 30; const a = x.createLinearGradient(0, y - h, 0, y); a.addColorStop(0, `rgba(${c},0)`); a.addColorStop(1, `rgba(${c},${0.10 + 0.06 * Math.sin(i * 0.03 + b)})`); x.fillStyle = a; x.fillRect(i, y - h, 6, h); }
        }
        // sun on the horizon, with rays
        const glow = (cx, cy, r, c, a) => { const q = x.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(1, `rgba(${c},0)`); x.fillStyle = q; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
        glow(sx, hz - 6, 300, '255,150,90', 0.4); glow(sx, hz - 6, 120, '255,214,140', 0.6); glow(sx, hz - 8, 34, '255,255,235', 1);
        x.save(); x.translate(sx, hz - 10);
        for (let k = 0; k < 26; k++) { const a = -Math.PI * (0.06 + 0.88 * k / 25) + (rnd() - 0.5) * 0.05, L = 150 + rnd() * 230, w = 0.01 + rnd() * 0.022; const q = x.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); q.addColorStop(0, 'rgba(255,220,160,0.13)'); q.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = q; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L); x.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L); x.fill(); }
        x.restore();
        x.globalCompositeOperation = 'source-over';
        // the ringed moon
        const mx = sx - 150, my = hz - 215, mr = 46;
        x.globalCompositeOperation = 'lighter'; glow(mx, my, 130, '150,170,255', 0.3); x.globalCompositeOperation = 'source-over';
        const ring = front => { x.save(); x.translate(mx, my); x.rotate(-0.38); x.scale(1, 0.2); x.lineWidth = 7; x.strokeStyle = 'rgba(255,225,190,0.75)'; x.beginPath(); x.arc(0, 0, mr * 1.75, front ? 0 : Math.PI, front ? Math.PI : 6.3); x.stroke(); x.lineWidth = 2.5; x.strokeStyle = 'rgba(190,220,255,0.7)'; x.beginPath(); x.arc(0, 0, mr * 2.05, front ? 0 : Math.PI, front ? Math.PI : 6.3); x.stroke(); x.restore(); };
        ring(false);
        g = x.createRadialGradient(mx - 16, my - 18, 4, mx, my, mr); g.addColorStop(0, '#fff8ee'); g.addColorStop(0.55, '#c8c2f0'); g.addColorStop(1, '#5a4aa8');
        x.fillStyle = g; x.beginPath(); x.arc(mx, my, mr, 0, 6.3); x.fill();
        x.save(); x.beginPath(); x.arc(mx, my, mr, 0, 6.3); x.clip(); for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(70,60,150,${0.12 + rnd() * 0.15})`; x.beginPath(); x.arc(mx + (rnd() - 0.5) * 80, my + (rnd() - 0.5) * 80, 3 + rnd() * 9, 0, 6.3); x.fill(); } x.restore();
        ring(true);
        // far mountains on the horizon
        const ridge = (base, amp, col, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, hz + 30); for (let i = 0; i <= W; i += 8) x.lineTo(i, base - Math.abs(Math.sin(i * 0.009 + seed) * amp + Math.sin(i * 0.03 + seed * 2) * amp * 0.45 + Math.sin(i * 0.09 + seed) * amp * 0.15)); x.lineTo(W, hz + 30); x.fill(); };
        ridge(hz + 4, 30, 'rgba(120,60,130,0.75)', 1.3); ridge(hz + 8, 18, 'rgba(60,32,96,0.9)', 4.1);
        // floating islands with waterfalls
        const island = (cx, cy, w) => {
            g = x.createLinearGradient(0, cy, 0, cy + w * 0.9); g.addColorStop(0, '#4a2c78'); g.addColorStop(1, '#160e3a'); x.fillStyle = g;
            x.beginPath(); x.moveTo(cx - w, cy); for (let k = 0; k <= 10; k++) { const u = k / 10; x.lineTo(cx - w + u * 2 * w, cy + Math.sin(u * Math.PI) * w * (0.55 + 0.3 * Math.sin(k * 2.3 + cx))); } x.fill();
            x.fillStyle = '#2f8f7a'; x.beginPath(); x.ellipse(cx, cy, w, w * 0.12, 0, Math.PI, 6.3); x.fill();
            x.fillStyle = '#ffd98a'; x.fillRect(cx - w, cy - 2, w * 2, 3);
            for (let k = 0; k < 5; k++) { const tx = cx + (k - 2) * w * 0.3, th = w * (0.25 + 0.2 * Math.sin(k * 3 + cx)); x.fillStyle = k % 2 ? '#1f6f6a' : '#3aa888'; x.beginPath(); x.moveTo(tx - w * 0.09, cy - 2); x.lineTo(tx, cy - th); x.lineTo(tx + w * 0.09, cy - 2); x.fill(); }
            x.fillStyle = '#e8d8ff'; x.fillRect(cx - w * 0.06, cy - w * 0.62, w * 0.12, w * 0.62); x.beginPath(); x.moveTo(cx - w * 0.14, cy - w * 0.6); x.lineTo(cx, cy - w * 1.0); x.lineTo(cx + w * 0.14, cy - w * 0.6); x.fill();   // a tower
            const f = x.createLinearGradient(0, cy, 0, cy + w * 1.6); f.addColorStop(0, 'rgba(200,240,255,0.85)'); f.addColorStop(1, 'rgba(200,240,255,0)'); x.fillStyle = f; x.fillRect(cx + w * 0.45, cy, w * 0.07, w * 1.6);
        };
        island(sx + 150, hz - 150, 34); island(sx - 300, hz - 120, 26); island(sx + 330, hz - 250, 20); island(sx - 60, hz - 70, 14); island(sx + 420, hz - 90, 24); island(sx - 480, hz - 230, 30); island(sx + 30, hz - 330, 16);
        // cloud sea and drifting clouds
        const cloud = (cx, cy, w, c, a) => { for (let k = 0; k < 9; k++) { const px = cx + (rnd() - 0.5) * w * 2, py = cy + (rnd() - 0.5) * w * 0.22, r = w * (0.25 + rnd() * 0.4); const q = x.createRadialGradient(px, py, 0, px, py, r); q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(1, `rgba(${c},0)`); x.fillStyle = q; x.save(); x.translate(px, py); x.scale(1, 0.34); x.translate(-px, -py); x.fillRect(px - r, py - r, r * 2, r * 2); x.restore(); } };
        for (let k = 0; k < 44; k++) cloud(rnd() * W, hz - 30 - rnd() * 330, 40 + rnd() * 60, k % 3 ? '255,170,170' : '190,140,230', 0.3);
        for (let k = 0; k < 90; k++) cloud(rnd() * W, hz + 8 + Math.pow(rnd(), 1.5) * 260, 60 + rnd() * 110, ['255,214,190', '214,150,200', '120,90,180'][k % 3], 0.4);
        return cv;
    }

    function build(THREE, scene, P) {
        const add = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const g = new THREE.Group(); scene.add(g);
        // the sky: one painted dome that travels with the camera and hides the HQ
        const tex = new THREE.CanvasTexture(paintSky()); tex.encoding = THREE.sRGBEncoding; tex.wrapS = THREE.RepeatWrapping;
        const sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 40, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })); sky.rotation.y = 2.07; scene.add(sky);
        // no platform: he stands on the cloud sea itself
        const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx2 = sc.getContext('2d'), sg = sx2.createRadialGradient(128, 128, 20, 128, 128, 128); sg.addColorStop(0, '#6a4a9c'); sg.addColorStop(0.5, '#b878a8'); sg.addColorStop(1, '#ffd0b0'); sx2.fillStyle = sg; sx2.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 160; k++) { const px = Math.random() * 256, py = Math.random() * 256, r = 8 + Math.random() * 22, w = sx2.createRadialGradient(px, py, 0, px, py, r); w.addColorStop(0, 'rgba(255,230,220,0.22)'); w.addColorStop(1, 'rgba(255,230,220,0)'); sx2.fillStyle = w; sx2.fillRect(px - r, py - r, r * 2, r * 2); }
        const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
        const sea = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ map: st, fog: false })); sea.rotation.x = -Math.PI / 2; sea.position.y = 0.04; g.add(sea);
        // petals of light rising round him
        const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dq = dc.getContext('2d'), dg = dq.createRadialGradient(16, 16, 0, 16, 16, 16); dg.addColorStop(0, '#fff'); dg.addColorStop(0.35, 'rgba(255,255,255,0.6)'); dg.addColorStop(1, 'rgba(255,255,255,0)'); dq.fillStyle = dg; dq.fillRect(0, 0, 32, 32); const dot = new THREE.CanvasTexture(dc);
        const pos = new Float32Array(N * 3), sp = new Float32Array(N);
        for (let k = 0; k < N; k++) { const a = Math.random() * 6.283, r = 0.8 + Math.random() * 5; pos[k * 3] = Math.cos(a) * r; pos[k * 3 + 1] = Math.random() * 7 - 1; pos[k * 3 + 2] = Math.sin(a) * r - 1; sp[k] = 0.25 + Math.random() * 0.7; }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: dot, color: 0xffe2c0, size: 0.16, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); pts.frustumCulled = false; g.add(pts);
        g.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); sky.frustumCulled = false;
        return { g, sky, tex, pts, sp };
    }
    const SKY_R = 11;

    function clear() {
        clearInterval(timer); timer = 0;
        if (fx) { fx.g.visible = false; fx.sky.visible = false; }
        hidden.forEach(o => { o.visible = true; }); hidden.clear();
        if (hero) { if (hero.mesh) hero.mesh.rotation.y = 0; hero.blocking = false; hero.slashTimer = 0; hero.drawn = false; if (hero.sword) hero.sword.visible = false; if (hero.backSaber) { hero.backSaber.visible = true; if (hero.handHilt) hero.handHilt.visible = false; } }
        if (light && lightWas) { light.intensity = lightWas.i; light.distance = lightWas.d; if (lightWas.c != null) light.color.setHex(lightWas.c); }
        hero = null;
    }

    // every frame of the title, after the hero was animated and the camera was placed
    function shot(c) {
        const { THREE, scene, camera, player: P, time, portrait, roamLight } = c, H = P.mesh.position;
        if (!fx) fx = build(THREE, scene, P);
        if (!timer) { timer = setInterval(() => { if (performance.now() - last > 1500) clear(); }, 250); if (roamLight) { light = roamLight; lightWas = { i: roamLight.intensity, d: roamLight.distance, c: roamLight.color.getHex() }; } }
        last = performance.now(); hero = P; fx.g.visible = fx.sky.visible = true; fx.g.position.set(H.x, H.y - 0.05, H.z);
        clock += Math.min(c.dt, 0.05);
        // nothing of the HQ shows in this picture (and nothing of it is drawn)
        const keep = P.trail && P.trail.mesh;
        for (const o of scene.children) if (o.visible && o !== fx.g && o !== fx.sky && o !== P.mesh && o !== keep && !o.isLight && !o.isCamera) { o.visible = false; hidden.add(o); }
        // ---- the hero: guard, then three slow cuts, then guard again — through the game's own animation ----
        const t = clock % LOOP; let cut = null;
        for (const k of CUTS) if (t >= k[0] && t < k[0] + k[1]) cut = k;
        P.mesh.rotation.y = 0.32; P.drawn = true; P._sheathT = 0; P.aimTimer = 0; P.charge = 0;
        if (P.backSaber) { P.backSaber.visible = false; if (P.handHilt) P.handHilt.visible = true; } if (P.sword) P.sword.visible = true;
        if (cut) { P.blocking = false; P.slashKind = cut[2]; P.slashDur = cut[1]; P._drawX = 0; P.slashTimer = Math.max(0.001, cut[1] - (t - cut[0])); }
        else { P.slashTimer = 0; P.blocking = true; P.guardHit = 0; }
        // ---- the stage ----
        fx.sky.position.copy(camera.position); fx.tex.offset.x = time * 0.0006;
        const a = fx.pts.geometry.attributes.position, p = a.array;
        for (let k = 0; k < N; k++) { p[k * 3 + 1] += fx.sp[k] * c.dt; p[k * 3] += Math.sin(time * 0.7 + k) * 0.004; if (p[k * 3 + 1] > 7.5) p[k * 3 + 1] = -1; }
        a.needsUpdate = true;
        // rim light: warm, from the sun behind him
        if (roamLight) { roamLight.position.set(H.x - 2.2, H.y + 3.4, H.z - 3.6); roamLight.color.setHex(0xffc890); roamLight.intensity = 2.4; roamLight.distance = 30; }
        // ---- the camera: low, looking up; hero on the right in landscape, low in portrait ----
        const ang = 0.5 + Math.sin(time * 0.09) * 0.22, R = portrait ? 8.2 : 4.9;
        camera.position.set(H.x + Math.sin(ang) * R, H.y + 1.05 + Math.sin(time * 0.13) * 0.12, H.z + Math.cos(ang) * R);
        camera.up.set(0, 1, 0); camera.lookAt(H.x, H.y + (portrait ? 2.3 : 2.5), H.z);
        camera.rotateZ(-0.06);
        if (portrait) camera.rotateX(-0.33); else camera.translateX(-1.45);
    }
    return { shot };
})();
