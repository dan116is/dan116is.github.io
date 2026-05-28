const Budget = (() => {
  const KEY = DB.KEYS.expenses;
  const BKEY = DB.KEYS.budgets;
  const CATEGORIES = ['מזון וקניות', 'דיור', 'תחבורה', 'חינוך', 'בריאות', 'בידור', 'ביגוד', 'חשבונות', 'אחר'];

  function list() { return DB.list(KEY); }

  function monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function inMonth(exp, mKey) {
    return exp.date && exp.date.startsWith(mKey);
  }

  function totalForMonth(mKey) {
    return list().filter((e) => inMonth(e, mKey)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }

  function byCategory(mKey) {
    const items = list().filter((e) => inMonth(e, mKey));
    const result = {};
    for (const it of items) {
      const cat = it.category || 'אחר';
      result[cat] = (result[cat] || 0) + (Number(it.amount) || 0);
    }
    return result;
  }

  function getBudget(mKey) {
    const budgets = DB.list(BKEY);
    const found = budgets.find((b) => b.month === mKey);
    return found ? Number(found.limit) || 0 : 0;
  }

  function setBudget(mKey, limit) {
    const budgets = DB.list(BKEY);
    const idx = budgets.findIndex((b) => b.month === mKey);
    const value = Number(limit) || 0;
    if (idx >= 0) {
      budgets[idx].limit = value;
    } else {
      budgets.push({ id: mKey, month: mKey, limit: value });
    }
    DB.save(BKEY, budgets);
  }

  function add(data) {
    return DB.add(KEY, {
      date: data.date || new Date().toISOString().slice(0, 10),
      category: data.category || 'אחר',
      ...data
    });
  }

  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }

  function format(n) {
    return '₪' + (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 });
  }

  function renderSummary(mKey) {
    const total = totalForMonth(mKey);
    const limit = getBudget(mKey);
    const left = limit - total;
    const pct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;

    document.getElementById('budget-total').textContent = format(total);
    document.getElementById('budget-left').textContent = format(left);
    document.getElementById('budget-left').style.color = left < 0 ? 'var(--danger)' : '';

    const limitInput = document.getElementById('budget-limit');
    if (document.activeElement !== limitInput) {
      limitInput.value = limit || '';
    }

    const fill = document.getElementById('budget-bar-fill');
    fill.style.width = pct + '%';
    fill.className = 'budget-bar-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
  }

  function renderCategories(mKey) {
    const container = document.getElementById('budget-categories');
    const byCat = byCategory(mKey);
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = '';
      return;
    }
    const max = entries[0][1];
    container.innerHTML = entries.map(([cat, amount]) => {
      const pct = max > 0 ? (amount / max) * 100 : 0;
      return `
        <div class="cat-row">
          <div class="cat-row-head">
            <span class="cat-name">${escape(cat)}</span>
            <span class="cat-amount">${format(amount)}</span>
          </div>
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
  }

  function renderList(mKey) {
    const container = document.getElementById('expense-list');
    const items = list().filter((e) => inMonth(e, mKey)).sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 50);
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">💰</div><p>אין הוצאות לחודש הזה</p></div>`;
      return;
    }
    container.innerHTML = items.map((e) => `
      <div class="item-card">
        <div class="item-main">
          <div class="item-title">${escape(e.title || e.category)}</div>
          <div class="item-sub">
            <span class="tag">${escape(e.category)}</span>
            <span>${formatDate(e.date)}</span>
          </div>
        </div>
        <div class="item-value">${format(e.amount)}</div>
        <div class="item-actions">
          <button class="icon-btn" data-exp-edit="${e.id}" title="ערוך">✎</button>
          <button class="icon-btn" data-exp-del="${e.id}" title="מחק">🗑</button>
        </div>
      </div>
    `).join('');
  }

  function formatDate(s) {
    return new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openForm(existing) {
    const catOpts = CATEGORIES
      .map((c) => `<option value="${c}" ${(existing?.category || 'מזון וקניות') === c ? 'selected' : ''}>${c}</option>`)
      .join('');
    return `
      <form id="expense-form">
        <div class="form-group">
          <label>תיאור</label>
          <input name="title" value="${escape(existing?.title || '')}" placeholder="למשל: רמי לוי">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>סכום ₪ *</label>
            <input name="amount" type="number" inputmode="decimal" required step="0.01" min="0" value="${existing?.amount ?? ''}" placeholder="0">
          </div>
          <div class="form-group">
            <label>קטגוריה</label>
            <select name="category">${catOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label>תאריך</label>
          <input name="date" type="date" value="${existing?.date || new Date().toISOString().slice(0, 10)}" required>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">${existing ? 'עדכן' : 'הוסף'}</button>
        </div>
      </form>`;
  }

  return {
    CATEGORIES, list, add, update, remove,
    totalForMonth, byCategory, getBudget, setBudget, monthKey,
    renderSummary, renderCategories, renderList, openForm, format
  };
})();
