class Chapter1_Attack {
  constructor(game) {
    this.game = game;
    this.chapter = 1;
    this.name = 'CH.1 — THE ATTACK';
    this.spawnPos = new THREE.Vector3(0, 0, 30);
    this.hasStarted = false;
    this.phase = 0;
    this.droneAttackTimer = 0;
    this.droneAttackDelay = 30;
    this.introShown = false;
    this.enemyWaves = [];
    this.currentWave = 0;
    this.waveCleared = false;
    this.extractionUnlocked = false;

    this.objectives = [
      {
        id: 'reach_first_position',
        type: 'proximity',
        label: 'Push to the defensive line — ALPHA STREET',
        position: new THREE.Vector3(0, 0, 0),
        radius: 8,
        xpReward: 100,
        voiceLine: "Good, you're in position. Enemies incoming. Take them down!",
        complete: false
      },
      {
        id: 'clear_alpha_street',
        type: 'kill',
        label: 'Eliminate all hostiles — ALPHA STREET',
        count: 5,
        xpReward: 200,
        voiceLine: "Street is clear. Drone attack incoming! Get to cover!",
        complete: false
      },
      {
        id: 'survive_drone_attack',
        type: 'proximity',
        label: 'Survive drone strike — SEEK COVER',
        position: new THREE.Vector3(-30, 0, -8),
        radius: 6,
        xpReward: 150,
        voiceLine: "Drone wave neutralized! Push through the alley. Find the Aegis command post.",
        complete: false
      },
      {
        id: 'reach_command_post',
        type: 'proximity',
        label: 'Reach Aegis command post — ECHO SECTOR',
        position: new THREE.Vector3(0, 0, -25),
        radius: 8,
        xpReward: 150,
        voiceLine: "Command post in sight. Clear the area then get to the extraction vehicle!",
        complete: false
      },
      {
        id: 'clear_command_post',
        type: 'clear_area',
        label: 'Eliminate all Aegis forces — ECHO SECTOR',
        xpReward: 300,
        voiceLine: "Area secure! Extraction vehicle is waiting. Get out of there, Marcus!",
        complete: false
      },
      {
        id: 'reach_extraction',
        type: 'proximity',
        label: 'Reach extraction vehicle — BRAVO POINT',
        position: new THREE.Vector3(0, 0, 40),
        radius: 8,
        xpReward: 200,
        voiceLine: "Ghost One is aboard. Mission complete. Great work, Division.",
        complete: false
      }
    ];
  }

  getMissionData() {
    return {
      chapter: 1,
      name: this.name,
      objectives: this.objectives.map(o => ({ ...o }))
    };
  }

  start() {
    this.hasStarted = true;
    this.phase = 0;

    const mapData = this.game.mapManager.loadChapter1();
    this.game.enemyManager.setColliders(mapData.colliders);
    this.game.player.setColliders(mapData.colliders);

    const coverPoints = mapData.coverPoints;

    this.enemyWaves = [
      {
        enemies: [
          { type: 'Rifleman', pos: new THREE.Vector3(-10, 0, -5), patrol: [new THREE.Vector3(-10, 0, -5), new THREE.Vector3(-5, 0, 5)] },
          { type: 'Rifleman', pos: new THREE.Vector3(10, 0, -5), patrol: [new THREE.Vector3(10, 0, -5), new THREE.Vector3(5, 0, 5)] },
          { type: 'Scout', pos: new THREE.Vector3(0, 0, -8), patrol: [new THREE.Vector3(0, 0, -8), new THREE.Vector3(8, 0, -3)] },
          { type: 'Rifleman', pos: new THREE.Vector3(-15, 0, -10), patrol: [new THREE.Vector3(-15, 0, -10), new THREE.Vector3(-10, 0, -5)] },
          { type: 'Heavy', pos: new THREE.Vector3(15, 0, -10) },
        ]
      },
      {
        enemies: [
          { type: 'Rifleman', pos: new THREE.Vector3(-5, 0, -20) },
          { type: 'Rifleman', pos: new THREE.Vector3(5, 0, -22) },
          { type: 'Sniper', pos: new THREE.Vector3(20, 0, -30) },
          { type: 'Medic', pos: new THREE.Vector3(-20, 0, -25) },
          { type: 'Heavy', pos: new THREE.Vector3(0, 0, -28) },
          { type: 'Elite', pos: new THREE.Vector3(0, 0, -32) },
        ]
      }
    ];

    this.game.enemyManager.spawnGroup(this.enemyWaves[0].enemies.map(e => ({
      type: e.type,
      position: e.pos,
      patrol: e.patrol
    })));

    this.game.enemyManager.enemies.forEach(e => {
      e.ai.setCoverPoints(coverPoints);
    });

    this.game.player.reset(this.spawnPos.clone().add(new THREE.Vector3(0, 1.8, 0)));

    this.game.weapons.equip(['AR-12', 'Viper'], 0);

    this.game.squad.setActive(true);
    this.game.squad.spawnViktor(new THREE.Vector3(3, 0, 30));
    this.game.squad.spawnAhmed(new THREE.Vector3(-3, 0, 30));

    const stealthHud = document.getElementById('hud-stealth');
    if (stealthHud) stealthHud.classList.add('hidden');

    setTimeout(() => {
      this.game.squad.speakSarah("Marcus, the city is under attack! Aegis forces are pushing through Alpha Street. Push up and take them out!");
    }, 2000);

    setTimeout(() => {
      if (this.game.squad.members[0]) {
        this.game.squad._speak(this.game.squad.members[0]);
      }
    }, 5000);

    this.game.missionManager.startMission(this.getMissionData());
  }

  update(dt) {
    if (!this.hasStarted) return;

    const mm = this.game.missionManager;
    const playerPos = this.game.player.position;

    mm.checkProximityObjective(playerPos);
    mm.checkKillObjective(5);
    mm.checkAllEnemiesDead();

    if (!mm.objectives[0].complete) {
      document.getElementById('hud-timer').classList.remove('hidden');
      const t = mm.getElapsedTime();
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      const el = document.getElementById('timer-val');
      if (el) el.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    if (mm.objectives[1].complete && !mm.objectives[2].complete && this.phase === 0) {
      this.phase = 1;
      this.droneAttackTimer = this.droneAttackDelay;
      this.game.audio.playAlarm();
      this.game.squad.speakSarah("DRONE ATTACK! Take cover in the alley, NOW!");
      document.getElementById('game-canvas-container').classList.add('alarm');
      setTimeout(() => document.getElementById('game-canvas-container').classList.remove('alarm'), 5000);
    }

    if (this.phase === 1) {
      this.droneAttackTimer -= dt;
      if (this.droneAttackTimer <= 0) {
        this.phase = 2;
        this.game.effects.screenShake(5, 1);
        this.game.audio.playExplosion();
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const pos = new THREE.Vector3(
              (Math.random()-0.5)*40, 0, (Math.random()-0.5)*20
            );
            this.game.effects.particles.spawnExplosion(pos);
            this.game.audio.playExplosion();
          }, i * 500);
        }
      }
    }

    if (mm.objectives[3].complete && !mm.objectives[4].complete && this.phase < 3) {
      this.phase = 3;
      this.game.enemyManager.clear();
      this.game.enemyManager.spawnGroup(this.enemyWaves[1].enemies.map(e => ({
        type: e.type,
        position: e.pos,
        patrol: e.patrol
      })));
      const coverPoints = this.game.mapManager.getCoverPoints();
      this.game.enemyManager.enemies.forEach(e => {
        e.ai.setCoverPoints(coverPoints);
      });
      this.game.enemyManager.killCount = 0;
    }

    if (mm.objectives[4].complete && !this.extractionUnlocked) {
      this.extractionUnlocked = true;
    }
  }

  onInteract(interactable) {
    if (interactable.type === 'extraction') {
      if (this.game.missionManager.objectives[4].complete) {
        this.game.missionManager.completeObjective('reach_extraction');
      } else {
        this.game.squad.speakSarah("Not yet! Clear all hostiles first!");
      }
    }
  }
}

window.Chapter1_Attack = Chapter1_Attack;
