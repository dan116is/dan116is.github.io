const Settings = (() => {
  const FAMILY_KEY = DB.KEYS.family;

  function family() { return DB.list(FAMILY_KEY); }

  function addMember(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (family().some((m) => m.name === trimmed)) return null;
    return DB.add(FAMILY_KEY, { name: trimmed });
  }

  function removeMember(id) { DB.remove(FAMILY_KEY, id); }

  function renderFamily() {
    const container = document.getElementById('family-list');
    const items = family();
    if (items.length === 0) {
      container.innerHTML = `<p class="hint" style="margin:0 0 8px;">עוד לא הוספת בני משפחה.</p>`;
      return;
    }
    container.innerHTML = items.map((m) => `
      <span class="family-chip">
        ${escape(m.name)}
        <button data-fam-del="${m.id}" aria-label="הסר">×</button>
      </span>
    `).join('');
  }

  function seedDefaultFamily() {
    if (family().length > 0) return;
    const defaults = ['דניאל', 'הילה', 'גפן', 'אורי'];
    for (const name of defaults) addMember(name);
  }

  function renderNotifStatus() {
    const el = document.getElementById('notif-status');
    if (!Notifier.isSupported()) {
      el.textContent = 'הדפדפן הזה לא תומך בהתראות.';
      return;
    }
    const p = Notifier.permission();
    if (p === 'granted') el.textContent = '✓ התראות פעילות. תקבל תזכורות על תרופות ומשימות.';
    else if (p === 'denied') el.textContent = 'התראות חסומות. שנה את ההגדרה בדפדפן.';
    else el.textContent = 'התראות עוד לא הופעלו.';
  }

  function exportBackup() {
    const data = DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `habait-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(file, onDone) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (DB.importAll(parsed)) onDone(true);
        else onDone(false);
      } catch (e) {
        onDone(false);
      }
    };
    reader.onerror = () => onDone(false);
    reader.readAsText(file);
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { family, addMember, removeMember, renderFamily, seedDefaultFamily, renderNotifStatus, exportBackup, importBackup };
})();
if (typeof window !== "undefined") window.Settings = Settings;
