import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { DamageSystem } from './DamageSystem.ts';

export interface WeaponStats {
  name: string;
  caliber: string;
  damage: number;
  damageDropStart: number;
  damageDropEnd: number;
  minDamage: number;
  rpm: number;
  magSize: number;
  reserveAmmo: number;
  reloadEmpty: number;
  reloadTactical: number;
  adsTime: number;
  hipfireSpread: number;
  adsSpread: number;
  recoilPattern: Array<{ x: number; y: number }>;
  penetration: 'low' | 'medium' | 'high';
  muzzleVelocity: number;
  isSuppressed: boolean;
  isAutoFire: boolean;
  burstCount: number;
  pelletCount: number;
  ballisticDrop: boolean;
}

export interface WeaponState {
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isADS: boolean;
  reloadTimer: number;
  fireTimer: number;
  recoilIndex: number;
  recoilRecoveryTimer: number;
  currentSpread: number;
  adsProgress: number;
  burstCount: number;
  burstTimer: number;
}

export abstract class WeaponBase {
  public stats: WeaponStats;
  public state: WeaponState;
  public viewModel: THREE.Group | null = null;
  protected fireInterval: number;

  constructor(stats: WeaponStats) {
    this.stats = stats;
    this.fireInterval = 60 / stats.rpm;
    this.state = {
      currentAmmo: stats.magSize,
      reserveAmmo: stats.reserveAmmo,
      isReloading: false,
      isADS: false,
      reloadTimer: 0,
      fireTimer: 0,
      recoilIndex: 0,
      recoilRecoveryTimer: 0,
      currentSpread: stats.hipfireSpread,
      adsProgress: 0,
      burstCount: 0,
      burstTimer: 0,
    };
  }

  fire(camera: THREE.Camera, scene: THREE.Scene, damageSystem: DamageSystem, audioEngine: AudioEngine): boolean {
    if (this.state.isReloading) return false;
    if (this.state.fireTimer > 0) return false;
    if (this.state.currentAmmo <= 0) {
      audioEngine.playDryFire();
      return false;
    }
    if (this.stats.burstCount > 1 && this.state.burstCount > 0) return false;

    this.state.currentAmmo--;
    this.state.fireTimer = this.fireInterval;
    if (this.stats.burstCount > 1) {
      this.state.burstCount = this.stats.burstCount;
      this.state.burstTimer = 0.05;
    }

    // Raycast
    const spread = this.getSpread();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);

    const pellets = this.stats.pelletCount || 1;
    for (let i = 0; i < pellets; i++) {
      const sx = (Math.random() - 0.5) * spread * 0.01745;
      const sy = (Math.random() - 0.5) * spread * 0.01745;
      const shotDir = dir.clone();
      shotDir.x += sx; shotDir.y += sy;
      shotDir.normalize();
      damageSystem.performRaycast(origin, shotDir, 500, this.stats.penetration, scene, this.stats.damage, this.stats.caliber);
    }

    this.applyRecoil(camera as THREE.PerspectiveCamera);
    audioEngine.playWeaponShot(this.stats.name, origin, origin, this.stats.isSuppressed);
    return true;
  }

  startReload(): void {
    if (this.state.isReloading) return;
    if (this.state.currentAmmo === this.stats.magSize) return;
    if (this.state.reserveAmmo <= 0) return;
    this.state.isReloading = true;
    const time = this.state.currentAmmo === 0 ? this.stats.reloadEmpty : this.stats.reloadTactical;
    this.state.reloadTimer = time / 1000;
  }

  cancelReload(): void {
    this.state.isReloading = false;
    this.state.reloadTimer = 0;
  }

  toggleADS(active: boolean): void {
    this.state.isADS = active;
  }

  update(dt: number): void {
    if (this.state.fireTimer > 0) this.state.fireTimer -= dt;
    if (this.state.fireTimer < 0) this.state.fireTimer = 0;

    // Burst handling
    if (this.stats.burstCount > 1 && this.state.burstCount > 0) {
      this.state.burstTimer -= dt;
      if (this.state.burstTimer <= 0 && this.state.burstCount > 0) {
        this.state.burstCount--;
        this.state.burstTimer = 0.05;
        if (this.state.burstCount === 0) {
          this.state.fireTimer = this.fireInterval * 2;
        }
      }
    }

    // Reload
    if (this.state.isReloading) {
      this.state.reloadTimer -= dt;
      if (this.state.reloadTimer <= 0) {
        const needed = this.stats.magSize - this.state.currentAmmo;
        const take = Math.min(needed, this.state.reserveAmmo);
        this.state.currentAmmo += take;
        this.state.reserveAmmo -= take;
        this.state.isReloading = false;
        this.state.reloadTimer = 0;
      }
    }

    // ADS transition
    const adsTarget = this.state.isADS ? 1 : 0;
    const adsSpeed = 1 / (this.stats.adsTime / 1000);
    this.state.adsProgress += (adsTarget - this.state.adsProgress) * Math.min(1, adsSpeed * dt);

    // Spread recovery
    const targetSpread = this.state.isADS ? this.stats.adsSpread : this.stats.hipfireSpread;
    this.state.currentSpread += (targetSpread - this.state.currentSpread) * Math.min(1, 5 * dt);

    // Recoil recovery
    if (this.state.recoilRecoveryTimer > 0) {
      this.state.recoilRecoveryTimer -= dt;
    } else if (this.state.recoilIndex > 0) {
      this.state.recoilIndex = Math.max(0, this.state.recoilIndex - 1);
    }
  }

  getDamageAtRange(range: number): number {
    if (range <= this.stats.damageDropStart) return this.stats.damage;
    if (range >= this.stats.damageDropEnd) return this.stats.minDamage;
    const t = (range - this.stats.damageDropStart) / (this.stats.damageDropEnd - this.stats.damageDropStart);
    return this.stats.damage + (this.stats.minDamage - this.stats.damage) * t;
  }

  getSpread(): number {
    return this.state.currentSpread;
  }

  applyRecoil(camera: THREE.PerspectiveCamera): void {
    const pattern = this.stats.recoilPattern;
    if (pattern.length === 0) return;
    const idx = this.state.recoilIndex % pattern.length;
    const recoil = pattern[idx];
    // Recoil is applied as camera euler rotation
    (camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData =
      (camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData || {};
    (camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData.recoilX =
      ((camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData.recoilX || 0) + recoil.y * 0.003;
    (camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData.recoilY =
      ((camera as unknown as { userData: { recoilX: number; recoilY: number } }).userData.recoilY || 0) + recoil.x * 0.001;
    this.state.recoilIndex++;
    this.state.recoilRecoveryTimer = 0.15;
    this.state.currentSpread = Math.min(this.state.currentSpread + 0.5, this.stats.hipfireSpread * 2);
  }

  createViewModel(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), mat);
    body.position.set(0.18, -0.12, -0.35);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.18, -0.115, -0.58);
    group.add(body, barrel);
    this.viewModel = group;
    return group;
  }
}
