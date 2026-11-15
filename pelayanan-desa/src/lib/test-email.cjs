require("ts-node").register({ compilerOptions: { module: "CommonJS" } });
const fs = require('fs');
const path = require('path');

// Baca .env
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

const { verifyEmailTransport, sendApplicationStatusEmail } = require('./email/service.ts');

async function main() {
  console.log("=== MEMERIKSA STATUS KONEKSI SMTP ===");
  const status = await verifyEmailTransport();
  console.log(JSON.stringify(status, null, 2));

  if (!status.connected) {
    console.log("\n[INFO] SMTP belum dapat terhubung karena konfigurasi belum lengkap atau server belum aktif.");
    return;
  }

  console.log("\n=== MENCOBA PENGIRIMAN EMAIL NYATA KE WARGA ===");
  const resWarga = await sendApplicationStatusEmail({
    recipientEmail: "ramlicirebon0@gmail.com",
    recipientName: "Rina Wati",
    applicationId: "test-app-warga",
    nomorPengajuan: "PD-TEST-0001",
    serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
    status: "DIAJUKAN",
    title: "Konfirmasi Pengajuan SKTM",
    message: "Pengajuan SKTM Anda telah berhasil tersimpan dan sedang menunggu verifikasi awal dari Staf Desa.",
    targetRole: "WARGA",
  });
  console.log("Hasil Kirim Warga:", resWarga);

  console.log("\n=== MENCOBA PENGIRIMAN EMAIL NYATA KE KEPALA DESA ===");
  const resKades = await sendApplicationStatusEmail({
    recipientEmail: "mukhamadramli53@gmail.com",
    recipientName: "Budi Santoso",
    applicationId: "test-app-kades",
    nomorPengajuan: "PD-TEST-0002",
    serviceName: "Surat Pengantar Pembuatan SKCK",
    status: "REVIEW_SUPERVISOR",
    title: "Pengajuan Siap Diputuskan",
    message: "Pengajuan Surat Pengantar SKCK telah selesai ditinjau oleh Supervisor dan siap untuk keputusan akhir Kepala Desa.",
    targetRole: "KEPALA_DESA",
  });
  console.log("Hasil Kirim Kades:", resKades);

  console.log("\n=== PENGUJIAN PENANGANAN KEGAGALAN (ACCURATE ERROR REPORTING) ===");
  // Test 1: Email di luar whitelist keamanan pengujian
  const resBlocked = await sendApplicationStatusEmail({
    recipientEmail: "warga.lain@desa.local",
    recipientName: "Warga Luar",
    applicationId: "test-app-blocked",
    nomorPengajuan: "PD-TEST-0003",
    serviceName: "SKTM",
    status: "DIAJUKAN",
    title: "Percobaan Kirim Luar",
    message: "Percobaan.",
    targetRole: "WARGA",
  });
  console.log("1. Hasil Uji Email di Luar Whitelist (Harus Ditolak Aman):", resBlocked);

  // Test 2: Format email tidak valid
  const resInvalid = await sendApplicationStatusEmail({
    recipientEmail: "bukan-alamat-email-sah",
    recipientName: "Invalid User",
    applicationId: "test-app-invalid",
    nomorPengajuan: "PD-TEST-0004",
    serviceName: "SKTM",
    status: "DIAJUKAN",
    title: "Format Salah",
    message: "Percobaan.",
    targetRole: "WARGA",
  });
  console.log("2. Hasil Uji Format Email Rusak (Harus Ditolak Validasi):", resInvalid);
}

main().catch(console.error);
