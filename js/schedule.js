// Shared weekly schedule: recurring activities (workouts, pilates, social,
// etc.) per family member, by weekday + time. Everyone sees the shared board.
const Schedule = (() => {
  const KEY = DB.KEYS.schedule;
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const TYPES = [
    { id: 'workout', label: 'אימון כושר', emoji: '🏋️' },
    { id: 'pilates', label: 'פילאטיס', emoji: '🧘' },
    { id: 'run', label: 'ריצה', emoji: '🏃' },
    { id: 'social', label: 'חברים/חברות', emoji: '👯' },
    { id: 'kids', label: 'חוג ילדים', emoji: '🎨' },
    { id: 'work', label: 'עבודה', emoji: '💼' },
    { id: 'other', label: 'אחר', emoji: '📌' }
  ];

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, data); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }
  function typeOf(id) { return TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1]; }

  function todayDow() { return new Date().getDay(); }
  function forDay(dow) {
    return list().filter((a) => Number(a.day) === dow)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }
  function todayItems() { return forDay(todayDow()); }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function ownerColor(who) {
    return ({ 'דניאל': '#0a84ff', 'הילה': '#ff375f', 'גפן': '#ff9f0a', 'אורי': '#34c759' }[who]) || '#5e5ce6';
  }

  // Dashboard mini: today's plan.
  function renderToday(container) {
    if (!container) return;
    const items = todayItems();
    if (!items.length) { container.innerHTML = `<div class="dash-empty">אין פעילויות מתוזמנות להיום</div>`; return; }
    container.innerHTML = items.map((a) => {
      const t = typeOf(a.type);
      return `<div class="dash-item">
        <span class="sched-dot" style="background:${ownerColor(a.who)}"></span>
        <span class="dash-item-title">${t.emoji} ${esc(a.title || t.label)}${a.who ? ` <span class="muted">· ${esc(a.who)}</span>` : ''}</span>
        ${a.time ? `<span class="tag">${esc(a.time)}</span>` : ''}
      </div>`;
    }).join('');
  }

  // Full weekly board.
  function render(container) {
    if (!container) return;
    const today = todayDow();
    container.innerHTML = DAYS.map((name, dow) => {
      const items = forDay(dow);
      return `
        <div class="sched-day ${dow === today ? 'today' : ''}">
          <div class="sched-day-head">${name}${dow === today ? ' · היום' : ''}</div>
          ${items.length ? items.map((a) => {
            const t = typeOf(a.type);
            return `<div class="sched-card" style="border-inline-start:3px solid ${ownerColor(a.who)}">
              <div class="sched-card-main">
                <div class="sched-card-title">${t.emoji} ${esc(a.title || t.label)}</div>
                <div class="sched-card-sub">${a.time ? esc(a.time) + ' · ' : ''}${esc(a.who || '')}</div>
              </div>
              <button class="icon-btn" data-sched-del="${a.id}" title="מחק">🗑</button>
            </div>`;
          }).join('') : '<div class="sched-empty">—</div>'}
          <button class="sched-add link-btn" data-sched-add="${dow}">+ הוסף</button>
        </div>`;
    }).join('');
  }

  function openForm(existing, presetDay) {
    const family = DB.list(DB.KEYS.family).map((f) => f.name);
    const whoOpts = ['', ...family].map((n) => `<option value="${esc(n)}" ${existing && existing.who === n ? 'selected' : ''}>${n ? esc(n) : '— מי —'}</option>`).join('');
    const dayOpts = DAYS.map((d, i) => `<option value="${i}" ${(existing ? Number(existing.day) : Number(presetDay)) === i ? 'selected' : ''}>${d}</option>`).join('');
    const typeOpts = TYPES.map((t) => `<option value="${t.id}" ${existing && existing.type === t.id ? 'selected' : ''}>${t.emoji} ${t.label}</option>`).join('');
    return `
      <form id="sched-form">
        <div class="form-row">
          <div class="form-group"><label>יום</label><select name="day">${dayOpts}</select></div>
          <div class="form-group"><label>שעה</label><input name="time" type="time" value="${esc(existing?.time || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>סוג</label><select name="type">${typeOpts}</select></div>
          <div class="form-group"><label>מי</label><select name="who">${whoOpts}</select></div>
        </div>
        <div class="form-group">
          <label>תיאור (אופציונלי)</label>
          <input name="title" value="${esc(existing?.title || '')}" placeholder="למשל: פילאטיס עם דנה">
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">${existing ? 'עדכן' : 'הוסף'}</button>
        </div>
      </form>`;
  }

  return { DAYS, TYPES, list, add, update, remove, todayItems, renderToday, render, openForm };
})();
if (typeof window !== "undefined") window.Schedule = Schedule;
