// Vet Clinic Admin — Vanilla JS SPA
(() => {
  const API = '/api/v1';
  const STORE = {
    get access()  { return sessionStorage.getItem('vc_access'); },
    set access(v) { v ? sessionStorage.setItem('vc_access', v) : sessionStorage.removeItem('vc_access'); },
    get refresh() { return localStorage.getItem('vc_refresh'); },
    set refresh(v){ v ? localStorage.setItem('vc_refresh', v) : localStorage.removeItem('vc_refresh'); },
    get me()      { try { return JSON.parse(localStorage.getItem('vc_me') || 'null'); } catch { return null; } },
    set me(v)     { v ? localStorage.setItem('vc_me', JSON.stringify(v)) : localStorage.removeItem('vc_me'); },
  };

  // ───────── helpers ─────────
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('uz-UZ');
  };
  const toast = (msg, type = 'ok', ms = 2500) => {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast toast--${type}`;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, ms);
  };
  const openModal = (title, html) => {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
  };
  const closeModal = () => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; };
  $('#modal').addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) closeModal(); });

  // ───────── api ─────────
  async function api(path, { method = 'GET', body, query, retry = true } = {}) {
    const url = new URL(API + path, location.origin);
    if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, v));
    const headers = { 'Content-Type': 'application/json' };
    if (STORE.access) headers.Authorization = `Bearer ${STORE.access}`;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch {}
    if (res.ok && data?.success) return data.data;

    const code = data?.error?.code;
    if (res.status === 401 && retry && code === 'TOKEN_EXPIRED' && STORE.refresh) {
      const ok = await tryRefresh();
      if (ok) return api(path, { method, body, query, retry: false });
    }
    const err = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.code = code;
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }
  async function tryRefresh() {
    try {
      const data = await api('/auth/refresh', { method: 'POST', body: { refreshToken: STORE.refresh }, retry: false });
      STORE.access = data.accessToken;
      STORE.refresh = data.refreshToken;
      STORE.me = data.user;
      return true;
    } catch {
      logout(false);
      return false;
    }
  }

  // ───────── auth flow ─────────
  function showLogin() {
    $('#login').hidden = false;
    $('#shell').hidden = true;
    $('#app').dataset.state = 'login';
  }
  function showShell() {
    $('#login').hidden = true;
    $('#shell').hidden = false;
    $('#app').dataset.state = 'app';
    renderMe();
    if (!location.hash) location.hash = '#dashboard';
    else route();
  }
  function logout(serverCall = true) {
    if (serverCall && STORE.refresh) {
      api('/auth/logout', { method: 'POST', body: { refreshToken: STORE.refresh }, retry: false }).catch(() => {});
    }
    STORE.access = null; STORE.refresh = null; STORE.me = null;
    location.hash = '';
    showLogin();
  }
  $('#logoutBtn').addEventListener('click', () => logout(true));

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    const password = f.password.value;
    const errEl = $('#loginError');
    errEl.hidden = true;
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password }, retry: false });
      if (data.user.role !== 'ADMIN') {
        throw new Error('Faqat ADMIN roli bilan kirish mumkin');
      }
      STORE.access = data.accessToken;
      STORE.refresh = data.refreshToken;
      STORE.me = data.user;
      showShell();
      toast('Kirish muvaffaqiyatli');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });

  function renderMe() {
    const me = STORE.me || {};
    $('#meBox').innerHTML = `
      <strong>${esc(me.name || me.email || 'Admin')}</strong>
      <span>${esc(me.email || '')}</span>
      <span class="badge badge--admin" style="margin-top:6px;align-self:flex-start">${esc(me.role || 'ADMIN')}</span>
    `;
  }

  // ───────── router ─────────
  const ROUTES = ['dashboard', 'clinics', 'reviews', 'users'];
  async function route() {
    const name = (location.hash || '#dashboard').slice(1);
    if (!ROUTES.includes(name)) { location.hash = '#dashboard'; return; }
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
    $('#searchInput').hidden = name === 'dashboard';
    $('#searchInput').value = '';
    $('#primaryAction').hidden = true;
    try {
      if (name === 'dashboard') await viewDashboard();
      if (name === 'clinics')   await viewClinics();
      if (name === 'reviews')   await viewReviews();
      if (name === 'users')     await viewUsers();
    } catch (err) {
      handleError(err);
    }
  }
  window.addEventListener('hashchange', route);

  function handleError(err) {
    if (err.status === 401 || err.status === 403) {
      toast(err.message, 'err');
      if (err.status === 401) logout(false);
      return;
    }
    toast(err.message, 'err');
    $('#view').innerHTML = `<div class="card empty">Xato: ${esc(err.message)}</div>`;
  }

  // search debounce per route
  let searchTimer;
  $('#searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(route, 300);
  });

  function getQ() { return $('#searchInput').value.trim() || undefined; }

  // ───────── DASHBOARD ─────────
  async function viewDashboard() {
    $('#pageTitle').textContent = 'Boshqaruv';
    const view = $('#view');
    view.innerHTML = '<div class="empty">Yuklanmoqda...</div>';
    const data = await api('/admin/dashboard');
    view.innerHTML = `
      <section class="stats">
        <div class="card stat">
          <span class="stat__label">Foydalanuvchilar</span>
          <span class="stat__value">${data.counts.users}</span>
          <span class="stat__hint">Jami ro‘yxatdan o‘tganlar</span>
        </div>
        <div class="card stat">
          <span class="stat__label">Klinikalar</span>
          <span class="stat__value">${data.counts.clinics}</span>
          <span class="stat__hint">Katalogdagi klinikalar</span>
        </div>
        <div class="card stat">
          <span class="stat__label">Sharhlar</span>
          <span class="stat__value">${data.counts.reviews}</span>
          <span class="stat__hint">Foydalanuvchi sharhlari</span>
        </div>
      </section>

      <section class="card">
        <header style="padding:16px 20px;border-bottom:1px solid var(--border)">
          <h3 style="margin:0">So‘nggi sharhlar</h3>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Sana</th><th>Klinika</th><th>Foydalanuvchi</th><th>Reyting</th><th>Izoh</th></tr>
            </thead>
            <tbody>
              ${data.latestReviews.length ? data.latestReviews.map((r) => `
                <tr>
                  <td>${fmtDate(r.createdAt)}</td>
                  <td>${esc(r.clinic?.name || '—')}</td>
                  <td>${esc(r.user?.email || '—')}</td>
                  <td><span class="badge badge--rating">★ ${r.rating}</span></td>
                  <td>${esc(r.comment || '—')}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" class="empty">Hozircha sharh yo‘q</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // ───────── CLINICS ─────────
  async function viewClinics(page = 1) {
    $('#pageTitle').textContent = 'Klinikalar';
    const btn = $('#primaryAction');
    btn.hidden = false;
    btn.textContent = '+ Yangi klinika';
    btn.onclick = () => clinicForm();

    const data = await api('/admin/clinics', { query: { page, pageSize: 20, q: getQ() } });
    renderTable({
      cols: ['Nomi', 'Shahar', 'Telefon', 'Manzil', 'Sharhlar', 'Yaratildi', ''],
      rows: data.items.map((c) => `
        <tr>
          <td><strong>${esc(c.name)}</strong></td>
          <td>${esc(c.city)}</td>
          <td>${esc(c.phone)}</td>
          <td class="muted">${esc(c.address)}</td>
          <td>${c.reviewCount ?? 0}</td>
          <td>${fmtDate(c.createdAt)}</td>
          <td class="row-actions">
            <button class="btn btn--sm" data-edit="${c.id}">Tahrirlash</button>
            <button class="btn btn--sm btn--danger" data-del="${c.id}">O‘chirish</button>
          </td>
        </tr>
      `).join(''),
      empty: 'Klinikalar topilmadi',
      pager: { total: data.total, page: data.page, pageSize: data.pageSize, onPage: (p) => viewClinics(p) },
    });

    $$('[data-edit]').forEach((b) => b.onclick = async () => {
      const c = await api(`/admin/clinics/${b.dataset.edit}`);
      clinicForm(c);
    });
    $$('[data-del]').forEach((b) => b.onclick = () => confirmDialog(
      'Klinikani o‘chirish',
      'Bu amalni qaytarib bo‘lmaydi. Klinika va uning sharhlari o‘chiriladi.',
      async () => {
        await api(`/admin/clinics/${b.dataset.del}`, { method: 'DELETE' });
        toast('O‘chirildi');
        closeModal();
        viewClinics(page);
      },
    ));
  }

  function clinicForm(existing) {
    const isEdit = !!existing;
    const def = existing?.openingHours || {
      mon: { open: '09:00', close: '19:00' }, tue: { open: '09:00', close: '19:00' },
      wed: { open: '09:00', close: '19:00' }, thu: { open: '09:00', close: '19:00' },
      fri: { open: '09:00', close: '19:00' }, sat: { open: '10:00', close: '16:00' },
      sun: null,
    };
    const days = [['mon','Du'],['tue','Se'],['wed','Cho'],['thu','Pa'],['fri','Ju'],['sat','Sha'],['sun','Yak']];

    const html = `
      <form id="clinicForm" class="form">
        <label>Nomi <input name="name" required value="${esc(existing?.name || '')}" /></label>
        <label>Shahar <input name="city" required value="${esc(existing?.city || '')}" /></label>
        <label>Telefon <input name="phone" required value="${esc(existing?.phone || '')}" /></label>
        <label>Manzil <input name="address" required value="${esc(existing?.address || '')}" /></label>
        <label>Latitude <input name="latitude" type="number" step="any" required value="${existing?.latitude ?? ''}" /></label>
        <label>Longitude <input name="longitude" type="number" step="any" required value="${existing?.longitude ?? ''}" /></label>
        <div class="full">
          <label style="margin-bottom:8px">Ish vaqti</label>
          <div class="hours-grid">
            <div class="muted">Kun</div><div class="muted">Ochilish</div><div class="muted">Yopilish</div><div class="muted">Yopiq</div>
            ${days.map(([k, label]) => {
              const slot = def[k] || null;
              const closed = slot === null;
              return `
                <div class="day">${label}</div>
                <div><input data-h="open"  data-d="${k}" type="time" value="${slot?.open || '09:00'}" ${closed ? 'disabled' : ''} /></div>
                <div><input data-h="close" data-d="${k}" type="time" value="${slot?.close || '18:00'}" ${closed ? 'disabled' : ''} /></div>
                <div><input data-h="closed" data-d="${k}" type="checkbox" ${closed ? 'checked' : ''} title="Yopiq" /></div>
              `;
            }).join('')}
          </div>
        </div>
        <p class="error full" id="clinicErr" hidden></p>
        <div class="form__actions full">
          <button type="button" class="btn" data-close>Bekor qilish</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Saqlash' : 'Yaratish'}</button>
        </div>
      </form>
    `;
    openModal(isEdit ? 'Klinikani tahrirlash' : 'Yangi klinika', html);

    // closed checkbox toggles inputs
    $$('#clinicForm input[data-h="closed"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const day = cb.dataset.d;
        $$(`#clinicForm input[data-d="${day}"][data-h="open"], #clinicForm input[data-d="${day}"][data-h="close"]`)
          .forEach((i) => { i.disabled = cb.checked; });
      });
    });

    $('#clinicForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const openingHours = {};
      for (const [k] of days) {
        const closed = $(`#clinicForm input[data-d="${k}"][data-h="closed"]`).checked;
        if (closed) { openingHours[k] = null; continue; }
        openingHours[k] = {
          open:  $(`#clinicForm input[data-d="${k}"][data-h="open"]`).value,
          close: $(`#clinicForm input[data-d="${k}"][data-h="close"]`).value,
        };
      }
      const payload = {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        address: f.address.value.trim(),
        city: f.city.value.trim(),
        latitude: Number(f.latitude.value),
        longitude: Number(f.longitude.value),
        openingHours,
      };
      try {
        if (isEdit) await api(`/admin/clinics/${existing.id}`, { method: 'PATCH', body: payload });
        else        await api('/admin/clinics', { method: 'POST', body: payload });
        closeModal();
        toast(isEdit ? 'Saqlandi' : 'Yaratildi');
        viewClinics();
      } catch (err) {
        const el = $('#clinicErr');
        el.textContent = err.message + (err.details ? ` (${JSON.stringify(err.details)})` : '');
        el.hidden = false;
      }
    });
  }

  // ───────── REVIEWS ─────────
  async function viewReviews(page = 1) {
    $('#pageTitle').textContent = 'Sharhlar';
    const data = await api('/admin/reviews', { query: { page, pageSize: 20, q: getQ() } });
    renderTable({
      cols: ['Sana', 'Klinika', 'Foydalanuvchi', 'Reyting', 'Izoh', ''],
      rows: data.items.map((r) => `
        <tr>
          <td>${fmtDate(r.createdAt)}</td>
          <td>${esc(r.clinic?.name || '—')}</td>
          <td>${esc(r.user?.email || '—')}</td>
          <td><span class="badge badge--rating">★ ${r.rating}</span></td>
          <td>${esc(r.comment || '—')}</td>
          <td class="row-actions">
            <button class="btn btn--sm btn--danger" data-del="${r.id}">O‘chirish</button>
          </td>
        </tr>
      `).join(''),
      empty: 'Sharhlar topilmadi',
      pager: { total: data.total, page: data.page, pageSize: data.pageSize, onPage: (p) => viewReviews(p) },
    });
    $$('[data-del]').forEach((b) => b.onclick = () => confirmDialog(
      'Sharhni o‘chirish', 'Sharh butunlay o‘chiriladi.',
      async () => {
        await api(`/admin/reviews/${b.dataset.del}`, { method: 'DELETE' });
        toast('O‘chirildi'); closeModal(); viewReviews(page);
      },
    ));
  }

  // ───────── USERS ─────────
  async function viewUsers(page = 1) {
    $('#pageTitle').textContent = 'Foydalanuvchilar';
    const data = await api('/admin/users', { query: { page, pageSize: 20, q: getQ() } });
    renderTable({
      cols: ['Email', 'Ism', 'Rol', 'Sharhlar', 'Yaratildi', ''],
      rows: data.items.map((u) => `
        <tr>
          <td><strong>${esc(u.email)}</strong></td>
          <td>${esc(u.name || '—')}</td>
          <td><span class="badge ${u.role === 'ADMIN' ? 'badge--admin' : 'badge--user'}">${esc(u.role)}</span></td>
          <td>${u.reviewCount ?? 0}</td>
          <td>${fmtDate(u.createdAt)}</td>
          <td class="row-actions">
            <button class="btn btn--sm" data-role="${u.id}" data-current="${u.role}">Rolni o‘zgartirish</button>
            <button class="btn btn--sm btn--danger" data-del="${u.id}">O‘chirish</button>
          </td>
        </tr>
      `).join(''),
      empty: 'Foydalanuvchilar topilmadi',
      pager: { total: data.total, page: data.page, pageSize: data.pageSize, onPage: (p) => viewUsers(p) },
    });
    $$('[data-role]').forEach((b) => b.onclick = () => userRoleDialog(b.dataset.role, b.dataset.current, page));
    $$('[data-del]').forEach((b) => b.onclick = () => confirmDialog(
      'Foydalanuvchini o‘chirish', 'Foydalanuvchi va uning barcha sharhlari o‘chiriladi.',
      async () => {
        await api(`/admin/users/${b.dataset.del}`, { method: 'DELETE' });
        toast('O‘chirildi'); closeModal(); viewUsers(page);
      },
    ));
  }

  function userRoleDialog(id, current, page) {
    openModal('Rolni o‘zgartirish', `
      <form id="roleForm" class="form" style="grid-template-columns:1fr">
        <label>Rol
          <select name="role">
            <option value="USER"  ${current === 'USER'  ? 'selected' : ''}>USER</option>
            <option value="ADMIN" ${current === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
          </select>
        </label>
        <p class="error full" id="roleErr" hidden></p>
        <div class="form__actions full">
          <button type="button" class="btn" data-close>Bekor</button>
          <button type="submit" class="btn btn--primary">Saqlash</button>
        </div>
      </form>
    `);
    $('#roleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role: e.target.role.value } });
        closeModal(); toast('Saqlandi'); viewUsers(page);
      } catch (err) {
        const el = $('#roleErr'); el.textContent = err.message; el.hidden = false;
      }
    });
  }

  function confirmDialog(title, msg, onYes) {
    openModal(title, `
      <p>${esc(msg)}</p>
      <div class="form__actions">
        <button class="btn" data-close>Bekor</button>
        <button class="btn btn--danger" id="yes">Ha, o‘chir</button>
      </div>
    `);
    $('#yes').addEventListener('click', async () => {
      try { await onYes(); } catch (err) { toast(err.message, 'err'); }
    });
  }

  // table renderer with pagination
  function renderTable({ cols, rows, empty, pager }) {
    const view = $('#view');
    view.innerHTML = `
      <section class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>${rows || `<tr><td colspan="${cols.length}" class="empty">${esc(empty || 'Bo‘sh')}</td></tr>`}</tbody>
          </table>
        </div>
        ${pagerHtml(pager)}
      </section>
    `;
    if (pager) wirePager(pager);
  }
  function pagerHtml({ total, page, pageSize }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return `
      <div class="pager">
        <span class="pager__info">Jami: ${total}, sahifa ${page} / ${pages}</span>
        <button class="btn btn--sm" data-pg="prev" ${page <= 1 ? 'disabled' : ''}>← Oldingi</button>
        <button class="btn btn--sm" data-pg="next" ${page >= pages ? 'disabled' : ''}>Keyingi →</button>
      </div>
    `;
  }
  function wirePager({ page, total, pageSize, onPage }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    $$('[data-pg]').forEach((b) => b.onclick = () => {
      const p = b.dataset.pg === 'prev' ? Math.max(1, page - 1) : Math.min(pages, page + 1);
      onPage(p);
    });
  }

  // ───────── boot ─────────
  async function boot() {
    if (!STORE.access || !STORE.me) { showLogin(); return; }
    if (STORE.me.role !== 'ADMIN') { logout(false); return; }
    showShell();
  }
  boot();
})();
