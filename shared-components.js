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
    produksiInfor: {},
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

  const NAV_HOME = {
    href: 'home.html',
    label: 'Home',
    icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"/></svg>`,
  };

  const NAV_GROUPS = [
    {
      label: 'Database',
      items: [
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
      ],
    },
    {
      label: 'LVC',
      items: [
        {
          href: 'dashboard.html',
          label: 'Dashboard',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><rect x="1" y="1" width="6" height="7" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="10" width="6" height="5" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/></svg>`,
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
          href: 'capacity-planning.html',
          label: 'Capacity Planning',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M2 14V8h2.5v6H2zm4.75 0V4h2.5v10h-2.5zm4.75 0V6H14v8h-2.5z"/></svg>`,
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
      ],
    },
    {
      label: 'Parameter Asumsi',
      items: [
        {
          href: 'pa-dashboard.html',
          label: 'Dashboard',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><rect x="1" y="1" width="6" height="7" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="10" width="6" height="5" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/></svg>`,
        },
        {
          href: 'resume.html',
          label: 'Resume',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M3 1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm1 2v10h8V3H4zm1 2h6v1.5H5V5zm0 2.5h6V9H5V7.5zm0 2.5h4v1.5H5V10z"/></svg>`,
        },
        {
          href: 'data-produksi-infor.html',
          label: 'Data Produksi Infor',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M1 11h3V6H1v5zm4 2h3V3H5v10zm4-6h3v6H9V7zm-8 6h14v1.5H1V13z" opacity=".8"/></svg>`,
        },
        {
          href: 'data-produksi-baan.html',
          label: 'Data Produksi BaaN',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M1 11h3V6H1v5zm4 2h3V3H5v10zm4-6h3v6H9V7zm-8 6h14v1.5H1V13z" opacity=".8"/><circle cx="13" cy="4" r="2.5" fill="var(--accent)" opacity=".6"/></svg>`,
        },
      ],
    },
    {
      // Satu halaman (standardized-work.html) dengan view per hash; menu aktif diatur sw/app.js.
      label: 'Standardized Work',
      items: [
        {
          href: 'standardized-work.html#home',
          label: 'Dashboard',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><rect x="1" y="1" width="6" height="7" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="10" width="6" height="5" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/></svg>`,
        },
        {
          href: 'standardized-work.html#observasi',
          label: 'Lembar Observasi',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M5 1h6v2H5z"/><path d="M3 2h1.5v1.5h7V2H13a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 4.5v1.5h6V6.5H5zm0 3v1.5h6V9.5H5zm0 3V14h4v-1.5H5z"/></svg>`,
        },
        {
          href: 'standardized-work.html#data-observasi',
          label: 'Data Observasi',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><ellipse cx="8" cy="4.5" rx="5.5" ry="2"/><path d="M2.5 4.5v2c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-2"/><path d="M2.5 8.5v2c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-2"/></svg>`,
        },
        {
          href: 'standardized-work.html#tskk',
          label: 'TSKK',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M2 2h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1zm0 1.5V6h4.5V3.5H2zm0 4V13h4.5V7.5H2zM8 3.5v9.5h6V3.5H8z" opacity=".35"/><path d="M8.5 5h3.5v1.2H8.5zM9.5 7.5h3.5v1.2H9.5zM10.5 10h3v1.2h-3z"/></svg>`,
        },
        {
          href: 'standardized-work.html#tsk',
          label: 'TSK',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><rect x="1" y="2" width="5" height="4" rx="1"/><rect x="10" y="2" width="5" height="4" rx="1"/><rect x="5.5" y="10" width="5" height="4" rx="1"/><path d="M6 4h4M12.5 6v2.5L9 10.5M3.5 6v2.5L7 10.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
        },
        {
          href: 'standardized-work.html#tskp',
          label: 'TSKP',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M2 14V8h2.5v6H2zm4.75 0V4h2.5v10h-2.5zm4.75 0V6H14v8h-2.5z"/></svg>`,
        },
        {
          href: 'standardized-work.html#yamazumi',
          label: 'Yamazumi',
          icon: `<svg viewBox="0 0 16 16" fill="currentColor" class="nav-icon"><path d="M2 9h3v5H2zM2 5h3v3.2H2z"/><path d="M6.5 7h3v7h-3zM6.5 2h3v4.2h-3z" opacity=".7"/><path d="M11 10h3v4h-3zM11 6h3v3.2h-3z"/><path d="M1 4.5h14" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/></svg>`,
        },
      ],
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
    const current   = location.pathname.split('/').pop() || 'index.html';
    const collapsed = localStorage.getItem('bpms_sidebar') === 'collapsed';

    function navItem({ href, label, icon }) {
      const active = (current === href) || (!current && href === 'home.html');
      return `<a href="${href}" class="nav-item${active ? ' active' : ''}" data-label="${label}">
        ${icon}
        <span class="nav-label">${label}</span>
      </a>`;
    }

    const homeHtml = navItem(NAV_HOME);

    const groupsHtml = NAV_GROUPS.map(g => `
      <div class="nav-section-label">${g.label}</div>
      ${g.items.map(navItem).join('')}
    `).join('');

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
          ${homeHtml}
          ${groupsHtml}
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
    // Libur Nasional
    '2026-01-01': 'Tahun Baru Masehi',
    '2026-01-16': 'Isra Mi\'raj Nabi Muhammad',
    '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
    '2026-03-19': 'Hari Raya Nyepi Tahun Baru Saka 1948',
    '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
    '2026-03-22': 'Hari Raya Idul Fitri 1447 H (2)',
    '2026-04-03': 'Wafat Isa Al Masih',
    '2026-04-05': 'Hari Paskah',
    '2026-05-01': 'Hari Buruh',
    '2026-05-14': 'Kenaikan Isa Al Masih',
    '2026-05-27': 'Hari Raya Idul Adha 1447 H',
    '2026-05-31': 'Hari Raya Waisak 2570 BE',
    '2026-06-01': 'Hari Lahir Pancasila',
    '2026-06-16': 'Tahun Baru Islam 1448 H',
    '2026-08-17': 'Hari Kemerdekaan RI',
    '2026-08-25': 'Maulid Nabi',
    '2026-12-25': 'Hari Raya Natal',
    // Cuti Bersama
    '2026-02-16': 'Cuti Bersama (Imlek)',
    '2026-03-20': 'Cuti Bersama (Idul Fitri)',
    '2026-03-23': 'Cuti Bersama (Idul Fitri)',
    '2026-03-24': 'Cuti Bersama (Idul Fitri)',
    '2026-05-15': 'Cuti Bersama (Kenaikan Isa Al Masih)',
    // Libur dengan Penggantian
    '2026-01-02': 'Libur dengan Penggantian',
    '2026-03-18': 'Libur dengan Penggantian',
    '2026-03-25': 'Libur dengan Penggantian',
    '2026-06-15': 'Libur dengan Penggantian',
    '2026-08-24': 'Libur dengan Penggantian',
    '2026-10-09': 'Libur dengan Penggantian',
    '2026-12-31': 'Libur dengan Penggantian',
  };

  // Sabtu yang menjadi hari kerja pengganti
  const WORKING_DAYS_2026 = new Set([
    '2026-01-10', // Hari Kerja Pengganti
    '2026-02-14', // Hari Kerja Pengganti
    '2026-03-28', // Hari Kerja Pengganti
    '2026-05-09', // Hari Kerja Pengganti
    '2026-05-30', // Hari Kerja Pengganti
    '2026-06-20', // Hari Kerja Pengganti
    '2026-08-29', // Hari Kerja Pengganti
  ]);

  function initCalendarForPeriod(period) {
    if (_state.workCalendar[period]) return; // already exists

    const [y, m] = period.split('-').map(Number);
    const days   = new Date(y, m, 0).getDate();
    const cal    = {};

    for (let d = 1; d <= days; d++) {
      const ds  = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(y, m-1, d).getDay(); // 0=Sun
      const isWeekend = dow === 0 || dow === 6;
      cal[ds] = (!isWeekend || WORKING_DAYS_2026.has(ds)) && !HOLIDAYS_2026[ds];
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

  // ── Data Produksi: loader terpusat + cache agregat ──────────────
  // Dipakai resume.html & pa-dashboard.html. Alur:
  //   1. Cek versi data di server (3 request kecil).
  //   2. Versi sama dengan cache localStorage → pakai agregat cache (instan).
  //   3. Versi beda / force → download semua periode, agregasi single-pass,
  //      simpan agregat + versi ke localStorage, raw rows ke IndexedDB.
  //   4. Server mati → pakai cache apa pun yang ada, atau hitung dari IndexedDB.

  // Naikkan angka versi key ini setiap kali LOGIKA agregasi berubah,
  // agar cache lama otomatis diabaikan (v3: + series & type plate untuk Summary Order)
  const AGG_CACHE_KEY = 'bpms_agg_cache_v4';
  const PROD_CAT_MAP  = { D: 'DRY', W: 'WET', U: 'DUC' };

  function prodDB(dbName) {
    const STORE = 'periods';
    function open() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
      });
    }
    return {
      async getPeriods() {
        const db = await open();
        return new Promise((resolve, reject) => {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
          req.onsuccess = e => resolve(e.target.result || []);
          req.onerror   = e => reject(e.target.error);
        });
      },
      async getData(period) {
        const db = await open();
        return new Promise((resolve, reject) => {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(period);
          req.onsuccess = e => resolve(e.target.result || []);
          req.onerror   = e => reject(e.target.error);
        });
      },
      async setData(period, rows) {
        const db = await open();
        return new Promise((resolve, reject) => {
          const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(rows, period);
          req.onsuccess = () => resolve(true);
          req.onerror   = () => reject(req.error);
        });
      },
    };
  }
  const ProdInforDB = prodDB('bpms_produksi_infor');
  const ProdBaanDB  = prodDB('bpms_produksi_baan');

  function prodFindColKey(rowSample, ...patterns) {
    const keys = Object.keys(rowSample);
    for (const pat of patterns) {
      const k = keys.find(k => k.trim().toLowerCase() === pat.toLowerCase());
      if (k) return k;
    }
    for (const pat of patterns) {
      const k = keys.find(k => k.trim().toLowerCase().includes(pat.toLowerCase()));
      if (k) return k;
    }
    return null;
  }

  function prodBuildLookupMaps() {
    const state = _state || {};

    const plateMap = new Map();
    const plateRows = state.dbPlateInfor || [];
    if (plateRows.length) {
      const s    = plateRows[0];
      const vals = Object.keys(s);
      const kKey = prodFindColKey(s, 'Item Data Infor', 'ItemDataInfor') || vals[1];
      const kPnP = prodFindColKey(s, 'PN Plate Positif', 'PN Positif')   || vals[2];
      const kQtP = prodFindColKey(s, 'Qty Plate Positif', 'Qty Positif') || vals[3];
      const kPnN = prodFindColKey(s, 'PN Plate Negatif', 'PN Negatif')   || vals[4];
      const kQtN = prodFindColKey(s, 'Qty Plate Negatif', 'Qty Negatif') || vals[5];
      plateRows.forEach(row => {
        const key = String(row[kKey] ?? '').trim();
        if (!key) return;
        plateMap.set(key, {
          pnPos : String(row[kPnP] ?? ''),
          qtyPos: Number(row[kQtP]) || 0,
          pnNeg : String(row[kPnN] ?? ''),
          qtyNeg: Number(row[kQtN]) || 0,
        });
      });
    }

    const typeMap = new Map();
    const typeRows = state.dbTypePlate || [];
    if (typeRows.length) {
      const s     = typeRows[0];
      const vals  = Object.keys(s);
      const kCode = prodFindColKey(s, 'Type Plate', 'Code') || vals[2];
      const kGrid = prodFindColKey(s, 'Grid Process', 'Grid') || vals[3];
      typeRows.forEach(row => {
        const key = String(row[kCode] ?? '').trim();
        if (key) typeMap.set(key, String(row[kGrid] ?? ''));
      });
    }

    const puLeMap = new Map();
    const puLeRows = state.dbPuLe || [];
    if (puLeRows.length) {
      const s      = puLeRows[0];
      const vals   = Object.keys(s);
      const kPN    = prodFindColKey(s, 'PN Plate Infor', 'PN Plate', 'PN') || vals[2];
      const kRatio = prodFindColKey(s, 'Qty Pule/Plate (kg)', 'Qty Pule/Plate', 'Qty Pule') || vals[4];
      puLeRows.forEach(row => {
        const key = String(row[kPN] ?? '').trim();
        if (key) puLeMap.set(key, Number(row[kRatio]) || 0);
      });
    }

    return { plateMap, typeMap, puLeMap };
  }

  function prodPuleKey(pn) {
    return pn.charAt(2) === 'F' ? 'W-UNPL-' + pn.substring(7) : pn;
  }

  function prodGridFromPN(pn) {
    if (!pn) return '';
    const parts = pn.split('-');
    if (parts.length < 3) return '';
    const c = parts[2].charAt(0);
    if (c === 'W') return 'Grid Punching';
    if (c === 'C' || c === 'D') return 'Grid Casting';
    return 'Calcium Casting';
  }

  function prodComputeRow(r, maps) {
    const { plateMap, typeMap, puLeMap } = maps;
    const item = r.item || '';
    const qty  = r.qty  || 0;
    const code = item.charAt(4);
    let itemBattery = item;
    if (item.charAt(0) === 'W') {
      const c = item.split('');
      c[0] = 'F'; c[4] = 'W';
      itemBattery = c.join('');
    }
    const codeBattery = itemBattery.substring(2, 19);
    // Category dari itemBattery (setelah konversi W→F, U→W)
    const category = PROD_CAT_MAP[itemBattery.charAt(4)] || '';
    // Battery Type: segmen ke-3 itemBattery (untuk lookup series New JIS)
    const battType = itemBattery.split('-')[2] || '';
    const year     = r.trxDate ? String(r.trxDate).slice(-4) : '';
    const wo       = String(r.orderNo || '').substring(0, 4);
    const pv    = plateMap.get(codeBattery) || {};
    const pnPos = pv.pnPos  || '';
    const qpPos = (pv.qtyPos || 0) * qty;
    const pnNeg = pv.pnNeg  || '';
    const qpNeg = (pv.qtyNeg || 0) * qty;
    // Type plate: MID(PN Plate, 8, 4) — mis. CG87 (juga key lookup Grid Process)
    const platePos = pnPos.substring(7, 11);
    const plateNeg = pnNeg.substring(7, 11);
    const gridPos = typeMap.get(platePos) || prodGridFromPN(pnPos);
    const gridNeg = typeMap.get(plateNeg) || prodGridFromPN(pnNeg);
    const qPulePos = Math.round((puLeMap.get(prodPuleKey(pnPos)) || 0) * qpPos);
    const qPuleNeg = Math.round((puLeMap.get(prodPuleKey(pnNeg)) || 0) * qpNeg);
    // Form Status: segmen ke-2 PN Plate (FOPL = sudah formation / UNPL = belum)
    const formStatusPos = pnPos ? (pnPos.split('-')[1] || '') : '';
    const formStatusNeg = pnNeg ? (pnNeg.split('-')[1] || '') : '';
    return { wo, code, category, battType, year,
             gridPos, qpPos, qPulePos, formStatusPos, platePos,
             gridNeg, qpNeg, qPuleNeg, formStatusNeg, plateNeg };
  }

  /* Lookup Battery Type → Series (aturan conversion-rules.md):
     exact → buang padding 'X' → rule type terpanjang yang terkandung → LAINNYA.
     Butuh window.NEW_JIS_SERIES_DATA (sertakan new_jis_series_data.js di halaman). */
  function prodSeriesLookup() {
    const rules = (window.NEW_JIS_SERIES_DATA || [])
      .map(r => ({ type: String(r.type || '').trim().toUpperCase(), series: String(r.series || '').trim() }))
      .filter(r => r.type && r.series);
    const exact = new Map(rules.map(r => [r.type, r.series]));
    const byLen = rules.slice().sort((a, b) => b.type.length - a.type.length);
    const cache = new Map();
    return function seriesOf(battTypeRaw) {
      const t = String(battTypeRaw || '').trim().toUpperCase();
      if (!t) return 'LAINNYA';
      if (cache.has(t)) return cache.get(t);
      let s = exact.get(t);
      if (!s && t.endsWith('X')) s = exact.get(t.slice(0, -1));
      if (!s) {
        const hit = byLen.find(r => t.includes(r.type));
        s = hit ? hit.series : '';
      }
      s = s || 'LAINNYA';
      cache.set(t, s);
      return s;
    };
  }

  // Agregasi single-pass: satu loop per sumber data, semua metrik sekaligus
  function prodAggregate(inforRows, baanRows) {
    const maps     = prodBuildLookupMaps();
    const seriesOf = prodSeriesLookup();
    const years  = {};
    const series = {};  // series battery → total qty produksi (semua tahun)
    const plate  = {};  // type plate (mis. CG87) → total qty plate + dan − (semua tahun)
    // addSeries/addPlate mengisi total semua-tahun DAN breakdown per-tahun (a.series/a.plate) sekaligus,
    // supaya tab Summary Order bisa difilter per tahun tanpa agregasi ulang.
    const addSeries = (a, s, q) => {
      if (!q) return;
      series[s] = (series[s] || 0) + q;
      if (a) a.series[s] = (a.series[s] || 0) + q;
    };
    const addPlate = (a, tp, q) => {
      if (!tp || !q) return;
      plate[tp] = (plate[tp] || 0) + q;
      if (a) a.plate[tp] = (a.plate[tp] || 0) + q;
    };
    const get = y => (years[y] = years[y] || {
      asm: 0, gcPos: 0, gcNeg: 0, gpPos: 0, gpNeg: 0,
      bmPos: 0, bmNeg: 0, fmPos: 0, fmNeg: 0,
      cat: { DRY: 0, WET: 0, DUC: 0 },
      series: {}, plate: {},
    });

    for (const r of inforRows) {
      const g = prodComputeRow(r, maps);
      if (g.wo !== 'PKAB' && g.wo !== 'PKAS') continue;
      if (!/^\d{4}$/.test(g.year)) continue;
      const a = get(g.year);
      a.asm += Number(r.qty) || 0;
      if (g.gridPos === 'Grid Casting')  a.gcPos += g.qpPos;
      if (g.gridNeg === 'Grid Casting')  a.gcNeg += g.qpNeg;
      if (g.gridPos === 'Grid Punching') a.gpPos += g.qpPos;
      if (g.gridNeg === 'Grid Punching') a.gpNeg += g.qpNeg;
      a.bmPos += g.qPulePos || 0;
      a.bmNeg += g.qPuleNeg || 0;
      // Formation: plate yang sudah melewati formation (Form Status = FOPL)
      if (g.formStatusPos === 'FOPL') a.fmPos += g.qpPos;
      if (g.formStatusNeg === 'FOPL') a.fmNeg += g.qpNeg;
      if (a.cat[g.category] !== undefined) a.cat[g.category] += Number(r.qty) || 0;
      // Series battery & type plate (untuk tab Summary Order)
      addSeries(a, seriesOf(g.battType), Number(r.qty) || 0);
      addPlate(a, g.platePos, g.qpPos);
      addPlate(a, g.plateNeg, g.qpNeg);
    }

    for (const r of baanRows) {
      const y = String(r.year || '');
      if (!/^\d{4}$/.test(y)) continue;
      const a = get(y);
      a.asm += Number(r.qtyProduksi) || 0;
      if (r.gridPos === 'Grid Casting')  a.gcPos += Number(r.qpPos) || 0;
      if (r.gridNeg === 'Grid Casting')  a.gcNeg += Number(r.qpNeg) || 0;
      if (r.gridPos === 'Grid Punching') a.gpPos += Number(r.qpPos) || 0;
      if (r.gridNeg === 'Grid Punching') a.gpNeg += Number(r.qpNeg) || 0;
      a.bmPos += Number(r.qPulePos) || 0;
      a.bmNeg += Number(r.qPuleNeg) || 0;
      // Formation: Form Status (+)/(-) = FOPL
      if (String(r.formStatusPos || '').trim().toUpperCase() === 'FOPL') a.fmPos += Number(r.qpPos) || 0;
      if (String(r.formStatusNeg || '').trim().toUpperCase() === 'FOPL') a.fmNeg += Number(r.qpNeg) || 0;
      const cat = String(r.category || '').trim().toUpperCase() || PROD_CAT_MAP[r.code];
      if (a.cat[cat] !== undefined) a.cat[cat] += Number(r.qtyProduksi) || 0;
      // Series battery & type plate (untuk tab Summary Order)
      const bt = r.batteryType || String(r.itemBattery || '').split('-')[2];
      addSeries(a, seriesOf(bt), Number(r.qtyProduksi) || 0);
      addPlate(a, String(r.pnPos || '').substring(7, 11), Number(r.qpPos) || 0);
      addPlate(a, String(r.pnNeg || '').substring(7, 11), Number(r.qpNeg) || 0);
    }

    return { years, series, plate };
  }

  async function prodFetchVersion() {
    const get = async url => {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('server');
      const j = await r.json();
      if (!j.ok) throw new Error('bad response');
      return j;
    };
    const [pi, pb, st] = await Promise.all([
      get('api/produksi-infor.php'),
      get('api/produksi-baan.php'),
      get('api/state.php?version=1'),
    ]);
    return {
      version: `${pi.version || ''}|${pb.version || ''}|${st.version || ''}`,
      inforPeriods: pi.periods || [],
      baanPeriods:  pb.periods || [],
    };
  }

  async function loadProdAggregates(opts = {}) {
    const force = !!opts.force;

    // 1. Cek versi data di server (murah)
    let ver = null;
    try { ver = await prodFetchVersion(); } catch (_) { ver = null; }

    // 2. Cache hit → langsung pakai (tanpa download & hitung ulang)
    if (ver && !force) {
      try {
        const c = JSON.parse(localStorage.getItem(AGG_CACHE_KEY) || 'null');
        if (c && c.version === ver.version && c.years) {
          return { years: c.years, series: c.series || {}, plate: c.plate || {},
                   meta: c.meta || {}, fromCache: true, offline: false };
        }
      } catch (_) {}
    }

    // 3. Server tidak terjangkau → cache apa pun yang ada, atau hitung dari IndexedDB
    if (!ver) {
      try {
        const c = JSON.parse(localStorage.getItem(AGG_CACHE_KEY) || 'null');
        if (c && c.years) return { years: c.years, series: c.series || {}, plate: c.plate || {},
                                   meta: c.meta || {}, fromCache: true, offline: true };
      } catch (_) {}
      const [ip, bp] = await Promise.all([
        ProdInforDB.getPeriods().catch(() => []),
        ProdBaanDB.getPeriods().catch(() => []),
      ]);
      const [inforRows, baanRows] = await Promise.all([
        Promise.all(ip.map(p => ProdInforDB.getData(p).catch(() => []))).then(r => r.flat()),
        Promise.all(bp.map(p => ProdBaanDB.getData(p).catch(() => []))).then(r => r.flat()),
      ]);
      const agg  = prodAggregate(inforRows, baanRows);
      const meta = { inforCount: inforRows.length, inforPeriods: ip.length,
                     baanCount: baanRows.length, computedAt: new Date().toISOString() };
      return { years: agg.years, series: agg.series, plate: agg.plate, meta, fromCache: false, offline: true };
    }

    // 4. Full load dari server; raw rows di-cache ke IndexedDB sebagai fallback offline
    const fetchPeriod = async (url, db, p) => {
      try {
        const r = await fetch(`${url}?period=${p}`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          if (j.ok && Array.isArray(j.data) && j.data.length) {
            try { await db.setData(p, j.data); } catch (_) {}
            return j.data;
          }
        }
      } catch (_) {}
      try {
        const cached = await db.getData(p);
        if (cached && cached.length) return cached;
      } catch (_) {}
      return [];
    };
    const [inforRows, baanRows] = await Promise.all([
      Promise.all(ver.inforPeriods.map(p => fetchPeriod('api/produksi-infor.php', ProdInforDB, p))).then(r => r.flat()),
      Promise.all(ver.baanPeriods.map(p => fetchPeriod('api/produksi-baan.php', ProdBaanDB, p))).then(r => r.flat()),
    ]);
    const agg  = prodAggregate(inforRows, baanRows);
    const meta = { inforCount: inforRows.length, inforPeriods: ver.inforPeriods.length,
                   baanCount: baanRows.length, computedAt: new Date().toISOString() };
    try {
      localStorage.setItem(AGG_CACHE_KEY, JSON.stringify({
        version: ver.version, years: agg.years, series: agg.series, plate: agg.plate, meta,
      }));
    } catch (_) {}
    return { years: agg.years, series: agg.series, plate: agg.plate, meta, fromCache: false, offline: false };
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
    loadProdAggregates, buildProdLookupMaps: prodBuildLookupMaps, prodDB,
    parseItemString, findPCSMatches, calcLVC,
    shiftMinutes, getWorkDayCount, getCapacityHours,
    initCalendarForPeriod, initCapacityForPeriod, calcPCSFields,
    HOLIDAYS_2026, WORKING_DAYS_2026,
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

  // Halaman dengan penyimpanan sendiri (mis. Standardized Work) memberi <body data-bpms-sync="off">
  // supaya tidak perlu menunggu unduhan state FAH yang tidak dipakainya.
  if (document.body.dataset.bpmsSync !== 'off') {
    BPMS.showLoading();
    await BPMS.syncFromServer();
    BPMS.hideLoading();
  }

  if (typeof pageInit === 'function') pageInit();
});
