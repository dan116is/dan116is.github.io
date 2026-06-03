// Optional LLM "brain" — uses Google Gemini's FREE tier (a free API key from
// Google AI Studio, $0) to understand any Hebrew phrasing and return STRUCTURED
// output (intent + entities). The app executes precisely. Always FALLS BACK to
// the local rules engine (NLU) offline / no key / on any error.
//
// Gemini allows browser-direct calls with the key in the query string. The key
// is the user's own free key, stored only in localStorage on the device.
const AI = (() => {
  const KEY = 'ai_api_key';
  const MODEL = 'gemini-2.0-flash'; // free + fast — good latency for voice

  function getKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY); } catch (e) {} }
  function enabled() { return !!getKey() && (typeof navigator === 'undefined' || navigator.onLine !== false); }

  const INTENTS = ['add_shopping', 'add_task', 'add_reminder', 'add_expense',
    'complete_item', 'delete_item', 'plan_meal',
    'ask_weather', 'ask_meal', 'ask_event', 'ask_meds',
    'ask_shopping', 'ask_budget', 'ask_schedule', 'ask_tasks', 'unknown'];

  // Gemini structured-output schema (OpenAPI subset): force a single JSON object.
  const SCHEMA = {
    type: 'OBJECT',
    properties: {
      intent: { type: 'STRING', format: 'enum', enum: INTENTS },
      items: { type: 'ARRAY', items: { type: 'STRING' } },
      title: { type: 'STRING' },
      date: { type: 'STRING' },
      time: { type: 'STRING' },
      amount: { type: 'NUMBER' },
      name: { type: 'STRING' },
      day: { type: 'STRING' },
      dish: { type: 'STRING' }
    },
    required: ['intent']
  };

  const SYSTEM =
    'אתה המוח של אפליקציית בית משפחתית בעברית. המשתמש מדבר/כותב בשפה חופשית, ' +
    'ואתה מזהה כוונה אחת ומחלץ ישויות, ומחזיר JSON יחיד לפי הסכמה. כללים: ' +
    'תוספת לרשימת קניות → add_shopping (פצל ל-items נקיים, ללא פעלים). ' +
    '"תזכיר לי…/אל תשכח…/לפני שאשכח…" → add_reminder (אם אין שעה, ברירת מחדל 19:00; אם אין תאריך, היום). ' +
    'משימה/תור/פגישה → add_task. תשלום/הוצאה עם סכום → add_expense (amount במספר). ' +
    '"סיימתי/קניתי/בוצע" → complete_item (name). "תמחק/תבטל/תוריד מהרשימה" → delete_item (name). ' +
    'יום + מנה/בישול → plan_meal (day, dish). ' +
    'שאלות: מזג אוויר/מה ללבוש → ask_weather; מה אוכלים → ask_meal; אירוע/יום הולדת → ask_event; ' +
    'תרופות → ask_meds; רשימת קניות → ask_shopping; תקציב/הוצאות → ask_budget; לו"ז → ask_schedule; משימות → ask_tasks. ' +
    'המר ביטויי זמן יחסיים (מחר/יום שלישי/בעוד שבוע) לתאריך מוחלט YYYY-MM-DD לפי התאריך שיינתן. שעה בפורמט HH:MM. אל תמציא ישויות שלא נאמרו.';

  // Ask Gemini to understand one utterance. Returns the parsed action object or
  // null on any failure so the caller falls back to the local NLU.
  async function understand(text) {
    if (!enabled()) return null;
    const t = String(text || '').trim();
    if (!t) return null;
    const now = new Date();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(getKey())}`;
      const res = await fetch(url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{
            role: 'user',
            parts: [{ text: `התאריך היום ${now.toLocaleDateString('he-IL')} = ${now.toISOString().slice(0, 10)}, השעה ${now.toTimeString().slice(0, 5)}.\nבקשה: "${t}"` }]
          }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 }
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const txt = data && data.candidates && data.candidates[0] &&
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!txt) return null;
      const action = JSON.parse(txt);
      return (action && action.intent) ? action : null;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }

  function fmtMoney(n) { return (window.Budget && Budget.format) ? Budget.format(n) : ('₪' + n); }
  function matchName(hay, needle) { return (window.NLU && NLU.matches) ? NLU.matches(hay, needle) : String(hay).includes(needle); }

  function completeByName(name) {
    if (!name) return { kind: 'complete', reply: 'מה לסמן כבוצע?' };
    const tasks = (window.Tasks ? Tasks.list() : []).filter((x) => !x.done && matchName(x.title, name));
    if (tasks.length) { const t = tasks[tasks.length - 1]; Tasks.toggle(t.id); return { kind: 'complete', reply: `סימנתי "${t.title}" כבוצע ✓` }; }
    const shop = (window.Shopping ? Shopping.list() : []).filter((i) => !i.bought && matchName(i.name, name));
    if (shop.length) { const it = shop[shop.length - 1]; Shopping.toggle(it.id); return { kind: 'complete', reply: `סימנתי ש"${it.name}" נקנה ✓` }; }
    return { kind: 'complete', reply: `לא מצאתי "${name}" לסימון` };
  }
  function deleteByName(name) {
    if (!name) return { kind: 'delete', reply: 'מה למחוק?' };
    const shop = (window.Shopping ? Shopping.list() : []).filter((i) => matchName(i.name, name));
    if (shop.length) { const it = shop[shop.length - 1]; Shopping.remove(it.id); return { kind: 'delete', reply: `מחקתי את "${it.name}" מהקניות` }; }
    const tasks = (window.Tasks ? Tasks.list() : []).filter((t) => matchName(t.title, name));
    if (tasks.length) { const t = tasks[tasks.length - 1]; Tasks.remove(t.id); return { kind: 'delete', reply: `מחקתי את המשימה "${t.title}"` }; }
    return { kind: 'delete', reply: `לא מצאתי "${name}" למחיקה` };
  }

  // Execute a structured action. Commands act on the modules and return a Hebrew
  // reply. Questions + meal-planning return null so the caller routes them to the
  // local NLU, which answers from live device data.
  function execute(action, originalText) {
    const a = action || {};
    try {
      switch (a.intent) {
        case 'add_shopping': {
          const items = (a.items && a.items.length) ? a.items : (a.title ? [a.title] : []);
          const added = [];
          items.forEach((it) => {
            if (!it) return;
            const cat = (window.FoodBrain && FoodBrain.categoryOf) ? FoodBrain.categoryOf(it) : 'מזון';
            Shopping.add(it, (cat && cat !== 'אחר') ? cat : 'מזון'); added.push(it);
          });
          return added.length ? { kind: 'add', reply: `🛒 הוספתי: ${added.join(', ')}` } : null;
        }
        case 'add_task':
        case 'add_reminder': {
          const title = a.title || 'תזכורת';
          let date = a.date || '';
          let time = a.time || '';
          if (a.intent === 'add_reminder' && !time) time = '19:00';
          if (a.intent === 'add_reminder' && !date) date = new Date().toISOString().slice(0, 10);
          Tasks.add({ title, dueDate: date, dueTime: time });
          return { kind: 'add', reply: `📋 ${title}${date ? ' · ' + date : ''}${time ? ' ' + time : ''}` };
        }
        case 'add_expense': {
          const amt = Number(a.amount) || 0;
          const title = a.title || 'הוצאה';
          Budget.add({ title, amount: amt, category: a.category || 'אחר', date: new Date().toISOString().slice(0, 10) });
          return { kind: 'add', reply: `💰 הוצאה נרשמה: ${fmtMoney(amt)}${title && title !== 'הוצאה' ? ' · ' + title : ''}` };
        }
        case 'complete_item': return completeByName(a.name || a.title);
        case 'delete_item': return deleteByName(a.name || a.title);
        default: return null; // plan_meal + ask_* → local NLU (live data)
      }
    } catch (e) { return null; }
  }

  return { getKey, setKey, enabled, understand, execute, MODEL };
})();
if (typeof window !== 'undefined') window.AI = AI;
