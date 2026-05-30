import * as THREE from 'three';
import type { InputManager } from '../core/InputManager.ts';
import type { CollisionWorld } from '../levels/CollisionWorld.ts';
import type { WeaponSystem } from './WeaponSystem.ts';
import type { EventBus } from '../core/EventBus.ts';

export interface PlayerState {
  health: number;
  maxHealth: number;
  isAlive: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isProne: boolean;
  isADS: boolean;
  isReloading: boolean;
  isMeleeing: boolean;
  isVaulting: boolean;
  isMantling: boolean;
  tacSprintTimer: number;
  jumpCooldown: number;
  regenTimer: number;
  lastDamageTime: number;
  crouchTransition: number;
  grenadeCount: number;
  tacticalCount: number;
}

export class Player {
  public state: PlayerState;
  public camera: THREE.PerspectiveCamera;
  private yaw = 0;
  private pitch = 0;
  private bobTime = 0;
  private regenDelay = 4;
  private regenRate = 20;
  private gravity = 20;
  private headHeight = 1.65;
  private crouchHeight = 0.9;
  private capsuleRadius = 0.35;
  private capsuleHeight = 1.8;
  private eventBus: EventBus;
  // Recoil accumulation
  private recoilX = 0;
  private recoilY = 0;
  private recoilRecoverSpeed = 8;
  // Camera hit reaction
  private hitReactionX = 0;
  private hitReactionTimer = 0;
  // Breath sway
  private breathTime = 0;

  constructor(camera: THREE.PerspectiveCamera, eventBus: EventBus) {
    this.camera = camera;
    this.eventBus = eventBus;
    this.state = {
      health: 100,
      maxHealth: 100,
      isAlive: true,
      position: new THREE.Vector3(0, 1.65, 0),
      velocity: new THREE.Vector3(),
      isGrounded: false,
      isSprinting: false,
      isCrouching: false,
      isProne: false,
      isADS: false,
      isReloading: false,
      isMeleeing: false,
      isVaulting: false,
      isMantling: false,
      tacSprintTimer: 0,
      jumpCooldown: 0,
      regenTimer: 0,
      lastDamageTime: Infinity,
      crouchTransition: 0,
      grenadeCount: 4,
      tacticalCount: 2,
    };
  }

  setPosition(pos: THREE.Vector3): void {
    this.state.position.copy(pos);
    this.camera.position.copy(pos);
    this.camera.position.y += this.headHeight;
  }

  getForward(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  takeDamage(amount: number, direction: THREE.Vector3, hitZone: string): void {
    if (!this.state.isAlive) return;
    let mult = 1.0;
    if (hitZone === 'head') mult = 2.0;
    else if (hitZone === 'limb') mult = 0.7;
    this.state.health -= amount * mult;
    this.state.lastDamageTime = 0;
    this.state.regenTimer = this.regenDelay;

    // Hit reaction
    this.hitReactionX = 0.08;
    this.hitReactionTimer = 0.12;

    this.eventBus.emit('playerDamaged', {
      amount: amount * mult,
      direction: { x: direction.x, y: direction.y, z: direction.z },
      hitZone
    });
    this.eventBus.emit('healthChanged', { health: this.state.health, maxHealth: this.state.maxHealth });

    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.isAlive = false;
      this.eventBus.emit('playerDied', {});
    }
  }

  respawn(pos: THREE.Vector3): void {
    this.state.health = this.state.maxHealth;
    this.state.isAlive = true;
    this.setPosition(pos);
    this.state.velocity.set(0, 0, 0);
    this.eventBus.emit('playerRespawned', { position: { x: pos.x, y: pos.y, z: pos.z } });
    this.eventBus.emit('healthChanged', { health: this.state.health, maxHealth: this.state.maxHealth });
  }

  update(dt: number, input: InputManager, collisionWorld: CollisionWorld, weaponSystem: WeaponSystem): void {
    if (!this.state.isAlive) return;

    // Mouse look
    this.yaw -= input.mouse.dx;
    this.pitch -= input.mouse.dy;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    // Recoil
    const weapon = weaponSystem.getCurrentWeapon();
    if (weapon) {
      const rud = (weapon as unknown as { userData?: { recoilX?: number; recoilY?: number } }).userData;
      if (rud?.recoilX) { this.recoilX += rud.recoilX; rud.recoilX = 0; }
      if (rud?.recoilY) { this.recoilY += rud.recoilY; rud.recoilY = 0; }
    }
    this.recoilX *= Math.max(0, 1 - this.recoilRecoverSpeed * dt);
    this.recoilY *= Math.max(0, 1 - this.recoilRecoverSpeed * dt);

    // Hit reaction
    if (this.hitReactionTimer > 0) {
      this.hitReactionTimer -= dt;
      if (this.hitReactionTimer < 0) { this.hitReactionTimer = 0; this.hitReactionX = 0; }
    }

    // Breath sway
    this.breathTime += dt;
    const breathSway = this.state.isADS ? 0.0015 : 0;
    const swayX = Math.sin(this.breathTime * 0.7) * breathSway;
    const swayY = Math.sin(this.breathTime * 1.1) * breathSway * 0.5;

    // Apply rotations
    const euler = new THREE.Euler(
      this.pitch + this.recoilX + this.hitReactionX + swayY,
      this.yaw + this.recoilY + swayX,
      0,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(euler);

    // Crouching
    if (input.crouch) {
      this.state.isCrouching = true;
      this.state.crouchTransition = Math.min(1, this.state.crouchTransition + dt * 5);
    } else {
      this.state.isCrouching = false;
      this.state.crouchTransition = Math.max(0, this.state.crouchTransition - dt * 5);
    }
    this.capsuleHeight = 1.8 - (1.8 - 0.9) * this.state.crouchTransition;
    const currentHeadH = this.headHeight - (this.headHeight - this.crouchHeight) * this.state.crouchTransition;

    // Sprinting
    this.state.isSprinting = input.sprint && !this.state.isCrouching && input.moveForward;

    // Movement speed
    let speed = 4.5;
    if (this.state.isSprinting) speed = 7.2;
    else if (this.state.isCrouching) speed = 2.8;

    // ADS
    this.state.isADS = input.ads;
    if (this.state.isADS && !this.state.isCrouching) speed *= 0.6;

    // Movement input in camera-space
    const fw = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
    const right = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (input.moveForward) move.addScaledVector(fw, 1);
    if (input.moveBack) move.addScaledVector(fw, -1);
    if (input.moveLeft) move.addScaledVector(right, -1);
    if (input.moveRight) move.addScaledVector(right, 1);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    this.state.velocity.x = move.x;
    this.state.velocity.z = move.z;

    // Gravity
    if (!this.state.isGrounded) {
      this.state.velocity.y -= this.gravity * dt;
    }

    // Jump
    if (input.jump && this.state.isGrounded && this.state.jumpCooldown <= 0) {
      this.state.velocity.y = Math.sqrt(2 * this.gravity * 1.2);
      this.state.isGrounded = false;
      this.state.jumpCooldown = 0.4;
    }
    if (this.state.jumpCooldown > 0) this.state.jumpCooldown -= dt;

    // Move
    this.state.position.addScaledVector(this.state.velocity, dt);

    // Collision
    const half = new THREE.Vector3(this.capsuleRadius, this.capsuleHeight / 2, this.capsuleRadius);
    const pMin = this.state.position.clone().sub(half);
    const pMax = this.state.position.clone().add(half);

    let onGround = false;
    for (let i = 0; i < 3; i++) {
      const result = collisionWorld.checkAABB(pMin, pMax);
      if (!result.hit) break;
      this.state.position.sub(result.penetration);
      pMin.sub(result.penetration);
      pMax.sub(result.penetration);
      if (result.normal.y > 0.5) {
        onGround = true;
        if (this.state.velocity.y < 0) this.state.velocity.y = 0;
      } else if (result.normal.y < -0.5) {
        if (this.state.velocity.y > 0) this.state.velocity.y = 0;
      } else {
        const dot = this.state.velocity.dot(result.normal);
        if (dot < 0) this.state.velocity.addScaledVector(result.normal, -dot);
      }
    }

    // Floor clamp
    if (this.state.position.y - this.capsuleHeight / 2 < 0) {
      this.state.position.y = this.capsuleHeight / 2;
      if (this.state.velocity.y < 0) this.state.velocity.y = 0;
      onGround = true;
    }
    this.state.isGrounded = onGround;

    // Camera bob
    this.bobTime += dt;
    const bobSpeed = this.state.isSprinting ? 12 : 8;
    const bobAmt = (move.lengthSq() > 0 && this.state.isGrounded && !this.state.isADS) ? 0.03 : 0;
    const bobX = Math.sin(this.bobTime * bobSpeed) * bobAmt * 0.4;
    const bobY = Math.abs(Math.sin(this.bobTime * bobSpeed * 0.5)) * bobAmt;

    // Update camera position
    this.camera.position.set(
      this.state.position.x + bobX,
      this.state.position.y + currentHeadH + bobY,
      this.state.position.z
    );

    // Regen
    if (this.state.regenTimer > 0) {
      this.state.regenTimer -= dt;
    } else if (this.state.health < this.state.maxHealth) {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + this.regenRate * dt);
      this.eventBus.emit('healthChanged', { health: this.state.health, maxHealth: this.state.maxHealth });
    }
  }
}
