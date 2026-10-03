// =====================================================================
//  AXON BREACH — Cyber action platformer (Three.js r128)
//  game.js — all game logic. Used by index.html (same folder).
// =====================================================================
'use strict';

async function initCyberGame() {
    if (typeof THREE === 'undefined') { setTimeout(initCyberGame, 100); return; }
    if (window.__axonStarted) return;
    window.__axonStarted = true;

    const $ = id => document.getElementById(id);
    const SK = window.AxonSkills || { has: () => false }, TRN = window.AxonTraining, CHT = window.AxonCheats || { on: () => false }, GRD = window.AxonGuard || { tick() { }, block: () => false };   // moves learned in the HQ training wing (training.js)
    const UI = window.AxonUI, T = window.AxonI18n.t, MP = window.AxonCoop;   // MP: co-op hooks (coop.js) — plain single player when no room is open
    const tick = (p, label) => { UI && UI.setProgress(p, label); return new Promise(r => requestAnimationFrame(() => r())); };
    let uiReady = false;
    const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const damp = (a, b, k, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const store = {
        get(k, d) { try { const v = localStorage.getItem('axon.' + k); return v === null ? d : v; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem('axon.' + k, v); } catch (e) { /* storage unavailable */ } }
    };

    // ==========================================
    // ==========================================
    const stage = $('stage');
    const View = {
        mode: store.get('orient', 'auto'),   // auto | landscape | portrait
        rotated: false, W: window.innerWidth, H: window.innerHeight,
        listeners: [],
        toLocal(cx, cy) {
            return this.rotated ? { x: cy, y: window.innerWidth - cx } : { x: cx, y: cy };
        },
        apply() {
            const sw = window.innerWidth, sh = window.innerHeight;
            const portrait = sh > sw;
            this.rotated = (this.mode === 'landscape' && portrait) || (this.mode === 'portrait' && !portrait);
            if (this.rotated) {
                this.W = sh; this.H = sw;
                stage.style.width = sh + 'px'; stage.style.height = sw + 'px';
                stage.style.transform = `translateX(${sw}px) rotate(90deg)`;
            } else {
                this.W = sw; this.H = sh;
                stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
                stage.style.transform = 'none';
            }
            stage.classList.toggle('is-portrait', this.H > this.W);
            this.listeners.forEach(fn => fn(this.W, this.H));
        }
    };
    View.apply();
    window.addEventListener('resize', () => View.apply());
    window.addEventListener('orientationchange', () => setTimeout(() => View.apply(), 120));

    function localRect(el) {
        let x = 0, y = 0, e = el;
        while (e && e !== stage) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
        return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    }

    // ==========================================
    // 1. Procedural Audio
    // ==========================================
    const AudioSys = window.AxonAudio.AudioSys;
    const Music = window.AxonAudio.makeMusic(store).watchVisibility().keepAlive(); window.AxonMusic = Music;
    const UP = window.AxonShop.stats;   // upgrade multipliers bought in the ARMORY (shop.js)
    const BAL = {
        shot: { dmg: 10, cost: 4, cool: 0.16 }, mid: { dmg: 24, cost: 10 }, big: { dmg: 48, cost: 22 },
        dashCost: 20, regen: 18, regenDelay: 0.9, hurtInvuln: 0.8,
        touch: { drone: 7, runner: 9, heavy: 15 }, lvlDmg: 0.1
    };

    // ==========================================
    // ==========================================
    const Input = {
        held: {}, pressed: {}, released: {},
        down(a) { AudioSys.init(); if (!this.held[a]) this.pressed[a] = true; this.held[a] = true; },
        up(a) { if (this.held[a]) this.released[a] = true; this.held[a] = false; },
        just(a) { const s = this.pressed[a]; this.pressed[a] = false; return !!s; },
        justReleased(a) { const s = this.released[a]; this.released[a] = false; return !!s; },
        isHeld(a) { return !!this.held[a]; },
        flush() { this.pressed = {}; this.released = {}; }
    };

    const KEYMAP = { Space: 'Jump', ShiftLeft: 'Dash', ShiftRight: 'Dash', KeyJ: 'Attack', KeyK: 'Shoot', KeyL: 'Lock', Tab: 'Lock', KeyU: 'Guard' };
    const MOVEKEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
    const keysDown = new Set();
    window.addEventListener('keydown', e => {
        if (e.code === 'Enter' && uiReady && overlayAction) { overlayAction(); return; }
        if (MOVEKEYS[e.code]) { keysDown.add(e.code); e.preventDefault(); }
        const a = KEYMAP[e.code];
        if (a) { e.preventDefault(); if (!e.repeat) Input.down(a); }
    });
    window.addEventListener('keyup', e => {
        keysDown.delete(e.code);
        const a = KEYMAP[e.code]; if (a) Input.up(a);
    });
    window.addEventListener('blur', () => { keysDown.clear(); Object.keys(Input.held).forEach(a => Input.up(a)); });

    const joy = { active: false, dx: 0, dy: 0, id: null, cx: 0, cy: 0, r: 1 };
    const zone = $('joystick-zone'), base = $('joy-base'), handle = $('joystick-handle');
    function moveJoy(e) {
        const p = View.toLocal(e.clientX, e.clientY);
        let dx = p.x - joy.cx, dy = p.y - joy.cy;
        const d = Math.hypot(dx, dy);
        if (d > joy.r) { dx = dx / d * joy.r; dy = dy / d * joy.r; }
        handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        let m = Math.min(1, d / joy.r);
        m = m < 0.12 ? 0 : (m - 0.12) / 0.88;
        const a = Math.atan2(dy, dx);
        joy.dx = Math.cos(a) * m; joy.dy = Math.sin(a) * m;
    }
    function endJoy(e) {
        if (e.pointerId !== joy.id) return;
        joy.id = null; joy.active = false; joy.dx = joy.dy = 0;
        handle.style.transform = 'translate(-50%, -50%)';
        base.style.left = base.style.top = base.style.bottom = '';
        base.classList.remove('live');
    }
    zone.addEventListener('pointerdown', e => {
        if (joy.id !== null) return;
        e.preventDefault(); AudioSys.init();
        joy.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (err) { }
        const z = localRect(zone), p = View.toLocal(e.clientX, e.clientY);
        const bw = base.offsetWidth;
        const lx = clamp(p.x - z.x, bw / 2, z.w - bw / 2), ly = clamp(p.y - z.y, bw / 2, z.h - bw / 2);
        base.style.left = (lx - bw / 2) + 'px'; base.style.top = (ly - bw / 2) + 'px'; base.style.bottom = 'auto';
        base.classList.add('live');
        joy.cx = z.x + lx; joy.cy = z.y + ly; joy.r = bw / 2;
        joy.active = true; moveJoy(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
    zone.addEventListener('pointerup', endJoy);
    zone.addEventListener('pointercancel', endJoy);

    function getMove() {
        if (joy.active) return { x: joy.dx, y: joy.dy, active: (joy.dx !== 0 || joy.dy !== 0) };
        let x = 0, y = 0;
        keysDown.forEach(k => { const v = MOVEKEYS[k]; if (v) { x += v[0]; y += v[1]; } });
        const l = Math.hypot(x, y);
        if (l > 0) { x /= l; y /= l; }
        return { x, y, active: l > 0 };
    }

    document.querySelectorAll('[data-action]').forEach(btn => {
        const a = btn.dataset.action;
        btn.addEventListener('pointerdown', e => {
            e.preventDefault();
            try { btn.setPointerCapture(e.pointerId); } catch (err) { }
            btn.classList.add('on'); Input.down(a);
        });
        const release = () => { btn.classList.remove('on'); Input.up(a); };
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
    });
    stage.addEventListener('contextmenu', e => e.preventDefault());

    await tick(64, T('load_gfx'));
    // ==========================================
    // ==========================================
    const FOG = 0x061222;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.FogExp2(FOG, 0.011);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.info.autoReset = false;   // draw-call counter covers every pass of a frame (shadow, scene, bloom); reset per frame below
    renderer.shadowMap.type = isCoarse ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;   // phones: the cheaper 4-tap filter
    stage.insertBefore(renderer.domElement, stage.firstChild);

    const { hemi, dirLight } = window.AxonSurf.lights(scene, renderer);   // reflections + hemisphere / ambient / sun (surfaces.js)

    const { makeCanvas, SURF } = window.AxonSurf;   // painted floor / wall / door textures (surfaces.js)
    const texCache = new Map();
    function surfaceTex(kind, which, rx, ry) {
        rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
        const key = kind + which + rx + 'x' + ry;
        if (!texCache.has(key)) {
            const t = new THREE.CanvasTexture(SURF[kind][which]);
            t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
            t.anisotropy = Math.min(isCoarse ? 4 : 8, renderer.capabilities.getMaxAnisotropy());   // phones: 4× is plenty, 8× costs memory bandwidth
            if (which === 'map') t.encoding = THREE.sRGBEncoding;
            texCache.set(key, t);
        }
        return texCache.get(key);
    }
    const spriteTex = new THREE.CanvasTexture(makeCanvas((g, S) => {
        const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(160,240,255,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }));

    // ==========================================
    // ==========================================
    const platforms = [];
    let motes = null;
    const glowMat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o });

    const PERF = window.AxonPerf, batcher = new PERF.WorldBatcher(scene);
    const blockMat = (kind, p = '') => new THREE.MeshStandardMaterial({
        map: surfaceTex(p + kind, 'map', 1, 1), emissiveMap: surfaceTex(p + kind, 'emi', 1, 1),
        emissive: 0xffffff, emissiveIntensity: kind === 'door' ? 1.0 : kind === 'floor' ? 0.45 : 0.75,
        roughness: kind === 'floor' ? 0.35 : 0.5, metalness: kind === 'floor' ? 0.7 : 0.55, envMapIntensity: 0.9
    });
    function createFacilityBlock(x, y, z, w, h, d, isFloor = false, isDoor = false) {
        const kind = isDoor ? 'door' : isFloor ? 'floor' : 'wall';
        const rx = isFloor ? w / 6 : Math.max(w, d) / 8, ry = isFloor ? d / 6 : h / 8;
        solids.push(new THREE.Box3(new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)));
        if (!batcher.done) { batcher.addBlock(kind, x, y, z, w, h, d, Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)), isDoor ? 0xffa826 : isFloor ? 0x6a4424 : 0x2c120a); return null; }
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
            map: surfaceTex('m' + kind, 'map', rx, ry), emissiveMap: surfaceTex('m' + kind, 'emi', rx, ry),
            emissive: 0xffffff, emissiveIntensity: isDoor ? 1.0 : isFloor ? 0.45 : 0.75,
            roughness: isFloor ? 0.35 : 0.5, metalness: isFloor ? 0.7 : 0.55, envMapIntensity: 0.9
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true; mesh.castShadow = !isFloor;
        const edgeColor = isDoor ? 0xffa826 : isFloor ? 0x6a4424 : 0x2c120a;
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.85 })));
        mesh.updateMatrixWorld(true);
        scene.add(mesh); platforms.push(mesh);
        return mesh;
    }

    const solids = [];
    const { moveBody, spotBlocked, freeSpot } = window.AxonPerf.physics(solids);   // box physics with a broadphase grid (perf.js)

    function decorStrip(x, y, z, w, h, d, color) {
        if (!batcher.done) { batcher.addStrip(color, x, y, z, w, h, d); return null; }
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowMat(color));
        m.position.set(x, y, z); scene.add(m); return m;
    }

    function arenaEmblem(z, color, y = 0) {
        const g = new THREE.Group(); g.position.set(0, y + 0.03, z); g.rotation.x = -Math.PI / 2; scene.add(g);
        const m = glowMat(color, 0.55); m.depthWrite = false;
        g.add(new THREE.Mesh(new THREE.RingGeometry(7.6, 8.0, 6), m));
        g.add(new THREE.Mesh(new THREE.RingGeometry(5.2, 5.35, 48), m));
        arenaLights.push({ x: 0, y: y + 12, z, color });
    }
    const arenaLights = [], roamLight = new THREE.PointLight(0x39d7ff, 1.4, 60, 2);
    scene.add(roamLight);
    function updateRoamLight(p) {
        let best = null, bd = Infinity;
        for (const a of arenaLights) { const d = (a.z - p.z) * (a.z - p.z) + (a.y - p.y) * (a.y - p.y); if (d < bd) { bd = d; best = a; } }
        if (best && best !== roamLight.userData.cur) { roamLight.userData.cur = best; roamLight.position.set(best.x, best.y, best.z); roamLight.color.setHex(best.color); }
    }

    function buildWorld() {
        const layout = MP.seeded(() => window.AxonLevel.generate(api));   // co-op: the same world on every device
        platforms.push(...batcher.finish({ floor: blockMat('floor', 'm'), wall: blockMat('wall', 'm'), door: blockMat('door', 'm') }));
        motes = window.AxonSurf.motes(scene, layout, isCoarse ? 450 : 900, spriteTex);   // rising data motes, animated on the GPU
        return layout;
    }

    // ==========================================
    // ==========================================
    const fx = [];
    function addFx(o) { fx.push(o); if (o.mesh) scene.add(o.mesh); return o; }
    const sparkPool = new window.AxonPerf.SparkPool(scene);
    function spawnSparks(pos, color, n = 14, speed = 14) { sparkPool.spawn(pos, color, n, speed); }
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 40);
    const fxPool = new window.AxonPerf.FxPool(scene);
    function spawnShockwave(pos, color, size = 6) {
        const m = fxPool.get(ringGeo, color, { side: THREE.DoubleSide });
        m.position.copy(pos); m.rotation.x = -Math.PI / 2;
        addFx({ mesh: m, life: 0.45, max: 0.45, update(f) { const k = 1 - f.life / f.max; f.mesh.scale.setScalar(0.5 + k * size); f.mesh.material.opacity = 1 - k; } });
    }
    const flashGeo = new THREE.SphereGeometry(1, 14, 10);
    function spawnFlash(pos, color, size = 1, life = 0.15) {
        if (isCoarse) size *= 0.75;   // phones: additive flashes fill a lot of screen right where the GPU is busiest
        const m = fxPool.get(flashGeo, color);
        m.position.copy(pos); m.scale.setScalar(size * 0.4);
        addFx({ mesh: m, life, max: life, update(f) { const k = 1 - f.life / f.max; f.mesh.scale.setScalar(size * (0.4 + k)); f.mesh.material.opacity = 1 - k; } });
    }
    // what a hit does to an enemy (squash, knock-back, stagger) and the white cut across it: impact.js
    const { hitReact, hitTick, contact, meleeImpact, cutGeo } = window.AxonImpact.create({ THREE, MP, moveBody: (...a) => moveBody(...a), fxPool, addFx, spawnSparks, camera: () => cameraSystem.camera, player: () => player });
    function updateFx(dt) {
        sparkPool.update(dt);
        for (let i = fx.length - 1; i >= 0; i--) {
            const f = fx[i]; f.life -= dt;
            if (f.life <= 0) {
                if (f.mesh) { if (f.mesh.userData.pooled) fxPool.put(f.mesh); else if (f.mesh.userData.ghost) f.mesh.visible = false; else { scene.remove(f.mesh); if (f.mesh.material && f.mesh.material.dispose) f.mesh.material.dispose(); } }
                if (f.done) f.done();
                fx.splice(i, 1);
            } else f.update(f, dt);
        }
    }

    // ==========================================
    // 6. Enemies
    // ==========================================
    const enemies = [], enemyShots = [];
    // buster shots, charging effects and enemy plasma (shots.js)
    const SHOTS = window.AxonShots.create({ THREE, scene, spawnSparks: (...a) => spawnSparks(...a) });
    const orbGeo = SHOTS.enemy.geo, orbMat = SHOTS.enemy.core, orbHaloMat = SHOTS.enemy.halo;
    let killCount = 0;

    const api = {
        THREE, scene, rand, spotBlocked, moveBody, enemies, enemyShots, orbGeo, orbMat, orbHaloMat, AudioSys, orbMesh: () => { PERF.mark('enemy shot'); return SHOTS.enemyMesh(); },
        spawnFlash: (...a) => spawnFlash(...a), spawnSparks: (...a) => spawnSparks(...a), spawnShockwave: (...a) => spawnShockwave(...a),
        createFacilityBlock, decorStrip, arenaEmblem, solids, freeSpot, toast: m => toast(m), tip: id => UI.tip(id), playerPos: () => player.mesh.position,
        shake: a => cameraSystem.shake(a), hitStop: t => { hitStop = Math.max(hitStop, t); },
        onKill: e => { PERF.mark('kill'); killCount++; if (!e.noReward && MP.reward(e)) window.AxonShop.reward(e); },   // expedition aliens pay nothing: the prize is at the end
        camera: () => cameraSystem.camera, View, stage, lowShadow: isCoarse,
        onBossDown: () => { bossDown = true; setTimeout(() => endGame('clear'), 1800); }
    };
    api.Enemy = MP.wrapEnemy(window.AxonLevel.makeEnemy(api));
    let bossDown = false;

    // ==========================================
    // ==========================================
    const projectiles = [], meleeHitboxes = [];
    // a stable copy of a list that may shrink while we walk it (enemies dying), without a new array every step
    const _eA = [], _eB = []; let _eFlip = false;
    const eList = L => { const o = (_eFlip = !_eFlip) ? _eA : _eB; o.length = 0; for (let i = 0; i < L.length; i++) o.push(L[i]); return o; };

    // equipped colour scheme — only ones bought in the HQ armor studio (hub.js) count
    const ownedSkin = () => { const k = store.get('skin', 'EMBER'); let own = ['EMBER']; try { own = JSON.parse(store.get('skinsOwned', 'null')) || [k, 'EMBER']; } catch (e) { } return own.includes(k) ? k : 'EMBER'; };


    const LOCK_ACQUIRE = 50, LOCK_KEEP = 60;
    const _snd = new THREE.Vector3();
    const panOf = p => { const cam = cameraSystem.camera, v = _snd.copy(p).applyMatrix4(cam.matrixWorldInverse); return clamp(v.x / Math.max(4, -v.z), -1, 1); };   // screen side for stereo

    const _S = { f: new THREE.Vector3(), r: new THREE.Vector3(), m: new THREE.Vector3(), t: new THREE.Vector3(), v: new THREE.Vector3(), d: new THREE.Vector3(), w: new THREE.Vector3(), p: new THREE.Vector3(), c1: new THREE.Vector3(), c2: new THREE.Vector3(), c3: new THREE.Vector3(), c4: new THREE.Vector3(), c5: new THREE.Vector3(), c6: new THREE.Vector3(), l1: new THREE.Vector3(), l2: new THREE.Vector3(), a: new THREE.Vector3() };   // per-frame scratch vectors
    const _MASS = { drone: 0.6, runner: 1, heavy: 3, boss: 60 };
    class Player {
        constructor() {
            this.mesh = new THREE.Group(); this.mesh.position.set(0, 5, 0); scene.add(this.mesh);
            window.AxonHero.build(this, store.get('hero', 'a')); this.compact();

            // target rings
            this.lockedEnemy = null; this.attentionEnemy = null;
            const rg = new THREE.TorusGeometry(2, 0.08, 8, 40);
            this.lockRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
            this.attentionRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x39d7ff, transparent: true, opacity: 0.35 }));
            [this.lockRing, this.attentionRing].forEach(r => { r.rotation.x = Math.PI / 2; r.visible = false; scene.add(r); });

            // state
            this.velocity = new THREE.Vector3(); this.gravity = -58; this.speed = 15; this.jumpForce = 20.5;
            this.isGrounded = false; this.jumpCount = 0; this.isDashing = false; this.dashSpeed = 42; this.dashTimer = 0;
            this.dashDir = new THREE.Vector3(); this.airDashUsed = false; this.dashJump = false;
            this.coyote = 0; this.jumpBuffer = 0; this.lungeTimer = 0;
            this.enDelay = 0; this.shieldT = 0; this.hp = 100; this.maxHp = 100; this.energy = 100; this.maxEnergy = 100; this.attackCooldown = 0; this.shotCooldown = 0; this.invincibleTimer = 0;
            this.recoilTimer = 0; this.aimTimer = 0; this.slashTimer = 0; this.slashSide = 1; this.charge = 0;
            this.hurtTimer = 0; this.ghostTimer = 0; this.dead = false;
            this.losRaycaster = new THREE.Raycaster();
            this.lastSafePos = new THREE.Vector3(0, 5, 0);
            this.body = { r: 0.5, h: 3.15 };
            this.lockLost = 0; this.scanTimer = 0;
            // ninja moveset state
            this.comboStep = -1; this.comboWindow = 0; this.comboQueued = false; this.slashKind = 'h1'; this.slashDur = 0.28;
            this.pendingHits = []; this.airSlashUsed = false; this.wallSlide = 0; this.wallN = new THREE.Vector3();
            this.flipT = 0; this.rollT = 0; this.wallJumpT = 0; this.stepT = 0; this.skidT = 0; this.lookTarget = null; this.combatTarget = null; this.stanceScan = 0; this.lockManual = false; this.autoLockPaused = false; this.pauseClear = 0; this.cycleSet = null; this.localF = 1; this.localS = 0; this.headYaw = 0; this.headPitch = 0; this.aimPitch = 0;

            this.look = window.AxonHero.loadLook();   // free appearance from the HQ bio-lab (skin, eyes, hair)
            this.applySkin(ownedSkin());
        }

        setFade(k) {
            if (!this.fadeMats) {
                const set = new Set();
                this.mesh.traverse(o => { if (o.isMesh && o.material && !o.material.transparent) set.add(o.material); });
                this.fadeMats = [...set]; this.fade = 1;
            }
            k = k > 0.97 ? 1 : k;
            if (Math.abs(k - this.fade) < 0.01) return;
            const wasOpaque = this.fade >= 1, opaque = k >= 1;
            this.fade = k;
            for (const m of this.fadeMats) {
                m.opacity = k;
                if (wasOpaque !== opaque) { m.transparent = !opaque; m.depthWrite = opaque; m.needsUpdate = true; }
            }
        }

        compact() {
            const M = this.mats, keep = new Set([M.pearl, M.steel, M.trim, M.accent, M.glow, M.skin, M.hair]);
            // joints that animate on their own stay separate; everything static inside each one is merged per material
            const live = new Set([this.torso, this.chest, this.headGroup, this.armL, this.armR, this.elbowL, this.elbowR, this.legL, this.legR, this.kneeL, this.kneeR, this.footL, this.footR,
                this.sword, this.chargeOrb, this.muzzle, this.coreGem, this.mouth, this.mouthOpen, this.mouthClosed, ...this.vanes, ...this.thrusters, ...this.scarf.flat()]);
            this.eyes.forEach(e => { live.add(e); const u = e.userData; [u.lid, u.lidSkin, u.lash, u.iris, u.brow].forEach(o => o && live.add(o)); });
            window.AxonPerf.skinRig(this.mesh, o => live.has(o), m => keep.has(m.material));   // whole body: one skinned mesh per material
            if (this.mesh.parent) this.buildGhosts();
        }

        setBody(type) {
            while (this.mesh.children.length) this.mesh.remove(this.mesh.children[0]);
            this.fadeMats = null; this.fade = 1; this._feet = null; this._stepSide = undefined;
            window.AxonHero.build(this, type); this.compact();
            this.applySkin(this.skin || ownedSkin()); bladeSize(this);
            store.set('hero', this.bodyType);
            showHeroName();
        }

        applySkin(key) { window.AxonHero.applySkin(this, key); }

        hasLineOfSight(enemy) {
            const start = _S.l1.copy(this.mesh.position); start.y += 1.5;
            const end = enemy.aimPoint(_S.l2);
            const t = PERF.segHit(solids, start, end);
            return t < 0 || t * start.distanceTo(end) >= start.distanceTo(end) - 0.1;
        }

        viewDir(cs) {
            const v = _S.v.set(0, 0, -1).applyQuaternion(cs.camera.quaternion); v.y = 0; return v.normalize();
        }

        targetCandidates(cs, maxDist, minDot = -1) {
            const vd = this.viewDir(cs), out = [];
            for (const e of enemies) {
                if (e.isDead) continue;
                const d = _S.d.subVectors(e.mesh.position, this.mesh.position);
                const dist = d.length(); if (dist > maxDist) continue;
                d.y = 0; d.normalize();
                const dot = vd.dot(d); if (dot < minDot) continue;
                if (!cs.frustum.containsPoint(e.aimPoint(_S.a))) continue;
                if (!this.hasLineOfSight(e)) continue;
                out.push({ e, s: dist + (1 - dot) * 18 });
            }
            return out.sort((a, b) => a.s - b.s).map(o => o.e);
        }

        updateTargeting(cs, dt, time) {
            if (Input.just('Lock')) {
                const cur = this.lockedEnemy && !this.lockedEnemy.isDead ? this.lockedEnemy : null;
                const list = this.visibleAround(cs, LOCK_KEEP);
                if (!cur) {
                    this.lockedEnemy = list[0] ? list[0].e : null; this.lockManual = !!this.lockedEnemy; this.autoLockPaused = false; this.cycleSet = null;
                } else {
                    if (!this.cycleSet) this.cycleSet = new Set([cur]);
                    const sorted = list.slice().sort((x, y) => x.a - y.a);
                    const idx = sorted.findIndex(o => o.e === cur);
                    const next = sorted.length ? sorted[(idx + 1) % sorted.length].e : null;
                    if (next && next !== cur && !this.cycleSet.has(next)) { this.lockedEnemy = next; this.lockManual = true; this.cycleSet.add(next); }
                    else { this.lockedEnemy = null; this.lockManual = false; this.autoLockPaused = true; this.pauseClear = 0; this.cycleSet = null; }   // unfocus
                }
                this.lockLost = 0; AudioSys.playLock();
            }
            const L = this.lockedEnemy;
            if (L && !L.isDead) {
                const ok = this.mesh.position.distanceTo(L.mesh.position) < LOCK_KEEP && this.hasLineOfSight(L);
                this.lockLost = ok ? 0 : this.lockLost + dt;
                if (this.lockLost > 1.2) { this.lockedEnemy = null; this.lockLost = 0; this.lockManual = false; }   // hidden too long
            }
            this.scanTimer -= dt;
            if (this.lockedEnemy) this.attentionEnemy = null;
            else if (this.scanTimer <= 0) {
                this.scanTimer = 0.1;
                const prev = this.attentionEnemy;
                let near = this.nearbyVisible(14);
                if (prev && !prev.isDead && near && near !== prev) {
                    const dp = this.mesh.position.distanceTo(prev.mesh.position), dn = this.mesh.position.distanceTo(near.mesh.position);
                    if (dp < 14 && dn > dp * 0.75 && this.hasLineOfSight(prev)) near = prev;
                }
                const keep = prev && !prev.isDead && this.mesh.position.distanceTo(prev.mesh.position) < 26 && this.hasLineOfSight(prev) ? prev : null;
                this.attentionEnemy = near || keep || this.targetCandidates(cs, 26, 0.45)[0] || null;
            }
            if (this.attentionEnemy && this.attentionEnemy.isDead) this.attentionEnemy = null;

            const lk = this.lockedEnemy, at = this.attentionEnemy;
            this.lockRing.visible = !!lk; this.attentionRing.visible = !lk && !!at;
            if (lk) {
                lk.aimPoint(this.lockRing.position); this.lockRing.position.y -= 1.0;
                this.lockRing.rotation.z -= 5 * dt; this.lockRing.scale.setScalar(1 + Math.sin(time * 10) * 0.08);
                this.lockRing.material.opacity = this.lockLost > 0 ? 0.35 : 0.9;
            } else if (at) {
                at.aimPoint(this.attentionRing.position); this.attentionRing.position.y -= 1.0;
                this.attentionRing.rotation.z -= 2 * dt;
            }
        }

        updateStance(dt) {
            if (this.lockedEnemy && this.lockedEnemy.isDead) { this.lockedEnemy = null; this.lockManual = false; this.lockLost = 0; }
            if (this.autoLockPaused) {
                this.pauseClear = this.nearbyVisible(LOCK_KEEP) ? 0 : (this.pauseClear || 0) + dt;
                if (this.pauseClear > 1) this.autoLockPaused = false;
            }
            this.stanceScan -= dt;
            if (!this.autoLockPaused && this.stanceScan <= 0) {
                this.stanceScan = 0.2;
                const n = this.nearbyVisible(LOCK_ACQUIRE);
                const cur = this.lockedEnemy;
                if (!cur) { if (n) { this.lockedEnemy = n; this.lockManual = false; this.lockLost = 0; this.cycleSet = null; } }
                else if (!this.lockManual && n && n !== cur &&
                    this.mesh.position.distanceTo(n.mesh.position) < this.mesh.position.distanceTo(cur.mesh.position) * 0.5) { this.lockedEnemy = n; this.cycleSet = null; }   // a much closer threat takes over
            }
            this.combatTarget = this.lockedEnemy && !this.lockedEnemy.isDead ? this.lockedEnemy : null;
        }

        visibleAround(cs, maxDist) {
            const vd = this.viewDir(cs), out = [];
            for (const e of enemies) {
                if (e.isDead) continue;
                const d = _S.d.subVectors(e.mesh.position, this.mesh.position);
                const dist = d.length(); if (dist > maxDist || !this.hasLineOfSight(e)) continue;
                d.y = 0; d.normalize();
                const a = Math.atan2(vd.x * d.z - vd.z * d.x, vd.x * d.x + vd.z * d.z);   // + = to the right on screen
                out.push({ e, a, s: dist + Math.abs(a) * 6 });
            }
            return out.sort((x, y) => x.s - y.s);
        }

        nearbyVisible(maxDist) {
            let best = null, bestS = Infinity;
            const fwd = _S.w.set(0, 0, 1).applyEuler(this.mesh.rotation);
            for (const e of enemies) {
                if (e.isDead) continue;
                const d = _S.d.subVectors(e.mesh.position, this.mesh.position);
                const dist = d.length(); if (dist > maxDist) continue;
                d.y = 0; d.normalize();
                const sc = dist * (1 + (1 - fwd.dot(d)) * 0.15);   // slight preference for what's in front of him
                if (sc < bestS && this.hasLineOfSight(e)) { bestS = sc; best = e; }
            }
            return best;
        }

        activeTarget() {
            if (this.lockedEnemy && !this.lockedEnemy.isDead) return this.lockedEnemy;
            if (this.attentionEnemy && !this.attentionEnemy.isDead) return this.attentionEnemy;
            return null;
        }

        faceTowards(dirX, dirZ, rate, dt) {
            const want = Math.atan2(dirX, dirZ);
            let diff = want - this.mesh.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            let y = this.mesh.rotation.y + diff * Math.min(1, rate * dt);
            y = Math.atan2(Math.sin(y), Math.cos(y));
            this.mesh.rotation.set(0, y, 0);
        }

        // METEOR DIVE (training.js): the logic lives with the rest of the training wing
        startDive() { TRN.dive.start(this, DIVE_FX); }
        diveImpact() { TRN.dive.impact(this, DIVE_FX); }

        doJump(force, kind = 'jump') {
            this.velocity.y = force; this.isGrounded = false; this.coyote = 0; this.jumpBuffer = 0;
            AudioSys.playJump(kind);
        }

        stepPhysics(dt) {
            const wasGrounded = this.isGrounded, fallSpeed = this.velocity.y;
            const res = moveBody(this.mesh.position, this.velocity, dt, this.body.r, 0, this.body.h, wasGrounded ? 0.45 : 0.15, true);
            this.isGrounded = res.grounded; this.lastRes = res;
            if (res.grounded) {
                if (this.diving) { this.diving = false; if (!wasGrounded) this.diveImpact(); }
                const hs = Math.hypot(this.velocity.x, this.velocity.z);
                if (!wasGrounded && fallSpeed < -26 && hs > 9 && this.slashTimer <= 0) { this.rollT = 0.4; AudioSys.playRoll(); }   // ninja roll
                else if (!wasGrounded && fallSpeed < -8) { this.landT = clamp(-fallSpeed / 40, 0.08, 0.2); AudioSys.playLand((-fallSpeed - 8) / 32); }
                else if (!wasGrounded && fallSpeed < -3) AudioSys.playLand(0);
                if (!wasGrounded) { this.airSlashUsed = false; this.flipT = 0; this.wallSlide = 0; }
                if (!wasGrounded && fallSpeed < -24) spawnShockwave(this.mesh.position.clone().setY(this.mesh.position.y + 0.05), 0x39d7ff, 2.2);
                this.jumpCount = 0; this.airDashUsed = false; this.dashJump = false; this.coyote = 0.1;
                if (!this.isDashing) this.lastSafePos.copy(this.mesh.position).setY(this.mesh.position.y + 0.5);
            } else if (wasGrounded && this.jumpCount === 0) this.jumpCount = 1;   // walked off a ledge: keep the air jump
            if (this.mesh.position.y < -30) { this.diving = false; this.takeDamage(20, true); this.mesh.position.copy(this.lastSafePos); this.velocity.set(0, 0, 0); }
        }

        findLedge(n) {
            const p = this.mesh.position, R = this.body.r, qx = p.x - n.x * (R + 0.35), qz = p.z - n.z * (R + 0.35);
            let best = null;
            for (const s of solids) {
                if (qx < s.min.x || qx > s.max.x || qz < s.min.z || qz > s.max.z) continue;
                const top = s.max.y, rise = top - p.y;
                if (rise < 0.8 || rise > 3.4 || (best && top < best.top)) continue;
                const sx = p.x - n.x * (R + 0.7), sz = p.z - n.z * (R + 0.7);
                if (spotBlocked(qx, qz, 0.3, top + 0.05, top + 2.9) || spotBlocked(sx, sz, R * 0.9, top + 0.05, top + 3.0)) continue;
                best = { top, to: new THREE.Vector3(sx, top + 0.02, sz) };
            }
            return best;
        }
        // ledge: grab → hang a moment with both hands on the edge → pull up, knee over the edge, step onto the top.
        // The body follows one smooth path (rise first, then forward over the lip); the poses for it are in hero-anim.js,
        // which reads this.ledge.phase / .t / .dur. Facing turns to the wall smoothly instead of snapping.
        updateLedge(dt, moveDir, mag) {
            const L = this.ledge, p = this.mesh.position;
            L.t += dt; this.velocity.set(0, 0, 0); this.wallSlide = 0;
            if (L.yaw !== undefined) { let d = L.yaw - this.mesh.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.mesh.rotation.y += d * Math.min(1, dt * 18); }
            if (L.phase === 'hang') {
                if (L.grabY === undefined) L.grabY = p.y;
                const hy = Math.max(L.top - 2.7, Math.min(L.grabY, L.top - 2.15));   // hang where he caught it (never dropped down); deepest = straight arms
                p.y += (hy - p.y) * Math.min(1, dt * 14);
                if (mag > 0.3 && moveDir.dot(L.n) > 0.55) { this.ledge = null; this.velocity.set(L.n.x * 6, 2, L.n.z * 6); return; }   // let go
                if (L.t > 0.2 || this.jumpBuffer > 0) { L.phase = 'up'; L.t = 0; L.from = p.clone(); L.dur = 0.32 + 0.07 * Math.max(0, L.to.y - p.y); this.jumpBuffer = 0; AudioSys.playJump('climb'); }
            } else {
                const k = Math.min(1, L.t / L.dur), sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
                const up = sm(k / 0.7), fw = sm((k - 0.45) / 0.55);   // pull up first, then over the lip
                p.y = L.from.y + (L.to.y - L.from.y) * up;
                p.x = L.from.x + (L.to.x - L.from.x) * fw;
                p.z = L.from.z + (L.to.z - L.from.z) * fw;
                if (k >= 1) { p.copy(L.to); this.ledge = null; this.isGrounded = true; this.jumpCount = 0; this.airDashUsed = false; this.wallSlide = 0; this.lastSafePos.copy(p).setY(p.y + 0.5); }
            }
        }

        update(dt, cs, time, move) {
            const forward = _S.f.set(0, 0, -1).applyQuaternion(cs.camera.quaternion); forward.y = 0; forward.normalize();
            const right = _S.r.set(1, 0, 0).applyQuaternion(cs.camera.quaternion); right.y = 0; right.normalize();
            const moveDir = _S.m.set(0, 0, 0);
            if (move.active) moveDir.addScaledVector(forward, -move.y).addScaledVector(right, move.x);
            const mag = Math.min(1, moveDir.length());
            if (mag > 0) moveDir.normalize();
            if (this.ledge) {
                if (Input.just('Jump')) this.jumpBuffer = 0.14; else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
                if (this.rollT > 0) this.rollT -= dt;
                this.updateLedge(dt, moveDir, mag); this.updateProceduralAnimation(dt, time, false); return;
            }

            this.updateTargeting(cs, dt, time);
            this.updateStance(dt);

            ['attackCooldown', 'shotCooldown', 'invincibleTimer', 'recoilTimer', 'aimTimer', 'slashTimer', 'hurtTimer', 'coyote', 'jumpBuffer', 'lungeTimer', 'shieldT', 'comboWindow', 'flipT', 'rollT', 'wallSlide', 'wallJumpT', 'skidT']
                .forEach(k => { if (this[k] > 0) this[k] -= dt; });
            GRD.tick(this, dt, Input, DIVE_FX);
            if (Input.just('Jump')) this.jumpBuffer = 0.14;
            if (Input.justReleased('Jump') && this.velocity.y > 0 && !this.isDashing) this.velocity.y *= 0.5;   // short hop

            if (Input.just('Dash') && this.energy >= BAL.dashCost && !this.isDashing && (this.isGrounded || !this.airDashUsed)) {
                if (!this.isGrounded) this.airDashUsed = true;
                this.isDashing = true; this.dashTimer = 0.22; this.spend(BAL.dashCost); AudioSys.playDash();
                this.dashDir.copy(mag > 0 ? moveDir : new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation));
                this.dashDir.y = 0; this.dashDir.normalize();
                spawnShockwave(this.mesh.position.clone().setY(this.mesh.position.y + 0.05), this.mats.glow.color.getHex(), 2.5);
            }

            if (this.isDashing) {
                this.dashTimer -= dt;
                if (mag > 0) this.dashDir.lerp(moveDir, Math.min(1, 6 * dt)).normalize();   // slight steering
                this.velocity.set(this.dashDir.x * this.dashSpeed, 0, this.dashDir.z * this.dashSpeed);
                this.ghostTimer -= dt;
                if (this.ghostTimer <= 0) { this.spawnGhost(); this.ghostTimer = 0.035; }
                if (this.jumpBuffer > 0 && (this.isGrounded || this.coyote > 0)) {
                    this.isDashing = false; this.dashJump = true; this.jumpCount = 1; this.doJump(this.jumpForce);
                } else if (this.dashTimer <= 0) {
                    this.isDashing = false;
                    this.velocity.x = this.dashDir.x * this.speed; this.velocity.z = this.dashDir.z * this.speed;
                }
            }
            if (!this.isDashing) {
                let stance = 1;
                if (this.combatTarget && mag > 0) {
                    const f = moveDir.dot(_S.w.set(0, 0, 1).applyEuler(this.mesh.rotation));
                    stance = f < -0.35 ? 0.78 : f < 0.35 ? 0.9 : 1;
                }
                const top = this.speed * (this.dashJump ? 1.6 : 1) * mag * stance;
                const tx = moveDir.x * top, tz = moveDir.z * top;
                const acc = (this.lungeTimer > 0 ? 0 : this.isGrounded ? (mag > 0 ? 120 : 90) : 55) * (this.slashTimer > 0 && this.isGrounded ? (mag > 0 ? 0.3 : 2.5) : 1) * (this.wallJumpT > 0 ? 0.25 : 1);
                const dx = tx - this.velocity.x, dz = tz - this.velocity.z, dl = Math.hypot(dx, dz), step = acc * dt;
                if (dl <= step) { this.velocity.x = tx; this.velocity.z = tz; }
                else { this.velocity.x += dx / dl * step; this.velocity.z += dz / dl * step; }

                this.velocity.y += this.gravity * (this.velocity.y < 0 ? 1.25 : 1) * dt;
                this.velocity.y = Math.max(this.velocity.y, -48);
                if (this.wallSlide > 0 && !this.isGrounded) {
                    const n = this.wallN, away = mag > 0.2 && moveDir.dot(n) > 0.3;
                    if (away) this.wallSlide = 0;   // pushing off the wall: let go
                    else {
                        const vn = this.velocity.x * n.x + this.velocity.z * n.z;   // keep pressed to the wall so the contact never flickers
                        if (vn > -2) { this.velocity.x -= n.x * (2 + vn); this.velocity.z -= n.z * (2 + vn); }
                        const slide = this.wallPush ? -4 : -6.5;   // holding toward the wall grips harder
                        if (this.velocity.y < slide) this.velocity.y += (slide - this.velocity.y) * Math.min(1, dt * 12);   // the fall eases into the slide (no hard stop)
                    }
                }

                if (this.jumpBuffer > 0) {
                    if (this.isGrounded || this.coyote > 0) { this.jumpCount = 1; this.doJump(this.jumpForce); }
                    else if (this.wallSlide > 0) {
                        const n = this.wallN;
                        this.velocity.x = n.x * 15; this.velocity.z = n.z * 15;
                        this.jumpCount = 1; this.airDashUsed = false; this.airSlashUsed = false; this.wallSlide = 0; this.wallJumpT = 0.32;
                        this.mesh.rotation.y = Math.atan2(n.x, n.z);
                        this.doJump(this.jumpForce * 0.95, 'wall');
                        spawnSparks(this.mesh.position.clone().addScaledVector(n, -0.5).setY(this.mesh.position.y + 1.4), 0xbfefff, 10, 8);
                    } else if (this.jumpCount < 2) {
                        this.jumpCount = 2; this.doJump(this.jumpForce, 'flip'); this.flipT = 0.46;   // double jump = front flip
                        spawnShockwave(this.mesh.position.clone(), 0x39d7ff, 2);
                    } else if (TRN && SK.has('dive') && !this.diving) this.startDive();   // METEOR DIVE: a third press in the air
                }
            }

            if (this.slashTimer > 0 || this.comboWindow > 0) PERF.holdOff(this.mesh.position, this.velocity, this.body.r, enemies, 0.8, (e, nx, nz, pen) => {   // swing from a blade's length, not from inside the enemy
                const v = Math.min(pen * 30, 11);   // eased out, never a jump
                if (e.type !== 'boss') moveBody(e.mesh.position, _S.p.set(-nx * v, 0, -nz * v), dt, e.body.r, e.body.off, e.body.h, 0.3, false);
            });
            if (this.diving) TRN.dive.tick(this, dt, DIVE_FX);
            this.stepPhysics(dt);
            this.collideEnemies(dt);
            const r = this.lastRes || {};
            // wall contact while airborne: grab a ledge if there is one, otherwise slide down the wall —
            // any time he touches it while falling (holding toward it only makes the grip slower)
            if (!this.isGrounded && !this.isDashing && !this.diving && (r.wx || r.wz)) {
                const n = new THREE.Vector3(r.wx || 0, 0, r.wz || 0).normalize(), into = mag > 0.2 ? moveDir.dot(n) : 0;
                const lg = mag > 0.2 && into < -0.25 && this.findLedge(n);
                if (lg) {   // grab the edge instead of sliding down the wall
                    this.ledge = { phase: 'hang', t: 0, top: lg.top, to: lg.to, n, yaw: Math.atan2(-n.x, -n.z) }; this.velocity.set(0, 0, 0);
                    this.flipT = 0; this.rollT = 0; this.wallJumpT = 0; this.wallSlide = 0;
                    spawnSparks(this.mesh.position.clone().addScaledVector(n, -0.5).setY(lg.top), 0xbfefff, 6, 4); AudioSys.playLedge();
                } else if (this.velocity.y < 1 && into < 0.3 && this.wallJumpT <= 0) {
                    if (this.wallSlide <= 0) { spawnSparks(this.mesh.position.clone().addScaledVector(n, -0.5).setY(this.mesh.position.y + 1.2), 0xbfefff, 6, 5); AudioSys.playWallSlide(); }
                    this.wallSlide = 0.2; this.wallN.copy(n); this.wallPush = into < -0.25;
                }
            }
            if (this.wallSlide > 0 && !this.isGrounded && !this.ledge && (this._wsFx = (this._wsFx || 0) - dt) <= 0) {   // friction sparks along the wall
                this._wsFx = 0.09;
                spawnSparks(this.mesh.position.clone().addScaledVector(this.wallN, -0.45).setY(this.mesh.position.y + 2.3), 0xbfefff, 2, 2);
            }
            if (this.isGrounded) {
                const hs = Math.hypot(this.velocity.x, this.velocity.z);
                if (hs > 7 && (this.stepT -= dt) <= 0) { this.stepT = 2.3 / hs; spawnShockwave(this.mesh.position.clone().setY(this.mesh.position.y + 0.04), 0x6fb8d8, 0.8); }
                if (hs > 9 && mag > 0.5 && (this.velocity.x * moveDir.x + this.velocity.z * moveDir.z) / hs < -0.3 && this.skidT <= 0) {
                    this.skidT = 0.3; AudioSys.playSkid(); spawnSparks(this.mesh.position.clone().setY(this.mesh.position.y + 0.1), 0xffd27a, 8, 6);
                }
            }

            const act = this.activeTarget();
            const attacking = this.aimTimer > 0 || this.charge > 0.05 || this.slashTimer > 0;
            const faceT = this.lockedEnemy || (attacking ? act : null);
            const toT = t => _S.t.subVectors(t.mesh.position, this.mesh.position);
            const ct = this.combatTarget && !this.combatTarget.isDead ? this.combatTarget : null;
            if (ct) { const d = toT(ct); if (d.x * d.x + d.z * d.z > 0.04) this.faceTowards(d.x, d.z, 20, dt); }
            else if (this.isDashing) this.faceTowards(this.dashDir.x, this.dashDir.z, 30, dt);
            else if (faceT) { const d = toT(faceT); if (d.x * d.x + d.z * d.z > 0.04) this.faceTowards(d.x, d.z, 22, dt); }
            else if (mag > 0.1) this.faceTowards(moveDir.x, moveDir.z, 18, dt);
            else if (act && this.isGrounded) { const d = toT(act); if (Math.hypot(d.x, d.z) < 12) this.faceTowards(d.x, d.z, 6, dt); }
            this.lookTarget = act;
            if (this.wallSlide > 0 && !this.isGrounded && !ct && !faceT) this.faceTowards(-this.wallN.x, -this.wallN.z, 14, dt);   // sliding: face the wall, hand on it

            if (this.slashTimer <= 0) this.sword.visible = false;

            // melee
            if (Input.just('Attack')) {
                if (this.slashTimer > 0) this.comboQueued = true;   // buffered: chains at the end of this cut
                else if (this.attackCooldown <= 0) this.meleeAttack();
            }
            if (this.comboQueued && this.slashTimer > 0 && this.slashTimer < this.slashDur * 0.3) { this.comboQueued = false; this.meleeAttack(true); }
            if (this.slashTimer <= 0 && this.comboQueued) { this.comboQueued = false; this.meleeAttack(true); }
            for (let i = this.pendingHits.length - 1; i >= 0; i--) {
                const h = this.pendingHits[i];
                if ((h.t -= dt) > 0) continue;
                this.pendingHits.splice(i, 1);
                const fw = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
                const pos = this.mesh.position.clone().addScaledVector(fw, h.fwd); pos.y += h.y;
                meleeHitboxes.push({ pos, life: 0.1, damage: Math.round(h.dmg * UP.meleeMul), extra: h.extra + UP.meleeExtra, stop: h.stop, hit: new Set() });
                if (h.ring) {   // cyclone: a ring of light sweeps out at each turn
                    const g = this.mesh.position.clone(); g.y += 0.06;
                    spawnShockwave(g, this.mats.glow.color.getHex(), h.ring); spawnSparks(pos, 0x9df3ff, 8, 10);
                    if (h.ring >= 6) { cameraSystem.shake(0.3); AudioSys.playExplode(); }
                }
                if (h.slam) {
                    const g = this.mesh.position.clone().addScaledVector(fw, 1.8); g.y += 0.06;
                    spawnShockwave(g, this.mats.glow.color.getHex(), 5); spawnSparks(g, 0xffd27a, 16, 12); cameraSystem.shake(0.35); AudioSys.playExplode();
                }
            }

            if (Input.just('Shoot') && this.shotCooldown <= 0) {
                if (this.energy >= BAL.shot.cost) { this.shoot(0); this.spend(BAL.shot.cost); this.shotCooldown = BAL.shot.cool * UP.fireMul; }
                else this.noEnergy();
            }
            if (Input.isHeld('Shoot')) {
                const before = this.charge; this.charge = Math.min(1.4, this.charge + dt);
                if (before < 0.16 && this.charge >= 0.16 && !this.chgSnd) this.chgSnd = AudioSys.sample('gun', 0.5, 1 / UP.chargeMul);   // buster spinning up
                if (before < 0.45 * UP.chargeMul && this.charge >= 0.45 * UP.chargeMul) AudioSys.playCharge();
                if (before < 0.9 * UP.chargeMul && this.charge >= 0.9 * UP.chargeMul) AudioSys.playChargeFull();
            }
            if (Input.justReleased('Shoot')) {
                if (this.chgSnd) { this.chgSnd.stop(); this.chgSnd = null; }
                if (this.charge >= 0.9 * UP.chargeMul && this.energy >= BAL.big.cost) { this.shoot(2); this.spend(BAL.big.cost); }
                else if (this.charge >= 0.45 * UP.chargeMul && this.energy >= BAL.mid.cost) { this.shoot(1); this.spend(BAL.mid.cost); }
                else if (this.charge >= 0.45 * UP.chargeMul) this.noEnergy();
                this.charge = 0;
            }

            if (this.enDelay > 0) this.enDelay -= dt;
            else if (this.energy < this.maxEnergy && !this.isDashing) this.energy = Math.min(this.maxEnergy, this.energy + BAL.regen * UP.regenMul * dt);
            this.checkEnemyCollisions();
            {
                const hv = Math.hypot(this.velocity.x, this.velocity.z);
                if (hv > 0.5) {
                    const ry = this.mesh.rotation.y, vx = this.velocity.x / hv, vz = this.velocity.z / hv;
                    this.localF = damp(this.localF, vx * Math.sin(ry) + vz * Math.cos(ry), 12, dt);
                    this.localS = damp(this.localS, vx * Math.cos(ry) - vz * Math.sin(ry), 12, dt);
                }
            }
            this.updateProceduralAnimation(dt, time, mag > 0.1 && Math.hypot(this.velocity.x, this.velocity.z) > 2);
            SHOTS.charge(this, dt, time, UP.chargeMul);   // charge aura, motes, armour flash, HUD level (after the pose is set)
        }

        buildGhosts() {
            (this.ghosts || []).forEach(g => { scene.remove(g.root); g.mat.dispose(); });
            const src = []; this.mesh.traverse(o => src.push(o));
            this.ghosts = []; this.ghostI = 0;
            for (let i = 0, n = isCoarse ? 3 : 7; i < n; i++) {   // each afterimage is a full copy of the hero: phones keep 3
                const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
                mat.skinning = true;
                const root = this.mesh.clone(true), dst = []; root.traverse(o => { dst.push(o); if (o.isMesh) { o.material = mat; o.castShadow = false; } });
                window.AxonPerf.rebindClone(src, dst);   // each afterimage poses with its own joints
                root.visible = false; root.userData.ghost = true; scene.add(root);
                this.ghosts.push({ root, mat, dst });
            }
            this.ghostSrc = src;
        }
        spawnGhost() {
            if (!this.ghosts) return;
            const g = this.ghosts[this.ghostI = (this.ghostI + 1) % this.ghosts.length], src = this.ghostSrc;
            for (let i = 0; i < src.length && i < g.dst.length; i++) { const a = src[i], b = g.dst[i]; b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); if (i) b.visible = a.visible; }
            g.root.visible = true; g.mat.color.copy(this.mats.glow.color);
            const mat = g.mat;
            addFx({ mesh: g.root, life: 0.24, max: 0.24, update(f) { mat.opacity = 0.4 * f.life / f.max; } });
        }

        updateProceduralAnimation(dt, time, isMoving) { window.AxonHero.animate(this, dt, time, isMoving); }

        collideEnemies(dt) {
            const pos = this.mesh.position, R = this.body.r, top = pos.y + this.body.h;
            const MASS = _MASS;
            const push = _S.p.set(0, 0, 0);
            for (const e of enemies) {
                if (e.isDead || !e.body) continue;
                const b = e.body, ep = e.mesh.position, ey0 = ep.y + b.off, ey1 = ey0 + b.h;
                const dx = pos.x - ep.x, dz = pos.z - ep.z, d = Math.hypot(dx, dz), min = R + b.r;
                if (d >= min || top <= ey0 || pos.y >= ey1) continue;
                if (this.velocity.y < 0 && pos.y > ey1 - 0.7 && d < min * 0.9) {
                    pos.y = ey1; this.velocity.y = 15; this.jumpCount = 1; this.airDashUsed = false; this.airSlashUsed = false;
                    spawnShockwave(pos.clone().setY(ey1 + 0.05), 0x39d7ff, 2); AudioSys.playStomp();
                    if (e.type !== 'boss') e.takeDamage(6, pos.clone());
                    continue;
                }
                const nx = d > 1e-4 ? dx / d : Math.sin(this.mesh.rotation.y + Math.PI), nz = d > 1e-4 ? dz / d : Math.cos(this.mesh.rotation.y + Math.PI);
                const pen = min - d, m = MASS[e.type] || 1, kP = m / (1 + m), kE = 1 / (1 + m);
                push.set(nx * pen * kP / dt, 0, nz * pen * kP / dt);
                moveBody(pos, push, dt, R, 0, this.body.h, 0.3, false);
                if (e.type !== 'boss') { push.set(-nx * pen * kE / dt, 0, -nz * pen * kE / dt); moveBody(ep, push, dt, b.r, b.off, b.h, 0.3, false); }
                const vn = -(this.velocity.x * nx + this.velocity.z * nz);
                if (vn > 0) { this.velocity.x += nx * vn; this.velocity.z += nz * vn; }
            }
        }

        meleeAttack(chained = false) {
            const air = !this.isGrounded && !this.airSlashUsed;
            let kind;
            if (air) { kind = 'air'; this.airSlashUsed = true; this.velocity.y = Math.max(this.velocity.y, 5); }
            else {
                // CYCLONE EDGE (learned in the training wing): a 4th hit after the finisher
                this.comboStep = (chained || this.comboWindow > 0) ? (this.comboStep + 1) % (SK.has('cyclone') ? 4 : 3) : 0;
                kind = ['h1', 'h2', 'fin', 'spin'][this.comboStep];
            }
            const D = { h1: 0.28, h2: 0.28, fin: 0.44, air: 0.38, spin: 0.62 }[kind];
            this.slashKind = kind; this.slashDur = D; this.slashTimer = D; this.slashSide *= -1;
            this.comboWindow = D + 0.35; this.attackCooldown = 0.06;
            this.sword.visible = true; AudioSys.playSwing(kind === 'spin' ? 'air' : kind);
            let aim = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
            const t = this.activeTarget();
            let dist = Infinity;
            if (t) {
                aim.subVectors(t.mesh.position, this.mesh.position); aim.y = 0; dist = aim.length(); aim.normalize();
                this.mesh.rotation.y = Math.atan2(aim.x, aim.z);
            }
            // no lunge and no hop: during a cut the hero only moves if the stick moves him
            const hits = {
                h1: [{ t: D * 0.35, dmg: 14, fwd: 2.2, y: 1.6, extra: 0.35, stop: 0.045 }],
                h2: [{ t: D * 0.4, dmg: 16, fwd: 2.2, y: 2.0, extra: 0.45, stop: 0.05 }],
                fin: [{ t: D * 0.55, dmg: 30, fwd: 2.4, y: 1.2, extra: 0.9, stop: 0.09, slam: true }],
                air: [{ t: D * 0.3, dmg: 12, fwd: 0, y: 1.6, extra: 0.9, stop: 0.03 }, { t: D * 0.72, dmg: 12, fwd: 0, y: 1.6, extra: 0.9, stop: 0.03 }],
                // two turns: three sweeps all around you (fwd 0 + a wide reach), the last one the heaviest
                spin: [{ t: D * 0.3, dmg: 14, fwd: 0, y: 1.5, extra: 2.0, stop: 0.03, ring: 4 }, { t: D * 0.55, dmg: 14, fwd: 0, y: 1.5, extra: 2.0, stop: 0.03, ring: 4.6 }, { t: D * 0.8, dmg: 24, fwd: 0, y: 1.5, extra: 2.4, stop: 0.08, ring: 6 }]
            }[kind];
            this.pendingHits.push(...hits.map(h => ({ ...h })));
        }

        shoot(tier) {
            window.AxonLevel.noise(this.mesh.position, tier ? 30 : 22);   // gunfire gives your position away
            const charged = tier === 2, mid = tier === 1;
            this.aimTimer = 0.45; this.recoilTimer = 0.08;
            const t = this.activeTarget();
            let pitch = 0;
            if (t) {
                const d = t.aimPoint().sub(this.mesh.position);
                this.mesh.rotation.y = Math.atan2(d.x, d.z);
                const sh = this.mesh.position.clone(); sh.y += 2.48;
                const e = t.aimPoint().sub(sh);
                pitch = clamp(Math.atan2(e.y, Math.hypot(e.x, e.z)), -0.8, 1.0);
            }
            this.aimPitch = pitch;
            this.armR.rotation.set(-Math.PI / 2 - pitch - this.torso.rotation.x, -(this.torso.rotation.y + this.chest.rotation.y), 0.08);
            this.elbowR.rotation.x = 0;   // straighten the elbow so the barrel lines up with the arm
            this.mesh.updateMatrixWorld(true);
            const spawn = new THREE.Vector3(); this.muzzle.getWorldPosition(spawn);
            let aim;
            if (t) aim = t.aimPoint().sub(spawn).normalize();
            else {
                const q = new THREE.Quaternion(); this.elbowR.getWorldQuaternion(q);
                aim = new THREE.Vector3(0, -1, 0).applyQuaternion(q).normalize();
            }

            const m = SHOTS.shot(tier, spawn, aim);
            projectiles.push({ mesh: m, tier, dir: aim, life: 1.4, damage: Math.round((charged ? BAL.big.dmg : mid ? BAL.mid.dmg : BAL.shot.dmg) * UP.shotMul), crit: charged, pierce: charged, hit: new Set(), speed: charged ? 55 : 65, spT: 0 });
            SHOTS.burst(spawn, aim, tier, 'muzzle'); MP.fx(spawn, aim, tier); PERF.mark('shoot');
            if (charged) { AudioSys.playBigShot(); cameraSystem.shake(0.25); } else if (mid) { AudioSys.playBigShot(); } else AudioSys.playShoot();
        }

        spend(n) { if (CHT.on('en')) return; this.energy = Math.max(0, this.energy - n); this.enDelay = BAL.regenDelay; }
        noEnergy() {   // dry fire: the bar flashes red, a dull click
            if (this._dryT && performance.now() - this._dryT < 250) return;
            this._dryT = performance.now(); AudioSys.playTone('square', 140, 90, 0.07, 0.05); UI.tip('energy');
            const b = $('energy-bar').parentNode; b.classList.remove('dry'); requestAnimationFrame(() => b.classList.add('dry'));   // restart without forcing a layout
        }

        takeDamage(amount, force = false) {
            if (this.dead || CHT.on('hp')) return;   // cheat: unlimited health
            if (!force && (this.invincibleTimer > 0 || this.isDashing || GRD.block(this, amount, DIVE_FX))) return;   // saber guard (guard.js)
            if (this.shieldT > 0) { if (!force) { spawnSparks(this.mesh.position.clone().setY(this.mesh.position.y + 1.6), 0xc9a7ff, 8, 8); AudioSys.playShieldBlock(); return; } }
            PERF.mark('hurt'); this._hurtAt = performance.now(); this.hp -= amount; this.invincibleTimer = BAL.hurtInvuln; this.hurtTimer = 0.12; this.lastHurt = amount;
            resetCombo(); AudioSys.playHurt(); cameraSystem.shake(0.35); if (this.hp < this.maxHp * 0.7) UI.tip('dodge');
            const fl = $('damage-flash'); fl.style.opacity = 1; setTimeout(() => { fl.style.opacity = 0; }, 180);
            if (this.hp <= 0) {
                this.hp = 0; this.dead = true;
                const p = this.mesh.position.clone(); p.y += 1.3;
                spawnFlash(p, 0xffc070, 3, 0.4); spawnSparks(p, 0xffa826, 30, 18); spawnShockwave(this.mesh.position.clone(), 0xffa826, 10);
                AudioSys.playExplode(); AudioSys.playDeath();
                this.mesh.visible = false;
                setTimeout(() => MP.died() || endGame('over'), 700);   // co-op: back up next to the team instead
            }
        }

        checkEnemyCollisions() {
            const c = _S.c6.copy(this.mesh.position); c.y += 1.3;   // scratch vector: no garbage every step
            for (const e of enemies) if (c.distanceTo(e.aimPoint(_S.a)) < (e.touchR ?? (e.type === 'heavy' ? 2.5 : 1.8))) this.takeDamage(Math.round((BAL.touch[e.type] || 10) * (1 + BAL.lvlDmg * (e.lvl || 0))));
        }
    }

    // ==========================================
    // 8. Camera
    // ==========================================
    const { CameraSystem, ZOOM_MIN, ZOOM_MAX } = window.AxonCamera.make({ solids, View, store });   // camera.js


    // ==========================================
    // 9. Combat, combo, HUD
    // ==========================================
    let comboCounter = 0, comboTimer = 0, hitStop = 0;
    const comboEl = $('combo'), comboCount = $('combo-count');
    function addCombo() {
        comboCounter++; comboTimer = 3;
        comboCount.textContent = comboCounter; comboEl.classList.remove('idle');
        comboCount.style.transform = 'scale(1.35)'; setTimeout(() => { comboCount.style.transform = 'scale(1)'; }, 90);
    }
    function resetCombo() { comboCounter = 0; comboCount.textContent = '0'; comboEl.classList.add('idle'); }

    const _pv = new THREE.Vector3(), _pv2 = new THREE.Vector3();
    function updateCombat(dt) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            const step = p.speed * dt;
            const nx = _pv.copy(p.mesh.position).addScaledVector(p.dir, step);
            const th = PERF.segHit(solids, p.mesh.position, nx);
            let remove = false;
            if (th >= 0) {
                p.mesh.position.lerp(nx, th); remove = true;
                SHOTS.burst(p.mesh.position, p.dir, p.tier, 'wall');
                AudioSys.playRicochet(panOf(p.mesh.position), p.mesh.position.distanceTo(player.mesh.position));
            } else p.mesh.position.copy(nx);
            if (p.tier && (p.spT -= dt) <= 0) { p.spT = p.tier === 2 ? 0.03 : 0.07; spawnSparks(p.mesh.position, p.tier === 2 ? 0xc9b8ff : 0x9dfff0, p.tier === 2 ? 3 : 1, 4); }   // charged shots shed sparkles
            p.life -= dt;
            if (!remove && !p.ghost) for (const e of enemies) {
                if (p.hit.has(e)) continue;
                if (p.mesh.position.distanceTo(e.aimPoint(_S.a)) < e.hitRadius() + (p.pierce ? 0.8 : 0)) {
                    p.hit.add(e); const hp0 = e.hp; e.takeDamage(p.damage, p.mesh.position.clone(), p.crit); if (e.hp < hp0) hitReact(e, p.dir.x, p.dir.z, p.crit ? 0.55 : 0.3); addCombo(); AudioSys.playShotHit(p.crit, panOf(p.mesh.position));
                    SHOTS.burst(p.mesh.position, p.dir, p.tier, 'hit');
                    if (!p.pierce) { remove = true; break; }
                }
            }
            if (remove || p.life <= 0) { SHOTS.free(p.mesh); projectiles.splice(i, 1); }
        }

        for (let i = meleeHitboxes.length - 1; i >= 0; i--) {
            const hb = meleeHitboxes[i]; hb.life -= dt;
            for (const e of eList(enemies)) {
                if (hb.hit.has(e)) continue;
                if (hb.pos.distanceTo(e.aimPoint(_S.a)) < (e.meleeR || (e.type === 'heavy' ? 3.6 : 3.0)) + (hb.extra || 0)) {
                    hb.hit.add(e); const hp0 = e.hp, at = contact(e); e.takeDamage(hb.damage, at, hb.stop > 0.06); if (e.hp < hp0) meleeImpact(e, at, hb.stop > 0.06); addCombo(); PERF.mark('saber hit'); AudioSys.playSaberHit(hb.stop > 0.06, panOf(hb.pos));
                    hitStop = Math.max(hitStop, hb.stop || 0.045); cameraSystem.shake(hb.stop > 0.06 ? 0.3 : 0.15);
                }
            }
            if (hb.life <= 0) meleeHitboxes.splice(i, 1);
        }

        const pc = _pv2.copy(player.mesh.position); pc.y += 1.3;
        for (let i = enemyShots.length - 1; i >= 0; i--) {
            const s = enemyShots[i]; const step = 16 * dt;
            let remove = PERF.segHit(solids, s.mesh.position, _pv.copy(s.mesh.position).addScaledVector(s.dir, step)) >= 0;
            s.mesh.position.addScaledVector(s.dir, step); s.life -= dt;
            SHOTS.updateEnemy(s, dt, SHOTS.time);
            if (remove) SHOTS.burst(s.mesh.position, s.dir, 0, 'enemy');
            if (!remove && s.mesh.position.distanceTo(pc) < 1.1) {
                remove = true;
                if (!player.isDashing) { player.takeDamage(s.dmg || 8); SHOTS.burst(s.mesh.position, s.dir, 0, 'enemy'); }
            }
            if (remove || s.life <= 0) { SHOTS.freeEnemy(s.mesh); enemyShots.splice(i, 1); }
        }

        if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) resetCombo(); }
    }

    const lockBtn = $('btn-lock');
    const hpBar = $('hp-bar'), enBar = $('energy-bar'), chBar = $('charge-bar'), chWrap = $('charge-wrap'), tgtEl = $('target-count');
    const _hk = [NaN, 0, 0, 0, 0, 0, 0];   // last HUD values drawn
    const bossBar = $('boss-bar'), bossFill = $('boss-fill'), stageEl = $('stage-label'), toastEl = $('toast');
    let toastT = 0, zoneT = 0, lastStage = -1;
    function toast(msg) { PERF.mark('toast'); toastEl.textContent = msg; toastEl.classList.add('show'); toastT = 2.2; }
    function updateProgress(dt) {
        bossBar.hidden = !boss.active || (boss.isDead && bossDown);
        if (boss.active) { bossFill.style.transform = `scaleX(${Math.max(0, boss.hp) / boss.maxHp})`; bossBar.classList.toggle('p2', boss.phase === 2); }
        if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show');
        if ((zoneT -= dt) > 0) return; zoneT = 0.4;
        const pz = player.mesh.position.z, zone = minimap.stageAt(pz);
        if (zone && zone.stage !== lastStage) {
            lastStage = zone.stage;
            stageEl.textContent = zone.kind === 'boss' ? T('final') : T('stage', Math.max(1, zone.stage), layout.stages);
        }
        for (const z of layout.zones) {
            if (z.rewarded || (z.kind !== 'arena' && z.kind !== 'corridor') || pz > z.z0 || pz < z.z1) continue;
            const left = enemies.some(e => e.type !== 'boss' && e.mesh.position.z <= z.z0 && e.mesh.position.z >= z.z1 && Math.abs(e.mesh.position.x) <= z.x1 + 1);
            if (!left) {
                z.rewarded = true;
                const heal = z.kind === 'arena' ? 25 : 10;
                player.hp = Math.min(player.maxHp, player.hp + heal); _hk[0] = NaN;
                window.AxonShop.add(z.kind === 'arena' ? 20 : 0, player.mesh.position.clone().setY(player.mesh.position.y + 3.2), T('clear_tag'));
                toast(z.kind === 'arena' ? `${T('zone_clear')} · +${heal} HP` : `+${heal} HP`);
                AudioSys.playChargeFull(); if (z.kind === 'arena') retreat.flash();
            }
        }
    }

    const hpNum = $('hp-num'), enNum = $('en-num');
    function updateHUD() {
        const ch = Math.min(1, player.charge / (0.9 * UP.chargeMul));
        const k = _hk, a = Math.round(player.hp), b = Math.round(player.energy), c = Math.round(ch * 50), d = outside.on ? outside.alive() : explore.on ? explore.alive() : enemies.length, e = player.lockedEnemy ? 1 : 0;
        if (k[0] === a && k[1] === b && k[2] === c && k[3] === d && k[4] === e && k[5] === player.maxHp && k[6] === player.maxEnergy) return;   // no garbage when nothing changed
        k[0] = a; k[1] = b; k[2] = c; k[3] = d; k[4] = e; k[5] = player.maxHp; k[6] = player.maxEnergy;
        hpBar.style.transform = `scaleX(${Math.max(0, player.hp) / player.maxHp})`;
        enBar.style.transform = `scaleX(${Math.max(0, player.energy) / player.maxEnergy})`;
        chBar.style.transform = `scaleX(${ch})`;
        chWrap.classList.toggle('full', ch >= 1); chWrap.classList.toggle('mid', ch >= 0.5 && ch < 1);
        hpNum.textContent = Math.max(0, Math.ceil(player.hp)); enNum.textContent = Math.floor(player.energy);
        stage.classList.toggle('low-hp', player.hp > 0 && player.hp <= player.maxHp * 0.25);
        enBar.parentNode.classList.toggle('low', player.energy < BAL.shot.cost * 3);
        tgtEl.textContent = d;
        lockBtn.classList.toggle('locked', !!player.lockedEnemy);
    }

    // ==========================================
    // 10. Build world
    // ==========================================
    await tick(74, T('load_world'));
    const pre = new Set(scene.children);
    const layout = buildWorld();
    await tick(88, T('load_enemies'));
    const boss = new (window.AxonLevel.makeBoss(api))(layout.bossCenter, layout.bossHalf);
    const minimap = new window.AxonLevel.Minimap($('minimap'), layout);
    const levelObjs = scene.children.filter(o => !pre.has(o) && !o.isLight);
    levelObjs.forEach(o => { o.userData.lazy = true; });   // the facility costs nothing while hidden in the HQ
    const arenaDir = window.AxonLevel.makeArenas(api, layout);   // lockdown waves
    const traps = window.AxonLevel.makeTraps(api, layout);   // gauntlet spikes, rollers and pits
    let bossGateClosed = false;
    function bossStart() {
        boss.activate(); UI.tip('boss');
        if (!bossGateClosed) { bossGateClosed = true; createFacilityBlock(0, layout.bossY + 5, layout.bossEntryZ, 12, 14, 2, false, true); AudioSys.playGateSlam(); }
        AudioSys.playCharge(); MP.bossStarted();
    }
    const player = new Player();
    player.onStep = v => AudioSys.playStep(v); player.onStepEnd = () => AudioSys.stopSteps();
    player.onDraw = on => on ? AudioSys.playDraw() : AudioSys.playSheath();   // saber off / onto the back (hero.js)   // footsteps timed to the animation (hero.js)
    await tick(95, T('load_hero'));
    const cameraSystem = new CameraSystem();
    window.AxonCamera.bindInput({ stage, View, AudioSys, cameraSystem });   // drag to turn, pinch / wheel / buttons to zoom (camera.js)
    const DIVE_FX = { audio: AudioSys, shock: (...a) => spawnShockwave(...a), flash: (...a) => spawnFlash(...a), sparks: (...a) => spawnSparks(...a), shake: a => cameraSystem.shake(a),
        enemies: () => eList(enemies), mul: () => UP.meleeMul, combo: () => addCombo(), stop: t => { hitStop = Math.max(hitStop, t); } };
    const hub = window.AxonHub.create({ THREE, scene, PERF, solids, blockMat, stage, AudioSys, Input, store, levelObjs, roamLight, player, cameraSystem,
        fx: { sparks: (...a) => spawnSparks(...a), shock: (...a) => spawnShockwave(...a) },
        getState: () => state, setState: v => { state = v; },
        onExit: () => MP.block() || outside.travel(true),
        onExplore: () => MP.block() || explore.travel('in'), onForge: () => forge.open(), onLook: () => biolab.open(),
        onDeploy: i => { MP.deployed(i); Music.setTrack('sounds/music1.mp3'); arenaDir.restore(player); prewarmShaders(); markRun(); state = 'countdown'; UI.countdown(goPlay, 250); lastStage = -1; zoneT = 0; _hk[0] = NaN; Input.flush(); } });
    hub.root.userData.lazy = true;   // the HQ costs nothing while you are on a mission
    hub.preview();   // the main menu shows the hero in HQ
    const impostors = new window.AxonPerf.Impostors(scene);   // far enemies: low-poly instanced stand-ins
    // the OUTER ZONE beyond the hangar door (outside.js)
    const outside = window.AxonOutside.create({ THREE, scene, PERF, solids, blockMat, stage, AudioSys, store, roamLight, dirLight, player, cameraSystem, hub, api, enemies, enemyShots,
        getState: () => state, setState: v => { state = v; }, toast: m => toast(m),
        onTravel: out => {
            Music.setTrack(out ? 'sounds/music1.mp3' : 'sounds/musichall.mp3'); _hk[0] = NaN; Input.flush(); keysDown.clear();
            if (out) { outside.showAll(); impostors.showAll(); prewarmShaders(); }   // compile everything now, behind the fade: no hitch later
        } });
    if (outside.root) outside.root.userData.lazy = true;
    // EXPLORATION: endless random worlds through the rift gate in OPERATIONS (explore.js)
    const explore = window.AxonExplore.create({ THREE, scene, PERF, solids, stage, AudioSys, store, roamLight, dirLight, player, cameraSystem, hub, api, enemies, enemyShots,
        getState: () => state, setState: v => { state = v; }, toast: m => toast(m),
        onTravel: mode => {
            Music.setTrack(mode === 'home' ? 'sounds/musichall.mp3' : 'sounds/music1.mp3'); _hk[0] = NaN; Input.flush(); keysDown.clear();
            if (mode !== 'home') { impostors.showAll(); prewarmShaders(); }   // new world: compile its shaders behind the fade
        } });
    // WEAPON FORGE: a corner of the armory wing (forge.js)
    const forge = window.AxonForge.create({ THREE, stage, AudioSys, Input, player, cameraSystem, hub, getState: () => state, setState: v => { state = v; }, toast: m => toast(m) });
    // BIO-LAB: free body / skin / eyes / hair, in the armory wing (biolab.js)
    const biolab = window.AxonBioLab.create({ THREE, stage, AudioSys, Input, player, cameraSystem, hub, getState: () => state, setState: v => { state = v; } });
    // RETURN TO HQ on the mission HUD: flashes after a sector is cleared and while HP is low (retreat.js)
    // every reload (retry, back to HQ…) goes through here: in co-op the whole team moves together
    const reloadTo = to => { if (MP.goto(to)) return; try { sessionStorage.setItem('axon.skipSplash', '1'); if (to) sessionStorage.setItem('axon.' + to, '1'); } catch (e) { } location.reload(); };
    const retreat = window.AxonRetreat.create({ stage, AudioSys, toast: m => toast(m), go: () => reloadTo('hub') });
    const clock = new THREE.Clock();

    let composer = null, bloomPass = null;
    const bloomAvailable = !!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass);
    // graphics: AUTO (default) picks a tier from the device on entry; the player can pin LO/MID/HI/ULTRA
    const QS = window.AxonPerf.Quality;
    let fxMode = store.get('fxMode', 'AUTO'); if (fxMode !== 'AUTO' && !QS.CFG[fxMode]) fxMode = 'AUTO';
    const autoTier = () => { const d = QS.detect(renderer, isCoarse), cap = store.get('fxCap', 'ULTRA');
        return QS.TIERS.indexOf(cap) >= 0 && QS.TIERS.indexOf(cap) < QS.TIERS.indexOf(d) ? cap : d; };
    let quality = fxMode === 'AUTO' ? autoTier() : fxMode;
    const GFX = new window.AxonPerf.GfxOptions(store, isCoarse, T);   // Settings → glow / shadows / resolution / character detail (perf.js)
    const bloomOn = () => GFX.bloom(QS.CFG[quality].bloom), shadowOn = () => GFX.shadow(QS.CFG[quality].shadow), resScale = () => GFX.res(dynRes.scale);
    const dynRes = new window.AxonPerf.DynRes(0.7, 1.12); let lastF = 0;

    function applyQuality(resOnly) {
        PERF.mark(resOnly ? 'resolution change' : 'quality change');
        const c = QS.CFG[quality], hi = bloomOn();
        const pr = isCoarse && quality === 'HI' ? Math.min(c.pr, 1.5) : c.pr;   // phones: HI at 1.5× — ~25 % fewer pixels, headroom for explosions
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pr) * resScale());
        dirLight.castShadow = shadowOn();
        // phones: a tighter sun frustum (±17 m around the player instead of ±28) with a 512 map keeps about the same
        // sharpness while the shadow pass draws roughly a third of the geometry — cheap enough to run every frame
        const lite = isCoarse && quality !== 'HI' && quality !== 'ULTRA', smap = lite ? 512 : c.smap, ext = lite ? 17 : 28, sc = dirLight.shadow.camera;
        if (sc.right !== ext) { Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext }); sc.updateProjectionMatrix(); }
        if (dirLight.shadow.mapSize.x !== smap) {
            dirLight.shadow.mapSize.set(smap, smap);
            if (dirLight.shadow.map) { dirLight.shadow.map.dispose(); dirLight.shadow.map = null; }
        }
        if (hi && bloomAvailable && !composer) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, cameraSystem.camera));
            bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(View.W / 2, View.H / 2), 0.65, 0.45, 0.93);
            // phones: the glow is computed at half the size (its blur chain then costs about a quarter) — a soft glow loses nothing
            if (isCoarse) { const ss = bloomPass.setSize.bind(bloomPass); bloomPass.setSize = (w, h) => ss(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
            composer.addPass(bloomPass);
        }
        if (bloomPass) bloomPass.strength = c.bloomStr || 0.65;
        const lb = $('fx-label'); lb.dataset.mode = fxMode; lb.dataset.tier = quality;
        lb.textContent = (fxMode === 'AUTO' ? 'A·' : '') + (quality === 'ULTRA' ? 'U' : quality);
        onResize(View.W, View.H);
        fpsMeter.tag = `${fxMode === 'AUTO' ? 'AUTO→' : ''}${quality}${hi && bloomAvailable ? ' · bloom ON' : ' · bloom off'}${shadowOn() ? ' · shadow ' + c.smap : ' · no shadow'} · px ${renderer.getPixelRatio().toFixed(2)}`;   // shown under the FPS line
        if (!resOnly) prewarmShaders();
    }
    const fpsMeter = new window.AxonPerf.FpsMeter(stage, renderer);
    let fpsOn = store.get('fps', '0') === '1'; fpsMeter.show(fpsOn);
    let slowT = 0;
    function autoQuality(dt) {
        // AUTO only: sustained low fps steps one tier down and remembers the ceiling for next launch
        // Modified: Now drops down to 'MIN' instead of stopping at 'LO'
        if (fxMode !== 'AUTO' || quality === 'MIN' || (state !== 'play' && state !== 'outside')) { slowT = 0; return; }
        // dynamic resolution acts first; once it is at its floor and the game still runs under ~80 % of the target, drop a tier
        const goal = Math.min(limiter.cap, window.AxonPerf.Display.hz);
        slowT = fpsMeter.fps < 35 || (dynRes.scale <= 0.71 && fpsMeter.fps < goal * 0.8) ? slowT + dt : 0;
        if (slowT > 5) { slowT = 0; quality = QS.down(quality); store.set('fxCap', quality); applyQuality(); toast('FX → ' + quality); }
    }
    function onResize(W, H) {
        cameraSystem.camera.aspect = W / H;
        cameraSystem.camera.fov = W < H ? 78 : 66;
        cameraSystem.camera.updateProjectionMatrix();
        renderer.setSize(W, H, false);
        if (composer) {
            if (composer.setPixelRatio) composer.setPixelRatio(renderer.getPixelRatio());
            composer.setSize(W, H);
        }
    }
    View.listeners.push(onResize);
    const musicBtn = $('btn-music');
    const showMusic = () => { musicBtn.classList.toggle('off', !Music.on); musicBtn.setAttribute('aria-pressed', String(Music.on)); };
    musicBtn.addEventListener('click', () => { AudioSys.init(); Music.toggle(); showMusic(); });
    showMusic();
    $('btn-fx').addEventListener('click', () => {
        AudioSys.init(); AudioSys.playLock();
        const order = ['AUTO'].concat(QS.TIERS); fxMode = order[(order.indexOf(fxMode) + 1) % order.length];
        if (fxMode === 'AUTO') store.set('fxCap', 'ULTRA');   // fresh chance for auto after a manual pick
        quality = fxMode === 'AUTO' ? autoTier() : fxMode; store.set('fxMode', fxMode); applyQuality();
    });
    fxPool.prewarm(ringGeo, 14, THREE.DoubleSide); fxPool.prewarm(flashGeo, 10); fxPool.prewarm(cutGeo, 4, THREE.DoubleSide);
    function prewarmShaders() {
        const a = fxPool.get(ringGeo, 0xffffff, { side: THREE.DoubleSide }), b = fxPool.get(flashGeo, 0xffffff);
        window.AxonHero.updateTrail(player, 0);
        player.ghosts.forEach(g => g.root.visible = true); if (player.trail) player.trail.mesh.visible = true;
        SHOTS.prewarm(true);
        try {
            if (composer && bloomOn()) renderer.setRenderTarget(composer.readBuffer);
            renderer.compile(scene, cameraSystem.camera);
        } catch (e) { console.warn('precompile', e); }
        renderer.setRenderTarget(null);
        warmGPU();
        player.ghosts.forEach(g => g.root.visible = false); fxPool.put(a); fxPool.put(b); SHOTS.prewarm(false);
    }
    // compiling shaders is not enough: the first time a mesh is drawn its geometry is uploaded to the GPU — that
    // was the burst of 50–85 ms frames when you walked toward new scenery or enemies. One off-screen draw of
    // everything in the area (hidden parts and far enemies included, no culling) does all uploads behind the fade.
    let warmRT = null;
    function warmGPU() {
        PERF.mark('gpu warm-up');
        const undo = [], show = o => { if (!o.visible) { o.visible = true; undo.push(o); } };
        scene.children.forEach(c => { if (c.visible) c.traverse(o => { show(o); if (o.frustumCulled && (o.isMesh || o.isLine || o.isPoints)) { o.frustumCulled = false; undo.push([o]); } }); });
        enemies.forEach(e => e.mesh.traverse(o => { show(o); if (o.frustumCulled) { o.frustumCulled = false; undo.push([o]); } }));
        try { renderer.setRenderTarget(warmRT || (warmRT = new THREE.WebGLRenderTarget(32, 32))); renderer.render(scene, cameraSystem.camera); } catch (e) { console.warn('warm', e); }
        renderer.setRenderTarget(null);
        undo.forEach(u => { if (Array.isArray(u)) u[0].frustumCulled = true; else u.visible = false; });
    }
    applyQuality();


    const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.9, 32, 20), new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    shieldBubble.visible = false; scene.add(shieldBubble);
    // the saber grows with its upgrade level (armory SABER EDGE / weapon forge): longer and a little thicker
    function bladeSize(P) { const H = P || player, S = window.AxonShop; if (!H.sword || !S.level) return; const k = 1 + 0.12 * S.level('saber'), t = 1 + (k - 1) * 0.5; [H.sword, H.backBlade].forEach(w => w && w.scale.set(t, k, t)); }
    window.AxonShop.init({
        toast: m => toast(m), onUse: id => { if (id === 'shield') spawnShockwave(player.mesh.position.clone().setY(player.mesh.position.y + 0.1), 0xb48cff, 4); },
        stage, AudioSys, View, player: () => player, camera: () => cameraSystem.camera,
        canOpen: () => (state === 'play' || state === 'hub' || state === 'outside') && !player.dead,   // the armory also opens in HQ
        pause: on => { if (on) { if (state !== 'shop') resumeTo = state; state = 'shop'; } else if (state === 'shop') { state = resumeTo; Input.flush(); keysDown.clear(); } },
        onUpgrade: id => { if (id === 'saber') bladeSize(); },
        refreshHud: () => { _hk[0] = NaN; }
    });
    bladeSize();

    function showHeroName() {
        const info = window.AxonHero.BUILDS[player.bodyType] || window.AxonHero.BUILDS.a;
        const id = document.querySelector('.gauge-id');
        if (id) id.innerHTML = `${info.name} <small data-i18n="${info.tagKey}">${T(info.tagKey)}</small>`;
    }
    showHeroName();

    const MODES = ['auto', 'landscape', 'portrait'];
    const LABELS = { get auto() { return T('orient_auto'); }, get landscape() { return T('orient_land'); }, get portrait() { return T('orient_port'); } };
    const orientLabel = $('orient-label');
    orientLabel.textContent = LABELS[View.mode] || LABELS.auto;
    window.AxonI18n.onChange(() => { orientLabel.textContent = LABELS[View.mode] || LABELS.auto; lastStage = -1; zoneT = 0; const z = minimap.stageAt(player.mesh.position.z); if (z) stageEl.textContent = z.kind === 'boss' ? T('final') : T('stage', Math.max(1, z.stage), layout.stages); });
    async function tryNativeLock(mode) {
        try {
            if (mode === 'auto') { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); return; }
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock(mode);
        } catch (e) { /* CSS rotation handles it */ }
        View.apply();
    }
    $('btn-orient').addEventListener('click', () => {
        AudioSys.init(); AudioSys.playLock();
        View.mode = MODES[(MODES.indexOf(View.mode) + 1) % MODES.length];
        store.set('orient', View.mode);
        orientLabel.textContent = LABELS[View.mode];
        View.apply();
        if (isCoarse) tryNativeLock(View.mode);
    });

    // ==========================================
    // ==========================================
    let state = 'title', overlayAction = null, resumeTo = 'play';
    const overlay = $('overlay');
    const totalEnemies = enemies.length;
    function showOverlay(kind, out) {
        const hqBtn = `<button class="cta" id="ov-hq" type="button" style="background:none;color:var(--cyan);border:1px solid var(--line)">${T('back_hq')}</button>`;
        const screens = {
            over: `<div class="eyebrow">${T('over_eyebrow')}</div><h1>${T('over_h')[0]} <em>${T('over_h')[1]}</em></h1>
                ${out ? `<p>${explore.on ? window.AxonExplore.S('down') : window.AxonOutside.S('down')}</p>` : `<p>${T('over_sub', killCount, totalEnemies)}</p><p style="color:#ff8aa0">${T('lost_run', runLost)}</p>`}
                <button class="cta" id="ov-btn" type="button">${out ? T('back_hq') : T('retry')}</button>${out ? '' : hqBtn}`,
            clear: `<div class="eyebrow">${T('clear_eyebrow')}</div><h1>${T('clear_h')[0]} <em>${T('clear_h')[1]}</em></h1>
                <p>${T('clear_sub', boss.name)} ${player.hp > 60 ? T('clear_good') : T('clear_hard')}</p>
                <button class="cta" id="ov-btn" type="button">${T('play_again')}</button>${hqBtn}`
        };
        overlay.innerHTML = `<div class="card">${screens[kind]}</div>`;
        overlay.hidden = false;
        const go = to => () => reloadTo(to);
        if ($('ov-hq'))$('ov-hq').addEventListener('click', go('hub'));
        overlayAction = () => reloadTo(kind === 'over' ? 'autostart' : MP.on ? 'hub' : undefined);
        if (out) overlayAction = go('hub');   // fell in the outer zone: straight back to HQ
        $('ov-btn').addEventListener('click', () => overlayAction && overlayAction());
    }
    function startGame(direct) {   // menu → HQ; 'retry' restarts go straight into the mission
        AudioSys.init(); AudioSys.playChargeFull(); Music.start(direct === true ? 'sounds/music1.mp3' : 'sounds/musichall.mp3');   // HQ theme / mission theme
        overlay.hidden = true; overlayAction = null; Input.flush();
        cameraSystem.targetRadius = clamp(parseFloat(store.get('zoom', '8.5')) || 8.5, ZOOM_MIN, ZOOM_MAX); cameraSystem.targetPhi = Math.PI / 7;
        if (direct === true) { hub.toLevel(); arenaDir.restore(player); prewarmShaders(); markRun(); state = 'countdown'; UI.countdown(goPlay, 750); } else hub.enter();
    }
    let runSnap = null, runLost = 0;
    function goPlay() { if (state === 'tips') resumeTo = 'play'; else state = 'play'; Input.flush(); }
    function markRun() { UI.tip('fall'); runSnap = { shop: window.AxonShop.snapshot(), ck: localStorage.getItem('axon.ckpt') }; }
    function endGame(kind) {
        const out = state === 'outside';
        if (state !== 'play' && !out) return;
        if (kind === 'over' && runSnap && !out) {
            runLost = Math.max(0, window.AxonShop.wallet - JSON.parse(runSnap.shop).credits);
            window.AxonShop.restore(runSnap.shop);
            try { if (runSnap.ck) localStorage.setItem('axon.ckpt', runSnap.ck); else localStorage.removeItem('axon.ckpt'); } catch (e) { }
        }
        state = kind; showOverlay(kind, out);
        if (kind === 'clear') { AudioSys.playCharge(); hub.cleared(0); arenaDir.reset(); }
    }
    uiReady = true;
    MP.init({ api, player, boss, layout, arenaDir, minimap, hub, SHOTS, projectiles, PERF, stage, getState: () => state, toast: m => toast(m), endGame, bossStart,
        fxFlash: p => { spawnFlash(p, 0x8fe9ff, 2.2, 0.3); spawnSparks(p, 0x8fe9ff, 10, 8); } });
    UI.init({
        stage, AudioSys, start: startGame, startDirect: () => startGame(true), menuMusic: () => Music.start('sounds/menumusic.mp3'), canPause: () => (state === 'play' || state === 'hub' || state === 'outside') && !player.dead,
        pause: on => { if (on) { resumeTo = state; state = 'pause'; } else if (state === 'pause') { state = resumeTo; Input.flush(); keysDown.clear(); } },
        setBody: t => { if (t !== player.bodyType) player.setBody(t); }, bodyType: () => player.bodyType,
        capLabel: () => { const hz = window.AxonPerf.Display.hz; return limiter.cap > hz + 2 ? `${limiter.cap} FPS · ${T('screen_hz', hz)}` : `${limiter.cap} FPS`; },
        fxOpt: k => GFX.label(k, k === 'bloom' ? bloomOn() : shadowOn()),
        cycleFxOpt: k => { GFX.cycle(k); if (k === 'hero') { player.setBody(player.bodyType); prewarmShaders(); } else applyQuality(k === 'res'); },
        cycleCap: () => { const o = capOptions(); limiter.cap = o[(o.indexOf(limiter.cap) + 1) % o.length] || 60; store.set('fpsCap', String(limiter.cap)); },
        calm: () => {   // tips wait for a quiet moment
            if (state !== 'play') return true;
            if (performance.now() - (player._hurtAt || 0) < 3000 || layout.arenas.some(a => a.state === 'wave1' || a.state === 'wave2') || (boss.active && !boss.isDead)) return false;
            const p = player.mesh.position; return !enemies.some(e => !e.isDead && e.mesh.visible && e.mesh.position.distanceToSquared(p) < 700);
        },
        canFreeze: () => (state === 'play' || state === 'hub' || state === 'outside' || state === 'countdown') && !player.dead,
        freeze: on => { if (on) { if (state !== 'tips') resumeTo = state; state = 'tips'; } else if (state === 'tips') { state = resumeTo; Input.flush(); keysDown.clear(); } },
        bench: secs => fpsMeter.bench(secs, () => ({ tier: (fxMode === 'AUTO' ? 'AUTO→' : '') + quality + (bloomOn() ? ' · bloom' : '') + (shadowOn() ? ' · shadow' : '') + GFX.tag(), cap: limiter.cap })),
        fpsOn: () => fpsOn, toggleFps: () => { fpsOn = !fpsOn; store.set('fps', fpsOn ? '1' : '0'); fpsMeter.show(fpsOn); }
    });

    // ==========================================
    // 12. Main loop
    // ==========================================
    const idleMove = { x: 0, y: 0, active: false };
    let hbT = 0;   // low-HP heartbeat timer
    const LOD_NEAR = (isCoarse ? 44 : 55) ** 2, LOD_FAR = 150 * 150;   // full detail · silhouette · not drawn (phones: silhouettes sooner)
    const limiter = new window.AxonPerf.FrameLimiter();
    limiter.cap = +store.get('fpsCap', '60') || 60;
    const capOptions = () => window.AxonPerf.Display.hz >= 115 ? [30, 40, 60, 90, 120] : [30, 60, 90, 120];   // 40 on a 120 Hz screen = every 3rd refresh: perfectly even 25 ms frames (the console '40 FPS mode')   // above the screen's real rate simply means 'as fast as the screen allows'

    const FIXED_DT = 1 / 60;
    let accumulator = 0;
    let gameTime = 0, shadowFrame = 0;

    let lastVs = 0;
    function animate(now) {
        requestAnimationFrame(animate);
        if (!limiter.ok(now)) return;
        // the rAF timestamp is the screen refresh this frame is aimed at; the callback itself runs 5–10 ms after it,
        // by a varying amount. Moving the game by the refresh-to-refresh time (not the jittery callback clock) keeps
        // motion even on screen — the standard fix for micro-stutter on phones.
        const vs = now || performance.now();
        const clockDt = clock.getDelta();
        let frameTime = Math.min(lastVs && vs > lastVs ? (vs - lastVs) / 1000 : clockDt, 0.05);
        lastVs = vs; fpsMeter.vsync(vs); now = vs;

        const tA = performance.now(); renderer.info.reset();
        if (GFX.autoRes && (state === 'play' || state === 'hub' || state === 'outside') && lastF && dynRes.frame(now - lastF, 1000 / Math.min(limiter.cap, window.AxonPerf.Display.hz), frameTime, PERF.sinceCombat() > 2500)) { applyQuality(true); fpsMeter.res = dynRes.scale; }
        lastF = now;

        if (hitStop > 0) { hitStop -= frameTime; frameTime *= 0.08; }

        accumulator += frameTime;

        while (accumulator >= FIXED_DT) {
            let dt = FIXED_DT;
            gameTime += dt;
            const time = gameTime;

            // several logic steps can run in one frame (slow device / hitch): what only matters for the picture
            // (LOD swap, impostor packing, HUD, motes, camera range) is done once, on the step just before drawing
            const last = accumulator - FIXED_DT < FIXED_DT;
            if (last && motes) motes.tick(gameTime);

            let move = idleMove;
            if (last) impostors.begin(cameraSystem.frustum);
            const inHub = state === 'hub', inOut = state === 'outside', live = state === 'play' || inHub || inOut, bg = !live && MP.bg(state, resumeTo);
            if ((live || bg) && (!player.dead || MP.on)) {   // co-op: the shared world keeps running while paused or down
                if (live) move = getMove(); else Input.flush();
                if (inHub) hub.holster(Input);
                if (!player.dead) player.update(dt, cameraSystem, time, move);
                const pp = player.mesh.position;
                if (!inHub) {
                for (const e of eList(enemies)) {
                    const d2 = (e.mesh.position.x - pp.x) ** 2 + (e.mesh.position.z - pp.z) ** 2;
                    if (!last) { } else if (e.type === 'boss') e.mesh.visible = d2 < 110 * 110;
                    else { e.mesh.visible = d2 < LOD_NEAR; e.mesh.userData.lazy = true; if (!e.mesh.visible && d2 < LOD_FAR) impostors.add(e); }   // LOD (hidden = no matrix work)
                    MP.tickEnemy(e, e._hr ? dt * hitTick(e, dt) : dt, time, d2);   // single player: e.update near the hero · co-op host: nearest hero · guest: host's puppet
                }
                if (!inOut) updateRoamLight(pp);
                updateCombat(dt);
                if (!inOut) { arenaDir.update(MP.team(player), dt, !MP.guest); traps.update(player, dt); }
                if (!boss.active && !MP.guest && MP.team(player).some(q => q.mesh.position.z < layout.bossEntryZ - 5 && q.mesh.position.y > layout.bossY - 1)) bossStart();
                }
            } else {
                Input.flush();
                if (state === 'title' || state === 'countdown') {   // standing still, but gravity still lands him
                    player.velocity.x = player.velocity.z = 0;
                    player.velocity.y += player.gravity * dt; player.stepPhysics(dt);
                }
                if (state === 'title') {
                    cameraSystem.targetTheta = Math.sin(time * 0.13) * 0.55; cameraSystem.targetPhi = 0.08; cameraSystem.targetRadius = 5.2;
                }
                player.updateProceduralAnimation(dt, time, false);
            }
            if (last) impostors.end();
            if (hub.on) { hub.update(dt, time); if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show'); }
            if (outside.on) { outside.update(dt, time); if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show'); }
            if (explore.on) { explore.update(dt); if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show'); }
            retreat.update(dt, state === 'play' || state === 'countdown', player.hp > 0 && player.hp <= player.maxHp * 0.3);
            if (hub.on) { explore.hubTick(dt); forge.tick(dt); biolab.tick(dt); if (state !== 'title') Music.want('sounds/musichall.mp3'); }   // back in HQ from anywhere: its theme, always
            MP.tick(dt, time);
            updateFx(dt); SHOTS.update(dt);
            window.AxonLevel.Feedback.update();
            cameraSystem.update(player, dt, move);
            const cs = hub.camShift || forge.camShift || biolab.camShift; if (cs) { cameraSystem.camera.translateX(cs[0]); cameraSystem.camera.translateY(cs[1]); }   // armor studio: hero beside the colour panel
            if (state === 'title') window.AxonTitle.shot({ THREE, scene, camera: cameraSystem.camera, player, time, dt, roamLight, portrait: stage.classList.contains('is-portrait') });   // title.js

            dirLight.target.position.copy(player.mesh.position);
            dirLight.position.copy(player.mesh.position);
            if (outside.on && outside.sunDir) dirLight.position.addScaledVector(outside.sunDir, 42);   // open world: sun / moon
            else { dirLight.position.x += 18; dirLight.position.y += 36; dirLight.position.z += 12; }
            if (last) {
                updateHUD();
                const far = scene.fog && scene.fog.density ? Math.min(400, 2.6 / scene.fog.density) : 400, cam = cameraSystem.camera;   // nothing is drawn past the fog
                if (Math.abs(cam.far - far) > 1) { cam.far = far; cam.updateProjectionMatrix(); }
            }
            if ((state === 'play' || state === 'outside') && player.hp > 0 && player.hp <= player.maxHp * 0.25) { if ((hbT -= dt) <= 0) { hbT = 0.62 + 0.5 * player.hp / (player.maxHp * 0.25); AudioSys.playHeartbeat(); } } else hbT = 0;
            shieldBubble.visible = player.shieldT > 0 && !player.dead && (player.shieldT > 1.2 || Math.sin(time * 30) > 0);
            if (shieldBubble.visible) { shieldBubble.position.copy(player.mesh.position).setY(player.mesh.position.y + 1.6); shieldBubble.scale.setScalar(1 + Math.sin(time * 6) * 0.03); shieldBubble.rotation.y += dt; }
            if (state === 'play') updateProgress(dt);
            if (state === 'play' || state === 'outside') window.AxonShop.alerts(player, dt);
            if (!hub.on && !outside.on && !explore.on) minimap.draw(player, enemies, dt, time);

            accumulator -= FIXED_DT;
        }

        const tB = performance.now();
        // the shadow map is redrawn every frame: redrawing it every other frame made every second frame heavier,
        // and on a phone at 60 FPS those heavy frames were the ones missing the 16.7 ms refresh (uneven pacing)
        renderer.shadowMap.autoUpdate = true;
        if (composer && bloomOn()) composer.render();
        else renderer.render(scene, cameraSystem.camera);
        fpsMeter.cpu(tB - tA, performance.now() - tB); fpsMeter.tick();
        autoQuality(frameTime);
    }
    animate();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCyberGame);
else initCyberGame();
