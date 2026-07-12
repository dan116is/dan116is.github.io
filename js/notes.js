// Family notes — a quick shared sticky-notes board. Add a short note, it sticks
// on the dashboard for the whole family; tap × to remove.
const Notes = (() => {
  const KEY = DB.KEYS.notes;
  const COLORS = ['#FFE08A', '#B6E3A7', '#A7D8F0', '#F5B7C7', '#D7C3F2', '#FFC9A3'];

  function list() { return DB.list(KEY).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0)); }
  function add(text) {
    const t = (text || '').trim();
    if (!t) return null;
    const color = COLORS[DB.list(KEY).length % COLORS.length];
    const created = DB.add(KEY, { text: t, color, pinned: false });
    if (typeof Activity !== 'undefined' && created) Activity.record('נוסף פתק: ' + t.slice(0, 30), '📌');
    return created;
  }
  function remove(id) { DB.remove(KEY, id); }
  function togglePin(id) { const n = DB.findById(KEY, id); if (n) DB.update(KEY, id, { pinned: !n.pinned }); }

  return { KEY, list, add, remove, togglePin };
})();
if (typeof window !== 'undefined') window.Notes = Notes;
