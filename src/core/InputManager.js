class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: {} };
    this.locked = false;
    this.sensitivity = 0.002;
    this.callbacks = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    this.keys[e.key.toLowerCase()] = true;
    this._fire('keydown', e.code);
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    this.keys[e.key.toLowerCase()] = false;
    this._fire('keyup', e.code);
  }

  _onMouseMove(e) {
    if (this.locked) {
      this.mouse.dx = e.movementX * this.sensitivity;
      this.mouse.dy = e.movementY * this.sensitivity;
    }
  }

  _onMouseDown(e) {
    this.mouse.buttons[e.button] = true;
    this._fire('mousedown', e.button);
  }

  _onMouseUp(e) {
    this.mouse.buttons[e.button] = false;
    this._fire('mouseup', e.button);
  }

  _onPointerLockChange() {
    this.locked = document.pointerLockElement !== null;
    if (!this.locked) this._fire('unlocked', null);
  }

  _fire(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(fn => fn(data));
    }
  }

  on(event, fn) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(fn);
  }

  off(event, fn) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(f => f !== fn);
    }
  }

  isDown(code) { return !!this.keys[code]; }

  isMouseDown(btn) { return !!this.mouse.buttons[btn]; }

  consumeDelta() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  requestPointerLock(element) {
    element.requestPointerLock();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}

window.InputManager = InputManager;
