// Dashboard edit mode: drag to reorder cubes, tap a cube to change its size
// (full <-> half), and a quick hide button. Pointer-based for touch + mouse.
const DashEdit = (() => {
  let editing = false;
  let dragEl = null, startX = 0, startY = 0, moved = false, pointerId = null;
  const THRESH = 8;

  function view() { return document.getElementById('view-dashboard'); }
  function haptic(ms) { if (navigator.vibrate) navigator.vibrate(ms || 10); }

  function isEditing() { return editing; }
  function toggle() { editing ? exit() : enter(); }

  function enter() {
    editing = true;
    view().classList.add('editing');
    const btn = document.getElementById('dash-edit-btn');
    if (btn) { btn.classList.add('active'); btn.textContent = '✓'; }
    attach();
    if (window.App && App.toast) App.toast('עריכה: גרור לסידור · הקש לשינוי גודל', '');
  }

  function exit() {
    editing = false;
    view().classList.remove('editing');
    const btn = document.getElementById('dash-edit-btn');
    if (btn) { btn.classList.remove('active'); btn.textContent = '✏️'; }
    detach();
  }

  function attach() {
    const v = view();
    v.addEventListener('pointerdown', onDown);
    // move/up on document so a captured pointer keeps reporting even if the
    // finger leaves the originating cube.
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }
  function detach() {
    const v = view();
    v.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  function onDown(e) {
    if (!editing) return;
    // Hide button handled by click; ignore it here.
    if (e.target.closest('[data-edit-hide]')) return;
    const w = e.target.closest('[data-widget]');
    if (!w) return;
    dragEl = w; startX = e.clientX; startY = e.clientY; moved = false; pointerId = e.pointerId;
    // Capture on the cube itself so we keep receiving move/up even if the
    // finger drifts off it. touch-action:none (CSS) stops the browser from
    // stealing the gesture for scrolling.
    try { w.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onMove(e) {
    if (!editing || !dragEl) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < THRESH) return;
    if (!moved) {
      moved = true;
      dragEl.classList.add('dragging');
      haptic(12);
    }
    e.preventDefault();
    // Live reorder: find the widget under the finger and insert relative to it.
    dragEl.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.pointerEvents = '';
    const target = under && under.closest && under.closest('[data-widget]');
    if (target && target !== dragEl && target.parentNode === dragEl.parentNode) {
      const r = target.getBoundingClientRect();
      const before = (e.clientY < r.top + r.height / 2) ||
        (Math.abs((e.clientY) - (r.top + r.height / 2)) < 4 && e.clientX < r.left + r.width / 2);
      dragEl.parentNode.insertBefore(dragEl, before ? target : target.nextSibling);
    }
  }

  function onUp(e) {
    if (!editing || !dragEl) return;
    const el = dragEl; dragEl = null;
    try { el.releasePointerCapture(pointerId); } catch (err) {}
    if (moved) {
      el.classList.remove('dragging');
      persistOrder();
      haptic(8);
    } else {
      // Tap (no drag): cycle the cube size.
      const id = el.dataset.widget;
      if (id && window.DashLayout) {
        const next = DashLayout.cycleSize(id);
        haptic(8);
        if (window.App && App.toast) App.toast(next === 'half' ? 'תצוגה: חצי רוחב' : 'תצוגה: רוחב מלא', '');
      }
    }
  }

  function persistOrder() {
    if (!window.DashLayout) return;
    const ids = Array.from(view().querySelectorAll('[data-widget]')).map((el) => el.dataset.widget);
    DashLayout.setOrder(ids);
    if (window.App && App.refresh) App.refresh();
  }

  return { toggle, enter, exit, isEditing };
})();
if (typeof window !== "undefined") window.DashEdit = DashEdit;
