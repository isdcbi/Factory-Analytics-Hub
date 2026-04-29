/* ================================================================
   Factory Analytics Hub — Shared Components & State Management
   ================================================================ */

const BPMS = (() => {
  const STORAGE_KEY = 'bpms_state';
  const API_URL     = 'api/state.php';

  const DEFAULT_STATE = {
    dbLine: [
      'Grid Casting','Grid Punching','Ball Mill','Mixing',
      'Pasting Casting','Pasting Punching','Formation',
      'Line 1','Line 2','Line 3','Line 4','Line 5','Line 6','Line 7',
      'Line MCB','Line IB','Line Lithium','Line Charger','Wet A','Wet F',
    ],
    lineProcessData: {},
    dbPCS: [],
    orders: {},
    capacity: {},
    workCalendar: {},
    resumeMB: {},
    mpParams: {
      'Line 1': { std: 2, loader: 1, qc: 1 },
      'Line 2': { std: 2, loader: 1, qc: 1 },
      'Line 3': { std: 2, loader: 1, qc: 1 },
      'Line 4': { std: 2, loader: 1, qc: 1 },
      'Line 5': { std: 2, loader: 1, qc: 1 },
      'Line 6': { std: 2, loader: 1, qc: 1 },
      'Line 7': { std: 2, loader: 1, qc: 1 },
    },
  };

  const NAV_ITEMS = [
    {
      href: 'home.html',
      label: 'Home',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"/></svg>`,
    },
    {
      href: 'dashboard.html',
      label: 'Dashboard',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><rect x="1" y="1" width="6" height="7" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="10" width="6" height="5" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/></svg>`,
    },
    {
      href: 'database-pcs.html',
      label: 'Database PCS',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><ellipse cx="8" cy="4.5" rx="5.5" ry="2"/><path d="M2.5 4.5v2c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-2"/><path d="M2.5 8.5v2c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-2"/></svg>`,
    },
    {
      href: 'database-konversi.html',
      label: 'Database Konversi',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M2 3h5v4H2V3zm7 0h5v4H9V3zm-7 6h5v4H2V9zm7 0h5v4H9V9z" opacity=".25"/><path d="M2 3h5v4H2V3zm7 0h5v4H9V3zm-7 6h5v4H2V9zm7 0h5v4H9V9z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 5h2M7 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    },
    {
      href: 'data-order.html',
      label: 'Data Order',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v8h8V4H4zm1 1h6v1.5H5V5zm0 2.5h6V9H5V7.5zm0 2.5h4v1.5H5V10z"/></svg>`,
    },
    {
      href: 'setting-capacity.html',
      label: 'Setting Kapasitas',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm0 4h10V3H3v3zm3 1H3v6h3V7zm4 0H7v3h3V7zm3 0h-2v6h2V7zm-4 3H7v3h3v-3z"/></svg>`,
    },
    {
      href: 'lvc-analysis.html',
      label: 'LVC Analysis',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M1 14L5 8.5l3 2.5 4-6L15 7V14H1z" opacity=".25"/><path d="M1 14L5 8.5l3 2.5 4-6L15 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    },
    {
      href: 'man-power.html',
      label: 'Man Power',
      icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><circle cx="6" cy="4" r="2.5"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5H1z"/><circle cx="12" cy="5" r="2"/><path d="M10 13c0-2 1.34-3.7 3.2-4.3"/></svg>`,
    },
  ];

  let _state = null;

  // ── State I/O ──────────────────────────────────────────────────

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _state = raw ? JSON.parse(raw) : deepClone(DEFAULT_STATE);
    } catch {
      _state = deepClone(DEFAULT_STATE);
    }
    // Ensure keys exist
    for (const k of Object.keys(DEFAULT_STATE)) {
      if (_state[k] === undefined) _state[k] = deepClone(DEFAULT_STATE[k]);
    }
    return _state;
  }

  function saveStateLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  }

  async function syncFromServer() {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.ok && data.state) {
        _state = data.state;
        for (const k of Object.keys(DEFAULT_STATE)) {
          if (_state[k] === undefined) _state[k] = deepClone(DEFAULT_STATE[k]);
        }
        saveStateLocal();
        return true;
      }
    } catch { /* offline — use localStorage */ }
    return false;
  }

  async function pushToServer() {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: _state }),
      });
      const data = await res.json();
      return data.ok;
    } catch { return false; }
  }

  async function saveState() {
    saveStateLocal();
    return pushToServer();
  }

  function getState()       { return _state; }
  function setState(s)      { _state = s; }
  function deepClone(obj)   { return JSON.parse(JSON.stringify(obj)); }

  // ── Sidebar HTML ───────────────────────────────────────────────

  function renderSidebar() {
    const current    = location.pathname.split('/').pop() || 'index.html';
    const collapsed  = localStorage.getItem('bpms_sidebar') === 'collapsed';

    const items = NAV_ITEMS.map(({ href, label, icon }) => {
      const active = (current === href) || (!current && href === 'home.html');
      return `<a href="${href}" class="nav-item${active ? ' active' : ''}" data-label="${label}">
        ${icon}
        <span class="nav-label">${label}</span>
      </a>`;
    }).join('');

    return `
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar${collapsed ? ' collapsed' : ''}" id="sidebar">
        <div class="sidebar-header" title="${collapsed ? 'Klik untuk expand' : ''}">
          <img src="Logo FAH.png" class="sidebar-logo" alt="FAH">
          <div class="sidebar-brand">
            <span class="sidebar-title">Factory Analytics Hub</span>
            <span class="sidebar-sub">Turning Data into Decisions</span>
          </div>
          <button class="sidebar-toggle" id="sidebarToggle" title="Tutup sidebar">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M10 3L6 8l4 5"/>
            </svg>
          </button>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-label">Navigasi</div>
          ${items}
        </nav>
        <div class="sidebar-footer">
          <div class="server-status" id="serverStatus">
            <span class="status-dot checking" id="statusDot"></span>
            <div class="status-info">
              <span class="status-label" id="statusLabel">Memeriksa...</span>
              <span class="status-sublabel" id="statusSub">Server API</span>
            </div>
          </div>
        </div>
      </aside>`;
  }

  function renderTopbar(title, actions = '') {
    return `
      <div class="topbar">
        <button class="hamburger-btn" id="hamburgerBtn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 3h14v1.5H1V3zm0 4.5h14V9H1V7.5zm0 4.5h14v1.5H1V12z"/>
          </svg>
        </button>
        <span class="topbar-title">${title}</span>
        <div class="topbar-actions">${actions}</div>
      </div>`;
  }

  function initSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const toggle    = document.getElementById('sidebarToggle');
    const header    = sidebar?.querySelector('.sidebar-header');
    const hamburger = document.getElementById('hamburgerBtn');
    const overlay   = document.getElementById('sidebarOverlay');

    function collapse() {
      sidebar.classList.add('collapsed');
      localStorage.setItem('bpms_sidebar', 'collapsed');
    }
    function expand() {
      sidebar.classList.remove('collapsed');
      localStorage.setItem('bpms_sidebar', '');
    }

    // Toggle button: collapse when expanded
    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      collapse();
    });

    // Clicking the header when collapsed → expand
    header?.addEventListener('click', () => {
      if (sidebar.classList.contains('collapsed')) expand();
    });

    // Mobile hamburger
    hamburger?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });

    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // ── Server Status ──────────────────────────────────────────────

  let _statusInterval = null;

  async function checkServerStatus() {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    const sub   = document.getElementById('statusSub');
    if (!dot) return;

    dot.className = 'status-dot checking';
    if (label) label.textContent = 'Memeriksa...';

    try {
      const t0  = performance.now();
      const res = await fetch(API_URL + '?ping=1', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      const ms  = Math.round(performance.now() - t0);

      if (res.ok) {
        dot.className = 'status-dot online';
        if (label) label.textContent = 'Server Online';
        if (sub)   sub.textContent   = `Ping ${ms} ms · ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch (err) {
      dot.className = 'status-dot offline';
      if (label) label.textContent = 'Server Offline';
      if (sub)   sub.textContent   = 'Mode lokal aktif';
    }
  }

  function initServerStatus() {
    checkServerStatus();
    _statusInterval = setInterval(checkServerStatus, 30_000);
  }

  // ── Toast ──────────────────────────────────────────────────────

  function toast(msg, type = 'info', ms = 3000) {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = Object.assign(document.createElement('div'), { id: 'toastContainer', className: 'toast-container' });
      document.body.appendChild(c);
    }
    const iconMap = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${iconMap[type] || '•'}</span><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(110%)';
      setTimeout(() => el.remove(), 320);
    }, ms);
  }

  function showLoading() {
    let el = document.getElementById('loadingOverlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loadingOverlay';
      el.className = 'loading-overlay';
      el.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  }

  function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'none';
  }

  // ── Period helpers ─────────────────────────────────────────────

  function getPeriods() {
    const all = new Set([
      ...Object.keys(_state?.orders || {}),
      ...Object.keys(_state?.capacity || {}),
      ...Object.keys(_state?.workCalendar || {}),
    ]);
    return [...all].sort().reverse();
  }

  function getCurrentPeriod() {
    const periods = getPeriods();
    if (periods.length) return periods[0];
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function formatPeriod(p) {
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const [y, m] = p.split('-');
    return `${months[parseInt(m)-1]} ${y}`;
  }

  // ── Item String Parsing (PRD §4.3 CRITICAL) ────────────────────

  const TECH_MAP = { C:'Conventional', H:'Hybrid', M:'MF', V:'MF' };
  const SEP_MAP  = { P:'PE', F:'Phenolyc', L:'Linter', A:'AGM', G:'Glassmat', R:'Rubber' };

  function parseItemString(item) {
    if (!item || item.length < 8) return null;
    const s = String(item).trim();

    const tech      = TECH_MAP[s[3]] || s[3] || '';
    const separator = SEP_MAP[s[5]]  || s[5] || '';

    let battType = s.substring(7, 14).trim();
    if (battType.toUpperCase().endsWith('X')) battType = battType.slice(0, -1).trim();

    let plate = '';
    if (s.length >= 17) {
      const p1 = s[15], p2 = s[16] || '';
      plate = /[A-Za-z]/.test(p1)
        ? String(p1.toUpperCase().charCodeAt(0) - 65) + p2
        : p1 + p2;
    }

    return { tech, separator, battType, plate };
  }

  // ── Capacity calculation ────────────────────────────────────────

  function shiftMinutes(cfg) {
    return (cfg?.s1 ? 435 : 0) + (cfg?.s2 ? 405 : 0) + (cfg?.s3 ? 370 : 0);
  }

  function getWorkDayCount(period) {
    const cal = _state?.workCalendar?.[period] || {};
    return Object.values(cal).filter(v => v === true).length;
  }

  function getCapacityHours(period, line) {
    const cfg = _state?.capacity?.[period]?.[line] || { s1: true, s2: true, s3: false };
    const mins = shiftMinutes(cfg);
    const days = getWorkDayCount(period);
    return (mins * days) / 60;
  }

  // ── PCS lookup ─────────────────────────────────────────────────

  function findPCSMatches(battType, tech, plate, separator) {
    return (_state?.dbPCS || []).filter(p => {
      const bt = (p.batteryType || '').toUpperCase().trim();
      return bt === battType.toUpperCase().trim();
    });
  }

  // ── LVC core calculation ────────────────────────────────────────

  function calcLVC(period) {
    const orders  = _state?.orders?.[period] || [];
    const pcsData = _state?.dbPCS || [];

    // Map: line -> { processingHours, qty, unmapped }
    const lineMap = {};
    const unmapped = [];

    for (const ord of orders) {
      const parsed = ord._parsed || parseItemString(ord.item);
      if (!parsed) { unmapped.push(ord); continue; }

      const matches = findPCSMatches(parsed.battType, parsed.tech, parsed.plate, parsed.separator);
      if (!matches.length) { unmapped.push(ord); continue; }

      // Use 1st-line mapping
      const pcs = matches[0];
      const lines = [];
      if (pcs.line1) lines.push({ line: pcs.line1, ct: Number(pcs.ct1) || 0 });
      if (pcs.line2) lines.push({ line: pcs.line2, ct: Number(pcs.ct2) || 0 });

      for (const { line, ct } of lines) {
        if (!line || !ct) continue;
        if (!lineMap[line]) lineMap[line] = { processingHours: 0, qty: 0 };
        const hrs = (ord.qty * ct) / 3600;
        lineMap[line].processingHours += hrs;
        lineMap[line].qty += ord.qty;
      }
    }

    const results = (_state?.dbLine || []).map(line => {
      const capHours = getCapacityHours(period, line);
      const ph       = lineMap[line]?.processingHours || 0;
      const loading  = capHours > 0 ? (ph / capHours) * 100 : 0;
      const status   = loading > 100 ? 'OVERLOADED' : loading > 85 ? 'WARNING' : 'OK';
      return { line, processingHours: ph, capacityHours: capHours, loading, status, qty: lineMap[line]?.qty || 0 };
    });

    return { results, unmapped };
  }

  // ── Calendar init ───────────────────────────────────────────────

  const HOLIDAYS_2026 = {
    '2026-01-01':'Tahun Baru Masehi',
    '2026-01-27':'Tahun Baru Imlek',
    '2026-01-28':'Cuti Bersama Imlek',
    '2026-03-28':'Idul Fitri 1447 H (1)',
    '2026-03-29':'Idul Fitri 1447 H (2)',
    '2026-03-30':'Cuti Bersama Idul Fitri',
    '2026-03-31':'Cuti Bersama Idul Fitri',
    '2026-04-02':'Wafat Isa Al Masih',
    '2026-04-13':'Isra Mi\'raj',
    '2026-05-01':'Hari Buruh',
    '2026-05-14':'Kenaikan Isa Al Masih',
    '2026-05-29':'Hari Raya Waisak',
    '2026-06-01':'Hari Lahir Pancasila',
    '2026-06-06':'Idul Adha 1447 H',
    '2026-06-26':'Tahun Baru Islam 1448 H',
    '2026-08-17':'Hari Kemerdekaan RI',
    '2026-09-04':'Maulid Nabi Muhammad SAW',
    '2026-12-25':'Hari Raya Natal',
    '2026-12-26':'Cuti Bersama Natal',
  };

  function initCalendarForPeriod(period) {
    if (_state.workCalendar[period]) return; // already exists

    const [y, m] = period.split('-').map(Number);
    const days   = new Date(y, m, 0).getDate();
    const cal    = {};

    for (let d = 1; d <= days; d++) {
      const ds  = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(y, m-1, d).getDay(); // 0=Sun
      const isWeekend = dow === 0 || dow === 6;
      cal[ds] = !isWeekend && !HOLIDAYS_2026[ds];
    }

    _state.workCalendar[period] = cal;
  }

  function defaultShift(line) {
    return line === 'Formation'
      ? { s1: true, s2: false, s3: false }
      : { s1: true, s2: true,  s3: true  };
  }

  function initCapacityForPeriod(period) {
    if (_state.capacity[period]) return;
    _state.capacity[period] = {};
    for (const line of (_state.dbLine || [])) {
      _state.capacity[period][line] = defaultShift(line);
    }
  }

  // ── PCS auto-calc ───────────────────────────────────────────────

  function calcPCSFields(ct) {
    ct = Number(ct);
    if (!ct || ct <= 0) return {};
    return {
      battH: Math.round(3600 / ct),
      s1:    Math.round((435 * 60) / ct),
      s2:    Math.round((405 * 60) / ct),
      s3:    Math.round((370 * 60) / ct),
      total: Math.round((435 * 60) / ct) + Math.round((405 * 60) / ct) + Math.round((370 * 60) / ct),
    };
  }

  // ── Number formatting ───────────────────────────────────────────

  function fmtNum(n, dec = 1) {
    return typeof n === 'number' && !isNaN(n) ? n.toFixed(dec) : '—';
  }
  function fmtInt(n) {
    return typeof n === 'number' && !isNaN(n) ? Math.round(n).toLocaleString() : '—';
  }

  return {
    loadState, saveState, saveStateLocal, syncFromServer, pushToServer,
    getState, setState, deepClone,
    renderSidebar, renderTopbar, initSidebar, initServerStatus, checkServerStatus,
    toast, showLoading, hideLoading,
    getPeriods, getCurrentPeriod, formatPeriod,
    parseItemString, findPCSMatches, calcLVC,
    shiftMinutes, getWorkDayCount, getCapacityHours,
    initCalendarForPeriod, initCapacityForPeriod, calcPCSFields,
    HOLIDAYS_2026,
    fmtNum, fmtInt,
    DEFAULT_STATE,
  };
})();

// ── Boot ────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  BPMS.loadState();

  const mount = document.getElementById('sidebarMount');
  if (mount) mount.innerHTML = BPMS.renderSidebar();

  BPMS.initSidebar();
  BPMS.initServerStatus();

  BPMS.showLoading();
  await BPMS.syncFromServer();
  BPMS.hideLoading();

  if (typeof pageInit === 'function') pageInit();
});
