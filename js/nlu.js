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

  // Main entry: classify and act. Always returns a Hebrew reply.
  function run(text) {
    const raw = String(text || '').trim();
    if (!raw) return { kind: 'none', reply: 'לא שמעתי כלום — נסה שוב' };
    const t = norm(raw);

    // Order matters: query checks first (so "מה יש לי" never looks like add),
    // then complete & delete, then fall back to add.
    if (isQuery(t)) return doQuery(t);
    if (isComplete(t)) return doComplete(t);
    if (isDelete(t)) return doDelete(t);

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
