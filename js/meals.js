// Weekly meal planner. One dinner per weekday; add a meal's ingredients to
// the shopping list in one tap. Stored in DB under 'meals' keyed by weekday.
const Meals = (() => {
  const KEY = DB.KEYS.meals;
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  function all() { return DB.list(KEY); }
  function forDay(dow) { return all().find((m) => Number(m.day) === dow) || null; }

  function setMeal(dow, title, ingredients) {
    const items = all();
    const idx = items.findIndex((m) => Number(m.day) === dow);
    const rec = { day: dow, title: (title || '').trim(), ingredients: (ingredients || '').trim() };
    if (idx >= 0) { rec.id = items[idx].id; DB.update(KEY, items[idx].id, rec); }
    else DB.add(KEY, rec);
  }
  function clearDay(dow) {
    const m = forDay(dow);
    if (m) DB.remove(KEY, m.id);
  }

  function addIngredientsToShopping(dow) {
    const m = forDay(dow);
    if (!m || !m.ingredients) return 0;
    const parts = m.ingredients.split(/\s*,\s*|\n/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) Shopping.add(p, 'מזון');
    return parts.length;
  }

  function todayMeal() { return forDay(new Date().getDay()); }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render(container) {
    const today = new Date().getDay();
    container.innerHTML = DAYS.map((name, dow) => {
      const m = forDay(dow);
      return `
        <div class="meal-day ${dow === today ? 'today' : ''}">
          <div class="meal-day-head">
            <span>${name}${dow === today ? ' · היום' : ''}</span>
            <div class="meal-day-actions">
              ${m && m.ingredients ? `<button class="link-btn" data-meal-shop="${dow}">+ לקניות</button>` : ''}
              <button class="link-btn" data-meal-edit="${dow}">${m && m.title ? 'ערוך' : '+ הוסף'}</button>
            </div>
          </div>
          ${m && m.title
            ? `<div class="meal-title">🍽️ ${esc(m.title)}</div>${m.ingredients ? `<div class="meal-ing">${esc(m.ingredients)}</div>` : ''}`
            : `<div class="meal-empty">—</div>`}
        </div>`;
    }).join('');
  }

  function openForm(dow) {
    const m = forDay(dow);
    return `
      <form id="meal-form">
        <div class="form-group">
          <label>ארוחת ערב ל${DAYS[dow]}</label>
          <input name="title" value="${esc(m?.title || '')}" placeholder="לדוגמה: פסטה ברוטב עגבניות">
        </div>
        <div class="form-group">
          <label>מצרכים (מופרדים בפסיק)</label>
          <textarea name="ingredients" rows="3" placeholder="פסטה, רסק עגבניות, בצל, שום">${esc(m?.ingredients || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-meal-clear="${dow}">נקה</button>
          <button type="submit" class="primary-btn">שמור</button>
        </div>
      </form>`;
  }

  return { DAYS, all, forDay, setMeal, clearDay, addIngredientsToShopping, todayMeal, render, openForm };
})();
if (typeof window !== "undefined") window.Meals = Meals;
