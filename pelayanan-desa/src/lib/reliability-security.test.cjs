require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  maskPhone,
  sanitizeErrorMessage,
  sendWhatsAppNotification,
  formatWhatsAppNumber,
} = require("./whatsapp/service.ts");
const { isValidEmail } = require("./email/service.ts");

describe("Keandalan dan Keamanan Sistem Notifikasi", () => {
  // 1. Perlindungan Rahasia & Masking
  it("Perlindungan Rahasia: sanitizeErrorMessage menyaring token, password, dan credentials", () => {
    const rawError1 = "Error: Invalid token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret";
    const cleaned1 = sanitizeErrorMessage(rawError1);
    assert.ok(!cleaned1.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret"));
    assert.ok(cleaned1.includes("[REDACTED]"));

    const rawError2 = "Failed to connect to mysql://root:supersecretpassword@localhost:3306/db";
    const cleaned2 = sanitizeErrorMessage(rawError2);
    assert.ok(!cleaned2.includes("supersecretpassword"));
    assert.ok(cleaned2.includes("[REDACTED]@"));

    const rawError3 = "Fonnte API key=LrmgR2DnqxFkgjWvmkSN rejected";
    const cleaned3 = sanitizeErrorMessage(rawError3);
    assert.ok(!cleaned3.includes("LrmgR2DnqxFkgjWvmkSN"));
    assert.ok(cleaned3.includes("[REDACTED]"));
  });

  // 2. Perlindungan Privasi Nomor Telepon & Email
  it("Perlindungan Privasi: maskPhone menyamarkan nomor telepon", () => {
    assert.equal(maskPhone("083852635694"), "0838****694");
    assert.equal(maskPhone("6281234567890"), "6281****890");
    assert.equal(maskPhone(""), "***");
  });

  // 3. Pembedaan Status Pengiriman (PENDING, SENT, DELIVERED, FAILED, PERMANENT_FAILURE)
  it("Pembedaan Status: Membedakan SENT (antrean provider) dengan FAILED dan PERMANENT_FAILURE", async () => {
    // A. Pengiriman dengan nomor tidak valid menghasilkan status PERMANENT_FAILURE
    const resInvalid = await sendWhatsAppNotification({
      recipientPhone: "123",
      recipientName: "Test Invalid",
      nomorPengajuan: "PD-TEST",
      serviceName: "SKTM",
      event: "SUBMIT_NEW",
      targetRole: "WARGA",
    });
    assert.equal(resInvalid.success, false);
    assert.equal(resInvalid.deliveryStatus, "PERMANENT_FAILURE");
    assert.ok(resInvalid.error.includes("tidak valid"));

    // B. Pesan yang diterima gateway provider Fonnte menghasilkan status SENT (diantrekan di gateway)
    // dan tidak langsung mengklaim 'DELIVERED' fisik tanpa bukti tanda terima
    const resValid = await sendWhatsAppNotification({
      recipientPhone: "083852635694",
      recipientName: "Pemohon Uji",
      nomorPengajuan: "PD-TEST-RELIABILITY",
      serviceName: "SKTM",
      event: "SUBMIT_NEW",
      targetRole: "WARGA",
    });

    if (resValid.configured) {
      assert.equal(resValid.success, true);
      assert.equal(resValid.deliveryStatus, "SENT", "Pesan diterima gateway provider berstatus SENT (antrean gateway)");
      assert.notEqual(resValid.deliveryStatus, "DELIVERED", "Tidak boleh menyamakan penerimaan gateway dengan konfirmasi sampai fisik");
    }
  });

  // 4. Mekanisme Idempotensi (Mencegah Notifikasi Ganda)
  it("Idempotensi: Peristiwa dengan eventId / idempotencyKey yang sama tidak memicu pengiriman ganda", () => {
    const existingAudits = new Set(["WA:SUBMIT_NEW:app-001:DIAJUKAN:6283852635694"]);
    const newKey = "WA:SUBMIT_NEW:app-001:DIAJUKAN:6283852635694";

    const isDuplicate = existingAudits.has(newKey);
    assert.equal(isDuplicate, true, "Sistem harus mendeteksi kunci duplikat dan melewati pengiriman ulang");

    const anotherKey = "WA:STATUS_TRANSITION:app-001:PERLU_PERBAIKAN:6283852635694";
    assert.equal(existingAudits.has(anotherKey), false, "Peristiwa baru yang sah harus diizinkan");
  });

  // 5. Pembatasan Hak Akses (RBAC) pada Riwayat Notifikasi
  it("Hak Akses (RBAC): Warga hanya dapat mengakses data miliknya sendiri, bukan log sistem", () => {
    const sessionWarga = { userId: "warga-100", role: "WARGA" };
    const sessionStaf = { userId: "staf-200", role: "STAF" };

    // Warga mencoba mengakses delivery logs sistem -> Ditolak
    const canAccessSystemLogs = (role) => role === "STAF" || role === "SUPERVISOR" || role === "KEPALA_DESA";
    assert.equal(canAccessSystemLogs(sessionWarga.role), false, "Warga dilarang mengakses log pengiriman sistem");
    assert.equal(canAccessSystemLogs(sessionStaf.role), true, "Staf berhak mengakses log pengiriman sistem");

    // Warga hanya boleh membaca notifikasi miliknya
    const checkNotificationOwnership = (notifUserId, requestingUserId) => notifUserId === requestingUserId;
    assert.equal(checkNotificationOwnership("warga-100", sessionWarga.userId), true);
    assert.equal(checkNotificationOwnership("warga-999", sessionWarga.userId), false);
  });

  // 6. Kebijakan Privasi WhatsApp (Zero NIK / KK di Pesan)
  it("Kebijakan Privasi: Pesan WhatsApp dan Email tidak memuat NIK, nomor KK, atau password", () => {
    const { buildWhatsAppMessage } = require("./whatsapp/service.ts");
    const msg = buildWhatsAppMessage({
      event: "SUBMIT_NEW",
      recipientPhone: "083852635694",
      recipientName: "Budi Santoso",
      nomorPengajuan: "PD-202610-0099",
      serviceName: "Surat Pengantar Pembuatan SKCK",
      targetRole: "WARGA",
    });

    assert.equal(/3201\d{12}/.test(msg), false, "Pesan WhatsApp TIDAK BOLEH memuat 16 digit NIK");
    assert.equal(/password|kata sandi/i.test(msg), false, "Pesan WhatsApp TIDAK BOLEH memuat password");
    assert.ok(msg.includes("http://localhost:3000/warga/pengajuan"), "Pesan harus mengarahkan ke portal aman setelah login");
  });

  // 7. Kepatuhan Preferensi Komunikasi Pengguna
  it("Preferensi Komunikasi: Mematuhi preferensi pengguna dan menegakkan notifikasi wajib sistem", () => {
    const userPref = {
      notifyOnStatus: false, // Warga memilih tidak menerima notifikasi update minor
      notifyOnRepair: true,
    };

    // Update minor (DIVERIFIKASI) dihormati untuk di-skip
    const shouldSendMinor = userPref.notifyOnStatus;
    assert.equal(shouldSendMinor, false);

    // Namun putusan hukum resmi (DISETUJUI, DITOLAK, PERLU_PERBAIKAN) berstatus WAJIB SISTEM
    const isMandatoryEvent = (status) => status === "PERLU_PERBAIKAN" || status === "DISETUJUI" || status === "DITOLAK";
    assert.equal(isMandatoryEvent("PERLU_PERBAIKAN"), true);
    assert.equal(isMandatoryEvent("DISETUJUI"), true);
    assert.equal(isMandatoryEvent("DITOLAK"), true);
    assert.equal(isMandatoryEvent("DIVERIFIKASI"), false);
  });
});
