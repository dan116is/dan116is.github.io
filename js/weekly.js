// "📊 סיכום שבועי" — a single screen that aggregates the whole week with smart
// insights. Read-only: composes data from the other modules (Tasks, Habits,
// Budget, Shopping, Events) for the last 7 days, and surfaces one friendly
// insight line. Every number is glanceable; matches the iCloud/glass design.
const Weekly = (() => {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // Epoch (ms) for the start of "7 days ago" (inclusive window of last 7 days).
  function weekAgoTs() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d.getTime();
  }

  // ----- Tasks: completed (last 7 days) vs open, plus overdue -----
  function tasks() {
    const list = window.Tasks ? Tasks.list() : [];
    const since = weekAgoTs();
    const completed = list.filter((t) => t.done && t.doneAt && t.doneAt >= since).length;
    const open = list.filter((t) => !t.done).length;
    const overdue = window.Tasks ? Tasks.overdueCount() : 0;
    return { completed, open, overdue };
  }

  // ----- Habits: best streak + how many met today out of all -----
  function habits() {
    const all = window.Habits ? Habits.all() : [];
    if (!all.length) return { total: 0, doneToday: 0, best: null };
    const doneToday = all.filter((h) => Habits.isDone(h)).length;
    let best = null;
    for (const h of all) {
      const s = Habits.streak(h);
      if (!best || s > best.streak) best = { name: h.name, emoji: h.emoji, streak: s };
    }
    return { total: all.length, doneToday, best };
  }

  // ----- Budget: spent this month vs limit -----
  function budget() {
    if (!window.Budget) return null;
    const mk = Budget.monthKey();
    const spent = Budget.totalForMonth(mk);
    const limit = Budget.getBudget(mk);
    return { spent, limit, mk };
  }

  // ----- Shopping: items bought in the last 7 days -----
  function shopping() {
    const list = window.Shopping ? Shopping.list() : [];
    const since = weekAgoTs();
    const bought = list.filter((i) => i.bought && i.boughtAt && i.boughtAt >= since).length;
    return { bought };
  }

  // ----- Events coming up next week (next 7 days) -----
  function events() {
    return window.Events ? Events.upcoming(7) : [];
  }

  // A friendly, single-line summary of the week.
  function insight(t, h, s) {
    if (t.completed >= 10) return `שבוע חזק! השלמת ${t.completed} משימות 💪`;
    if (h.best && h.best.streak >= 7) return `רצף מרשים — ${h.best.emoji} ${esc(h.best.name)} כבר ${h.best.streak} ימים ברצף 🔥`;
    if (t.completed >= 5) return `יופי של קצב — השלמת ${t.completed} משימות השבוע ✨`;
    if (t.overdue > 0) return `יש ${t.overdue} משימות באיחור — שווה לסגור פינה 🙂`;
    if (s.bought > 0 || t.completed > 0) return `שבוע יציב — ${t.completed} משימות ו-${s.bought} קניות מאחורייך 👍`;
    return 'שבוע חדש מתחיל — בוא נמלא אותו בדברים טובים 🌱';
  }

  function statCard(icon, kind, value, label, sub) {
    return `
      <div class="wk-stat ${kind}">
        <span class="wk-stat-ico">${icon}</span>
        <span class="wk-stat-val">${value}</span>
        <span class="wk-stat-label">${esc(label)}</span>
        ${sub ? `<span class="wk-stat-sub">${esc(sub)}</span>` : ''}
      </div>`;
  }

  function render(container) {
    if (!container) return;
    const t = tasks();
    const h = habits();
    const b = budget();
    const s = shopping();
    const up = events();

    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 6);
    const rangeStr = `${from.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} – ${today.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}`;

    // Budget block — only if a limit exists, otherwise just the spend.
    let budgetHtml = '';
    if (b) {
      const fmt = (n) => Budget.format(n);
      if (b.limit > 0) {
        const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
        const over = b.spent > b.limit;
        budgetHtml = `
          <div class="wk-section">
            <div class="wk-section-head">💰 תקציב החודש</div>
            <div class="wk-budget-row">
              <span class="wk-budget-spent ${over ? 'over' : ''}">${fmt(b.spent)}</span>
              <span class="wk-budget-of">מתוך ${fmt(b.limit)}</span>
            </div>
            <div class="goal-bar"><div class="goal-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
            <div class="wk-budget-note">${over ? `חריגה של ${fmt(b.spent - b.limit)}` : `נותרו ${fmt(b.limit - b.spent)} (${100 - pct}%)`}</div>
          </div>`;
      } else if (b.spent > 0) {
        budgetHtml = `
          <div class="wk-section">
            <div class="wk-section-head">💰 הוצאות החודש</div>
            <div class="wk-budget-row"><span class="wk-budget-spent">${fmt(b.spent)}</span></div>
            <div class="wk-budget-note">לא הוגדר תקציב חודשי</div>
          </div>`;
      }
    }

    // Habits block.
    let habitsHtml = '';
    if (h.total) {
      habitsHtml = `
        <div class="wk-section">
          <div class="wk-section-head">🔥 הרגלים</div>
          <div class="wk-habit-row">
            <span>${h.doneToday}/${h.total} הושלמו היום</span>
            ${h.best && h.best.streak > 0 ? `<span class="wk-streak">${h.best.emoji} ${esc(h.best.name)} · ${h.best.streak} ימים ברצף</span>` : ''}
          </div>
        </div>`;
    }

    // Upcoming events block.
    let eventsHtml = '';
    if (up.length) {
      eventsHtml = `
        <div class="wk-section">
          <div class="wk-section-head">🗓️ בשבוע הקרוב</div>
          ${up.slice(0, 5).map((x) => `
            <div class="wk-event-row">
              <span class="wk-event-ico">${Events.icon(x.ev)}</span>
              <span class="wk-event-title">${esc(x.ev.title)}</span>
              <span class="wk-event-when">${esc(Events.countdownText(x.d))}</span>
            </div>`).join('')}
        </div>`;
    } else {
      eventsHtml = `
        <div class="wk-section">
          <div class="wk-section-head">🗓️ בשבוע הקרוב</div>
          <div class="wk-empty">אין אירועים בשבוע הקרוב</div>
        </div>`;
    }

    container.innerHTML = `
      <div class="wk-hero">
        <div class="wk-range">${esc(rangeStr)}</div>
        <div class="wk-insight">${insight(t, h, s)}</div>
      </div>
      <div class="wk-stats">
        ${statCard('✅', 'done', t.completed, 'משימות הושלמו', 'ב-7 הימים האחרונים')}
        ${statCard('📋', 'open', t.open, 'משימות פתוחות', t.overdue ? `${t.overdue} באיחור` : 'הכול בזמן')}
        ${statCard('🛒', 'shop', s.bought, 'פריטים נקנו', 'ב-7 הימים האחרונים')}
        ${statCard('🔥', 'habit', h.total ? `${h.doneToday}/${h.total}` : '0', 'הרגלים היום', h.best && h.best.streak ? `שיא ${h.best.streak} ימים` : '')}
      </div>
      ${budgetHtml}
      ${habitsHtml}
      ${eventsHtml}`;
  }

  return { render, tasks, habits, budget, shopping, events, insight };
})();
if (typeof window !== "undefined") window.Weekly = Weekly;
