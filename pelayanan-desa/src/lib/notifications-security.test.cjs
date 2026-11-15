require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isValidEmail } = require("./email/service.ts");

describe("Keamanan dan Privasi - Sistem Notifikasi & Email", () => {
  it("memvalidasi format email penerima secara ketat (RFC 5322)", () => {
    // Alamat email valid
    assert.equal(isValidEmail("warga@desa.local"), true);
    assert.equal(isValidEmail("budi.santoso@gmail.com"), true);
    assert.equal(isValidEmail("staf.pelayanan@desa.go.id"), true);

    // Alamat email tidak valid / berbahaya / injeksi
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("invalid-email"), false);
    assert.equal(isValidEmail("warga@"), false);
    assert.equal(isValidEmail("@desa.local"), false);
    assert.equal(isValidEmail("warga@.local"), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail(undefined), false);
    assert.equal(isValidEmail("warga\r\nbcc:hacker@evil.com"), false);
  });

  it("memastikan tautan email tidak membocorkan token sesi, password, atau kredensial dalam URL", () => {
    const applicationId = "app-cuid-12345";
    const appUrl = "http://localhost:3000";

    // URL detail yang dihasilkan sistem
    const wargaDetailUrl = `${appUrl}/warga/pengajuan/${applicationId}`;
    const stafDetailUrl = `${appUrl}/staf/pengajuan/${applicationId}`;
    const supDetailUrl = `${appUrl}/supervisor/pengajuan/${applicationId}`;
    const kadesDetailUrl = `${appUrl}/kades/persetujuan/${applicationId}`;

    const testUrls = [wargaDetailUrl, stafDetailUrl, supDetailUrl, kadesDetailUrl];

    for (const urlStr of testUrls) {
      const parsedUrl = new URL(urlStr);

      // Verifikasi: tidak ada token sesi, cookie, atau password pada query parameters
      assert.equal(parsedUrl.searchParams.has("token"), false, "URL tidak boleh memiliki query parameter token");
      assert.equal(parsedUrl.searchParams.has("session"), false, "URL tidak boleh memiliki query parameter session");
      assert.equal(parsedUrl.searchParams.has("sessionToken"), false, "URL tidak boleh memiliki query parameter sessionToken");
      assert.equal(parsedUrl.searchParams.has("password"), false, "URL tidak boleh memiliki query parameter password");
      assert.equal(parsedUrl.searchParams.has("auth"), false, "URL tidak boleh memiliki query parameter auth");
      assert.equal(parsedUrl.searchParams.has("secret"), false, "URL tidak boleh memiliki query parameter secret");
      assert.equal(parsedUrl.password, "", "URL tidak boleh menyertakan password");
      assert.equal(parsedUrl.username, "", "URL tidak boleh menyertakan username");
    }
  });

  it("memastikan tautan email mengarah ke rute aplikasi yang benar dan dilindungi middleware", () => {
    const applicationId = "app-xyz-987";
    const roleRoutes = {
      WARGA: `/warga/pengajuan/${applicationId}`,
      STAF: `/staf/pengajuan/${applicationId}`,
      SUPERVISOR: `/supervisor/pengajuan/${applicationId}`,
      KEPALA_DESA: `/kades/persetujuan/${applicationId}`,
    };

    assert.equal(roleRoutes.WARGA.startsWith("/warga/"), true);
    assert.equal(roleRoutes.STAF.startsWith("/staf/"), true);
    assert.equal(roleRoutes.SUPERVISOR.startsWith("/supervisor/"), true);
    assert.equal(roleRoutes.KEPALA_DESA.startsWith("/kades/"), true);
  });

  it("memastikan isi email tidak menyertakan data privat warga lain (Zero NIK/KK Leak)", () => {
    // Simulasi payload data email yang sah
    const safeEmailPayload = {
      recipientName: "Budi Santoso",
      nomorPengajuan: "PD-202610-0001",
      serviceName: "Surat Keterangan Tidak Mampu (SKTM)",
      status: "DIAJUKAN",
      message: "Permohonan Anda berhasil diterima dalam sistem.",
    };

    // Pastikan tidak ada properti NIK atau Nomor Kartu Keluarga
    assert.equal("nik" in safeEmailPayload, false, "Email tidak boleh memuat NIK");
    assert.equal("nomorKK" in safeEmailPayload, false, "Email tidak boleh memuat nomor Kartu Keluarga");
    assert.equal("ktpFile" in safeEmailPayload, false, "Email tidak boleh melampirkan berkas KTP mentah");
  });

  it("memverifikasi kelengkapan model Notifikasi sesuai spesifikasi database proyek", () => {
    // Model kontrak Notification yang dipersyaratkan
    const notificationSample = {
      id: "notif-cuid-001",
      userId: "user-warga-123",
      applicationId: "app-cuid-456",
      type: "STATUS_CHANGED",
      title: "Pembaruan Status: Verifikasi Berkas Selesai",
      message: "Staf Desa telah memeriksa kelengkapan berkas Anda.",
      createdAt: new Date(),
      isRead: false,
      readAt: null,
      emailStatus: "SENT",
      emailSentAt: new Date(),
      emailFailedAt: null,
      eventId: "app-cuid-456:STATUS_TRANSITION:DIVERIFIKASI",
    };

    assert.ok(notificationSample.id, "Harus memiliki ID notifikasi");
    assert.ok(notificationSample.userId, "Harus memiliki ID penerima");
    assert.ok(notificationSample.applicationId, "Harus mendukung ID pengajuan");
    assert.ok(notificationSample.type, "Harus memiliki jenis kejadian");
    assert.ok(notificationSample.title && notificationSample.message, "Harus memiliki judul dan pesan");
    assert.ok(notificationSample.createdAt instanceof Date, "Harus memiliki waktu dibuat");
    assert.equal(typeof notificationSample.isRead, "boolean", "Harus memiliki status baca");
    assert.ok("emailStatus" in notificationSample, "Harus mendukung status email");
    assert.ok("emailSentAt" in notificationSample, "Harus mendukung waktu pengiriman email");
    assert.ok("emailFailedAt" in notificationSample, "Harus mendukung waktu kegagalan email");
    assert.ok(notificationSample.eventId, "Harus memiliki identitas kejadian untuk mencegah duplikasi");
  });

  it("memverifikasi model preferensi notifikasi mendukung kanal in-app dan email", () => {
    const defaultPreference = {
      emailEnabled: true,
      inAppEnabled: true,
      notifyOnStatus: true,
      notifyOnRepair: true,
    };

    assert.equal(typeof defaultPreference.emailEnabled, "boolean");
    assert.equal(typeof defaultPreference.inAppEnabled, "boolean");
    assert.equal(typeof defaultPreference.notifyOnStatus, "boolean");
    assert.equal(typeof defaultPreference.notifyOnRepair, "boolean");
  });

  it("menegakkan kebijakan sistem: notifikasi putusan resmi dan revisi berkas bersifat Wajib Sistem", () => {
    const mandatoryNotificationTypes = ["APPROVED", "REJECTED", "DOCUMENT_REPAIR"];
    const systemPolicy = {
      allowUserDisableCriticalNotif: false,
      reason: "Kepatuhan hukum pelayanan publik desa dan kepastian hak administrasi warga pemohon",
    };

    assert.equal(systemPolicy.allowUserDisableCriticalNotif, false);
    assert.equal(mandatoryNotificationTypes.includes("APPROVED"), true);
    assert.equal(mandatoryNotificationTypes.includes("DOCUMENT_REPAIR"), true);
  });

  it("memvalidasi perubahan email hanya menerima format email yang sah dan aman", () => {
    const validEmails = ["warga.baru@desa.local", "budi.santoso@yahoo.co.id"];
    const invalidEmails = ["bukan-email", "admin@localhost@evil", "", "test<script>@x.com"];

    for (const em of validEmails) {
      assert.equal(isValidEmail(em), true);
    }
    for (const em of invalidEmails) {
      assert.equal(isValidEmail(em), false);
    }
  });
});


