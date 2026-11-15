require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatWhatsAppNumber,
  isValidWhatsAppNumber,
  buildWhatsAppMessage,
  sendWhatsAppNotification,
} = require("./whatsapp/service.ts");
const { dispatchEmailNotificationsForEvent } = require("./notifications.ts");

describe("Sistem Notifikasi WhatsApp Warga Pelayanan Desa", () => {
  it("memformat nomor WhatsApp ke standar internasional dengan benar", () => {
    assert.equal(formatWhatsAppNumber("083852635694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("+6283852635694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("0838-5263-5694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("83852635694"), "6283852635694");
  });

  it("memvalidasi keabsahan nomor WhatsApp", () => {
    assert.equal(isValidWhatsAppNumber("083852635694"), true);
    assert.equal(isValidWhatsAppNumber("6283852635694"), true);
    assert.equal(isValidWhatsAppNumber(""), false);
    assert.equal(isValidWhatsAppNumber("123"), false);
    assert.equal(isValidWhatsAppNumber(null), false);
  });

  it("menyusun pesan WhatsApp untuk pengajuan baru (SUBMIT_NEW)", () => {
    const message = buildWhatsAppMessage({
      event: "SUBMIT_NEW",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
    });

    assert.ok(message.includes("Konfirmasi Penerimaan Pengajuan"));
    assert.ok(message.includes("Rina Wati"));
    assert.ok(message.includes("PD-202610-0001"));
    assert.ok(message.includes("Surat Keterangan Tidak Mampu"));
    assert.ok(message.includes("DIAJUKAN"));
  });

  it("menyusun pesan WhatsApp untuk instruksi perbaikan dokumen (PERLU_PERBAIKAN)", () => {
    const note = "Foto KTP buram, mohon unggah ulang";
    const message = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "PERLU_PERBAIKAN",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
      note,
    });

    assert.ok(message.includes("Instruksi Perbaikan Dokumen"));
    assert.ok(message.includes("Rina Wati"));
    assert.ok(message.includes(note));
  });

  it("menyusun pesan WhatsApp untuk persetujuan Kepala Desa (DISETUJUI)", () => {
    const message = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "DISETUJUI",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
    });

    assert.ok(message.includes("DISETUJUI"));
    assert.ok(message.includes("Kepala Desa"));
  });

  it("menyusun pesan WhatsApp untuk penolakan permohonan (DITOLAK)", () => {
    const reason = "Persyaratan domisili tidak memenuhi ketentuan";
    const message = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "DITOLAK",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
      note: reason,
    });

    assert.ok(message.includes("Tidak Disetujui"));
    assert.ok(message.includes(reason));
  });

  it("menyusun pesan WhatsApp untuk penerbitan surat resmi (SEND_OFFICIAL_LETTER)", () => {
    const message = buildWhatsAppMessage({
      event: "SEND_OFFICIAL_LETTER",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
    });

    assert.ok(message.includes("Surat Resmi Telah Diterbitkan & Selesai"));
    assert.ok(message.includes("PD-202610-0001"));
  });

  it("menyusun pesan WhatsApp khusus untuk Staf Pelayanan Desa saat pengajuan baru masuk", () => {
    const message = buildWhatsAppMessage({
      event: "SUBMIT_NEW",
      recipientPhone: "081200000003",
      recipientName: "Agus Wijaya",
      applicantName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "STAF",
    });

    assert.ok(message.includes("Pemberitahuan Tugas: Pengajuan Baru Masuk"));
    assert.ok(message.includes("Agus Wijaya"));
    assert.ok(message.includes("Rina Wati"));
    assert.ok(message.includes("staf/pengajuan"));
  });

  it("menyusun pesan WhatsApp khusus untuk Supervisor Desa saat telaah mutu berkas", () => {
    const message = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "REVIEW_SUPERVISOR",
      recipientPhone: "081200000002",
      recipientName: "Sari Dewi",
      applicantName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "SUPERVISOR",
    });

    assert.ok(message.includes("Pemberitahuan Tugas: Pengajuan Siap Ditelaah"));
    assert.ok(message.includes("Sari Dewi"));
    assert.ok(message.includes("supervisor/pengajuan"));
  });

  it("menyusun pesan WhatsApp khusus untuk Kepala Desa saat pengajuan menunggu approval", () => {
    const message = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "MENUNGGU_APPROVAL",
      recipientPhone: "083852635694",
      recipientName: "Budi Santoso",
      applicantName: "Rina Wati",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "KEPALA_DESA",
    });

    assert.ok(message.includes("Menunggu Persetujuan & Tanda Tangan"));
    assert.ok(message.includes("Budi Santoso"));
    assert.ok(message.includes("kades/persetujuan"));
  });

  it("menyusun pesan WhatsApp peringatan kendala/error untuk Supervisor Desa (ERROR_ALERT)", () => {
    const message = buildWhatsAppMessage({
      event: "ERROR_ALERT",
      recipientPhone: "081200000002",
      recipientName: "Sari Dewi",
      nomorPengajuan: "SYS-ALERT-001",
      serviceName: "Layanan Verifikasi OCR",
      title: "Peringatan Error: Kegagalan Ekstraksi OCR",
      message: "Gagal memproses dokumen KTP pada berkas antrean",
      targetRole: "SUPERVISOR",
    });

    assert.ok(message.includes("Peringatan Sistem: Kendala Fitur / Error"));
    assert.ok(message.includes("Sari Dewi"));
    assert.ok(message.includes("Layanan Verifikasi OCR"));
    assert.ok(message.includes("supervisor/dashboard"));
  });

  it("menolak pengiriman WhatsApp jika kontak tidak valid atau kosong dan menyertakan instruksi profil", async () => {
    // Nomor kosong
    const resEmpty = await sendWhatsAppNotification({
      event: "SUBMIT_NEW",
      recipientPhone: "",
      recipientName: "Warga Tanpa Kontak",
      nomorPengajuan: "PD-202610-0099",
      serviceName: "Surat Pengantar",
    });
    assert.equal(resEmpty.success, false);
    assert.ok(resEmpty.error.includes("/profil"));

    // Nomor tidak valid (terlalu pendek)
    const resInvalid = await sendWhatsAppNotification({
      event: "SUBMIT_NEW",
      recipientPhone: "123",
      recipientName: "Warga Kontak Salah",
      nomorPengajuan: "PD-202610-0099",
      serviceName: "Surat Pengantar",
    });
    assert.equal(resInvalid.success, false);
    assert.ok(resInvalid.error.includes("/profil"));
  });

  it("memastikan isolasi data kontak antar warga (Warga A tidak pernah menerima kontak Warga B)", async () => {
    const wargaA = { name: "Ahmad Warga A", phone: "081234567890" };
    const wargaB = { name: "Budi Warga B", phone: "089876543210" };

    const payloadA = {
      event: "SUBMIT_NEW",
      recipientPhone: wargaA.phone,
      recipientName: wargaA.name,
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Usaha",
    };

    const payloadB = {
      event: "SUBMIT_NEW",
      recipientPhone: wargaB.phone,
      recipientName: wargaB.name,
      nomorPengajuan: "PD-202610-0002",
      serviceName: "Surat Domisili",
    };

    const resA = await sendWhatsAppNotification(payloadA);
    const resB = await sendWhatsAppNotification(payloadB);

    assert.equal(resA.formattedPhone, "6281234567890");
    assert.equal(resB.formattedPhone, "6289876543210");
    assert.notEqual(resA.formattedPhone, resB.formattedPhone);
  });

  it("memastikan dispatchEmailNotificationsForEvent berhasil mengirim notifikasi ke seluruh aktor tanpa kegagalan", async () => {
    await assert.doesNotReject(async () => {
      await dispatchEmailNotificationsForEvent({
        event: "SUBMIT_NEW",
        applicationId: "mock-app-id",
        nomorPengajuan: "PD-202610-TEST",
        serviceName: "Surat Keterangan Tidak Mampu",
        applicant: {
          id: "mock-user-id",
          name: "Rina Wati",
          email: "ramlicirebon0@gmail.com",
          phone: "083852635694",
        },
        newStatus: "DIAJUKAN",
      });
    });
  });

  it("memastikan dispatchSupervisorErrorNotification berjalan tanpa error untuk memberi tahu Supervisor", async () => {
    const { dispatchSupervisorErrorNotification } = require("./notifications.ts");
    await assert.doesNotReject(async () => {
      await dispatchSupervisorErrorNotification({
        errorTitle: "Gagal Mengunggah Berkas",
        errorMessage: "Storage timeout saat pemrosesan lampiran PDF",
        sourceFeature: "Sistem Pengajuan Berkas",
        applicationId: "mock-app-id",
        nomorPengajuan: "PD-202610-TEST",
        errorDetails: "E_CONN_TIMEOUT pada socket port 443",
      });
    });
  });

  it("memeriksa status konfigurasi gateway WhatsApp dan mendeteksi variabel yang belum terpasang", () => {
    const { checkWhatsAppConfigStatus } = require("./whatsapp/service.ts");
    // Simpan env asli
    const origPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const origToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const origFonnte = process.env.FONNTE_TOKEN;
    const origWaToken = process.env.WHATSAPP_TOKEN;
    const origApiUrl = process.env.WHATSAPP_API_URL;

    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.FONNTE_TOKEN;
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_API_URL;

    const statusUnconfigured = checkWhatsAppConfigStatus();
    assert.equal(statusUnconfigured.isConfigured, false);
    assert.equal(statusUnconfigured.provider, "NONE");
    assert.ok(statusUnconfigured.missingVariables.length > 0);
    assert.ok(statusUnconfigured.instructions.includes("PETUNJUK AKTIVASI LAYANAN WHATSAPP BUSINESS"));

    // Uji mode Meta Cloud API
    process.env.WHATSAPP_PHONE_NUMBER_ID = "100234567890123";
    process.env.WHATSAPP_ACCESS_TOKEN = "EAAB...mock_access_token";
    const statusMeta = checkWhatsAppConfigStatus();
    assert.equal(statusMeta.isConfigured, true);
    assert.equal(statusMeta.provider, "META_CLOUD_API");

    // Uji mode BSP Fonnte
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    process.env.FONNTE_TOKEN = "fonnte_device_token_xyz";
    const statusFonnte = checkWhatsAppConfigStatus();
    assert.equal(statusFonnte.isConfigured, true);
    assert.equal(statusFonnte.provider, "FONNTE");

    // Kembalikan env asli
    if (origPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = origPhoneId;
    if (origToken) process.env.WHATSAPP_ACCESS_TOKEN = origToken;
    if (origFonnte) process.env.FONNTE_TOKEN = origFonnte;
    if (origWaToken) process.env.WHATSAPP_TOKEN = origWaToken;
    if (origApiUrl) process.env.WHATSAPP_API_URL = origApiUrl;
  });

  it("melakukan normalisasi nomor telepon Indonesia dengan berbagai format ke standar E.164 (62...)", () => {
    assert.equal(formatWhatsAppNumber("083852635694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("+6283852635694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("6283852635694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("0838-5263-5694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("+62 838 5263 5694"), "6283852635694");
    assert.equal(formatWhatsAppNumber("62083852635694"), "6283852635694"); // Typo awalan 6208
  });

  it("menyusun payload Meta WhatsApp Business Cloud API (template dan text) dengan benar", () => {
    const { buildMetaCloudApiPayload } = require("./whatsapp/service.ts");
    const payload = {
      event: "STATUS_TRANSITION",
      status: "DISETUJUI",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-001",
      serviceName: "Surat Keterangan Tidak Mampu",
    };

    // Mode direct text (tanpa template Meta)
    const origTemplate = process.env.WHATSAPP_TEMPLATE_NAME;
    delete process.env.WHATSAPP_TEMPLATE_NAME;

    const textPayload = buildMetaCloudApiPayload(payload, "6283852635694");
    assert.equal(textPayload.messaging_product, "whatsapp");
    assert.equal(textPayload.type, "text");
    assert.equal(textPayload.to, "6283852635694");
    assert.ok(textPayload.text.body.includes("DISETUJUI"));

    // Mode approved Meta Template
    process.env.WHATSAPP_TEMPLATE_NAME = "pelayanan_desa_status";
    const templatePayload = buildMetaCloudApiPayload(payload, "6283852635694");
    assert.equal(templatePayload.type, "template");
    assert.equal(templatePayload.template.name, "pelayanan_desa_status");
    assert.equal(templatePayload.template.language.code, "id");
    assert.equal(templatePayload.template.components[0].parameters.length, 5);

    if (origTemplate) {
      process.env.WHATSAPP_TEMPLATE_NAME = origTemplate;
    } else {
      delete process.env.WHATSAPP_TEMPLATE_NAME;
    }
  });

  it("menyusun pesan WhatsApp untuk peristiwa DIVERIFIKASI dan MENUNGGU_APPROVAL", () => {
    const msgVerif = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "DIVERIFIKASI",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "WARGA",
    });
    assert.ok(msgVerif.includes("SEDANG DIVERIFIKASI"));
    assert.ok(msgVerif.includes("Rina Wati"));

    const msgApproval = buildWhatsAppMessage({
      event: "STATUS_TRANSITION",
      status: "MENUNGGU_APPROVAL",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "WARGA",
    });
    assert.ok(msgApproval.includes("Menunggu Persetujuan Kades"));
    assert.ok(msgApproval.includes("Rina Wati"));
  });

  it("menolak mengklaim pesan berhasil terkirim jika gateway API belum dikonfigurasi di server", async () => {
    // Pastikan tidak ada kredensial gateway aktif
    const origSim = process.env.WHATSAPP_SIMULATION;
    delete process.env.WHATSAPP_SIMULATION;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.FONNTE_TOKEN;
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_API_URL;

    const res = await sendWhatsAppNotification({
      event: "SUBMIT_NEW",
      recipientPhone: "083852635694",
      recipientName: "Rina Wati",
      nomorPengajuan: "PD-202610-001",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "WARGA",
    });

    assert.equal(res.success, false, "Tidak boleh mengklaim sukses jika belum ada gateway");
    assert.equal(res.provider, "NONE");
    assert.equal(res.configured, false);
    assert.ok(res.error.includes("belum dikonfigurasi"));
    assert.ok(res.instructions.includes("PETUNJUK AKTIVASI"));
    assert.ok(res.waUrl.startsWith("https://wa.me/6283852635694"));

    if (origSim) process.env.WHATSAPP_SIMULATION = origSim;
  });
});
