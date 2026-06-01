// Autopilot: the app acts on your behalf, then tells you what it did.
// Runs on every load (and when you return to the app). It reasons over your
// history and the calendar, performs safe automatic actions, and records an
// activity log so nothing is a surprise. Each automation is idempotent —
// guarded by a per-day / per-period marker so it never double-acts.
//
// Design rule: only AUTO-DO things that are safe and reversible (add a
// suggested item, roll a recurring task, restock a regular). Anything with
// real consequence stays a suggestion in the Assistant.
const Autopilot = (() => {
  const LOG = 'autopilotLog';   // [{ts, icon, text}]
  const STATE = 'autopilotState'; // { lastRunDay, markers:{} }

  function today() { return new Date().toISOString().slice(0, 10); }
  function dow() { return new Date().getDay(); }
  function now() { return Date.now(); }

  function state() { return DB.getSettings()[STATE] || { markers: {} }; }
  function saveState(s) { DB.setSetting(STATE, s); }
  function logList() { return DB.getSettings()[LOG] || []; }
  function pushLog(icon, text) {
    const l = logList();
    l.unshift({ ts: now(), icon, text });
    DB.setSetting(LOG, l.slice(0, 40));
  }
  function recentLog(max = 5) {
    const tk = today();
    return logList().filter((e) => new Date(e.ts).toISOString().slice(0, 10) === tk).slice(0, max);
  }
  function marker(key) { return state().markers[key]; }
  function setMarker(key, val) { const s = state(); s.markers[key] = val || today(); saveState(s); }

  // ---- Automations -------------------------------------------------------

  // 1) Restock regulars: on the weekday you usually shop, auto-add your top
  //    recurring items that aren't already on the list. Once per day.
  function autoRestock() {
    if (!window.Assistant || !window.Shopping) return;
    const key = 'restock:' + today();
    if (marker(key)) return;
    // Only act on a day where you have a strong weekly pattern.
    const sugg = Assistant.shoppingSuggestions(6).filter((s) => s.score >= 5);
    if (sugg.length >= 2) {
      const added = [];
      for (const s of sugg.slice(0, 5)) { Shopping.add(s.name, s.cat || 'אחר'); added.push(s.name); }
      if (added.length) pushLog('🛒', `הוספתי לרשימת הקניות: ${added.join(', ')}`);
    }
    setMarker(key);
  }

  // 2) Roll overdue *recurring-ish* nothing — instead, gently surface, but we
  //    DO auto-clear bought shopping items older than 2 days to keep it tidy.
  function autoTidyShopping() {
    if (!window.Shopping) return;
    const key = 'tidy:' + today();
    if (marker(key)) return;
    const cutoff = now() - 2 * 86400000;
    const list = Shopping.list();
    const stale = list.filter((i) => i.bought && i.boughtAt && i.boughtAt < cutoff);
    if (stale.length) {
      const remaining = list.filter((i) => !(i.bought && i.boughtAt && i.boughtAt < cutoff));
      DB.save(DB.KEYS.shopping, remaining);
      pushLog('🧹', `ניקיתי ${stale.length} פריטים שכבר נקנו מהרשימה`);
    }
    setMarker(key);
  }

  // 3) Birthday prep: a week before a birthday, auto-create a gift reminder
  //    task (once per birthday per year).
  function autoBirthdayPrep() {
    if (!window.Events || !window.Tasks) return;
    for (const { ev, d } of Events.upcoming(7)) {
      if (ev.type !== 'birthday') continue;
      const yr = new Date().getFullYear();
      const key = 'bday:' + ev.id + ':' + yr;
      if (marker(key)) continue;
      if (d <= 7) {
        Tasks.add({ title: `מתנה ל${ev.title}`, dueDate: '', notes: 'נוצר אוטומטית — יום הולדת מתקרב' });
        pushLog('🎁', `יום הולדת ל${ev.title} בקרוב — פתחתי לך משימת מתנה`);
        setMarker(key);
      }
    }
  }

  // 4) Maintenance roll-forward note: if something is overdue, make sure it's
  //    visible as a task once (so it doesn't get lost), once per due-cycle.
  function autoMaintenanceTask() {
    if (!window.Maintenance || !window.Tasks) return;
    for (const { it, d } of Maintenance.dueSoon(0)) { // only overdue/today
      const key = 'maint:' + it.id + ':' + (it.lastDone || 'na');
      if (marker(key)) continue;
      Tasks.add({ title: it.title + ' (תחזוקה)', dueDate: today(), notes: 'נוצר אוטומטית — הגיע מועד' });
      pushLog(it.emoji || '🔧', `הגיע מועד "${it.title}" — הוספתי משימה להיום`);
      setMarker(key);
    }
  }

  // Run all automations. Safe to call often (markers prevent repeats).
  function run() {
    try { autoRestock(); } catch (e) {}
    try { autoTidyShopping(); } catch (e) {}
    try { autoBirthdayPrep(); } catch (e) {}
    try { autoMaintenanceTask(); } catch (e) {}
    const s = state(); s.lastRunDay = today(); saveState(s);
  }

  function clearLog() { DB.setSetting(LOG, []); }

  return { run, recentLog, logList, clearLog };
})();
if (typeof window !== "undefined") window.Autopilot = Autopilot;
