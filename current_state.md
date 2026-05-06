# Factory Analytics Hub (FAH) — Current State & Activity Log

**Project:** Factory Analytics Hub (FAH) v1.0  
**Last Updated:** 2026-05-05 (session 2)  
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
| Man Power | `man-power.html` | ✅ Selesai (redesign) |
| Database Konversi | `database-konversi.html` | 🔲 Placeholder |
| Shared Components | `shared-components.js` | ✅ Selesai |
| Stylesheet | `style.css` | ✅ Selesai |
| Backend API | `api/state.php` | ✅ Selesai |

---

## Activity Log

### 2026-05-05
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

---

## Known Issues / TODO

- [x] Halaman LVC: redesign selesai — year-based process cards dengan SVG chart
- [ ] Export Excel semua halaman: belum ditest setelah refactor tabel
- [ ] `setting-capacity.html` & `man-power.html`: dropdown periode masih pakai format lama (ada kode YYYY-MM) — perlu diseragamkan
