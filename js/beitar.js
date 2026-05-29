// Beitar Jerusalem widget.
// Always works: club identity + quick links to live results, news, fixtures.
// Optionally shows next match + last result if a free API-Football key is set
// in Settings (stored only on this device, never committed).
const Beitar = (() => {
  const CACHE = 'habait:beitar';
  const MAX_AGE = 60 * 60 * 1000;
  let fetching = false;

  function card() { return document.getElementById('beitar-card'); }
  function apiKey() { return ((window.DB && DB.getSettings().footballApiKey) || '').trim(); }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const Q = encodeURIComponent('ביתר ירושלים');
  const LINKS = `
    <div class="beitar-links">
      <a class="beitar-link" target="_blank" rel="noopener" href="https://www.google.com/search?q=${Q}+%D7%AA%D7%95%D7%A6%D7%90%D7%95%D7%AA">📊 תוצאות</a>
      <a class="beitar-link" target="_blank" rel="noopener" href="https://news.google.com/search?q=${Q}&hl=he">📰 חדשות</a>
      <a class="beitar-link" target="_blank" rel="noopener" href="https://www.google.com/search?q=${Q}+%D7%9C%D7%95%D7%97+%D7%9E%D7%A9%D7%97%D7%A7%D7%99%D7%9D">📅 לוח משחקים</a>
      <a class="beitar-link" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${Q}">▶️ וידאו</a>
    </div>`;

  function shell(matchHtml, hint) {
    const el = card(); if (!el) return;
    el.innerHTML = `
      <div class="beitar-head">
        <div class="beitar-crest">⚽</div>
        <div class="beitar-title">ביתר ירושלים<span class="sub">עדכוני קבוצה · המנצחת תמיד</span></div>
      </div>
      ${matchHtml || ''}
      ${LINKS}
      ${hint ? `<div class="beitar-hint">${hint}</div>` : ''}`;
  }

  function load() { try { return JSON.parse(localStorage.getItem(CACHE)); } catch (e) { return null; } }
  function store(html, hint) { try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), html, hint })); } catch (e) {} }

  function paint() {
    const el = card(); if (!el) return;
    const cached = load();
    if (cached && cached.html) {
      shell(cached.html, cached.hint);
      if (apiKey() && Date.now() - cached.at > MAX_AGE) refresh();
    } else {
      shell('', apiKey() ? '' : 'טיפ: הוסף מפתח כדורגל חינמי בהגדרות כדי לראות את המשחק הבא והתוצאה האחרונה כאן.');
      if (apiKey()) refresh();
    }
  }

  function matchBlock(label, fx, finished) {
    const home = esc(fx.teams.home.name), away = esc(fx.teams.away.name);
    const hg = fx.goals.home, ag = fx.goals.away;
    const dt = new Date(fx.fixture.date);
    const date = dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    const time = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const league = esc((fx.league && fx.league.name) || '');
    if (finished && hg != null) {
      return `<div class="beitar-match"><div class="label">${label}</div>
        <div class="teams">${home} <span style="color:var(--c-beitar)">${hg} - ${ag}</span> ${away}</div>
        <div class="meta">${date} · ${league}</div></div>`;
    }
    return `<div class="beitar-match"><div class="label">${label}</div>
      <div class="teams">${home} vs ${away}</div>
      <div class="meta">${date} · ${time} · ${league}</div></div>`;
  }

  async function refresh() {
    if (fetching || !apiKey()) return; fetching = true;
    try {
      const h = { 'x-apisports-key': apiKey() };
      let id = DB.getSettings().beitarTeamId;
      if (!id) {
        const r = await fetch('https://v3.football.api-sports.io/teams?search=beitar%20jerusalem', { headers: h });
        const j = await r.json();
        if (j.response && j.response[0]) { id = j.response[0].team.id; DB.setSetting('beitarTeamId', id); }
      }
      if (!id) throw new Error('team not found');
      const [nx, lt] = await Promise.all([
        fetch(`https://v3.football.api-sports.io/fixtures?team=${id}&next=1`, { headers: h }).then((r) => r.json()),
        fetch(`https://v3.football.api-sports.io/fixtures?team=${id}&last=1`, { headers: h }).then((r) => r.json())
      ]);
      let html = '';
      const l = lt.response && lt.response[0];
      const n = nx.response && nx.response[0];
      if (l) html += matchBlock('תוצאה אחרונה', l, true);
      if (n) html += matchBlock('המשחק הבא', n, false);
      if (html) {
        const hint = 'מתעדכן אוטומטית · API-Football';
        store(html, hint); shell(html, hint);
      }
    } catch (e) {
      // keep the quick-links fallback; nothing to do
    } finally { fetching = false; }
  }

  function start() { paint(); }
  return { start, paint, refresh };
})();
if (typeof window !== "undefined") window.Beitar = Beitar;
