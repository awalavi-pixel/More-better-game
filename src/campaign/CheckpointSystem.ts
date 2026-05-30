export interface CheckpointData {
  mission: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  health: number;
  primaryAmmo: { current: number; reserve: number };
  secondaryAmmo: { current: number; reserve: number };
  grenadeCount: number;
  objectiveState: Record<string, boolean>;
  timestamp: number;
  kills: number;
  accuracy: number;
}

export interface GameSettings {
  fov: number;
  sensitivity: number;
  invertY: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

const CHECKPOINT_KEY = 'ghost_reboot_checkpoint';
const SETTINGS_KEY = 'ghost_reboot_settings';
const COMPLETIONS_KEY = 'ghost_reboot_completions';

export class CheckpointSystem {
  saveCheckpoint(data: CheckpointData): void {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  }

  loadLastCheckpoint(): CheckpointData | null {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as CheckpointData; } catch { return null; }
  }

  clearCheckpoints(): void {
    localStorage.removeItem(CHECKPOINT_KEY);
  }

  getMissionCompletions(): string[] {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }

  addMissionCompletion(missionId: string): void {
    const completions = this.getMissionCompletions();
    if (!completions.includes(missionId)) {
      completions.push(missionId);
      localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
    }
  }

  saveSettings(settings: GameSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadSettings(): GameSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const defaults: GameSettings = { fov: 90, sensitivity: 8, invertY: false, masterVolume: 0.8, sfxVolume: 0.8, musicVolume: 0.6 };
    if (!raw) return defaults;
    try { return { ...defaults, ...JSON.parse(raw) as Partial<GameSettings> }; } catch { return defaults; }
  }
}
