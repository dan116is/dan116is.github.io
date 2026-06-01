// Agent layer: a small team of specialist "agents" that each reason over the
// family's data and emit insights + optional one-tap actions. An orchestrator
// collects, de-dupes and ranks them. On-device (no API). A hook (Agents.ai)
// is left so a real LLM can be plugged in later without touching callers.
//
// Each agent: { id, name, emoji, run() -> [ insight ] }
//   insight: { agent, icon, title, sub, priority(0..9 low=urgent), action? }
//   action (optional, one tap): { label, kind, ... } handled by app.
const Agents = (() => {
  function tKey() { return new Date().toISOString().slice(0, 10); }
  function dow() { return new Date().getDay(); }

  // ---- Shopping agent: regulars, gaps, smart restock ----
  const shoppingAgent = {
    id: 'shopping', name: 'סוכן קניות', emoji: '🛒',
    run() {
      const out = [];
      if (!window.Assistant) return out;
      const active = new Set((window.Shopping ? Shopping.list() : []).filter((i) => !i.bought).map((i) => i.name));
      const regs = Assistant.shoppingSuggestions(3).filter((s) => !active.has(s.name));
      if (regs.length) {
        out.push({
          agent: 'shopping', icon: '🛒', priority: 4,
          title: 'חסרים לך קבועים?',
          sub: regs.map((r) => r.name).join(', '),
          action: { label: 'הוסף הכל', kind: 'addShopping', items: regs.map((r) => ({ name: r.name, cat: r.cat })) }
        });
      }
      return out;
    }
  };

  // ---- Kitchen & health agent: dinner + gentle healthy swaps ----
  const kitchenAgent = {
    id: 'kitchen', name: 'סוכן מטבח ובריאות', emoji: '🥗',
    run() {
      const out = [];
      const h = new Date().getHours();
      if (window.Meals) {
        const m = Meals.todayMeal();
        if ((h >= 11 && h < 20) && (!m || !m.title)) {
          out.push({ agent: 'kitchen', icon: '🍽️', priority: 3, title: 'עוד לא תכננת ארוחת ערב', sub: 'רוצה שאפתח את תכנון הארוחות?', action: { label: 'תכנון ארוחות', kind: 'view', view: 'meals' } });
        }
      }
      // Healthy swap based on what's on the shopping list right now.
      if (window.FoodBrain && window.Shopping) {
        const onList = Shopping.list().filter((i) => !i.bought);
        for (const it of onList) {
          const swap = FoodBrain.swapFor(it.name);
          if (swap) { out.push({ agent: 'kitchen', icon: '🥗', priority: 6, title: `במקום ${it.name} — ${swap}?`, sub: 'בחירה בריאה יותר, אותו טעם' }); break; }
        }
      }
      return out;
    }
  };

  // ---- Finance agent: budget pace + this month ----
  const financeAgent = {
    id: 'finance', name: 'סוכן כספים', emoji: '💰',
    run() {
      const out = [];
      if (!window.Budget) return out;
      const mKey = Budget.monthKey();
      const limit = Budget.getBudget(mKey), total = Budget.totalForMonth(mKey);
      if (limit > 0) {
        const pct = total / limit;
        const day = new Date().getDate();
        const monthLen = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const pace = day / monthLen;
        if (pct >= 1) out.push({ agent: 'finance', icon: '💰', priority: 1, title: 'חרגת מהתקציב החודשי', sub: `${Budget.format(total)} מתוך ${Budget.format(limit)}`, action: { label: 'תקציב', kind: 'view', view: 'budget' } });
        else if (pct > pace + 0.15) out.push({ agent: 'finance', icon: '📈', priority: 5, title: 'קצב ההוצאות גבוה החודש', sub: `הוצאת ${Math.round(pct * 100)}% כשעבר ${Math.round(pace * 100)}% מהחודש`, action: { label: 'תקציב', kind: 'view', view: 'budget' } });
      }
      return out;
    }
  };

  // ---- Family / kids agent: birthdays, stars, growth nudges ----
  const familyAgent = {
    id: 'family', name: 'סוכן משפחה', emoji: '👨‍👩‍👧‍👦',
    run() {
      const out = [];
      if (window.Events) {
        const up = Events.upcoming(10)[0];
        if (up) out.push({ agent: 'family', icon: Events.icon(up.ev), priority: 4, title: `${up.ev.title} ${Events.countdownText(up.d)}`, sub: 'להיערך מראש?', action: { label: 'אירועים', kind: 'view', view: 'events' } });
      }
      if (window.Stars) {
        for (const k of Stars.kids()) {
          const t = Stars.totalFor(k), g = Stars.goalFor(k);
          if (g > 0 && t >= g) { out.push({ agent: 'family', icon: '⭐', priority: 3, title: `${k} השיג/ה את יעד הכוכבים!`, sub: 'אפשר לממש פרס', action: { label: 'כוכבים', kind: 'view', view: 'stars' } }); break; }
        }
      }
      return out;
    }
  };

  // ---- Home agent: maintenance due ----
  const homeAgent = {
    id: 'home', name: 'סוכן בית ורכב', emoji: '🔧',
    run() {
      const out = [];
      if (window.Maintenance) {
        for (const { it, d } of Maintenance.dueSoon(21)) {
          out.push({ agent: 'home', icon: it.emoji || '🔧', priority: d <= 0 ? 1 : 5, title: `${it.title} ${d <= 0 ? 'הגיע מועד' : 'בעוד ' + d + ' ימים'}`, sub: 'סמן כבוצע כשתטפל', action: { label: 'בוצע', kind: 'maintDone', id: it.id } });
          break;
        }
      }
      return out;
    }
  };

  const AGENTS = [shoppingAgent, kitchenAgent, financeAgent, familyAgent, homeAgent];

  // Optional real-AI hook. Returns null unless a key is configured (future).
  async function ai(prompt) {
    const key = (DB.getSettings().aiApiKey || '').trim();
    if (!key) return null;
    // Intentionally left as a no-op stub: wiring a paid LLM provider would go
    // here. Kept disabled so the app never depends on it.
    return null;
  }

  let _last = [];
  // Run all agents, rank by priority (urgent first), cap the list.
  function insights(max = 4) {
    let all = [];
    for (const a of AGENTS) { try { all = all.concat(a.run() || []); } catch (e) {} }
    all.sort((x, y) => (x.priority ?? 9) - (y.priority ?? 9));
    _last = all.slice(0, max);
    return _last;
  }
  function last() { return _last; }

  function meta() { return AGENTS.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji })); }

  return { insights, last, meta, ai, AGENTS };
})();
if (typeof window !== "undefined") window.Agents = Agents;
