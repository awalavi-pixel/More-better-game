import * as THREE from 'three';
import type { Player } from '../gameplay/Player.ts';
import type { Enemy } from '../ai/Enemy.ts';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private updateTimer = 0;
  private readonly UPDATE_RATE = 1 / 15;
  private readonly RADIUS_WORLD = 40;
  private readonly SIZE = 160;

  constructor() {
    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
  }

  update(dt: number, player: Player, enemies: Enemy[]): void {
    this.updateTimer += dt;
    if (this.updateTimer < this.UPDATE_RATE) return;
    this.updateTimer = 0;
    this.draw(player, enemies);
  }

  private draw(player: Player, enemies: Enemy[]): void {
    const ctx = this.ctx;
    const size = this.SIZE;
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, size, size);

    // Map floor plan (simple lines for walls/containers)
    ctx.strokeStyle = 'rgba(100,120,140,0.5)';
    ctx.lineWidth = 1;

    const playerYaw = player['yaw'] as number || 0;
    const px = player.state.position.x;
    const pz = player.state.position.z;
    const scale = half / this.RADIUS_WORLD;

    const worldToMap = (wx: number, wz: number): [number, number] => {
      const dx = wx - px;
      const dz = wz - pz;
      // Rotate with player yaw
      const cosY = Math.cos(-playerYaw), sinY = Math.sin(-playerYaw);
      const rx = dx * cosY - dz * sinY;
      const rz = dx * sinY + dz * cosY;
      return [half + rx * scale, half + rz * scale];
    };

    // Draw some static map features
    ctx.strokeStyle = 'rgba(80,100,120,0.6)';
    // Warehouse outline
    const wCorners: [number, number][] = [[-20, -35], [20, -35], [20, -15], [-20, -15]];
    ctx.beginPath();
    for (let i = 0; i < wCorners.length; i++) {
      const [mx, mz] = worldToMap(wCorners[i][0], wCorners[i][1]);
      if (i === 0) ctx.moveTo(mx, mz); else ctx.lineTo(mx, mz);
    }
    ctx.closePath();
    ctx.stroke();

    // Player dot (white arrow)
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(0); // Always centered facing up
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Enemy dots
    ctx.fillStyle = '#ff3333';
    for (const e of enemies) {
      if (!e.isAlive()) continue;
      const dist = e.mesh.position.distanceTo(player.state.position);
      if (dist > 30) continue;
      const [mx, mz] = worldToMap(e.mesh.position.x, e.mesh.position.z);
      if (mx < 0 || mx > size || mz < 0 || mz > size) continue;
      ctx.beginPath();
      ctx.arc(mx, mz, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Circular clip
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}
