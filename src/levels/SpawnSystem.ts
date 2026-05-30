import * as THREE from 'three';
import type { SpawnPoint } from './FreightMap.ts';

export class SpawnSystem {
  private spawnPoints: SpawnPoint[];
  private enemySpawnPoints: THREE.Vector3[];

  constructor(spawnPoints: SpawnPoint[], enemySpawnPoints: THREE.Vector3[] = []) {
    this.spawnPoints = spawnPoints;
    this.enemySpawnPoints = enemySpawnPoints;
  }

  getPlayerSpawn(team: 'A' | 'B' | 'FFA', enemyPositions: THREE.Vector3[] = []): THREE.Vector3 {
    const candidates = this.spawnPoints.filter(s => s.team === team || (team === 'FFA' && s.team === 'FFA'));
    if (candidates.length === 0) return new THREE.Vector3(0, 1, 0);

    // Anti-camp: avoid within 15m of enemy
    const safe = candidates.filter(s =>
      enemyPositions.every(ep => ep.distanceTo(s.position) > 15)
    );
    const pool = safe.length > 0 ? safe : candidates;
    return pool[Math.floor(Math.random() * pool.length)].position.clone();
  }

  getEnemySpawn(index: number): THREE.Vector3 {
    if (this.enemySpawnPoints.length === 0) {
      return new THREE.Vector3(40 - index * 5, 1, -20 + index * 3);
    }
    return this.enemySpawnPoints[index % this.enemySpawnPoints.length].clone();
  }

  getEnemySpawnBatch(count: number): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) result.push(this.getEnemySpawn(i));
    return result;
  }
}
