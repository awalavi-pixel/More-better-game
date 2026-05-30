import * as THREE from 'three';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private indoorReverb: ConvolverNode | null = null;
  private outdoorReverb: ConvolverNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private initialized = false;
  private volumes = { master: 0.8, sfx: 0.8, music: 0.6 };

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumes.master;
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.volumes.sfx;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volumes.music;

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.indoorReverb = this.createReverb('indoor_small');
      this.outdoorReverb = this.createReverb('outdoor');
      this.initialized = true;
    } catch {
      // Audio not available
    }
  }

  private ensureRunning(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.initialized;
  }

  createReverb(type: 'outdoor' | 'indoor_small' | 'indoor_large' | 'tunnel'): ConvolverNode {
    if (!this.ctx) return {} as ConvolverNode;
    const convolver = this.ctx.createConvolver();
    const decayMap = { outdoor: 1.5, indoor_small: 0.5, indoor_large: 2.0, tunnel: 3.0 };
    const decay = decayMap[type] || 1.0;
    const length = Math.floor(this.ctx.sampleRate * decay);
    const buf = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    convolver.buffer = buf;
    return convolver;
  }

  private noise(duration: number, freq1: number, freq2: number, gain: number, destination: AudioNode, when = 0): void {
    if (!this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (freq1 + freq2) / 2;
    filter.Q.value = (freq1 + freq2) / Math.max(1, freq2 - freq1);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(destination);
    src.start(when);
    src.stop(when + duration + 0.01);
  }

  playWeaponShot(weaponName: string, _position: THREE.Vector3, _listenerPos: THREE.Vector3, isSuppressed: boolean): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (isSuppressed) {
      this.noise(0.08, 100, 800, 0.6, this.sfxGain, now);
      // Low thud
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.value = 180;
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(now); osc.stop(now + 0.06);
    } else {
      // Muzzle blast
      this.noise(0.07, 200, 8000, 0.9, this.sfxGain, now);
      // Low bang
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(now); osc.stop(now + 0.08);
    }
    weaponName;
  }

  playDryFire(): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.noise(0.02, 800, 3000, 0.15, this.sfxGain, now);
  }

  playBulletCrack(_position: THREE.Vector3, _listenerPos: THREE.Vector3): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.noise(0.015, 1000, 12000, 0.4, this.sfxGain, now);
  }

  playImpact(material: string, _position: THREE.Vector3, _listenerPos: THREE.Vector3): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    switch (material) {
      case 'metal': this.noise(0.12, 1000, 8000, 0.5, this.sfxGain, now); break;
      case 'flesh': this.noise(0.08, 100, 600, 0.4, this.sfxGain, now); break;
      case 'wood': this.noise(0.1, 400, 2000, 0.45, this.sfxGain, now); break;
      case 'glass': this.noise(0.15, 2000, 12000, 0.6, this.sfxGain, now); break;
      default: this.noise(0.1, 200, 1200, 0.4, this.sfxGain, now); // concrete
    }
  }

  playFootstep(surface: string, _position: THREE.Vector3, _listenerPos: THREE.Vector3, volume: number): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqMap: Record<string, [number, number]> = {
      concrete: [100, 600], metal: [300, 1500], wood: [200, 800], dirt: [80, 400]
    };
    const [f1, f2] = freqMap[surface] || [100, 600];
    this.noise(0.06, f1, f2, volume * 0.3, this.sfxGain, now);
  }

  playExplosion(_position: THREE.Vector3, _listenerPos: THREE.Vector3, _radius: number): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.noise(0.8, 20, 4000, 1.5, this.sfxGain, now);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);
    g.gain.setValueAtTime(1.0, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 1.0);
  }

  playGrenadeBounce(_position: THREE.Vector3, _listenerPos: THREE.Vector3): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.noise(0.04, 400, 2000, 0.2, this.sfxGain, now);
  }

  playConcussionEffect(): void {
    if (!this.masterGain) return;
    // Muffle for 2 seconds
    this.masterGain.gain.setValueAtTime(0.1, 0);
    this.masterGain.gain.linearRampToValueAtTime(this.volumes.master, 2);
  }

  playMeleeSwing(_position: THREE.Vector3, _listenerPos: THREE.Vector3): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.noise(0.05, 200, 1500, 0.3, this.sfxGain, now);
  }

  playReload(_weaponName: string, phase: string, _listenerPos: THREE.Vector3): void {
    if (!this.ensureRunning() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    switch (phase) {
      case 'mag_out': this.noise(0.04, 300, 1200, 0.25, this.sfxGain, now); break;
      case 'mag_in': this.noise(0.04, 400, 1500, 0.3, this.sfxGain, now); break;
      case 'chamber': this.noise(0.03, 500, 2000, 0.2, this.sfxGain, now); break;
    }
  }

  setListenerPosition(_pos: THREE.Vector3, _forward: THREE.Vector3, _up: THREE.Vector3): void {
    // Basic implementation - full 3D would use PannerNode per sound
  }

  playAmbient(_mapName: string): void {
    if (!this.ensureRunning() || !this.ctx || !this.musicGain) return;
    if (this.ambientOsc) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    g.gain.value = 0.02;
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start();
    this.ambientOsc = osc;
  }

  stopAmbient(): void {
    if (this.ambientOsc) {
      try { this.ambientOsc.stop(); } catch { /* already stopped */ }
      this.ambientOsc = null;
    }
  }

  setVolume(category: string, value: number): void {
    this.volumes[category as keyof typeof this.volumes] = value;
    if (!this.ctx) return;
    if (category === 'master' && this.masterGain) this.masterGain.gain.value = value;
    else if (category === 'sfx' && this.sfxGain) this.sfxGain.gain.value = value;
    else if (category === 'music' && this.musicGain) this.musicGain.gain.value = value;
  }

  update(_listenerPos: THREE.Vector3, _listenerForward: THREE.Vector3): void {
    // Update 3D listener position
  }
}
