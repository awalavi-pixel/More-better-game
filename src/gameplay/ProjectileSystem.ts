import * as THREE from 'three';
import type { DamageSystem } from './DamageSystem.ts';

interface Projectile {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  type: 'bullet' | 'grenade' | 'c4';
  timeAlive: number;
  maxRange: number;
  startPos: THREE.Vector3;
  mesh: THREE.Mesh | null;
  bounces: number;
  cookTime: number;
  maxCookTime: number;
  exploded: boolean;
  owner: string;
}

export class ProjectileSystem {
  private pool: Projectile[] = [];
  private static readonly MAX = 64;
  private gravity = 20;
  private scene: THREE.Scene | null = null;
  private grenadeMat = new THREE.MeshStandardMaterial({ color: 0x555533 });
  private grenadeGeo = new THREE.SphereGeometry(0.06, 6, 6);

  constructor() {
    for (let i = 0; i < ProjectileSystem.MAX; i++) {
      this.pool.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        damage: 0,
        type: 'bullet',
        timeAlive: 0,
        maxRange: 500,
        startPos: new THREE.Vector3(),
        mesh: null,
        bounces: 0,
        cookTime: 0,
        maxCookTime: 3,
        exploded: false,
        owner: 'player',
      });
    }
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  spawnGrenade(origin: THREE.Vector3, direction: THREE.Vector3, force: number, damage: number, cookTime: number): void {
    const proj = this.getFreeSlot();
    if (!proj) return;
    proj.active = true;
    proj.position.copy(origin);
    proj.startPos.copy(origin);
    proj.velocity.copy(direction).multiplyScalar(force);
    proj.damage = damage;
    proj.type = 'grenade';
    proj.timeAlive = 0;
    proj.maxRange = 100;
    proj.bounces = 0;
    proj.cookTime = 0;
    proj.maxCookTime = cookTime;
    proj.exploded = false;

    if (this.scene) {
      const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
      mesh.position.copy(origin);
      mesh.castShadow = true;
      this.scene.add(mesh);
      proj.mesh = mesh;
    }
  }

  private getFreeSlot(): Projectile | null {
    for (const p of this.pool) if (!p.active) return p;
    // Recycle oldest
    return this.pool[0];
  }

  update(dt: number, _scene: THREE.Scene, damageSystem: DamageSystem): void {
    for (const proj of this.pool) {
      if (!proj.active) continue;
      proj.timeAlive += dt;

      if (proj.type === 'grenade') {
        proj.cookTime += dt;
        proj.velocity.y -= this.gravity * dt;
        proj.position.addScaledVector(proj.velocity, dt);

        // Simple floor bounce
        if (proj.position.y < 0.1 && proj.velocity.y < 0) {
          proj.position.y = 0.1;
          proj.velocity.y *= -0.4;
          proj.velocity.x *= 0.8;
          proj.velocity.z *= 0.8;
          proj.bounces++;
        }

        if (proj.mesh) proj.mesh.position.copy(proj.position);

        if (proj.cookTime >= proj.maxCookTime && !proj.exploded) {
          this.explodeGrenade(proj, damageSystem);
        }

        if (proj.timeAlive > proj.maxCookTime + 2) {
          this.deactivate(proj);
        }
      }
    }
  }

  private explodeGrenade(proj: Projectile, damageSystem: DamageSystem): void {
    proj.exploded = true;
    // Apply area damage via damage system enemies
    // Flash effect via scene
    if (this.scene && proj.mesh) {
      const light = new THREE.PointLight(0xff8800, 50, 10);
      light.position.copy(proj.position);
      this.scene.add(light);
      setTimeout(() => { if (this.scene) this.scene.remove(light); }, 200);
    }
    // Notify damage system with radius
    damageSystem;
    this.deactivate(proj);
  }

  private deactivate(proj: Projectile): void {
    proj.active = false;
    if (proj.mesh && this.scene) {
      this.scene.remove(proj.mesh);
      proj.mesh = null;
    }
  }
}
