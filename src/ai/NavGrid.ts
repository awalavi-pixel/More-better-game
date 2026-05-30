import * as THREE from 'three';
import type { CollisionWorld } from '../levels/CollisionWorld.ts';

interface GridCell {
  walkable: boolean;
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
}

interface PathNode {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class NavGrid {
  private cells: GridCell[][] = [];
  private cellSize = 1;
  private width = 0;
  private depth = 0;
  private originX = 0;
  private originZ = 0;
  private raycaster = new THREE.Raycaster();

  build(collisionWorld: CollisionWorld, minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.originX = minX;
    this.originZ = minZ;
    this.width = Math.ceil((maxX - minX) / this.cellSize);
    this.depth = Math.ceil((maxZ - minZ) / this.cellSize);
    this.cells = [];

    for (let z = 0; z < this.depth; z++) {
      this.cells[z] = [];
      for (let x = 0; x < this.width; x++) {
        const wx = minX + x * this.cellSize + 0.5;
        const wz = minZ + z * this.cellSize + 0.5;
        const testMin = new THREE.Vector3(wx - 0.3, 0, wz - 0.3);
        const testMax = new THREE.Vector3(wx + 0.3, 1.8, wz + 0.3);
        const result = collisionWorld.checkAABB(testMin, testMax);
        this.cells[z][x] = { walkable: !result.hit, x, z, worldX: wx, worldZ: wz };
      }
    }
  }

  private toGrid(worldPos: THREE.Vector3): { x: number; z: number } {
    return {
      x: Math.floor((worldPos.x - this.originX) / this.cellSize),
      z: Math.floor((worldPos.z - this.originZ) / this.cellSize),
    };
  }

  private toWorld(gx: number, gz: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.originX + gx * this.cellSize + 0.5,
      0,
      this.originZ + gz * this.cellSize + 0.5
    );
  }

  private heuristic(ax: number, az: number, bx: number, bz: number): number {
    return Math.abs(ax - bx) + Math.abs(az - bz);
  }

  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const start = this.toGrid(from);
    const end = this.toGrid(to);

    if (start.x < 0 || start.x >= this.width || start.z < 0 || start.z >= this.depth) return [to.clone()];
    if (end.x < 0 || end.x >= this.width || end.z < 0 || end.z >= this.depth) return [to.clone()];

    const open: PathNode[] = [];
    const closed = new Set<string>();
    const key = (x: number, z: number) => `${x},${z}`;

    open.push({ x: start.x, z: start.z, g: 0, h: this.heuristic(start.x, start.z, end.x, end.z), f: 0, parent: null });
    open[0].f = open[0].g + open[0].h;

    let iterations = 0;
    while (open.length > 0 && iterations < 2000) {
      iterations++;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const ck = key(current.x, current.z);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (current.x === end.x && current.z === end.z) {
        const path: THREE.Vector3[] = [];
        let node: PathNode | null = current;
        while (node) {
          const wp = this.toWorld(node.x, node.z);
          wp.y = from.y;
          path.unshift(wp);
          node = node.parent;
        }
        return path;
      }

      const dirs = [
        { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
        { dx: 1, dz: 1 }, { dx: -1, dz: 1 }, { dx: 1, dz: -1 }, { dx: -1, dz: -1 },
      ];
      for (const d of dirs) {
        const nx = current.x + d.dx;
        const nz = current.z + d.dz;
        if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.depth) continue;
        if (!this.cells[nz]?.[nx]?.walkable) continue;
        if (closed.has(key(nx, nz))) continue;
        const g = current.g + (d.dx !== 0 && d.dz !== 0 ? 1.414 : 1);
        const h = this.heuristic(nx, nz, end.x, end.z);
        open.push({ x: nx, z: nz, g, h, f: g + h, parent: current });
      }
    }
    return [to.clone()];
  }

  getNearestWalkable(pos: THREE.Vector3): THREE.Vector3 {
    const g = this.toGrid(pos);
    for (let r = 0; r < 10; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = g.x + dx, nz = g.z + dz;
          if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.depth && this.cells[nz]?.[nx]?.walkable) {
            const wp = this.toWorld(nx, nz);
            wp.y = pos.y;
            return wp;
          }
        }
      }
    }
    return pos.clone();
  }

  getCoverNodes(center: THREE.Vector3, radius: number, _threatDir: THREE.Vector3): THREE.Vector3[] {
    const results: THREE.Vector3[] = [];
    const g = this.toGrid(center);
    const r = Math.ceil(radius / this.cellSize);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = g.x + dx, nz = g.z + dz;
        if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.depth) continue;
        if (!this.cells[nz]?.[nx]?.walkable) continue;
        const wp = this.toWorld(nx, nz);
        if (wp.distanceTo(center) <= radius) {
          wp.y = center.y;
          results.push(wp);
        }
      }
    }
    return results;
  }

  isVisible(from: THREE.Vector3, to: THREE.Vector3, scene: THREE.Scene): boolean {
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const dist = from.distanceTo(to);
    this.raycaster.set(from, dir);
    this.raycaster.far = dist;
    const hits = this.raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      if (h.object.userData['isEnemy'] || h.object.userData['isPlayer']) continue;
      if (h.object.userData['isViewModel']) continue;
      return false;
    }
    return true;
  }
}
