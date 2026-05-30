import * as THREE from 'three';
import type { Enemy } from './Enemy.ts';
import type { Player } from '../gameplay/Player.ts';
import type { NavGrid } from './NavGrid.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';

export type AIState = 'patrol' | 'alert' | 'search' | 'combat' | 'suppress' | 'flank' | 'retreat' | 'dead';
export type Difficulty = 'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN';

const ACCURACY: Record<Difficulty, number> = { RECRUIT: 0.3, REGULAR: 0.6, HARDENED: 0.8, VETERAN: 0.95 };
const REACTION_TIME: Record<Difficulty, number> = { RECRUIT: 0.8, REGULAR: 0.5, HARDENED: 0.3, VETERAN: 0.15 };
const SIGHT_RANGE = 50;
const SIGHT_ANGLE = Math.PI * 80 / 180;

export class AIController {
  private state: AIState = 'patrol';
  private enemy: Enemy;
  private difficulty: Difficulty;
  private reactionTimer = 0;
  private stateTimer = 0;
  private path: THREE.Vector3[] = [];
  private pathIndex = 0;
  private moveSpeed = 2.5;
  private patrolPoints: THREE.Vector3[];
  private patrolIndex = 0;
  private fireTimer = 0;
  private fireCooldown = 0.4;
  private coverTimer = 0;
  private grenadeTimer = 0;
  private audioEngine: AudioEngine;

  constructor(enemy: Enemy, patrolPoints: THREE.Vector3[], difficulty: Difficulty, audioEngine: AudioEngine) {
    this.enemy = enemy;
    this.patrolPoints = patrolPoints.length > 0 ? patrolPoints : [enemy.mesh.position.clone()];
    this.difficulty = difficulty;
    this.audioEngine = audioEngine;
  }

  setState(state: AIState): void {
    this.state = state;
    this.stateTimer = 0;
  }

  canSeePlayer(player: Player, scene: THREE.Scene): boolean {
    const myPos = this.enemy.getChestPosition();
    const playerPos = player.camera.position.clone();
    const dist = myPos.distanceTo(playerPos);
    if (dist > SIGHT_RANGE) return false;
    const toPlayer = playerPos.clone().sub(myPos).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.enemy.mesh.quaternion);
    const angle = forward.angleTo(toPlayer);
    if (angle > SIGHT_ANGLE / 2) return false;

    // Raycast check
    const raycaster = new THREE.Raycaster(myPos, toPlayer, 0.1, dist);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      if (h.object.userData['isEnemy'] || h.object.userData['enemyId']) continue;
      if (h.object.userData['isViewModel'] || h.object.userData['isPlayer']) continue;
      if (h.distance < dist - 0.5) return false;
    }
    return true;
  }

  onSquadCommandReceived(command: string): void {
    if (command === 'SUPPRESS') this.setState('suppress');
    else if (command === 'FLANK') this.setState('flank');
    else if (command === 'RETREAT') this.setState('retreat');
    else if (command === 'PUSH') this.setState('combat');
  }

  update(dt: number, player: Player, scene: THREE.Scene, navGrid: NavGrid): void {
    if (!this.enemy.isAlive()) {
      this.state = 'dead';
      return;
    }

    this.stateTimer += dt;
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.grenadeTimer = Math.max(0, this.grenadeTimer - dt);

    const canSee = this.stateTimer > REACTION_TIME[this.difficulty] ? this.canSeePlayer(player, scene) : false;

    switch (this.state) {
      case 'patrol': {
        if (canSee) {
          this.setState('alert');
          this.reactionTimer = REACTION_TIME[this.difficulty];
          break;
        }
        this.doPatrol(dt, navGrid);
        break;
      }
      case 'alert': {
        this.reactionTimer -= dt;
        if (this.reactionTimer <= 0) {
          this.setState('combat');
        }
        this.enemy.lookAt(player.state.position);
        break;
      }
      case 'search': {
        if (canSee) { this.setState('combat'); break; }
        if (this.stateTimer > 5) { this.setState('patrol'); break; }
        this.doPatrol(dt, navGrid);
        break;
      }
      case 'combat': {
        if (!canSee) {
          this.setState('search');
          break;
        }
        // Face player
        this.enemy.lookAt(player.camera.position);

        // Move closer if far, take cover if near
        const dist = this.enemy.mesh.position.distanceTo(player.state.position);
        if (dist > 20) {
          this.moveToward(player.state.position, dt, navGrid);
        } else if (dist < 3) {
          // Back off
          const away = this.enemy.mesh.position.clone().sub(player.state.position).normalize().multiplyScalar(3 * dt);
          this.enemy.mesh.position.add(away);
        }

        // Fire
        if (this.fireTimer <= 0) {
          this.doFire(player, scene);
          this.fireTimer = this.fireCooldown / ACCURACY[this.difficulty];
        }

        // Grenade
        this.coverTimer += dt;
        if (this.coverTimer > 3 && this.grenadeTimer <= 0 && Math.random() < 0.4) {
          // Would throw grenade
          this.grenadeTimer = 10;
          this.coverTimer = 0;
        }
        break;
      }
      case 'suppress': {
        this.enemy.lookAt(player.camera.position);
        if (this.fireTimer <= 0 && this.canSeePlayer(player, scene)) {
          this.doFire(player, scene);
          this.fireTimer = 0.2;
        }
        if (this.stateTimer > 4) this.setState('combat');
        break;
      }
      case 'flank': {
        // Move to flanking position (simplified: move perpendicular)
        const toPlayer = player.state.position.clone().sub(this.enemy.mesh.position);
        const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(5);
        const flankTarget = player.state.position.clone().add(perp);
        this.moveToward(flankTarget, dt, navGrid);
        if (this.stateTimer > 5 || this.enemy.mesh.position.distanceTo(player.state.position) < 8) {
          this.setState('combat');
        }
        break;
      }
      case 'retreat': {
        const awayDir = this.enemy.mesh.position.clone().sub(player.state.position).normalize();
        const retreatTarget = this.enemy.mesh.position.clone().addScaledVector(awayDir, 15);
        this.moveToward(retreatTarget, dt, navGrid);
        if (this.stateTimer > 5) this.setState('patrol');
        break;
      }
    }

    this.enemy.setIsMoving(this.state === 'patrol' || this.state === 'flank' || this.state === 'retreat');
    this.enemy.update(dt);
  }

  private doPatrol(dt: number, navGrid: NavGrid): void {
    if (this.patrolPoints.length === 0) return;
    const target = this.patrolPoints[this.patrolIndex];
    const dist = this.enemy.mesh.position.distanceTo(target);
    if (dist < 1.5) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
      this.path = [];
    }
    if (this.path.length === 0) {
      this.path = navGrid.findPath(this.enemy.mesh.position, target);
      this.pathIndex = 0;
    }
    this.followPath(dt);
  }

  private moveToward(target: THREE.Vector3, dt: number, navGrid: NavGrid): void {
    if (this.path.length === 0 || this.stateTimer % 1 < dt) {
      this.path = navGrid.findPath(this.enemy.mesh.position, target);
      this.pathIndex = 0;
    }
    this.followPath(dt);
  }

  private followPath(dt: number): void {
    if (this.pathIndex >= this.path.length) return;
    const next = this.path[this.pathIndex];
    const dist = this.enemy.mesh.position.distanceTo(next);
    if (dist < 0.5) {
      this.pathIndex++;
      return;
    }
    const dir = next.clone().sub(this.enemy.mesh.position).normalize();
    dir.y = 0;
    this.enemy.mesh.position.addScaledVector(dir, this.moveSpeed * dt);
    this.enemy.mesh.position.y = Math.max(0, this.enemy.mesh.position.y);
    this.enemy.lookAt(next);
  }

  private doFire(player: Player, _scene: THREE.Scene): void {
    if (!this.enemy.isAlive()) return;
    const accuracy = ACCURACY[this.difficulty];
    if (Math.random() > accuracy) return;

    const origin = this.enemy.getChestPosition();
    const target = player.camera.position.clone();
    // Add inaccuracy
    const inaccuracy = (1 - accuracy) * 1.5;
    target.x += (Math.random() - 0.5) * inaccuracy;
    target.y += (Math.random() - 0.5) * inaccuracy;
    target.z += (Math.random() - 0.5) * inaccuracy;

    const dir = target.clone().sub(origin).normalize();
    const dist = origin.distanceTo(player.camera.position);

    this.audioEngine.playWeaponShot('AK12', origin, player.camera.position, false);

    if (dist < 50 && Math.random() < accuracy * 0.6) {
      const dmg = 15 + Math.random() * 10;
      player.takeDamage(dmg, dir.negate(), 'torso');
    }
  }
}
