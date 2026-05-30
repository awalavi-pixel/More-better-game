export class Crosshair {
  private el: SVGElement | null;

  constructor() {
    this.el = document.getElementById('crosshair') as SVGElement | null;
  }

  show(): void { if (this.el) this.el.style.display = 'block'; }
  hide(): void { if (this.el) this.el.style.display = 'none'; }

  update(spread: number, isADS: boolean): void {
    if (!this.el) return;
    this.el.style.opacity = isADS ? '0.4' : '1';
    this.el.style.transform = `translate(-50%, -50%) scale(${1 + spread * 0.05})`;
  }
}
