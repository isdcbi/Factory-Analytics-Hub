# Factory Analytics Hub (FAH)

> *Turning Production Data into Actionable Decisions*

Aplikasi web internal berbasis *Multi Page Application* (MPA) untuk mengelola, menganalisis, dan memvisualisasikan data produksi baterai. FAH menyelaraskan data order bulanan dengan kapasitas mesin dan hari kerja untuk menghasilkan analisis **Loading vs Capacity (LVC)**, kalkulasi **Man Power**, dan **Generated Data Order** secara otomatis.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | HTML5, CSS3 (CSS Variables, Light Theme), Vanilla JavaScript |
| Library | SheetJS (`xlsx.full.min.js`) — parsing & export Excel |
| Backend | PHP 7.4+ (`api/state.php`) — REST API (GET & POST) |
| Storage | `localStorage` (offline-first) + `api/state.json` (server sync) |

---

## Struktur File

```
bpms/
├── index.html              # Entry point — redirect otomatis ke home.html
├── home.html               # Halaman landing / portal home
├── dashboard.html          # Dashboard LVC overview
├── lvc-analysis.html       # Analisis LVC detail per LINE
├── data-order.html         # Upload & Generated Data Order
├── database-pcs.html       # Master Database PCS
├── database-konversi.html  # Data Plate Infor, PuLe, Type Plate, Rate
├── setting-capacity.html   # Workday & Shift + Process Capacity
├── man-power.html          # Konfigurasi Man Power per kelompok
├── shared-components.js    # Singleton BPMS — state, sidebar, utils
├── style.css               # Stylesheet global (light theme)
├── Logo FAH.png            # Logo portal
└── api/
    └── state.php           # Backend API (read/write state.json)
```

---

## Halaman & Fitur

### Home (`home.html`)
Halaman landing portal dengan logo, brand name, slogan, dan quick-nav ke halaman utama.

### Dashboard (`dashboard.html`)
- Stat cards: Total Order, Total Qty, Hari Kerja, Line Aktif
- Bar chart SVG LVC overview per LINE
- Tabel ringkasan loading % per LINE

### LVC Analysis (`lvc-analysis.html`)
- Analisis detail Loading vs Capacity per LINE dan periode
- Status: OVERLOADED (>100%), WARNING (85–100%), OK (<85%)
- Export ke Excel

### Data Order (`data-order.html`)
- **Tab Data Order:** Upload Excel per periode, filter kolom, stat cards
- **Tab Generated Data Order:** Tabel 21 kolom hasil lookup otomatis dari Database Konversi
  - Spec Code, Tech, Separator, Battery Type, Plate, 1st/2nd Line
  - PN Plate Positif/Negatif, Grid Process, Qty Plate, Qty Pule
  - Export Raw Data Order & Export Generated Data

### Database PCS (`database-pcs.html`)
- Master Production Capacity Standard
- Upload Excel dari baris ke-3 (A3:L), grouped header 2 baris
- Edit per baris, filter per kolom, export Excel

### Database Konversi (`database-konversi.html`)
- 4 panel: **Data Plate Infor**, **Data PuLe**, **Data Type Plate**, **Data Rate**
- Upload Excel generik (kolom otomatis terbaca)
- Search, export, hapus semua per panel

### Setting Kapasitas (`setting-capacity.html`)
- **Tab Workday & Shift:** Kalender kerja ON/OFF + konfigurasi shift (S1/S2/S3) per 20 LINE
- **Tab Process Capacity:**
  - Tabel Standar Waktu Kerja Efektif (S1=435 mnt, S2=405 mnt, S3=370 mnt)
  - Tabel Summary (5 parameter auto-kalkulasi per periode)
  - Tabel Process Capacity dengan kolom Speed, Efficiency, Qty Machine, Capacity/day

### Man Power (`man-power.html`)
- 10 kelompok tabel: Assembling, Wet Battery, Formation, Pasting, Mixing, Ball Mill, Grid Casting, Grid Punching, Wide Strip, Lithium
- Input MP Shift 1/2/3 per kelompok, total per grup, grand total global

---

## State Management

State global disimpan di `localStorage` (key: `bpms_state`) dan disinkronkan ke `api/state.json` via POST.

```json
{
  "dbLine":           ["Grid Casting", "...", "Line 1", "...", "Wet F"],
  "dbPCS":            [...],
  "orders":           { "YYYY-MM": [...] },
  "capacity":         { "YYYY-MM": { "Line N": { "s1": true, "s2": true, "s3": false } } },
  "workCalendar":     { "YYYY-MM": { "YYYY-MM-DD": true } },
  "mpGroups":         { "Assembling": { "s1": 0, "s2": 0, "s3": 0 }, "..." : {} },
  "processCapacity":  [{ "process": "", "unit": "", "speed": 0, "efficiency": 0, "qtyS1": 0, "qtyS2": 0, "qtyS3": 0 }],
  "capacitySummary":  { "platePerBattery": 0, "beratLeadBattery": 0, "beratLeadPanel": 0, "qtyOrderBattery": 0, "hariKerjaNormal": 0 },
  "dbPlateInfor":     [...],
  "dbPuLe":           [...],
  "dbTypePlate":      [...],
  "dbRate":           [...]
}
```

---

## Logika Kritis

| Fungsi | Lokasi | Keterangan |
|---|---|---|
| `parseItemString(item)` | `shared-components.js` | Parsing ITEM string berdasarkan index karakter statis |
| `calcLVC(period)` | `shared-components.js` | Hitung Loading vs Capacity per LINE |
| `calcPCSFields(ct)` | `shared-components.js` | Auto-calc Batt/H, S1, S2, S3, Total dari CT |
| `formatPeriod(p)` | `shared-components.js` | Format "YYYY-MM" → "Mei 2026" (nama bulan Indonesia) |
| `findPCSMatches()` | `shared-components.js` | Mapping Battery Type ke LINE + CT dari dbPCS |
| `buildLookupMaps()` | `data-order.html` | Named-column lookup dari dbPlateInfor, dbTypePlate, dbPuLe |
| `computeGenRow()` | `data-order.html` | Kalkulasi Generated Data Order per baris order |
| `puleKey(pn)` | `data-order.html` | Transform PN: jika digit ke-3 = "F", ganti 7 huruf pertama dengan "W-UNPL-" |

---

## Item Parsing Logic

Sistem mengekstrak spesifikasi baterai dari string `PN Infor (ITEM)` berdasarkan indeks karakter statis:

| Field | Index | Keterangan |
|---|---|---|
| Technology | 3 | C=Conventional, H=Hybrid, M/V=Maintenance Free |
| Separator | 5 | P=PE, F=Phenolyc, L=Linter, A=AGM, G=Glassmat, R=Rubber |
| Battery Type | 7–13 | Hapus trailing "X" |
| Plate | 15–16 | Jika digit 16 huruf → konversi A=0, B=1, C=2, … |
| Spec Code | 4 | MID(item, 5, 1) |
| Item Data Infor | 2–18 | MID(item, 3, 17) |

---

## Cara Menjalankan

1. Letakkan seluruh file di web server dengan dukungan PHP (Apache/Nginx)
2. Pastikan direktori `api/` dan `data/` dapat ditulis oleh web server (`chmod 755`)
3. Buka `index.html` di browser — otomatis diarahkan ke `home.html`
4. Tanpa server PHP, aplikasi tetap berjalan penuh menggunakan `localStorage`

---

## Export Files

Semua file export menggunakan prefix `FAH_`:

| Halaman | Nama File |
|---|---|
| LVC Analysis | `FAH_LVC_YYYY-MM.xlsx` |
| Database PCS | `FAH_Database_PCS.xlsx` |
| Data Order (raw) | `FAH_RawOrder[_YYYY-MM].xlsx` |
| Generated Data | `FAH_GeneratedOrder[_YYYY-MM].xlsx` |
| Man Power | `FAH_ManPower.xlsx` |
| Database Konversi | `FAH_[statKey].xlsx` |

---

## Catatan Teknis

- Object JS tetap bernama `BPMS` (singleton `window.BPMS`) dan `localStorage` key tetap `bpms_state` untuk kompatibilitas mundur
- Sidebar logo menggunakan file `Logo FAH.png`
- Semua kalkulasi dilakukan di sisi klien (browser); server PHP hanya bertugas membaca/menulis `state.json`
