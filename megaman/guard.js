// =====================================================================
//  AXON BREACH — SABER GUARD (the Guard button / key U)
//   Hold it: the hero draws the saber, brings it up across his body in both hands and a hexagonal energy shield
//   snaps open in front of him. While it is up every hit is blocked.
//   • costs energy: a little while it is held, more for each blocked hit; at zero the guard breaks for a moment
//   • a hit blocked in the first quarter second is a PARRY: free, with a bigger flash
//   • he walks slowly behind the shield, and cannot cut, shoot or dash without lowering it
//  game.js calls tick() every frame and block() when the hero is hit; hero-anim.js poses the body from
//  P.blocking / P.guardK. Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonGuard = (function () {
    const RAISE = 0.2, LOWER = 0.12, READY = 0.55;   // seconds to open / close · how far open before it protects
    const HOLD_COST = 5, HIT_COST = 0.45, MIN_HIT = 4, PARRY = 0.25, BREAK = 1.3, WALK = 4.2;
    const back = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   // overshoot: the shield snaps open

    // the shield: a hexagonal plate of light with a bright rim and a turning inner ring, carried in front of the chest
    function shield(P) {
        const THREE = window.THREE;
        if (P._gs && P._gs.g.parent === P.mesh) return P._gs;
        const mat = (op) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const g = new THREE.Group(), plate = new THREE.Mesh(new THREE.CircleGeometry(1.25, 6), mat(0.16)),
            rim = new THREE.Mesh(new THREE.RingGeometry(1.17, 1.3, 6), mat(0.9)), ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 6), mat(0.55));
        ring.position.z = 0.02; g.add(plate, rim, ring);
        g.position.set(0, 1.75, 1.05); g.visible = false; g.traverse(o => { o.frustumCulled = false; });
        P.mesh.add(g);
        return (P._gs = { g, plate, rim, ring, mats: [plate.material, rim.material, ring.material] });
    }

    // every frame. Input: game.js input state · f: effects (audio, shock, sparks, shake, stop)
    function tick(P, dt, Input, f) {
        if (P.guardBreak > 0) P.guardBreak -= dt;
        if (P.guardHit > 0) P.guardHit -= dt;
        const want = Input.isHeld('Guard') && !P.dead && P.isGrounded && !P.isDashing && !P.ledge && !P.diving && !(P.slashTimer > 0) && !(P.guardBreak > 0) && (P.blocking ? P.energy > 0 : P.energy >= 8);
        if (want && !P.blocking) {
            P.blocking = true; P.guardT = 0;
            f.audio.playShieldUp(); f.shock(P.mesh.position.clone().setY(P.mesh.position.y + 0.06), P.mats.glow.color.getHex(), 2.4);
        } else if (!want && P.blocking) P.blocking = false;
        const k0 = P.guardK || 0;
        P.guardK = P.blocking ? Math.min(1, k0 + dt / RAISE) : Math.max(0, k0 - dt / LOWER);
        if (P.blocking) {
            P.guardT += dt; P.spend(HOLD_COST * dt); P.charge = 0;
            Input.pressed.Attack = false; Input.pressed.Shoot = false;            // the saber is busy
            const hs = Math.hypot(P.velocity.x, P.velocity.z);
            if (hs > WALK) { P.velocity.x *= WALK / hs; P.velocity.z *= WALK / hs; }   // a slow walk behind the shield
        }
        if (!(P.guardK > 0) && !P._gs) return;
        const S = shield(P), k = P.guardK, hit = Math.max(0, P.guardHit || 0) / 0.18, col = P.mats.glow.color;
        S.g.visible = k > 0.01; if (!S.g.visible) return;
        S.g.scale.setScalar(Math.max(0.001, P.blocking ? back(k) : k) * (1 + 0.12 * hit));
        S.g.rotation.z = (1 - k) * 1.6;                                           // it spins open
        S.ring.rotation.z -= dt * 1.8;
        const pulse = 0.5 + 0.5 * Math.sin((P.guardT || 0) * 7);
        S.mats.forEach(m => m.color.copy(col));
        S.plate.material.opacity = (0.14 + 0.05 * pulse + 0.45 * hit) * k;
        S.rim.material.opacity = (0.75 + 0.25 * hit) * k; S.ring.material.opacity = (0.4 + 0.2 * pulse + 0.4 * hit) * k;
    }

    // the hero was hit for `amount`: true = the guard took it
    function block(P, amount, f) {
        if (!P.blocking || !(P.guardK >= READY)) return false;
        const parry = P.guardT < PARRY, at = P.mesh.position.clone(), fw = P.mesh.rotation.y;
        at.x += Math.sin(fw) * 1.05; at.z += Math.cos(fw) * 1.05; at.y += 1.75;
        P.guardHit = 0.18; P.invincibleTimer = Math.max(P.invincibleTimer || 0, 0.12);
        f.audio.playShieldBlock(); f.sparks(at, parry ? 0xffffff : P.mats.glow.color.getHex(), parry ? 16 : 8, parry ? 12 : 8);
        if (parry) { f.shock(P.mesh.position.clone().setY(P.mesh.position.y + 0.06), 0xffffff, 4.2); f.shake(0.2); f.stop(0.05); }
        else { f.shake(0.1); P.spend(Math.max(MIN_HIT, amount * HIT_COST)); }
        if (P.energy <= 0) { P.blocking = false; P.guardBreak = BREAK; f.audio.playDeny(); f.shake(0.3); }   // out of energy: the guard breaks
        return true;
    }

    return { tick, block };
})();
