// Main app controller: routing, modals, event delegation, dashboard.
const App = (() => {
  const views = ['dashboard', 'medications', 'shopping', 'tasks', 'calendar', 'events', 'goals', 'schedule', 'budget', 'settings'];
  let currentView = 'dashboard';
  let medFilter = 'all';
  let taskFilter = 'all';
  let installPromptEvent = null;

  function init() {
    applyTheme(DB.getSettings().theme || 'auto');
    Settings.seedDefaultFamily();
    if (window.Habits) Habits.ensureSeed();
    if (window.Goals) Goals.ensureSeed();
    applyFamilyPhoto();
    setupNav();
    setupModal();
    setupHandlers();
    setupInstallPrompt();
    registerServiceWorker();
    setView(parseHashView() || 'dashboard');
    renderAll();
    if (window.Weather) Weather.start();
    if (window.Jewish) Jewish.start();
    if (window.Beitar) Beitar.start();
    if (window.Sync) Sync.start();
    Notifier.start();
    setupUX();
    setInterval(renderAll, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { if (window.Weather) Weather.paint(); if (window.Jewish) Jewish.paint(); }
    });
  }

  function setupUX() {
    if (!window.UX) return;
    UX.enablePullToRefresh(document.getElementById('app-content'), () => {
      haptic(10);
      if (window.Weather) Weather.refresh(true);
      if (window.Jewish) Jewish.refresh();
      if (window.Beitar) Beitar.refresh();
      renderAll();
    });
    UX.enableSwipe(document.getElementById('dash-tasks'), {
      rowSelector: '.dash-item',
      onComplete: (row) => { const b = row.querySelector('[data-task-toggle]'); if (b) { haptic(); Tasks.toggle(b.dataset.taskToggle); renderAll(); } },
      onDelete: (row) => { const b = row.querySelector('[data-task-toggle]'); if (b) { haptic(); Tasks.remove(b.dataset.taskToggle); renderAll(); toast('נמחק'); } }
    });
    UX.enableSwipe(document.getElementById('dash-shopping'), {
      rowSelector: '.dash-item',
      onComplete: (row) => { const b = row.querySelector('[data-shop-toggle]'); if (b) { haptic(); Shopping.toggle(b.dataset.shopToggle); renderAll(); } },
      onDelete: (row) => { const b = row.querySelector('[data-shop-toggle]'); if (b) { haptic(); Shopping.remove(b.dataset.shopToggle); renderAll(); toast('נמחק'); } }
    });
  }

  function parseHashView() {
    const h = location.hash.replace('#', '');
    return views.includes(h) ? h : null;
  }

  function setView(name) {
    if (!views.includes(name)) name = 'dashboard';
    currentView = name;
    closeMore();
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    const inBar = ['dashboard', 'calendar', 'shopping', 'budget'];
    document.querySelectorAll('.nav-btn[data-view]').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === name);
    });
    const moreBtn = document.getElementById('nav-more-btn');
    if (moreBtn) moreBtn.classList.toggle('active', !inBar.includes(name));
    document.getElementById('app-content').scrollTop = 0;
    history.replaceState(null, '', '#' + name);
    renderCurrentView();
  }

  function openMore() { document.getElementById('more-sheet').classList.remove('hidden'); }
  function closeMore() { document.getElementById('more-sheet').classList.add('hidden'); }

  function setupNav() {
    document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => { haptic(8); setView(btn.dataset.view); });
    });
    document.getElementById('nav-more-btn').addEventListener('click', () => { haptic(8); openMore(); });
    const sheet = document.getElementById('more-sheet');
    sheet.querySelector('.more-backdrop').addEventListener('click', closeMore);
    sheet.querySelectorAll('.more-item').forEach((btn) => {
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

    // Family sync
    if (window.Sync) {
      Sync.onStatus((state, msg) => {
        const el = document.getElementById('sync-status');
        if (el) el.textContent = 'מצב סנכרון: ' + (msg || state);
      });
    }
    document.getElementById('sync-enable-btn').addEventListener('click', async () => {
      const codeV = document.getElementById('set-family-code').value.trim();
      const parsed = Sync.parseConfig(document.getElementById('set-fb-config').value.trim());
      if (!codeV) { toast('הזן קוד משפחה', 'error'); return; }
      if (!parsed) { toast('קונפיג Firebase לא תקין', 'error'); return; }
      DB.setSetting('familyCode', codeV);
      DB.setSetting('firebaseConfig', JSON.stringify(parsed));
      const ok = await Sync.enable();
      toast(ok ? 'הסנכרון הופעל ✓' : 'הפעלת הסנכרון נכשלה', ok ? 'success' : 'error');
    });
    document.getElementById('sync-disable-btn').addEventListener('click', () => {
      Sync.disable();
      toast('הסנכרון כובה');
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

    // Events view
    document.getElementById('add-event-btn').addEventListener('click', () => showEventForm());
    document.getElementById('event-list').addEventListener('click', onEventListClick);

    // Goals view
    document.getElementById('goals-list').addEventListener('click', onGoalsClick);

    // Schedule view
    document.getElementById('add-sched-btn').addEventListener('click', () => showScheduleForm());
    document.getElementById('sched-board').addEventListener('click', onScheduleClick);

    // Music shortcut -> user playlist
    document.getElementById('music-btn').addEventListener('click', (e) => {
      const url = (DB.getSettings().playlistUrl || '').trim();
      if (url) { e.currentTarget.href = url; }
    });

    // Family photo + playlist + water goal (settings)
    document.getElementById('photo-pick-btn').addEventListener('click', () => document.getElementById('photo-file').click());
    document.getElementById('photo-file').addEventListener('change', onPhotoPicked);
    document.getElementById('photo-clear-btn').addEventListener('click', () => {
      DB.setSetting('familyPhoto', '');
      applyFamilyPhoto();
      toast('התמונה הוסרה');
    });
    document.getElementById('set-playlist').addEventListener('change', (e) => {
      DB.setSetting('playlistUrl', e.target.value.trim());
      const url = (e.target.value.trim()) || 'https://open.spotify.com';
      document.getElementById('music-btn').href = url;
      toast('נשמר', 'success');
    });
    document.getElementById('set-water-goal').addEventListener('change', (e) => {
      const g = Math.max(1, Math.min(20, Number(e.target.value) || 8));
      if (window.Habits) {
        const list = Habits.all();
        const w = list.find((h) => h.id === 'water');
        if (w) { w.goal = g; DB.setSetting('habits', list); }
      }
      toast('יעד המים עודכן', 'success');
      renderDashHabits();
    });

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
    } else if (action === 'add-event') {
      showEventForm();
    }
  }

  // ----- Dashboard live widgets -----
  function onDashClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'weather-refresh') {
      haptic();
      if (window.Weather) Weather.refresh(true);
    } else if (btn.id === 'jewish-refresh') {
      haptic();
      if (window.Jewish) Jewish.refresh();
    } else if (btn.dataset.taskToggle) {
      haptic();
      Tasks.toggle(btn.dataset.taskToggle);
      celebrateIfAllDone();
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
    } else if (btn.dataset.wkDay) {
      haptic(8);
      if (window.Calendar) { Calendar.select(btn.dataset.wkDay); setView('calendar'); }
    } else if (btn.dataset.habit) {
      haptic();
      const wasDone = Habits.isDone(Habits.all().find((x) => x.id === btn.dataset.habit) || {});
      Habits.bump(btn.dataset.habit, 1);
      const nowDone = Habits.isDone(Habits.all().find((x) => x.id === btn.dataset.habit) || {});
      if (!wasDone && nowDone && window.UX) UX.confetti();
      renderDashHabits();
    } else if (btn.id === 'mg-set') {
      showMonthlyGoalForm();
    } else if (btn.dataset.mg) {
      haptic();
      const m = Goals.monthly();
      Goals.setMonthly({ progress: Math.max(0, Math.min(100, (Number(m.progress) || 0) + Number(btn.dataset.mg))) });
      const after = Goals.monthly();
      if (Number(after.progress) >= 100 && window.UX) UX.confetti();
      renderMonthlyGoal();
    } else if (btn.dataset.view && (btn.classList.contains('goal-mini') || btn.classList.contains('link-btn'))) {
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

  // Celebrate when the last open task for today gets completed.
  function celebrateIfAllDone() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const remaining = Tasks.list().filter((t) => !t.done && (t.dueDate === todayKey || !t.dueDate)).length;
    if (remaining === 0 && window.UX) {
      UX.confetti();
      toast('כל הכבוד! סיימת הכל 🎉', 'success');
    }
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

  // ----- Events handlers -----
  function showEventForm(existing) {
    openModal(existing ? 'ערוך אירוע' : 'אירוע / יום הולדת', Events.openForm(existing));
    const form = document.getElementById('event-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (existing) Events.update(existing.id, data);
      else Events.add(data);
      closeModal();
      renderAll();
      toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }

  async function onEventListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.eventEdit) {
      const ev = DB.findById(DB.KEYS.events, t.dataset.eventEdit);
      if (ev) showEventForm(ev);
    } else if (t.dataset.eventDel) {
      const ok = await confirmDialog({ title: 'מחיקת אירוע', message: 'למחוק את האירוע?', okText: 'מחק', icon: '🎂' });
      if (!ok) return;
      Events.remove(t.dataset.eventDel);
      renderAll();
      toast('נמחק', 'success');
    }
  }

  // ----- Goals handlers -----
  function showMonthlyGoalForm() {
    const m = Goals.monthly();
    openModal('היעד שלי לחודש', `
      <form id="mg-form">
        <div class="form-group">
          <label>מה היעד שלך החודש?</label>
          <input name="title" value="${escapeAttr(m.title || '')}" placeholder="לדוגמה: 12 אימונים" required>
        </div>
        <div class="form-group">
          <label>התקדמות: <span id="mg-val">${Number(m.progress) || 0}</span>%</label>
          <input name="progress" type="range" min="0" max="100" step="5" value="${Number(m.progress) || 0}" oninput="document.getElementById('mg-val').textContent=this.value">
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">שמור</button>
        </div>
      </form>`);
    const form = document.getElementById('mg-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      Goals.setMonthly({ title: d.title.trim(), progress: Number(d.progress) });
      closeModal(); renderDashboard(); toast('נשמר', 'success');
    });
  }

  function showGoalForm(who) {
    openModal('יעד חדש ל' + who, `
      <form id="goal-form">
        <div class="form-group">
          <label>היעד</label>
          <input name="title" required placeholder="מה רוצים להשיג?">
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">הוסף</button>
        </div>
      </form>`);
    const form = document.getElementById('goal-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      Goals.add({ who, title: d.title.trim(), category: 'custom' });
      closeModal(); renderAll(); toast('נוסף', 'success');
    });
  }

  async function onGoalsClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.goalToggle) {
      haptic(); Goals.toggle(btn.dataset.goalToggle); renderAll();
    } else if (btn.dataset.goalDel) {
      const ok = await confirmDialog({ title: 'מחיקת יעד', message: 'למחוק את היעד?', okText: 'מחק', icon: '🎯' });
      if (!ok) return;
      Goals.remove(btn.dataset.goalDel); renderAll(); toast('נמחק', 'success');
    } else if (btn.dataset.goalAdd) {
      showGoalForm(btn.dataset.goalAdd);
    }
  }

  // ----- Schedule handlers -----
  function showScheduleForm(existing, presetDay) {
    openModal(existing ? 'ערוך פעילות' : 'פעילות חדשה', Schedule.openForm(existing, presetDay));
    const form = document.getElementById('sched-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (existing) Schedule.update(existing.id, d); else Schedule.add(d);
      closeModal(); renderAll(); toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }

  async function onScheduleClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.schedAdd != null) {
      showScheduleForm(null, btn.dataset.schedAdd);
    } else if (btn.dataset.schedDel) {
      const ok = await confirmDialog({ title: 'מחיקת פעילות', message: 'למחוק מהלו״ז?', okText: 'מחק', icon: '🗓️' });
      if (!ok) return;
      Schedule.remove(btn.dataset.schedDel); renderAll(); toast('נמחק', 'success');
    }
  }

  // ----- Family photo -----
  function applyFamilyPhoto() {
    const photo = DB.getSettings().familyPhoto;
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    if (photo) {
      document.documentElement.style.setProperty('--family-photo', `url("${photo}")`);
      document.body.classList.add('has-photo');
    } else {
      document.documentElement.style.removeProperty('--family-photo');
      document.body.classList.remove('has-photo');
    }
  }

  function onPhotoPicked(e) {
    const file = e.target.files[0];
    if (!file) return;
    // Downscale to keep storage small (localStorage limit), then save as DataURL.
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const cv = document.createElement('canvas');
        cv.width = width; cv.height = height;
        cv.getContext('2d').drawImage(img, 0, 0, width, height);
        try {
          const data = cv.toDataURL('image/jpeg', 0.82);
          DB.setSetting('familyPhoto', data);
          applyFamilyPhoto();
          toast('התמונה נשמרה 🤍', 'success');
        } catch (err) {
          toast('התמונה גדולה מדי', 'error');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

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
    document.getElementById('set-family-code').value = s.familyCode || '';
    document.getElementById('set-fb-config').value = s.firebaseConfig || '';
    document.getElementById('set-playlist').value = s.playlistUrl || '';
    const waterGoal = (window.Habits && (Habits.all().find((h) => h.id === 'water') || {}).goal) || 8;
    document.getElementById('set-water-goal').value = waterGoal;
    const mb = document.getElementById('music-btn');
    if (mb && s.playlistUrl) mb.href = s.playlistUrl;
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

    renderWeekStrip();
    renderGlance();
    if (window.Weather) Weather.paint();
    if (window.Jewish) Jewish.paint();
    if (window.Beitar) Beitar.paint();
    renderMonthlyGoal();
    if (window.Schedule) Schedule.renderToday(document.getElementById('dash-schedule'));
    renderDashTasks();
    renderDashShopping();
    renderDashHabits();
    renderDashGoals();
    renderDashMeds();
    renderDashEvents();
    renderDashBudget();
  }

  function renderMonthlyGoal() {
    const el = document.getElementById('monthly-goal');
    if (!el || !window.Goals) return;
    const m = Goals.monthly();
    const pct = Math.max(0, Math.min(100, Number(m.progress) || 0));
    if (!m.title) {
      el.className = 'monthly-goal empty';
      el.innerHTML = `<button class="mg-set" id="mg-set">🎯 הגדר יעד אישי לחודש</button>`;
      return;
    }
    el.className = 'monthly-goal';
    el.innerHTML = `
      <div class="mg-head">
        <span class="mg-label">🎯 היעד שלי לחודש</span>
        <button class="mg-edit" id="mg-set" aria-label="ערוך">✎</button>
      </div>
      <div class="mg-title">${esc(m.title)}</div>
      <div class="mg-bar"><div class="mg-bar-fill" style="width:${pct}%"></div></div>
      <div class="mg-foot">
        <button class="mg-step" data-mg="-10">−</button>
        <span class="mg-pct">${pct}%</span>
        <button class="mg-step" data-mg="10">+</button>
      </div>`;
  }

  function renderDashGoals() {
    const el = document.getElementById('dash-goals');
    if (!el || !window.Goals) return;
    const ppl = Goals.people();
    if (!ppl.length) { el.innerHTML = `<div class="dash-empty">אין יעדים</div>`; return; }
    el.innerHTML = ppl.map((who) => {
      const p = Goals.progress(who);
      return `<button class="goal-mini" data-view="goals">
        <span class="goal-mini-emoji">${Goals.emojiFor(who)}</span>
        <span class="goal-mini-name">${esc(who)}</span>
        <span class="goal-mini-bar"><span style="width:${p.pct}%"></span></span>
        <span class="goal-mini-pct">${p.done}/${p.total}</span>
      </button>`;
    }).join('');
  }

  function renderDashHabits() {
    const el = document.getElementById('dash-habits');
    if (!el || !window.Habits) return;
    const items = Habits.all();
    if (!items.length) { el.innerHTML = `<div class="dash-empty">אין הרגלים. אפשר להוסיף בקרוב.</div>`; return; }
    el.innerHTML = items.map((h) => {
      const done = Habits.isDone(h);
      const streak = Habits.streak(h);
      const val = Habits.valueToday(h);
      const sub = h.type === 'count' ? `${val}/${h.goal}` : (done ? 'בוצע' : 'לא בוצע');
      return `<button class="habit-tile ${done ? 'done' : ''}" data-habit="${h.id}">
        <span class="habit-emoji">${h.emoji}</span>
        <span class="habit-name">${esc(h.name)}</span>
        <span class="habit-sub">${sub}</span>
        ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
      </button>`;
    }).join('');
  }

  function dkey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function renderWeekStrip() {
    const el = document.getElementById('week-strip');
    if (!el) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayKey = dkey(today);
    const tasks = Tasks.list().filter((t) => !t.done && t.dueDate);
    const names = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const key = dkey(d);
      const count = tasks.filter((t) => t.dueDate === key).length;
      html += `<button class="wk-day ${key === todayKey ? 'today' : ''}" data-wk-day="${key}">
        <span class="wk-name">${names[d.getDay()]}</span>
        <span class="wk-num">${d.getDate()}</span>
        <span class="wk-dot">${count ? '<i></i>' : ''}</span>
      </button>`;
    }
    el.innerHTML = html;
  }

  function renderGlance() {
    const el = document.getElementById('glance');
    if (!el) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const tasksToday = Tasks.list().filter((t) => !t.done && (t.dueDate === todayKey)).length;
    const overdue = Tasks.overdueCount();
    const shop = Shopping.activeCount();
    const ev = window.Events ? Events.upcoming(7)[0] : null;
    const parts = [];
    if (overdue > 0) parts.push(`<span class="g-pill danger">⏰ ${overdue} באיחור</span>`);
    parts.push(`<span class="g-pill">📋 ${tasksToday} משימות היום</span>`);
    if (shop > 0) parts.push(`<span class="g-pill">🛒 ${shop} בקניות</span>`);
    if (ev) parts.push(`<span class="g-pill accent">${Events.icon(ev.ev)} ${esc(ev.ev.title)} · ${Events.countdownText(ev.d)}</span>`);
    el.innerHTML = parts.join('');
  }

  function renderDashEvents() {
    const widget = document.getElementById('dash-events-widget');
    const el = document.getElementById('dash-events');
    if (!widget || !window.Events) return;
    const items = Events.upcoming(45);
    if (!items.length) { widget.hidden = true; return; }
    widget.hidden = false;
    el.innerHTML = items.slice(0, 4).map(({ ev, d }) => {
      const age = Events.ageTurning(ev);
      return `<div class="dash-item ${d <= 7 ? 'danger' : ''}">
        <div class="event-emoji sm">${Events.icon(ev)}</div>
        <span class="dash-item-title">${esc(ev.title)}${age != null ? ` <span class="muted">· ${age}</span>` : ''}</span>
        <span class="tag ${d <= 7 ? 'warning' : ''}">${Events.countdownText(d)}</span>
      </div>`;
    }).join('');
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
    else if (currentView === 'events') Events.render(document.getElementById('event-list'));
    else if (currentView === 'goals') Goals.render(document.getElementById('goals-list'));
    else if (currentView === 'schedule') Schedule.render(document.getElementById('sched-board'));
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

  return { init, setView, toast, refresh: renderAll };
})();

document.addEventListener('DOMContentLoaded', App.init);
