// =====================================================================
//  AXON BREACH — ENEMY MODELS, FINISHED (foelook.js)
//  The three machines of the mission were built from plain boxes and tubes. This dresses each one, on top of
//  its animated skeleton, with the parts that make it read as a designed unit — and gives all armour a
//  surface (panel lines, bolts, wear) instead of flat colour:
//   STALKER (runner): collar, segmented waist, jet pack with two nozzles and a spine fin, angular pauldrons
//                     with spikes, jaw, brow and ear blades, chest chevrons, elbow joints, forearm guards,
//                     a blade housing and claw hand, hip joints, thigh plates, calf fins, toes and heels.
//   BULWARK (heavy):  sloped glacis and jaw plates, hazard chevrons, side skirts with bolts, collar ring,
//                     antenna and sensor pod, engine block with exhaust stacks and glowing vents, waist ring,
//                     shoulder trims, a missile pod, muzzle rings, cooling fins, shoulder joints, ammo boxes,
//                     knee pistons, toes and heel spurs.
//   SEEKER (drone):   dorsal fin, winglets with lit tips, twin guns, rim lights, glowing exhaust cones.
//  Everything is added to the unit's existing groups in its existing four materials, so it is merged with
//  the body: no extra draw calls. level.js calls AxonFoeLook.dress(...) once per unit, before merging.
//  Loaded by index.html before level.js.
// =====================================================================
'use strict';

window.AxonFoeLook = (function () {
    let PANEL = null;
    function panel() {
        if (PANEL) return PANEL;
        const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
        g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, 256, 256);
        let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.015 + r() * 0.03})`; const w = 1 + r() * 5; g.fillRect(r() * 256, r() * 256, w, r() < 0.5 ? w : 1 + r() * 2); }   // fine wear (no long streaks: they read as wood)
        g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.strokeRect(5, 5, 246, 246);                                                                              // plate edge
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.strokeRect(8.5, 8.5, 239, 239);
        g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(5, 150); g.lineTo(150, 150); g.lineTo(178, 122); g.lineTo(251, 122); g.moveTo(96, 5); g.lineTo(96, 86); g.lineTo(5, 86); g.stroke();   // panel seams
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(170, 170, 62, 9); g.fillRect(170, 186, 62, 9); g.fillRect(170, 202, 62, 9);                                         // a vent
        for (const [x, y] of [[18, 18], [238, 18], [18, 238], [238, 238], [18, 128], [238, 68], [128, 18], [128, 238], [70, 172], [70, 220]]) { g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(x, y, 5, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 1, y - 1, 2.6, 0, 6.3); g.fill(); }   // bolts
        PANEL = new THREE.CanvasTexture(c); PANEL.encoding = THREE.sRGBEncoding; PANEL.anisotropy = 2;
        return PANEL;
    }
    const PI = Math.PI;
    function dress(e, type, K) {
        const { add, C, B, dark, silver, red, hazard } = K, core = e.core;
        const T = (R, t, seg = 20) => new THREE.TorusGeometry(R, t, 6, seg), SP = (r, a = 10, b = 8) => new THREE.SphereGeometry(r, a, b), CO = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
        dark.map = silver.map = hazard.map = panel();
        dark.color.multiplyScalar(1.5); silver.color.multiplyScalar(1.08);          // the surface darkens them a little: keep the same overall tone
        if (type === 'runner') {
            add(T(0.2, 0.05, 14), hazard, core, 0, 0.74, 0, PI / 2);                                                    // collar
            add(T(0.3, 0.045, 16), dark, core, 0, 0.12, 0, PI / 2).scale.set(1, 0.74, 1); add(T(0.27, 0.035, 16), silver, core, 0, 0.02, 0, PI / 2).scale.set(1, 0.74, 1);   // waist segments
            add(B(0.36, 0.44, 0.2), dark, core, 0, 0.38, -0.36); add(B(0.04, 0.52, 0.18), hazard, core, 0, 0.5, -0.5, 0.25);     // jet pack + spine fin
            for (const s of [-1, 1]) {
                add(C(0.07, 0.1, 0.2, 10), silver, core, s * 0.1, 0.14, -0.42); add(T(0.07, 0.022, 10), red, core, s * 0.1, 0.04, -0.42, PI / 2);    // nozzles
                add(B(0.32, 0.06, 0.36), silver, core, s * 0.57, 0.75, 0, 0, 0, s * -0.5); add(CO(0.06, 0.24, 5), hazard, core, s * 0.7, 0.8, 0, 0, 0, s * -1.0);   // pauldron + spike
                add(B(0.03, 0.3, 0.1), hazard, core, s * 0.27, 1.06, -0.05, -0.3, 0, s * -0.25);                         // ear blade
                add(B(0.2, 0.045, 0.04), red, core, s * 0.12, 0.5, 0.32, 0, 0, s * 0.6);                                // chest chevron
            }
            add(B(0.26, 0.1, 0.2), silver, core, 0, 0.82, 0.14); add(B(0.42, 0.05, 0.14), dark, core, 0, 1.06, 0.2);     // jaw, brow
            for (const a of [e.armL, e.armR]) { add(SP(0.115), silver, a, 0, -0.52, 0); add(B(0.17, 0.3, 0.2), dark, a, 0, -0.72, 0.02); }
            add(B(0.11, 0.22, 0.22), dark, e.armR, 0.1, -0.72, 0.1); add(CO(0.085, 0.34, 4), red, e.armR, 0.1, -1.5, 0.21, PI + 0.25, PI / 4, 0);     // blade housing + point
            for (const k of [-1, 0, 1]) add(CO(0.03, 0.2, 4), silver, e.armL, k * 0.05, -1.05, 0.03, PI, 0, k * 0.25);  // claw
            for (const l of [e.legL, e.legR]) {
                add(SP(0.13), dark, l, 0, 0, 0); add(B(0.2, 0.3, 0.1), hazard, l, 0, -0.25, 0.12); add(B(0.04, 0.34, 0.16), silver, l, 0, -0.78, -0.16);
                add(C(0.02, 0.11, 0.22, 4), silver, l, 0, -1.12, 0.33, PI / 2, PI / 4, 0); add(B(0.1, 0.16, 0.08), dark, l, 0, -1.02, -0.14);
            }
        } else if (type === 'heavy') {
            add(B(1.9, 0.5, 0.5), hazard, core, 0, 0.88, 0.58, -0.7); add(B(1.7, 0.42, 0.4), dark, core, 0, -0.5, 0.6, 0.6);                   // glacis, jaw
            for (const k of [-1, 0, 1]) add(B(0.42, 0.09, 0.03), hazard, core, k * 0.45, -0.18, 0.86, 0, 0, 0.7);                              // hazard chevrons
            add(T(0.5, 0.07, 18), silver, core, 0, 1.02, 0.1, PI / 2);                                                                         // collar round the dome
            add(C(0.02, 0.02, 0.9, 5), silver, core, -0.72, 1.5, -0.3); add(B(0.06, 0.06, 0.06), red, core, -0.72, 1.96, -0.3);                // antenna
            add(B(0.24, 0.22, 0.34), dark, core, 0.74, 1.14, -0.2); add(B(0.14, 0.1, 0.03), red, core, 0.74, 1.14, -0.02);                     // sensor pod
            add(B(1.4, 0.9, 0.4), dark, core, 0, 0.3, -0.86); for (let k = 0; k < 4; k++) add(B(1.0, 0.06, 0.05), red, core, 0, 0.02 + k * 0.17, -1.07);   // engine block, vents
            add(C(0.75, 0.86, 0.26, 16), silver, core, 0, -0.7, 0);                                                                            // waist ring
            for (const s of [-1, 1]) {
                add(B(0.1, 1.2, 1.2), silver, core, s * 1.16, 0.12, 0); for (const [y, z] of [[0.55, 0.45], [0.55, -0.45], [-0.3, 0.45], [-0.3, -0.45]]) add(C(0.06, 0.06, 0.07, 8), dark, core, s * 1.22, y, z, 0, 0, PI / 2);   // skirt + bolts
                add(C(0.13, 0.16, 0.9, 10), silver, core, s * 0.45, 1.0, -0.9); add(T(0.12, 0.03, 12), red, core, s * 0.45, 1.46, -0.9, PI / 2);  // exhaust stacks
                add(B(0.98, 0.06, 1.38), silver, core, s * 1.3, 1.2, 0, 0, 0, s * -0.2);                                                       // shoulder trim
            }
            add(B(0.5, 0.4, 0.6), dark, core, -1.36, 1.5, -0.1, 0, 0, 0.2); for (const [x, y] of [[-0.12, -0.09], [0.12, -0.09], [-0.12, 0.09], [0.12, 0.09]]) add(C(0.075, 0.075, 0.08, 8), red, core, -1.36 + x, 1.5 + y, 0.22, PI / 2);   // missile pod
            add(C(0.14, 0.2, 0.26, 10), silver, core, 1.36, 1.44, 0.3, PI / 2); add(C(0.11, 0.11, 0.03, 10), red, core, 1.36, 1.44, 0.44, PI / 2);  // searchlight
            for (const a of [e.armL, e.armR]) {
                add(SP(0.4, 12, 8), dark, a, 0, 0.2, 0); add(C(0.57, 0.57, 0.16, 16), hazard, a, 0, -1.4, 0); add(C(0.3, 0.3, 0.06, 12), dark, a, 0, -1.47, 0);
                for (const y of [-0.85, -1.08]) add(T(0.49, 0.035, 16), hazard, a, 0, y, 0, PI / 2);
                add(B(0.3, 0.5, 0.4), hazard, a, 0, -0.45, -0.52);
            }
            for (const l of [e.legL, e.legR]) {
                for (const s of [-1, 1]) add(C(0.05, 0.05, 0.72, 6), silver, l, s * 0.28, -0.5, -0.42);
                for (const k of [-1, 0, 1]) add(B(0.24, 0.18, 0.32), dark, l, k * 0.34, -1.1, 0.84);
                add(B(0.5, 0.26, 0.3), dark, l, 0, -1.0, -0.62);
            }
        } else {
            add(B(0.05, 0.26, 0.5), hazard, core, 0, 0.42, -0.42, 0.35);                                                                         // dorsal fin
            for (const s of [-1, 1]) {
                add(B(0.5, 0.04, 0.32), silver, core, s * 1.52, -0.05, -0.2); add(B(0.06, 0.07, 0.32), red, core, s * 1.78, -0.05, -0.2);       // winglet + lit tip
                add(C(0.04, 0.04, 0.62, 6), silver, core, s * 0.1, -0.42, 0.72, PI / 2);                                                       // twin guns
                add(CO(0.16, 0.3, 10), red, core, s * 1.22, -0.05, -0.66, -PI / 2);                                                            // exhaust
            }
            for (let k = 0; k < 6; k++) { const a = k * PI / 3 + PI / 6; add(B(0.09, 0.05, 0.09), red, core, Math.sin(a) * 0.98, 0.14, Math.cos(a) * 0.98); }   // rim lights
        }
    }
    return { dress };
})();
