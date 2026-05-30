class MissionManager {
  constructor(game) {
    this.game = game;
    this.currentMission = null;
    this.objectives = [];
    this.currentObjectiveIndex = 0;
    this.isComplete = false;
    this.isFailed = false;
    this.startTime = 0;
    this.stats = {
      kills: 0, headshots: 0, stealthKills: 0, xpEarned: 0
    };
  }

  startMission(mission) {
    this.currentMission = mission;
    this.objectives = [...mission.objectives];
    this.currentObjectiveIndex = 0;
    this.isComplete = false;
    this.isFailed = false;
    this.startTime = Date.now();
    this.stats = { kills: 0, headshots: 0, stealthKills: 0, xpEarned: 0 };
    this._updateObjectiveHUD();
    this._updateChapterHUD();
  }

  completeObjective(id) {
    const obj = this.objectives.find(o => o.id === id);
    if (!obj || obj.complete) return;
    obj.complete = true;

    const xp = obj.xpReward || 100;
    this.stats.xpEarned += xp;
    this.game.effects.showXPPopup(xp, obj.label);

    const next = this.objectives.find(o => !o.complete);
    if (next) {
      this.currentObjectiveIndex = this.objectives.indexOf(next);
      this._updateObjectiveHUD();
      this.game.squad.speakSarah(next.voiceLine || 'New objective updated.');
    } else {
      this._missionComplete();
    }
  }

  _missionComplete() {
    this.isComplete = true;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const kills = this.game.enemyManager.killCount;
    const headshots = this.game.enemyManager.headshotCount;
    const stealthKills = this.game.enemyManager.stealthKillCount;

    let totalXP = this.stats.xpEarned;
    totalXP += kills * 50;
    totalXP += headshots * 25;
    totalXP += stealthKills * 75;
    if (stealthKills >= 5) totalXP += 200;

    const rating = this._calculateRating(kills, headshots, stealthKills, elapsed);

    setTimeout(() => {
      this.game.onMissionComplete({
        chapter: this.currentMission.chapter,
        kills, headshots, stealthKills,
        xp: totalXP, time: elapsed, rating
      });
    }, 1500);
  }

  _calculateRating(kills, headshots, stealth, time) {
    let score = 0;
    score += kills * 5;
    score += headshots * 3;
    score += stealth * 10;
    if (time < 300) score += 50;
    if (score >= 150) return 'S';
    if (score >= 100) return 'A';
    if (score >= 60) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  }

  _updateObjectiveHUD() {
    const obj = this.objectives[this.currentObjectiveIndex];
    if (!obj) return;
    const el = document.getElementById('obj-text');
    if (el) el.textContent = obj.label;
  }

  _updateChapterHUD() {
    const el = document.getElementById('chapter-name');
    if (el && this.currentMission) {
      el.textContent = this.currentMission.name;
    }
  }

  checkProximityObjective(playerPos) {
    if (!this.currentMission) return;
    this.objectives.forEach(obj => {
      if (obj.complete || obj.type !== 'proximity') return;
      if (playerPos.distanceTo(obj.position) < (obj.radius || 3)) {
        this.completeObjective(obj.id);
      }
    });
  }

  checkKillObjective(required) {
    if (!this.currentMission) return;
    this.objectives.forEach(obj => {
      if (obj.complete || obj.type !== 'kill') return;
      if (this.game.enemyManager.killCount >= (obj.count || required)) {
        this.completeObjective(obj.id);
      }
    });
  }

  checkAllEnemiesDead() {
    if (!this.currentMission) return;
    this.objectives.forEach(obj => {
      if (obj.complete || obj.type !== 'clear_area') return;
      if (this.game.enemyManager.aliveCount() === 0) {
        this.completeObjective(obj.id);
      }
    });
  }

  onHackComplete(terminalId) {
    this.objectives.forEach(obj => {
      if (obj.complete || obj.type !== 'hack' || obj.terminalId !== terminalId) return;
      this.completeObjective(obj.id);
    });
  }

  getCurrentObjective() {
    return this.objectives[this.currentObjectiveIndex];
  }

  getElapsedTime() {
    return (Date.now() - this.startTime) / 1000;
  }
}

window.MissionManager = MissionManager;
