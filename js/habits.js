// Daily habits & water tracking with streaks. State keyed per day (YYYY-MM-DD).
// Habits live in DB under a single 'habits' settings blob to keep it simple.
const Habits = (() => {
  function pad(n) { return String(n).padStart(2, '0'); }
  function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function dayBefore(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d - n);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }

  function all() { return DB.getSettings().habits || []; }
  function save(list) { DB.setSetting('habits', list); }

  function defaults() {
    return [
      { id: 'water', name: 'מים', emoji: '💧', type: 'count', goal: 8, log: {} },
      { id: 'sport', name: 'ספורט', emoji: '🏃', type: 'check', log: {} },
      { id: 'read', name: 'קריאה לילדים', emoji: '📚', type: 'check', log: {} }
    ];
  }

  function ensureSeed() {
    if (!DB.getSettings().habitsSeeded) {
      if (!all().length) save(defaults());
      DB.setSetting('habitsSeeded', true);
    }
  }

  function valueToday(h) { return h.log[today()] || 0; }
  function isDone(h) {
    const v = valueToday(h);
    return h.type === 'count' ? v >= (h.goal || 1) : v >= 1;
  }

  function bump(id, delta) {
    const list = all();
    const h = list.find((x) => x.id === id);
    if (!h) return;
    const k = today();
    const cur = h.log[k] || 0;
    if (h.type === 'count') h.log[k] = Math.max(0, cur + (delta || 1));
    else h.log[k] = cur ? 0 : 1;
    save(list);
  }

  function add(name, emoji, type, goal) {
    const list = all();
    list.push({ id: Date.now().toString(36), name, emoji: emoji || '⭐', type: type || 'check', goal: goal || 1, log: {} });
    save(list);
  }
  function remove(id) { save(all().filter((x) => x.id !== id)); }

  // Consecutive days (ending today or yesterday) the habit goal was met.
  function streak(h) {
    let n = 0;
    let k = today();
    // allow today to be incomplete without breaking an existing streak
    if (!metOn(h, k)) k = dayBefore(today(), 1);
    while (metOn(h, k)) { n++; k = dayBefore(k, 1); }
    return n;
  }
  function metOn(h, key) {
    const v = h.log[key] || 0;
    return h.type === 'count' ? v >= (h.goal || 1) : v >= 1;
  }

  return { all, ensureSeed, valueToday, isDone, bump, add, remove, streak, today };
})();
if (typeof window !== "undefined") window.Habits = Habits;
