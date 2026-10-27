(function () {
  "use strict";

  var page = "";

  // ── SPA routing: #<route>?param=value, view diambil dari <template id="tpl-<route>"> ──
  // Judul tab mengikuti pola Factory Analytics Hub: "<Halaman> — Factory Analytics Hub".
  var ROUTES = {
    "home": "Dashboard SW — Factory Analytics Hub",
    "observasi": "Lembar Observasi — Factory Analytics Hub",
    "data-observasi": "Data Observasi — Factory Analytics Hub",
    "tskk": "TSKK — Factory Analytics Hub",
    "tsk": "TSK — Factory Analytics Hub",
    "tskp": "TSKP — Factory Analytics Hub",
    "yamazumi": "Yamazumi — Factory Analytics Hub",
    "yamazumi-edit": "Edit Yamazumi — Factory Analytics Hub"
  };
  // Route turunan yang menandai menu induknya sebagai aktif.
  var ROUTE_MENU_PARENT = { "yamazumi-edit": "yamazumi" };
  var routeCleanups = [];
  // Selama halaman baru diinisialisasi, notifikasi sukses/info tidak ditampilkan
  // (mis. "TSKK berhasil digenerate" saat halaman dibuka); error tetap tampil.
  var routeInitializing = false;

  document.addEventListener("DOMContentLoaded", function () {
    watchSidebarResize();
    bindGlobalActions();
    // Data server ditarik dulu supaya browser/PC baru langsung menampilkan data terbaru, bukan isi
    // localStorage yang kosong/lama. Server mati/lambat → initSync selesai (timeout) dan render dari lokal.
    BPMS.showLoading();
    SWStorage.initSync().then(function () {
      BPMS.hideLoading();
      window.addEventListener("hashchange", renderRoute);
      renderRoute();
    });
  });

  function parseRoute() {
    var hash = window.location.hash.replace(/^#\/?/, "");
    var queryIndex = hash.indexOf("?");
    var name = queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
    var query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
    if (!Object.prototype.hasOwnProperty.call(ROUTES, name)) name = "home";
    return { name: name, params: new URLSearchParams(query) };
  }

  function getRouteParam(key) {
    return parseRoute().params.get(key);
  }

  function replaceRouteParams(params) {
    if (!window.history || !window.history.replaceState) return;
    var query = new URLSearchParams(params || {}).toString();
    window.history.replaceState(null, document.title, "#" + parseRoute().name + (query ? "?" + query : ""));
  }

  function clearRouteParams() {
    if (window.history && window.history.replaceState && window.location.hash.indexOf("?") >= 0) {
      window.history.replaceState(null, document.title, "#" + parseRoute().name);
    }
  }

  // Listener window yang dipasang oleh sebuah view, otomatis dilepas saat pindah view.
  function onWindow(type, handler) {
    window.addEventListener(type, handler);
    routeCleanups.push(function () { window.removeEventListener(type, handler); });
  }

  // Dipanggil saat mode cetak aktif & selesai (layout sudah memakai CSS cetak), supaya canvas
  // chart digambar ulang selebar kertas, bukan selebar layar. Otomatis dilepas saat pindah view.
  function onPrintModeChange(handler) {
    if (!window.matchMedia) return;
    var mql = window.matchMedia("print");
    var listener = function () { handler(mql.matches); };
    if (mql.addEventListener) mql.addEventListener("change", listener);
    else mql.addListener(listener);
    routeCleanups.push(function () {
      if (mql.removeEventListener) mql.removeEventListener("change", listener);
      else mql.removeListener(listener);
    });
  }

  // Judul, keterangan, dan tombol aksi di <header class="page-header"> tiap template
  // dipindah ke topbar (pola Factory Analytics Hub), lalu header-nya dibuang dari isi halaman.
  function mountPageHeader(view) {
    var header = view.querySelector(".page-header");
    var titleEl = byId("topbarTitle");
    var subEl = byId("topbarSub");
    var actionsEl = byId("topbarActions");
    actionsEl.innerHTML = "";
    if (!header) {
      setText(titleEl, ROUTES[page].split(" — ")[0]);
      subEl.textContent = "";
      return;
    }
    var h2 = header.querySelector("h2");
    var p = header.querySelector("p");
    titleEl.textContent = h2 ? h2.textContent.trim() : ROUTES[page].split(" — ")[0];
    subEl.textContent = p ? p.textContent.trim() : "";
    subEl.title = subEl.textContent;
    var actions = header.querySelector(".obs-action-group");
    if (actions) {
      Array.prototype.slice.call(actions.children).forEach(function (child) {
        actionsEl.appendChild(child);
      });
    }
    header.parentNode.removeChild(header);
  }

  function renderRoute() {
    var route = parseRoute();
    var view = byId("appView");
    var template = byId("tpl-" + route.name);
    if (!view || !template) return;

    routeCleanups.splice(0).forEach(function (cleanup) { cleanup(); });

    page = route.name;
    document.body.setAttribute("data-page", page);
    document.title = ROUTES[page];
    view.innerHTML = "";
    view.appendChild(template.content.cloneNode(true));
    mountPageHeader(view);

    var tooltip = byId("modusTooltip");
    if (tooltip) tooltip.style.display = "none";

    activateMenu();
    closeMobileSidebar();
    view.scrollTop = 0;
    routeInitializing = true;
    try {
      initCurrentPage();
    } finally {
      routeInitializing = false;
    }
  }

  function initCurrentPage() {
    if (page === "home") initHomePage();
    if (page === "observasi") initObservasiPage();
    if (page === "data-observasi") initDataObservasiPage();
    if (page === "tskk") initTskkPage();
    if (page === "tsk") initTskPage();
    if (page === "tskp") initTskpPage();
    if (page === "yamazumi") initYamazumiPage();
    if (page === "yamazumi-edit") initYamazumiEditPage();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  // Skala tampilan (CSS zoom). getBoundingClientRect() & clientX/Y bernilai px layar,
  // sedangkan style.left/top & offsetWidth bernilai px CSS: px layar / uiZoom() = px CSS.
  // Tanpa CSS zoom (tampilan 100% seperti FAH) nilainya 1.
  function uiZoom(el) {
    return SWCharts.cssZoom(el || document.body);
  }

  // ── Sidebar: dirender & dikendalikan shared-components.js (FAH) ──
  function closeMobileSidebar() {
    var sidebar = byId("sidebar");
    var overlay = byId("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("active");
  }

  // Saat sidebar di-collapse/expand, picu resize supaya canvas (TSKK) menyesuaikan lebar area.
  function watchSidebarResize() {
    var sidebar = byId("sidebar");
    if (!sidebar || typeof MutationObserver !== "function") return;
    var collapsed = sidebar.classList.contains("collapsed");
    new MutationObserver(function () {
      var now = sidebar.classList.contains("collapsed");
      if (now === collapsed) return;
      collapsed = now;
      setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 200);
    }).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
  }

  // ── Notifikasi toast (sama dengan BPMS.toast di Factory Analytics Hub) ──
  function toast(text, type, duration) {
    var container = byId("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    var icons = { success: "✓", error: "✕", info: "ℹ" };
    var el = document.createElement("div");
    el.className = "toast " + (type || "info");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = "<span class='toast-icon'>" + (icons[type] || "•") + "</span><span class='toast-text'></span>";
    el.querySelector(".toast-text").textContent = text;
    container.appendChild(el);
    // Maksimal 4 toast sekaligus; yang paling lama dibuang.
    while (container.children.length > 4) container.removeChild(container.firstChild);
    setTimeout(function () {
      el.style.transition = "opacity 0.3s, transform 0.3s";
      el.style.opacity = "0";
      el.style.transform = "translateX(110%)";
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, duration);
  }

  function showMessage(text, isError) {
    if (!text) return;
    if (routeInitializing && !isError) return;
    // Pesan panjang / error tampil lebih lama supaya sempat terbaca.
    var duration = isError ? 7000 : (String(text).length > 110 ? 6000 : 3500);
    toast(text, isError ? "error" : "success", duration);
  }

  function sanitize(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Menu SW di sidebar FAH berbentuk "standardized-work.html#<route>".
  function activateMenu() {
    var menuPage = ROUTE_MENU_PARENT[page] || page;
    document.querySelectorAll(".sidebar-nav .nav-item").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var hashAt = href.indexOf("#");
      a.classList.toggle("active", hashAt >= 0 && href.slice(hashAt) === "#" + menuPage);
    });
  }

  function bindGlobalActions() {
    // Tombol global tersedia di semua halaman (export/import/reset).
    var exportBtn = byId("exportJsonBtn");
    var importInput = byId("importJsonInput");
    var resetBtn = byId("resetDataBtn");

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        SWStorage.exportJson();
        showMessage("Data berhasil diexport ke JSON.");
      });
    }

    if (importInput) {
      importInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        SWStorage.importJsonFile(file)
          .then(function () {
            showMessage("Import berhasil. Halaman akan dimuat ulang.");
            setTimeout(function () { window.location.reload(); }, 500);
          })
          .catch(function (err) {
            showMessage(err.message, true);
          })
          .finally(function () {
            importInput.value = "";
          });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!window.confirm("Yakin ingin menghapus semua data?")) return;
        SWStorage.resetData();
        showMessage("Data dihapus. Halaman akan dimuat ulang.");
        setTimeout(function () { window.location.reload(); }, 450);
      });
    }
  }

  function parseSamples(text) {
    if (!text) return [];
    return String(text)
      .split(/[,;\s]+/)
      .map(function (x) { return Number(x); })
      .filter(function (x) { return !Number.isNaN(x) && x >= 0; });
  }

  function getStats(samples) {
    if (!samples.length) return { avg: 0, min: 0, max: 0 };
    var sum = samples.reduce(function (a, b) { return a + b; }, 0);
    return {
      avg: sum / samples.length,
      min: Math.min.apply(null, samples),
      max: Math.max.apply(null, samples)
    };
  }

  function cycleTime(observation) {
    if (!observation || !Array.isArray(observation.elements)) return 0;
    return observation.elements.reduce(function (sum, row) {
      return sum + (Number(row.avg) || 0);
    }, 0);
  }

  function fixed2(value) {
    return (Number(value) || 0).toFixed(2);
  }

  function getObservationEditHref(observationId) {
    return "#observasi?edit=" + encodeURIComponent(observationId || "");
  }

  function getLineProcessNames(lineName, observations) {
    var targetLine = String(lineName || "").trim() || "Tanpa Line";
    var source = Array.isArray(observations) ? observations : [];
    var seen = {};
    var names = [];

    source.forEach(function (obs) {
      var currentLine = String(obs.lineName || "").trim() || "Tanpa Line";
      var processName = String(obs.processName || "").trim() || "Tanpa Nama Proses";
      if (currentLine !== targetLine || seen[processName]) {
        return;
      }
      seen[processName] = true;
      names.push(processName);
    });

    return names;
  }

  function getLineProcessOrder(lineName, data, observations) {
    var safeData = data || SWStorage.loadData();
    var source = Array.isArray(observations) ? observations : safeData.observations || [];
    var defaultNames = getLineProcessNames(lineName, source);
    var settings = safeData.settings || {};
    var processOrders = settings.processOrders && typeof settings.processOrders === "object"
      ? settings.processOrders
      : {};
    var savedOrder = Array.isArray(processOrders[lineName]) ? processOrders[lineName] : [];
    var activeMap = {};
    var merged = [];

    defaultNames.forEach(function (name) {
      activeMap[name] = true;
    });

    savedOrder.forEach(function (name) {
      if (activeMap[name] && merged.indexOf(name) < 0) {
        merged.push(name);
      }
    });

    defaultNames.forEach(function (name) {
      if (merged.indexOf(name) < 0) {
        merged.push(name);
      }
    });

    return merged;
  }

  function sortObservationsByProcessOrder(lineName, observations, data) {
    var safeData = data || SWStorage.loadData();
    var source = Array.isArray(observations) ? observations.slice() : [];
    var order = getLineProcessOrder(lineName, safeData, safeData.observations || []);
    var orderMap = {};

    order.forEach(function (name, index) {
      orderMap[name] = index;
    });

    return source.sort(function (a, b) {
      var processA = String(a.processName || "").trim() || "Tanpa Nama Proses";
      var processB = String(b.processName || "").trim() || "Tanpa Nama Proses";
      var indexA = Object.prototype.hasOwnProperty.call(orderMap, processA) ? orderMap[processA] : 9999;
      var indexB = Object.prototype.hasOwnProperty.call(orderMap, processB) ? orderMap[processB] : 9999;

      if (indexA !== indexB) {
        return indexA - indexB;
      }
      if (processA !== processB) {
        return processA.localeCompare(processB, "id");
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  function moveLineProcessOrder(lineName, processName, direction) {
    return SWStorage.updateData(function (data) {
      var safeLine = String(lineName || "").trim() || "Tanpa Line";
      var safeProcess = String(processName || "").trim() || "Tanpa Nama Proses";
      if (!data.settings || typeof data.settings !== "object") {
        data.settings = {};
      }
      if (!data.settings.processOrders || typeof data.settings.processOrders !== "object") {
        data.settings.processOrders = {};
      }

      var order = getLineProcessOrder(safeLine, data, data.observations || []);
      var currentIndex = order.indexOf(safeProcess);
      if (currentIndex < 0) {
        return data;
      }

      var targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= order.length) {
        return data;
      }

      var temp = order[currentIndex];
      order[currentIndex] = order[targetIndex];
      order[targetIndex] = temp;
      data.settings.processOrders[safeLine] = order;
      return data;
    });
  }

  // Tukar posisi dua proses dalam urutan line. Dipakai saat daftar proses difilter
  // (mis. per type produk) sehingga "tetangga" yang terlihat belum tentu bersebelahan di urutan line.
  function swapLineProcessOrder(lineName, processA, processB) {
    return SWStorage.updateData(function (data) {
      var safeLine = String(lineName || "").trim() || "Tanpa Line";
      data.settings = data.settings && typeof data.settings === "object" ? data.settings : {};
      data.settings.processOrders = data.settings.processOrders && typeof data.settings.processOrders === "object" ? data.settings.processOrders : {};
      var order = getLineProcessOrder(safeLine, data, data.observations || []);
      var a = order.indexOf(String(processA || "").trim() || "Tanpa Nama Proses");
      var b = order.indexOf(String(processB || "").trim() || "Tanpa Nama Proses");
      if (a < 0 || b < 0) return data;
      var temp = order[a];
      order[a] = order[b];
      order[b] = temp;
      data.settings.processOrders[safeLine] = order;
      return data;
    });
  }

  function formatRevisionLabel(number) {
    var safeNumber = Math.max(0, Number(number) || 0);
    return "Revisi " + String(safeNumber).padStart(3, "0");
  }

  function getObservationGroupId(observation) {
    if (!observation || typeof observation !== "object") {
      return "";
    }
    return String(observation.groupId || observation.id || "").trim();
  }

  function getObservationRevisionNumber(observation) {
    if (!observation || typeof observation !== "object") {
      return 0;
    }
    return Math.max(0, Number(observation.revisionNumber) || 0);
  }

  function getObservationRevisionLabel(observation) {
    if (!observation || typeof observation !== "object") {
      return formatRevisionLabel(0);
    }
    return observation.revisionLabel || formatRevisionLabel(getObservationRevisionNumber(observation));
  }

  function getObservationRevisionNote(observation) {
    if (!observation || typeof observation !== "object") {
      return "-";
    }
    return String(observation.revisionNote || "").trim() || (getObservationRevisionNumber(observation) === 0 ? "Data awal" : "-");
  }

  function sortRevisionRecordsDesc(records) {
    return (Array.isArray(records) ? records.slice() : []).sort(function (a, b) {
      var revisionDiff = getObservationRevisionNumber(b) - getObservationRevisionNumber(a);
      if (revisionDiff !== 0) {
        return revisionDiff;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  function isObservationActiveRevision(observation, observations) {
    if (!observation || typeof observation !== "object") {
      return false;
    }
    if (typeof observation.isActiveRevision === "boolean") {
      return observation.isActiveRevision;
    }
    var groupId = getObservationGroupId(observation);
    if (!groupId) {
      return true;
    }
    var revisions = sortRevisionRecordsDesc((Array.isArray(observations) ? observations : []).filter(function (item) {
      return getObservationGroupId(item) === groupId;
    }));
    if (!revisions.length) {
      return true;
    }
    return revisions[0].id === observation.id;
  }

  function getObservationGroupRevisions(groupId, observations) {
    var safeGroupId = String(groupId || "").trim();
    if (!safeGroupId) {
      return [];
    }
    return sortRevisionRecordsDesc((Array.isArray(observations) ? observations : []).filter(function (item) {
      return getObservationGroupId(item) === safeGroupId;
    }));
  }

  function getActiveObservations(source) {
    var safeData = Array.isArray(source) ? null : (source || SWStorage.loadData());
    var observations = Array.isArray(source) ? source : (safeData.observations || []);
    var groups = {};
    var active = [];

    observations.forEach(function (obs) {
      var groupId = getObservationGroupId(obs) || ("legacy_" + String(obs.id || ""));
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(obs);
    });

    Object.keys(groups).forEach(function (groupId) {
      var revisions = sortRevisionRecordsDesc(groups[groupId]);
      var current = revisions.find(function (item) {
        return item && item.isActiveRevision === true;
      }) || revisions[0];
      if (current) {
        active.push(current);
      }
    });

    return active.sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  function setText(el, value) {
    if (!el) {
      return;
    }
    el.textContent = value == null || value === "" ? "-" : String(value);
  }

  function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("id-ID");
  }

  function setActiveObservation(id) {
    SWStorage.updateData(function (data) {
      data.activeObservationId = id;
      return data;
    });
  }

  function initHomePage() {
    // Dashboard menampilkan ringkasan data terbaru.
    var data = SWStorage.loadData();
    var observations = getActiveObservations(data);
    var pSet = {};
    var oSet = {};
    var totalCycle = 0;

    observations.forEach(function (obs) {
      pSet[obs.processName] = true;
      oSet[obs.operatorName] = true;
      totalCycle += cycleTime(obs);
    });

    byId("homeProcessCount").textContent = String(Object.keys(pSet).length);
    byId("homeOperatorCount").textContent = String(Object.keys(oSet).length);
    byId("homeAvgCycle").textContent = observations.length ? fixed2(totalCycle / observations.length) + " detik" : "0 detik";

    var active = observations.find(function (o) { return o.id === data.activeObservationId; }) || observations[observations.length - 1];
    byId("homeActiveData").textContent = active ? active.processName + " / " + active.operatorName : "Belum dipilih";

    var body = byId("homeLatestBody");
    body.innerHTML = "";
    if (!observations.length) {
      body.innerHTML = '<tr><td colspan="5" class="placeholder">Belum ada data observasi.</td></tr>';
      return;
    }

    observations.slice(-6).reverse().forEach(function (obs) {
      var tr = document.createElement("tr");
      var isActive = obs.id === data.activeObservationId;
      tr.innerHTML =
        "<td>" + sanitize(obs.processName) + "</td>" +
        "<td>" + sanitize(obs.operatorName) + "</td>" +
        "<td>" + fixed2(cycleTime(obs)) + "</td>" +
        "<td>" + formatDate(obs.createdAt) + "</td>" +
        "<td><span class='status-badge " + (isActive ? "active" : "normal") + "'>" + (isActive ? "Aktif" : "Normal") + "</span></td>";
      body.appendChild(tr);
    });
  }

  function initObservasiPage() {
    // Halaman input utama: format tabel observasi dengan 10 sample.
    var lineInput = byId("lineName");
    var tanggalInput = byId("obsTanggal");
    var shiftInput = byId("shiftJam");
    var observerInput = byId("observerName");
    var productInput = byId("productType");
    var taktInput = byId("taktTimeInput");
    var noFormValueEl = byId("noFormValue");
    var NO_FORM_CODE = "Form-ISD-ISD-001";
    var processInput = byId("processName");
    var operatorInput = byId("operatorName");
    var rowsBody = byId("observasiRows");
    var totalRow = byId("observasiTotalRow");
    var listBody = byId("observationListBody");
    var addBtn = byId("addObservasiRowBtn");
    var clearDraftBtn = byId("clearObservasiDraftBtn");
    var saveBtn = byId("saveObservasiBtn");
    var totalElementEl = byId("observasiTotalElemen");
    var totalCycleEl = byId("observasiTotalCycle");
    var savedDetailSection = byId("savedDetailSection");
    var savedDetailTitle = byId("savedDetailTitle");
    var generateDummyBtn = byId("generateDummyObservasiBtn");
    var lineDetailSection = byId("lineDetailSection");
    var lineDetailTitle = byId("lineDetailTitle");
    var lineDetailBody = byId("lineDetailBody");
    var detailNoForm = byId("detailNoForm");
    var detailLine = byId("detailLine");
    var detailTanggal = byId("detailTanggal");
    var detailProses = byId("detailProses");
    var detailShift = byId("detailShift");
    var detailProduct = byId("detailProduct");
    var detailObserver = byId("detailObserver");
    var detailOperator = byId("detailOperator");
    var detailTakt = byId("detailTakt");
    var savedDetailRows = byId("savedDetailRows");
    var savedDetailTotalRow = byId("savedDetailTotalRow");
    var detailPrintBtn = byId("detailPrintBtn");
    var detailExportXlsxBtn = byId("detailExportXlsxBtn");

    var state = { rows: [] };
    var selectedDetailId = null;
    var selectedLineName = null;
    var editingObservationId = null;

    function newRow() {
      return {
        id: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
        name: "",
        category: "Value",
        samples: ["", "", "", "", "", "", "", "", "", ""],
        qty: "1",
        unit: "Battery",
        note: ""
      };
    }

    function normalizeCategory(value) {
      var text = String(value || "").trim();
      var lower = text.toLowerCase();

      if (!text) {
        return "Value";
      }
      if (lower === "value") {
        return "Value";
      }
      if (lower === "non value" || lower === "non-value" || lower === "nonvalue") {
        return "Non Value";
      }
      if (lower.indexOf("walk") >= 0 || lower.indexOf("jalan") >= 0 || lower.indexOf("dorong") >= 0) {
        return "Walking";
      }
      if (lower.indexOf("irreg") >= 0 || lower.indexOf("wait") >= 0 || lower.indexOf("tunggu") >= 0 || lower.indexOf("idle") >= 0) {
        return "Irregular";
      }
      if (lower.indexOf("mach") >= 0 || lower.indexOf("mesin") >= 0 || lower.indexOf("machine") >= 0) {
        return "Machine";
      }
      if (lower.indexOf("manual") >= 0) {
        return "Value";
      }
      return text;
    }

    function normalizeRow(raw) {
      var source = raw || {};
      var samples = [];
      if (Array.isArray(source.samples) && source.samples.length) {
        samples = source.samples.slice(0, 10);
      } else if (source.samplesText) {
        samples = parseSamples(source.samplesText);
      }

      var sampleText = [];
      for (var i = 0; i < 10; i += 1) {
        var value = samples[i];
        sampleText.push(value == null ? "" : String(value));
      }

      return {
        id: source.id || ("row_" + Date.now() + "_" + Math.random().toString(16).slice(2)),
        name: source.name || "",
        category: normalizeCategory(source.category || source.type || "Value"),
        samples: sampleText,
        qty: source.qty == null ? "1" : String(source.qty),
        unit: source.unit || "Battery",
        note: source.note || ""
      };
    }

    function toNumber(value) {
      if (value == null || value === "") {
        return null;
      }
      var numeric = Number(String(value).replace(",", "."));
      if (Number.isNaN(numeric) || numeric < 0) {
        return null;
      }
      return numeric;
    }

    function mode(samples) {
      if (!samples.length) {
        return 0;
      }
      var freq = {};
      var maxFreq = 0;
      samples.forEach(function (value) {
        var key = String(value);
        freq[key] = (freq[key] || 0) + 1;
        if (freq[key] > maxFreq) maxFreq = freq[key];
      });

      // Jika semua nilai unik (tidak ada yang berulang), ambil nilai ke-2 tercepat (ke-2 terkecil)
      if (maxFreq === 1) {
        var sorted = samples.slice().sort(function (a, b) { return a - b; });
        return sorted.length >= 2 ? sorted[1] : sorted[0];
      }

      // Jika ada nilai yang berulang, ambil nilai dengan frekuensi tertinggi (modus)
      // Jika ada beberapa nilai dengan frekuensi sama, ambil yang terkecil
      var bestValue = null;
      Object.keys(freq).forEach(function (key) {
        if (freq[key] === maxFreq) {
          var val = Number(key);
          if (bestValue === null || val < bestValue) bestValue = val;
        }
      });
      return bestValue;
    }

    function getRowStats(row) {
      var numericSamples = row.samples.map(toNumber).filter(function (value) { return value != null; });
      var modeValue = mode(numericSamples);
      var minValue = numericSamples.length ? Math.min.apply(null, numericSamples) : 0;
      var maxValue = numericSamples.length ? Math.max.apply(null, numericSamples) : 0;
      var qtyValue = Math.max(0, toNumber(row.qty) || 0);
      var ctValue = qtyValue > 0 ? modeValue / qtyValue : 0;

      return {
        numericSamples: numericSamples,
        mode: modeValue,
        min: minValue,
        max: maxValue,
        qty: qtyValue,
        ct: ctValue
      };
    }

    function displayNumber(value) {
      if (!Number.isFinite(value)) {
        return "0";
      }
      var rounded = Math.round(value * 100) / 100;
      if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
        return String(Math.round(rounded));
      }
      return rounded.toFixed(2);
    }

    function inferType(category) {
      var text = String(category || "").toLowerCase();
      if (text.indexOf("walk") >= 0 || text.indexOf("jalan") >= 0 || text.indexOf("dorong") >= 0) {
        return "Walking";
      }
      if (text.indexOf("mach") >= 0 || text.indexOf("mesin") >= 0 || text.indexOf("machine") >= 0) {
        return "Machine";
      }
      if (text.indexOf("irreg") >= 0 || text.indexOf("wait") >= 0 || text.indexOf("tunggu") >= 0 || text.indexOf("idle") >= 0) {
        return "Waiting";
      }
      return "Manual";
    }

    function todayValue() {
      return new Date().toISOString().slice(0, 10);
    }

    function offsetDateValue(offsetDays) {
      var date = new Date();
      date.setDate(date.getDate() - offsetDays);
      return date.toISOString().slice(0, 10);
    }

    function offsetIsoDate(offsetDays, hour) {
      var date = new Date();
      date.setDate(date.getDate() - offsetDays);
      date.setHours(hour || 7, (offsetDays * 7) % 60, 0, 0);
      return date.toISOString();
    }

    function buildDummySamples(base) {
      var safeBase = Math.max(1, Math.round(base));
      return [
        safeBase,
        safeBase,
        safeBase + 1,
        safeBase,
        Math.max(1, safeBase - 1),
        safeBase,
        safeBase,
        safeBase + 1,
        safeBase,
        safeBase
      ];
    }

    function createDummyElement(processName, lineIndex, processIndex, elementIndex, label, category, baseTime, qty, note) {
      var normalized = normalizeRow({
        id: "dummy_row_" + lineIndex + "_" + processIndex + "_" + elementIndex,
        name: label,
        category: category,
        samples: buildDummySamples(baseTime),
        qty: String(qty || 1),
        unit: "Battery",
        note: note || ""
      });
      var stats = getRowStats(normalized);

      return {
        id: normalized.id,
        name: normalized.name,
        type: inferType(normalized.category),
        category: normalized.category,
        samples: stats.numericSamples,
        avg: stats.mode,
        mode: stats.mode,
        min: stats.min,
        max: stats.max,
        qty: stats.qty,
        unit: normalized.unit,
        ct: stats.ct,
        note: normalized.note
      };
    }

    function buildDummyElements(processName, lineIndex, processIndex) {
      var lower = String(processName || "").toLowerCase();
      var isMachineOnlyProcess = /^(mesin|auto|palletizing)\b/.test(lower);
      var isMachineProcess = lower.indexOf("mesin") >= 0 || lower.indexOf("auto ") >= 0;
      var isWalkingProcess = lower.indexOf("loading") >= 0 || lower.indexOf("unloading") >= 0 || lower.indexOf("palletizing") >= 0;
      var isPackingProcess = lower.indexOf("packing") >= 0;
      var baseSeed = 4 + ((lineIndex * 2 + processIndex) % 7);
      var elements = [];

      elements.push(createDummyElement(
        processName,
        lineIndex,
        processIndex,
        1,
        "Persiapan " + processName,
        isMachineOnlyProcess ? "Machine" : (isMachineProcess ? "Non Value" : "Value"),
        baseSeed,
        1,
        "Dummy setup awal"
      ));

      elements.push(createDummyElement(
        processName,
        lineIndex,
        processIndex,
        2,
        "Eksekusi " + processName,
        isMachineOnlyProcess ? "Machine" : (isMachineProcess ? "Machine" : "Value"),
        baseSeed + (isMachineProcess ? 8 : 4),
        isMachineProcess ? 2 : 1,
        isMachineProcess ? "Dummy machine run" : "Dummy manual work"
      ));

      elements.push(createDummyElement(
        processName,
        lineIndex,
        processIndex,
        3,
        "Cek hasil " + processName,
        isMachineOnlyProcess ? "Machine" : "Non Value",
        baseSeed + 1,
        1,
        "Dummy quality check"
      ));

      elements.push(createDummyElement(
        processName,
        lineIndex,
        processIndex,
        4,
        isPackingProcess ? "Susun output " + processName : "Transfer output " + processName,
        isMachineOnlyProcess ? "Machine" : (isWalkingProcess || isPackingProcess ? "Walking" : "Value"),
        baseSeed + 2,
        1,
        "Dummy transfer process"
      ));

      if ((lineIndex + processIndex) % 3 === 0) {
        elements.push(createDummyElement(
          processName,
          lineIndex,
          processIndex,
          5,
          "Adjustment minor " + processName,
          isMachineOnlyProcess ? "Machine" : "Irregular",
          baseSeed + 3,
          1,
          "Dummy irregular activity"
        ));
      }

      return elements;
    }

    function createDummyObservation(lineIndex, processIndex, processName) {
      var productTypes = ["NS40Z", "NS60LS", "N70", "DIN55", "DIN66", "N120", "Q85"];
      var shiftNames = [
        "Shift 1 / 07:00-15:00",
        "Shift 2 / 15:00-23:00",
        "Shift 3 / 23:00-07:00"
      ];
      var operatorCode = String(processIndex + 1).padStart(2, "0");
      var elements = buildDummyElements(processName, lineIndex, processIndex);

      return {
        id: "dummy_obs_line" + lineIndex + "_proc" + (processIndex + 1),
        groupId: "dummy_group_line" + lineIndex + "_proc" + (processIndex + 1),
        source: "dummy-observasi-v1",
        lineName: "Line " + lineIndex,
        obsTanggal: offsetDateValue(lineIndex - 1),
        shiftJam: shiftNames[(lineIndex + processIndex) % shiftNames.length],
        observerName: "Observer " + lineIndex,
        productType: productTypes[(lineIndex - 1) % productTypes.length],
        taktTime: 20 + (lineIndex * 1.2) + ((processIndex % 4) * 0.4),
        noForm: NO_FORM_CODE,
        processName: processName,
        operatorName: "Operator L" + lineIndex + "-" + operatorCode,
        revisionNumber: 0,
        revisionLabel: formatRevisionLabel(0),
        revisionNote: "Data awal",
        isActiveRevision: true,
        createdAt: offsetIsoDate(lineIndex - 1, 7 + ((processIndex % 3) * 3)),
        elements: elements
      };
    }

    function buildDummyObservationSet() {
      var processNames = [
        "Loading Plate Cutting",
        "Mesin Plate Cutting",
        "Unloading Plate Cutting",
        "Loading Envelope",
        "Mesin Envelope",
        "Unloading Envelope",
        "Mearing 1",
        "Mearing 2",
        "Mearing 3",
        "Loading COS",
        "Mesin COS",
        "Unloading COS",
        "Manual Adjusting Connector PW",
        "Auto Adjusting Connector PW",
        "Mesin Polarity Test 1",
        "Mesin Short Test 1",
        "Mesin PW 1",
        "Mesin PW 2",
        "Mesin PW 3",
        "Mesin Polarity Test 2",
        "Mesin Short Test 2",
        "Manual Cover",
        "Auto Cover",
        "Mesin HSM",
        "Mesin APB",
        "Mesin ALT",
        "Mesin Date Code",
        "Mesin Brushing",
        "Mesin Oiling",
        "Mesin Dry Sealing",
        "Packing",
        "Palletizing"
      ];
      var observations = [];

      for (var lineIndex = 1; lineIndex <= 7; lineIndex += 1) {
        processNames.forEach(function (processName, processIndex) {
          observations.push(createDummyObservation(lineIndex, processIndex, processName));
        });
      }

      return observations;
    }

    function saveDraft() {
      SWStorage.updateData(function (data) {
        data.drafts.observasi = {
          lineName: lineInput.value.trim(),
          obsTanggal: tanggalInput.value,
          shiftJam: shiftInput.value.trim(),
          observerName: observerInput.value.trim(),
          productType: productInput.value.trim(),
          taktTime: taktInput.value,
          noForm: NO_FORM_CODE,
          editingObservationId: editingObservationId,
          processName: processInput.value.trim(),
          operatorName: operatorInput.value.trim(),
          rows: state.rows
        };
        return data;
      });
    }

    function renderRows() {
      rowsBody.innerHTML = "";

      state.rows.forEach(function (rawRow, index) {
        var row = normalizeRow(rawRow);
        state.rows[index] = row;
        var selectedCategory = normalizeCategory(row.category);
        row.category = selectedCategory;
        var categoryOptions =
          "<option value='Value'" + (selectedCategory === "Value" ? " selected" : "") + ">Value</option>" +
          "<option value='Non Value'" + (selectedCategory === "Non Value" ? " selected" : "") + ">Non Value</option>" +
          "<option value='Walking'" + (selectedCategory === "Walking" ? " selected" : "") + ">Walking</option>" +
          "<option value='Irregular'" + (selectedCategory === "Irregular" ? " selected" : "") + ">Irregular</option>" +
          "<option value='Machine'" + (selectedCategory === "Machine" ? " selected" : "") + ">Machine</option>";

        var tr = document.createElement("tr");
        tr.setAttribute("data-row-id", row.id);

        var sampleCells = "";
        for (var i = 0; i < 10; i += 1) {
          var dividerClass = i === 9 ? " class='obs-divider-right'" : "";
          sampleCells +=
            "<td" + dividerClass + "><input class='obs-detail-input sample' data-field='sample' data-sample-index='" + i + "' type='text' value='" + sanitize(row.samples[i]) + "'></td>";
        }

        tr.innerHTML =
          "<td class='obs-cell-center'>" + (index + 1) + "</td>" +
          "<td><input class='obs-detail-input' data-field='name' type='text' value='" + sanitize(row.name) + "' placeholder='Contoh: Ambil dan pasang styrophore'></td>" +
          "<td class='obs-divider-right'><select class='obs-detail-input obs-cell-center' data-field='category'>" + categoryOptions + "</select></td>" +
          sampleCells +
          "<td class='obs-stat-value' data-output='mode'>0</td>" +
          "<td class='obs-stat-value' data-output='min'>0</td>" +
          "<td class='obs-stat-value obs-divider-right' data-output='max'>0</td>" +
          "<td><input class='obs-detail-input sample' data-field='qty' type='number' min='0' step='1' value='" + sanitize(row.qty) + "'></td>" +
          "<td class='obs-divider-right'><input class='obs-detail-input obs-cell-center' data-field='unit' type='text' value='" + sanitize(row.unit) + "'></td>" +
          "<td class='obs-stat-value obs-divider-right' data-output='ct'>0.00</td>" +
          "<td><input class='obs-detail-input' data-field='note' type='text' value='" + sanitize(row.note) + "'></td>";
        rowsBody.appendChild(tr);
      });

      refreshComputedCells();
    }

    function refreshComputedCells() {
      var totalSamples = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var totalMode = 0;
      var totalQty = 0;
      var totalCt = 0;
      var minPool = [];
      var maxPool = [];
      var domRows = {};

      rowsBody.querySelectorAll("tr[data-row-id]").forEach(function (tr) {
        domRows[tr.getAttribute("data-row-id")] = tr;
      });

      state.rows.forEach(function (rawRow, index) {
        var row = normalizeRow(rawRow);
        state.rows[index] = row;
        var stats = getRowStats(row);
        var tr = domRows[row.id];

        if (tr) {
          var modeCell = tr.querySelector("[data-output='mode']");
          var minCell = tr.querySelector("[data-output='min']");
          var maxCell = tr.querySelector("[data-output='max']");
          var ctCell = tr.querySelector("[data-output='ct']");
          if (modeCell) modeCell.textContent = displayNumber(stats.mode);
          if (minCell) minCell.textContent = displayNumber(stats.min);
          if (maxCell) maxCell.textContent = displayNumber(stats.max);
          if (ctCell) ctCell.textContent = fixed2(stats.ct);
        }

        for (var s = 0; s < 10; s += 1) {
          var sampleValue = toNumber(row.samples[s]);
          if (sampleValue != null) {
            totalSamples[s] += sampleValue;
          }
        }
        totalMode += stats.mode;
        totalQty += stats.qty;
        totalCt += stats.ct;
        if (stats.numericSamples.length) {
          minPool.push(stats.min);
          maxPool.push(stats.max);
        }
      });

      totalElementEl.textContent = String(state.rows.length);
      totalCycleEl.textContent = fixed2(totalCt);

      if (!totalRow) {
        return;
      }

      var minValue = minPool.length ? Math.min.apply(null, minPool) : 0;
      var maxValue = maxPool.length ? Math.max.apply(null, maxPool) : 0;
      var sampleTotals = totalSamples.map(function (value, idx) {
        var className = idx === 9 ? "obs-total-number obs-divider-right" : "obs-total-number";
        return "<td class='" + className + "'>" + displayNumber(value) + "</td>";
      }).join("");

      totalRow.innerHTML =
        "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td>" +
        "<td class='obs-total-muted obs-divider-right'>-</td>" +
        sampleTotals +
        "<td class='obs-total-number'>" + displayNumber(totalMode) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(minValue) + "</td>" +
        "<td class='obs-total-number obs-divider-right'>" + displayNumber(maxValue) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(totalQty) + "</td>" +
        "<td class='obs-total-unit obs-divider-right'>Battery</td>" +
        "<td class='obs-total-number obs-divider-right'>" + fixed2(totalCt) + "</td>" +
        "<td class='obs-total-muted'>-</td>";
    }

    function updateRowFromInput(target) {
      var tr = target.closest("tr[data-row-id]");
      if (!tr) {
        return false;
      }
      var row = state.rows.find(function (item) {
        return item.id === tr.getAttribute("data-row-id");
      });
      if (!row) {
        return false;
      }

      var field = target.getAttribute("data-field");
      if (!field) {
        return false;
      }

      if (field === "sample") {
        var sampleIndex = Number(target.getAttribute("data-sample-index"));
        if (!Number.isNaN(sampleIndex) && sampleIndex >= 0 && sampleIndex < 10) {
          row.samples[sampleIndex] = target.value;
          return true;
        }
        return false;
      }

      row[field] = target.value;
      return true;
    }

    function toInputDate(value) {
      if (!value) {
        return todayValue();
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return String(value);
      }
      var parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return todayValue();
      }
      var yyyy = parsed.getFullYear();
      var mm = String(parsed.getMonth() + 1).padStart(2, "0");
      var dd = String(parsed.getDate()).padStart(2, "0");
      return yyyy + "-" + mm + "-" + dd;
    }

    function formatDateForDisplay(value) {
      if (!value) {
        return "-";
      }
      var parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return String(value);
      }
      return parsed.toLocaleDateString("id-ID");
    }

    function buildDetailRows(observation) {
      return (observation.elements || []).map(function (element) {
        return normalizeRow({
          id: element.id,
          name: element.name,
          category: element.category || element.type || "Value",
          samples: element.samples || [],
          qty: element.qty == null ? "1" : String(element.qty),
          unit: element.unit || "Battery",
          note: element.note || ""
        });
      });
    }

    function setEditMode(observation) {
      editingObservationId = observation ? observation.id : null;
      if (!saveBtn) {
        return;
      }
      saveBtn.textContent = observation ? "Simpan Revisi Baru" : "Simpan Observasi";
    }

    function clearEditQueryParam() {
      clearRouteParams();
    }

    function openObservationForEdit(observationId) {
      var data = SWStorage.loadData();
      var obs = (data.observations || []).find(function (item) {
        return item.id === observationId;
      });
      if (!obs) {
        showMessage("Data observasi untuk edit tidak ditemukan.", true);
        return;
      }

      lineInput.value = obs.lineName || "";
      tanggalInput.value = toInputDate(obs.obsTanggal || obs.createdAt);
      shiftInput.value = obs.shiftJam || "";
      observerInput.value = obs.observerName || "";
      productInput.value = obs.productType || "";
      taktInput.value = obs.taktTime == null ? "" : String(obs.taktTime);
      processInput.value = obs.processName || "";
      operatorInput.value = obs.operatorName || "";
      state.rows = buildDetailRows(obs);
      if (!state.rows.length) {
        state.rows = [newRow()];
      }

      if (noFormValueEl) {
        noFormValueEl.textContent = NO_FORM_CODE;
      }

      setEditMode(obs);
      setActiveObservation(obs.id);
      renderRows();
      renderObservationList();
      saveDraft();
      showMessage("Mode revisi aktif. Ubah data lalu klik Simpan Revisi Baru.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderSavedDetail(observation) {
      if (!savedDetailRows || !savedDetailTotalRow) {
        return;
      }

      var rows = buildDetailRows(observation);
      savedDetailRows.innerHTML = "";
      var totalSamples = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var totalMode = 0;
      var totalQty = 0;
      var totalCt = 0;
      var minPool = [];
      var maxPool = [];

      rows.forEach(function (row, idx) {
        var stats = getRowStats(row);
        for (var i = 0; i < 10; i += 1) {
          var sampleValue = toNumber(row.samples[i]);
          if (sampleValue != null) {
            totalSamples[i] += sampleValue;
          }
        }
        totalMode += stats.mode;
        totalQty += stats.qty;
        totalCt += stats.ct;
        if (stats.numericSamples.length) {
          minPool.push(stats.min);
          maxPool.push(stats.max);
        }

        var sampleCells = "";
        for (var s = 0; s < 10; s += 1) {
          var cls = s === 9 ? "obs-cell-center obs-divider-right" : "obs-cell-center";
          sampleCells += "<td class='" + cls + "'>" + sanitize(row.samples[s]) + "</td>";
        }

        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td class='obs-cell-center'>" + (idx + 1) + "</td>" +
          "<td>" + sanitize(row.name) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + sanitize(row.category) + "</td>" +
          sampleCells +
          "<td class='obs-cell-center' title='Pemilihan Modus:&#10;• Ada nilai berulang → ambil nilai paling sering muncul&#10;• Semua nilai unik → ambil nilai ke-2 terkecil&#10;• Nilai 0 tidak pernah dipilih sebagai hasil&#10;• Jika 0 lebih banyak dari nilai lain → dianggap hanya ada 1 nol' style='cursor:help;'>" + displayNumber(stats.mode) + "</td>" +
          "<td class='obs-cell-center'>" + displayNumber(stats.min) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + displayNumber(stats.max) + "</td>" +
          "<td class='obs-cell-center'>" + displayNumber(stats.qty) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + sanitize(row.unit) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + fixed2(stats.ct) + "</td>" +
          "<td>" + sanitize(row.note) + "</td>";
        savedDetailRows.appendChild(tr);
      });

      if (!rows.length) {
        savedDetailRows.innerHTML = "<tr><td colspan='20' class='placeholder'>Data elemen belum tersedia.</td></tr>";
      }

      var minValue = minPool.length ? Math.min.apply(null, minPool) : 0;
      var maxValue = maxPool.length ? Math.max.apply(null, maxPool) : 0;
      var sampleTotals = totalSamples.map(function (value, idx2) {
        var className = idx2 === 9 ? "obs-total-number obs-divider-right" : "obs-total-number";
        return "<td class='" + className + "'>" + displayNumber(value) + "</td>";
      }).join("");

      savedDetailTotalRow.innerHTML =
        "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td>" +
        "<td class='obs-total-muted obs-divider-right'>-</td>" +
        sampleTotals +
        "<td class='obs-total-number'>" + displayNumber(totalMode) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(minValue) + "</td>" +
        "<td class='obs-total-number obs-divider-right'>" + displayNumber(maxValue) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(totalQty) + "</td>" +
        "<td class='obs-total-unit obs-divider-right'>Battery</td>" +
        "<td class='obs-total-number obs-divider-right'>" + fixed2(totalCt) + "</td>" +
        "<td class='obs-total-muted'>-</td>";
    }

    function exportDetailXlsx(observation) {
      var rows = buildDetailRows(observation);
      var xlsxRows = [];
      xlsxRows.push(["LEMBAR OBSERVASI"]);
      xlsxRows.push(["NO FORM", NO_FORM_CODE, "LINE", observation.lineName || "", "TANGGAL", formatDateForDisplay(observation.obsTanggal || observation.createdAt)]);
      xlsxRows.push(["PROSES", observation.processName || "", "SHIFT / JAM", observation.shiftJam || "", "TIPE PRODUK", observation.productType || ""]);
      xlsxRows.push(["NAMA OBSERVER", observation.observerName || "", "NAMA OPERATOR", observation.operatorName || "", "TAKT TIME", observation.taktTime == null ? "" : observation.taktTime]);
      xlsxRows.push([]);
      xlsxRows.push(["NO", "Elemen Kerja", "Kategori", "Sample1", "Sample2", "Sample3", "Sample4", "Sample5", "Sample6", "Sample7", "Sample8", "Sample9", "Sample10", "Modus", "Min", "Max", "Qty", "Unit", "CT(sec/batt)", "NOTE"]);

      rows.forEach(function (row, idx) {
        var stats = getRowStats(row);
        var sampleValues = [];
        for (var i = 0; i < 10; i += 1) {
          sampleValues.push(row.samples[i] || "");
        }
        xlsxRows.push([
          idx + 1,
          row.name,
          row.category,
          sampleValues[0], sampleValues[1], sampleValues[2], sampleValues[3], sampleValues[4],
          sampleValues[5], sampleValues[6], sampleValues[7], sampleValues[8], sampleValues[9],
          displayNumber(stats.mode),
          displayNumber(stats.min),
          displayNumber(stats.max),
          displayNumber(stats.qty),
          row.unit,
          fixed2(stats.ct),
          row.note
        ]);
      });

      var filenameSafeProcess = (observation.processName || "observasi").replace(/[^\w\-]+/g, "_");
      SWStorage.downloadXlsx("observasi-detail-" + filenameSafeProcess + ".xlsx", xlsxRows, "Lembar Observasi");
    }

    function renderRevisionHistory(observation, observations) {
      if (!revisionHistoryBody) {
        return;
      }
      var records = getObservationGroupRevisions(getObservationGroupId(observation), observations);
      revisionHistoryBody.innerHTML = "";

      if (!records.length) {
        revisionHistoryBody.innerHTML = '<tr><td colspan="6" class="placeholder">Riwayat revisi belum tersedia.</td></tr>';
        return;
      }

      records.forEach(function (record) {
        var statusClass = isObservationActiveRevision(record, observations) ? "active" : "normal";
        var statusText = isObservationActiveRevision(record, observations) ? "Aktif" : "Riwayat";
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(getObservationRevisionLabel(record)) + "</td>" +
          "<td>" + formatDate(record.createdAt) + "</td>" +
          "<td><span class='status-badge " + statusClass + "'>" + statusText + "</span></td>" +
          "<td>" + sanitize(record.observerName) + "</td>" +
          "<td>" + sanitize(getObservationRevisionNote(record)) + "</td>" +
          "<td><div class='obs-action-group'><button class='btn ghost js-history-view' data-id='" + record.id + "'>Lihat</button><button class='btn ghost js-history-revise' data-id='" + record.id + "'>Buat Revisi</button></div></td>";
        revisionHistoryBody.appendChild(tr);
      });
    }

    function openObservationDetail(observationId) {
      var data = SWStorage.loadData();
      var obs = (data.observations || []).find(function (item) {
        return item.id === observationId;
      });
      if (!obs) {
        showMessage("Detail observasi tidak ditemukan.", true);
        return;
      }

      selectedDetailId = obs.id;
      if (savedDetailSection) {
        savedDetailSection.classList.remove("hidden");
      }
      setText(savedDetailTitle, "Detail Observasi: " + (obs.processName || "-") + " / " + getObservationRevisionLabel(obs));
      setText(detailNoForm, NO_FORM_CODE);
      setText(detailLine, obs.lineName);
      setText(detailTanggal, formatDateForDisplay(obs.obsTanggal || obs.createdAt));
      setText(detailProses, obs.processName);
      setText(detailShift, obs.shiftJam);
      setText(detailProduct, obs.productType);
      setText(detailObserver, obs.observerName);
      setText(detailOperator, obs.operatorName);
      setText(detailTakt, obs.taktTime == null ? "-" : String(obs.taktTime));
      setText(detailRevisionLabel, getObservationRevisionLabel(obs));
      setText(detailRevisionStatus, isObservationActiveRevision(obs, data.observations || []) ? "Aktif" : "Riwayat");
      setText(detailRevisionNote, getObservationRevisionNote(obs));
      renderSavedDetail(obs);
      renderRevisionHistory(obs, data.observations || []);
      showMessage("Detail observasi ditampilkan di bagian bawah.");
      if (savedDetailSection && savedDetailSection.scrollIntoView) {
        savedDetailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function renderObservationList() {
      if (!listBody) {
        return;
      }
      var data = SWStorage.loadData();
      var observations = getDisplayObservations(data);
      listBody.innerHTML = "";

      if (!observations.length) {
        listBody.innerHTML = '<tr><td colspan="4" class="placeholder">Belum ada data.</td></tr>';
        if (lineDetailSection) {
          lineDetailSection.classList.add("hidden");
        }
        return;
      }

      var groups = {};

      observations.forEach(function (obs) {
        var lineName = String(obs.lineName || "").trim() || "Tanpa Line";
        if (!groups[lineName]) {
          groups[lineName] = [];
        }
        groups[lineName].push(obs);
      });

      Object.keys(groups).sort(function (a, b) {
        var matchA = a.match(/line\s*(\d+)/i);
        var matchB = b.match(/line\s*(\d+)/i);
        if (matchA && matchB) {
          return Number(matchA[1]) - Number(matchB[1]);
        }
        if (matchA) return -1;
        if (matchB) return 1;
        return a.localeCompare(b, "id");
      }).forEach(function (lineName) {
        var lineRows = groups[lineName].slice().sort(function (a, b) {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        var latest = lineRows[0];
        var groupTr = document.createElement("tr");
        groupTr.className = "obs-directory-row";
        groupTr.setAttribute("data-line-name", lineName);
        groupTr.innerHTML =
          "<td><button class='obs-directory-trigger js-open-line' data-line-name='" + sanitize(lineName) + "'>" +
          "<span class='obs-directory-label'>" + sanitize(lineName) + "</span>" +
          "<span class='obs-directory-meta'>Klik untuk buka detail line</span>" +
          "</button></td>" +
          "<td>" + lineRows.length + " proses</td>" +
          "<td>" + formatDate(latest.createdAt) + "</td>" +
          "<td><button class='btn ghost js-open-line' data-line-name='" + sanitize(lineName) + "'>Detail</button></td>";
        listBody.appendChild(groupTr);
      });

      if (selectedLineName && groups[selectedLineName]) {
        renderLineObservationDetail(selectedLineName);
      } else if (lineDetailSection) {
        lineDetailSection.classList.add("hidden");
      }
    }

    function renderLineObservationDetail(lineName) {
      var data = SWStorage.loadData();
      var allObservations = data.observations || [];
      var observations = sortObservationsByProcessOrder(lineName, getDisplayObservations(data).filter(function (obs) {
        return (String(obs.lineName || "").trim() || "Tanpa Line") === lineName;
      }).sort(function (a, b) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }), data);
      var processOrder = getLineProcessOrder(lineName, data, allObservations);

      selectedLineName = lineName;
      if (!lineDetailBody || !lineDetailSection) {
        return;
      }

      lineDetailBody.innerHTML = "";
      if (!observations.length) {
        lineDetailBody.innerHTML = '<tr><td colspan="9" class="placeholder">Belum ada data pada line ini.</td></tr>';
        lineDetailSection.classList.remove("hidden");
        setText(lineDetailTitle, "Detail Line: " + lineName);
        return;
      }

      setText(lineDetailTitle, "Detail Line: " + lineName + " (" + observations.length + " proses aktif)");
      lineDetailSection.classList.remove("hidden");

      observations.forEach(function (obs) {
        var processName = String(obs.processName || "").trim() || "Tanpa Nama Proses";
        var orderIndex = processOrder.indexOf(processName);
        var disableUp = orderIndex <= 0 ? " disabled" : "";
        var disableDown = orderIndex < 0 || orderIndex >= processOrder.length - 1 ? " disabled" : "";
        var revisionActive = isObservationActiveRevision(obs, allObservations);
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(processName) + "</td>" +
          "<td>" + sanitize(obs.operatorName) + "</td>" +
          "<td>" + fixed2(cycleTime(obs)) + "</td>" +
          "<td>" + formatDate(obs.createdAt) + "</td>" +
          "<td>" + sanitize(getObservationRevisionLabel(obs)) + "</td>" +
          "<td>" + sanitize(getObservationRevisionNote(obs)) + "</td>" +
          "<td><span class='status-badge " + (revisionActive ? "active" : "normal") + "'>" + (revisionActive ? "Aktif" : "Riwayat") + "</span></td>" +
          "<td><div class='obs-action-group'><button class='btn ghost js-view-detail' data-id='" + obs.id + "'>Detail</button><button class='btn ghost js-edit-observation' data-id='" + obs.id + "'>Buat Revisi</button><button class='btn js-set-active' data-id='" + obs.id + "'>Pakai</button></div></td>" +
          "<td><div class='obs-order-nav'><button class='btn ghost js-order-process' data-line-name='" + sanitize(lineName) + "' data-process-name='" + sanitize(processName) + "' data-direction='up'" + disableUp + ">&uarr;</button><button class='btn ghost js-order-process' data-line-name='" + sanitize(lineName) + "' data-process-name='" + sanitize(processName) + "' data-direction='down'" + disableDown + ">&darr;</button></div></td>";
        lineDetailBody.appendChild(tr);
      });

      if (lineDetailSection.scrollIntoView) {
        lineDetailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function renderObservationList() {
      if (!listBody) return;
      var data = SWStorage.loadData();
      var observations = getDisplayObservations(data);
      listBody.innerHTML = "";

      if (!observations.length) {
        listBody.innerHTML = '<tr><td colspan="4" class="placeholder">Belum ada data.</td></tr>';
        if (lineDetailSection) lineDetailSection.classList.add("hidden");
        return;
      }

      var groups = {};
      observations.forEach(function (obs) {
        var lineName = String(obs.lineName || "").trim() || "Tanpa Line";
        if (!groups[lineName]) groups[lineName] = [];
        groups[lineName].push(obs);
      });

      Object.keys(groups).sort(function (a, b) {
        var matchA = a.match(/line\s*(\d+)/i);
        var matchB = b.match(/line\s*(\d+)/i);
        if (matchA && matchB) return Number(matchA[1]) - Number(matchB[1]);
        if (matchA) return -1;
        if (matchB) return 1;
        return a.localeCompare(b, "id");
      }).forEach(function (lineName) {
        var lineRows = groups[lineName].slice().sort(function (a, b) {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        var latest = lineRows[0];
        var groupTr = document.createElement("tr");
        groupTr.className = "obs-directory-row";
        groupTr.setAttribute("data-line-name", lineName);
        groupTr.innerHTML =
          "<td><button class='obs-directory-trigger js-open-line' data-line-name='" + sanitize(lineName) + "'>" +
          "<span class='obs-directory-label'>" + sanitize(lineName) + "</span>" +
          "<span class='obs-directory-meta'>Klik untuk buka detail line</span>" +
          "</button></td>" +
          "<td>" + lineRows.length + " proses</td>" +
          "<td>" + formatDate(latest.createdAt) + "</td>" +
          "<td><button class='btn ghost js-open-line' data-line-name='" + sanitize(lineName) + "'>Detail</button></td>";
        listBody.appendChild(groupTr);
      });

      if (selectedLineName && groups[selectedLineName]) {
        renderLineObservationDetail(selectedLineName);
      } else if (lineDetailSection) {
        lineDetailSection.classList.add("hidden");
      }
    }

    if (listBody) {
      listBody.addEventListener("click", function (event) {
        var openLineBtn = event.target.closest(".js-open-line");
        if (openLineBtn) {
          renderLineObservationDetail(openLineBtn.getAttribute("data-line-name"));
          showMessage("Detail line ditampilkan.");
          return;
        }
        var openLineRow = event.target.closest("tr[data-line-name]");
        if (openLineRow) {
          renderLineObservationDetail(openLineRow.getAttribute("data-line-name"));
          showMessage("Detail line ditampilkan.");
        }
      });
    }

    if (lineDetailBody) {
      lineDetailBody.addEventListener("click", function (event) {
        var detailBtn = event.target.closest(".js-view-detail");
        if (detailBtn) {
          openObservationDetail(detailBtn.getAttribute("data-id"));
          return;
        }
        var editBtn = event.target.closest(".js-edit-observation");
        if (editBtn) {
          window.location.href = getObservationEditHref(editBtn.getAttribute("data-id"));
          return;
        }
        var orderBtn = event.target.closest(".js-order-process");
        if (orderBtn) {
          moveLineProcessOrder(
            orderBtn.getAttribute("data-line-name"),
            orderBtn.getAttribute("data-process-name"),
            orderBtn.getAttribute("data-direction")
          );
          renderObservationList();
          showMessage("Urutan proses diperbarui.");
          return;
        }
        var btn = event.target.closest(".js-set-active");
        if (!btn) return;
        setActiveObservation(btn.getAttribute("data-id"));
        renderObservationList();
        renderLineObservationDetail(selectedLineName);
        showMessage("Data dipilih sebagai referensi aktif.");
      });
    }

    if (revisionHistoryBody) {
      revisionHistoryBody.addEventListener("click", function (event) {
        var viewBtn = event.target.closest(".js-history-view");
        if (viewBtn) {
          openObservationDetail(viewBtn.getAttribute("data-id"));
          return;
        }
        var reviseBtn = event.target.closest(".js-history-revise");
        if (reviseBtn) {
          window.location.href = getObservationEditHref(reviseBtn.getAttribute("data-id"));
        }
      });
    }

    if (generateDummyBtn) {
      generateDummyBtn.addEventListener("click", function () {
        var dummyObservations = buildDummyObservationSet();
        if (!window.confirm("Generate " + dummyObservations.length + " data dummy observasi? Data dummy lama akan diperbarui.")) {
          return;
        }

        SWStorage.updateData(function (data) {
          var existing = Array.isArray(data.observations) ? data.observations : [];
          data.observations = existing.filter(function (item) {
            return item.source !== "dummy-observasi-v1";
          }).concat(dummyObservations);
          data.activeObservationId = dummyObservations.length ? dummyObservations[0].id : null;
          data.drafts.observasi = null;
          return data;
        });

        selectedDetailId = null;
        selectedLineName = null;
        if (savedDetailSection) savedDetailSection.classList.add("hidden");
        if (lineDetailSection) lineDetailSection.classList.add("hidden");
        renderObservationList();
        showMessage(dummyObservations.length + " data dummy berhasil dibuat untuk 7 line produksi.");
      });
    }

    if (detailPrintBtn) {
      detailPrintBtn.addEventListener("click", function () {
        if (!selectedDetailId) {
          showMessage("Pilih detail observasi terlebih dahulu.", true);
          return;
        }
        window.print();
      });
    }

    if (detailCreateRevisionBtn) {
      detailCreateRevisionBtn.addEventListener("click", function () {
        if (!selectedDetailId) {
          showMessage("Pilih detail observasi terlebih dahulu.", true);
          return;
        }
        window.location.href = getObservationEditHref(selectedDetailId);
      });
    }

    if (detailExportXlsxBtn) {
      detailExportXlsxBtn.addEventListener("click", function () {
        if (!selectedDetailId) {
          showMessage("Pilih detail observasi terlebih dahulu.", true);
          return;
        }
        var data = SWStorage.loadData();
        var obs = (data.observations || []).find(function (item) {
          return item.id === selectedDetailId;
        });
        if (!obs) {
          showMessage("Data detail tidak ditemukan.", true);
          return;
        }
        exportDetailXlsx(obs);
        showMessage("Detail observasi diexport ke Excel (.xlsx).");
      });
    }

    renderObservationList();
  }

  // Isi <select> dari [{ value, label }]; pilih `preferred` bila ada di daftar.
  function fillOptions(el, items, preferred, emptyText) {
    el.innerHTML = items.length
      ? items.map(function (item) { return "<option value='" + sanitize(item.value) + "'>" + sanitize(item.label) + "</option>"; }).join("")
      : "<option value=''>" + sanitize(emptyText) + "</option>";
    var values = items.map(function (item) { return item.value; });
    if (preferred != null && values.indexOf(preferred) >= 0) el.value = preferred;
  }

  function buildTskkRows(observation) {
    return (observation.elements || []).map(function (el, i) {
      var avg = Number(el.avg) || 0;
      var cat = String(el.category || el.type || "").trim();
      var isManual  = cat === "Value" || cat === "Non Value" || cat === "Irregular";
      var isAuto    = cat === "Machine";
      var isWalking = cat === "Walking";
      return {
        no: i + 1,
        name: el.name,
        type: isAuto ? "Machine" : isWalking ? "Walking" : "Manual",
        category: cat,
        avg: avg,
        manual:  isManual  ? avg : 0,
        machine: isAuto    ? avg : 0,
        walking: isWalking ? avg : 0
      };
    });
  }

  function initTskkPage() {
    var select      = byId("tskkObsSelect");
    var generateBtn = byId("tskkGenerateBtn");
    var printBtn    = byId("tskkPrintBtn");
    var exportBtn   = byId("tskkExportBtn");
    var rowsBody    = byId("tskkRows");
    var canvas      = byId("tskkChartCanvas");
    var chartWrap   = byId("tskkChartWrap");
    var MAX_ROWS    = 20;
    var ROW_H       = 26;
    var rowsCache   = [];
    var obsCache    = null;

    var lineSelect    = byId("tskkLineSelect");
    var productSelect = byId("tskkProductSelect");

    if (!select || !generateBtn) return;

    // Filter bertingkat: Line → Type Produk → Proses (value proses = id observasi).
    function trimmed(value) {
      return String(value || "").trim();
    }

    function renderProcessOptions(preferredId) {
      var data = SWStorage.loadData();
      var line = lineSelect.value;
      var product = productSelect.value;
      var list = getActiveObservations(data).filter(function (obs) {
        return trimmed(obs.lineName) === line && trimmed(obs.productType) === product;
      });
      list = sortObservationsByProcessOrder(line, list, data);
      fillOptions(select, list.map(function (obs) {
        var operator = trimmed(obs.operatorName);
        return {
          value: obs.id,
          label: (trimmed(obs.processName) || "Tanpa Nama Proses") + (operator ? " - " + operator : "") + " (" + getObservationRevisionLabel(obs) + ")"
        };
      }), preferredId, "Belum ada proses");
    }

    function renderProductOptions(preferredProduct, preferredId) {
      var line = lineSelect.value;
      var seen = {};
      var products = [];
      getActiveObservations(SWStorage.loadData()).forEach(function (obs) {
        var product = trimmed(obs.productType);
        if (trimmed(obs.lineName) !== line || seen[product]) return;
        seen[product] = true;
        products.push(product);
      });
      products.sort(function (a, b) { return a.localeCompare(b, "id"); });
      fillOptions(productSelect, products.map(function (product) {
        return { value: product, label: product || "(Tanpa Type Produk)" };
      }), preferredProduct, "Belum ada type produk");
      renderProcessOptions(preferredId);
    }

    function renderOptions() {
      var data = SWStorage.loadData();
      var observations = getActiveObservations(data);
      var activeObs = observations.find(function (obs) { return obs.id === data.activeObservationId; }) || null;
      var lines = sortLineNames(buildUniqueValues(observations, "lineName"));
      fillOptions(lineSelect, lines.map(function (line) { return { value: line, label: line }; }),
        activeObs ? trimmed(activeObs.lineName) : null, "Belum ada data observasi");
      renderProductOptions(activeObs ? trimmed(activeObs.productType) : null, activeObs ? activeObs.id : null);
    }

    lineSelect.addEventListener("change", function () {
      renderProductOptions(null, null);
      if (select.value) generate();
    });
    productSelect.addEventListener("change", function () {
      renderProcessOptions(null);
      if (select.value) generate();
    });
    select.addEventListener("change", function () {
      if (select.value) generate();
    });

    function fmt1(v) { return (Math.round(Number(v) * 10) / 10).toFixed(1); }

    function renderHeader(obs, ct, tt) {
      var d = obs.obsTanggal || obs.createdAt;
      var dateStr = d ? (function () {
        var dt = new Date(d);
        if (isNaN(dt.getTime())) return d;
        return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      }()) : "-";

      setText(byId("tskkHdrLine"),    obs.lineName    || "-");
      setText(byId("tskkHdrTanggal"), dateStr);
      setText(byId("tskkHdrTarget"),  obs.targetPerShift != null ? String(obs.targetPerShift) : "-");
      setText(byId("tskkHdrCt"),      fmt1(ct));
      setText(byId("tskkHdrTt"),      fmt1(tt));

      var prosesText = obs.processName || "-";

      // Kotak kecil (nilai sebelah kanan label Proses)
      setText(byId("tskkHdrProsesSmall"), prosesText);

      // Kotak besar kanan (nama proses, font proporsional)
      var prosesEl = byId("tskkHdrProses");
      if (prosesEl) {
        prosesEl.textContent = prosesText;
        var len = prosesText.length;
        prosesEl.style.fontSize = len <= 10 ? "18px" : len <= 18 ? "15px" : len <= 26 ? "12px" : "10px";
      }

      // Kotak Model/Tipe — product type
      setText(byId("tskkHdrModel"), obs.productType || "-");
    }

    function renderRows(rows) {
      rowsBody.innerHTML = "";
      var totalManual = 0, totalAuto = 0, totalWalking = 0;

      for (var i = 0; i < MAX_ROWS; i++) {
        var row = rows[i] || null;
        var tr = document.createElement("tr");
        if (row) {
          totalManual  += row.manual;
          totalAuto    += row.machine;
          totalWalking += row.walking;
          tr.innerHTML =
            "<td>" + row.no + "</td>" +
            "<td class='td-name'>" + sanitize(row.name) + "</td>" +
            "<td>" + (row.manual  > 0 ? fmt1(row.manual)  : "") + "</td>" +
            "<td>" + (row.machine > 0 ? fmt1(row.machine) : "") + "</td>" +
            "<td>" + (row.walking > 0 ? fmt1(row.walking) : "") + "</td>";
        } else {
          tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
        }
        rowsBody.appendChild(tr);
      }

      var setCell = function (id, v) { var el = byId(id); if (el) el.textContent = v > 0 ? fmt1(v) : "0"; };
      setCell("tskkTotalManual",  totalManual);
      setCell("tskkTotalAuto",    totalAuto);
      setCell("tskkTotalWalking", totalWalking);
    }

    function drawChart(rows, ct, tt) {
      if (!canvas || !chartWrap) return;

      // Skala: default 60 detik, menyesuaikan ke kelipatan 5 (≤100) atau 10 (>100)
      var rawMax = Math.max(ct, tt);
      var step   = rawMax > 100 ? 10 : 5;
      var maxTime = Math.max(60, Math.ceil(rawMax / step) * step + step);
      maxTime = Math.ceil(maxTime / step) * step;

      var THEAD_ROWS = 2;
      var TFOOT_ROWS = 1;
      var totalCanvasRows = THEAD_ROWS + MAX_ROWS + TFOOT_ROWS;
      var H = totalCanvasRows * ROW_H;

      // Set canvas logical height to match table
      canvas.style.height = H + "px";
      chartWrap.style.minHeight = H + "px";

      var dpr     = (window.devicePixelRatio || 1) * uiZoom(chartWrap);
      var W       = Math.max(180, chartWrap.offsetWidth || 300);
      var PAD_R   = 14; // ruang kanan agar angka skala terakhir tidak terpotong
      var chartW  = W - PAD_R;

      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + "px";

      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      var pps = chartW / maxTime; // pixels per second

      // ── Background ──
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);

      // ── Header row 1: "Timing Chart (detik)" ──
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, W, ROW_H);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, 0, W, ROW_H);
      ctx.fillStyle = "#111";
      ctx.font = "bold 10px Bahnschrift,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Timing Chart  (detik)", W / 2, ROW_H / 2);

      // ── Header row 2: time scale ──
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, ROW_H, W, ROW_H);
      ctx.fillStyle = "#111";
      ctx.font = "9px Bahnschrift,sans-serif";
      ctx.textAlign = "center";
      for (var t = 5; t <= maxTime; t += 5) {
        ctx.fillText(String(t), t * pps, ROW_H + ROW_H / 2);
      }
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, ROW_H, W, ROW_H);

      // ── Vertical grid lines (every 5s) ──
      ctx.strokeStyle = "rgba(100,120,140,0.3)";
      ctx.lineWidth = 0.5;
      for (var gt = 5; gt <= maxTime; gt += 5) {
        var gx = gt * pps;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }

      // ── Horizontal row separators ──
      ctx.strokeStyle = "rgba(100,120,140,0.25)";
      ctx.lineWidth = 0.5;
      for (var rr = 0; rr <= totalCanvasRows; rr++) {
        var ry = rr * ROW_H;
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(W, ry);
        ctx.stroke();
      }

      // ── Draw timing bars (cumulative) ──
      var cumTime = 0;
      rows.slice(0, MAX_ROWS).forEach(function (row, i) {
        if (!row || row.avg <= 0) return;
        var rowY  = (THEAD_ROWS + i) * ROW_H;
        var barX  = Math.round(cumTime * pps);
        var barW  = Math.max(1, Math.round(row.avg * pps));
        var barY  = rowY + 4;
        var barH  = ROW_H - 8;

        if (row.type === "Manual") {
          ctx.fillStyle = "#222";
          ctx.fillRect(barX, barY, barW, barH);

        } else if (row.type === "Machine") {
          // Dashed outline box
          ctx.save();
          ctx.strokeStyle = "#222";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(barX + 1, barY, barW - 2, barH);
          ctx.restore();

        } else if (row.type === "Walking") {
          // Arc bumps
          ctx.save();
          ctx.strokeStyle = "#222";
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          var midY  = rowY + ROW_H / 2;
          var bumpR = barH / 2;
          var bumps = Math.max(1, Math.round(barW / (bumpR * 2)));
          var bumpW = barW / bumps;
          ctx.beginPath();
          for (var b = 0; b < bumps; b++) {
            var bCx = barX + b * bumpW + bumpW / 2;
            ctx.arc(bCx, midY, bumpW / 2, Math.PI, 0, false);
          }
          ctx.stroke();
          ctx.restore();

        } else {
          // Waiting / other: hatched
          ctx.fillStyle = "rgba(200,200,200,0.5)";
          ctx.fillRect(barX, barY, barW, barH);
        }

        cumTime += row.avg;
      });

      var dataTop    = THEAD_ROWS * ROW_H;
      var dataBottom = (THEAD_ROWS + MAX_ROWS) * ROW_H;

      // ── CT line (blue) ──
      if (ct > 0) {
        var ctX = Math.round(ct * pps);
        ctx.strokeStyle = "#1565c0";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ctX, dataTop);
        ctx.lineTo(ctX, dataBottom);
        ctx.stroke();
      }

      // ── TT line (red) ──
      if (tt > 0) {
        var ttX = Math.round(tt * pps);
        ctx.strokeStyle = "#c62828";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ttX, dataTop);
        ctx.lineTo(ttX, dataBottom);
        ctx.stroke();
      }

      // ── Waiting arrow (CT < TT) ──
      if (ct > 0 && tt > 0 && ct < tt) {
        var wRow = Math.min(rows.length, MAX_ROWS - 1);
        var wY   = (THEAD_ROWS + wRow) * ROW_H + ROW_H / 2;
        var wX1  = Math.round(ct * pps);
        var wX2  = Math.round(tt * pps);

        ctx.strokeStyle = "#c62828";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(wX1, wY);
        ctx.lineTo(wX2, wY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow tips
        ctx.fillStyle = "#c62828";
        [{ tip: wX1, dir: 1 }, { tip: wX2, dir: -1 }].forEach(function (a) {
          ctx.beginPath();
          ctx.moveTo(a.tip, wY);
          ctx.lineTo(a.tip + a.dir * 6, wY - 4);
          ctx.lineTo(a.tip + a.dir * 6, wY + 4);
          ctx.closePath();
          ctx.fill();
        });

        ctx.fillStyle = "#c62828";
        ctx.font = "9px Bahnschrift,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("Waiting", (wX1 + wX2) / 2, wY - 1);
      }

      // ── Footer row: CT and TT labels ──
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, dataBottom, W, ROW_H);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, dataBottom, W, ROW_H);
      ctx.textBaseline = "middle";

      if (ct > 0) {
        var ctLx = Math.round(ct * pps);
        ctx.fillStyle = "#1565c0";
        ctx.font = "bold 9px Bahnschrift,sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CT: " + fmt1(ct), ctLx, dataBottom + ROW_H / 2);
      }
      if (tt > 0) {
        var ttLx = Math.round(tt * pps);
        ctx.fillStyle = "#c62828";
        ctx.font = "bold 9px Bahnschrift,sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TT: " + fmt1(tt), ttLx, dataBottom + ROW_H / 2);
      }

      // ── Outer border ──
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(0, 0, W, H);
    }

    function generate() {
      var data = SWStorage.loadData();
      var obs  = (data.observations || []).find(function (x) { return x.id === select.value; });
      if (!obs) { showMessage("Pilih observasi terlebih dahulu.", true); return; }

      obsCache   = obs;
      rowsCache  = buildTskkRows(obs);
      var ct     = rowsCache.reduce(function (s, r) { return s + r.avg; }, 0);
      var tt     = Number(obs.taktTime) || 0;

      renderHeader(obs, ct, tt);
      renderRows(rowsCache);

      // Draw after layout is painted
      requestAnimationFrame(function () {
        drawChart(rowsCache, ct, tt);
      });

      setActiveObservation(obs.id);
      showMessage("TSKK berhasil digenerate.");
    }

    generateBtn.addEventListener("click", generate);

    printBtn && printBtn.addEventListener("click", function () {
      window.print();
    });

    exportBtn && exportBtn.addEventListener("click", function () {
      if (!rowsCache.length) { showMessage("Generate dulu sebelum export.", true); return; }
      var obs = obsCache || {};
      var xlRows = [
        ["TABEL STANDAR KERJA KOMBINASI"],
        ["Line", obs.lineName || "", "Proses", obs.processName || ""],
        ["Model/Tipe", obs.productType || "", "Takt Time", Number(obs.taktTime) || ""],
        [],
        ["No", "Uraian Pekerjaan", "Manual", "Auto (Machine)", "Walking"]
      ];
      var ct = 0;
      for (var i = 0; i < MAX_ROWS; i++) {
        var r = rowsCache[i];
        if (r) {
          xlRows.push([r.no, r.name, r.manual > 0 ? r.manual : "", r.machine > 0 ? r.machine : "", r.walking > 0 ? r.walking : ""]);
          ct += r.avg;
        } else {
          xlRows.push([i + 1, "", "", "", ""]);
        }
      }
      var totalManual  = rowsCache.reduce(function (s, r) { return s + r.manual; }, 0);
      var totalMachine = rowsCache.reduce(function (s, r) { return s + r.machine; }, 0);
      var totalWalking = rowsCache.reduce(function (s, r) { return s + r.walking; }, 0);
      xlRows.push(["Total", "", totalManual, totalMachine, totalWalking]);
      xlRows.push(["CT", ct, "TT", Number(obs.taktTime) || ""]);
      SWStorage.downloadXlsx("tskk-export.xlsx", xlRows, "TSKK");
      showMessage("TSKK diexport ke Excel (.xlsx).");
    });

    // Redraw on window resize & saat cetak (timing chart selebar kertas)
    function redrawChart() {
      if (obsCache && rowsCache.length) {
        var ct = rowsCache.reduce(function (s, r) { return s + r.avg; }, 0);
        var tt = Number(obsCache.taktTime) || 0;
        drawChart(rowsCache, ct, tt);
      }
    }
    onWindow("resize", redrawChart);
    onPrintModeChange(redrawChart);

    renderOptions();

    // Auto-generate if there is an active observation
    if (select.value) generate();
  }

  // ── TSK (Tabel Standar Kerja, Form-ISD-ISD-003): satu lembar per proses (satu data observasi) ──
  // Lingkaran bernomor di layout = nomor pekerjaan di tabel (kolom NO); pekerjaan Walking tidak punya lingkaran
  // sendiri (jalannya = panah antar posisi). Layout (kotak mesin, posisi lingkaran, simbol, operator, DARI/KE,
  // revisi, WIP) disimpan di data.tskLayouts["obs||<groupId observasi>"] → dipakai juga oleh revisi berikutnya.
  // Koordinat dalam satuan viewBox SVG.
  var TSK_VB_W = 930;
  var TSK_VB_H = 600;
  var TSK_TOP = 110;          // ruang kotak DARI / KE di kiri atas layout
  var TSK_STATION_R = 22;
  var TSK_MARKER = 40;        // ukuran simbol Quality Check / Safety / WIP
  var TSK_MIN_ROWS = 20;
  var TSK_MARKER_LABEL = { qc: "Quality Check", safety: "Safety", wip: "WIP" };

  function tskNum(value) {
    var n = Math.round((Number(value) || 0) * 10) / 10;
    return n ? String(n) : "";
  }

  function tskClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function tskWrap(text, maxChars) {
    var lines = [];
    var current = "";
    String(text || "").split(/\s+/).filter(Boolean).forEach(function (word) {
      if (current && (current + " " + word).length > maxChars) {
        lines.push(current);
        current = word;
      } else {
        current = current ? current + " " + word : word;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  // Baris tabel: Value / Non Value / Irregular / lainnya → MAN, Machine → AUTO, Walking → JALAN (sama dengan TSKK).
  function tskBuildRows(observation) {
    var rows = [];
    ((observation && observation.elements) || []).forEach(function (el) {
      var name = String(el.name || "").trim();
      var duration = getElementDuration(el);
      if (!name && !(duration > 0)) return;
      var cat = classifyCategory(el.category || el.type || "");
      rows.push({
        no: rows.length + 1,
        name: name,
        walking: cat === "walking",
        man: cat !== "machine" && cat !== "walking" ? duration : 0,
        auto: cat === "machine" ? duration : 0,
        jalan: cat === "walking" ? duration : 0
      });
    });
    return rows;
  }

  // Posisi awal: satu kotak mesin (nama proses) di atas, lingkaran pekerjaan berjajar di bawahnya, operator di kiri.
  function tskDefaultLayout(processName, stationNos) {
    var layout = { boxes: [], stations: {}, markers: [], operator: null };
    layout.boxes.push({ id: yzeUid("tb"), name: processName, x: 330, y: TSK_TOP + 10, w: 260, h: 90 });

    var n = Math.max(1, stationNos.length);
    var cols = Math.min(n, 7);
    var left = 170;
    var cellW = (TSK_VB_W - left - 30) / cols;
    var rowH = Math.min(110, (TSK_VB_H - (TSK_TOP + 190) - 20) / Math.max(1, Math.ceil(n / cols) - 1 || 1));
    stationNos.forEach(function (no, i) {
      layout.stations[no] = {
        x: Math.round(left + cellW * (i % cols) + cellW / 2),
        y: Math.round(TSK_TOP + 190 + Math.floor(i / cols) * rowH)
      };
    });
    layout.operator = { x: 70, y: TSK_TOP + 200 };
    return layout;
  }

  function tskOperatorSvg(op, name, selected) {
    return "<g data-kind='operator' class='tsk-item' transform='translate(" + op.x + "," + op.y + ")'>" +
      (selected ? "<rect class='tsk-sel' x='-38' y='-44' width='76' height='72' rx='6'/>" : "") +
      "<rect x='-31' y='-40' width='9' height='28' rx='4.5' fill='#fff' stroke='#111' stroke-width='1.6' transform='rotate(-14 -26 -26)'/>" +
      "<rect x='22' y='-40' width='9' height='28' rx='4.5' fill='#fff' stroke='#111' stroke-width='1.6' transform='rotate(14 26 -26)'/>" +
      "<ellipse cx='-26' cy='-4' rx='9' ry='12' fill='#3d6bc9' stroke='#111' stroke-width='1.6'/>" +
      "<ellipse cx='26' cy='-4' rx='9' ry='12' fill='#3d6bc9' stroke='#111' stroke-width='1.6'/>" +
      "<ellipse cx='0' cy='0' rx='24' ry='21' fill='#fff' stroke='#111' stroke-width='1.8'/>" +
      "<circle cx='0' cy='3' r='15' fill='#fff' stroke='#111' stroke-width='1.6'/>" +
      "<path d='M-11,-4 L0,7 L11,-4' fill='none' stroke='#111' stroke-width='1.6'/>" +
      (name ? "<text x='40' y='5' class='tsk-op-label'>" + sanitize(name) + "</text>" : "") +
      "</g>";
  }

  function initTskPage() {
    var lineSelect = byId("tskLineSelect");
    var productSelect = byId("tskProductSelect");
    var procSelect = byId("tskProcessSelect");
    var printBtn = byId("tskPrintBtn");
    var deleteBtn = byId("tskDeleteBtn");
    var resetBtn = byId("tskResetBtn");
    var svg = byId("tskLayoutSvg");
    var rowsBody = byId("tskRows");
    var dariInput = byId("tskDari");
    var keInput = byId("tskKe");
    var revisiInput = byId("tskRevisi");
    var wipInput = byId("tskWip");
    if (!lineSelect || !svg) return;

    // obs: observasi terpilih; rows: baris tabel; stationNos: nomor pekerjaan yang punya lingkaran; selected: { kind, id }
    var state = { key: null, obs: null, rows: [], stationNos: [], layout: null, selected: null };
    var drag = null;
    var saveTimer = null;

    function trimmed(value) {
      return String(value || "").trim();
    }

    // ── Pilihan Line → Type Produk → Proses (value proses = id observasi) ──
    function filtered(line, product) {
      return getActiveObservations(SWStorage.loadData()).filter(function (obs) {
        if (line != null && trimmed(obs.lineName) !== line) return false;
        if (product != null && trimmed(obs.productType) !== product) return false;
        return true;
      });
    }

    function renderProcessOptions(preferredId) {
      var line = lineSelect.value;
      var list = sortObservationsByProcessOrder(line, filtered(line, productSelect.value), SWStorage.loadData());
      fillOptions(procSelect, list.map(function (obs) {
        var operator = trimmed(obs.operatorName);
        return {
          value: obs.id,
          label: (trimmed(obs.processName) || "Tanpa Nama Proses") + (operator ? " - " + operator : "") + " (" + getObservationRevisionLabel(obs) + ")"
        };
      }), preferredId, "Belum ada proses");
    }

    function renderProductOptions(preferredProduct, preferredId) {
      var products = buildUniqueValues(filtered(lineSelect.value, null), "productType");
      fillOptions(productSelect, products.map(function (product) {
        return { value: product, label: product };
      }), preferredProduct, "Belum ada type produk");
      renderProcessOptions(preferredId);
    }

    function renderOptions() {
      var data = SWStorage.loadData();
      var observations = getActiveObservations(data);
      var active = observations.find(function (obs) { return obs.id === data.activeObservationId; }) || null;
      var lines = sortLineNames(buildUniqueValues(observations, "lineName"));
      fillOptions(lineSelect, lines.map(function (line) { return { value: line, label: line }; }),
        active ? trimmed(active.lineName) : null, "Belum ada data observasi");
      renderProductOptions(active ? trimmed(active.productType) : null, active ? active.id : null);
    }

    // ── Penyimpanan layout (debounce supaya geser/ketik tidak menulis storage terus-menerus) ──
    function saveLayout() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (!state.key || !state.layout) return;
      var key = state.key;
      var layout = JSON.parse(JSON.stringify(state.layout));
      layout.updatedAt = new Date().toISOString();
      SWStorage.updateData(function (data) {
        data.tskLayouts[key] = layout;
        return data;
      });
    }

    function saveSoon() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveLayout, 400);
    }

    // Simpan perubahan yang masih tertunda saat pindah halaman.
    routeCleanups.push(function () {
      if (saveTimer) saveLayout();
    });

    // Isian DARI / KE yang panjang (mis. nama pekerjaan) dikecilkan hurufnya sampai muat di kotak.
    function fitFromTo() {
      [dariInput, keInput].forEach(function (input) {
        input.style.fontSize = "";
        var size = parseFloat(getComputedStyle(input).fontSize) || 19;
        while (input.scrollWidth > input.clientWidth + 1 && size > 10) {
          size -= 1;
          input.style.fontSize = size + "px";
        }
      });
    }
    onWindow("resize", fitFromTo);
    onPrintModeChange(fitFromTo);

    // ── Isi lembar: header, tabel pekerjaan, footer ──
    function renderSheet() {
      var obs = state.obs;
      var L = state.layout;
      var rows = state.rows;
      var processName = obs ? trimmed(obs.processName) || "Tanpa Nama Proses" : "";

      setText(byId("tskHdrNama"), processName || "-");
      dariInput.value = !L ? "" : (L.dari != null ? L.dari : (rows.length ? rows[0].name : ""));
      keInput.value = !L ? "" : (L.ke != null ? L.ke : (rows.length ? rows[rows.length - 1].name : ""));
      revisiInput.value = !L ? "" : (L.revisi != null ? L.revisi : "0");
      wipInput.value = L && L.wip != null ? L.wip : "";
      [dariInput, keInput, revisiInput, wipInput].forEach(function (input) { input.disabled = !L; });
      fitFromTo();

      var totals = { man: 0, auto: 0, jalan: 0 };
      var html = "";
      for (var i = 0; i < Math.max(TSK_MIN_ROWS, rows.length); i++) {
        var r = rows[i];
        if (r) {
          totals.man += r.man;
          totals.auto += r.auto;
          totals.jalan += r.jalan;
        }
        html += r
          ? "<tr><td>" + r.no + "</td><td class='tsk-td-name'>" + sanitize(r.name) + "</td><td>" + tskNum(r.man) + "</td><td>" + tskNum(r.auto) + "</td><td>" + tskNum(r.jalan) + "</td></tr>"
          : "<tr><td></td><td></td><td></td><td></td><td></td></tr>";
      }
      rowsBody.innerHTML = html;
      byId("tskTotalMan").textContent = obs ? tskNum(totals.man) || "0" : "";
      byId("tskTotalAuto").textContent = obs ? tskNum(totals.auto) || "0" : "";
      byId("tskTotalJalan").textContent = obs ? tskNum(totals.jalan) || "0" : "";

      var dateRaw = obs ? obs.obsTanggal || obs.createdAt || "" : "";
      var dateText = "-";
      if (dateRaw) {
        var dt = new Date(dateRaw);
        dateText = isNaN(dt.getTime()) ? dateRaw : dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      }
      setText(byId("tskFootLine"), obs ? trimmed(obs.lineName) : "-");
      setText(byId("tskFootProses"), processName || "-");
      setText(byId("tskFootTipe"), obs ? trimmed(obs.productType) : "-");
      setText(byId("tskFootTanggal"), dateText);

      var takt = obs ? Number(obs.taktTime) || 0 : 0;
      var cycle = totals.man + totals.auto + totals.jalan;
      setText(byId("tskTakt"), takt ? tskNum(takt) : "-");
      setText(byId("tskCycle"), cycle ? tskNum(cycle) : "-");
      setText(byId("tskMp"), obs ? "1" : "-");
    }

    // ── Layout SVG ──
    function isSelected(kind, id) {
      return !!state.selected && state.selected.kind === kind && state.selected.id === id;
    }

    function renderLayout() {
      var L = state.layout;
      var html = "<rect width='" + TSK_VB_W + "' height='" + TSK_VB_H + "' fill='url(#tskGrid)'/>";
      if (!L) {
        svg.innerHTML = html;
        deleteBtn.disabled = true;
        return;
      }

      // Kotak mesin / area
      L.boxes.forEach(function (b) {
        var sel = isSelected("box", b.id);
        var maxChars = Math.max(4, Math.floor((b.w - 12) / 8));
        var lines = tskWrap(b.name, maxChars);
        var lineH = 18;
        var y0 = b.y + b.h / 2 - ((lines.length - 1) * lineH) / 2;
        html += "<g data-kind='box' data-id='" + sanitize(b.id) + "' class='tsk-item'>" +
          "<rect x='" + b.x + "' y='" + b.y + "' width='" + b.w + "' height='" + b.h + "' fill='#fff' stroke='" + (sel ? "#5e6ad2" : "#111") + "' stroke-width='" + (sel ? 2.5 : 1.8) + "'/>" +
          lines.map(function (line, i) {
            return "<text x='" + (b.x + b.w / 2) + "' y='" + (y0 + i * lineH) + "' class='tsk-box-label'>" + sanitize(line) + "</text>";
          }).join("") +
          (sel ? "<rect data-handle='resize' class='tsk-handle' x='" + (b.x + b.w - 6) + "' y='" + (b.y + b.h - 6) + "' width='12' height='12'/>" : "") +
          "</g>";
      });

      // Alur operator mengikuti nomor pekerjaan: posisi → posisi berikutnya (garis penuh); posisi terakhir → posisi
      // pertama (putus-putus = kembali), melengkung supaya tidak menumpuk dengan garis maju.
      var pts = state.stationNos.map(function (no) { return L.stations[no]; });
      var gap = TSK_STATION_R + 6;
      function arrow(a, b) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gap * 2 + 4) return "";
        var ux = dx / dist;
        var uy = dy / dist;
        return "<line x1='" + (a.x + ux * gap) + "' y1='" + (a.y + uy * gap) + "' x2='" + (b.x - ux * (gap + 4)) + "' y2='" + (b.y - uy * (gap + 4)) +
          "' stroke='#111' stroke-width='3' marker-end='url(#tskArrow)'/>";
      }
      function returnArrow(a, b) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gap * 2 + 4) return "";
        var px = -dy / dist;
        var py = dx / dist;
        if (py < 0 || (py === 0 && px < 0)) { px = -px; py = -py; }
        var bend = Math.min(90, Math.max(40, dist * 0.25));
        var cx = (a.x + b.x) / 2 + px * bend;
        var cy = (a.y + b.y) / 2 + py * bend;
        // Titik awal/akhir di tepi lingkaran, searah garis singgung kurva.
        function edge(p, toward, extra) {
          var ex = toward.x - p.x;
          var ey = toward.y - p.y;
          var d = Math.sqrt(ex * ex + ey * ey) || 1;
          return { x: p.x + ex / d * (gap + extra), y: p.y + ey / d * (gap + extra) };
        }
        var s = edge(a, { x: cx, y: cy }, 0);
        var e = edge(b, { x: cx, y: cy }, 4);
        return "<path d='M" + s.x + "," + s.y + " Q" + cx + "," + cy + " " + e.x + "," + e.y +
          "' fill='none' stroke='#111' stroke-width='3' stroke-dasharray='14 9' marker-end='url(#tskArrow)'/>";
      }
      for (var i = 0; i < pts.length - 1; i++) html += arrow(pts[i], pts[i + 1]);
      if (pts.length > 1) html += returnArrow(pts[pts.length - 1], pts[0]);

      // Lingkaran bernomor = nomor pekerjaan di tabel
      state.stationNos.forEach(function (no) {
        var s = L.stations[no];
        var row = state.rows[Number(no) - 1];
        html += "<g data-kind='station' data-id='" + sanitize(no) + "' class='tsk-item'>" +
          "<title>" + sanitize(no + ". " + (row ? row.name : "")) + "</title>" +
          (isSelected("station", no) ? "<circle class='tsk-sel' cx='" + s.x + "' cy='" + s.y + "' r='" + (TSK_STATION_R + 6) + "'/>" : "") +
          "<circle cx='" + s.x + "' cy='" + s.y + "' r='" + TSK_STATION_R + "' fill='#fff' stroke='#111' stroke-width='1.8'/>" +
          "<text x='" + s.x + "' y='" + s.y + "' class='tsk-station-no'>" + sanitize(no) + "</text>" +
          "</g>";
      });

      // Simbol Quality Check / Safety / WIP
      L.markers.forEach(function (m) {
        var half = TSK_MARKER / 2;
        html += "<g data-kind='marker' data-id='" + sanitize(m.id) + "' class='tsk-item'>" +
          "<title>" + sanitize(TSK_MARKER_LABEL[m.type] || "") + "</title>" +
          (isSelected("marker", m.id) ? "<rect class='tsk-sel' x='" + (m.x - half - 5) + "' y='" + (m.y - half - 5) + "' width='" + (TSK_MARKER + 10) + "' height='" + (TSK_MARKER + 10) + "' rx='4'/>" : "") +
          "<use href='#tsk-sym-" + sanitize(m.type) + "' x='" + (m.x - half) + "' y='" + (m.y - half) + "' width='" + TSK_MARKER + "' height='" + TSK_MARKER + "'/>" +
          "</g>";
      });

      html += tskOperatorSvg(L.operator, state.obs ? trimmed(state.obs.operatorName) : "", isSelected("operator", "op"));
      svg.innerHTML = html;

      var kind = state.selected && state.selected.kind;
      deleteBtn.disabled = kind !== "box" && kind !== "marker";
    }

    function getItem(kind, id) {
      var L = state.layout;
      if (!L) return null;
      if (kind === "box") return L.boxes.find(function (b) { return b.id === id; }) || null;
      if (kind === "marker") return L.markers.find(function (m) { return m.id === id; }) || null;
      if (kind === "station") return L.stations[id] || null;
      if (kind === "operator") return L.operator;
      return null;
    }

    function clampItem(kind, item) {
      if (kind === "box") {
        item.x = Math.round(tskClamp(item.x, 0, TSK_VB_W - item.w));
        item.y = Math.round(tskClamp(item.y, 0, TSK_VB_H - item.h));
      } else {
        var pad = kind === "station" ? TSK_STATION_R : kind === "marker" ? TSK_MARKER / 2 : 40;
        item.x = Math.round(tskClamp(item.x, pad, TSK_VB_W - pad));
        item.y = Math.round(tskClamp(item.y, pad, TSK_VB_H - pad));
      }
    }

    function select(kind, id) {
      state.selected = kind ? { kind: kind, id: id } : null;
      renderLayout();
    }

    // Titik pointer (px layar) → koordinat viewBox SVG.
    function toSvgPoint(event) {
      var pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      var ctm = svg.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
    }

    svg.addEventListener("pointerdown", function (event) {
      if (!state.layout || event.button !== 0) return;
      var handle = event.target.closest("[data-handle]");
      var target = event.target.closest("[data-kind]");
      if (!target) {
        select(null);
        return;
      }
      var kind = target.getAttribute("data-kind");
      var id = kind === "operator" ? "op" : target.getAttribute("data-id");
      var item = getItem(kind, id);
      if (!item) return;
      event.preventDefault();
      drag = {
        kind: kind,
        item: item,
        resize: !!handle,
        start: toSvgPoint(event),
        orig: { x: item.x, y: item.y, w: item.w, h: item.h },
        moved: false
      };
      try { svg.setPointerCapture(event.pointerId); } catch (error) { /* pointer sudah tidak aktif */ }
      select(kind, id);
    });

    svg.addEventListener("pointermove", function (event) {
      if (!drag) return;
      var p = toSvgPoint(event);
      var dx = p.x - drag.start.x;
      var dy = p.y - drag.start.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      drag.moved = true;
      if (drag.resize) {
        drag.item.w = Math.round(tskClamp(drag.orig.w + dx, 40, TSK_VB_W - drag.item.x));
        drag.item.h = Math.round(tskClamp(drag.orig.h + dy, 30, TSK_VB_H - drag.item.y));
      } else {
        drag.item.x = drag.orig.x + dx;
        drag.item.y = drag.orig.y + dy;
        clampItem(drag.kind, drag.item);
      }
      renderLayout();
    });

    function endDrag(event) {
      if (!drag) return;
      if (svg.hasPointerCapture && svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (drag.moved) saveSoon();
      drag = null;
    }
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    svg.addEventListener("dblclick", function (event) {
      var target = event.target.closest("[data-kind='box']");
      if (!target) return;
      var box = getItem("box", target.getAttribute("data-id"));
      if (!box) return;
      var name = window.prompt("Nama mesin / area:", box.name);
      if (name == null) return;
      box.name = name.trim() || "Mesin / Area";
      renderLayout();
      saveSoon();
    });

    function deleteSelected() {
      var sel = state.selected;
      if (!sel || (sel.kind !== "box" && sel.kind !== "marker")) return;
      var listName = sel.kind === "box" ? "boxes" : "markers";
      state.layout[listName] = state.layout[listName].filter(function (item) { return item.id !== sel.id; });
      select(null);
      saveSoon();
    }

    deleteBtn.addEventListener("click", deleteSelected);

    onWindow("keydown", function (event) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      var el = document.activeElement;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      if (!state.selected) return;
      event.preventDefault();
      deleteSelected();
    });

    // Tambah kotak / simbol: muncul di tengah area, sedikit bergeser tiap kali supaya tidak menumpuk.
    document.querySelectorAll("[data-tsk-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!state.layout) {
          showMessage("Pilih proses dulu.", true);
          return;
        }
        var type = btn.getAttribute("data-tsk-add");
        var count = state.layout.boxes.length + state.layout.markers.length;
        var offset = (count % 6) * 20;
        var item;
        if (type === "box") {
          item = { id: yzeUid("tb"), name: "Mesin / Area", x: 380 + offset, y: TSK_TOP + 160 + offset, w: 170, h: 80 };
          state.layout.boxes.push(item);
        } else {
          item = { id: yzeUid("tm"), type: type, x: TSK_VB_W / 2 + offset, y: TSK_VB_H / 2 + offset };
          state.layout.markers.push(item);
        }
        clampItem(type === "box" ? "box" : "marker", item);
        select(type === "box" ? "box" : "marker", item.id);
        saveSoon();
      });
    });

    function defaultsForCurrent() {
      return tskDefaultLayout(trimmed(state.obs.processName) || "Tanpa Nama Proses", state.stationNos);
    }

    resetBtn.addEventListener("click", function () {
      if (!state.layout) return;
      if (!window.confirm("Atur ulang layout ke posisi awal? Kotak, simbol, dan posisi yang sudah diatur akan hilang (isian DARI/KE, revisi, dan WIP tetap).")) return;
      var fresh = defaultsForCurrent();
      ["dari", "ke", "revisi", "wip"].forEach(function (key) {
        if (state.layout[key] != null) fresh[key] = state.layout[key];
      });
      state.layout = fresh;
      select(null);
      saveSoon();
      showMessage("Layout diatur ulang.");
    });

    [[dariInput, "dari"], [keInput, "ke"], [revisiInput, "revisi"], [wipInput, "wip"]].forEach(function (pair) {
      pair[0].addEventListener("input", function () {
        if (!state.layout) return;
        state.layout[pair[1]] = pair[0].value;
        if (pair[0] === dariInput || pair[0] === keInput) fitFromTo();
        saveSoon();
      });
    });

    printBtn.addEventListener("click", function () {
      if (state.selected) select(null);
      window.print();
    });

    // ── Muat lembar untuk proses (observasi) terpilih ──
    function loadSheet() {
      if (saveTimer) saveLayout();
      var data = SWStorage.loadData();
      var obs = procSelect.value
        ? (data.observations || []).find(function (item) { return item.id === procSelect.value; }) || null
        : null;

      state.obs = obs;
      state.rows = tskBuildRows(obs);
      state.stationNos = state.rows.filter(function (r) { return !r.walking; }).map(function (r) { return String(r.no); });
      state.selected = null;

      if (!obs) {
        state.key = null;
        state.layout = null;
      } else {
        state.key = "obs||" + (getObservationGroupId(obs) || obs.id);
        var defaults = defaultsForCurrent();
        var saved = data.tskLayouts[state.key];
        var L = saved && typeof saved === "object" ? JSON.parse(JSON.stringify(saved)) : defaults;
        if (!Array.isArray(L.boxes)) L.boxes = [];
        if (!Array.isArray(L.markers)) L.markers = [];
        if (!L.stations || typeof L.stations !== "object") L.stations = {};
        if (!L.operator) L.operator = defaults.operator;
        // Pekerjaan baru (mis. setelah revisi) yang belum punya posisi → posisi default.
        state.stationNos.forEach(function (no) {
          if (!L.stations[no]) L.stations[no] = defaults.stations[no];
        });
        state.layout = L;
        setActiveObservation(obs.id);
      }
      renderSheet();
      renderLayout();
    }

    lineSelect.addEventListener("change", function () {
      renderProductOptions(null, null);
      loadSheet();
    });
    productSelect.addEventListener("change", function () {
      renderProcessOptions(null);
      loadSheet();
    });
    procSelect.addEventListener("change", loadSheet);

    renderOptions();
    loadSheet();
  }

  // ── TSKP (Tabel Standar Kapasitas Produksi, Form-ISD-ISD-005): satu lembar per line & type produk ──
  // Satu baris per proses (revisi aktif), urut sesuai urutan proses line. Isian manual (M/C number, tools,
  // waktu kerja per shift, revisi) disimpan di data.tskpSheets["<line>||<type produk>"], baris per groupId observasi.
  var TSKP_MIN_ROWS = 25;
  var TSKP_SHIFT_MIN = 435;   // default waktu kerja efektif per shift (menit), sama dengan standar Shift 1 FAH
  var TSKP_AXIS_DIV = 10;     // garis besar grafik

  // Batas skala grafik: 10 kolom dengan langkah bulat (1/2/2,5/3/4/5/6/8 × 10^n) supaya garis terpanjang mengisi grafik.
  function tskpScaleMax(value) {
    var raw = Math.max(1, Number(value) || 0) / TSKP_AXIS_DIV;
    var pow = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map(function (m) { return m * pow; }).find(function (s) { return s >= raw - 1e-9; });
    return step * TSKP_AXIS_DIV;
  }

  function tskpNumber(value) {
    var n = Number(value);
    return n > 0 ? n : 0;
  }

  function initTskpPage() {
    var lineSelect = byId("tskpLineSelect");
    var productSelect = byId("tskpProductSelect");
    var printBtn = byId("tskpPrintBtn");
    var exportBtn = byId("tskpExportBtn");
    var rowsBody = byId("tskpRows");
    var revisiInput = byId("tskpRevisi");
    var shiftInput = byId("tskpShiftMin");
    var summaryEl = byId("tskpSummary");
    if (!lineSelect || !rowsBody) return;

    // rows: { id (groupId), name, manual, auto, ttc }; sheet: isian manual yang disimpan
    var state = { key: null, line: "", product: "", rows: [], sheet: null, takt: 0, date: "" };
    var saveTimer = null;

    function trimmed(value) {
      return String(value || "").trim();
    }

    function filtered(line, product) {
      return getActiveObservations(SWStorage.loadData()).filter(function (obs) {
        if (line != null && trimmed(obs.lineName) !== line) return false;
        if (product != null && trimmed(obs.productType) !== product) return false;
        return true;
      });
    }

    // ── Pilihan Line → Type Produk ──
    function renderProductOptions(preferred) {
      var products = buildUniqueValues(filtered(lineSelect.value, null), "productType");
      fillOptions(productSelect, products.map(function (product) {
        return { value: product, label: product };
      }), preferred, "Belum ada type produk");
    }

    function renderOptions() {
      var data = SWStorage.loadData();
      var observations = getActiveObservations(data);
      var active = observations.find(function (obs) { return obs.id === data.activeObservationId; }) || null;
      var lines = sortLineNames(buildUniqueValues(observations, "lineName"));
      fillOptions(lineSelect, lines.map(function (line) { return { value: line, label: line }; }),
        active ? trimmed(active.lineName) : null, "Belum ada data observasi");
      renderProductOptions(active ? trimmed(active.productType) : null);
    }

    // ── Penyimpanan isian (debounce) ──
    function saveSheet() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (!state.key || !state.sheet) return;
      var key = state.key;
      var sheet = JSON.parse(JSON.stringify(state.sheet));
      sheet.updatedAt = new Date().toISOString();
      SWStorage.updateData(function (data) {
        data.tskpSheets = data.tskpSheets || {};
        data.tskpSheets[key] = sheet;
        return data;
      });
    }

    function saveSoon() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveSheet, 400);
    }

    routeCleanups.push(function () {
      if (saveTimer) saveSheet();
    });

    function shiftMinutes() {
      var v = state.sheet ? Number(state.sheet.shiftMin) : 0;
      return v > 0 ? v : TSKP_SHIFT_MIN;
    }

    function entryOf(id) {
      if (!state.sheet.rows[id]) state.sheet.rows[id] = {};
      return state.sheet.rows[id];
    }

    // Kapasitas/shift = waktu kerja ÷ (time to complete + waktu ganti tools per pcs)
    function capacityOf(row) {
      var entry = state.sheet.rows[row.id] || {};
      var noChanged = tskpNumber(entry.noChanged);
      var timeTaken = tskpNumber(entry.timeTaken);
      var perPiece = row.ttc + (noChanged > 0 ? timeTaken / noChanged : 0);
      return perPiece > 0 ? Math.floor(shiftMinutes() * 60 / perPiece) : null;
    }

    function loadSheet() {
      if (saveTimer) saveSheet();
      var data = SWStorage.loadData();
      var line = lineSelect.value;
      var product = productSelect.value;
      var list = sortObservationsByProcessOrder(line, filtered(line, product), data);

      state.line = line;
      state.product = product;
      state.key = list.length ? line + "||" + product : null;
      var saved = state.key && data.tskpSheets ? data.tskpSheets[state.key] : null;
      state.sheet = saved && typeof saved === "object" ? JSON.parse(JSON.stringify(saved)) : {};
      if (!state.sheet.rows || typeof state.sheet.rows !== "object") state.sheet.rows = {};

      // Nama proses yang muncul lebih dari sekali (beda operator) diberi nama operator.
      var nameCount = {};
      list.forEach(function (obs) {
        var name = trimmed(obs.processName) || "Tanpa Nama Proses";
        nameCount[name] = (nameCount[name] || 0) + 1;
      });

      var latest = 0;
      state.date = "";
      state.rows = list.map(function (obs) {
        var name = trimmed(obs.processName) || "Tanpa Nama Proses";
        var operator = trimmed(obs.operatorName);
        var manual = 0;
        var auto = 0;
        tskBuildRows(obs).forEach(function (r) {
          manual += r.man + r.jalan;
          auto += r.auto;
        });
        var dateRaw = obs.obsTanggal || obs.createdAt || "";
        var time = new Date(dateRaw).getTime();
        if (dateRaw && (!state.date || (time || 0) > latest)) {
          latest = time || 0;
          state.date = dateRaw;
        }
        return {
          id: getObservationGroupId(obs) || obs.id,
          name: nameCount[name] > 1 && operator ? name + " - " + operator : name,
          manual: manual,
          auto: auto,
          ttc: manual + auto
        };
      });
      state.takt = getAutoTakt(list);
      renderSheet();
    }

    // ── Isi lembar ──
    function renderSheet() {
      var has = !!state.key;
      var sheet = state.sheet;
      var rows = state.rows;

      byId("tskpHdrLine").textContent = has ? state.line : "";
      byId("tskpHdrProduk").textContent = has ? state.product : "";
      var dateText = "";
      if (state.date) {
        var dt = new Date(state.date);
        dateText = isNaN(dt.getTime()) ? state.date : dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      }
      byId("tskpHdrTanggal").textContent = has ? dateText : "";
      revisiInput.value = has ? (sheet.revisi != null ? sheet.revisi : "0") : "";
      shiftInput.value = has ? String(shiftMinutes()) : "";
      revisiInput.disabled = !has;
      shiftInput.disabled = !has;

      // Skala grafik: Time To Complete terpanjang (dan takt time bila ada)
      var maxVal = rows.reduce(function (m, r) { return Math.max(m, r.ttc); }, state.takt || 0);
      var scale = tskpScaleMax(maxVal);
      var pct = function (v) { return Math.min(100, v / scale * 100).toFixed(3) + "%"; };

      var axis = "";
      if (has) {
        for (var a = 0; a <= TSKP_AXIS_DIV; a++) {
          var cls = a === 0 ? " tskp-tick-first" : a === TSKP_AXIS_DIV ? " tskp-tick-last" : "";
          axis += "<span class='tskp-tick" + cls + "' style='left:" + (a * 100 / TSKP_AXIS_DIV) + "%'>" + (a === 0 ? "0" : tskNum(scale * a / TSKP_AXIS_DIV)) + "</span>";
        }
      } else {
        axis = "<span class='tskp-tick tskp-tick-first' style='left:0'>0</span>";
      }
      byId("tskpAxis").innerHTML = axis;
      var taktLine = has && state.takt > 0
        ? "<span class='tskp-takt' style='left:" + pct(state.takt) + "'></span>"
        : "";
      byId("tskpLegendTakt").hidden = !taktLine;

      var html = "";
      var totalManual = 0;
      for (var i = 0; i < Math.max(TSKP_MIN_ROWS, rows.length); i++) {
        var r = rows[i];
        if (!r) {
          html += "<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class='tskp-chart'>" + taktLine + "</td></tr>";
          continue;
        }
        totalManual += r.manual;
        var entry = sheet.rows[r.id] || {};
        var id = sanitize(r.id);
        var bars = taktLine +
          (r.manual > 0 ? "<span class='tskp-bar tskp-bar-man' style='left:0;width:" + pct(r.manual) + "'></span>" : "") +
          (r.auto > 0 ? "<span class='tskp-bar tskp-bar-auto' style='left:" + pct(r.manual) + ";width:" + pct(r.auto) + "'></span>" : "");
        html += "<tr data-id='" + id + "'>" +
          "<td>" + (i + 1) + "</td>" +
          "<td class='tskp-td-name' title='" + sanitize(r.name) + "'>" + sanitize(r.name) + "</td>" +
          "<td><input class='tsk-input' type='text' maxlength='20' data-field='mc' value='" + sanitize(entry.mc || "") + "' aria-label='M/C Number'></td>" +
          "<td>" + tskNum(r.manual) + "</td>" +
          "<td>" + tskNum(r.auto) + "</td>" +
          "<td>" + (tskNum(r.ttc) || "0") + "</td>" +
          "<td><input class='tsk-input' type='number' min='0' step='1' data-field='noChanged' value='" + sanitize(entry.noChanged || "") + "' aria-label='Tools: No Changed'></td>" +
          "<td><input class='tsk-input' type='number' min='0' step='any' data-field='timeTaken' value='" + sanitize(entry.timeTaken || "") + "' aria-label='Tools: Time Taken'></td>" +
          "<td class='tskp-cap' data-cap></td>" +
          "<td class='tskp-chart'>" + bars + "</td>" +
          "</tr>";
      }
      rowsBody.innerHTML = html;
      byId("tskpTotalManual").textContent = has ? tskNum(totalManual) || "0" : "";
      renderCapacity();
    }

    // Kolom kapasitas + ringkasan bottleneck (dipanggil ulang saat isian tools / waktu shift berubah)
    function renderCapacity() {
      var bottleneck = null;
      state.rows.forEach(function (r) {
        r.capacity = capacityOf(r);
        if (r.capacity != null && (!bottleneck || r.capacity < bottleneck.capacity)) bottleneck = r;
      });
      // Semua proses dengan kapasitas terendah yang sama ditandai sebagai bottleneck.
      var limiting = bottleneck ? state.rows.filter(function (r) { return r.capacity === bottleneck.capacity; }) : [];
      [].forEach.call(rowsBody.querySelectorAll("tr[data-id]"), function (tr, i) {
        var r = state.rows[i];
        var cell = tr.querySelector("[data-cap]");
        cell.textContent = r && r.capacity != null ? r.capacity.toLocaleString("id-ID") : "";
        cell.classList.toggle("tskp-cap-min", limiting.indexOf(r) >= 0 && limiting.length < state.rows.length);
      });

      if (!state.key) {
        summaryEl.textContent = "Belum ada data observasi untuk line / type produk ini.";
        return;
      }
      if (!bottleneck) {
        summaryEl.textContent = state.rows.length + " proses, belum ada waktu kerja yang tercatat.";
        return;
      }
      summaryEl.innerHTML = state.rows.length + " proses · Kapasitas line ≈ <strong>" + bottleneck.capacity.toLocaleString("id-ID") +
        " pcs/shift</strong> (" + shiftMinutes() + " menit), dibatasi oleh <strong>" +
        limiting.map(function (r) { return sanitize(r.name); }).join(", ") + "</strong>" +
        (limiting.length === 1 ? " (Time To Complete " + (tskNum(bottleneck.ttc) || "0") + " detik)." : ".");
    }

    rowsBody.addEventListener("input", function (event) {
      var input = event.target.closest("input[data-field]");
      var tr = input && input.closest("tr[data-id]");
      if (!tr || !state.key) return;
      var r = state.rows[[].indexOf.call(rowsBody.querySelectorAll("tr[data-id]"), tr)];
      if (!r) return;
      entryOf(r.id)[input.getAttribute("data-field")] = input.value.trim();
      if (input.getAttribute("data-field") !== "mc") renderCapacity();
      saveSoon();
    });

    revisiInput.addEventListener("input", function () {
      if (!state.key) return;
      state.sheet.revisi = revisiInput.value;
      saveSoon();
    });

    shiftInput.addEventListener("input", function () {
      if (!state.key) return;
      state.sheet.shiftMin = Number(shiftInput.value) > 0 ? Number(shiftInput.value) : "";
      renderCapacity();
      saveSoon();
    });

    printBtn.addEventListener("click", function () {
      if (saveTimer) saveSheet();
      window.print();
    });

    exportBtn.addEventListener("click", function () {
      if (!state.key) {
        showMessage("Belum ada data untuk export.", true);
        return;
      }
      var xlRows = [
        ["TABEL STANDAR KAPASITAS PRODUKSI", "", "", "", "", "", "", "", "Form-ISD-ISD-005"],
        ["LINE", state.line, "", "NAMA PRODUK", state.product, "", "REVISI", revisiInput.value],
        ["TANGGAL", byId("tskpHdrTanggal").textContent, "", "WAKTU KERJA / SHIFT (menit)", shiftMinutes()],
        [],
        ["NO", "OPERATION", "M/C NUMBER", "MANUAL (detik)", "AUTO (detik)", "TIME TO COMPLETE (detik)", "TOOLS NO CHANGED", "TOOLS TIME TAKEN (detik)", "PROCESSING CAPACITY/SHIFT"]
      ];
      var totalManual = 0;
      state.rows.forEach(function (r, i) {
        var entry = state.sheet.rows[r.id] || {};
        totalManual += r.manual;
        xlRows.push([i + 1, r.name, entry.mc || "", Number(tskNum(r.manual) || 0), Number(tskNum(r.auto) || 0), Number(tskNum(r.ttc) || 0),
          entry.noChanged ? Number(entry.noChanged) : "", entry.timeTaken ? Number(entry.timeTaken) : "", r.capacity != null ? r.capacity : ""]);
      });
      xlRows.push(["", "", "TOTAL", Number(tskNum(totalManual) || 0)]);
      var safe = function (v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
      SWStorage.downloadXlsx("tskp-" + safe(state.line) + "-" + safe(state.product) + ".xlsx", xlRows, "TSKP");
      showMessage("TSKP diexport ke Excel (.xlsx).");
    });

    lineSelect.addEventListener("change", function () {
      renderProductOptions(null);
      loadSheet();
    });
    productSelect.addEventListener("change", loadSheet);

    renderOptions();
    loadSheet();
  }

  // ── Helper Yamazumi (dipakai halaman Yamazumi dan Edit Yamazumi) ──
  function sortLineNames(values) {
    return values.slice().sort(function (a, b) {
      var matchA = String(a).match(/line\s*(\d+)/i);
      var matchB = String(b).match(/line\s*(\d+)/i);
      if (matchA && matchB) {
        return Number(matchA[1]) - Number(matchB[1]);
      }
      if (matchA) return -1;
      if (matchB) return 1;
      return String(a).localeCompare(String(b), "id");
    });
  }

  function buildUniqueValues(observations, key) {
    var map = {};
    observations.forEach(function (obs) {
      var value = String(obs[key] || "").trim();
      if (value) {
        map[value] = true;
      }
    });
    return Object.keys(map).sort(function (a, b) {
      return a.localeCompare(b, "id");
    });
  }

  function buildProcessObservations(observations, lineName) {
    var order = [];
    var latestMap = {};

    observations.forEach(function (obs) {
      var processName = String(obs.processName || "").trim() || "Tanpa Nama Proses";
      if (!latestMap[processName]) {
        order.push(processName);
        latestMap[processName] = obs;
        return;
      }
      if (new Date(obs.createdAt || 0).getTime() > new Date(latestMap[processName].createdAt || 0).getTime()) {
        latestMap[processName] = obs;
      }
    });

    var processObservations = order.map(function (processName) {
      return latestMap[processName];
    }).filter(Boolean);

    if (!lineName) {
      return processObservations;
    }
    return sortObservationsByProcessOrder(lineName, processObservations, SWStorage.loadData());
  }

  function getAutoTakt(observations) {
    var latestWithTakt = observations.slice().sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }).find(function (obs) {
      return Number(obs.taktTime) > 0;
    });
    return latestWithTakt ? Number(latestWithTakt.taktTime) : 0;
  }

  function categoryKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s\-_]+/g, " ")
      .trim();
  }

  function classifyCategory(value) {
    var key = categoryKey(value);
    if (key === "value" || key === "valuable work" || key === "vw" || key === "manual") {
      return "value";
    }
    if (key === "non value" || key === "non valuable work" || key === "nvw" || key === "nonvalue") {
      return "nonValue";
    }
    if (key === "walking" || key === "walk") {
      return "walking";
    }
    if (key === "irregular" || key === "waiting" || key === "idle" || key === "kerja tambahan") {
      return "irregular";
    }
    if (key === "machine" || key === "mesin") {
      return "machine";
    }
    return "other";
  }

  function getElementDuration(element) {
    var duration = Number(element.avg);
    if (duration > 0) {
      return duration;
    }
    duration = Number(element.mode);
    if (duration > 0) {
      return duration;
    }
    return 0;
  }

  function getProcessStacks(observation) {
    var result = {
      value: 0,
      nonValue: 0,
      walking: 0,
      irregular: 0,
      machine: 0,
      other: 0
    };

    (observation.elements || []).forEach(function (element) {
      var bucket = classifyCategory(element.category || element.type || "");
      var duration = getElementDuration(element);
      if (!Object.prototype.hasOwnProperty.call(result, bucket)) {
        bucket = "other";
      }
      result[bucket] += duration;
    });

    return result;
  }

  function initYamazumiPage() {
    // Yamazumi: tampilkan beban kerja proses per line dan type produk.
    var modeSelect = byId("yamazumiModeSelect");
    var lineSelect = byId("yamazumiLineSelect");
    var productSelect = byId("yamazumiProductSelect");
    var refreshBtn = byId("refreshYamazumiBtn");
    var exportBtn = byId("exportYamazumiXlsxBtn");
    var pdfBtn = byId("downloadYamazumiPdfBtn");
    var body = byId("yamazumiBody");
    var manpowerChart = byId("yamazumiManpowerChart");
    var machineChart = byId("yamazumiMachineChart");
    var manpowerSection = byId("yamazumiManpowerSection");
    var machineSection = byId("yamazumiMachineSection");
    var metaLine = byId("yamazumiMetaLine");
    var metaMode = byId("yamazumiMetaMode");
    var metaProduct = byId("yamazumiMetaProduct");
    var metaTakt = byId("yamazumiMetaTakt");
    var metaCycle = byId("yamazumiMetaCycle");
    var metaCount = byId("yamazumiMetaCount");
    // Bar dipisah: manual/man power (stacked) dan mesin/proses.
    var manpowerBars = [];
    var machineBars = [];

    function getObservations() {
      return getActiveObservations(SWStorage.loadData());
    }

    function populateLineOptions() {
      var lines = sortLineNames(buildUniqueValues(getObservations(), "lineName"));
      var previous = lineSelect.value;
      lineSelect.innerHTML = "";

      if (!lines.length) {
        lineSelect.innerHTML = "<option value=''>Belum ada line</option>";
        return;
      }

      lines.forEach(function (lineName) {
        var opt = document.createElement("option");
        opt.value = lineName;
        opt.textContent = lineName;
        if (lineName === previous) {
          opt.selected = true;
        }
        lineSelect.appendChild(opt);
      });

      if (!lineSelect.value && lines.length) {
        lineSelect.value = lines[0];
      }
    }

    function populateProductOptions() {
      var selectedLine = lineSelect.value;
      var relevant = getObservations().filter(function (obs) {
        return !selectedLine || String(obs.lineName || "").trim() === selectedLine;
      });
      var products = buildUniqueValues(relevant, "productType");
      var previous = productSelect.value;
      productSelect.innerHTML = "";

      if (!products.length) {
        productSelect.innerHTML = "<option value=''>Belum ada type produk</option>";
        return;
      }

      products.forEach(function (productType) {
        var opt = document.createElement("option");
        opt.value = productType;
        opt.textContent = productType;
        if (productType === previous) {
          opt.selected = true;
        }
        productSelect.appendChild(opt);
      });

      if (!productSelect.value && products.length) {
        productSelect.value = products[0];
      }
    }

    function filterObservations() {
      var selectedLine = lineSelect.value;
      var selectedProduct = productSelect.value;

      return getObservations().filter(function (obs) {
        var lineName = String(obs.lineName || "").trim();
        var productType = String(obs.productType || "").trim();
        if (selectedLine && lineName !== selectedLine) {
          return false;
        }
        if (selectedProduct && productType !== selectedProduct) {
          return false;
        }
        return true;
      });
    }

    function getSelectedMode() {
      return modeSelect && modeSelect.value ? modeSelect.value : "all";
    }

    function showManpower() {
      return getSelectedMode() !== "machine";
    }

    function showMachine() {
      return getSelectedMode() !== "manpower";
    }

    function getDisplayedBars() {
      return (showManpower() ? manpowerBars : []).concat(showMachine() ? machineBars : []);
    }

    // Satu proses bisa muncul di kedua chart jika punya elemen manual dan mesin.
    function buildBars(processObservations) {
      manpowerBars = [];
      machineBars = [];

      processObservations.forEach(function (obs) {
        var stacks = getProcessStacks(obs);
        var manpowerTotal = stacks.value + stacks.nonValue + stacks.walking + stacks.irregular;

        if (manpowerTotal > 0) {
          manpowerBars.push({
            label: obs.processName,
            kind: "Man Power",
            value: manpowerTotal,
            total: manpowerTotal,
            stacks: {
              value: stacks.value,
              nonValue: stacks.nonValue,
              walking: stacks.walking,
              irregular: stacks.irregular
            }
          });
        }

        // Proses tanpa elemen manual: seluruh cycle time dianggap waktu mesin/proses.
        var machineTotal = manpowerTotal > 0 ? stacks.machine : cycleTime(obs);
        if (machineTotal > 0) {
          machineBars.push({
            label: obs.processName,
            kind: "Mesin",
            value: machineTotal
          });
        }
      });
    }

    function renderTable(takt) {
      var bars = getDisplayedBars();
      body.innerHTML = "";
      if (!bars.length) {
        body.innerHTML = '<tr><td colspan="4" class="placeholder">Belum ada data observasi sesuai filter.</td></tr>';
        return;
      }

      bars.forEach(function (b) {
        var over = b.value > takt;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(b.label) + "</td>" +
          "<td>" + sanitize(b.kind) + "</td>" +
          "<td>" + fixed2(b.value) + "</td>" +
          "<td><span class='status-badge " + (over ? "warning" : "active") + "'>" + (over ? "Di atas takt" : "Aman") + "</span></td>";
        body.appendChild(tr);
      });
    }

    function getMaxDisplayedCycleTime() {
      return getDisplayedBars().reduce(function (maxValue, bar) {
        return Math.max(maxValue, Number(bar.value) || Number(bar.total) || 0);
      }, 0);
    }

    function renderMeta(selectedLine, selectedProduct, takt) {
      var maxCycleTime = getMaxDisplayedCycleTime();
      var counts = [];
      if (showManpower()) counts.push(manpowerBars.length + " MP");
      if (showMachine()) counts.push(machineBars.length + " Mesin");
      setText(metaLine, selectedLine || "-");
      setText(metaMode, modeSelect && modeSelect.value ? modeSelect.options[modeSelect.selectedIndex].text : "All");
      setText(metaProduct, selectedProduct || "-");
      setText(metaTakt, fixed2(takt) + " detik");
      setText(metaCycle, fixed2(maxCycleTime) + " detik");
      setText(metaCount, counts.join(" / "));
    }

    var lastTakt = 0;
    // Saat cetak / ukuran layar berubah, chart digambar ulang sesuai lebar yang baru.
    onPrintModeChange(function () { drawCharts(lastTakt); });
    onWindow("resize", function () { drawCharts(lastTakt); });

    function drawCharts(takt) {
      lastTakt = takt;
      // Section harus tampil dulu sebelum digambar agar ukuran canvas terbaca.
      if (manpowerSection) manpowerSection.classList.toggle("hidden", !showManpower());
      if (machineSection) machineSection.classList.toggle("hidden", !showMachine());
      // Kedua chart memakai format label proses yang sama (horizontal, dibungkus per kata).
      if (showManpower()) SWCharts.drawYamazumiChart(manpowerChart, manpowerBars, takt, { stacked: true, labelMode: "horizontal" });
      if (showMachine()) SWCharts.drawYamazumiChart(machineChart, machineBars, takt, { stacked: false, labelMode: "horizontal" });
    }

    function render() {
      var selectedLine = lineSelect.value;
      var selectedProduct = productSelect.value;
      var matchingObservations = filterObservations();
      var processObservations = buildProcessObservations(matchingObservations, selectedLine);
      var takt = getAutoTakt(matchingObservations);

      buildBars(processObservations);
      drawCharts(takt);
      renderTable(takt);
      renderMeta(selectedLine, selectedProduct, takt);

      SWStorage.updateData(function (data) {
        data.settings.taktTime = takt;
        return data;
      });
      showMessage("Yamazumi chart diperbarui.");
    }

    refreshBtn.addEventListener("click", render);

    lineSelect.addEventListener("change", function () {
      populateProductOptions();
      render();
    });

    if (modeSelect) {
      modeSelect.addEventListener("change", render);
    }

    productSelect.addEventListener("change", render);

    exportBtn.addEventListener("click", function () {
      if (!getDisplayedBars().length) {
        showMessage("Belum ada data untuk export.", true);
        return;
      }
      var selectedLine = lineSelect.value || "-";
      var selectedMode = getSelectedMode();
      var selectedModeLabel = modeSelect && modeSelect.value ? modeSelect.options[modeSelect.selectedIndex].text : "All";
      var selectedProduct = productSelect.value || "-";
      var takt = getAutoTakt(filterObservations());
      var safeLine = selectedLine.replace(/[^\w\-]+/g, "_");
      var safeMode = selectedMode.replace(/[^\w\-]+/g, "_");
      var safeProduct = selectedProduct.replace(/[^\w\-]+/g, "_");
      var rows = [
        ["Yamazumi Chart"],
        ["Line", selectedLine],
        ["Mode", selectedModeLabel],
        ["Type Produk", selectedProduct],
        ["Takt Time (detik)", fixed2(takt)]
      ];
      if (showManpower()) {
        rows.push([], ["Yamazumi Man Power"]);
        rows.push(["Proses", "Value", "Non Value", "Walking", "Irregular", "Total", "Takt Time (detik)"]);
        manpowerBars.forEach(function (b) {
          var stacks = b.stacks || {};
          rows.push([
            b.label,
            fixed2(stacks.value || 0),
            fixed2(stacks.nonValue || 0),
            fixed2(stacks.walking || 0),
            fixed2(stacks.irregular || 0),
            fixed2(b.total || b.value || 0),
            fixed2(takt)
          ]);
        });
      }
      if (showMachine()) {
        rows.push([], ["Yamazumi Mesin / Proses"]);
        rows.push(["Proses", "Waktu Mesin (detik)", "Takt Time (detik)"]);
        machineBars.forEach(function (b) {
          rows.push([b.label, fixed2(b.value), fixed2(takt)]);
        });
      }
      SWStorage.downloadXlsx("yamazumi-" + safeLine + "-" + safeMode + "-" + safeProduct + ".xlsx", rows, "Yamazumi");
      showMessage("Yamazumi diexport ke Excel (.xlsx).");
    });

    // Tabel Detail Beban Kerja bisa diminimize; pilihan diingat per browser.
    var detailToggle = byId("yamazumiDetailToggle");
    var detailBody = byId("yamazumiDetailBody");
    var DETAIL_HIDDEN_KEY = "standardized_work_yamazumi_detail_hidden_v1";

    function applyDetailHidden(hidden) {
      if (!detailToggle || !detailBody) return;
      detailBody.classList.toggle("hidden", hidden);
      byId("yamazumiDetailSection").classList.toggle("is-collapsed", hidden);
      detailToggle.textContent = hidden ? "Tampilkan" : "Sembunyikan";
      detailToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
    }

    if (detailToggle && detailBody) {
      var detailHidden = false;
      try {
        detailHidden = localStorage.getItem(DETAIL_HIDDEN_KEY) === "1";
      } catch (error) {
        // Abaikan jika browser memblokir storage.
      }
      applyDetailHidden(detailHidden);
      detailToggle.addEventListener("click", function () {
        var nextHidden = !detailBody.classList.contains("hidden");
        applyDetailHidden(nextHidden);
        try {
          localStorage.setItem(DETAIL_HIDDEN_KEY, nextHidden ? "1" : "0");
        } catch (error) {
          // Abaikan jika browser memblokir storage.
        }
      });
    }

    var editBtn = byId("editYamazumiBtn");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        if (!lineSelect.value) {
          showMessage("Belum ada data observasi untuk diedit.", true);
          return;
        }
        window.location.hash = "#yamazumi-edit?" + new URLSearchParams({
          line: lineSelect.value,
          product: productSelect.value || ""
        }).toString();
      });
    }

    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        if (!getDisplayedBars().length) {
          showMessage("Belum ada data untuk export PDF.", true);
          return;
        }
        window.print();
      });
    }

    populateLineOptions();
    populateProductOptions();
    render();
  }

  // ── Edit Yamazumi (Line Balancing) ──
  // Skenario = salinan elemen kerja dari observasi aktif yang bisa dipindah antar kolom
  // (man power / proses). Disimpan terpisah di data.yamazumiScenarios, observasi tidak diubah.
  var YZE_CATEGORIES = [
    { key: "value", label: "Value", color: "#1de64f", ink: "#12361c" },
    { key: "nonValue", label: "Non Value", color: "#f5eb2f", ink: "#3d3800" },
    { key: "walking", label: "Walking", color: "#87dff7", ink: "#0f3a47" },
    { key: "irregular", label: "Irregular", color: "#bb63d8", ink: "#ffffff" },
    { key: "machine", label: "Machine", color: "#5f7f99", ink: "#ffffff" },
    { key: "other", label: "Lainnya", color: "#b7c0c7", ink: "#27333c" }
  ];
  var YZE_MANUAL_KEYS = { value: true, nonValue: true, walking: true, irregular: true };
  var YZE_BOARD_LABELS = {
    manpower: { title: "Man Power", count: "Jumlah MP", newName: "MP " },
    machine: { title: "Mesin / Proses", count: "Jumlah Proses", newName: "Proses " }
  };

  function yzeCategory(key) {
    return YZE_CATEGORIES.find(function (c) { return c.key === key; }) || YZE_CATEGORIES[YZE_CATEGORIES.length - 1];
  }

  function yzeUid(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function yzeFmt(value) {
    return String(Math.round((Number(value) || 0) * 100) / 100);
  }

  function yzeScenarioKey(line, product) {
    return String(line || "") + "||" + String(product || "");
  }

  function yzeFilterObservations(line, product) {
    return getActiveObservations(SWStorage.loadData()).filter(function (obs) {
      if (line && String(obs.lineName || "").trim() !== line) return false;
      if (product && String(obs.productType || "").trim() !== product) return false;
      return true;
    });
  }

  // Pembagian sama dengan chart Yamazumi: elemen manual ke kolom Man Power,
  // elemen mesin ke kolom Mesin/Proses; proses tanpa elemen manual seluruhnya ke Mesin.
  function buildYamazumiScenario(line, product) {
    var observations = yzeFilterObservations(line, product);
    var columns = [];

    buildProcessObservations(observations, line).forEach(function (obs) {
      var processName = String(obs.processName || "").trim() || "Tanpa Nama Proses";
      var tasks = [];
      (obs.elements || []).forEach(function (element, index) {
        var duration = getElementDuration(element);
        if (!(duration > 0)) return;
        tasks.push({
          id: yzeUid("t"),
          name: String(element.name || "").trim() || ("Elemen " + (index + 1)),
          duration: Math.round(duration * 100) / 100,
          category: classifyCategory(element.category || element.type || ""),
          note: String(element.note || "").trim(),
          origin: processName
        });
      });

      var hasManual = tasks.some(function (task) { return YZE_MANUAL_KEYS[task.category]; });
      var manualTasks = hasManual ? tasks.filter(function (task) { return task.category !== "machine"; }) : [];
      var machineTasks = hasManual ? tasks.filter(function (task) { return task.category === "machine"; }) : tasks;

      if (manualTasks.length) {
        columns.push({ id: yzeUid("c"), name: processName, kind: "manpower", origin: processName, tasks: manualTasks });
      }
      if (machineTasks.length) {
        columns.push({ id: yzeUid("c"), name: processName, kind: "machine", origin: processName, tasks: machineTasks });
      }
    });

    return {
      line: line,
      product: product,
      taktTime: getAutoTakt(observations),
      ctLine: "bottleneck",
      columns: columns,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
  }

  function initYamazumiEditPage() {
    var lineSelect = byId("yzeLineSelect");
    var productSelect = byId("yzeProductSelect");
    var taktInput = byId("yzeTaktInput");
    var ctLineSelect = byId("yzeCtLineSelect");
    var saveStatus = byId("yzeSaveStatus");
    var kpiBox = byId("yzeKpis");
    var boardTitle = byId("yzeBoardTitle");
    var chartEl = byId("yzeChart");
    var ruler = byId("yzeRuler");
    var overlay = byId("yzeOverlay");
    var cols = byId("yzeCols");
    var emptyEl = byId("yzeEmpty");
    var form = byId("yzeForm");
    var formTitle = byId("yzeFormTitle");
    var formColumn = byId("yzeFormColumn");
    var formName = byId("yzeFormName");
    var formDuration = byId("yzeFormDuration");
    var formCategory = byId("yzeFormCategory");
    var formNote = byId("yzeFormNote");
    var formOrigin = byId("yzeFormOrigin");
    var formSubmit = byId("yzeFormSubmit");
    var formCancel = byId("yzeFormCancel");
    var formDelete = byId("yzeFormDelete");
    var columnsTitle = byId("yzeColumnsTitle");
    var columnList = byId("yzeColumnList");
    var addColumnBtn = byId("yzeAddColumnBtn");
    var mixEl = byId("yzeMix");
    var legendEl = byId("yzeLegend");
    var tip = byId("yzeTip");
    var PLOT_H = 420;

    if (!lineSelect || !cols || !form) return;

    var scenario = null;
    var original = null; // kondisi awal dari observasi, untuk pembanding KPI
    var board = "manpower";
    var editingId = null;
    var dragId = null;
    var saveTimer = null;

    // ── Sumber data & filter ──
    function populateLines(preferred) {
      var lines = sortLineNames(buildUniqueValues(getActiveObservations(SWStorage.loadData()), "lineName"));
      lineSelect.innerHTML = lines.length
        ? lines.map(function (name) { return "<option value='" + sanitize(name) + "'>" + sanitize(name) + "</option>"; }).join("")
        : "<option value=''>Belum ada line</option>";
      if (preferred && lines.indexOf(preferred) >= 0) lineSelect.value = preferred;
    }

    function populateProducts(preferred) {
      var products = buildUniqueValues(yzeFilterObservations(lineSelect.value, ""), "productType");
      productSelect.innerHTML = products.length
        ? products.map(function (name) { return "<option value='" + sanitize(name) + "'>" + sanitize(name) + "</option>"; }).join("")
        : "<option value=''>Semua type</option>";
      if (preferred && products.indexOf(preferred) >= 0) productSelect.value = preferred;
    }

    function loadScenario() {
      var line = lineSelect.value;
      var product = productSelect.value;
      var saved = (SWStorage.loadData().yamazumiScenarios || {})[yzeScenarioKey(line, product)];
      original = buildYamazumiScenario(line, product);
      scenario = saved && Array.isArray(saved.columns) ? JSON.parse(JSON.stringify(saved)) : JSON.parse(JSON.stringify(original));
      scenario.line = line;
      scenario.product = product;
      taktInput.value = scenario.taktTime > 0 ? yzeFmt(scenario.taktTime) : "";
      ctLineSelect.value = scenario.ctLine || "bottleneck";
      replaceRouteParams({ line: line, product: product });
      resetForm();
      renderAll();
    }

    // ── Penyimpanan otomatis ──
    function persist() {
      clearTimeout(saveTimer);
      scenario.updatedAt = new Date().toISOString();
      renderSaveStatus();
      var snapshot = JSON.parse(JSON.stringify(scenario));
      saveTimer = setTimeout(function () {
        SWStorage.updateData(function (data) {
          data.yamazumiScenarios = data.yamazumiScenarios || {};
          data.yamazumiScenarios[yzeScenarioKey(snapshot.line, snapshot.product)] = snapshot;
          return data;
        });
      }, 300);
    }

    function renderSaveStatus() {
      saveStatus.textContent = scenario && scenario.updatedAt
        ? "Skenario tersimpan otomatis · " + formatDate(scenario.updatedAt)
        : "Skenario awal dari data observasi";
    }

    function changed(options) {
      renderAll(options);
      persist();
    }

    // ── Query skenario ──
    function boardColumns(kind, source) {
      return ((source || scenario).columns || []).filter(function (col) { return col.kind === kind; });
    }

    function findColumn(id) {
      return scenario.columns.find(function (col) { return col.id === id; }) || null;
    }

    function findTask(id) {
      for (var i = 0; i < scenario.columns.length; i += 1) {
        var tasks = scenario.columns[i].tasks;
        for (var j = 0; j < tasks.length; j += 1) {
          if (tasks[j].id === id) return { column: scenario.columns[i], task: tasks[j], index: j };
        }
      }
      return null;
    }

    function columnTotal(col) {
      return col.tasks.reduce(function (sum, task) { return sum + (Number(task.duration) || 0); }, 0);
    }

    function computeMetrics(kind, source) {
      var list = boardColumns(kind, source);
      var totals = list.map(columnTotal);
      var max = totals.length ? Math.max.apply(null, totals) : 0;
      var work = totals.reduce(function (a, b) { return a + b; }, 0);
      var takt = Number(scenario.taktTime) || 0;
      var byCat = {};
      list.forEach(function (col) {
        col.tasks.forEach(function (task) {
          byCat[task.category] = (byCat[task.category] || 0) + (Number(task.duration) || 0);
        });
      });
      var efficiency = list.length && max > 0 ? (work / (list.length * max)) * 100 : 0;
      return {
        list: list,
        totals: totals,
        max: max,
        work: work,
        count: list.length,
        efficiency: efficiency,
        balanceLoss: work > 0 ? 100 - efficiency : 0,
        bottleneck: max > 0 ? list[totals.indexOf(max)].name : "-",
        over: takt > 0 ? totals.filter(function (t) { return t > takt + 1e-9; }).length : 0,
        theoretical: takt > 0 ? Math.ceil(work / takt - 1e-9) : 0,
        byCat: byCat
      };
    }

    // ── Render ──
    function renderAll(options) {
      var opts = options || {};
      var m = computeMetrics(board);
      document.querySelectorAll(".yze-tab").forEach(function (tab) {
        var on = tab.getAttribute("data-board") === board;
        tab.classList.toggle("active", on);
        tab.setAttribute("aria-pressed", on ? "true" : "false");
      });
      setText(boardTitle, "Beban kerja per " + YZE_BOARD_LABELS[board].title);
      setText(columnsTitle, YZE_BOARD_LABELS[board].title);
      renderKpis(m);
      renderChart(m);
      renderLegend(m);
      if (!opts.keepColumnList) renderColumnList(m);
      renderFormColumns();
      renderSaveStatus();
    }

    function renderKpis(m) {
      var base = computeMetrics(board, original);
      var takt = Number(scenario.taktTime) || 0;
      var items = [
        { k: "Efisiensi Line", v: m.work > 0 ? yzeFmt(m.efficiency) + "%" : "-", s: "Awal " + (base.work > 0 ? yzeFmt(base.efficiency) + "%" : "-") },
        { k: "Balance Loss", v: m.work > 0 ? yzeFmt(m.balanceLoss) + "%" : "-", s: "Awal " + (base.work > 0 ? yzeFmt(base.balanceLoss) + "%" : "-") },
        { k: "Bottleneck", v: m.max > 0 ? yzeFmt(m.max) + " dtk" : "-", s: m.bottleneck, alert: takt > 0 && m.max > takt },
        { k: "Di atas Takt", v: takt > 0 ? String(m.over) : "-", s: "dari " + m.count + " kolom", alert: m.over > 0 },
        { k: YZE_BOARD_LABELS[board].count, v: String(m.count), s: "Teoritis " + (m.theoretical || "-") + " · Awal " + base.count },
        { k: "Total Waktu", v: yzeFmt(m.work) + " dtk", s: "Takt " + (takt > 0 ? yzeFmt(takt) + " dtk" : "-") }
      ];
      kpiBox.innerHTML = items.map(function (item) {
        return "<div class='yze-kpi" + (item.alert ? " alert" : "") + "'><span class='yze-kpi-k'>" + sanitize(item.k) + "</span>" +
          "<strong class='yze-kpi-v'>" + sanitize(item.v) + "</strong><span class='yze-kpi-s'>" + sanitize(item.s) + "</span></div>";
      }).join("");
    }

    function tickStep(pps) {
      var options = [0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 300];
      for (var i = 0; i < options.length; i += 1) {
        if (options[i] * pps >= 28) return options[i];
      }
      return options[options.length - 1];
    }

    function renderChart(m) {
      var takt = Number(scenario.taktTime) || 0;
      var hasAny = scenario.columns.length > 0;
      chartEl.classList.toggle("hidden", !hasAny);
      emptyEl.classList.toggle("hidden", hasAny && m.count > 0);
      if (!hasAny) {
        setText(emptyEl, "Belum ada data observasi untuk line dan type produk ini.");
        return;
      }
      if (!m.count) {
        setText(emptyEl, "Belum ada kolom " + YZE_BOARD_LABELS[board].title + ". Tambahkan kolom lewat panel samping.");
      }

      var raw = Math.max(m.max * 1.08, takt * 1.15, 10);
      var step = tickStep(PLOT_H / raw);
      var seconds = Math.ceil(raw / step) * step;
      var nextStep = tickStep(PLOT_H / seconds);
      if (nextStep !== step) {
        step = nextStep;
        seconds = Math.ceil(raw / step) * step;
      }
      var pps = PLOT_H / seconds;
      chartEl.style.setProperty("--yze-plot-h", PLOT_H + "px");

      var ticks = "";
      var grid = "";
      for (var v = 0; v <= seconds + 1e-6; v += step) {
        var bottom = Math.round(v * pps);
        ticks += "<div class='yze-tick' style='bottom:" + bottom + "px'><i></i><span>" + yzeFmt(v) + "</span></div>";
        if (v > 0) grid += "<div class='yze-gridline' style='bottom:" + bottom + "px'></div>";
      }
      ruler.innerHTML = ticks;

      var lines = "<div class='yze-baseline'></div>";
      var ct = scenario.ctLine === "off" || !m.count ? 0 : (scenario.ctLine === "average" ? m.work / m.count : m.max);
      if (ct > 0) {
        lines += "<div class='yze-ctline' style='bottom:" + Math.round(ct * pps) + "px'><b>" +
          (scenario.ctLine === "average" ? "CT rata-rata " : "CT ") + yzeFmt(ct) + " dtk</b></div>";
      }
      if (takt > 0) {
        lines += "<div class='yze-takt' style='bottom:" + Math.round(takt * pps) + "px'><b>Takt " + yzeFmt(takt) + " dtk</b></div>";
      }
      overlay.innerHTML = grid + lines;

      cols.innerHTML = m.list.map(function (col, index) {
        var total = m.totals[index];
        var over = takt > 0 && total > takt + 1e-9;
        var ratio = takt > 0 ? Math.min(total / takt, 1) * 100 : 0;
        var gapText = takt > 0
          ? (over ? "Lebih " + yzeFmt(total - takt) + " dtk" : "Sisa " + yzeFmt(takt - total) + " dtk")
          : "";
        var blocks = col.tasks.map(function (task) {
          var cat = yzeCategory(task.category);
          var height = (Number(task.duration) || 0) * pps;
          var size = height < 14 ? " tiny" : (height < 28 ? " mid" : "");
          return "<div class='yze-block" + size + (task.id === editingId ? " is-editing" : "") + "' draggable='true' tabindex='0' role='button'" +
            " data-id='" + sanitize(task.id) + "' style='height:" + height + "px;background:" + cat.color + ";color:" + cat.ink + "'" +
            " aria-label='" + sanitize(task.name + ", " + yzeFmt(task.duration) + " detik, " + cat.label) + "'>" +
            "<span class='yze-bn'>" + sanitize(task.name) + "</span><span class='yze-bd'>" + yzeFmt(task.duration) + " dtk</span></div>";
        }).join("");
        return "<div class='yze-col" + (over ? " over-takt" : "") + "' data-col='" + sanitize(col.id) + "'>" +
          "<div class='yze-stack" + (col.tasks.length ? "" : " empty") + "'>" + blocks + "</div>" +
          "<div class='yze-meta'>" +
          "<div class='yze-total'>" + yzeFmt(total) + " <small>dtk</small></div>" +
          "<div class='yze-bar'><i style='width:" + ratio + "%'></i></div>" +
          "<div class='yze-gap'>" + sanitize(gapText) + "</div>" +
          "<div class='yze-colname' title='" + sanitize(col.name) + "'>" + sanitize(col.name) + "</div>" +
          "</div></div>";
      }).join("");
    }

    function renderLegend(m) {
      mixEl.innerHTML = YZE_CATEGORIES.map(function (cat) {
        var width = m.work > 0 ? ((m.byCat[cat.key] || 0) / m.work) * 100 : 0;
        return width > 0 ? "<i style='width:" + width + "%;background:" + cat.color + "'></i>" : "";
      }).join("");
      legendEl.innerHTML = YZE_CATEGORIES.filter(function (cat) {
        return (m.byCat[cat.key] || 0) > 0 || cat.key !== "other";
      }).map(function (cat) {
        var sec = m.byCat[cat.key] || 0;
        var pct = m.work > 0 ? (sec / m.work) * 100 : 0;
        return "<div class='yze-leg'><i style='background:" + cat.color + "'></i><span>" + sanitize(cat.label) + "</span>" +
          "<em>" + yzeFmt(sec) + " dtk (" + yzeFmt(pct) + "%)</em></div>";
      }).join("");
    }

    function renderColumnList(m) {
      var takt = Number(scenario.taktTime) || 0;
      columnList.innerHTML = m.list.length ? m.list.map(function (col, index) {
        var total = m.totals[index];
        return "<div class='yze-col-row" + (takt > 0 && total > takt + 1e-9 ? " over" : "") + "' data-col='" + sanitize(col.id) + "'>" +
          "<div class='yze-order'>" +
          "<button type='button' class='js-yze-col-up' title='Geser ke kiri' aria-label='Geser ke kiri'" + (index === 0 ? " disabled" : "") + ">&#9650;</button>" +
          "<button type='button' class='js-yze-col-down' title='Geser ke kanan' aria-label='Geser ke kanan'" + (index === m.list.length - 1 ? " disabled" : "") + ">&#9660;</button>" +
          "</div>" +
          "<input type='text' class='js-yze-col-name' value='" + sanitize(col.name) + "' maxlength='60' aria-label='Nama kolom'>" +
          "<span class='yze-col-info'>" + col.tasks.length + " el · " + yzeFmt(total) + " dtk</span>" +
          "<button type='button' class='yze-col-del js-yze-col-del' title='Hapus kolom'>&times;</button>" +
          "</div>";
      }).join("") : "<p class='placeholder'>Belum ada kolom.</p>";
    }

    function renderFormColumns() {
      var keep = formColumn.value;
      formColumn.innerHTML = ["manpower", "machine"].map(function (kind) {
        var list = boardColumns(kind);
        if (!list.length) return "";
        return "<optgroup label='" + YZE_BOARD_LABELS[kind].title + "'>" + list.map(function (col) {
          return "<option value='" + sanitize(col.id) + "'>" + sanitize(col.name) + "</option>";
        }).join("") + "</optgroup>";
      }).join("");
      if (keep && findColumn(keep)) {
        formColumn.value = keep;
      } else {
        var first = boardColumns(board)[0];
        if (first) formColumn.value = first.id;
      }
    }

    // ── Form elemen kerja ──
    function resetForm() {
      editingId = null;
      form.reset();
      formCategory.value = board === "machine" ? "machine" : "value";
      setText(formTitle, "Tambah elemen kerja");
      formSubmit.textContent = "Tambah elemen";
      formCancel.classList.add("hidden");
      formDelete.classList.add("hidden");
      formOrigin.textContent = "";
      var first = boardColumns(board)[0];
      if (first) formColumn.value = first.id;
    }

    function startEdit(taskId) {
      var found = findTask(taskId);
      if (!found) return;
      editingId = taskId;
      formColumn.value = found.column.id;
      formName.value = found.task.name;
      formDuration.value = yzeFmt(found.task.duration);
      formCategory.value = found.task.category;
      formNote.value = found.task.note || "";
      formOrigin.textContent = "Asal proses: " + (found.task.origin || "-");
      setText(formTitle, "Ubah elemen kerja");
      formSubmit.textContent = "Simpan perubahan";
      formCancel.classList.remove("hidden");
      formDelete.classList.remove("hidden");
      renderChart(computeMetrics(board));
      formName.focus();
    }

    formCategory.innerHTML = YZE_CATEGORIES.map(function (cat) {
      return "<option value='" + cat.key + "'>" + sanitize(cat.label) + "</option>";
    }).join("");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var target = findColumn(formColumn.value);
      var name = formName.value.trim();
      var duration = Number(String(formDuration.value).replace(",", "."));
      if (!target) return showMessage("Pilih kolom tujuan terlebih dahulu.", true);
      if (!name) return showMessage("Nama elemen kerja masih kosong.", true);
      if (!(duration > 0)) return showMessage("Durasi harus lebih besar dari nol.", true);

      if (editingId) {
        var found = findTask(editingId);
        if (found) {
          found.task.name = name;
          found.task.duration = Math.round(duration * 100) / 100;
          found.task.category = formCategory.value;
          found.task.note = formNote.value.trim();
          if (found.column.id !== target.id) {
            found.column.tasks.splice(found.index, 1);
            target.tasks.push(found.task);
            if (target.kind !== board) board = target.kind;
          }
          showMessage("Elemen \"" + name + "\" diperbarui.");
        }
      } else {
        target.tasks.push({
          id: yzeUid("t"),
          name: name,
          duration: Math.round(duration * 100) / 100,
          category: formCategory.value,
          note: formNote.value.trim(),
          origin: "Tambahan manual"
        });
        if (target.kind !== board) board = target.kind;
        showMessage("Elemen \"" + name + "\" ditambahkan ke " + target.name + ".");
      }
      resetForm();
      changed();
    });

    formCancel.addEventListener("click", function () {
      resetForm();
      renderChart(computeMetrics(board));
    });

    formDelete.addEventListener("click", function () {
      var found = editingId ? findTask(editingId) : null;
      if (!found) return;
      if (!window.confirm("Hapus elemen \"" + found.task.name + "\" dari skenario?")) return;
      found.column.tasks.splice(found.index, 1);
      showMessage("Elemen \"" + found.task.name + "\" dihapus dari skenario.");
      resetForm();
      changed();
    });

    // ── Drag & drop elemen kerja ──
    function moveTask(taskId, targetColId, targetIndex) {
      var found = findTask(taskId);
      var target = findColumn(targetColId);
      if (!found || !target) return;
      var index = Math.max(0, Math.min(targetIndex, target.tasks.length));
      if (found.column === target) {
        if (index === found.index || index === found.index + 1) return;
        if (found.index < index) index -= 1;
      }
      found.column.tasks.splice(found.index, 1);
      target.tasks.splice(index, 0, found.task);
      showMessage("\"" + found.task.name + "\" dipindah ke " + target.name + ".");
      changed();
    }

    function clearDropMarkers() {
      cols.querySelectorAll(".over, .drop-above, .drop-below").forEach(function (el) {
        el.classList.remove("over", "drop-above", "drop-below");
      });
    }

    // Stack memakai column-reverse: index 0 di bawah, index terakhir paling atas.
    function dropPosition(event) {
      var colEl = event.target.closest(".yze-col");
      if (!colEl) return null;
      var column = findColumn(colEl.getAttribute("data-col"));
      if (!column) return null;
      var blockEl = event.target.closest(".yze-block");
      if (!blockEl || blockEl.getAttribute("data-id") === dragId) {
        return { colEl: colEl, column: column, index: column.tasks.length, blockEl: null };
      }
      var rect = blockEl.getBoundingClientRect();
      var above = event.clientY < rect.top + rect.height / 2;
      var blockIndex = column.tasks.findIndex(function (task) { return task.id === blockEl.getAttribute("data-id"); });
      return { colEl: colEl, column: column, index: above ? blockIndex + 1 : blockIndex, blockEl: blockEl, above: above };
    }

    cols.addEventListener("dragstart", function (event) {
      var block = event.target.closest(".yze-block");
      if (!block) return;
      dragId = block.getAttribute("data-id");
      block.classList.add("dragging");
      hideTip();
      try {
        event.dataTransfer.setData("text/plain", dragId);
        event.dataTransfer.effectAllowed = "move";
      } catch (error) {
        // Browser lama tidak mendukung setData custom.
      }
    });

    cols.addEventListener("dragend", function (event) {
      var block = event.target.closest(".yze-block");
      if (block) block.classList.remove("dragging");
      dragId = null;
      clearDropMarkers();
    });

    cols.addEventListener("dragover", function (event) {
      if (!dragId) return;
      var pos = dropPosition(event);
      if (!pos) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      clearDropMarkers();
      pos.colEl.classList.add("over");
      if (pos.blockEl) pos.blockEl.classList.add(pos.above ? "drop-above" : "drop-below");
    });

    cols.addEventListener("dragleave", function (event) {
      if (!event.relatedTarget || !cols.contains(event.relatedTarget)) clearDropMarkers();
    });

    cols.addEventListener("drop", function (event) {
      event.preventDefault();
      var pos = dragId ? dropPosition(event) : null;
      var id = dragId;
      dragId = null;
      clearDropMarkers();
      if (pos && id) moveTask(id, pos.column.id, pos.index);
    });

    cols.addEventListener("click", function (event) {
      var block = event.target.closest(".yze-block");
      if (block) startEdit(block.getAttribute("data-id"));
    });

    cols.addEventListener("keydown", function (event) {
      var block = event.target.closest(".yze-block");
      if (block && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        startEdit(block.getAttribute("data-id"));
      }
    });

    // ── Tooltip ──
    function hideTip() {
      tip.classList.remove("show");
    }

    cols.addEventListener("mouseover", function (event) {
      var block = event.target.closest(".yze-block");
      if (!block || dragId) return;
      var found = findTask(block.getAttribute("data-id"));
      if (!found) return;
      var cat = yzeCategory(found.task.category);
      tip.innerHTML = "<strong>" + sanitize(found.task.name) + "</strong>" +
        "<span><i style='background:" + cat.color + "'></i>" + sanitize(cat.label) + " · " + yzeFmt(found.task.duration) + " detik</span>" +
        "<span>Asal proses: " + sanitize(found.task.origin || "-") + "</span>" +
        (found.task.note ? "<em>" + sanitize(found.task.note) + "</em>" : "");
      tip.classList.add("show");
    });

    cols.addEventListener("mousemove", function (event) {
      if (!tip.classList.contains("show")) return;
      // Hitung di px layar, lalu ubah ke px CSS (skala tampilan).
      var rect = tip.getBoundingClientRect();
      var z = uiZoom(tip);
      var left = event.clientX + 14;
      var top = event.clientY + 14;
      if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - 14;
      if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - 14;
      tip.style.left = Math.max(8, left) / z + "px";
      tip.style.top = Math.max(8, top) / z + "px";
    });

    cols.addEventListener("mouseout", function (event) {
      if (event.target.closest(".yze-block")) hideTip();
    });

    // ── Kelola kolom (man power / proses) ──
    function swapColumns(colId, direction) {
      var list = boardColumns(board);
      var i = list.findIndex(function (col) { return col.id === colId; });
      var j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return;
      var a = scenario.columns.indexOf(list[i]);
      var b = scenario.columns.indexOf(list[j]);
      scenario.columns[a] = list[j];
      scenario.columns[b] = list[i];
      changed();
    }

    addColumnBtn.addEventListener("click", function () {
      var name = YZE_BOARD_LABELS[board].newName + (boardColumns(board).length + 1);
      scenario.columns.push({ id: yzeUid("c"), name: name, kind: board, origin: "", tasks: [] });
      showMessage("Kolom \"" + name + "\" ditambahkan. Seret elemen kerja ke kolom ini.");
      changed();
    });

    columnList.addEventListener("input", function (event) {
      if (!event.target.classList.contains("js-yze-col-name")) return;
      var col = findColumn(event.target.closest(".yze-col-row").getAttribute("data-col"));
      if (!col) return;
      col.name = event.target.value;
      changed({ keepColumnList: true });
    });

    columnList.addEventListener("click", function (event) {
      var row = event.target.closest(".yze-col-row");
      if (!row) return;
      var colId = row.getAttribute("data-col");
      if (event.target.closest(".js-yze-col-up")) return swapColumns(colId, "up");
      if (event.target.closest(".js-yze-col-down")) return swapColumns(colId, "down");
      if (event.target.closest(".js-yze-col-del")) {
        var col = findColumn(colId);
        if (!col) return;
        if (col.tasks.length) {
          showMessage("Kolom \"" + col.name + "\" masih berisi " + col.tasks.length + " elemen. Pindahkan elemennya dulu sebelum menghapus kolom.", true);
          return;
        }
        scenario.columns = scenario.columns.filter(function (item) { return item.id !== colId; });
        showMessage("Kolom \"" + col.name + "\" dihapus.");
        changed();
      }
    });

    // ── Kontrol atas ──
    document.querySelectorAll(".yze-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        board = tab.getAttribute("data-board");
        resetForm();
        renderAll();
      });
    });

    lineSelect.addEventListener("change", function () {
      populateProducts("");
      loadScenario();
    });

    productSelect.addEventListener("change", loadScenario);

    taktInput.addEventListener("input", function () {
      var value = Number(String(taktInput.value).replace(",", "."));
      if (!(value > 0)) return;
      scenario.taktTime = value;
      changed({ keepColumnList: false });
    });

    ctLineSelect.addEventListener("change", function () {
      scenario.ctLine = ctLineSelect.value;
      changed();
    });

    byId("yzeResetBtn").addEventListener("click", function () {
      if (!window.confirm("Reset skenario ke data observasi? Semua perubahan pada skenario line ini akan hilang.")) return;
      clearTimeout(saveTimer);
      var key = yzeScenarioKey(scenario.line, scenario.product);
      SWStorage.updateData(function (data) {
        if (data.yamazumiScenarios) delete data.yamazumiScenarios[key];
        return data;
      });
      loadScenario();
      showMessage("Skenario dikembalikan ke data observasi.");
    });

    byId("yzeExportBtn").addEventListener("click", function () {
      if (!scenario.columns.length) return showMessage("Belum ada data untuk export.", true);
      var takt = Number(scenario.taktTime) || 0;
      var rows = [
        ["Line Balancing Yamazumi"],
        ["Line", scenario.line || "-"],
        ["Type Produk", scenario.product || "-"],
        ["Takt Time (detik)", takt]
      ];
      ["manpower", "machine"].forEach(function (kind) {
        var m = computeMetrics(kind);
        var base = computeMetrics(kind, original);
        if (!m.count) return;
        rows.push([], [YZE_BOARD_LABELS[kind].title]);
        rows.push(["Kolom", "No", "Elemen Kerja", "Kategori", "Durasi (detik)", "Asal Proses", "Catatan"]);
        m.list.forEach(function (col) {
          col.tasks.forEach(function (task, index) {
            rows.push([col.name, index + 1, task.name, yzeCategory(task.category).label, Number(yzeFmt(task.duration)), task.origin || "", task.note || ""]);
          });
          rows.push([col.name, "", "Total", "", Number(yzeFmt(columnTotal(col))), "", ""]);
        });
        rows.push([]);
        rows.push(["Ringkasan " + YZE_BOARD_LABELS[kind].title, "Skenario", "Awal"]);
        rows.push([YZE_BOARD_LABELS[kind].count, m.count, base.count]);
        rows.push(["Bottleneck (detik)", Number(yzeFmt(m.max)), Number(yzeFmt(base.max))]);
        rows.push(["Kolom Bottleneck", m.bottleneck, base.bottleneck]);
        rows.push(["Efisiensi Line (%)", Number(yzeFmt(m.efficiency)), Number(yzeFmt(base.efficiency))]);
        rows.push(["Balance Loss (%)", Number(yzeFmt(m.balanceLoss)), Number(yzeFmt(base.balanceLoss))]);
        rows.push(["Kolom di atas Takt", m.over, base.over]);
      });
      var safe = function (text) { return String(text || "-").replace(/[^\w\-]+/g, "_"); };
      SWStorage.downloadXlsx("line-balancing-" + safe(scenario.line) + "-" + safe(scenario.product) + ".xlsx", rows, "Line Balancing");
      showMessage("Skenario line balancing diexport ke Excel (.xlsx).");
    });

    // ── Mulai ──
    populateLines(getRouteParam("line"));
    populateProducts(getRouteParam("product"));
    loadScenario();
  }

  function obswNum(value) {
    var text = String(value == null ? "" : value).trim().replace(",", ".");
    if (!text) return 0;
    var num = Number(text);
    return Number.isFinite(num) ? num : 0;
  }

  function obswMaybeNum(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return null;
    var num = Number(text.replace(",", "."));
    return Number.isFinite(num) ? num : null;
  }

  function obswFmt(value, digits) {
    if (value == null || value === "") return "";
    var num = Number(value);
    if (!Number.isFinite(num)) return "";
    var text = typeof digits === "number" ? num.toFixed(digits) : String(Math.round(num * 100) / 100);
    return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.0+$/, "").replace(/\.$/, "");
  }

  function obswCat(value) {
    var key = String(value || "").trim().toLowerCase();
    if (!key || key === "manual" || key === "value") return "Value";
    if (key === "non value" || key === "non-value" || key === "nonvalue") return "Non Value";
    if (key === "walking") return "Walking";
    if (key === "waiting" || key === "irregular") return "Irregular";
    if (key === "machine") return "Machine";
    return "Value";
  }

  function obswType(category) {
    var safe = obswCat(category);
    if (safe === "Walking") return "Walking";
    if (safe === "Irregular") return "Waiting";
    if (safe === "Machine") return "Machine";
    return "Manual";
  }

  function obswMode(samples) {
    if (!samples.length) return 0;

    var nonZeros   = samples.filter(function (s) { return s > 0; });
    var zeroCount  = samples.filter(function (s) { return s === 0; }).length;

    if (!nonZeros.length) return 0;

    // Hitung frekuensi nilai non-zero
    var freq = {};
    var maxNonZeroFreq = 0;
    nonZeros.forEach(function (s) {
      var key = String(s);
      freq[key] = (freq[key] || 0) + 1;
      if (freq[key] > maxNonZeroFreq) maxNonZeroFreq = freq[key];
    });

    // Jika nilai 0 lebih sering dari nilai non-zero manapun → anggap 0 hanya ada satu
    var effectiveZeroCount = zeroCount > maxNonZeroFreq ? 1 : zeroCount;

    // Ada nilai non-zero yang berulang, atau frekuensinya melebihi zero efektif → pilih modus non-zero
    if (maxNonZeroFreq > 1 || maxNonZeroFreq > effectiveZeroCount) {
      var best = null;
      Object.keys(freq).forEach(function (key) {
        if (freq[key] === maxNonZeroFreq) {
          var v = Number(key);
          if (best === null || v < best) best = v;
        }
      });
      return best;
    }

    // Semua nilai unik → ke-2 terkecil (nilai 0 efektif menempati slot ke-1)
    var sorted = nonZeros.slice().sort(function (a, b) { return a - b; });
    if (effectiveZeroCount > 0) {
      return sorted[0]; // 0 = ke-1, non-zero terkecil = ke-2
    }
    return sorted.length >= 2 ? sorted[1] : sorted[0];
  }

  function obswStats(row) {
    var samples = Array.isArray(row && row.samples) ? row.samples.map(obswMaybeNum) : [];
    while (samples.length < 10) samples.push(null);
    samples = samples.slice(0, 10);
    var valid = samples.filter(function (sample) { return Number.isFinite(sample); });
    var mode = valid.length ? obswMode(valid) : 0;
    var min = valid.length ? Math.min.apply(null, valid) : 0;
    var max = valid.length ? Math.max.apply(null, valid) : 0;
    // Qty wajib diisi user: kosong (""/null) = belum diisi → qty null & CT 0.
    // Field yang tidak ada sama sekali (data lama) tetap dianggap 1.
    var rawQty = row && Object.prototype.hasOwnProperty.call(row, "qty") ? row.qty : 1;
    var parsedQty = obswMaybeNum(rawQty);
    var qty = parsedQty > 0 ? parsedQty : null;
    return {
      samples: samples,
      valid: valid,
      mode: mode,
      min: min,
      max: max,
      qty: qty,
      ct: qty ? mode / qty : 0
    };
  }

  function obswHasSample(row) {
    return obswStats(row).valid.length > 0;
  }

  // Qty belum diisi pada elemen yang sudah punya data sample.
  // Elemen tanpa sample tetap boleh disimpan (nama elemen tetap tercatat, CT 0) tanpa Qty.
  function obswMissingQty(row) {
    return obswHasSample(row) && obswStats(row).qty == null;
  }

  function obswNormRow(raw) {
    var src = raw || {};
    var samples = Array.isArray(src.samples) ? src.samples.slice(0, 10) : [];
    while (samples.length < 10) samples.push(null);
    var category = obswCat(src.category || src.type);
    var stats = obswStats({ samples: samples, qty: Object.prototype.hasOwnProperty.call(src, "qty") ? src.qty : 1 });
    return {
      name: String(src.name || "").trim(),
      category: category,
      type: obswType(category),
      samples: stats.samples,
      qty: stats.qty,
      unit: String(src.unit || "Battery").trim() || "Battery",
      note: String(src.note || "").trim(),
      mode: stats.mode,
      min: stats.min,
      max: stats.max,
      ct: stats.ct,
      avg: stats.ct
    };
  }

  function obswBlankRow() {
    return obswNormRow({ category: "Value", qty: "", unit: "Battery" });
  }

  function obswHasRow(row) {
    var safe = obswNormRow(row);
    return Boolean(safe.name || safe.note || safe.samples.some(function (sample) { return Number.isFinite(sample); }));
  }

  function obswDateInput(value) {
    var text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    var date = text ? new Date(text) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return date.toISOString().slice(0, 10);
  }

  function obswDateLabel(value) {
    var text = String(value || "").trim();
    if (!text) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      var parts = text.split("-");
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }
    var date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString("id-ID");
  }

  function obswCategoryOptions(selected) {
    var safe = obswCat(selected);
    return ["Value", "Non Value", "Walking", "Irregular", "Machine"].map(function (category) {
      return "<option value='" + category + "'" + (category === safe ? " selected" : "") + ">" + category + "</option>";
    }).join("");
  }

  function obswRowHtml(row, index) {
    var safe = obswNormRow(row);
    var stats = obswStats(safe);
    var html = [
      "<tr data-index='" + index + "'>",
      "<td class='obs-cell-center'><strong>" + (index + 1) + "</strong></td>",
      "<td><input type='text' class='obs-detail-input js-obsw-input' data-field='name' value='" + sanitize(safe.name) + "' placeholder='Nama elemen kerja'></td>",
      "<td class='obs-divider-right'><select class='obs-detail-input js-obsw-input' data-field='category'>" + obswCategoryOptions(safe.category) + "</select></td>"
    ];
    stats.samples.forEach(function (sample, sampleIndex) {
      html.push("<td><input type='text' inputmode='decimal' class='obs-detail-input sample js-obsw-input' data-field='sample-" + sampleIndex + "' value='" + sanitize(obswFmt(sample)) + "'></td>");
    });
    html.push(
      "<td class='obs-stat-value js-obsw-mode' title='Pemilihan Modus:&#10;• Ada nilai berulang → ambil nilai paling sering muncul&#10;• Semua nilai unik → ambil nilai ke-2 terkecil&#10;• Nilai 0 tidak pernah dipilih sebagai hasil&#10;• Jika 0 lebih banyak dari nilai lain → dianggap hanya ada 1 nol' style='cursor:help;'>" + sanitize(obswFmt(stats.mode)) + "</td>",
      "<td class='obs-stat-value js-obsw-min'>" + sanitize(obswFmt(stats.min)) + "</td>",
      "<td class='obs-stat-value obs-divider-right js-obsw-max'>" + sanitize(obswFmt(stats.max)) + "</td>",
      "<td><input type='text' inputmode='decimal' class='obs-detail-input sample js-obsw-input" + (obswMissingQty(safe) ? " obs-input-missing" : "") + "' data-field='qty' value='" + sanitize(stats.qty == null ? "" : obswFmt(stats.qty)) + "' placeholder='Qty'></td>",
      "<td class='obs-divider-right'><input type='text' class='obs-detail-input js-obsw-input' data-field='unit' value='" + sanitize(safe.unit) + "'></td>",
      "<td class='obs-stat-value obs-divider-right js-obsw-ct'>" + (stats.qty == null ? "-" : sanitize(obswFmt(stats.ct, 2))) + "</td>",
      "<td><input type='text' class='obs-detail-input js-obsw-input' data-field='note' value='" + sanitize(safe.note) + "' placeholder='Catatan'></td>",
      "</tr>"
    );
    return html.join("");
  }

  function obswDetail(observation) {
    var elements = (observation && Array.isArray(observation.elements) ? observation.elements : []).map(obswNormRow);
    var totals = new Array(10).fill(0);
    var totalMode = 0;
    var totalQty = 0;
    var totalCt = 0;
    var minMode = null;
    var maxMode = null;
    var body = "";

    if (!elements.length) {
      return {
        bodyHtml: '<tr><td colspan="20" class="placeholder">Belum ada elemen kerja.</td></tr>',
        footerHtml: "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td><td class='obs-total-muted obs-divider-right'>-</td>" +
          new Array(10).fill("<td class='obs-total-number'>0</td>").join("") +
          "<td class='obs-total-number'>0</td><td class='obs-total-number'>0</td><td class='obs-total-number obs-divider-right'>0</td><td class='obs-total-number'>0</td><td class='obs-total-unit obs-divider-right'>Battery</td><td class='obs-total-number obs-divider-right'>0</td><td class='obs-total-muted'>-</td>",
        totalCt: 0
      };
    }

    elements.forEach(function (row, index) {
      var stats = obswStats(row);
      totalMode += stats.mode;
      totalQty += stats.qty;
      totalCt += stats.ct;
      minMode = minMode == null ? stats.mode : Math.min(minMode, stats.mode);
      maxMode = maxMode == null ? stats.mode : Math.max(maxMode, stats.mode);
      stats.samples.forEach(function (sample, sampleIndex) {
        if (Number.isFinite(sample)) totals[sampleIndex] += sample;
      });
      body += "<tr><td class='obs-cell-center'>" + (index + 1) + "</td><td>" + sanitize(row.name || "-") + "</td><td class='obs-cell-center obs-divider-right'>" + sanitize(row.category) + "</td>" +
        stats.samples.map(function (sample, sampleIndex) {
          return "<td class='obs-cell-center" + (sampleIndex === 9 ? " obs-divider-right" : "") + "'>" + sanitize(obswFmt(sample)) + "</td>";
        }).join("") +
        "<td class='obs-cell-center'>" + sanitize(obswFmt(stats.mode)) + "</td><td class='obs-cell-center'>" + sanitize(obswFmt(stats.min)) + "</td><td class='obs-cell-center obs-divider-right'>" + sanitize(obswFmt(stats.max)) + "</td><td class='obs-cell-center'>" + sanitize(stats.qty == null ? "" : obswFmt(stats.qty)) + "</td><td class='obs-cell-center obs-divider-right'>" + sanitize(row.unit || "Battery") + "</td><td class='obs-cell-center obs-divider-right'><strong>" + sanitize(obswFmt(stats.ct, 2)) + "</strong></td><td>" + sanitize(row.note || "") + "</td></tr>";
    });

    return {
      bodyHtml: body,
      footerHtml: "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td><td class='obs-total-muted obs-divider-right'>-</td>" +
        totals.map(function (value, sampleIndex) {
          return "<td class='obs-total-number" + (sampleIndex === 9 ? " obs-divider-right" : "") + "'>" + sanitize(obswFmt(value)) + "</td>";
        }).join("") +
        "<td class='obs-total-number'>" + sanitize(obswFmt(totalMode)) + "</td><td class='obs-total-number'>" + sanitize(obswFmt(minMode)) + "</td><td class='obs-total-number obs-divider-right'>" + sanitize(obswFmt(maxMode)) + "</td><td class='obs-total-number'>" + sanitize(obswFmt(totalQty)) + "</td><td class='obs-total-unit obs-divider-right'>Battery</td><td class='obs-total-number obs-divider-right'><strong>" + sanitize(obswFmt(totalCt, 2)) + "</strong></td><td class='obs-total-muted'>-</td>",
      totalCt: totalCt
    };
  }

  // ── Form Excel Lembar Observasi (template unduh + import) ──
  var OBSW_FORM_ROWS = 30;
  var OBSW_HEADER_FIELDS = [
    { key: "lineName", labels: ["line"] },
    { key: "processName", labels: ["proses", "nama proses"] },
    { key: "productType", labels: ["tipe produk", "type produk", "tipe", "model/tipe", "model"] },
    { key: "taktTime", labels: ["takt time", "takt"] },
    { key: "tanggal", labels: ["tanggal", "tanggal observasi", "tgl"] },
    { key: "shiftJam", labels: ["shift / jam", "shift/jam", "shift", "jam"] },
    { key: "observerName", labels: ["nama observer", "observer"] },
    { key: "operatorName", labels: ["nama operator", "operator"] }
  ];

  function obswImportKey(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/[:*]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function obswHeaderFieldFor(value) {
    var key = obswImportKey(value);
    if (!key) return null;
    var found = OBSW_HEADER_FIELDS.find(function (field) { return field.labels.indexOf(key) >= 0; });
    return found ? found.key : null;
  }

  function obswBuildFormSheets() {
    var S = SWStorage.XLSX_STYLE;
    function cell(v, s) { return { v: v, s: s }; }
    function span(value, style, width) {
      var out = [cell(value, style)];
      for (var i = 1; i < width; i += 1) out.push(cell("", style));
      return out;
    }
    var headerRow = function (leftLabel, rightLabel) {
      // A kosong | B label | C:F isian | G kosong | H:J label | K:M isian
      return [""].concat(
        [cell(leftLabel, S.label)],
        span("", S.input, 4),
        [""],
        span(rightLabel, S.label, 3),
        span("", S.input, 3)
      );
    };
    var tableHeader = [cell("NO", S.header), cell("ELEMEN KERJA", S.header), cell("KATEGORI", S.header)];
    for (var s = 1; s <= 10; s += 1) tableHeader.push(cell("SAMPLE " + s, S.header));
    tableHeader.push(cell("QTY", S.header), cell("UNIT", S.header), cell("NOTE", S.header));

    var rows = [
      span("LEMBAR OBSERVASI", S.title, 16),
      span("PT. Century Batteries Indonesia — isi kotak bergaris, lalu import di halaman Lembar Observasi.", S.hint, 16),
      ["", cell("NO FORM", S.label)].concat(span("Form-ISD-ISD-001", S.fixed, 4)),
      headerRow("LINE", "TANGGAL"),
      headerRow("PROSES", "SHIFT / JAM"),
      headerRow("TIPE PRODUK", "NAMA OBSERVER"),
      headerRow("TAKT TIME (detik)", "NAMA OPERATOR"),
      [],
      tableHeader
    ];
    for (var r = 1; r <= OBSW_FORM_ROWS; r += 1) {
      var line = [cell(r, S.center), cell("", S.input), cell("", S.center)];
      for (var k = 0; k < 10; k += 1) line.push(cell("", S.center));
      line.push(cell("", S.center), cell("Battery", S.center), cell("", S.input));
      rows.push(line);
    }
    rows.push([]);
    rows.push(span("Kategori: Value, Non Value, Walking, Irregular, Machine. Sample diisi waktu (detik). QTY wajib diisi (jumlah unit per siklus). Modus, Min, Max dan CT dihitung otomatis setelah import. Tanggal boleh format tanggal Excel atau dd/mm/yyyy.", S.hint, 16));

    var merges = ["A1:P1", "A2:P2", "C3:F3"];
    for (var h = 4; h <= 7; h += 1) merges.push("C" + h + ":F" + h, "H" + h + ":J" + h, "K" + h + ":M" + h);
    var noteRow = rows.length;
    merges.push("A" + noteRow + ":P" + noteRow);
    var rowHeights = { 1: 28, 9: 30 };
    rowHeights[noteRow] = 32;

    var guide = [
      [cell("PETUNJUK PENGISIAN FORM LEMBAR OBSERVASI", S.title)],
      [],
      [cell("Kolom", S.header), cell("Keterangan", S.header)],
      [cell("LINE / PROSES / TIPE PRODUK", S.label), cell("Wajib diisi. Dipakai untuk pengelompokan di Data Observasi, TSKK dan Yamazumi.", S.input)],
      [cell("TAKT TIME", S.label), cell("Angka dalam detik, contoh 38.5", S.input)],
      [cell("TANGGAL", S.label), cell("Tanggal observasi. Boleh format tanggal Excel atau teks dd/mm/yyyy.", S.input)],
      [cell("ELEMEN KERJA", S.label), cell("Satu baris per elemen kerja. Baris tanpa nama elemen dan tanpa sample akan dilewati.", S.input)],
      [cell("KATEGORI", S.label), cell("Value, Non Value, Walking, Irregular, atau Machine. Kosong = Value.", S.input)],
      [cell("SAMPLE 1-10", S.label), cell("Waktu hasil pengamatan (detik). Boleh diisi sebagian.", S.input)],
      [cell("QTY / UNIT", S.label), cell("Wajib diisi: jumlah unit per siklus (CT = Modus ÷ Qty). Unit default Battery.", S.input)],
      [cell("NOTE", S.label), cell("Catatan bebas (opsional).", S.input)],
      [],
      [cell("Tambah baris di bawah tabel bila elemen kerja lebih dari " + OBSW_FORM_ROWS + ". Setelah diimport, data bisa dicek dan diubah dulu sebelum klik Simpan Observasi.", S.hint)]
    ];

    return [
      {
        name: "Lembar Observasi",
        rows: rows,
        cols: [6, 34, 12, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 7, 10, 28],
        merges: merges,
        rowHeights: rowHeights
      },
      { name: "Petunjuk", rows: guide, cols: [30, 90] }
    ];
  }

  function obswImportDate(value) {
    if (value === "" || value == null) return "";
    if (typeof value === "number" && value > 20000 && value < 80000) {
      // Serial tanggal Excel (hari sejak 1899-12-30).
      return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
    }
    var text = String(value).trim();
    var dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(text);
    if (dmy) return dmy[3] + "-" + ("0" + dmy[2]).slice(-2) + "-" + ("0" + dmy[1]).slice(-2);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    return "";
  }

  function obswImportCategory(value) {
    var bucket = classifyCategory(value);
    if (!String(value || "").trim()) return "Value";
    return { value: "Value", nonValue: "Non Value", walking: "Walking", irregular: "Irregular", machine: "Machine" }[bucket] || obswCat(value);
  }

  function obswImportNumber(value) {
    if (typeof value === "number") return Math.round(value * 10000) / 10000;
    return value == null ? "" : String(value).trim();
  }

  // Form Excel 1 Line: header per line + satu tabel dengan kolom PROSES & NAMA OPERATOR.
  // prefill (opsional): { lineName, productType, taktTime, processes: [{ processName, operatorName, elements }] }
  var OBSW_LINE_FORM_ROWS = 200;

  function obswBuildLineFormSheets(prefill) {
    var S = SWStorage.XLSX_STYLE;
    var info = prefill || {};
    function cell(v, s) { return { v: v, s: s }; }
    function span(value, style, width) {
      var out = [cell(value, style)];
      for (var i = 1; i < width; i += 1) out.push(cell("", style));
      return out;
    }
    // A label | B:D isian | E kosong | F:H label | I:L isian | M kosong | N:P label | Q:R isian
    function headerRow(l1, v1, l2, v2, l3, v3, fixed3) {
      var row = [cell(l1, S.label)].concat(span(v1, S.input, 3), [""], span(l2, S.label, 3), span(v2, S.input, 4));
      if (l3) row = row.concat([""], span(l3, S.label, 3), span(v3, fixed3 ? S.fixed : S.input, 2));
      return row;
    }

    var tableHeader = [cell("PROSES", S.header), cell("NAMA OPERATOR", S.header), cell("NO", S.header), cell("ELEMEN KERJA", S.header), cell("KATEGORI", S.header)];
    for (var s = 1; s <= 10; s += 1) tableHeader.push(cell("SAMPLE " + s, S.header));
    tableHeader.push(cell("QTY", S.header), cell("UNIT", S.header), cell("NOTE", S.header));

    // Catatan pengisian ditaruh di atas tabel: baris di bawah tabel akan terbaca sebagai nama proses.
    var rows = [
      span("LEMBAR OBSERVASI — 1 LINE (BANYAK PROSES)", S.title, 18),
      span("PT. Century Batteries Indonesia — tulis nama PROSES & OPERATOR di baris pertama tiap proses; baris di bawahnya otomatis ikut proses tersebut sampai nama proses berikutnya.", S.hint, 18),
      headerRow("LINE", info.lineName || "", "TANGGAL", "", "NO FORM", "Form-ISD-ISD-001", true),
      headerRow("TIPE PRODUK", info.productType || "", "SHIFT / JAM", ""),
      headerRow("TAKT TIME (detik)", info.taktTime || "", "NAMA OBSERVER", ""),
      span("Kategori: Value, Non Value, Walking, Irregular, Machine (kosong = Value). Sample = waktu (detik). QTY wajib diisi (jumlah unit per siklus). Kolom NO boleh dikosongkan. Modus, Min, Max dan CT dihitung otomatis. LINE, TIPE PRODUK, TAKT, TANGGAL, SHIFT dan OBSERVER berlaku untuk semua proses. Elemen tanpa sample tetap tersimpan (CT 0).", S.hint, 18),
      tableHeader
    ];

    function elementRow(processName, operatorName, no, element) {
      var el = element || {};
      var line = [cell(processName || "", S.label), cell(operatorName || "", S.input), cell(no, S.center), cell(el.name || "", S.input), cell(el.category || "", S.center)];
      for (var k = 0; k < 10; k += 1) line.push(cell("", S.center));
      line.push(cell(el.qty == null ? "" : el.qty, S.center), cell(el.unit || "Battery", S.center), cell("", S.input));
      return line;
    }

    var written = 0;
    (info.processes || []).forEach(function (proc) {
      var elements = proc.elements && proc.elements.length ? proc.elements : [null];
      elements.forEach(function (element, index) {
        rows.push(elementRow(index === 0 ? proc.processName : "", index === 0 ? proc.operatorName : "", index + 1, element));
        written += 1;
      });
    });
    // Baris kosong cadangan untuk proses / elemen tambahan.
    for (var r = written; r < Math.max(OBSW_LINE_FORM_ROWS, written + 40); r += 1) {
      rows.push(elementRow("", "", "", null));
    }

    var merges = ["A1:R1", "A2:R2", "B3:D3", "F3:H3", "I3:L3", "N3:P3", "Q3:R3", "B4:D4", "F4:H4", "I4:L4", "B5:D5", "F5:H5", "I5:L5", "A6:R6"];
    var rowHeights = { 1: 28, 2: 30, 6: 32, 7: 30 };

    var guide = [
      [cell("PETUNJUK FORM LEMBAR OBSERVASI 1 LINE", S.title)],
      [],
      [cell("Kolom", S.header), cell("Keterangan", S.header)],
      [cell("LINE", S.label), cell("Wajib. Semua proses di form ini disimpan ke line ini.", S.input)],
      [cell("TIPE PRODUK / TAKT TIME", S.label), cell("Berlaku untuk semua proses. Takt Time dalam detik.", S.input)],
      [cell("TANGGAL / SHIFT / OBSERVER", S.label), cell("Berlaku untuk semua proses. Tanggal boleh format tanggal Excel atau dd/mm/yyyy.", S.input)],
      [cell("PROSES", S.label), cell("Tulis di baris pertama tiap proses. Baris di bawahnya yang kolom PROSES-nya kosong dianggap masih proses yang sama. Urutan proses di form menjadi urutan proses line.", S.input)],
      [cell("NAMA OPERATOR", S.label), cell("Operator proses tersebut, cukup ditulis sekali di baris pertama proses.", S.input)],
      [cell("ELEMEN KERJA / KATEGORI", S.label), cell("Satu baris per elemen kerja. Kategori: Value, Non Value, Walking, Irregular, Machine.", S.input)],
      [cell("SAMPLE 1-10", S.label), cell("Waktu hasil pengamatan (detik). Boleh diisi sebagian. Baris tanpa nama elemen dan tanpa sample dilewati.", S.input)],
      [cell("QTY / UNIT / NOTE", S.label), cell("Qty wajib diisi: jumlah unit per siklus (CT = Modus ÷ Qty). Unit default Battery. Note = catatan.", S.input)],
      [],
      [cell("Saat import, proses yang sudah ada di line & tipe produk yang sama disimpan sebagai revisi baru; proses yang belum ada disimpan sebagai Revisi 000. Hasil import bisa dicek dulu di pratinjau sebelum disimpan.", S.hint)]
    ];

    return [
      {
        name: "Form 1 Line",
        rows: rows,
        cols: [24, 16, 5, 32, 11, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 9, 24],
        merges: merges,
        rowHeights: rowHeights
      },
      { name: "Petunjuk", rows: guide, cols: [30, 100] }
    ];
  }

  // rows: hasil SWStorage.readXlsxRows (array of {colIndex: value}).
  // Header dicari lewat label (bukan posisi sel), jadi form yang digeser/ditambah kolom tetap terbaca.
  function obswScanImport(rows) {
    var header = {};
    var headerRowIndex = -1;
    var columns = null;

    rows.forEach(function (row, rowIndex) {
      var cols = Object.keys(row).map(Number).sort(function (a, b) { return a - b; });
      if (headerRowIndex < 0 && cols.some(function (c) { return obswImportKey(row[c]) === "elemen kerja"; })) {
        headerRowIndex = rowIndex;
        columns = { samples: [] };
        cols.forEach(function (c) {
          var key = obswImportKey(row[c]);
          var sampleM = /^(?:sample\s*)?(\d{1,2})$/.exec(key);
          if (key === "no") columns.no = c;
          else if (key === "elemen kerja") columns.name = c;
          else if (key === "kategori" || key === "category") columns.category = c;
          else if (sampleM && Number(sampleM[1]) >= 1 && Number(sampleM[1]) <= 10) columns.samples[Number(sampleM[1]) - 1] = c;
          else if (key === "qty") columns.qty = c;
          else if (key === "unit" || key === "satuan") columns.unit = c;
          else if (key === "note" || key === "catatan" || key === "keterangan") columns.note = c;
          else if (key === "proses" || key === "nama proses") columns.process = c;
          else if (key === "nama operator" || key === "operator") columns.operator = c;
          else if (key === "line") columns.line = c;
        });
        return;
      }
      if (headerRowIndex >= 0) return;

      // Blok header: label → isian = sel tidak kosong pertama di kanannya (kecuali label lain).
      // Sel kosong dilewati karena bagian sel merge ikut tertulis sebagai sel kosong.
      cols.forEach(function (c, i) {
        var field = obswHeaderFieldFor(row[c]);
        if (!field || header[field] !== undefined) return;
        var next = cols.slice(i + 1).find(function (col) { return String(row[col] == null ? "" : row[col]).trim() !== ""; });
        header[field] = next === undefined || obswHeaderFieldFor(row[next]) ? "" : row[next];
      });
    });

    if (!columns || columns.name === undefined) {
      throw new Error("Kolom \"Elemen Kerja\" tidak ditemukan. Gunakan tombol Download Form Excel untuk format yang benar.");
    }
    // Format tabel datar Data Observasi (kolom Line & Proses per baris) punya import sendiri.
    if (columns.line !== undefined && columns.process !== undefined) {
      throw new Error("File ini berformat Data Observasi (kolom Line per baris). Import file ini lewat halaman Data Observasi → Import Data.");
    }

    var takt = obswImportNumber(header.taktTime);
    return {
      columns: columns,
      dataRows: rows.slice(headerRowIndex + 1),
      dataRowOffset: headerRowIndex + 1,
      header: {
        lineName: String(header.lineName || "").trim(),
        processName: String(header.processName || "").trim(),
        productType: String(header.productType || "").trim(),
        taktTime: takt === "" ? "" : String(takt).replace(",", "."),
        tanggal: obswImportDate(header.tanggal),
        shiftJam: String(header.shiftJam || "").trim(),
        observerName: String(header.observerName || "").trim(),
        operatorName: String(header.operatorName || "").trim()
      }
    };
  }

  // Satu baris tabel → elemen kerja (null bila baris kosong).
  function obswImportElement(row, columns) {
    var name = String(row[columns.name] == null ? "" : row[columns.name]).trim();
    var samples = [];
    for (var s = 0; s < 10; s += 1) {
      var col = columns.samples[s];
      var raw = col === undefined ? "" : obswImportNumber(row[col]);
      samples.push(raw === "" ? null : raw);
    }
    var hasSample = samples.some(function (v) { return v !== null && Number.isFinite(obswMaybeNum(v)); });
    if (!name && !hasSample) return null;
    return obswNormRow({
      name: name,
      category: obswImportCategory(columns.category === undefined ? "" : row[columns.category]),
      samples: samples,
      // Sel Qty kosong tetap kosong (wajib diisi); file tanpa kolom Qty sama sekali (format lama) dianggap 1.
      qty: columns.qty === undefined ? 1 : (row[columns.qty] == null ? "" : obswImportNumber(row[columns.qty])),
      unit: columns.unit === undefined ? "Battery" : String(row[columns.unit] || "Battery"),
      note: columns.note === undefined ? "" : String(row[columns.note] || "")
    });
  }

  // Hasil: { kind: "single", ...header, elements } atau { kind: "line", ...header, processes: [...], warnings }
  function obswParseImportRows(rows) {
    var scan = obswScanImport(rows);
    var columns = scan.columns;

    if (columns.process === undefined) {
      var elements = [];
      scan.dataRows.forEach(function (row) {
        var element = obswImportElement(row, columns);
        if (element) elements.push(element);
      });
      return Object.assign({ kind: "single", elements: elements }, scan.header);
    }

    // Form 1 Line: kolom PROSES/OPERATOR cukup diisi di baris pertama tiap proses.
    var processes = [];
    var byName = {};
    var current = null;
    var orphanRows = [];
    scan.dataRows.forEach(function (row, index) {
      var processName = String(row[columns.process] == null ? "" : row[columns.process]).trim();
      var operatorName = columns.operator === undefined ? "" : String(row[columns.operator] == null ? "" : row[columns.operator]).trim();
      if (processName) {
        var key = processName.toLowerCase();
        current = byName[key];
        if (!current) {
          current = { processName: processName, operatorName: "", elements: [] };
          byName[key] = current;
          processes.push(current);
        }
      }
      if (current && operatorName && !current.operatorName) current.operatorName = operatorName;
      var element = obswImportElement(row, columns);
      if (!element) return;
      if (!current) {
        orphanRows.push(row.rowNumber || scan.dataRowOffset + index + 1);
        return;
      }
      current.elements.push(element);
    });

    var warnings = [];
    if (orphanRows.length) {
      warnings.push(orphanRows.length + " baris elemen dilewati karena belum ada nama PROSES di atasnya (baris Excel " + orphanRows.slice(0, 5).join(", ") + (orphanRows.length > 5 ? ", ..." : "") + ").");
    }
    // Semua elemen kerja tetap ikut walau belum ada sample (CT 0).
    // Proses yang seluruh elemennya belum ada sample ditandai noSample: tetap tampil di pratinjau
    // tapi tidak dicentang otomatis (Form 1 Line dari data lama berisi semua proses line).
    var withElements = processes.filter(function (proc) { return proc.elements.length; });
    var emptyProcesses = processes.filter(function (proc) { return !proc.elements.length; });
    if (emptyProcesses.length) {
      warnings.push("Proses tanpa elemen kerja dilewati: " + emptyProcesses.map(function (proc) { return proc.processName; }).join(", ") + ".");
    }
    withElements.forEach(function (proc) {
      proc.noSample = !proc.elements.some(obswHasSample);
    });
    var unsampled = withElements.filter(function (proc) { return proc.noSample; });
    if (unsampled.length) {
      warnings.push(unsampled.length + " proses belum ada data sample sama sekali, tidak dicentang otomatis (centang bila tetap ingin disimpan): " +
        unsampled.slice(0, 8).map(function (proc) { return proc.processName; }).join(", ") + (unsampled.length > 8 ? ", ..." : "") + ".");
    }
    var noSample = withElements.reduce(function (count, proc) {
      return proc.noSample ? count : count + proc.elements.filter(function (el) { return !obswHasSample(el); }).length;
    }, 0);
    if (noSample) {
      warnings.push(noSample + " elemen kerja belum ada sample — tetap disimpan dengan CT 0.");
    }
    return Object.assign({
      kind: "line",
      processes: withElements,
      warnings: warnings
    }, scan.header);
  }

  function obswLineSort(values) {
    return values.slice().sort(function (a, b) {
      var ma = String(a || "").match(/line\s*(\d+)/i);
      var mb = String(b || "").match(/line\s*(\d+)/i);
      if (ma && mb) return Number(ma[1]) - Number(mb[1]);
      if (ma) return -1;
      if (mb) return 1;
      return String(a || "").localeCompare(String(b || ""), "id");
    });
  }

  function initObservasiPage() {
    var lineInput = byId("lineName");
    var tanggalInput = byId("obsTanggal");
    var shiftInput = byId("shiftJam");
    var observerInput = byId("observerName");
    var productInput = byId("productType");
    var taktInput = byId("taktTimeInput");
    var noFormValueEl = byId("noFormValue");
    var processInput = byId("processName");
    var operatorInput = byId("operatorName");
    var rowsBody = byId("observasiRows");
    var totalRow = byId("observasiTotalRow");
    var addBtn = byId("addObservasiRowBtn");
    var clearDraftBtn = byId("clearObservasiDraftBtn");
    var saveBtn = byId("saveObservasiBtn");
    var totalElementEl = byId("observasiTotalElemen");
    var totalCycleEl = byId("observasiTotalCycle");
    var NO_FORM_CODE = "Form-ISD-ISD-001";
    var rows = [obswBlankRow()];
    var editingObservationId = "";

    if (!lineInput || !rowsBody || !saveBtn) return;

    function persistDraft() {
      SWStorage.updateData(function (data) {
        data.drafts.observasi = {
          lineName: lineInput.value.trim(),
          tanggal: tanggalInput.value || obswDateInput(),
          shiftJam: shiftInput.value.trim(),
          observerName: observerInput.value.trim(),
          productType: productInput.value.trim(),
          taktTime: taktInput.value.trim(),
          processName: processInput.value.trim(),
          operatorName: operatorInput.value.trim(),
          editingObservationId: editingObservationId || null,
          rows: rows.map(obswNormRow)
        };
        return data;
      });
    }

    function renderTotals() {
      var detail = obswDetail({ elements: rows });
      totalRow.innerHTML = detail.footerHtml;
      totalElementEl.textContent = String(rows.filter(obswHasRow).length);
      totalCycleEl.textContent = obswFmt(detail.totalCt, 2) || "0";
    }

    function renderRows() {
      if (!rows.length) rows = [obswBlankRow()];
      rowsBody.innerHTML = rows.map(obswRowHtml).join("");
      renderTotals();
    }

    function setEditMode(observation) {
      editingObservationId = observation && observation.id ? observation.id : "";
      saveBtn.textContent = editingObservationId ? "Simpan Revisi Baru" : "Simpan Observasi";
    }

    function refreshRow(tr, row) {
      var stats = obswStats(row);
      var modeCell = tr.querySelector(".js-obsw-mode");
      var minCell = tr.querySelector(".js-obsw-min");
      var maxCell = tr.querySelector(".js-obsw-max");
      var ctCell = tr.querySelector(".js-obsw-ct");
      if (modeCell) modeCell.textContent = obswFmt(stats.mode);
      if (minCell) minCell.textContent = obswFmt(stats.min);
      if (maxCell) maxCell.textContent = obswFmt(stats.max);
      if (ctCell) ctCell.textContent = stats.qty == null ? "-" : obswFmt(stats.ct, 2);
      var qtyInput = tr.querySelector("[data-field='qty']");
      if (qtyInput) qtyInput.classList.toggle("obs-input-missing", obswMissingQty(row));
    }

    function updateFromInput(target) {
      var tr = target.closest("tr[data-index]");
      if (!tr) return;
      var rowIndex = Number(tr.getAttribute("data-index"));
      if (!Number.isFinite(rowIndex) || !rows[rowIndex]) return;
      var row = obswNormRow(rows[rowIndex]);
      var field = target.getAttribute("data-field");
      if (field === "name" || field === "unit" || field === "note") row[field] = target.value;
      if (field === "category") row.category = target.value;
      if (field === "qty") row.qty = target.value;
      if (field && field.indexOf("sample-") === 0) row.samples[Number(field.split("-")[1])] = obswMaybeNum(target.value);
      rows[rowIndex] = obswNormRow(row);
      refreshRow(tr, rows[rowIndex]);
      renderTotals();
      persistDraft();
    }

    function loadObservationToForm(observation) {
      lineInput.value = observation.lineName || "";
      tanggalInput.value = obswDateInput(observation.tanggal || observation.obsTanggal || observation.createdAt);
      shiftInput.value = observation.shiftJam || "";
      observerInput.value = observation.observerName || "";
      productInput.value = observation.productType || "";
      taktInput.value = observation.taktTime == null ? "" : String(observation.taktTime);
      processInput.value = observation.processName || "";
      operatorInput.value = observation.operatorName || "";
      rows = (observation.elements || []).map(obswNormRow);
      if (!rows.length) rows = [obswBlankRow()];
      setEditMode(observation);
      renderRows();
      persistDraft();
    }

    function resetForm() {
      lineInput.value = "";
      tanggalInput.value = obswDateInput();
      shiftInput.value = "";
      observerInput.value = "";
      productInput.value = "";
      taktInput.value = "";
      processInput.value = "";
      operatorInput.value = "";
      rows = [obswBlankRow()];
      setEditMode(null);
      renderRows();
    }

    function saveObservation() {
      var currentRows = rows.map(obswNormRow).filter(obswHasRow);
      var data = SWStorage.loadData();

      if (!lineInput.value.trim()) {
        showMessage("Nama line wajib diisi.", true);
        lineInput.focus();
        return;
      }
      if (!processInput.value.trim()) {
        showMessage("Nama proses wajib diisi.", true);
        processInput.focus();
        return;
      }
      if (!currentRows.length) {
        showMessage("Tambahkan minimal 1 elemen kerja.", true);
        return;
      }
      var missingQtyNos = [];
      rows.forEach(function (row, index) {
        if (obswMissingQty(row)) missingQtyNos.push(index + 1);
      });
      if (missingQtyNos.length) {
        showMessage("Qty wajib diisi pada elemen no " + missingQtyNos.join(", ") + ".", true);
        var firstQty = rowsBody.querySelector("tr[data-index='" + (missingQtyNos[0] - 1) + "'] [data-field='qty']");
        if (firstQty) firstQty.focus();
        return;
      }

      var revisionInfo;
      if (editingObservationId) {
        var sourceObservation = (data.observations || []).find(function (item) { return item.id === editingObservationId; });
        if (!sourceObservation) {
          showMessage("Data sumber revisi tidak ditemukan.", true);
          return;
        }
        var revisions = getObservationGroupRevisions(getObservationGroupId(sourceObservation), data.observations || []);
        var nextRevision = revisions.reduce(function (maxValue, item) {
          return Math.max(maxValue, getObservationRevisionNumber(item));
        }, 0) + 1;
        var revisionNote = window.prompt("Catatan Revisi", "");
        if (revisionNote == null) return;
        revisionNote = revisionNote.trim();
        if (!revisionNote) {
          showMessage("Catatan revisi wajib diisi.", true);
          return;
        }
        revisionInfo = {
          groupId: getObservationGroupId(sourceObservation),
          revisionNumber: nextRevision,
          revisionNote: revisionNote,
          revisedFromId: sourceObservation.id
        };
      } else {
        revisionInfo = {
          groupId: "obsgrp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          revisionNumber: 0,
          revisionNote: "Data awal",
          revisedFromId: null
        };
      }

      var timestamp = new Date().toISOString();
      var observation = {
        id: "obs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        groupId: revisionInfo.groupId,
        revisionNumber: revisionInfo.revisionNumber,
        revisionLabel: formatRevisionLabel(revisionInfo.revisionNumber),
        revisionNote: revisionInfo.revisionNote,
        revisedFromId: revisionInfo.revisedFromId,
        isActiveRevision: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        noFormCode: NO_FORM_CODE,
        noForm: NO_FORM_CODE,
        lineName: lineInput.value.trim(),
        tanggal: tanggalInput.value || obswDateInput(),
        obsTanggal: tanggalInput.value || obswDateInput(),
        shiftJam: shiftInput.value.trim(),
        observerName: observerInput.value.trim(),
        productType: productInput.value.trim(),
        taktTime: obswNum(taktInput.value),
        processName: processInput.value.trim(),
        operatorName: operatorInput.value.trim(),
        elements: currentRows.map(obswNormRow)
      };

      SWStorage.updateData(function (nextData) {
        nextData.observations = Array.isArray(nextData.observations) ? nextData.observations : [];
        nextData.observations.forEach(function (item) {
          if (getObservationGroupId(item) === observation.groupId) item.isActiveRevision = false;
        });
        nextData.observations.push(observation);
        nextData.activeObservationId = observation.id;
        nextData.drafts.observasi = null;
        return nextData;
      });

      resetForm();
      clearRouteParams();
      showMessage(revisionInfo.revisionNumber === 0 ? "Observasi disimpan sebagai Revisi 000." : (formatRevisionLabel(revisionInfo.revisionNumber) + " berhasil disimpan dan menjadi data aktif."));
    }

    rowsBody.addEventListener("input", function (event) {
      var input = event.target.closest(".js-obsw-input");
      if (input) updateFromInput(input);
    });
    rowsBody.addEventListener("change", function (event) {
      var input = event.target.closest(".js-obsw-input");
      if (input) updateFromInput(input);
    });
    [lineInput, tanggalInput, shiftInput, observerInput, productInput, taktInput, processInput, operatorInput].forEach(function (input) {
      input.addEventListener("input", persistDraft);
      input.addEventListener("change", persistDraft);
    });

    addBtn.addEventListener("click", function () {
      rows.push(obswBlankRow());
      renderRows();
      persistDraft();
      var nameInput = rowsBody.querySelector("tr:last-child [data-field='name']");
      if (nameInput) nameInput.focus();
    });

    clearDraftBtn.addEventListener("click", function () {
      SWStorage.updateData(function (data) {
        data.drafts.observasi = null;
        return data;
      });
      clearRouteParams();
      resetForm();
      showMessage("Draft observasi dibersihkan.");
    });

    saveBtn.addEventListener("click", saveObservation);

    var downloadFormBtn = byId("downloadObservasiFormBtn");
    var importInput = byId("importObservasiInput");

    if (downloadFormBtn) {
      downloadFormBtn.addEventListener("click", function () {
        SWStorage.downloadXlsxSheets("form-lembar-observasi.xlsx", obswBuildFormSheets());
        showMessage("Form Excel Lembar Observasi diunduh. Isi form lalu klik Import Excel.");
      });
    }

    var downloadLineFormBtn = byId("downloadObservasiLineFormBtn");
    if (downloadLineFormBtn) {
      // Bila Line (dan Tipe Produk) sudah diisi dan datanya ada, form berisi daftar proses & elemen kerja line tersebut.
      downloadLineFormBtn.addEventListener("click", function () {
        var line = lineInput.value.trim();
        var product = productInput.value.trim();
        var prefill = null;
        if (line) {
          var source = yzeFilterObservations(line, product);
          var processObs = buildProcessObservations(source, line);
          prefill = {
            lineName: line,
            productType: product,
            taktTime: taktInput.value.trim() || (getAutoTakt(source) || ""),
            processes: processObs.map(function (obs) {
              return {
                processName: String(obs.processName || "").trim(),
                operatorName: String(obs.operatorName || "").trim(),
                elements: (obs.elements || []).map(function (el) {
                  return { name: el.name || "", category: obswCat(el.category || el.type), qty: Number(el.qty) > 0 ? Number(el.qty) : null, unit: el.unit || "Battery" };
                })
              };
            })
          };
        }
        var safeName = line ? "-" + line.replace(/[^\w\-]+/g, "_") : "";
        SWStorage.downloadXlsxSheets("form-observasi-1-line" + safeName + ".xlsx", obswBuildLineFormSheets(prefill));
        if (prefill && prefill.processes.length) {
          showMessage("Form 1 Line untuk " + line + (product ? " / " + product : "") + " diunduh, berisi " + prefill.processes.length + " proses beserta elemen kerjanya. Tinggal isi sample waktu.");
        } else {
          showMessage("Form 1 Line kosong diunduh. Tips: isi LINE (dan TIPE PRODUK) di lembar ini dulu agar form berisi daftar proses & elemen kerja line tersebut.");
        }
      });
    }

    // ── Pratinjau & simpan import Form 1 Line ──
    var lineImportSection = byId("lineImportSection");
    var lineImportBody = byId("lineImportBody");
    var lineImportAll = byId("lineImportAll");
    var lineImportNoteWrap = byId("lineImportNoteWrap");
    var lineImportNote = byId("lineImportNote");
    var lineImportSaveBtn = byId("lineImportSaveBtn");
    var pendingLineImport = null;

    function sameText(a, b) {
      return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    }

    // Pakai ejaan Line / Tipe Produk yang sudah tersimpan (pencocokan tidak peka huruf besar-kecil),
    // supaya "line 1" tidak jadi line terpisah dari "Line 1".
    function canonicalLineImport(imported) {
      var active = getActiveObservations(SWStorage.loadData());
      var sameLine = active.find(function (obs) { return sameText(obs.lineName, imported.lineName); });
      var sameProduct = active.find(function (obs) { return sameText(obs.lineName, imported.lineName) && sameText(obs.productType, imported.productType); });
      if (sameLine) imported.lineName = String(sameLine.lineName).trim();
      if (sameProduct) imported.productType = String(sameProduct.productType || "").trim();
    }

    function planLineImport(imported) {
      var data = SWStorage.loadData();
      var active = getActiveObservations(data);
      canonicalLineImport(imported);
      return imported.processes.map(function (proc) {
        var existing = active.find(function (obs) {
          return sameText(obs.lineName, imported.lineName) && sameText(obs.processName, proc.processName) && sameText(obs.productType, imported.productType);
        }) || null;
        var nextRevision = 0;
        if (existing) {
          nextRevision = getObservationGroupRevisions(getObservationGroupId(existing), data.observations || []).reduce(function (maxValue, item) {
            return Math.max(maxValue, getObservationRevisionNumber(item));
          }, 0) + 1;
        }
        var totalCt = proc.elements.reduce(function (sum, el) { return sum + (Number(obswStats(el).ct) || 0); }, 0);
        var missingQty = [];
        proc.elements.forEach(function (el, index) { if (obswMissingQty(el)) missingQty.push(index + 1); });
        return { proc: proc, existing: existing, nextRevision: nextRevision, totalCt: totalCt, missingQty: missingQty };
      });
    }

    function selectedLinePlan() {
      if (!pendingLineImport) return [];
      return pendingLineImport.plan.filter(function (item, index) {
        var box = lineImportBody.querySelector("input[data-index='" + index + "']");
        return box && box.checked;
      });
    }

    function updateLineImportControls() {
      var selected = selectedLinePlan();
      var hasRevision = selected.some(function (item) { return item.existing; });
      lineImportNoteWrap.classList.toggle("hidden", !hasRevision);
      lineImportSaveBtn.textContent = "Simpan " + selected.length + " Proses";
      lineImportSaveBtn.disabled = !selected.length || !pendingLineImport.imported.lineName;
      var total = pendingLineImport.plan.filter(function (item) { return !item.missingQty.length; }).length;
      lineImportAll.checked = total > 0 && selected.length === total;
      lineImportAll.indeterminate = selected.length > 0 && selected.length < total;
    }

    function closeLineImport() {
      pendingLineImport = null;
      lineImportSection.classList.add("hidden");
      lineImportBody.innerHTML = "";
    }

    function showLineImport(imported, fileName) {
      if (!imported.processes.length) {
        throw new Error("Tidak ada proses dengan elemen kerja yang terbaca dari " + fileName + ". Pastikan kolom PROSES diisi di baris pertama tiap proses dan kolom ELEMEN KERJA terisi." +
          (imported.warnings.length ? " " + imported.warnings.join(" ") : ""));
      }
      var plan = planLineImport(imported);
      pendingLineImport = { imported: imported, plan: plan, fileName: fileName };

      setText(byId("lineImportTitle"), "Pratinjau Import Form 1 Line — " + fileName);
      byId("lineImportSummary").innerHTML = [
        ["Line", imported.lineName],
        ["Tipe Produk", imported.productType],
        ["Tanggal", obswDateLabel(imported.tanggal)],
        ["Takt Time", imported.taktTime ? imported.taktTime + " detik" : ""],
        ["Shift / Jam", imported.shiftJam],
        ["Observer", imported.observerName]
      ].map(function (item) {
        return "<div class='obs-revision-summary-item'><span>" + item[0] + "</span><strong>" + sanitize(item[1] || "-") + "</strong></div>";
      }).join("");

      var warnings = imported.warnings.slice();
      var blocked = plan.filter(function (item) { return item.missingQty.length; });
      if (blocked.length) {
        warnings.unshift(blocked.length + " proses belum lengkap QTY-nya sehingga tidak bisa disimpan: " +
          blocked.map(function (item) { return item.proc.processName; }).join(", ") + ". Lengkapi QTY di file Excel lalu import ulang.");
      }
      if (!imported.lineName) warnings.unshift("LINE di form masih kosong. Isi LINE di file Excel lalu import ulang.");
      var warnEl = byId("lineImportWarn");
      warnEl.innerHTML = warnings.map(sanitize).join("<br>");
      warnEl.classList.toggle("hidden", !warnings.length);

      lineImportBody.innerHTML = plan.map(function (item, index) {
        var blockedRow = item.missingQty.length > 0;
        var status = blockedRow
          ? "<span class='status-badge line-import-blocked'>QTY kosong: elemen no " + item.missingQty.join(", ") + "</span>"
          : item.existing
            ? "<span class='status-badge warning'>Revisi baru → " + sanitize(formatRevisionLabel(item.nextRevision)) + "</span>"
            : "<span class='status-badge active'>Baru → " + sanitize(formatRevisionLabel(0)) + "</span>";
        if (!blockedRow && item.proc.noSample) status = "<span class='status-badge normal'>Belum ada sample</span> " + status;
        var checkedAttr = blockedRow ? " disabled" : (item.proc.noSample ? "" : " checked");
        return "<tr" + (blockedRow ? " class='line-import-row-blocked'" : "") + "><td class='line-import-check'><input type='checkbox' data-index='" + index + "'" + checkedAttr + " aria-label='Simpan " + sanitize(item.proc.processName) + "'></td>" +
          "<td>" + (index + 1) + "</td><td>" + sanitize(item.proc.processName) + "</td><td>" + sanitize(item.proc.operatorName || "-") + "</td>" +
          "<td>" + item.proc.elements.length + "</td><td>" + (blockedRow ? "-" : sanitize(obswFmt(item.totalCt, 2))) + "</td><td>" + status + "</td></tr>";
      }).join("");

      lineImportNote.value = "Update dari import Form 1 Line (" + fileName + ")";
      lineImportSection.classList.remove("hidden");
      updateLineImportControls();
      lineImportSection.scrollIntoView({ behavior: "smooth", block: "start" });
      showMessage(plan.length + " proses terbaca dari " + fileName + ". Periksa pratinjau lalu klik Simpan.", !imported.lineName);
    }

    lineImportBody.addEventListener("change", updateLineImportControls);
    lineImportAll.addEventListener("change", function () {
      lineImportBody.querySelectorAll("input[type='checkbox']:not(:disabled)").forEach(function (box) { box.checked = lineImportAll.checked; });
      updateLineImportControls();
    });
    byId("lineImportCancelBtn").addEventListener("click", function () {
      closeLineImport();
      showMessage("Import Form 1 Line dibatalkan.");
    });

    lineImportSaveBtn.addEventListener("click", function () {
      if (!pendingLineImport) return;
      var imported = pendingLineImport.imported;
      var selected = selectedLinePlan();
      if (!imported.lineName) return showMessage("LINE di form masih kosong.", true);
      if (!selected.length) return showMessage("Pilih minimal 1 proses untuk disimpan.", true);
      var revisionNote = lineImportNote.value.trim();
      if (selected.some(function (item) { return item.existing; }) && !revisionNote) {
        lineImportNote.focus();
        return showMessage("Catatan revisi wajib diisi untuk proses yang sudah ada.", true);
      }

      var timestamp = new Date().toISOString();
      var tanggal = imported.tanggal || obswDateInput();
      var created = selected.map(function (item, index) {
        var existing = item.existing;
        var uid = Date.now() + "_" + index + "_" + Math.random().toString(36).slice(2, 8);
        var revisionNumber = existing ? item.nextRevision : 0;
        return {
          id: "obs_" + uid,
          groupId: existing ? getObservationGroupId(existing) : "obsgrp_" + uid,
          revisionNumber: revisionNumber,
          revisionLabel: formatRevisionLabel(revisionNumber),
          revisionNote: existing ? revisionNote : "Data awal",
          revisedFromId: existing ? existing.id : null,
          isActiveRevision: true,
          source: "import-form-1-line",
          createdAt: timestamp,
          updatedAt: timestamp,
          noFormCode: NO_FORM_CODE,
          noForm: NO_FORM_CODE,
          lineName: imported.lineName,
          tanggal: tanggal,
          obsTanggal: tanggal,
          shiftJam: imported.shiftJam,
          observerName: imported.observerName,
          productType: imported.productType,
          taktTime: obswNum(imported.taktTime),
          processName: existing ? String(existing.processName).trim() : item.proc.processName,
          operatorName: item.proc.operatorName,
          elements: item.proc.elements.map(obswNormRow)
        };
      });

      SWStorage.updateData(function (data) {
        data.observations = Array.isArray(data.observations) ? data.observations : [];
        created.forEach(function (observation) {
          data.observations.forEach(function (obs) {
            if (getObservationGroupId(obs) === observation.groupId) obs.isActiveRevision = false;
          });
          data.observations.push(observation);
        });
        // Urutan proses di form menjadi urutan proses line (proses lain tetap di belakang).
        data.settings.processOrders = data.settings.processOrders || {};
        var formOrder = pendingLineImport.plan.map(function (item) { return item.existing ? String(item.existing.processName).trim() : item.proc.processName; });
        var oldOrder = Array.isArray(data.settings.processOrders[imported.lineName]) ? data.settings.processOrders[imported.lineName] : [];
        data.settings.processOrders[imported.lineName] = formOrder.concat(oldOrder.filter(function (name) { return formOrder.indexOf(name) < 0; }));
        data.activeObservationId = created[0].id;
        return data;
      });

      var revised = selected.filter(function (item) { return item.existing; }).length;
      closeLineImport();
      showMessage(created.length + " proses line " + imported.lineName + " disimpan (" + (created.length - revised) + " baru, " + revised + " revisi). Lihat di menu Data Observasi.");
    });

    if (importInput) {
      importInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        SWStorage.readXlsxRows(file)
          .then(function (sheetRows) {
            var imported = obswParseImportRows(sheetRows);
            if (imported.kind === "line") {
              showLineImport(imported, file.name);
              return;
            }
            if (!imported.elements.length) {
              throw new Error("Tidak ada elemen kerja yang terbaca dari " + file.name + ".");
            }
            var hasContent = rows.some(obswHasRow) || lineInput.value.trim() || processInput.value.trim();
            if (hasContent && !window.confirm("Isi Lembar Observasi saat ini akan diganti dengan data dari " + file.name + ". Lanjutkan?")) {
              return;
            }
            lineInput.value = imported.lineName;
            processInput.value = imported.processName;
            productInput.value = imported.productType;
            taktInput.value = imported.taktTime;
            tanggalInput.value = imported.tanggal || obswDateInput();
            shiftInput.value = imported.shiftJam;
            observerInput.value = imported.observerName;
            operatorInput.value = imported.operatorName;
            rows = imported.elements;
            renderRows();
            persistDraft();
            var missing = [];
            if (!imported.lineName) missing.push("Line");
            if (!imported.processName) missing.push("Proses");
            var qtyRows = [];
            rows.forEach(function (row, index) { if (obswMissingQty(row)) qtyRows.push(index + 1); });
            if (qtyRows.length) missing.push("Qty elemen no " + qtyRows.join(", "));
            showMessage(
              "Import berhasil: " + imported.elements.length + " elemen kerja dari " + file.name + ". " +
              (missing.length ? "Lengkapi " + missing.join(" dan ") + ", lalu " : "Periksa data, lalu ") +
              "klik " + saveBtn.textContent + ".",
              missing.length > 0
            );
          })
          .catch(function (err) {
            showMessage(err.message, true);
          })
          .finally(function () {
            importInput.value = "";
          });
      });
    }

    if (noFormValueEl) noFormValueEl.textContent = NO_FORM_CODE;
    var editId = getRouteParam("edit");
    var draft = SWStorage.loadData().drafts && SWStorage.loadData().drafts.observasi ? SWStorage.loadData().drafts.observasi : null;
    if (editId) {
      var editObservation = (SWStorage.loadData().observations || []).find(function (item) { return item.id === editId; });
      if (editObservation) {
        loadObservationToForm(editObservation);
      } else {
        resetForm();
        showMessage("Data observasi untuk revisi tidak ditemukan.", true);
      }
    } else if (draft) {
      lineInput.value = draft.lineName || "";
      tanggalInput.value = obswDateInput(draft.tanggal || draft.obsTanggal);
      shiftInput.value = draft.shiftJam || "";
      observerInput.value = draft.observerName || "";
      productInput.value = draft.productType || "";
      taktInput.value = draft.taktTime || "";
      processInput.value = draft.processName || "";
      operatorInput.value = draft.operatorName || "";
      rows = (draft.rows || []).map(obswNormRow);
      if (!rows.length) rows = [obswBlankRow()];
      renderRows();
    } else {
      resetForm();
    }
    if (!editId) {
      setEditMode(null);
    }
  }

  function obswDummySet(noFormCode) {
    var processNames = ["Loading Plate Cutting", "Mesin Plate Cutting", "Unloading Plate Cutting", "Loading Envelope", "Mesin Envelope", "Unloading Envelope", "Mearing 1", "Mearing 2", "Mearing 3", "Loading COS", "Mesin COS", "Unloading COS", "Manual Adjusting Connector PW", "Auto Adjusting Connector PW", "Mesin Polarity Test 1", "Mesin Short Test 1", "Mesin PW 1", "Mesin PW 2", "Mesin PW 3", "Mesin Polarity Test 2", "Mesin Short Test 2", "Manual Cover", "Auto Cover", "Mesin HSM", "Mesin APB", "Mesin ALT", "Mesin Date Code", "Mesin Brushing", "Mesin Oiling", "Mesin Dry Sealing", "Packing", "Palletizing"];
    var shifts = ["Shift 1 / 07:00-15:00", "Shift 2 / 15:00-23:00", "Shift 3 / 23:00-07:00"];
    var products = ["NS40ZZ", "NS60LS", "N70", "DIN55"];
    var result = [];

    function samples(base) {
      return [base, base + 1, base, base - 1, base, base + 1, base, base - 1, base, base + 1].map(function (value) {
        return Math.max(1, value);
      });
    }

    function element(name, category, base, note) {
      return obswNormRow({ name: name, category: category, samples: samples(base), qty: 1, unit: "Battery", note: note || "" });
    }

    for (var lineIndex = 1; lineIndex <= 7; lineIndex += 1) {
      processNames.forEach(function (processName, processIndex) {
        var machineOnly = /^(mesin|auto|palletizing)\b/i.test(processName);
        var seed = lineIndex + processIndex;
        var elements = machineOnly ? [
          element("Setup " + processName, "Machine", 16 + (seed % 4), "Setup mesin"),
          element("Siklus " + processName, "Machine", 21 + (seed % 6), "Cycle mesin"),
          element("Monitoring " + processName, "Machine", 6 + (seed % 3), "Monitoring")
        ] : [
          element("Ambil material " + processName, "Value", 3 + (seed % 3), ""),
          element("Posisikan unit " + processName, "Non Value", 2 + (seed % 2), ""),
          element("Jalan proses " + processName, "Walking", 1 + (seed % 2), ""),
          element("Penyesuaian " + processName, "Irregular", 1 + (seed % 2), "Tambahan")
        ];
        var date = new Date();
        date.setDate(date.getDate() - (7 - lineIndex));
        date.setHours(7 + (processIndex % 6), 10, 0, 0);
        var timestamp = date.toISOString();
        var dateOnly = timestamp.slice(0, 10);
        result.push({
          id: "obs_dummy_" + lineIndex + "_" + processIndex,
          groupId: "dummy_group_" + lineIndex + "_" + processIndex,
          revisionNumber: 0,
          revisionLabel: formatRevisionLabel(0),
          revisionNote: "Data awal",
          isActiveRevision: true,
          source: "dummy-observasi-v1",
          createdAt: timestamp,
          updatedAt: timestamp,
          noFormCode: noFormCode,
          noForm: noFormCode,
          lineName: "Line " + lineIndex,
          tanggal: dateOnly,
          obsTanggal: dateOnly,
          shiftJam: shifts[processIndex % shifts.length],
          observerName: "Observer " + lineIndex,
          productType: products[(lineIndex + processIndex) % products.length],
          taktTime: 38 + lineIndex + ((processIndex % 4) * 0.5),
          processName: processName,
          operatorName: "Operator " + ((processIndex % 5) + 1),
          elements: elements
        });
      });
    }

    return result;
  }

  function obswExportXlsx(observation, noFormCode) {
    var rows = [
      ["Lembar Observasi"],
      ["No Form", observation.noFormCode || observation.noForm || noFormCode || "Form-ISD-ISD-001"],
      ["Line", observation.lineName || ""],
      ["Proses", observation.processName || ""],
      ["Tanggal Observasi", obswDateLabel(observation.tanggal || observation.obsTanggal || observation.createdAt)],
      ["Tanggal Revisi", formatDate(observation.createdAt)],
      ["Shift / Jam", observation.shiftJam || ""],
      ["Type Produk", observation.productType || ""],
      ["Observer", observation.observerName || ""],
      ["Operator", observation.operatorName || ""],
      ["Takt Time", observation.taktTime || ""],
      ["Revisi", getObservationRevisionLabel(observation)],
      ["Catatan Revisi", getObservationRevisionNote(observation)],
      [],
      ["NO", "Elemen Kerja", "Kategori", "Sample 1", "Sample 2", "Sample 3", "Sample 4", "Sample 5", "Sample 6", "Sample 7", "Sample 8", "Sample 9", "Sample 10", "Modus", "Min", "Max", "Qty", "Unit", "CT (sec/batt)", "Note"]
    ];
    (observation.elements || []).map(obswNormRow).forEach(function (row, index) {
      var stats = obswStats(row);
      rows.push([index + 1, row.name, row.category, stats.samples[0], stats.samples[1], stats.samples[2], stats.samples[3], stats.samples[4], stats.samples[5], stats.samples[6], stats.samples[7], stats.samples[8], stats.samples[9], stats.mode, stats.min, stats.max, stats.qty, row.unit, Number(obswFmt(stats.ct, 2)), row.note]);
    });
    SWStorage.downloadXlsx("observasi-detail-" + String(observation.processName || "data").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".xlsx", rows, "Observasi");
  }

  // Data Observasi bertingkat (tiap tingkat punya alamat sendiri, tombol Back browser ikut berfungsi):
  //   #data-observasi                                → daftar Line
  //   #data-observasi?line=L                         → Type Produk pada line L
  //   #data-observasi?line=L&product=P               → daftar proses line L / type produk P
  //   #data-observasi?line=L&product=P&obs=ID        → lembar observasi (detail + riwayat revisi)
  function initDataObservasiPage() {
    var browseSection = byId("doBrowseSection");
    var browseTitle = byId("doBrowseTitle");
    var browseHint = byId("doBrowseHint");
    var browseHead = byId("doBrowseHead");
    var browseBody = byId("doBrowseBody");
    var breadcrumb = byId("doBreadcrumb");
    var backBtn = byId("doBackBtn");
    var savedDetailSection = byId("savedDetailSection");
    var savedDetailTitle = byId("savedDetailTitle");
    var savedDetailRows = byId("savedDetailRows");
    var savedDetailTotalRow = byId("savedDetailTotalRow");
    var revisionHistoryBody = byId("revisionHistoryBody");
    var generateDummyBtn = byId("generateDummyObservasiBtn");
    var detailBackBtn = byId("detailBackBtn");
    var detailPrintBtn = byId("detailPrintBtn");
    var detailCreateRevisionBtn = byId("detailCreateRevisionBtn");
    var detailExportXlsxBtn = byId("detailExportXlsxBtn");
    var NO_FORM_CODE = "Form-ISD-ISD-001";
    var NO_LINE = "Tanpa Line";
    var selectedId = "";

    if (!browseBody || !savedDetailRows) return;

    var dataExportBtn   = byId("dataExportBtn");
    var dataImportInput = byId("dataImportInput");

    if (dataExportBtn) {
      dataExportBtn.addEventListener("click", function () {
        SWStorage.exportDataXlsx();
        showMessage("Data berhasil diekspor ke Excel.");
      });
    }

    if (dataImportInput) {
      dataImportInput.addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        SWStorage.importDataXlsx(file)
          .then(function (result) {
            var info = result || {};
            var warnings = info.warnings || [];
            renderRoute();
            showMessage(
              (info.mode === "backup"
                ? "Backup data dipulihkan: " + info.imported + " data observasi."
                : "Import berhasil: " + info.imported + " data observasi (proses) ditambahkan.") +
              (warnings.length ? " Perhatian: " + warnings.join(" ") : ""),
              warnings.length > 0
            );
          })
          .catch(function (err) { showMessage(err.message, true); })
          .finally(function () { dataImportInput.value = ""; });
      });
    }

    // ── Helper data & navigasi ──
    function active(data) { return getActiveObservations(data || SWStorage.loadData()); }
    function setDetailField(id, value) { setText(byId(id), value); }
    function lineOf(obs) { return String(obs.lineName || "").trim() || NO_LINE; }
    function productOf(obs) { return String(obs.productType || "").trim(); }
    function productLabel(product) { return product || "(Tanpa Type Produk)"; }
    function latestOf(list) {
      return list.reduce(function (current, item) {
        return !current || new Date(item.createdAt || 0).getTime() > new Date(current.createdAt || 0).getTime() ? item : current;
      }, null);
    }

    function currentLevel() {
      var params = parseRoute().params;
      return {
        line: params.has("line") ? params.get("line") : null,
        product: params.has("product") ? params.get("product") : null,
        obs: params.get("obs") || ""
      };
    }

    function hrefFor(line, product, obsId) {
      var params = {};
      if (line != null) params.line = line;
      if (line != null && product != null) params.product = product;
      if (obsId) params.obs = obsId;
      var query = new URLSearchParams(params).toString();
      return "#data-observasi" + (query ? "?" + query : "");
    }

    function go(line, product, obsId) {
      var href = hrefFor(line, product, obsId);
      if (window.location.hash === href) renderLevel();
      else window.location.hash = href;
    }

    function parentOf(level) {
      if (level.obs) return { line: level.line, product: level.product };
      if (level.product != null) return { line: level.line, product: null };
      return { line: null, product: null };
    }

    function renderBreadcrumb(level, processName) {
      var parts = [{ label: "Data Observasi", href: hrefFor(null) }];
      if (level.line != null) parts.push({ label: level.line, href: hrefFor(level.line) });
      if (level.line != null && level.product != null) parts.push({ label: productLabel(level.product), href: hrefFor(level.line, level.product) });
      if (processName) parts.push({ label: processName, href: "" });
      breadcrumb.innerHTML = parts.map(function (part, index) {
        var last = index === parts.length - 1;
        return last
          ? "<span class='do-crumb-current' aria-current='page'>" + sanitize(part.label) + "</span>"
          : "<a href='" + sanitize(part.href) + "'>" + sanitize(part.label) + "</a><span class='do-crumb-sep' aria-hidden='true'>›</span>";
      }).join("");
    }

    function setBrowse(title, hint, headCells, rowsHtml, emptyText) {
      browseSection.classList.remove("hidden");
      savedDetailSection.classList.add("hidden");
      setText(browseTitle, title);
      browseHint.textContent = hint || "";
      browseHead.innerHTML = "<tr>" + headCells.map(function (cell) { return "<th>" + cell + "</th>"; }).join("") + "</tr>";
      browseBody.innerHTML = rowsHtml || "<tr><td colspan='" + headCells.length + "' class='placeholder'>" + sanitize(emptyText) + "</td></tr>";
    }

    // ── Tingkat 1: daftar Line ──
    function renderLines(data) {
      var groups = {};
      active(data).forEach(function (obs) {
        var line = lineOf(obs);
        (groups[line] = groups[line] || []).push(obs);
      });
      var rows = obswLineSort(Object.keys(groups)).map(function (line) {
        var list = groups[line];
        var products = {};
        list.forEach(function (obs) { products[productOf(obs)] = true; });
        var latest = latestOf(list);
        return "<tr class='do-row' data-href='" + sanitize(hrefFor(line)) + "'>" +
          "<td><a class='do-link' href='" + sanitize(hrefFor(line)) + "'>" + sanitize(line) + "</a></td>" +
          "<td>" + Object.keys(products).length + " type produk</td>" +
          "<td>" + list.length + " proses</td>" +
          "<td>" + sanitize(formatDate(latest && latest.createdAt)) + "</td>" +
          "<td><a class='btn' href='" + sanitize(hrefFor(line)) + "'>Buka</a></td></tr>";
      }).join("");
      setBrowse("Data Observasi Tersimpan", "Pilih line untuk melihat type produk yang sudah diinput.",
        ["Line", "Type Produk", "Jumlah Proses", "Revisi Aktif Terakhir", "Aksi"], rows, "Belum ada data observasi.");
    }

    // ── Tingkat 2: Type Produk pada line ──
    function renderProducts(data, line) {
      var groups = {};
      active(data).forEach(function (obs) {
        if (lineOf(obs) !== line) return;
        var product = productOf(obs);
        (groups[product] = groups[product] || []).push(obs);
      });
      var products = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, "id"); });
      var rows = products.map(function (product) {
        var list = groups[product];
        var latest = latestOf(list);
        var takt = getAutoTakt(list);
        return "<tr class='do-row' data-href='" + sanitize(hrefFor(line, product)) + "'>" +
          "<td><a class='do-link' href='" + sanitize(hrefFor(line, product)) + "'>" + sanitize(productLabel(product)) + "</a></td>" +
          "<td>" + list.length + " proses</td>" +
          "<td>" + (takt ? sanitize(obswFmt(takt, 2)) + " detik" : "-") + "</td>" +
          "<td>" + sanitize(formatDate(latest && latest.createdAt)) + "</td>" +
          "<td><a class='btn' href='" + sanitize(hrefFor(line, product)) + "'>Buka</a></td></tr>";
      }).join("");
      setBrowse("Line " === line.slice(0, 5) ? line : "Line: " + line,
        products.length ? "Pilih type produk untuk melihat semua prosesnya." : "",
        ["Type Produk", "Jumlah Proses", "Takt Time", "Revisi Aktif Terakhir", "Aksi"], rows,
        "Belum ada data observasi untuk line ini.");
    }

    // ── Tingkat 3: daftar proses line + type produk ──
    function processesFor(data, line, product) {
      return sortObservationsByProcessOrder(line, active(data).filter(function (obs) {
        return lineOf(obs) === line && productOf(obs) === product;
      }), data);
    }

    function renderProcesses(data, line, product) {
      var list = processesFor(data, line, product);
      var rows = list.map(function (obs, index) {
        var href = hrefFor(line, product, obs.id);
        var processName = String(obs.processName || "").trim() || "Tanpa Nama Proses";
        return "<tr class='do-row' data-href='" + sanitize(href) + "'>" +
          "<td>" + (index + 1) + "</td>" +
          "<td><a class='do-link' href='" + sanitize(href) + "'>" + sanitize(processName) + "</a></td>" +
          "<td>" + sanitize(obs.operatorName || "-") + "</td>" +
          "<td>" + sanitize(obswFmt(cycleTime(obs), 2)) + "</td>" +
          "<td>" + sanitize(formatDate(obs.createdAt)) + "</td>" +
          "<td>" + sanitize(getObservationRevisionLabel(obs)) + "</td>" +
          "<td>" + sanitize(getObservationRevisionNote(obs)) + "</td>" +
          "<td class='obs-action-group'>" +
          "<a class='btn' href='" + sanitize(href) + "'>Lembar Observasi</a>" +
          "<button type='button' class='btn ghost js-edit-observation' data-id='" + sanitize(obs.id) + "'>Buat Revisi</button>" +
          "<button type='button' class='btn ghost js-set-active' data-id='" + sanitize(obs.id) + "'>" + (data.activeObservationId === obs.id ? "Dipakai" : "Pakai") + "</button></td>" +
          "<td><div class='obs-order-nav'>" +
          "<button type='button' class='btn js-order-process' data-index='" + index + "' data-direction='up'" + (index === 0 ? " disabled" : "") + " aria-label='Naikkan urutan'>&uarr;</button>" +
          "<button type='button' class='btn js-order-process' data-index='" + index + "' data-direction='down'" + (index === list.length - 1 ? " disabled" : "") + " aria-label='Turunkan urutan'>&darr;</button>" +
          "</div></td></tr>";
      }).join("");
      setBrowse(line + " / " + productLabel(product),
        list.length ? "Klik proses untuk membuka lembar observasinya." : "",
        ["No", "Proses", "Operator", "Cycle Time", "Tanggal Revisi", "Revisi", "Catatan Revisi", "Aksi", "Urutan"], rows,
        "Belum ada proses aktif untuk type produk ini.");
    }

    // ── Tingkat 4: lembar observasi ──
    function renderDetail(observation) {
      var detail = obswDetail(observation);
      savedDetailRows.innerHTML = detail.bodyHtml;
      savedDetailTotalRow.innerHTML = detail.footerHtml;
    }

    function renderHistory(observation, allObservations) {
      if (!revisionHistoryBody) return;
      var revisions = getObservationGroupRevisions(getObservationGroupId(observation), allObservations);
      revisionHistoryBody.innerHTML = revisions.length ? revisions.map(function (item) {
        var isCurrent = isObservationActiveRevision(item, allObservations);
        var isShown = item.id === observation.id;
        return "<tr" + (isShown ? " class='do-history-current'" : "") + "><td>" + sanitize(getObservationRevisionLabel(item)) + "</td><td>" + sanitize(formatDate(item.createdAt)) + "</td><td><span class='status-badge " + (isCurrent ? "active" : "normal") + "'>" + (isCurrent ? "Aktif" : "Riwayat") + "</span></td><td>" + sanitize(item.observerName || "-") + "</td><td>" + sanitize(getObservationRevisionNote(item)) + "</td><td class='obs-action-group'>" +
          (isShown ? "<span class='do-history-shown'>Sedang dilihat</span>" : "<button type='button' class='btn ghost js-history-view' data-id='" + sanitize(item.id) + "'>Lihat</button>") +
          "<button type='button' class='btn ghost js-history-revise' data-id='" + sanitize(item.id) + "'>Buat Revisi</button></td></tr>";
      }).join("") : '<tr><td colspan="6" class="placeholder">Belum ada riwayat revisi.</td></tr>';
    }

    function renderObservation(data, level) {
      var observation = (data.observations || []).find(function (item) { return item.id === level.obs; });
      if (!observation) {
        renderProcesses(data, level.line, level.product);
        renderBreadcrumb(level);
        showMessage("Lembar observasi tidak ditemukan (mungkin sudah dihapus). Pilih proses lain.", true);
        return;
      }
      // Breadcrumb & tombol Kembali mengikuti Line / Type Produk milik observasi itu sendiri
      // (alamat bisa tidak cocok, mis. revisi yang mengganti type produk).
      if (lineOf(observation) !== level.line || productOf(observation) !== level.product) {
        level = { line: lineOf(observation), product: productOf(observation), obs: observation.id };
        replaceRouteParams({ line: level.line, product: level.product, obs: level.obs });
      }
      selectedId = observation.id;
      browseSection.classList.add("hidden");
      savedDetailSection.classList.remove("hidden");
      setText(savedDetailTitle, "Lembar Observasi: " + (observation.processName || "-") + " / " + getObservationRevisionLabel(observation));
      setDetailField("detailNoForm", observation.noFormCode || observation.noForm || NO_FORM_CODE);
      setDetailField("detailLine", observation.lineName);
      setDetailField("detailTanggal", obswDateLabel(observation.tanggal || observation.obsTanggal || observation.createdAt));
      setDetailField("detailProses", observation.processName);
      setDetailField("detailShift", observation.shiftJam);
      setDetailField("detailProduct", observation.productType);
      setDetailField("detailObserver", observation.observerName);
      setDetailField("detailOperator", observation.operatorName);
      setDetailField("detailTakt", obswFmt(observation.taktTime, 2));
      setDetailField("detailRevisionLabel", getObservationRevisionLabel(observation));
      setDetailField("detailRevisionStatus", isObservationActiveRevision(observation, data.observations || []) ? "Aktif" : "Riwayat");
      setDetailField("detailRevisionNote", getObservationRevisionNote(observation));
      renderDetail(observation);
      renderHistory(observation, data.observations || []);
      renderBreadcrumb(level, String(observation.processName || "").trim() || "Tanpa Nama Proses");
    }

    function renderLevel() {
      var data = SWStorage.loadData();
      var level = currentLevel();
      selectedId = "";
      var isTop = level.line == null;
      document.querySelectorAll(".do-top-only").forEach(function (el) { el.classList.toggle("hidden", !isTop); });
      backBtn.classList.toggle("hidden", isTop);

      if (level.obs && level.line != null && level.product != null) return renderObservation(data, level);
      if (level.line != null && level.product != null) renderProcesses(data, level.line, level.product);
      else if (level.line != null) renderProducts(data, level.line);
      else renderLines(data);
      renderBreadcrumb(level);
    }

    // ── Event ──
    function goParent() {
      var parent = parentOf(currentLevel());
      go(parent.line, parent.product);
    }
    backBtn.addEventListener("click", goParent);
    if (detailBackBtn) detailBackBtn.addEventListener("click", goParent);

    browseBody.addEventListener("click", function (event) {
      var level = currentLevel();
      var reviseBtn = event.target.closest(".js-edit-observation");
      if (reviseBtn) return void (window.location.href = getObservationEditHref(reviseBtn.getAttribute("data-id")));
      var activeBtn = event.target.closest(".js-set-active");
      if (activeBtn) {
        setActiveObservation(activeBtn.getAttribute("data-id"));
        renderLevel();
        showMessage("Data aktif referensi berhasil dipilih.");
        return;
      }
      var orderBtn = event.target.closest(".js-order-process");
      if (orderBtn) {
        // Tukar dengan proses tetangga yang terlihat di daftar (sudah difilter per type produk).
        var data = SWStorage.loadData();
        var list = processesFor(data, level.line, level.product);
        var index = Number(orderBtn.getAttribute("data-index"));
        var target = orderBtn.getAttribute("data-direction") === "up" ? index - 1 : index + 1;
        if (list[index] && list[target]) {
          swapLineProcessOrder(level.line, list[index].processName, list[target].processName);
          renderLevel();
          showMessage("Urutan proses diperbarui.");
        }
        return;
      }
      // Klik di mana saja pada baris = buka tingkat berikutnya.
      if (event.target.closest("a, button, input, select")) return;
      var row = event.target.closest(".do-row");
      if (row) window.location.hash = row.getAttribute("data-href");
    });

    if (revisionHistoryBody) {
      revisionHistoryBody.addEventListener("click", function (event) {
        var level = currentLevel();
        var viewBtn = event.target.closest(".js-history-view");
        if (viewBtn) return go(level.line, level.product, viewBtn.getAttribute("data-id"));
        var reviseBtn = event.target.closest(".js-history-revise");
        if (reviseBtn) window.location.href = getObservationEditHref(reviseBtn.getAttribute("data-id"));
      });
    }
    if (detailPrintBtn) detailPrintBtn.addEventListener("click", function () {
      if (!selectedId) return showMessage("Pilih lembar observasi dulu.", true);
      window.print();
    });
    if (detailCreateRevisionBtn) detailCreateRevisionBtn.addEventListener("click", function () {
      if (!selectedId) return showMessage("Pilih lembar observasi dulu.", true);
      window.location.href = getObservationEditHref(selectedId);
    });
    if (detailExportXlsxBtn) detailExportXlsxBtn.addEventListener("click", function () {
      var observation = (SWStorage.loadData().observations || []).find(function (item) { return item.id === selectedId; });
      if (!observation) return showMessage("Pilih lembar observasi dulu.", true);
      obswExportXlsx(observation, NO_FORM_CODE);
      showMessage("Lembar observasi diexport ke Excel (.xlsx).");
    });

    var clearAllBtn = byId("clearAllDataBtn");
    if (clearAllBtn) clearAllBtn.addEventListener("click", function () {
      var current = SWStorage.loadData();
      var total = (current.observations || []).length;
      var answer = window.prompt(
        "Semua data akan dihapus: " + total + " data observasi (termasuk riwayat revisi), layout TSK, skenario Edit Yamazumi, urutan proses, dan draft lembar observasi.\n\n" +
        "File backup (.json) akan diunduh dulu sebelum data dihapus.\n\n" +
        "Ketik HAPUS untuk melanjutkan:",
        ""
      );
      if (answer == null) return;
      if (String(answer).trim().toUpperCase() !== "HAPUS") {
        showMessage("Penghapusan dibatalkan. Ketik HAPUS (huruf besar/kecil bebas) untuk menghapus semua data.", true);
        return;
      }
      if (total) {
        SWStorage.exportJson("backup-standardized-work-" + new Date().toISOString().slice(0, 10) + ".json");
      }
      SWStorage.clearAllData();
      go(null);
      showMessage("Semua data sudah dihapus" + (total ? " (" + total + " data observasi, backup .json sudah diunduh)" : "") + ". Portal siap diisi data real dari awal.");
    });

    if (generateDummyBtn) generateDummyBtn.addEventListener("click", function () {
      var dummySet = obswDummySet(NO_FORM_CODE);
      SWStorage.updateData(function (data) {
        data.observations = (data.observations || []).filter(function (item) { return item.source !== "dummy-observasi-v1"; }).concat(dummySet);
        data.activeObservationId = dummySet.length ? dummySet[0].id : null;
        data.drafts.observasi = null;
        return data;
      });
      go(null);
      showMessage("Data dummy 7 line berhasil dibuat.");
    });

    renderLevel();
  }
})();

// ── Modus info click-tooltip (global, shared semua halaman) ──
(function () {
  var CONTENT =
    '<strong>Pemilihan Modus</strong><br><br>' +
    '&bull; Ada nilai berulang &rarr; nilai paling sering muncul<br>' +
    '&bull; Semua nilai unik &rarr; nilai ke-2 terkecil<br>' +
    '&bull; Nilai 0 tidak pernah dipilih sebagai hasil<br>' +
    '&bull; Jika 0 lebih banyak dari nilai lain &rarr; dianggap hanya ada 1 nol';
  var tip = null;
  function getTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'modusTooltip';
      tip.innerHTML = CONTENT;
      document.body.appendChild(tip);
    }
    return tip;
  }
  document.addEventListener('click', function (e) {
    var el = e.target;
    var isIcon = el.classList && el.classList.contains('modus-info');
    var t = getTip();
    if (isIcon) {
      // Posisi dari px layar diubah ke px CSS sesuai skala tampilan (CSS zoom).
      var r = el.getBoundingClientRect();
      var z = SWCharts.cssZoom(document.body);
      t.style.left = Math.min(r.left, window.innerWidth - 330 * z) / z + 'px';
      t.style.top  = (r.bottom + 6) / z + 'px';
      t.style.display = t.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    } else {
      t.style.display = 'none';
    }
  });
}());

