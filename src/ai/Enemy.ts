import * as THREE from 'three';
import { EnemySoldier } from '../characters/EnemySoldier.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { DamageSystem, Enemy as EnemyInterface } from '../gameplay/DamageSystem.ts';

export class Enemy implements EnemyInterface {
  public id: string;
  public mesh: THREE.Group;
  private soldier: EnemySoldier;
  private _isMoving = false;

  constructor(id: string, position: THREE.Vector3, audioEngine: AudioEngine) {
    this.id = id;
    audioEngine;
    this.soldier = new EnemySoldier(0x3a4a2a);
    this.soldier.setId(id);
    this.mesh = this.soldier.group;
    this.mesh.position.copy(position);
    this.mesh.userData['enemyId'] = id;
  }

  takeDamage(amount: number, zone: string, _direction: THREE.Vector3): void {
    this.soldier.takeDamage(amount, zone);
  }

  isAlive(): boolean {
    return this.soldier.isAlive();
  }

  getHeadPosition(): THREE.Vector3 {
    return this.soldier.getHeadPosition();
  }

  getChestPosition(): THREE.Vector3 {
    return this.soldier.getChestPosition();
  }

  setIsMoving(v: boolean): void {
    this._isMoving = v;
  }

  setPosition(pos: THREE.Vector3): void {
    this.mesh.position.copy(pos);
  }

  lookAt(target: THREE.Vector3): void {
    const look = target.clone();
    look.y = this.mesh.position.y;
    this.mesh.lookAt(look);
  }

  register(damageSystem: DamageSystem): void {
    damageSystem.registerEnemy(this);
  }

  unregister(damageSystem: DamageSystem): void {
    damageSystem.removeEnemy(this.id);
  }

  update(dt: number): void {
    this.soldier.update(dt, this._isMoving);
  }
}
