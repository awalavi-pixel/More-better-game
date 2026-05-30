class Player {
  constructor(camera, scene, audio, effects, skillTree) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.skillTree = skillTree;

    this.position = new THREE.Vector3(0, 1.8, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;

    this.maxHealth = 100 + (skillTree ? skillTree.getEffect('maxHealthBonus', 0) : 0);
    this.health = this.maxHealth;
    this.maxArmor = 50 + (skillTree ? skillTree.getEffect('maxArmorBonus', 0) : 0);
    this.armor = this.maxArmor;

    this.isAlive = true;
    this.isDead = false;
    this.isCrouching = false;
    this.isSprinting = false;
    this.isGrounded = true;
    this.lastStandUsed = false;

    this.moveSpeed = 6;
    this.crouchSpeed = 2.5;
    this.sprintSpeed = 10;
    this.jumpForce = 6;
    this.gravity = 20;
    this.height = 1.8;
    this.crouchHeight = 1.1;

    this.footstepTimer = 0;
    this.footstepInterval = 0.42;
    this.stepCount = 0;

    this.equipment = {
      grenades: 3,
      smoke: 2,
      emp: 1,
      drone: 1,
      medkit: 2
    };

    this.stealthLevel = 0;
    this.isDetected = false;

    this.colliders = [];
    this.raycaster = new THREE.Raycaster();

    this._updateHUD();
  }

  setColliders(colliders) {
    this.colliders = colliders;
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  move(forward, right, dt, crouching, sprinting) {
    this.isCrouching = crouching;
    this.isSprinting = sprinting && !crouching;

    const crouchSpeedMult = this.skillTree ? this.skillTree.getEffect('crouchSpeedMult', 1) : 1;
    let speed = this.moveSpeed;
    if (crouching) speed = this.crouchSpeed * crouchSpeedMult;
    else if (sprinting) speed = this.sprintSpeed;

    const moveDir = new THREE.Vector3(right, 0, -forward);
    if (moveDir.length() > 0) moveDir.normalize();
    moveDir.applyEuler(new THREE.Euler(0, this.yaw, 0));
    moveDir.multiplyScalar(speed);

    this.velocity.x = moveDir.x;
    this.velocity.z = moveDir.z;

    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    const newPos = this.position.clone().addScaledVector(this.velocity, dt);

    if (this._checkCollision(newPos)) {
      newPos.x = this.position.x;
      newPos.z = this.position.z;
    }

    if (newPos.y <= this._getGroundHeight(newPos)) {
      newPos.y = this._getGroundHeight(newPos);
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.position.copy(newPos);
    const targetHeight = crouching ? this.crouchHeight : this.height;
    this.camera.position.lerp(
      new THREE.Vector3(this.position.x, this.position.y + targetHeight, this.position.z),
      0.15
    );

    const isMoving = moveDir.length() > 0;
    if (isMoving && this.isGrounded) {
      const interval = this.footstepInterval / (speed / this.moveSpeed);
      this.footstepTimer += dt;
      if (this.footstepTimer >= interval) {
        this.footstepTimer = 0;
        const silent = this.skillTree ? this.skillTree.getEffect('silentMove', false) : false;
        if (!silent || !crouching) this.audio.playFootstep();
        this.stepCount++;
        this._bobCamera(speed);
      }
    } else {
      this.footstepTimer = 0;
    }

    this._updateStealthLevel(crouching, sprinting, isMoving);
  }

  _bobCamera(speed) {
    const bob = Math.sin(this.stepCount * Math.PI) * 0.02 * (speed / this.moveSpeed);
    this.camera.position.y += bob;
  }

  _getGroundHeight(pos) {
    if (this.colliders.length === 0) return 0;
    this.raycaster.set(new THREE.Vector3(pos.x, 10, pos.z), new THREE.Vector3(0, -1, 0));
    const hits = this.raycaster.intersectObjects(this.colliders, true);
    if (hits.length > 0) return hits[0].point.y;
    return 0;
  }

  _checkCollision(newPos) {
    if (this.colliders.length === 0) return false;
    const dirs = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];
    for (const dir of dirs) {
      this.raycaster.set(new THREE.Vector3(newPos.x, newPos.y + 1, newPos.z), dir);
      const hits = this.raycaster.intersectObjects(this.colliders, true);
      if (hits.length > 0 && hits[0].distance < 0.4) return true;
    }
    return false;
  }

  _updateStealthLevel(crouching, sprinting, moving) {
    let level = 100;
    if (crouching) level -= 40;
    if (!moving) level -= 20;
    if (sprinting) level += 40;
    this.stealthLevel = Math.max(0, Math.min(100, level));

    const el = document.getElementById('stealth-bar');
    const statusEl = document.getElementById('stealth-status');
    if (el) el.style.width = (100 - this.stealthLevel) + '%';
    if (statusEl) {
      if (this.stealthLevel < 20) statusEl.textContent = 'HIDDEN';
      else if (this.stealthLevel < 60) statusEl.textContent = 'MOVING';
      else statusEl.textContent = 'EXPOSED';
      statusEl.style.color = this.stealthLevel < 20 ? '#00ff64' : this.stealthLevel < 60 ? '#ffaa00' : '#ff2244';
    }
  }

  jump() {
    if (this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
  }

  takeDamage(amount, fromPos) {
    if (!this.isAlive) return;
    let dmg = amount;
    if (this.armor > 0) {
      const blocked = Math.min(this.armor, dmg * 0.6);
      this.armor -= blocked;
      dmg -= blocked;
    }
    this.health -= dmg;
    this.effects.flashDamageVignette();
    this.effects.screenShake(2, 0.2);
    this._updateHUD();

    if (this.health <= 20) {
      document.getElementById('low-health-pulse').classList.remove('hidden');
    }

    if (this.health <= 0) {
      const lastStand = this.skillTree ? this.skillTree.getEffect('lastStand', false) : false;
      if (lastStand && !this.lastStandUsed) {
        this.health = 1;
        this.lastStandUsed = true;
        this._showSquadComm('MARCUS', 'HANGING ON! LAST STAND!');
      } else {
        this.die();
      }
    }
  }

  heal(amount) {
    const speedMult = this.skillTree ? this.skillTree.getEffect('healSpeedMult', 1) : 1;
    this.health = Math.min(this.maxHealth, this.health + amount);
    this._updateHUD();
    if (this.health > 20) {
      document.getElementById('low-health-pulse').classList.add('hidden');
    }
  }

  die() {
    this.isAlive = false;
    this.isDead = true;
    setTimeout(() => {
      if (window.GAME) window.GAME.onPlayerDeath();
    }, 1000);
  }

  _updateHUD() {
    const healthBar = document.getElementById('health-bar');
    const healthVal = document.getElementById('health-val');
    const armorBar = document.getElementById('armor-bar');
    const armorVal = document.getElementById('armor-val');
    if (healthBar) healthBar.style.width = Math.max(0, (this.health / this.maxHealth) * 100) + '%';
    if (healthVal) healthVal.textContent = Math.max(0, Math.floor(this.health));
    if (armorBar) armorBar.style.width = Math.max(0, (this.armor / this.maxArmor) * 100) + '%';
    if (armorVal) armorVal.textContent = Math.max(0, Math.floor(this.armor));
  }

  _showSquadComm(name, text) {
    const el = document.getElementById('squad-comms');
    const textEl = document.getElementById('comm-text');
    if (!el || !textEl) return;
    textEl.textContent = `[${name}]: ${text}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  }

  throwGrenade(scene, type = 'frag') {
    if (type === 'frag' && this.equipment.grenades <= 0) return null;
    if (type === 'smoke' && this.equipment.smoke <= 0) return null;
    if (type === 'emp' && this.equipment.emp <= 0) return null;

    if (type === 'frag') this.equipment.grenades--;
    else if (type === 'smoke') this.equipment.smoke--;
    else if (type === 'emp') this.equipment.emp--;

    this._updateEquipHUD();
    this.audio.playGrenadeBounce();

    const dir = new THREE.Vector3(0, 0.3, -1);
    dir.applyEuler(this.camera.rotation);
    dir.normalize().multiplyScalar(15);

    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const colors = { frag: 0x334433, smoke: 0x88aa88, emp: 0x4488ff };
    const mat = new THREE.MeshLambertMaterial({ color: colors[type] || 0x334433 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.camera.position);
    scene.add(mesh);

    const vel = dir.clone();
    let t = 0;
    const explodeTime = type === 'frag' ? 2.5 : 4;
    const startPos = mesh.position.clone();
    const update = (dt) => {
      t += dt;
      vel.y -= 9.8 * dt;
      mesh.position.addScaledVector(vel, dt);
      if (mesh.position.y < 0.1) { mesh.position.y = 0.1; vel.y = 0; vel.multiplyScalar(0.3); }
      if (t >= explodeTime) {
        scene.remove(mesh);
        if (type === 'frag') {
          this.effects.particles.spawnExplosion(mesh.position);
          this.audio.playExplosion();
          return { exploded: true, position: mesh.position.clone(), radius: 5, damage: 80, type };
        } else if (type === 'smoke') {
          this.effects.particles.spawnSmoke(mesh.position);
          return { exploded: true, position: mesh.position.clone(), radius: 6, type: 'smoke' };
        } else if (type === 'emp') {
          this.effects.particles.spawnSparks(mesh.position);
          this.audio.playUIBeep(200);
          return { exploded: true, position: mesh.position.clone(), radius: 8, type: 'emp' };
        }
        return null;
      }
      return { mesh, position: mesh.position.clone(), exploded: false, type };
    };

    return { mesh, update, type, vel };
  }

  _updateEquipHUD() {
    const g = document.getElementById('grenade-count');
    const s = document.getElementById('smoke-count');
    const d = document.getElementById('drone-count');
    if (g) g.textContent = this.equipment.grenades;
    if (s) s.textContent = this.equipment.smoke;
    if (d) d.textContent = this.equipment.drone;
  }

  getRaycastOrigin() { return this.camera.position.clone(); }
  getRaycastDirection() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(this.camera.rotation);
    return dir;
  }

  reset(spawnPos) {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.isAlive = true;
    this.isDead = false;
    this.lastStandUsed = false;
    this.position.copy(spawnPos || new THREE.Vector3(0, 1.8, 0));
    this.camera.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.equipment = { grenades: 3, smoke: 2, emp: 1, drone: 1, medkit: 2 };
    document.getElementById('low-health-pulse').classList.add('hidden');
    this._updateHUD();
    this._updateEquipHUD();
  }
}

window.Player = Player;
