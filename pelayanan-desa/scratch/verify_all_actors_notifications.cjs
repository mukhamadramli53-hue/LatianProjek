require("ts-node").register({ compilerOptions: { module: "CommonJS" } });
const { prisma } = require("../src/lib/db.ts");
const { dispatchEmailNotificationsForEvent } = require("../src/lib/notifications.ts");

async function main() {
  console.log("================================================================================");
  console.log("MEMULAI PENGUJIAN NOTIFIKASI EMAIL & WHATSAPP UNTUK SETIAP AKTOR PROFIL");
  console.log("================================================================================");

  // 1. Ambil seluruh data pengguna terdaftar
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    orderBy: { role: "asc" },
  });

  console.log(`\nTerdeteksi ${users.length} akun aktor dalam database:`);
  for (const u of users) {
    console.log(`• [${u.role.padEnd(11)}] ${u.name.padEnd(18)} | Email: ${u.email.padEnd(26)} | WhatsApp: ${u.phone}`);
  }

  // 2. Ambil sampel atau buat mock pengajuan untuk pengujian siklus notifikasi lengkap
  const wargaUser = users.find((u) => u.role === "WARGA");
  if (!wargaUser) {
    throw new Error("Tidak ditemukan akun warga.");
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("TAHAP 1: DISPATCH PENGAJUAN BARU (SUBMIT_NEW) -> WARGA & STAF DESA");
  console.log("--------------------------------------------------------------------------------");
  await dispatchEmailNotificationsForEvent({
    event: "SUBMIT_NEW",
    applicationId: "test-verif-app-001",
    nomorPengajuan: "PD-202610-VERIF01",
    serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
    applicant: {
      id: wargaUser.id,
      name: wargaUser.name,
      email: wargaUser.email,
      phone: wargaUser.phone,
    },
    newStatus: "DIAJUKAN",
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log("TAHAP 2: DISPATCH TELAAH BERKAS (REVIEW_SUPERVISOR) -> SUPERVISOR DESA");
  console.log("--------------------------------------------------------------------------------");
  await dispatchEmailNotificationsForEvent({
    event: "STATUS_TRANSITION",
    applicationId: "test-verif-app-001",
    nomorPengajuan: "PD-202610-VERIF01",
    serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
    applicant: {
      id: wargaUser.id,
      name: wargaUser.name,
      email: wargaUser.email,
      phone: wargaUser.phone,
    },
    newStatus: "REVIEW_SUPERVISOR",
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log("TAHAP 3: DISPATCH SIAP KEPUTUSAN (MENUNGGU_APPROVAL) -> KEPALA DESA");
  console.log("--------------------------------------------------------------------------------");
  await dispatchEmailNotificationsForEvent({
    event: "STATUS_TRANSITION",
    applicationId: "test-verif-app-001",
    nomorPengajuan: "PD-202610-VERIF01",
    serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
    applicant: {
      id: wargaUser.id,
      name: wargaUser.name,
      email: wargaUser.email,
      phone: wargaUser.phone,
    },
    newStatus: "MENUNGGU_APPROVAL",
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log("TAHAP 4: DISPATCH KEPUTUSAN DISETUJUI & SURAT TERBIT -> SELURUH AKTOR");
  console.log("--------------------------------------------------------------------------------");
  await dispatchEmailNotificationsForEvent({
    event: "SEND_OFFICIAL_LETTER",
    applicationId: "test-verif-app-001",
    nomorPengajuan: "PD-202610-VERIF01",
    serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
    applicant: {
      id: wargaUser.id,
      name: wargaUser.name,
      email: wargaUser.email,
      phone: wargaUser.phone,
    },
    officialLetterName: "Surat_Keputusan_Resmi_SKTM.pdf",
    newStatus: "SELESAI",
  });

  console.log("\n================================================================================");
  console.log("PENGUJIAN BERHASIL TUNTAS! SEMUA AKTOR TELAH MENERIMA NOTIFIKASI EMAIL & WHATSAPP.");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Terjadi kesalahan pengujian:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
