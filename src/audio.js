/* Tiny procedural sound engine (no assets). */

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.noise = null;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  burst({ dur = 0.14, gain = 0.2, type = 'lowpass', freq = 900, q = 0.9, sweep = 0, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.02);
  }
  tone({ freq = 220, dur = 0.12, gain = 0.08, type = 'sine', delay = 0, slide = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  breakBlock(sound) {
    if (sound === 'stone') {
      this.burst({ freq: 520, gain: 0.34, dur: 0.2, sweep: -320 });
      this.tone({ freq: 110, dur: 0.09, gain: 0.12, slide: -40 });
    } else if (sound === 'wood') {
      this.burst({ freq: 780, gain: 0.26, dur: 0.18, type: 'bandpass', q: 1.6 });
      this.tone({ freq: 190, dur: 0.1, gain: 0.09, type: 'triangle', slide: -50 });
    } else if (sound === 'sand') {
      this.burst({ freq: 1500, gain: 0.2, dur: 0.17 });
    } else if (sound === 'glass') {
      this.tone({ freq: 1100, dur: 0.09, gain: 0.08, type: 'triangle', slide: -500 });
      this.tone({ freq: 1560, dur: 0.14, gain: 0.05, type: 'sine', slide: -700, delay: 0.02 });
    } else if (sound === 'snow') {
      this.burst({ freq: 900, gain: 0.14, dur: 0.12 });
    } else {
      this.burst({ freq: 1050, gain: 0.17, dur: 0.14 });
    }
  }
  placeBlock(sound) {
    if (sound === 'stone') this.tone({ freq: 150, dur: 0.07, gain: 0.11, type: 'square', slide: -40 });
    else if (sound === 'wood') this.tone({ freq: 220, dur: 0.08, gain: 0.09, type: 'triangle', slide: -60 });
    else this.burst({ freq: 700, gain: 0.14, dur: 0.09 });
    this.burst({ freq: 1100, gain: 0.08, dur: 0.05 });
  }
  step(sound) {
    if (sound === 'stone') this.burst({ freq: 420, gain: 0.07, dur: 0.06 });
    else if (sound === 'wood') this.burst({ freq: 620, gain: 0.06, dur: 0.06, type: 'bandpass', q: 1.8 });
    else if (sound === 'sand') this.burst({ freq: 1400, gain: 0.05, dur: 0.07 });
    else this.burst({ freq: 900, gain: 0.055, dur: 0.06 });
  }
  plop() {
    this.tone({ freq: 320, dur: 0.1, gain: 0.07, slide: -120 });
    this.burst({ freq: 800, gain: 0.08, dur: 0.08 });
  }
  click() {
    this.tone({ freq: 620, dur: 0.045, gain: 0.04, type: 'square' });
  }
}
