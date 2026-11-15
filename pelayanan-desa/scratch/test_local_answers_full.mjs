import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function formatStatusDescription(status) {
  switch (status) {
    case "DIAJUKAN":
      return "Berkas baru saja dikirim dan sedang menunggu antrian verifikasi awal oleh Staf Desa (Bapak Agus Wijaya).";
    case "DIVERIFIKASI":
      return "Berkas dokumen persyaratan telah diverifikasi kelengkapannya oleh Staf Desa dan dinyatakan lengkap.";
    case "DIPROSES":
      return "Berkas sedang dalam tahap penyiapan draf surat resmi oleh Staf Desa.";
    case "REVIEW_SUPERVISOR":
      return "Berkas sedang dalam tahap penelaahan kendali mutu (quality control) oleh Supervisor Desa (Ibu Sari Dewi).";
    case "MENUNGGU_APPROVAL":
      return "Berkas telah lolos supervisi mutu dan menunggu persetujuan akhir / tanda tangan resmi Kepala Desa (Bapak Budi Santoso).";
    case "DISETUJUI":
      return "Selamat! Pengajuan telah disetujui secara resmi oleh Kepala Desa (Bapak Budi Santoso).";
    case "SELESAI":
      return "Pengajuan telah selesai diproses dan surat resmi telah diterbitkan.";
    case "PERLU_PERBAIKAN":
      return "⚠️ Berkas memerlukan perbaikan dokumen oleh pemohon. Silakan periksa catatan koreksi petugas dan unggah ulang di menu Pengajuan Saya.";
    case "DITOLAK":
      return "Pengajuan tidak dapat disetujui / ditolak dengan catatan resmi.";
    default:
      return "Berkas sedang dalam pemrosesan sistem desa.";
  }
}

async function getUserApps(userId) {
  const apps = await prisma.application.findMany({
    where: { userId },
    include: {
      service: true,
      documents: true,
      history: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { submitted_at: "desc" },
  });

  return apps.map((app) => ({
    nomor_pengajuan: app.nomor_pengajuan,
    serviceName: app.service.name,
    serviceCode: app.service.code,
    status: app.status,
    submittedAt: app.submitted_at.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    latestNote: app.history[0]?.note || app.notes || null,
    needsRepair: app.status === "PERLU_PERBAIKAN",
  }));
}

function localAnswer(question, context = [], role = "WARGA", userName = "Rina Wati", userApplications = []) {
  const q = question.toLowerCase();
  const name = userName;

  if (
    q.includes("orang lain") ||
    q.includes("warga lain") ||
    q.includes("tetangga") ||
    q.includes("semua warga") ||
    q.includes("siapa saja yang ajukan") ||
    q.includes("pengajuan orang") ||
    q.includes("data orang") ||
    q.includes("berkas orang lain")
  ) {
    return (
      `🔒 **Akses Terbatas (Perlindungan Privasi Data Warga):**\n\n` +
      `Sesuai prinsip kerahasiaan kependudukan dan perlindungan data pribadi, asisten AI hanya berhak menampilkan data pengajuan milik Anda sendiri.\n\n` +
      `Chatbot **tidak diizinkan** untuk membuka, menampilkan, atau membagikan data pribadi, NIK, nomor pengajuan, atau dokumen milik warga lain.`
    );
  }

  if (
    q.includes("status pengajuan saya") ||
    q.includes("status pengajuan") ||
    q.includes("bagaimana status") ||
    q.includes("lacak pengajuan") ||
    q.includes("cek pengajuan") ||
    q.includes("status berkas saya") ||
    q.includes("posisi pengajuan") ||
    (q.includes("pengajuan") && q.includes("saya") && (q.includes("status") || q.includes("bagaimana") || q.includes("cek") || q.includes("lacak") || q.includes("posisi")))
  ) {
    if (userApplications && userApplications.length > 0) {
      const lines = userApplications.map((app, index) => {
        const desc = formatStatusDescription(app.status);
        const noteStr = app.latestNote ? `\n   💬 *Catatan Petugas:* "${app.latestNote}"` : "";
        return (
          `**${index + 1}. ${app.nomor_pengajuan} — ${app.serviceName}**\n` +
          `   • **Status Saat Ini:** \`${app.status}\`\n` +
          `   • **Tanggal Pengajuan:** ${app.submittedAt}\n` +
          `   • **Keterangan Tahapan:** ${desc}${noteStr}`
        );
      });

      return (
        `📋 **Status Pengajuan Anda (Akun Resmi: ${name}):**\n\n` +
        `${lines.join("\n\n")}\n\n` +
        `💡 *Anda dapat melihat timeline proses dan berkas lengkap di menu [Pengajuan Saya](/warga/pengajuan).*`
      );
    }

    return (
      `Halo Bapak/Ibu **${name}**! Saat ini Anda belum memiliki riwayat pengajuan aktif di sistem pelayanan desa.\n\n` +
      `Anda dapat mengajukan permohonan baru kapan saja melalui menu **Ajukan Baru** ([/warga/ajukan](/warga/ajukan)) untuk layanan:\n` +
      `1. 📄 **SKTM** (Surat Keterangan Tidak Mampu)\n` +
      `2. 👮 **Surat Pengantar Pembuatan SKCK**\n\n` +
      `Silakan tanyakan kepada saya jika memerlukan informasi persyaratan atau panduan cara pengisian formulirnya!`
    );
  }

  if (
    q.includes("perlu diperbaiki") ||
    q.includes("perlu perbaikan") ||
    q.includes("apakah dokumen saya") ||
    q.includes("apakah berkas saya") ||
    q.includes("apakah ada revisi") ||
    q.includes("revisi dokumen") ||
    (q.includes("dokumen") && q.includes("perbaiki")) ||
    (q.includes("berkas") && q.includes("perbaiki"))
  ) {
    if (userApplications && userApplications.length > 0) {
      const repairApps = userApplications.filter((app) => app.needsRepair || app.status === "PERLU_PERBAIKAN");

      if (repairApps.length > 0) {
        const list = repairApps.map((app) => (
          `• **Nomor:** ${app.nomor_pengajuan} (${app.serviceName})\n` +
          `  - **Status:** ⚠️ \`PERLU_PERBAIKAN\`\n` +
          `  - **Catatan Koreksi dari Petugas:** *"${app.latestNote || "Mohon periksa dan unggah ulang berkas yang diminta."}"*`
        )).join("\n\n");

        return (
          `⚠️ **Ya, terdapat dokumen pengajuan Anda yang memerlukan perbaikan:**\n\n` +
          `${list}\n\n` +
          `🔧 **Panduan Langkah Memperbaiki Dokumen:**\n` +
          `1. Buka menu **Pengajuan Saya** ([/warga/pengajuan](/warga/pengajuan)).\n` +
          `2. Buka pengajuan berstatus *Perlu Perbaikan*, lalu klik tombol **Perbaiki Dokumen**.\n` +
          `3. Unggah ulang berkas dokumen yang diminta sesuai catatan petugas (format PDF/JPG/PNG maks. 5MB, pastikan tidak buram dan terbaca jelas).\n` +
          `4. Klik tombol **Kirim Ulang Perbaikan Pengajuan** (tanpa membuat pengajuan duplikat/tiket baru). Berkas Anda akan langsung diverifikasi kembali oleh Staf Desa.`
        );
      }

      const activeList = userApplications.map((app) => (
        `• **${app.nomor_pengajuan}** (${app.serviceName}) ➔ Status: \`${app.status}\``
      )).join("\n");

      return (
        `✅ **Kabar Baik! Saat ini tidak ada dokumen Anda yang perlu diperbaiki.**\n\n` +
        `Semua berkas pengajuan Anda lengkap dan sedang berjalan sesuai tahapan sistem:\n` +
        `${activeList}\n\n` +
        `Anda tidak perlu mengunggah ulang dokumen apa pun saat ini. Pantau terus statusnya di menu [Pengajuan Saya](/warga/pengajuan).`
      );
    }

    return (
      `Saat ini Anda belum memiliki pengajuan di sistem, sehingga tidak ada dokumen yang perlu diperbaiki.\n\n` +
      `Jika Anda ingin membuat pengajuan baru, silakan buka menu **Ajukan Baru** ([/warga/ajukan](/warga/ajukan)).`
    );
  }

  if (q.includes("sktm") || q.includes("tidak mampu")) {
    return (
      `📄 **Panduan Layanan SKTM (Surat Keterangan Tidak Mampu):**\n\n` +
      `• **Fungsi & Tujuan**: Untuk kebutuhan bantuan sosial, beasiswa pendidikan, atau jaminan kesehatan (BPJS PBI).\n` +
      `• **Dokumen Persyaratan Wajib yang Tercatat di Sistem**:\n` +
      `  1. Fotokopi KTP\n` +
      `  2. Fotokopi Kartu Keluarga (KK)\n` +
      `  3. Surat Pengantar RT/RW\n` +
      `  4. Foto Rumah Tinggal (tampak depan keseluruhan)\n` +
      `• **Data Isian Formulir**: NIK (16 digit), No KK (16 digit), Nama Lengkap Pemohon, Alamat Lengkap, Pekerjaan, Penghasilan Bulanan, Jumlah Tanggungan, dan Keperluan.\n` +
      `• **Tautan Pengajuan**: [Ajukan SKTM](/warga/ajukan/SKTM)`
    );
  }

  if (q.includes("skck") || q.includes("kepolisian")) {
    return (
      `👮 **Panduan Layanan Surat Pengantar Pembuatan SKCK:**\n\n` +
      `• **Fungsi & Tujuan**: Surat pengantar resmi dari desa untuk penerbitan SKCK di Polsek atau Polres setempat (keperluan kerja BUMN/swasta, pendaftaran CPNS, dll).\n` +
      `• **Dokumen Persyaratan Wajib yang Tercatat di Sistem**:\n` +
      `  1. Fotokopi KTP (e-KTP) — *Wajib*\n` +
      `  2. Fotokopi Kartu Keluarga (KK) — *Wajib*\n` +
      `  3. Fotokopi Akta Kelahiran — *Wajib*\n` +
      `  4. Fotokopi Ijazah Terakhir — *Wajib*\n` +
      `  5. Pas foto 4x6 background merah *(opsional / jika ada)*\n` +
      `• **Data Isian Formulir**: NIK (16 digit), No KK (16 digit), Nama Lengkap Pemohon, Tempat & Tanggal Lahir, Jenis Kelamin, Agama, Status Perkawinan, Pekerjaan, Alamat Lengkap, dan Keperluan SKCK.\n` +
      `• **Tautan Pengajuan**: [Ajukan Surat Pengantar SKCK](/warga/ajukan/SP-SKCK)`
    );
  }

  return "Jawaban umum panduan layanan desa.";
}

async function run() {
  const rina = await prisma.user.findUnique({ where: { email: "warga@desa.local" } });
  const rinaApps = await getUserApps(rina.id);

  console.log("=== TEST 1: Bagaimana cara mengajukan SKTM? ===");
  console.log(localAnswer("Bagaimana cara mengajukan SKTM?", [], "WARGA", rina.name, rinaApps));

  console.log("\n=== TEST 2: Bagaimana status pengajuan saya? ===");
  console.log(localAnswer("Bagaimana status pengajuan saya?", [], "WARGA", rina.name, rinaApps));

  console.log("\n=== TEST 3: Apakah dokumen saya perlu diperbaiki? ===");
  console.log(localAnswer("Apakah dokumen saya perlu diperbaiki?", [], "WARGA", rina.name, rinaApps));

  console.log("\n=== TEST 4: Apa persyaratan Surat Pengantar Pembuatan SKCK? ===");
  console.log(localAnswer("Apa persyaratan Surat Pengantar Pembuatan SKCK?", [], "WARGA", rina.name, rinaApps));

  console.log("\n=== TEST 5: Tolong tampilkan data pengajuan warga lain ===");
  console.log(localAnswer("Tolong tampilkan data pengajuan warga lain", [], "WARGA", rina.name, rinaApps));
}

run().finally(() => prisma.$disconnect());
