// Lightweight UX helpers: swipe-to-action on list items, confetti, pull-to-refresh.
const UX = (() => {
  // ----- Swipe to act on .dash-item / .item-card rows -----
  // Adds horizontal swipe: short swipe reveals nothing; a decisive swipe fires
  // the row's primary toggle (check) or delete, based on direction.
  function enableSwipe(container, opts) {
    if (!container || container._swipeOn) return;
    container._swipeOn = true;
    let startX = 0, startY = 0, target = null, dragging = false;

    container.addEventListener('touchstart', (e) => {
      const row = e.target.closest(opts.rowSelector);
      if (!row || e.target.closest('button')) { target = null; return; }
      target = row; startX = e.touches[0].clientX; startY = e.touches[0].clientY; dragging = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!target) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!dragging && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) dragging = true;
      if (dragging) {
        target.style.transform = `translateX(${dx}px)`;
        target.style.transition = 'none';
        target.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 220));
      }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      if (!target) return;
      const dx = e.changedTouches[0].clientX - startX;
      const row = target;
      row.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      row.style.transform = '';
      row.style.opacity = '';
      if (dragging && Math.abs(dx) > 90) {
        // RTL: swipe right (positive dx) = complete, swipe left = delete
        if (dx > 0 && opts.onComplete) opts.onComplete(row);
        else if (dx < 0 && opts.onDelete) opts.onDelete(row);
      }
      target = null; dragging = false;
    });
  }

  // ----- Confetti burst -----
  let confettiRunning = false;
  function confetti() {
    if (confettiRunning) return;
    confettiRunning = true;
    const cv = document.createElement('canvas');
    cv.className = 'confetti-canvas';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    size();
    const colors = ['#0a84ff', '#5e5ce6', '#34c759', '#ff9f0a', '#ff375f', '#ffcb05'];
    const N = 120;
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * cv.width,
      y: -Math.random() * cv.height * 0.3,
      r: (6 + Math.random() * 8) * dpr,
      c: colors[(Math.random() * colors.length) | 0],
      vx: (Math.random() - 0.5) * 6 * dpr,
      vy: (3 + Math.random() * 5) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3
    }));
    const start = performance.now();
    function frame(t) {
      const elapsed = t - start;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12 * dpr; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      }
      if (elapsed < 2600) requestAnimationFrame(frame);
      else { cv.remove(); confettiRunning = false; }
    }
    requestAnimationFrame(frame);
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  }

  // ----- Pull to refresh -----
  function enablePullToRefresh(scrollEl, onRefresh) {
    if (!scrollEl || scrollEl._ptrOn) return;
    scrollEl._ptrOn = true;
    const ind = document.createElement('div');
    ind.className = 'ptr-indicator';
    ind.textContent = '↻';
    scrollEl.prepend(ind);
    let startY = 0, pulling = false, dist = 0;
    const THRESH = 70;
    scrollEl.addEventListener('touchstart', (e) => {
      if (scrollEl.scrollTop <= 0) { startY = e.touches[0].clientY; pulling = true; dist = 0; }
      else pulling = false;
    }, { passive: true });
    scrollEl.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      dist = e.touches[0].clientY - startY;
      if (dist > 0) {
        const d = Math.min(dist, 110);
        ind.style.transform = `translate(-50%, ${d}px) rotate(${d * 3}deg)`;
        ind.style.opacity = String(Math.min(1, d / THRESH));
      }
    }, { passive: true });
    scrollEl.addEventListener('touchend', () => {
      if (!pulling) return;
      const fire = dist > THRESH;
      ind.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      if (fire) {
        ind.classList.add('spin');
        if (navigator.vibrate) navigator.vibrate(12);
        try { onRefresh && onRefresh(); } catch (e) {}
        setTimeout(() => { ind.classList.remove('spin'); reset(); }, 700);
      } else reset();
      pulling = false;
      function reset() { ind.style.transform = 'transl(-50%, 0)'; ind.style.opacity = '0'; setTimeout(() => { ind.style.transition = ''; }, 260); }
    });
  }

  return { enableSwipe, confetti, enablePullToRefresh };
})();
