import * as THREE from 'three';
import type { Player } from '../gameplay/Player.ts';
import type { WeaponBase } from '../gameplay/WeaponBase.ts';

export class PlayerCharacter {
  private viewGroup: THREE.Group;
  private weaponGroup: THREE.Group;
  private handL: THREE.Mesh;
  private handR: THREE.Mesh;
  private bobTime = 0;
  private swayOffsetY = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.viewGroup = new THREE.Group();
    this.viewGroup.userData['isViewModel'] = true;
    camera.add(this.viewGroup);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a07a, roughness: 0.8 });
    // Left hand
    this.handL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.12), skinMat);
    this.handL.userData['isViewModel'] = true;
    // Right hand
    this.handR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.12), skinMat);
    this.handR.userData['isViewModel'] = true;

    this.handL.position.set(-0.15, -0.2, -0.35);
    this.handR.position.set(0.15, -0.2, -0.35);

    this.viewGroup.add(this.handL, this.handR);

    // Weapon group attached to right side
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.userData['isViewModel'] = true;
    this.viewGroup.add(this.weaponGroup);
  }

  attachWeapon(weapon: WeaponBase): void {
    // Clear previous
    while (this.weaponGroup.children.length > 0) {
      this.weaponGroup.remove(this.weaponGroup.children[0]);
    }
    const vm = weapon.createViewModel();
    vm.traverse(c => { c.userData['isViewModel'] = true; });
    this.weaponGroup.add(vm);
  }

  update(dt: number, player: Player): void {
    const isMoving = player.state.velocity.lengthSq() > 0.1 && player.state.isGrounded;
    const isADS = player.state.isADS;

    this.bobTime += dt;
    const bobAmt = isMoving && !isADS ? 0.006 : 0;
    const bobFreq = player.state.isSprinting ? 12 : 8;

    this.swayOffsetY = Math.abs(Math.sin(this.bobTime * bobFreq)) * bobAmt;

    // ADS lerp
    const adsTarget = isADS ? new THREE.Vector3(0, -0.25, -0.3) : new THREE.Vector3(0, -0.25, 0);
    this.viewGroup.position.lerp(adsTarget, Math.min(1, dt * 8));
    this.viewGroup.position.y += this.swayOffsetY;
  }
}
