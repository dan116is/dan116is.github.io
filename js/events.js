// Events & birthdays with countdown. Birthdays recur yearly; events are one-off.
const Events = (() => {
  const KEY = DB.KEYS.events;

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, { type: 'event', ...data }); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayMid() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  // Next occurrence as a Date. Birthdays roll to next year once passed.
  function nextDate(ev) {
    if (!ev.date) return null;
    const parts = ev.date.split('-').map(Number);
    const today = todayMid();
    if (ev.type === 'birthday') {
      const [, mm, dd] = parts;
      let d = new Date(today.getFullYear(), mm - 1, dd);
      if (d < today) d = new Date(today.getFullYear() + 1, mm - 1, dd);
      return d;
    }
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil(ev) {
    const d = nextDate(ev);
    if (!d) return Infinity;
    return Math.round((d - todayMid()) / 86400000);
  }

  function ageTurning(ev) {
    if (ev.type !== 'birthday' || !ev.date) return null;
    const birthYear = Number(ev.date.split('-')[0]);
    if (!birthYear || birthYear < 1900) return null;
    return nextDate(ev).getFullYear() - birthYear;
  }

  // Upcoming within `days`, sorted by soonest.
  function upcoming(days = 30) {
    return list()
      .map((ev) => ({ ev, d: daysUntil(ev) }))
      .filter((x) => x.d >= 0 && x.d <= days)
      .sort((a, b) => a.d - b.d);
  }

  function countdownText(d) {
    if (d === 0) return 'היום! 🎉';
    if (d === 1) return 'מחר';
    return `בעוד ${d} ימים`;
  }

  function icon(ev) { return ev.type === 'birthday' ? '🎂' : (ev.emoji || '📌'); }

  function formatNext(ev) {
    const d = nextDate(ev);
    if (!d) return '';
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render(container) {
    const items = list().slice().sort((a, b) => daysUntil(a) - daysUntil(b));
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🎂</div><p>אין אירועים עדיין. הוסף יום הולדת או אירוע!</p></div>`;
      return;
    }
    container.innerHTML = items.map((ev) => {
      const d = daysUntil(ev);
      const age = ageTurning(ev);
      const soon = d <= 7;
      return `
        <div class="item-card ${soon ? 'warning' : ''}">
          <div class="event-emoji">${icon(ev)}</div>
          <div class="item-main">
            <div class="item-title">${esc(ev.title)}${age != null ? ` <span class="muted">· גיל ${age}</span>` : ''}</div>
            <div class="item-sub">
              <span class="tag ${soon ? 'warning' : ''}">${countdownText(d)}</span>
              <span>${formatNext(ev)}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-event-edit="${ev.id}" title="ערוך">✎</button>
            <button class="icon-btn" data-event-del="${ev.id}" title="מחק">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  function openForm(existing) {
    const family = DB.list(DB.KEYS.family);
    const opts = ['', ...family.map((f) => f.name)]
      .map((n) => `<option value="${esc(n)}" ${existing && existing.title === n ? 'selected' : ''}>${n ? esc(n) : '— בחר/הקלד —'}</option>`).join('');
    const isB = !existing || existing.type === 'birthday';
    return `
      <form id="event-form">
        <div class="form-group">
          <label>סוג</label>
          <select name="type" id="event-type">
            <option value="birthday" ${isB ? 'selected' : ''}>🎂 יום הולדת</option>
            <option value="event" ${!isB ? 'selected' : ''}>📌 אירוע</option>
          </select>
        </div>
        <div class="form-group">
          <label>כותרת / שם *</label>
          <input name="title" required value="${esc(existing?.title || '')}" placeholder="לדוגמה: יום הולדת לגפן" list="event-names">
          <datalist id="event-names">${opts}</datalist>
        </div>
        <div class="form-group">
          <label>תאריך *</label>
          <input name="date" type="date" required value="${existing?.date || ''}">
          <p class="hint" style="margin:6px 0 0;" id="event-date-hint">ביום הולדת — בחר את תאריך הלידה המלא לחישוב הגיל.</p>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">${existing ? 'עדכן' : 'הוסף'}</button>
        </div>
      </form>`;
  }

  return { list, add, update, remove, upcoming, daysUntil, nextDate, ageTurning, countdownText, icon, formatNext, render, openForm };
})();
