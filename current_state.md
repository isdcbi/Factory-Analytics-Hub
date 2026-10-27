# Factory Analytics Hub (FAH) — Current State & Activity Log

**Project:** Factory Analytics Hub (FAH) v1.0  
**Last Updated:** 2026-10-27  
**Stack:** HTML5 + Vanilla JS + PHP (state.php) + SheetJS

---

## Status Halaman

| Halaman | File | Status |
|---|---|---|
| Home | `home.html` | ✅ Selesai |
| Dashboard / LVC Chart | `dashboard.html` | ✅ Selesai |
| Entry Point (redirect) | `index.html` | ✅ Redirect → home.html |
| Database PCS | `database-pcs.html` | ✅ Selesai |
| Data Order | `data-order.html` | ✅ Selesai |
| LVC Analysis | `lvc-analysis.html` | ✅ Selesai (redesign v2 — process cards + year view) |
| Setting Kapasitas | `setting-capacity.html` | ✅ Selesai |
| Capacity Planning | `capacity-planning.html` | 🔶 Tab "LvC Assy" selesai (digitalisasi LVC Assy.xlsx); 4 tab lain placeholder |
| Man Power | `man-power.html` | ✅ Selesai (redesign) |
| Database Konversi | `database-konversi.html` | 🔲 Placeholder |
| PA — Dashboard | `pa-dashboard.html` | ✅ Selesai (v1 — KPI + tren parameter + volume produksi) |
| PA — Resume | `resume.html` | 🔶 Tabel struktur selesai (data kosong) |
| PA — Data Produksi Infor | `data-produksi-infor.html` | ✅ Selesai (upload Excel, tab Data + Summary, filter, export) |
| PA — Data Produksi BaaN | `data-produksi-baan.html` | ✅ Selesai (redesign v2 — upload langsung 20-kol Generated format) |
| Shared Components | `shared-components.js` | ✅ Selesai |
| Stylesheet | `style.css` | ✅ Selesai |
| Backend API | `api/state.php` | ✅ Selesai |
| Backend API Produksi Infor | `api/produksi-infor.php` | ✅ Selesai |
| Backend API Orders | `api/orders.php` | ✅ Selesai (baru) |
| Backend API Produksi BaaN | `api/produksi-baan.php` | ✅ Selesai (baru) |
| Standardized Work (SW) | `standardized-work.html` + `sw/` | ✅ Digabung dari portal_sw (Dashboard, Lembar Observasi, Data Observasi, TSKK, TSK, TSKP, Yamazumi, Edit Yamazumi) |
| Backend API SW | `api/sw-state.php` | ✅ Selesai (baru, pengganti server.js Node) |

---

## Activity Log

### 2026-10-27 (3)
- **SW — halaman TSKP dirombak mengikuti Form-ISD-ISD-005 (Tabel Standar Kapasitas Produksi)** (`standardized-work.html` `#tskp`, `sw/app.js` `initTskpPage`, `sw/sw.css` bagian TSKP). Satu lembar = **semua proses dalam 1 line + 1 type produk** (permintaan user).
  - Pilihan: Line → Type Produk. Baris = observasi revisi aktif, urut sesuai urutan proses line (`sortObservationsByProcessOrder`); nama proses yang sama dengan operator berbeda diberi akhiran " - <operator>".
  - Header: logo | TABEL STANDAR KAPASITAS PRODUKSI | NO DOKUMEN Form-ISD-ISD-005 | LINE, NAMA PRODUK, TANGGAL (tanggal observasi terbaru), REVISI (isian) | Disetujui/Diperiksa/Dibuat.
  - Tabel: NO | OPERATION (nama proses) | M/C NUMBER (isian) | BASIC TIME Manual / Auto / Time To Complete | TOOLS No Changed / Time Taken (isian) | PROCESSING CAPACITY/SHIFT (isian menit kerja/shift di header kolom, default 435 = standar S1 FAH) | grafik. Minimal 25 baris. TOTAL = total Manual.
  - Rumus: Manual = MAN + JALAN dari `tskBuildRows` (Value/Non Value/Irregular/lainnya + Walking), Auto = Machine, Time To Complete = Manual + Auto (= Cycle Time di TSK). Kapasitas/shift = floor(menit × 60 ÷ (TTC + Time Taken ÷ No Changed)).
  - Grafik per baris: garis hitam = Manual dari 0, lanjut garis hijau putus-putus = Auto; garis vertikal merah putus-putus = takt time (`getAutoTakt`, hanya bila ada). Skala 10 kolom dengan angka bulat (`tskpScaleMax`).
  - Kapasitas terendah (bottleneck) ditebalkan merah; ringkasan di atas form (no-print): kapasitas line ≈ min kapasitas + proses pembatasnya.
  - Isian disimpan (debounce 400 ms) di key baru `tskpSheets["<line>||<type>"]` = `{ revisi, shiftMin, rows: { <groupId>: { mc, noChanged, timeTaken } } }` → ditambahkan ke `sw/storage.js` (default + `withDefaults`) dan `api/sw-state.php` (normalisasi). `manPowerMap` (TSKP lama) tidak dipakai lagi tapi tetap dipertahankan di state.
  - Export Excel: header + baris form → `tskp-<line>-<type>.xlsx`.
  - Verifikasi headless Chrome: 0 error JS, uji interaksi 17/17 lolos (rumus kapasitas, tools, menit shift, bottleneck, simpan, reload, ganti type/line, sinkron server), print 1 halaman A4 landscape.

### 2026-10-27 (2)
- **SW — TSK diubah jadi satu lembar per PROSES (satu data observasi), bukan per Man Power** (permintaan user: "jangan 1 line dijadikan 1 form TSK"). Poin di entri sebelumnya yang menyebut "per Man Power" sudah tidak berlaku.
  - Pilihan: Line → Type Produk → Proses (value = id observasi, label "Proses - Operator (Revisi xxx)"), sama dengan TSKK.
  - **Lingkaran bernomor = nomor pekerjaan (kolom NO tabel)** — keputusan user. Pekerjaan Walking tidak dapat lingkaran (jalannya = panah antar posisi). Panah penuh mengikuti urutan nomor, panah putus-putus melengkung dari posisi terakhir kembali ke posisi pertama.
  - Header NAMA PROSES = nama proses; footer PROSES = nama proses; TAKT TIME = takt time observasi; TANGGAL = tanggal observasi; label operator di layout = nama operator observasi.
  - Default layout: satu kotak mesin (nama proses), lingkaran pekerjaan berjajar maks 7 per baris, operator di kiri. DARI/KE default = nama pekerjaan pertama/terakhir; huruf otomatis mengecil bila teks tidak muat.
  - Layout disimpan di `tskLayouts["obs||<groupId>"]` (groupId = grup revisi, jadi revisi baru memakai layout yang sama; posisi lingkaran per nomor pekerjaan). Key `mp||…` dari versi per-Man-Power tidak dipakai lagi.
  - Verifikasi: 0 error JS, uji interaksi 22/22 lolos, print 1 halaman A4 landscape.

### 2026-10-27
- **SW — halaman TSK dirombak mengikuti Form-ISD-ISD-003 (Tabel Standar Kerja)** (`standardized-work.html` `#tsk`, `sw/app.js` `initTskPage`, `sw/sw.css` bagian TSK). Keputusan user: **satu lembar per Man Power** (gabungan semua proses milik satu operator, seperti contoh "MP 8 (Coloring - ALT - Finishing)") dan **header + tabel persis form kosong** (tanpa kolom PROSES).
  - Pilihan: Line → Type Produk → Man Power (label "Operator — proses1, proses2"). Proses diurutkan sesuai urutan proses line (`sortObservationsByProcessOrder`).
  - Header: logo | TABEL STANDAR KERJA | DOCUMENT NO Form-ISD-ISD-003 | REVISI (isian) | NAMA PROSES = "<operator> (<proses1> - <proses2> …)" | Disetujui/Diperiksa/Dibuat.
  - Tabel kanan: NO | PEKERJAAN | WAKTU MAN / AUTO / JALAN, minimal 20 baris (lebih bila elemen > 20), TOTAL per kolom. Mapping kategori sama dengan TSKK: Value/Non Value/Irregular/lainnya → MAN, Machine → AUTO, Walking → JALAN; waktu = `getElementDuration` (avg, fallback modus).
  - Footer: LINE, PROSES, TIPE, TANGGAL (tanggal observasi terbaru) | simbol Quality Check / Safety / WIP + JUMLAH WIP (isian) | TAKT TIME (`getAutoTakt`) | CYCLE TIME (= total MAN + AUTO + JALAN, sama dengan TSKK & contoh) | MP = 1.
  - Layout (SVG viewBox 930×600, grid putus-putus seperti form): kotak mesin/area (default satu per proses; tambah, geser, resize lewat sudut kanan-bawah, rename klik ganda, hapus), lingkaran proses bernomor (urutan proses), panah 1→2→… garis penuh + panah kembali putus-putus melengkung (tidak menumpuk saat 2 proses), ikon operator + nama, simbol QC/Safety/WIP yang bisa ditaruh di layout. Kotak DARI/KE (isian, default proses pertama/terakhir) di kiri atas.
  - Disimpan otomatis (debounce 400 ms) di `tskLayouts["mp||<line>||<type>||<operator>"]`. Proses baru yang belum ada di layout tersimpan → lingkaran di posisi default. Entri `tskLayouts` lama (key = id observasi, format TSK lama) tidak dipakai lagi.
  - Print: hanya form, rapat → muat 1 halaman A4 landscape (diverifikasi via print-to-PDF).
  - `fillOptions` dipindah dari dalam `initTskkPage` ke level modul (dipakai TSKK & TSK). CSS lama TSK (`.layout-stage`, `.machine-node`, `.path-layer`) dihapus.
  - Verifikasi headless Chrome: 0 error JS di 8 route; uji interaksi 22/22 lolos (geser lingkaran/operator, tambah/resize/hapus kotak, tambah simbol + hapus dengan tombol Delete, isian DARI/WIP tersimpan, bertahan setelah reload, layout terpisah per operator).

### 2026-10-02
- **Portal Standardized Work digabung ke FAH** (sebelumnya portal terpisah `portal_sw/`: SPA + server Node `server.js`). Folder `portal_sw/` dihapus setelah integrasi diverifikasi (isinya termasuk `portal_sw/fah/` = salinan duplikat FAH).
- **File baru:**
  - `standardized-work.html` — satu halaman SW; view per hash (`#home`, `#observasi`, `#data-observasi`, `#tskk`, `#tsk`, `#tskp`, `#yamazumi`, `#yamazumi-edit`) dari `<template id="tpl-...">`. Body: `class="sw-portal" data-bpms-sync="off"`.
  - `sw/app.js`, `sw/storage.js`, `sw/chart.js` (logika SW, tidak diubah kecuali poin di bawah), `sw/sw.css`, `sw/CBI_Logo_large1.png`.
  - `api/sw-state.php` — GET/POST state SW ke `data/sw-state.json` (terpisah dari `data/state.json` FAH supaya save FAH & SW tidak saling timpa). JSON di-decode sebagai objek (bukan array asosiatif) agar `{}` tidak berubah jadi `[]` (mis. `settings.processOrders`). Tulis pakai `flock`, GET pakai shared lock.
- **Tidak ada yang dobel:**
  - Sidebar: pakai sidebar FAH (`shared-components.js`), grup baru **Standardized Work** paling bawah (7 menu, href `standardized-work.html#<route>`). Sidebar statis, `initSidebar()`, dan key collapse SW dihapus dari `sw/app.js`; menu aktif per hash diatur `activateMenu()` di `sw/app.js` (Edit Yamazumi → menu Yamazumi). Collapse sidebar → `MutationObserver` memicu `resize` supaya canvas TSKK menyesuaikan.
  - Status server: hanya milik FAH (ping `api/state.php`); widget status sinkronisasi SW di `sw/app.js` dihapus.
  - CSS: `sw/sw.css` hanya berisi aturan khusus SW + penyesuaian yang memang beda dari FAH; aturan shell (sidebar, topbar, status, hamburger, badge, scrollbar) tidak disalin ulang.
- **Perubahan file FAH:**
  - `shared-components.js` — `NAV_GROUPS` + grup Standardized Work; boot melewati `syncFromServer()` + loading bila `<body data-bpms-sync="off">` (halaman SW tidak memakai state FAH).
  - `style.css` — 6 aturan tabel generik (`table`, `thead tr`, `th`, `td`, `tbody tr:last-child td`, `tbody tr:hover td`) dibungkus `:where(body:not(.sw-portal))`. Specificity tidak berubah → halaman FAH identik; di halaman SW aturan itu tidak berlaku (sebelumnya akan menghapus garis bawah baris terakhir tabel TSKK/lembar observasi & menimpa warna sel saat hover).
  - `home.html` — kartu pintasan "Standardized Work".
- **Penyesuaian di `sw/`:**
  - `sw.css`: `:where(.page-body) :where(*) { margin/padding: revert }` (konten SW butuh margin bawaan browser, sedangkan style.css me-reset `*`); `html { font-size: medium }` (ukuran `rem` SW berbasis 16px, style.css memberi html 14px — tanpa ini teks lembar observasi/TSK ±12% lebih kecil).
  - `storage.js`: endpoint `api/sw-state.php`; `initSync()` kini return Promise (selalu resolve, timeout 5 dtk) dan push ke server tidak ditunggu.
  - `app.js`: render view pertama **setelah** `initSync()` (dengan loading overlay FAH) → browser/PC baru langsung menampilkan data server, bukan localStorage kosong.
- **Verifikasi:** headless Chrome, 8 route: 0 error JS, 1 sidebar / 1 hamburger / 1 status, menu aktif benar, data server tertarik ke localStorage kosong. Perbandingan computed style seluruh elemen konten lama vs baru (7 route, 2.613 elemen): 0 beda gaya. 13 halaman FAH dibandingkan dengan style.css lama vs baru (4.330 elemen, seluruh computed style + posisi): 0 beda. Data uji (`data/sw-state.json` dummy) sudah dihapus.
- **Catatan data:** localStorage per origin — data SW lama di portal lama (localhost:3000 / file) tidak otomatis ikut. Pindahkan via **Data Observasi → Export Data** (portal lama) lalu **Import Data** (FAH). Import hanya membawa data observasi (layout TSK, skenario Edit Yamazumi, urutan proses tidak ikut).

### 2026-07-13 (4)
- **capacity-planning.html — fix: LINE(1st)/LINE(2nd) di Database PCS adalah teks bebas** (bukan dropdown terikat ke `dbLine`), jadi bisa diisi "1".."7" ataupun "Line 1".."Line 7" tergantung sumber upload. `computeLineMonthlyMix()` sebelumnya mencocokkan dengan `ASSY_LINES.includes(line)` (strict string match) sehingga entri bergaya "1" tidak pernah ke-mapping ke Assy Line manapun → Weighted Avg CT & Setting Shift auto selalu kosong meski Database PCS & Data Order sudah terisi.
- Fix: fungsi baru `normalizeAssyLine(raw)` — regex `/^(?:line\s*)?0*([1-7])$/i` menormalkan "1", "01", "Line 1", "LINE1", "line 1" dll ke bentuk kanonik `"Line 1"` sebelum dipakai sebagai key agregasi. Nama proses non-Assy (Grid Casting, Wet A, Line MCB, dst) otomatis tidak match (return null), jadi tidak mengganggu proses lain.
- **Catatan untuk nanti**: `calcLVC()` (dipakai LVC Analysis) punya pola pencocokan LINE yang sama (`pcs.line1`/`pcs.line2` dibandingkan ke `dbLine` tanpa normalisasi) — berpotensi kena masalah serupa kalau Database PCS memakai gaya penulisan LINE yang beda dari `dbLine`. Belum diperbaiki karena di luar scope sesi ini.

### 2026-07-13 (3)
- **capacity-planning.html — LvC Assy: "Referensi Kapasitas Terpasang" (section 3 lama) dihapus, digantikan auto-calc di Detail per Line.** Hasil diskusi dengan user: Setting Shift 1/2/3 (pcs/hari) di bagian 2 sekarang **dihitung otomatis** dengan rumus `menit efektif shift ÷ Weighted Average Cycle Time`, bukan input manual lagi:
  - CT (detik/battery) & penugasan Line per model battery diambil dari **Database PCS** (`dbPCS`: `line1/ct1`, `line2/ct2`) — sumber yang sama dipakai `calcLVC()` untuk LVC Analysis.
  - Bobot mix (qty) diambil dari **Data Order** bulan bersangkutan (`state.orders["YYYY-MM"]`), jadi kapasitas per Line otomatis beda tiap bulan mengikuti mix order — sesuai arahan user, bukan angka master statis.
  - Fungsi baru: `computeLineMonthlyMix(period)` (agregasi `Σqty` & `Σqty×CT` per Line dari Data Order, pakai `BPMS.parseItemString`/`BPMS.findPCSMatches`, di-cache per periode via `_mixCache`), `resolveShift(L, key, i, line)` (pilih override manual jika ada, else nilai auto), `lineDailyCapacity()` (s1+s2+s3 auto/override).
  - **Override per sel** tetap didukung: isi angka manual untuk menimpa hasil auto, kosongkan input untuk kembali ke auto (disimpan sebagai `null` di state, bukan 0). Sel auto ditandai visual hijau + italic; override tetap biru seperti input biasa.
  - Header bulan diberi tanda **⚠** (dengan tooltip) kalau ada qty Data Order bulan itu yang tidak match ke Database PCS (`parseItemString` gagal atau `findPCSMatches` kosong) — caveat data quality, bukan error blocking.
  - **Efek berantai:** karena Setting Shift kini akurat, baris **"Setting Capacity" di Ringkasan Bulanan (bagian 1) juga jadi auto-calc** (Σ kapasitas harian seluruh Line), bukan input manual lagi — melengkapi rantai bottom-up: Detail per Line → Setting Capacity → Setting Capacity Normal → Total Setting Capacity → Loading Ratio.
  - Section di halaman berkurang dari 4 jadi 3 (Ringkasan Bulanan → Detail per Line → Perencanaan Group per Skenario). Data 2026 hasil digitalisasi awal (angka asli dari Excel) diperlakukan sebagai **override manual** per sel (bukan auto), karena belum tentu berasal dari mix Data Order bulan itu — auto-calc baru akan "mengambil alih" begitu sel di-kosongkan atau tahun baru dibuat.

### 2026-07-13 (2)
- **Halaman baru: Capacity Planning** (`capacity-planning.html`), sidebar di grup LVC tepat di bawah "Setting Kapasitas". 5 tab: LvC Assy, LvC Charging, LvC Formation, LvC Pasting Casting, LvC Grid Casting — hanya **LvC Assy** yang dibangun sekarang (4 tab lain masih placeholder "dalam pengembangan").
- **LvC Assy** mendigitalkan `LVC Assy.xlsx` (sheet "LvC Assy"), disusun ulang jadi 4 bagian berurutan (bukan sekadar meniru layout Excel yang berserakan):
  1. **Ringkasan Bulanan** — Instal Capacity, Loading Order, Working Days, Group Assy, Setting Capacity (input manual) → Setting Capacity Normal, HOT/DOT (Line-Shift & Battery), Total Setting Capacity, Loading Ratio (**dihitung otomatis** dari bagian 2).
  2. **Detail per Line** (selector Line 1–7) — Setting Shift 1/2/3, HOT (hari/line-shift/battery), DOT (line-shift/battery) per bulan — input asli, sumber roll-up bagian 1.
  3. **Referensi Kapasitas Terpasang** — master kapasitas/shift per Line, Wet A/F, MCB (jarang berubah).
  4. **Perencanaan Group per Skenario** — perbandingan 3 skenario (jumlah group HOT/DOT per proses) + catatan bebas per skenario.
  - Formula terverifikasi manual dari angka asli file (cross-check beberapa bulan): `Setting Capacity Normal = Setting Capacity(pcs/hari) × Working Days ÷ 1000`; `HOT(Line-Shift) = Σ per-Line HOT(Line-Shift)`; `DOT(Line-Shift) = Σ per-Line DOT ÷ 2`; `Total Setting Capacity = Setting Capacity Normal + HOT Battery(x1000) + DOT Battery(x1000)`; `Loading Ratio = Total Setting Capacity ÷ Setting Capacity Normal`.
  - Data 2026 di-seed langsung dari file Excel (`ASSY_SEED_2026`, diekstrak via openpyxl) supaya halaman langsung berisi data asli, bukan kosong. Tahun baru bisa ditambah via tombol "+ Tambah Tahun" (mulai kosong/nol).
  - State baru: `state.capacityPlanning.assy.ref` (master, lintas tahun) dan `state.capacityPlanning.assy.years[tahun].{monthly,lines,scenario}` — tersimpan lewat `BPMS.saveState()` yang sudah ada (tidak perlu ubah `api/state.php`, karena endpoint itu menyimpan JSON apa adanya).
- **shared-components.js** — tambah entri sidebar "Capacity Planning" → `capacity-planning.html`, di grup LVC setelah "Setting Kapasitas".

### 2026-07-13
- **pa-dashboard.html** — Tab **Summary Order** kini punya **filter Tahun** (dropdown "Semua Tahun" + tiap tahun yang ada di data, terbaru dulu) di toolbar tab. Ganti tahun langsung filter ulang ketiga card (category, series, type plate) tanpa fetch ulang ke server — hasil `BPMS.loadProdAggregates` disimpan di variabel `_orderRes` dan difilter secara lokal oleh fungsi baru `renderSummaryOrder()`. Insight caption menyertakan tahun terpilih saat difilter (mis. "... (2025)").
- **shared-components.js** — `prodAggregate` sekarang menyimpan breakdown `series`/`plate` **per tahun** (di `years[y].series` / `years[y].plate`), selain total semua-tahun (`series`/`plate` top-level) — diperlukan agar filter tahun di Summary Order tidak perlu agregasi ulang dari raw rows. Cache key dinaikkan ke `bpms_agg_cache_v4` karena struktur agregat berubah.
- Subtitle card Summary Order "(semua tahun)" dihapus karena sudah tidak selalu benar setelah ada filter tahun.

### 2026-07-10 (4)
- **pa-dashboard.html** — Judul semua card chart dikembalikan statis (deskriptif sesuai data); insight dinamis dipindah ke **caption** di bawah chart (class `.chart-insight`: callout kecil dengan aksen kiri, disembunyikan bila kosong). Helper baru `setInsight(id, html)` dan `trendInsight(points, name, valFmt)` (nilai tahun terakhir + naik/turun % vs tahun sebelumnya). Caption terpasang di 9 chart: 3 parameter (Plate/Battery, Berat Lead/Battery, Berat Lead/Panel — tren YoY), Volume Plate (total + share Casting/Punching tahun terakhir), Assembling (tren YoY), Trend Category (category dominan), dan 3 card Summary Order (dominasi category / series teratas / type plate teratas, masing-masing dengan % dari total).

### 2026-07-10 (3)
- **pa-dashboard.html** — Tab **Summary Order** diisi (menggantikan placeholder). Sumber data (revisi user): **Generated Data Produksi Infor (WO PKAB/PKAS) + Generated Data Produksi BaaN** via agregat terpusat `BPMS.loadProdAggregates` — ikut cache versi, jadi cepat & tidak download dua kali. Dimuat lazy saat tab pertama kali dibuka; tombol Muat Ulang = force refresh. Tiga card horizontal bar (`renderHBarChart`, label kiri + nilai langsung di ujung bar, tanpa axis):
  1. **Qty produksi per category** — DRY/WET/DUC (sum `years[].cat` semua tahun), warna konsisten dengan tab Overview, label qty + persen, action title dinamis.
  2. **Produksi per series battery** — dari agregat `series` (dihitung di prodAggregate), top 10 + "Lainnya" (bar redup).
  3. **Type plate digunakan** — dari agregat `plate` (kode plate = MID(PN Plate, 8, 4) mis. CG87; qty = Qty Plate + dan −), top 10 + Lainnya.
- **shared-components.js** — `prodAggregate` diperluas: kini juga menghasilkan `series` (Battery Type → lookup `prodSeriesLookup` sesuai aturan New JIS: exact → buang padding X → rule terpanjang terkandung → LAINNYA; butuh `new_jis_series_data.js` dimuat di halaman) dan `plate` (type plate → total qty plate). `prodComputeRow` mengembalikan `battType`, `platePos`, `plateNeg`. Return `loadProdAggregates` sekarang `{years, series, plate, meta, ...}`; cache key naik ke `bpms_agg_cache_v3`. `prodBuildLookupMaps` & `prodDB` juga diekspor sebagai `BPMS.buildProdLookupMaps` / `BPMS.prodDB`.
- **resume.html & pa-dashboard.html** — include `<script src="new_jis_series_data.js">` (resume wajib ikut memuat karena bisa jadi halaman pertama yang menghitung cache bersama).

### 2026-07-10 (2)
- **shared-components.js** — Definisi Formation di Resume diubah: filter yang tadinya `Code = 'D'` (kategori DRY) kini memakai **Form Status = 'FOPL'** per sisi — Formation Pos = SUM Qty Plate (+) dengan Form Status (+) = FOPL; Formation Neg = SUM Qty Plate (−) dengan Form Status (−) = FOPL. Berlaku untuk Infor (formStatus diturunkan dari segmen ke-2 PN Plate di `prodComputeRow`) maupun BaaN (kolom Form Status (+)/(−) langsung). Key cache agregat dinaikkan ke `bpms_agg_cache_v2` agar hasil hitung lama otomatis diabaikan.

### 2026-07-10
- **Optimasi performa Resume & Dashboard PA** — kedua halaman tidak lagi men-download & menghitung ulang seluruh data setiap kali dibuka:
  - **api/produksi-infor.php, api/produksi-baan.php** — response GET list kini menyertakan `version` = `maxFilemtime-jumlahFile` (delete juga terdeteksi). **api/state.php** — endpoint baru `GET ?version=1` mengembalikan filemtime state.json (murah, untuk deteksi perubahan Database Konversi).
  - **shared-components.js** — modul baru `BPMS.loadProdAggregates({force})`: (1) cek versi gabungan Infor|BaaN|state ke server (3 request kecil); (2) versi sama → pakai agregat dari localStorage (`bpms_agg_cache_v1`) — instan; (3) versi beda / force → download semua periode, agregasi **single-pass** (`prodAggregate`), simpan agregat+versi ke localStorage & raw rows ke IndexedDB; (4) server mati → cache localStorage apa pun yang ada, atau hitung dari IndexedDB. Berisi salinan terpusat: prodDB (IndexedDB), prodBuildLookupMaps, prodComputeRow (dengan fix category dari itemBattery), prodAggregate. Struktur agregat per tahun: `{asm, gcPos, gcNeg, gpPos, gpNeg, bmPos, bmNeg, fmPos, fmNeg, cat:{DRY,WET,DUC}}`.
  - **resume.html** — loadResumeData ditulis ulang memakai loader terpusat; 8+ loop `computeGenPiRow` per baris diganti agregat siap pakai (file menyusut 827→±400 baris). Status bar menampilkan "· dari cache" / "· cache (server tidak terjangkau)". Tombol Muat Ulang = force refresh (bypass cache) + reset class has-data.
  - **pa-dashboard.html** — loadDashboard ditulis ulang memakai loader terpusat, turunan (plateBattery dll.) dihitung dari agregat bersama (file menyusut 1141→±850 baris). Tombol Muat Ulang = force refresh. Sinkronisasi multi-device tetap terjaga: upload/hapus data dari device mana pun mengubah versi server → halaman otomatis mengambil data segar.
- **Responsif** — pa-dashboard: grid `minmax(min(Npx,100%),1fr)` agar tidak overflow di layar sempit + toolbar wrap ≤640px; resume: toolbar wrap. Fondasi mobile global (sidebar off-canvas + hamburger ≤768px) sudah ada di style.css.

### 2026-07-09 (2)
- **Fix Category WET selalu 0** — Root cause: category dibaca dari `item.charAt(4)` item Infor MENTAH, padahal per conversion-rules.md category = karakter ke-3 prefix **PN Battery** (item hasil konversi char[0] W→F, char[4]→W). Item berawalan `W-` (WET) mentahnya berkarakter `U` di posisi 4 sehingga salah terhitung DUC. Fix: category kini dihitung dari `itemBattery.charAt(4)` setelah konversi. Diterapkan di **data-produksi-infor.html** (kolom Category di Generated Data ikut terkoreksi — item W- yang dulu tampil DUC kini WET) dan **pa-dashboard.html** (`computeGenPiRow` mengembalikan `category`, `computeYearData` memakainya). Field `code` (dipakai filter Formation) sengaja tidak diubah.
- **pa-dashboard.html** — Card "Trend produksi per category" diubah jadi setengah lebar (sama dengan card Volume Plate), posisi kiri, slot kanan sengaja dikosongkan (placeholder div di pa-grid-2).

### 2026-07-09
- **pa-dashboard.html** — Tab Overview: card baru "Trend produksi per category" (DRY / WET / DUC). Fungsi `renderMultiLineChart()` ditambahkan: line chart 3 seri baseline nol, label category langsung di ujung garis (dengan anti-tabrakan), legend, crosshair + tooltip berisi ketiga seri per tahun. Sumber data: Qty Produksi Infor (filter WO PKAB/PKAS, category dari `CAT_MAP[g.code]` D/W/U → DRY/WET/DUC) + BaaN (field `category` langsung, fallback `code`), diakumulasi di `computeYearData` sebagai `a.cat`. Judul card dinamis (action title): "X mendominasi produksi: NN% di YYYY". Warna: DRY biru #2a78d6, WET aqua #1baf7a, DUC amber #eda100 (`--series-3` baru). Desain mengikuti pedoman "Storytelling with Data".

### 2026-07-08
- **pa-dashboard.html** — Dashboard Parameter Asumsi v1 dibangun (menggantikan stub). Sumber data & logika agregasi identik dengan `resume.html` (Infor via computeGenPiRow + filter WO PKAB/PKAS, BaaN field langsung tanpa filter WO, server-first → IndexedDB fallback). Isi: (1) 4 KPI card — Plate/Battery, Berat Lead/Battery, Berat Lead/Panel, Assembling — nilai tahun terakhir + delta % vs tahun sebelumnya + sparkline; (2) 3 line chart small-multiples tren parameter per tahun (crosshair + tooltip); (3) stacked bar Volume Plate per Tahun (Grid Casting vs Grid Punching, legend + tooltip + label total di tahun max & terakhir); (4) column chart Assembling per Tahun. Chart inline SVG vanilla JS (tanpa library), palet biru #2a78d6 / aqua #1baf7a. Tombol Muat Ulang + status record count + link ke tabel Resume.
- **data-produksi-baan.html** — Fix: hapus pemanggilan `DOMContentLoaded → pageInit` manual; `shared-components.js` sudah memanggil `pageInit()` otomatis setelah sync server, sehingga sebelumnya event listener terpasang dobel (upload/commit bisa terpicu 2×).
- **pa-dashboard.html** — Fix skala chart: (1) `niceTicks` kini menjamin tick teratas ≥ nilai maksimum (sebelumnya garis/bar menembus gridline teratas, mis. 4,8 terpotong di tick 4); (2) line chart parameter pakai `niceDomain` min–max data (bukan baseline nol) sehingga variasi garis terlihat, jumlah desimal tick otomatis dari step; (3) area wash dihapus (menyesatkan pada domain terpotong); (4) column chart pakai 5 tick agar step lebih halus; (5) step sumbu Y line chart dibatasi maks 3 desimal (step 2,5× dibuang bila butuh 4 digit, mis. 0,0025 → 0,005) + margin kiri 40→46px agar label tidak terpotong.
- **pa-dashboard.html** — Tab bar ditambahkan (pola `pi-tabs` sama dengan data-produksi-infor.html): "Overview" (konten dashboard existing), "Summary Order", "Loading per Proses", "Capacity Dashboard" (3 tab terakhir masih placeholder empty-state, konten menyusul).

### 2026-07-07
- **data-produksi-baan.html** — Redesign penuh (v2). Tab "Data Produksi" dihapus. Upload sekarang langsung membaca format **Generated Data 20 kolom** (Date, Year, WO, Code, Category, Item Battery, Item Assy, Qty Produksi, Code Battery, Battery Type, Plate Positif, Form Status (+), Grid Process (+), Qty Plate (+), Pule (+), Plate Negatif, Form Status (-), Grid Process (-), Qty Plate (-), Pule (-)). Tidak ada komputasi dari raw data — data disimpan dan ditampilkan as-is. Deteksi periode dari kolom Date (Excel serial → DD/MM/YYYY via SheetJS cellDates:true). Stat cards: Total Record, Total Qty Produksi, Unique Code Battery, Total Qty Plate. Preview 200 baris sebelum simpan. Export langsung kolom stored data. Semua logika komputasi (computeGenPiRow, buildLookupMapsPI, puleKeyPI, dll) dihapus. Storage pattern identik dengan Infor: memory cache → IndexedDB → server. Tombol "Hapus Periode" / "Hapus Semua Periode" toggle sesuai pilihan periode (updateDeleteButtons). deleteAllPeriods() ditambahkan.
- **resume.html** — Kolom Resume Produksi: Plate/battery, Berat lead/battery, Berat lead/panel, 6 baris Battery. Data sekarang gabungan Infor + BaaN: `PiBaanDB` + `loadBaanRows()` ditambahkan. BaaN menggunakan field langsung (tidak melalui computeGenPiRow), tanpa filter WO. Setelah Infor accumulator dibangun, BaaN di-merge ke map yang sama, lalu semua cell di-refill dengan nilai gabungan. Status bar menampilkan jumlah record dari kedua sumber. Tabel dipadatkan agar tidak scroll horizontal saat sidebar terbuka: font 12.5→11.5px, padding sel 5×10→3×6, kolom Proses 170→130px, Sub 80→58px, Satuan 65→46px, kolom tahun 100→66px, padding wrapper 24→12px (offset sticky ikut disesuaikan).
- **data-produksi-infor.html** — Kolom Generated: Category, Battery Type, Form Status (+), Form Status (-) ditambahkan. Fallback Grid Process dari PN jika typeMap tidak ada. Plateap key difix ke codeBattery (bukan itemDataInfor). Card UNMAPPED ditambahkan.

### 2026-06-30
- **api/orders.php** — API baru untuk Data Order, identik pola dengan `api/produksi-infor.php`. Endpoint: GET (list periods), GET `?period=YYYY-MM` (data), POST `{period, data}` (save), DELETE `?period=YYYY-MM` (hapus). Simpan di `data/orders/YYYY-MM.json`. Direktori dibuat otomatis jika belum ada.
- **data-produksi-infor.html** — Migrasi ke **server-side JSON** sebagai primary storage. `populatePeriods()` → GET `api/produksi-infor.php`, fallback IndexedDB. `loadPeriodData()` → memory cache → IndexedDB → GET server, save ke IndexedDB. `commitUpload()` → POST server + simpan IndexedDB, toast beda jika offline. `deletePeriod()` → DELETE server + hapus IndexedDB. Data kini tersinkron antar device.
- **data-order.html** — Migrasi ke **server-side JSON** sebagai primary storage. `pageInit()` → GET `api/orders.php` untuk period list, tiap period: cek IndexedDB dulu lalu fetch server. `commitUpload()` → POST server + simpan IndexedDB. `deletePeriod()` → DELETE server + hapus IndexedDB. `deleteOrder()` → POST server (overwrite) + simpan IndexedDB. Toast beda jika server tidak terjangkau.
- **shared-components.js** — Grup navigasi diubah: tambah grup **Database** (pindahkan Database PCS + Database Konversi dari LVC). Urutan grup: Database → LVC → Parameter Asumsi.
- **resume.html** — Kolom WO ditambahkan ke `computeGenPiRow()`. Baris Assembling: SUM Qty Produksi di Generated Data per Year, filter WO = PKAB/PKAS. Baris Grid Casting Pos: SUM Qty Plate (+) filter Grid Process (+) = Grid Casting + WO PKAB/PKAS. Grid Casting Neg: SUM Qty Plate (-) filter Grid Process (-) = Grid Casting + WO PKAB/PKAS. Grid Casting Total = Pos + Neg.

### 2026-06-30 (3)
- **resume.html** — Fix: data berbeda antar device karena `loadResumeData()` hanya membaca IndexedDB (device-local). Ditambahkan `PiDB.setData()` dan logika server-first: periode diambil dari `api/produksi-infor.php`, tiap periode cek IndexedDB dulu, jika kosong fetch dari server lalu cache ke IndexedDB. Sekarang semua device mendapat data yang sama dari server.

### 2026-06-30 (2)
- **data-produksi-baan.html** — Halaman penuh dibangun (menggantikan stub). Struktur identik dengan `data-produksi-infor.html`: 3 tab (Data Produksi, Generated Data Produksi BaaN, Summary per Line), upload Excel dengan deteksi periode otomatis, filter kolom, stat cards, chunked rendering, export Raw/Generated/Summary. IndexedDB: `bpms_produksi_baan`. Server API: `api/produksi-baan.php`. Kolom Generated sama dengan Infor (shared logic: `computeGenPiRow`, `buildLookupMapsPI`). Siap disesuaikan per kebutuhan BaaN.
- **api/produksi-baan.php** — API baru, identik pola dengan `api/produksi-infor.php`. Simpan di `data/produksi-baan/YYYY-MM.json`.

### 2026-06-29 (3)
- **resume.html** — Halaman Resume dibangun dari `Tabel Resume.xlsx`. Tabel tahun (2013–2025) sebagai kolom, dan baris-baris proses: Plate/battery, Berat lead/battery, Berat lead/panel, Assembling, Grid Casting (Pos/Neg/Total/Battery), Grid Punching, Ball Mill, Pasting Casting, Pasting Punching, Formation, Asam Sulfat. Data dikosongkan dulu (—). Sticky header + sticky 3 kolom kiri (Proses, Sub, Satuan). Export Excel via SheetJS.

### 2026-06-29 (2)
- **data-produksi-infor.html** — Tab "Generated Data Produksi Infor" diimplementasikan penuh dan **terverifikasi** oleh user. 16 kolom: No, Date, Year, Code, Item Battery, Item Assy, Qty Produksi, Code Battery, Plate Positif, Grid Process (+), Qty Plate (+), Pule (+), Plate Negatif, Grid Process (-), Qty Plate (-), Pule (-). Logika: Item Assy = field Item (raw); Item Battery = Item Assy dengan char[0]→'F' dan char[4]→'W' jika diawali 'W'; Code Battery = MID(itemBattery, 3, 17). Lookup dari Database Konversi (dbPlateInfor, dbTypePlate, dbPuLe) via `buildLookupMapsPI()` + `computeGenPiRow()`. Export ke `FAH_ProduksiInfor_Generated_YYYY-MM.xlsx`.

### 2026-06-29
- **api/produksi-infor.php** — API opsional untuk backup ke server (jika PHP berjalan). Data disimpan di `data/produksi-infor/YYYY-MM.json` per periode.
- **data-produksi-infor.html** — Refactor arsitektur penyimpanan ke **IndexedDB** (`bpms_produksi_infor` DB, store `periods`). Tidak butuh server PHP, tidak ada size limit. `PiDB` singleton (wrap IndexedDB API jadi Promise-based): `getPeriods()`, `getData(period)`, `setData(period, rows)`, `deleteData(period)`. `_piCache` sebagai in-memory cache atas IndexedDB. `commitUpload()` → `PiDB.setData()`, `populatePeriods()` → `PiDB.getPeriods()`, `deletePeriod()` → `PiDB.deleteData()`, `loadPeriodData()` → `PiDB.getData()`. `pageInit()` async. Date parsing: `cellDates: true` + `normalizeTrxDate()` (Date object / serial / string → "DD/MM/YYYY").

### 2026-06-26 (5)
- **data-produksi-infor.html** — Fix bug "Tidak ada data valid untuk disimpan": SheetJS membaca date cell Excel sebagai serial number (angka) bukan string. Tambah `cellDates: true` ke `XLSX.read`. Tambah `normalizeTrxDate()` yang menangani Date object, serial number (via `XLSX.SSF.parse_date_code`), dan string, semuanya dikonversi ke format "DD/MM/YYYY" sebelum disimpan ke state.

### 2026-06-26 (4)
- **data-produksi-infor.html** — Upload modal disederhanakan: hapus pilihan Bulan/Tahun. Periode kini dideteksi otomatis dari kolom `Trx. Date` (format DD/MM/YYYY). Data dari file yang mencakup banyak bulan (mis. FY2025) otomatis digroup per periode dan disimpan ke masing-masing `produksiInfor['YYYY-MM']`. Preview menampilkan badge periode yang terdeteksi + jumlah record per periode.

### 2026-06-26 (3)
- **data-produksi-infor.html** — Kolom tabel disesuaikan dengan struktur aktual Excel Infor (15 kolom: Trx. Date, Trx. Time, WH, Trx Number, Order No, Transaction Type, Line, Item, Item Descriptions, Lot No, Model, Qty, Information, User, ResCode). HEADER_MAP diupdate. Stats diubah menjadi Total Record / Total Qty / Line Aktif / Unique Item. Render chunked (500 baris/frame) untuk performa file besar (49k baris). Filter tersedia pada kolom: Trx. Date, WH, Transaction Type, Line, Model, User.

### 2026-06-26 (2)
- **data-produksi-infor.html** — Halaman penuh (menggantikan stub): upload Excel via modal bulan/tahun + drag-drop, state key `produksiInfor` per periode, 2 tab (Data Produksi + Summary per Line), kolom filter pada header tabel, stats cards (Total Record, Qty Plan, Qty Aktual, Achievement %), achievement bar grafik, export Raw + export Summary ke Excel (SheetJS).
- **shared-components.js** — Tambah `produksiInfor: {}` ke `DEFAULT_STATE`.

### 2026-06-26
- **shared-components.js** — `NAV_ITEMS` dipecah menjadi `NAV_HOME` + `NAV_GROUPS`. Sidebar kini menampilkan dua kelompok: **LVC** (Dashboard, Database PCS, Database Konversi, Data Order, Setting Kapasitas, LVC Analysis, Man Power) dan **Parameter Asumsi** (Dashboard, Resume, Data Produksi Infor, Data Produksi BaaN). `renderSidebar()` diupdate agar merender section label per grup.
- **pa-dashboard.html** — Stub halaman Dashboard grup Parameter Asumsi (placeholder, dalam pengembangan).
- **resume.html** — Stub halaman Resume grup Parameter Asumsi.
- **data-produksi-infor.html** — Stub halaman Data Produksi Infor grup Parameter Asumsi.
- **data-produksi-baan.html** — Stub halaman Data Produksi BaaN grup Parameter Asumsi.

### 2026-06-11
- **lvc-analysis.html** — Card Assembling: `installedCap` tidak lagi dari `getCapacityHours` melainkan dari `state.processCapacity` (Setting Kapasitas → Process Capacity). Untuk setiap bulan, installed capacity dihitung sebagai total dari Line 1–7: `speed × (eff/100) × (435+405+370) × installedMachine × workdays`. Tambah property `installedCapLineRange: [1, 7]` pada proc config Assembling; `calcMonthData` menggunakan path baru jika property ini ada. Unit badge header diubah dari `Jam/Bln` → `pcs/Bln`. Sidebar stat Σ CAP unit label diubah dari hardcoded `Jam` menjadi dinamis (`loadUnit`) agar konsisten dengan unit loading.

### 2026-05-05
- **shared-components.js** — `HOLIDAYS_2026` diperbarui sesuai Kalender Kerja 2026 PT Century: Libur Nasional (Isra Mi'raj 16 Jan, Imlek 17 Feb, Nyepi 19 Mar, Idul Fitri 21-22 Mar, Wafat 3 Apr, Paskah 5 Apr, Idul Adha 27 Mei, Waisak 31 Mei, Tahun Baru Islam 16 Jun, Maulid Nabi 25 Agu) + Cuti Bersama (5 tanggal) + Libur dengan Penggantian (7 tanggal). Tambah `WORKING_DAYS_2026` (7 Sabtu kerja pengganti Jan-Agu). `initCalendarForPeriod` diupdate agar hari kerja pengganti diinisialisasi ON.
- **setting-capacity.html** — Kalender Kerja: redesign UI lengkap — header dengan badge "Hari ON: N", legend chips berwarna, grid hari dengan kode warna per kategori (ON hijau, OFF abu dashed, Libur Nasional merah, Cuti Bersama kuning, Libur Penggantian oranye, Kerja Pengganti hijau tua), titik indikator di pojok kanan atas tiap hari istimewa, panel keterangan kanan dengan daftar hari istimewa + badge ON/OFF. Outer grid diubah 1fr:1fr → 3fr:2fr untuk memberikan ruang lebih ke kalender.
- **setting-capacity.html** — Kalender: tambah class `work-replace` (hijau) untuk Sabtu hari kerja pengganti; legend kalender ditambah item "Kerja Pengganti".
- **setting-capacity.html** — Period selector disederhanakan: hapus inline `<input type="month">`, ganti dengan tombol "+ Tambah Periode" yang membuka modal popup (Bulan dropdown + Tahun input ▲▼) sama seperti Data Order. Label dropdown hanya nama bulan tanpa suffix YYYY-MM.
- **setting-capacity.html** — Process Capacity: baris "Formation" hanya aktif di Shift 1 — Kapasitas/Shift 2 & 3 ditampilkan `—` (abu-abu, non-interaktif), input Qty Machine S2 & S3 disabled. Kalkulasi Installed Capacity dan Capacity/day otomatis menggunakan c2=c3=0 untuk Formation.
- **setting-capacity.html** — Tabel Process Capacity: auto-save ketika fokus berpindah keluar tabel (`focusout` pada `#pcTable`, cek `relatedTarget` tidak di dalam tabel → `BPMS.saveState()` silent tanpa toast/loading).
- **setting-capacity.html** — Tabel Process Capacity: tambah 2 kolom baru di antara Kapasitas/Shift dan Qty Machine. (1) "Installed Machine (unit)" — input manual per baris, disimpan ke field `installedMachine` di state. (2) "Installed Capacity" — kalkulasi otomatis Kap/Shift1 + Kap/Shift2 + Kap/Shift3. `syncProcessCapacity` dan `addPCRow` diupdate untuk field baru; `updatePC` refresh sel Installed Capacity via class `pc-inst-cap`; `savePeriod` indeks input digeser +1.
- **lvc-analysis.html** — Card Formation: ganti label loading menjadi "Loading (panel)", unit "panel". Logic: sum (Qty Plate Positif + Qty Plate Negatif) × Qty Produksi dari semua order di bulan tersebut yang Spec Code = 'D'. Tambah helper `buildPlateMap()` (baca `dbPlateInfor` dari state, lookup by "Item Data Infor" key). Config proc: `loadQtyFrom: 'formationPanel'`, `qtyOnly: true`, `loadLabelText`, `loadUnitText`. `renderProcessCard` diupdate: `useQty` juga true bila `proc.loadQtyFrom` ada; gunakan `proc.loadLabelText`/`loadUnitText` jika di-set.
- **data-order.html** — Fix tab "Data Order" tidak menampilkan data: tambah `renderOrders()` di handler klik tab `data-order`, dan panggil `renderOrders()` di `pageInit()` bersama `renderResume()` agar stat cards terisi saat halaman dibuka.
- **data-order.html** — Auto-load periode terbaru saat halaman dibuka: `pageInit()` cari period dengan data terbaru dari `orders`, set ke `sel.value` dan `currentPeriod`, lalu render semua panel.
- **data-order.html** — Tambah filter kolom pada header tabel Generated Data Order (pola sama dengan filter Database PCS). Kolom yang bisa difilter: Periode, Tech, Separator, Battery Type, Plate, 1st Line, 2nd Line, Grid Process Plate Positif, Grid Process Plate Negatif. State terpisah: `genColFilters` + `activeGenKey`. Fungsi baru: `getGenCellValue`, `openGenFilter`, `closeGenFilter`.

### 2026-05-03
- **PRD.md** — Nama project diubah dari "Battery Production Management System (BPMS)" menjadi "Factory Analytics Hub (FAH)" di header dan overview.
- **shared-components.js** — Tambah `resumeMB: {}` ke DEFAULT_STATE untuk menyimpan nilai MB per periode per grup di Resume Order.
- **data-order.html** — Kolom "Type" diubah nama menjadi "Dry DUC Wet"; parsing data diambil dari header Excel dengan fallback ke kolom J (index 9) jika header tidak ditemukan.
- **data-order.html** — Tambah tab "Resume Order" sebagai tab paling kiri (default). Tab sekarang: Resume Order | Data Order | Generated Data Order.
- **data-order.html** — Implementasi tabel Resume Order: grouping Customer (dari Sold To) ke 8 grup (AOP International, AOP Domestic, Bina Pertiwi, ADM, Others, MCB Domestic, e-Bike, Lithium) via regex `RESUME_GROUP_DEF`. Kolom: No, Group, Customer, D, U, W, Lithium, Total Qty, MB (editable), % (inline update).
- **data-order.html** — SUMIF per kolom Dry DUC Wet (D/U/W), kolom Lithium mengambil nilai 'P'. Subtotal per kategori (Total AMB, Total MCB, Total e-Bike, Total Lithium) + Grand Total baris paling bawah.
- **data-order.html** — MB input: manual per-periode, disimpan ke `state.resumeMB[period][group]`. Kolom % update inline tanpa re-render.
- **data-order.html** — Customer uncategorized yang punya qty Lithium > 0 otomatis masuk grup Lithium.
- **data-order.html** — Stat cards: hanya card "Unmapped" dan "PN NOT FOUND" yang bisa diklik (popup). Card "PN NOT FOUND" menghitung ITEM dengan panjang < 27 digit.
- **data-order.html** — `<colgroup>` untuk lebar kolom tabel Resume Order (konsisten dengan rowspan). Kolom D/U/W/Lithium dibuat sama lebar (92px).
- **lvc-analysis.html** — **Redesign lengkap**: ganti chart single-period menjadi 8 kartu proses tahun (year view). Urutan proses: Charging → Assembling → Formation → Pasting Punching → Pasting Casting → Ball Mill → Grid Punching → Grid Casting.
- **lvc-analysis.html** — Tiap kartu: sidebar stat (Σ LOAD, Σ CAP, AVG UTIL) + SVG bar+line chart 12 bulan + tabel data (5 baris × 12 kolom). Bar berwarna berdasarkan utilisasi (hijau <85%, oranye 85-100%, merah 100-120%, merah tua >120%). 3 garis kapasitas: Installed (solid hitam), 2OT (dash biru), 4OT (dot navy).
- **lvc-analysis.html** — Year selector menggantikan period selector. Export Excel per-proses ke sheet terpisah.

### 2026-04-28
- **Rebranding** — Nama portal diubah dari BPMS menjadi **Factory Analytics Hub** (FAH). Semua `<title>`, sidebar branding, prefix file export (`BPMS_` → `FAH_`), logo sidebar diganti PNG `Logo FAH.png`. Object JS `BPMS` tidak diubah.
- **home.html** — Halaman Home baru: logo FAH besar + brand text + slogan + quick-nav cards. Layout card putih dengan logo kiri dan teks kanan.
- **dashboard.html** — Konten dashboard dipindahkan dari `index.html` ke `dashboard.html`.
- **index.html** — Diubah menjadi redirect otomatis ke `home.html`.
- **shared-components.js** — NAV_ITEMS: tambah "Home" di posisi paling atas (href: home.html), "Dashboard" diupdate href ke `dashboard.html`. Sidebar logo: `<img src="Logo FAH.png">`.
- **style.css** — `.sidebar-logo` diubah ke image display (hapus background biru, set object-fit: contain, 36×36px).
- **data-order.html** — `buildLookupMaps()` diubah ke named-column lookup: tambah helper `findColKey(rowSample, ...patterns)` (case-insensitive, partial match, fallback positional). `dbPlateInfor` kini lookup by kolom "Item Data Infor" → return `{ pnPos, qtyPos, pnNeg, qtyNeg }`. `dbTypePlate` lookup by "Code"→"Grid Process". `dbPuLe` lookup by "PN"→"Qty PuLe". `computeGenRow()` diupdate ke object destructuring (`pv.pnPos`, `pv.qtyPos`, dll) menggantikan array indexing.


- **.gitignore** — Tambah file gitignore: exclude `api/state.json`, `data/`, OS files, editor files, node_modules.
- **shared-components.js** — Tambah menu "Database Konversi" di NAV_ITEMS, posisi setelah Database PCS.
- **database-konversi.html** — Tiap panel kini punya action bar (jumlah entri, search, Upload, Export Excel, Hapus Semua) + tabel generik yang membaca kolom otomatis dari Excel yang diupload. State keys: `dbPlateInfor`, `dbPuLe`, `dbTypePlate`, `dbRate`.
- **man-power.html** — Tambah border & rounded corner per grup tabel (`.mp-group-wrap`); label total diubah dari `(total MP) X` menjadi `X MP`.
- **man-power.html** — Redesign total: ganti tabel Std/Loader/QC dengan 10 kelompok tabel (Assembling, Wet Battery, Formation, Pasting, Mixing, Ball Mill, Grid Casting, Grid Punching, Wide Strip, Lithium). Tiap kelompok: header biru + kolom MP Shift 1/2/3 (input manual) + Total (auto-calc) + (total MP) grand total per grup. Grand total semua grup ditampilkan di bar atas. State baru: `mpGroups` (global, tidak per periode).
- **data-order.html** — Panel "Generated Data Order" diimplementasikan penuh: tabel 21 kolom (Periode, PN Customer, ITEM, Qty Produksi, Spec Code, Tech, Separator, Battery Type, Plate, 1st/2nd Line, Item Data Infor, PN Plate Positif/Negatif, Grid Process Pos/Neg, Qty Plate Pos/Neg, Qty Pule Pos/Neg). Lookup dari dbPlateInfor (by position B:C:D:E:F), dbTypePlate (MID(pn,8,4)→col D), dbPuLe (puleKey logic + col E). Export Generated Data menghasilkan semua kolom.
- **data-order.html** — Tambah tab navigation: "Data Order" dan "Generated Data Order". Kedua tab menampilkan konten yang sama saat ini; struktur siap dipisah nanti.
- **data-order.html** — Pecah tombol Export menjadi 2: "Export Raw Data Order" (kolom asli Excel saja) dan "Export Generated Data" (+ Tech, Separator, Battery Type, Plate, 1st Line, 2nd Line). Keduanya support mode Semua Periode (tambah kolom Periode otomatis).
- **data-order.html** — Tambah filter kolom ITEM di header tabel orders.
- **data-order.html** — Fix filter dropdown bocor keluar kotak: ubah `display: block` → `display: flex` agar flex layout aktif dan filter-list ter-clip di dalam kotak.
- **data-order.html** — Rapikan posisi & ukuran filter dropdown: snap ke kiri edge `<th>` (bukan icon span), min-width mengikuti lebar kolom, max-width 340px, `text-overflow: ellipsis` pada item panjang, max-height 300px.
- **data-order.html** — Tambah 3 fungsi filter kolom yang sebelumnya hilang: `getOrderValue(row, key)` (lookup nilai per key), `openOrderFilter(key, triggerEl)` (buka dropdown dengan nilai unik + checkbox), `closeOrderFilter()` (simpan state filter, tutup dropdown). Fitur filter kolom di tabel orders sekarang fully functional.
- **data-order.html** — Kolom No diubah dari nomor asal Excel menjadi nomor urut baris yang ditampilkan (1, 2, 3...). Berlaku di tabel orders dan preview panel.
- **data-order.html** — Kolom Aksi (tombol hapus per baris) dihapus dari tabel orders.
- **data-order.html** — Tambah 4 **stat card** di atas tabel: Total Item, Total Qty Order, Line Aktif, Unmapped (merah jika ada order tak terpetakan ke PCS, hijau jika semua terpetakan).
- **data-order.html** — Tambah kolom **1st Line** dan **2nd Line** di paling kanan. Diisi dari lookup `findPCSMatches()` ke database PCS berdasarkan Battery Type hasil parsing ITEM. Berlaku di tabel orders dan preview panel. Tampil sebagai badge kuning (grup kalkulasi).
- **data-order.html** — Tambah warna pembeda kolom: data asli Excel (putih) vs hasil parsing ITEM (kuning muda `#fefce8`). Berlaku di tabel orders dan preview panel. Tambah legend warna di atas tabel.
- **data-order.html** — Tabel orders dibuat compact seperti PCS: `table-layout: auto`, font 12px, padding 5px 10px, sticky header, scrollable container `height: calc(100vh - 212px)`.
- **data-order.html** — Dropdown periode diubah ke format `"Mei 2026"` (tanpa kode YYYY-MM). Default option: `"-- Semua Periode --"`. Saat Semua Periode dipilih, semua order dari semua periode digabungkan dan kolom Periode muncul di kiri.
- **shared-components.js** — `formatPeriod()` diupdate ke nama bulan Indonesia: Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des.
- **data-order.html** — Upload zone besar diganti tombol kecil "Upload Data Order". Klik tombol membuka modal popup berisi: dropdown Bulan (Januari–Desember) + input Tahun dengan tombol ▲▼ (+/-1 tahun per klik), dan drop zone upload file Excel.

### Sebelum 2026-04-28
- **database-pcs.html** — Tambah tombol Edit (ikon pensil) di kolom Aksi. Klik buka modal form edit semua field: Model, Group, Battery Type, Plate, Separator, Spacer, LINE(1st), CT(1st), Bottleneck(1st), LINE(2nd), CT(2nd), Bottleneck(2nd).
- **database-pcs.html** — Header kolom diubah ke nama penuh: Model, Group, Plate, Separator, Spacer, Batt/H, Total (tidak disingkat).
- **database-pcs.html** — Semua lebar kolom diubah ke `table-layout: auto` (auto-fit sesuai konten).
- **database-pcs.html** — Font diperbesar: data 12px, header 11px, padding diperlebar ke 10px horizontal.
- **database-pcs.html** — Warna header solid (tidak transparan): Spesifikasi `#f0f2f5`, 1st Process `#e9ebf8`, 2nd Process `#e6f4ec`.
- **database-pcs.html** — Sticky header dengan dua baris: row 1 = group (Spesifikasi / 1st Process / 2nd Process), row 2 = nama kolom. Container `height: calc(100vh - 152px)` agar header freeze saat scroll.
- **database-pcs.html** — Import Excel diubah: baca dari baris ke-3 (A3) dengan mapping posisi kolom A–L (tidak lagi bergantung nama header). `header: 1` + `.slice(2)`.
- **database-pcs.html** — Tabel 23 kolom diubah ke layout compact 2-row grouped header dengan `table-layout: fixed` lalu `auto`. Kolom data diberi alignment & warna tint per grup.
- **database-pcs.html** — Upload zone besar diganti tombol kecil. Drag & drop tetap berfungsi di area halaman.
- **style.css** — Tema diubah dari gelap ke terang (light theme): `--bg-0:#f0f2f5`, `--bg-1:#ffffff`, aksen `#5e6ad2`.
- **style.css** — Sidebar: full-height, status server (online/offline) di footer, collapsed state bisa diklik untuk expand.
- **shared-components.js** — `initServerStatus()`: polling status server setiap 30 detik via `api/state.php?ping=1`.

---

## Struktur State (localStorage + state.json)

```
{
  dbLine:       [...],          // Line 1–7
  dbPCS:        [...],          // Master PCS (Battery Type → LINE + CT)
  orders:       { "YYYY-MM": [...] },
  capacity:     { "YYYY-MM": { "Line N": { s1, s2, s3 } } },
  workCalendar: { "YYYY-MM": { "YYYY-MM-DD": true/false } },
  mpParams:     { "Line N": { std, loader, qc } }
}
```

---

## Logika Kritis

| Fungsi | Lokasi | Keterangan |
|---|---|---|
| `parseItemString(item)` | `shared-components.js` | Parsing ITEM string berdasarkan index karakter statis (PRD §4.3) |
| `calcLVC(period)` | `shared-components.js` | Hitung Loading vs Capacity per LINE |
| `calcPCSFields(ct)` | `shared-components.js` | Auto-calc: Batt/H, S1, S2, S3, Total dari CT |
| `formatPeriod(p)` | `shared-components.js` | Format "YYYY-MM" → "Apr 2026" (nama bulan Indonesia) |
| Import PCS | `database-pcs.html` | Baca dari baris ke-3 (A3:L), mapping posisi kolom |
| Import Order | `data-order.html` | Baca header dari baris pertama, parsing ITEM otomatis |
| `obswMode(samples)` | `sw/app.js` | **CT Modus (SW, tidak boleh diubah):** ada nilai berulang → modus (terkecil bila seri); semua unik → nilai ke-2 terkecil (0 efektif menempati urutan ke-1); 0 tidak pernah jadi hasil; bila 0 lebih banyak dari frekuensi non-zero tertinggi → 0 dihitung 1 kali |
| `buildTskkRows` | `sw/app.js` | Mapping kategori observasi → kolom TSKK: Value/Non Value/Irregular → Manual, Machine → Auto, Walking → Walking |
| `initTskpPage` → `capacityOf` | `sw/app.js` | TSKP: Manual = MAN + JALAN, Auto = Machine, TTC = Manual + Auto; kapasitas/shift = floor(menit shift × 60 ÷ (TTC + Time Taken ÷ No Changed)) |
| Data flow SW | `sw/` | Lembar Observasi → Data Observasi (revisi per Line/Type/Proses) → TSKK/TSK/TSKP → Yamazumi; state di localStorage `standardized_work_app_v1` + `data/sw-state.json` (yang `meta.updatedAt` lebih baru menang) |

---

## Known Issues / TODO

- [x] Halaman LVC: redesign selesai — year-based process cards dengan SVG chart
- [ ] Export Excel semua halaman: belum ditest setelah refactor tabel
- [ ] `setting-capacity.html` & `man-power.html`: dropdown periode masih pakai format lama (ada kode YYYY-MM) — perlu diseragamkan
