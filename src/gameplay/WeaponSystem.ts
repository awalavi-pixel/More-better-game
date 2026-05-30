import * as THREE from 'three';
import type { WeaponBase } from './WeaponBase.ts';
import type { InputManager } from '../core/InputManager.ts';
import type { DamageSystem } from './DamageSystem.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { EventBus } from '../core/EventBus.ts';

export class WeaponSystem {
  private slots: (WeaponBase | null)[] = [null, null, null];
  private currentSlot = 0;
  private switchTimer = 0;
  private isSwitching = false;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  equip(slot: number, weapon: WeaponBase): void {
    this.slots[slot] = weapon;
  }

  getCurrentWeapon(): WeaponBase | null {
    return this.slots[this.currentSlot];
  }

  getAmmoState(): { current: number; reserve: number; weaponName: string } {
    const w = this.getCurrentWeapon();
    if (!w) return { current: 0, reserve: 0, weaponName: '' };
    return { current: w.state.currentAmmo, reserve: w.state.reserveAmmo, weaponName: w.stats.name };
  }

  switchTo(slot: number): void {
    if (slot === this.currentSlot) return;
    if (!this.slots[slot]) return;
    this.isSwitching = true;
    this.switchTimer = 0.3;
    const prev = this.getCurrentWeapon();
    if (prev) prev.cancelReload();
    this.currentSlot = slot;
  }

  update(dt: number, input: InputManager, camera: THREE.Camera, scene: THREE.Scene, damageSystem: DamageSystem, audioEngine: AudioEngine): void {
    if (this.switchTimer > 0) {
      this.switchTimer -= dt;
      if (this.switchTimer <= 0) this.isSwitching = false;
    }

    // Slot switching
    if (input.weaponSlot1) this.switchTo(0);
    if (input.weaponSlot2) this.switchTo(1);
    if (input.weaponSlot3) this.switchTo(2);

    // Scroll
    if (input.mouse.scrollDelta > 50) this.switchTo((this.currentSlot + 1) % 2);
    else if (input.mouse.scrollDelta < -50) this.switchTo((this.currentSlot + 1) % 2);

    const w = this.getCurrentWeapon();
    if (!w || this.isSwitching) return;

    w.update(dt);
    w.toggleADS(input.ads);

    if (input.reload) w.startReload();

    if (w.stats.isAutoFire) {
      if (input.fire && !w.state.isReloading) {
        const fired = w.fire(camera, scene, damageSystem, audioEngine);
        if (fired) {
          this.eventBus.emit('weaponFired', {
            weaponName: w.stats.name,
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
          });
          this.eventBus.emit('ammoChanged', { current: w.state.currentAmmo, reserve: w.state.reserveAmmo, weaponName: w.stats.name });
        }
      }
    } else {
      if (input.fireJustPressed && !w.state.isReloading) {
        const fired = w.fire(camera, scene, damageSystem, audioEngine);
        if (fired) {
          this.eventBus.emit('weaponFired', {
            weaponName: w.stats.name,
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
          });
          this.eventBus.emit('ammoChanged', { current: w.state.currentAmmo, reserve: w.state.reserveAmmo, weaponName: w.stats.name });
        }
      }
    }

    // Auto-reload when empty
    if (w.state.currentAmmo === 0 && !w.state.isReloading) {
      w.startReload();
    }
  }
}
