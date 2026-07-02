# Aturan Konversi PN

## PN Battery ke Category

Category dibaca dari karakter ke-3 pada prefix PN battery.

Contoh:

```text
ACDP-48D26RX-A9C3
```

Prefix adalah `ACDP`. Karakter ke-3 adalah `D`, maka category adalah `DRY`.

| Kode | Category |
|---|---|
| `D` | `DRY` |
| `W` | `WET` |
| `U` | `DUC` |

Contoh lain:

| PN | Category |
|---|---|
| `ACDP-48D26RX-A9C3` | `DRY` |
| `ACWP-55D23RX-B0P3` | `WET` |
| `ACUP-65D31RX-B5C2` | `DUC` |

## PN Battery ke Battery Type

Ada dua format utama.

### Format Matrix

```text
ACDP-48D26RX-A9C3
```

Struktur:

```text
[prefix]-[battery type]-[plate code]
```

Battery type raw adalah segmen ke-2:

```text
48D26RX
```

Huruf `X` di belakang dianggap padding varian untuk lookup. Jadi `48D26RX` juga dicoba sebagai `48D26R`.

### Format Infor

```text
F-ACDP-48D26RX-A9C3-IN-XPE0
```

Struktur:

```text
[part]-[prefix]-[battery type]-[plate code]-[brand]-[variant]
```

Battery type raw adalah segmen ke-3:

```text
48D26RX
```

Untuk mencari data Matrix Plate, key matrix dibentuk dari:

```text
[segmen 2]-[segmen 3]-[segmen 4]
```

Contoh:

```text
F-ACDP-48D26RX-A9C3-IN-XPE0
```

Menjadi:

```text
ACDP-48D26RX-A9C3
```

## Battery Type ke Series

Series diprioritaskan dari file `new_jis_series_data.js`, hasil ekstraksi sheet `New JIS` di `Matrix.xlsx`.

Rule lookup:

1. Cocokkan battery type raw secara exact.
2. Jika tidak ketemu, buang padding `X` di belakang lalu cocokkan lagi.
3. Jika tetap tidak ketemu, cari rule type terpanjang yang muncul di dalam battery type.
4. Jika masih tidak ketemu, fallback ke `conversion_type_series_data.js`.

Contoh:

| Battery Type Raw | Lookup Type | Series |
|---|---:|---|
| `48D26RX` | `48D26R` | `N50` |
| `115F51X` | `115F51` | `N120` |
| `32B20LX` | `32B20L` | `NS40` |
| `105D31L` | `105D31L` | `N70` |

## Series ke Size

Size diambil dari file `series_size_data.js`, hasil ekstraksi sheet `Size` di `Matrix.xlsx`.

Rule:

1. Ambil series final.
2. Cocokkan series ke sheet `Size`.
3. Jika tidak ada, gunakan size dari fallback mapping lama.
4. Jika series ada tetapi size tetap tidak ditemukan, isi sebagai `OTHERS`.

Contoh:

| Series | Size |
|---|---|
| `NS40` | `SMALL` |
| `NS60` | `SMALL` |
| `N50` | `MEDIUM` |
| `N70` | `MEDIUM` |
| `N120` | `BIG` |
| `N150` | `BIG` |
| `N200` | `BIG` |

## PN Plate ke Process

Contoh PN plate:

```text
W-FOPL-CG85PXX-L870-02-7S00
W-UNPL-WG87NXX-T3AF-00-7C00
```

Struktur umum:

```text
[part]-[form status]-[plate/grid code]-[dimension]-[revision]-[spec]
```

### Form Status

Segmen ke-2 menentukan status formation.

| Segmen | Arti |
|---|---|
| `FOPL` | Form Plate, sudah lewat formation |
| `UNPL` | Unform Plate, belum formed |

### Grid Process

Segmen ke-3 menentukan jalur grid.

| Awalan Segmen ke-3 | Process |
|---|---|
| `W` | Punching |
| `C` atau `D` | Antimon / Casting |
| Selain `C`, `D`, `W` | Calcium Casting |

Contoh:

| PN Plate | Form Status | Grid Process |
|---|---|---|
| `W-FOPL-CG85PXX-L870-02-7S00` | Form Plate | Antimon / Casting |
| `W-UNPL-WG87NXX-T3AF-00-7C00` | Unform Plate | Punching |
| `W-UNPL-YG82HDP-L650-02-7S00` | Unform Plate | Calcium Casting |

## Catatan

Jika ada PN yang tidak terbaca, penyebab paling umum adalah:

- Prefix tidak mengikuti pola category `D/W/U`.
- Battery type belum ada di sheet `New JIS`.
- Series belum ada di sheet `Size`.
- PN plate tidak mengikuti format dash-separated standar.
