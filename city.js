/**
 * city.js — City state management for Virtual Luxury City
 */

class City {
  constructor(name = 'New Luxuria', gridW = 24, gridH = 18) {
    this.name       = name;
    this.gridW      = gridW;
    this.gridH      = gridH;
    this.money      = 1_000_000;
    this.prestige   = 0;
    this.happiness  = 100;
    this.population = 0;
    this.income     = 0;   // per second
    this.upkeep     = 0;
    this.tick       = 0;   // seconds elapsed

    // grid[y][x] = { buildingId, id } or null
    this.grid = Array.from({ length: gridH }, () => Array(gridW).fill(null));

    // placed building instances { id, buildingId, x, y }
    this.placed = new Map();
    this._nextId = 1;

    this.news         = [];
    this.achievements = this._initAchievements();
    this.buildingCounts = {};

    this._incomeAccum  = 0;   // fractional $
  }

  /* ─── Placement ─────────────────────────────────────── */

  canPlace(buildingId, x, y) {
    const def = BUILDINGS[buildingId];
    if (!def) return false;
    if (x < 0 || y < 0 || x + def.size > this.gridW || y + def.size > this.gridH) return false;
    if (this.money < def.cost) return false;
    if (this.prestige < def.unlockPrestige) return false;
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        if (this.grid[y + dy][x + dx] !== null) return false;
      }
    }
    return true;
  }

  place(buildingId, x, y) {
    if (!this.canPlace(buildingId, x, y)) return null;
    const def = BUILDINGS[buildingId];
    const id  = this._nextId++;
    const inst = { id, buildingId, x, y };

    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        this.grid[y + dy][x + dx] = inst;
      }
    }

    this.placed.set(id, inst);
    this.money -= def.cost;
    this.buildingCounts[buildingId] = (this.buildingCounts[buildingId] || 0) + 1;

    this._recalcStats();
    this.addNews(`${def.icon} ${def.name} constructed!`, 'build');
    this._checkAchievements();
    return inst;
  }

  demolish(x, y) {
    const cell = this.grid[y]?.[x];
    if (!cell) return false;
    const inst = this.placed.get(cell.id);
    if (!inst) return false;
    const def = BUILDINGS[inst.buildingId];

    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        this.grid[inst.y + dy][inst.x + dx] = null;
      }
    }

    this.placed.delete(inst.id);
    this.buildingCounts[inst.buildingId] = Math.max(0, (this.buildingCounts[inst.buildingId] || 1) - 1);
    const refund = Math.floor(def.cost * 0.3);
    this.money += refund;

    this._recalcStats();
    this.addNews(`💥 ${def.name} demolished. Refund: $${refund.toLocaleString()}`, 'demolish');
    return true;
  }

  getCell(x, y) {
    return this.grid[y]?.[x] ?? null;
  }

  /* ─── Stats ──────────────────────────────────────────── */

  _recalcStats() {
    let income = 0, upkeep = 0, pop = 0, prestige = 0, happiness = 100;

    for (const inst of this.placed.values()) {
      const def = BUILDINGS[inst.buildingId];
      income    += def.income;
      upkeep    += def.upkeep;
      pop       += def.population;
      prestige  += def.prestige;
      happiness += def.happiness;
    }

    this.income     = income;
    this.upkeep     = upkeep;
    this.population = pop;
    this.prestige   = prestige;
    this.happiness  = Math.min(200, Math.max(0, happiness));
  }

  /** Called each game second */
  gameTick(dt) {
    this.tick += dt;
    const net = (this.income - this.upkeep) * dt;
    this._incomeAccum += net;

    if (this._incomeAccum >= 1 || this._incomeAccum <= -1) {
      const earned = Math.trunc(this._incomeAccum);
      this.money += earned;
      this._incomeAccum -= earned;
    }

    // Random events every ~90s
    if (Math.random() < dt / 90) this._randomEvent();
  }

  /* ─── News ───────────────────────────────────────────── */

  addNews(text, type = 'info') {
    this.news.unshift({ text, type, time: this.tick });
    if (this.news.length > 20) this.news.pop();
  }

  /* ─── Achievements ───────────────────────────────────── */

  _initAchievements() {
    return [
      { id: 'first_build',   icon: '🏗', name: 'First Steps',     desc: 'Place your first building',       unlocked: false, check: c => c.placed.size >= 1 },
      { id: 'pop_1000',      icon: '👥', name: 'Growing City',    desc: 'Reach 1,000 population',          unlocked: false, check: c => c.population >= 1000 },
      { id: 'rich',          icon: '💰', name: 'Millionaire',     desc: 'Earn $5,000,000 total',           unlocked: false, check: c => c.money >= 5_000_000 },
      { id: 'prestige_100',  icon: '⭐', name: 'Prestigious',     desc: 'Reach 100 Prestige',              unlocked: false, check: c => c.prestige >= 100 },
      { id: 'prestige_500',  icon: '🌟', name: 'Legendary City',  desc: 'Reach 500 Prestige',              unlocked: false, check: c => c.prestige >= 500 },
      { id: 'casino_built',  icon: '🎰', name: 'High Roller',     desc: 'Build a Diamond Casino',          unlocked: false, check: c => (c.buildingCounts['casino'] || 0) >= 1 },
      { id: 'golden_tower',  icon: '🗼', name: 'Golden Pinnacle', desc: 'Build the Golden Tower',          unlocked: false, check: c => (c.buildingCounts['golden_tower'] || 0) >= 1 },
      { id: 'buildings_10',  icon: '🏙', name: 'Urban Planner',   desc: 'Place 10 buildings',              unlocked: false, check: c => c.placed.size >= 10 },
      { id: 'buildings_25',  icon: '🌆', name: 'Metropolis',      desc: 'Place 25 buildings',              unlocked: false, check: c => c.placed.size >= 25 },
      { id: 'happy_city',    icon: '😄', name: 'Happy Citizens',  desc: 'Reach 150 Happiness',             unlocked: false, check: c => c.happiness >= 150 },
    ];
  }

  _checkAchievements() {
    const newlyUnlocked = [];
    for (const ach of this.achievements) {
      if (!ach.unlocked && ach.check(this)) {
        ach.unlocked = true;
        newlyUnlocked.push(ach);
        this.addNews(`🏆 Achievement unlocked: ${ach.name}!`, 'achievement');
      }
    }
    return newlyUnlocked;
  }

  /* ─── Random Events ──────────────────────────────────── */

  _randomEvent() {
    if (this.placed.size === 0) return;
    const events = [
      { msg: '🌟 Tourism boom! Extra income!', effect: () => { this.money += 50_000; } },
      { msg: '📺 City featured on Luxury Life magazine!', effect: () => { this.prestige += 5; } },
      { msg: '🎉 City festival boosts happiness!', effect: () => { this.happiness = Math.min(200, this.happiness + 10); } },
      { msg: '🔧 Maintenance surge — extra upkeep this month.', effect: () => { this.money -= Math.floor(this.upkeep * 2); } },
      { msg: '🌧 Storm damage reported. Repair costs incurred.', effect: () => { this.money -= 20_000; } },
      { msg: '💎 Rare gem discovered during construction!', effect: () => { this.money += 150_000; } },
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    ev.effect();
    this.addNews(ev.msg, 'event');
    this._recalcStats();
  }

  /* ─── Serialisation ──────────────────────────────────── */

  toJSON() {
    return {
      name:           this.name,
      gridW:          this.gridW,
      gridH:          this.gridH,
      money:          this.money,
      prestige:       this.prestige,
      happiness:      this.happiness,
      population:     this.population,
      income:         this.income,
      upkeep:         this.upkeep,
      tick:           this.tick,
      placed:         [...this.placed.values()],
      buildingCounts: this.buildingCounts,
      achievements:   this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked })),
      news:           this.news.slice(0, 10),
      _nextId:        this._nextId,
    };
  }

  static fromJSON(data) {
    const city = new City(data.name, data.gridW, data.gridH);
    city.money          = data.money;
    city.prestige       = data.prestige;
    city.happiness      = data.happiness;
    city.population     = data.population;
    city.income         = data.income;
    city.upkeep         = data.upkeep;
    city.tick           = data.tick;
    city.buildingCounts = data.buildingCounts || {};
    city.news           = data.news || [];
    city._nextId        = data._nextId || 1;

    // Restore achievements unlock state
    for (const saved of (data.achievements || [])) {
      const ach = city.achievements.find(a => a.id === saved.id);
      if (ach) ach.unlocked = saved.unlocked;
    }

    // Re-place buildings
    for (const inst of data.placed) {
      const def = BUILDINGS[inst.buildingId];
      if (!def) continue;
      city.placed.set(inst.id, inst);
      for (let dy = 0; dy < def.size; dy++) {
        for (let dx = 0; dx < def.size; dx++) {
          if (city.grid[inst.y + dy]) city.grid[inst.y + dy][inst.x + dx] = inst;
        }
      }
    }

    return city;
  }
}
