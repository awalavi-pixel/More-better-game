export type FixedUpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number, dt: number) => void;

export class GameLoop {
  static readonly FIXED_DT = 1 / 60;
  private static readonly MAX_FRAME_TIME = 0.25;

  private fixedUpdate: FixedUpdateFn;
  private render: RenderFn;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private fpsHistory: number[] = [];
  public fps = 60;

  constructor(fixedUpdate: FixedUpdateFn, render: RenderFn) {
    this.fixedUpdate = fixedUpdate;
    this.render = render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > GameLoop.MAX_FRAME_TIME) frameTime = GameLoop.MAX_FRAME_TIME;

    // FPS tracking
    if (frameTime > 0) {
      this.fpsHistory.push(1 / frameTime);
      if (this.fpsHistory.length > 60) this.fpsHistory.shift();
      this.fps = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }

    this.accumulator += frameTime;
    while (this.accumulator >= GameLoop.FIXED_DT) {
      this.fixedUpdate(GameLoop.FIXED_DT);
      this.accumulator -= GameLoop.FIXED_DT;
    }
    const alpha = this.accumulator / GameLoop.FIXED_DT;
    this.render(alpha, frameTime);
  };
}
