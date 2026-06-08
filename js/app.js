// Main app controller: routing, modals, event delegation, dashboard.
const App = (() => {
  const views = ['dashboard', 'medications', 'shopping', 'tasks', 'calendar', 'events', 'goals', 'weekly', 'schedule', 'meals', 'maintenance', 'growth', 'stars', 'savings', 'budget', 'settings'];
  let currentView = 'dashboard';
  let medFilter = 'all';
  let taskFilter = 'all';
  let taskTag = '';
  let installPromptEvent = null;

  // Production resilience: never let a stray error white-screen the app.
  function installErrorGuards() {
    window.addEventListener('error', (e) => {
      try { console.warn('caught error', e && e.message); } catch (_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try { console.warn('caught rejection', e && e.reason); } catch (_) {}
    });
  }

  function init() {
    installErrorGuards();
    applyTheme(DB.getSettings().theme || 'auto');
    Settings.seedDefaultFamily();
    if (window.Habits) Habits.ensureSeed();
    if (window.Goals) Goals.ensureSeed();
    if (window.Maintenance) Maintenance.ensureSeed();
    if (window.FoodBrain) FoodBrain.ensureSeed();
    applyFamilyPhoto();
    if (window.Autopilot) Autopilot.run();
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
    // Surface "what's new in the family" since this device last looked.
    showActivityBanner();
    setInterval(renderAll, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (window.Autopilot) Autopilot.run();
        if (window.Weather) Weather.paint();
        if (window.Jewish) Jewish.paint();
        renderDashboard();
      }
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
    var _eb = document.getElementById('dash-edit-btn');
    if (_eb) _eb.style.display = (name === 'dashboard') ? '' : 'none';
    if (name !== 'dashboard' && window.DashEdit && DashEdit.isEditing()) DashEdit.exit();
    // Edit button only on dashboard; leaving the dashboard exits edit mode.
    const editBtn = document.getElementById('dash-edit-btn');
    if (editBtn) editBtn.style.display = (name === 'dashboard') ? '' : 'none';
    if (name !== 'dashboard' && window.DashEdit && DashEdit.isEditing()) DashEdit.exit();
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

  // Themed input dialog, returns Promise<string|null>.
  function promptDialog({ title = '', label = '', value = '', placeholder = '', type = 'text', okText = 'אישור' } = {}) {
    return new Promise((resolve) => {
      openModal(title, `
        <form id="prompt-form">
          <div class="form-group">
            ${label ? `<label>${label}</label>` : ''}
            <input name="val" type="${type}" value="${String(value).replace(/"/g, '&quot;')}" placeholder="${String(placeholder).replace(/"/g, '&quot;')}" ${type === 'number' ? 'inputmode="numeric"' : ''} autofocus>
          </div>
          <div class="form-actions">
            <button type="button" class="ghost-btn" data-close>ביטול</button>
            <button type="submit" class="primary-btn">${okText}</button>
          </div>
        </form>`);
      const form = document.getElementById('prompt-form');
      let done = false;
      form.querySelector('[data-close]').addEventListener('click', () => { done = true; closeModal(); resolve(null); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        done = true;
        const v = new FormData(form).get('val');
        closeModal();
        resolve(v == null ? null : String(v).trim());
      });
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
    setupVoiceTasks();
    setupCapture();
    setupTalk();
    startDashTalkRotation();

    // Theme toggle
    document.getElementById('theme-btn').addEventListener('click', cycleTheme);

    // Dashboard edit mode (drag to reorder, tap to resize)
    const editBtn = document.getElementById('dash-edit-btn');
    if (editBtn) editBtn.addEventListener('click', () => { haptic(8); if (window.DashEdit) DashEdit.toggle(); });

    // Habits manager
    document.getElementById('habits-manage').addEventListener('click', showHabitsManager);

    // Dashboard live widgets (delegated)
    document.getElementById('view-dashboard').addEventListener('click', onDashClick);
    document.getElementById('dash-shop-add').addEventListener('click', addDashShopping);
    document.getElementById('dash-shop-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addDashShopping();
    });

    // Calendar view
    document.getElementById('cal-prev').addEventListener('click', () => { haptic(8); Calendar.prev(); });
    document.getElementById('cal-next').addEventListener('click', () => { haptic(8); Calendar.next(); });
    document.querySelectorAll('[data-cal-mode]').forEach((b) => {
      b.addEventListener('click', () => { haptic(8); Calendar.setMode(b.dataset.calMode); });
    });
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

    // Dashboard customize controls
    document.getElementById('dash-customize').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !window.DashLayout) return;
      if (btn.dataset.custToggle) { haptic(); DashLayout.toggle(btn.dataset.custToggle); renderDashCustomize(); }
      else if (btn.dataset.custUp) { haptic(8); DashLayout.move(btn.dataset.custUp, -1); renderDashCustomize(); }
      else if (btn.dataset.custDown) { haptic(8); DashLayout.move(btn.dataset.custDown, 1); renderDashCustomize(); }
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
        Tasks.render(document.getElementById('task-list'), taskFilter, taskTag);
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

    // Meals view
    document.getElementById('meals-board').addEventListener('click', onMealsClick);

    // Maintenance view
    document.getElementById('add-maint-btn').addEventListener('click', () => showMaintForm());
    document.getElementById('maint-list').addEventListener('click', onMaintClick);

    // Growth view
    document.getElementById('growth-list').addEventListener('click', onGrowthClick);

    // Stars view
    document.getElementById('stars-list').addEventListener('click', onStarsClick);

    // Savings view
    document.getElementById('add-savings-btn').addEventListener('click', () => showSavingsForm());
    document.getElementById('savings-list').addEventListener('click', onSavingsClick);

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
    const fu = document.getElementById('force-update-btn');
    if (fu) fu.addEventListener('click', forceUpdate);
    const aiSave = document.getElementById('ai-key-save');
    if (aiSave) aiSave.addEventListener('click', () => {
      const inp = document.getElementById('ai-key-input');
      if (window.AI && inp) { AI.setKey(inp.value); inp.value = ''; }
      renderAiKeyStatus();
      toast('נשמר', 'success');
    });
    const aiToggle = document.getElementById('ai-toggle');
    if (aiToggle) aiToggle.addEventListener('click', () => {
      if (window.AI) AI.setOff(!AI.isOff());
      renderAiKeyStatus();
    });
  }

  function renderAiKeyStatus() {
    const el = document.getElementById('ai-key-status');
    const btn = document.getElementById('ai-toggle');
    if (!window.AI) return;
    if (btn) btn.textContent = AI.isOff() ? 'הפעל מוח AI' : 'השבת מוח AI';
    if (el) el.textContent = AI.isOff()
      ? '⚪ מוח AI כבוי — פעיל המנוע המקומי בלבד (פרטיות מלאה)'
      : `✓ מוח AI פעיל (${AI.mode()}) — מבין כל ניסוח`;
  }

  // Build stamp — bump on every deploy so it's visible on screen. If the user
  // sees this exact string, the newest app.js loaded; if not, it's a stale
  // cache and "עדכן עכשיו" will clear it.
  const APP_BUILD = 'v56 · 3 ביוני 2026';

  // Show which version is actually running, and the real cached SW version.
  function showVersion() {
    const foot = document.getElementById('app-version-foot');
    if (foot) foot.textContent = `גרסה ${APP_BUILD} · משפחת ישראלי`;
    const line = document.getElementById('version-line');
    if (!line) return;
    line.textContent = `גרסה פעילה: ${APP_BUILD}`;
    if (window.caches) {
      caches.keys().then((keys) => {
        const cache = keys.find((k) => k.startsWith('habait-')) || '—';
        line.textContent = `גרסה פעילה: ${APP_BUILD}  ·  מטמון: ${cache}`;
      }).catch(() => {});
    }
  }

  // Nuke every cache + service worker and hard-reload. The reliable way to beat
  // a stubborn PWA cache on the phone, in one tap.
  async function forceUpdate() {
    const btn = document.getElementById('force-update-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'מעדכן…'; }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) { /* best effort */ }
    // Cache-busting reload so even the HTML itself is re-fetched.
    const u = new URL(location.href);
    u.searchParams.set('_u', Date.now());
    location.replace(u.toString());
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
    if (btn.id === 'activities-add') { haptic(); showActivityForm(); return; }
    if (btn.dataset.actDel != null) {
      haptic();
      confirmDialog({ title: 'מחיקת חוג', message: 'למחוק את החוג הזה?', okText: 'מחק', icon: '🎽' }).then((ok) => {
        if (ok && window.Activities) { Activities.remove(btn.dataset.actDel); renderDashActivities(); toast('נמחק', 'success'); }
      });
      return;
    }
    if (btn.dataset.actSeen != null) {
      haptic();
      if (typeof Activity !== 'undefined') Activity.markAllSeen();
      renderDashboard();
      return;
    }
    if (btn.dataset.agentIdx != null) {
      const ins = window.Agents ? Agents.last()[Number(btn.dataset.agentIdx)] : null;
      if (ins && ins.action) onAgentAction(ins.action);
      return;
    } else if (btn.dataset.ayes) {
      try { onAssistantAccept(JSON.parse(btn.dataset.ayes)); } catch (err) {}
      return;
    } else if (btn.dataset.ano) {
      haptic(); if (window.Assistant) Assistant.dismiss(btn.dataset.ano); renderAssistant(); return;
    } else if (btn.id === 'dash-talk-mic') {
      haptic(); primeTTS(); openTalk(true); return;
    } else if (btn.dataset.talkChip != null) {
      haptic(); primeTTS();
      openTalk();
      talkSubmit(btn.dataset.talkChip, true);
      return;
    } else if (btn.dataset.quick) {
      haptic(8);
      const q = btn.dataset.quick;
      if (q === 'focus') { if (window.Focus) Focus.begin(25, ''); toast('פוקוס התחיל ⏱️ 25 דק׳', 'success'); }
      else if (q === 'task') showTaskForm();
      else if (q === 'shop') { setView('shopping'); setTimeout(() => { const i = document.getElementById('shop-input'); if (i) i.focus(); }, 200); }
      else if (q === 'expense') showExpenseForm();
      return;
    } else if (btn.dataset.briefView) {
      haptic(8); setView(btn.dataset.briefView); return;
    } else if (btn.dataset.brief === 'assistant') {
      haptic(8);
      const card = document.getElementById('assistant-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
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
    } else if (btn.dataset.maintDone) {
      haptic();
      Maintenance.markDone(btn.dataset.maintDone);
      renderDashboard();
      toast('עודכן — נקבע מועד הבא', 'success');
    } else if (btn.dataset.mealShop != null) {
      haptic();
      const n = Meals.addIngredientsToShopping(Number(btn.dataset.mealShop));
      renderAll();
      toast(n ? `נוספו ${n} מצרכים לקניות` : 'אין מצרכים', n ? 'success' : 'error');
    } else if (btn.id === 'setup-dismiss') {
      DB.setSetting('setupDismissed', true);
      renderSetupCard();
    } else if (btn.dataset.setup) {
      const map = { 'setup-photo': 'settings', 'setup-music': 'settings', 'setup-maint': 'maintenance', 'setup-events': 'events' };
      setView(map[btn.dataset.setup] || 'settings');
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
    const res = QuickAdd.handleSmart(text);
    if (res) {
      input.value = '';
      haptic();
      renderAll();
      toast(res.msg, 'success');
    } else {
      toast('לא הצלחתי להבין — נסה שוב', 'error');
    }
  }

  // The dashboard mic now opens the conversation (Talk) overlay instead of
  // doing a one-shot quick-add — setupTalk() owns the #smart-mic click. We keep
  // the mic visible everywhere because the overlay has a typed fallback too.
  function setupSmartMic() { /* handled by setupTalk() */ }

  // ----- Voice / dictation tasks -----
  // Works everywhere: where the Web Speech API exists we use it; otherwise
  // (e.g. iPhone Safari) we focus a text field so the keyboard's built-in
  // dictation mic can be used. Either way, the text becomes one task per line.
  function commitVoiceTasks(text) {
    const t = (text || '').trim();
    if (!t) return;
    const res = QuickAdd.handleSmart(t);
    haptic();
    renderAll();
    if (res) toast(res.msg + ' ✓', 'success');
    else toast('לא הצלחתי להבין — נסה שוב', 'error');
  }

  // ----- Global capture (the floating + button, available everywhere) -----
  function openCapture() {
    document.getElementById('capture').classList.remove('hidden');
    setTimeout(() => { const i = document.getElementById('capture-input'); if (i) i.focus(); }, 120);
  }
  function closeCapture() {
    document.getElementById('capture').classList.add('hidden');
    const i = document.getElementById('capture-input'); if (i) i.value = '';
  }
  function runCapture() {
    const input = document.getElementById('capture-input');
    const text = (input.value || '').trim();
    if (!text) return;
    const res = QuickAdd.handleSmart(text);
    haptic();
    closeCapture();
    renderAll();
    toast(res ? res.msg + ' ✓' : 'לא הצלחתי להבין — נסה שוב', res ? 'success' : 'error');
  }
  function setupCapture() {
    const fab = document.getElementById('fab');
    const sheet = document.getElementById('capture');
    if (!fab || !sheet) return;
    fab.addEventListener('click', () => { haptic(); openCapture(); });
    sheet.querySelector('.capture-backdrop').addEventListener('click', closeCapture);
    document.getElementById('capture-go').addEventListener('click', runCapture);
    document.getElementById('capture-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runCapture(); }
    });
    const mic = document.getElementById('capture-mic');
    if (!QuickAdd.voiceSupported()) {
      // iPhone: no Web Speech — keep the field; the keyboard mic handles dictation.
      mic.addEventListener('click', () => { document.getElementById('capture-input').focus(); toast('הקש על אייקון המיקרופון 🎤 במקלדת', ''); });
    } else {
      mic.addEventListener('click', () => {
        haptic();
        mic.classList.add('listening');
        QuickAdd.startVoice(
          (text) => { const i = document.getElementById('capture-input'); i.value = text; runCapture(); },
          (state) => { if (state !== 'listening') mic.classList.remove('listening'); }
        );
      });
    }
    // Focus timer entry from the capture sheet + the live bar stop button.
    const focusBtn = document.getElementById('capture-focus');
    if (focusBtn) focusBtn.addEventListener('click', () => { closeCapture(); showFocusForm(); });
    const fbar = document.getElementById('focus-bar');
    if (fbar) fbar.addEventListener('click', (e) => { if (e.target.closest('#focus-stop')) { haptic(); Focus.stop(); } });
    if (window.Focus) Focus.init();
  }

  // ----- Conversation (Talk) overlay -----
  // A natural, two-way conversation: speak or type a request, get a short
  // Hebrew reply. Routes everything through NLU (complete / delete / query /
  // add) and reads answers aloud when the input came from voice.
  let _voices = [];               // cached speech voices (loaded async)
  let _ttsPrimed = false;         // iOS needs a gesture-primed utterance first
  function talkEsc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // Beginner-friendly Hebrew suggestions. We show a rotating subset of ~6 each
  // time the screen opens, orbiting the central mic, to teach what can be said.
  // QUESTIONS — tapping one gives an instant answer (no recording needed). Only
  // include phrasings the NLU truly answers, so a tap never misfires.
  const TALK_QUESTIONS = [
    'מה יש לי היום?',
    'מה המשימות שלי להיום?',
    'מה הלו״ז של היום?',
    'מה ברשימת הקניות?',
    'כמה הוצאתי החודש?',
    'כמה נשאר לי בתקציב?',
    'מה מזג האוויר היום?',
    'מה ללבוש היום?',
    'מה אוכלים היום?',
    'מתי יום ההולדת הבא?',
    'מה האירוע הקרוב?',
    'אילו תרופות עומדות להיגמר?'
  ];
  // COMMANDS — tapping one performs a smart action (with sensible defaults).
  const TALK_COMMANDS = [
    'תזכיר לי לחייג לאמא',
    'תזכיר לי מחר ללכת לרופא',
    'תוסיף חלב וביצים לקניות',
    'תוסיף קפה לרשימה',
    'תמחק לחם מהרשימה',
    'שילמתי 50 בסופר',
    'הוצאתי 200 על דלק',
    'סיימתי את הכביסה',
    'מחר שקשוקה',
    'ביום שישי פסטה',
    'תזכיר לי בערב לקחת תרופה',
    'קבע פגישה ביום שלישי'
  ];
  // The full-screen talk orbit teaches both kinds; the home hero shows mostly
  // questions (instant answers that save the user from even speaking).
  const TALK_SUGGESTIONS = [...TALK_QUESTIONS, ...TALK_COMMANDS];
  let talkPoolStart = 0; // rotates the visible subset on each open

  // Render ~6 suggestion bubbles on a ring around the central mic. Positions are
  // computed with trig so they sit evenly around the circle; CSS makes them
  // gently drift. Tapping one runs it through the same submit path as typing.
  function renderTalkBubbles() {
    const orbit = document.getElementById('talk-orbit');
    if (!orbit) return;
    orbit.innerHTML = '';
    const count = 6;
    const pool = TALK_SUGGESTIONS;
    const picks = [];
    for (let i = 0; i < count; i++) picks.push(pool[(talkPoolStart + i) % pool.length]);
    talkPoolStart = (talkPoolStart + count) % pool.length; // rotate for next open
    // Place around an ellipse; start at the top and go around clockwise. Radii
    // are a fraction of the stage so it scales and never overflows 390px wide.
    const rx = 38, ry = 41; // % offset from center along each axis
    picks.forEach((text, i) => {
      const ang = (-90 + (360 / count) * i) * Math.PI / 180;
      const x = 50 + rx * Math.cos(ang);
      const y = 50 + ry * Math.sin(ang);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'talk-bubble-chip';
      b.style.left = x + '%';
      b.style.top = y + '%';
      b.style.setProperty('--d', (i * 0.45).toFixed(2) + 's'); // stagger drift
      b.textContent = text;
      b.addEventListener('click', () => {
        haptic();
        const input = document.getElementById('talk-input');
        if (input) input.value = text;
        talkSubmit(text, false);
        if (input) input.value = '';
      });
      orbit.appendChild(b);
    });
  }

  // ----- Voice state machine for the talk orb -----
  // States: idle · listening · thinking · speaking. The orb tap is a smart
  // toggle: speaking→stop talking (barge-in), listening→stop listening,
  // idle→start listening. This is the heart of "smart stop".
  let talkState = 'idle';
  const TALK_HINTS = {
    idle: 'לחץ על המיקרופון ודבר — או הקש על הצעה',
    listening: 'מקשיב… דבר עכשיו · הקש שוב לעצירה',
    thinking: 'רגע, חושב…',
    speaking: 'עונה לך… · הקש להפסקה'
  };
  function setTalkState(state, detail) {
    talkState = state;
    const mic = document.getElementById('talk-mic');
    const hint = document.getElementById('talk-hint');
    if (mic) {
      mic.classList.toggle('listening', state === 'listening');
      mic.classList.toggle('thinking', state === 'thinking');
      mic.classList.toggle('speaking', state === 'speaking');
    }
    if (hint) hint.textContent = (state === 'interim' && detail) ? '“' + detail + '”' : (TALK_HINTS[state] || TALK_HINTS.idle);
  }

  function openTalk(autoListen) {
    const el = document.getElementById('talk');
    if (!el) return;
    const wasHidden = el.classList.contains('hidden');
    el.classList.remove('hidden');
    if (wasHidden) { renderTalkBubbles(); setTalkState('idle'); }
    clearTimeout(openTalk._t);
    if (autoListen) openTalk._t = setTimeout(startTalkListening, 300);
  }

  // The single smart entry point for tapping the orb.
  function talkMicTap() {
    if (talkState === 'speaking') { stopSpeaking(); return; }       // barge-in
    if (talkState === 'listening' || QuickAdd.isListening()) { QuickAdd.stopVoice(); setTalkState('idle'); return; }
    startTalkListening();
  }

  // Begin listening; show live interim text; on a final result run + speak.
  function startTalkListening() {
    const input = document.getElementById('talk-input');
    if (!QuickAdd.voiceSupported()) {
      if (input) input.focus();
      const hint = document.getElementById('talk-hint');
      if (hint) hint.textContent = 'הקש על אייקון המיקרופון 🎤 במקלדת ודבר';
      return;
    }
    stopSpeaking();          // don't listen over our own voice
    haptic();
    setTalkState('listening');
    const ok = QuickAdd.startVoice(
      (text) => { setTalkState('thinking'); talkSubmit(text, true); },
      (state, detail) => {
        if (state === 'listening') setTalkState('listening');
        else if (state === 'interim') setTalkState('interim', detail);
        else if (state === 'error') {
          const map = { 'not-allowed': 'אין הרשאת מיקרופון — אפשר להפעיל בהגדרות הדפדפן', 'no-speech': 'לא שמעתי — נסה שוב', 'audio-capture': 'לא נמצא מיקרופון' };
          toast(map[detail] || 'לא הצלחתי להקשיב — נסה שוב', '');
          setTalkState('idle');
        } else if (state === 'idle') {
          if (talkState === 'listening') setTalkState('idle'); // ended w/o result
        }
      }
    );
    if (!ok) setTalkState('idle');
  }

  function stopSpeaking() {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    if (talkState === 'speaking') setTalkState('idle');
  }

  function closeTalk() {
    const el = document.getElementById('talk');
    if (!el) return;
    el.classList.add('hidden');
    QuickAdd.stopVoice();
    stopSpeaking();
    setTalkState('idle');
  }

  // ----- Dashboard talk hero: rotating "what you can say" chips under the
  // greeting. Cycles through the full suggestion pool so the screen keeps
  // teaching new commands without taking up much space. -----
  let dashTalkPtr = 0;
  function renderDashTalkChips() {
    const wrap = document.getElementById('dash-talk-chips');
    if (!wrap) return;
    const pool = TALK_QUESTIONS;
    const count = 3;
    const picks = [];
    for (let i = 0; i < count; i++) picks.push(pool[(dashTalkPtr + i) % pool.length]);
    wrap.innerHTML = picks.map((t) =>
      `<button class="dash-talk-chip" data-talk-chip="${escapeAttr(t)}">${esc(t)}</button>`).join('');
    wrap.classList.remove('swap');
    void wrap.offsetWidth; // restart the fade animation
    wrap.classList.add('swap');
  }
  function startDashTalkRotation() {
    if (startDashTalkRotation._t) return;
    renderDashTalkChips();
    startDashTalkRotation._t = setInterval(() => {
      if (document.hidden || currentView !== 'dashboard') return;
      dashTalkPtr = (dashTalkPtr + 3) % TALK_QUESTIONS.length;
      renderDashTalkChips();
    }, 3500);
  }

  function talkAppend(role, text) {
    const box = document.getElementById('talk-transcript');
    if (!box) return;
    const row = document.createElement('div');
    row.className = 'talk-msg ' + (role === 'user' ? 'me' : 'bot');
    row.innerHTML = `<span class="talk-bubble">${talkEsc(text)}</span>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function talkSpeak(text) {
    try {
      if (!window.speechSynthesis || !text) return;
      speechSynthesis.cancel();
      const speakNow = () => {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'he-IL';
          u.rate = 1.02; u.pitch = 1.0;
          // Prefer a real Hebrew voice (cached; getVoices is empty on first call).
          if (!_voices.length) _voices = speechSynthesis.getVoices() || [];
          const he = _voices.find((v) => /he|iw/i.test(v.lang));
          if (he) { try { u.voice = he; } catch (e) {} }
          u.onstart = () => setTalkState('speaking');
          u.onend = () => { if (talkState === 'speaking') setTalkState('idle'); };
          u.onerror = () => { if (talkState === 'speaking') setTalkState('idle'); };
          speechSynthesis.speak(u);
        } catch (e) {}
      };
      // cancel() is async on Chrome/Safari; a tiny defer avoids a dropped reply.
      setTimeout(speakNow, 60);
    } catch (e) {}
  }

  // Understand one utterance and show + (optionally) speak the reply. Uses the
  // LLM brain (AI) when available for robust understanding of any phrasing, and
  // always falls back to the local rules engine (NLU) — offline / no key / error
  // / or for questions & meal-planning, which the local engine answers from live
  // device data.
  let talkSeq = 0;
  async function talkSubmit(text, fromVoice) {
    const t = (text || '').trim();
    if (!t) return;
    const myId = ++talkSeq; // ignore stale async replies if a newer request started
    talkAppend('user', t);
    let res = null;
    try {
      if (window.AI && AI.enabled()) {
        const action = await AI.understand(t);
        if (myId !== talkSeq) return; // superseded
        if (action) res = AI.execute(action);
      }
    } catch (e) { res = null; }
    if (myId !== talkSeq) return;
    if (!res) { try { res = window.NLU ? NLU.run(t) : null; } catch (e) { res = null; } }
    const reply = (res && res.reply) ? res.reply : 'לא הצלחתי להבין — אפשר לנסות אחרת?';
    talkAppend('bot', reply);
    if (fromVoice) talkSpeak(reply);
    haptic();
    renderAll();
  }

  function setupTalk() {
    const overlay = document.getElementById('talk');
    if (!overlay) return;

    // Open from the dashboard mic: the conversation overlay is richer than the
    // plain quick-add mic (it understands queries / complete / delete too).
    const smartMic = document.getElementById('smart-mic');
    if (smartMic) {
      smartMic.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        haptic();
        openTalk(true);
      }, true);
    }

    // Close: explicit button + tapping the backdrop.
    const closeBtn = document.getElementById('talk-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { haptic(); closeTalk(); });
    const backdrop = overlay.querySelector('.talk-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeTalk);

    // Text submit: Enter or the send button.
    const input = document.getElementById('talk-input');
    const go = document.getElementById('talk-go');
    const sendTyped = () => {
      if (!input) return;
      const v = input.value;
      input.value = '';
      talkSubmit(v, false);
    };
    if (go) go.addEventListener('click', sendTyped);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendTyped(); }
    });

    // The orb is a smart toggle: tap to talk, tap again to stop, tap to
    // interrupt a reply. Also prime iOS speech (needs a user gesture once).
    const mic = document.getElementById('talk-mic');
    if (mic) mic.addEventListener('click', () => { primeTTS(); talkMicTap(); });

    // Cache speech voices (load async) so a Hebrew voice is ready for replies.
    try {
      if (window.speechSynthesis) {
        _voices = speechSynthesis.getVoices() || [];
        speechSynthesis.onvoiceschanged = () => { _voices = speechSynthesis.getVoices() || []; };
      }
    } catch (e) {}
  }

  // iOS blocks speechSynthesis unless first triggered from a user gesture; fire
  // a near-silent utterance once inside a tap so later replies can speak.
  function primeTTS() {
    if (_ttsPrimed || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; speechSynthesis.speak(u);
      _ttsPrimed = true;
    } catch (e) {}
  }

  // ----- Family activity banner -----
  // Surface "what's new in the family" since this device last looked. Called on
  // app open and after a remote sync change. The banner itself is rendered by
  // Briefing.render (so it survives re-renders); here we just refresh + toast.
  function showActivityBanner() {
    if (typeof Activity === 'undefined') return;
    try {
      const unseen = Activity.unseen();
      renderDashboard();
      if (unseen && unseen.length) {
        const latest = unseen[0];
        toast(`🔔 ${latest.who}: ${latest.text}`, '');
      }
    } catch (e) {}
  }

  function showFocusForm() {
    openModal('טיימר פוקוס', Focus.chooseForm());
    const form = document.getElementById('focus-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.querySelectorAll('[data-focus-min]').forEach((b) => {
      b.addEventListener('click', () => {
        const lbl = (form.querySelector('[name="label"]').value || '').trim();
        Focus.begin(Number(b.dataset.focusMin), lbl);
        closeModal(); haptic(); toast('פוקוס התחיל ⏱️', 'success');
      });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const lbl = (form.querySelector('[name="label"]').value || '').trim();
      Focus.begin(25, lbl);
      closeModal(); haptic(); toast('פוקוס התחיל ⏱️', 'success');
    });
  }

  function setupVoiceTasks() {
    const btn = document.getElementById('voice-task-btn');
    const input = document.getElementById('voice-task-input');
    if (!btn || !input) return;

    // Submit handlers for the dictation/typing field.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const v = input.value; input.value = ''; input.classList.remove('show'); commitVoiceTasks(v); }
    });
    input.addEventListener('blur', () => {
      const v = input.value; input.value = '';
      input.classList.remove('show');
      if (v.trim()) commitVoiceTasks(v);
    });

    btn.addEventListener('click', () => {
      haptic();
      if (QuickAdd.voiceSupported()) {
        btn.classList.add('listening');
        btn.textContent = '🔴 מקשיב… דבר עכשיו';
        QuickAdd.startVoice(
          (text) => { commitVoiceTasks(text); },
          (state) => {
            if (state !== 'listening') {
              btn.classList.remove('listening');
              btn.textContent = '🎤 דבר — אני אסדר לבד';
            }
          }
        );
      } else {
        // iPhone / unsupported: reveal the field and focus it; the user taps
        // the microphone on their keyboard to dictate.
        input.classList.add('show');
        input.focus();
        toast('הקש על אייקון המיקרופון 🎤 במקלדת ודבר', '');
      }
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
      const data = Tasks.parseFormData(Object.fromEntries(new FormData(form)), existing);
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
    if (t.dataset.tagfilter !== undefined) {
      haptic(8); taskTag = t.dataset.tagfilter;
      Tasks.render(document.getElementById('task-list'), taskFilter, taskTag);
      return;
    } else if (t.dataset.subToggle) {
      haptic();
      const [tid, sid] = t.dataset.subToggle.split(':');
      Tasks.toggleSub(tid, sid);
      Tasks.render(document.getElementById('task-list'), taskFilter, taskTag);
      renderDashboard();
      return;
    } else if (t.dataset.taskToggle) {
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

  // Drag-to-reorder tasks in the default list (pointer-based, touch + mouse).
  function setupTaskDrag() {
    const wrap = document.querySelector('#task-list .task-sortable[data-sortable="1"]');
    if (!wrap || wrap._dragOn) return;
    wrap._dragOn = true;
    let drag = null, startY = 0, moved = false, pid = null;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const card = e.target.closest('.item-card');
      if (!card) return;
      drag = card; startY = e.clientY; moved = false; pid = e.pointerId;
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!moved && Math.abs(e.clientY - startY) < 8) return;
      if (!moved) { moved = true; drag.classList.add('dragging'); haptic(10); try { wrap.setPointerCapture(pid); } catch (x) {} }
      e.preventDefault();
      drag.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      drag.style.pointerEvents = '';
      const tgt = under && under.closest && under.closest('.item-card');
      if (tgt && tgt !== drag && tgt.parentNode === drag.parentNode) {
        const r = tgt.getBoundingClientRect();
        drag.parentNode.insertBefore(drag, (e.clientY < r.top + r.height / 2) ? tgt : tgt.nextSibling);
      }
    });
    function end() {
      if (!drag) return;
      const card = drag; drag = null;
      try { wrap.releasePointerCapture(pid); } catch (x) {}
      if (moved) {
        card.classList.remove('dragging');
        const ids = Array.from(wrap.querySelectorAll('.item-card')).map((c) => c.dataset.taskId);
        Tasks.reorder(ids);
        haptic(8);
      }
    }
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
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

  // ----- Meals handlers -----
  function showMealForm(dow) {
    openModal('ארוחת ערב', Meals.openForm(dow));
    const form = document.getElementById('meal-form');
    form.querySelector('[data-close]') && form.querySelector('[data-close]').addEventListener('click', closeModal);
    const clearBtn = form.querySelector('[data-meal-clear]');
    if (clearBtn) clearBtn.addEventListener('click', () => { Meals.clearDay(dow); closeModal(); renderAll(); toast('נוקה'); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      Meals.setMeal(dow, d.title, d.ingredients);
      closeModal(); renderAll(); toast('נשמר', 'success');
    });
  }
  function onMealsClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.mealEdit != null) showMealForm(Number(btn.dataset.mealEdit));
    else if (btn.dataset.mealShop != null) {
      haptic();
      const n = Meals.addIngredientsToShopping(Number(btn.dataset.mealShop));
      renderAll();
      toast(n ? `נוספו ${n} מצרכים לקניות` : 'אין מצרכים', n ? 'success' : 'error');
    }
  }

  // ----- Maintenance handlers -----
  function showMaintForm(existing) {
    openModal(existing ? 'ערוך תחזוקה' : 'פריט תחזוקה', Maintenance.openForm(existing));
    const form = document.getElementById('maint-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      d.intervalMonths = Number(d.intervalMonths);
      if (existing) Maintenance.update(existing.id, d); else Maintenance.add(d);
      closeModal(); renderAll(); toast(existing ? 'עודכן' : 'נוסף', 'success');
    });
  }
  async function onMaintClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.maintDone) { haptic(); Maintenance.markDone(btn.dataset.maintDone); renderAll(); toast('עודכן — נקבע מועד הבא', 'success'); }
    else if (btn.dataset.maintEdit) { const it = DB.findById(DB.KEYS.maintenance, btn.dataset.maintEdit); if (it) showMaintForm(it); }
    else if (btn.dataset.maintDel) {
      const ok = await confirmDialog({ title: 'מחיקת פריט', message: 'למחוק מהתחזוקה?', okText: 'מחק', icon: '🔧' });
      if (!ok) return;
      Maintenance.remove(btn.dataset.maintDel); renderAll(); toast('נמחק', 'success');
    }
  }

  // ----- Growth handlers -----
  function showGrowthForm(child) {
    openModal('מדידה — ' + child, Growth.openForm(child));
    const form = document.getElementById('growth-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (!d.height && !d.weight) { toast('הזן גובה או משקל', 'error'); return; }
      Growth.add(d);
      closeModal(); renderAll(); toast('נשמר', 'success');
    });
  }
  async function onGrowthClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.growthAdd) showGrowthForm(btn.dataset.growthAdd);
    else if (btn.dataset.growthDel) {
      const ok = await confirmDialog({ title: 'מחיקת מדידה', message: 'למחוק?', okText: 'מחק', icon: '📏' });
      if (!ok) return;
      Growth.remove(btn.dataset.growthDel); renderAll(); toast('נמחק', 'success');
    }
  }

  // ----- Stars handlers -----
  function showStarConfig(child) {
    openModal('יעד ופרס — ' + child, Stars.configForm(child));
    const form = document.getElementById('star-config-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      Stars.setGoal(d.child, d.goal);
      Stars.setReward(d.child, d.reward);
      closeModal(); renderAll(); toast('נשמר', 'success');
    });
  }
  function onStarsClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.starGive) {
      haptic(); Stars.award(btn.dataset.starGive, btn.dataset.reason, 1);
      if (window.UX) UX.confetti();
      renderAll(); toast('⭐ כוכב נוסף!', 'success');
    } else if (btn.dataset.starRedeem) {
      Stars.redeem(btn.dataset.starRedeem); if (window.UX) UX.confetti(); renderAll(); toast('🎉 פרס מומש!', 'success');
    } else if (btn.dataset.starConfig) {
      showStarConfig(btn.dataset.starConfig);
    }
  }

  // ----- Savings handlers -----
  function showSavingsForm() {
    openModal('יעד חיסכון חדש', Savings.openForm());
    const form = document.getElementById('savings-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      d.target = Number(d.target);
      Savings.add(d);
      closeModal(); renderAll(); toast('נוצר יעד', 'success');
    });
  }
  async function onSavingsClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.savingsAdd) {
      haptic(); Savings.deposit(btn.dataset.savingsAdd, btn.dataset.amt); renderAll(); toast('הופקד ✓', 'success');
    } else if (btn.dataset.savingsCustom) {
      const id = btn.dataset.savingsCustom;
      const v = await promptDialog({ title: 'הפקדה לחיסכון', label: 'כמה להפקיד? (₪)', type: 'number', placeholder: '100', okText: 'הפקד' });
      if (v && !isNaN(Number(v))) { Savings.deposit(id, Number(v)); renderAll(); toast('הופקד ✓', 'success'); }
    } else if (btn.dataset.savingsDel) {
      const ok = await confirmDialog({ title: 'מחיקת יעד', message: 'למחוק את יעד החיסכון?', okText: 'מחק', icon: '🐷' });
      if (!ok) return;
      Savings.remove(btn.dataset.savingsDel); renderAll(); toast('נמחק', 'success');
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
    renderDashCustomize();
  }

  function renderDashCustomize() {
    const el = document.getElementById('dash-customize');
    if (!el || !window.DashLayout) return;
    const order = DashLayout.orderedIds();
    const meta = {};
    DashLayout.meta().forEach((w) => { meta[w.id] = w; });
    el.innerHTML = order.map((id, idx) => {
      const w = meta[id];
      if (!w) return '';
      const hidden = DashLayout.isHidden(id);
      return `<div class="cust-row ${hidden ? 'off' : ''}">
        <span class="cust-emoji">${w.emoji}</span>
        <span class="cust-label">${w.label}</span>
        <div class="cust-actions">
          <button class="cust-btn" data-cust-up="${id}" ${idx === 0 ? 'disabled' : ''} aria-label="למעלה">▲</button>
          <button class="cust-btn" data-cust-down="${id}" ${idx === order.length - 1 ? 'disabled' : ''} aria-label="למטה">▼</button>
          <button class="cust-toggle ${hidden ? '' : 'on'}" data-cust-toggle="${id}" aria-label="הצג/הסתר"><span></span></button>
        </div>
      </div>`;
    }).join('');
  }

  function renderDashboard() {
    if (window.DashLayout) DashLayout.apply();
    if (window.Briefing) Briefing.render(document.getElementById('briefing'), ownerName());

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
    renderSetupCard();
    renderAssistant();
    renderMonthlyGoal();
    if (window.Schedule) Schedule.renderToday(document.getElementById('dash-schedule'));
    renderDashMeal();
    renderDashMaint();
    renderDashTasks();
    renderDashShopping();
    renderDashHabits();
    renderDashGoals();
    renderDashMeds();
    renderDashEvents();
    renderDashBudget();
    renderDashActivities();
    renderDashTalkChips();
  }

  // ----- Kids' activities (חוגים) -----
  function renderDashActivities() {
    const el = document.getElementById('dash-activities');
    if (!el || !window.Activities) return;
    const today = Activities.today();
    let items = today, head = 'היום';
    if (!items.length) {
      const nx = Activities.next();
      if (!nx) { el.innerHTML = '<div class="dash-empty">אין עדיין חוגים — הוסיפו את הראשון 🎽</div>'; return; }
      items = nx.items;
      head = nx.inDays === 1 ? 'מחר' : (Activities.DAYS[nx.dow] ? 'יום ' + Activities.DAYS[nx.dow] : '');
    }
    el.innerHTML = `<div class="act-head">${esc(head)}</div>` + items.map((a) => `
      <button class="act-row" data-act-del="${escapeAttr(a.id)}">
        <span class="act-ico">${Activities.iconFor(a.name)}</span>
        <span class="act-body">
          <span class="act-name">${esc(a.name)}${a.child ? ` · ${esc(a.child)}` : ''}</span>
          <span class="act-meta">${a.time ? esc(a.time) + ' · ' : ''}${a.place ? esc(a.place) : ''}</span>
        </span>
        <span class="act-x" aria-hidden="true">×</span>
      </button>`).join('');
  }

  function showActivityForm() {
    const days = Activities.DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('');
    openModal('הוספת חוג', `
      <form id="activity-form">
        <div class="form-group"><label>שם החוג</label><input name="name" placeholder="לדוגמה: שחייה" required></div>
        <div class="form-group"><label>שם הילד/ה</label><input name="child" placeholder="לדוגמה: דני"></div>
        <div class="form-row">
          <div class="form-group"><label>יום</label><select name="day">${days}</select></div>
          <div class="form-group"><label>שעה</label><input name="time" type="time"></div>
        </div>
        <div class="form-group"><label>מיקום</label><input name="place" placeholder="לדוגמה: בריכה עירונית"></div>
        <div class="form-actions">
          <button type="button" class="ghost-btn" data-close>ביטול</button>
          <button type="submit" class="primary-btn">הוסף</button>
        </div>
      </form>`);
    const form = document.getElementById('activity-form');
    form.querySelector('[data-close]').addEventListener('click', closeModal);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      if (!name) { form.reportValidity(); return; }
      Activities.add({ name, child: fd.get('child'), day: fd.get('day'), time: fd.get('time'), place: fd.get('place') });
      closeModal();
      renderDashActivities();
      toast('החוג נוסף 🎽', 'success');
    });
  }

  function renderSetupCard() {
    const el = document.getElementById('setup-card');
    if (!el) return;
    if (DB.getSettings().setupDismissed) { el.hidden = true; return; }
    const s = DB.getSettings();
    const steps = [];
    if (!s.familyPhoto) steps.push({ icon: '🖼️', label: 'הוסף תמונה משפחתית', action: 'setup-photo' });
    if (!s.playlistUrl) steps.push({ icon: '🎵', label: 'חבר פלייליסט', action: 'setup-music' });
    if (window.Maintenance && Maintenance.list().some((it) => !it.lastDone)) steps.push({ icon: '🔧', label: 'עדכן תאריך טיפול רכב', action: 'setup-maint' });
    if (window.Events && !Events.list().some((e) => e.type === 'birthday')) steps.push({ icon: '🎂', label: 'הוסף ימי הולדת', action: 'setup-events' });
    if (!steps.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      `<div class="setup-head"><span>✨ בוא נסיים להקים — ${steps.length} צעדים</span><button class="setup-dismiss" id="setup-dismiss">דלג</button></div>` +
      `<div class="setup-steps">${steps.map((st) => `<button class="setup-step" data-setup="${st.action}"><span class="setup-ico">${st.icon}</span>${st.label}</button>`).join('')}</div>`;
  }

  function renderAssistant() {
    const el = document.getElementById('assistant-card');
    if (!el || !window.Assistant) return;
    const sugs = Assistant.suggestions().slice(0, 5);
    if (!sugs.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML =
      `<div class="assistant-head"><span class="assistant-title">✨ בשבילך עכשיו</span></div>` +
      sugs.map((s) => `
        <div class="assistant-row" data-asig="${escapeAttr(s.sig)}">
          <span class="assistant-ico">${s.icon}</span>
          <span class="assistant-text">${esc(s.text)}</span>
          <span class="assistant-actions">
            <button class="assistant-yes" data-ayes='${escapeAttr(JSON.stringify(s))}' aria-label="כן">✓</button>
            <button class="assistant-no" data-ano="${escapeAttr(s.sig)}" aria-label="לא">✕</button>
          </span>
        </div>`).join('');
  }

  function onAssistantAccept(s) {
    haptic();
    if (s.kind === 'shopAdd') { Shopping.add(s.name, s.cat || 'אחר'); toast('נוסף לקניות ✓', 'success'); }
    else if (s.kind === 'view') { setView(s.view); return; }
    else if (s.kind === 'maintDone') { Maintenance.markDone(s.id); toast('עודכן — מועד הבא נקבע ✓', 'success'); }
    else if (s.kind === 'habit') { Habits.bump(s.id, 1); toast('סומן ✓', 'success'); }
    else if (s.kind === 'eventGift') { Shopping.add('מתנה ל' + s.title, 'אחר'); toast('נוסף תזכורת מתנה ✓', 'success'); }
    if (window.Assistant) Assistant.dismiss(s.sig);
    renderAll();
  }

  // Handle a one-tap action emitted by an AI agent insight.
  function onAgentAction(a) {
    haptic();
    if (a.kind === 'view') { setView(a.view); return; }
    if (a.kind === 'maintDone') { Maintenance.markDone(a.id); toast('עודכן — מועד הבא נקבע ✓', 'success'); }
    else if (a.kind === 'addShopping') {
      (a.items || []).forEach((it) => Shopping.add(it.name, it.cat || 'אחר'));
      toast('נוסף לקניות ✓', 'success');
    }
    renderAll();
  }

  function showHabitsManager() {
    const render = () => {
      const list = Habits.all();
      openModal('ניהול הרגלים', `
        <div id="habits-manager">
          ${list.length ? list.map((h) => `
            <div class="dash-item">
              <span class="dash-item-title">${h.emoji} ${esc(h.name)}${h.type === 'count' ? ` <span class="muted">· יעד ${h.goal}</span>` : ''}</span>
              <button class="icon-btn" data-habit-del="${h.id}" title="מחק">🗑</button>
            </div>`).join('') : '<div class="dash-empty">אין הרגלים</div>'}
          <form id="habit-add-form" style="margin-top:16px;">
            <div class="form-row">
              <div class="form-group"><label>הרגל חדש</label><input name="name" placeholder="לדוגמה: מדיטציה" required></div>
              <div class="form-group"><label>אימוג׳י</label><input name="emoji" value="⭐" maxlength="2"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>סוג</label><select name="type"><option value="check">סימון יומי</option><option value="count">ספירה (יעד)</option></select></div>
              <div class="form-group"><label>יעד (לספירה)</label><input name="goal" type="number" min="1" value="1"></div>
            </div>
            <div class="form-actions"><button type="submit" class="primary-btn">+ הוסף הרגל</button></div>
          </form>
        </div>`);
      const mgr = document.getElementById('habits-manager');
      mgr.addEventListener('click', (e) => {
        const b = e.target.closest('[data-habit-del]');
        if (!b) return;
        Habits.remove(b.dataset.habitDel);
        render(); renderDashHabits();
      });
      document.getElementById('habit-add-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        if (!d.name.trim()) return;
        Habits.add(d.name.trim(), d.emoji || '⭐', d.type, Number(d.goal) || 1);
        render(); renderDashHabits(); toast('הרגל נוסף', 'success');
      });
    };
    render();
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

  function renderDashMeal() {
    const widget = document.getElementById('dash-meal-widget');
    const el = document.getElementById('dash-meal');
    if (!widget || !window.Meals) return;
    const m = Meals.todayMeal();
    if (!m || !m.title) { widget.hidden = true; return; }
    widget.hidden = false;
    el.innerHTML = `<div class="dash-item"><span class="dash-item-title">🍽️ ${esc(m.title)}</span>
      ${m.ingredients ? `<button class="link-btn" data-meal-shop="${new Date().getDay()}">+ לקניות</button>` : ''}</div>`;
  }

  function renderDashMaint() {
    const widget = document.getElementById('dash-maint-widget');
    const el = document.getElementById('dash-maint');
    if (!widget || !window.Maintenance) return;
    const due = Maintenance.dueSoon(21);
    if (!due.length) { widget.hidden = true; return; }
    widget.hidden = false;
    el.innerHTML = due.slice(0, 4).map(({ it }) => {
      const s = Maintenance.statusOf(it);
      return `<div class="dash-item ${s.level === 'danger' ? 'danger' : ''}">
        <div class="event-emoji sm">${it.emoji || '🔧'}</div>
        <span class="dash-item-title">${esc(it.title)}</span>
        <span class="tag ${s.level}">${s.text}</span>
        <button class="icon-btn" data-maint-done="${it.id}" title="בוצע">✓</button>
      </div>`;
    }).join('');
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
    else if (currentView === 'tasks') { Tasks.render(document.getElementById('task-list'), taskFilter, taskTag); setupTaskDrag(); }
    else if (currentView === 'calendar') Calendar.render();
    else if (currentView === 'events') Events.render(document.getElementById('event-list'));
    else if (currentView === 'goals') Goals.render(document.getElementById('goals-list'));
    else if (currentView === 'weekly') Weekly.render(document.getElementById('weekly-content'));
    else if (currentView === 'schedule') Schedule.render(document.getElementById('sched-board'));
    else if (currentView === 'meals') Meals.render(document.getElementById('meals-board'));
    else if (currentView === 'maintenance') Maintenance.render(document.getElementById('maint-list'));
    else if (currentView === 'growth') Growth.render(document.getElementById('growth-list'));
    else if (currentView === 'stars') Stars.render(document.getElementById('stars-list'));
    else if (currentView === 'savings') Savings.render(document.getElementById('savings-list'));
    else if (currentView === 'budget') renderBudget();
    else if (currentView === 'settings') {
      Settings.renderFamily();
      Settings.renderNotifStatus();
      renderPersonalization();
      showVersion();
      renderAiKeyStatus();
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
    if (!('serviceWorker' in navigator)) return;
    let reloaded = false;
    // When the new SW takes control, reload once so the fresh assets show.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then((reg) => {
        // Check for updates immediately and whenever the app regains focus.
        reg.update();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            // A new version finished installing while an old one controls the
            // page → tell it to activate now; controllerchange will reload.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              try { sw.postMessage('skipWaiting'); } catch (e) {}
            }
          });
        });
      }).catch((err) => console.warn('SW register failed', err));
    });
  }

  return { init, setView, toast, refresh: renderAll, showActivityBanner, openTalk, closeTalk };
})();

document.addEventListener('DOMContentLoaded', App.init);
if (typeof window !== "undefined") window.App = App;
