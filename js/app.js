// Main app controller: routing, modals, event delegation, dashboard.
const App = (() => {
  const views = ['dashboard', 'medications', 'shopping', 'tasks', 'budget', 'settings'];
  let currentView = 'dashboard';
  let medFilter = 'all';
  let taskFilter = 'all';
  let installPromptEvent = null;

  function init() {
    Settings.seedDefaultFamily();
    setupNav();
    setupModal();
    setupHandlers();
    setupInstallPrompt();
    registerServiceWorker();
    setView(parseHashView() || 'dashboard');
    renderAll();
    Notifier.start();
    setInterval(renderAll, 60 * 1000);
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
      btn.addEventListener('click', () => setView(btn.dataset.view));
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
    setTimeout(() => t.classList.add('hidden'), 2500);
  }

  function setupHandlers() {
    // Dashboard stat cards
    document.querySelectorAll('.stat-card').forEach((card) => {
      card.addEventListener('click', () => setView(card.dataset.target));
    });
    document.querySelectorAll('.quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
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
    document.getElementById('clear-bought-btn').addEventListener('click', () => {
      if (!confirm('למחוק את כל מה שנקנה?')) return;
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
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('הייבוא ידרוס את כל הנתונים הקיימים. להמשיך?')) return;
      Settings.importBackup(file, (ok) => {
        if (ok) {
          renderAll();
          toast('הגיבוי יובא בהצלחה', 'success');
        } else {
          toast('שגיאה בייבוא', 'error');
        }
      });
      e.target.value = '';
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
      const txt = prompt('זה ימחק את כל הנתונים. הקלד "מחק" כדי לאשר.');
      if (txt === 'מחק') {
        DB.reset();
        Settings.seedDefaultFamily();
        renderAll();
        toast('הכל נמחק', 'success');
      }
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

  function onMedListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.medTake) {
      Medications.takeDose(t.dataset.medTake);
      renderAll();
      toast('סומן כנלקח', 'success');
    } else if (t.dataset.medEdit) {
      const med = DB.findById(DB.KEYS.meds, t.dataset.medEdit);
      if (med) showMedForm(med);
    } else if (t.dataset.medDel) {
      if (!confirm('למחוק את התרופה?')) return;
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
      Shopping.toggle(t.dataset.shopToggle);
      renderAll();
    } else if (t.dataset.shopDel) {
      Shopping.remove(t.dataset.shopDel);
      renderAll();
    }
  }

  // ----- Tasks handlers -----
  function showTaskForm(existing) {
    openModal(existing ? 'ערוך משימה' : 'משימה חדשה', Tasks.openForm(existing));
    const form = document.getElementById('task-form');
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

  function onTaskListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.taskToggle) {
      Tasks.toggle(t.dataset.taskToggle);
      renderAll();
    } else if (t.dataset.taskEdit) {
      const task = DB.findById(DB.KEYS.tasks, t.dataset.taskEdit);
      if (task) showTaskForm(task);
    } else if (t.dataset.taskDel) {
      if (!confirm('למחוק את המשימה?')) return;
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

  function onExpenseListClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.expEdit) {
      const exp = DB.findById(DB.KEYS.expenses, t.dataset.expEdit);
      if (exp) showExpenseForm(exp);
    } else if (t.dataset.expDel) {
      if (!confirm('למחוק את ההוצאה?')) return;
      Budget.remove(t.dataset.expDel);
      renderAll();
      toast('נמחק', 'success');
    }
  }

  function renderBudget() {
    const mKey = document.getElementById('budget-month').value || Budget.monthKey();
    Budget.renderSummary(mKey);
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
  function renderDashboard() {
    const today = new Date();
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

    renderDashboardAlerts();
  }

  function renderDashboardAlerts() {
    const alerts = [];
    for (const med of Medications.list()) {
      const s = Medications.statusOf(med);
      if (s.level === 'danger' || s.level === 'warning') {
        alerts.push({
          level: s.level,
          title: '💊 ' + med.name,
          sub: s.text
        });
      }
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    const overdueTasks = Tasks.list().filter((t) => !t.done && t.dueDate && t.dueDate < todayKey);
    const todayTasks = Tasks.list().filter((t) => !t.done && t.dueDate === todayKey);
    if (overdueTasks.length > 0) {
      alerts.push({
        level: 'danger',
        title: `📋 ${overdueTasks.length} משימות באיחור`,
        sub: overdueTasks.slice(0, 2).map((t) => t.title).join(', ')
      });
    }
    if (todayTasks.length > 0) {
      alerts.push({
        level: 'warning',
        title: `📋 ${todayTasks.length} משימות להיום`,
        sub: todayTasks.slice(0, 2).map((t) => t.title).join(', ')
      });
    }

    const mKey = Budget.monthKey();
    const limit = Budget.getBudget(mKey);
    const total = Budget.totalForMonth(mKey);
    if (limit > 0 && total > limit) {
      alerts.push({
        level: 'danger',
        title: '💰 חרגת מהתקציב',
        sub: `הוצאת ${Budget.format(total)} מתוך ${Budget.format(limit)}`
      });
    } else if (limit > 0 && total > limit * 0.8) {
      alerts.push({
        level: 'warning',
        title: '💰 קרוב לסוף התקציב',
        sub: `הוצאת ${Budget.format(total)} מתוך ${Budget.format(limit)}`
      });
    }

    const container = document.getElementById('dashboard-alerts');
    if (alerts.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `<h3 class="section-h">דברים שדורשים תשומת לב</h3>` +
      alerts.slice(0, 6).map((a) => `
        <div class="alert-item ${a.level}">
          <div class="alert-item-title">${a.title}</div>
          <div class="alert-item-sub">${a.sub}</div>
        </div>
      `).join('');
  }

  function renderCurrentView() {
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'medications') Medications.render(document.getElementById('med-list'), medFilter);
    else if (currentView === 'shopping') Shopping.render(document.getElementById('shop-list'));
    else if (currentView === 'tasks') Tasks.render(document.getElementById('task-list'), taskFilter);
    else if (currentView === 'budget') renderBudget();
    else if (currentView === 'settings') {
      Settings.renderFamily();
      Settings.renderNotifStatus();
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
