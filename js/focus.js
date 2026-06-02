// Focus timer (Pomodoro-style): pick a duration, run a countdown, get a gentle
// finish notification + confetti. A slim bar shows the live countdown and
// survives navigation (module-level interval).
const Focus = (() => {
  let endAt = 0, timer = null, label = '';
  const PRESETS = [15, 25, 45];

  function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function running() { return timer !== null; }
  function remaining() { return Math.max(0, endAt - Date.now()); }
  function bar() { return document.getElementById('focus-bar'); }

  function paint() {
    const el = bar();
    if (!el) return;
    if (!running()) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML =
      `<span class="focus-dot"></span>` +
      `<span class="focus-label">${label ? esc(label) + ' · ' : ''}פוקוס</span>` +
      `<span class="focus-time">${fmt(remaining())}</span>` +
      `<button class="focus-stop" id="focus-stop" aria-label="עצור">✕</button>`;
  }

  function begin(minutes, lbl) {
    stop(true);
    label = lbl || '';
    endAt = Date.now() + minutes * 60000;
    timer = setInterval(tick, 1000);
    paint();
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function tick() {
    if (remaining() <= 0) { finish(); return; }
    paint();
  }

  function finish() {
    stop(true);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    if (window.Notifier && Notifier.notify) Notifier.notify('סיימת פוקוס 🎉', { body: label || 'כל הכבוד! זמן להפסקה' });
    if (window.App && App.toast) App.toast('סיימת פוקוס 🎉 כל הכבוד!', 'success');
    if (window.UX && UX.confetti) UX.confetti();
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    endAt = 0;
    paint();
  }

  function chooseForm() {
    return `
      <form id="focus-form">
        <div class="form-group">
          <label>כמה דקות להתרכז?</label>
          <div class="focus-presets">
            ${PRESETS.map((m) => `<button type="button" class="focus-preset" data-focus-min="${m}">${m} דק׳</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>על מה? (אופציונלי)</label>
          <input name="label" placeholder="למשל: לסדר את הסלון">
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">התחל 25 דק׳</button>
        </div>
      </form>`;
  }

  return { begin, stop, finish, running, remaining, paint, init: paint, chooseForm, PRESETS };
})();
if (typeof window !== "undefined") window.Focus = Focus;
