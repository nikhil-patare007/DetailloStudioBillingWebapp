(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = U.esc, inr = U.inr, num = U.num;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ------------------------------------------------------------ icons
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bills: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8zM7.5 8.5h.01"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z"/>',
    send: '<path d="M21 3L3 10l7 3 3 7zM10 13l11-10"/>',
    out: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    check: '<path d="M5 12l5 5 9-9"/>'
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

  // ------------------------------------------------------------ state
  const presets = () => U.presets();
  const pick = (k) => presets().find((p) => p.key === k);
  const state = {
    user: null, settings: null, services: [], nextNo: 0, view: 'home',
    draft: null, ui: { grp: 'all', search: '' },
    byId: {},
    home: { bills: [] },
    list: { preset: 'month', from: pick('month').from, to: pick('month').to, q: '', status: 'all', bills: [] },
    rep: { preset: 'month', from: pick('month').from, to: pick('month').to, bills: [] },
    confirmFn: null, modalBill: null
  };
  const remember = (list) => list.forEach((b) => (state.byId[b.id] = b));
  const invoices = (list) => list.filter((b) => b.docType !== 'Quotation');

  // ------------------------------------------------------------ helpers
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const tierList = (kind) => SEED.TIERS[kind] || [];
  const tierLabel = (kind, key) => (tierList(kind).find((t) => t.key === key) || {}).label || '';
  const groupOf = (key) => SEED.GROUPS.find((g) => g.key === key);
  const svcPrice = (s, kind, tier) => {
    if (!s) return 0;
    const p = s.prices || {};
    return p.flat !== undefined ? num(p.flat) : num(p[tier]);
  };
  const svcById = (id) => state.services.find((s) => s.id === id);
  const docTitle = (b) => (b.docType === 'Quotation' ? 'Quotation' : b.gst && b.gst.enabled ? 'Tax Invoice' : 'Invoice');
  const statusOf = (b) => (b.docType === 'Quotation' ? 'quote' : U.billStatus(b));
  const statusLabel = { paid: 'Paid', partial: 'Part paid', unpaid: 'Unpaid', quote: 'Quotation' };
  const pill = (b) => { const s = statusOf(b); return `<span class="pill ${s}">${statusLabel[s]}</span>`; };
  const studioEmail = () => (state.settings && state.settings.email) ? state.settings.email : 'detaillostudio51@gmail.com';
  const developerBrand = () => `
    <div class="developer-brand">
      <small>Designed &amp; Powered by</small>
      <a href="https://studi0z.firebaseapp.com/" target="_blank" rel="noopener noreferrer">
        <img class="dev-badge" src="img/studi0Z.png" alt="studi0z" />
        <span class="dev-name">studi0z</span>
      </a>
    </div>`;

  function words(n) {
    n = Math.round(n); if (n === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = (x) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''));
    const three = (x) => (x > 99 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
    let out = '';
    const cr = Math.floor(n / 1e7); n %= 1e7;
    const lk = Math.floor(n / 1e5); n %= 1e5;
    const th = Math.floor(n / 1e3); n %= 1e3;
    if (cr) out += three(cr) + ' Crore ';
    if (lk) out += two(lk) + ' Lakh ';
    if (th) out += two(th) + ' Thousand ';
    if (n) out += three(n);
    return out.trim();
  }

  // ------------------------------------------------------------ boot
  Store.onAuth(async (user) => {
    state.user = user;
    if (!user) return renderLogin();
    $('#app').innerHTML = '<div class="login"><div class="box"><p class="muted" style="text-align:center">Loading…</p></div></div>';
    try { await loadAll(); } catch (e) { console.error(e); renderLogin('Could not load data. Check your internet and that the Firestore rules allow this account.'); return; }
    const h = (location.hash || '').replace('#', '');
    state.view = ['home', 'new', 'bills', 'rates', 'reports', 'settings'].includes(h) ? h : 'home';
    go(state.view);
  });

  async function loadAll() {
    let s = await Store.getSettings();
    if (!s) { await Store.saveSettings(SEED.settings); s = clone(SEED.settings); }
    state.settings = s;
    let svc = await Store.listServices();
    if (!svc.length) { await Store.seedServices(SEED.services); svc = await Store.listServices(); }
    state.services = svc;
    state.nextNo = await Store.getNextBillNo();
  }

  async function go(view) {
    state.view = view; closeModal();
    try { history.replaceState(null, '', '#' + view); } catch (e) { /* ignore */ }
    if (view === 'home') {
      const from = [pick('month').from, U.addDays(U.today(), -6)].sort()[0];
      try { state.home.bills = await Store.listBills(from, U.today()); remember(state.home.bills); } catch (e) { fail(e); }
    } else if (view === 'bills') {
      try { state.list.bills = await Store.listBills(state.list.from, state.list.to); remember(state.list.bills); } catch (e) { fail(e); }
    } else if (view === 'reports') {
      try { state.rep.bills = await Store.listBills(state.rep.from, state.rep.to); remember(state.rep.bills); } catch (e) { fail(e); }
    } else if (view === 'new' && !state.draft) { state.draft = newDraft(); }
    render();
    window.scrollTo(0, 0);
  }
  const fail = (e) => { console.error(e); toast('Something went wrong: ' + (e.message || e)); };

  // ------------------------------------------------------------ shell
  const NAV = [
    ['home', 'Home', 'home'], ['bills', 'Bills', 'bills'], ['new', 'New bill', 'plus'], ['rates', 'Rate card', 'tag'], ['reports', 'Reports', 'chart']
  ];
  function render() {
    if (!state.user) return renderLogin();
    const v = state.view;
    const body = { home: viewHome, new: viewNew, bills: viewBills, rates: viewRates, reports: viewReports, settings: viewSettings }[v]();
    const rail = `
      <aside class="rail">
        <div class="brand"><img src="img/logo.png" alt=""><div><b>Detaillo</b><span>Billing · Kharadi, Pune</span></div></div>
        <button class="nav primary" data-act="nav" data-arg="new">${ic('plus')} New bill</button>
        ${[['home', 'Home', 'home'], ['bills', 'Bills', 'bills'], ['rates', 'Rate card', 'tag'], ['reports', 'Reports & Excel', 'chart'], ['settings', 'Settings', 'sliders']]
          .map((n) => `<button class="nav" data-act="nav" data-arg="${n[0]}" ${v === n[0] ? 'aria-current="page"' : ''}>${ic(n[2])} ${n[1]}</button>`).join('')}
        <div class="grow"></div>
        <div class="rail-account">
          <div class="who">${esc(state.user.email)}</div>
          <button class="nav" data-act="logout">${ic('out')} Sign out</button>
        </div>
        <div class="rail-footer-brand">${developerBrand()}</div>
      </aside>`;
    const top = `
      <header class="topbar"><img src="img/logo.png" alt=""><div class="t">Detaillo<small>Auto Detailing Studio</small></div><div class="sp"></div>
        <button class="iconbtn" data-act="nav" data-arg="settings" aria-label="Settings">${ic('sliders')}</button></header>`;
    const tabs = `<nav class="tabs" aria-label="Main">${NAV.map((n) => n[0] === 'new'
      ? `<button class="tab cta" data-act="nav" data-arg="new" aria-label="New bill"><span class="fab">${ic('plus')}</span>New bill</button>`
      : `<button class="tab" data-act="nav" data-arg="${n[0]}" ${v === n[0] ? 'aria-current="page"' : ''}>${ic(n[2])}${n[1]}</button>`).join('')}</nav>`;
    $('#app').innerHTML = `<div class="shell">${rail}${top}<main class="main"><div class="page">${body}</div></main>${tabs}${v === 'new' ? savebarHTML() : ''}</div>`;
    if (v === 'new') { paintPicker(); refreshLive(); }
  }

  // ------------------------------------------------------------ login
  function renderLogin(msg) {
    $('#app').innerHTML = `
      <div class="login"><form class="box" id="loginForm">
        <img class="logo" src="img/logo.png" alt="Detaillo Auto Detailing Studio">
        <h1>Billing</h1>
        <p class="sub">Sign in with your staff account.</p>
        <div class="field"><label for="lgEmail">Email</label><input id="lgEmail" type="email" autocomplete="username" required></div>
        <div class="field"><label for="lgPw">Password</label><input id="lgPw" type="password" autocomplete="current-password" required></div>
        <div class="err" id="lgErr">${esc(msg || '')}</div>
        <button class="btn primary" type="submit">Sign in</button>
        <div class="login-footer-brand">${developerBrand()}</div>
      </form></div>`;
  }
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'loginForm') return;
    e.preventDefault();
    const err = $('#lgErr'); err.textContent = '';
    try { await Store.signIn(($('#lgEmail') || {}).value, ($('#lgPw') || {}).value); }
    catch (ex) { err.textContent = /password|credential|user-not-found|invalid/i.test(ex.code + ex.message) ? 'Email or password is not correct.' : 'Could not sign in: ' + (ex.message || ex); }
  });

  // ------------------------------------------------------------ home
  function billRow(b, wide) {
    const vk = b.vehicle || {};
    const veh = [vk.model, vk.regNo].filter(Boolean).join(' · ') || tierLabel(vk.kind, vk.tier);
    if (wide) {
      return `<button class="brow wide" data-act="open" data-arg="${b.id}">
        <span class="no">#${b.billNo}</span><span class="c-date">${U.fmtDate(b.date)}</span>
        <span class="who"><b>${esc(b.customer.name || 'Walk-in')}</b><span>${esc(b.customer.mobile || '')}</span></span>
        <span class="c-veh">${esc(veh)}</span>
        <span class="amt">${inr(b.total)}<br>${pill(b)}</span><span class="c-st">${pill(b)}</span></button>`;
    }
    return `<button class="brow" data-act="open" data-arg="${b.id}">
      <span class="no">#${b.billNo}</span>
      <span class="who"><b>${esc(b.customer.name || 'Walk-in')}</b><span>${esc(veh)} · ${U.fmtDate(b.date)}</span></span>
      <span class="amt">${inr(b.total)}<br>${pill(b)}</span></button>`;
  }

  function viewHome() {
    const t = U.today(), inv = invoices(state.home.bills);
    const sum = (l) => l.reduce((s, b) => s + b.total, 0);
    const today = inv.filter((b) => b.date === t);
    const month = inv.filter((b) => b.date >= pick('month').from);
    const pending = month.reduce((s, b) => s + Math.max(0, b.total - num(b.received)), 0);
    const days = Array.from({ length: 7 }, (_, i) => U.addDays(t, i - 6));
    const vals = days.map((d) => sum(inv.filter((b) => b.date === d)));
    const max = Math.max(...vals, 1);
    const dn = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    const recent = state.home.bills.slice(0, 6);
    const nice = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
      <div class="ph"><div><h1>Today</h1><p>${nice}</p></div><button class="btn primary" data-act="nav" data-arg="new">${ic('plus')} New bill</button></div>
      <div class="grid g4">
        <div class="card kpi hero"><span class="l">Today's billing</span><span class="v">${inr(sum(today))}</span><span class="s">${today.length} bill${today.length === 1 ? '' : 's'} today</span></div>
        <div class="card kpi"><span class="l">This month</span><span class="v">${inr(sum(month))}</span><span class="s">${month.length} invoices</span></div>
        <div class="card kpi"><span class="l">Balance to collect</span><span class="v">${inr(pending)}</span><span class="s">this month</span></div>
        <div class="card kpi"><span class="l">Next bill no.</span><span class="v">#${state.nextNo}</span><span class="s">GSTIN ${esc(state.settings.gstin || 'not set')}</span></div>
      </div>
      <div class="dash-cols">
        <div class="card"><h2>Last 7 days <small>invoice totals</small></h2>
          <div class="bars" role="img" aria-label="Billing for the last seven days">${days.map((d, i) => `
            <div class="bar ${d === t ? 'today' : ''}"><span class="amt">${vals[i] ? inr(vals[i] >= 1000 ? Math.round(vals[i] / 100) / 10 : vals[i], vals[i] >= 1000 ? 1 : 0) + (vals[i] >= 1000 ? 'k' : '') : ''}</span>
            <div class="col" style="height:${Math.max(2, Math.round((vals[i] / max) * 100))}px"></div><span class="d">${dn(d)}</span></div>`).join('')}</div></div>
        <div class="card"><h2>Recent bills <button class="btn sm ghost" data-act="nav" data-arg="bills">View all</button></h2>
          <div class="list">${recent.length ? recent.map((b) => billRow(b)).join('') : '<div class="empty">No bills yet. Create the first one.</div>'}</div></div>
      </div>`;
  }

  // ------------------------------------------------------------ new bill
  function newDraft() {
    const s = state.settings || {};
    return {
      id: null, billNo: null, docType: 'Invoice', date: U.today(), deliveryDate: '',
      customer: { name: '', mobile: '', gstin: '' },
      vehicle: { kind: 'car', tier: 'sedan', model: '', regNo: '' },
      items: [], discount: 0,
      gst: { enabled: s.gstDefault !== false, rate: num(s.gstRate) || 18, igst: false },
      received: 0, payMode: 'UPI', notes: ''
    };
  }
  const D = () => state.draft;

  function viewNew() {
    const d = D(), v = d.vehicle, kind = v.kind;
    const editing = !!d.id;
    return `
      <div class="ph"><div><h1>${editing ? 'Edit bill #' + d.billNo : 'New bill'}</h1><p>${editing ? 'Changes replace the saved bill.' : 'Next number #' + state.nextNo + '. Prices come from the rate card and can be changed on every line.'}</p></div>
        <div class="row">${editing ? '<button class="btn" data-act="cancel-edit">Cancel edit</button>' : '<button class="btn" data-act="reset-draft">Clear form</button>'}</div></div>
      <div class="bill-layout">
        <div class="stack">
          <div class="card"><h2>Customer & vehicle</h2>
            <div class="grid" style="gap:14px">
              <div class="seg wide" role="group" aria-label="Document type">
                <button data-act="doctype" data-arg="Invoice" aria-pressed="${d.docType === 'Invoice'}">Invoice</button>
                <button data-act="doctype" data-arg="Quotation" aria-pressed="${d.docType === 'Quotation'}">Quotation</button></div>
              <div class="grid g3">
                <div class="field"><label for="cName">Customer name</label><input id="cName" type="text" data-b="customer.name" value="${esc(d.customer.name)}" autocomplete="off"></div>
                <div class="field"><label for="cMob">Mobile</label><input id="cMob" type="tel" inputmode="tel" data-b="customer.mobile" value="${esc(d.customer.mobile)}" autocomplete="off"></div>
                <div class="field"><label for="cGst">Customer GSTIN <span style="text-transform:none;font-weight:500">(optional)</span></label><input id="cGst" type="text" data-b="customer.gstin" value="${esc(d.customer.gstin)}" autocapitalize="characters" maxlength="15"></div>
              </div>
              <div class="seg wide" role="group" aria-label="Vehicle type">
                <button data-act="kind" data-arg="car" aria-pressed="${kind === 'car'}">Car</button>
                <button data-act="kind" data-arg="bike" aria-pressed="${kind === 'bike'}">Bike</button></div>
              <div class="field"><span class="lbl">${kind === 'car' ? 'Car size' : 'Bike type'} (sets the price)</span>
                <div class="chips">${tierList(kind).map((t) => `<button class="chip" data-act="tier" data-arg="${t.key}" aria-pressed="${v.tier === t.key}">${t.label}</button>`).join('')}</div></div>
              <div class="grid g3">
                <div class="field"><label for="vModel">${kind === 'car' ? 'Car model' : 'Bike model'}</label><input id="vModel" type="text" data-b="vehicle.model" value="${esc(v.model)}" placeholder="${kind === 'car' ? 'e.g. Hyundai Creta' : 'e.g. Royal Enfield Classic'}"></div>
                <div class="field"><label for="vReg">Registration no.</label><input id="vReg" type="text" data-b="vehicle.regNo" value="${esc(v.regNo)}" autocapitalize="characters" placeholder="MH12 AB 1234"></div>
                <div class="grid g2 keep" style="gap:8px">
                  <div class="field"><label for="bDate">Date</label><input id="bDate" type="date" data-b="date" value="${d.date}"></div>
                  <div class="field"><label for="bDel">Delivery</label><input id="bDel" type="date" data-b="deliveryDate" value="${d.deliveryDate}"></div></div>
              </div>
            </div></div>

          <div class="card"><h2>Add services <small>${tierLabel(kind, v.tier)}</small></h2>
            <div class="picker-top">
              <div class="adorn"><span>${ic('search')}</span><input id="svcSearch" type="search" placeholder="Search services" value="${esc(state.ui.search)}" style="padding-left:38px"></div>
              <div class="chips" id="grpChips"></div></div>
            <div class="svc-list" id="svcList"></div></div>

          <div class="card"><h2>Bill items <small id="itemCount"></small></h2>
            <div class="lines" id="lines">${linesHTML()}</div>
            <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--line)">
              <span class="lbl">Add an extra item (any name, any ₹ amount)</span>
              <div class="extra-add" style="margin-top:6px">
                <input id="exName" type="text" placeholder="e.g. Wax top-up, Dashboard polish" aria-label="Extra item name">
                <div class="adorn"><span>₹</span><input id="exAmt" type="number" inputmode="decimal" min="0" placeholder="Amount" aria-label="Extra item amount"></div>
                <button class="btn" data-act="add-extra">${ic('plus')} Add item</button></div></div></div>

          <div class="card"><h2>Discount, GST & payment</h2>
            <div class="grid g3">
              <div class="field"><label for="dDisc">Discount (₹)</label><div class="adorn"><span>₹</span><input id="dDisc" type="number" inputmode="decimal" min="0" data-b="discount" data-n="1" value="${d.discount || ''}" placeholder="0"></div></div>
              <div class="field"><label for="dRecv">Amount received (₹)</label><div class="adorn"><span>₹</span><input id="dRecv" type="number" inputmode="decimal" min="0" data-b="received" data-n="1" value="${d.received || ''}" placeholder="0"></div></div>
              <div class="field"><label for="dMode">Payment mode</label><select id="dMode" data-b="payMode">${['UPI', 'Cash', 'Card', 'Bank transfer', 'Cheque'].map((m) => `<option ${d.payMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            </div>
            <div class="row" style="margin-top:10px"><button class="btn sm" data-act="paid-full">${ic('check')} Mark paid in full</button></div>
            <div class="grid g3" style="margin-top:14px;align-items:end">
              <label class="toggle"><input type="checkbox" data-chk="gst.enabled" ${d.gst.enabled ? 'checked' : ''}> Add GST</label>
              <div class="field"><label for="gRate">GST rate (%)</label><input id="gRate" type="number" inputmode="decimal" min="0" data-b="gst.rate" data-n="1" value="${d.gst.rate}" ${d.gst.enabled ? '' : 'disabled'}></div>
              <label class="toggle"><input type="checkbox" data-chk="gst.igst" ${d.gst.igst ? 'checked' : ''} ${d.gst.enabled ? '' : 'disabled'}> Out of state (IGST)</label>
            </div>
            <p class="muted" style="font-size:12.5px;margin-top:6px">Rate-card prices are before GST. GST is added on top of price minus discount, split into CGST and SGST (IGST if out of state).</p>
            <div class="field" style="margin-top:14px"><label for="bNotes">Notes (printed on the bill)</label><textarea id="bNotes" data-b="notes" placeholder="e.g. Balance on delivery. Coating cure: no wash for 7 days.">${esc(d.notes)}</textarea></div></div>
        </div>
        <aside class="summary card desk-only" id="summaryCard"><h2>Bill summary</h2><div id="summary"></div>
          <div class="grid" style="margin-top:14px"><button class="btn primary" data-act="save">${ic('check')} Save bill</button><button class="btn" data-act="save-print">${ic('print')} Save & print</button></div></aside>
        <div class="card summary" id="summaryMobile" style="min-width:0"><h2>Bill summary</h2><div id="summary2"></div></div>
      </div>`;
  }
  const savebarHTML = () => `<div class="savebar"><div><small>Total</small><span class="amt" id="sbAmt">₹0</span></div><div class="sp"></div><button class="btn primary" data-act="save">${ic('check')} Save bill</button></div>`;

  function linesHTML() {
    const d = D();
    if (!d.items.length) return '<div class="empty">No items yet. Tap a service above, or add an extra item.</div>';
    return `<div class="line-head"><span>Particulars</span><span>Qty</span><span>Rate (₹)</span><span class="right">Amount</span><span></span></div>` +
      d.items.map((it) => `
      <div class="line" data-line="${it.id}">
        <div class="nm"><input type="text" data-li="${it.id}" data-lf="name" value="${esc(it.name)}" aria-label="Item name">${it.custom ? '<span><span class="pill extra">Extra item</span></span>' : ''}</div>
        <input class="qty" type="number" inputmode="decimal" min="0" step="any" data-li="${it.id}" data-lf="qty" value="${it.qty}" aria-label="Quantity">
        <input class="rate" type="number" inputmode="decimal" min="0" data-li="${it.id}" data-lf="rate" value="${it.rate}" aria-label="Rate in rupees">
        <span class="amount" id="amt-${it.id}">${inr(U.lineAmount(it))}</span>
        <button class="iconbtn danger del" data-act="rm-line" data-arg="${it.id}" aria-label="Remove item">${ic('x')}</button>
      </div>`).join('');
  }

  function groupsForKind(kind) { return SEED.GROUPS.filter((g) => g.vehicle === kind); }
  function paintPicker() {
    const d = D(), kind = d.vehicle.kind, groups = groupsForKind(kind);
    if (state.ui.grp !== 'all' && !groups.find((g) => g.key === state.ui.grp)) state.ui.grp = 'all';
    const chips = $('#grpChips');
    if (chips) chips.innerHTML = [{ key: 'all', label: 'All' }, ...groups].map((g) => `<button class="chip" data-act="grp" data-arg="${g.key}" aria-pressed="${state.ui.grp === g.key}">${esc(g.label.replace(/^(Car|Bike) · /, ''))}</button>`).join('');
    paintSvcList();
  }
  function paintSvcList() {
    const d = D(), kind = d.vehicle.kind, q = state.ui.search.trim().toLowerCase();
    const groups = groupsForKind(kind).filter((g) => state.ui.grp === 'all' || g.key === state.ui.grp);
    let html = '';
    groups.forEach((g) => {
      const list = state.services.filter((s) => s.group === g.key && (!q || (s.name + ' ' + (s.desc || '')).toLowerCase().includes(q)));
      if (!list.length) return;
      html += `<div class="svc-group">${esc(g.label)}</div>` + list.map((s) => `
        <button class="svc" data-act="add-svc" data-arg="${s.id}"><span><b>${esc(s.name)}</b><small>${esc(s.desc || '')}${s.unit ? ' · ' + esc(s.unit) : ''}</small></span>
        <span class="p">${inr(svcPrice(s, kind, d.vehicle.tier))}</span><span class="add">${ic('plus')}</span></button>`).join('');
    });
    const el = $('#svcList'); if (el) el.innerHTML = html || '<div class="empty">No services match.</div>';
  }

  function summaryHTML(t) {
    const d = D(), bal = Math.max(0, t.total - num(d.received));
    const row = (l, v, c) => `<div class="tot ${c || ''}"><span>${l}</span><span>${v}</span></div>`;
    return row('Subtotal', inr(t.subtotal, 2)) +
      (t.discount ? row('Discount', '− ' + inr(t.discount, 2), 'sub') : '') +
      (d.gst.enabled ? (t.discount ? row('Taxable value', inr(t.taxable, 2), 'sub') : '') +
        (d.gst.igst ? row(`IGST ${d.gst.rate}%`, inr(t.igst, 2), 'sub') : row(`CGST ${d.gst.rate / 2}%`, inr(t.cgst, 2), 'sub') + row(`SGST ${d.gst.rate / 2}%`, inr(t.sgst, 2), 'sub')) : '') +
      (t.roundOff ? row('Round off', (t.roundOff > 0 ? '+ ' : '− ') + inr(Math.abs(t.roundOff), 2), 'sub') : '') +
      row('Total', inr(t.total, 0), 'grand') +
      (d.docType === 'Invoice' ? row('Received', inr(num(d.received), 0), 'sub') + row('Balance due', inr(bal, 0), 'bal') : '');
  }
  function refreshLive() {
    const d = D(); if (!d) return;
    const t = U.calc(d.items, d.discount, d.gst);
    ['#summary', '#summary2'].forEach((s) => { const el = $(s); if (el) el.innerHTML = summaryHTML(t); });
    const sb = $('#sbAmt'); if (sb) sb.textContent = inr(t.total, 0);
    const ct = $('#itemCount'); if (ct) ct.textContent = d.items.length + ' item' + (d.items.length === 1 ? '' : 's');
    d.items.forEach((it) => { const el = document.getElementById('amt-' + it.id); if (el) el.textContent = inr(U.lineAmount(it)); });
  }
  const repaintLines = () => { $('#lines').innerHTML = linesHTML(); refreshLive(); };

  function reprice() {
    const d = D();
    d.items = d.items.filter((it) => { const s = it.serviceId && svcById(it.serviceId); return !it.serviceId || (s && groupOf(s.group).vehicle === d.vehicle.kind); });
    d.items.forEach((it) => { if (it.serviceId && !it.manual) it.rate = svcPrice(svcById(it.serviceId), d.vehicle.kind, d.vehicle.tier); });
  }

  const setPath = (obj, path, val) => { const p = path.split('.'); const last = p.pop(); let o = obj; p.forEach((k) => (o = o[k])); o[last] = val; };

  function itemFromBill(it) { return { id: it.id || U.uid(), serviceId: it.serviceId || '', name: it.name, desc: it.desc || '', qty: it.qty, rate: it.rate, custom: !!it.custom, manual: !!it.manual }; }

  async function saveBill(andPrint) {
    const d = D();
    if (!d.items.length) return toast('Add at least one service or extra item.');
    if (!d.customer.name.trim() && !d.customer.mobile.trim()) return toast('Enter the customer name or mobile number.');
    const t = U.calc(d.items, d.discount, d.gst);
    const bill = clone({
      docType: d.docType, date: d.date, deliveryDate: d.deliveryDate,
      customer: { name: d.customer.name.trim(), mobile: d.customer.mobile.trim(), gstin: d.customer.gstin.trim().toUpperCase() },
      vehicle: { ...d.vehicle, model: d.vehicle.model.trim(), regNo: d.vehicle.regNo.trim().toUpperCase() },
      items: d.items.map((it) => ({ id: it.id, serviceId: it.serviceId || '', name: it.name.trim() || 'Item', desc: it.desc || '', qty: num(it.qty), rate: num(it.rate), amount: U.lineAmount(it), custom: !!it.custom, manual: !!it.manual })),
      discount: t.discount, gst: d.gst, subtotal: t.subtotal, taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst, roundOff: t.roundOff, total: t.total,
      received: d.docType === 'Quotation' ? 0 : Math.min(num(d.received), t.total), payMode: d.payMode, notes: d.notes
    });
    try {
      let saved;
      if (d.id) { bill.billNo = d.billNo; await Store.updateBill(d.id, bill); saved = { ...bill, id: d.id }; }
      else { saved = await Store.createBill(bill); state.nextNo = saved.billNo + 1; }
      state.byId[saved.id] = saved;
      state.draft = newDraft(); state.ui.search = '';
      toast(`Saved ${docTitle(saved)} #${saved.billNo}`);
      if (state.view !== 'new') go('new'); else render();
      openBill(saved.id);
      if (andPrint) printBill(saved);
    } catch (e) { fail(e); }
  }

  // ------------------------------------------------------------ bill paper
  function invoiceHTML(b) {
    const s = state.settings || {}, c = b.customer, v = b.vehicle || {};
    const kindWord = v.kind === 'bike' ? 'Bike' : 'Car';
    const studioPhones = (s.phones || '9161684151, 7276767303').trim();
    const studioMail = (s.email || studioEmail() || 'detaillostudio51@gmail.com').trim();
    const studioInstagram = (s.instagram || 'detaillo_studio_kharadi').replace(/^@/, '').trim();
    const studioGstin = (s.gstin || '27ABAFD1242L1ZM').trim();
    const rows = b.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</td><td class="r">${it.qty}</td><td class="r">${inr(it.rate, 2).replace('.00', '')}</td><td class="r">${inr(it.qty * it.rate, 2).replace('.00', '')}</td></tr>`).join('');
    const bal = Math.max(0, b.total - num(b.received));
    const terms = (s.terms || []).filter(Boolean);
    return `<div class="inv">
      <div class="hd"><img src="img/logo.png" alt="">
        <div><h2>${esc(s.name || 'Detaillo Auto Detailing Studio')}</h2><div class="tag">“${esc(s.tagline || 'Where Shine Meets Perfection')}”</div><div class="ad">${esc(s.address || 'Kharadi, Thite Nagar, Behind Zensar, Pune - 411014')}</div></div>
        <div class="ph2">Mob.: ${esc(studioPhones)}${studioMail ? '<br>' + esc(studioMail) : ''}${studioInstagram ? '<br>@' + esc(studioInstagram) : ''}<br><b>GSTIN: ${esc(studioGstin)}</b></div></div>
      <div class="doc">${docTitle(b)}</div>
      <div class="meta">
        <div><div><span class="k">Name: </span><b>${esc(c.name || 'Walk-in')}</b></div><div><span class="k">Mobile: </span><b>${esc(c.mobile || '')}</b></div>${c.gstin ? `<div><span class="k">Customer GSTIN: </span><b>${esc(c.gstin)}</b></div>` : ''}</div>
        <div><div><span class="k">No.: </span><b>${b.billNo}</b></div><div><span class="k">Date: </span><b>${U.fmtDate(b.date)}</b></div><div><span class="k">Delivery: </span><b>${U.fmtDate(b.deliveryDate)}</b></div></div></div>
      <div class="meta"><div><div><span class="k">Type of ${kindWord}: </span><b>${esc([v.model, tierLabel(v.kind, v.tier)].filter(Boolean).join(' · '))}</b></div></div><div><div><span class="k">Reg. no.: </span><b>${esc(v.regNo || '')}</b></div></div></div>
      <table><thead><tr><th style="width:44px">S.No.</th><th>Particulars</th><th class="r" style="width:56px">Qty.</th><th class="r" style="width:96px">Rate</th><th class="r" style="width:110px">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tots"><div class="words">Amount in words<b>Rupees ${words(b.total)} Only</b>${b.notes ? `<div style="margin-top:8px">Note: ${esc(b.notes)}</div>` : ''}</div>
        <div class="t"><div><span>Subtotal</span><span>${inr(b.subtotal, 2)}</span></div>
          ${b.discount ? `<div><span>Discount</span><span>− ${inr(b.discount, 2)}</span></div>` : ''}
          ${b.gst && b.gst.enabled ? (b.igst ? `<div><span>IGST ${b.gst.rate}%</span><span>${inr(b.igst, 2)}</span></div>` : `<div><span>CGST ${b.gst.rate / 2}%</span><span>${inr(b.cgst, 2)}</span></div><div><span>SGST ${b.gst.rate / 2}%</span><span>${inr(b.sgst, 2)}</span></div>`) : ''}
          ${b.roundOff ? `<div><span>Round off</span><span>${b.roundOff > 0 ? '+' : '−'} ${inr(Math.abs(b.roundOff), 2)}</span></div>` : ''}
          <div class="g"><span>TOTAL</span><span>${inr(b.total, 0)}</span></div>
          ${b.docType !== 'Quotation' && num(b.received) ? `<div><span>Received (${esc(b.payMode)})</span><span>${inr(b.received, 0)}</span></div><div><span>Balance</span><span>${inr(bal, 0)}</span></div>` : ''}</div></div>
      <div class="terms"><ul>${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><div style="margin-top:6px">Thank You!</div></div>
      <div class="sig"><span>Customer signature</span><b>For, ${esc(s.name || 'Detaillo Auto Detailing Studio')}</b></div></div>`;
  }
  function printBill(b) {
    if (window.DETAILLO_PREVIEW) return toast('Printing works in the live app. It is switched off in this preview.');
    $('#printRoot').innerHTML = invoiceHTML(b);
    setTimeout(() => { try { window.print(); } catch (e) { toast('Printing is not available here.'); } }, 80);
  }
  function billWhatsAppMessage(b) {
    const bal = Math.max(0, b.total - num(b.received));
    return `Hello ${b.customer.name || ''}, thank you for choosing ${state.settings.name}.\n${docTitle(b)} #${b.billNo} dated ${U.fmtDate(b.date)}\nTotal: ${inr(b.total, 0)}` + (b.docType !== 'Quotation' ? `\nReceived: ${inr(num(b.received), 0)}\nBalance: ${inr(bal, 0)}` : '') + `\nEmail: ${studioEmail()}\n${state.settings.address}`;
  }
  function waLink(b) {
    let p = (b.customer.mobile || '').replace(/\D/g, ''); if (p.length === 10) p = '91' + p;
    return `https://wa.me/${p}?text=${encodeURIComponent(billWhatsAppMessage(b))}`;
  }
  function buildBillPdfFile(b) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF export is unavailable in this browser.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const width = doc.internal.pageSize.getWidth();
    const left = margin;
    let y = 18;

    doc.setFillColor(227, 21, 0);
    doc.roundedRect(10, 8, width - 20, 22, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(state.settings.name || 'Detaillo Auto Detailing Studio', left + 6, 20);
    doc.setFontSize(9);
    doc.text('Auto Detailing Studio', left + 6, 27);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(15);
    doc.text(docTitle(b), width - margin, 18, { align: 'right' });
    doc.setFontSize(10);
    y = 40;
    const studioPhones = (state.settings && state.settings.phones) || '9161684151, 7276767303';
    const studioMail = (state.settings && state.settings.email) || studioEmail() || 'detaillostudio51@gmail.com';
    const studioInstagram = ((state.settings && state.settings.instagram) || 'detaillo_studio_kharadi').replace(/^@/, '');
    const studioGstin = (state.settings && state.settings.gstin) || '27ABAFD1242L1ZM';
    doc.text(`Mob.: ${studioPhones}`, left, y);
    doc.text(`GSTIN: ${studioGstin}`, width / 2 + 10, y);
    y += 7;
    doc.text(`${studioMail}`, left, y);
    doc.text(`@${studioInstagram}`, width / 2 + 10, y);
    y += 7;
    doc.text(`Address: ${(state.settings && state.settings.address) || 'Kharadi, Thite Nagar, Behind Zensar, Pune - 411014'}`, left, y);
    y += 8;
    doc.setDrawColor(180, 180, 180);
    doc.line(left, y, width - left, y);
    y += 8;
    doc.text(`Bill No.: ${b.billNo}`, left, y);
    doc.text(`Date: ${U.fmtDate(b.date)}`, width / 2 + 10, y);
    y += 7;
    doc.text(`Customer: ${b.customer.name || 'Walk-in'}`, left, y);
    doc.text(`Mobile: ${b.customer.mobile || ''}`, width / 2 + 10, y);
    y += 7;
    doc.text(`Vehicle: ${((b.vehicle || {}).model || '') + ((b.vehicle || {}).regNo ? ' • ' + (b.vehicle || {}).regNo : '')}`, left, y);
    if ((b.customer || {}).gstin) {
      doc.text(`Customer GSTIN: ${b.customer.gstin}`, width / 2 + 10, y);
    }
    y += 8;
    doc.setDrawColor(180, 180, 180);
    doc.line(left, y, width - left, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text('Particulars', left, y);
    doc.text('Qty', width - 78, y, { align: 'right' });
    doc.text('Rate', width - 54, y, { align: 'right' });
    doc.text('Amount', width - 18, y, { align: 'right' });
    y += 7;

    b.items.forEach((it, index) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
      const name = `${index + 1}. ${it.name}`;
      doc.text(name, left, y, { maxWidth: width - 120 });
      doc.text(String(num(it.qty) || 0), width - 78, y, { align: 'right' });
      doc.text(inr(num(it.rate), 2), width - 54, y, { align: 'right' });
      doc.text(inr(num(it.qty) * num(it.rate), 2), width - 18, y, { align: 'right' });
      y += 7;
    });

    y += 6;
    doc.line(left, y, width - left, y);
    y += 8;
    const subtotal = num(b.subtotal) || 0;
    const discount = num(b.discount) || 0;
    const total = num(b.total) || 0;
    const received = num(b.received) || 0;
    const balance = Math.max(0, total - received);
    doc.text(`Subtotal: ${inr(subtotal, 2)}`, width - 18, y, { align: 'right' });
    y += 7;
    if (discount) { doc.text(`Discount: -${inr(discount, 2)}`, width - 18, y, { align: 'right' }); y += 7; }
    if (b.gst && b.gst.enabled) {
      const label = b.gst.igst ? `IGST ${b.gst.rate}%` : `GST ${b.gst.rate}%`;
      const gstValue = (b.gst.igst ? num(b.igst) : num(b.cgst) + num(b.sgst)) || 0;
      doc.text(`${label}: ${inr(gstValue, 2)}`, width - 18, y, { align: 'right' });
      y += 7;
    }
    doc.setFontSize(12);
    doc.text(`Total: ${inr(total, 0)}`, width - 18, y, { align: 'right' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Received: ${inr(received, 0)}`, width - 18, y, { align: 'right' });
    y += 7;
    doc.text(`Balance: ${inr(balance, 0)}`, width - 18, y, { align: 'right' });

    const safeName = (state.settings.name || 'Detaillo').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return new File([doc.output('blob')], `${safeName}-bill-${b.billNo}.pdf`, { type: 'application/pdf' });
  }
  function downloadBillPdf(b) {
    try {
      const file = buildBillPdfFile(b);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('PDF downloaded');
    } catch (err) {
      console.error(err);
      toast('PDF creation failed in this browser.');
    }
  }
  function openWhatsAppWithMessage(b) {
    let p = (b.customer.mobile || '').replace(/\D/g, ''); if (p.length === 10) p = '91' + p;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(billWhatsAppMessage(b))}`, '_blank', 'noopener');
    toast('WhatsApp opened with the bill message');
  }

  // ------------------------------------------------------------ modals
  function openModal(title, body, footer, width) {
    $('#modalRoot').innerHTML = `<div class="modal-back" data-act="modal-back"><div class="modal" role="dialog" aria-modal="true" style="--mw:${width || 560}px"><div class="mh"><span>${title}</span><button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="mb">${body}</div>${footer ? `<div class="mf">${footer}</div>` : ''}</div></div>`;
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; state.modalBill = null; }
  function confirmBox(msg, okLabel, fn) {
    state.confirmFn = fn;
    openModal('Please confirm', `<p>${msg}</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirm-ok">${okLabel}</button>`, 420);
  }
  function openBill(id) {
    const b = state.byId[id]; if (!b) return;
    state.modalBill = id;
    const isQ = b.docType === 'Quotation', bal = b.total - num(b.received);
    openModal(`${docTitle(b)} #${b.billNo}`, `<div class="paper-wrap">${invoiceHTML(b)}</div>`,
      `<button class="btn danger sm" data-act="del-bill" data-arg="${b.id}">${ic('trash')} Delete</button><span class="sp"></span>
       ${isQ ? `<button class="btn sm" data-act="to-invoice" data-arg="${b.id}">Convert to invoice</button>` : bal > 0 ? `<button class="btn sm" data-act="pay-full" data-arg="${b.id}">${ic('check')} Mark paid</button>` : ''}
       <button class="btn sm" data-act="edit-bill" data-arg="${b.id}">${ic('edit')} Edit</button>
       <button class="btn sm" data-act="download-pdf" data-arg="${b.id}">${ic('download')} Download PDF</button>
       <button class="btn sm" data-act="wa-share" data-arg="${b.id}">${ic('send')} WhatsApp</button>
       <button class="btn primary sm" data-act="print" data-arg="${b.id}">${ic('print')} Print / PDF</button>`, 800);
  }

  // ------------------------------------------------------------ bills list
  function filteredBills() {
    const L = state.list, q = L.q.trim().toLowerCase();
    return L.bills.filter((b) => {
      if (L.status === 'quote' && b.docType !== 'Quotation') return false;
      if (['paid', 'partial', 'unpaid'].includes(L.status) && statusOf(b) !== L.status) return false;
      if (!q) return true;
      const v = b.vehicle || {};
      return [b.billNo, b.customer.name, b.customer.mobile, v.model, v.regNo].join(' ').toLowerCase().includes(q);
    });
  }
  function rangeBar(S, key) {
    return `<div class="chips">${presets().map((p) => `<button class="chip" data-act="preset" data-arg="${key}:${p.key}" aria-pressed="${S.preset === p.key}">${p.label}</button>`).join('')}</div>
      <div class="grid g2 keep" style="max-width:420px"><div class="field"><label for="${key}From">From</label><input id="${key}From" type="date" data-range="${key}.from" value="${S.from}"></div>
      <div class="field"><label for="${key}To">To</label><input id="${key}To" type="date" data-range="${key}.to" value="${S.to}"></div></div>`;
  }
  function viewBills() {
    const L = state.list, list = filteredBills(), inv = invoices(list);
    return `
      <div class="ph"><div><h1>Bills</h1><p>${list.length} bill${list.length === 1 ? '' : 's'} · ${inr(inv.reduce((s, b) => s + b.total, 0))} invoiced</p></div><button class="btn primary" data-act="nav" data-arg="new">${ic('plus')} New bill</button></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">${rangeBar(L, 'list')}
        <div class="grid g2"><div class="adorn"><span>${ic('search')}</span><input id="billQ" type="search" placeholder="Search name, mobile, vehicle, reg. no., bill no." value="${esc(L.q)}" style="padding-left:38px"></div>
          <select id="billStatus" aria-label="Status filter">${[['all', 'All bills'], ['paid', 'Paid'], ['partial', 'Part paid'], ['unpaid', 'Unpaid'], ['quote', 'Quotations']].map((o) => `<option value="${o[0]}" ${L.status === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div></div>
      <div class="card" style="padding:6px 12px"><div class="list" id="billList">${list.length ? list.map((b) => billRow(b, true)).join('') : '<div class="empty">No bills in this period.</div>'}</div></div>`;
  }

  // ------------------------------------------------------------ rate card
  function viewRates() {
    const sections = SEED.GROUPS.map((g) => {
      const list = state.services.filter((s) => s.group === g.key);
      const cols = g.pricing === 'tier' ? tierList(g.vehicle) : [{ key: 'flat', short: 'Price (₹)' }];
      return `<div class="card"><h2>${esc(g.label)} <button class="btn sm" data-act="svc-new" data-arg="${g.key}">${ic('plus')} Add</button></h2>
        <div class="tbl-wrap"><table class="rates"><thead><tr><th>Service</th>${cols.map((c) => `<th class="right">${esc(c.short || c.label)}</th>`).join('')}${g.key === 'car-ppf' ? '<th class="right">Our cost</th>' : ''}<th></th></tr></thead><tbody>
        ${list.map((s) => `<tr><td class="nm"><b>${esc(s.name)}</b><small>${esc(s.desc || '')}${s.unit ? ' · ' + esc(s.unit) : ''}</small></td>
          ${cols.map((c) => `<td class="right"><input type="number" inputmode="decimal" min="0" data-price="${s.id}|${c.key}" value="${num((s.prices || {})[c.key])}" aria-label="${esc(s.name)} ${esc(c.short || c.label)} price"></td>`).join('')}
          ${g.key === 'car-ppf' ? `<td class="right muted">${inr(s.cost || 0)}</td>` : ''}
          <td class="act"><button class="iconbtn" data-act="svc-edit" data-arg="${s.id}" aria-label="Edit ${esc(s.name)}">${ic('edit')}</button><button class="iconbtn danger" data-act="svc-del" data-arg="${s.id}" aria-label="Delete ${esc(s.name)}">${ic('trash')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted">Nothing here yet.</td></tr>`}
        </tbody></table></div></div>`;
    }).join('');
    return `<div class="ph"><div><h1>Rate card</h1><p>Change a price in any box and it saves straight away. Prices are before GST.</p></div>
      <button class="btn" data-act="svc-reset">Restore Excel defaults</button></div>${sections}`;
  }
  function svcForm(s) {
    const g = groupOf(s.group), tiered = g.pricing === 'tier';
    const cols = tiered ? tierList(g.vehicle) : [{ key: 'flat', label: 'Price (₹)' }];
    return `<div class="field"><label for="sfGroup">Section</label><select id="sfGroup" data-chg="svc-group">${SEED.GROUPS.map((x) => `<option value="${x.key}" ${x.key === s.group ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="sfName">Service name</label><input id="sfName" type="text" value="${esc(s.name)}"></div>
      <div class="field"><label for="sfDesc">Description / warranty</label><textarea id="sfDesc">${esc(s.desc || '')}</textarea></div>
      <div class="grid g3">${cols.map((c) => `<div class="field"><label for="sfP_${c.key}">${esc(c.label)}</label><div class="adorn"><span>₹</span><input id="sfP_${c.key}" type="number" inputmode="decimal" min="0" value="${num((s.prices || {})[c.key])}"></div></div>`).join('')}</div>
      ${tiered ? '' : `<div class="grid g2"><div class="field"><label for="sfUnit">Unit (e.g. Per Vehicle)</label><input id="sfUnit" type="text" value="${esc(s.unit || '')}"></div>
        <div class="field"><label for="sfCost">Our cost (₹, not printed)</label><div class="adorn"><span>₹</span><input id="sfCost" type="number" inputmode="decimal" min="0" value="${num(s.cost)}"></div></div></div>`}`;
  }
  let svcEditing = null;
  function openSvcModal(s) {
    svcEditing = s;
    openModal(s.id ? 'Edit service' : 'Add service', `<div id="svcForm" style="display:flex;flex-direction:column;gap:12px">${svcForm(s)}</div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="svc-save">Save service</button>`, 560);
  }
  function readSvcForm() {
    const g = groupOf($('#sfGroup').value), s = { ...svcEditing, group: g.key, name: $('#sfName').value.trim(), desc: $('#sfDesc').value.trim() };
    const cols = g.pricing === 'tier' ? tierList(g.vehicle).map((t) => t.key) : ['flat'];
    s.prices = {}; cols.forEach((k) => (s.prices[k] = num($('#sfP_' + k).value)));
    if (g.pricing === 'flat') { s.unit = $('#sfUnit').value.trim(); s.cost = num($('#sfCost').value); } else { s.unit = ''; delete s.cost; }
    if (!s.sort) s.sort = Date.now();
    return s;
  }

  // ------------------------------------------------------------ reports + Excel
  function viewReports() {
    const R = state.rep, all = R.bills, inv = invoices(all);
    const S = (f) => inv.reduce((s, b) => s + num(b[f]), 0);
    const pending = inv.reduce((s, b) => s + Math.max(0, b.total - num(b.received)), 0);
    return `
      <div class="ph"><div><h1>Reports & Excel</h1><p>Pick any date range and download every bill and line item as an .xlsx file.</p></div>
        <button class="btn primary" data-act="export" ${all.length ? '' : 'disabled'}>${ic('download')} Download Excel</button></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">${rangeBar(R, 'rep')}</div>
      <div class="grid g4">
        <div class="card kpi hero"><span class="l">Invoiced (incl. GST)</span><span class="v">${inr(S('total'))}</span><span class="s">${inv.length} invoices${all.length - inv.length ? ' · ' + (all.length - inv.length) + ' quotations' : ''}</span></div>
        <div class="card kpi"><span class="l">GST collected</span><span class="v">${inr(S('cgst') + S('sgst') + S('igst'))}</span><span class="s">CGST ${inr(S('cgst'))} · SGST ${inr(S('sgst'))}${S('igst') ? ' · IGST ' + inr(S('igst')) : ''}</span></div>
        <div class="card kpi"><span class="l">Received</span><span class="v">${inr(S('received'))}</span><span class="s">cash, UPI, card</span></div>
        <div class="card kpi"><span class="l">Balance due</span><span class="v">${inr(pending)}</span><span class="s">across ${inv.filter((b) => b.total > num(b.received)).length} bills</span></div></div>
      <div class="card"><h2>Bills in this range <small>${all.length} rows in the file</small></h2>
        <div class="tbl-wrap"><table class="rep-table"><thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Vehicle</th><th class="r">Taxable</th><th class="r">GST</th><th class="r">Total</th><th class="r">Balance</th></tr></thead><tbody>
          ${all.slice(0, 50).map((b) => `<tr><td>#${b.billNo}</td><td>${U.fmtDate(b.date)}</td><td>${esc(b.customer.name)}${b.docType === 'Quotation' ? ' <span class="pill quote">Quotation</span>' : ''}</td><td>${esc([(b.vehicle || {}).model, (b.vehicle || {}).regNo].filter(Boolean).join(' · '))}</td><td class="r">${inr(b.taxable)}</td><td class="r">${inr(num(b.cgst) + num(b.sgst) + num(b.igst))}</td><td class="r">${inr(b.total)}</td><td class="r">${b.docType === 'Quotation' ? '-' : inr(Math.max(0, b.total - num(b.received)))}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No bills in this range.</td></tr>'}
        </tbody></table></div>${all.length > 50 ? `<p class="muted" style="margin-top:8px;font-size:13px">Showing the first 50. The Excel file has all ${all.length}.</p>` : ''}</div>`;
  }

  function exportExcel() {
    if (window.DETAILLO_PREVIEW) return toast('The Excel download works in the live app. Downloads are switched off in this preview.');
    if (!window.XLSX) return toast('Excel library did not load. Check your internet connection.');
    const R = state.rep, all = R.bills.slice().sort((a, b) => (a.date === b.date ? a.billNo - b.billNo : a.date < b.date ? -1 : 1)), inv = invoices(all);
    const wb = XLSX.utils.book_new();
    const fix = (ws, widths, moneyCols) => {
      ws['!cols'] = widths.map((w) => ({ wch: w }));
      Object.keys(ws).forEach((k) => { if (k[0] !== '!' && ws[k].t === 'n') ws[k].z = '#,##0.00'; });
      return ws;
    };
    const S = (f) => U.r2(inv.reduce((s, b) => s + num(b[f]), 0));
    // Summary
    const sum = [
      ['Detaillo Auto Detailing Studio'], ['GSTIN', state.settings.gstin], ['Period', `${U.fmtDate(R.from)} to ${U.fmtDate(R.to)}`], [],
      ['Invoices', inv.length], ['Quotations (not counted below)', all.length - inv.length], [],
      ['Subtotal (before discount)', S('subtotal')], ['Discount', S('discount')], ['Taxable value', S('taxable')],
      ['CGST', S('cgst')], ['SGST', S('sgst')], ['IGST', S('igst')], ['Round off', S('roundOff')], ['Total invoiced', S('total')], [],
      ['Received', S('received')], ['Balance due', U.r2(inv.reduce((s, b) => s + Math.max(0, b.total - num(b.received)), 0))], [], ['Received by payment mode']
    ];
    const modes = {}; inv.forEach((b) => { if (num(b.received)) modes[b.payMode] = (modes[b.payMode] || 0) + num(b.received); });
    Object.keys(modes).forEach((m) => sum.push([m, U.r2(modes[m])]));
    XLSX.utils.book_append_sheet(wb, fix(XLSX.utils.aoa_to_sheet(sum), [34, 28]), 'Summary');
    // Bills
    const head = ['Bill No', 'Date', 'Type', 'Customer', 'Mobile', 'Customer GSTIN', 'Vehicle', 'Model', 'Reg No', 'Size / Type', 'Delivery Date', 'Items', 'Subtotal', 'Discount', 'Taxable', 'CGST', 'SGST', 'IGST', 'Round Off', 'Total', 'Received', 'Balance', 'Status', 'Payment Mode', 'Notes'];
    const rows = all.map((b) => { const v = b.vehicle || {}; return [b.billNo, b.date, b.docType, b.customer.name, b.customer.mobile, b.customer.gstin || '', v.kind === 'bike' ? 'Bike' : 'Car', v.model || '', v.regNo || '', tierLabel(v.kind, v.tier), b.deliveryDate || '', b.items.map((i) => i.name).join('; '), num(b.subtotal), num(b.discount), num(b.taxable), num(b.cgst), num(b.sgst), num(b.igst), num(b.roundOff), num(b.total), num(b.received), b.docType === 'Quotation' ? 0 : Math.max(0, U.r2(b.total - num(b.received))), statusLabel[statusOf(b)], b.payMode || '', b.notes || '']; });
    const wsB = fix(XLSX.utils.aoa_to_sheet([head, ...rows]), [9, 12, 11, 24, 14, 18, 8, 22, 15, 20, 13, 50, 12, 10, 12, 10, 10, 10, 10, 12, 12, 12, 11, 14, 30]);
    for (let r = 2; r <= rows.length + 1; r++) { const c = wsB['A' + r]; if (c) c.z = '0'; }
    wsB['!autofilter'] = { ref: `A1:Y${rows.length + 1}` };
    XLSX.utils.book_append_sheet(wb, wsB, 'Bills');
    // Line items
    const li = [['Bill No', 'Date', 'Type', 'Customer', 'Item', 'Extra item?', 'Qty', 'Rate', 'Amount']];
    all.forEach((b) => b.items.forEach((i) => li.push([b.billNo, b.date, b.docType, b.customer.name, i.name, i.custom ? 'Yes' : '', num(i.qty), num(i.rate), U.r2(num(i.qty) * num(i.rate))])));
    const wsL = fix(XLSX.utils.aoa_to_sheet(li), [9, 12, 11, 24, 44, 11, 7, 12, 13]);
    for (let r = 2; r <= li.length; r++) { const c = wsL['A' + r]; if (c) c.z = '0'; }
    XLSX.utils.book_append_sheet(wb, wsL, 'Line Items');
    // By service (invoices only)
    const by = {}; inv.forEach((b) => b.items.forEach((i) => { const k = i.name; by[k] = by[k] || { q: 0, a: 0 }; by[k].q += num(i.qty); by[k].a += num(i.qty) * num(i.rate); }));
    const bs = Object.keys(by).sort((a, b) => by[b].a - by[a].a).map((k) => [k, by[k].q, U.r2(by[k].a)]);
    XLSX.utils.book_append_sheet(wb, fix(XLSX.utils.aoa_to_sheet([['Service / item', 'Qty sold', 'Sales (before GST)'], ...bs]), [46, 10, 18]), 'By Service');
    XLSX.writeFile(wb, `Detaillo_Bills_${R.from}_to_${R.to}.xlsx`);
    toast('Excel file downloaded');
  }

  // ------------------------------------------------------------ settings
  function viewSettings() {
    const s = state.settings;
    const f = (id, label, val, extra) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="text" value="${esc(val)}" ${extra || ''}></div>`;
    return `
      <div class="ph"><div><h1>Settings</h1><p>Shown on every printed bill.</p></div></div>
      <div class="card"><h2>Studio details</h2><div class="grid g2">
        ${f('stName', 'Studio name', s.name)}${f('stTag', 'Tagline', s.tagline)}${f('stAddr', 'Address', s.address)}${f('stPh', 'Phone numbers', s.phones)}
        ${f('stEmail', 'Email', s.email || 'detaillostudio51@gmail.com')}${f('stGstin', 'Studio GSTIN', s.gstin, 'maxlength="15" autocapitalize="characters"')}${f('stIg', 'Instagram handle', s.instagram)}</div></div>
      <div class="card"><h2>GST & numbering</h2><div class="grid g3">
        <div class="field"><label for="stRate">Default GST rate (%)</label><input id="stRate" type="number" value="${num(s.gstRate)}"></div>
        <label class="toggle" style="align-self:end"><input id="stGstOn" type="checkbox" ${s.gstDefault !== false ? 'checked' : ''}> Add GST to new bills by default</label>
        <div class="field"><label for="stNext">Next bill number</label><input id="stNext" type="number" value="${state.nextNo}"><span class="hint">Set this to continue from your paper pad.</span></div></div></div>
      <div class="card"><h2>Terms printed on the bill</h2><div class="field"><label for="stTerms">One term per line</label><textarea id="stTerms" style="min-height:150px">${esc((s.terms || []).join('\n'))}</textarea></div></div>
      <div class="row"><button class="btn primary" data-act="save-settings">${ic('check')} Save settings</button><span class="sp"></span><button class="btn" data-act="logout">${ic('out')} Sign out</button></div>`;
  }

  // ------------------------------------------------------------ events
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, arg = el.dataset.arg;
    if (act === 'modal-back') { if (e.target === el) closeModal(); return; }
    if (act === 'close') return closeModal();
    if (el.tagName === 'A') return; // real links (WhatsApp)
    const d = state.draft;
    switch (act) {
      case 'nav': return go(arg);
      case 'logout': state.draft = null; return Store.signOut();
      case 'open': return openBill(arg);
      case 'print': return printBill(state.byId[arg]);
      case 'wa-share': return openWhatsAppWithMessage(state.byId[arg]);
      case 'download-pdf': return downloadBillPdf(state.byId[arg]);
      case 'confirm-ok': { const fn = state.confirmFn; state.confirmFn = null; closeModal(); return fn && fn(); }
      // new bill
      case 'doctype': d.docType = arg; return render();
      case 'kind': d.vehicle.kind = arg; d.vehicle.tier = tierList(arg)[arg === 'car' ? 1 : 0].key; reprice(); return render();
      case 'tier': d.vehicle.tier = arg; reprice(); return render();
      case 'grp': state.ui.grp = arg; return paintPicker();
      case 'add-svc': {
        const s = svcById(arg), ex = d.items.find((i) => i.serviceId === arg);
        if (ex) ex.qty = num(ex.qty) + 1;
        else d.items.push({ id: U.uid(), serviceId: s.id, name: s.name, desc: s.desc || '', qty: 1, rate: svcPrice(s, d.vehicle.kind, d.vehicle.tier), custom: false, manual: false });
        repaintLines(); return toast(`Added ${s.name}`);
      }
      case 'add-extra': {
        const name = $('#exName').value.trim(), amt = num($('#exAmt').value);
        if (!name) return toast('Type a name for the extra item.');
        if (amt <= 0) return toast('Enter the amount in ₹.');
        d.items.push({ id: U.uid(), serviceId: '', name, desc: '', qty: 1, rate: amt, custom: true, manual: true });
        $('#exName').value = ''; $('#exAmt').value = ''; return repaintLines();
      }
      case 'rm-line': d.items = d.items.filter((i) => i.id !== arg); return repaintLines();
      case 'paid-full': d.received = U.calc(d.items, d.discount, d.gst).total; $('#dRecv').value = d.received; return refreshLive();
      case 'reset-draft': state.draft = newDraft(); return render();
      case 'cancel-edit': state.draft = newDraft(); return go('bills');
      case 'save': return saveBill(false);
      case 'save-print': return saveBill(true);
      // bills
      case 'edit-bill': {
        const b = state.byId[arg]; closeModal();
        state.draft = { ...clone(b), id: b.id, items: b.items.map(itemFromBill), received: b.received || 0, deliveryDate: b.deliveryDate || '', notes: b.notes || '' };
        state.draft.customer = { gstin: '', ...b.customer };
        return go('new');
      }
      case 'del-bill': return confirmBox(`Delete bill #${state.byId[arg].billNo}? This cannot be undone.`, 'Delete bill', async () => {
        try { await Store.deleteBill(arg); delete state.byId[arg]; toast('Bill deleted'); go(state.view); } catch (x) { fail(x); } });
      case 'pay-full': { const b = state.byId[arg]; b.received = b.total; try { await Store.updateBill(b.id, b); toast('Marked as paid'); go(state.view); openBill(b.id); } catch (x) { fail(x); } return; }
      case 'to-invoice': { const b = state.byId[arg]; b.docType = 'Invoice'; try { await Store.updateBill(b.id, b); toast('Converted to invoice'); go(state.view); openBill(b.id); } catch (x) { fail(x); } return; }
      case 'preset': {
        const [key, p] = arg.split(':'), S = state[key === 'list' ? 'list' : 'rep'], pr = pick(p);
        S.preset = p; S.from = pr.from; S.to = pr.to; return go(state.view);
      }
      // rate card
      case 'svc-new': return openSvcModal({ group: arg, name: '', desc: '', unit: '', prices: {} });
      case 'svc-edit': return openSvcModal(clone(svcById(arg)));
      case 'svc-save': {
        const s = readSvcForm(); if (!s.name) return toast('Enter a service name.');
        try { await Store.saveService(s); state.services = await Store.listServices(); closeModal(); toast('Service saved'); render(); } catch (x) { fail(x); } return;
      }
      case 'svc-del': return confirmBox(`Remove “${esc(svcById(arg).name)}” from the rate card? Old bills keep their prices.`, 'Remove', async () => {
        try { await Store.deleteService(arg); state.services = await Store.listServices(); toast('Service removed'); render(); } catch (x) { fail(x); } });
      case 'svc-reset': return confirmBox('Replace the whole rate card with the prices from your Excel file? Any price changes you made will be lost. Old bills are not affected.', 'Restore defaults', async () => {
        try { await Store.clearServices(); await Store.seedServices(SEED.services); state.services = await Store.listServices(); toast('Rate card restored'); render(); } catch (x) { fail(x); } });
      // reports / settings
      case 'export': return exportExcel();
      case 'save-settings': {
        const s = { name: $('#stName').value.trim(), tagline: $('#stTag').value.trim(), address: $('#stAddr').value.trim(), phones: $('#stPh').value.trim(), email: $('#stEmail').value.trim(), gstin: $('#stGstin').value.trim().toUpperCase(), instagram: $('#stIg').value.trim().replace(/^@/, ''), gstRate: num($('#stRate').value) || 18, gstDefault: $('#stGstOn').checked, terms: $('#stTerms').value.split('\n').map((t) => t.trim()).filter(Boolean) };
        try { await Store.saveSettings(s); state.settings = { ...state.settings, ...s }; const n = Math.max(1, Math.floor(num($('#stNext').value))); if (n !== state.nextNo) { await Store.setNextBillNo(n); state.nextNo = n; } toast('Settings saved'); } catch (x) { fail(x); } return;
      }
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'svcSearch') { state.ui.search = t.value; return paintSvcList(); }
    if (t.id === 'billQ') { state.list.q = t.value; $('#billList').innerHTML = filteredBills().map((b) => billRow(b, true)).join('') || '<div class="empty">No bills match.</div>'; return; }
    const d = state.draft;
    if (t.dataset.b && d) { setPath(d, t.dataset.b, t.dataset.n ? num(t.value) : t.value); return refreshLive(); }
    if (t.dataset.li && d) {
      const it = d.items.find((i) => i.id === t.dataset.li), f = t.dataset.lf;
      it[f] = f === 'name' ? t.value : num(t.value);
      if (f === 'rate') it.manual = true;
      return refreshLive();
    }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target, d = state.draft;
    if (t.id === 'billStatus') { state.list.status = t.value; return render(); }
    if (t.dataset.chk && d) { setPath(d, t.dataset.chk, t.checked); return render(); }
    if (t.dataset.range) {
      const [k, f] = t.dataset.range.split('.'), S = state[k === 'list' ? 'list' : 'rep'];
      if (!t.value) return; S[f] = t.value; S.preset = ''; if (S.from > S.to) { if (f === 'from') S.to = S.from; else S.from = S.to; }
      return go(state.view);
    }
    if (t.dataset.price) {
      const [id, key] = t.dataset.price.split('|'), s = svcById(id); if (!s) return;
      s.prices = { ...s.prices, [key]: num(t.value) };
      try { await Store.saveService(s); toast(`${s.name}: ${inr(num(t.value))} saved`); } catch (x) { fail(x); }
      return;
    }
    if (t.dataset.chg === 'svc-group') {
      const cur = readSvcForm(); cur.group = t.value; svcEditing = cur; $('#svcForm').innerHTML = svcForm(cur);
    }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('afterprint', () => { $('#printRoot').innerHTML = ''; });
})();
