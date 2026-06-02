// "Today" briefing: a single adaptive stream at the top of the home screen.
// Not a grid — a living, time-aware summary that surfaces only what matters
// right now, ranked by importance and the time of day. Composes data from the
// other modules; every line is glanceable and most are one-tap.
const Briefing = (() => {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function tKey() { return new Date().toISOString().slice(0, 10); }

  function partOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 22) return 'evening';
    return 'night';
  }

  function greeting(name) {
    const p = partOfDay();
    const map = { morning: 'בוקר טוב', afternoon: 'צהריים טובים', evening: 'ערב טוב', night: 'לילה טוב' };
    const emoji = { morning: '☀️', afternoon: '🌤️', evening: '🌆', night: '🌙' };
    return `${map[p]}, ${name} ${emoji[p]}`;
  }

  // A one-line human summary of the day.
  function summaryLine() {
    const today = tKey();
    const tasksToday = (window.Tasks ? Tasks.list() : []).filter((t) => !t.done && (t.dueDate === today)).length;
    const overdue = window.Tasks ? Tasks.overdueCount() : 0;
    const sched = window.Schedule ? Schedule.todayItems().length : 0;
    const shop = window.Shopping ? Shopping.activeCount() : 0;
    const bits = [];
    if (overdue) bits.push(`${overdue} באיחור`);
    if (tasksToday) bits.push(`${tasksToday} משימות היום`);
    if (sched) bits.push(`${sched} בלו״ז`);
    if (shop) bits.push(`${shop} בקניות`);
    if (!bits.length) return 'אין לך משימות פתוחות להיום — תיהנה מהיום 🙂';
    return bits.join(' · ');
  }

  // Compose ranked "cards" for the stream. Each: {icon, title, sub, kind, ...}
  function stream() {
    const p = partOfDay();
    const today = tKey();
    const cards = [];

    // Weather one-liner — prominent in the morning.
    const w = (() => { try { return JSON.parse(localStorage.getItem('habait:weather')); } catch (e) { return null; } })();
    if (w && w.data) {
      const d = w.data;
      const adv = d.advice ? d.advice.head : '';
      cards.push({
        rank: p === 'morning' ? 1 : 6, icon: '🌡️', kind: 'view', view: 'dashboard',
        title: `${Math.round(d.temp)}° · ${adv}`,
        sub: d.advice && d.advice.tips ? d.advice.tips[0] : ''
      });
    }

    // Overdue tasks — always top.
    const overdue = (window.Tasks ? Tasks.list() : []).filter((t) => !t.done && t.dueDate && t.dueDate < today);
    if (overdue.length) cards.push({ rank: 0, icon: '⏰', kind: 'view', view: 'tasks', title: `${overdue.length} משימות באיחור`, sub: overdue.slice(0, 2).map((t) => t.title).join(' · ') });

    // Today's tasks.
    const todayTasks = (window.Tasks ? Tasks.list() : []).filter((t) => !t.done && t.dueDate === today);
    if (todayTasks.length) cards.push({ rank: 2, icon: '📋', kind: 'view', view: 'tasks', title: 'המשימות שלך להיום', sub: todayTasks.slice(0, 3).map((t) => t.title).join(' · ') });

    // Today's schedule.
    const sched = window.Schedule ? Schedule.todayItems() : [];
    if (sched.length) cards.push({ rank: 2, icon: '🗓️', kind: 'view', view: 'schedule', title: 'הלו״ז של היום', sub: sched.slice(0, 3).map((a) => (a.time ? a.time + ' ' : '') + (a.title || '')).join(' · ') });

    // Tonight's dinner — afternoon/evening.
    if (window.Meals) {
      const m = Meals.todayMeal();
      if (m && m.title && (p === 'afternoon' || p === 'evening')) cards.push({ rank: 3, icon: '🍽️', kind: 'view', view: 'meals', title: 'ארוחת הערב', sub: m.title });
    }

    // Next event.
    if (window.Events) {
      const up = Events.upcoming(14)[0];
      if (up) cards.push({ rank: 4, icon: Events.icon(up.ev), kind: 'view', view: 'events', title: up.ev.title, sub: Events.countdownText(up.d) });
    }

    // Habits not done — nudge in evening.
    if (window.Habits) {
      const undone = Habits.all().filter((h) => !Habits.isDone(h));
      if (undone.length && (p === 'evening' || p === 'night')) cards.push({ rank: 3, icon: '🔥', kind: 'view', view: 'dashboard', title: 'הרגלים שנותרו להיום', sub: undone.map((h) => h.emoji + ' ' + h.name).join(' · ') });
    }

    // Beitar next match if cached.
    const bj = (() => { try { return JSON.parse(localStorage.getItem('habait:beitar')); } catch (e) { return null; } })();
    if (bj && bj.html && /vs|תוצאה|הבא/.test(bj.html)) {
      cards.push({ rank: 7, icon: '⚽', kind: 'view', view: 'dashboard', title: 'ביתר ירושלים', sub: 'יש עדכון משחק' });
    }

    return cards.sort((a, b) => a.rank - b.rank).slice(0, 6);
  }

  function render(container, ownerName) {
    if (!container) return;
    const today = new Date();
    const dateStr = today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const cards = stream();
    const sugCount = window.Assistant ? Assistant.suggestions().length : 0;
    const did = window.Autopilot ? Autopilot.recentLog(4) : [];
    const didHtml = did.length ? `
      <div class="brief-did">
        <div class="brief-did-head">🤖 מה עשיתי בשבילך</div>
        ${did.map((e) => `<div class="brief-did-row"><span>${e.icon}</span><span>${esc(e.text)}</span></div>`).join('')}
      </div>` : '';
    const ins = window.Agents ? Agents.insights(4) : [];
    const agentsHtml = ins.length ? `
      <div class="brief-agents">
        <div class="brief-agents-head">🧠 הצוות החכם שלך</div>
        ${ins.map((i, idx) => `
          <div class="agent-row">
            <span class="agent-ico">${i.icon}</span>
            <span class="agent-body">
              <span class="agent-title">${esc(i.title)}</span>
              ${i.sub ? `<span class="agent-sub">${esc(i.sub)}</span>` : ''}
            </span>
            ${i.action ? `<button class="agent-do" data-agent-idx="${idx}">${esc(i.action.label)}</button>` : ''}
          </div>`).join('')}
      </div>` : '';
    container.innerHTML = `
      <div class="brief-hero">
        <div class="brief-greet">${esc(greeting(ownerName || 'דניאל'))}</div>
        <div class="brief-date">${esc(dateStr)}</div>
        <div class="brief-summary">${esc(summaryLine())}</div>
      </div>
      <div class="quick-tiles">
        <button class="qtile focus" data-quick="focus"><span class="qt-ico">⏱️</span><span class="qt-label">פוקוס</span></button>
        <button class="qtile task" data-quick="task"><span class="qt-ico">📋</span><span class="qt-label">משימה</span></button>
        <button class="qtile shop" data-quick="shop"><span class="qt-ico">🛒</span><span class="qt-label">קנייה</span></button>
        <button class="qtile money" data-quick="expense"><span class="qt-ico">💰</span><span class="qt-label">הוצאה</span></button>
      </div>
      ${didHtml}
      ${agentsHtml}
      ${sugCount ? `<button class="brief-assistant" data-brief="assistant">✨ ${sugCount} הצעות חכמות בשבילך — לפתוח</button>` : ''}
      <div class="brief-stream">
        ${cards.map((c) => `
          <button class="brief-card" data-brief-view="${esc(c.view)}">
            <span class="brief-ico">${c.icon}</span>
            <span class="brief-body">
              <span class="brief-title">${esc(c.title)}</span>
              ${c.sub ? `<span class="brief-sub">${esc(c.sub)}</span>` : ''}
            </span>
            <span class="brief-chev">›</span>
          </button>`).join('')}
      </div>`;
  }

  return { render, greeting, summaryLine, stream, partOfDay };
})();
if (typeof window !== "undefined") window.Briefing = Briefing;
