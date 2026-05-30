// Dashboard edit mode: button-based controls per cube (reliable on touch).
// Each cube gets a small toolbar: move up/down, resize (full<->half), hide.
// No drag — taps only, which works consistently inside a PWA.
const DashEdit = (() => {
  let editing = false;

  function view() { return document.getElementById('view-dashboard'); }
  function haptic(ms) { if (navigator.vibrate) navigator.vibrate(ms || 8); }

  function isEditing() { return editing; }
  function toggle() { editing ? exit() : enter(); }

  function enter() {
    editing = true;
    view().classList.add('editing');
    const btn = document.getElementById('dash-edit-btn');
    if (btn) { btn.classList.add('active'); btn.textContent = '✓'; }
    decorate();
    view().addEventListener('click', onClick, true);
    if (window.App && App.toast) App.toast('עריכה: ▲▼ להזזה · ⤢ גודל · 🙈 הסתרה', '');
  }

  function exit() {
    editing = false;
    view().classList.remove('editing');
    const btn = document.getElementById('dash-edit-btn');
    if (btn) { btn.classList.remove('active'); btn.textContent = '✏️'; }
    view().removeEventListener('click', onClick, true);
    stripControls();
  }

  // Inject a control bar into every visible widget cube.
  function decorate() {
    stripControls();
    const ids = window.DashLayout ? DashLayout.orderedIds() : [];
    const cubes = Array.from(view().querySelectorAll('[data-widget]'));
    cubes.forEach((el) => {
      const id = el.dataset.widget;
      const hidden = window.DashLayout && DashLayout.isHidden(id);
      const size = (window.DashLayout && DashLayout.sizeOf(id)) || 'full';
      const bar = document.createElement('div');
      bar.className = 'edit-bar';
      bar.innerHTML =
        `<button class="edit-ctl" data-edit-up="${id}" aria-label="הזז למעלה">▲</button>` +
        `<button class="edit-ctl" data-edit-down="${id}" aria-label="הזז למטה">▼</button>` +
        `<button class="edit-ctl" data-edit-size="${id}" aria-label="גודל">${size === 'half' ? '⤢ מלא' : '⤡ חצי'}</button>` +
        `<button class="edit-ctl ${hidden ? 'is-off' : ''}" data-edit-hide="${id}" aria-label="הצג/הסתר">${hidden ? '🙈 מוסתר' : '👁️'}</button>`;
      el.appendChild(bar);
    });
  }

  function stripControls() {
    view().querySelectorAll('.edit-bar').forEach((b) => b.remove());
  }

  function onClick(e) {
    if (!editing) return;
    const btn = e.target.closest('button.edit-ctl');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (!window.DashLayout) return;
    if (btn.dataset.editUp) { haptic(); DashLayout.move(btn.dataset.editUp, -1); refresh(); }
    else if (btn.dataset.editDown) { haptic(); DashLayout.move(btn.dataset.editDown, 1); refresh(); }
    else if (btn.dataset.editSize) { haptic(); DashLayout.cycleSize(btn.dataset.editSize); refresh(); }
    else if (btn.dataset.editHide) { haptic(); DashLayout.toggle(btn.dataset.editHide); refresh(); }
  }

  // Re-apply layout, refresh app content, and re-draw controls (still editing).
  function refresh() {
    if (window.DashLayout) DashLayout.apply();
    if (window.App && App.refresh) App.refresh();
    if (editing) decorate();
  }

  return { toggle, enter, exit, isEditing };
})();
if (typeof window !== "undefined") window.DashEdit = DashEdit;
