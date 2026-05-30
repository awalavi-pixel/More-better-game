import * as THREE from 'three';

export class EnemySoldier {
  public group: THREE.Group;
  public health = 100;
  public maxHealth = 100;
  private alive = true;
  private deathTimer = 0;
  private walkTime = 0;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private bodyGroup: THREE.Group;

  constructor(color = 0x3a4a2a) {
    this.group = new THREE.Group();
    this.group.userData['isEnemy'] = true;

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.8 });

    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.22), mat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.userData['hitZone'] = 'torso';
    torso.userData['isEnemy'] = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.22), headMat);
    head.position.y = 1.6;
    head.castShadow = true;
    head.userData['hitZone'] = 'head';
    head.userData['isEnemy'] = true;

    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), mat);
    this.legL.position.set(-0.13, 0.6, 0);
    this.legL.userData['hitZone'] = 'limb';
    this.legL.userData['isEnemy'] = true;
    this.legL.castShadow = true;

    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), mat);
    this.legR.position.set(0.13, 0.6, 0);
    this.legR.userData['hitZone'] = 'limb';
    this.legR.userData['isEnemy'] = true;
    this.legR.castShadow = true;

    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), mat);
    this.armL.position.set(-0.3, 1.1, 0);
    this.armL.userData['hitZone'] = 'limb';
    this.armL.userData['isEnemy'] = true;

    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), mat);
    this.armR.position.set(0.3, 1.1, 0);
    this.armR.userData['hitZone'] = 'limb';
    this.armR.userData['isEnemy'] = true;

    this.bodyGroup.add(torso, head, this.legL, this.legR, this.armL, this.armR);
  }

  setId(id: string): void {
    this.group.userData['enemyId'] = id;
    this.bodyGroup.traverse(c => {
      c.userData['enemyId'] = id;
      c.userData['isEnemy'] = true;
    });
  }

  takeDamage(amount: number, _zone: string): void {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.deathTimer = 3.0;
  }

  isAlive(): boolean {
    return this.alive;
  }

  getHeadPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + 1.6,
      this.group.position.z
    );
  }

  getChestPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + 1.15,
      this.group.position.z
    );
  }

  update(dt: number, isMoving: boolean): void {
    if (!this.alive) {
      this.deathTimer -= dt;
      // Death fall animation
      const progress = 1 - Math.max(0, this.deathTimer / 3.0);
      this.bodyGroup.rotation.x = Math.min(Math.PI / 2, progress * Math.PI / 2);
      this.bodyGroup.position.y = -Math.min(0.8, progress * 0.8);
      if (this.deathTimer <= 0) {
        // Fade out
        this.group.traverse(c => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.transparent = true;
            c.material.opacity = Math.max(0, c.material.opacity - dt * 0.3);
          }
        });
      }
      return;
    }

    if (isMoving) {
      this.walkTime += dt;
      const freq = 6;
      this.legL.rotation.x = Math.sin(this.walkTime * freq) * 0.5;
      this.legR.rotation.x = Math.sin(this.walkTime * freq + Math.PI) * 0.5;
      this.armL.rotation.x = Math.sin(this.walkTime * freq + Math.PI) * 0.3;
      this.armR.rotation.x = Math.sin(this.walkTime * freq) * 0.3;
    } else {
      this.legL.rotation.x *= 0.85;
      this.legR.rotation.x *= 0.85;
      this.armL.rotation.x *= 0.85;
      this.armR.rotation.x *= 0.85;
    }
  }
}
