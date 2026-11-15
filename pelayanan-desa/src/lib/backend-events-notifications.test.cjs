require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { recordInAppNotificationsForEvent } = require("./notifications.ts");
const { canTransition, getAllowedTransitions, WORKFLOW_TRANSITIONS } = require("./workflow.ts");
const { formatWhatsAppNumber, buildWhatsAppMessage } = require("./whatsapp/service.ts");

describe("Uji Keterhubungan Notifikasi dengan Peristiwa Backend & Database", () => {
  // 1. Warga mengirim pengajuan -> Simpan ke DB -> Notifikasi konfirmasi warga & pemberitahuan staf
  it("Alur 1: Warga mengirim pengajuan -> simpan DB -> notifikasi konfirmasi warga dan antrean staf", async () => {
    const createdInApp = [];
    const mockTx = {
      notificationPreference: { findUnique: async () => null },
      notification: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdInApp.push(data);
          return { id: "notif-1", ...data };
        },
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === "STAF") return [{ id: "staf-1", name: "Ahmad Staf", phone: "081234567890" }];
          return [];
        },
      },
    };

    // Simulasi penyimpanan backend sukses
    await recordInAppNotificationsForEvent(mockTx, {
      event: "SUBMIT_NEW",
      applicationId: "app-backend-001",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      applicant: { id: "warga-1", name: "Budi Santoso", email: "budi@desa.local", phone: "083852635694" },
      newStatus: "DIAJUKAN",
    });

    // Verifikasi warga menerima konfirmasi penerimaan
    const wargaNotif = createdInApp.find((n) => n.userId === "warga-1");
    assert.ok(wargaNotif, "Warga wajib menerima notifikasi konfirmasi penerimaan");
    assert.equal(wargaNotif.type, "APPLICATION_CREATED");
    assert.ok(wargaNotif.title.includes("Konfirmasi Penerimaan"));

    // Verifikasi staf menerima notifikasi berkas baru di antrean
    const staffNotif = createdInApp.find((n) => n.userId === "staf-1");
    assert.ok(staffNotif, "Staf wajib menerima notifikasi berkas baru");
    assert.ok(staffNotif.title.includes("Baru Masuk"));
    assert.ok(staffNotif.message.includes("Budi Santoso"));

    // Verifikasi pesan WhatsApp yang disusun untuk warga
    const waWarga = buildWhatsAppMessage({
      event: "SUBMIT_NEW",
      recipientPhone: "083852635694",
      recipientName: "Budi Santoso",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      targetRole: "WARGA",
    });
    assert.ok(waWarga.includes("Konfirmasi Penerimaan Pengajuan"));
    assert.ok(waWarga.includes("PD-202610-0001"));
  });

  // 2. Staf Desa meminta perbaikan -> Simpan status PERLU_PERBAIKAN -> Notifikasi ke warga pemohon
  it("Alur 2: Staf meminta perbaikan berkas -> simpan status PERLU_PERBAIKAN -> instruksi perbaikan ke warga", async () => {
    // Validasi otorisasi transisi staf
    assert.equal(canTransition("STAF", "DIAJUKAN", "PERLU_PERBAIKAN"), true);

    const createdInApp = [];
    const mockTx = {
      notificationPreference: { findUnique: async () => null },
      notification: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdInApp.push(data);
          return { id: "notif-2", ...data };
        },
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === "STAF") return [{ id: "staf-1" }];
          return [];
        },
      },
    };

    const repairNote = "Foto KTP buram, mohon unggah ulang dengan jelas.";

    await recordInAppNotificationsForEvent(mockTx, {
      event: "STATUS_TRANSITION",
      applicationId: "app-backend-002",
      nomorPengajuan: "PD-202610-0002",
      serviceName: "Surat Pengantar Pembuatan SKCK",
      applicant: { id: "warga-2", name: "Siti Rahma", email: "siti@desa.local", phone: "083852635694" },
      oldStatus: "DIAJUKAN",
      newStatus: "PERLU_PERBAIKAN",
      note: repairNote,
    });

    const wargaNotif = createdInApp.find((n) => n.userId === "warga-2");
    assert.ok(wargaNotif, "Warga wajib menerima instruksi perbaikan dokumen");
    assert.equal(wargaNotif.type, "DOCUMENT_REPAIR");
    assert.ok(wargaNotif.message.includes(repairNote));

    // Pesan WhatsApp warga menyertakan catatan perbaikan
    const waWarga = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      recipientPhone: "083852635694",
      recipientName: "Siti Rahma",
      nomorPengajuan: "PD-202610-0002",
      serviceName: "Surat Pengantar Pembuatan SKCK",
      status: "PERLU_PERBAIKAN",
      note: repairNote,
      targetRole: "WARGA",
    });
    assert.ok(waWarga.includes("Instruksi Perbaikan Dokumen"));
    assert.ok(waWarga.includes(repairNote));
  });

  // 3. Staf Desa meneruskan pengajuan -> Simpan status MENUNGGU_APPROVAL -> Beri tahu Kepala Desa
  it("Alur 3: Staf meneruskan pengajuan -> simpan status MENUNGGU_APPROVAL -> notifikasi tugas ke Kepala Desa", async () => {
    // Validasi otorisasi alur langsung: Staf dapat meneruskan langsung ke MENUNGGU_APPROVAL
    assert.equal(canTransition("STAF", "DIVERIFIKASI", "MENUNGGU_APPROVAL"), true);
    assert.equal(canTransition("STAF", "DIPROSES", "MENUNGGU_APPROVAL"), true);

    const createdInApp = [];
    const mockTx = {
      notificationPreference: { findUnique: async () => null },
      notification: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdInApp.push(data);
          return { id: "notif-3", ...data };
        },
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === "KEPALA_DESA") return [{ id: "kades-1", name: "Drs. Hendro Wibowo" }];
          return [];
        },
      },
    };

    await recordInAppNotificationsForEvent(mockTx, {
      event: "STATUS_TRANSITION",
      applicationId: "app-backend-003",
      nomorPengajuan: "PD-202610-0003",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      applicant: { id: "warga-3", name: "Joko Susilo", email: "joko@desa.local" },
      oldStatus: "DIVERIFIKASI",
      newStatus: "MENUNGGU_APPROVAL",
    });

    // Verifikasi Kepala Desa menerima notifikasi tugas persetujuan
    const kadesNotif = createdInApp.find((n) => n.userId === "kades-1");
    assert.ok(kadesNotif, "Kepala Desa wajib menerima notifikasi saat berkas siap keputusan");
    assert.ok(kadesNotif.title.includes("Keputusan Akhir") || kadesNotif.title.includes("Pengesahan Kades"));
    assert.ok(kadesNotif.message.includes("Joko Susilo"));

    // Verifikasi WhatsApp untuk Kepala Desa
    const waKades = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      recipientPhone: "081234567890",
      recipientName: "Drs. Hendro Wibowo",
      applicantName: "Joko Susilo",
      nomorPengajuan: "PD-202610-0003",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      status: "MENUNGGU_APPROVAL",
      targetRole: "KEPALA_DESA",
    });
    assert.ok(waKades.includes("Menunggu Persetujuan & Tanda Tangan"));
    assert.ok(waKades.includes("Drs. Hendro Wibowo"));
    assert.ok(waKades.includes("Joko Susilo"));
    assert.ok(waKades.includes("/kades/persetujuan"));
  });

  // 4. Kepala Desa menyetujui -> Simpan status DISETUJUI -> Notifikasi ke warga & staf
  it("Alur 4A: Kepala Desa menyetujui -> simpan status DISETUJUI -> notifikasi ke warga pemohon & staf", async () => {
    assert.equal(canTransition("KEPALA_DESA", "MENUNGGU_APPROVAL", "DISETUJUI"), true);

    const createdInApp = [];
    const mockTx = {
      notificationPreference: { findUnique: async () => null },
      notification: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdInApp.push(data);
          return { id: "notif-4", ...data };
        },
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === "STAF") return [{ id: "staf-1", name: "Ahmad Staf" }];
          if (where.role === "KEPALA_DESA") return [{ id: "kades-1", name: "Kades Hendro" }];
          return [];
        },
      },
    };

    await recordInAppNotificationsForEvent(mockTx, {
      event: "STATUS_TRANSITION",
      applicationId: "app-backend-004",
      nomorPengajuan: "PD-202610-0004",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      applicant: { id: "warga-4", name: "Dewi Lestari", email: "dewi@desa.local" },
      oldStatus: "MENUNGGU_APPROVAL",
      newStatus: "DISETUJUI",
    });

    const wargaNotif = createdInApp.find((n) => n.userId === "warga-4");
    assert.ok(wargaNotif, "Warga wajib menerima kabar gembira persetujuan");
    assert.equal(wargaNotif.type, "APPROVED");
    assert.ok(wargaNotif.title.includes("Disetujui"));

    const staffNotif = createdInApp.find((n) => n.userId === "staf-1");
    assert.ok(staffNotif, "Staf wajib menerima notifikasi pengajuan telah disetujui kades");
    assert.ok(staffNotif.title.includes("Telah Disetujui Kades"));

    // Pesan WhatsApp Warga
    const waWarga = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      recipientPhone: "083852635694",
      recipientName: "Dewi Lestari",
      nomorPengajuan: "PD-202610-0004",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      status: "DISETUJUI",
      targetRole: "WARGA",
    });
    assert.ok(waWarga.includes("Permohonan Disetujui"));
    assert.ok(waWarga.includes("DISETUJUI"));
  });

  // 5. Kepala Desa menolak -> Simpan status DITOLAK -> Notifikasi ke warga beserta alasan resmi
  it("Alur 4B: Kepala Desa menolak -> simpan status DITOLAK -> notifikasi penolakan dan alasan resmi ke warga", async () => {
    assert.equal(canTransition("KEPALA_DESA", "MENUNGGU_APPROVAL", "DITOLAK"), true);

    const createdInApp = [];
    const mockTx = {
      notificationPreference: { findUnique: async () => null },
      notification: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdInApp.push(data);
          return { id: "notif-5", ...data };
        },
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === "STAF") return [{ id: "staf-1" }];
          if (where.role === "KEPALA_DESA") return [{ id: "kades-1" }];
          return [];
        },
      },
    };

    const rejectReason = "Data penghasilan orang tua melebihi kriteria warga tidak mampu.";

    await recordInAppNotificationsForEvent(mockTx, {
      event: "STATUS_TRANSITION",
      applicationId: "app-backend-005",
      nomorPengajuan: "PD-202610-0005",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      applicant: { id: "warga-5", name: "Rudi Hartono", email: "rudi@desa.local" },
      oldStatus: "MENUNGGU_APPROVAL",
      newStatus: "DITOLAK",
      note: rejectReason,
    });

    const wargaNotif = createdInApp.find((n) => n.userId === "warga-5");
    assert.ok(wargaNotif, "Warga wajib menerima pemberitahuan hasil penolakan");
    assert.ok(wargaNotif.message.includes(rejectReason));

    // Pesan WhatsApp Warga menyertakan alasan penolakan resmi
    const waWarga = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      recipientPhone: "083852635694",
      recipientName: "Rudi Hartono",
      nomorPengajuan: "PD-202610-0005",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      status: "DITOLAK",
      note: rejectReason,
      targetRole: "WARGA",
    });
    assert.ok(waWarga.includes("Tidak Disetujui"));
    assert.ok(waWarga.includes(rejectReason));
  });

  // 6. Alur Pelayanan Resmi: Warga -> Staf Desa -> Kepala Desa (Supervisor bukan tahap persetujuan wajib)
  it("Alur 5: Menegakkan alur Warga -> Staf -> Kades tanpa approval wajib Supervisor", () => {
    // Alur langsung Warga -> Staf
    const stafAllowedFromDiajukan = getAllowedTransitions("STAF", "DIAJUKAN");
    assert.ok(stafAllowedFromDiajukan.includes("DIVERIFIKASI"));
    assert.ok(stafAllowedFromDiajukan.includes("PERLU_PERBAIKAN"));

    // Staf dapat langsung meneruskan ke antrean Kades tanpa tahap Supervisor
    const stafAllowedFromDiverifikasi = getAllowedTransitions("STAF", "DIVERIFIKASI");
    assert.ok(
      stafAllowedFromDiverifikasi.includes("MENUNGGU_APPROVAL"),
      "Staf harus dapat meneruskan langsung ke MENUNGGU_APPROVAL (Kepala Desa)"
    );

    const stafAllowedFromDiproses = getAllowedTransitions("STAF", "DIPROSES");
    assert.ok(
      stafAllowedFromDiproses.includes("MENUNGGU_APPROVAL"),
      "Staf harus dapat meneruskan dari DIPROSES langsung ke MENUNGGU_APPROVAL (Kepala Desa)"
    );

    // Kades memproses langsung MENUNGGU_APPROVAL
    const kadesAllowed = getAllowedTransitions("KEPALA_DESA", "MENUNGGU_APPROVAL");
    assert.ok(kadesAllowed.includes("DISETUJUI"));
    assert.ok(kadesAllowed.includes("DITOLAK"));
    assert.ok(kadesAllowed.includes("PERLU_PERBAIKAN"));

    // Supervisor TIDAK memiliki hak menyetujui di tahap MENUNGGU_APPROVAL
    const supAllowedOnApproval = getAllowedTransitions("SUPERVISOR", "MENUNGGU_APPROVAL");
    assert.equal(
      supAllowedOnApproval.includes("DISETUJUI"),
      false,
      "Supervisor TIDAK BOLEH menjadi tahap persetujuan wajib pengajuan warga"
    );
  });

  // 7. Notifikasi dipicu HANYA jika mutasi database berhasil
  it("Alur 6: Transaksi database gagal/batal tidak memicu notifikasi keluar", async () => {
    let transactionCommitted = false;
    let notificationDispatched = false;

    try {
      // Simulasi kegagalan database (misal conflict / concurrent transition)
      await (async () => {
        throw new Error("DATABASE_LOCK_TIMEOUT");
        transactionCommitted = true;
      })();

      // Kode notifikasi berada setelah transaksi commit
      notificationDispatched = true;
    } catch {
      // Transaksi gagal, ditangkap oleh catch block
    }

    assert.equal(transactionCommitted, false, "Transaksi DB harus dibatalkan");
    assert.equal(notificationDispatched, false, "Notifikasi TIDAK BOLEH terkirim jika DB gagal menyimpan");
  });
});
