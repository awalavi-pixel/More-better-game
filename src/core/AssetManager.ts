import * as THREE from 'three';

export class AssetManager {
  private textureCache = new Map<string, THREE.Texture>();
  public loadProgress = 0;
  private onProgressCb: ((p: number) => void) | null = null;

  onProgress(cb: (p: number) => void): void {
    this.onProgressCb = cb;
  }

  private setProgress(p: number): void {
    this.loadProgress = p;
    if (this.onProgressCb) this.onProgressCb(p);
  }

  async init(): Promise<void> {
    this.setProgress(0.1);
    await this.delay(100);
    this.setProgress(0.5);
    await this.delay(100);
    this.setProgress(1.0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  getTexture(key: string): THREE.Texture | undefined {
    return this.textureCache.get(key);
  }

  createProceduralModel(type: string): THREE.Group {
    const group = new THREE.Group();
    switch (type) {
      case 'rifle': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.18), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
        stock.position.set(0, -0.01, 0.3);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.01, -0.35);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        mag.position.set(0, -0.075, -0.05);
        group.add(body, stock, barrel, mag);
        break;
      }
      case 'pistol': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.18), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.025, -0.15);
        group.add(body, barrel);
        break;
      }
      case 'enemy_soldier': return this.buildHumanoid(0x3a4a2a);
      case 'crate': {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 }));
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }
      case 'wall': {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.3), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 }));
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }
      case 'floor': {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 1 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }
    }
    return group;
  }

  buildHumanoid(color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.22), mat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.userData['hitZone'] = 'torso';
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.22), new THREE.MeshStandardMaterial({ color: 0xd4a87a }));
    head.position.y = 1.6;
    head.castShadow = true;
    head.userData['hitZone'] = 'head';
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), mat);
    legL.position.set(-0.13, 0.6, 0);
    legL.userData['hitZone'] = 'limb';
    const legR = legL.clone();
    legR.position.set(0.13, 0.6, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), mat);
    armL.position.set(-0.3, 1.1, 0);
    armL.userData['hitZone'] = 'limb';
    const armR = armL.clone();
    armR.position.set(0.3, 1.1, 0);
    group.add(torso, head, legL, legR, armL, armR);
    group.userData['isEnemy'] = true;
    return group;
  }
}
