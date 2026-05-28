// Lightweight localStorage-based DB with namespaced collections.
// All data stays on this device only.
const DB = (() => {
  const PREFIX = 'habait:';
  const KEYS = {
    meds: 'meds',
    shopping: 'shopping',
    tasks: 'tasks',
    expenses: 'expenses',
    budgets: 'budgets',
    family: 'family',
    settings: 'settings'
  };

  function read(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('DB read error', key, e);
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB write error', key, e);
      return false;
    }
  }

  function list(key) {
    return read(key) || [];
  }

  function save(key, items) {
    return write(key, items);
  }

  function add(key, item) {
    const items = list(key);
    item.id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    item.createdAt = item.createdAt || Date.now();
    items.push(item);
    save(key, items);
    return item;
  }

  function update(key, id, patch) {
    const items = list(key);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, updatedAt: Date.now() };
    save(key, items);
    return items[idx];
  }

  function remove(key, id) {
    const items = list(key).filter((i) => i.id !== id);
    save(key, items);
  }

  function findById(key, id) {
    return list(key).find((i) => i.id === id) || null;
  }

  function getSettings() {
    return read(KEYS.settings) || {};
  }

  function setSetting(name, value) {
    const s = getSettings();
    s[name] = value;
    write(KEYS.settings, s);
  }

  function exportAll() {
    const out = {};
    for (const k of Object.values(KEYS)) {
      out[k] = read(k);
    }
    out._exportedAt = new Date().toISOString();
    out._version = 1;
    return out;
  }

  function importAll(data) {
    if (!data || typeof data !== 'object') return false;
    for (const k of Object.values(KEYS)) {
      if (k in data) write(k, data[k]);
    }
    return true;
  }

  function reset() {
    for (const k of Object.values(KEYS)) {
      localStorage.removeItem(PREFIX + k);
    }
  }

  return {
    KEYS,
    list, save, add, update, remove, findById,
    getSettings, setSetting,
    exportAll, importAll, reset
  };
})();
