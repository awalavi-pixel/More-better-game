import type { AudioEngine } from './AudioEngine.ts';
import * as THREE from 'three';

export class WeaponAudio {
  private audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  playShot(weaponName: string, pos: THREE.Vector3, isSuppressed: boolean): void {
    this.audioEngine.playWeaponShot(weaponName, pos, pos, isSuppressed);
  }
}
