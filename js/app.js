// Main app controller: routing, modals, event delegation, dashboard.
const App = (() => {
  const views = ['dashboard', 'medications', 'shopping', 'tasks', 'calendar', 'budget', 'settings'];
  let currentView = 'dashboard';
  let medFilter = 'all';
  let taskFilter = 'all';
  let installPromptEvent = null;

  function init() {
    applyTheme(DB.getSettings().theme || 'auto');
    Settings.seedDefaultFamily();
    setupNav();
    setupModal();
    setupHandlers();
    setupInstallPrompt();
    registerServiceWorker();
    setView(parseHashView() || 'dashboard');
    renderAll();
    if (window.Weather) Weather.start();
    if (window.Beitar) Beitar.start();
    Notifier.start();
    setInterval(renderAll, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && window.Weather) Weather.paint();
    });
  }

  function parseHashView() {
    const h = location.hash.replace('#', '');
    return views.includes(h) ? h : null;
  }

  function setView(name) {
    if (!views.includes(name)) name = 'dashboard';
    currentView = name;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.getElementById('app-content').scrollTop = 0;
    history.replaceState(null, '', '#' + name);
    renderCurrentView();
  }

  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => { haptic(8); setView(btn.dataset.view); });
    });
    window.addEventListener('hashchange', () => {
      const v = parseHashView();
      if (v && v !== currentView) setView(v);
    });
  }

  function setupModal() {
    const modal = document.getElementById('modal');
    document.getElementById('modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  }

  function openModal(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    setTimeout(() => {
      const first = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
      if (first) first.focus();
    }, 100);
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  }

  function toast(msg, kind = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + kind;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.add('hidden'), 2500);
  }

  function haptic(ms = 12) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // Themed confirm sheet, returns a Promise<boolean>.
  function confirmDialog({ title = 'אישור', message = '', okText = 'אישור', icon = '⚠️', danger = true } = {}) {
    return new Promise((resolve) => {
      const el = document.getElementById('confirm');
      document.getElementById('confirm-icon').textContent = icon;
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = message;
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      okBtn.textContent = okText;
      okBtn.className = danger ? 'danger-btn' : 'primary-btn';
      el.classList.remove('hidden');

      function cleanup(result) {
        el.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        el.querySelector('.confirm-backdrop').removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk() { haptic(); cleanup(true); }
      function onCancel() { cleanup(false); }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      el.querySelector('.confirm-backdrop').addEventListener('click', onCancel);
    });
  }

  function setupHandlers() {
    // Dashboard stat cards
    document.querySelectorAll('.stat-card').forEach((card) => {
      card.addEventListener('click', () => setView(card.dataset.target));
    });
    document.querySelectorAll('.quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
    });

    // Smart quick-add bar
    document.getElementById('smart-add').addEventListener('click', runSmartAdd);
    document.getElementById('smart-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runSmartAdd();
    });
    setupSmartMic();

    // Theme toggle
    document.getElementById('theme-btn').addEventListener('click', cycleTheme);

    // Dashboard live widgets (delegated)
    document.getElementById('view-dashboard').addEventListener('click', onDashClick);
    document.getElementById('dash-shop-add').addEventListener('click', addDashShopping);
    document.getElementById('dash-shop-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addDashShopping();
    });

    // Calendar view
    document.getElementById('cal-prev').addEventListener('click', () => { haptic(8); Calendar.prev(); });
    document.getElementById('cal-next').addEventListener('click', () => { haptic(8); Calendar.next(); });
    document.getElementById('cal-grid').addEventListener('click', (e) => {
      const day = e.target.closest('[data-cal-day]');
      if (day) { haptic(8); Calendar.select(day.dataset.calDay); return; }
    });
    document.getElementById('cal-day-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.taskToggle) { haptic(); Tasks.toggle(btn.dataset.taskToggle); Calendar.render(); renderDashboard(); }
    });
    document.getElementById('cal-add-task').addEventListener('click', () => showTaskForm(null, Calendar.selected()));

    // Personalization settings
    document.getElementById('set-owner').addEventListener('change', (e) => {
      DB.setSetting('ownerName', e.target.value.trim());
      toast('נשמר', 'success');
    });
    document.getElementById('set-city').addEventListener('change', (e) => {
      DB.setSetting('weatherCity', e.target.value);
      if (window.Weather) Weather.refresh(true);
      toast('העיר עודכנה', 'success');
    });
    document.getElementById('set-football-key').addEventListener('change', (e) => {
      DB.setSetting('footballApiKey', e.target.value.trim());
      DB.setSetting('beitarTeamId', '');
      if (window.Beitar) Beitar.refresh();
      toast('נשמר', 'success');
    });
    document.getElementById('set-theme').addEventListener('change', (e) => {
      DB.setSetting('theme', e.target.value);
      applyTheme(e.target.value);
    });

    // Medications view
    document.getElementById('add-med-btn').addEventListener('click', () => showMedForm());
    document.querySelectorAll('#view-medications .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-medications .filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        medFilter = btn.dataset.filter;
        Medications.render(document.getElementById('med-list'), medFilter);
      });
    });
    document.getElementById('med-list').addEventListener('click', onMedListClick);

    // Shopping view
    document.getElementById('shop-add-btn').addEventListener('click', addShoppingFromInput);
    document.getElementById('shop-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addShoppingFromInput();
    });
    document.getElementById('clear-bought-btn').addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'ניקוי רשימה', message: 'למחוק את כל הפריטים שנקנו?', okText: 'נקה', icon: '🧹' });
      if (!ok) return;
      Shopping.clearBought();
      renderAll();
      toast('נוקה', 'success');
    });
    document.getElementById('shop-list').addEventListener('click', onShopListClick);

    // Tasks view
    document.getElementById('add-task-btn').addEventListener('click', () => showTaskForm());
    document.querySelectorAll('#view-tasks .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-tasks .filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        taskFilter = btn.dataset.taskFilter;
        Tasks.render(document.getElementById('task-list'), taskFilter);
      });
    });
    document.getElementById('task-list').addEventListener('click', onTaskListClick);

    // Budget view
    const monthInput = document.getElementById('budget-month');
    monthInput.value = Budget.monthKey();
    monthInput.addEventListener('change', () => renderBudget());
    document.getElementById('budget-limit').addEventListener('input', (e) => {
      Budget.setBudget(monthInput.value, e.target.value);
      Budget.renderSummary(monthInput.value);
    });
    document.getElementById('add-expense-btn').addEventListener('click', () => showExpenseForm());
    document.getElementById('expense-list').addEventListener('click', onExpenseListClick);

    // Settings view
    document.getElementById('family-add-btn').addEventListener('click', addFamilyFromInput);
    document.getElementById('family-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addFamilyFromInput();
    });
    document.getElementById('family-list').addEventListener('click', onFamilyClick);
    document.getElementById('enable-notif-btn').addEventListener('click', async () => {
      const result = await Notifier.request();
      Settings.renderNotifStatus();
      if (result === 'granted') {
        Notifier.notify('התראות פעילות', { body: 'מעכשיו תקבל תזכורות חשובות' });
        toast('התראות הופעלו', 'success');
      } else {
        toast('לא הופעלו התראות', 'error');
      }
    });
    document.getElementById('export-btn').addEventListener('click', () => {
      Settings.exportBackup();
      toast('הגיבוי הורד', 'success');
    });
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await confirmDialog({ title: 'ייבוא גיבוי', message: 'הייבוא ידרוס את כל הנתונים הקיימים. להמשיך?', okText: 'ייבא', icon: '⬆️' });
      if (!ok) { e.target.value = ''; return; }
      Settings.importBackup(file, (success) => {
        if (success) {
          renderAll();
          toast('הגיבוי יובא בהצלחה', 'success');
        } else {
          toast('שגיאה בייבוא', 'error');
        }
      });
      e.target.value = '';
    });
    document.getElementById('reset-btn').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'מחיקת כל הנתונים',
        message: 'פעולה זו תמחק לצמיתות את כל התרופות, הקניות, המשימות וההוצאות. מומלץ לעשות גיבוי קודם. למחוק הכל?',
        okText: 'מחק הכל',
        icon: '🗑️'
      });
      if (!ok) return;
      DB.reset();
      Settings.seedDefaultFamily();
      renderAll();
      toast('הכל נמחק', 'success');
    });
  }

  function handleQuickAction(action) {
    if (action === 'add-shopping') {
      setView('shopping');
      setTimeout(() => document.getElementById('shop-input').focus(), 200);
    } else if (action === 'add-expense') {
      showExpenseForm();
    } else if (action === 'add-task') {
      showTaskForm();
    } else if (action === 'add-med') {
      showMedForm();
    }
  }

  // ----- Dashboard live widgets -----
  function onDashClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'weather-refresh') {
      haptic();
      if (window.Weather) Weather.refresh(true);
    } else if (btn.dataset.taskToggle) {
      haptic();
      Tasks.toggle(btn.dataset.taskToggle);
      renderAll();
    } else if (btn.dataset.shopToggle) {
      haptic();
      Shopping.toggle(btn.dataset.shopToggle);
      renderAll();
    } else if (btn.dataset.medTake) {
      haptic();
      Medications.takeDose(btn.dataset.medTake);
      renderAll();
      toast('סומן כנלקח', 'success');
    } else if (btn.classList.contains('link-btn') && btn.dataset.view) {
      setView(btn.dataset.view);
    }
  }

  function addDashShopping() {
    const input = document.getElementById('dash-shop-input');
    const v = input.value.trim();
    if (!v) return;
    Shopping.add(v, 'מזון');
    input.value = '';
    haptic();
    renderAll();
  }

  // ----- Smart quick-add -----
  function runSmartAdd() {
    const input = document.getElementById('smart-input');
    const text = input.value.trim();
    if (!text) return;
    const res = QuickAdd.handle(text);
    if (res) {
      input.value = '';
      haptic();
      renderAll();
      toast(res.msg, 'success');
    } else {
      toast('לא הצלחתי להבין — נסה שוב', 'error');
    }
  }

  function setupSmartMic() {
    const mic = document.getElementById('smart-mic');
    if (!QuickAdd.voiceSupported()) { mic.style.display = 'none'; return; }
    mic.addEventListener('click', () => {
      haptic();
      const input = document.getElementById('smart-input');
      QuickAdd.startVoice(
        (text) => { input.value = text; runSmartAdd(); },
        (state) => { mic.classList.toggle('listening', state === 'listening'); }
      );
    });
  }

  // ----- Theme -----
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function currentTheme() { return DB.getSettings().theme || 'auto'; }
  function cycleTheme() {
    haptic();
    const order = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(currentTheme()) + 1) % order.length];
    DB.setSetting('theme', next);
    applyTheme(next);
    const sel = document.getElementById('set-theme');
    if (sel) sel.value = next;
    toast(next === 'auto' ? 'ערכת נושא: אוטומטי' : next === 'light' ? 'מצב בהיר' : 'מצב כהה');
  }

  // ----- Medications handlers -----
  function showMedForm(existing) {
    openModal(existing ? 'ערוך תרופה' : 'תרופה חדשה', Medications.openForm(existing));
    const form = document.getElementById('med-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.stock = data.stock === '' ? 0 : Number(data.stock);
      data.dosesPerDay = data.dosesPerDay === '' ? 0 : Number(data.dosesPerDay);
      if (existing) Medications.update(existing.id, data);
      else Medications.add(data);
      closeModal();
      renderAll();
      toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }

  async function onMedListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.medTake) {
      haptic();
      Medications.takeDose(t.dataset.medTake);
      renderAll();
      toast('סומן כנלקח', 'success');
    } else if (t.dataset.medEdit) {
      const med = DB.findById(DB.KEYS.meds, t.dataset.medEdit);
      if (med) showMedForm(med);
    } else if (t.dataset.medDel) {
      const med = DB.findById(DB.KEYS.meds, t.dataset.medDel);
      const ok = await confirmDialog({ title: 'מחיקת תרופה', message: `למחוק את "${med ? med.name : ''}"?`, okText: 'מחק', icon: '💊' });
      if (!ok) return;
      Medications.remove(t.dataset.medDel);
      renderAll();
      toast('נמחק', 'success');
    }
  }

  // ----- Shopping handlers -----
  function addShoppingFromInput() {
    const input = document.getElementById('shop-input');
    const select = document.getElementById('shop-category');
    const v = input.value.trim();
    if (!v) return;
    Shopping.add(v, select.value);
    input.value = '';
    input.focus();
    renderAll();
  }

  function onShopListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.shopToggle) {
      haptic();
      Shopping.toggle(t.dataset.shopToggle);
      renderAll();
    } else if (t.dataset.shopDel) {
      Shopping.remove(t.dataset.shopDel);
      renderAll();
    }
  }

  // ----- Tasks handlers -----
  function showTaskForm(existing, prefillDate) {
    openModal(existing ? 'ערוך משימה' : 'משימה חדשה', Tasks.openForm(existing));
    const form = document.getElementById('task-form');
    if (!existing && prefillDate) {
      const dateInput = form.querySelector('[name="dueDate"]');
      if (dateInput) dateInput.value = prefillDate;
    }
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (existing) Tasks.update(existing.id, data);
      else Tasks.add(data);
      closeModal();
      renderAll();
      toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }

  async function onTaskListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.taskToggle) {
      haptic();
      Tasks.toggle(t.dataset.taskToggle);
      renderAll();
    } else if (t.dataset.taskEdit) {
      const task = DB.findById(DB.KEYS.tasks, t.dataset.taskEdit);
      if (task) showTaskForm(task);
    } else if (t.dataset.taskDel) {
      const task = DB.findById(DB.KEYS.tasks, t.dataset.taskDel);
      const ok = await confirmDialog({ title: 'מחיקת משימה', message: `למחוק את "${task ? task.title : ''}"?`, okText: 'מחק', icon: '📋' });
      if (!ok) return;
      Tasks.remove(t.dataset.taskDel);
      renderAll();
      toast('נמחק', 'success');
    }
  }

  // ----- Budget handlers -----
  function showExpenseForm(existing) {
    openModal(existing ? 'ערוך הוצאה' : 'הוצאה חדשה', Budget.openForm(existing));
    const form = document.getElementById('expense-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.amount = Number(data.amount);
      if (existing) Budget.update(existing.id, data);
      else Budget.add(data);
      closeModal();
      renderAll();
      toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }

  async function onExpenseListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.expEdit) {
      const exp = DB.findById(DB.KEYS.expenses, t.dataset.expEdit);
      if (exp) showExpenseForm(exp);
    } else if (t.dataset.expDel) {
      const ok = await confirmDialog({ title: 'מחיקת הוצאה', message: 'למחוק את ההוצאה הזו?', okText: 'מחק', icon: '💰' });
      if (!ok) return;
      Budget.remove(t.dataset.expDel);
      renderAll();
      toast('נמחק', 'success');
    }
  }

  function renderBudget() {
    const mKey = document.getElementById('budget-month').value || Budget.monthKey();
    Budget.renderSummary(mKey);
    Budget.renderTrend(mKey);
    Budget.renderCategories(mKey);
    Budget.renderList(mKey);
  }

  // ----- Settings handlers -----
  function addFamilyFromInput() {
    const input = document.getElementById('family-input');
    const v = input.value.trim();
    if (!v) return;
    if (!Settings.addMember(v)) {
      toast('כבר קיים או ריק', 'error');
      return;
    }
    input.value = '';
    Settings.renderFamily();
  }

  function onFamilyClick(e) {
    const t = e.target.closest('button');
    if (!t || !t.dataset.famDel) return;
    Settings.removeMember(t.dataset.famDel);
    Settings.renderFamily();
  }

  // ----- Dashboard -----
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function ownerName() {
    return (DB.getSettings().ownerName || 'דניאל');
  }

  function renderPersonalization() {
    const s = DB.getSettings();
    document.getElementById('set-owner').value = s.ownerName || '';
    document.getElementById('set-football-key').value = s.footballApiKey || '';
    const sel = document.getElementById('set-city');
    const cities = (window.Weather && Weather.cityList()) || ['ירושלים'];
    const current = s.weatherCity || 'ירושלים';
    sel.innerHTML = cities.map((c) => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
    document.getElementById('set-theme').value = s.theme || 'auto';
  }

  function renderDashboard() {
    const today = new Date();
    document.getElementById('greeting').textContent = `${greetingText(today)}, ${ownerName()}`;
    document.getElementById('today-date').textContent =
      today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('stat-meds').textContent = Medications.activeCount();
    const medAlerts = Medications.alertCount();
    document.getElementById('alert-meds').textContent = medAlerts > 0 ? medAlerts : '';

    document.getElementById('stat-shopping').textContent = Shopping.activeCount();

    document.getElementById('stat-tasks').textContent = Tasks.activeCount();
    const taskOverdue = Tasks.overdueCount();
    document.getElementById('alert-tasks').textContent = taskOverdue > 0 ? taskOverdue : '';

    document.getElementById('stat-budget').textContent = Budget.format(Budget.totalForMonth(Budget.monthKey()));

    if (window.Weather) Weather.paint();
    if (window.Beitar) Beitar.paint();
    renderDashTasks();
    renderDashShopping();
    renderDashMeds();
    renderDashBudget();
  }

  function greetingText(d) {
    const h = d.getHours();
    if (h < 6) return 'לילה טוב 🌙';
    if (h < 12) return 'בוקר טוב ☀️';
    if (h < 18) return 'צהריים טובים 🌤️';
    if (h < 22) return 'ערב טוב 🌆';
    return 'לילה טוב 🌙';
  }

  function renderDashTasks() {
    const el = document.getElementById('dash-tasks');
    const today = new Date().toISOString().slice(0, 10);
    const items = Tasks.list()
      .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
      .sort((a, b) => (a.dueDate || '9999-12-31') < (b.dueDate || '9999-12-31') ? -1 : 1)
      .slice(0, 5);
    if (!items.length) {
      el.innerHTML = `<div class="dash-empty">אין משימות להיום 🎉</div>`;
      return;
    }
    el.innerHTML = items.map((t) => {
      const overdue = t.dueDate && t.dueDate < today;
      const tag = overdue ? '<span class="tag danger">באיחור</span>'
        : t.dueDate === today ? '<span class="tag warning">היום</span>' : '';
      const who = t.forWhom ? `<span class="tag">${esc(t.forWhom)}</span>` : '';
      return `<div class="dash-item ${overdue ? 'danger' : ''}">
        <button class="item-check" data-task-toggle="${t.id}" aria-label="סמן"></button>
        <span class="dash-item-title">${esc(t.title)}</span>
        ${tag}${who}
      </div>`;
    }).join('');
  }

  function renderDashShopping() {
    const el = document.getElementById('dash-shopping');
    const items = Shopping.list().filter((i) => !i.bought);
    if (!items.length) {
      el.innerHTML = `<div class="dash-empty">הרשימה ריקה ✨</div>`;
      return;
    }
    const shown = items.slice(0, 6);
    const more = items.length - shown.length;
    el.innerHTML = shown.map((it) => `
      <div class="dash-item">
        <button class="item-check" data-shop-toggle="${it.id}" aria-label="סמן"></button>
        <span class="dash-item-title">${esc(it.name)} ${it.qty ? `<span class="muted">· ${esc(it.qty)}</span>` : ''}</span>
        <span class="tag">${esc(it.category || 'אחר')}</span>
      </div>`).join('') +
      (more > 0 ? `<div class="dash-empty">ועוד ${more} פריטים…</div>` : '');
  }

  function renderDashMeds() {
    const widget = document.getElementById('dash-meds-widget');
    const el = document.getElementById('dash-meds');
    const meds = Medications.list()
      .map((m) => ({ m, s: Medications.statusOf(m) }))
      .filter((x) => x.s.level === 'warning' || x.s.level === 'danger');
    if (!meds.length) {
      widget.hidden = true;
      return;
    }
    widget.hidden = false;
    el.innerHTML = meds.slice(0, 4).map(({ m, s }) => `
      <div class="dash-item ${s.level}">
        <span class="dash-item-title">${esc(m.name)} ${m.dose ? `<span class="muted">${esc(m.dose)}</span>` : ''}</span>
        <span class="tag ${s.level}">${s.text}</span>
        <button class="icon-btn" data-med-take="${m.id}" title="לקחתי מנה">✓</button>
      </div>`).join('');
  }

  function renderDashBudget() {
    const el = document.getElementById('dash-budget');
    const mKey = Budget.monthKey();
    const total = Budget.totalForMonth(mKey);
    const limit = Budget.getBudget(mKey);
    const pct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;
    const left = limit - total;
    const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
    el.innerHTML = `
      <div class="dash-budget-row">
        <span class="dash-item-title">הוצאת ${Budget.format(total)}${limit > 0 ? ` מתוך ${Budget.format(limit)}` : ''}</span>
        ${limit > 0 ? `<span class="tag ${cls}">${left >= 0 ? 'נשאר ' + Budget.format(left) : 'חריגה ' + Budget.format(-left)}</span>` : ''}
      </div>
      ${limit > 0
        ? `<div class="budget-bar"><div class="budget-bar-fill ${pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : ''}" style="width:${pct}%"></div></div>`
        : `<div class="dash-empty">לא הוגדר תקציב חודשי — אפשר להגדיר במסך התקציב</div>`}`;
  }

  function renderCurrentView() {
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'medications') Medications.render(document.getElementById('med-list'), medFilter);
    else if (currentView === 'shopping') Shopping.render(document.getElementById('shop-list'));
    else if (currentView === 'tasks') Tasks.render(document.getElementById('task-list'), taskFilter);
    else if (currentView === 'calendar') Calendar.render();
    else if (currentView === 'budget') renderBudget();
    else if (currentView === 'settings') {
      Settings.renderFamily();
      Settings.renderNotifStatus();
      renderPersonalization();
    }
  }

  function renderAll() {
    renderDashboard();
    renderCurrentView();
  }

  // ----- PWA install prompt -----
  function setupInstallPrompt() {
    const btn = document.getElementById('install-btn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPromptEvent = e;
      btn.classList.remove('hidden');
    });
    btn.addEventListener('click', async () => {
      if (!installPromptEvent) return;
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      installPromptEvent = null;
      btn.classList.add('hidden');
      if (choice.outcome === 'accepted') toast('הותקן בהצלחה', 'success');
    });
    window.addEventListener('appinstalled', () => {
      btn.classList.add('hidden');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
          console.warn('SW register failed', err);
        });
      });
    }
  }

  return { init, setView, toast };
})();

document.addEventListener('DOMContentLoaded', App.init);
