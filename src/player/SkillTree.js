class SkillTree {
  constructor(saveData) {
    this.saveData = saveData;
    this.skills = this._buildSkills();
    this.effects = {};
    this._computeEffects();
  }

  _buildSkills() {
    return {
      combat: [
        { id: 'faster_reload', name: 'FAST RELOAD', desc: 'Reduce reload time by 25%', icon: '⚡', cost: 1, branch: 'combat', effect: { reloadMult: 0.75 }, requires: null },
        { id: 'recoil_control', name: 'RECOIL CONTROL', desc: 'Reduce weapon recoil by 30%', icon: '🎯', cost: 1, branch: 'combat', effect: { recoilMult: 0.7 }, requires: null },
        { id: 'extra_ammo', name: 'EXTRA AMMO', desc: 'Increase reserve ammo by 30%', icon: '📦', cost: 1, branch: 'combat', effect: { ammoMult: 1.3 }, requires: 'faster_reload' },
        { id: 'headshot_dmg', name: 'KILL SHOT', desc: 'Headshot damage +50%', icon: '💀', cost: 2, branch: 'combat', effect: { headshotMult: 1.5 }, requires: 'recoil_control' },
      ],
      stealth: [
        { id: 'silent_move', name: 'SILENT STEP', desc: 'Movement makes no sound', icon: '👣', cost: 1, branch: 'stealth', effect: { silentMove: true }, requires: null },
        { id: 'slow_detect', name: 'GHOST', desc: 'Enemy detection speed -40%', icon: '👁', cost: 1, branch: 'stealth', effect: { detectMult: 0.6 }, requires: null },
        { id: 'crouch_speed', name: 'SHADOW WALK', desc: 'Move faster while crouching', icon: '🦎', cost: 1, branch: 'stealth', effect: { crouchSpeedMult: 1.4 }, requires: 'silent_move' },
        { id: 'takedown_xp', name: 'EXECUTIONER', desc: 'Stealth kills give bonus XP', icon: '🗡', cost: 2, branch: 'stealth', effect: { steakhXPMult: 2 }, requires: 'slow_detect' },
      ],
      tech: [
        { id: 'fast_hack', name: 'NEURAL JACK', desc: 'Hack speed +50%', icon: '💻', cost: 1, branch: 'tech', effect: { hackSpeedMult: 1.5 }, requires: null },
        { id: 'drone_scan', name: 'DRONE SCAN+', desc: 'Recon drone reveals more enemies', icon: '🚁', cost: 1, branch: 'tech', effect: { droneRange: 1.5 }, requires: null },
        { id: 'emp_radius', name: 'EMP SURGE', desc: 'EMP grenade radius +50%', icon: '⚡', cost: 1, branch: 'tech', effect: { empRadiusMult: 1.5 }, requires: 'fast_hack' },
        { id: 'hack_fortify', name: 'SYSTEM BREACH', desc: 'Hack into cameras and turrets', icon: '🔓', cost: 2, branch: 'tech', effect: { hackCameras: true }, requires: 'drone_scan' },
      ],
      survival: [
        { id: 'extra_health', name: 'IRON BODY', desc: 'Maximum health +25', icon: '❤️', cost: 1, branch: 'survival', effect: { maxHealthBonus: 25 }, requires: null },
        { id: 'fast_heal', name: 'FIELD MEDIC', desc: 'Healing speed +30%', icon: '💉', cost: 1, branch: 'survival', effect: { healSpeedMult: 1.3 }, requires: null },
        { id: 'armor_boost', name: 'HEAVY PLATES', desc: 'Armor rating +20', icon: '🛡', cost: 1, branch: 'survival', effect: { maxArmorBonus: 20 }, requires: 'extra_health' },
        { id: 'revive', name: 'LAST STAND', desc: 'Once per mission, survive lethal hit with 1 HP', icon: '⚔️', cost: 2, branch: 'survival', effect: { lastStand: true }, requires: 'fast_heal' },
      ]
    };
  }

  isUnlocked(skillId) {
    return this.saveData.unlockedSkills.includes(skillId);
  }

  canUnlock(skill) {
    if (this.isUnlocked(skill.id)) return false;
    if (this.saveData.skillPoints < skill.cost) return false;
    if (skill.requires && !this.isUnlocked(skill.requires)) return false;
    return true;
  }

  unlock(skillId) {
    const skill = this._findSkill(skillId);
    if (!skill || !this.canUnlock(skill)) return false;
    this.saveData.skillPoints -= skill.cost;
    this.saveData.unlockedSkills.push(skillId);
    this._computeEffects();
    return true;
  }

  _findSkill(id) {
    for (const branch of Object.values(this.skills)) {
      const s = branch.find(s => s.id === id);
      if (s) return s;
    }
    return null;
  }

  _computeEffects() {
    this.effects = {
      reloadMult: 1, recoilMult: 1, ammoMult: 1, headshotMult: 1,
      silentMove: false, detectMult: 1, crouchSpeedMult: 1, steakhXPMult: 1,
      hackSpeedMult: 1, droneRange: 1, empRadiusMult: 1, hackCameras: false,
      maxHealthBonus: 0, healSpeedMult: 1, maxArmorBonus: 0, lastStand: false,
    };
    this.saveData.unlockedSkills.forEach(id => {
      const s = this._findSkill(id);
      if (s && s.effect) {
        Object.assign(this.effects, s.effect);
      }
    });
  }

  getEffect(name, def) {
    return this.effects[name] !== undefined ? this.effects[name] : def;
  }

  renderUI(container, saveData) {
    this.saveData = saveData;
    this._computeEffects();
    container.innerHTML = '';
    const branches = Object.entries(this.skills);
    branches.forEach(([branch, skills]) => {
      const div = document.createElement('div');
      div.className = 'skill-branch';
      div.innerHTML = `<div class="branch-title ${branch}">${branch.toUpperCase()}</div>`;
      skills.forEach(skill => {
        const unlocked = this.isUnlocked(skill.id);
        const canUnlock = this.canUnlock(skill);
        const locked = !unlocked && !canUnlock;
        const node = document.createElement('div');
        node.className = `skill-node ${unlocked ? 'unlocked' : ''} ${locked ? 'locked' : ''}`;
        node.innerHTML = `
          <div class="skill-icon">${skill.icon}</div>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-desc">${skill.desc}</div>
          </div>
          <div class="skill-cost">${unlocked ? '✓' : skill.cost + 'SP'}</div>
        `;
        if (!unlocked && canUnlock) {
          node.style.cursor = 'pointer';
          node.addEventListener('click', () => {
            if (this.unlock(skill.id)) {
              this.renderUI(container, saveData);
              document.getElementById('skill-points-available').textContent = saveData.skillPoints;
            }
          });
        }
        div.appendChild(node);
      });
      container.appendChild(div);
    });
  }
}

window.SkillTree = SkillTree;
