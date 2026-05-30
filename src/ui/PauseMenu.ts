export class PauseMenu {
  private el: HTMLElement;
  private onResumeCb?: () => void;
  private onCheckpointCb?: () => void;
  private onOptionsCb?: () => void;
  private onQuitCb?: () => void;

  constructor() {
    this.el = document.getElementById('pause-menu')!;
    document.getElementById('btn-resume')?.addEventListener('click', () => this.onResumeCb?.());
    document.getElementById('btn-checkpoint')?.addEventListener('click', () => this.onCheckpointCb?.());
    document.getElementById('btn-pause-options')?.addEventListener('click', () => this.onOptionsCb?.());
    document.getElementById('btn-quit-menu')?.addEventListener('click', () => this.onQuitCb?.());
  }

  show(): void { this.el.style.display = 'flex'; }
  hide(): void { this.el.style.display = 'none'; }
  isVisible(): boolean { return this.el.style.display === 'flex'; }

  onResume(cb: () => void): void { this.onResumeCb = cb; }
  onCheckpoint(cb: () => void): void { this.onCheckpointCb = cb; }
  onOptions(cb: () => void): void { this.onOptionsCb = cb; }
  onQuit(cb: () => void): void { this.onQuitCb = cb; }
}
