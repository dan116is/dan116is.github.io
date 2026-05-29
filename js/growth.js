// Growth tracking for the kids: height/weight measurements over time with a
// simple sparkline. Stored in DB under 'growth' (one record per measurement).
const Growth = (() => {
  const KEY = DB.KEYS.growth;

  function list() { return DB.list(KEY); }
  function add(data) { return DB.add(KEY, data); }
  function remove(id) { DB.remove(KEY, id); }
  function forChild(name) {
    return list().filter((r) => r.child === name).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  function children() {
    const fam = DB.list(DB.KEYS.family).map((f) => f.name);
    // default to the kids
    const kids = ['גפן', 'אורי'].filter((k) => fam.includes(k));
    return kids.length ? kids : fam;
  }

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function spark(values) {
    if (values.length < 2) return '';
    const w = 100, h = 28;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function render(container) {
    const kids = children();
    container.innerHTML = kids.map((name) => {
      const recs = forChild(name);
      const last = recs[recs.length - 1];
      const heights = recs.filter((r) => r.height).map((r) => Number(r.height));
      const weights = recs.filter((r) => r.weight).map((r) => Number(r.weight));
      return `
        <div class="growth-card">
          <div class="growth-head">
            <span class="growth-name">${name === 'גפן' ? '👦' : '🧒'} ${esc(name)}</span>
            <button class="primary-btn" data-growth-add="${esc(name)}" style="padding:7px 13px;">+ מדידה</button>
          </div>
          ${last ? `
            <div class="growth-stats">
              <div class="growth-stat"><span class="gs-val">${last.height || '—'}</span><span class="gs-lbl">גובה (ס״מ)</span>${heights.length > 1 ? `<div class="gs-spark">${spark(heights)}</div>` : ''}</div>
              <div class="growth-stat"><span class="gs-val">${last.weight || '—'}</span><span class="gs-lbl">משקל (ק״ג)</span>${weights.length > 1 ? `<div class="gs-spark">${spark(weights)}</div>` : ''}</div>
            </div>
            <div class="growth-list">
              ${recs.slice().reverse().slice(0, 5).map((r) => `
                <div class="growth-row">
                  <span>${new Date(r.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  <span>${r.height ? r.height + ' ס״מ' : ''} ${r.weight ? '· ' + r.weight + ' ק״ג' : ''}</span>
                  <button class="icon-btn" data-growth-del="${r.id}">🗑</button>
                </div>`).join('')}
            </div>`
            : `<div class="dash-empty">אין מדידות עדיין</div>`}
        </div>`;
    }).join('');
  }

  function openForm(child) {
    const today = new Date().toISOString().slice(0, 10);
    return `
      <form id="growth-form">
        <input type="hidden" name="child" value="${esc(child)}">
        <div class="form-group"><label>תאריך</label><input name="date" type="date" value="${today}" required></div>
        <div class="form-row">
          <div class="form-group"><label>גובה (ס״מ)</label><input name="height" type="number" inputmode="decimal" step="0.1" placeholder="100"></div>
          <div class="form-group"><label>משקל (ק״ג)</label><input name="weight" type="number" inputmode="decimal" step="0.1" placeholder="16"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">שמור</button>
        </div>
      </form>`;
  }

  return { list, add, remove, forChild, children, render, openForm };
})();
if (typeof window !== "undefined") window.Growth = Growth;
