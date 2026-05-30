class Game {
  constructor() {
    this.saveSystem = new SaveSystem();
    this.saveData = this.saveSystem.load();

    this.canvas = document.getElementById('game-canvas');
    this.sceneManager = new SceneManager(this.canvas);
    this.scene = this.sceneManager.scene;
    this.camera = this.sceneManager.camera;
    this.renderer = this.sceneManager.renderer;

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.assets = new AssetManager();
    this.ui = new UIManager(this.saveSystem);
    this.ui.init(this.saveData);

    this.effects = new EffectsManager(this.scene, this.camera, this.audio);
    this.skillTree = new SkillTree(this.saveData);

    this.player = new Player(this.camera, this.scene, this.audio, this.effects, this.skillTree);
    this.weapons = new WeaponSystem(this.camera, this.scene, this.audio, this.effects, this.skillTree);
    this.enemyManager = new EnemyManager(this.scene, this.audio, this.effects);
    this.squad = new SquadManager(this.scene, this.audio, this.effects);
    this.mapManager = new MapManager(this.scene, this.assets);
    this.missionManager = new MissionManager(this);

    this.currentChapter = null;
    this.currentMission = null;
    this.isPaused = false;
    this.isInGame = false;

    this.activeGrenades = [];
    this.hackingInteractable = null;
    this.nearInteractable = null;

    this.lastTime = 0;
    this.radarTimer = 0;
    this.radarInterval = 0.05;

    window.GAME = this;

    this._setupEnemyCallbacks();
    this._setupInputCallbacks();
    this._setupUICallbacks();
  }

  _setupEnemyCallbacks() {
    this.enemyManager.onEnemyKilled = (enemy, isHeadshot, stealthKill) => {
      let xp = enemy.xpReward || 50;
      if (isHeadshot) xp += 25;
      if (stealthKill) {
        const mult = this.skillTree.getEffect('steakhXPMult', 1);
        xp = Math.floor(xp * mult);
        xp += 75;
      }
      this.saveData = this.saveSystem.addXP(this.saveData, xp);
      this.effects.showXPPopup(xp, isHeadshot ? 'HEADSHOT' : stealthKill ? 'STEALTH KILL' : '');
    };
  }

  _setupInputCallbacks() {
    this.input.on('keydown', (code) => {
      if (!this.isInGame) return;
      this.audio.resume();

      if (code === 'KeyR') this.weapons.reload();
      if (code === 'KeyF') this._throwGrenade('frag');
      if (code === 'KeyG') this._throwGrenade('smoke');
      if (code === 'Digit1') this._switchWeapon(0);
      if (code === 'Digit2') this._switchWeapon(1);
      if (code === 'KeyE') this._interactNearby();
      if (code === 'KeyQ') this._deployDrone();
      if (code === 'Escape') this._togglePause();

      if (code === 'Tab') {
        this.ui.showWeaponSwitchUI(this.weapons.equipped, this.weapons.currentSlot);
      }
    });

    this.input.on('mousedown', (btn) => {
      if (!this.isInGame || this.isPaused) return;
      this.audio.resume();
      if (btn === 0) this._shoot();
      if (btn === 2) this.weapons.setADS(true);
    });

    this.input.on('mouseup', (btn) => {
      if (btn === 2) this.weapons.setADS(false);
    });

    this.input.on('unlocked', () => {
      if (this.isInGame && !this.isPaused) {
        this.isPaused = true;
        this.ui.showPauseMenu();
      }
    });
  }

  _setupUICallbacks() {
    const btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => { this.audio.playUIBeep(); fn(); });
    };

    btn('btn-campaign', () => this.ui.showCampaignMenu());
    btn('btn-loadgame', () => {
      if (this.saveSystem.hasSave()) {
        this.saveData = this.saveSystem.load();
        this.ui.init(this.saveData);
        this.ui.showCampaignMenu();
      } else {
        this.ui.showCampaignMenu();
      }
    });
    btn('btn-skilltree', () => this.ui.showSkillTree());
    btn('btn-loadout', () => this.ui.showLoadout());

    btn('back-from-campaign', () => this.ui.showMainMenu());
    btn('back-from-skills', () => {
      this.saveSystem.save(this.saveData);
      this.ui.showMainMenu();
    });
    btn('back-from-loadout', () => this.ui.showMainMenu());

    btn('pause-resume', () => this._resumeGame());
    btn('pause-restart', () => { this.isPaused = false; this.startChapter(this.currentChapterNum); });
    btn('pause-main', () => { this.isPaused = false; this._exitToMenu(); });

    btn('mc-continue', () => {
      const next = this.currentChapterNum + 1;
      if (next <= 2) {
        this.startChapter(next);
      } else {
        this._exitToMenu();
      }
    });
    btn('mc-replay', () => this.startChapter(this.currentChapterNum));
    btn('mc-main-menu', () => this._exitToMenu());
    btn('death-retry', () => this.startChapter(this.currentChapterNum));
    btn('death-menu', () => this._exitToMenu());
  }

  _togglePause() {
    if (!this.isInGame) return;
    if (this.isPaused) {
      this._resumeGame();
    } else {
      this.isPaused = true;
      this.ui.showPauseMenu();
      document.exitPointerLock();
    }
  }

  _resumeGame() {
    this.isPaused = false;
    this.ui.hidePauseMenu();
    this.input.requestPointerLock(this.canvas);
  }

  _exitToMenu() {
    this.isInGame = false;
    this.isPaused = false;
    this.enemyManager.clear();
    this.squad.clearAll();
    this.weapons.weaponGroup && this.camera.remove(this.weapons.weaponGroup);
    this.sceneManager.clearScene();
    document.exitPointerLock();
    this.ui.showMainMenu();
  }

  _shoot() {
    if (!this.isInGame || this.isPaused || !this.player.isAlive) return;
    if (!this.weapons.currentWeapon) return;

    const auto = this.weapons.currentWeapon.auto;
    if (!auto && !this._canShootSemi) return;

    const result = this.weapons.fire();
    if (!result) return;
    if (!auto) this._canShootSemi = false;

    result.directions.forEach(dir => {
      this.enemyManager.checkBullet(
        result.origin,
        dir,
        this.player,
        result.weapon,
        result.suppressed
      );
    });
  }

  _switchWeapon(slot) {
    this.weapons.switchToSlot(slot);
    this.ui.showWeaponSwitchUI(this.weapons.equipped, slot);
  }

  _throwGrenade(type) {
    if (!this.isInGame || !this.player.isAlive) return;
    const grenade = this.player.throwGrenade(this.scene, type);
    if (!grenade) return;
    this.activeGrenades.push(grenade);
  }

  _interactNearby() {
    if (!this.nearInteractable) return;
    if (this.currentMission && this.currentMission.onInteract) {
      this.currentMission.onInteract(this.nearInteractable);
    }
  }

  _deployDrone() {
    if (!this.player.equipment.drone) return;
    this.player.equipment.drone--;
    this.effects.showXPPopup(0, 'RECON DRONE DEPLOYED');
    this.squad.speakSarah("Drone online. Scanning sector...");
    const range = this.skillTree.getEffect('droneRange', 1) * 25;
    this.enemyManager.enemies.forEach(e => {
      if (!e.isDead && e.position.distanceTo(this.player.position) < range) {
        if (e._detIndicator) {
          e._detIndicator.visible = true;
          e._detIndicator.material.color.setHex(0x00ff88);
          setTimeout(() => {
            if (e._detIndicator) {
              e._detIndicator.material.color.setHex(0xffff00);
              e._detIndicator.visible = e.ai.getDetectionPercent() > 0.1;
            }
          }, 8000);
        }
      }
    });
    const radarEl = document.getElementById('radar');
    if (radarEl) {
      radarEl.style.border = '2px solid #00ff88';
      setTimeout(() => radarEl.style.border = '', 8000);
    }
  }

  startChapter(num) {
    this.audio.resume();
    this.currentChapterNum = num;

    this._cleanupCurrentMission();

    const introLines = num === 1
      ? [
          '2042. Aegis Industries has deployed ARES — an AI weapons network.',
          'Three major cities are under simultaneous attack.',
          'Ghost Division deploys to stop the advance and locate Aegis command.',
          'Captain Marcus Reed, you are go.',
        ]
      : [
          '48 hours after the attack on the city.',
          'Intelligence identified an Aegis compound with ARES network servers.',
          'The coordinates of the ARES core could end the war.',
          'Ghost One deploys alone. No support. No margin for error.',
        ];

    this.ui.showCinematicIntro(introLines, () => {
      this._launchChapter(num);
    });
  }

  _cleanupCurrentMission() {
    this.enemyManager.clear();
    this.squad.clearAll();
    this.activeGrenades = [];
    this.nearInteractable = null;
    this.hackingInteractable = null;
    if (this.weapons.weaponGroup) {
      this.camera.remove(this.weapons.weaponGroup);
    }
  }

  _launchChapter(num) {
    this.ui.showGame();

    this.weapons._setupWeaponMeshGroup();

    if (num === 1) {
      this.currentMission = new Chapter1_Attack(this);
    } else if (num === 2) {
      this.currentMission = new Chapter2_Informant(this);
    }

    if (!this.currentMission) return;

    this.currentMission.start();
    this.isInGame = true;
    this.isPaused = false;
    this.input.requestPointerLock(this.canvas);

    this._canShootSemi = true;
  }

  onMissionComplete(data) {
    this.isInGame = false;
    document.exitPointerLock();

    this.saveData = this.saveSystem.addXP(this.saveData, data.xp);
    this.saveData = this.saveSystem.completeChapter(this.saveData, data.chapter);
    this.saveSystem.checkWeaponUnlocks(this.saveData);
    this.saveData.skillPoints += 1;
    this.saveSystem.save(this.saveData);

    this.ui.init(this.saveData);
    this.ui.showMissionComplete(data);
    this.audio.playUIBeep(1200);
  }

  onPlayerDeath() {
    this.isInGame = false;
    document.exitPointerLock();
    this.ui.showDeathScreen();
    this.audio.playUIBeep(200);
  }

  _checkInteractables() {
    const interactables = this.mapManager.getInteractables();
    let nearest = null;
    let nearestDist = 3.5;

    interactables.forEach(item => {
      const d = this.player.position.distanceTo(item.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = item;
      }
    });

    const prompt = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('interact-text');

    if (nearest !== this.nearInteractable) {
      this.nearInteractable = nearest;
      if (nearest && prompt) {
        let text = 'Interact';
        if (nearest.type === 'hack_terminal') text = nearest.hacked ? 'Already hacked' : 'Hack Terminal';
        else if (nearest.type === 'extraction') text = 'Board Extraction';
        else if (nearest.type === 'camera') text = nearest.disabled ? 'Disabled' : 'Disable Camera';
        if (promptText) promptText.textContent = text;
        prompt.classList.remove('hidden');
      } else if (prompt) {
        prompt.classList.add('hidden');
      }
    }
  }

  _updateGrenades(dt) {
    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      const result = g.update(dt);
      if (!result || result.exploded) {
        if (result && result.exploded && result.type === 'frag') {
          this.enemyManager.enemies.forEach(e => {
            if (!e.isDead) {
              const d = e.position.distanceTo(result.position);
              if (d < result.radius) {
                const dmg = result.damage * (1 - d / result.radius);
                e.takeDamage(dmg, false);
              }
            }
          });
          const playerDist = this.player.position.distanceTo(result.position);
          if (playerDist < result.radius) {
            const dmg = 60 * (1 - playerDist / result.radius);
            this.player.takeDamage(dmg, null);
          }
        }
        this.activeGrenades.splice(i, 1);
      }
    }
  }

  update(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.isInGame || this.isPaused) {
      this.sceneManager.render();
      requestAnimationFrame(t => this.update(t));
      return;
    }

    const input = this.input;
    const forward = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) -
                    (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const right = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) -
                  (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    const crouching = input.isDown('KeyC') || input.isDown('ControlLeft');
    const sprinting = input.isDown('ShiftLeft') && !crouching;

    const { dx, dy } = input.consumeDelta();
    this.player.look(dx, dy);
    this.player.move(forward, right, dt, crouching, sprinting);

    if (input.isDown('Space')) this.player.jump();

    if (input.isMouseDown(0) && this.weapons.currentWeapon && this.weapons.currentWeapon.auto) {
      this._shoot();
    }

    if (!input.isMouseDown(0)) this._canShootSemi = true;

    this.weapons.update(dt);
    this.enemyManager.update(dt, this.player.position);
    this.squad.update(dt, this.player.position, this.enemyManager.enemies, this.camera);
    this.effects.update(dt);
    this._updateGrenades(dt);
    this._checkInteractables();

    if (this.currentMission) this.currentMission.update(dt);

    this.radarTimer += dt;
    if (this.radarTimer >= this.radarInterval) {
      this.radarTimer = 0;
      this.ui.updateRadar(this.player.position, this.player.yaw, this.enemyManager);
    }

    if (this.currentMission && this.currentMission.chapter === 2) {
      const hackUI = document.getElementById('hacking-ui');
      const isNearTerminal = this.nearInteractable && this.nearInteractable.type === 'hack_terminal' && !this.nearInteractable.hacked;
      if (!isNearTerminal && this.currentMission.isHacking) {
        this.currentMission.stopHacking();
      }
    }

    this.sceneManager.render();
    requestAnimationFrame(t => this.update(t));
  }

  start() {
    requestAnimationFrame(t => {
      this.lastTime = t;
      this.update(t);
    });
    this.ui.showMainMenu();
  }
}

window.Game = Game;
