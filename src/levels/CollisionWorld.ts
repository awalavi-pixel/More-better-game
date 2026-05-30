import * as THREE from 'three';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
  material: string;
  isStatic: boolean;
  id: number;
}

export interface CollisionResult {
  hit: boolean;
  penetration: THREE.Vector3;
  normal: THREE.Vector3;
  aabb?: AABB;
}

export interface RayResult {
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  aabb: AABB;
}

let nextId = 1;

export class CollisionWorld {
  private boxes: Map<number, AABB> = new Map();

  addBox(min: THREE.Vector3, max: THREE.Vector3, material: string, isStatic: boolean): number {
    const id = nextId++;
    this.boxes.set(id, { min: min.clone(), max: max.clone(), material, isStatic, id });
    return id;
  }

  removeBox(id: number): void {
    this.boxes.delete(id);
  }

  checkAABB(min: THREE.Vector3, max: THREE.Vector3): CollisionResult {
    let bestPen = new THREE.Vector3();
    let bestAabb: AABB | undefined;
    let maxDepth = 0;

    for (const box of this.boxes.values()) {
      if (min.x >= box.max.x || max.x <= box.min.x) continue;
      if (min.y >= box.max.y || max.y <= box.min.y) continue;
      if (min.z >= box.max.z || max.z <= box.min.z) continue;

      const ox = Math.min(max.x - box.min.x, box.max.x - min.x);
      const oy = Math.min(max.y - box.min.y, box.max.y - min.y);
      const oz = Math.min(max.z - box.min.z, box.max.z - min.z);

      // Smallest penetration axis
      let pen = new THREE.Vector3();
      if (ox <= oy && ox <= oz) {
        pen.x = max.x - box.min.x < box.max.x - min.x ? -ox : ox;
      } else if (oy <= ox && oy <= oz) {
        pen.y = max.y - box.min.y < box.max.y - min.y ? -oy : oy;
      } else {
        pen.z = max.z - box.min.z < box.max.z - min.z ? -oz : oz;
      }

      const depth = pen.length();
      if (depth > maxDepth) {
        maxDepth = depth;
        bestPen = pen;
        bestAabb = box;
      }
    }

    if (maxDepth === 0) return { hit: false, penetration: new THREE.Vector3(), normal: new THREE.Vector3() };
    const normal = bestPen.clone().normalize();
    return { hit: true, penetration: bestPen, normal, aabb: bestAabb };
  }

  checkRay(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number): RayResult[] {
    const results: RayResult[] = [];
    const dir = direction.clone().normalize();
    const invDir = new THREE.Vector3(
      Math.abs(dir.x) > 1e-8 ? 1 / dir.x : Infinity,
      Math.abs(dir.y) > 1e-8 ? 1 / dir.y : Infinity,
      Math.abs(dir.z) > 1e-8 ? 1 / dir.z : Infinity
    );

    for (const box of this.boxes.values()) {
      const t1x = (box.min.x - origin.x) * invDir.x;
      const t2x = (box.max.x - origin.x) * invDir.x;
      const t1y = (box.min.y - origin.y) * invDir.y;
      const t2y = (box.max.y - origin.y) * invDir.y;
      const t1z = (box.min.z - origin.z) * invDir.z;
      const t2z = (box.max.z - origin.z) * invDir.z;
      const tmin = Math.max(Math.min(t1x, t2x), Math.min(t1y, t2y), Math.min(t1z, t2z));
      const tmax = Math.min(Math.max(t1x, t2x), Math.max(t1y, t2y), Math.max(t1z, t2z));
      if (tmax < 0 || tmin > tmax || tmin > maxDist) continue;
      const t = tmin < 0 ? tmax : tmin;
      if (t > maxDist || t < 0) continue;
      const point = origin.clone().addScaledVector(dir, t);
      // Determine normal
      const normal = new THREE.Vector3();
      const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2, cz = (box.min.z + box.max.z) / 2;
      const dx = point.x - cx, dy = point.y - cy, dz = point.z - cz;
      const hx = (box.max.x - box.min.x) / 2, hy = (box.max.y - box.min.y) / 2, hz = (box.max.z - box.min.z) / 2;
      const bx = Math.abs(dx / hx), by = Math.abs(dy / hy), bz = Math.abs(dz / hz);
      if (bx > by && bx > bz) normal.x = dx > 0 ? 1 : -1;
      else if (by > bz) normal.y = dy > 0 ? 1 : -1;
      else normal.z = dz > 0 ? 1 : -1;
      results.push({ distance: t, point, normal, aabb: box });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  checkSphere(center: THREE.Vector3, radius: number): CollisionResult[] {
    const results: CollisionResult[] = [];
    for (const box of this.boxes.values()) {
      const closest = new THREE.Vector3(
        Math.max(box.min.x, Math.min(center.x, box.max.x)),
        Math.max(box.min.y, Math.min(center.y, box.max.y)),
        Math.max(box.min.z, Math.min(center.z, box.max.z))
      );
      const diff = center.clone().sub(closest);
      const dist = diff.length();
      if (dist < radius) {
        const pen = diff.clone().normalize().multiplyScalar(radius - dist);
        results.push({ hit: true, penetration: pen, normal: diff.clone().normalize(), aabb: box });
      }
    }
    return results;
  }

  isGrounded(min: THREE.Vector3, max: THREE.Vector3): boolean {
    const testMin = min.clone();
    const testMax = max.clone();
    testMin.y -= 0.05;
    testMax.y = min.y;
    const result = this.checkAABB(testMin, testMax);
    return result.hit;
  }

  getAllBoxes(): AABB[] {
    return Array.from(this.boxes.values());
  }
}
