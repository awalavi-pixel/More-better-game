import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld.ts';
import { buildFreightMap, type SpawnPoint } from './FreightMap.ts';
import { SpawnSystem } from './SpawnSystem.ts';
import { NavGrid } from '../ai/NavGrid.ts';

export interface LoadedMap {
  scene: THREE.Scene;
  collisionWorld: CollisionWorld;
  spawnSystem: SpawnSystem;
  navGrid: NavGrid;
  spawnPoints: SpawnPoint[];
}

export async function loadMap(name: string, onProgress?: (p: number) => void): Promise<LoadedMap> {
  onProgress?.(0.1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x223344);
  const cw = new CollisionWorld();

  onProgress?.(0.3);
  let spawnPoints: SpawnPoint[];
  const isMission = name === 'freight_mission01';

  spawnPoints = buildFreightMap(scene, cw, isMission);

  const enemySpawnPoints = [
    new THREE.Vector3(40, 1, -20),
    new THREE.Vector3(35, 1, -10),
    new THREE.Vector3(42, 1, 0),
    new THREE.Vector3(38, 1, 10),
    new THREE.Vector3(45, 1, -5),
    new THREE.Vector3(30, 1, -25),
  ];

  const spawnSystem = new SpawnSystem(spawnPoints, enemySpawnPoints);

  onProgress?.(0.7);
  const navGrid = new NavGrid();
  navGrid.build(cw, -55, -45, 55, 45);

  onProgress?.(1.0);
  return { scene, collisionWorld: cw, spawnSystem, navGrid, spawnPoints };
}
