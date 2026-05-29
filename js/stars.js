// Kids reward chart: chores/behaviours earn stars; stars accumulate toward a
// reward goal. Tailored for גפן (5). Stored in DB under 'stars'.
const Stars = (() => {
  const KEY = DB.KEYS.stars; // log of star events: { child, reason, n, ts }
  function log() { return DB.list(KEY); }
  function award(child, reason, n) { return DB.add(KEY, { child, reason: reason || '', n: n || 1 }); }
  function removeEntry(id) { DB.remove(KEY, id); }

  function totalFor(child) { return log().filter((s) => s.child === child).reduce((a, s) => a + (Number(s.n) || 0), 0); }

  function goalFor(child) { return (DB.getSettings().starGoals || {})[child] || 20; }
  function setGoal(child, n) {
    const g = DB.getSettings().starGoals || {};
    g[child] = Math.max(1, Number(n) || 20);
    DB.setSetting('starGoals', g);
  }
  function rewardFor(child) { return (DB.getSettings().starRewards || {})[child] || ''; }
  function setReward(child, txt) {
    const r = DB.getSettings().starRewards || {};
    r[child] = txt || '';
    DB.setSetting('starRewards', r);
  }
  function redeem(child) {
    const goal = goalFor(child);
    award(child, 'מימוש פרס 🎁', -goal);
  }

  function kids() {
    const fam = DB.list(DB.KEYS.family).map((f) => f.name);
    const k = ['גפן', 'אורי'].filter((x) => fam.includes(x));
    return k.length ? k : fam;
  }

  const QUICK = ['סידר חדר', 'צחצח שיניים', 'אכל יפה', 'עזר בבית', 'התנהג יפה', 'הלך לישון בזמן'];

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function render(container) {
    container.innerHTML = kids().map((name) => {
      const total = totalFor(name);
      const goal = goalFor(name);
      const reward = rewardFor(name);
      const pct = Math.max(0, Math.min(100, Math.round((total / goal) * 100)));
      const full = total >= goal;
      const recent = log().filter((s) => s.child === name).slice(-5).reverse();
      return `
        <div class="stars-card">
          <div class="stars-head">
            <span class="stars-name">${name === 'גפן' ? '👦' : '🧒'} ${esc(name)}</span>
            <span class="stars-total">⭐ ${total}/${goal}</span>
          </div>
          <div class="stars-bar"><div class="stars-bar-fill ${full ? 'full' : ''}" style="width:${pct}%"></div></div>
          ${reward ? `<div class="stars-reward">🎁 ${esc(reward)}${full ? ' — אפשר לממש!' : ''}</div>` : ''}
          ${full ? `<button class="primary-btn" data-star-redeem="${esc(name)}" style="width:100%;margin-top:8px;">🎉 מימוש פרס</button>` : ''}
          <div class="stars-quick">
            ${QUICK.map((q) => `<button class="star-chip" data-star-give="${esc(name)}" data-reason="${esc(q)}">+⭐ ${q}</button>`).join('')}
          </div>
          <div class="stars-settings">
            <button class="link-btn" data-star-config="${esc(name)}">⚙️ יעד ופרס</button>
          </div>
          ${recent.length ? `<div class="stars-log">${recent.map((s) => `<span class="star-log-item ${s.n < 0 ? 'minus' : ''}">${s.n > 0 ? '+' : ''}${s.n} ${esc(s.reason)}</span>`).join('')}</div>` : ''}
        </div>`;
    }).join('');
  }

  function configForm(child) {
    return `
      <form id="star-config-form">
        <input type="hidden" name="child" value="${esc(child)}">
        <div class="form-group"><label>יעד כוכבים לפרס</label><input name="goal" type="number" inputmode="numeric" min="1" value="${goalFor(child)}"></div>
        <div class="form-group"><label>הפרס</label><input name="reward" value="${esc(rewardFor(child))}" placeholder="לדוגמה: צעצוע / יציאה לפארק"></div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">שמור</button>
        </div>
      </form>`;
  }

  return { log, award, removeEntry, totalFor, goalFor, setGoal, rewardFor, setReward, redeem, kids, render, configForm };
})();
