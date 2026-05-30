class SaveSystem {
  constructor() {
    this.SAVE_KEY = 'shadowprotocol_save';
    this.defaultSave = {
      version: '1.0.0',
      playerLevel: 1,
      playerXP: 0,
      xpToNextLevel: 1000,
      skillPoints: 0,
      completedChapters: [],
      unlockedWeapons: ['AR-12', 'Viper'],
      selectedWeapon: 'AR-12',
      attachments: {},
      unlockedSkills: [],
      collectibles: [],
      totalKills: 0,
      totalHeadshots: 0,
      playTime: 0,
      endingFlags: {
        destroyAI: false,
        controlAI: false,
        globalConflict: false,
        secretEnding: false
      },
      settings: {
        sensitivity: 3,
        sfxVolume: 0.8,
        musicVolume: 0.6
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(this.defaultSave));
      const saved = JSON.parse(raw);
      return Object.assign({}, JSON.parse(JSON.stringify(this.defaultSave)), saved);
    } catch (e) {
      console.warn('SaveSystem: failed to load, using defaults', e);
      return JSON.parse(JSON.stringify(this.defaultSave));
    }
  }

  save(data) {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('SaveSystem: failed to save', e);
      return false;
    }
  }

  delete() {
    localStorage.removeItem(this.SAVE_KEY);
  }

  hasSave() {
    return !!localStorage.getItem(this.SAVE_KEY);
  }

  addXP(saveData, amount) {
    saveData.playerXP += amount;
    while (saveData.playerXP >= saveData.xpToNextLevel) {
      saveData.playerXP -= saveData.xpToNextLevel;
      saveData.playerLevel++;
      saveData.skillPoints += 1;
      saveData.xpToNextLevel = Math.floor(1000 * Math.pow(1.15, saveData.playerLevel - 1));
      this.checkWeaponUnlocks(saveData);
    }
    return saveData;
  }

  checkWeaponUnlocks(saveData) {
    const unlockTable = {
      2: ['M7 Valkyrie'],
      5: ['Phantom'],
      8: ['Breacher'],
      12: ['Longshot X'],
      15: ['Suppressor'],
    };
    const lvl = saveData.playerLevel;
    if (unlockTable[lvl]) {
      unlockTable[lvl].forEach(item => {
        if (!saveData.unlockedWeapons.includes(item)) {
          saveData.unlockedWeapons.push(item);
        }
      });
    }
  }

  completeChapter(saveData, chapterNum) {
    if (!saveData.completedChapters.includes(chapterNum)) {
      saveData.completedChapters.push(chapterNum);
    }
    return saveData;
  }
}

window.SaveSystem = SaveSystem;
