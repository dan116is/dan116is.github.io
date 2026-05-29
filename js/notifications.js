// Notifications & daily reminders.
// Uses Notification API; checks state on every app load and every 5 min while open.
const Notifier = (() => {
  let checkTimer = null;
  let shown = new Set();

  function isSupported() {
    return 'Notification' in window;
  }

  function permission() {
    return isSupported() ? Notification.permission : 'unsupported';
  }

  async function request() {
    if (!isSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try {
      return await Notification.requestPermission();
    } catch (e) {
      return 'denied';
    }
  }

  function notify(title, options = {}) {
    if (!isSupported() || Notification.permission !== 'granted') return;
    const key = title + '|' + (options.body || '');
    if (shown.has(key)) return;
    shown.add(key);
    setTimeout(() => shown.delete(key), 6 * 60 * 60 * 1000); // dedupe 6h
    try {
      const reg = navigator.serviceWorker && navigator.serviceWorker.controller
        ? navigator.serviceWorker.ready
        : null;
      if (reg) {
        reg.then((r) =>
          r.showNotification(title, { icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', ...options })
        );
      } else {
        new Notification(title, { icon: 'icons/icon-192.png', ...options });
      }
    } catch (e) {
      console.error('notify failed', e);
    }
  }

  function checkAll() {
    if (!isSupported() || Notification.permission !== 'granted') return;
    Medications.checkAlerts(notify);
    Tasks.checkAlerts(notify);
    if (typeof Events !== 'undefined') checkEvents();
    if (typeof Maintenance !== 'undefined') Maintenance.checkAlerts(notify);
  }

  function checkEvents() {
    const hour = new Date().getHours();
    if (hour < 8 || hour > 22) return;
    for (const { ev, d } of Events.upcoming(7)) {
      if (d === 0) notify('🎉 היום!', { body: ev.title, tag: 'ev-' + ev.id });
      else if (d === 1) notify('מחר', { body: ev.title + ' — ' + Events.countdownText(d), tag: 'evn-' + ev.id });
    }
  }

  function start() {
    checkAll();
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = setInterval(checkAll, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkAll();
    });
  }

  return { isSupported, permission, request, notify, checkAll, start };
})();
