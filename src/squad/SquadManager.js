class SquadManager {
  constructor(scene, audio, effects) {
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.members = [];
    this.active = false;
    this.voiceQueue = [];
    this.voiceTimer = 0;
    this.voiceCooldown = 8;
  }

  spawnViktor(position) {
    const member = this._buildSquadMember('Viktor', 0x3a2a2a, 0x00aaff, position);
    member.name = 'Viktor';
    member.voiceLines = [
      'Contact! Taking fire!',
      'I got you covered!',
      'Enemy down!',
      'Suppressing fire!',
      'Watch your six!',
    ];
    member.health = 200;
    member.maxHealth = 200;
    member.fireRate = 0.4;
    member.fireTimer = 0;
    member.damage = 30;
    this.members.push(member);
    return member;
  }

  spawnAhmed(position) {
    const member = this._buildSquadMember('Ahmed', 0x2a3a2a, 0x00ff88, position);
    member.name = 'Ahmed';
    member.voiceLines = [
      'Drone online. Scanning.',
      'Enemy spotted, north sector!',
      'Clear! Moving up!',
      'EMP ready if you need it.',
      'Got a visual, two tangos!',
    ];
    member.health = 150;
    member.maxHealth = 150;
    member.fireRate = 0.35;
    member.fireTimer = 0;
    member.damage = 20;
    this.members.push(member);
    return member;
  }

  _buildSquadMember(name, armorColor, accentColor, position) {
    const group = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.3),
      new THREE.MeshLambertMaterial({ color: armorColor })
    );
    torso.position.y = 1.0;
    group.add(torso);

    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.35, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x445566 })
    );
    vest.position.y = 1.05;
    group.add(vest);

    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.53, 0.36, 0.015),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    accent.position.set(0, 1.05, 0.16);
    group.add(accent);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshLambertMaterial({ color: 0x8a7060 })
    );
    head.position.y = 1.55;
    group.add(head);

    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.31, 0.18, 0.31),
      new THREE.MeshLambertMaterial({ color: 0x223344 })
    );
    helmet.position.y = 1.65;
    group.add(helmet);

    const armGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
    const armMat = new THREE.MeshLambertMaterial({ color: armorColor });
    const la = new THREE.Mesh(armGeo, armMat);
    la.position.set(-0.35, 0.98, 0);
    la.rotation.z = 0.15;
    group.add(la);
    const ra = new THREE.Mesh(armGeo, armMat);
    ra.position.set(0.35, 0.98, 0);
    ra.rotation.z = -0.15;
    group.add(ra);

    const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const ll = new THREE.Mesh(legGeo, legMat);
    ll.position.set(-0.14, 0.35, 0);
    group.add(ll);
    const rl = new THREE.Mesh(legGeo, legMat);
    rl.position.set(0.14, 0.35, 0);
    group.add(rl);

    group.position.copy(position);
    this.scene.add(group);

    const nameTag = this._buildNameTag(name, accentColor);
    nameTag.position.set(0, 2.0, 0);
    group.add(nameTag);

    return {
      mesh: group,
      position: position.clone(),
      health: 150,
      maxHealth: 150,
      isDead: false,
      name,
      voiceLines: [],
      target: null,
      fireRate: 0.4,
      fireTimer: 0,
      damage: 25,
      followOffset: new THREE.Vector3((Math.random()-0.5)*3, 0, 2 + Math.random()*2),
      state: 'follow',
    };
  }

  _buildNameTag(name, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 64, 22);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
  }

  update(dt, playerPos, enemies, playerCamera) {
    if (!this.active || this.members.length === 0) return;

    this.voiceTimer -= dt;

    this.members.forEach(member => {
      if (member.isDead) return;
      this._updateMember(member, dt, playerPos, enemies, playerCamera);
    });
  }

  _updateMember(member, dt, playerPos, enemies, camera) {
    const aliveEnemies = enemies.filter(e => !e.isDead);
    if (aliveEnemies.length > 0) {
      let closest = null, closestDist = Infinity;
      aliveEnemies.forEach(e => {
        const d = member.position.distanceTo(e.position);
        if (d < closestDist) { closestDist = d; closest = e; }
      });
      member.target = closest;
      member.state = 'combat';
    } else {
      member.target = null;
      member.state = 'follow';
    }

    if (member.state === 'follow') {
      const followTarget = playerPos.clone().add(member.followOffset);
      followTarget.y = 0;
      const toTarget = followTarget.clone().sub(member.position);
      if (toTarget.length() > 1.5) {
        toTarget.normalize().multiplyScalar(4 * dt);
        member.position.add(toTarget);
        member.mesh.position.copy(member.position);
        member.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
    } else if (member.state === 'combat' && member.target) {
      const toEnemy = member.target.position.clone().sub(member.position);
      member.mesh.rotation.y = Math.atan2(toEnemy.x, toEnemy.z);

      member.fireTimer -= dt;
      if (member.fireTimer <= 0 && toEnemy.length() < 30) {
        member.fireTimer = member.fireRate;
        if (Math.random() < 0.6 && !member.target.isDead) {
          member.target.takeDamage(member.damage, false);
          this.audio.playGunshot();
          this.effects.particles.spawnMuzzleFlash(
            member.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            toEnemy.normalize()
          );
          if (this.voiceTimer <= 0 && Math.random() < 0.3) {
            this._speak(member);
          }
        }
      }

      const dist = toEnemy.length();
      if (dist > 8) {
        const moveDir = toEnemy.clone().normalize().multiplyScalar(3 * dt);
        member.position.add(moveDir);
        member.mesh.position.copy(member.position);
      }
    }
  }

  _speak(member) {
    if (member.voiceLines.length === 0) return;
    const line = member.voiceLines[Math.floor(Math.random() * member.voiceLines.length)];
    this.voiceTimer = this.voiceCooldown;

    const el = document.getElementById('squad-comms');
    const textEl = document.getElementById('comm-text');
    const portraitEl = document.getElementById('comm-portrait');
    if (el && textEl) {
      textEl.textContent = `[${member.name.toUpperCase()}]: ${line}`;
      if (portraitEl) {
        portraitEl.style.background = member.name === 'Viktor'
          ? 'linear-gradient(135deg, #3a1a1a, #2a0d0d)'
          : 'linear-gradient(135deg, #1a3020, #0d2a15)';
      }
      el.classList.remove('hidden');
      clearTimeout(this._commTimeout);
      this._commTimeout = setTimeout(() => el.classList.add('hidden'), 3500);
    }
    this.audio.speak(line, member.name === 'Viktor' ? 'male' : 'male', 1.0);
  }

  speakSarah(line) {
    const el = document.getElementById('squad-comms');
    const textEl = document.getElementById('comm-text');
    const portraitEl = document.getElementById('comm-portrait');
    if (el && textEl) {
      textEl.textContent = `[SARAH KIM]: ${line}`;
      if (portraitEl) {
        portraitEl.style.background = 'linear-gradient(135deg, #2a1a40, #1a0d30)';
      }
      el.classList.remove('hidden');
      clearTimeout(this._commTimeout);
      this._commTimeout = setTimeout(() => el.classList.add('hidden'), 4000);
    }
    this.audio.speak(line, 'female', 0.95);
  }

  setActive(val) { this.active = val; }

  clearAll() {
    this.members.forEach(m => this.scene.remove(m.mesh));
    this.members = [];
    this.active = false;
  }
}

window.SquadManager = SquadManager;
