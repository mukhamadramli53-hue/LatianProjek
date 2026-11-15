# Sistem Pelayanan Desa - Design System & Tokens

Dokumen ini adalah acuan resmi (*single source of truth*) untuk seluruh fondasi desain (design tokens) pada aplikasi Sistem Pelayanan Desa. Seluruh komponen UI **harus** mengacu pada token-token ini untuk memastikan konsistensi antarmuka.

Proyek ini menggunakan **CSS Variables** murni (Vanilla CSS) untuk manajemen design tokens. File definisi utama berada di: `src/styles/tokens.css`, yang kemudian diimpor ke dalam `src/app/globals.css`.

---

## 🎨 1. Color Tokens

Warna dikelola melalui struktur dua lapis: **Primitive Tokens** (palet dasar) dan **Semantic Tokens** (warna yang memiliki konteks/makna). Hindari penggunaan Primitive Tokens langsung pada komponen; gunakan Semantic Tokens.

### Semantic Tokens (Gunakan Ini)

| Nama Variabel | Deskripsi / Penggunaan Utama |
| :--- | :--- |
| `--primary-main` | Action utama, primary CTA, active state |
| `--primary-hover` | State hover untuk action utama |
| `--secondary-main` | Secondary action, background pendukung |
| `--bg-app` | Background utama aplikasi |
| `--bg-surface` | Background komponen menonjol (card, modal) |
| `--text-primary` | Teks utama, judul, paragraf penting |
| `--text-secondary` | Teks pendukung, deskripsi, subtitle |
| `--text-muted` | Teks yang tidak terlalu penting (placeholder, caption) |
| `--border-card` | Garis tepi pada komponen *card* |
| `--border-input` | Garis tepi pada elemen *form* |

### Semantic State (Feedback)

| Nama Variabel | Teks | Background (Soft) | Border |
| :--- | :--- | :--- | :--- |
| **Success** | `--semantic-success-text` | `--semantic-success-bg` | `--semantic-success-border` |
| **Warning** | `--semantic-warning-text` | `--semantic-warning-bg` | `--semantic-warning-border` |
| **Error** | `--semantic-error-text` | `--semantic-error-bg` | `--semantic-error-border` |
| **Info** | `--semantic-info-text` | `--semantic-info-bg` | `--semantic-info-border` |

---

## 🖋 2. Typography Tokens

Kami menggunakan dua jenis font utama: `Plus Jakarta Sans` (Display/Heading) dan `Inter` (Body/UI).

### Type Scale

| Nama Variabel | Ukuran (CSS clamp/rem) | Penggunaan |
| :--- | :--- | :--- |
| `--text-display-size` | clamp(2rem, 5vw, 3rem) | Judul utama landing page / hero |
| `--text-page-title-size`| clamp(1.625rem, 4vw, 2.25rem) | Judul halaman (H1) utama |
| `--text-h1-size` | clamp(1.5rem, 3.5vw, 2rem) | Heading tingkat 1 dalam section |
| `--text-h2-size` | clamp(1.25rem, 3vw, 1.5rem) | Heading tingkat 2 |
| `--text-h3-size` | 1.125rem | Heading tingkat 3 |
| `--text-body-lg-size` | 1.0625rem | Teks deskripsi / paragraf besar |
| `--text-body-size` | 0.9375rem | Paragraf utama / isi tulisan |
| `--text-body-sm-size` | 0.875rem | Teks sekunder, metadata |
| `--text-caption-size` | 0.8125rem | Teks terkecil (helper, label) |

*Telah tersedia utility classes pembungkus di `globals.css` (misal: `.text-page-title`, `.text-heading`, `.text-body`) agar Anda tidak perlu menuliskan kombinasi font-family, size, dan line-height secara manual.*

---

## 📏 3. Spacing Tokens

Sistem spacing berbasis kelipatan **4px** (`--space-1` = 4px). 

### Spacing Semantic
Daripada menebak jarak yang pas, gunakan token semantik berikut untuk struktur yang lebih konsisten:

| Nama Variabel | Nilai (Referensi) | Penggunaan |
| :--- | :--- | :--- |
| `--spacing-card-padding` | `--space-6` (24px) | Padding bagian dalam *card* |
| `--spacing-form-group-gap` | `--space-5` (20px) | Jarak antar field pada formulir |
| `--spacing-section-gap` | `--space-10` (40px) | Jarak vertikal antar section besar |
| `--spacing-page-padding-x` | `--space-6` (24px) | Padding horizontal halaman aplikasi |
| `--spacing-page-max-width` | `1280px` | Batas lebar maksimum layout |

---

## 🔲 4. Radius Tokens

Menentukan kelengkungan sudut komponen. 

| Nama Variabel | Ukuran | Contoh Penggunaan |
| :--- | :--- | :--- |
| `--radius-none` | 0px | Elemen tajam / *full-bleed* |
| `--radius-small` | 6px | Checkbox, tooltip, badge kecil |
| `--radius-medium` | 10px | Tombol utama, input form |
| `--radius-large` | 16px | *Card*, modal, panel, *container* utama |
| `--radius-full` | 9999px | *Pill button*, *badge status* melingkar, avatar |

---

## 🌫 5. Shadow Tokens

Sistem elevasi menggunakan bayangan yang hemat (*subtle*) dan tidak berlebihan. Card standar tidak menggunakan bayangan, melainkan *border*.

| Elevasi | Nama Variabel | Contoh Penggunaan |
| :--- | :--- | :--- |
| **0** | `--shadow-none` | Kondisi flat, card bawaan, tombol |
| **1** | `--shadow-small` | Dropdown ringan, elemen melayang kecil |
| **2** | `--shadow-medium` | Tooltip, panel navigasi (*sticky header*) |
| **3** | `--shadow-large` | Modal dialog, *floating action button* |

---

## ❖ 6. Icon Convention

Kami menggunakan standar **Lucide React** (`lucide-react`) untuk seluruh aset ikon. Aturan ketat penggunaan ikon:

1. **Hanya `lucide-react`**: Jangan gunakan raw `<svg>` path (kecuali logo kustom). Jangan masukkan library ikon sekunder.
2. **Atribut Proporsional**:
   - Tentukan `size={16}` atau `size={18}` untuk ikon yang sejajar dengan teks.
   - Setel `strokeWidth={2}` atau `strokeWidth={2.5}` agar konsisten dengan tebal huruf.
3. **Aksesibilitas (A11y)**:
   - Jika tombol **hanya** berisi ikon, wajib tambahkan `aria-label="Deskripsi fungsi"`.
   - Tambahkan properti `aria-hidden="true"` pada ikon yang hanya bersifat dekoratif.

---

Dengan mengikuti panduan Design Tokens ini, sistem antarmuka akan menjadi modular, mudah dipelihara, dan secara otomatis mendukung fitur masa depan (seperti *Dark Mode*) jika diimplementasikan.
