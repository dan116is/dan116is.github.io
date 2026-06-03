// Optional LLM "brain" — when the user has set an Anthropic API key and is
// online, each Hebrew utterance is understood by Claude via tool-use (structured
// intent + entities), the app executes it precisely, and we always FALL BACK to
// the local rules engine (NLU) offline / no key / on any error.
//
// Browser-direct calls require the anthropic-dangerous-direct-browser-access
// header. The key is the user's own, stored only in localStorage on the device.
const AI = (() => {
  const KEY = 'ai_api_key';
  const MODEL = 'claude-haiku-4-5'; // fastest model — best latency for voice

  function getKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY); } catch (e) {} }
  function enabled() { return !!getKey() && (typeof navigator === 'undefined' || navigator.onLine !== false); }

  // The single structured-output tool. Claude must call it with one intent
  // plus the relevant entities; the app does the actual work.
  const ROUTE_TOOL = {
    name: 'route',
    description: 'נתב את בקשת המשתמש לפעולה אחת עם הישויות הרלוונטיות.',
    input_schema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          enum: ['add_shopping', 'add_task', 'add_reminder', 'add_expense',
            'complete_item', 'delete_item', 'plan_meal',
            'ask_weather', 'ask_meal', 'ask_event', 'ask_meds',
            'ask_shopping', 'ask_budget', 'ask_schedule', 'ask_tasks', 'unknown'],
          description: 'הכוונה. שאלה (ask_*) מחזירה מידע; פעולה מבצעת שינוי.'
        },
        items: { type: 'array', items: { type: 'string' }, description: 'פריטי קנייה נקיים (למשל ["חלב","ביצים"])' },
        title: { type: 'string', description: 'שם המשימה/התזכורת/ההוצאה — נקי מפעלים ומילות זמן' },
        date: { type: 'string', description: 'תאריך יעד בפורמט YYYY-MM-DD אם נאמר/משתמע (מחר/יום שלישי). אחרת ריק.' },
        time: { type: 'string', description: 'שעה HH:MM אם נאמרה/משתמעת (בבוקר=08:00, בערב=19:00). אחרת ריק.' },
        amount: { type: 'number', description: 'סכום ההוצאה בשקלים' },
        name: { type: 'string', description: 'שם הפריט/המשימה לסימון-כבוצע או למחיקה' },
        day: { type: 'string', description: 'יום בשבוע לארוחה: ראשון/שני/.../שבת או היום/מחר' },
        dish: { type: 'string', description: 'שם המנה לארוחה' }
      },
      required: ['intent']
    }
  };

  const SYSTEM =
    'אתה המוח של אפליקציית בית משפחתית בעברית. המשתמש מדבר או כותב בשפה חופשית, ' +
    'ואתה מזהה כוונה אחת ומחלץ ישויות, ותמיד קורא לכלי route. כללים: ' +
    'תוספת לרשימת קניות → add_shopping (פצל לפריטים נקיים). ' +
    '"תזכיר לי…/אל תשכח…" → add_reminder (אם אין שעה, ברירת מחדל 19:00; אם אין תאריך, היום). ' +
    'משימה/תור/פגישה → add_task. ' +
    'תשלום/הוצאה עם סכום → add_expense. ' +
    '"סיימתי/קניתי/בוצע" → complete_item. "תמחק/תבטל/תוריד מהרשימה" → delete_item. ' +
    'יום + מנה/בישול → plan_meal. ' +
    'שאלות: מזג אוויר/מה ללבוש → ask_weather; מה אוכלים → ask_meal; אירוע/יום הולדת → ask_event; ' +
    'תרופות → ask_meds; רשימת קניות → ask_shopping; תקציב/הוצאות → ask_budget; לו"ז → ask_schedule; משימות → ask_tasks. ' +
    'המר ביטויי זמן יחסיים לתאריך מוחלט לפי התאריך שיינתן. אל תמציא ישויות שלא נאמרו.';

  // Ask Claude to understand one utterance. Returns the tool input object
  // (the action) or null on any failure so the caller falls back to local NLU.
  async function understand(text) {
    if (!enabled()) return null;
    const t = String(text || '').trim();
    if (!t) return null;
    const now = new Date();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000); // don't hang the UI
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': getKey(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 400,
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          tools: [ROUTE_TOOL],
          tool_choice: { type: 'tool', name: 'route' },
          messages: [{
            role: 'user',
            content: `התאריך היום ${now.toLocaleDateString('he-IL')} = ${now.toISOString().slice(0, 10)}, השעה ${now.toTimeString().slice(0, 5)}.\nבקשה: "${t}"`
          }]
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const tu = (data.content || []).find((b) => b.type === 'tool_use');
      return (tu && tu.input) ? tu.input : null;
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
