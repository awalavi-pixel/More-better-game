import * as THREE from 'three';
import type { CollisionWorld } from './CollisionWorld.ts';

export interface SpawnPoint {
  position: THREE.Vector3;
  team: 'A' | 'B' | 'FFA' | 'enemy';
}

export interface LoadedLevel {
  scene: THREE.Scene;
  spawnPoints: SpawnPoint[];
  collisionWorld: CollisionWorld;
  enemySpawnPoints: THREE.Vector3[];
}

const CONTAINER_COLORS = [0xcc2200, 0x1155cc, 0x228833, 0xdd7700, 0x664422, 0x888888];

function makeBox(
  scene: THREE.Scene, cw: CollisionWorld,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  color: number, roughness = 0.85, receiveShadow = true, material = 'metal'
): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = receiveShadow;
  mesh.userData['material'] = material;
  mesh.userData['hitZone'] = 'cover';
  scene.add(mesh);
  cw.addBox(
    new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
    new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
    material, true
  );
}

export function buildFreightMap(scene: THREE.Scene, cw: CollisionWorld, missionMode = false): SpawnPoint[] {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(120, 100);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 1.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData['material'] = 'concrete';
  scene.add(ground);
  cw.addBox(new THREE.Vector3(-60, -0.5, -50), new THREE.Vector3(60, 0, 50), 'concrete', true);

  // Boundary walls (invisible collision only)
  cw.addBox(new THREE.Vector3(-62, 0, -52), new THREE.Vector3(-60, 10, 52), 'concrete', true);
  cw.addBox(new THREE.Vector3(60, 0, -52), new THREE.Vector3(62, 10, 52), 'concrete', true);
  cw.addBox(new THREE.Vector3(-62, 0, -52), new THREE.Vector3(62, 10, -50), 'concrete', true);
  cw.addBox(new THREE.Vector3(-62, 0, 50), new THREE.Vector3(62, 10, 52), 'concrete', true);

  // Warehouse building (40x20x8)
  // Front wall
  makeBox(scene, cw, 0, 4, -15, 40, 8, 0.5, 0x777788, 0.95, true, 'concrete');
  // Back wall
  makeBox(scene, cw, 0, 4, -35, 40, 8, 0.5, 0x777788, 0.95, true, 'concrete');
  // Left wall with door gap
  makeBox(scene, cw, -20, 4, -22, 0.5, 8, 14, 0x777788, 0.95, true, 'concrete');
  // Right wall
  makeBox(scene, cw, 20, 4, -22, 0.5, 8, 14, 0x777788, 0.95, true, 'concrete');
  // Door walls (front left)
  makeBox(scene, cw, -14, 4, -15, 10, 8, 0.5, 0x777788, 0.95, true, 'concrete');
  // Door walls (front right)
  makeBox(scene, cw, 10, 4, -15, 20, 8, 0.5, 0x777788, 0.95, true, 'concrete');
  // Roof
  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.9 }));
  roofMesh.position.set(0, 8.15, -25);
  roofMesh.castShadow = true; roofMesh.receiveShadow = true;
  roofMesh.userData['material'] = 'metal'; roofMesh.userData['hitZone'] = 'cover';
  scene.add(roofMesh);
  cw.addBox(new THREE.Vector3(-20, 8, -35), new THREE.Vector3(20, 8.3, -15), 'metal', true);

  // Rail tracks (two sets east-west)
  for (let t = -1; t <= 1; t += 2) {
    const trackZ = t * 8;
    for (let x = -50; x < 50; x += 2) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1 }));
      tie.position.set(x, 0.04, trackZ);
      tie.receiveShadow = true;
      scene.add(tie);
    }
    // Rails
    for (let r = -1; r <= 1; r += 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(100, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
      rail.position.set(0, 0.07, trackZ + r * 0.75);
      rail.receiveShadow = true;
      scene.add(rail);
    }
  }

  // Freight rail cars
  const carPositions = [[-30, 0, -8], [0, 0, 8], [25, 0, -8]] as const;
  for (const [cx, cy, cz] of carPositions) {
    makeBox(scene, cw, cx, cy + 1.5, cz, 8, 3, 2, 0x445566, 0.7, true, 'metal');
    // Wheels
    for (let wx = -3; wx <= 3; wx += 2) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(cx + wx, cy + 0.4, cz);
      scene.add(wheel);
    }
  }

  // Shipping containers (25 scattered)
  const containerData: [number, number, number, number][] = [
    [-40, 1.3, 20, 0], [-34, 1.3, 20, 0], [-34, 1.3 + 2.6, 20, 0],
    [35, 1.3, 20, 1], [35, 1.3 + 2.6, 20, 1], [35, 1.3 + 5.2, 20, 1],
    [35, 1.3, 30, 2], [35, 1.3 + 2.6, 30, 2],
    [-40, 1.3, 30, 3], [-40, 1.3 + 2.6, 30, 3],
    [10, 1.3, 25, 4], [10, 1.3 + 2.6, 25, 4],
    [-15, 1.3, 35, 5], [-15, 1.3 + 2.6, 35, 5],
    [25, 1.3, 10, 0], [25, 1.3 + 2.6, 10, 1],
    [-25, 1.3, 10, 2], [-25, 1.3 + 2.6, 10, 2],
    [45, 1.3, 0, 3], [45, 1.3 + 2.6, 0, 4],
    [-45, 1.3, 0, 5], [-45, 1.3 + 2.6, 0, 0],
    [15, 1.3, -5, 1], [-15, 1.3, -5, 2],
    [5, 1.3, 40, 3],
  ];
  for (const [cx, cy, cz, ci] of containerData) {
    makeBox(scene, cw, cx, cy, cz, 6, 2.6, 2.4, CONTAINER_COLORS[ci % CONTAINER_COLORS.length], 0.75, true, 'metal');
  }

  // Debris piles (15 small)
  const debrisPositions: [number, number, number][] = [
    [5, 0.3, 5], [-5, 0.3, 5], [15, 0.3, 0], [-15, 0.3, 0],
    [0, 0.3, 15], [30, 0.3, 15], [-30, 0.3, 15],
    [40, 0.3, -20], [-40, 0.3, -20],
    [20, 0.3, -10], [-20, 0.3, -10],
    [10, 0.3, -5], [-10, 0.3, -5],
    [0, 0.3, -10], [0, 0.3, 20],
  ];
  for (const [dx, dy, dz] of debrisPositions) {
    const w = 0.8 + Math.random() * 0.8, h = 0.3 + Math.random() * 0.4, d = 0.6 + Math.random() * 0.8;
    makeBox(scene, cw, dx, dy, dz, w, h, d, 0x554433, 1.0, true, 'concrete');
  }

  // Overhead crane (visual only)
  const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.7 }));
  craneBeam.position.set(0, 10, -25);
  scene.add(craneBeam);
  const cranePoleL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.7 }));
  cranePoleL.position.set(-19, 9.1, -25);
  scene.add(cranePoleL);
  const cranePoleR = cranePoleL.clone();
  cranePoleR.position.set(19, 9.1, -25);
  scene.add(cranePoleR);

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff8e8, 1.2);
  sun.position.set(30, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambient);

  // Industrial point lights
  const lightPositions: [number, number, number][] = [
    [-30, 7, -25], [0, 7, -25], [30, 7, -25],
    [-30, 5, 10], [0, 5, 20], [30, 5, 10],
    [-30, 5, 35], [30, 5, 35],
  ];
  for (const [lx, ly, lz] of lightPositions) {
    const light = new THREE.PointLight(0xffcc88, missionMode ? 3 : 2, 25);
    light.position.set(lx, ly, lz);
    light.castShadow = false;
    scene.add(light);
  }

  // Mission mode additions
  if (missionMode) {
    // Fire effects
    const firePositions: [number, number, number][] = [[-35, 0.5, 15], [30, 0.5, 5]];
    for (const [fx, fy, fz] of firePositions) {
      const fireLight = new THREE.PointLight(0xff4400, 8, 12);
      fireLight.position.set(fx, fy + 1, fz);
      scene.add(fireLight);
      const firePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 2),
        new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      firePlane.position.set(fx, fy + 1, fz);
      scene.add(firePlane);
      firePlane.userData['fireData'] = { phase: Math.random() * Math.PI * 2 };
    }

    // Smoke particles (simple planes)
    for (let i = 0; i < 5; i++) {
      const smoke = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      smoke.position.set(-35 + Math.random() * 10, 2 + i, 10 + Math.random() * 10);
      scene.add(smoke);
    }

    // Crashed vehicle
    makeBox(scene, cw, -30, 0.6, 5, 4.5, 1.2, 2.0, 0x334455, 0.9, true, 'metal');
    // Wheels
    for (let vx = -1.5; vx <= 1.5; vx += 3) {
      for (let vz = -0.8; vz <= 0.8; vz += 1.6) {
        const vw = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        vw.rotation.x = Math.PI / 2;
        vw.position.set(-30 + vx, 0.35, 5 + vz);
        scene.add(vw);
      }
    }

    // Dense fog
    scene.fog = new THREE.Fog(0x223344, 20, 80);
  } else {
    scene.fog = new THREE.Fog(0x334455, 40, 120);
  }

  // Spawn points
  const spawnPoints: SpawnPoint[] = [
    { position: new THREE.Vector3(-45, 1, 0), team: 'A' },
    { position: new THREE.Vector3(-45, 1, 10), team: 'A' },
    { position: new THREE.Vector3(-45, 1, -10), team: 'A' },
    { position: new THREE.Vector3(-45, 1, 20), team: 'A' },
    { position: new THREE.Vector3(45, 1, 0), team: 'B' },
    { position: new THREE.Vector3(45, 1, 10), team: 'B' },
    { position: new THREE.Vector3(45, 1, -10), team: 'B' },
    { position: new THREE.Vector3(45, 1, 20), team: 'B' },
    { position: new THREE.Vector3(0, 1, 0), team: 'FFA' },
    { position: new THREE.Vector3(10, 1, 10), team: 'FFA' },
    { position: new THREE.Vector3(-10, 1, -10), team: 'FFA' },
    { position: new THREE.Vector3(20, 1, -15), team: 'FFA' },
    { position: new THREE.Vector3(-20, 1, 25), team: 'FFA' },
    { position: new THREE.Vector3(5, 1, 30), team: 'FFA' },
    { position: new THREE.Vector3(-5, 1, -5), team: 'FFA' },
    { position: new THREE.Vector3(30, 1, 25), team: 'FFA' },
  ];

  return spawnPoints;
}
