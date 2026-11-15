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

const { sendDirectTestEmail } = require('./email/service.ts');

async function main() {
  console.log("================================================================================");
  console.log("MENGIRIMKAN DUA EMAIL UJI COBA RESMI SESUAI PERMINTAAN USER");
  console.log("================================================================================");

  // 1. Email Uji Coba untuk Warga
  const wargaSubject = "[UJI COBA] Notifikasi Pelayanan Desa untuk Warga";
  const wargaBody = `Halo Warga Desa,

Ini adalah email uji coba sistem notifikasi dari aplikasi Sistem Pelayanan Desa Berbasis Web + AI.

Pengujian ini bertujuan memastikan bahwa Anda dapat menerima pemberitahuan melalui email ketika terjadi aktivitas pada pengajuan surat.

Contoh aktivitas yang nantinya dapat memicu notifikasi:

Pengajuan SKTM berhasil diterima.

Pengajuan Surat Pengantar Pembuatan SKCK berhasil diterima.

Dokumen perlu diperbaiki.

Status pengajuan berubah.

Pengajuan disetujui atau ditolak.

Email ini hanya untuk pengujian sistem. Email ini bukan konfirmasi pengajuan surat yang sebenarnya.

Terima kasih.

Salam,
Sistem Pelayanan Desa`;

  console.log("\n[1/2] Mengirim email ke Warga (ramlicirebon0@gmail.com)...");
  const resWarga = await sendDirectTestEmail({
    recipientEmail: "ramlicirebon0@gmail.com",
    recipientName: "Warga Desa",
    subject: wargaSubject,
    bodyText: wargaBody,
  });
  console.log("Status Pengiriman Warga:", JSON.stringify(resWarga, null, 2));

  // 2. Email Uji Coba untuk Kepala Desa
  const kadesSubject = "[UJI COBA] Notifikasi Sistem Pelayanan Desa untuk Kepala Desa";
  const kadesBody = `Yth. Kepala Desa,

Ini adalah email uji coba sistem notifikasi dari aplikasi Sistem Pelayanan Desa Berbasis Web + AI.

Pengujian ini bertujuan memastikan bahwa Kepala Desa dapat menerima pemberitahuan melalui email ketika terdapat pengajuan yang memerlukan keputusan akhir sesuai alur pelayanan.

Contoh aktivitas yang nantinya dapat memicu notifikasi:

Pengajuan siap mendapatkan keputusan akhir.

Terdapat perubahan status pengajuan yang penting.

Terdapat aktivitas pelayanan yang memerlukan perhatian sesuai kewenangan.

Email ini hanya untuk pengujian sistem. Email ini bukan pemberitahuan mengenai pengajuan warga yang sebenarnya.

Hormat kami,
Sistem Pelayanan Desa`;

  console.log("\n[2/2] Mengirim email ke Kepala Desa (mukhamadramli53@gmail.com)...");
  const resKades = await sendDirectTestEmail({
    recipientEmail: "mukhamadramli53@gmail.com",
    recipientName: "Kepala Desa",
    subject: kadesSubject,
    bodyText: kadesBody,
  });
  console.log("Status Pengiriman Kepala Desa:", JSON.stringify(resKades, null, 2));

  console.log("\n================================================================================");
  console.log("PENGIRIMAN SELESAI");
  console.log("================================================================================");
}

main().catch(console.error);
