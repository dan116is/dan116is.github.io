// Conversational command layer: understands ADD / COMPLETE / DELETE / QUERY
// intents in Hebrew (voice or text) and acts on the existing modules.
// run(text) returns { kind, reply, ... } and always includes a short Hebrew
// `reply` describing what happened or answering the question. Anything that
// isn't complete/delete/query falls back to QuickAdd.handleSmart (add).
const NLU = (() => {
  function norm(s) { return String(s || '').replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim(); }

  // Strip leading filler/verb words so we're left with the item name to match.
  function extractTarget(text, verbs) {
    let t = ' ' + norm(text) + ' ';
    for (const v of verbs) t = t.replace(new RegExp('\\s' + v + '\\s', 'g'), ' ');
    t = t.replace(/\s(את|ה|של|מ|מה|לי|את ה|מהרשימה|מרשימת הקניות|מהקניות|מהמשימות|בבקשה)\s/g, ' ');
    t = t.replace(/\s(רשימת הקניות|רשימת קניות|הקניות|המשימות|הרשימה)\s/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
  }

  // Fuzzy includes() match (both directions), case-insensitive.
  function matches(hay, needle) {
    const a = norm(hay).toLowerCase();
    const b = norm(needle).toLowerCase();
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
  }

  function fmtList(arr) { return arr.filter(Boolean).join(', '); }

  // ---- Intent detection ----
  function isComplete(t) {
    return /(סיימתי|סיימת|בוצע|עשיתי|גמרתי|תסמן|לסמן|סמן|שילמתי|כבר קניתי|קניתי את)/.test(t);
  }
  function isDelete(t) {
    return /(תמחק|למחוק|מחק|תוריד|להוריד|הסר|תסיר|להסיר|תבטל|לבטל)/.test(t);
  }
  function isQuery(t) {
    return /(מה יש|מה ברשימת|מה ברשימה|מה בקניות|מה צריך לקנות|כמה הוצאתי|כמה יצא|מה הלו|מה היום|מה יש לי|מה המשימות|מה נשאר|מה התקציב|כמה נשאר)/.test(t)
      || /^(מה|כמה)\b/.test(t);
  }

  // ---- Meal planning intent ----
  // A day word + a dish (known recipe) or an explicit meal verb means: plan a
  // meal for that day AND add its ingredients to shopping.
  const DOW = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6 };
  function dayFromText(t) {
    if (/מחרתיים/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 2); return d.getDay(); }
    if (/מחר/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 1); return d.getDay(); }
    if (/היום|הערב|לארוחת ערב/.test(t)) return new Date().getDay();
    // Hebrew \b is unreliable; match day words by plain inclusion, longest first
    // ('ראשון'/'שלישי'/'רביעי' before 'שני'/'שבת' to avoid partial hits).
    const order = ['ראשון', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שני', 'שבת'];
    for (const name of order) {
      if (t.includes('יום ' + name) || t.includes('ביום ' + name) || t.includes('ב' + name) || t.includes(name)) return DOW[name];
    }
    return null;
  }
  function isMeal(t) {
    if (typeof Meals === 'undefined') return false;
    const day = dayFromText(t);
    if (day === null) return false;
    // Known dish?
    if (Meals.ingredientsFor(t).length) return true;
    // Explicit meal verbs/nouns.
    return /(ארוחה|ארוחת|נאכל|לאכול|לבשל|מבשל|אבשל|תכין|להכין|לארוחת ערב|לארוחת צהריים)/.test(t);
  }
  function dishFromText(t) {
    // Strip day words + meal fillers to leave the dish name. Work token-by-token
    // so we never chop a day name out of the MIDDLE of a dish (e.g. "שניצל"
    // contains "שני"). Drop tokens that are day words or fillers.
    const dayWords = new Set(['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת',
      'יום', 'ביום', 'מחר', 'מחרתיים', 'היום', 'הערב']);
    const fillers = new Set(['נאכל', 'לאכול', 'לבשל', 'מבשל', 'אבשל', 'תכין', 'להכין',
      'לארוחת', 'ארוחת', 'ארוחה', 'ערב', 'צהריים', 'של', 'את', 'ה', 'יהיה', 'נעשה',
      'עושים', 'בא', 'לי', 'בערב']);
    const kept = norm(t).split(' ').filter((w) => w && !dayWords.has(w) && !fillers.has(w));
    return kept.join(' ').trim();
  }
  function doMeal(text) {
    const t = norm(text);
    const day = dayFromText(t);
    const dish = dishFromText(t) || 'ארוחה';
    const dayName = Meals.DAYS[day];
    const ingredients = Meals.ingredientsFor(dish.length ? dish : t);
    // Save the planned dinner for that day (keep existing ingredients text).
    Meals.setMeal(day, dish, ingredients.join(', '));
    // Add ingredients to shopping (skip ones already on the list).
    let added = [];
    if (window.Shopping) {
      const have = new Set(Shopping.list().filter((i) => !i.bought).map((i) => norm(i.name).toLowerCase()));
      for (const it of ingredients) {
        if (!have.has(norm(it).toLowerCase())) {
          const cat = (window.FoodBrain && FoodBrain.categoryOf(it) !== 'אחר') ? FoodBrain.categoryOf(it) : 'מזון';
          Shopping.add(it, cat); added.push(it);
        }
      }
    }
    let reply = `📅 ${dayName}: ${dish}`;
    if (added.length) reply += ` · הוספתי לקניות: ${fmtList(added)}`;
    else if (ingredients.length) reply += ` · כל המצרכים כבר ברשימה`;
    else reply += ` · (לא מכיר מתכון — הוספתי רק לתפריט)`;
    return { kind: 'meal', day, dish, added, reply };
  }

  // ---- Actions ----
  function doComplete(text) {
    const target = extractTarget(text, ['סיימתי', 'סיימת', 'בוצע', 'עשיתי', 'גמרתי', 'תסמן', 'לסמן', 'סמן', 'ששילמתי', 'שילמתי', 'קניתי', 'את', 'ש']);
    if (!target) return { kind: 'complete', reply: 'מה לסמן כבוצע?' };

    // Open tasks first (most recent open match).
    const openTasks = (window.Tasks ? Tasks.list() : []).filter((t) => !t.done && matches(t.title, target));
    if (openTasks.length) {
      const t = openTasks[openTasks.length - 1];
      Tasks.toggle(t.id);
      return { kind: 'complete', target: t.title, reply: `סימנתי "${t.title}" כבוצע ✓` };
    }
    // Then open shopping items.
    const openShop = (window.Shopping ? Shopping.list() : []).filter((i) => !i.bought && matches(i.name, target));
    if (openShop.length) {
      const it = openShop[openShop.length - 1];
      Shopping.toggle(it.id);
      return { kind: 'complete', target: it.name, reply: `סימנתי ש"${it.name}" נקנה ✓` };
    }
    return { kind: 'complete', reply: `לא מצאתי משהו פתוח בשם "${target}" לסמן` };
  }

  function doDelete(text) {
    const target = extractTarget(text, ['תמחק', 'למחוק', 'מחק', 'תוריד', 'להוריד', 'הסר', 'תסיר', 'להסיר', 'תבטל', 'לבטל', 'את']);
    if (!target) return { kind: 'delete', reply: 'מה למחוק?' };

    // Shopping first (the common "תוריד מהרשימה"), most recent open match.
    const shop = (window.Shopping ? Shopping.list() : []);
    const shopOpen = shop.filter((i) => !i.bought && matches(i.name, target));
    const shopAny = shop.filter((i) => matches(i.name, target));
    const shopHit = shopOpen.length ? shopOpen[shopOpen.length - 1] : (shopAny.length ? shopAny[shopAny.length - 1] : null);
    if (shopHit) {
      Shopping.remove(shopHit.id);
      return { kind: 'delete', target: shopHit.name, reply: `מחקתי את "${shopHit.name}" מרשימת הקניות` };
    }
    // Then tasks.
    const tasks = (window.Tasks ? Tasks.list() : []);
    const tOpen = tasks.filter((t) => !t.done && matches(t.title, target));
    const tAny = tasks.filter((t) => matches(t.title, target));
    const tHit = tOpen.length ? tOpen[tOpen.length - 1] : (tAny.length ? tAny[tAny.length - 1] : null);
    if (tHit) {
      Tasks.remove(tHit.id);
      return { kind: 'delete', target: tHit.title, reply: `מחקתי את המשימה "${tHit.title}"` };
    }
    return { kind: 'delete', reply: `לא מצאתי "${target}" למחיקה` };
  }

  function doQuery(text) {
    const t = norm(text);
    // Shopping list.
    if (/(קניות|לקנות|רשימת)/.test(t)) {
      const items = (window.Shopping ? Shopping.list() : []).filter((i) => !i.bought);
      if (!items.length) return { kind: 'query', reply: 'רשימת הקניות ריקה ✨' };
      return { kind: 'query', reply: `ברשימת הקניות (${items.length}): ${fmtList(items.map((i) => i.name))}` };
    }
    // Budget / spending this month.
    if (/(הוצאתי|הוצאות|תקציב|כסף|יצא|נשאר)/.test(t)) {
      if (!window.Budget) return { kind: 'query', reply: 'אין נתוני תקציב' };
      const mKey = Budget.monthKey();
      const total = Budget.totalForMonth(mKey);
      const limit = Budget.getBudget(mKey);
      if (limit > 0) {
        const left = limit - total;
        return { kind: 'query', reply: `הוצאת החודש ${Budget.format(total)} מתוך ${Budget.format(limit)} — ${left >= 0 ? 'נשאר ' + Budget.format(left) : 'חריגה של ' + Budget.format(-left)}` };
      }
      return { kind: 'query', reply: `הוצאת החודש ${Budget.format(total)}` };
    }
    // Schedule / agenda for today.
    if (/(לו|לוז|לוח זמנים|פגיש)/.test(t)) {
      const sched = (window.Schedule ? Schedule.todayItems() : []);
      const bits = sched.map((a) => (a.time ? a.time + ' ' : '') + (a.title || ''));
      if (!bits.length) return { kind: 'query', reply: 'אין פעילויות בלו״ז להיום' };
      return { kind: 'query', reply: `הלו״ז להיום: ${fmtList(bits)}` };
    }
    // Default: "what do I have today" — tasks (+ a hint at shopping).
    const today = new Date().toISOString().slice(0, 10);
    const tasks = (window.Tasks ? Tasks.list() : []).filter((x) => !x.done && (!x.dueDate || x.dueDate <= today));
    const shopCount = (window.Shopping ? Shopping.list() : []).filter((i) => !i.bought).length;
    const parts = [];
    if (tasks.length) parts.push(`${tasks.length} משימות: ${fmtList(tasks.slice(0, 5).map((x) => x.title))}`);
    else parts.push('אין משימות פתוחות להיום 🎉');
    if (shopCount) parts.push(`${shopCount} פריטים ברשימת הקניות`);
    return { kind: 'query', reply: parts.join(' · ') };
  }

  // ---- Smart questions: instant answers from live data, no recording needed.
  // These are pure questions (no side effects) — weather, today's meal, the
  // next event, medication status. Returns a {kind:'query'} or null.
  function smartQuestion(t) {
    if (/(מזג ?האוו|מזג ?אוו|מה ללבוש|מה לובש|חם או קר|יורד גשם|טמפרטור|כמה מעלות)/.test(t)) {
      return { kind: 'query', reply: window.Weather ? Weather.summary() : 'אין נתוני מזג אוויר' };
    }
    if (/(מה אוכל|מה לאכול|ארוחה היום|אוכלים היום|מה בארוחה|מה התפריט|מה מכינים)/.test(t)) {
      const m = (window.Meals && Meals.todayMeal) ? Meals.todayMeal() : null;
      return { kind: 'query', reply: (m && m.dish) ? `🍽️ היום מתוכנן: ${m.dish}` : 'עוד לא תוכננה ארוחה להיום. אמור למשל "היום שקשוקה" ואסדר גם את הקניות' };
    }
    if ((/הולדת|אירוע/.test(t)) && (/(מתי|הבא|קרוב|מה|כמה|איזה)/.test(t))) {
      const up = (window.Events && Events.upcoming) ? Events.upcoming(120) : [];
      if (!up.length) return { kind: 'query', reply: 'אין אירועים קרובים בחודשים הקרובים' };
      const e = up[0];
      return { kind: 'query', reply: `${Events.icon(e.ev)} ${e.ev.title} — ${Events.countdownText(e.d)}` };
    }
    if (/(אילו תרופ|איזה תרופ|מצב התרופ|תרופות.*נגמר|תרופות.*תוקף|תרופות.*מלאי|תרופות שעומדות|תרופות שנגמר)/.test(t)) {
      const meds = (window.Medications && Medications.list) ? Medications.list() : [];
      const alerts = meds.map((m) => ({ m, s: Medications.statusOf(m) })).filter((x) => x.s && x.s.level !== 'success');
      if (!meds.length) return { kind: 'query', reply: 'אין עדיין תרופות במערכת' };
      if (!alerts.length) return { kind: 'query', reply: `כל התרופות תקינות (${meds.length}) ✓` };
      return { kind: 'query', reply: `⚠️ ${alerts.map((a) => `${a.m.name}: ${a.s.text}`).join(' · ')}` };
    }
    return null;
  }

  // Main entry: classify and act. Always returns a Hebrew reply.
  function run(text) {
    const raw = String(text || '').trim();
    if (!raw) return { kind: 'none', reply: 'לא שמעתי כלום — נסה שוב' };
    const t = norm(raw);

    // Smart instant-answer questions first (weather/meal/event/meds), then the
    // generic query check, then complete & delete, then fall back to add.
    const sq = smartQuestion(t);
    if (sq) return sq;
    if (isQuery(t)) return doQuery(t);
    if (isComplete(t)) return doComplete(t);
    if (isDelete(t)) return doDelete(t);
    if (isMeal(t)) return doMeal(t);

    // Add — delegate to the existing smart classifier.
    if (window.QuickAdd) {
      const res = QuickAdd.handleSmart(raw);
      if (res) return { kind: 'add', added: res.added, reply: res.msg };
    }
    return { kind: 'none', reply: 'לא הצלחתי להבין — אפשר לנסות אחרת?' };
  }

  return { run, matches };
})();
if (typeof window !== "undefined") window.NLU = NLU;
