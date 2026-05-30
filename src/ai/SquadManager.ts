import * as THREE from 'three';
import { Enemy } from './Enemy.ts';
import { AIController } from './AIController.ts';
import type { Player } from '../gameplay/Player.ts';
import type { NavGrid } from './NavGrid.ts';
import type { DamageSystem } from '../gameplay/DamageSystem.ts';
import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { EventBus } from '../core/EventBus.ts';

interface Squad {
  enemies: Enemy[];
  controllers: AIController[];
  commanderIndex: number;
  morale: number;
  reinforcementTimer: number;
}

export class SquadManager {
  private squads: Squad[] = [];
  private scene: THREE.Scene | null = null;
  private damageSystem: DamageSystem | null = null;
  private audioEngine: AudioEngine;
  private eventBus: EventBus;
  private difficulty: 'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN' = 'REGULAR';
  public allEnemies: Enemy[] = [];

  constructor(audioEngine: AudioEngine, eventBus: EventBus) {
    this.audioEngine = audioEngine;
    this.eventBus = eventBus;
  }

  setup(scene: THREE.Scene, damageSystem: DamageSystem): void {
    this.scene = scene;
    this.damageSystem = damageSystem;
  }

  setDifficulty(d: 'RECRUIT' | 'REGULAR' | 'HARDENED' | 'VETERAN'): void {
    this.difficulty = d;
  }

  spawnSquad(positions: THREE.Vector3[], patrolPoints: THREE.Vector3[][]): void {
    if (!this.scene || !this.damageSystem) return;
    const enemies: Enemy[] = [];
    const controllers: AIController[] = [];

    positions.forEach((pos, i) => {
      const id = `enemy_${Date.now()}_${i}`;
      const enemy = new Enemy(id, pos, this.audioEngine);
      const patrol = patrolPoints[i] || [pos.clone()];
      const ctrl = new AIController(enemy, patrol, this.difficulty, this.audioEngine);
      this.scene!.add(enemy.mesh);
      enemy.register(this.damageSystem!);
      enemies.push(enemy);
      controllers.push(ctrl);
      this.allEnemies.push(enemy);
    });

    this.squads.push({ enemies, controllers, commanderIndex: 0, morale: 100, reinforcementTimer: 30 });
  }

  clearAll(): void {
    if (!this.scene || !this.damageSystem) return;
    for (const squad of this.squads) {
      for (const e of squad.enemies) {
        this.scene.remove(e.mesh);
        e.unregister(this.damageSystem);
      }
    }
    this.squads = [];
    this.allEnemies = [];
  }

  getLiveCount(): number {
    return this.allEnemies.filter(e => e.isAlive()).length;
  }

  update(dt: number, player: Player, scene: THREE.Scene, navGrid: NavGrid): void {
    for (const squad of this.squads) {
      let liveCount = 0;
      for (let i = 0; i < squad.enemies.length; i++) {
        const e = squad.enemies[i];
        if (!e.isAlive()) continue;
        liveCount++;
        squad.controllers[i].update(dt, player, scene, navGrid);
      }

      // Squad coordination
      if (liveCount === 0) continue;
      squad.morale = (liveCount / squad.enemies.length) * 100;

      // Commander fell
      if (!squad.enemies[squad.commanderIndex]?.isAlive()) {
        // Panic check
        for (let i = 0; i < squad.enemies.length; i++) {
          if (squad.enemies[i].isAlive() && Math.random() < 0.5) {
            squad.controllers[i].onSquadCommandReceived('RETREAT');
          }
        }
        squad.commanderIndex = squad.enemies.findIndex(e => e.isAlive());
      }

      // Low morale retreat
      if (squad.morale < 25) {
        for (let i = 0; i < squad.enemies.length; i++) {
          if (squad.enemies[i].isAlive()) {
            squad.controllers[i].onSquadCommandReceived('RETREAT');
          }
        }
      }

      // Tactical commands
      if (squad.morale > 50 && liveCount >= 2) {
        // Alternate suppress/flank
        const alive = squad.enemies.map((e, idx) => ({ e, idx })).filter(x => x.e.isAlive());
        if (alive.length >= 2 && Math.random() < 0.01) {
          squad.controllers[alive[0].idx].onSquadCommandReceived('SUPPRESS');
          if (alive.length > 1) squad.controllers[alive[1].idx].onSquadCommandReceived('FLANK');
        }
      }
    }
  }
}
