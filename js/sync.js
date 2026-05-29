// Family sync via Firebase Firestore (real-time, cross-account).
// Lazy-loads the Firebase SDK only when sync is enabled, so the app stays
// fast and fully offline-capable when sync is off. Data for all collections
// is mirrored to families/{familyCode}; last-write-wins on the whole payload.
const Sync = (() => {
  const COLLECTIONS = ['meds', 'shopping', 'tasks', 'expenses', 'budgets', 'family'];
  const SDK = '10.12.2';
  let app = null, db = null, unsub = null, enabled = false;
  let applyingRemote = false, pushTimer = null;
  let deviceId = null, lastAppliedRev = 0;
  let statusCb = () => {};

  function onStatus(cb) { statusCb = cb; }
  function setStatus(state, msg) { try { statusCb(state, msg); } catch (e) {} }

  function getDeviceId() {
    let id = DB.getSettings().deviceId;
    if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); DB.setSetting('deviceId', id); }
    return id;
  }
  function cfg() { try { return JSON.parse(DB.getSettings().firebaseConfig || 'null'); } catch (e) { return null; } }
  function code() { return (DB.getSettings().familyCode || '').trim(); }
  function isConfigured() { return !!(cfg() && code()); }
  function isEnabled() { return enabled; }

  // Accepts strict JSON or the JS snippet copied from the Firebase console.
  function parseConfig(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) {}
    try {
      let s = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      s = s.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
           .replace(/'/g, '"')
           .replace(/,(\s*})/g, '$1');
      const o = JSON.parse(s);
      return (o && o.projectId) ? o : null;
    } catch (e) { return null; }
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.firebase && firebase.firestore) return resolve();
      const add = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      add(`https://www.gstatic.com/firebasejs/${SDK}/firebase-app-compat.js`)
        .then(() => add(`https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore-compat.js`))
        .then(resolve).catch(reject);
    });
  }

  function collectPayload() {
    const p = {};
    for (const k of COLLECTIONS) p[k] = DB.list(k);
    return p;
  }
  function applyPayload(p) {
    applyingRemote = true;
    try { for (const k of COLLECTIONS) if (Array.isArray(p[k])) DB.save(k, p[k]); }
    finally { applyingRemote = false; }
    if (window.App && App.refresh) App.refresh();
  }

  async function enable() {
    if (!isConfigured()) { setStatus('error', 'חסר קונפיג או קוד משפחה'); return false; }
    try {
      setStatus('connecting', 'מתחבר…');
      await loadSdk();
      deviceId = getDeviceId();
      if (!app) app = firebase.initializeApp(cfg());
      db = firebase.firestore();
      const ref = db.collection('families').doc(code());
      if (unsub) unsub();
      unsub = ref.onSnapshot((snap) => {
        const d = snap.data();
        if (!d || !d.payload) { pushNow(); setStatus('connected', 'מסונכרן ✓'); return; }
        if (d.device !== deviceId && (d.rev || 0) > lastAppliedRev) {
          lastAppliedRev = d.rev || 0;
          applyPayload(d.payload);
        }
        setStatus('connected', 'מסונכרן ✓');
      }, () => setStatus('error', 'שגיאת חיבור — בדוק קונפיג והרשאות'));
      enabled = true;
      DB.setSetting('syncEnabled', true);
      setStatus('connected', 'מסונכרן ✓');
      return true;
    } catch (e) {
      setStatus('error', 'שגיאה בהפעלת הסנכרון');
      return false;
    }
  }

  function disable() {
    if (unsub) { unsub(); unsub = null; }
    enabled = false;
    DB.setSetting('syncEnabled', false);
    setStatus('off', 'כבוי');
  }

  function pushNow() {
    if (!enabled || !db) return;
    const rev = Date.now();
    lastAppliedRev = rev;
    db.collection('families').doc(code()).set({
      payload: collectPayload(),
      rev,
      device: deviceId,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => setStatus('connected', 'מסונכרן ✓'))
      .catch(() => setStatus('error', 'שמירה נכשלה'));
  }

  // Called by the DB layer whenever a synced collection changes.
  function onLocalChange() {
    if (!enabled || applyingRemote) return;
    setStatus('syncing', 'שומר…');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 800);
  }

  function start() {
    if (DB.getSettings().syncEnabled && isConfigured()) enable();
    else setStatus(isConfigured() ? 'off' : 'unconfigured', isConfigured() ? 'כבוי' : 'לא מוגדר');
  }

  return { start, enable, disable, onLocalChange, onStatus, parseConfig, isConfigured, isEnabled };
})();
