const Medications = (() => {
  const KEY = DB.KEYS.meds;
  const DAYS_WARN_EXPIRY = 14;
  const STOCK_WARN_DAYS = 7;

  function list() { return DB.list(KEY); }

  function daysUntil(dateStr) {
    if (!dateStr) return Infinity;
    const target = new Date(dateStr + 'T23:59:59');
    return Math.ceil((target - new Date()) / 86400000);
  }

  function daysOfStockLeft(med) {
    const perDay = parseFloat(med.dosesPerDay) || 0;
    const stock = parseFloat(med.stock) || 0;
    if (perDay <= 0) return Infinity;
    return Math.floor(stock / perDay);
  }

  function statusOf(med) {
    const dExp = daysUntil(med.expiryDate);
    const dStock = daysOfStockLeft(med);
    if (dExp < 0) return { level: 'danger', text: 'תוקף פג!' };
    if (dExp <= 3) return { level: 'danger', text: `תוקף בעוד ${dExp} ימים` };
    if (dExp <= DAYS_WARN_EXPIRY) return { level: 'warning', text: `תוקף בעוד ${dExp} ימים` };
    if (dStock <= 0) return { level: 'danger', text: 'אזל המלאי' };
    if (dStock <= STOCK_WARN_DAYS) return { level: 'warning', text: `מלאי ל-${dStock} ימים` };
    return { level: 'success', text: 'תקין' };
  }

  function add(data) { return DB.add(KEY, data); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }

  function takeDose(id) {
    const med = DB.findById(KEY, id);
    if (!med) return;
    const stock = Math.max(0, (parseFloat(med.stock) || 0) - 1);
    DB.update(KEY, id, { stock, lastTakenAt: Date.now() });
  }

  function activeCount() {
    return list().length;
  }

  function alertCount() {
    return list().filter((m) => {
      const s = statusOf(m);
      return s.level === 'warning' || s.level === 'danger';
    }).length;
  }

  function checkAlerts(notify) {
    for (const med of list()) {
      const s = statusOf(med);
      if (s.level === 'danger') {
        notify('תרופה דורשת תשומת לב', { body: `${med.name}: ${s.text}`, tag: 'med-' + med.id });
      } else if (s.level === 'warning' && (new Date().getHours() >= 9 && new Date().getHours() <= 21)) {
        notify('תרופה - שים לב', { body: `${med.name}: ${s.text}`, tag: 'med-' + med.id });
      }
    }
  }

  function render(container, filter = 'all') {
    const items = list().slice().sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
    let filtered = items;
    if (filter === 'expiring') filtered = items.filter((m) => daysUntil(m.expiryDate) <= DAYS_WARN_EXPIRY);
    if (filter === 'low') filtered = items.filter((m) => daysOfStockLeft(m) <= STOCK_WARN_DAYS);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">💊</div><p>${
        items.length === 0 ? 'אין תרופות עדיין. הוסף את התרופה הראשונה!' : 'אין תרופות בקטגוריה הזו'
      }</p></div>`;
      return;
    }

    container.innerHTML = filtered.map((m) => {
      const s = statusOf(m);
      const dStock = daysOfStockLeft(m);
      const stockText = isFinite(dStock) ? `${m.stock || 0} יחידות · ${dStock} ימים` : `${m.stock || 0} יחידות`;
      return `
        <div class="item-card ${s.level === 'danger' ? 'danger' : s.level === 'warning' ? 'warning' : ''}">
          <div class="item-main">
            <div class="item-title">${escape(m.name)} ${m.dose ? `<span style="color:var(--text-muted);font-weight:400;">${escape(m.dose)}</span>` : ''}</div>
            <div class="item-sub">
              <span class="tag ${s.level}">${s.text}</span>
              <span>${stockText}</span>
              ${m.forWhom ? `<span class="tag">${escape(m.forWhom)}</span>` : ''}
              ${m.expiryDate ? `<span>פג: ${formatDate(m.expiryDate)}</span>` : ''}
            </div>
          </div>
          <div class="item-actions">
            <button class="icon-btn" data-med-take="${m.id}" title="לקחתי מנה">✓</button>
            <button class="icon-btn" data-med-edit="${m.id}" title="ערוך">✎</button>
            <button class="icon-btn" data-med-del="${m.id}" title="מחק">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  function formatDate(s) {
    const d = new Date(s);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openForm(existing) {
    const family = DB.list(DB.KEYS.family);
    const familyOpts = ['', ...family.map((f) => f.name)]
      .map((n) => `<option value="${escape(n)}" ${existing && existing.forWhom === n ? 'selected' : ''}>${n ? escape(n) : '—'}</option>`)
      .join('');
    return `
      <form id="med-form">
        <div class="form-group">
          <label>שם התרופה *</label>
          <input name="name" required value="${escape(existing?.name || '')}" placeholder="לדוגמה: אקמול">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>מינון</label>
            <input name="dose" value="${escape(existing?.dose || '')}" placeholder="500mg">
          </div>
          <div class="form-group">
            <label>עבור</label>
            <select name="forWhom">${familyOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>מלאי (יחידות)</label>
            <input name="stock" type="number" inputmode="numeric" min="0" value="${existing?.stock ?? ''}" placeholder="30">
          </div>
          <div class="form-group">
            <label>מנות ביום</label>
            <input name="dosesPerDay" type="number" inputmode="decimal" min="0" step="0.5" value="${existing?.dosesPerDay ?? ''}" placeholder="2">
          </div>
        </div>
        <div class="form-group">
          <label>תאריך תפוגה</label>
          <input name="expiryDate" type="date" value="${existing?.expiryDate || ''}">
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

  return { list, add, update, remove, takeDose, statusOf, activeCount, alertCount, checkAlerts, render, openForm };
})();
if (typeof window !== "undefined") window.Medications = Medications;
