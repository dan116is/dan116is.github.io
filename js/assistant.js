// Proactive assistant: learns patterns and proposes one-tap actions, so you
// don't have to remember or type. No server, no API key — pure on-device
// heuristics over your own history.
//
// What it does today:
//  - Learns which shopping items you add, and on which weekday, then suggests
//    re-adding the regulars (especially on the day you usually buy them).
//  - Nudges: open tasks for today, overdue items, habits not done, maintenance
//    due soon, upcoming birthdays/events, budget warnings.
// Every suggestion is a single tap (accept) or dismiss.
const Assistant = (() => {
  const HKEY = 'assistantHist';   // { items: { name: {count, days:{0..6}, lastTs, cat} } }
  const DKEY = 'assistantDismiss'; // { 'YYYY-MM-DD': ['sig', ...] }

  function hist() { return DB.getSettings()[HKEY] || { items: {} }; }
  function saveHist(h) { DB.setSetting(HKEY, h); }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function dow() { return new Date().getDay(); }

  // Called whenever a shopping item is added — builds the frequency model.
  function learnShopping(name, category) {
    const key = String(name || '').trim();
    if (!key) return;
    const h = hist();
    const it = h.items[key] || { count: 0, days: {}, cat: category || 'אחר' };
    it.count++;
    it.days[dow()] = (it.days[dow()] || 0) + 1;
    it.lastTs = Date.now();
    it.cat = category || it.cat;
    h.items[key] = it;
    saveHist(h);
  }

  // Top recurring shopping items not already on the active list.
  // Boosts items usually bought on today's weekday.
  function shoppingSuggestions(max = 4) {
    const h = hist();
    const active = new Set(Shopping.list().filter((i) => !i.bought).map((i) => i.name));
    const today = dow();
    const scored = Object.entries(h.items)
      .filter(([name, it]) => it.count >= 2 && !active.has(name))
      .map(([name, it]) => {
        const dayBoost = (it.days[today] || 0) * 3;
        const recency = it.lastTs ? Math.max(0, 30 - (Date.now() - it.lastTs) / 86400000) / 30 : 0;
        return { name, cat: it.cat, score: it.count + dayBoost + recency };
      })
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, max);
  }

  function dismissed() { const d = DB.getSettings()[DKEY] || {}; return new Set(d[todayKey()] || []); }
  function dismiss(sig) {
    const d = DB.getSettings()[DKEY] || {};
    const k = todayKey();
    d[k] = Array.from(new Set([...(d[k] || []), sig]));
    // keep only today to avoid growth
    DB.setSetting(DKEY, { [k]: d[k] });
  }

  // Build the full prioritized suggestion list. Each: {sig,icon,text,action,kind}
  function suggestions() {
    const out = [];
    const seen = dismissed();
    const tKey = todayKey();

    // 1) Overdue tasks
    const overdue = Tasks.list().filter((t) => !t.done && t.dueDate && t.dueDate < tKey);
    if (overdue.length) out.push({ sig: 'overdue', icon: '⏰', text: `${overdue.length} משימות באיחור — לראות?`, kind: 'view', view: 'tasks' });

    // 2) Maintenance due soon
    if (window.Maintenance) {
      for (const { it, d } of Maintenance.dueSoon(14)) {
        out.push({ sig: 'maint:' + it.id, icon: it.emoji || '🔧', text: `${it.title} ${d <= 0 ? 'הגיע מועד' : 'בעוד ' + d + ' ימים'} — בוצע?`, kind: 'maintDone', id: it.id });
      }
    }

    // 3) Upcoming events (≤7d)
    if (window.Events) {
      for (const { ev, d } of Events.upcoming(7)) {
        out.push({ sig: 'ev:' + ev.id, icon: Events.icon(ev), text: `${ev.title} ${Events.countdownText(d)} — להוסיף תזכורת קנייה/מתנה?`, kind: 'eventGift', title: ev.title });
      }
    }

    // 4) Shopping regulars
    for (const s of shoppingSuggestions(4)) {
      out.push({ sig: 'shop:' + s.name, icon: '🛒', text: `להוסיף "${s.name}" לקניות?`, kind: 'shopAdd', name: s.name, cat: s.cat });
    }

    // 5) Habits not done yet today
    if (window.Habits) {
      for (const hb of Habits.all()) {
        if (!Habits.isDone(hb)) {
          out.push({ sig: 'hab:' + hb.id, icon: hb.emoji || '🔥', text: `עוד לא סימנת "${hb.name}" היום`, kind: 'habit', id: hb.id });
        }
      }
    }

    // 6) Budget warning
    if (window.Budget) {
      const mKey = Budget.monthKey();
      const limit = Budget.getBudget(mKey), total = Budget.totalForMonth(mKey);
      if (limit > 0 && total > limit) out.push({ sig: 'budover', icon: '💰', text: `חרגת מהתקציב החודשי`, kind: 'view', view: 'budget' });
    }

    return out.filter((s) => !seen.has(s.sig));
  }

  return { learnShopping, shoppingSuggestions, suggestions, dismiss };
})();
if (typeof window !== "undefined") window.Assistant = Assistant;
