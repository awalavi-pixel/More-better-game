class AssetManager {
  constructor() {
    this.textures = {};
    this.materials = {};
    this._createProceduralTextures();
  }

  _createProceduralTextures() {
    this.textures.concrete = this._makeConcreteTexture();
    this.textures.metal = this._makeMetalTexture();
    this.textures.dirt = this._makeDirtTexture();
    this.textures.asphalt = this._makeAsphaltTexture();
    this.textures.brick = this._makeBrickTexture();
    this.textures.grass = this._makeGrassTexture();
    this.textures.sand = this._makeSandTexture();
    this.textures.water = this._makeWaterTexture();

    this.materials.concrete = new THREE.MeshLambertMaterial({ map: this.textures.concrete });
    this.materials.metal = new THREE.MeshLambertMaterial({ map: this.textures.metal, color: 0x888899 });
    this.materials.dirt = new THREE.MeshLambertMaterial({ map: this.textures.dirt });
    this.materials.asphalt = new THREE.MeshLambertMaterial({ map: this.textures.asphalt });
    this.materials.brick = new THREE.MeshLambertMaterial({ map: this.textures.brick });
    this.materials.grass = new THREE.MeshLambertMaterial({ map: this.textures.grass });
    this.materials.sand = new THREE.MeshLambertMaterial({ map: this.textures.sand });
    this.materials.neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    this.materials.neonRed = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    this.materials.glass = new THREE.MeshLambertMaterial({ color: 0x88aabb, transparent: true, opacity: 0.4 });
    this.materials.enemy = new THREE.MeshLambertMaterial({ color: 0x445566 });
    this.materials.enemyAccent = new THREE.MeshBasicMaterial({ color: 0xff4422 });
    this.materials.playerTeam = new THREE.MeshLambertMaterial({ color: 0x334455 });
    this.materials.playerAccent = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  }

  _makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  _canvasToTexture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  }

  _makeConcreteTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 40 - 20);
      const size = Math.random() * 3 + 1;
      ctx.fillStyle = `rgb(${120+v},${120+v},${120+v})`;
      ctx.fillRect(x, y, size, size);
    }
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
      ctx.lineWidth = Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
    return this._canvasToTexture(c);
  }

  _makeMetalTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#556677');
    grad.addColorStop(0.5, '#889aaa');
    grad.addColorStop(1, '#556677');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(x, y, 1, Math.random() * 8);
    }
    return this._canvasToTexture(c);
  }

  _makeDirtTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 30 - 15);
      ctx.fillStyle = `rgb(${90+v},${60+v},${45+v})`;
      ctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
    }
    return this._canvasToTexture(c);
  }

  _makeAsphaltTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${40+v},${40+v},${40+v})`;
      ctx.fillRect(x, y, Math.random() * 2, Math.random() * 2);
    }
    ctx.strokeStyle = 'rgba(255,255,200,0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 20]);
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.stroke();
    return this._canvasToTexture(c);
  }

  _makeBrickTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#884433';
    ctx.fillRect(0, 0, 256, 256);
    const bw = 64, bh = 24;
    ctx.strokeStyle = '#552211';
    ctx.lineWidth = 3;
    for (let row = 0; row < Math.ceil(256 / bh); row++) {
      const offset = (row % 2) * (bw / 2);
      for (let col = -1; col < Math.ceil(256 / bw) + 1; col++) {
        const x = col * bw + offset;
        const y = row * bh;
        ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
        const v = Math.floor(Math.random() * 30 - 15);
        ctx.fillStyle = `rgba(${v > 0 ? v : 0},0,0,0.1)`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }
    return this._canvasToTexture(c);
  }

  _makeGrassTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 30 - 15);
      ctx.fillStyle = `rgb(${50+v},${90+v},${40+v})`;
      ctx.fillRect(x, y, 1, Math.random() * 5);
    }
    return this._canvasToTexture(c);
  }

  _makeSandTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c8a870';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 30 - 15);
      ctx.fillStyle = `rgb(${200+v},${168+v},${112+v})`;
      ctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
    }
    return this._canvasToTexture(c);
  }

  _makeWaterTexture() {
    const c = this._makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a4a6a');
    grad.addColorStop(1, '#0a2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(100,200,255,0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 30 + 5, 0, Math.PI);
      ctx.stroke();
    }
    return this._canvasToTexture(c);
  }

  getMaterial(name) {
    return this.materials[name] || this.materials.concrete;
  }

  clone(name) {
    const m = this.getMaterial(name);
    return m.clone();
  }
}

window.AssetManager = AssetManager;
