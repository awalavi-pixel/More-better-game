import * as THREE from 'three';
import { EventBus } from './core/EventBus.ts';
import { InputManager } from './core/InputManager.ts';
import { GameLoop } from './core/GameLoop.ts';
import { Renderer } from './core/Renderer.ts';
import { AssetManager } from './core/AssetManager.ts';
import { Player } from './gameplay/Player.ts';
import { WeaponSystem } from './gameplay/WeaponSystem.ts';
import { DamageSystem } from './gameplay/DamageSystem.ts';
import { ProjectileSystem } from './gameplay/ProjectileSystem.ts';
import { EquipmentSystem } from './gameplay/EquipmentSystem.ts';
import { MSBS } from './gameplay/weapons/MSBS.ts';
import { DesertEagle } from './gameplay/weapons/DesertEagle.ts';
import { HUD } from './ui/HUD.ts';
import { Minimap } from './ui/Minimap.ts';
import { MainMenu } from './ui/MainMenu.ts';
import { PauseMenu } from './ui/PauseMenu.ts';
import { Crosshair } from './ui/Crosshair.ts';
import { CheckpointSystem } from './campaign/CheckpointSystem.ts';
import { MissionManager } from './campaign/MissionManager.ts';
import { AudioEngine } from './audio/AudioEngine.ts';
import { SquadManager } from './ai/SquadManager.ts';
import { PlayerCharacter } from './characters/PlayerCharacter.ts';
import { loadMap } from './levels/MapLoader.ts';
import type { LoadedMap } from './levels/MapLoader.ts';

// ============================================================
// Game state
// ============================================================
let gameLoop: GameLoop | null = null;
let isPaused = false;
let isPlaying = false;
let currentMap: LoadedMap | null = null;
let missionMode = false;

// ============================================================
// Main
// ============================================================
async function main(): Promise<void> {
  // Loading screen
  const loadingBar = document.getElementById('loading-bar') as HTMLElement;
  const loadingText = document.getElementById('loading-text') as HTMLElement;

  const setProgress = (p: number, msg: string) => {
    loadingBar.style.width = Math.round(p * 100) + '%';
    loadingText.textContent = msg;
  };

  setProgress(0.05, 'INITIALIZING SYSTEMS...');

  // ---- Core systems ----
  const eventBus = new EventBus();
  const inputManager = new InputManager();
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  const assetManager = new AssetManager();
  const audioEngine = new AudioEngine();

  setProgress(0.15, 'LOADING AUDIO...');
  assetManager.onProgress(p => setProgress(0.15 + p * 0.3, 'LOADING ASSETS...'));
  await assetManager.init();

  setProgress(0.45, 'BUILDING WORLD...');

  // ---- Gameplay systems ----
  const damageSystem = new DamageSystem(eventBus, audioEngine);
  const projectileSystem = new ProjectileSystem();
  const weaponSystem = new WeaponSystem(eventBus);
  const equipmentSystem = new EquipmentSystem(projectileSystem, audioEngine);
  const squadManager = new SquadManager(audioEngine, eventBus);

  // ---- Player ----
  const player = new Player(renderer.camera, eventBus);
  const playerCharacter = new PlayerCharacter(renderer.camera);

  // Equip default weapons
  const primaryWeapon = new MSBS();
  const secondaryWeapon = new DesertEagle();
  weaponSystem.equip(0, primaryWeapon);
  weaponSystem.equip(1, secondaryWeapon);
  playerCharacter.attachWeapon(primaryWeapon);

  setProgress(0.6, 'LOADING MAP...');

  // ---- Load default map ----
  currentMap = await loadMap('freight', p => setProgress(0.6 + p * 0.25, 'LOADING MAP...'));
  projectileSystem.setScene(currentMap.scene);
  squadManager.setup(currentMap.scene, damageSystem);

  setProgress(0.9, 'INITIALIZING UI...');

  // ---- UI ----
  const hud = new HUD(eventBus);
  const minimap = new Minimap();
  const mainMenu = new MainMenu();
  const pauseMenu = new PauseMenu();
  const crosshair = new Crosshair();

  // ---- Campaign ----
  const checkpointSystem = new CheckpointSystem();
  const settings = checkpointSystem.loadSettings();
  inputManager.sensitivity = settings.sensitivity * 0.0002;
  inputManager.invertY = settings.invertY;
  renderer.setFOV(settings.fov);

  setProgress(1.0, 'READY');

  // ---- Hide loading, show main menu ----
  await new Promise(r => setTimeout(r, 500));
  document.getElementById('loading-screen')!.style.display = 'none';
  mainMenu.show();

  // ---- Pointer lock ----
  const pointerLockMsg = document.getElementById('pointer-lock-msg') as HTMLElement;
  canvas.addEventListener('click', () => {
    if (isPlaying && !isPaused) {
      inputManager.requestPointerLock(canvas);
    }
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    pointerLockMsg.style.display = isPlaying && !locked && !isPaused ? 'flex' : 'none';
  });

  // ---- Options panel ----
  const optFov = document.getElementById('opt-fov') as HTMLInputElement;
  const optFovVal = document.getElementById('opt-fov-val') as HTMLElement;
  const optSens = document.getElementById('opt-sens') as HTMLInputElement;
  const optSensVal = document.getElementById('opt-sens-val') as HTMLElement;
  const optMaster = document.getElementById('opt-master') as HTMLInputElement;
  const optMasterVal = document.getElementById('opt-master-val') as HTMLElement;
  const optInvertY = document.getElementById('opt-invert-y') as HTMLInputElement;
  const optionsMenu = document.getElementById('options-menu') as HTMLElement;

  optFov?.addEventListener('input', () => {
    const v = parseInt(optFov.value);
    if (optFovVal) optFovVal.textContent = String(v);
    renderer.setFOV(v);
  });
  optSens?.addEventListener('input', () => {
    const v = parseInt(optSens.value);
    if (optSensVal) optSensVal.textContent = String(v);
    inputManager.sensitivity = v * 0.0002;
  });
  optMaster?.addEventListener('input', () => {
    const v = parseInt(optMaster.value);
    if (optMasterVal) optMasterVal.textContent = String(v);
    audioEngine.setVolume('master', v / 100);
  });
  optInvertY?.addEventListener('change', () => {
    inputManager.invertY = optInvertY.checked;
  });

  let optionsFrom: 'main' | 'pause' = 'main';
  document.getElementById('btn-options-back')?.addEventListener('click', () => {
    optionsMenu.style.display = 'none';
    if (optionsFrom === 'main') mainMenu.show();
    else pauseMenu.show();
  });

  const openOptions = (from: 'main' | 'pause') => {
    optionsFrom = from;
    optionsMenu.style.display = 'flex';
  };

  // ---- Main menu actions ----
  mainMenu.onCampaign(() => startCampaign());
  mainMenu.onMultiplayer(() => startMultiplayer());
  mainMenu.onOptions(() => { mainMenu.hide(); openOptions('main'); });

  // ---- Pause menu actions ----
  pauseMenu.onResume(() => resumeGame());
  pauseMenu.onCheckpoint(() => {
    const cp = checkpointSystem.loadLastCheckpoint();
    if (cp) {
      player.respawn(new THREE.Vector3(cp.position.x, cp.position.y, cp.position.z));
      pauseMenu.hide();
      resumeGame();
    }
  });
  pauseMenu.onOptions(() => { pauseMenu.hide(); openOptions('pause'); });
  pauseMenu.onQuit(() => {
    pauseMenu.hide();
    quitToMenu();
  });

  // ---- FPS counter ----
  const fpsCounter = document.getElementById('fps-counter') as HTMLElement;

  // ---- Create mission manager ----
  let missionManager: MissionManager | null = null;

  // ============================================================
  // Game loop callbacks
  // ============================================================
  const fixedUpdate = (dt: number) => {
    if (!isPlaying || isPaused || !currentMap) return;

    inputManager.update();

    // Pause toggle
    if (inputManager.pause) {
      pauseGame();
      inputManager.postUpdate();
      return;
    }

    // Grenade throw
    if (inputManager.grenade && equipmentSystem.grenadeCount > 0) {
      const origin = player.camera.position.clone().addScaledVector(player.getForward(), 0.5);
      equipmentSystem.throwLethal('frag', origin, player.getForward(), 10);
    }

    player.update(dt, inputManager, currentMap.collisionWorld, weaponSystem);
    weaponSystem.update(dt, inputManager, renderer.camera, currentMap.scene, damageSystem, audioEngine);
    projectileSystem.update(dt, currentMap.scene, damageSystem);
    equipmentSystem.update(dt);

    if (missionManager) missionManager.update(dt, player);

    squadManager.update(dt, player, currentMap.scene, currentMap.navGrid);

    audioEngine.update(player.state.position, player.getForward());

    // Update ammo HUD
    const ammo = weaponSystem.getAmmoState();
    hud.updateAmmo(ammo.current, ammo.reserve, ammo.weaponName);
    hud.updateGrenades(equipmentSystem.grenadeCount, equipmentSystem.tacticalCount);

    inputManager.postUpdate();
  };

  const renderFn = (alpha: number, _dt: number) => {
    if (!currentMap) return;
    hud.update(1 / 60);
    minimap.update(1 / 60, player, squadManager.allEnemies);
    playerCharacter.update(1 / 60, player);
    renderer.render(currentMap.scene);
    fpsCounter.textContent = gameLoop ? `${gameLoop.fps} FPS` : '';
    alpha; // used for interpolation (simplification: not interpolating positions)
  };

  gameLoop = new GameLoop(fixedUpdate, renderFn);

  // ============================================================
  // Start functions
  // ============================================================
  async function startCampaign(): Promise<void> {
    mainMenu.hide();
    missionMode = true;
    await reloadMap('freight_mission01');
    spawnPlayer('A');
    hud.toggle(true);
    crosshair.show();
    startGameplay();

    // Init audio on first interaction
    audioEngine.init();
    audioEngine.playAmbient('freight');

    missionManager = new MissionManager(eventBus, squadManager, currentMap!.spawnSystem, hud);
    missionManager.onComplete(() => {
      hud.showKillFeed('', 'MISSION COMPLETE', '');
      hud.showObjective('MISSION COMPLETE — All enemies eliminated');
    });
    missionManager.startMission01();
  }

  async function startMultiplayer(): Promise<void> {
    mainMenu.hide();
    missionMode = false;
    await reloadMap('freight');
    spawnPlayer('A');
    hud.toggle(true);
    crosshair.show();
    startGameplay();

    audioEngine.init();
    audioEngine.playAmbient('freight');

    // Spawn bot squads
    const positions = [
      new THREE.Vector3(40, 1, -15),
      new THREE.Vector3(38, 1, 5),
      new THREE.Vector3(42, 1, 15),
      new THREE.Vector3(35, 1, -5),
      new THREE.Vector3(45, 1, 25),
      new THREE.Vector3(30, 1, -20),
    ];
    squadManager.spawnSquad(positions, positions.map(p => [p.clone()]));
    hud.showObjective('MULTIPLAYER — Eliminate all enemies');
  }

  async function reloadMap(name: string): Promise<void> {
    if (currentMap) {
      squadManager.clearAll();
    }
    currentMap = await loadMap(name);
    projectileSystem.setScene(currentMap.scene);
    squadManager.setup(currentMap.scene, damageSystem);
  }

  function spawnPlayer(team: 'A' | 'B' | 'FFA'): void {
    if (!currentMap) return;
    const spawnPos = currentMap.spawnSystem.getPlayerSpawn(team);
    spawnPos.y = 1.65;
    player.respawn(spawnPos);
  }

  function startGameplay(): void {
    isPlaying = true;
    isPaused = false;
    if (!gameLoop) return;
    gameLoop.start();
    requestPointerLock();
  }

  function requestPointerLock(): void {
    setTimeout(() => {
      if (isPlaying) {
        inputManager.requestPointerLock(canvas);
        pointerLockMsg.style.display = 'flex';
      }
    }, 300);
  }

  function pauseGame(): void {
    if (!isPlaying) return;
    isPaused = true;
    inputManager.exitPointerLock();
    pauseMenu.show();
  }

  function resumeGame(): void {
    isPaused = false;
    pauseMenu.hide();
    inputManager.requestPointerLock(canvas);
  }

  function quitToMenu(): void {
    isPlaying = false;
    isPaused = false;
    hud.toggle(false);
    crosshair.hide();
    inputManager.exitPointerLock();
    squadManager.clearAll();
    audioEngine.stopAmbient();
    mainMenu.show();
    missionManager = null;
  }

  // Player death handling
  eventBus.on('playerDied', () => {
    setTimeout(() => {
      if (isPlaying) {
        // Auto-respawn after 3s
        setTimeout(() => {
          if (isPlaying) spawnPlayer('A');
        }, 3000);
        hud.showObjective('YOU DIED — Respawning...');
      }
    }, 100);
  });

  // F3 toggle fps counter
  document.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      fpsCounter.style.display = fpsCounter.style.display === 'none' ? '' : 'none';
    }
  });

  // Render loop starts immediately (even on menu, render the map)
  if (gameLoop) gameLoop.start();
}

main().catch(console.error);
