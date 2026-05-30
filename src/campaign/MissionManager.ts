import * as THREE from 'three';
import type { EventBus } from '../core/EventBus.ts';
import type { SquadManager } from '../ai/SquadManager.ts';
import type { Player } from '../gameplay/Player.ts';
import type { SpawnSystem } from '../levels/SpawnSystem.ts';
import type { HUD } from '../ui/HUD.ts';

export interface CutsceneLine {
  speaker: string;
  text: string;
  duration: number;
}

interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

interface TriggerBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  callback: () => void;
  fired: boolean;
}

interface MissionState {
  wave: number;
  phase: 'intro' | 'combat' | 'complete';
  waveSpawned: boolean;
  kills: number;
  startTime: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
}

export class MissionManager {
  private eventBus: EventBus;
  private squadManager: SquadManager;
  private spawnSystem: SpawnSystem;
  private hud: HUD;
  private objectives: Objective[] = [];
  private triggers: TriggerBox[] = [];
  private missionState: MissionState = {
    wave: 0, phase: 'intro', waveSpawned: false,
    kills: 0, startTime: 0, accuracy: 0, shotsFired: 0, shotsHit: 0
  };
  private subtitleQueue: CutsceneLine[] = [];
  private subtitleTimer = 0;
  private onCompleteCb?: () => void;

  constructor(eventBus: EventBus, squadManager: SquadManager, spawnSystem: SpawnSystem, hud: HUD) {
    this.eventBus = eventBus;
    this.squadManager = squadManager;
    this.spawnSystem = spawnSystem;
    this.hud = hud;

    eventBus.on('enemyDied', () => {
      this.missionState.kills++;
    });
    eventBus.on('weaponFired', ({ weaponName }) => {
      if (weaponName !== 'hit') this.missionState.shotsFired++;
    });
  }

  addObjective(id: string, text: string): void {
    this.objectives.push({ id, text, completed: false });
    this.hud.showObjective(text);
  }

  completeObjective(id: string): void {
    const obj = this.objectives.find(o => o.id === id);
    if (obj) {
      obj.completed = true;
      this.hud.showKillFeed('', obj.text, '✓ COMPLETE');
    }
  }

  addTrigger(min: THREE.Vector3, max: THREE.Vector3, callback: () => void): void {
    this.triggers.push({ min, max, callback, fired: false });
  }

  showCutscene(lines: CutsceneLine[]): void {
    this.subtitleQueue.push(...lines);
  }

  onComplete(cb: () => void): void {
    this.onCompleteCb = cb;
  }

  startMission01(): void {
    this.missionState = {
      wave: 0, phase: 'intro', waveSpawned: false,
      kills: 0, startTime: Date.now(), accuracy: 0, shotsFired: 0, shotsHit: 0
    };
    this.objectives = [];
    this.triggers = [];

    this.addObjective('survive', 'Survive the Federation attack');
    this.hud.showMissionTitle('Act I — Initiation', 'Ghost Town');

    this.showCutscene([
      { speaker: 'HESH', text: 'Logan! They\'re everywhere — Federation soldiers!', duration: 3.5 },
      { speaker: 'MERRICK', text: 'Ghosts, hold your position. Engage all hostiles.', duration: 3.0 },
      { speaker: 'HESH', text: 'Multiple contacts, east side. Watch the containers!', duration: 3.0 },
    ]);

    // Spawn wave 1 after brief delay
    setTimeout(() => this.spawnWave(1), 5000);
  }

  private spawnWave(wave: number): void {
    this.missionState.wave = wave;
    this.missionState.waveSpawned = true;

    const waveConfigs: Record<number, { count: number; patrol: boolean }> = {
      1: { count: 6, patrol: true },
      2: { count: 4, patrol: false },
      3: { count: 6, patrol: false },
    };
    const config = waveConfigs[wave];
    if (!config) return;

    const positions = this.spawnSystem.getEnemySpawnBatch(config.count);
    const patrolPoints = positions.map(p => [p.clone(), p.clone().add(new THREE.Vector3(0, 0, -5))]);
    this.squadManager.spawnSquad(positions, config.patrol ? patrolPoints : patrolPoints.map(pp => [pp[0]]));

    const waveMessages: Record<number, CutsceneLine[]> = {
      1: [{ speaker: 'HESH', text: 'First wave incoming!', duration: 2.5 }],
      2: [
        { speaker: 'MERRICK', text: 'More contacts! Fall back to cover!', duration: 2.5 },
        { speaker: 'HESH', text: 'One of them has a grenade launcher!', duration: 2.5 },
      ],
      3: [
        { speaker: 'MERRICK', text: 'Final wave — Veterans! This is it, Ghosts!', duration: 3.0 },
        { speaker: 'HESH', text: 'Logan, stay focused!', duration: 2.0 },
      ],
    };
    const msgs = waveMessages[wave];
    if (msgs) this.showCutscene(msgs);
  }

  update(dt: number, player: Player): void {
    // Subtitle queue
    if (this.subtitleQueue.length > 0 && this.subtitleTimer <= 0) {
      const line = this.subtitleQueue.shift()!;
      this.eventBus.emit('subtitleShow', { speaker: line.speaker, text: line.text, duration: line.duration });
      this.subtitleTimer = line.duration + 0.5;
    }
    if (this.subtitleTimer > 0) this.subtitleTimer -= dt;

    // Check triggers
    const pp = player.state.position;
    for (const t of this.triggers) {
      if (!t.fired && pp.x >= t.min.x && pp.x <= t.max.x && pp.z >= t.min.z && pp.z <= t.max.z) {
        t.fired = true;
        t.callback();
      }
    }

    if (this.missionState.phase !== 'combat' && this.missionState.phase !== 'intro') return;

    // Wave progression
    const liveCount = this.squadManager.getLiveCount();
    const wave = this.missionState.wave;

    if (wave === 1 && this.missionState.kills >= 3 && liveCount <= 3) {
      this.spawnWave(2);
    } else if (wave === 2 && liveCount === 0) {
      setTimeout(() => this.spawnWave(3), 2000);
    } else if (wave === 3 && liveCount === 0 && this.missionState.kills >= 10) {
      this.completeMission();
    }

    this.missionState.phase = 'combat';
  }

  private completeMission(): void {
    if (this.missionState.phase === 'complete') return;
    this.missionState.phase = 'complete';
    this.completeObjective('survive');

    this.showCutscene([
      { speaker: 'MERRICK', text: 'All enemies neutralized. Outstanding work, Ghosts.', duration: 3.5 },
      { speaker: 'HESH', text: 'Ghost Town is clear. Mission accomplished.', duration: 3.0 },
    ]);

    this.eventBus.emit('missionComplete', {
      missionId: 'mission01',
      time: (Date.now() - this.missionState.startTime) / 1000,
      kills: this.missionState.kills,
    });

    setTimeout(() => this.onCompleteCb?.(), 6000);
  }

  getStats() {
    return {
      kills: this.missionState.kills,
      time: (Date.now() - this.missionState.startTime) / 1000,
      accuracy: this.missionState.shotsFired > 0
        ? this.missionState.shotsHit / this.missionState.shotsFired
        : 0,
    };
  }
}
