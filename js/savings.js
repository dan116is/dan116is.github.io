// Family savings goals: target amount + accumulated, with progress and a log
// of deposits. Stored in DB under 'savings'.
const Savings = (() => {
  const KEY = DB.KEYS.savings;

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, { saved: 0, deposits: [], ...data }); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }

  function deposit(id, amount) {
    const g = DB.findById(KEY, id);
    if (!g) return;
    const amt = Number(amount) || 0;
    const deposits = (g.deposits || []).concat([{ amount: amt, ts: Date.now() }]);
    update(id, { saved: Math.max(0, (Number(g.saved) || 0) + amt), deposits });
  }

  function fmt(n) { return '₪' + (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render(container) {
    const items = list();
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🐷</div><p>אין יעדי חיסכון. הוסף את הראשון!</p></div>`;
      return;
    }
    container.innerHTML = items.map((g) => {
      const target = Number(g.target) || 0;
      const saved = Number(g.saved) || 0;
      const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      const full = target > 0 && saved >= target;
      return `
        <div class="savings-card">
          <div class="savings-head">
            <span class="savings-title">${g.emoji || '🎯'} ${esc(g.title)}</span>
            <button class="icon-btn" data-savings-del="${g.id}" title="מחק">🗑</button>
          </div>
          <div class="savings-amounts"><b>${fmt(saved)}</b> מתוך ${fmt(target)}${full ? ' 🎉' : ''}</div>
          <div class="savings-bar"><div class="savings-bar-fill ${full ? 'full' : ''}" style="width:${pct}%"></div></div>
          <div class="savings-actions">
            <button class="ghost-btn" data-savings-add="${g.id}" data-amt="50">+50</button>
            <button class="ghost-btn" data-savings-add="${g.id}" data-amt="100">+100</button>
            <button class="ghost-btn" data-savings-add="${g.id}" data-amt="200">+200</button>
            <button class="primary-btn" data-savings-custom="${g.id}">+ סכום</button>
          </div>
        </div>`;
    }).join('');
  }

  function openForm() {
    return `
      <form id="savings-form">
        <div class="form-group"><label>שם היעד *</label><input name="title" required placeholder="לדוגמה: חופשה משפחתית"></div>
        <div class="form-row">
          <div class="form-group"><label>סכום יעד ₪ *</label><input name="target" type="number" inputmode="numeric" min="1" required placeholder="5000"></div>
          <div class="form-group"><label>אימוג׳י</label><input name="emoji" value="🐷" maxlength="2"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">צור יעד</button>
        </div>
      </form>`;
  }

  return { list, add, update, remove, deposit, fmt, render, openForm };
})();
if (typeof window !== "undefined") window.Savings = Savings;
