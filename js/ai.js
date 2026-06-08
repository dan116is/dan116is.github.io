// Optional LLM "brain" with THREE tiers, best-available first:
//   1) Free + NO KEY  — Pollinations (OpenAI-compatible, keyless) when online.
//   2) Free key (opt) — Google Gemini, if the user pasted a free AI-Studio key
//                       (more reliable / higher quota).
//   3) Local fallback — the built-in rules engine (NLU), always, for offline /
//                       errors / questions & meal-planning (answered from data).
// Everything returns a structured action {intent, ...entities}; the app executes.
const AI = (() => {
  const KEY = 'ai_api_key';   // optional Google Gemini key
  const OFF = 'ai_off';        // '1' = disable the cloud brain (privacy / local only)
  const GEMINI_MODEL = 'gemini-2.0-flash';

  function getKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY); } catch (e) {} }
  function isOff() { try { return localStorage.getItem(OFF) === '1'; } catch (e) { return false; } }
  function setOff(v) { try { v ? localStorage.setItem(OFF, '1') : localStorage.removeItem(OFF); } catch (e) {} }
  function online() { return (typeof navigator === 'undefined') || navigator.onLine !== false; }
  // The cloud brain is available (no key required) whenever online and not disabled.
  function enabled() { return !isOff() && online(); }
  function mode() { return !enabled() ? 'מקומי' : (getKey() ? 'Gemini' : 'חינם ללא מפתח'); }

  const INTENTS = ['add_shopping', 'add_task', 'add_reminder', 'add_expense',
    'complete_item', 'delete_item', 'plan_meal',
    'ask_weather', 'ask_meal', 'ask_event', 'ask_meds',
    'ask_shopping', 'ask_budget', 'ask_schedule', 'ask_tasks', 'unknown'];

  const SYSTEM =
    'אתה המוח של אפליקציית בית משפחתית בעברית. המשתמש מדבר/כותב בשפה חופשית, ' +
    'ואתה מזהה כוונה אחת ומחלץ ישויות. כללים: ' +
    'תוספת לרשימת קניות → add_shopping (פצל ל-items נקיים, ללא פעלים). ' +
    '"תזכיר לי…/אל תשכח…/לפני שאשכח…" → add_reminder (אם אין שעה, 19:00; אם אין תאריך, היום). ' +
    'משימה/תור/פגישה → add_task. תשלום/הוצאה עם סכום → add_expense (amount מספר). ' +
    '"סיימתי/קניתי/בוצע" → complete_item (name). "תמחק/תבטל/תוריד מהרשימה" → delete_item (name). ' +
    'יום + מנה/בישול → plan_meal (day, dish). ' +
    'שאלות: מזג אוויר/מה ללבוש → ask_weather; מה אוכלים → ask_meal; אירוע/יום הולדת → ask_event; ' +
    'תרופות → ask_meds; רשימת קניות → ask_shopping; תקציב/הוצאות → ask_budget; לו"ז → ask_schedule; משימות → ask_tasks. ' +
    'המר זמן יחסי (מחר/יום שלישי/בעוד שבוע) לתאריך מוחלט YYYY-MM-DD לפי התאריך שיינתן. שעה HH:MM. אל תמציא ישויות.';

  // Gemini structured-output schema (OpenAPI subset).
  const SCHEMA = {
    type: 'OBJECT',
    properties: {
      intent: { type: 'STRING', format: 'enum', enum: INTENTS },
      items: { type: 'ARRAY', items: { type: 'STRING' } },
      title: { type: 'STRING' }, date: { type: 'STRING' }, time: { type: 'STRING' },
      amount: { type: 'NUMBER' }, name: { type: 'STRING' }, day: { type: 'STRING' }, dish: { type: 'STRING' }
    },
    required: ['intent']
  };

  function ctxLine(t) {
    const now = new Date();
    return `התאריך היום ${now.toLocaleDateString('he-IL')} = ${now.toISOString().slice(0, 10)}, השעה ${now.toTimeString().slice(0, 5)}.\nבקשה: "${t}"`;
  }
  // Pull a JSON object out of a model's text (tolerates code fences / stray text).
  function parseJson(txt) {
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) {}
    const m = String(txt).match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    return null;
  }

  function withTimeout(ms) { const c = new AbortController(); return { signal: c.signal, done: setTimeout(() => c.abort(), ms) }; }

  // Tier 2: Google Gemini (free key).
  async function understandGemini(t) {
    const to = withTimeout(8000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(getKey())}`;
      const res = await fetch(url, {
        method: 'POST', signal: to.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: ctxLine(t) }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 }
        })
      });
      if (!res.ok) return null;
      const d = await res.json();
      const txt = d && d.candidates && d.candidates[0] && d.candidates[0].content &&
        d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text;
      const a = parseJson(txt);
      return (a && a.intent && INTENTS.indexOf(a.intent) >= 0) ? a : null;
    } catch (e) { return null; } finally { clearTimeout(to.done); }
  }

  // Tier 1: Pollinations — free, NO KEY, OpenAI-compatible chat completions.
  async function understandFree(t) {
    const to = withTimeout(9000);
    try {
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST', signal: to.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: SYSTEM + '\n\nהחזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף, ללא code fences) עם השדה "intent" ושדות הישויות הרלוונטיים בלבד: items (מערך מחרוזות), title, date (YYYY-MM-DD), time (HH:MM), amount (מספר), name, day, dish.' },
            { role: 'user', content: ctxLine(t) }
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          private: true,
          referrer: 'mishpacha-app'
        })
      });
      if (!res.ok) return null;
      const d = await res.json();
      const txt = (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (typeof d === 'string' ? d : null);
      const a = parseJson(txt);
      return (a && a.intent && INTENTS.indexOf(a.intent) >= 0) ? a : null;
    } catch (e) { return null; } finally { clearTimeout(to.done); }
  }

  async function understand(text) {
    if (!enabled()) return null;
    const t = String(text || '').trim();
    if (!t) return null;
    if (getKey()) { const a = await understandGemini(t); if (a) return a; }
    return understandFree(t); // keyless free tier (also the fallback if Gemini failed)
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
  // reply. Questions + meal-planning return null → caller routes to local NLU.
  function execute(action) {
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
          if (amt <= 0) return { kind: 'none', reply: 'כמה זה עלה? נסה למשל "שילמתי 50 בסופר"' };
          const title = a.title || 'הוצאה';
          Budget.add({ title, amount: Math.round(amt * 100) / 100, category: a.category || 'אחר', date: new Date().toISOString().slice(0, 10) });
          return { kind: 'add', reply: `💰 הוצאה נרשמה: ${fmtMoney(amt)}${title && title !== 'הוצאה' ? ' · ' + title : ''}` };
        }
        case 'complete_item': return completeByName(a.name || a.title);
        case 'delete_item': return deleteByName(a.name || a.title);
        default: return null; // plan_meal + ask_* → local NLU (live data)
      }
    } catch (e) { return null; }
  }

  return { getKey, setKey, isOff, setOff, enabled, mode, understand, execute, GEMINI_MODEL };
})();
if (typeof window !== 'undefined') window.AI = AI;
