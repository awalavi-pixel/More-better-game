class Chapter2_Informant {
  constructor(game) {
    this.game = game;
    this.chapter = 2;
    this.name = 'CH.2 — THE INFORMANT';
    this.spawnPos = new THREE.Vector3(0, 0, 45);
    this.hasStarted = false;
    this.alarmActive = false;
    this.alarmTimer = 0;
    this.alarmDuration = 60;
    this.hackingTerminal = null;
    this.hackingProgress = 0;
    this.hackingTarget = null;
    this.isHacking = false;
    this.hackedTerminals = [];
    this.camerasDisabled = false;
    this.phase = 0;

    this.objectives = [
      {
        id: 'infiltrate_compound',
        type: 'proximity',
        label: 'Infiltrate the compound — stay undetected',
        position: new THREE.Vector3(0, 0, 10),
        radius: 10,
        xpReward: 150,
        voiceLine: "You're in. The server room is in the main building. Access the east wing. Stay quiet.",
        complete: false
      },
      {
        id: 'disable_cameras',
        type: 'hack',
        terminalId: 'comms_tower',
        label: 'Hack comms terminal — disable security cameras',
        xpReward: 200,
        voiceLine: "Cameras looping. You've got maybe 3 minutes before they notice. Find the server room.",
        complete: false
      },
      {
        id: 'access_server_room',
        type: 'hack',
        terminalId: 'server_room',
        label: 'Download ARES intelligence — main server',
        xpReward: 400,
        voiceLine: "Download complete. ARES network coordinates confirmed. Get to the extraction gate, NOW!",
        complete: false
      },
      {
        id: 'extract',
        type: 'proximity',
        label: 'Reach extraction gate — NORTH PERIMETER',
        position: new THREE.Vector3(0, 0, 42),
        radius: 8,
        xpReward: 300,
        voiceLine: "Ghost One is clear. Package secured. Voss doesn't know we have this... yet.",
        complete: false
      }
    ];

    this.enemyConfigs = [
      { type: 'Rifleman', pos: new THREE.Vector3(-10, 0, -10), patrol: [new THREE.Vector3(-10, 0, -10), new THREE.Vector3(-10, 0, 10), new THREE.Vector3(-5, 0, 10)] },
      { type: 'Rifleman', pos: new THREE.Vector3(10, 0, -10), patrol: [new THREE.Vector3(10, 0, -10), new THREE.Vector3(10, 0, 10), new THREE.Vector3(5, 0, 10)] },
      { type: 'Scout', pos: new THREE.Vector3(0, 0, -20), patrol: [new THREE.Vector3(0, 0, -20), new THREE.Vector3(-8, 0, -20), new THREE.Vector3(-8, 0, -10)] },
      { type: 'Scout', pos: new THREE.Vector3(15, 0, -20), patrol: [new THREE.Vector3(15, 0, -20), new THREE.Vector3(15, 0, 0), new THREE.Vector3(8, 0, 0)] },
      { type: 'Rifleman', pos: new THREE.Vector3(-15, 0, 0), patrol: [new THREE.Vector3(-15, 0, 0), new THREE.Vector3(-15, 0, -15)] },
      { type: 'Sniper', pos: new THREE.Vector3(0, 6, -40) },
      { type: 'Sniper', pos: new THREE.Vector3(20, 6, -40) },
      { type: 'Heavy', pos: new THREE.Vector3(8, 0, -22) },
      { type: 'Medic', pos: new THREE.Vector3(-8, 0, -15), patrol: [new THREE.Vector3(-8, 0, -15), new THREE.Vector3(-12, 0, -20)] },
    ];
  }

  getMissionData() {
    return {
      chapter: 2,
      name: this.name,
      objectives: this.objectives.map(o => ({ ...o }))
    };
  }

  start() {
    this.hasStarted = true;
    this.phase = 0;

    const mapData = this.game.mapManager.loadChapter2();
    this.game.enemyManager.setColliders(mapData.colliders);
    this.game.player.setColliders(mapData.colliders);

    const coverPoints = mapData.coverPoints;

    this.game.enemyManager.spawnGroup(this.enemyConfigs.map(e => ({
      type: e.type,
      position: e.pos,
      patrol: e.patrol
    })));

    this.game.enemyManager.enemies.forEach(e => {
      e.ai.setCoverPoints(coverPoints);
    });

    this.game.player.reset(this.spawnPos.clone().add(new THREE.Vector3(0, 1.8, 0)));

    const unlockedWeapons = this.game.saveData.unlockedWeapons;
    const primary = unlockedWeapons.includes('M7 Valkyrie') ? 'M7 Valkyrie' : 'AR-12';
    this.game.weapons.equip([primary, 'Viper'], 1);
    this.game.weapons.setSuppressed(true);

    this.game.squad.setActive(false);

    const stealthHud = document.getElementById('hud-stealth');
    if (stealthHud) stealthHud.classList.remove('hidden');

    document.getElementById('stealth-overlay').classList.remove('hidden');

    setTimeout(() => {
      this.game.squad.speakSarah("Marcus, this is a stealth op. Do NOT engage unless you have to. Find the server room and download ARES coordinates. I'll guide you through.");
    }, 2000);

    setTimeout(() => {
      this.game.squad.speakSarah("Weapons are suppressed. Stay crouched. Use your drone if you need to scan ahead.");
    }, 8000);

    this.game.missionManager.startMission(this.getMissionData());
  }

  update(dt) {
    if (!this.hasStarted) return;

    const mm = this.game.missionManager;
    const playerPos = this.game.player.position;

    mm.checkProximityObjective(playerPos);

    if (this.isHacking && this.hackingTarget) {
      this._updateHacking(dt);
    }

    if (this.alarmActive) {
      this.alarmTimer -= dt;
      if (this.alarmTimer <= 0) {
        this._deactivateAlarm();
      }
    }

    this._checkAlarmCondition();

    if (mm.objectives[1].complete && !this.camerasDisabled) {
      this.camerasDisabled = true;
      const interactables = this.game.mapManager.getInteractables();
      interactables.forEach(i => {
        if (i.type === 'camera') i.disabled = true;
      });
    }
  }

  _checkAlarmCondition() {
    if (this.alarmActive) return;
    let detected = false;
    this.game.enemyManager.enemies.forEach(e => {
      if (!e.isDead && (e.ai.state === 'alert' || e.ai.state === 'shoot')) {
        detected = true;
      }
    });
    if (detected && !this.alarmActive) {
      this._activateAlarm();
    }
  }

  _activateAlarm() {
    this.alarmActive = true;
    this.alarmTimer = this.alarmDuration;
    this.game.audio.playAlarm();
    document.getElementById('game-canvas-container').classList.add('alarm');

    this.game.squad.speakSarah("ALARM! You've been detected! Take them out or find cover!");

    this.game.enemyManager.enemies.forEach(e => {
      if (!e.isDead) {
        e.ai._setState('alert');
        e.ai.lastKnownPos = this.game.player.position.clone();
      }
    });
  }

  _deactivateAlarm() {
    this.alarmActive = false;
    document.getElementById('game-canvas-container').classList.remove('alarm');
    this.game.squad.speakSarah("Alarm deactivated. Stay low, there may be more patrols.");
    this.game.enemyManager.enemies.forEach(e => {
      if (!e.isDead && e.ai.state !== 'dead') {
        e.ai._setState('patrol');
        e.ai.detectionLevel = 0;
      }
    });
  }

  startHacking(terminal) {
    if (this.isHacking) return;
    if (terminal.hacked) return;
    this.isHacking = true;
    this.hackingTarget = terminal;
    this.hackingProgress = 0;

    const hackUI = document.getElementById('hacking-ui');
    if (hackUI) hackUI.classList.remove('hidden');
    const hackBar = document.getElementById('hack-bar');
    if (hackBar) hackBar.style.width = '0%';
    const hackStatus = document.getElementById('hack-status');
    if (hackStatus) hackStatus.textContent = 'HOLD E — HACKING...';
    const hackPct = document.getElementById('hack-pct');
    if (hackPct) hackPct.textContent = '0%';
  }

  _updateHacking(dt) {
    const mm = this.game.missionManager;
    const skillSpeed = this.game.skillTree ? this.game.skillTree.getEffect('hackSpeedMult', 1) : 1;

    if (!this.game.input.isDown('KeyE')) {
      this.isHacking = false;
      const hackUI = document.getElementById('hacking-ui');
      if (hackUI) hackUI.classList.add('hidden');
      this.hackingTarget = null;
      return;
    }

    this.hackingProgress += dt * 20 * skillSpeed;
    const pct = Math.min(100, this.hackingProgress);

    const hackBar = document.getElementById('hack-bar');
    if (hackBar) hackBar.style.width = pct + '%';
    const hackPct = document.getElementById('hack-pct');
    if (hackPct) hackPct.textContent = Math.floor(pct) + '%';

    if (this.hackingProgress >= 100) {
      this.isHacking = false;
      this.hackingTarget.hacked = true;
      const hackUI = document.getElementById('hacking-ui');
      if (hackUI) hackUI.classList.add('hidden');

      const status = document.getElementById('hack-status');
      if (status) status.textContent = 'HACK COMPLETE';

      mm.onHackComplete(this.hackingTarget.id);
      this.game.audio.playUIBeep(1200);
      this.game.effects.particles.spawnSparks(this.hackingTarget.position);
      this.hackedTerminals.push(this.hackingTarget.id);

      if (this.hackingTarget.id === 'server_room') {
        this.phase = 3;
      }
    }
  }

  stopHacking() {
    this.isHacking = false;
    const hackUI = document.getElementById('hacking-ui');
    if (hackUI) hackUI.classList.add('hidden');
    this.hackingTarget = null;
  }

  onInteract(interactable) {
    if (interactable.type === 'hack_terminal') {
      if (!interactable.hacked) {
        this.startHacking(interactable);
      } else {
        this.game.squad.speakSarah("Terminal already accessed.");
      }
    }
  }
}

window.Chapter2_Informant = Chapter2_Informant;
