<?php
/**
 * Sistem Pelayanan Desa - Laragon Primary Gateway & Auto-Router
 * 
 * Gateway ini memastikan ketika pengguna membuka localhost Laragon:
 * - http://localhost/LatihanProjek/
 * - http://localhost/LatihanProjek
 * Pengguna langsung diarahkan ke halaman resmi aplikasi Sistem Pelayanan Desa
 * (Virtual Host Laragon: http://LatihanProjek.test) tanpa hambatan launcher statis.
 * 
 * Launcher diagnostik tetap tersedia di:
 * - http://localhost/LatihanProjek/launcher.php
 * - http://localhost/LatihanProjek/?launcher=1
 */

// Jika pengguna secara eksplisit meminta launcher diagnostik
if (isset($_GET['launcher']) && $_GET['launcher'] == '1') {
    require_once __DIR__ . '/launcher.php';
    exit;
}

$nodeHost = '127.0.0.1';
$nodePort = 3000;
$vhostHost = 'LatihanProjek.test';
$vhostBase = 'http://' . $vhostHost;
$directBase = 'http://localhost:3000';

// Periksa apakah server Next.js aktif di port 3000
$isNodeRunning = false;
$socket = @fsockopen($nodeHost, $nodePort, $errno, $errstr, 0.3);
if (is_resource($socket)) {
    $isNodeRunning = true;
    fclose($socket);
}

// Deteksi subpath dari REQUEST_URI jika ada (misal /LatihanProjek/login -> /login)
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$subPath = preg_replace('#^/LatihanProjek/?#i', '/', $requestUri);
if ($subPath === '' || $subPath === false) {
    $subPath = '/';
}

// Tentukan target URL utama: vHost Laragon (port 80)
$targetUrl = rtrim($vhostBase, '/') . $subPath;

// Jika parameter force_direct=1 digunakan, arahkan langsung ke port 3000
if (isset($_GET['port3000']) || isset($_GET['direct'])) {
    $targetUrl = rtrim($directBase, '/') . $subPath;
}

// KONDISI 1: Server Next.js sudah aktif -> Langsung alihkan tanpa menampilkan launcher
if ($isNodeRunning) {
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");
    header("Location: " . $targetUrl, true, 302);
    ?>
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="0;url=<?php echo htmlspecialchars($targetUrl); ?>">
        <title>Mengalihkan ke Sistem Pelayanan Desa...</title>
        <script>window.location.replace(<?php echo json_encode($targetUrl); ?>);</script>
    </head>
    <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <p>Mengalihkan ke <a href="<?php echo htmlspecialchars($targetUrl); ?>" style="color: #34d399;"><?php echo htmlspecialchars($targetUrl); ?></a>...</p>
    </body>
    </html>
    <?php
    exit;
}

// KONDISI 2: Server Next.js belum aktif -> Otomatis picu background startup dengan lock guard
// agar request berulang dari browser (new tab / auto-refresh) tidak memicu multi-proses duplikat
$batPath = realpath(__DIR__ . '/start-app.bat');
$lockFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pelayanan_desa_startup.lock';
$shouldSpawn = true;

if (file_exists($lockFile)) {
    $lockTime = @filemtime($lockFile);
    // Jika proses startup baru dipicu kurang dari 40 detik yang lalu, jangan picu lagi
    if ($lockTime && (time() - $lockTime) < 40) {
        $shouldSpawn = false;
    }
}

if ($shouldSpawn && $batPath && file_exists($batPath)) {
    @touch($lockFile);
    // Jalankan start-app.bat secara background dan non-blockin# PROMPT ANTIGRAVITY — TAMBAHKAN FITUR KONFIGURASI AI DI DASHBOARD KEPALA DESA

Bertindaklah sebagai Senior Full-Stack Developer, Next.js Developer, AI Integration Engineer, dan Database Engineer.

Saya ingin menambahkan **SATU FITUR BARU bernama "Konfigurasi AI"** pada dashboard Kepala Desa di aplikasi Sistem Pelayanan Desa Digital.

Pahami seluruh instruksi berikut dan pelajari struktur proyek sebelum melakukan perubahan.

## 1. LOKASI FITUR BARU

Tambahkan satu menu baru pada sidebar sebelah kiri dashboard Kepala Desa.

Lokasinya harus tepat di bawah menu:

- Profil Saya

Kemudian tambahkan:

- Konfigurasi AI

Gunakan desain, ukuran ikon, warna, jarak, tipografi, dan gaya menu yang sama dengan sidebar yang sudah ada.

Jangan mengubah posisi atau tampilan menu lainnya.

Menu Konfigurasi AI hanya ditampilkan kepada akun Kepala Desa yang memiliki kewenangan mengelola konfigurasi AI.

Jangan menampilkan menu ini kepada Warga Desa, Staf Desa, atau Supervisor.

## 2. HALAMAN KONFIGURASI AI

Ketika Kepala Desa mengklik menu Konfigurasi AI, tampilkan halaman baru yang konsisten dengan desain dashboard saat ini.

Buat halaman yang profesional, sederhana, mudah dipahami, dan responsif.

Judul halaman:

**Konfigurasi AI Assistant**

Deskripsi:

"Kelola API Key, provider AI, dan model yang digunakan oleh AI Chatbot Sistem Pelayanan Desa."

Halaman harus memiliki bagian berikut:

### A. Pilihan Provider AI

Gunakan hanya provider yang SUDAH TERPASANG di proyek:

1. Grok AI
2. Gemini AI
3. NVIDIA AI

Jangan menambahkan provider AI baru.

Setiap provider memiliki konfigurasi masing-masing.

### B. Konfigurasi API Key

Sediakan input API Key untuk setiap provider.

Fungsinya:

- Kepala Desa dapat memasukkan API Key.
- Kepala Desa dapat mengganti API Key lama.
- Kepala Desa dapat memperbarui API Key kapan saja.
- API Key ditampilkan dalam bentuk tersembunyi.
- Sediakan tombol tampilkan/sembunyikan saat diperlukan.
- Sediakan tombol simpan konfigurasi.
- Sediakan indikator apakah API Key sudah dikonfigurasi.
- Sediakan tombol untuk menguji koneksi API Key.

Jangan pernah menampilkan API Key secara utuh setelah tersimpan.

Jangan mengirim API Key ke frontend dalam respons API.

### C. Pilihan Model AI

Saya ingin model AI dapat diganti melalui halaman konfigurasi ini, bukan dengan mengedit kode program setiap kali ingin mengganti model.

Untuk setiap provider:

- Tampilkan pilihan model yang memang sudah didukung oleh integrasi provider tersebut.
- Jika provider mendukung beberapa versi model, tampilkan pilihan versi yang tersedia.
- Jika provider hanya mendukung satu model, tampilkan satu pilihan saja.
- Jangan membuat nama model palsu.
- Jangan menawarkan model yang tidak didukung oleh API provider.
- Periksa model yang benar-benar digunakan oleh kode integrasi saat ini.

Contohnya:

Kepala Desa memilih provider Grok, lalu dapat memilih model Grok yang sudah didukung.

Kepala Desa memilih Gemini, lalu dapat memilih model Gemini yang sudah didukung.

Kepala Desa memilih NVIDIA, lalu dapat memilih model NVIDIA yang sudah didukung.

Daftar model harus mengikuti kemampuan dan konfigurasi integrasi yang benar-benar tersedia di proyek.

### D. Pilihan AI Aktif

Tambahkan pengaturan untuk menentukan AI yang digunakan sebagai provider aktif oleh chatbot Kepala Desa.

Contoh:

- Provider aktif: Grok.
- Model aktif: model Grok yang dipilih.

Kepala Desa dapat mengganti provider dan model aktif melalui halaman konfigurasi.

Jika provider atau model tidak memiliki API Key valid, jangan izinkan provider tersebut diaktifkan.

Simpan pilihan provider dan model aktif agar tetap digunakan setelah halaman direfresh atau pengguna login kembali.

## 3. INTEGRASI DENGAN BACKEND AI NEXT.JS

Ini bagian yang sangat penting.

Saat ini integrasi AI sudah berada di backend Next.js.

Saya ingin konfigurasi yang disimpan di halaman Konfigurasi AI benar-benar digunakan oleh backend AI yang sudah ada.

Ketentuan:

1. Backend membaca provider aktif dari konfigurasi database.
2. Backend membaca model aktif dari konfigurasi database.
3. Backend mengambil API Key provider yang sesuai secara aman.
4. Backend mengirim pertanyaan ke provider dan model yang dipilih.
5. Backend memproses jawaban AI seperti sebelumnya.
6. Chatbot Kepala Desa menggunakan konfigurasi terbaru tanpa harus mengedit source code secara manual.
7. Jika Kepala Desa mengganti provider atau model, perubahan tersebut digunakan pada permintaan chatbot berikutnya.
8. Jangan mengubah sistem pengambilan data database chatbot yang sudah ada.
9. Jangan merusak mekanisme konteks percakapan.
10. Jangan menghilangkan integrasi Grok, Gemini, atau NVIDIA.

Pertahankan seluruh fungsi AI Chatbot yang sudah berjalan.

## 4. PENYIMPANAN KONFIGURASI DI DATABASE

Buat tabel atau gunakan struktur konfigurasi yang sudah tersedia jika memang sesuai.

Simpan konfigurasi provider, model, status aktif, dan API Key secara aman.

Ketentuan keamanan:

- API Key wajib dienkripsi sebelum disimpan di database.
- Jangan menyimpan API Key dalam bentuk plaintext.
- Gunakan encryption key dari environment server.
- Jangan menyimpan encryption key di database.
- Jangan mengirim API Key ke browser.
- Jangan mencatat API Key ke console atau log.
- Batasi akses konfigurasi hanya kepada Kepala Desa yang berwenang.
- Backend harus memeriksa session dan role secara langsung.
- Jangan mempercayai role dari frontend.

Jangan membuat tabel duplikat jika sudah tersedia tabel konfigurasi yang sesuai.

## 5. FITUR UJI KONEKSI

Sediakan tombol **Uji Koneksi** pada setiap provider.

Ketika ditekan:

- Backend menguji koneksi menggunakan API Key yang tersimpan atau API Key baru yang sedang diuji.
- Gunakan model yang dipilih jika diperlukan.
- Tampilkan status berhasil atau gagal.
- Jika gagal, tampilkan pesan kesalahan yang mudah dipahami.
- Jangan pernah menampilkan API Key pada pesan kesalahan.

Contoh status:

- Koneksi berhasil.
- API Key tidak valid.
- Model tidak tersedia.
- Provider tidak dapat dihubungi.
- Konfigurasi belum lengkap.

Jangan menampilkan status berhasil jika koneksi belum benar-benar diuji.

## 6. PENYIMPANAN DAN PENERAPAN PERUBAHAN

Ketika Kepala Desa menekan tombol Simpan:

- Validasi input.
- Validasi provider dan model.
- Simpan konfigurasi secara aman.
- Pertahankan konfigurasi provider lain.
- Jangan menghapus API Key provider lain ketika hanya satu provider yang diperbarui.
- Terapkan provider dan model aktif yang dipilih.
- Tampilkan notifikasi bahwa konfigurasi berhasil disimpan hanya setelah database mengonfirmasi penyimpanan.

Jangan mengubah konfigurasi secara otomatis tanpa tindakan Kepala Desa.

## 7. BATASAN PERUBAHAN — SANGAT PENTING

Saya hanya meminta penambahan fitur Konfigurasi AI.

JANGAN:

- Mengubah desain dashboard yang sudah ada.
- Mengubah menu lainnya.
- Mengubah fitur Profil Saya.
- Mengubah fitur Persetujuan.
- Mengubah Master Layanan.
- Mengubah Kelola User.
- Mengubah Laporan.
- Mengubah Audit Log.
- Mengubah sistem pengajuan surat.
- Mengubah database pengajuan warga.
- Mengubah alur pelayanan.
- Mengubah sistem notifikasi WhatsApp.
- Mengubah sistem email.
- Menghapus integrasi AI yang sudah tersedia.
- Mengubah perilaku chatbot selain menghubungkan pemilihan provider dan model ke konfigurasi baru.
- Mengganti API Key yang sudah tersimpan tanpa persetujuan.
- Mengubah file yang tidak berkaitan dengan fitur ini.

Sebelum bekerja, identifikasi file yang benar-benar perlu diubah.

Jika harus mengubah backend AI yang sudah ada agar membaca konfigurasi baru, lakukan perubahan sekecil mungkin tanpa merusak fungsinya.

## 8. PENGUJIAN WAJIB

Setelah selesai, lakukan pengujian:

1. Menu Konfigurasi AI muncul tepat di bawah Profil Saya.
2. Menu hanya dapat diakses Kepala Desa yang berwenang.
3. API Key Grok dapat disimpan dan diuji.
4. API Key Gemini dapat disimpan dan diuji.
5. API Key NVIDIA dapat disimpan dan diuji.
6. API Key tersimpan dalam bentuk terenkripsi.
7. API Key tidak terlihat pada respons frontend.
8. Model yang tersedia ditampilkan sesuai dukungan provider.
9. Model aktif dapat diganti.
10. Provider aktif dapat diganti.
11. Konfigurasi tetap tersimpan setelah halaman direfresh.
12. Chatbot Kepala Desa benar-benar menggunakan provider dan model aktif.
13. Provider lain tidak kehilangan konfigurasi ketika satu provider diubah.
14. Fitur chatbot dan fitur dashboard lainnya tetap berjalan.

Jika ada pengujian gagal, perbaiki sebelum menyatakan selesai.

## 9. LAPORAN AKHIR

Setelah selesai, laporkan:

- File yang dibuat.
- File yang dimodifikasi.
- Tabel database yang digunakan atau dibuat.
- Cara kerja penyimpanan API Key.
- Provider AI yang berhasil dikonfigurasi.
- Model yang tersedia untuk setiap provider.
- Hasil pengujian koneksi.
- Bukti bahwa chatbot menggunakan provider dan model aktif.
- Kendala yang masih ada.

# TARGET AKHIR

Saya ingin memiliki satu menu baru bernama **Konfigurasi AI** tepat di bawah Profil Saya pada sidebar dashboard Kepala Desa.

Melalui menu tersebut, saya bisa:

1. Memasukkan API Key Grok.
2. Memasukkan API Key Gemini.
3. Memasukkan API Key NVIDIA.
4. Mengganti API Key kapan saja.
5. Memilih model yang tersedia dari masing-masing provider.
6. Mengganti provider AI yang sedang aktif.
7. Mengganti model AI yang sedang aktif.
8. Menguji koneksi provider.

Semua pengaturan tersimpan di database dan terhubung langsung dengan backend AI Next.js.

**KERJAKAN HANYA FITUR KONFIGURASI AI INI. JANGAN MENGUBAH ATAU MERUSAK BAGIAN LAIN DARI SISTEM PELAYANAN DESA.**
    @pclose(@popen("start /B cmd /c \"" . $batPath . "\" > nul 2>&1", "r"));
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memulai Sistem Pelayanan Desa...</title>
    <style>
        :root {
            --primary: #10b981;
            --primary-dark: #059669;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.9);
            --border: rgba(148, 163, 184, 0.2);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            width: 100%;
            max-width: 560px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 36px 32px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.15);
            backdrop-filter: blur(16px);
        }
        .logo-badge {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #10b981, #06b6d4);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 20px auto;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
            animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        p.subtitle {
            font-size: 14px;
            color: var(--text-muted);
            margin-bottom: 24px;
            line-height: 1.5;
        }
        .loader-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 24px;
        }
        .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(16, 185, 129, 0.2);
            border-top: 3px solid #10b981;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status-text {
            font-size: 13px;
            color: #e2e8f0;
            font-weight: 500;
        }
        .substatus {
            font-size: 12px;
            color: var(--text-muted);
        }
        .btn-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 10px;
        }
        .btn {
            padding: 11px 20px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        .btn-primary:hover {
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
        }
        .btn-link {
            background: transparent;
            color: var(--text-muted);
            font-size: 12px;
            padding: 8px 12px;
        }
        .btn-link:hover {
            color: #f8fafc;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-badge">🏛️</div>
        <h1>Sistem Pelayanan Desa Digital</h1>
        <p class="subtitle">
            Memulai server aplikasi... Anda akan dialihkan secara otomatis ke antarmuka utama begitu server siap.
        </p>

        <div class="loader-wrapper">
            <div class="spinner"></div>
            <div class="status-text" id="status-title">Menghubungkan ke Server Next.js...</div>
            <div class="substatus" id="status-sub">Memeriksa port 3000 & Laragon Reverse Proxy...</div>
        </div>

        <div class="btn-group">
            <a href="<?php echo htmlspecialchars($targetUrl); ?>" class="btn btn-primary" id="btn-manual">
                🚀 Buka Langsung (<?php echo htmlspecialchars($vhostHost); ?>)
            </a>
            <a href="launcher.php" class="btn btn-link">
                ⚙️ Portal Diagnostik (Launcher)
            </a>
        </div>
    </div>

    <script>
    const targetUrl = <?php echo json_encode($targetUrl); ?>;
    let pollCount = 0;
    const maxPolls = 40;

    function checkServer() {
        pollCount++;
        fetch('launcher.php?ping=1')
            .then(res => res.json())
            .then(data => {
                if (data.node) {
                    document.getElementById('status-title').innerText = '✓ Server Siap! Mengalihkan...';
                    document.getElementById('status-sub').innerText = 'Membuka aplikasi Sistem Pelayanan Desa';
                    setTimeout(() => {
                        window.location.replace(targetUrl);
                    }, 400);
                } else {
                    if (pollCount < maxPolls) {
                        setTimeout(checkServer, 800);
                    } else {
                        document.getElementById('status-title').innerText = 'Server sedang proses inisialisasi...';
                        document.getElementById('status-sub').innerHTML = 'Menunggu Next.js siap. Atau silakan <a href="' + targetUrl + '" style="color:#34d399;font-weight:600;">Klik di sini untuk mencoba lagi</a>.';
                        // Tetap lakukan polling santai tiap 2.5 detik agar otomatis beralih saat server siap
                        setTimeout(checkServer, 2500);
                    }
                }
            })
            .catch(() => {
                setTimeout(checkServer, 1500);
            });
    }

    // Mulai polling segera
    setTimeout(checkServer, 600);
    </script>
</body>
</html>
