// Goals & developmental milestones per family member, plus a personal
// "goal of the month". Milestones are general age-based guidance (not medical
// advice) and are fully editable. Stored in DB under 'goals'.
const Goals = (() => {
  const KEY = DB.KEYS.goals;

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, { done: false, ...data }); }
  function update(id, patch) { return DB.update(KEY, id, patch); }
  function remove(id) { DB.remove(KEY, id); }
  function toggle(id) { const g = DB.findById(KEY, id); if (g) DB.update(KEY, id, { done: !g.done }); }

  // Seeded once. Age-appropriate milestones/healthy targets.
  function seedSets() {
    return [
      { who: 'גפן', items: [
        'רכיבה על אופניים / קורקינט',
        'זיהוי כל האותיות וספירה עד 20',
        'ציור איש עם פרטים (ראש, גוף, ידיים)',
        'התלבשות עצמאית כולל כפתורים',
        'קפיצה על רגל אחת ודילוג',
        'משחק משותף ושיתוף עם חברים',
        'גזירה במספריים לפי קו'
      ] },
      { who: 'אורי', items: [
        'הליכה יציבה ועלייה במדרגות בעזרה',
        '5–10 מילים ראשונות',
        'אכילה עצמאית עם כף',
        'הצבעה על איברי גוף',
        'מיון והשחלת צורות בסיסיות',
        'שתייה מכוס פתוחה',
        'הנפת יד "ביי" והבעת רצונות'
      ] },
      { who: 'דניאל', items: [
        'אימון כושר 3 פעמים בשבוע',
        '10,000 צעדים ביום',
        '7–8 שעות שינה',
        '2.5 ליטר מים ביום',
        'זמן איכות יומי עם הילדים',
        'הפסקת מסכים שעה לפני השינה'
      ] },
      { who: 'הילה', items: [
        'פילאטיס / אימון 2–3 פעמים בשבוע',
        '8 כוסות מים ביום',
        '7–8 שעות שינה',
        'זמן לעצמי בשבוע',
        'יציאה עם חברות פעם בשבוע',
        'תזונה מאוזנת'
      ] }
    ];
  }

  function ensureSeed() {
    if (DB.getSettings().goalsSeeded) return;
    for (const set of seedSets()) {
      for (const title of set.items) add({ who: set.who, title, category: 'milestone' });
    }
    DB.setSetting('goalsSeeded', true);
  }

  function people() {
    const fam = DB.list(DB.KEYS.family).map((f) => f.name);
    const fromGoals = [...new Set(list().map((g) => g.who).filter(Boolean))];
    const order = ['דניאל', 'הילה', 'גפן', 'אורי'];
    const all = [...new Set([...order, ...fam, ...fromGoals])];
    return all.filter((p) => list().some((g) => g.who === p) || fam.includes(p));
  }

  function byPerson(who) { return list().filter((g) => g.who === who); }
  function progress(who) {
    const items = byPerson(who);
    if (!items.length) return { done: 0, total: 0, pct: 0 };
    const done = items.filter((g) => g.done).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }

  // ----- Personal goal of the month (settings-based) -----
  function monthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  function monthly() {
    const m = DB.getSettings().monthlyGoal;
    if (!m || m.month !== monthKey()) return { month: monthKey(), title: '', progress: 0 };
    return m;
  }
  function setMonthly(patch) {
    const cur = monthly();
    DB.setSetting('monthlyGoal', { ...cur, ...patch, month: monthKey() });
  }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function emojiFor(who) {
    return ({ 'דניאל': '🧔', 'הילה': '👩', 'גפן': '👦', 'אורי': '🧒' }[who]) || '⭐';
  }

  function render(container) {
    const ppl = people();
    if (!ppl.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🎯</div><p>אין יעדים עדיין.</p></div>`;
      return;
    }
    container.innerHTML = ppl.map((who) => {
      const p = progress(who);
      const items = byPerson(who);
      return `
        <div class="goal-person">
          <div class="goal-person-head">
            <span class="goal-person-emoji">${emojiFor(who)}</span>
            <span class="goal-person-name">${esc(who)}</span>
            <span class="goal-person-pct">${p.done}/${p.total}</span>
          </div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${p.pct}%"></div></div>
          <div class="goal-items">
            ${items.map((g) => `
              <div class="dash-item ${g.done ? 'done' : ''}">
                <button class="item-check ${g.done ? 'checked' : ''}" data-goal-toggle="${g.id}" aria-label="סמן"></button>
                <span class="dash-item-title">${esc(g.title)}</span>
                <button class="icon-btn" data-goal-del="${g.id}" title="מחק">🗑</button>
              </div>`).join('')}
          </div>
          <button class="link-btn" data-goal-add="${esc(who)}">+ הוסף יעד ל${esc(who)}</button>
        </div>`;
    }).join('') +
    `<p class="hint" style="text-align:center;margin-top:14px;">אבני הדרך הן הכוונה כללית לפי גיל — לא ייעוץ רפואי. אפשר לערוך הכל.</p>`;
  }

  return { list, add, update, remove, toggle, ensureSeed, people, byPerson, progress,
           monthly, setMonthly, monthKey, emojiFor, render };
})();
