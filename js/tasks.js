const Tasks = (() => {
  const KEY = DB.KEYS.tasks;
  const PRIORITIES = ['נמוכה', 'רגילה', 'גבוהה'];

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

  function add(data) { return DB.add(KEY, { done: false, priority: 'רגילה', ...data }); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }
  function toggle(id) {
    const t = DB.findById(KEY, id);
    if (!t) return;
    DB.update(KEY, id, { done: !t.done, doneAt: !t.done ? Date.now() : null });
  }

  function checkAlerts(notify) {
    const today = todayKey();
    const hour = new Date().getHours();
    if (hour < 8 || hour > 22) return;
    for (const t of list()) {
      if (t.done) continue;
      if (t.dueDate === today) {
        notify('משימה להיום', { body: t.title, tag: 'task-' + t.id });
      } else if (t.dueDate && t.dueDate < today) {
        notify('משימה באיחור', { body: t.title, tag: 'task-late-' + t.id });
      }
    }
  }

  function render(container, filter = 'all') {
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

    filtered = filtered.slice().sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done);
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return PRIORITIES.indexOf(b.priority || 'רגילה') - PRIORITIES.indexOf(a.priority || 'רגילה');
    });

    if (filtered.length === 0) {
      const messages = {
        today: 'אין משימות להיום! 🎉',
        week: 'אין משימות השבוע',
        overdue: 'אין משימות באיחור 👍',
        done: 'עדיין לא השלמת משימות',
        all: 'אין משימות פתוחות. הוסף משימה ראשונה!'
      };
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>${messages[filter] || messages.all}</p></div>`;
      return;
    }

    container.innerHTML = filtered.map((t) => {
      const isOverdue = !t.done && t.dueDate && t.dueDate < today;
      const isToday = !t.done && t.dueDate === today;
      const dueText = t.dueDate
        ? (isOverdue ? `באיחור · ${formatDate(t.dueDate)}` : isToday ? 'היום' : formatDate(t.dueDate))
        : '';
      const cardClass = isOverdue ? 'danger' : isToday ? 'warning' : '';
      const tags = [];
      if (dueText) tags.push(`<span class="tag ${isOverdue ? 'danger' : isToday ? 'warning' : ''}">${dueText}</span>`);
      if (t.priority && t.priority !== 'רגילה') tags.push(`<span class="tag ${t.priority === 'גבוהה' ? 'danger' : ''}">${t.priority}</span>`);
      if (t.forWhom) tags.push(`<span class="tag">${escape(t.forWhom)}</span>`);

      return `
        <div class="item-card ${t.done ? 'done' : ''} ${cardClass}">
          <button class="item-check ${t.done ? 'checked' : ''}" data-task-toggle="${t.id}" aria-label="סמן"></button>
          <div class="item-main">
            <div class="item-title">${escape(t.title)}</div>
            ${t.notes ? `<div class="item-sub" style="margin-top:4px;">${escape(t.notes)}</div>` : ''}
            ${tags.length ? `<div class="item-sub">${tags.join('')}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-task-edit="${t.id}" title="ערוך">✎</button>
            <button class="icon-btn" data-task-del="${t.id}" title="מחק">🗑</button>
          </div>
        </div>`;
    }).join('');
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
            <label>עדיפות</label>
            <select name="priority">${priorityOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label>עבור</label>
          <select name="forWhom">${familyOpts}</select>
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

  return { list, activeCount, overdueCount, add, update, remove, toggle, checkAlerts, render, openForm };
})();
