// Dashboard layout: per-user widget visibility, order, and size.
// Reorders/hides/resizes [data-widget] blocks inside #view-dashboard based on a
// saved config. Content-empty widgets that set their own `hidden`
// (meds/meal/maint/events) still respect that.
const DashLayout = (() => {
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
    { id: 'events', label: 'אירועים מתקרבים', emoji: '🎂' },
    { id: 'budget', label: 'תקציב החודש', emoji: '💰' },
    { id: 'actions', label: 'פעולות מהירות', emoji: '⚡' }
  ];
  const SIZES = ['full', 'half'];

  function defaultOrder() { return WIDGETS.map((w) => w.id); }

  function cfg() {
    const c = DB.getSettings().dashLayout || {};
    return { order: c.order || defaultOrder(), hidden: c.hidden || {}, sizes: c.sizes || {} };
  }
  function save(c) { DB.setSetting('dashLayout', c); }

  function isHidden(id) { return !!cfg().hidden[id]; }
  function toggle(id) { const c = cfg(); c.hidden[id] = !c.hidden[id]; save(c); apply(); }

  function sizeOf(id) { return cfg().sizes[id] || 'full'; }
  function cycleSize(id) {
    const c = cfg();
    const cur = c.sizes[id] || 'full';
    const next = SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length];
    c.sizes[id] = next; save(c); apply();
    return next;
  }
  function setSize(id, size) { const c = cfg(); c.sizes[id] = size; save(c); apply(); }

  function move(id, dir) {
    const c = cfg();
    const order = orderedIds(c);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    c.order = order; save(c); apply();
  }

  // Persist an explicit order (e.g. from drag-and-drop in the DOM).
  function setOrder(ids) {
    const c = cfg();
    const known = defaultOrder();
    c.order = ids.filter((id) => known.includes(id));
    save(c); apply();
  }

  function orderedIds(c) {
    c = c || cfg();
    const known = defaultOrder();
    const seen = new Set();
    const out = [];
    for (const id of c.order) if (known.includes(id) && !seen.has(id)) { out.push(id); seen.add(id); }
    for (const id of known) if (!seen.has(id)) out.push(id);
    return out;
  }

  function apply() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    const c = cfg();
    const order = orderedIds(c);
    const map = {};
    view.querySelectorAll('[data-widget]').forEach((el) => { map[el.dataset.widget] = el; });
    for (const id of order) { const el = map[id]; if (el) view.appendChild(el); }
    for (const w of WIDGETS) {
      const el = map[w.id];
      if (!el) continue;
      el.classList.toggle('user-hidden', !!c.hidden[w.id]);
      el.classList.toggle('size-half', (c.sizes[w.id] || 'full') === 'half');
      el.classList.toggle('size-full', (c.sizes[w.id] || 'full') === 'full');
    }
  }

  function meta() { return WIDGETS; }

  return { WIDGETS, meta, cfg, isHidden, toggle, sizeOf, cycleSize, setSize, move, setOrder, orderedIds, apply, defaultOrder };
})();
if (typeof window !== "undefined") window.DashLayout = DashLayout;
