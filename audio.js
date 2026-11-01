// WebAudio synth sound effects (no files)
export const Sfx = {
  ctx: null, master: null, rumbleGain: null,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.comp = C.createDynamicsCompressor(); Object.assign(this.comp, {}); this.comp.threshold.value = -18; this.comp.knee.value = 12; this.comp.ratio.value = 8; this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
    this.soft = C.createBiquadFilter(); this.soft.type = 'lowpass'; this.soft.frequency.value = 6000; this.soft.Q.value = 0.5;
    this.out = C.createGain(); this.out.gain.value = 0.7; this.out.connect(this.soft).connect(this.comp).connect(C.destination);
    this.master = C.createGain(); this.master.gain.value = this.vol.sfx; this.master.connect(this.out);
    this.musicBus = C.createGain(); this.musicBus.gain.value = this.vol.music; this.musicBus.connect(this.out);
    const len = C.sampleRate * 2; this.noise = C.createBuffer(1, len, C.sampleRate); const d = this.noise.getChannelData(0);
    let b = 0; this.brown = C.createBuffer(1, len, C.sampleRate); const bd = this.brown.getChannelData(0);
    let p0 = 0, p1 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; p0 = 0.97 * p0 + 0.03 * w; p1 = 0.6 * p1 + 0.4 * w; d[i] = (p0 * 2.2 + p1 * 0.5); b = (b + 0.02 * w) / 1.02; bd[i] = b * 3.5; }
    const fadeN = 2048; for (let i = 0; i < fadeN; i++) { const k = i / fadeN; d[i] *= k; d[len - 1 - i] *= k; bd[i] *= k; bd[len - 1 - i] *= k; }
    // continuous volcanic rumble
    const src = C.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
    this.rumbleGain = C.createGain(); this.rumbleGain.gain.value = 0.0;
    src.connect(lp).connect(this.rumbleGain).connect(this.master); src.start();
    // wind/ash bed
    const w = C.createBufferSource(); w.buffer = this.noise; w.loop = true; const bp = C.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 320; bp.Q.value = 0.3;
    this.windGain = C.createGain(); this.windGain.gain.value = 0.0; w.connect(bp).connect(this.windGain).connect(this.master); w.start();
    // crowd murmur: several formant-ish bands of noise with slow random amplitude
    this.crowdGain = C.createGain(); this.crowdGain.gain.value = 0; this.crowdGain.connect(this.master); this.crowdLfos = [];
    
    this.startMusic();
  },
  vol: (() => { try { return Object.assign({ music: 0.1, sfx: 0.8 }, JSON.parse(localStorage.getItem('adam_audio') || '{}')); } catch (e) { return { music: 0.1, sfx: 0.8 }; } })(),
  setVol(kind, v) { this.vol[kind] = v; try { localStorage.setItem('adam_audio', JSON.stringify(this.vol)); } catch (e) { }
    if (!this.ctx) return; (kind === 'music' ? this.musicBus : this.master).gain.setTargetAtTime(v, this.t(), 0.05); },
  // very quiet ambient pad: slow warm major-7 chords (Lydian-ish, sunny), 16 s per chord
  startMusic() {
    const C = this.ctx, lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.musicBus);
    const chords = [[261.6, 329.6, 392, 493.9], [220, 277.2, 329.6, 415.3], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 370]];
    let i = 0; const play = () => { if (!this.ctx) return; const t = this.t(), ch = chords[i++ % chords.length];
      ch.forEach((f, k) => { for (const det of [-4, 4]) { const o = C.createOscillator(); o.type = k ? 'sine' : 'triangle'; o.frequency.value = f * (k ? 1 : 0.5); o.detune.value = det;
        const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 5); g.gain.setValueAtTime(0.05, t + 12); g.gain.linearRampToValueAtTime(0, t + 18);
        o.connect(g).connect(lp); o.start(t); o.stop(t + 18.2); } });
      // a few soft lyre plucks
      for (let n = 0; n < 3; n++) this.tone({ freq: ch[(n * 2 + i) % 4] * 2, dur: 2.5, gain: 0.04, delay: 3 + n * 4 + Math.random(), type: 'triangle', attack: 0.005, bus: this.musicBus });
      this.musicT = setTimeout(play, 16000); };
    play();
  },
  setCrowd(level, panic) { return; if (!this.ctx) return; const t = this.t(); this.crowdGain.gain.setTargetAtTime(level, t, 0.6);
    for (const L of this.crowdLfos) { L.g.gain.setTargetAtTime(0.06 + Math.random() * 0.14 * (1 + panic), t, 0.15); L.bp.frequency.setTargetAtTime(L.f * (1 + 0.25 * panic) * (0.9 + Math.random() * 0.2), t, 0.2); } },
  t() { return this.ctx.currentTime; },
  setAmbience(rumble, wind) { if (!this.ctx) return; this.rumbleGain.gain.setTargetAtTime(rumble, this.t(), 0.3); this.windGain.gain.setTargetAtTime(Math.min(wind, 1) * 0.25, this.t(), 0.8); },
  burst({ dur = 0.1, freq = 800, q = 1, type = 'bandpass', gain = 0.3, attack = 0.005, sweep = 0, brown = false }) {
    if (!this.ctx) return; const C = this.ctx, t = this.t();
    const s = C.createBufferSource(); s.buffer = brown ? this.brown : this.noise; freq = Math.min(freq, 1400); gain *= 0.6; attack = Math.max(attack, 0.012); const f = C.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = Math.min(q, 2);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp2 = C.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 2200; s.connect(f).connect(lp2).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  },
  tone({ freq = 440, dur = 0.2, type = 'sine', gain = 0.2, delay = 0, slide = 0, attack = 0.01, bus = null }) {
    if (!this.ctx) return; const C = this.ctx, t = this.t() + delay;
    const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (type === 'square' || type === 'sawtooth') gain *= 0.5;
    o.connect(g).connect(bus || this.master); o.start(t); o.stop(t + dur + 0.05);
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
  cough(k = 1) { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ dur: 0.14, freq: 420, q: 0.9, gain: 0.3 * k, brown: true, type: 'lowpass' }), i * 170); },
  drink() { for (let i = 0; i < 3; i++) this.tone({ freq: 300 + i * 60, dur: 0.08, gain: 0.08, delay: i * 0.14, slide: 1.6 }); },
  eat() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ dur: 0.06, freq: 2200, q: 1, gain: 0.12 }), i * 140); },
  coin() { this.tone({ freq: 1320, dur: 0.12, gain: 0.1, type: 'square' }); this.tone({ freq: 1760, dur: 0.2, gain: 0.08, type: 'square', delay: 0.08 }); },
  jump() { this.burst({ dur: 0.08, freq: 300, type: 'lowpass', gain: 0.2 }); },
  wave() { this.burst({ dur: 4.5, freq: 200, type: 'lowpass', gain: 1.0, attack: 2.5, brown: true, sweep: 4 }); this.burst({ dur: 4.5, freq: 900, q: 0.5, gain: 0.4, attack: 3 }); },
  // surface-aware footsteps: stone (default), wood (harbor), gravel (rubble/ash)
  stepOn(surface, run) { const g = run ? 1.3 : 1;
    if (surface === 'wood') { this.tone({ freq: run ? 180 : 150, dur: 0.09, gain: 0.12 * g, type: 'triangle', slide: 0.7 }); this.burst({ dur: 0.05, freq: 900, q: 1.2, gain: 0.08 * g }); }
    else if (surface === 'gravel') { this.burst({ dur: 0.16, freq: 2600, q: 0.6, gain: 0.12 * g }); this.burst({ dur: 0.08, freq: 200, type: 'lowpass', gain: 0.15 * g }); }
    else { this.burst({ dur: 0.07, freq: run ? 620 : 480, q: 1.4, gain: 0.14 * g }); this.burst({ dur: 0.05, freq: 130, type: 'lowpass', gain: 0.2 * g }); } },
  chirp() { const f = 2600 + Math.random() * 1500; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone({ freq: f, dur: 0.07, gain: 0.025, delay: i * 0.11, slide: 1.4 + Math.random() * 0.4 }); },
  coo() { this.tone({ freq: 420, dur: 0.35, gain: 0.04, slide: 0.8 }); this.tone({ freq: 380, dur: 0.4, gain: 0.035, delay: 0.38, slide: 0.75 }); },
  flap() { for (let i = 0; i < 6; i++) this.burst({ dur: 0.05, freq: 1400, q: 0.8, gain: 0.07, delay: 0, attack: 0.002 }); },
  shout(k = 1) { const f = 230 + Math.random() * 120; this.tone({ freq: f, dur: 0.5, gain: 0.035 * k, type: 'triangle', slide: 0.8, attack: 0.04 }); this.tone({ freq: f * 2.02, dur: 0.45, gain: 0.012 * k, type: 'sine', slide: 0.8, attack: 0.04 }); },
  call() { const f = 180 + Math.random() * 90; this.tone({ freq: f, dur: 0.25, gain: 0.03, type: 'sawtooth', slide: 1.25 }); this.tone({ freq: f * 1.2, dur: 0.35, gain: 0.025, type: 'sawtooth', delay: 0.28, slide: 0.8 }); },
  rumble(k = 1) { this.burst({ dur: 3.5, freq: 70, type: 'lowpass', gain: 0.7 * k, attack: 0.8, brown: true, sweep: 1.6 }); },
  crash(near) { this.impact(near); for (let i = 0; i < 5; i++) setTimeout(() => this.burst({ dur: 0.08, freq: 1500 + Math.random() * 2500, q: 2, gain: 0.12 * near }), 60 + i * 55 + Math.random() * 40); },
  rip() { this.burst({ dur: 0.22, freq: 3000, q: 0.7, gain: 0.12, sweep: 0.5 }); },
  zap() { this.tone({ freq: 300, dur: 0.6, gain: 0.06, type: 'sawtooth', slide: 6 }); setTimeout(() => { this.burst({ dur: 0.18, freq: 400, type: 'lowpass', gain: 0.5, brown: true }); this.tone({ freq: 90, dur: 0.2, gain: 0.3, type: 'square', slide: 0.5 }); }, 600); },
  uiClick() { this.tone({ freq: 1800, dur: 0.03, gain: 0.05, type: 'square' }); },
  alarm() { for (let i = 0; i < 3; i++) { this.tone({ freq: 880, dur: 0.18, gain: 0.08, type: 'square', delay: i * 0.4 }); this.tone({ freq: 660, dur: 0.18, gain: 0.08, type: 'square', delay: i * 0.4 + 0.2 }); } },
};
