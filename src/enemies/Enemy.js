class Enemy {
  constructor(scene, type, position, audio, effects) {
    this.scene = scene;
    this.type = type;
    this.audio = audio;
    this.effects = effects;

    this.position = position.clone();
    this.health = this._getBaseHealth();
    this.maxHealth = this.health;
    this.isDead = false;
    this.isAlert = false;

    this.damage = this._getBaseDamage();
    this.fireRate = this._getFireRate();
    this.xpReward = this._getXPReward();
    this.accuracy = this._getAccuracy();
    this.faction = 'aegis';

    this.mesh = this._buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this.ai = new AIController(this, scene);
    this.healthBar = this._buildHealthBar();
    this.detectionIndicator = this._buildDetectionIndicator();

    this.shootCooldown = 0;
    this.voiceCooldown = 0;
  }

  _getBaseHealth() {
    const map = { Rifleman: 60, Scout: 40, Heavy: 150, Sniper: 50, Medic: 70, Elite: 120 };
    return map[this.type] || 60;
  }

  _getBaseDamage() {
    const map = { Rifleman: 20, Scout: 15, Heavy: 35, Sniper: 60, Medic: 18, Elite: 30 };
    return map[this.type] || 20;
  }

  _getFireRate() {
    const map = { Rifleman: 0.4, Scout: 0.3, Heavy: 0.8, Sniper: 2.0, Medic: 0.5, Elite: 0.35 };
    return map[this.type] || 0.4;
  }

  _getXPReward() {
    const map = { Rifleman: 50, Scout: 40, Heavy: 100, Sniper: 80, Medic: 60, Elite: 120 };
    return map[this.type] || 50;
  }

  _getAccuracy() {
    const map = { Rifleman: 0.7, Scout: 0.8, Heavy: 0.5, Sniper: 0.95, Medic: 0.6, Elite: 0.85 };
    return map[this.type] || 0.7;
  }

  _buildMesh() {
    const group = new THREE.Group();

    const colors = {
      Rifleman: { armor: 0x334455, accent: 0xff3300, helmet: 0x223344 },
      Scout: { armor: 0x2a3a2a, accent: 0xff5500, helmet: 0x1a2a1a },
      Heavy: { armor: 0x3a2a2a, accent: 0xff1100, helmet: 0x2a1a1a },
      Sniper: { armor: 0x2a2a3a, accent: 0xff4400, helmet: 0x1a1a2a },
      Medic: { armor: 0x2a3a3a, accent: 0xffffff, helmet: 0x1a2a2a },
      Elite: { armor: 0x1a1a2a, accent: 0xff0066, helmet: 0x0a0a1a },
    };
    const c = colors[this.type] || colors.Rifleman;

    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const torsoMat = new THREE.MeshLambertMaterial({ color: c.armor });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.0;
    group.add(torso);

    const vestGeo = new THREE.BoxGeometry(0.52, 0.35, 0.32);
    const vestMat = new THREE.MeshLambertMaterial({ color: this.type === 'Heavy' ? 0x4a3a3a : 0x4a5566 });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.05;
    group.add(vest);

    const accentGeo = new THREE.BoxGeometry(0.53, 0.36, 0.015);
    const accentMat = new THREE.MeshBasicMaterial({ color: c.accent });
    const accentFront = new THREE.Mesh(accentGeo, accentMat);
    accentFront.position.set(0, 1.05, 0.16);
    group.add(accentFront);

    const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x8a7060 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    group.add(head);

    const helmetGeo = new THREE.BoxGeometry(0.31, 0.18, 0.31);
    const helmetMat = new THREE.MeshLambertMaterial({ color: c.helmet });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1.65;
    group.add(helmet);

    if (this.type === 'Sniper') {
      const scopeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 4);
      const scopeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const scope = new THREE.Mesh(scopeGeo, scopeMat);
      scope.position.set(0.18, 1.68, 0.05);
      group.add(scope);
    }

    if (this.type === 'Elite') {
      const visorGeo = new THREE.BoxGeometry(0.3, 0.08, 0.01);
      const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0066 });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.58, 0.145);
      group.add(visor);
    }

    const armGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
    const armMat = new THREE.MeshLambertMaterial({ color: c.armor });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 0.98, 0);
    leftArm.rotation.z = 0.15;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.35, 0.98, 0);
    rightArm.rotation.z = -0.15;
    group.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.14, 0.35, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.14, 0.35, 0);
    group.add(rightLeg);

    const bootGeo = new THREE.BoxGeometry(0.18, 0.1, 0.22);
    const bootMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.14, 0.05, 0.02);
    group.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.14, 0.05, 0.02);
    group.add(rightBoot);

    const weaponGroup = this._buildEnemyWeapon(this.type);
    weaponGroup.position.set(0.35, 0.98, -0.2);
    group.add(weaponGroup);

    if (this.type === 'Heavy') {
      group.scale.setScalar(1.2);
    } else if (this.type === 'Scout') {
      group.scale.setScalar(0.9);
    }

    group.userData.enemy = this;
    group.traverse(child => {
      if (child.isMesh) child.userData.enemy = this;
    });

    return group;
  }

  _buildEnemyWeapon(type) {
    const group = new THREE.Group();
    const types = {
      Rifleman: { len: 0.35, color: 0x222222 },
      Scout: { len: 0.25, color: 0x333333 },
      Heavy: { len: 0.55, color: 0x111111 },
      Sniper: { len: 0.6, color: 0x222233 },
      Medic: { len: 0.3, color: 0x223322 },
      Elite: { len: 0.4, color: 0x111122 },
    };
    const t = types[type] || types.Rifleman;
    const geo = new THREE.BoxGeometry(0.04, 0.04, t.len);
    const mat = new THREE.MeshLambertMaterial({ color: t.color });
    const body = new THREE.Mesh(geo, mat);
    group.add(body);
    const barrelGeo = new THREE.CylinderGeometry(0.008, 0.008, t.len * 0.6, 6);
    const barrel = new THREE.Mesh(barrelGeo, mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -t.len * 0.45;
    group.add(barrel);
    return group;
  }

  _buildHealthBar() {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x220000, side: THREE.DoubleSide })
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff2244, side: THREE.DoubleSide })
    );
    bg.position.set(0, 2.0, 0);
    fill.position.set(0, 2.0, 0.001);
    this.mesh.add(bg);
    this.mesh.add(fill);
    this._healthBarFill = fill;
    return { bg, fill };
  }

  _buildDetectionIndicator() {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 2.2, 0);
    mesh.visible = false;
    this.mesh.add(mesh);
    this._detIndicator = mesh;
    return mesh;
  }

  takeDamage(amount, isHeadshot) {
    if (this.isDead) return;
    this.health -= amount;
    this.effects.particles.spawnBlood(
      this.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      new THREE.Vector3(Math.random()-0.5, 0.5, Math.random()-0.5)
    );
    this.effects.screenShake(0.5, 0.1);

    if (this._healthBarFill) {
      const pct = Math.max(0, this.health / this.maxHealth);
      this._healthBarFill.scale.x = pct;
      this._healthBarFill.position.x = -(1 - pct) * 0.3;
    }

    if (this.ai.state === 'patrol' || this.ai.state === 'investigate') {
      this.ai._setState('alert');
      this.ai.lastKnownPos = window.GAME ? window.GAME.player.position.clone() : null;
      this.ai._callNearbyEnemies();
    }

    if (this.health <= 0) this.die();
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = -0.5;
    if (this._detIndicator) this._detIndicator.visible = false;
    setTimeout(() => {
      this.scene.remove(this.mesh);
    }, 5000);
  }

  shoot(targetPos) {
    if (this.isDead) return;
    const fromPos = this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const toTarget = targetPos.clone().sub(fromPos).normalize();
    const spread = (1 - this.accuracy) * 0.15;
    toTarget.x += (Math.random() - 0.5) * spread;
    toTarget.y += (Math.random() - 0.5) * spread;
    this.audio.playGunshot();
    this.effects.particles.spawnMuzzleFlash(
      fromPos.clone().add(toTarget.clone().multiplyScalar(0.5)),
      toTarget
    );
    return { origin: fromPos, direction: toTarget };
  }

  update(dt, playerPos, colliders, allEnemies) {
    if (this.isDead) return;
    const stealthLevel = window.GAME ? window.GAME.player.stealthLevel : 50;
    this.ai.update(dt, playerPos, colliders, allEnemies, stealthLevel);

    if (this._detIndicator) {
      const det = this.ai.getDetectionPercent();
      this._detIndicator.visible = det > 0.1 && !this.isDead;
      if (det < 0.5) this._detIndicator.material.color.setHex(0xffff00);
      else if (det < 1) this._detIndicator.material.color.setHex(0xff8800);
      else this._detIndicator.material.color.setHex(0xff0000);
      this._detIndicator.scale.setScalar(0.5 + det * 0.8);
    }

    if (this._healthBarFill) {
      this.mesh.children.forEach(c => {
        if (c.isGroup) return;
      });
    }
    if (this.mesh.children[this.mesh.children.length - 2]) {
      this.mesh.children[this.mesh.children.length - 2].lookAt(
        this.mesh.position.clone().add(playerPos.clone().sub(this.mesh.position))
      );
    }
  }

  getCenter() {
    return this.position.clone().add(new THREE.Vector3(0, 1.0, 0));
  }
}

window.Enemy = Enemy;
