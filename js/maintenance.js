// Recurring maintenance reminders (car service, test/MOT, insurance, home
// filters, etc.). Each item has an interval in months and a "last done" date;
// the next-due date is computed and surfaced as a countdown + reminder.
const Maintenance = (() => {
  const KEY = DB.KEYS.maintenance;

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, data); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayMid() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  function nextDate(it) {
    if (!it.lastDone) return null;
    const [y, m, d] = it.lastDone.split('-').map(Number);
    const months = Number(it.intervalMonths) || 0;
    const nd = new Date(y, (m - 1) + months, d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  }
  function daysUntil(it) {
    const nd = nextDate(it);
    if (!nd) return Infinity;
    return Math.round((nd - todayMid()) / 86400000);
  }
  // Mark as just done today -> resets the cycle.
  function markDone(id) {
    const d = todayMid();
    update(id, { lastDone: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` });
  }

  function statusOf(it) {
    const d = daysUntil(it);
    if (d === Infinity) return { level: '', text: 'לא הוגדר תאריך' };
    if (d < 0) return { level: 'danger', text: `באיחור ${-d} ימים` };
    if (d === 0) return { level: 'danger', text: 'היום!' };
    if (d <= 14) return { level: 'warning', text: `בעוד ${d} ימים` };
    if (d <= 31) return { level: 'warning', text: `בעוד ${Math.round(d / 7)} שבועות` };
    return { level: 'success', text: `בעוד כ-${Math.round(d / 30)} חודשים` };
  }

  // Items due within `days`, soonest first (for dashboard/notifications).
  function dueSoon(days = 21) {
    return list().map((it) => ({ it, d: daysUntil(it) }))
      .filter((x) => x.d !== Infinity && x.d <= days)
      .sort((a, b) => a.d - b.d);
  }

  function seedSets() {
    return [
      { title: 'טיפול לרכב', emoji: '🚗', intervalMonths: 4 },
      { title: 'טסט שנתי לרכב', emoji: '🔧', intervalMonths: 12 },
      { title: 'ביטוח רכב', emoji: '📄', intervalMonths: 12 },
      { title: 'החלפת מסנן מים', emoji: '🚰', intervalMonths: 6 }
    ];
  }
  function ensureSeed() {
    if (DB.getSettings().maintSeeded) return;
    for (const s of seedSets()) add({ ...s, lastDone: '' });
    DB.setSetting('maintSeeded', true);
  }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmt(d) { return d ? d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'; }

  function checkAlerts(notify) {
    const hour = new Date().getHours();
    if (hour < 8 || hour > 22) return;
    for (const { it, d } of dueSoon(14)) {
      if (d <= 0) notify('תחזוקה דחופה', { body: `${it.title} — ${statusOf(it).text}`, tag: 'maint-' + it.id });
      else notify('תחזוקה מתקרבת', { body: `${it.title} — בעוד ${d} ימים`, tag: 'maintw-' + it.id });
    }
  }

  function render(container) {
    const items = list().slice().sort((a, b) => daysUntil(a) - daysUntil(b));
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔧</div><p>אין פריטי תחזוקה. הוסף את הראשון!</p></div>`;
      return;
    }
    container.innerHTML = items.map((it) => {
      const s = statusOf(it);
      return `
        <div class="item-card ${s.level === 'danger' ? 'danger' : s.level === 'warning' ? 'warning' : ''}">
          <div class="event-emoji">${it.emoji || '🔧'}</div>
          <div class="item-main">
            <div class="item-title">${esc(it.title)}</div>
            <div class="item-sub">
              <span class="tag ${s.level}">${s.text}</span>
              <span>כל ${esc(String(it.intervalMonths))} חודשים</span>
              <span>הבא: ${fmt(nextDate(it))}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-maint-done="${it.id}" title="בוצע עכשיו">✓</button>
            <button class="icon-btn" data-maint-edit="${it.id}" title="ערוך">✎</button>
            <button class="icon-btn" data-maint-del="${it.id}" title="מחק">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  function openForm(existing) {
    const today = new Date().toISOString().slice(0, 10);
    return `
      <form id="maint-form">
        <div class="form-group">
          <label>מה מתחזקים? *</label>
          <input name="title" required value="${esc(existing?.title || '')}" placeholder="לדוגמה: טיפול לרכב">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>כל כמה חודשים *</label>
            <input name="intervalMonths" type="number" inputmode="numeric" min="1" required value="${existing?.intervalMonths ?? ''}" placeholder="4">
          </div>
          <div class="form-group">
            <label>אימוג׳י</label>
            <input name="emoji" value="${esc(existing?.emoji || '🔧')}" maxlength="2">
          </div>
        </div>
        <div class="form-group">
          <label>בוצע לאחרונה</label>
          <input name="lastDone" type="date" value="${existing?.lastDone || today}">
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">${existing ? 'עדכן' : 'הוסף'}</button>
        </div>
      </form>`;
  }

  return { list, add, update, remove, markDone, ensureSeed, dueSoon, daysUntil, nextDate, statusOf, checkAlerts, render, openForm };
})();
