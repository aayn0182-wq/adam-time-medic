// WebAudio synth sound effects (no files)
export const Sfx = {
  ctx: null, master: null, rumbleGain: null,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = 0.8; this.master.connect(C.destination);
    const len = C.sampleRate * 2; this.noise = C.createBuffer(1, len, C.sampleRate); const d = this.noise.getChannelData(0);
    let b = 0; this.brown = C.createBuffer(1, len, C.sampleRate); const bd = this.brown.getChannelData(0);
    for (let i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; b = (b + 0.02 * d[i]) / 1.02; bd[i] = b * 3.5; }
    // continuous volcanic rumble
    const src = C.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
    this.rumbleGain = C.createGain(); this.rumbleGain.gain.value = 0.0;
    src.connect(lp).connect(this.rumbleGain).connect(this.master); src.start();
    // wind/ash bed
    const w = C.createBufferSource(); w.buffer = this.noise; w.loop = true; const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.6;
    this.windGain = C.createGain(); this.windGain.gain.value = 0.0; w.connect(bp).connect(this.windGain).connect(this.master); w.start();
  },
  t() { return this.ctx.currentTime; },
  setAmbience(rumble, wind) { if (!this.ctx) return; this.rumbleGain.gain.setTargetAtTime(rumble, this.t(), 0.3); this.windGain.gain.setTargetAtTime(wind, this.t(), 0.5); },
  burst({ dur = 0.1, freq = 800, q = 1, type = 'bandpass', gain = 0.3, attack = 0.005, sweep = 0, brown = false }) {
    if (!this.ctx) return; const C = this.ctx, t = this.t();
    const s = C.createBufferSource(); s.buffer = brown ? this.brown : this.noise; const f = C.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone({ freq = 440, dur = 0.2, type = 'sine', gain = 0.2, delay = 0, slide = 0, attack = 0.01 }) {
    if (!this.ctx) return; const C = this.ctx, t = this.t() + delay;
    const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  step(run) { this.burst({ dur: 0.09, freq: run ? 520 : 420, q: 0.8, gain: run ? 0.22 : 0.15 }); this.burst({ dur: 0.06, freq: 140, type: 'lowpass', gain: 0.18 }); },
  heartbeat(k) { this.tone({ freq: 58, dur: 0.16, gain: 0.5 * k, slide: 0.7 }); this.tone({ freq: 52, dur: 0.18, gain: 0.38 * k, slide: 0.7, delay: 0.2 }); },
  chime() { [659, 880, 1175].forEach((f, i) => this.tone({ freq: f, dur: 0.5, gain: 0.12, delay: i * 0.08 })); },
  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.6, gain: 0.12, delay: i * 0.09, type: 'triangle' })); },
  tick() { this.tone({ freq: 1400, dur: 0.05, gain: 0.08, type: 'square' }); },
  hit() { this.tone({ freq: 880, dur: 0.12, gain: 0.12, type: 'triangle' }); },
  fail() { this.tone({ freq: 180, dur: 0.25, gain: 0.18, type: 'sawtooth', slide: 0.6 }); },
  whistle() { this.burst({ dur: 1.1, freq: 2400, q: 6, gain: 0.08, attack: 0.6, sweep: 0.3 }); },
  impact(near) { this.burst({ dur: 0.9, freq: 300, type: 'lowpass', gain: 0.9 * near, brown: true, sweep: 0.3 }); this.burst({ dur: 0.35, freq: 1800, q: 0.7, gain: 0.25 * near }); this.tone({ freq: 70, dur: 0.6, gain: 0.5 * near, slide: 0.5 }); },
  hurt() { this.burst({ dur: 0.25, freq: 900, q: 1.5, gain: 0.25 }); this.tone({ freq: 120, dur: 0.3, gain: 0.3, type: 'sawtooth', slide: 0.5 }); },
  breath(k) { this.burst({ dur: 0.55, freq: 700, q: 0.6, gain: 0.05 + 0.1 * k, attack: 0.25 }); },
  cough() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ dur: 0.14, freq: 500, q: 0.9, gain: 0.3, brown: true }), i * 170); },
  drink() { for (let i = 0; i < 3; i++) this.tone({ freq: 300 + i * 60, dur: 0.08, gain: 0.08, delay: i * 0.14, slide: 1.6 }); },
  eat() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ dur: 0.06, freq: 2200, q: 1, gain: 0.12 }), i * 140); },
  coin() { this.tone({ freq: 1320, dur: 0.12, gain: 0.1, type: 'square' }); this.tone({ freq: 1760, dur: 0.2, gain: 0.08, type: 'square', delay: 0.08 }); },
  jump() { this.burst({ dur: 0.08, freq: 300, type: 'lowpass', gain: 0.2 }); },
  wave() { this.burst({ dur: 4.5, freq: 200, type: 'lowpass', gain: 1.0, attack: 2.5, brown: true, sweep: 4 }); this.burst({ dur: 4.5, freq: 900, q: 0.5, gain: 0.4, attack: 3 }); },
};
