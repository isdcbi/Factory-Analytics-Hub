# Product Requirements Document (PRD)
**Project Name:** Factory Analytics Hub (FAH) v1.0
**Document Version:** 1.0

## 1. Product Overview
Factory Analytics Hub (FAH) adalah aplikasi *Multi Page Application* (MPA) internal berbasis web yang dirancang untuk mengelola, menganalisis, dan memvisualisasikan data produksi baterai. Sistem ini menyelaraskan data *Order/Loading* bulanan dengan Master Data Kapasitas Mesin (*Database PCS*) dan Hari Kerja, untuk menghasilkan analisis **Loading vs Capacity (LVC)** serta kalkulasi kebutuhan **Man Power (MP)** per lini produksi (LINE).

## 2. Tech Stack & Architecture
* **Frontend:** HTML5, CSS3 (Native, CSS Variables, Dark Theme), Vanilla JavaScript.
* **Libraries:** SheetJS (`xlsx.full.min.js`) untuk parsing dan export file Excel (XLSX).
* **Backend (API):** PHP 7.4+ (`state.php`) berbasis REST (GET & POST).
* **Database/Storage:** * *Primary:* `localStorage` (`bpms_state`) di sisi klien untuk performa *offline-first*.
    * *Secondary:* JSON Text File (`data/state.json`) di sisi server untuk sinkronisasi antar perangkat.

## 3. Global State Structure
Sistem menggunakan satu *state tree* global yang direpresentasikan dalam bentuk objek JSON. Struktur utamanya adalah:
* `dbLine` (Array): Daftar master LINE (Line 1 s/d Line 7).
* `lineProcessData` (Object): Detail tahapan proses, Cycle Time (CT), dan MP per LINE.
* `dbPCS` (Array): Master *Production Capacity Standard*. Memetakan spesifikasi baterai ke LINE produksi (1st & 2nd line) beserta Cycle Time-nya.
* `orders` (Object): Data *Order/Loading* yang dikelompokkan per periode (misal: `"2025-01": [...]`).
* `capacity` (Object): Konfigurasi shift aktif dan hari kerja per LINE, dikelompokkan per periode.
* `workCalendar` (Object): Data ON/OFF kalender kerja per hari (termasuk panduan libur 2026), dikelompokkan per periode.
* `mpParams` (Object): Parameter kebutuhan MP (Standard, Loader, QC) per LINE.
* `pendingUpload` / `pendingPeriod`: Temporary state untuk *preview* upload.

## 4. Core Modules & Logic

### 4.1. User Interface & Navigation
* **Layout:** Sidebar navigasi di sebelah kiri (dengan mode *collapsed* untuk desktop/tablet, dan mode *drawer* dengan hamburger menu untuk *mobile*). Area konten utama merender halaman secara dinamis (SPA).
* **Theme:** mengacu pada DESIGN-linear.app.

### 4.2. Database PCS (Production Capacity Standard)
* **Fungsi:** Menyimpan standar kapasitas produksi per Tipe Baterai.
* **Input:** Upload file Excel. Format kolom: `MODEL`, `GROUP`, `BATTERY TYPE`, `PLATE`, `SEPARATOR`, `SPACER`, `LINE(1st)`, `CT(s)(1st)`, `BOTTLENECK(1st)`, `LINE(2nd)`, `CT(s)(2nd)`, `BOTTLENECK(2nd)`.
* **Auto-Calculation Logic (Kapasitas Shift):**
    Di sisi klien, sistem akan otomatis menghitung kapasitas berdasarkan input **CT (Cycle Time dalam detik)**:
    * `BATT/H` = `Math.round((60 * 60) / CT)`
    * `S1` (Shift 1, 435 menit) = `Math.round((435 * 60) / CT)`
    * `S2` (Shift 2, 405 menit) = `Math.round((405 * 60) / CT)`
    * `S3` (Shift 3, 370 menit) = `Math.round((370 * 60) / CT)`
    * `Total` = `S1 + S2 + S3`
* **Fitur Lanjutan:** Tabel memiliki filter *dropdown* bergaya Excel per kolom.

### 4.3. Data Order / Loading
* **Fungsi:** Mengimpor data permintaan produksi bulanan dari Excel.
* **Logika Parsing Excel:**
    * Mengambil kolom: No, RFQ, SO, Sold To, Ship To, No PO, PN Customer, **PN Infor (ITEM)**, **Qty**, Type.
    * Sistem mengabaikan baris jika: `Qty` <= 0, atau baris tersebut bernama "Total", atau `ITEM` kosong.
* **Item Parsing Logic (CRITICAL):**
    Sistem mengekstrak spesifikasi baterai langsung dari *string* `PN Infor (ITEM)` berdasarkan indeks karakter statis:
    * **Technology:** Digit ke-4 (Index 3). `C`=Conventional, `H`=Hybrid, `M`/`V`=Maintenance Free.
    * **Separator:** Digit ke-6 (Index 5). `P`=PE, `F`=Phenolyc, `L`=Linter, `A`=AGM, `G`=Glassmat, `R`=Rubber.
    * **Battery Type:** Digit ke-8 s/d 14 (Index 7-13). Jika diakhiri huruf "X", huruf "X" tersebut dihapus (Contoh: `75D31RX` -> `75D31R`).
    * **Plate:** Digit ke-16 & 17 (Index 15-16). Jika digit 16 adalah huruf, dikonversi (A=0, B=1, C=2, dst).

### 4.4. Setting Kapasitas (Kalender & Shift)
* **Kalender Kerja:** Sistem memiliki panduan *hardcoded* libur nasional, cuti bersama, dan hari kerja pengganti untuk tahun 2026. Pengguna bisa melakukan *toggle* (ON/OFF) hari kerja secara manual.
* **Konfigurasi Shift:** Mengatur shift mana saja yang aktif per LINE (S1, S2, S3).
* **Kalkulasi Kapasitas Waktu (Total Capacity Hours):**
    * Menit harian = `(S1 ? 435 : 0) + (S2 ? 405 : 0) + (S3 ? 370 : 0)`
    * Kapasitas (Jam) = `(Menit harian * Jumlah Hari Kerja ON) / 60`

### 4.5. LVC (Loading vs Capacity) Analysis
Ini adalah intisari dari aplikasi. LVC membandingkan beban order dengan kapasitas riil mesin.
* **Alur Kerja:**
    1.  Ambil semua Data Order pada periode terpilih.
    2.  *Mapping* setiap item order ke Master PCS berdasarkan `Battery Type`, `Technology`, `Plate`, dan `Separator` untuk mencari **LINE** dan **Cycle Time (CT)** yang sesuai.
    3.  Kelompokkan total order (Qty) dan kalkulasi Processing Time per LINE.
* **Rumus Kalkulasi:**
    * `Processing Time (Jam)` = `(Total Qty * CT per unit) / 3600`
    * `Loading Percentage (%)` = `(Processing Time / Total Capacity Hours) * 100`
* **Visualisasi:** Membuat SVG Bar Chart vertikal secara dinamis (*hardcoded* via JavaScript) yang memvisualisasikan `Processing Time` terhadap garis referensi Kapasitas (S1, S1+S2, S1+S2+S3).
* **Status LVC:**
    * `> 100%`: OVERLOADED (Merah)
    * `85% - 100%`: WARNING (Oranye)
    * `0% - 85%`: OK (Hijau)

### 4.6. Man Power (MP)
* **Parameter:** Pengguna mengatur standar jumlah pekerja (Std, Loader, QC) per LINE.
* **Kalkulasi:** Total MP = `(Std + Loader + QC) * Jumlah Shift Aktif`.

## 5. Backend API Specification (`state.php`)
* **Endpoint:** `/api/state.php`
* **GET Request:** Membaca file `state.json`. Melakukan validasi normalisasi struktur (memastikan *Array* tetap array berurutan, dan *Object* tetap *Map/Dictionary*) agar tidak rusak saat di-decode oleh JavaScript. Mengembalikan response: `{"ok": true, "state": {...}}`.
* **POST Request:** Menerima JSON *payload* di body (`{"state": {...}}`). Memvalidasi struktur dasar, menulis ke `state.json` dengan `LOCK_EX` (file lock) untuk mencegah *race condition*, dan merespons `{"ok": true, "savedAt": "..."}`.

## 6. Export to Excel
* Menggunakan perpustakaan SheetJS (`XLSX`).
* Modul LVC, Database PCS, dan Data Order memiliki fungsionalitas untuk mengekspor tampilan tabel saat ini (termasuk hasil *filtering*) kembali ke dalam format `.xlsx`.