export interface GameEvents {
  playerDamaged: { amount: number; direction: { x: number; y: number; z: number }; hitZone: string };
  playerDied: Record<string, never>;
  playerRespawned: { position: { x: number; y: number; z: number } };
  enemyDied: { enemyId: string; position: { x: number; y: number; z: number } };
  weaponFired: { weaponName: string; position: { x: number; y: number; z: number } };
  weaponReloaded: { weaponName: string };
  ammoChanged: { current: number; reserve: number; weaponName: string };
  healthChanged: { health: number; maxHealth: number };
  checkpointReached: { checkpointId: string };
  missionComplete: { missionId: string; time: number; kills: number };
  subtitleShow: { speaker: string; text: string; duration: number };
  killFeedAdd: { killerName: string; victimName: string; weaponName: string };
}

type EventListener<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, EventListener<unknown>[]>();

  on<K extends keyof GameEvents>(event: K, listener: EventListener<GameEvents[K]>): void {
    const key = event as string;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(listener as EventListener<unknown>);
  }

  off<K extends keyof GameEvents>(event: K, listener: EventListener<GameEvents[K]>): void {
    const key = event as string;
    const arr = this.listeners.get(key);
    if (!arr) return;
    const idx = arr.indexOf(listener as EventListener<unknown>);
    if (idx !== -1) arr.splice(idx, 1);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const key = event as string;
    const arr = this.listeners.get(key);
    if (!arr) return;
    for (const fn of arr) fn(data);
  }

  once<K extends keyof GameEvents>(event: K, listener: EventListener<GameEvents[K]>): void {
    const wrapper: EventListener<GameEvents[K]> = (data) => {
      listener(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}
