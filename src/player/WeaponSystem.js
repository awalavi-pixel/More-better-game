class WeaponSystem {
  constructor(camera, scene, audio, effects, skillTree) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.skillTree = skillTree;

    this.WEAPONS = this._defineWeapons();
    this.equipped = [];
    this.currentSlot = 0;
    this.currentWeapon = null;
    this.weaponMesh = null;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.isADS = false;
    this.adsProgress = 0;
    this.isSuppressed = false;
    this.swayTime = 0;

    this.attachments = {};
    this._setupWeaponMeshGroup();
  }

  _defineWeapons() {
    return {
      'AR-12': {
        name: 'AR-12', type: 'Assault Rifle', damage: 28, headshotMult: 2.5,
        fireRate: 0.1, recoil: { x: 0.003, y: 0.008 }, spread: 0.02,
        reloadTime: 2.2, mag: 30, reserve: 120, auto: true,
        unlockLevel: 1, muzzleFlash: true,
        adsZoom: 1.5, adsSpeed: 0.1,
      },
      'M7 Valkyrie': {
        name: 'M7 Valkyrie', type: 'Assault Rifle', damage: 35, headshotMult: 2.5,
        fireRate: 0.12, recoil: { x: 0.004, y: 0.01 }, spread: 0.015,
        reloadTime: 2.5, mag: 25, reserve: 100, auto: true,
        unlockLevel: 2, muzzleFlash: true,
        adsZoom: 1.8, adsSpeed: 0.08,
      },
      'Viper': {
        name: 'Viper', type: 'SMG', damage: 18, headshotMult: 2.2,
        fireRate: 0.07, recoil: { x: 0.005, y: 0.006 }, spread: 0.03,
        reloadTime: 1.8, mag: 35, reserve: 140, auto: true,
        unlockLevel: 1, muzzleFlash: true,
        adsZoom: 1.3, adsSpeed: 0.12,
      },
      'Phantom': {
        name: 'Phantom', type: 'SMG', damage: 20, headshotMult: 2.3,
        fireRate: 0.065, recoil: { x: 0.004, y: 0.005 }, spread: 0.025,
        reloadTime: 1.9, mag: 32, reserve: 128, auto: true,
        unlockLevel: 5, muzzleFlash: true,
        adsZoom: 1.4, adsSpeed: 0.14,
      },
      'Breacher': {
        name: 'Breacher', type: 'Shotgun', damage: 80, headshotMult: 1.8,
        fireRate: 0.7, recoil: { x: 0.01, y: 0.02 }, spread: 0.12,
        reloadTime: 2.8, mag: 6, reserve: 24, auto: false,
        unlockLevel: 8, muzzleFlash: true, pellets: 8,
        adsZoom: 1.2, adsSpeed: 0.1,
      },
      'Longshot X': {
        name: 'Longshot X', type: 'Sniper', damage: 120, headshotMult: 3.0,
        fireRate: 1.5, recoil: { x: 0.005, y: 0.03 }, spread: 0.003,
        reloadTime: 3.5, mag: 5, reserve: 20, auto: false,
        unlockLevel: 12, muzzleFlash: true,
        adsZoom: 4.0, adsSpeed: 0.06,
      },
    };
  }

  _setupWeaponMeshGroup() {
    this.weaponGroup = new THREE.Group();
    this.camera.add(this.weaponGroup);
    this.weaponGroup.position.set(0.3, -0.3, -0.6);
  }

  _buildWeaponMesh(weaponName) {
    const group = new THREE.Group();
    const w = this.WEAPONS[weaponName];

    if (w.type === 'Assault Rifle' || w.type === 'SMG') {
      const bodyGeo = new THREE.BoxGeometry(0.06, 0.05, 0.35);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x333344 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      const barrelGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8);
      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x222233 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0, -0.25);
      group.add(barrel);

      const stockGeo = new THREE.BoxGeometry(0.04, 0.04, 0.1);
      const stock = new THREE.Mesh(stockGeo, bodyMat);
      stock.position.set(0, 0, 0.2);
      group.add(stock);

      const magGeo = new THREE.BoxGeometry(0.025, 0.1, 0.04);
      const magMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const mag = new THREE.Mesh(magGeo, magMat);
      mag.position.set(0, -0.06, 0.02);
      group.add(mag);

      const gripGeo = new THREE.BoxGeometry(0.03, 0.07, 0.04);
      const grip = new THREE.Mesh(gripGeo, magMat);
      grip.position.set(0, -0.06, 0.08);
      grip.rotation.x = -0.2;
      group.add(grip);

      const sightGeo = new THREE.BoxGeometry(0.015, 0.02, 0.015);
      const sightMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
      const sight = new THREE.Mesh(sightGeo, sightMat);
      sight.position.set(0, 0.04, -0.05);
      group.add(sight);

    } else if (w.type === 'Shotgun') {
      const bodyGeo = new THREE.BoxGeometry(0.07, 0.055, 0.5);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x442211 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8);
      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.15);
      group.add(barrel);

      const pumpGeo = new THREE.BoxGeometry(0.065, 0.02, 0.08);
      const pump = new THREE.Mesh(pumpGeo, barrelMat);
      pump.position.set(0, 0.02, 0);
      group.add(pump);

    } else if (w.type === 'Sniper') {
      const bodyGeo = new THREE.BoxGeometry(0.055, 0.05, 0.7);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a3a2a });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8);
      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0, -0.5);
      group.add(barrel);

      const scopeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.2, 8);
      const scopeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
      const scope = new THREE.Mesh(scopeGeo, scopeMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.06, -0.1);
      group.add(scope);

      const scopeLensMat = new THREE.MeshBasicMaterial({ color: 0x0044aa });
      const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), scopeLensMat);
      scopeLens.position.set(0, 0.06, -0.21);
      group.add(scopeLens);
    }

    if (this.isSuppressed) {
      const suppGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
      const suppMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
      const supp = new THREE.Mesh(suppGeo, suppMat);
      supp.rotation.x = Math.PI / 2;
      supp.position.set(0, 0, -0.38);
      group.add(supp);
    }

    this.muzzlePoint = new THREE.Object3D();
    this.muzzlePoint.position.set(0, 0, -0.45);
    group.add(this.muzzlePoint);

    return group;
  }

  equip(weaponNames, startSlot = 0) {
    this.equipped = weaponNames;
    this.currentSlot = startSlot;
    this._switchToSlot(startSlot);
  }

  _switchToSlot(slot) {
    if (slot < 0 || slot >= this.equipped.length) return;
    this.currentSlot = slot;
    const name = this.equipped[slot];
    if (!this.WEAPONS[name]) return;

    if (this.weaponMesh) {
      this.weaponGroup.remove(this.weaponMesh);
    }

    this.currentWeapon = Object.assign({}, this.WEAPONS[name]);
    const reloadMult = this.skillTree ? this.skillTree.getEffect('reloadMult', 1) : 1;
    const ammoMult = this.skillTree ? this.skillTree.getEffect('ammoMult', 1) : 1;
    this.currentWeapon.currentMag = this.currentWeapon.mag;
    this.currentWeapon.currentReserve = Math.floor(this.currentWeapon.reserve * ammoMult);
    this.currentWeapon.reloadTimeActual = this.currentWeapon.reloadTime * reloadMult;
    this.weaponMesh = this._buildWeaponMesh(name);
    this.weaponGroup.add(this.weaponMesh);
    this.isReloading = false;
    this.fireTimer = 0;
    this._updateAmmoHUD();
    this._updateWeaponHUD();
    this.audio.playUIBeep(800);
  }

  switchNext() {
    const next = (this.currentSlot + 1) % this.equipped.length;
    this._switchToSlot(next);
  }

  switchPrev() {
    const prev = (this.currentSlot - 1 + this.equipped.length) % this.equipped.length;
    this._switchToSlot(prev);
  }

  switchToSlot(n) { this._switchToSlot(n); }

  canFire() {
    if (!this.currentWeapon) return false;
    if (this.isReloading) return false;
    if (this.fireTimer > 0) return false;
    if (this.currentWeapon.currentMag <= 0) {
      this.audio.playEmptyClick();
      this.reload();
      return false;
    }
    return true;
  }

  fire() {
    if (!this.canFire()) return null;
    const w = this.currentWeapon;
    const recoilMult = this.skillTree ? this.skillTree.getEffect('recoilMult', 1) : 1;

    w.currentMag--;
    this.fireTimer = w.fireRate;
    this._updateAmmoHUD();

    const spread = w.spread * (this.isADS ? 0.3 : 1);
    const directions = [];

    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const dir = new THREE.Vector3(0, 0, -1);
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.applyEuler(this.camera.rotation);
      directions.push(dir);
    }

    this.effects.addRecoil(
      (Math.random() - 0.5) * w.recoil.x * recoilMult,
      w.recoil.y * recoilMult
    );

    const worldPos = new THREE.Vector3();
    if (this.muzzlePoint) this.muzzlePoint.getWorldPosition(worldPos);
    else this.camera.getWorldPosition(worldPos);

    if (w.muzzleFlash) {
      this.effects.particles.spawnMuzzleFlash(worldPos, directions[0].clone());
      this.effects.spawnMuzzleLight(worldPos);
    }
    this.effects.particles.spawnShellEjection(worldPos.clone().add(new THREE.Vector3(0.1, 0, 0)));

    this.audio.playGunshot(this.isSuppressed);
    this.effects.screenShake(this.isSuppressed ? 0.3 : 1, 0.1);

    return { directions, origin: worldPos, weapon: w, suppressed: this.isSuppressed };
  }

  reload() {
    if (this.isReloading) return;
    if (!this.currentWeapon) return;
    const w = this.currentWeapon;
    if (w.currentMag >= w.mag) return;
    if (w.currentReserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = w.reloadTimeActual || w.reloadTime;

    this.audio.playReload();

    if (this.weaponMesh) {
      const orig = this.weaponGroup.rotation.x;
      this.weaponGroup.rotation.x = 0.4;
      setTimeout(() => {
        if (this.weaponGroup) this.weaponGroup.rotation.x = orig;
      }, (w.reloadTimeActual || w.reloadTime) * 500);
    }
  }

  setADS(state) {
    this.isADS = state;
    if (!this.currentWeapon) return;
    const targetFov = state ? 75 / this.currentWeapon.adsZoom : 75;
    this._tweenFOV(targetFov);
    const xTarget = state ? -0.12 : 0.3;
    const yTarget = state ? -0.28 : -0.3;
    this.weaponGroup.position.set(xTarget, yTarget, -0.6);
  }

  _tweenFOV(target) {
    const camera = this.camera;
    const step = () => {
      const diff = target - camera.fov;
      if (Math.abs(diff) < 0.5) { camera.fov = target; camera.updateProjectionMatrix(); return; }
      camera.fov += diff * 0.15;
      camera.updateProjectionMatrix();
      requestAnimationFrame(step);
    };
    step();
  }

  setSuppressed(val) {
    this.isSuppressed = val;
    if (this.currentWeapon) {
      this._switchToSlot(this.currentSlot);
    }
  }

  update(dt) {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this._finishReload();
      }
    }
    this._updateSway(dt);
  }

  _finishReload() {
    const w = this.currentWeapon;
    const needed = w.mag - w.currentMag;
    const taken = Math.min(needed, w.currentReserve);
    w.currentMag += taken;
    w.currentReserve -= taken;
    this.isReloading = false;
    this._updateAmmoHUD();
  }

  _updateSway(dt) {
    this.swayTime += dt;
    const swayX = Math.sin(this.swayTime * 1.5) * 0.005;
    const swayY = Math.sin(this.swayTime * 0.8) * 0.003;
    if (!this.isADS) {
      this.weaponGroup.position.x = 0.3 + swayX;
      this.weaponGroup.position.y = -0.3 + swayY;
    }
    if (this.effects.recoilOffset) {
      this.camera.rotation.x -= this.effects.recoilOffset.y * 0.1;
    }
  }

  _updateAmmoHUD() {
    const w = this.currentWeapon;
    if (!w) return;
    const magEl = document.getElementById('ammo-mag');
    const resEl = document.getElementById('ammo-reserve');
    if (magEl) magEl.textContent = w.currentMag;
    if (resEl) resEl.textContent = w.currentReserve;
    if (w.currentMag <= Math.floor(w.mag * 0.25)) {
      if (magEl) magEl.style.color = '#ff2244';
    } else {
      if (magEl) magEl.style.color = '';
    }
  }

  _updateWeaponHUD() {
    const w = this.currentWeapon;
    if (!w) return;
    const nameEl = document.getElementById('weapon-name');
    const modeEl = document.getElementById('weapon-mode');
    if (nameEl) nameEl.textContent = w.name;
    if (modeEl) modeEl.textContent = w.auto ? 'AUTO' : (w.pellets ? 'SHOTGUN' : 'SEMI');
  }

  getWeaponStats(name) {
    return this.WEAPONS[name];
  }

  addReserveAmmo(name, amount) {
    if (this.currentWeapon && this.currentWeapon.name === name) {
      this.currentWeapon.currentReserve = Math.min(
        this.currentWeapon.currentReserve + amount,
        this.currentWeapon.reserve * 2
      );
      this._updateAmmoHUD();
    }
  }
}

window.WeaponSystem = WeaponSystem;
