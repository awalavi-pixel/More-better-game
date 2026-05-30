class EffectsManager {
  constructor(scene, camera, audio) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.particles = new ParticleSystem(scene);
    this.screenShaking = false;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.recoilOffset = new THREE.Vector2(0, 0);
    this.tracers = [];
    this.decals = [];
    this.maxDecals = 50;
    this.lights = [];
  }

  screenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  addRecoil(x, y) {
    this.recoilOffset.x += x;
    this.recoilOffset.y += y;
  }

  spawnBulletTracer(from, to) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.008, 0.008, Math.min(len, 2), 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    const mid = from.clone().add(dir.multiplyScalar(0.5));
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize().clone());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.06 });
  }

  spawnMuzzleLight(position) {
    const light = new THREE.PointLight(0xffaa22, 3, 5);
    light.position.copy(position);
    this.scene.add(light);
    this.lights.push({ light, life: 0.06 });
  }

  spawnDecal(position, normal) {
    if (this.decals.length >= this.maxDecals) {
      const old = this.decals.shift();
      this.scene.remove(old);
    }
    const geo = new THREE.PlaneGeometry(0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).addScaledVector(normal, 0.01);
    if (normal) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
    }
    this.scene.add(mesh);
    this.decals.push(mesh);
  }

  flashDamageVignette() {
    const el = document.getElementById('damage-vignette');
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 300);
  }

  showHitMarker(headshot = false) {
    if (headshot) {
      const el = document.getElementById('headshot-marker');
      if (el) {
        el.classList.remove('hidden');
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        setTimeout(() => el.classList.add('hidden'), 500);
      }
    } else {
      const el = document.getElementById('hit-marker');
      if (el) {
        el.classList.remove('hidden');
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        setTimeout(() => el.classList.add('hidden'), 300);
      }
    }
    this.audio.playHitMarker();
    if (headshot) this.audio.playHeadshotMarker();
  }

  showXPPopup(amount, label) {
    const el = document.getElementById('xp-popup');
    if (!el) return;
    el.textContent = `+${amount} XP${label ? ' · ' + label : ''}`;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'xpFloat 2s forwards';
    setTimeout(() => el.classList.add('hidden'), 2000);
  }

  update(dt) {
    this.particles.update(dt);

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      if (this.tracers[i].life <= 0) {
        this.scene.remove(this.tracers[i].mesh);
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.lights.length - 1; i >= 0; i--) {
      this.lights[i].life -= dt;
      if (this.lights[i].life <= 0) {
        this.scene.remove(this.lights[i].light);
        this.lights.splice(i, 1);
      }
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const s = this.shakeIntensity * (this.shakeTimer / this.shakeDuration);
      this.camera.position.x += (Math.random() - 0.5) * s * 0.1;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.1;
    }

    this.recoilOffset.x *= 0.85;
    this.recoilOffset.y *= 0.85;
  }

  clear() {
    this.particles.clear();
    this.tracers.forEach(t => this.scene.remove(t.mesh));
    this.tracers = [];
    this.lights.forEach(l => this.scene.remove(l.light));
    this.lights = [];
    this.decals.forEach(d => this.scene.remove(d));
    this.decals = [];
  }
}

window.EffectsManager = EffectsManager;
