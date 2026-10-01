// =====================================================================
//  AXON BREACH — sound: procedural sound effects (Web Audio) + background music
//   • Everything runs through one bus: master → compressor (loud but never clipping),
//     with a small room-reverb send so hits and blasts have space around them.
//   • Every effect is synthesised: filtered-noise whooshes, pitched sweeps, inharmonic metal rings,
//     sub-bass thumps. Small random variation so repeated sounds never sound identical.
//   • Enemy sounds take a distance and a screen pan (-1 left … 1 right).
//  Loaded by index.html before game.js.
// =====================================================================
'use strict';

window.AxonAudio = (function () {
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rv = (x, k = 0.06) => x * (1 + (Math.random() * 2 - 1) * k);                 // ± k variation
    const att = (d, max = 40) => d === undefined ? 1 : clamp(1 - d / max, 0, 1);          // distance fade

    const AudioSys = {
        ctx: null, noiseBuf: null, _bus: null, _th: {},
        init() {
            try {
                if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.ctx.state === 'suspended') this.ctx.resume();
            } catch (e) { this.ctx = null; }
            if (this.ctx && !this.samples) this.loadSamples();
        },

        // ---------- mixing bus: master → compressor → speakers, plus a reverb send ----------
        bus() {
            if (this._bus || !this.ctx) return this._bus;
            const c = this.ctx, comp = c.createDynamicsCompressor();
            comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.18;
            const master = c.createGain(); master.gain.value = 0.95;
            master.connect(comp); comp.connect(c.destination);
            const len = Math.floor(c.sampleRate * 1.1), ir = c.createBuffer(2, len, c.sampleRate);
            for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
            const conv = c.createConvolver(); conv.buffer = ir;
            const wet = c.createGain(); wet.gain.value = 0.9; conv.connect(wet); wet.connect(comp);
            return (this._bus = { master, conv });
        },
        _out(node, o = {}) {
            const c = this.ctx, B = this.bus(); let n = node;
            if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); n.connect(p); n = p; }
            n.connect(B.master);
            const w = o.wet === undefined ? 0.12 : o.wet;
            if (w > 0) { const s = c.createGain(); s.gain.value = w; n.connect(s); s.connect(B.conv); }
        },
        _ok(key, ms) { const n = performance.now(); if (n < (this._th[key] || 0)) return false; this._th[key] = n + ms; return true; },   // anti-spam

        // pitched voice: type, start → end frequency, duration, peak volume.
        // o: delay, attack, lp (low-pass Hz), q, detune, glide (fraction of dur for the sweep), pan, wet
        tone(type, f0, f1, dur, vol, o = {}) {
            if (!this.ctx || !(vol > 0)) return;
            const c = this.ctx, t = c.currentTime + (o.delay || 0), a = Math.min(o.attack || 0.004, dur * 0.5);
            const osc = c.createOscillator(), g = c.createGain(); osc.type = type;
            osc.frequency.setValueAtTime(Math.max(1, f0), t);
            if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * (o.glide || 1));
            if (o.detune) osc.detune.value = o.detune;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            let n = osc;
            if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.7; osc.connect(f); n = f; }
            n.connect(g); this._out(g, o); osc.start(t); osc.stop(t + dur + 0.05);
        },
        // filtered noise: o.type (bandpass | lowpass | highpass), f0 → f1 sweep, q, attack, delay, pan, wet
        noise(dur, vol, o = {}) {
            if (!this.ctx || !(vol > 0)) return;
            const c = this.ctx;
            if (!this.noiseBuf) {
                const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
                const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            }
            const t = c.currentTime + (o.delay || 0), a = Math.min(o.attack || 0.003, dur * 0.5);
            const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
            src.buffer = this.noiseBuf; f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
            const f0 = o.f0 || 1200, f1 = o.f1 || f0;
            f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(f); f.connect(g); this._out(g, o);
            src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
        },
        // inharmonic metal ring (sword clangs, gates, glass)
        ring(freqs, dur, vol, o = {}) { freqs.forEach((f, i) => this.tone('sine', rv(f, 0.02), rv(f, 0.02) * 0.995, dur * (1 - i * 0.12), vol / (1 + i * 0.5), { ...o, attack: 0.002 })); },

        // compatibility with the older calls (hub.js / outside.js / level.js)
        playTone(type, f0, f1, dur, vol = 0.1) { this.tone(type, f0, f1, dur, vol); },
        playNoise(dur, vol, freq) { this.noise(dur, vol, { type: 'lowpass', f0: freq, f1: 80 }); },

        // ---------- recorded sounds (sounds/*.wav): decoded once into Web Audio buffers for exact timing;
        // if the WebView refuses to read local files that way, falls back to <audio> elements ----------
        samples: null, _voiceAt: 0,
        loadSamples() {
            const S = this.samples = {};
            for (const [id, file] of [['walk', 'sounds/walk.wav'], ['gun', 'sounds/gunload.wav'], ['robot', 'sounds/robotenemy.wav']]) {
                const smp = S[id] = { buf: null, els: null, file };
                const viaXHR = () => new Promise((ok, bad) => {
                    const x = new XMLHttpRequest(); x.open('GET', file); x.responseType = 'arraybuffer';
                    x.onload = () => (x.status === 200 || x.status === 0) && x.response && x.response.byteLength ? ok(x.response) : bad();
                    x.onerror = bad; x.send();
                });
                const decode = ab => new Promise((ok, bad) => this.ctx.decodeAudioData(ab, ok, bad));
                (window.fetch ? fetch(file).then(r => r.ok || r.status === 0 ? r.arrayBuffer() : Promise.reject()).catch(viaXHR) : viaXHR())
                    .then(decode).then(b => { smp.buf = b; })
                    .catch(() => { smp.els = [0, 1, 2, 3].map(() => { const a = new Audio(file); a.preload = 'auto'; return a; }); smp.k = 0; });
            }
        },
        // play a sample: vol 0..1, rate = pitch/speed, pan -1..1 → returns a handle with stop()
        sample(id, vol = 0.5, rate = 1, pan = 0, maxDur = 0) {
            const smp = this.samples && this.samples[id]; if (!smp || !this.ctx) return null;
            if (smp.buf) {
                const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
                src.buffer = smp.buf; src.playbackRate.value = rate; g.gain.value = vol;
                src.connect(g); this._out(g, { pan, wet: 0.05 }); src.start();
                if (maxDur) { const t = c.currentTime + maxDur; g.gain.setValueAtTime(vol, t - 0.05); g.gain.linearRampToValueAtTime(0, t); src.stop(t + 0.02); }
                return { stop(fade = 0.08) { try { const t = c.currentTime; g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); src.stop(t + fade + 0.02); } catch (e) { } } };
            }
            if (smp.els) {
                const a = smp.els[smp.k = (smp.k + 1) % smp.els.length];
                try { a.currentTime = 0; a.volume = Math.max(0, Math.min(1, vol)); a.playbackRate = rate; const p = a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
                if (maxDur) { clearTimeout(a._t); a._t = setTimeout(() => { try { a.pause(); } catch (e) { } }, maxDur * 1000); }
                return { stop() { try { a.pause(); } catch (e) { } } };
            }
            return null;
        },
        // footstep: louder and a touch higher when sprinting, never two identical in a row
        // each footfall plays only the first ~0.3 s of walk.wav (one step, even if the file is a longer walking loop)
        // and cuts the previous one; stopSteps() silences it the moment he stops
        playStep(speed) {
            if (this._step) this._step.stop(0.03);
            this._step = this.sample('walk', 0.22 + Math.min(0.28, speed * 0.016), 0.92 + Math.random() * 0.14 + Math.min(0.08, speed * 0.004), 0, 0.32);
        },
        stopSteps() { if (this._step) { this._step.stop(0.06); this._step = null; } },
        // enemy chatter: distance-faded, panned to where it is on screen, at most one voice every ~1.4 s
        voice(type, dist, pan) {
            const now = performance.now(); if (now < this._voiceAt || dist > 26) return;
            this._voiceAt = now + 1400;
            const rate = type === 'heavy' ? 0.78 : type === 'drone' ? 1.28 : type === 'boss' ? 0.62 : 1.08;
            this.sample('robot', 0.55 * (1 - dist / 28), rate * (0.95 + Math.random() * 0.1), pan);
        },

        // =================================================================
        //  HERO — movement
        // =================================================================
        // kind: 'jump' (ground) · 'flip' (double jump) · 'wall' (wall kick) · 'climb' (up a ledge)
        playJump(kind = 'jump') {
            if (kind === 'flip') {
                this.noise(0.26, 0.08, { f0: 900, f1: 3000, q: 1.3 }); this.noise(0.18, 0.05, { f0: 1300, f1: 3600, q: 1.3, delay: 0.12 });
                this.tone('sine', rv(380), rv(900), 0.16, 0.05); this.tone('triangle', 760, 1500, 0.1, 0.02, { delay: 0.04 });
            } else if (kind === 'wall') {
                this.tone('sine', 170, 60, 0.1, 0.14); this.noise(0.06, 0.1, { type: 'lowpass', f0: 1100, f1: 300 });
                this.noise(0.2, 0.08, { f0: 800, f1: 2800, q: 1.2, delay: 0.02 }); this.tone('triangle', 1500, 1200, 0.05, 0.03);
            } else if (kind === 'climb') {
                this.noise(0.22, 0.06, { f0: 500, f1: 1600, q: 1 }); this.tone('sine', 200, 380, 0.18, 0.05);
            } else {
                this.noise(0.16, 0.09, { f0: 700, f1: 2600, q: 1.2 });
                this.tone('sine', rv(260), rv(560), 0.12, 0.07); this.tone('triangle', 520, 1100, 0.08, 0.022);
            }
        },
        // k: 0 = light step down … 1 = long fall
        playLand(k = 0) {
            k = clamp(k, 0, 1);
            this.tone('sine', 110 + 40 * k, 42, 0.14 + 0.12 * k, 0.12 + 0.14 * k, { wet: 0.08 });
            this.noise(0.1 + 0.08 * k, 0.07 + 0.1 * k, { type: 'lowpass', f0: 700, f1: 120 });
            this.tone('triangle', rv(1800), 1500, 0.05, 0.02 + 0.02 * k);                  // armour plates settling
        },
        playRoll() { this.noise(0.38, 0.07, { f0: 380, f1: 1300, q: 0.9 }); this.tone('sine', 120, 55, 0.3, 0.1); this.noise(0.12, 0.05, { type: 'lowpass', f0: 600, f1: 150, delay: 0.24 }); },
        playLedge() { this.noise(0.03, 0.08, { type: 'highpass', f0: 3000 }); this.tone('triangle', 1400, 1100, 0.06, 0.05); this.tone('sine', 180, 120, 0.07, 0.07); },
        playWallSlide() { if (!this._ok('slide', 250)) return; this.noise(0.3, 0.14, { f0: 3200, f1: 2600, q: 4 }); this.noise(0.25, 0.06, { type: 'lowpass', f0: 500 }); },
        playSkid() { if (!this._ok('skid', 200)) return; this.noise(0.28, 0.16, { f0: 2400, f1: 1300, q: 2.2 }); this.tone('triangle', 720, 480, 0.2, 0.03); },
        playDash() { this.noise(0.22, 0.1, { f0: 700, f1: 3400, q: 0.9 }); this.tone('triangle', 420, 110, 0.2, 0.07); this.tone('sawtooth', 90, 60, 0.18, 0.04, { lp: 500 }); },
        playStomp() { this.tone('sine', 150, 55, 0.1, 0.15); this.noise(0.05, 0.08, { type: 'lowpass', f0: 1500, f1: 300 }); this.tone('triangle', 300, 760, 0.13, 0.05, { delay: 0.02 }); },

        // =================================================================
        //  HERO — saber
        // =================================================================
        // one swing per cut of the combo: h1 across · h2 rising backhand · fin overhead cleave · air spinning cut
        playSwing(kind = 'h1') {
            const p = rv(1, 0.05);
            if (kind === 'h2') {
                this.noise(0.2, 0.17, { f0: 600 * p, f1: 3600 * p, q: 1.4 });
                this.tone('sawtooth', 110, 175, 0.22, 0.05, { lp: 1000 }); this.tone('sine', 1500 * p, 2600 * p, 0.12, 0.025);
            } else if (kind === 'fin') {
                this.noise(0.14, 0.05, { f0: 400, f1: 900, q: 1, attack: 0.05 });                // wind-up
                this.noise(0.26, 0.22, { f0: 2800 * p, f1: 500 * p, q: 1.2, delay: 0.12 });     // the cleave coming down
                this.tone('sawtooth', 95, 55, 0.4, 0.07, { lp: 700 }); this.tone('sine', 2000 * p, 900 * p, 0.2, 0.025, { delay: 0.12 });
            } else if (kind === 'air') {
                this.noise(0.16, 0.15, { f0: 900 * p, f1: 3000 * p, q: 1.5 }); this.noise(0.16, 0.13, { f0: 1100 * p, f1: 3300 * p, q: 1.5, delay: 0.14 });
                this.tone('sawtooth', 130, 190, 0.32, 0.04, { lp: 900 });
            } else {
                this.noise(0.18, 0.17, { f0: 800 * p, f1: 3000 * p, q: 1.5 });
                this.tone('sawtooth', 145, 90, 0.2, 0.05, { lp: 900 }); this.tone('sine', 1600 * p, 2400 * p, 0.1, 0.025);
            }
        },
        playMelee() { this.playSwing('h1'); },
        // saber pulled off the back: metal slide, a click as it docks on the buster, the blade humming alive
        playDraw() {
            if (!this._ok('draw', 120)) return;
            this.noise(0.14, 0.09, { type: 'bandpass', f0: 1800, f1: 6200, q: 2.5 });
            this.ring([1320, 2870, 4100], 0.16, 0.025, { delay: 0.07, wet: 0.2 });
            this.tone('square', 1900, 1500, 0.025, 0.03, { delay: 0.07, lp: 4000 });
            this.tone('sawtooth', 90, 180, 0.22, 0.05, { delay: 0.08, lp: 900 }); this.tone('sine', 400, 900, 0.18, 0.03, { delay: 0.09 });
        },
        // saber back on the back: blade powers down, slide, lock clack
        playSheath() {
            if (!this._ok('sheath', 120)) return;
            this.tone('sawtooth', 200, 60, 0.18, 0.04, { lp: 700 });
            this.noise(0.16, 0.07, { type: 'bandpass', f0: 5200, f1: 1600, q: 2.5, delay: 0.05 });
            this.tone('square', 900, 700, 0.03, 0.045, { delay: 0.2, lp: 2500 }); this.noise(0.03, 0.08, { type: 'highpass', f0: 3000, delay: 0.2 });
        },
        // the blade connecting: crack + metal ring + body thump (heavy = finisher / slam)
        playSaberHit(heavy = false, pan = 0) {
            if (!this._ok('saberHit', 45)) return;
            this.noise(0.05, heavy ? 0.18 : 0.13, { type: 'highpass', f0: 2500, pan });
            this.ring(heavy ? [392, 931, 1480, 2210] : [523, 1187, 1741, 2593], heavy ? 0.45 : 0.28, heavy ? 0.05 : 0.035, { pan, wet: 0.2 });
            this.tone('sine', heavy ? 150 : 180, heavy ? 40 : 60, heavy ? 0.2 : 0.12, heavy ? 0.2 : 0.14, { pan });
            this.tone('sawtooth', 900, 280, 0.07, 0.04, { pan, lp: 2500 });
            if (heavy) this.tone('sine', 70, 28, 0.35, 0.18, { wet: 0.2 });
        },

        // =================================================================
        //  HERO — buster
        // =================================================================
        playShoot() { this.tone('square', rv(1250), 320, 0.09, 0.035); this.noise(0.05, 0.05, { type: 'highpass', f0: 3500 }); this.tone('sine', 180, 90, 0.06, 0.05); },
        playBigShot() { this.tone('sawtooth', 700, 60, 0.35, 0.1); this.noise(0.25, 0.12, { type: 'lowpass', f0: 4000, f1: 200 }); this.tone('sine', 90, 35, 0.3, 0.14); },
        playCharge() { this.tone('sine', 250, 900, 0.3, 0.05); this.tone('triangle', 500, 1800, 0.3, 0.015, { detune: 7 }); },
        playChargeFull() { this.tone('square', 1100, 1600, 0.1, 0.035); this.tone('sine', 2200, 2600, 0.14, 0.02, { delay: 0.05 }); },
        // shot landing on an enemy (crit = charged shot)
        playShotHit(crit = false, pan = 0) {
            if (!this._ok('shotHit', 35)) return;
            this.noise(0.04, 0.09, { f0: 3500, q: 1.5, pan }); this.tone('square', 1500, 500, 0.06, 0.03, { pan }); this.tone('sine', 220, 90, 0.07, 0.08, { pan });
            if (crit) { this.tone('triangle', 2600, 1800, 0.14, 0.04, { pan, wet: 0.25 }); this.noise(0.14, 0.1, { type: 'lowpass', f0: 2000, f1: 200, pan }); }
        },
        // shot hitting a wall: a sharp ricochet whine
        playRicochet(pan = 0, dist) {
            const k = att(dist, 45); if (!k || !this._ok('rico', 50)) return;
            this.tone('triangle', rv(3000, 0.15), rv(1400, 0.15), 0.14, 0.04 * k, { pan, glide: 0.6 });
            this.noise(0.03, 0.06 * k, { type: 'highpass', f0: 4500, pan });
        },

        // =================================================================
        //  HERO — damage, shield, death
        // =================================================================
        playHit() { if (!this._ok('hit', 30)) return; this.tone('triangle', rv(900), 700, 0.05, 0.03); this.noise(0.04, 0.04, { type: 'lowpass', f0: 1200 }); },   // generic armour tink
        playHurt() {
            this.tone('sawtooth', 300, 60, 0.3, 0.1, { lp: 1400 }); this.noise(0.15, 0.1, { type: 'lowpass', f0: 900, f1: 200 });
            this.tone('sine', 90, 40, 0.2, 0.12); this.tone('square', 620, 520, 0.08, 0.02, { delay: 0.02 });
        },
        playShieldUp() {
            this.tone('sine', 600, 1200, 0.5, 0.04, { wet: 0.3 }); this.tone('sine', 900, 1800, 0.5, 0.03, { wet: 0.3, delay: 0.05 });
            this.noise(0.45, 0.03, { type: 'highpass', f0: 6000 }); this.tone('triangle', 300, 600, 0.3, 0.03);
        },
        playShieldBlock(pan = 0) {
            if (!this._ok('block', 60)) return;
            this.ring([2200, 3300, 4100], 0.25, 0.05, { pan, wet: 0.3 }); this.noise(0.05, 0.05, { type: 'highpass', f0: 5000, pan });
        },
        playDeath() {
            this.tone('sawtooth', 420, 35, 1.1, 0.1, { lp: 1200 }); this.tone('square', 220, 30, 1.2, 0.035, { detune: 12 });
            this.noise(0.8, 0.08, { type: 'lowpass', f0: 500, f1: 60 }); this.tone('sine', 880, 440, 0.4, 0.03, { delay: 0.15, wet: 0.4 });
        },
        playHeartbeat() { this.tone('sine', 58, 40, 0.12, 0.17, { wet: 0 }); this.tone('sine', 52, 38, 0.12, 0.11, { delay: 0.18, wet: 0 }); },

        // =================================================================
        //  explosions, items, credits, UI
        // =================================================================
        playExplode() {
            this.noise(0.6, 0.28, { type: 'lowpass', f0: 1400, f1: 80, wet: 0.2 }); this.tone('sawtooth', 140, 30, 0.45, 0.12, { lp: 900 });
            this.tone('sine', 60, 25, 0.7, 0.2, { wet: 0.2 }); this.noise(0.3, 0.06, { type: 'highpass', f0: 3000, f1: 1200, delay: 0.05 });   // crackle
        },
        playLock() { this.tone('square', 600, 1200, 0.08, 0.04); },
        playItem(id) {
            if (id === 'medkit') { [523, 659, 784, 1046].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.05, { delay: i * 0.06, wet: 0.25 })); this.noise(0.4, 0.02, { type: 'highpass', f0: 6000, delay: 0.1 }); }
            else if (id === 'cell') { this.tone('sawtooth', 200, 1400, 0.45, 0.04, { lp: 3000 }); this.noise(0.4, 0.03, { f0: 2000, f1: 6000, q: 2 }); this.tone('sine', 1760, 1760, 0.2, 0.04, { delay: 0.42, wet: 0.3 }); }
            else if (id === 'shield') this.playShieldUp();
            else this.playChargeFull();
        },
        playCoin() {
            if (!this._ok('coin', 80)) return;
            this.tone('square', 1318, 1318, 0.06, 0.018, { lp: 5000 }); this.tone('square', 1760, 1760, 0.14, 0.02, { delay: 0.055, lp: 5000, wet: 0.2 });
            this.tone('sine', 2637, 2637, 0.12, 0.012, { delay: 0.055 });
        },
        playBuy() {
            this.noise(0.03, 0.06, { type: 'highpass', f0: 4000 }); this.tone('sine', 880, 880, 0.1, 0.04);
            this.tone('sine', 1318, 1318, 0.2, 0.045, { delay: 0.08, wet: 0.25 }); this.tone('triangle', 1760, 1760, 0.22, 0.02, { delay: 0.16, wet: 0.25 });
        },
        playDeny() { if (!this._ok('deny', 150)) return; this.tone('square', 180, 175, 0.14, 0.03, { lp: 1200 }); this.tone('square', 190, 185, 0.14, 0.03, { lp: 1200 }); },
        playEnemyShot(dist, pan = 0) {
            const k = att(dist, 45); if (!k) return;
            this.tone('square', 900, 300, 0.1, 0.045 * k, { pan, lp: 3000 }); this.noise(0.05, 0.05 * k, { f0: 1800, pan });
        },

        // =================================================================
        //  ENEMIES (dist in metres, pan -1..1)
        // =================================================================
        playAlert(dist, pan = 0) {                                            // spotted you: "!"
            const k = att(dist, 40); if (!k || !this._ok('alert', 250)) return;
            this.tone('square', 780, 1050, 0.07, 0.045 * k, { pan, lp: 3500 }); this.tone('square', 1050, 1500, 0.09, 0.045 * k, { pan, lp: 3500, delay: 0.08 });
        },
        playDroneCharge(dist, pan = 0) {                                      // optic burning white before a shot
            const k = att(dist, 35); if (!k) return;
            this.tone('sine', 500, 2000, 0.45, 0.05 * k, { pan, attack: 0.05 }); this.tone('square', 250, 1000, 0.45, 0.012 * k, { pan, lp: 2000 });
        },
        playRunnerWind(dist, pan = 0) {                                       // stalker crouching to lunge
            const k = att(dist, 30); if (!k) return;
            this.tone('sawtooth', 120, 380, 0.3, 0.05 * k, { pan, lp: 900 }); this.noise(0.3, 0.03 * k, { f0: 800, f1: 2000, pan });
        },
        playLunge(dist, pan = 0) { const k = att(dist, 30); if (!k) return; this.noise(0.25, 0.16 * k, { f0: 600, f1: 2400, q: 1.1, pan }); this.tone('sawtooth', 300, 120, 0.2, 0.03 * k, { pan, lp: 1200 }); },
        playHeavyWind(dist, pan = 0) {                                        // bulwark raising its arms for a slam
            const k = att(dist, 35); if (!k) return;
            this.tone('sawtooth', 180, 520, 0.6, 0.05 * k, { pan, lp: 1200, attack: 0.1 }); this.tone('square', 90, 140, 0.6, 0.02 * k, { pan, lp: 600 });
        },
        playHeavyStep(dist, pan = 0) {
            const k = att(dist, 30); if (!k) return;
            this.tone('sine', 80, 38, 0.15, 0.12 * k, { pan, wet: 0.05 }); this.noise(0.08, 0.05 * k, { type: 'lowpass', f0: 350, pan });
        },

        // =================================================================
        //  BOSS & ARENAS
        // =================================================================
        playBossCharge() {                                                    // glowing up before a rush
            this.tone('sawtooth', 80, 260, 0.75, 0.09, { lp: 800, attack: 0.1 }); this.noise(0.75, 0.08, { type: 'lowpass', f0: 200 });
            [0, 0.25, 0.5].forEach(d => this.tone('square', 440, 440, 0.12, 0.025, { delay: d, lp: 2000 }));
        },
        playBossLeap() { this.noise(0.5, 0.1, { f0: 300, f1: 1300, q: 0.9 }); this.tone('sawtooth', 100, 300, 0.5, 0.05, { lp: 900 }); },
        playBossRoar() {                                                      // phase 2
            this.tone('sawtooth', 70, 44, 1.3, 0.12, { lp: 600, attack: 0.08, wet: 0.3 }); this.tone('sawtooth', 73.5, 46, 1.3, 0.1, { lp: 600, attack: 0.08, wet: 0.3 });
            this.noise(1.1, 0.1, { type: 'lowpass', f0: 500, f1: 120 }); this.tone('square', 140, 90, 1.2, 0.03, { lp: 900 });
        },
        playGateSlam() {
            this.noise(0.5, 0.2, { type: 'lowpass', f0: 700, f1: 90, wet: 0.3 }); this.tone('sine', 70, 34, 0.5, 0.2, { wet: 0.3 });
            this.ring([180, 410, 670], 0.7, 0.05, { wet: 0.35 });
        },
        // =================================================================
        //  HQ & OUTER ZONE
        // =================================================================
        // interface: open a panel · close it · select a tile / colour
        playUi(kind = 'select') {
            if (kind === 'open') { this.noise(0.18, 0.05, { f0: 600, f1: 2400, q: 1 }); this.tone('sine', 660, 660, 0.08, 0.04); this.tone('sine', 990, 990, 0.12, 0.04, { delay: 0.07, wet: 0.2 }); }
            else if (kind === 'close') { this.noise(0.14, 0.04, { f0: 2200, f1: 600, q: 1 }); this.tone('sine', 880, 587, 0.12, 0.035); }
            else { if (!this._ok('uisel', 40)) return; this.tone('square', 1320, 1320, 0.035, 0.018, { lp: 4000, wet: 0.05 }); this.tone('sine', 2640, 2640, 0.05, 0.012, { wet: 0.05 }); }
        },
        playSpot() { this.tone('sine', 784, 784, 0.08, 0.035); this.tone('sine', 1175, 1175, 0.14, 0.035, { delay: 0.08, wet: 0.2 }); },          // stepped onto a terminal / pod
        playZone() { this.tone('triangle', 523, 523, 0.18, 0.02, { wet: 0.3 }); this.tone('triangle', 784, 784, 0.26, 0.02, { delay: 0.1, wet: 0.3 }); },   // entered another wing
        // HQ blast gate sliding into its jambs: pneumatic release, servo run, end clunk
        playSlideDoor() {
            this.noise(0.18, 0.09, { type: 'highpass', f0: 2500, f1: 5000 }); this.tone('sawtooth', 110, 170, 0.45, 0.04, { lp: 700, attack: 0.05 });
            this.noise(0.4, 0.05, { f0: 900, f1: 500, q: 2 }); this.tone('sine', 90, 50, 0.12, 0.1, { delay: 0.42 }); this.noise(0.05, 0.06, { type: 'lowpass', f0: 900, delay: 0.42 });
        },
        // the talking crew: a short radio click and chirp before the line
        playComm() { this.noise(0.04, 0.05, { type: 'highpass', f0: 3000 }); this.tone('square', 1800, 1800, 0.04, 0.015, { lp: 4000, delay: 0.03 }); this.tone('square', 2400, 2400, 0.05, 0.015, { lp: 4000, delay: 0.08 }); this.noise(0.25, 0.012, { f0: 1800, q: 0.8, delay: 0.1 }); },
        // armor studio: stepping into the capsule (scan beam), putting a colour on, buying one
        playScan() { this.tone('sine', 300, 1200, 0.7, 0.04, { attack: 0.08, wet: 0.3 }); this.noise(0.7, 0.025, { type: 'highpass', f0: 3000, f1: 7000, attack: 0.1 }); this.tone('triangle', 150, 300, 0.7, 0.03, { attack: 0.1 }); },
        playEquip() { this.noise(0.03, 0.06, { type: 'highpass', f0: 3500 }); this.tone('sine', 180, 120, 0.06, 0.08); this.tone('sine', 1046, 1568, 0.25, 0.04, { delay: 0.05, wet: 0.3 }); },
        playUnlock() {                                                        // a new colour bought for good
            this.playBuy();
            [784, 988, 1175, 1568].forEach((f, i) => this.tone('sine', f, f, 0.3, 0.04, { delay: 0.12 + i * 0.07, wet: 0.35 }));
            this.noise(0.6, 0.03, { type: 'highpass', f0: 6000, delay: 0.15 });
        },
        // deploying to a mission from the terminal
        playDeploy() {
            this.noise(0.9, 0.08, { f0: 300, f1: 2800, q: 0.8, attack: 0.2 }); this.tone('sawtooth', 80, 320, 0.9, 0.05, { lp: 1400, attack: 0.2 });
            [523, 659, 784].forEach(f => this.tone('sine', f, f * 2, 0.9, 0.025, { delay: 0.1, wet: 0.35 }));
        },
        // the hangar door as you pass between the HQ and the outer zone
        playAirlock(out = true) {
            this.noise(0.5, 0.12, { type: 'highpass', f0: out ? 1500 : 4000, f1: out ? 5000 : 1500, attack: 0.03 });    // pressure hiss
            this.tone('sine', 120, 40, 0.3, 0.14, { delay: 0.12 }); this.noise(0.08, 0.08, { type: 'lowpass', f0: 800, delay: 0.12 });   // seal clunk
            this.tone('sawtooth', 90, 140, 0.4, 0.03, { lp: 600, delay: 0.1 });
        },
        // hostile node purged: its signal collapses, then a clean all-clear chord
        playPurge() {
            this.tone('sawtooth', 600, 80, 0.5, 0.05, { lp: 1500 }); this.noise(0.4, 0.06, { type: 'lowpass', f0: 2000, f1: 100 });
            [523, 659, 784, 1046].forEach(f => this.tone('sine', f, f, 0.5, 0.03, { delay: 0.35, wet: 0.35 }));
        },
        playGateOpen() { this.noise(0.8, 0.04, { type: 'highpass', f0: 3000, attack: 0.1 }); this.tone('sawtooth', 90, 140, 0.8, 0.03, { lp: 500, attack: 0.1 }); this.tone('sine', 1320, 1320, 0.3, 0.03, { delay: 0.7, wet: 0.3 }); }
    };

    // Background music: one looping track per place — sounds/musichall.mp3 in the HQ, sounds/music1.mp3 in missions.
    // Starts after the first tap (browser rule), cross-fades between tracks, pauses in the background;
    // the ♪ button mutes it (remembered)
    const makeMusic = store => ({
        els: {}, el: null, src: 'sounds/music1.mp3', started: false, on: store.get('music', '1') === '1', vol: 0.45,
        // Looping is done by hand, not with a.loop: some WebViews ignore loop (or can't seek a streamed mp3),
        // and then the track just stops at its end, or sits frozen on the last frame without firing 'ended'.
        mk(src) {
            const a = new Audio(src);
            a.loop = false; a.preload = 'auto'; a.volume = 0;
            a._src = src; a._lt = -1; a._lc = performance.now();
            a.addEventListener('ended', () => this.restart(a));
            a.addEventListener('timeupdate', () => {                     // just before the end: jump back to 0 (near-seamless loop)
                try { if (this.el === a && a.duration && isFinite(a.duration) && a.currentTime >= a.duration - 0.12 && a.seekable && a.seekable.length) a.currentTime = 0; } catch (e) { }
            });
            a.addEventListener('error', () => console.warn('music: ' + src + ' not found'));
            return a;
        },
        ensure() {
            if (!this.els[this.src]) this.els[this.src] = this.mk(this.src);
            return (this.el = this.els[this.src]);
        },
        // the track reached its end: rewind and play again; if the rewind didn't work, rebuild the element
        restart(a) {
            if (this.el !== a || !this.on || !this.started) return;
            let ok = false;
            try { a.currentTime = 0; ok = true; } catch (e) { }
            if (ok) {
                const p = a.play(); if (p && p.catch) p.catch(() => { });
                setTimeout(() => { if (this.el === a && this.on && (a.paused || a.ended || a.currentTime > 2)) this.rebuild(a); }, 600);
            } else this.rebuild(a);
        },
        // fresh <audio> for the same file: always starts from the beginning, even when seeking is impossible
        rebuild(a) {
            if (this.el !== a) return;
            const src = a._src, vol = a.volume;
            try { a._dead = true; a._fid = (a._fid || 0) + 1; a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { }
            const b = this.mk(src); b.volume = Math.max(vol, this.on ? this.vol : 0);
            this.els[src] = b; this.el = b;
            if (this.on && this.started) { const p = b.play(); if (p && p.catch) p.catch(err => { if (err && err.name === 'NotAllowedError') this.waitGesture(); }); }
        },
        fade(el, target, ms) {
            const id = el._fid = (el._fid || 0) + 1, from = el.volume, t0 = el._ft = performance.now();
            const step = now => {
                if (id !== el._fid) return;
                const k = Math.min(1, Math.max(0, (now - t0) / ms));
                el.volume = Math.min(1, Math.max(0, from + (target - from) * k));
                if (k < 1) requestAnimationFrame(step); else if (target === 0 && (el !== this.el || !this.on)) el.pause();   // never stop the track that should be playing
            };
            requestAnimationFrame(step);
        },
        fadeTo(target, ms) { if (this.el) this.fade(this.el, target, ms); },
        play() {
            const el = this.ensure();
            const p = el.play(); if (p && p.catch) p.catch(err => { if (err && err.name === 'NotAllowedError') this.waitGesture(); });   // blocked until a tap; other failures → the watchdog retries
            this.fade(el, this.vol, 1500);
        },
        // browsers block sound until the first tap / key: retry the current track on that first input
        waitGesture() {
            if (this._wg) return; this._wg = true;
            const ev = ['pointerdown', 'touchstart', 'keydown'];
            const go = () => { this._wg = false; ev.forEach(e => window.removeEventListener(e, go, true)); if (this.started && this.on) this.play(); };
            ev.forEach(e => window.addEventListener(e, go, true));
        },
        // switch track: the old one fades out while the new one fades in
        setTrack(src) {
            if (!src || src === this.src) return;
            const old = this.el; this.src = src; this.el = null;
            if (old) this.fade(old, 0, 800);
            if (this.started && this.on) this.play();
        },
        start(src) {
            const switched = this.started && src && src !== this.src;   // setTrack already starts the new one
            this.setTrack(src); this.started = true; if (this.on && !switched) this.play();
        },
        toggle() {
            this.on = !this.on; store.set('music', this.on ? '1' : '0');
            if (this.on) { if (this.started) this.play(); } else this.fadeTo(0, 300);
            return this.on;
        },
        // the game says which track belongs where (every frame): wrong track → switch to it
        want(src) { if (this.started && src && src !== this.src) this.setTrack(src); },
        // keep-alive: if the current track stopped or went silent on its own (loop ignored, audio focus lost,
        // a fade cut short…), start it again
        keepAlive() {
            setInterval(() => {
                if (!this.started || !this.on || this._wg || document.hidden) return;
                const a = this.el;
                if (!a) { this.play(); return; }                              // track chosen but never started
                const now = performance.now();
                if (a.currentTime !== a._lt) { a._lt = a.currentTime; a._lc = now; }
                const atEnd = a.ended || (a.duration && isFinite(a.duration) && a.currentTime >= a.duration - 0.3);
                const frozen = !a.paused && now - a._lc > 4000 && a.readyState >= 2;   // "playing" but time doesn't move
                if (atEnd || frozen) { this.restart(a); return; }
                const quiet = !a.paused && a.volume < this.vol * 0.3 && now - (a._ft || 0) > 2500;
                if (!a.paused && !quiet) return;
                this.play();
            }, 1500);
            return this;
        },
        watchVisibility() {
            document.addEventListener('visibilitychange', () => {
                if (!this.el || !this.started || !this.on) return;
                if (document.hidden) this.el.pause(); else { const p = this.el.play(); if (p && p.catch) p.catch(() => { }); }
            });
            return this;
        }
    });

    return { AudioSys, makeMusic };
})();
