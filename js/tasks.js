const Tasks = (() => {
  const KEY = DB.KEYS.tasks;
  const PRIORITIES = ['נמוכה', 'רגילה', 'גבוהה'];
  const REPEATS = [
    { id: '', label: 'לא חוזר' },
    { id: 'daily', label: 'כל יום' },
    { id: 'weekly', label: 'כל שבוע' },
    { id: 'monthly', label: 'כל חודש' }
  ];

  function repeatLabel(id) { const r = REPEATS.find((x) => x.id === id); return r ? r.label : ''; }

  // Given a YYYY-MM-DD and a repeat id, return the next occurrence date.
  function nextDate(dateStr, repeat) {
    const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    if (repeat === 'daily') base.setDate(base.getDate() + 1);
    else if (repeat === 'weekly') base.setDate(base.getDate() + 7);
    else if (repeat === 'monthly') base.setMonth(base.getMonth() + 1);
    else return null;
    const p = (n) => String(n).padStart(2, '0');
    return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}`;
  }

  function list() { return DB.list(KEY); }

  function activeCount() {
    return list().filter((t) => !t.done).length;
  }

  function overdueCount() {
    const now = startOfDay();
    return list().filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < now).length;
  }

  function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function add(data) {
    const items = list();
    const order = items.length ? Math.min(...items.map((t) => t.order ?? 0)) - 1 : 0;
    const created = DB.add(KEY, { done: false, priority: 'רגילה', tags: [], subtasks: [], order, ...data });
    if (typeof Activity !== 'undefined' && created) Activity.record('נוספה משימה: ' + created.title, '📋');
    return created;
  }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) {
    const t = DB.findById(KEY, id);
    DB.remove(KEY, id);
    if (typeof Activity !== 'undefined' && t) Activity.record('נמחקה משימה: ' + t.title, '🗑️');
  }

  // All tags currently in use (for filtering/autocomplete).
  function allTags() {
    const set = new Set();
    list().forEach((t) => (t.tags || []).forEach((g) => set.add(g)));
    return Array.from(set);
  }

  // Subtask helpers.
  function toggleSub(taskId, subId) {
    const t = DB.findById(KEY, taskId);
    if (!t || !t.subtasks) return;
    const subs = t.subtasks.map((s) => s.id === subId ? { ...s, done: !s.done } : s);
    DB.update(KEY, taskId, { subtasks: subs });
  }

  // Manual reorder: set explicit order values from an ordered id list.
  function reorder(ids) {
    const items = list();
    ids.forEach((id, i) => {
      const t = items.find((x) => x.id === id);
      if (t) DB.update(KEY, id, { order: i });
    });
  }
  function toggle(id) {
    const t = DB.findById(KEY, id);
    if (!t) return;
    const willComplete = !t.done;
    DB.update(KEY, id, { done: !t.done, doneAt: !t.done ? Date.now() : null });
    if (willComplete && typeof Activity !== 'undefined') Activity.record('הושלמה משימה: ' + t.title, '✅');
    // Completing a recurring task spawns its next occurrence automatically.
    if (willComplete && t.repeat) {
      const nd = nextDate(t.dueDate || todayKey(), t.repeat);
      if (nd) add({ title: t.title, dueDate: nd, priority: t.priority, forWhom: t.forWhom, notes: t.notes, repeat: t.repeat });
    }
  }

  function checkAlerts(notify) {
    const today = todayKey();
    const now = new Date();
    const hour = now.getHours();
    const nowMin = hour * 60 + now.getMinutes();
    for (const t of list()) {
      if (t.done) continue;
      // Timed task: alert within a 5-minute window of its time.
      if (t.dueDate === today && t.dueTime) {
        const [h, m] = t.dueTime.split(':').map(Number);
        const dueMin = h * 60 + m;
        if (nowMin >= dueMin && nowMin < dueMin + 5) {
          notify('⏰ ' + t.title, { body: `הגיע הזמן (${t.dueTime})`, tag: 'task-time-' + t.id });
        }
        continue;
      }
      if (hour < 8 || hour > 22) continue;
      if (t.dueDate === today) {
        notify('משימה להיום', { body: t.title, tag: 'task-' + t.id });
      } else if (t.dueDate && t.dueDate < today) {
        notify('משימה באיחור', { body: t.title, tag: 'task-late-' + t.id });
      }
    }
  }

  function render(container, filter = 'all', tagFilter = '') {
    const all = list();
    const today = todayKey();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndKey = weekEnd.toISOString().slice(0, 10);

    let filtered = all;
    if (filter === 'today') filtered = all.filter((t) => !t.done && t.dueDate === today);
    else if (filter === 'week') filtered = all.filter((t) => !t.done && t.dueDate && t.dueDate <= weekEndKey);
    else if (filter === 'overdue') filtered = all.filter((t) => !t.done && t.dueDate && t.dueDate < today);
    else if (filter === 'done') filtered = all.filter((t) => t.done);
    else filtered = all.filter((t) => !t.done);

    if (tagFilter) filtered = filtered.filter((t) => (t.tags || []).includes(tagFilter));

    const manual = !filter || filter === 'all';
    filtered = filtered.slice().sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done);
      // In the default "all" view, honor manual drag order first.
      if (manual && (a.order != null || b.order != null)) return (a.order ?? 0) - (b.order ?? 0);
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      if (ad !== bd) return ad < bd ? -1 : 1;
      const at = a.dueTime || '99:99', bt = b.dueTime || '99:99';
      if (at !== bt) return at < bt ? -1 : 1;
      return PRIORITIES.indexOf(b.priority || 'רגילה') - PRIORITIES.indexOf(a.priority || 'רגילה');
    });

    // Tag filter chips at the top.
    const tags = allTags();
    const chipsHtml = tags.length ? `<div class="tag-filter">
      <button class="tagchip ${!tagFilter ? 'active' : ''}" data-tagfilter="">הכל</button>
      ${tags.map((g) => `<button class="tagchip ${tagFilter === g ? 'active' : ''}" data-tagfilter="${escape(g)}">#${escape(g)}</button>`).join('')}
    </div>` : '';

    if (filtered.length === 0) {
      const messages = {
        today: 'אין משימות להיום! 🎉',
        week: 'אין משימות השבוע',
        overdue: 'אין משימות באיחור 👍',
        done: 'עדיין לא השלמת משימות',
        all: 'אין משימות פתוחות. הוסף משימה ראשונה!'
      };
      container.innerHTML = chipsHtml + `<div class="empty-state"><div class="icon">📋</div><p>${messages[filter] || messages.all}</p></div>`;
      return;
    }

    container.innerHTML = chipsHtml + `<div class="task-sortable" data-sortable="${manual && !tagFilter ? '1' : ''}">` + filtered.map((t) => {
      const isOverdue = !t.done && t.dueDate && t.dueDate < today;
      const isToday = !t.done && t.dueDate === today;
      const tm = t.dueTime ? ' · ' + t.dueTime : '';
      const dueText = t.dueDate
        ? (isOverdue ? `באיחור · ${formatDate(t.dueDate)}${tm}` : isToday ? `היום${tm}` : `${formatDate(t.dueDate)}${tm}`)
        : (t.dueTime ? t.dueTime : '');
      const cardClass = isOverdue ? 'danger' : isToday ? 'warning' : '';
      const tags = [];
      if (dueText) tags.push(`<span class="tag ${isOverdue ? 'danger' : isToday ? 'warning' : ''}">${dueText}</span>`);
      if (t.priority && t.priority !== 'רגילה') tags.push(`<span class="tag ${t.priority === 'גבוהה' ? 'danger' : ''}">${t.priority}</span>`);
      if (t.repeat) tags.push(`<span class="tag">🔁 ${repeatLabel(t.repeat)}</span>`);
      if (t.forWhom) tags.push(`<span class="tag">${escape(t.forWhom)}</span>`);
      (t.tags || []).forEach((g) => tags.push(`<span class="tag tag-hash">#${escape(g)}</span>`));

      const subs = t.subtasks || [];
      const doneSubs = subs.filter((s) => s.done).length;
      const subsHtml = subs.length ? `
        <div class="subtasks">
          ${subs.map((s) => `
            <div class="subtask ${s.done ? 'done' : ''}">
              <button class="subcheck ${s.done ? 'checked' : ''}" data-sub-toggle="${t.id}:${s.id}" aria-label="סמן"></button>
              <span>${escape(s.text)}</span>
            </div>`).join('')}
        </div>` : '';

      return `
        <div class="item-card ${t.done ? 'done' : ''} ${cardClass}" data-task-id="${t.id}">
          <button class="item-check ${t.done ? 'checked' : ''}" data-task-toggle="${t.id}" aria-label="סמן"></button>
          <div class="item-main">
            <div class="item-title">${escape(t.title)}${subs.length ? ` <span class="sub-count">${doneSubs}/${subs.length}</span>` : ''}</div>
            ${t.notes ? `<div class="item-sub" style="margin-top:4px;">${escape(t.notes)}</div>` : ''}
            ${tags.length ? `<div class="item-sub">${tags.join('')}</div>` : ''}
            ${subsHtml}
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-task-edit="${t.id}" title="ערוך">✎</button>
            <button class="icon-btn" data-task-del="${t.id}" title="מחק">🗑</button>
          </div>
        </div>`;
    }).join('') + `</div>`;
  }

  function formatDate(s) {
    const d = new Date(s);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openForm(existing) {
    const family = DB.list(DB.KEYS.family);
    const familyOpts = ['', ...family.map((f) => f.name)]
      .map((n) => `<option value="${escape(n)}" ${existing && existing.forWhom === n ? 'selected' : ''}>${n ? escape(n) : '—'}</option>`)
      .join('');
    const priorityOpts = PRIORITIES
      .map((p) => `<option value="${p}" ${(existing?.priority || 'רגילה') === p ? 'selected' : ''}>${p}</option>`)
      .join('');
    return `
      <form id="task-form">
        <div class="form-group">
          <label>כותרת *</label>
          <input name="title" required value="${escape(existing?.title || '')}" placeholder="מה צריך לעשות?">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>תאריך יעד</label>
            <input name="dueDate" type="date" value="${existing?.dueDate || ''}">
          </div>
          <div class="form-group">
            <label>שעה 🕐</label>
            <input name="dueTime" type="time" value="${existing?.dueTime || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>עדיפות</label>
            <select name="priority">${priorityOpts}</select>
          </div>
          <div class="form-group">
            <label>חזרה 🔁</label>
            <select name="repeat">${REPEATS.map((r) => `<option value="${r.id}" ${(existing?.repeat || '') === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group">
          <label>עבור</label>
          <select name="forWhom">${familyOpts}</select>
        </div>
        <div class="form-group">
          <label>תגיות 🏷️ (מופרדות בפסיק)</label>
          <input name="tags" value="${escape((existing?.tags || []).join(', '))}" placeholder="עבודה, בית, דחוף">
        </div>
        <div class="form-group">
          <label>תת-משימות ☑️ (שורה לכל אחת)</label>
          <textarea name="subtasks" rows="3" placeholder="להתקשר&#10;לשלוח מייל&#10;לאשר">${escape((existing?.subtasks || []).map((s) => s.text).join('\n'))}</textarea>
        </div>
        <div class="form-group">
          <label>הערות</label>
          <textarea name="notes" rows="2">${escape(existing?.notes || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">${existing ? 'עדכן' : 'הוסף'}</button>
        </div>
      </form>`;
  }

  // Convert raw form fields (comma tags, newline subtasks) into model shapes.
  function parseFormData(data, existing) {
    const out = { ...data };
    out.tags = String(data.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
    const lines = String(data.subtasks || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const prev = (existing && existing.subtasks) || [];
    out.subtasks = lines.map((text, i) => {
      const old = prev.find((p) => p.text === text);
      return { id: (old && old.id) || (Date.now().toString(36) + i), text, done: old ? old.done : false };
    });
    return out;
  }

  return { list, activeCount, overdueCount, add, update, remove, toggle, toggleSub, reorder, allTags, checkAlerts, render, openForm, parseFormData, REPEATS, repeatLabel, nextDate };
})();
if (typeof window !== "undefined") window.Tasks = Tasks;
