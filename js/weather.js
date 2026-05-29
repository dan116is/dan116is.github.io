// Weather + clothing advice + multi-day forecast for the dashboard.
// Open-Meteo (no API key, CORS-enabled). City is configurable in Settings.
const Weather = (() => {
  const CITIES = {
    'ירושלים': [31.7683, 35.2137],
    'תל אביב': [32.0853, 34.7818],
    'חיפה': [32.7940, 34.9896],
    'באר שבע': [31.2520, 34.7915],
    'אילת': [29.5577, 34.9519],
    'נתניה': [32.3215, 34.8532],
    'אשדוד': [31.8014, 34.6435]
  };
  const CACHE_KEY = 'habait:weather';
  const MAX_AGE = 30 * 60 * 1000;
  let fetching = false;

  function loc() {
    const name = (window.DB && DB.getSettings().weatherCity) || 'ירושלים';
    const c = CITIES[name] || CITIES['ירושלים'];
    return { name, lat: c[0], lon: c[1] };
  }
  function cityList() { return Object.keys(CITIES); }

  const WMO = {
    0: { t: 'בהיר', e: '☀️' }, 1: { t: 'בהיר בעיקר', e: '🌤️' }, 2: { t: 'מעונן חלקית', e: '⛅' }, 3: { t: 'מעונן', e: '☁️' },
    45: { t: 'ערפל', e: '🌫️' }, 48: { t: 'ערפל', e: '🌫️' },
    51: { t: 'טפטוף קל', e: '🌦️' }, 53: { t: 'טפטוף', e: '🌦️' }, 55: { t: 'טפטוף חזק', e: '🌧️' },
    56: { t: 'טפטוף קפוא', e: '🌧️' }, 57: { t: 'טפטוף קפוא', e: '🌧️' },
    61: { t: 'גשם קל', e: '🌧️' }, 63: { t: 'גשם', e: '🌧️' }, 65: { t: 'גשם חזק', e: '🌧️' },
    66: { t: 'גשם קפוא', e: '🌧️' }, 67: { t: 'גשם קפוא', e: '🌧️' },
    71: { t: 'שלג קל', e: '🌨️' }, 73: { t: 'שלג', e: '🌨️' }, 75: { t: 'שלג כבד', e: '❄️' }, 77: { t: 'גרגרי שלג', e: '🌨️' },
    80: { t: 'ממטרים', e: '🌦️' }, 81: { t: 'ממטרים', e: '🌧️' }, 82: { t: 'ממטרים עזים', e: '⛈️' },
    85: { t: 'ממטרי שלג', e: '🌨️' }, 86: { t: 'ממטרי שלג', e: '❄️' },
    95: { t: 'סופת רעמים', e: '⛈️' }, 96: { t: 'סופה עם ברד', e: '⛈️' }, 99: { t: 'סופה עם ברד', e: '⛈️' }
  };
  function desc(code) { return WMO[code] || { t: '—', e: '🌡️' }; }
  function isRainy(code, prob) { return (prob || 0) >= 40 || (code >= 51 && code <= 86) || code >= 95; }

  function clothing(minT, maxT, code, prob, wind) {
    const m = Math.round(minT), x = Math.round(maxT);
    const tips = []; let head, emoji;
    if (m < 8) { head = 'קר מאוד בבוקר'; emoji = '🧥'; tips.push('מעיל חם, כובע וכפפות'); }
    else if (m < 13) { head = 'קר בבוקר'; emoji = '🧥'; tips.push('מעיל או קפוצ׳ון ושכבה ארוכה'); }
    else if (m < 18) { head = 'קריר בבוקר'; emoji = '🧶'; tips.push('סווצ׳ר או שכבה ארוכה'); }
    else if (m < 23) { head = 'נעים'; emoji = '👕'; tips.push('חולצה ארוכה או שכבה דקה'); }
    else if (m < 28) { head = 'חמים'; emoji = '👕'; tips.push('חולצה קצרה ובגדים קלים'); }
    else { head = 'חם'; emoji = '🧢'; tips.push('בגדים קלילים, כובע והרבה מים'); }
    if (x - m >= 8) tips.push('קחו שכבה — מתחמם משמעותית בהמשך היום');
    if (isRainy(code, prob)) { tips.push('צפוי גשם — מטרייה או מעיל גשם ☔'); emoji = '🌧️'; }
    if (wind >= 25) tips.push('רוחות חזקות — עדיף שכבה אטומה לרוח');
    let kids;
    if (m < 13) kids = 'גפן ואורי: שכבה נוספת מעבר למבוגרים, וכובע לאורי.';
    else if (m < 18) kids = 'גפן ואורי: כדאי שכבה אחת נוספת, במיוחד לאורי בבוקר.';
    else if (m >= 28) kids = 'גפן ואורי: כובע, בגדים נושמים והקפדה על שתייה.';
    else kids = 'גפן ואורי: לבוש קליל ושכבה דקה ליתר ביטחון.';
    return { head, emoji, tips, kids };
  }

  function load() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; } }
  function store(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), city: loc().name, data })); } catch (e) {} }
  function card() { return document.getElementById('weather-card'); }

  function paint() {
    const el = card(); if (!el) return;
    const cached = load();
    if (cached && cached.data && cached.city === loc().name) {
      renderData(el, cached.data);
      if (Date.now() - cached.fetchedAt > MAX_AGE) refresh(false);
    } else {
      el.innerHTML = `<div class="weather-skeleton">טוען מזג אוויר ל${loc().name}…</div>`;
      refresh(true);
    }
  }

  function dayName(dateStr, i) {
    if (i === 0) return 'היום';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short' });
  }

  function renderData(el, d) {
    const c = desc(d.code);
    const fc = (d.forecast || []).map((f, i) => {
      const fd = desc(f.code);
      return `<div class="fc-day"><div class="fc-name">${dayName(f.date, i)}</div><div class="fc-emoji">${fd.e}</div><div class="fc-temp">${Math.round(f.max)}° <span class="lo">${Math.round(f.min)}°</span></div></div>`;
    }).join('');
    el.innerHTML = `
      <div class="weather-top">
        <div class="weather-emoji">${c.e}</div>
        <div class="weather-main">
          <div class="weather-temp">${Math.round(d.temp)}°</div>
          <div class="weather-desc">${c.t} · ${loc().name}</div>
          <div class="weather-range">↑ ${Math.round(d.max)}°  ↓ ${Math.round(d.min)}°  ·  מרגישים ${Math.round(d.feels)}°</div>
        </div>
        <button class="weather-refresh" id="weather-refresh" aria-label="רענן">↻</button>
      </div>
      <div class="weather-advice">
        <div class="advice-head">${d.advice.emoji} ${d.advice.head} — מה ללבוש היום</div>
        <ul>${d.advice.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        <div class="advice-kids">👦🧒 ${d.advice.kids}</div>
      </div>
      ${fc ? `<div class="weather-forecast">${fc}</div>` : ''}`;
  }

  function renderError(el) {
    el.innerHTML = `<div class="weather-error"><div class="weather-skeleton">לא הצלחתי לטעון מזג אוויר.</div><button class="ghost-btn" id="weather-refresh">נסה שוב</button></div>`;
  }

  async function refresh(showLoading) {
    if (fetching) return; fetching = true;
    const L = loc();
    const el = card();
    if (showLoading && el && !load()) el.innerHTML = `<div class="weather-skeleton">טוען מזג אוויר ל${L.name}…</div>`;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&timezone=auto&forecast_days=4`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('http ' + res.status);
      const j = await res.json();
      const minT = j.daily.temperature_2m_min[0], maxT = j.daily.temperature_2m_max[0];
      const dayCode = j.daily.weather_code[0];
      const prob = j.daily.precipitation_probability_max ? j.daily.precipitation_probability_max[0] : 0;
      const wind = j.current.wind_speed_10m;
      const forecast = j.daily.time.map((t, i) => ({ date: t, min: j.daily.temperature_2m_min[i], max: j.daily.temperature_2m_max[i], code: j.daily.weather_code[i] }));
      const data = {
        temp: j.current.temperature_2m, feels: j.current.apparent_temperature, code: j.current.weather_code,
        min: minT, max: maxT, advice: clothing(minT, maxT, dayCode, prob, wind), forecast
      };
      store(data);
      if (card()) renderData(card(), data);
    } catch (e) {
      if (card() && !load()) renderError(card());
    } finally { fetching = false; }
  }

  function start() { paint(); }
  return { start, paint, refresh, cityList };
})();
