// Kids' activities / clubs (חוגים): a weekly recurring schedule per child —
// swimming, soccer, music, etc. Surfaces "today's activities" on the dashboard.
const Activities = (() => {
  const KEY = 'activities';
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const ICONS = [
    [/שחי|בריכ/, '🏊'], [/כדורגל|פוטבול/, '⚽'], [/כדורסל/, '🏀'],
    [/טניס/, '🎾'], [/ריקוד|מחול|בלט/, '🩰'], [/פסנתר|מוזיק|גיטר|נגינ/, '🎹'],
    [/ציור|אמנות|יצירה/, '🎨'], [/התעמלות|ספורט|חדר כושר/, '🤸'], [/קרטה|ג׳ודו|לחימ|אומנויות/, '🥋'],
    [/שחמט/, '♟️'], [/דרמה|תיאטרון|משחק/, '🎭'], [/חוג מדע|רובוטיק|מחשב|תכנות/, '🔬'],
    [/אנגלית|שפ/, '🗣️'], [/צופים|תנועת נוער/, '⛺']
  ];
  function iconFor(name) { const n = String(name || ''); for (const [re, ic] of ICONS) if (re.test(n)) return ic; return '🎽'; }

  function list() { return DB.list(KEY).slice().sort((a, b) => (a.day - b.day) || String(a.time || '').localeCompare(String(b.time || ''))); }
  function add(data) {
    const created = DB.add(KEY, {
      child: (data.child || '').trim(), name: (data.name || '').trim(),
      day: Number(data.day) || 0, time: data.time || '', place: (data.place || '').trim()
    });
    if (typeof Activity !== 'undefined' && created) Activity.record(`נוסף חוג: ${created.name}${created.child ? ' · ' + created.child : ''}`, '🎽');
    return created;
  }
  function remove(id) { DB.remove(KEY, id); }
  function forDay(dow) { return list().filter((a) => Number(a.day) === dow); }
  function today() { return forDay(new Date().getDay()); }

  // Next upcoming activity across the week (for the dashboard when none today).
  function next() {
    const all = list(); if (!all.length) return null;
    const todayDow = new Date().getDay();
    for (let i = 0; i <= 7; i++) {
      const dow = (todayDow + i) % 7;
      const hit = all.filter((a) => Number(a.day) === dow);
      if (hit.length) return { inDays: i, dow, items: hit };
    }
    return null;
  }

  return { KEY, DAYS, list, add, remove, forDay, today, next, iconFor };
})();
if (typeof window !== 'undefined') window.Activities = Activities;
