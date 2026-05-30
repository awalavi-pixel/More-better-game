export class MainMenu {
  private el: HTMLElement;
  private onCampaignCb?: () => void;
  private onMultiplayerCb?: () => void;
  private onOptionsCb?: () => void;

  constructor() {
    this.el = document.getElementById('main-menu')!;
    document.getElementById('btn-campaign')?.addEventListener('click', () => this.onCampaignCb?.());
    document.getElementById('btn-multiplayer')?.addEventListener('click', () => this.onMultiplayerCb?.());
    document.getElementById('btn-options')?.addEventListener('click', () => this.onOptionsCb?.());
  }

  show(): void { this.el.classList.remove('hidden'); }
  hide(): void { this.el.classList.add('hidden'); }

  onCampaign(cb: () => void): void { this.onCampaignCb = cb; }
  onMultiplayer(cb: () => void): void { this.onMultiplayerCb = cb; }
  onOptions(cb: () => void): void { this.onOptionsCb = cb; }
}
