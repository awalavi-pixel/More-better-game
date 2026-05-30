import * as THREE from 'three';
import type { ProjectileSystem } from './ProjectileSystem.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';

export class EquipmentSystem {
  public grenadeCount = 4;
  public tacticalCount = 2;
  private projectileSystem: ProjectileSystem;
  private audioEngine: AudioEngine;
  private flashTimer = 0;
  private flashEl: HTMLElement | null;
  private smokeList: { pos: THREE.Vector3; timeLeft: number }[] = [];

  constructor(projectileSystem: ProjectileSystem, audioEngine: AudioEngine) {
    this.projectileSystem = projectileSystem;
    this.audioEngine = audioEngine;
    this.flashEl = document.createElement('div');
    this.flashEl.style.cssText = 'position:fixed;inset:0;background:white;pointer-events:none;opacity:0;transition:opacity 0.1s;z-index:999;';
    document.body.appendChild(this.flashEl);
  }

  throwLethal(type: string, origin: THREE.Vector3, direction: THREE.Vector3, force: number): void {
    if (this.grenadeCount <= 0) return;
    this.grenadeCount--;
    if (type === 'frag') {
      this.projectileSystem.spawnGrenade(origin.clone(), direction.clone(), force, 80, 3.0);
    } else if (type === 'semtex') {
      this.projectileSystem.spawnGrenade(origin.clone(), direction.clone(), force, 90, 2.5);
    }
    this.audioEngine.playGrenadeBounce(origin, origin);
  }

  throwTactical(type: string, origin: THREE.Vector3, direction: THREE.Vector3): void {
    if (this.tacticalCount <= 0) return;
    this.tacticalCount--;
    if (type === 'flashbang') {
      this.projectileSystem.spawnGrenade(origin.clone(), direction.clone(), 8, 0, 2.0);
      // Simplified flash effect
      setTimeout(() => this.triggerFlashbang(), 2200);
    } else if (type === 'smoke') {
      this.smokeList.push({ pos: origin.clone().addScaledVector(direction, 5), timeLeft: 10 });
    }
  }

  private triggerFlashbang(): void {
    if (!this.flashEl) return;
    this.flashEl.style.opacity = '1';
    this.flashTimer = 3.0;
  }

  update(dt: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        if (this.flashEl) this.flashEl.style.opacity = '0';
      }
    }
    for (let i = this.smokeList.length - 1; i >= 0; i--) {
      this.smokeList[i].timeLeft -= dt;
      if (this.smokeList[i].timeLeft <= 0) this.smokeList.splice(i, 1);
    }
  }

  isSmokeAt(pos: THREE.Vector3, radius = 3): boolean {
    for (const s of this.smokeList) {
      if (s.pos.distanceTo(pos) < radius) return true;
    }
    return false;
  }
}
