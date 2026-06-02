// Transparent family activity feed. A shared, append-only log of "what changed"
// across the family — what was added, completed, or removed — so when anyone
// opens the app they immediately see what happened since they last looked.
//
// The log itself lives in a synced DB collection (DB.KEYS.activity) so every
// family member sees everyone else's actions. "Seen" state stays LOCAL per
// device (in settings) — each person has their own unseen set.
const Activity = (() => {
  const KEY = DB.KEYS.activity;
  const CAP = 60;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // A stable per-device id. Sync sets one too (same settings key); if it's
  // missing (sync never enabled) we create our own so "seen" still works.
  function deviceId() {
    let id = DB.getSettings().deviceId;
    if (!id) { id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); DB.setSetting('deviceId', id); }
    return id;
  }

  function ownerName() { return (DB.getSettings().ownerName || '').trim() || 'מישהו'; }

  function all() { return DB.list(KEY); }

  // Newest-first list.
  function sorted() { return all().slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)); }

  // Append an event. Entry: {id, ts, who, icon, text}. Caps the log.
  // Self-authored entries are immediately marked seen for this device (you
  // don't need a banner telling you what you just did).
  function record(text, icon) {
    const t = String(text || '').trim();
    if (!t) return null;
    const entry = {
      id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      who: ownerName(),
      icon: icon || '•',
      text: t
    };
    const items = all();
    items.push(entry);
    // Keep only the most recent CAP entries.
    const trimmed = items.sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(-CAP);
    DB.save(KEY, trimmed);
    // Don't surface your own action to yourself.
    markSeenIds([entry.id], deviceId());
    return entry;
  }

  function recent(n = 10) { return sorted().slice(0, n); }

  // ----- per-device "seen" state (local only, in settings) -----
  function seenMap() {
    const m = DB.getSettings().activitySeen;
    return (m && typeof m === 'object') ? m : {};
  }
  function seenSet(dev) {
    const arr = seenMap()[dev || deviceId()];
    return new Set(Array.isArray(arr) ? arr : []);
  }
  function markSeenIds(ids, dev) {
    const d = dev || deviceId();
    const map = seenMap();
    const set = new Set(Array.isArray(map[d]) ? map[d] : []);
    ids.forEach((id) => set.add(id));
    // Keep the seen list bounded to the ids that still exist in the log.
    const live = new Set(all().map((e) => e.id));
    map[d] = Array.from(set).filter((id) => live.has(id));
    DB.setSetting('activitySeen', map);
  }

  // Entries this device hasn't seen yet (newest-first).
  function unseen(dev) {
    const set = seenSet(dev);
    return sorted().filter((e) => !set.has(e.id));
  }

  function markAllSeen(dev) {
    markSeenIds(all().map((e) => e.id), dev);
  }

  function timeAgo(ts) {
    const diff = Date.now() - (ts || 0);
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'עכשיו';
    if (min < 60) return `לפני ${min} ד׳`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `לפני ${hr} ש׳`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'אתמול';
    return `לפני ${day} ימים`;
  }

  // Render a full feed list into a container element.
  function render(container, n = 30) {
    if (!container) return;
    const items = recent(n);
    if (!items.length) {
      container.innerHTML = `<div class="dash-empty">אין עדיין פעילות משפחתית</div>`;
      return;
    }
    const seen = seenSet();
    container.innerHTML = items.map((e) => `
      <div class="act-row ${seen.has(e.id) ? '' : 'unseen'}">
        <span class="act-ico">${esc(e.icon || '•')}</span>
        <span class="act-body">
          <span class="act-text">${esc(e.text)}</span>
          <span class="act-meta">${esc(e.who || 'מישהו')} · ${esc(timeAgo(e.ts))}</span>
        </span>
      </div>`).join('');
  }

  return { record, recent, unseen, markAllSeen, render, deviceId, all };
})();
if (typeof window !== "undefined") window.Activity = Activity;
