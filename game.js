/**
 * game.js — Main game loop, canvas renderer & input for Virtual Luxury City
 */

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const TILE   = 40;          // px per grid cell
const SPEEDS = [1, 2, 5];   // game-speed multipliers

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
let city;
let selectedBuilding = null;   // buildingId string
let activeTool       = 'build';
let gameSpeed        = 0;      // index into SPEEDS (0 = paused toggle)
let isRunning        = true;
let lastTimestamp    = null;

// Canvas / rendering
const canvas  = document.getElementById('cityCanvas');
const ctx     = canvas.getContext('2d');
const cityView = document.getElementById('cityView');

// Pan / drag
let panX = 0, panY = 0;
let isPanning = false;
let panStart  = { x: 0, y: 0 };
let panOrigin = { x: 0, y: 0 };

// Hover
let hoverCell = null;   // { x, y }

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
function init() {
  const saved = localStorage.getItem('luxuryCity_save');
  city = saved ? City.fromJSON(JSON.parse(saved)) : new City();

  resizeCanvas();
  centerView();
  buildBuildingList();
  renderAll();
  requestAnimationFrame(gameLoop);

  // Auto-save every 30s
  setInterval(saveGame, 30_000);
}

/* ═══════════════════════════════════════════════════════════
   GAME LOOP
═══════════════════════════════════════════════════════════ */
function gameLoop(ts) {
  if (lastTimestamp === null) lastTimestamp = ts;
  const dtMs = ts - lastTimestamp;
  lastTimestamp = ts;

  if (isRunning) {
    const dtSec = (dtMs / 1000) * SPEEDS[gameSpeed];
    city.gameTick(dtSec);
    updateHUD();
    renderCity();
    flushNews();
    checkNewAchievements();
  }

  requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════════════════════════
   CANVAS / RENDERING
═══════════════════════════════════════════════════════════ */
function resizeCanvas() {
  canvas.width  = cityView.clientWidth;
  canvas.height = cityView.clientHeight;
}

function centerView() {
  panX = Math.floor((canvas.width  - city.gridW * TILE) / 2);
  panY = Math.floor((canvas.height - city.gridH * TILE) / 2);
}

function renderAll() {
  renderCity();
  updateHUD();
  renderReport();
  renderAchievements();
}

function renderCity() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#1c2030';
  ctx.lineWidth   = 1;
  for (let y = 0; y <= city.gridH; y++) {
    ctx.beginPath();
    ctx.moveTo(panX, panY + y * TILE);
    ctx.lineTo(panX + city.gridW * TILE, panY + y * TILE);
    ctx.stroke();
  }
  for (let x = 0; x <= city.gridW; x++) {
    ctx.beginPath();
    ctx.moveTo(panX + x * TILE, panY);
    ctx.lineTo(panX + x * TILE, panY + city.gridH * TILE);
    ctx.stroke();
  }

  // Placed buildings
  const drawn = new Set();
  for (let y = 0; y < city.gridH; y++) {
    for (let x = 0; x < city.gridW; x++) {
      const cell = city.grid[y][x];
      if (!cell || drawn.has(cell.id)) continue;
      drawn.add(cell.id);
      drawBuilding(cell);
    }
  }

  // Hover highlight
  if (hoverCell) {
    const { x, y } = hoverCell;
    const px = panX + x * TILE;
    const py = panY + y * TILE;

    if (activeTool === 'build' && selectedBuilding) {
      const def  = BUILDINGS[selectedBuilding];
      const size = def.size;
      const ok   = city.canPlace(selectedBuilding, x, y);

      ctx.fillStyle = ok ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.20)';
      ctx.fillRect(px, py, size * TILE, size * TILE);
      ctx.strokeStyle = ok ? '#22c55e' : '#ef4444';
      ctx.lineWidth   = 2;
      ctx.strokeRect(px + 1, py + 1, size * TILE - 2, size * TILE - 2);

      // Ghost emoji
      ctx.font      = `${TILE * 0.55 * size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = 0.5;
      ctx.fillText(def.emoji, px + (size * TILE) / 2, py + (size * TILE) / 2);
      ctx.globalAlpha  = 1;
    } else if (activeTool === 'demolish') {
      ctx.fillStyle   = 'rgba(239,68,68,0.25)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth   = 2;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
    } else {
      ctx.strokeStyle = 'rgba(201,168,76,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
    }
  }
}

function drawBuilding(inst) {
  const def  = BUILDINGS[inst.buildingId];
  const size = def.size;
  const px   = panX + inst.x * TILE;
  const py   = panY + inst.y * TILE;
  const w    = size * TILE;
  const h    = size * TILE;

  // Background tile
  ctx.fillStyle = def.color + '33';   // 20% opacity version of color
  ctx.fillRect(px + 1, py + 1, w - 2, h - 2);

  // Border
  ctx.strokeStyle = def.color;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);

  // Emoji
  const fontSize = Math.min(w, h) * 0.48;
  ctx.font         = `${fontSize}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#ffffff';
  ctx.fillText(def.emoji, px + w / 2, py + h / 2);
}

/* ═══════════════════════════════════════════════════════════
   HUD UPDATES
═══════════════════════════════════════════════════════════ */
function updateHUD() {
  document.getElementById('statMoney').textContent    = '$' + city.money.toLocaleString();
  document.getElementById('statPop').textContent      = city.population.toLocaleString();
  document.getElementById('statPrestige').textContent = city.prestige.toLocaleString();
  document.getElementById('statHappiness').textContent = city.happiness + '%';
  const net = city.income - city.upkeep;
  const incEl = document.getElementById('statIncome');
  incEl.textContent = (net >= 0 ? '+' : '') + '$' + net.toLocaleString();
  incEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('cityName').textContent = city.name;
}

function renderReport() {
  const el = document.getElementById('cityReport');
  const rows = [
    ['Buildings',   city.placed.size],
    ['Population',  city.population.toLocaleString()],
    ['Income/s',    '$' + city.income.toLocaleString()],
    ['Upkeep/s',    '$' + city.upkeep.toLocaleString()],
    ['Net/s',       (city.income - city.upkeep >= 0 ? '+' : '') + '$' + (city.income - city.upkeep).toLocaleString()],
    ['Prestige',    city.prestige],
    ['Happiness',   city.happiness + '%'],
    ['Time (s)',    Math.floor(city.tick).toLocaleString()],
  ];
  el.innerHTML = rows.map(([k, v]) =>
    `<div class="report-row"><span>${k}</span><span>${v}</span></div>`
  ).join('');
}

function renderAchievements() {
  const el = document.getElementById('achievements');
  el.innerHTML = city.achievements.map(a =>
    `<div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
       <span class="ach-icon">${a.icon}</span>
       <div class="ach-info">
         <div class="ach-name">${a.name}</div>
         <div class="ach-desc">${a.desc}</div>
       </div>
     </div>`
  ).join('');
}

/* ─── News ─── */
let _lastNewsLen = 0;
function flushNews() {
  if (city.news.length === _lastNewsLen) return;
  _lastNewsLen = city.news.length;

  const el = document.getElementById('newsFeed');
  el.innerHTML = city.news.map(n =>
    `<div class="news-item"><div class="news-title">${n.text}</div></div>`
  ).join('');

  renderReport();
  renderAchievements();
}

/* ─── Achievements toast ─── */
let _achState = {};
function checkNewAchievements() {
  for (const a of city.achievements) {
    if (a.unlocked && !_achState[a.id]) {
      _achState[a.id] = true;
      toast(`🏆 ${a.name} — ${a.desc}`, 'success', 4000);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   BUILDING LIST
═══════════════════════════════════════════════════════════ */
function buildBuildingList() {
  const container = document.getElementById('buildingList');
  container.innerHTML = '';

  // Group by category
  const groups = {};
  for (const [id, def] of Object.entries(BUILDINGS)) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push({ id, def });
  }

  for (const [cat, items] of Object.entries(groups)) {
    const catInfo = CATEGORIES[cat] || { label: cat, icon: '' };

    const header = document.createElement('div');
    header.className = 'tool-heading';
    header.style.marginTop = '10px';
    header.style.fontSize  = '9px';
    header.textContent = `${catInfo.icon} ${catInfo.label}`;
    container.appendChild(header);

    for (const { id, def } of items) {
      const btn = document.createElement('div');
      btn.className   = 'building-item';
      btn.dataset.bid = id;
      btn.title       = def.desc;
      btn.innerHTML   =
        `<span class="bi-icon">${def.emoji}</span>
         <div class="bi-info">
           <span class="bi-name">${def.name}</span>
           <span class="bi-cost">$${def.cost.toLocaleString()}</span>
         </div>`;
      btn.addEventListener('click', () => selectBuilding(id));
      container.appendChild(btn);
    }
  }

  refreshBuildingList();
}

function refreshBuildingList() {
  document.querySelectorAll('.building-item').forEach(el => {
    const id  = el.dataset.bid;
    const def = BUILDINGS[id];
    const locked   = city.prestige < def.unlockPrestige;
    const tooExp   = city.money   < def.cost;
    el.classList.toggle('disabled', locked || tooExp);
    el.classList.toggle('selected', selectedBuilding === id);
  });
}

function selectBuilding(id) {
  if (activeTool !== 'build') setTool('build');
  selectedBuilding = (selectedBuilding === id) ? null : id;
  refreshBuildingList();
  updateSelectionPanel();
}

function updateSelectionPanel() {
  const panel = document.getElementById('selectedInfo');
  const details = document.getElementById('selectedDetails');

  if (!selectedBuilding) {
    panel.style.display = 'none';
    return;
  }
  const def = BUILDINGS[selectedBuilding];
  panel.style.display = 'block';
  details.innerHTML =
    `<div class="detail-icon">${def.emoji}</div>
     <div class="detail-title">${def.name}</div>
     <div class="detail-row"><span>Cost</span><span>$${def.cost.toLocaleString()}</span></div>
     <div class="detail-row"><span>Income/s</span><span>$${def.income.toLocaleString()}</span></div>
     <div class="detail-row"><span>Upkeep/s</span><span>$${def.upkeep.toLocaleString()}</span></div>
     <div class="detail-row"><span>Population</span><span>${def.population}</span></div>
     <div class="detail-row"><span>Prestige</span><span>+${def.prestige}</span></div>
     <div class="detail-row"><span>Happiness</span><span>+${def.happiness}</span></div>
     <div class="detail-row"><span>Size</span><span>${def.size}×${def.size}</span></div>
     <p style="font-size:10px;color:var(--text-dim);margin-top:6px;">${def.desc}</p>`;
}

/* ═══════════════════════════════════════════════════════════
   TOOLS
═══════════════════════════════════════════════════════════ */
function setTool(name) {
  activeTool = name;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === name);
  });
  canvas.style.cursor = name === 'demolish' ? 'not-allowed' : name === 'info' ? 'help' : 'crosshair';
}

/* ═══════════════════════════════════════════════════════════
   CANVAS INPUT
═══════════════════════════════════════════════════════════ */
function canvasToGrid(cx, cy) {
  return {
    x: Math.floor((cx - panX) / TILE),
    y: Math.floor((cy - panY) / TILE),
  };
}

function inGrid(gx, gy) {
  return gx >= 0 && gy >= 0 && gx < city.gridW && gy < city.gridH;
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const cx   = e.clientX - rect.left;
  const cy   = e.clientY - rect.top;

  if (isPanning) {
    panX = panOrigin.x + (cx - panStart.x);
    panY = panOrigin.y + (cy - panStart.y);
    renderCity();
    return;
  }

  const g = canvasToGrid(cx, cy);
  hoverCell = inGrid(g.x, g.y) ? g : null;
  renderCity();
  updateTooltip(e, g);
});

canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
  hideTooltip();
  renderCity();
});

canvas.addEventListener('mousedown', e => {
  if (e.button === 1 || e.button === 2) {
    // Middle / right click = pan
    isPanning = true;
    panStart  = { x: e.clientX - canvas.getBoundingClientRect().left,
                  y: e.clientY - canvas.getBoundingClientRect().top };
    panOrigin = { x: panX, y: panY };
    e.preventDefault();
    return;
  }

  if (e.button === 0) {
    const rect = canvas.getBoundingClientRect();
    const g    = canvasToGrid(e.clientX - rect.left, e.clientY - rect.top);
    if (!inGrid(g.x, g.y)) return;
    handleClick(g.x, g.y);
  }
});

canvas.addEventListener('mouseup', () => { isPanning = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  // Scroll to pan vertically
  panY -= e.deltaY;
  panX -= e.deltaX;
  renderCity();
}, { passive: false });

function handleClick(gx, gy) {
  if (activeTool === 'build' && selectedBuilding) {
    const inst = city.place(selectedBuilding, gx, gy);
    if (inst) {
      toast(`${BUILDINGS[selectedBuilding].emoji} ${BUILDINGS[selectedBuilding].name} built!`, 'success');
      refreshBuildingList();
      renderAll();
    } else {
      const def = BUILDINGS[selectedBuilding];
      if (city.money < def.cost)
        toast('Not enough funds!', 'danger');
      else if (city.prestige < def.unlockPrestige)
        toast(`Need ${def.unlockPrestige} prestige to unlock!`, 'danger');
      else
        toast('Cannot place here!', 'danger');
    }
    return;
  }

  if (activeTool === 'demolish') {
    if (city.demolish(gx, gy)) {
      toast('Building demolished.', 'info');
      refreshBuildingList();
      renderAll();
    }
    return;
  }

  if (activeTool === 'info') {
    const cell = city.getCell(gx, gy);
    if (cell) showInfoModal(cell);
  }
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP
═══════════════════════════════════════════════════════════ */
const tooltip = document.getElementById('tooltip');

function updateTooltip(e, g) {
  const cell = inGrid(g.x, g.y) ? city.getCell(g.x, g.y) : null;
  if (!cell) { hideTooltip(); return; }

  const def = BUILDINGS[cell.buildingId];
  tooltip.innerHTML =
    `<div class="tt-name">${def.emoji} ${def.name}</div>
     <div class="tt-info">Income: $${def.income.toLocaleString()}/s · Pop: ${def.population}</div>`;
  tooltip.style.left = (e.clientX - canvas.getBoundingClientRect().left + 12) + 'px';
  tooltip.style.top  = (e.clientY - canvas.getBoundingClientRect().top  - 12) + 'px';
  tooltip.classList.remove('hidden');
}

function hideTooltip() { tooltip.classList.add('hidden'); }

/* ═══════════════════════════════════════════════════════════
   INFO MODAL
═══════════════════════════════════════════════════════════ */
function showInfoModal(inst) {
  const def = BUILDINGS[inst.buildingId];
  openModal(`
    <div class="detail-icon">${def.emoji}</div>
    <div class="detail-title">${def.name}</div>
    <div class="detail-row"><span>Income/s</span><span>$${def.income.toLocaleString()}</span></div>
    <div class="detail-row"><span>Upkeep/s</span><span>$${def.upkeep.toLocaleString()}</span></div>
    <div class="detail-row"><span>Population</span><span>${def.population}</span></div>
    <div class="detail-row"><span>Prestige</span><span>+${def.prestige}</span></div>
    <div class="detail-row"><span>Happiness</span><span>+${def.happiness}</span></div>
    <div class="detail-row"><span>Grid pos</span><span>(${inst.x}, ${inst.y})</span></div>
    <p style="font-size:11px;color:var(--text-dim);margin-top:10px;">${def.desc}</p>
    <button class="modal-btn" style="margin-top:14px;background:var(--danger);color:#fff;"
      onclick="if(city.demolish(${inst.x},${inst.y})){refreshBuildingList();renderAll();toast('Demolished.','info');closeModal();}">
      💥 Demolish (30% refund)
    </button>
  `);
}

/* ═══════════════════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════════════════ */
const modal = document.getElementById('modal');

function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function toast(msg, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ═══════════════════════════════════════════════════════════
   SAVE / LOAD
═══════════════════════════════════════════════════════════ */
function saveGame() {
  localStorage.setItem('luxuryCity_save', JSON.stringify(city.toJSON()));
}

/* ═══════════════════════════════════════════════════════════
   TOOLBAR BUTTONS
═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

// Speed toggle
const speedBtn = document.getElementById('btnSpeed');
const speedLabels = ['⏸ Pause', '▶ x1', '⏩ x2', '⏭ x5'];
let speedIndex = 1;   // start at x1

speedBtn.addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % 4;
  if (speedIndex === 0) {
    isRunning = false;
    speedBtn.textContent = speedLabels[0];
  } else {
    isRunning  = true;
    gameSpeed  = speedIndex - 1;
    speedBtn.textContent = speedLabels[speedIndex];
  }
});

// Rename city
document.getElementById('btnRename').addEventListener('click', () => {
  openModal(`
    <div class="modal-title">✏ Rename City</div>
    <input class="modal-input" id="renameInput" maxlength="40"
      value="${city.name}" placeholder="Enter city name…" />
    <button class="modal-btn" onclick="
      const v = document.getElementById('renameInput').value.trim();
      if(v){ city.name = v; updateHUD(); saveGame(); closeModal(); }
    ">Confirm</button>
  `);
  setTimeout(() => document.getElementById('renameInput')?.focus(), 50);
});

/* ═══════════════════════════════════════════════════════════
   RESIZE
═══════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  resizeCanvas();
  renderCity();
});

/* ═══════════════════════════════════════════════════════════
   KEYBOARD
═══════════════════════════════════════════════════════════ */
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    selectedBuilding = null;
    refreshBuildingList();
    updateSelectionPanel();
    closeModal();
  }
  if (e.key === 'b' || e.key === 'B') setTool('build');
  if (e.key === 'd' || e.key === 'D') setTool('demolish');
  if (e.key === 'i' || e.key === 'I') setTool('info');
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveGame(); toast('Game saved!', 'success', 1500); }
});

/* ═══════════════════════════════════════════════════════════
   START
═══════════════════════════════════════════════════════════ */
init();
