// Monthly calendar view. Shows task dots per day; tap a day to see/add tasks.
const Calendar = (() => {
  let viewYear, viewMonth, selectedKey = null, mode = 'month';

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

  function setMode(m) { mode = (m === 'week') ? 'week' : 'month'; render(); }

  function prev() {
    ensure();
    if (mode === 'week') { const d = new Date(selectedKey + 'T00:00:00'); d.setDate(d.getDate() - 7); selectedKey = ymd(d); viewYear = d.getFullYear(); viewMonth = d.getMonth(); }
    else { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } }
    render();
  }
  function next() {
    ensure();
    if (mode === 'week') { const d = new Date(selectedKey + 'T00:00:00'); d.setDate(d.getDate() + 7); selectedKey = ymd(d); viewYear = d.getFullYear(); viewMonth = d.getMonth(); }
    else { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } }
    render();
  }
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
    // reflect active mode button
    document.querySelectorAll('[data-cal-mode]').forEach((b) => b.classList.toggle('active', b.dataset.calMode === mode));

    const byDay = tasksByDay();
    const evDay = eventsByDay();
    const todayKey = ymd(new Date());
    const weekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    function cell(key, label, big) {
      const has = byDay[key] && byDay[key].length;
      const hasEv = evDay[key];
      const cls = ['cal-day'];
      if (big) cls.push('cal-day-week');
      if (key === todayKey) cls.push('today');
      if (key === selectedKey) cls.push('selected');
      const dots = `${has ? '<span class="cal-dot"></span>' : ''}${hasEv ? '<span class="cal-dot event"></span>' : ''}`;
      return `<button class="${cls.join(' ')}" data-cal-day="${key}">${label}<div class="cal-dots">${dots}</div></button>`;
    }

    if (mode === 'week') {
      const sel = new Date(selectedKey + 'T00:00:00');
      const start = new Date(sel); start.setDate(sel.getDate() - sel.getDay()); // Sunday
      let cells = '';
      const labels = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        labels.push(weekdays[i] + ' ' + d.getDate());
        cells += cell(ymd(d), `<span class="cal-wnum">${weekdays[i]}</span><span class="cal-wday">${d.getDate()}</span>`, true);
      }
      const end = new Date(start); end.setDate(start.getDate() + 6);
      titleEl.textContent = `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('he-IL', { month: 'long' })}`;
      grid.innerHTML = `<div class="cal-week">${cells}</div>`;
    } else {
      titleEl.textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      const startDow = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < startDow; i++) cells += '<div class="cal-day empty"></div>';
      for (let day = 1; day <= daysInMonth; day++) cells += cell(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`, String(day), false);
      grid.innerHTML =
        `<div class="cal-weekdays">${weekdays.map((w) => `<span>${w}</span>`).join('')}</div>` +
        `<div class="cal-days">${cells}</div>`;
    }

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

  return { render, prev, next, select, selected, setMode };
})();
if (typeof window !== "undefined") window.Calendar = Calendar;
