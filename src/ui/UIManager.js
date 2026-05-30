class UIManager {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.saveData = null;
    this.skillTree = null;
    this.radarCtx = null;
    this.radarCanvas = null;
    this._setupRadar();
  }

  _setupRadar() {
    this.radarCanvas = document.getElementById('radar-canvas');
    if (this.radarCanvas) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }
  }

  init(saveData) {
    this.saveData = saveData;
    this.skillTree = new SkillTree(saveData);
    this._updatePlayerInfo();
  }

  _updatePlayerInfo() {
    if (!this.saveData) return;
    const lvl = document.getElementById('menu-rank');
    const xp = document.getElementById('menu-xp');
    if (lvl) lvl.textContent = this.saveData.playerLevel.toString().padStart(2, '0');
    if (xp) xp.textContent = this.saveData.playerXP.toLocaleString();
  }

  showMainMenu() {
    this._hideAll();
    document.getElementById('main-menu').classList.remove('hidden');
    this._updatePlayerInfo();
  }

  showCampaignMenu() {
    this._hideAll();
    document.getElementById('campaign-menu').classList.remove('hidden');
    this._buildChapterGrid();
  }

  _buildChapterGrid() {
    const grid = document.getElementById('chapter-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const chapters = [
      { num: 1, title: 'THE ATTACK', sub: 'Chapter 1', desc: 'City under siege. Push through Alpha Street and eliminate Aegis forces. Tutorial mission.', available: true },
      { num: 2, title: 'THE INFORMANT', sub: 'Chapter 2', desc: 'Night infiltration of Aegis compound. Hack servers. Steal ARES coordinates.', available: this.saveData.completedChapters.includes(1) || true },
      { num: 3, title: 'DESERT STORM', sub: 'Chapter 3', desc: 'Vehicle combat through the Saharan sector. Destroy the convoy.', available: false },
      { num: 4, title: 'BLACK ICE', sub: 'Chapter 4', desc: 'Arctic facility infiltration. Eliminate ARES research team.', available: false },
      { num: 5, title: 'BROKEN TRUST', sub: 'Chapter 5', desc: 'Someone in Ghost Division is a traitor. Find them before it\'s too late.', available: false },
      { num: 6, title: 'GHOST CITY', sub: 'Chapter 6', desc: 'Urban warfare in the abandoned megacity. Full squad assault.', available: false },
      { num: 7, title: 'THE NETWORK', sub: 'Chapter 7', desc: 'Hack into ARES core systems. Race against Voss\'s countdown.', available: false },
      { num: 8, title: 'LAST STAND', sub: 'Chapter 8', desc: 'Final assault on Aegis headquarters. Confront Voss.', available: false },
      { num: 9, title: 'FINAL CHOICE', sub: 'Chapter 9', desc: 'Destroy ARES or control it. Your decision will end or save the world.', available: false },
    ];

    chapters.forEach(ch => {
      const completed = this.saveData.completedChapters.includes(ch.num);
      const card = document.createElement('div');
      card.className = `chapter-card ${!ch.available ? 'locked' : ''} ${completed ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="card-number">${ch.num.toString().padStart(2,'0')}</div>
        <div class="card-title">${ch.title}</div>
        <div class="card-subtitle">${ch.sub}</div>
        <div class="card-desc">${ch.desc}</div>
        <div class="card-status ${completed ? 'complete' : ch.available ? 'available' : 'locked-text'}">
          ${completed ? '✓ COMPLETED' : ch.available ? '● AVAILABLE' : '🔒 LOCKED'}
        </div>
        ${ch.available ? `<button class="card-play-btn" data-chapter="${ch.num}">LAUNCH MISSION ▶</button>` : ''}
      `;
      if (ch.available) {
        const btn = card.querySelector('.card-play-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._launchChapter(ch.num);
          });
        }
      }
      grid.appendChild(card);
    });
  }

  _launchChapter(num) {
    if (window.GAME) {
      window.GAME.startChapter(num);
    }
  }

  showSkillTree() {
    this._hideAll();
    document.getElementById('skill-tree-menu').classList.remove('hidden');
    const sp = document.getElementById('skill-points-available');
    if (sp) sp.textContent = this.saveData.skillPoints;
    const container = document.getElementById('skill-tree-container');
    if (container && this.skillTree) {
      this.skillTree.renderUI(container, this.saveData);
    }
  }

  showLoadout() {
    this._hideAll();
    document.getElementById('loadout-menu').classList.remove('hidden');
    this._buildLoadout();
  }

  _buildLoadout() {
    const container = document.getElementById('loadout-container');
    if (!container) return;
    container.innerHTML = '';
    const weapons = [
      { name: 'AR-12', type: 'Assault Rifle', unlockLevel: 1, stats: { damage: 28, range: 70, rof: 80, mobility: 75 } },
      { name: 'M7 Valkyrie', type: 'Assault Rifle', unlockLevel: 2, stats: { damage: 35, range: 75, rof: 70, mobility: 65 } },
      { name: 'Viper', type: 'SMG', unlockLevel: 1, stats: { damage: 18, range: 50, rof: 95, mobility: 90 } },
      { name: 'Phantom', type: 'SMG', unlockLevel: 5, stats: { damage: 20, range: 55, rof: 90, mobility: 88 } },
      { name: 'Breacher', type: 'Shotgun', unlockLevel: 8, stats: { damage: 80, range: 30, rof: 30, mobility: 60 } },
      { name: 'Longshot X', type: 'Sniper', unlockLevel: 12, stats: { damage: 120, range: 100, rof: 15, mobility: 45 } },
    ];
    weapons.forEach(w => {
      const unlocked = this.saveData.unlockedWeapons.includes(w.name);
      const selected = this.saveData.selectedWeapon === w.name;
      const card = document.createElement('div');
      card.className = `weapon-card ${!unlocked ? 'locked' : ''} ${selected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="wc-type">${w.type}</div>
        <div class="wc-name">${w.name}</div>
        <div class="wc-stats">
          ${Object.entries(w.stats).map(([k,v]) => `
            <div class="wc-stat">
              <div class="wc-stat-label">${k.toUpperCase()}</div>
              <div class="wc-stat-bar"><div class="wc-stat-fill" style="width:${v}%"></div></div>
              <div class="wc-stat-val">${v}</div>
            </div>
          `).join('')}
        </div>
        ${!unlocked ? `<div class="wc-unlock-req">UNLOCK AT LEVEL ${w.unlockLevel}</div>` : ''}
        ${unlocked ? `<div class="wc-unlock-req" style="color:var(--cyan)">${selected ? '✓ EQUIPPED' : 'CLICK TO EQUIP'}</div>` : ''}
      `;
      if (unlocked) {
        card.addEventListener('click', () => {
          this.saveData.selectedWeapon = w.name;
          this.saveSystem.save(this.saveData);
          this._buildLoadout();
        });
      }
      container.appendChild(card);
    });
  }

  showGame() {
    this._hideAll();
    document.getElementById('game-canvas-container').classList.remove('hidden');
    document.getElementById('hud').style.display = '';
  }

  showMissionComplete(data) {
    this._hideAll();
    const screen = document.getElementById('mission-complete-screen');
    screen.classList.remove('hidden');
    document.getElementById('mc-chapter').textContent = `Chapter ${data.chapter}`;
    document.getElementById('mc-kills').textContent = data.kills;
    document.getElementById('mc-headshots').textContent = data.headshots;
    document.getElementById('mc-stealth').textContent = data.stealthKills || 0;
    document.getElementById('mc-xp').textContent = '+' + data.xp;
    const t = data.time;
    document.getElementById('mc-time').textContent =
      `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
    document.getElementById('mc-rating').textContent = data.rating;
    document.getElementById('mc-level').textContent = this.saveData.playerLevel;
    const xpPct = (this.saveData.playerXP / this.saveData.xpToNextLevel) * 100;
    document.getElementById('mc-xp-bar').style.width = xpPct + '%';
    document.getElementById('mc-xp-cur').textContent = this.saveData.playerXP;
    document.getElementById('mc-xp-next').textContent = this.saveData.xpToNextLevel;

    const unlocks = document.getElementById('mc-unlocks');
    if (unlocks) {
      unlocks.innerHTML = '';
      const newWeapons = [];
      if (data.chapter === 1 && this.saveData.unlockedWeapons.includes('M7 Valkyrie')) {
        newWeapons.push('M7 VALKYRIE UNLOCKED');
      }
      if (this.saveData.skillPoints > 0) {
        newWeapons.push(`+${Math.min(data.chapter, 3)} SKILL POINT(S)`);
      }
      newWeapons.forEach(u => {
        const el = document.createElement('div');
        el.className = 'unlock-item';
        el.textContent = u;
        unlocks.appendChild(el);
      });
    }
  }

  showDeathScreen() {
    this._hideAll();
    const screen = document.getElementById('death-screen');
    screen.classList.remove('hidden');
    const quotes = [
      '"No retreat. No surrender." — Ghost Division Motto',
      '"The enemy knows our location. Adapt." — CPT Marcus Reed',
      '"Aegis will not win today." — SGT Sarah Kim',
      '"You go down, we all go down." — CPL Viktor Volkov',
      '"There is no failure, only feedback." — SPC Ahmed Hassan',
    ];
    const q = document.getElementById('death-quote');
    if (q) q.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  }

  showPauseMenu() {
    document.getElementById('pause-menu').classList.remove('hidden');
  }

  hidePauseMenu() {
    document.getElementById('pause-menu').classList.add('hidden');
  }

  showCinematicIntro(lines, onComplete) {
    this._hideAll();
    const screen = document.getElementById('cinematic-intro');
    screen.classList.remove('hidden');
    let i = 0;
    const showLine = () => {
      if (i >= lines.length) {
        screen.classList.add('hidden');
        if (onComplete) onComplete();
        return;
      }
      const el = document.getElementById('intro-text');
      if (el) {
        el.textContent = lines[i];
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'introFade 3s ease forwards';
      }
      i++;
      setTimeout(showLine, 3200);
    };
    showLine();
    const skip = (e) => {
      if (e.key === 'Enter') {
        screen.classList.add('hidden');
        document.removeEventListener('keydown', skip);
        if (onComplete) onComplete();
      }
    };
    document.addEventListener('keydown', skip);
  }

  _hideAll() {
    const screens = [
      'loading-screen', 'main-menu', 'campaign-menu', 'skill-tree-menu',
      'loadout-menu', 'mission-complete-screen', 'death-screen',
      'pause-menu', 'cinematic-intro', 'game-canvas-container'
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  updateRadar(playerPos, playerYaw, enemyManager) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = 120, h = 120;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 20, 10, 0.8)';
    ctx.beginPath();
    ctx.arc(60, 60, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,245,255,0.2)';
    ctx.lineWidth = 1;
    for (let r of [20, 40]) {
      ctx.beginPath();
      ctx.arc(60, 60, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0,245,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(60, 2); ctx.lineTo(60, 118);
    ctx.moveTo(2, 60); ctx.lineTo(118, 60);
    ctx.stroke();

    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.arc(60, 60, 4, 0, Math.PI * 2);
    ctx.fill();

    const yawAngle = -playerYaw;
    ctx.fillStyle = 'rgba(0,245,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(60, 60);
    ctx.arc(60, 60, 8, yawAngle - 0.4, yawAngle + 0.4);
    ctx.closePath();
    ctx.fill();

    if (enemyManager) {
      enemyManager.drawRadar(ctx, playerPos, playerYaw, 40);
    }

    ctx.strokeStyle = 'rgba(0,245,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(60, 60, 58, 0, Math.PI * 2);
    ctx.stroke();
  }

  showWeaponSwitchUI(weapons, currentSlot) {
    const ui = document.getElementById('weapon-switch-ui');
    const slots = document.getElementById('ws-slots');
    if (!ui || !slots) return;
    ui.classList.remove('hidden');
    slots.innerHTML = '';
    weapons.forEach((w, i) => {
      const slot = document.createElement('div');
      slot.className = `ws-slot ${i === currentSlot ? 'active' : ''}`;
      slot.textContent = `[${i+1}] ${w}`;
      slots.appendChild(slot);
    });
    clearTimeout(this._wsTimeout);
    this._wsTimeout = setTimeout(() => ui.classList.add('hidden'), 2500);
  }
}

window.UIManager = UIManager;
