import * as THREE from 'three';
import type { EventBus } from '../core/EventBus.ts';

export class HUD {
  private visible = false;
  private hitMarkerTimer = 0;
  private damageOverlayTimer = 0;
  private hudEl: HTMLElement;
  private ammoCurrentEl: HTMLElement | null;
  private ammoReserveEl: HTMLElement | null;
  private weaponNameEl: HTMLElement | null;
  private healthValEl: HTMLElement | null;
  private healthBarEl: HTMLElement | null;
  private lowHealthEl: HTMLElement | null;
  private hitMarkerEl: HTMLElement | null;
  private damageOverlayEl: HTMLElement | null;
  private crosshairEl: HTMLElement | null;
  private killFeedEl: HTMLElement | null;
  private subtitlesEl: HTMLElement | null;
  private objectiveEl: HTMLElement | null;
  private missionTitleEl: HTMLElement | null;
  private grenadeLethalEl: HTMLElement | null;
  private grenadeTacticalEl: HTMLElement | null;

  constructor(eventBus: EventBus) {
    this.hudEl = document.getElementById('hud')!;
    this.ammoCurrentEl = document.getElementById('ammo-current');
    this.ammoReserveEl = document.getElementById('ammo-reserve');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.healthValEl = document.getElementById('health-val');
    this.healthBarEl = document.getElementById('health-bar');
    this.lowHealthEl = document.getElementById('low-health-overlay');
    this.hitMarkerEl = document.getElementById('hit-marker');
    this.damageOverlayEl = document.getElementById('damage-overlay');
    this.crosshairEl = document.getElementById('crosshair');
    this.killFeedEl = document.getElementById('kill-feed');
    this.subtitlesEl = document.getElementById('subtitles');
    this.objectiveEl = document.getElementById('objective-text');
    this.missionTitleEl = document.getElementById('mission-title-card');
    this.grenadeLethalEl = document.getElementById('grenade-lethal');
    this.grenadeTacticalEl = document.getElementById('grenade-tactical');

    eventBus.on('healthChanged', ({ health, maxHealth }) => this.updateHealth(health, maxHealth));
    eventBus.on('ammoChanged', ({ current, reserve, weaponName }) => this.updateAmmo(current, reserve, weaponName));
    eventBus.on('weaponFired', ({ weaponName }) => {
      if (weaponName === 'hit') this.showHitMarker(false);
    });
    eventBus.on('enemyDied', () => this.showHitMarker(true));
    eventBus.on('killFeedAdd', ({ killerName, victimName, weaponName }) =>
      this.showKillFeed(killerName, victimName, weaponName));
    eventBus.on('subtitleShow', ({ speaker, text, duration }) =>
      this.showSubtitle(speaker, text, duration));
    eventBus.on('playerDamaged', () => this.showDamageFlash());
  }

  toggle(visible: boolean): void {
    this.visible = visible;
    this.hudEl.style.display = visible ? 'block' : 'none';
    if (this.crosshairEl) this.crosshairEl.style.display = visible ? 'block' : 'none';
  }

  updateAmmo(current: number, reserve: number, weaponName: string): void {
    if (this.ammoCurrentEl) this.ammoCurrentEl.textContent = String(current);
    if (this.ammoReserveEl) this.ammoReserveEl.textContent = String(reserve);
    if (this.weaponNameEl) this.weaponNameEl.textContent = weaponName;
  }

  updateHealth(hp: number, maxHp: number): void {
    const pct = Math.max(0, hp / maxHp * 100);
    if (this.healthValEl) this.healthValEl.textContent = String(Math.round(hp));
    if (this.healthBarEl) this.healthBarEl.style.width = pct + '%';
    if (this.lowHealthEl) this.lowHealthEl.style.opacity = pct < 30 ? String((30 - pct) / 30) : '0';
  }

  showHitMarker(isKill: boolean): void {
    if (!this.hitMarkerEl) return;
    this.hitMarkerEl.style.display = 'block';
    this.hitMarkerEl.style.opacity = '1';
    this.hitMarkerEl.style.color = isKill ? '#ffff00' : '#ff4444';
    this.hitMarkerTimer = 0.2;
  }

  private showDamageFlash(): void {
    this.damageOverlayTimer = 0.4;
    if (this.damageOverlayEl) {
      this.damageOverlayEl.style.boxShadow = 'inset 0 0 80px 40px rgba(255,0,0,0.6)';
    }
  }

  showDamageDirection(_direction: THREE.Vector3, _cameraForward: THREE.Vector3): void {
    this.showDamageFlash();
  }

  showKillFeed(killerName: string, victimName: string, weaponName: string): void {
    if (!this.killFeedEl) return;
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.textContent = `${killerName} [${weaponName}] ${victimName}`;
    this.killFeedEl.appendChild(entry);
    setTimeout(() => entry.remove(), 3000);
  }

  showObjective(text: string): void {
    if (this.objectiveEl) this.objectiveEl.textContent = text;
  }

  showSubtitle(speaker: string, text: string, duration: number): void {
    if (!this.subtitlesEl) return;
    const line = document.createElement('div');
    line.className = 'subtitle-line';
    line.innerHTML = `<span class="subtitle-speaker">${speaker}: </span>${text}`;
    this.subtitlesEl.appendChild(line);
    setTimeout(() => line.remove(), duration * 1000);
  }

  setLowHealthState(active: boolean): void {
    if (this.lowHealthEl) this.lowHealthEl.style.opacity = active ? '1' : '0';
  }

  showReloadIndicator(_progress: number): void {
    // Could show a reload arc - simplified
  }

  showMissionTitle(actText: string, missionText: string): void {
    if (!this.missionTitleEl) return;
    const h2 = this.missionTitleEl.querySelector('h2');
    const h1 = this.missionTitleEl.querySelector('h1');
    if (h2) h2.textContent = actText;
    if (h1) h1.textContent = missionText;
    this.missionTitleEl.style.opacity = '1';
    setTimeout(() => {
      if (this.missionTitleEl) this.missionTitleEl.style.opacity = '0';
    }, 3000);
  }

  updateCrosshair(_spread: number, _isADS: boolean): void {
    // SVG crosshair is static for now
  }

  updateGrenades(lethal: number, tactical: number): void {
    if (this.grenadeLethalEl) this.grenadeLethalEl.textContent = `💣 ${lethal}`;
    if (this.grenadeTacticalEl) this.grenadeTacticalEl.textContent = `💡 ${tactical}`;
  }

  update(dt: number): void {
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) {
        if (this.hitMarkerEl) this.hitMarkerEl.style.display = 'none';
        this.hitMarkerTimer = 0;
      }
    }
    if (this.damageOverlayTimer > 0) {
      this.damageOverlayTimer -= dt;
      if (this.damageOverlayTimer <= 0) {
        if (this.damageOverlayEl) this.damageOverlayEl.style.boxShadow = '';
        this.damageOverlayTimer = 0;
      }
    }
  }
}
