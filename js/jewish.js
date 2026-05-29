// Jewish calendar widget: Hebrew date, Shabbat times, next holiday.
// Uses Hebcal (free, CORS, no key), Jerusalem. Cached for instant/offline view.
const Jewish = (() => {
  const GEO = 281184; // Jerusalem
  const CACHE = 'habait:jewish';
  const MAX_AGE = 6 * 60 * 60 * 1000;
  let fetching = false;

  function card() { return document.getElementById('jewish-card'); }
  function load() { try { return JSON.parse(localStorage.getItem(CACHE)); } catch (e) { return null; } }
  function store(data) { try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data })); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function timeOf(iso) {
    try { return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function dayLabel(iso) {
    const d = new Date(iso); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'היום';
    if (diff === 1) return 'מחר';
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function paint() {
    const el = card(); if (!el) return;
    const cached = load();
    if (cached && cached.data) {
      render(el, cached.data);
      if (Date.now() - cached.at > MAX_AGE) refresh();
    } else {
      el.innerHTML = `<div class="jw-skeleton">טוען לוח עברי…</div>`;
      refresh();
    }
  }

  function render(el, d) {
    const holiday = d.holiday
      ? `<div class="jw-row"><span class="jw-ico">🕎</span><div><div class="jw-row-t">${esc(d.holiday.title)}</div><div class="jw-row-s">${esc(d.holiday.when)}</div></div></div>`
      : '';
    const candles = d.candles
      ? `<div class="jw-row"><span class="jw-ico">🕯️</span><div><div class="jw-row-t">כניסת שבת ${d.candles}</div><div class="jw-row-s">${d.parasha ? 'פרשת ' + esc(d.parasha) : ''}</div></div></div>`
      : '';
    const havdalah = d.havdalah
      ? `<div class="jw-row"><span class="jw-ico">✨</span><div><div class="jw-row-t">צאת שבת ${d.havdalah}</div></div></div>`
      : '';
    el.innerHTML = `
      <div class="jw-head">
        <div class="jw-date">${esc(d.hebDate || '')}</div>
        <button class="jw-refresh" id="jewish-refresh" aria-label="רענן">↻</button>
      </div>
      ${holiday}${candles}${havdalah}`;
  }

  async function refresh() {
    if (fetching) return; fetching = true;
    try {
      const now = new Date();
      const conv = `https://www.hebcal.com/converter?cfg=json&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}&g2h=1&strict=1`;
      const shab = `https://www.hebcal.com/shabbat?cfg=json&geonameid=${GEO}&b=40&M=on&lg=he`;
      const [cv, sb] = await Promise.all([
        fetch(conv).then((r) => r.json()).catch(() => null),
        fetch(shab).then((r) => r.json()).catch(() => null)
      ]);
      const data = {};
      if (cv) data.hebDate = cv.hebrew || `${cv.hd} ${cv.hm} ${cv.hy}`;
      if (sb && sb.items) {
        const cand = sb.items.find((x) => x.category === 'candles');
        const havd = sb.items.find((x) => x.category === 'havdalah');
        const par = sb.items.find((x) => x.category === 'parashat');
        const hol = sb.items.find((x) => x.category === 'holiday');
        if (cand) data.candles = timeOf(cand.date);
        if (havd) data.havdalah = timeOf(havd.date);
        if (par) data.parasha = (par.hebrew || par.title || '').replace('פרשת ', '');
        if (hol) data.holiday = { title: hol.hebrew || hol.title, when: dayLabel(hol.date) };
      }
      if (Object.keys(data).length) { store(data); if (card()) render(card(), data); }
      else if (card() && !load()) card().innerHTML = `<div class="jw-skeleton">לא הצלחתי לטעון לוח עברי.</div>`;
    } catch (e) {
      if (card() && !load()) card().innerHTML = `<div class="jw-skeleton">לא הצלחתי לטעון לוח עברי.</div>`;
    } finally { fetching = false; }
  }

  function start() { paint(); }
  return { start, paint, refresh };
})();
