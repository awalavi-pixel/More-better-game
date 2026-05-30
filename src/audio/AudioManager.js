class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.buffers = {};
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.gain.value = 0.8;
      this.musicGain.gain.value = 0.4;
    } catch (e) {
      console.warn('AudioManager: WebAudio unavailable');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _noise(duration, freq, type = 'sawtooth', gain = 0.5, decay = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.1 + 1, this.ctx.currentTime + duration);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _whiteNoise(duration, gain = 0.3) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.start();
    src.stop(this.ctx.currentTime + duration + 0.05);
  }

  playGunshot(suppressed = false) {
    if (!this.ctx) return;
    if (suppressed) {
      this._whiteNoise(0.08, 0.2);
      this._noise(0.1, 800, 'sine', 0.15, 0.08);
    } else {
      this._whiteNoise(0.15, 0.6);
      this._noise(0.2, 200, 'sawtooth', 0.8, 0.12);
      this._noise(0.1, 80, 'square', 0.5, 0.05);
    }
  }

  playReload() {
    if (!this.ctx) return;
    this._noise(0.1, 400, 'square', 0.3, 0.08);
    setTimeout(() => this._noise(0.05, 600, 'square', 0.25, 0.04), 150);
    setTimeout(() => this._noise(0.08, 300, 'sawtooth', 0.2, 0.06), 400);
  }

  playEmptyClick() {
    if (!this.ctx) return;
    this._noise(0.05, 1200, 'square', 0.2, 0.04);
  }

  playFootstep() {
    if (!this.ctx) return;
    this._whiteNoise(0.06, 0.08);
    this._noise(0.06, 60, 'sine', 0.15, 0.05);
  }

  playExplosion() {
    if (!this.ctx) return;
    this._whiteNoise(0.5, 0.8);
    this._noise(0.6, 40, 'sawtooth', 1.0, 0.4);
    this._noise(0.3, 80, 'square', 0.7, 0.2);
  }

  playHitMarker() {
    if (!this.ctx) return;
    this._noise(0.05, 2000, 'sine', 0.3, 0.04);
  }

  playHeadshotMarker() {
    if (!this.ctx) return;
    this._noise(0.1, 3000, 'sine', 0.4, 0.08);
    this._noise(0.08, 2000, 'sine', 0.3, 0.06);
  }

  playUIBeep(freq = 1000) {
    if (!this.ctx) return;
    this._noise(0.05, freq, 'sine', 0.2, 0.04);
  }

  playAlarm() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(660, t + 0.2);
    osc.frequency.setValueAtTime(880, t + 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.setValueAtTime(0, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  playDroneHum() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playGrenadeBounce() {
    if (!this.ctx) return;
    this._noise(0.08, 400, 'sine', 0.3, 0.06);
  }

  speak(text, voice = 'female', rate = 0.95) {
    if (!window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.pitch = voice === 'female' ? 1.2 : 0.9;
    utt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (voice === 'female') {
        const f = voices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
        if (f) utt.voice = f;
      } else {
        const m = voices.find(v => v.name.toLowerCase().includes('male') || v.name.includes('Daniel') || v.name.includes('Google UK'));
        if (m) utt.voice = m;
      }
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  setVolume(sfx, music) {
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.musicGain) this.musicGain.gain.value = music;
  }
}

window.AudioManager = AudioManager;
