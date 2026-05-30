import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { EventBus } from '../core/EventBus.ts';

export interface HitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D;
  hitZone: string;
  material: string;
  isEnemy: boolean;
  enemyId?: string;
}

export interface Enemy {
  id: string;
  mesh: THREE.Group;
  takeDamage(amount: number, zone: string, direction: THREE.Vector3): void;
  isAlive(): boolean;
}

export class DamageSystem {
  private enemies: Map<string, Enemy> = new Map();
  private eventBus: EventBus;
  private audioEngine: AudioEngine;
  private raycaster = new THREE.Raycaster();
  private _tempVec = new THREE.Vector3();

  constructor(eventBus: EventBus, audioEngine: AudioEngine) {
    this.eventBus = eventBus;
    this.audioEngine = audioEngine;
  }

  registerEnemy(enemy: Enemy): void {
    this.enemies.set(enemy.id, enemy);
  }

  removeEnemy(id: string): void {
    this.enemies.delete(id);
  }

  performRaycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxRange: number,
    penetration: 'low' | 'medium' | 'high',
    scene: THREE.Scene,
    damage: number,
    caliber: string
  ): HitResult[] {
    this.raycaster.set(origin, direction);
    this.raycaster.far = maxRange;
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    const results: HitResult[] = [];
    const maxHits = penetration === 'low' ? 1 : penetration === 'medium' ? 2 : 3;

    for (const hit of intersects) {
      if (results.length >= maxHits) break;
      const obj = hit.object;
      // Skip invisible/helper objects
      if (!obj.visible) continue;
      // Skip player hand model
      if (obj.userData['isViewModel']) continue;

      const hitZone = (obj.userData['hitZone'] as string) || 'torso';
      const mat = (obj.userData['material'] as string) || 'concrete';
      const isEnemy = !!(obj.userData['isEnemy'] || this.isEnemyObject(obj));
      const point = hit.point.clone();
      const normal = hit.face ? hit.face.normal.clone().transformDirection(obj.matrixWorld) : direction.clone().negate();

      const result: HitResult = {
        point,
        normal,
        distance: hit.distance,
        object: obj,
        hitZone,
        material: mat,
        isEnemy,
        enemyId: obj.userData['enemyId'] as string | undefined,
      };
      results.push(result);

      // Apply damage
      this.applyDamage(result, damage, caliber);
    }
    return results;
  }

  private isEnemyObject(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData['isEnemy'] || current.userData['enemyId']) return true;
      current = current.parent;
    }
    return false;
  }

  private getEnemyId(obj: THREE.Object3D): string | undefined {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData['enemyId']) return current.userData['enemyId'] as string;
      current = current.parent;
    }
    return undefined;
  }

  applyDamage(hit: HitResult, damage: number, _caliber: string): void {
    // Zone multipliers
    let mult = 1.0;
    if (hit.hitZone === 'head') mult = 2.0;
    else if (hit.hitZone === 'limb') mult = 0.7;
    const finalDamage = damage * mult;

    const enemyId = hit.enemyId || this.getEnemyId(hit.object);
    if (enemyId) {
      const enemy = this.enemies.get(enemyId);
      if (enemy && enemy.isAlive()) {
        const dir = new THREE.Vector3().subVectors(hit.point, new THREE.Vector3(0, 1, 0)).normalize();
        enemy.takeDamage(finalDamage, hit.hitZone, dir);
        if (!enemy.isAlive()) {
          this.eventBus.emit('enemyDied', { enemyId, position: { x: hit.point.x, y: hit.point.y, z: hit.point.z } });
          this.eventBus.emit('killFeedAdd', { killerName: 'PLAYER', victimName: 'ENEMY', weaponName: 'MSBS' });
        }
        // Show hit marker
        this.eventBus.emit('weaponFired', { weaponName: 'hit', position: { x: hit.point.x, y: hit.point.y, z: hit.point.z } });
      }
    }

    // Impact effect
    this.spawnImpactEffect(hit, this.audioEngine);
  }

  spawnImpactEffect(hit: HitResult, audioEngine: AudioEngine): void {
    audioEngine.playImpact(hit.material, hit.point, hit.point);
  }

  setAudioEngine(ae: AudioEngine): void {
    this.audioEngine = ae;
  }
}
