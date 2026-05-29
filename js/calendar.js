// Monthly calendar view. Shows task dots per day; tap a day to see/add tasks.
const Calendar = (() => {
  let viewYear, viewMonth, selectedKey = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function ensure() {
    if (viewYear === undefined) {
      const d = new Date();
      viewYear = d.getFullYear(); viewMonth = d.getMonth();
      selectedKey = ymd(d);
    }
  }

  function prev() { ensure(); viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); }
  function next() { ensure(); viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); }
  function select(key) { selectedKey = key; render(); }
  function selected() { ensure(); return selectedKey; }

  function tasksByDay() {
    const map = {};
    for (const t of Tasks.list()) {
      if (t.dueDate) { (map[t.dueDate] = map[t.dueDate] || []).push(t); }
    }
    return map;
  }

  // Map of YYYY-MM-DD -> [events] for the currently viewed month (handles
  // yearly-recurring birthdays by projecting onto the viewed year).
  function eventsByDay() {
    const map = {};
    if (typeof Events === 'undefined') return map;
    for (const ev of Events.list()) {
      if (!ev.date) continue;
      const parts = ev.date.split('-').map(Number);
      let key;
      if (ev.type === 'birthday') key = `${viewYear}-${pad(parts[1])}-${pad(parts[2])}`;
      else key = ev.date;
      (map[key] = map[key] || []).push(ev);
    }
    return map;
  }

  function render() {
    ensure();
    const grid = document.getElementById('cal-grid');
    const titleEl = document.getElementById('cal-title');
    if (!grid || !titleEl) return;
    titleEl.textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

    const startDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const byDay = tasksByDay();
    const evDay = eventsByDay();
    const todayKey = ymd(new Date());
    const weekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<div class="cal-day empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
      const has = byDay[key] && byDay[key].length;
      const hasEv = evDay[key];
      const cls = ['cal-day'];
      if (key === todayKey) cls.push('today');
      if (key === selectedKey) cls.push('selected');
      const dots = `${has ? '<span class="cal-dot"></span>' : ''}${hasEv ? '<span class="cal-dot event"></span>' : ''}`;
      cells += `<button class="${cls.join(' ')}" data-cal-day="${key}">${day}<div class="cal-dots">${dots}</div></button>`;
    }
    grid.innerHTML =
      `<div class="cal-weekdays">${weekdays.map((w) => `<span>${w}</span>`).join('')}</div>` +
      `<div class="cal-days">${cells}</div>`;

    renderSelected(byDay);
  }

  function renderSelected(byDay) {
    byDay = byDay || tasksByDay();
    const el = document.getElementById('cal-day-list');
    const head = document.getElementById('cal-selected-head');
    if (!el || !head) return;
    const d = new Date(selectedKey + 'T00:00:00');
    head.textContent = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const items = (byDay[selectedKey] || []).slice().sort((a, b) => Number(a.done) - Number(b.done));
    const evMap = eventsByDay();
    const evItems = evMap[selectedKey] || [];
    if (!items.length && !evItems.length) {
      el.innerHTML = `<div class="dash-empty">אין משימות או אירועים ליום זה</div>`;
      return;
    }
    const evHtml = evItems.map((ev) => `
      <div class="dash-item">
        <div class="event-emoji sm">${Events.icon(ev)}</div>
        <span class="dash-item-title">${esc(ev.title)}</span>
        <span class="tag warning">${ev.type === 'birthday' ? 'יום הולדת' : 'אירוע'}</span>
      </div>`).join('');
    const taskHtml = items.map((t) => `
      <div class="dash-item ${t.done ? 'done' : ''}">
        <button class="item-check ${t.done ? 'checked' : ''}" data-task-toggle="${t.id}" aria-label="סמן"></button>
        <span class="dash-item-title">${esc(t.title)}</span>
        ${t.priority && t.priority !== 'רגילה' ? `<span class="tag ${t.priority === 'גבוהה' ? 'danger' : ''}">${esc(t.priority)}</span>` : ''}
        ${t.forWhom ? `<span class="tag">${esc(t.forWhom)}</span>` : ''}
      </div>`).join('');
    el.innerHTML = evHtml + taskHtml;
  }

  return { render, prev, next, select, selected };
})();
