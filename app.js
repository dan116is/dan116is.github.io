/* דניאל — אפליקציה אישית. כל המידע שמור ב-localStorage על המכשיר. */

const STORAGE_KEY = 'daniel-app-v1';
const DEFAULT_STATE = {
  tasks: [], errands: [], payments: [], kids: [], meds: [], doses: [], business: [], notes: [],
  settings: { name: 'דניאל', installHidden: false }
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch (e) {
    return structuredClone(DEFAULT_STATE);
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/* ---------- Helpers ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function h(tag, attrs={}, ...children) {
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

function fmtDateRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';
  if (diff > 1 && diff <= 7) return `בעוד ${diff} ימים`;
  if (diff < -1 && diff >= -7) return `לפני ${-diff} ימים`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
function fmtDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function ageYears(iso) {
  const b = new Date(iso); const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}
function ils(n) { return '₪' + Math.round(Number(n)||0).toLocaleString('he-IL'); }
function todayISO() { return new Date().toISOString().slice(0,10); }

/* ---------- Router ---------- */
const routes = {
  '': renderDashboard,
  'dashboard': renderDashboard,
  'tasks': renderTasks,
  'errands': renderErrands,
  'payments': renderPayments,
  'kids': renderKids,
  'meds': renderMeds,
  'business': renderBusiness,
  'notes': renderNotes,
  'beitar': renderBeitar,
};

function go(hash) { window.location.hash = hash; }
function currentRoute() {
  const [name, ...rest] = (location.hash || '#').slice(1).split('/');
  return { name: name || 'dashboard', params: rest };
}
function render() {
  const { name, params } = currentRoute();
  const fn = routes[name] || renderDashboard;
  const app = $('#app');
  app.innerHTML = '';
  app.appendChild(fn(params));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ---------- AI Suggestions ---------- */
function greeting() {
  const h = new Date().getHours();
  const n = state.settings.name;
  if (h < 12) return `בוקר טוב, ${n} ☀️`;
  if (h < 17) return `צהריים טובים, ${n} 🌞`;
  if (h < 21) return `ערב טוב, ${n} 🌙`;
  return `לילה טוב, ${n} ✨`;
}
function suggestions() {
  const out = [];
  const now = Date.now();
  const day = 86400000;

  const overdue = state.tasks.filter(t => !t.done && t.due && new Date(t.due) < now - day);
  const urgent = state.tasks.filter(t => !t.done && t.priority === 'urgent');
  const dueToday = state.tasks.filter(t => !t.done && t.due && fmtDateRelative(t.due) === 'היום');

  if (overdue.length) out.push({ tone:'urgent', icon:'⚠️', title:`${overdue.length} משימות באיחור`, detail:'שווה לסגור או לדחות עכשיו' });
  else if (urgent.length) out.push({ tone:'warning', icon:'🔥', title:`${urgent.length} משימות דחופות`, detail: urgent[0].title });
  if (dueToday.length) out.push({ tone:'info', icon:'📅', title:`להיום: ${dueToday.length} משימות`, detail: dueToday.slice(0,2).map(t=>t.title).join(' • ') });

  const upcomingPay = state.payments.filter(p => !p.paid && new Date(p.due) >= now-day && new Date(p.due) <= now + 7*day);
  const overduePay = state.payments.filter(p => !p.paid && new Date(p.due) < now-day);
  if (overduePay.length) {
    const tot = overduePay.reduce((a,p)=>a+Number(p.amount||0),0);
    out.push({ tone:'urgent', icon:'💳', title:`תשלומים שעברו: ${overduePay.length}`, detail:`סה"כ ${ils(tot)} לטיפול` });
  }
  if (upcomingPay.length) {
    const tot = upcomingPay.reduce((a,p)=>a+Number(p.amount||0),0);
    out.push({ tone:'info', icon:'🗓', title:`השבוע: ${upcomingPay.length} תשלומים`, detail:`סה"כ ${ils(tot)}` });
  }

  const activeMeds = state.meds.filter(m => !m.endDate || new Date(m.endDate) >= now);
  for (const m of activeMeds) {
    if (!m.times || !m.times.length) continue;
    const today = new Date();
    const nextTime = m.times.map(t => {
      const [hh, mm] = t.split(':');
      const d = new Date(); d.setHours(+hh, +mm, 0, 0); return d;
    }).find(d => d >= today);
    if (nextTime && (nextTime - today) < 3600000) {
      const kid = state.kids.find(k => k.id === m.childId);
      out.push({ tone:'warning', icon:'💊', title:`תרופה בקרוב: ${m.name}`, detail: kid ? `${kid.name} • ${m.dosage}` : m.dosage });
    }
  }

  const openDeals = state.business.filter(b => !b.closed && b.type === 'deal');
  if (openDeals.length) {
    const tot = openDeals.reduce((a,b)=>a+Number(b.amount||0),0);
    out.push({ tone:'positive', icon:'💼', title:`${openDeals.length} עסקאות פתוחות`, detail:`פוטנציאל ${ils(tot)}` });
  }

  if (!out.length) out.push({ tone:'positive', icon:'✨', title:'הכל נקי', detail:'אין משימות דחופות. רגע טוב למשהו שאתה דוחה' });
  return out;
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const root = h('div', { class:'page' });

  // Install tip
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!standalone && !state.settings.installHidden) {
    root.appendChild(h('div', { class:'install-tip' },
      h('span', { class:'x', onClick: () => { state.settings.installHidden = true; save(); render(); } }, '✕'),
      h('strong', {}, 'להתקנה במסך הבית: '), 'שתף ⤴ → "הוספה למסך הבית"'
    ));
  }

  // Greeting
  const now = new Date();
  root.appendChild(h('div', { class:'greeting' },
    h('h1', {}, greeting()),
    h('div', { class:'date' }, now.toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' }))
  ));

  // AI Card
  const ai = h('div', { class:'card' }, h('h2', {}, '✨ מה חשוב עכשיו'));
  for (const s of suggestions()) {
    ai.appendChild(h('div', { class:'ai-item' },
      h('div', { class:'ai-icon tone-'+s.tone }, s.icon),
      h('div', {},
        h('div', { class:'ai-title' }, s.title),
        s.detail ? h('div', { class:'ai-detail' }, s.detail) : null
      )
    ));
  }
  root.appendChild(ai);

  // Beitar card
  root.appendChild(beitarCard());

  // Stats
  const openTasks = state.tasks.filter(t => !t.done).length;
  const upcomingPay = state.payments.filter(p => !p.paid && new Date(p.due) >= Date.now() && new Date(p.due) <= Date.now() + 7*86400000).length;
  const activeMeds = state.meds.filter(m => !m.endDate || new Date(m.endDate) >= Date.now()).length;
  root.appendChild(h('div', { class:'stats-row' },
    statTile('📋', openTasks, 'משימות פתוחות', 'var(--accent2)'),
    statTile('💳', upcomingPay, 'תשלומים השבוע', 'var(--accent)'),
    statTile('💊', activeMeds, 'תרופות פעילות', 'var(--pink)')
  ));

  // Modules
  const errands = state.errands.filter(e => !e.done).length;
  const openBiz = state.business.filter(b => !b.closed).length;
  root.appendChild(h('div', { class:'modules' },
    moduleTile('📋','משימות', `${openTasks} פתוחות`, 'var(--accent2)', 'tasks'),
    moduleTile('📝','סידורים', `${errands} ממתינים`, 'var(--teal)', 'errands'),
    moduleTile('💳','תשלומים', `${upcomingPay} השבוע`, 'var(--accent)', 'payments'),
    moduleTile('👨‍👧','ילדים', `${state.kids.length} ילדים`, 'var(--pink)', 'kids'),
    moduleTile('💊','תרופות', `${activeMeds} פעילות`, 'var(--danger)', 'meds'),
    moduleTile('💼','עסקים', `${openBiz} פעילים`, 'var(--indigo)', 'business'),
    moduleTile('🗒️','ניהול אישי', 'פתקים והערות', 'var(--mint)', 'notes'),
    moduleTile('⚽','ביתר ירושלים', 'כל המידע', 'var(--beitar-y)', 'beitar')
  ));

  // Upcoming
  const upcoming = nextItems();
  if (upcoming.length) {
    const card = h('div', { class:'card' }, h('h2', {}, '⏰ הקרובים שלך'));
    for (const u of upcoming) {
      card.appendChild(h('div', { class:'ai-item' },
        h('div', { class:'ai-icon', style:`color:${u.color};background:${u.color}22` }, u.icon),
        h('div', { style:'flex:1' },
          h('div', { class:'ai-title' }, u.title),
          h('div', { class:'ai-detail' }, u.subtitle)
        ),
        h('span', { class:'pill', style:`color:${u.color};background:${u.color}22` }, fmtDateRelative(u.date))
      ));
    }
    root.appendChild(card);
  }

  return root;
}

function nextItems() {
  const now = Date.now();
  const items = [];
  for (const t of state.tasks) if (!t.done && t.due && new Date(t.due) >= now)
    items.push({ title:t.title, subtitle:'משימה • '+priorityLabel(t.priority), date:t.due, icon:'📋', color:'#338cff' });
  for (const p of state.payments) if (!p.paid && new Date(p.due) >= now)
    items.push({ title:p.title, subtitle:ils(p.amount), date:p.due, icon:'💳', color:'#fac81a' });
  for (const e of state.errands) if (!e.done && e.due && new Date(e.due) >= now)
    items.push({ title:e.title, subtitle:e.location||'סידור', date:e.due, icon:'📝', color:'#1ecbb0' });
  return items.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,5);
}

function statTile(icon, value, label, color) {
  return h('div', { class:'stat' },
    h('span', { class:'ico', style:`color:${color}` }, icon),
    h('div', { class:'val' }, String(value)),
    h('div', { class:'lbl' }, label)
  );
}
function moduleTile(icon, title, sub, color, hash) {
  return h('div', { class:'module', onClick: () => go(hash) },
    h('div', { class:'module-head' },
      h('div', { class:'module-icon', style:`background:${color}22;color:${color}` }, icon),
      h('span', { class:'chev' }, '‹')
    ),
    h('h3', {}, title),
    h('div', { class:'sub' }, sub)
  );
}

function beitarCard() {
  const next = beitarData().nextMatch;
  const daysLeft = Math.max(0, Math.round((new Date(next.date) - Date.now()) / 86400000));
  return h('div', { class:'beitar-card', onClick: () => go('beitar') },
    h('div', { class:'beitar-head' },
      h('div', { class:'beitar-logo' }, 'ב'),
      h('div', {},
        h('div', { class:'name' }, 'ביתר ירושלים'),
        h('div', { class:'sub' }, 'הקבוצה הכי גדולה בארץ 💛🖤')
      )
    ),
    h('div', { class:'beitar-match' },
      h('div', { class:'info' },
        h('div', { class:'label' }, 'המשחק הבא'),
        h('div', { class:'title' }, `${next.isHome ? 'בית' : 'חוץ'} נגד ${next.opponent}`),
        h('div', { class:'meta' }, `${fmtDateRelative(next.date)} • ${fmtTime(next.date)} • ${next.venue}`)
      ),
      h('div', { class:'countdown' },
        h('div', { class:'num' }, String(daysLeft)),
        h('div', { class:'lbl' }, daysLeft === 1 ? 'יום' : 'ימים')
      )
    ),
    h('div', { class:'pills' },
      h('span', { class:'pill', style:'color:var(--beitar-y);background:rgba(255,213,0,.18)' }, `מקום ${beitarData().pos} בליגה`),
      h('span', { class:'pill', style:'color:var(--beitar-y);background:rgba(255,213,0,.18)' }, `${beitarData().pts} נק'`)
    )
  );
}

/* ---------- Beitar data ---------- */
function beitarData() {
  const now = Date.now();
  return {
    nextMatch: { opponent:'מכבי ת״א', date: new Date(now + 3*86400000 + 19*3600000).toISOString(), venue:'טדי, ירושלים', competition:'ליגת העל', isHome:true },
    lastResult: { opponent:'הפועל ב״ש', date: new Date(now - 4*86400000).toISOString(), venue:'טרנר, באר שבע', competition:'ליגת העל', result:'2-1 ניצחון' },
    pos: 4, pts: 45, scorer: 'ברנדן אוגביבו',
    news: [
      { headline:'ניצחון חוץ חשוב בבאר שבע', body:'ביתר ירושלים חזרה הביתה עם שלוש נקודות חשובות אחרי 2-1 על הפועל ב״ש.', date: new Date(now - 3*86400000).toISOString() },
      { headline:'השחקן החדש הגיע למחנה', body:'החלוץ הזר חתם ל-3 עונות והצטרף לאימונים. צפוי לעלות בדרבי הקרוב.', date: new Date(now - 86400000).toISOString() },
      { headline:'כרטיסים לדרבי – מהיום בקופות', body:'המנויים יכולים להזמין עד יום שלישי בערב.', date: new Date(now).toISOString() }
    ]
  };
}

/* ---------- Beitar page ---------- */
function renderBeitar() {
  const d = beitarData();
  const daysLeft = Math.max(0, Math.round((new Date(d.nextMatch.date) - Date.now()) / 86400000));
  const root = h('div', { class:'beitar-page' },
    h('div', { class:'page-head', style:'padding:12px 16px' },
      h('button', { class:'back-btn', onClick: () => go('') }, '‹'),
      h('h1', { style:'color:var(--beitar-y)' }, 'ביתר ירושלים')
    ),
    h('div', { class:'beitar-hero' },
      h('div', { class:'logo-big' }, 'ב'),
      h('h1', {}, 'ביתר ירושלים'),
      h('p', {}, `הקבוצה הכי גדולה בארץ • ${state.settings.name} 💛🖤`)
    ),
    h('div', { class:'beitar-section' },
      h('h3', {}, `📅 המשחק הבא • בעוד ${daysLeft} ימים`),
      h('div', { class:'beitar-vs' },
        h('div', { class:'beitar-team' },
          h('div', { class:'crest home' }, 'ב'),
          h('div', { class:'nm' }, 'ביתר'),
          h('div', { class:'sd' }, d.nextMatch.isHome ? 'בית' : 'חוץ')
        ),
        h('div', { class:'sep' }, 'VS'),
        h('div', { class:'beitar-team' },
          h('div', { class:'crest' }, d.nextMatch.opponent[0]),
          h('div', { class:'nm' }, d.nextMatch.opponent),
          h('div', { class:'sd' }, d.nextMatch.isHome ? 'חוץ' : 'בית')
        )
      ),
      h('div', { class:'beitar-meta' },
        h('div', { class:'line' }, `🕐 ${fmtDateRelative(d.nextMatch.date)} • ${fmtTime(d.nextMatch.date)}`),
        h('div', { class:'line' }, `📍 ${d.nextMatch.venue}`),
        h('div', { class:'line', style:'color:var(--beitar-y)' }, `🏆 ${d.nextMatch.competition}`)
      )
    ),
    h('div', { class:'beitar-section' },
      h('h3', {}, '⚽ תוצאה אחרונה'),
      h('div', { style:'display:flex;justify-content:space-between;align-items:center' },
        h('div', {},
          h('div', { style:'font-weight:700' }, `נגד ${d.lastResult.opponent}`),
          h('div', { style:'font-size:12px;color:rgba(255,255,255,.6)' }, d.lastResult.competition)
        ),
        h('span', { class:'pill', style:'color:var(--success);background:rgba(51,204,114,.25)' }, d.lastResult.result)
      )
    ),
    h('div', { class:'beitar-stats' },
      beitarStat(d.pos + 'º', 'מקום בליגה'),
      beitarStat(String(d.pts), 'נקודות'),
      beitarStat(d.scorer.split(' ')[0], 'כובש מוביל')
    ),
    h('div', { class:'beitar-section' },
      h('h3', {}, '📰 חדשות מהצהובים שחורים'),
      ...d.news.map(n => h('div', { class:'beitar-news' },
        h('h4', {}, n.headline),
        h('p', {}, n.body),
        h('time', {}, fmtDateRelative(n.date))
      ))
    )
  );
  return root;
}
function beitarStat(val, lbl) {
  return h('div', { class:'beitar-stat' },
    h('div', { class:'val' }, val),
    h('div', { class:'lbl' }, lbl)
  );
}

/* ---------- Tasks ---------- */
const PRIORITIES = ['low','medium','high','urgent'];
const PRIORITY_LABELS = { low:'נמוכה', medium:'בינונית', high:'גבוהה', urgent:'דחוף' };
const PRIORITY_COLORS = { low:'#9ca3af', medium:'#338cff', high:'#ff9933', urgent:'#f24d4d' };
const CATEGORIES = ['personal','family','business','kids','health','finance'];
const CATEGORY_LABELS = { personal:'אישי', family:'משפחה', business:'עסק', kids:'ילדים', health:'בריאות', finance:'כספים' };
function priorityLabel(p) { return PRIORITY_LABELS[p] || 'בינונית'; }

let tasksFilter = null;

function renderTasks() {
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('משימות'));
  const chips = h('div', { class:'chips' },
    chip('הכל', tasksFilter === null, () => { tasksFilter = null; render(); })
  );
  for (const c of CATEGORIES) chips.appendChild(chip(CATEGORY_LABELS[c], tasksFilter===c, () => { tasksFilter = c; render(); }));
  root.appendChild(chips);

  const items = state.tasks
    .filter(t => !tasksFilter || t.category === tasksFilter)
    .sort((a,b) => (a.done - b.done) || (new Date(a.due||'2099') - new Date(b.due||'2099')));

  if (!items.length) return root.appendChild(empty('📋', 'אין משימות', 'הוסף משימה חדשה מהכפתור +')), root;

  for (const t of items) root.appendChild(taskRow(t));
  return root;
}
function taskRow(t) {
  return h('div', { class:'row' },
    h('button', { class:'check '+(t.done?'done':''), onClick: () => { t.done = !t.done; save(); render(); } }, t.done?'✓':''),
    h('div', { class:'row-body' },
      h('div', { class:'title '+(t.done?'strike':'') }, t.title),
      t.details ? h('div', { class:'meta' }, t.details) : null,
      h('div', { class:'badges' },
        h('span', { class:'pill', style:'background:rgba(255,255,255,.08);color:#fff' }, CATEGORY_LABELS[t.category]||'אישי'),
        h('span', { class:'pill', style:`background:${PRIORITY_COLORS[t.priority]}33;color:${PRIORITY_COLORS[t.priority]}` }, priorityLabel(t.priority)),
        t.due ? h('span', { class:'pill', style: overdue(t)? 'background:rgba(242,77,77,.2);color:#f24d4d' : 'background:rgba(51,140,255,.2);color:#338cff' }, fmtDateRelative(t.due)) : null
      )
    ),
    h('button', { class:'del', onClick: () => deleteItem('tasks', t.id) }, '🗑')
  );
}
function overdue(t) { return t.due && new Date(t.due) < Date.now() && !t.done; }

function modalAddTask() {
  let f = { title:'', details:'', hasDue:false, due: todayISO(), priority:'medium', category:'personal' };
  openModal('משימה חדשה', body => {
    body.append(
      field('כותרת', input('text', f.title, v => f.title = v, 'מה צריך לעשות?')),
      field('פרטים', textarea(f.details, v => f.details = v, 'לא חובה')),
      toggle('יש תאריך יעד', f.hasDue, v => { f.hasDue = v; reopen(); }),
      f.hasDue ? field('יעד', input('date', f.due, v => f.due = v)) : null,
      field('עדיפות', select(PRIORITIES.map(p => [p, priorityLabel(p)]), f.priority, v => f.priority = v)),
      field('קטגוריה', select(CATEGORIES.map(c => [c, CATEGORY_LABELS[c]]), f.category, v => f.category = v))
    );
    function reopen() {
      closeModal();
      setTimeout(() => modalAddTaskWith(f), 0);
    }
    body.append(saveCancelRow(() => {
      if (!f.title.trim()) return;
      state.tasks.push({ id:uid(), title:f.title.trim(), details:f.details, due: f.hasDue ? f.due : null, done:false, priority:f.priority, category:f.category, createdAt: Date.now() });
      save(); closeModal(); render();
    }));
  });
}
function modalAddTaskWith(f) {
  openModal('משימה חדשה', body => {
    body.append(
      field('כותרת', input('text', f.title, v => f.title = v, 'מה צריך לעשות?')),
      field('פרטים', textarea(f.details, v => f.details = v, 'לא חובה')),
      toggle('יש תאריך יעד', f.hasDue, v => { f.hasDue = v; closeModal(); setTimeout(()=>modalAddTaskWith(f),0); }),
      f.hasDue ? field('יעד', input('date', f.due, v => f.due = v)) : null,
      field('עדיפות', select(PRIORITIES.map(p => [p, priorityLabel(p)]), f.priority, v => f.priority = v)),
      field('קטגוריה', select(CATEGORIES.map(c => [c, CATEGORY_LABELS[c]]), f.category, v => f.category = v)),
      saveCancelRow(() => {
        if (!f.title.trim()) return;
        state.tasks.push({ id:uid(), title:f.title.trim(), details:f.details, due: f.hasDue ? f.due : null, done:false, priority:f.priority, category:f.category, createdAt: Date.now() });
        save(); closeModal(); render();
      })
    );
  });
}

/* ---------- Errands ---------- */
function renderErrands() {
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('סידורים'));
  const items = [...state.errands].sort((a,b) => (a.done-b.done) || (new Date(a.due||'2099') - new Date(b.due||'2099')));
  if (!items.length) return root.appendChild(empty('📝','אין סידורים','הוסף סידור מהכפתור +')), root;
  for (const e of items) {
    root.appendChild(h('div', { class:'row' },
      h('button', { class:'check '+(e.done?'done':''), onClick: () => { e.done = !e.done; save(); render(); } }, e.done?'✓':''),
      h('div', { class:'row-body' },
        h('div', { class:'title '+(e.done?'strike':'') }, e.title),
        h('div', { class:'badges' },
          e.location ? h('span', { class:'pill', style:'background:rgba(30,203,176,.2);color:var(--teal)' }, e.location) : null,
          e.due ? h('span', { class:'pill', style: overdue(e)?'background:rgba(242,77,77,.2);color:#f24d4d':'background:rgba(51,140,255,.2);color:#338cff' }, fmtDateRelative(e.due)) : null
        )
      ),
      h('button', { class:'del', onClick: () => deleteItem('errands', e.id) }, '🗑')
    ));
  }
  return root;
}
function modalAddErrand() {
  let f = { title:'', location:'', hasDue:false, due:todayISO() };
  const open = () => openModal('סידור חדש', body => {
    body.append(
      field('מה לעשות', input('text', f.title, v => f.title = v, 'תיאור')),
      field('איפה (אופציונלי)', input('text', f.location, v => f.location = v, 'מיקום')),
      toggle('יש דדליין', f.hasDue, v => { f.hasDue = v; closeModal(); setTimeout(open,0); }),
      f.hasDue ? field('מתי', input('date', f.due, v => f.due = v)) : null,
      saveCancelRow(() => {
        if (!f.title.trim()) return;
        state.errands.push({ id:uid(), title:f.title.trim(), location:f.location, due: f.hasDue?f.due:null, done:false, createdAt:Date.now() });
        save(); closeModal(); render();
      })
    );
  });
  open();
}

/* ---------- Payments ---------- */
function renderPayments() {
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('תשלומים'));
  const totalDue = state.payments.filter(p => !p.paid).reduce((a,p) => a + Number(p.amount||0), 0);
  const mo = new Date().getMonth(), yr = new Date().getFullYear();
  const paidMonth = state.payments.filter(p => p.paid && new Date(p.due).getMonth()===mo && new Date(p.due).getFullYear()===yr).reduce((a,p) => a + Number(p.amount||0), 0);
  root.appendChild(h('div', { class:'stats-row', style:'grid-template-columns:1fr 1fr' },
    statTile('💳', ils(totalDue), 'סה״כ לתשלום', 'var(--danger)'),
    statTile('✅', ils(paidMonth), 'שולם החודש', 'var(--success)')
  ));
  const items = [...state.payments].sort((a,b) => (a.paid-b.paid) || (new Date(a.due) - new Date(b.due)));
  if (!items.length) return root.appendChild(empty('💳','אין תשלומים','הוסף תשלום מהכפתור +')), root;
  for (const p of items) {
    root.appendChild(h('div', { class:'row' },
      h('button', { class:'check '+(p.paid?'done':''), onClick: () => { p.paid = !p.paid; save(); render(); } }, p.paid?'✓':''),
      h('div', { class:'row-body' },
        h('div', { class:'title '+(p.paid?'strike':'') }, p.title),
        h('div', { class:'badges' },
          h('span', { class:'pill', style:'background:rgba(250,200,26,.2);color:var(--accent)' }, ils(p.amount)),
          h('span', { class:'pill', style: (new Date(p.due) < Date.now() && !p.paid)?'background:rgba(242,77,77,.2);color:#f24d4d':'background:rgba(51,140,255,.2);color:#338cff' }, fmtDateRelative(p.due)),
          p.recurring ? h('span', { class:'pill', style:'background:rgba(108,92,231,.25);color:var(--indigo)' }, 'חודשי') : null
        ),
        p.notes ? h('div', { class:'meta' }, p.notes) : null
      ),
      h('button', { class:'del', onClick: () => deleteItem('payments', p.id) }, '🗑')
    ));
  }
  return root;
}
function modalAddPayment() {
  let f = { title:'', amount:'', due:todayISO(), recurring:false, notes:'' };
  const open = () => openModal('תשלום חדש', body => {
    body.append(
      field('שם התשלום', input('text', f.title, v => f.title = v, 'לדוגמה: ארנונה')),
      field('סכום ₪', input('number', f.amount, v => f.amount = v, '0')),
      field('תאריך לתשלום', input('date', f.due, v => f.due = v)),
      toggle('תשלום חוזר חודשי', f.recurring, v => { f.recurring = v; closeModal(); setTimeout(open,0); }),
      field('הערות', textarea(f.notes, v => f.notes = v, '')),
      saveCancelRow(() => {
        if (!f.title.trim()) return;
        state.payments.push({ id:uid(), title:f.title.trim(), amount:Number(f.amount)||0, due:f.due, paid:false, recurring:f.recurring, notes:f.notes, createdAt:Date.now() });
        save(); closeModal(); render();
      })
    );
  });
  open();
}

/* ---------- Kids ---------- */
function renderKids(params) {
  const childId = params[0];
  if (childId) return renderChildDetail(childId);

  const root = h('div', { class:'page' });
  root.appendChild(pageHead('ילדים'));
  if (!state.kids.length) return root.appendChild(empty('👨‍👧','עוד לא הוספת ילדים','הוסף ילד כדי לנהל תרופות והערות')), root;
  for (const k of state.kids) {
    const meds = state.meds.filter(m => m.childId === k.id && (!m.endDate || new Date(m.endDate) >= Date.now()));
    root.appendChild(h('div', { class:'card', onClick: () => go('kids/'+k.id) },
      h('div', { class:'child-card' },
        h('div', { class:'child-avatar' }, k.name[0]),
        h('div', { style:'flex:1' },
          h('div', { style:'font-size:17px;font-weight:700' }, k.name),
          h('div', { class:'muted' }, `גיל ${ageYears(k.birthDate)}`),
          meds.length ? h('span', { class:'pill', style:'background:rgba(255,92,138,.2);color:var(--pink);margin-top:4px' }, `${meds.length} תרופות פעילות`) : null
        ),
        h('span', { class:'chev' }, '‹')
      )
    ));
  }
  return root;
}
function renderChildDetail(id) {
  const k = state.kids.find(x => x.id === id);
  const root = h('div', { class:'page' });
  if (!k) { root.appendChild(empty('❓','לא נמצא','')); return root; }
  root.appendChild(h('div', { class:'page-head' },
    h('button', { class:'back-btn', onClick: () => go('kids') }, '‹'),
    h('h1', {}, k.name)
  ));
  root.appendChild(h('div', { class:'card' },
    h('div', { class:'child-card' },
      h('div', { class:'child-avatar', style:'width:72px;height:72px;font-size:32px' }, k.name[0]),
      h('div', {},
        h('div', { style:'font-size:22px;font-weight:800' }, k.name),
        h('div', { class:'muted' }, `גיל ${ageYears(k.birthDate)} • נולד ${fmtDateShort(k.birthDate)}`)
      )
    )
  ));
  if (k.notes) root.appendChild(h('div', { class:'card' }, h('h2', {}, 'הערות'), h('div', { class:'muted' }, k.notes)));

  const kidMeds = state.meds.filter(m => m.childId === id);
  const medsCard = h('div', { class:'card' },
    h('div', { style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' },
      h('h2', { style:'margin:0' }, 'תרופות'),
      h('button', { style:'color:var(--accent);font-weight:700;font-size:14px', onClick: () => modalAddMed(id) }, '+ הוסף')
    )
  );
  if (!kidMeds.length) medsCard.appendChild(h('div', { class:'muted' }, 'אין תרופות עדיין'));
  for (const m of kidMeds) medsCard.appendChild(medRow(m, true));
  root.appendChild(medsCard);

  root.appendChild(h('button', { class:'btn danger', onClick: () => {
    if (confirm(`למחוק את ${k.name} וכל הנתונים שלו?`)) {
      state.kids = state.kids.filter(x => x.id !== id);
      state.meds = state.meds.filter(m => m.childId !== id);
      save(); go('kids');
    }
  }}, 'מחק ילד'));
  return root;
}
function modalAddKid() {
  let f = { name:'', birthDate: new Date(Date.now()-5*365*86400000).toISOString().slice(0,10), notes:'' };
  openModal('ילד חדש', body => {
    body.append(
      field('שם הילד/ה', input('text', f.name, v => f.name = v, 'שם פרטי')),
      field('תאריך לידה', input('date', f.birthDate, v => f.birthDate = v)),
      field('הערות (אלרגיות, רגישויות)', textarea(f.notes, v => f.notes = v, '')),
      saveCancelRow(() => {
        if (!f.name.trim()) return;
        state.kids.push({ id:uid(), name:f.name.trim(), birthDate:f.birthDate, notes:f.notes });
        save(); closeModal(); render();
      })
    );
  });
}

/* ---------- Medications ---------- */
function renderMeds() {
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('תרופות'));
  const active = state.meds.filter(m => !m.endDate || new Date(m.endDate) >= Date.now());
  const past = state.meds.filter(m => m.endDate && new Date(m.endDate) < Date.now());
  if (!state.meds.length) return root.appendChild(empty('💊','אין תרופות במעקב','הוסף תרופה מהכפתור +')), root;
  if (active.length) {
    root.appendChild(h('h2', { style:'margin:6px 4px 8px;font-size:14px;color:var(--muted);font-weight:600' }, 'פעילות'));
    for (const m of active) root.appendChild(medRow(m));
  }
  if (past.length) {
    root.appendChild(h('h2', { style:'margin:16px 4px 8px;font-size:14px;color:var(--muted);font-weight:600' }, 'הסתיימו'));
    for (const m of past) root.appendChild(medRow(m));
  }
  return root;
}
function medRow(m, compact=false) {
  const kid = state.kids.find(k => k.id === m.childId);
  const doses = state.doses.filter(d => d.medId === m.id);
  return h('div', { class:'card', style: 'margin-bottom:10px;'+(m.endDate && new Date(m.endDate)<Date.now()?'opacity:.5':'') },
    h('div', { style:'display:flex;gap:12px;align-items:flex-start' },
      h('div', { style:'width:44px;height:44px;border-radius:50%;background:rgba(255,92,138,.2);color:var(--pink);display:flex;align-items:center;justify-content:center;font-size:22px' }, '💊'),
      h('div', { style:'flex:1' },
        h('div', { style:'font-weight:700;font-size:16px' }, m.name),
        h('div', { class:'muted' }, m.dosage),
        h('div', { class:'badges' },
          kid ? h('span', { class:'pill', style:'background:rgba(255,92,138,.2);color:var(--pink)' }, kid.name) : null,
          m.times && m.times.length ? h('span', { class:'pill', style:'background:rgba(51,140,255,.2);color:var(--accent2)' }, `${m.times.length}/יום`) : null,
          doses.length ? h('span', { class:'pill', style:'background:rgba(51,204,114,.2);color:var(--success)' }, `${doses.length} מנות`) : null
        )
      ),
      h('button', { class:'del', onClick: (ev) => { ev.stopPropagation(); modalMedDetail(m.id); } }, '⋯')
    ),
    h('div', { style:'display:flex;gap:8px;margin-top:10px' },
      h('button', { class:'btn success', style:'padding:10px', onClick: () => {
        state.doses.push({ id:uid(), medId:m.id, takenAt: Date.now() });
        save(); render();
      }}, '✓ נלקח עכשיו')
    )
  );
}
function modalMedDetail(id) {
  const m = state.meds.find(x => x.id === id);
  if (!m) return;
  const doses = state.doses.filter(d => d.medId === id).sort((a,b) => b.takenAt - a.takenAt);
  openModal(m.name, body => {
    body.append(
      h('div', { class:'muted', style:'margin-bottom:10px' }, m.dosage),
      m.instructions ? h('div', { class:'muted', style:'margin-bottom:10px' }, m.instructions) : null,
      m.times && m.times.length ? h('div', { class:'badges', style:'margin-bottom:14px' }, ...m.times.map(t => h('span', { class:'pill', style:'background:rgba(51,140,255,.2);color:var(--accent2)' }, t))) : null,
      h('h3', { style:'font-size:14px;color:var(--muted);margin:14px 0 8px' }, 'יומן מינונים'),
      doses.length ? doses.slice(0,15).map(d => h('div', { style:'padding:8px 0;border-bottom:1px solid var(--line)' },
        `✓ ${fmtDateRelative(new Date(d.takenAt).toISOString())} • ${fmtTime(new Date(d.takenAt).toISOString())}`
      )) : h('div', { class:'muted' }, 'עוד לא נרשמו מנות'),
      h('button', { class:'btn danger', style:'margin-top:14px', onClick: () => {
        if (confirm('למחוק תרופה זו?')) {
          state.meds = state.meds.filter(x => x.id !== id);
          state.doses = state.doses.filter(d => d.medId !== id);
          save(); closeModal(); render();
        }
      }}, 'מחק תרופה')
    );
  });
}
function modalAddMed(forChildId=null) {
  let f = { name:'', dosage:'', instructions:'', startDate: todayISO(), hasEnd:false, endDate: new Date(Date.now()+7*86400000).toISOString().slice(0,10), times:[], childId: forChildId||'' };
  const open = () => openModal('תרופה חדשה', body => {
    body.append(
      field('שם התרופה', input('text', f.name, v => f.name = v, 'לדוגמה: אקמול')),
      field('מינון', input('text', f.dosage, v => f.dosage = v, 'לדוגמה: 5 מ"ל / חצי כדור')),
      field('הוראות', textarea(f.instructions, v => f.instructions = v, 'לדוגמה: אחרי אוכל')),
      !forChildId ? field('עבור מי', select([['','אישית'], ...state.kids.map(k=>[k.id,k.name])], f.childId, v => f.childId = v)) : null,
      field('תאריך התחלה', input('date', f.startDate, v => f.startDate = v)),
      toggle('יש תאריך סיום', f.hasEnd, v => { f.hasEnd = v; closeModal(); setTimeout(open,0); }),
      f.hasEnd ? field('סיום', input('date', f.endDate, v => f.endDate = v)) : null,
      h('div', { class:'field' },
        h('label', {}, 'שעות לקיחה'),
        h('div', { class:'badges' }, ...f.times.map((t,i) => h('span', { class:'pill', style:'background:var(--card-hi);cursor:pointer', onClick: () => { f.times.splice(i,1); closeModal(); setTimeout(open,0); } }, `${t} ✕`))),
        h('button', { class:'btn ghost', style:'margin-top:8px', onClick: () => {
          const t = prompt('שעה (פורמט HH:MM)', '08:00');
          if (t && /^\d{1,2}:\d{2}$/.test(t)) { f.times.push(t); closeModal(); setTimeout(open,0); }
        }}, '+ הוסף שעה')
      ),
      saveCancelRow(() => {
        if (!f.name.trim() || !f.dosage.trim()) return;
        state.meds.push({ id:uid(), name:f.name.trim(), dosage:f.dosage, instructions:f.instructions, startDate:f.startDate, endDate: f.hasEnd?f.endDate:null, times:f.times, childId:f.childId||null });
        save(); closeModal(); render();
      })
    );
  });
  open();
}

/* ---------- Business ---------- */
const BIZ_TYPES = ['deal','lead','meeting','income','expense'];
const BIZ_LABELS = { deal:'עסקה', lead:'ליד', meeting:'פגישה', income:'הכנסה', expense:'הוצאה' };
const BIZ_ICONS = { deal:'🤝', lead:'👤', meeting:'📅', income:'⬆️', expense:'⬇️' };
const BIZ_COLORS = { deal:'#6c5ce7', lead:'#338cff', meeting:'#fac81a', income:'#33cc72', expense:'#f24d4d' };
let bizFilter = null;

function renderBusiness() {
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('עסקים'));
  const openValue = state.business.filter(b => !b.closed && b.type==='deal').reduce((a,b)=>a+Number(b.amount||0),0);
  const mo = new Date().getMonth(), yr = new Date().getFullYear();
  const income = state.business.filter(b => b.type==='income' && new Date(b.date).getMonth()===mo && new Date(b.date).getFullYear()===yr).reduce((a,b)=>a+Number(b.amount||0),0);
  root.appendChild(h('div', { class:'stats-row', style:'grid-template-columns:1fr 1fr' },
    statTile('💼', ils(openValue), 'עסקאות פתוחות', 'var(--indigo)'),
    statTile('⬆️', ils(income), 'הכנסות החודש', 'var(--success)')
  ));
  const chips = h('div', { class:'chips' }, chip('הכל', bizFilter===null, () => { bizFilter=null; render(); }));
  for (const t of BIZ_TYPES) chips.appendChild(chip(BIZ_LABELS[t], bizFilter===t, () => { bizFilter=t; render(); }));
  root.appendChild(chips);
  const items = state.business.filter(b => !bizFilter || b.type===bizFilter).sort((a,b) => (a.closed-b.closed) || (new Date(b.date) - new Date(a.date)));
  if (!items.length) return root.appendChild(empty('💼','אין רישומים','הוסף פעילות מהכפתור +')), root;
  for (const b of items) {
    root.appendChild(h('div', { class:'row' },
      h('div', { style:`width:40px;height:40px;border-radius:50%;background:${BIZ_COLORS[b.type]}22;color:${BIZ_COLORS[b.type]};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0` }, BIZ_ICONS[b.type]),
      h('div', { class:'row-body' },
        h('div', { class:'title' }, b.title),
        h('div', { class:'badges' },
          h('span', { class:'pill', style:`background:${BIZ_COLORS[b.type]}33;color:${BIZ_COLORS[b.type]}` }, BIZ_LABELS[b.type]),
          b.amount ? h('span', { class:'pill', style:'background:rgba(250,200,26,.2);color:var(--accent)' }, ils(b.amount)) : null,
          h('span', { class:'pill', style:'background:rgba(255,255,255,.08);color:var(--muted)' }, fmtDateShort(b.date))
        ),
        b.contact ? h('div', { class:'meta' }, '👤 ' + b.contact) : null
      ),
      b.closed ? h('span', { style:'color:var(--success);font-size:20px' }, '✓') :
        h('button', { class:'check', onClick: () => { b.closed = true; save(); render(); } }, ''),
      h('button', { class:'del', onClick: () => deleteItem('business', b.id) }, '🗑')
    ));
  }
  return root;
}
function modalAddBusiness() {
  let f = { title:'', type:'deal', amount:'', date: todayISO(), contact:'', notes:'' };
  openModal('פעילות עסקית', body => {
    body.append(
      field('כותרת', input('text', f.title, v => f.title = v, 'מה זה?')),
      field('סוג', select(BIZ_TYPES.map(t => [t, BIZ_LABELS[t]]), f.type, v => f.type = v)),
      field('סכום ₪', input('number', f.amount, v => f.amount = v, '0')),
      field('תאריך', input('date', f.date, v => f.date = v)),
      field('איש קשר', input('text', f.contact, v => f.contact = v, 'שם / טלפון')),
      field('הערות', textarea(f.notes, v => f.notes = v, '')),
      saveCancelRow(() => {
        if (!f.title.trim()) return;
        state.business.push({ id:uid(), title:f.title.trim(), type:f.type, amount:Number(f.amount)||0, date:f.date, contact:f.contact, notes:f.notes, closed:false, createdAt:Date.now() });
        save(); closeModal(); render();
      })
    );
  });
}

/* ---------- Notes ---------- */
function renderNotes(params) {
  const noteId = params[0];
  if (noteId) return renderNoteEdit(noteId);
  const root = h('div', { class:'page' });
  root.appendChild(pageHead('ניהול אישי'));
  const items = [...state.notes].sort((a,b) => b.updatedAt - a.updatedAt);
  if (!items.length) return root.appendChild(empty('🗒️','אין פתקים עדיין','שמור מחשבות, רעיונות, רשימות')), root;
  for (const n of items) {
    root.appendChild(h('div', { class:'card', onClick: () => go('notes/'+n.id) },
      h('h3', { style:'margin:0 0 4px;font-size:16px' }, n.title),
      n.body ? h('div', { class:'muted', style:'font-size:13px;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden' }, n.body) : null,
      h('div', { style:'font-size:11px;color:var(--muted);margin-top:6px' }, fmtDateRelative(new Date(n.updatedAt).toISOString()))
    ));
  }
  return root;
}
function renderNoteEdit(id) {
  const n = state.notes.find(x => x.id === id);
  const root = h('div', { class:'page' });
  if (!n) { root.appendChild(empty('❓','פתק לא נמצא','')); return root; }
  root.appendChild(h('div', { class:'page-head' }, h('button', { class:'back-btn', onClick: () => go('notes') }, '‹'), h('h1', {}, 'פתק')));
  const titleIn = input('text', n.title, v => { n.title = v; n.updatedAt = Date.now(); save(); });
  const bodyIn = textarea(n.body, v => { n.body = v; n.updatedAt = Date.now(); save(); }, '');
  bodyIn.style.minHeight = '300px';
  root.append(field('כותרת', titleIn), field('תוכן', bodyIn));
  root.appendChild(h('button', { class:'btn danger', onClick: () => {
    if (confirm('למחוק פתק?')) { state.notes = state.notes.filter(x => x.id !== id); save(); go('notes'); }
  }}, 'מחק'));
  return root;
}
function modalAddNote() {
  let f = { title:'', body:'' };
  openModal('פתק חדש', body => {
    body.append(
      field('כותרת', input('text', f.title, v => f.title = v, 'נושא')),
      field('תוכן', textarea(f.body, v => f.body = v, '')),
      saveCancelRow(() => {
        if (!f.title.trim()) return;
        const id = uid();
        state.notes.push({ id, title:f.title.trim(), body:f.body, createdAt:Date.now(), updatedAt:Date.now() });
        save(); closeModal(); go('notes/'+id);
      })
    );
  });
}

/* ---------- Form helpers ---------- */
function pageHead(title) {
  return h('div', { class:'page-head' },
    h('button', { class:'back-btn', onClick: () => go('') }, '‹'),
    h('h1', {}, title)
  );
}
function chip(label, active, onClick) {
  return h('button', { class:'chip '+(active?'active':''), onClick }, label);
}
function empty(icon, title, sub) {
  return h('div', { class:'empty' },
    h('span', { class:'ico' }, icon),
    h('div', { style:'color:#fff;font-weight:700;margin-bottom:4px' }, title),
    h('div', {}, sub)
  );
}
function field(label, control) {
  return h('div', { class:'field' }, h('label', {}, label), control);
}
function input(type, val, onInput, placeholder='') {
  const el = h('input', { type, value: val||'', placeholder });
  el.addEventListener('input', e => onInput(e.target.value));
  return el;
}
function textarea(val, onInput, placeholder='') {
  const el = h('textarea', { placeholder }); el.value = val || '';
  el.addEventListener('input', e => onInput(e.target.value));
  return el;
}
function select(options, val, onChange) {
  const el = h('select', {});
  for (const [v,l] of options) {
    const o = h('option', { value:v }, l);
    if (v === val) o.selected = true;
    el.appendChild(o);
  }
  el.addEventListener('change', e => onChange(e.target.value));
  return el;
}
function toggle(label, val, onChange) {
  return h('div', { class:'toggle-row card', style:'padding:12px 14px;margin-bottom:14px' },
    h('span', {}, label),
    h('button', { style:`width:50px;height:30px;border-radius:15px;background:${val?'var(--success)':'rgba(255,255,255,.2)'};position:relative;transition:.2s`, onClick: () => onChange(!val) },
      h('div', { style:`width:24px;height:24px;border-radius:50%;background:#fff;position:absolute;top:3px;${val?'left:3px':'right:3px'};transition:.2s` })
    )
  );
}
function saveCancelRow(onSave) {
  return h('div', { class:'btn-row' },
    h('button', { class:'btn ghost', onClick: closeModal }, 'ביטול'),
    h('button', { class:'btn', onClick: onSave }, 'שמירה')
  );
}

/* ---------- Modal ---------- */
function openModal(title, build) {
  const bg = h('div', { class:'modal-bg', onClick: (e) => { if (e.target === bg) closeModal(); } });
  const modal = h('div', { class:'modal' }, h('div', { class:'modal-grip' }), h('h2', {}, title));
  bg.appendChild(modal);
  $('#modal-root').appendChild(bg);
  build(modal);
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function deleteItem(coll, id) {
  if (!confirm('למחוק?')) return;
  state[coll] = state[coll].filter(x => x.id !== id);
  save(); render();
}

/* ---------- FAB - Quick Add ---------- */
$('#fab').addEventListener('click', () => {
  openModal('מה רוצה להוסיף?', body => {
    body.appendChild(h('div', { class:'qa-grid' },
      qaItem('📋','משימה','var(--accent2)', () => { closeModal(); setTimeout(modalAddTask,0); }),
      qaItem('📝','סידור','var(--teal)', () => { closeModal(); setTimeout(modalAddErrand,0); }),
      qaItem('💳','תשלום','var(--accent)', () => { closeModal(); setTimeout(modalAddPayment,0); }),
      qaItem('💼','עסק','var(--indigo)', () => { closeModal(); setTimeout(modalAddBusiness,0); }),
      qaItem('🗒️','פתק','var(--mint)', () => { closeModal(); setTimeout(modalAddNote,0); }),
      qaItem('👨‍👧','ילד','var(--pink)', () => { closeModal(); setTimeout(modalAddKid,0); }),
      qaItem('💊','תרופה','var(--danger)', () => { closeModal(); setTimeout(() => modalAddMed(null),0); })
    ));
  });
});
function qaItem(icon, label, color, onClick) {
  return h('div', { class:'qa-item', onClick },
    h('div', { class:'qa-icon', style:`background:${color}22;color:${color}` }, icon),
    h('div', { class:'lbl' }, label)
  );
}

/* ---------- Boot ---------- */
render();
