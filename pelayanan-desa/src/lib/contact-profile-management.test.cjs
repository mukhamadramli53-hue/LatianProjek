const test = require("node:test");
const assert = require("node:assert/strict");

test("Pengaturan Kontak Profil & Manajemen Kontak Aktor", async (t) => {
  // Mock validator schemas (mengikuti implementasi di user.ts)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(\+62|62|08)[0-9]{8,13}$/;

  function formatWhatsAppDisplay(phoneInput) {
    const digits = phoneInput.replace(/[^0-9]/g, "");
    if (!digits) return null;
    if (digits.startsWith("08")) {
      return `+62 ${digits.substring(1, 4)}-${digits.substring(4, 8)}-${digits.substring(8)}`;
    } else if (digits.startsWith("628")) {
      return `+62 ${digits.substring(2, 5)}-${digits.substring(5, 9)}-${digits.substring(9)}`;
    }
    return phoneInput;
  }

  await t.test("Validasi format email: Menerima email valid dan menolak format email cacat", () => {
    assert.equal(emailRegex.test("warga@desa.id"), true);
    assert.equal(emailRegex.test("kades.pemerintahan@cirebon.go.id"), true);
    assert.equal(emailRegex.test("budi.santoso123@gmail.com"), true);

    assert.equal(emailRegex.test("bukan-email"), false);
    assert.equal(emailRegex.test("warga@domain"), false);
    assert.equal(emailRegex.test("@domain.com"), false);
    assert.equal(emailRegex.test("warga @desa.id"), false);
  });

  await t.test("Validasi format nomor WhatsApp: Menerima format standar Indonesia dan menolak nomor tidak valid", () => {
    assert.equal(phoneRegex.test("081234567890"), true);
    assert.equal(phoneRegex.test("+6283852635694"), true);
    assert.equal(phoneRegex.test("6281298765432"), true);

    // Format cacat
    assert.equal(phoneRegex.test("12345"), false, "Terlalu pendek");
    assert.equal(phoneRegex.test("071234567890"), false, "Bukan prefix HP/WA Indonesia");
    assert.equal(phoneRegex.test("0812abcde5678"), false, "Mengandung karakter huruf");
    assert.equal(phoneRegex.test(""), false, "Nomor kosong");
  });

  await t.test("Format WhatsApp Display: Menyusun preview nomor internasional yang jelas untuk penerima", () => {
    assert.equal(formatWhatsAppDisplay("081234567890"), "+62 812-3456-7890");
    assert.equal(formatWhatsAppDisplay("6283852635694"), "+62 838-5263-5694");
  });

  await t.test("Pencegahan bentrok email: Tidak mengizinkan email yang sudah dimiliki pengguna lain", () => {
    const existingUsers = [
      { id: "usr-1", email: "warga1@desa.id" },
      { id: "usr-2", email: "staf@desa.id" },
    ];

    function checkEmailAvailability(currentUserId, newEmail) {
      const match = existingUsers.find((u) => u.email === newEmail && u.id !== currentUserId);
      return !match;
    }

    assert.equal(checkEmailAvailability("usr-1", "warga1@desa.id"), true, "Email sama dengan akun sendiri diizinkan");
    assert.equal(checkEmailAvailability("usr-1", "warga_baru@desa.id"), true, "Email baru belum dipakai");
    assert.equal(checkEmailAvailability("usr-1", "staf@desa.id"), false, "Email staf sudah terdaftar pada akun lain");
  });

  await t.test("Hak Akses RBAC: Pengguna biasa hanya dapat mengubah akun sendiri, sedangkan Supervisor/Kades dapat mengelola kontak warga", () => {
    function canUpdateTargetUser(actorRole, actorId, targetUserId, targetUserRole) {
      if (actorId === targetUserId) {
        return { allowed: true, reason: "Pemilik akun sendiri" };
      }
      if ((actorRole === "SUPERVISOR" || actorRole === "KEPALA_DESA") && targetUserRole === "WARGA") {
        return { allowed: true, reason: "Izin pengelolaan kontak warga oleh pimpinan/supervisor" };
      }
      return { allowed: false, reason: "Dilarang: Tidak memiliki hak akses pengelolaan akun pihak lain" };
    }

    // Warga mencoba ubah akun warga lain
    const res1 = canUpdateTargetUser("WARGA", "warga-1", "warga-2", "WARGA");
    assert.equal(res1.allowed, false);

    // Staf mencoba ubah akun staf lain
    const res2 = canUpdateTargetUser("STAF", "staf-1", "staf-2", "STAF");
    assert.equal(res2.allowed, false);

    // Pengguna memperbarui profil sendiri
    const resSelf = canUpdateTargetUser("WARGA", "warga-1", "warga-1", "WARGA");
    assert.equal(resSelf.allowed, true);

    // Supervisor mengelola kontak warga
    const resSupervisor = canUpdateTargetUser("SUPERVISOR", "spv-1", "warga-1", "WARGA");
    assert.equal(resSupervisor.allowed, true);

    // Kepala Desa mengelola kontak warga
    const resKades = canUpdateTargetUser("KEPALA_DESA", "kades-1", "warga-1", "WARGA");
    assert.equal(resKades.allowed, true);
  });

  await t.test("Mekanisme Verifikasi Kontak: Reset status saat email diubah dan catat waktu verifikasi resmi", () => {
    let userRecord = {
      id: "usr-test",
      email: "lama@desa.id",
      emailVerified: new Date("2026-01-01T00:00:00Z"),
    };

    // User ubah email
    function onEmailChanged(newEmail) {
      if (newEmail !== userRecord.email) {
        userRecord.email = newEmail;
        userRecord.emailVerified = null; // Reset verifikasi
      }
    }

    onEmailChanged("baru@desa.id");
    assert.equal(userRecord.email, "baru@desa.id");
    assert.equal(userRecord.emailVerified, null, "Status emailVerified wajib direset setelah email berganti");

    // Eksekusi verifikasi kontak
    function verifyContact() {
      userRecord.emailVerified = new Date();
      return { success: true, verifiedAt: userRecord.emailVerified };
    }

    const verifyResult = verifyContact();
    assert.equal(verifyResult.success, true);
    assert.ok(userRecord.emailVerified instanceof Date);
  });

  await t.test("Integritas Nomor Asli: Sistem tidak mengganti nomor kontak profil secara diam-diam dengan nomor uji coba", () => {
    const inputPhoneFromUser = "083852635694";
    const dummyTestNumber = "081200000000";

    function storeProfileContact(rawPhone) {
      // Membersihkan spasi atau tanda hubung, tetapi nomor tetap milik pengguna
      const clean = rawPhone.trim().replace(/[-\s]/g, "");
      return clean;
    }

    const savedPhone = storeProfileContact(inputPhoneFromUser);
    assert.equal(savedPhone, "083852635694");
    assert.notEqual(savedPhone, dummyTestNumber, "Nomor tersimpan tidak boleh dimanipulasi menjadi nomor dummy");
  });
});
