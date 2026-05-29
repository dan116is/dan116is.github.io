const Shopping = (() => {
  const KEY = DB.KEYS.shopping;
  const CATEGORIES = ['מזון', 'ירקות ופירות', 'ניקיון', 'טיפוח', 'תרופות', 'אחר'];

  function list() { return DB.list(KEY); }

  function activeCount() {
    return list().filter((i) => !i.bought).length;
  }

  function add(name, category = 'מזון', qty = '') {
    const trimmed = name.trim();
    if (!trimmed) return null;
    return DB.add(KEY, {
      name: trimmed,
      category: category || 'אחר',
      qty,
      bought: false
    });
  }

  function toggle(id) {
    const it = DB.findById(KEY, id);
    if (!it) return;
    DB.update(KEY, id, { bought: !it.bought, boughtAt: !it.bought ? Date.now() : null });
  }

  function remove(id) { DB.remove(KEY, id); }

  function clearBought() {
    const remaining = list().filter((i) => !i.bought);
    DB.save(KEY, remaining);
  }

  function render(container) {
    const items = list();
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>הרשימה ריקה. הוסף פריט ראשון!</p></div>`;
      return;
    }

    const groups = {};
    for (const it of items) {
      const cat = it.category || 'אחר';
      groups[cat] = groups[cat] || [];
      groups[cat].push(it);
    }

    container.innerHTML = Object.keys(groups).sort((a, b) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b)).map((cat) => {
      const sorted = groups[cat].slice().sort((a, b) => Number(a.bought) - Number(b.bought));
      return `
        <div class="group">
          <div class="group-title">${escape(cat)} (${groups[cat].filter((i) => !i.bought).length})</div>
          ${sorted.map((it) => `
            <div class="item-card ${it.bought ? 'done' : ''}">
              <button class="item-check ${it.bought ? 'checked' : ''}" data-shop-toggle="${it.id}" aria-label="סמן"></button>
              <div class="item-main">
                <div class="item-title">${escape(it.name)} ${it.qty ? `<span style="color:var(--text-muted);font-weight:400;">· ${escape(it.qty)}</span>` : ''}</div>
              </div>
              <div class="item-actions">
                <button class="icon-btn" data-shop-del="${it.id}" title="מחק">🗑</button>
              </div>
            </div>
          `).join('')}
        </div>`;
    }).join('');
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { CATEGORIES, list, activeCount, add, toggle, remove, clearBought, render };
})();
if (typeof window !== "undefined") window.Shopping = Shopping;
