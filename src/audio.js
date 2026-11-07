export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.drillGain = null;
    this.drillOsc = null;
    this.drillNoiseGain = null;
    this.windGain = null;
    this.muted = false;
    this.ready = false;
  }

  init() {
    if (this.ready) {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);

      // Desert wind bed.
      const wind = this.ctx.createBufferSource();
      wind.buffer = this.noiseBuffer(3);
      wind.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 260;
      windFilter.Q.value = 0.5;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.035;
      wind.connect(windFilter).connect(this.windGain).connect(this.master);
      wind.start();

      // Drill rumble: oscillator + filtered noise.
      this.drillGain = this.ctx.createGain();
      this.drillGain.gain.value = 0;
      this.drillGain.connect(this.master);

      this.drillOsc = this.ctx.createOscillator();
      this.drillOsc.type = 'sawtooth';
      this.drillOsc.frequency.value = 43;
      const drillFilter = this.ctx.createBiquadFilter();
      drillFilter.type = 'lowpass';
      drillFilter.frequency.value = 170;
      const oscGain = this.ctx.createGain();
      oscGain.gain.value = 0.15;
      this.drillOsc.connect(drillFilter).connect(oscGain).connect(this.drillGain);
      this.drillOsc.start();

      const drillNoise = this.ctx.createBufferSource();
      drillNoise.buffer = this.noiseBuffer(2);
      drillNoise.loop = true;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 310;
      noiseFilter.Q.value = 0.8;
      this.drillNoiseGain = this.ctx.createGain();
      this.drillNoiseGain.gain.value = 0.1;
      drillNoise.connect(noiseFilter).connect(this.drillNoiseGain).connect(this.drillGain);
      drillNoise.start();

      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  noiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  setDrill(on) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.drillGain.gain.cancelScheduledValues(now);
    this.drillGain.gain.setTargetAtTime(on ? 0.16 : 0, now, on ? 0.18 : 0.25);
    if (this.drillOsc) this.drillOsc.frequency.setTargetAtTime(on ? 47 : 43, now, 0.2);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ready) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.08);
  }

  tone(freq, duration = 0.12, type = 'sine', volume = 0.08, delay = 0) {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  click() {
    this.tone(700, 0.045, 'square', 0.025);
  }

  pour() {
    this.tone(180, 0.28, 'sine', 0.07);
    this.tone(250, 0.2, 'triangle', 0.035, 0.05);
  }

  buy() {
    this.tone(620, 0.1, 'triangle', 0.05);
    this.tone(880, 0.16, 'triangle', 0.045, 0.08);
  }

  upgrade() {
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.05, i * 0.07));
  }

  milestone() {
    [196, 294, 392].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, i * 0.12));
  }

  victory() {
    [262, 330, 392, 523, 659].forEach((f, i) => this.tone(f, 0.8, 'sine', 0.075, i * 0.15));
  }

  error() {
    this.tone(130, 0.14, 'square', 0.045);
  }
}
