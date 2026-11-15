require("ts-node").register({ compilerOptions: { module: "CommonJS" } });
const fs = require("fs");
const path = require("path");

// Baca .env dan .env.local
function loadEnv() {
  const envFiles = [".env", ".env.local"];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, "../../", file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const idx = trimmed.indexOf("=");
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
  }
}

loadEnv();

async function testFonnte() {
  const token = (process.env.FONNTE_TOKEN || process.env.WHATSAPP_TOKEN || "").trim();

  console.log("================================================================================");
  console.log("             UJI KONEKSI & STATUS PERANGKAT FONNTE WHATSAPP GATEWAY             ");
  console.log("================================================================================");

  if (!token) {
    console.log("❌ FONNTE_TOKEN belum disetel di file .env atau .env.local.");
    console.log("\nLangkah Aktivasi Fonnte:");
    console.log("1. Buka https://fonnte.com lalu buat akun / login.");
    console.log("2. Tambahkan Perangkat (Device) dan scan QR Code menggunakan WhatsApp HP.");
    console.log("3. Salin Token perangkat yang muncul di dasbor Fonnte.");
    console.log("4. Buka file .env.local lalu tambahkan baris:");
    console.log('   FONNTE_TOKEN="token_dari_fonnte_anda"');
    console.log("5. Jalankan kembali script ini: node src/lib/test-fonnte.cjs");
    console.log("================================================================================");
    return;
  }

  console.log(`🔑 Token Terdeteksi : ${token.substring(0, 6)}...${token.slice(-4)}`);
  console.log("📡 Memeriksa status perangkat ke server Fonnte...");

  try {
    const deviceRes = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: {
        Authorization: token,
      },
    });

    const deviceData = await deviceRes.json();
    console.log("\n📋 Hasil Respon Fonnte Device:");
    console.log(JSON.stringify(deviceData, null, 2));

    if (deviceData.status === false) {
      console.log(`\n❌ Token tidak valid atau perangkat belum siap: ${deviceData.reason || "Unknown"}`);
      return;
    }

    console.log("\n✅ Perangkat Fonnte Terhubung!");
    console.log(`• Status Perangkat : ${deviceData.device_status || "Tersambung"}`);
    console.log(`• Nama Device      : ${deviceData.name || "-"}`);
    console.log(`• Kuota Pesan      : ${deviceData.quota || "Tidak terbatas / Kuota tersedia"}`);
    console.log(`• Nomor Terhubung  : ${deviceData.device || "-"}`);

    // Uji Pengiriman Pesan Nyata
    const targetPhone = process.argv[2] || process.env.VILLAGE_PHONE || "083852635694";
    const { formatWhatsAppNumber, sendWhatsAppNotification } = require("./whatsapp/service.ts");
    const formatted = formatWhatsAppNumber(targetPhone);

    console.log(`\n🚀 Menguji pengiriman notifikasi WhatsApp ke: ${targetPhone} (${formatted})...`);

    const result = await sendWhatsAppNotification({
      event: "SUBMIT_NEW",
      recipientPhone: targetPhone,
      recipientName: "Admin Pengujian",
      nomorPengajuan: "PD-TEST-FONNTE",
      serviceName: "Surat Keterangan Tidak Mampu",
      targetRole: "WARGA",
    });

    console.log("\n📦 Hasil Pengiriman WhatsApp:");
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n🎉 BERHASIL! Pesan WhatsApp resmi berhasil terkirim melalui Fonnte!");
    } else {
      console.log("\n⚠️ Pengiriman gagal:", result.error);
    }
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat menghubungi API Fonnte:", err);
  }

  console.log("================================================================================");
}

testFonnte();
