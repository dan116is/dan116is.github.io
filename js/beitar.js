// Beitar Jerusalem live widget — streams everything into the card automatically,
// no key / no signup / no cost, via TheSportsDB's free API (CORS-enabled).
// Shows: last result, next match (with countdown), recent form, team badge.
// Falls back to quick links if the network/service is unavailable.
const Beitar = (() => {
  const CACHE = 'habait:beitar';
  const TEAM_ID = '135992';          // Beitar Jerusalem on TheSportsDB
  const API = 'https://www.thesportsdb.com/api/v1/json/3'; // free public key "3"
  const FRESH = 15 * 60 * 1000;       // refresh cadence (live feel)
  const FRESH_MATCHDAY = 90 * 1000;   // tighter on match days
  let fetching = false;

  function card() { return document.getElementById('beitar-card'); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const Q = encodeURIComponent('ביתר ירושלים');
  const LINKS = `
    <div class="beitar-links">
      <a class="beitar-link" target="_blank" rel="noopener" href="https://www.365scores.com/he/search?query=${Q}">📊 365scores</a>
      <a class="beitar-link" target="_blank" rel="noopener" href="https://news.google.com/search?q=${Q}&hl=he">📰 חדשות</a>
      <a class="beitar-link" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${Q}+%D7%AA%D7%A7%D7%A6%D7%99%D7%A8">▶️ תקצירים</a>
    </div>`;

  function load() { try { return JSON.parse(localStorage.getItem(CACHE)); } catch (e) { return null; } }
  function store(obj) { try { localStorage.setItem(CACHE, JSON.stringify(Object.assign({ at: Date.now() }, obj))); } catch (e) {} }

  function shell(bodyHtml, badge, hint) {
    const el = card(); if (!el) return;
    const crest = badge ? `<img class="beitar-badge" src="${esc(badge)}" alt="" onerror="this.style.display='none'">` : '<div class="beitar-crest">⚽</div>';
    el.innerHTML = `
      <div class="beitar-head">
        ${crest}
        <div class="beitar-title">ביתר ירושלים<span class="sub">${hint ? esc(hint) : 'עדכוני קבוצה · המנצחת תמיד'}</span></div>
      </div>
      ${bodyHtml || ''}
      ${LINKS}`;
  }

  // Build a Date from TheSportsDB fields (prefer the UTC timestamp).
  function evDate(ev) {
    if (ev.strTimestamp) { const d = new Date(ev.strTimestamp.replace(' ', 'T') + (/[zZ+]/.test(ev.strTimestamp) ? '' : 'Z')); if (!isNaN(d)) return d; }
    if (ev.dateEvent) { const d = new Date(ev.dateEvent + 'T' + (ev.strTime || '00:00:00')); if (!isNaN(d)) return d; }
    return null;
  }
  function dmy(d) { return d ? d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : ''; }
  function hm(d) { return d ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''; }

  // W / D / L from Beitar's perspective for a finished event.
  function outcome(ev) {
    const hs = ev.intHomeScore, as = ev.intAwayScore;
    if (hs == null || as == null || hs === '' || as === '') return null;
    const beitarHome = /beitar/i.test(ev.strHomeTeam || '');
    const my = Number(beitarHome ? hs : as), opp = Number(beitarHome ? as : hs);
    return my > opp ? 'W' : (my < opp ? 'L' : 'D');
  }
  const FORM_GLYPH = { W: '<span class="bf w">נ</span>', D: '<span class="bf d">ת</span>', L: '<span class="bf l">ה</span>' };

  function resultBlock(ev) {
    const home = esc(ev.strHomeTeam), away = esc(ev.strAwayTeam);
    const hs = ev.intHomeScore, as = ev.intAwayScore;
    const d = evDate(ev);
    const score = (hs != null && hs !== '') ? `<span class="b-score">${esc(hs)} - ${esc(as)}</span>` : 'vs';
    return `<div class="beitar-match"><div class="label">תוצאה אחרונה</div>
      <div class="teams">${home} ${score} ${away}</div>
      <div class="meta">${dmy(d)} · ${esc(ev.strLeague || '')}</div></div>`;
  }
  function nextBlock(ev) {
    const home = esc(ev.strHomeTeam), away = esc(ev.strAwayTeam);
    const d = evDate(ev);
    let countdown = '';
    if (d) {
      const days = Math.round((d - Date.now()) / 86400000);
      countdown = days <= 0 ? ' · היום! 🔥' : (days === 1 ? ' · מחר' : ` · בעוד ${days} ימים`);
    }
    return `<div class="beitar-match"><div class="label">המשחק הבא</div>
      <div class="teams">${home} <span class="b-vs">vs</span> ${away}</div>
      <div class="meta">${dmy(d)} · ${hm(d)} · ${esc(ev.strLeague || '')}${countdown}</div></div>`;
  }
  function formBlock(last) {
    const forms = (last || []).map(outcome).filter(Boolean).slice(0, 5);
    if (!forms.length) return '';
    return `<div class="beitar-form"><span class="bf-label">כושר אחרון</span>${forms.map((f) => FORM_GLYPH[f]).join('')}</div>`;
  }

  function render(data) {
    const last = (data && data.last) || [];
    const next = (data && data.next) || [];
    let body = '';
    if (last[0]) body += resultBlock(last[0]);
    if (next[0]) body += nextBlock(next[0]);
    body += formBlock(last);
    shell(body, data && data.badge, 'מתעדכן אוטומטית · חי');
  }

  function isMatchDay(data) {
    const evs = [].concat((data && data.last) || [], (data && data.next) || []);
    const today = new Date().toISOString().slice(0, 10);
    return evs.some((e) => e.dateEvent === today);
  }

  function paint() {
    const el = card(); if (!el) return;
    const cached = load();
    if (cached && (cached.last || cached.next)) {
      render(cached);
      const maxAge = isMatchDay(cached) ? FRESH_MATCHDAY : FRESH;
      if (Date.now() - cached.at > maxAge) refresh();
    } else {
      shell('<div class="beitar-skeleton">טוען עדכונים…</div>', '', '');
      refresh();
    }
  }

  async function getJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  async function refresh() {
    if (fetching) return; fetching = true;
    try {
      const [lastJ, nextJ] = await Promise.all([
        getJson(`${API}/eventslast.php?id=${TEAM_ID}`),
        getJson(`${API}/eventsnext.php?id=${TEAM_ID}`)
      ]);
      const last = (lastJ && (lastJ.results || lastJ.events)) || [];
      const next = (nextJ && nextJ.events) || [];
      let badge = '';
      const all = last.concat(next);
      for (const e of all) {
        if (/beitar/i.test(e.strHomeTeam || '') && e.strHomeTeamBadge) { badge = e.strHomeTeamBadge; break; }
        if (/beitar/i.test(e.strAwayTeam || '') && e.strAwayTeamBadge) { badge = e.strAwayTeamBadge; break; }
      }
      const data = { last, next, badge };
      store(data);
      render(data);
    } catch (e) {
      // network/service down — keep cache, or show identity + links only
      if (!load()) shell('', '', 'לא הצלחתי לטעון עדכונים כעת — נסה שוב מאוחר יותר');
    } finally { fetching = false; }
  }

  function start() { paint(); }
  return { start, paint, refresh };
})();
if (typeof window !== "undefined") window.Beitar = Beitar;
