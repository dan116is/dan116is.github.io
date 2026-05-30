// Dashboard layout: per-user widget visibility + order.
// Reorders/﻿hides [data-widget] blocks inside #view-dashboard based on a saved
// config. "setup" is always shown when relevant; content-empty widgets that set
// their own `hidden` (meds/meal/maint) still respect that.
const DashLayout = (() => {
  // Canonical list with labels + default order. Some are core (can't hide).
  const WIDGETS = [
    { id: 'week', label: 'רצועת שבוע', emoji: '📆' },
    { id: 'glance', label: 'מבט על היום', emoji: '👀' },
    { id: 'monthly', label: 'היעד שלי לחודש', emoji: '🏆' },
    { id: 'weather', label: 'מזג אוויר והלבשה', emoji: '🌤️' },
    { id: 'jewish', label: 'לוח עברי ושבת', emoji: '🕯️' },
    { id: 'beitar', label: 'ביתר ירושלים', emoji: '⚽' },
    { id: 'stats', label: 'כרטיסי סיכום', emoji: '🔢' },
    { id: 'tasks', label: 'משימות היום', emoji: '📋' },
    { id: 'shopping', label: 'רשימת קניות', emoji: '🛒' },
    { id: 'schedule', label: 'הלו״ז של היום', emoji: '🗓️' },
    { id: 'meds', label: 'תרופות לתשומת לב', emoji: '💊' },
    { id: 'meal', label: 'ארוחת הערב', emoji: '🍽️' },
    { id: 'maint', label: 'תחזוקה מתקרבת', emoji: '🔧' },
    { id: 'habits', label: 'הרגלים יומיים', emoji: '🔥' },
    { id: 'goals', label: 'יעדי המשפחה', emoji: '🎯' },
    { id: 'budget', label: 'תקציב החודש', emoji: '💰' },
    { id: 'actions', label: 'פעולות מהירות', emoji: '⚡' }
  ];

  function defaultOrder() { return WIDGETS.map((w) => w.id); }

  function cfg() {
    const c = DB.getSettings().dashLayout || {};
    return { order: c.order || defaultOrder(), hidden: c.hidden || {} };
  }
  function save(c) { DB.setSetting('dashLayout', c); }

  function isHidden(id) { return !!cfg().hidden[id]; }
  function toggle(id) { const c = cfg(); c.hidden[id] = !c.hidden[id]; save(c); apply(); }
  function move(id, dir) {
    const c = cfg();
    const order = orderedIds(c);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    c.order = order;
    save(c); apply();
  }

  // Full ordered id list (config order first, then any new widgets appended).
  function orderedIds(c) {
    c = c || cfg();
    const known = defaultOrder();
    const seen = new Set();
    const out = [];
    for (const id of c.order) if (known.includes(id) && !seen.has(id)) { out.push(id); seen.add(id); }
    for (const id of known) if (!seen.has(id)) out.push(id);
    return out;
  }

  // Apply order + visibility to the live DOM.
  function apply() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    const c = cfg();
    const order = orderedIds(c);
    const map = {};
    view.querySelectorAll('[data-widget]').forEach((el) => { map[el.dataset.widget] = el; });
    // Reorder: append in configured order (skips fixed elements like welcome/smart-bar).
    let anchor = null;
    for (const id of order) {
      const el = map[id];
      if (!el) continue;
      view.appendChild(el); // moves to end in order
    }
    // Visibility (user toggle). Use a dedicated class so it doesn't fight the
    // content-driven `hidden` attribute used by meds/meal/maint.
    for (const w of WIDGETS) {
      const el = map[w.id];
      if (!el) continue;
      el.classList.toggle('user-hidden', !!c.hidden[w.id]);
    }
  }

  function meta() { return WIDGETS; }

  return { WIDGETS, meta, cfg, isHidden, toggle, move, orderedIds, apply, defaultOrder };
})();
if (typeof window !== "undefined") window.DashLayout = DashLayout;
