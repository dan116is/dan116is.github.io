// Smart quick-add: Hebrew natural-language parsing + optional voice input.
// Routes free text to shopping / tasks / expenses automatically.
const QuickAdd = (() => {
  const DOW = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6 };
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  function parseDate(text) {
    const now = new Date();
    if (/מחרתיים/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 2); return ymd(d); }
    if (/מחר/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 1); return ymd(d); }
    if (/היום/.test(text)) return ymd(now);
    let m = text.match(/בעוד\s+(\d+)\s+ימים/);
    if (m) { const d = new Date(now); d.setDate(d.getDate() + parseInt(m[1], 10)); return ymd(d); }
    if (/שבוע\s+הבא/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 7); return ymd(d); }
    for (const name of Object.keys(DOW)) {
      const re = new RegExp(`(?:ביום\\s+|יום\\s+|ב)${name}\\b`);
      if (re.test(text)) {
        const d = new Date(now); let add = (DOW[name] - d.getDay() + 7) % 7;
        if (add === 0) add = 7;
        d.setDate(d.getDate() + add); return ymd(d);
      }
    }
    return null;
  }

  function parseTime(text) {
    const m = text.match(/(?:בשעה\s*|ב-?)([0-2]?\d)(?::(\d{2}))?\b/);
    if (m && m[1] !== undefined) { return `${pad(parseInt(m[1], 10))}:${m[2] || '00'}`; }
    return null;
  }

  function classify(text) {
    if (/(שקל|₪|ש"ח|שח|הוצאה|שילמתי|הוצאתי|עלה לי)/.test(text)) return 'expense';
    if (/(תזכיר|תזכורת|משימה|לקבוע|תור|פגישה|לזכור|דדליין| דד-ליין)/.test(text)) return 'task';
    if (parseDate(text)) return 'task';
    return 'shopping';
  }

  function parseExpense(text) {
    let amount = 0;
    let m = text.match(/(\d+(?:\.\d+)?)\s*(?:שקל|₪|ש"ח|שח)/);
    if (m) amount = parseFloat(m[1]);
    else { m = text.match(/(\d+(?:\.\d+)?)/); if (m) amount = parseFloat(m[1]); }
    let title = text
      .replace(/\d+(?:\.\d+)?\s*(?:שקל|₪|ש"ח|שח)?/g, '')
      .replace(/(הוצאה|שילמתי|הוצאתי|עלה לי|בסך|על|של)/g, '')
      .replace(/\s+/g, ' ').trim();
    return { amount, title: title || 'הוצאה' };
  }

  function parseTask(text) {
    const dueDate = parseDate(text);
    const time = parseTime(text);
    let title = text
      .replace(/(תזכיר לי|תזכיר|תזכורת|משימה חדשה|משימה|לזכור|בבקשה)/g, '')
      .replace(/(מחרתיים|מחר|היום|שבוע הבא)/g, '')
      .replace(/בעוד\s+\d+\s+ימים/g, '')
      .replace(/(?:ביום\s+|יום\s+|ב)(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\b/g, '')
      .replace(/(?:בשעה\s*|ב-?)[0-2]?\d(?::\d{2})?\b/g, '')
      .replace(/\s+/g, ' ').trim();
    return { title: title || 'תזכורת', dueDate, time };
  }

  function parseShopping(text) {
    const t = text
      .replace(/(תוסיף לי|תוסיפי|תוסיף|הוסף|צריך לקנות|צריך|קנה|תקנה|לקנות|לרשימה|לקניות)/g, '')
      .replace(/\s+/g, ' ').trim();
    const parts = t.split(/\s*,\s*|\sו(?=\S)/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : (t ? [t] : []);
  }

  // Returns { kind, msg } or null.
  function handle(text) {
    text = (text || '').trim();
    if (!text) return null;
    const intent = classify(text);
    if (intent === 'expense') {
      const e = parseExpense(text);
      Budget.add({ title: e.title, amount: e.amount, category: 'אחר', date: new Date().toISOString().slice(0, 10) });
      return { kind: 'expense', msg: `הוצאה נרשמה: ${Budget.format(e.amount)}${e.title && e.title !== 'הוצאה' ? ' · ' + e.title : ''}` };
    }
    if (intent === 'task') {
      const t = parseTask(text);
      Tasks.add({ title: t.title, dueDate: t.dueDate || '', notes: t.time ? `בשעה ${t.time}` : '' });
      return { kind: 'task', msg: `משימה נוספה: ${t.title}${t.dueDate ? ' · ' + t.dueDate : ''}${t.time ? ' ' + t.time : ''}` };
    }
    const items = parseShopping(text);
    if (!items.length) return null;
    for (const it of items) Shopping.add(it, 'אחר');
    return { kind: 'shopping', msg: `נוסף לקניות: ${items.join(', ')}` };
  }

  function voiceSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }

  function startVoice(onText, onState) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const r = new SR();
      r.lang = 'he-IL'; r.interimResults = false; r.maxAlternatives = 1;
      r.onstart = () => onState && onState('listening');
      r.onresult = (e) => { onText(e.results[0][0].transcript); };
      r.onerror = () => onState && onState('error');
      r.onend = () => onState && onState('idle');
      r.start();
      return true;
    } catch (e) { return false; }
  }

  return { handle, parseDate, voiceSupported, startVoice };
})();
if (typeof window !== "undefined") window.QuickAdd = QuickAdd;
