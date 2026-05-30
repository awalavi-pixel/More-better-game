export interface MouseState {
  dx: number;
  dy: number;
  scrollDelta: number;
  buttons: boolean[];
  justPressedButtons: boolean[];
}

export class InputManager {
  private keys = new Map<string, boolean>();
  private prevKeys = new Map<string, boolean>();
  private justPressed = new Map<string, boolean>();
  private justReleased = new Map<string, boolean>();
  public mouse: MouseState = { dx: 0, dy: 0, scrollDelta: 0, buttons: [false, false, false], justPressedButtons: [false, false, false] };
  private prevMouseButtons = [false, false, false];
  public sensitivity = 0.002;
  public invertY = false;
  private locked = false;
  private pendingDx = 0;
  private pendingDy = 0;
  private pendingScroll = 0;

  constructor() {
    this.loadBindings();
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.keys.get(e.code)) {
        this.justPressed.set(e.code, true);
      }
      this.keys.set(e.code, true);
    });
    document.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      this.justReleased.set(e.code, true);
    });
    document.addEventListener('mousemove', (e) => {
      this.pendingDx += e.movementX;
      this.pendingDy += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      this.mouse.buttons[e.button] = true;
      this.mouse.justPressedButtons[e.button] = true;
    });
    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons[e.button] = false;
    });
    document.addEventListener('wheel', (e) => {
      this.pendingScroll += e.deltaY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement !== null;
    });
  }

  update(): void {
    this.prevKeys = new Map(this.keys);
    this.mouse.dx = this.locked ? this.pendingDx * this.sensitivity : 0;
    this.mouse.dy = this.locked ? this.pendingDy * this.sensitivity * (this.invertY ? -1 : 1) : 0;
    this.mouse.scrollDelta = this.pendingScroll;
    this.pendingDx = 0;
    this.pendingDy = 0;
    this.pendingScroll = 0;
    this.prevMouseButtons = [...this.mouse.buttons];
  }

  postUpdate(): void {
    this.justPressed.clear();
    this.justReleased.clear();
    this.mouse.justPressedButtons = [false, false, false];
  }

  isPressed(code: string): boolean {
    return this.keys.get(code) === true;
  }

  wasJustPressed(code: string): boolean {
    return this.justPressed.get(code) === true;
  }

  wasJustReleased(code: string): boolean {
    return this.justReleased.get(code) === true;
  }

  isMouseDown(button: number): boolean {
    return this.mouse.buttons[button] === true;
  }

  wasMouseJustPressed(button: number): boolean {
    return this.mouse.justPressedButtons[button] === true;
  }

  // Convenience getters for common actions
  get moveForward(): boolean { return this.isPressed('KeyW'); }
  get moveBack(): boolean { return this.isPressed('KeyS'); }
  get moveLeft(): boolean { return this.isPressed('KeyA'); }
  get moveRight(): boolean { return this.isPressed('KeyD'); }
  get sprint(): boolean { return this.isPressed('ShiftLeft') || this.isPressed('ShiftRight'); }
  get crouch(): boolean { return this.isPressed('KeyC'); }
  get jump(): boolean { return this.wasJustPressed('Space'); }
  get fire(): boolean { return this.mouse.buttons[0]; }
  get fireJustPressed(): boolean { return this.mouse.justPressedButtons[0]; }
  get ads(): boolean { return this.mouse.buttons[2]; }
  get reload(): boolean { return this.wasJustPressed('KeyR'); }
  get grenade(): boolean { return this.wasJustPressed('KeyG'); }
  get interact(): boolean { return this.wasJustPressed('KeyF'); }
  get weaponSlot1(): boolean { return this.wasJustPressed('Digit1'); }
  get weaponSlot2(): boolean { return this.wasJustPressed('Digit2'); }
  get weaponSlot3(): boolean { return this.wasJustPressed('Digit3'); }
  get pause(): boolean { return this.wasJustPressed('Escape'); }

  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  isPointerLocked(): boolean {
    return this.locked;
  }

  private loadBindings(): void {
    // Bindings from localStorage (future use)
  }

  saveBindings(): void {
    // Save to localStorage
  }
}
