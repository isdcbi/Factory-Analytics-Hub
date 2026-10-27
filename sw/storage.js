(function () {
  "use strict";

  var STORAGE_KEY = "standardized_work_app_v1";
  // Struktur data utama aplikasi yang selalu kita jaga.
  var DEFAULT_DATA = {
    observations: [],
    activeObservationId: null,
    drafts: {
      observasi: null
    },
    tskLayouts: {},
    manPowerMap: {},
    // Skenario line balancing dari halaman Edit Yamazumi, key: "<line>||<type produk>".
    yamazumiScenarios: {},
    // Isian manual TSKP (M/C number, tools, waktu kerja/shift, revisi), key: "<line>||<type produk>".
    tskpSheets: {},
    settings: {
      taktTime: 60,
      processOrders: {}
    },
    meta: {
      updatedAt: null
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function withDefaults(data) {
    // Gabungkan data lama dengan default supaya aman saat ada field baru.
    var base = clone(DEFAULT_DATA);
    if (!data || typeof data !== "object") {
      return base;
    }

    return {
      observations: Array.isArray(data.observations) ? data.observations : base.observations,
      activeObservationId: data.activeObservationId || null,
      drafts: Object.assign({}, base.drafts, data.drafts || {}),
      tskLayouts: Object.assign({}, base.tskLayouts, data.tskLayouts || {}),
      manPowerMap: Object.assign({}, base.manPowerMap, data.manPowerMap || {}),
      yamazumiScenarios: Object.assign({}, base.yamazumiScenarios, data.yamazumiScenarios || {}),
      tskpSheets: Object.assign({}, base.tskpSheets, data.tskpSheets || {}),
      settings: Object.assign({}, base.settings, data.settings || {}),
      meta: Object.assign({}, base.meta, data.meta || {})
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return clone(DEFAULT_DATA);
      }
      return withDefaults(JSON.parse(raw));
    } catch (error) {
      console.error("Gagal membaca localStorage:", error);
      return clone(DEFAULT_DATA);
    }
  }

  function saveData(data) {
    var finalData = withDefaults(data);
    finalData.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
    scheduleServerSave();
    return finalData;
  }

  function updateData(mutator) {
    var current = loadData();
    var working = clone(current);
    var maybeNext = mutator(working);
    var next = maybeNext && typeof maybeNext === "object" ? maybeNext : working;
    return saveData(next);
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Kosongkan semua data (observasi, layout TSK, skenario Yamazumi, urutan proses, draft).
  // Disimpan sebagai data kosong dengan waktu terbaru (bukan sekadar dihapus) supaya sinkronisasi
  // menganggapnya paling baru dan tidak menarik kembali data lama dari server / PC lain.
  function clearAllData() {
    var empty = saveData(clone(DEFAULT_DATA));
    if (_saveTimer) clearTimeout(_saveTimer);
    pushStateToServer();
    return empty;
  }

  function exportJson(filename) {
    // Export penuh agar mudah backup/migrasi data.
    var name = filename || "standardized-work-data.json";
    var data = loadData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("File tidak ditemukan."));
        return;
      }

      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          // Validasi ringan dengan cara normalisasi ke struktur default.
          var parsed = JSON.parse(String(event.target.result || ""));
          var safeData = withDefaults(parsed);
          saveData(safeData);
          resolve(safeData);
        } catch (error) {
          reject(new Error("Format JSON tidak valid."));
        }
      };
      reader.onerror = function () {
        reject(new Error("Gagal membaca file import."));
      };
      reader.readAsText(file);
    });
  }

  var textEncoder = new TextEncoder();
  var CRC32_TABLE = buildCrc32Table();

  function toUtf8Bytes(text) {
    return textEncoder.encode(String(text == null ? "" : text));
  }

  function concatBytes(chunks) {
    var total = chunks.reduce(function (sum, chunk) { return sum + chunk.length; }, 0);
    var result = new Uint8Array(total);
    var offset = 0;
    chunks.forEach(function (chunk) {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  function buildCrc32Table() {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i += 1) {
      var c = i;
      for (var j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function dosDateTime() {
    var now = new Date();
    var year = Math.max(1980, now.getFullYear());
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = Math.floor(now.getSeconds() / 2);
    return {
      date: ((year - 1980) << 9) | (month << 5) | day,
      time: (hour << 11) | (minute << 5) | second
    };
  }

  function createZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var stamp = dosDateTime();

    files.forEach(function (file) {
      var nameBytes = toUtf8Bytes(String(file.name || "").replace(/\\/g, "/"));
      var dataBytes = file.data instanceof Uint8Array ? file.data : toUtf8Bytes(file.data);
      var crc = crc32(dataBytes);
      var size = dataBytes.length;
      var localHeader = new ArrayBuffer(30);
      var localView = new DataView(localHeader);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, stamp.time, true);
      localView.setUint16(12, stamp.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, size, true);
      localView.setUint32(22, size, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

      var centralHeader = new ArrayBuffer(46);
      var centralView = new DataView(centralHeader);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, stamp.time, true);
      centralView.setUint16(14, stamp.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, size, true);
      centralView.setUint32(24, size, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralParts.push(new Uint8Array(centralHeader), nameBytes);

      offset += 30 + nameBytes.length + size;
    });

    var centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var endHeader = new ArrayBuffer(22);
    var endView = new DataView(endHeader);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return concatBytes(localParts.concat(centralParts, [new Uint8Array(endHeader)]));
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function columnName(index) {
    var name = "";
    var i = index;
    while (i > 0) {
      var mod = (i - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      i = Math.floor((i - 1) / 26);
    }
    return name || "A";
  }

  function sanitizeSheetName(name) {
    var safe = String(name || "Sheet1")
      .replace(/[\\\/\*\?\:\[\]]/g, " ")
      .trim();
    if (!safe) {
      safe = "Sheet1";
    }
    if (safe.length > 31) {
      safe = safe.slice(0, 31);
    }
    return safe;
  }

  function needsPreserveSpace(text) {
    return /^\s/.test(text) || /\s$/.test(text) || /\n/.test(text) || /\t/.test(text) || /  +/.test(text);
  }

  // Style sel (index cellXfs di STYLES_XML). Sel boleh berupa nilai biasa atau { v: nilai, s: XLSX_STYLE.* }.
  var XLSX_STYLE = {
    normal: 0,
    title: 1,
    label: 2,
    input: 3,
    header: 4,
    center: 5,
    hint: 6,
    fixed: 7
  };

  var STYLES_XML =
    "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
    "<styleSheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>" +
    "<fonts count='4'>" +
    "<font><sz val='11'/><name val='Calibri'/><family val='2'/></font>" +
    "<font><b/><sz val='11'/><name val='Calibri'/><family val='2'/></font>" +
    "<font><b/><sz val='16'/><name val='Calibri'/><family val='2'/></font>" +
    "<font><i/><sz val='10'/><color rgb='FF5C6974'/><name val='Calibri'/><family val='2'/></font>" +
    "</fonts>" +
    "<fills count='4'>" +
    "<fill><patternFill patternType='none'/></fill>" +
    "<fill><patternFill patternType='gray125'/></fill>" +
    "<fill><patternFill patternType='solid'><fgColor rgb='FFEEF2F4'/><bgColor indexed='64'/></patternFill></fill>" +
    "<fill><patternFill patternType='solid'><fgColor rgb='FFD7ECEC'/><bgColor indexed='64'/></patternFill></fill>" +
    "</fills>" +
    "<borders count='2'>" +
    "<border><left/><right/><top/><bottom/><diagonal/></border>" +
    "<border><left style='thin'><color rgb='FF8A99A6'/></left><right style='thin'><color rgb='FF8A99A6'/></right>" +
    "<top style='thin'><color rgb='FF8A99A6'/></top><bottom style='thin'><color rgb='FF8A99A6'/></bottom><diagonal/></border>" +
    "</borders>" +
    "<cellStyleXfs count='1'><xf numFmtId='0' fontId='0' fillId='0' borderId='0'/></cellStyleXfs>" +
    "<cellXfs count='8'>" +
    "<xf numFmtId='0' fontId='0' fillId='0' borderId='0' xfId='0'/>" +
    "<xf numFmtId='0' fontId='2' fillId='0' borderId='0' xfId='0' applyFont='1' applyAlignment='1'><alignment horizontal='center' vertical='center'/></xf>" +
    "<xf numFmtId='0' fontId='1' fillId='2' borderId='1' xfId='0' applyFont='1' applyFill='1' applyBorder='1' applyAlignment='1'><alignment vertical='center'/></xf>" +
    "<xf numFmtId='0' fontId='0' fillId='0' borderId='1' xfId='0' applyBorder='1' applyAlignment='1'><alignment vertical='center'/></xf>" +
    "<xf numFmtId='0' fontId='1' fillId='3' borderId='1' xfId='0' applyFont='1' applyFill='1' applyBorder='1' applyAlignment='1'><alignment horizontal='center' vertical='center' wrapText='1'/></xf>" +
    "<xf numFmtId='0' fontId='0' fillId='0' borderId='1' xfId='0' applyBorder='1' applyAlignment='1'><alignment horizontal='center' vertical='center'/></xf>" +
    "<xf numFmtId='0' fontId='3' fillId='0' borderId='0' xfId='0' applyFont='1' applyAlignment='1'><alignment vertical='top' wrapText='1'/></xf>" +
    "<xf numFmtId='0' fontId='1' fillId='2' borderId='1' xfId='0' applyFont='1' applyFill='1' applyBorder='1' applyAlignment='1'><alignment horizontal='center' vertical='center'/></xf>" +
    "</cellXfs>" +
    "<cellStyles count='1'><cellStyle name='Normal' xfId='0' builtinId='0'/></cellStyles>" +
    "</styleSheet>";

  function cellXml(rawValue, rowIndex, colIndex) {
    var styled = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue);
    var value = styled ? rawValue.v : rawValue;
    var styleAttr = styled && rawValue.s ? " s='" + String(rawValue.s) + "'" : "";
    var ref = columnName(colIndex) + String(rowIndex);
    if (value == null || value === "") {
      // Sel kosong tetap ditulis bila punya style (mis. kotak isian bergaris).
      return styleAttr ? "<c r='" + ref + "'" + styleAttr + "/>" : "";
    }
    if (typeof value === "number" && isFinite(value)) {
      return "<c r='" + ref + "'" + styleAttr + "><v>" + String(value) + "</v></c>";
    }
    if (typeof value === "boolean") {
      return "<c r='" + ref + "'" + styleAttr + " t='b'><v>" + (value ? "1" : "0") + "</v></c>";
    }

    var text = String(value);
    var preserve = needsPreserveSpace(text) ? " xml:space='preserve'" : "";
    return "<c r='" + ref + "'" + styleAttr + " t='inlineStr'><is><t" + preserve + ">" + escapeXml(text) + "</t></is></c>";
  }

  // options: { cols: [lebar kolom A, B, ...], merges: ["A1:P1", ...], rowHeights: { nomorBaris: tinggi } }
  function worksheetXml(rows, options) {
    var opts = options || {};
    var safeRows = Array.isArray(rows) ? rows : [];
    var lastRow = Math.max(1, safeRows.length);
    var maxCol = 1;
    var body = "";

    safeRows.forEach(function (rawRow, rowIdx) {
      var values = Array.isArray(rawRow) ? rawRow : [rawRow];
      if (values.length > maxCol) {
        maxCol = values.length;
      }
      var cells = "";
      for (var col = 0; col < values.length; col += 1) {
        cells += cellXml(values[col], rowIdx + 1, col + 1);
      }
      var height = opts.rowHeights && opts.rowHeights[rowIdx + 1];
      var heightAttr = height ? " ht='" + String(height) + "' customHeight='1'" : "";
      body += "<row r='" + String(rowIdx + 1) + "'" + heightAttr + ">" + cells + "</row>";
    });

    var colsXml = "";
    if (Array.isArray(opts.cols) && opts.cols.length) {
      colsXml = "<cols>" + opts.cols.map(function (width, index) {
        return "<col min='" + (index + 1) + "' max='" + (index + 1) + "' width='" + String(width) + "' customWidth='1'/>";
      }).join("") + "</cols>";
    }
    var mergeXml = "";
    if (Array.isArray(opts.merges) && opts.merges.length) {
      mergeXml = "<mergeCells count='" + opts.merges.length + "'>" + opts.merges.map(function (ref) {
        return "<mergeCell ref='" + ref + "'/>";
      }).join("") + "</mergeCells>";
    }

    var dimRef = "A1:" + columnName(maxCol) + String(lastRow);
    return (
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>" +
      "<dimension ref='" + dimRef + "'/>" +
      "<sheetViews><sheetView workbookViewId='0'/></sheetViews>" +
      "<sheetFormatPr defaultRowHeight='15'/>" +
      colsXml +
      "<sheetData>" + body + "</sheetData>" +
      mergeXml +
      "</worksheet>"
    );
  }

  function ensureXlsxFilename(filename) {
    var name = String(filename || "export.xlsx").trim();
    if (!name) {
      name = "export.xlsx";
    }
    if (/\.xlsx$/i.test(name)) {
      return name;
    }
    name = name.replace(/\.[^\/\\\.]+$/, "");
    return name + ".xlsx";
  }

  function buildXlsx(rows, sheetName) {
    var finalSheetName = sanitizeSheetName(sheetName);
    var wsXml = worksheetXml(rows);
    var wbXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<workbook xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main' " +
      "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'>" +
      "<sheets><sheet name='" + escapeXml(finalSheetName) + "' sheetId='1' r:id='rId1'/></sheets>" +
      "</workbook>";
    var wbRelsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' Target='worksheets/sheet1.xml'/>" +
      "<Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles' Target='styles.xml'/>" +
      "</Relationships>";
    var relsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='xl/workbook.xml'/>" +
      "</Relationships>";
    var stylesXml = STYLES_XML;
    var contentTypesXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>" +
      "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>" +
      "<Default Extension='xml' ContentType='application/xml'/>" +
      "<Override PartName='/xl/workbook.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'/>" +
      "<Override PartName='/xl/worksheets/sheet1.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/>" +
      "<Override PartName='/xl/styles.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'/>" +
      "</Types>";

    return createZip([
      { name: "[Content_Types].xml", data: contentTypesXml },
      { name: "_rels/.rels", data: relsXml },
      { name: "xl/workbook.xml", data: wbXml },
      { name: "xl/_rels/workbook.xml.rels", data: wbRelsXml },
      { name: "xl/styles.xml", data: stylesXml },
      { name: "xl/worksheets/sheet1.xml", data: wsXml }
    ]);
  }

  function downloadXlsx(filename, rows, sheetName) {
    var xlsxBytes = buildXlsx(rows, sheetName || "Sheet1");
    var blob = new Blob([xlsxBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = ensureXlsxFilename(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCsvValue(value) {
    var text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function toCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return "";
    }

    var lines = rows.map(function (row) {
      return row.map(escapeCsvValue).join(",");
    });
    return lines.join("\n");
  }

  function downloadCsv(filename, rows) {
    // Tetap disediakan untuk kompatibilitas lama.
    var csv = toCsv(rows);
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename || "export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ── Multi-sheet xlsx + import/export ──

  function buildXlsxMulti(sheets) {
    var zipFiles     = [];
    var sheetEntries = '';
    var relEntries   = '';
    var ctEntries    = '';

    sheets.forEach(function (sh, idx) {
      var n   = idx + 1;
      var xml = worksheetXml(sh.rows, sh);
      zipFiles.push({ name: 'xl/worksheets/sheet' + n + '.xml', data: xml });
      sheetEntries += "<sheet name='" + escapeXml(sanitizeSheetName(sh.name)) + "' sheetId='" + n + "' r:id='rId" + n + "'/>";
      relEntries   += "<Relationship Id='rId" + n + "' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' Target='worksheets/sheet" + n + ".xml'/>";
      ctEntries    += "<Override PartName='/xl/worksheets/sheet" + n + ".xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/>";
    });

    var rIdSt = 'rId' + (sheets.length + 1);
    relEntries += "<Relationship Id='" + rIdSt + "' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles' Target='styles.xml'/>";

    var wbXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<workbook xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main' " +
      "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'>" +
      "<sheets>" + sheetEntries + "</sheets></workbook>";

    var wbRelsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      relEntries + "</Relationships>";

    var relsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='xl/workbook.xml'/>" +
      "</Relationships>";

    var stylesXml = STYLES_XML;

    var ctXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>" +
      "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>" +
      "<Default Extension='xml' ContentType='application/xml'/>" +
      "<Override PartName='/xl/workbook.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'/>" +
      ctEntries +
      "<Override PartName='/xl/styles.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'/>" +
      "</Types>";

    return createZip(
      [
        { name: '[Content_Types].xml',        data: ctXml     },
        { name: '_rels/.rels',                data: relsXml   },
        { name: 'xl/workbook.xml',            data: wbXml     },
        { name: 'xl/_rels/workbook.xml.rels', data: wbRelsXml },
        { name: 'xl/styles.xml',              data: stylesXml },
      ].concat(zipFiles)
    );
  }

  // Baca ZIP: method 0 (stored) dan method 8 (deflate via DecompressionStream).
  // Ukuran & offset diambil dari central directory, karena sebagian aplikasi menulis
  // ukuran 0 di local header (data descriptor).
  function unpackZip(buffer) {
    var u8      = new Uint8Array(buffer);
    var dv      = new DataView(buffer);
    var dec     = new TextDecoder('utf-8');
    var entries = [];
    var eocd    = -1;
    for (var e = u8.length - 22; e >= 0 && e >= u8.length - 22 - 65535; e--) {
      if (dv.getUint32(e, true) === 0x06054b50) { eocd = e; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('Bukan file .xlsx yang valid.'));
    var count = dv.getUint16(eocd + 10, true);
    var p     = dv.getUint32(eocd + 16, true);
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method   = dv.getUint16(p + 10, true);
      var cmpSize  = dv.getUint32(p + 20, true);
      var fnLen    = dv.getUint16(p + 28, true);
      var exLen    = dv.getUint16(p + 30, true);
      var cmLen    = dv.getUint16(p + 32, true);
      var localOff = dv.getUint32(p + 42, true);
      var fname    = dec.decode(u8.subarray(p + 46, p + 46 + fnLen));
      var dataOff  = localOff + 30 + dv.getUint16(localOff + 26, true) + dv.getUint16(localOff + 28, true);
      entries.push({ name: fname, method: method, data: u8.slice(dataOff, dataOff + cmpSize) });
      p += 46 + fnLen + exLen + cmLen;
    }
    return Promise.all(entries.map(function (e) {
      if (e.method === 0) {
        return Promise.resolve({ name: e.name, text: dec.decode(e.data) });
      }
      if (e.method === 8 && typeof DecompressionStream !== 'undefined') {
        var ds  = new DecompressionStream('deflate-raw');
        var wr  = ds.writable.getWriter();
        var rd  = ds.readable.getReader();
        wr.write(e.data);
        wr.close();
        var chunks = [];
        function readAll() {
          return rd.read().then(function (r) {
            if (r.done) return;
            chunks.push(r.value);
            return readAll();
          });
        }
        return readAll().then(function () {
          var tot = chunks.reduce(function (a, c) { return a + c.length; }, 0);
          var raw = new Uint8Array(tot), pos = 0;
          chunks.forEach(function (c) { raw.set(c, pos); pos += c.length; });
          return { name: e.name, text: dec.decode(raw) };
        });
      }
      return Promise.resolve({ name: e.name, text: '' });
    })).then(function (results) {
      var out = {};
      results.forEach(function (r) { if (r.text) out[r.name] = r.text; });
      return out;
    });
  }

  // Parse sharedStrings.xml → array of strings (indexed).
  function parseSharedStrings(xml) {
    var result = [], siRe = /<si>([\s\S]*?)<\/si>/g, tRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g, m;
    while ((m = siRe.exec(xml)) !== null) {
      var text = '', tm;
      tRe.lastIndex = 0;
      while ((tm = tRe.exec(m[1])) !== null) text += tm[1];
      result.push(text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'"));
    }
    return result;
  }

  // Parse worksheet XML → array of sparse row objects {colIndex: value}.
  // Mendukung sel/baris self-closing (<c r="B3" s="3"/>) dan atribut berkutip tunggal maupun ganda.
  function parseWorksheetRows(xml, ss) {
    var rows   = [];
    var rowRe  = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    var cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    var valRe  = /<v>([\s\S]*?)<\/v>/;
    var colRe  = /\br=["']([A-Z]+)\d+["']/;
    var typeRe = /\bt=["'](\w+)["']/;
    var rowM;
    function unescape(text) {
      return text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
    }
    while ((rowM = rowRe.exec(xml)) !== null) {
      var cells = {};
      var rowBody = rowM[2] || '';
      // Nomor baris Excel asli (baris kosong bisa tidak ditulis), tidak ikut Object.keys().
      var rowNumM = /\br=["'](\d+)["']/.exec(rowM[1]);
      Object.defineProperty(cells, 'rowNumber', { value: rowNumM ? Number(rowNumM[1]) : rows.length + 1, enumerable: false });
      cellRe.lastIndex = 0;
      var cM;
      while ((cM = cellRe.exec(rowBody)) !== null) {
        var attrs = cM[1], body = cM[2] || '';
        var colM  = colRe.exec(attrs);
        if (!colM) continue;
        var col = 0;
        for (var ci = 0; ci < colM[1].length; ci++) col = col * 26 + (colM[1].charCodeAt(ci) - 64);
        col--;
        var typeM = typeRe.exec(attrs);
        var type  = typeM ? typeM[1] : '';
        var val, vm;
        if (type === 's') {
          vm = valRe.exec(body); val = vm ? (ss[parseInt(vm[1], 10)] || '') : '';
        } else if (type === 'inlineStr') {
          var text = '', tRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g, tm;
          while ((tm = tRe.exec(body)) !== null) text += tm[1];
          val = unescape(text);
        } else if (type === 'str' || type === 'e') {
          vm = valRe.exec(body); val = vm ? unescape(vm[1]) : '';
        } else {
          vm = valRe.exec(body); val = vm ? (isNaN(Number(vm[1])) ? unescape(vm[1]) : Number(vm[1])) : '';
        }
        cells[col] = val;
      }
      rows.push(cells);
    }
    return rows;
  }

  // Path worksheet pertama menurut workbook.xml (urutan tab di Excel), fallback sheet1.xml.
  function firstSheetPath(files) {
    var wb   = files['xl/workbook.xml'] || '';
    var rels = files['xl/_rels/workbook.xml.rels'] || '';
    var sheetM = /<sheet\b[^>]*?\br:id=["']([^"']+)["']/.exec(wb);
    if (sheetM && rels) {
      var relRe = /<Relationship\b([^>]*)\/?>/g, relM;
      while ((relM = relRe.exec(rels)) !== null) {
        var idM = /\bId=["']([^"']+)["']/.exec(relM[1]);
        var targetM = /\bTarget=["']([^"']+)["']/.exec(relM[1]);
        if (idM && targetM && idM[1] === sheetM[1]) {
          var target = targetM[1].replace(/^\//, '').replace(/^xl\//, '');
          if (files['xl/' + target]) return 'xl/' + target;
        }
      }
    }
    return 'xl/worksheets/sheet1.xml';
  }

  // Baca sheet pertama file .xlsx → Promise<array of {colIndex: value}>.
  function readXlsxRows(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('File tidak ditemukan.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Gagal membaca file.')); };
      reader.onload = function (e) {
        unpackZip(e.target.result).then(function (files) {
          var path = firstSheetPath(files);
          if (!files[path]) throw new Error('Lembar kerja tidak ditemukan di dalam file.');
          resolve(parseWorksheetRows(files[path], parseSharedStrings(files['xl/sharedStrings.xml'] || '')));
        }).catch(function (err) {
          reject(new Error('File Excel tidak bisa dibaca: ' + err.message + ' Pastikan formatnya .xlsx.'));
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Unduh workbook multi-sheet. sheets: [{ name, rows, cols, merges, rowHeights }]
  function downloadXlsxSheets(filename, sheets) {
    var bytes = buildXlsxMulti(sheets);
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = ensureXlsxFilename(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Hitung modus dari array angka (non-zero).
  function flatImportMode(nums) {
    if (!nums.length) return 0;
    var freq = {}, maxF = 0;
    nums.forEach(function (v) { var k=String(v); freq[k]=(freq[k]||0)+1; if(freq[k]>maxF) maxF=freq[k]; });
    if (maxF > 1) {
      var best = null;
      Object.keys(freq).forEach(function (k) { if (freq[k]===maxF) { var v=Number(k); if(best===null||v<best) best=v; } });
      return best;
    }
    var sorted = nums.slice().sort(function (a, b) { return a - b; });
    return sorted.length >= 2 ? sorted[1] : sorted[0];
  }

  function inferTypeForImport(cat) {
    var c = String(cat || '').toLowerCase();
    if (c.indexOf('walk') >= 0 || c.indexOf('jalan') >= 0 || c.indexOf('dorong') >= 0) return 'Walking';
    if (c.indexOf('machine') >= 0 || c.indexOf('mesin') >= 0 || c.indexOf('auto') >= 0) return 'Machine';
    return 'Manual';
  }

  function extractInlineStr(xml, ref) {
    var idx = xml.indexOf('r="' + ref + '"');
    if (idx === -1) idx = xml.indexOf("r='" + ref + "'");
    if (idx === -1) return null;
    var t1 = xml.indexOf('<t', idx);
    if (t1 === -1) return null;
    t1 = xml.indexOf('>', t1) + 1;
    var t2 = xml.indexOf('</t>', t1);
    if (t2 === -1) return null;
    return xml.slice(t1, t2)
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  function exportDataXlsx() {
    var data         = loadData();
    var observations = data.observations || [];
    var active       = observations.filter(function (o) { return o.isActiveRevision; });

    // Sheet 1: flat — satu baris per elemen kerja (format sesuai template)
    var header = [
      'No Data', 'Line', 'Proses', 'Tipe Produk', 'Takt Time', 'Tanggal', 'Shift / Jam',
      'Nama Observer', 'Nama Operator',
      'No', 'Elemen Kerja', 'Kategori',
      'Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5',
      'Sample 6', 'Sample 7', 'Sample 8', 'Sample 9', 'Sample 10',
      'Modus', 'Min', 'Max', 'Qty', 'Unit', 'CT (sec/batt)', 'Note'
    ];
    var dataRows = [header];
    active.forEach(function (o, obsIdx) {
      var elements = Array.isArray(o.elements) ? o.elements : [];
      elements.forEach(function (el, elIdx) {
        var samples = Array.isArray(el.samples) ? el.samples : [];
        var numeric = samples.map(function (s) { return Number(s) || 0; }).filter(function (v) { return v > 0; });
        var minVal  = numeric.length ? Math.min.apply(null, numeric) : '';
        var maxVal  = numeric.length ? Math.max.apply(null, numeric) : '';
        var row = [
          obsIdx + 1,
          o.lineName      || '',
          o.processName   || '',
          o.productType   || '',
          o.taktTime != null ? Number(o.taktTime) || '' : '',
          o.obsTanggal    || '',
          o.shiftJam      || '',
          o.observerName  || '',
          o.operatorName  || '',
          elIdx + 1,
          el.name         || '',
          el.category     || ''
        ];
        for (var s = 0; s < 10; s++) {
          var sv = samples[s];
          row.push(sv !== '' && sv != null ? (Number(sv) || 0) : '');
        }
        row.push(el.avg  != null ? Number(el.avg)  || '' : '');
        row.push(minVal);
        row.push(maxVal);
        row.push(el.qty  != null ? Number(el.qty)  || '' : '');
        row.push(el.unit || '');
        row.push(el.ct   != null ? Number(el.ct)   || '' : '');
        row.push(el.note || '');
        dataRows.push(row);
      });
    });

    // Sheet 2: raw JSON observasi saja — dipakai saat import balik
    var rawRows = [[JSON.stringify(observations)]];

    var bytes = buildXlsxMulti([
      { name: 'Data Observasi', rows: dataRows },
      { name: '_data',          rows: rawRows }
    ]);

    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = ensureXlsxFilename('obs-export-' + new Date().toISOString().slice(0, 10));
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Path worksheet berdasarkan nama tab (mis. "_data"), null bila tidak ada.
  function sheetPathByName(files, sheetName) {
    var wb   = files['xl/workbook.xml'] || '';
    var rels = files['xl/_rels/workbook.xml.rels'] || '';
    var sheetRe = /<sheet\b([^>]*)\/?>/g, m;
    while ((m = sheetRe.exec(wb)) !== null) {
      var nameM = /\bname=["']([^"']*)["']/.exec(m[1]);
      var ridM  = /\br:id=["']([^"']+)["']/.exec(m[1]);
      if (!nameM || !ridM || nameM[1] !== sheetName) continue;
      var relRe = /<Relationship\b([^>]*)\/?>/g, relM;
      while ((relM = relRe.exec(rels)) !== null) {
        var idM = /\bId=["']([^"']+)["']/.exec(relM[1]);
        var targetM = /\bTarget=["']([^"']+)["']/.exec(relM[1]);
        if (idM && targetM && idM[1] === ridM[1]) {
          return 'xl/' + targetM[1].replace(/^\//, '').replace(/^xl\//, '');
        }
      }
    }
    return null;
  }

  var FLAT_IMPORT_COLUMNS = {
    line     : ['line'],
    process  : ['proses', 'nama proses'],
    product  : ['tipe produk', 'type produk', 'tipe', 'model/tipe'],
    takt     : ['takt time', 'takt'],
    tanggal  : ['tanggal', 'tanggal observasi', 'tgl'],
    shift    : ['shift / jam', 'shift/jam', 'shift'],
    observer : ['nama observer', 'observer'],
    operator : ['nama operator', 'operator'],
    name     : ['elemen kerja'],
    category : ['kategori', 'category'],
    qty      : ['qty'],
    unit     : ['unit', 'satuan'],
    note     : ['note', 'catatan', 'keterangan']
  };

  function flatImportKey(value) {
    return String(value == null ? '' : value).toLowerCase()
      .replace(/\(.*?\)/g, ' ').replace(/[:*]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function flatImportNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? Math.round(value * 10000) / 10000 : NaN;
    var text = String(value == null ? '' : value).trim().replace(',', '.');
    return text === '' ? NaN : Number(text);
  }

  function flatImportDate(value) {
    if (value === '' || value == null) return '';
    if (typeof value === 'number' && value > 20000 && value < 80000) {
      return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
    }
    var text = String(value).trim();
    var dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(text);
    if (dmy) return dmy[3] + '-' + ('0' + dmy[2]).slice(-2) + '-' + ('0' + dmy[1]).slice(-2);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
  }

  // Tabel datar Data Observasi (format import & format export): kolom dicari dari judulnya,
  // jadi urutan kolom bebas dan kolom tambahan (No Data, Modus, Min, Max, CT) diabaikan.
  function parseFlatObservationRows(rows) {
    var headerIndex = -1;
    var cols = { samples: [] };
    for (var h = 0; h < Math.min(rows.length, 20) && headerIndex < 0; h++) {
      var hasName = Object.keys(rows[h]).some(function (c) { return flatImportKey(rows[h][c]) === 'elemen kerja'; });
      if (!hasName) continue;
      headerIndex = h;
      Object.keys(rows[h]).forEach(function (c) {
        var key = flatImportKey(rows[h][c]);
        var sampleM = /^(?:sample\s*)?(\d{1,2})$/.exec(key);
        if (sampleM && Number(sampleM[1]) >= 1 && Number(sampleM[1]) <= 10) {
          cols.samples[Number(sampleM[1]) - 1] = Number(c);
          return;
        }
        Object.keys(FLAT_IMPORT_COLUMNS).forEach(function (field) {
          if (cols[field] === undefined && FLAT_IMPORT_COLUMNS[field].indexOf(key) >= 0) cols[field] = Number(c);
        });
      });
    }
    if (headerIndex < 0) throw new Error('Judul kolom "Elemen Kerja" tidak ditemukan.');
    if (cols.line === undefined || cols.process === undefined) {
      throw new Error('Kolom "Line" dan "Proses" tidak ditemukan. Untuk Form Excel 1 Proses / 1 Line, import lewat halaman Lembar Observasi → Import Excel.');
    }

    function text(row, field) {
      return cols[field] === undefined || row[cols[field]] == null ? '' : String(row[cols[field]]).trim();
    }

    var newObs = [], curObs = null, curKey = null, counter = 0, missingQty = [];
    var timestamp = new Date().toISOString();

    rows.slice(headerIndex + 1).forEach(function (row) {
      var line = text(row, 'line'), proses = text(row, 'process'), elName = text(row, 'name');
      if (!line && !proses && !elName) return; // baris kosong

      var takt = cols.takt === undefined ? '' : flatImportNumber(row[cols.takt]);
      var tanggal = cols.tanggal === undefined ? '' : flatImportDate(row[cols.tanggal]);
      var key = [line, proses, text(row, 'product'), takt, tanggal, text(row, 'shift'), text(row, 'observer'), text(row, 'operator')].join('|');
      if (key !== curKey) {
        var id = 'import_' + Date.now() + '_' + (counter++);
        curObs = {
          id: id, groupId: id,
          revisionNumber: 0, revisionLabel: 'Revisi 000', revisionNote: 'Data awal', revisedFromId: null,
          isActiveRevision: true, source: 'import-data-xlsx',
          noFormCode: 'Form-ISD-ISD-001', noForm: 'Form-ISD-ISD-001',
          obsTanggal: tanggal, tanggal: tanggal, createdAt: timestamp, updatedAt: timestamp,
          lineName: line, processName: proses, productType: text(row, 'product'),
          taktTime: isNaN(takt) ? '' : takt, shiftJam: text(row, 'shift'),
          observerName: text(row, 'observer'), operatorName: text(row, 'operator'),
          elements: []
        };
        newObs.push(curObs);
        curKey = key;
      }

      var samples = [];
      for (var s = 0; s < 10; s++) {
        var sv = cols.samples[s] === undefined ? NaN : flatImportNumber(row[cols.samples[s]]);
        samples.push(isNaN(sv) ? '' : sv);
      }
      var numeric = samples.filter(function (v) { return v !== '' && v > 0; });
      var modeVal = flatImportMode(numeric);

      // Qty: kolom ada → wajib angka > 0 untuk elemen yang punya sample; elemen tanpa sample
      // tetap disimpan (nama elemen tercatat, CT 0) walau Qty kosong. File tanpa kolom Qty (format lama) → 1.
      var hasSample = samples.some(function (v) { return v !== ''; });
      var qty = 1;
      if (cols.qty !== undefined) {
        qty = flatImportNumber(row[cols.qty]);
        if (!(qty > 0)) {
          if (hasSample) missingQty.push(row.rowNumber || headerIndex + 2);
          qty = null;
        }
      }
      var ct = qty ? modeVal / qty : 0;
      var cat = text(row, 'category') || 'Value';

      curObs.elements.push({
        id       : 'el_' + Date.now() + '_' + (counter++),
        name     : elName,
        type     : inferTypeForImport(cat),
        category : cat,
        samples  : samples,
        mode: modeVal,
        min : numeric.length ? Math.min.apply(null, numeric) : 0,
        max : numeric.length ? Math.max.apply(null, numeric) : 0,
        qty : qty,
        unit: text(row, 'unit') || 'Battery',
        ct  : ct,
        avg : ct,
        note: text(row, 'note')
      });
    });

    if (missingQty.length) {
      throw new Error('Qty kosong / bukan angka pada baris Excel ' + missingQty.slice(0, 10).join(', ') +
        (missingQty.length > 10 ? ', ... (' + missingQty.length + ' baris)' : '') + '. Lengkapi Qty lalu import ulang.');
    }
    if (!newObs.length) throw new Error('Tidak ada data dalam file.');

    var warnings = [];
    if (cols.qty === undefined) {
      warnings.push('File tidak punya kolom Qty, jadi Qty semua elemen diisi 1. Tambahkan kolom "Qty" di file agar Qty sesuai.');
    }
    return { observations: newObs, warnings: warnings };
  }

  function importDataXlsx(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('File tidak ditemukan.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Gagal membaca file.')); };
      reader.onload  = function (e) {
        unpackZip(e.target.result).then(function (files) {

          // ── Format A: export kita sendiri (sheet "_data" berisi JSON observasi di A1) ──
          var dataSheet = sheetPathByName(files, '_data');
          if (dataSheet && files[dataSheet]) {
            var ssA = parseSharedStrings(files['xl/sharedStrings.xml'] || '');
            var firstRow = parseWorksheetRows(files[dataSheet], ssA)[0] || {};
            var raw = extractInlineStr(files[dataSheet], 'A1') || firstRow[0];
            var parsed = null;
            try { parsed = raw ? JSON.parse(raw) : null; } catch (jsonErr) { parsed = null; }
            if (parsed) {
              var currentData = loadData();
              currentData.observations = Array.isArray(parsed)
                ? parsed
                : (parsed.observations || currentData.observations);
              var safeA = saveData(withDefaults(currentData));
              resolve({ data: safeA, imported: (currentData.observations || []).length, warnings: [], mode: 'backup' });
              return;
            }
          }

          // ── Format B: tabel datar, satu baris per elemen kerja; kolom dibaca dari judulnya ──
          var path = firstSheetPath(files);
          if (!files[path]) throw new Error('Format tidak dikenali.');
          var rows = parseWorksheetRows(files[path], parseSharedStrings(files['xl/sharedStrings.xml'] || ''));
          var result = parseFlatObservationRows(rows);

          var cur = loadData();
          cur.observations = (cur.observations || []).concat(result.observations);
          var safeB = saveData(withDefaults(cur));
          resolve({ data: safeB, imported: result.observations.length, warnings: result.warnings, mode: 'flat' });

        }).catch(function (err) {
          reject(new Error('File tidak valid: ' + err.message));
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Server Sync ── (backend PHP FAH; file data terpisah dari state FAH: data/sw-state.json)
  var SERVER_API   = 'api/sw-state.php';
  var SYNC_TIMEOUT_MS = 5000;
  var _syncStatus  = 'local';
  var _listeners   = [];
  var _saveTimer   = null;

  function setSyncStatus(status) {
    if (_syncStatus === status) return;
    _syncStatus = status;
    _listeners.forEach(function (fn) { try { fn(status); } catch (e) {} });
  }

  function onSyncStatus(fn) {
    _listeners.push(fn);
    fn(_syncStatus); // kirim status saat ini langsung
  }

  function scheduleServerSave(delay) {
    if (typeof fetch !== 'function') return;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(pushStateToServer, delay == null ? 500 : delay);
  }

  function pushStateToServer() {
    _saveTimer = null;
    if (typeof fetch !== 'function') return Promise.resolve();
    var data = loadData();
    setSyncStatus('syncing');
    return fetch(SERVER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: data }),
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (payload) {
      if (payload && payload.ok) {
        setSyncStatus('synced');
      } else {
        throw new Error('server error');
      }
    })
    .catch(function () {
      setSyncStatus('offline');
    });
  }

  // Selalu resolve (tidak pernah reject), termasuk saat server mati / lebih lambat dari SYNC_TIMEOUT_MS,
  // supaya halaman tetap bisa dirender dari localStorage.
  function initSync() {
    if (typeof fetch !== 'function') { setSyncStatus('offline'); return Promise.resolve(); }
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, SYNC_TIMEOUT_MS) : null;
    return fetch(SERVER_API + '?_=' + Date.now(), { cache: 'no-store', signal: controller ? controller.signal : undefined })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (payload) {
      if (timer) clearTimeout(timer);
      if (!payload || !payload.state) {
        // Server belum punya data — push local ke server
        var local = loadData();
        if (local.observations && local.observations.length > 0) {
          pushStateToServer(); // tidak ditunggu: render halaman tidak bergantung pada push
          return;
        }
        setSyncStatus('synced');
        return;
      }
      var serverData = withDefaults(payload.state);
      var localData  = loadData();
      var srvTime = serverData.meta && serverData.meta.updatedAt
        ? new Date(serverData.meta.updatedAt).getTime() : 0;
      var locTime = localData.meta && localData.meta.updatedAt
        ? new Date(localData.meta.updatedAt).getTime() : 0;

      if (srvTime > locTime) {
        // Server lebih baru — simpan ke localStorage tanpa trigger push balik
        var merged = withDefaults(serverData);
        merged.meta.updatedAt = serverData.meta.updatedAt;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else if (locTime > srvTime) {
        // Local lebih baru — push ke server (tidak ditunggu)
        pushStateToServer();
        return;
      }
      setSyncStatus('synced');
    })
    .catch(function () {
      if (timer) clearTimeout(timer);
      setSyncStatus('offline');
    });
  }

  window.SWStorage = {
    STORAGE_KEY   : STORAGE_KEY,
    DEFAULT_DATA  : clone(DEFAULT_DATA),
    loadData      : loadData,
    saveData      : saveData,
    updateData    : updateData,
    resetData     : resetData,
    clearAllData  : clearAllData,
    exportJson    : exportJson,
    importJsonFile: importJsonFile,
    downloadXlsx  : downloadXlsx,
    downloadXlsxSheets: downloadXlsxSheets,
    readXlsxRows  : readXlsxRows,
    XLSX_STYLE    : XLSX_STYLE,
    toCsv         : toCsv,
    downloadCsv   : downloadCsv,
    // Data export/import (xlsx)
    exportDataXlsx : exportDataXlsx,
    importDataXlsx : importDataXlsx,
    // Server sync
    onSyncStatus  : onSyncStatus,
    initSync      : initSync,
    pushNow       : pushStateToServer,
  };
})();
