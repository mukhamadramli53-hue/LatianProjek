/**
 * Layanan Notifikasi WhatsApp - Sistem Pelayanan Desa
 * Mengirimkan notifikasi resmi kepada warga pemohon melalui pesan WhatsApp.
 */

export interface WhatsAppNotificationPayload {
  recipientPhone: string;
  recipientName: string;
  applicantName?: string;
  nomorPengajuan: string;
  serviceName: string;
  status?: string;
  title?: string;
  message?: string;
  note?: string | null;
  officialLetterName?: string | null;
  targetRole?: "WARGA" | "STAF" | "SUPERVISOR" | "KEPALA_DESA";
  event: "SUBMIT_NEW" | "STATUS_TRANSITION" | "RESUBMIT_REPAIR" | "SEND_OFFICIAL_LETTER" | "ERROR_ALERT";
}

export interface WhatsAppSendResult {
  success: boolean;
  phone: string;
  formattedPhone: string;
  message: string;
  waUrl: string;
  provider: "META_CLOUD_API" | "FONNTE" | "CUSTOM_API" | "SIMULATION" | "NONE";
  configured?: boolean;
  messageId?: string;
  targetRole?: string;
  deliveryStatus?: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "PERMANENT_FAILURE";
  error?: string;
  instructions?: string;
}

export interface WhatsAppConfigStatus {
  isConfigured: boolean;
  provider: "META_CLOUD_API" | "FONNTE" | "CUSTOM_API" | "NONE";
  missingVariables: string[];
  instructions: string;
}

/**
 * Memeriksa status ketersediaan integrasi WhatsApp resmi di lingkungan server (.env)
 * Mendukung:
 * 1. Meta WhatsApp Business Cloud API (Official Graph API)
 * 2. Penyedia BSP Resmi Indonesia (Fonnte / Qontak / Wablas)
 * 3. Custom REST API Gateway Resmi
 */
export function checkWhatsAppConfigStatus(): WhatsAppConfigStatus {
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const fonnteToken = (process.env.FONNTE_TOKEN || process.env.WHATSAPP_TOKEN)?.trim();
  const customApiUrl = process.env.WHATSAPP_API_URL?.trim();

  if (metaPhoneId && metaToken) {
    return {
      isConfigured: true,
      provider: "META_CLOUD_API",
      missingVariables: [],
      instructions: "WhatsApp Business Cloud API (Meta Graph API) telah aktif dan terkonfigurasi.",
    };
  }

  if (fonnteToken) {
    return {
      isConfigured: true,
      provider: "FONNTE",
      missingVariables: [],
      instructions: "Gateway WhatsApp Fonnte telah aktif dan terkonfigurasi.",
    };
  }

  if (customApiUrl) {
    return {
      isConfigured: true,
      provider: "CUSTOM_API",
      missingVariables: [],
      instructions: "Custom REST Gateway WhatsApp telah aktif dan terkonfigurasi.",
    };
  }

  const instructions = `
================================================================================
[PETUNJUK AKTIVASI LAYANAN WHATSAPP BUSINESS - SISTEM PELAYANAN DESA]
Sistem notifikasi WhatsApp otomatis belum dapat mengirim pesan riil ke nomor tujuan
karena kredensial API gateway resmi belum disetel di file .env server.

PILIHAN 1: WhatsApp Business Cloud API (Resmi Meta / Facebook) - DIREKOMENDASIKAN
• Buka Meta for Developers (https://developers.facebook.com) dan buat WhatsApp App.
• Tambahkan ke file .env server:
  WHATSAPP_PHONE_NUMBER_ID="your_meta_phone_number_id"
  WHATSAPP_ACCESS_TOKEN="your_permanent_access_token"
  WHATSAPP_BUSINESS_ACCOUNT_ID="your_waba_id"           # Opsional
  WHATSAPP_TEMPLATE_NAME="pelayanan_desa_status"       # Opsional: Nama template disetujui Meta
  WHATSAPP_TEMPLATE_LANG="id"                          # Default kode bahasa Indonesia

PILIHAN 2: Penyedia Layanan Resmi Indonesia (Contoh: Fonnte - https://fonnte.com)
• Daftarkan nomor WhatsApp desa di Fonnte & hubungkan perangkat.
• Tambahkan ke file .env server:
  FONNTE_TOKEN="your_fonnte_device_token"

PILIHAN 3: Custom REST API Gateway Resmi Desa
• Tambahkan ke file .env server:
  WHATSAPP_API_URL="https://api.gateway-desa.id/v1/send"
  WHATSAPP_API_KEY="your_api_key"
================================================================================
`.trim();

  return {
    isConfigured: false,
    provider: "NONE",
    missingVariables: [
      "WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN (Meta Cloud API)",
      "atau FONNTE_TOKEN (Gateway Fonnte)",
      "atau WHATSAPP_API_URL (Custom Gateway)",
    ],
    instructions,
  };
}

/**
 * Format dan normalisasi nomor WhatsApp ke format internasional E.164 tanpa tanda '+'
 * Contoh:
 * - 083852635694 -> 6283852635694
 * - +6283852635694 -> 6283852635694
 * - 0838-5263-5694 -> 6283852635694
 * - 83852635694 -> 6283852635694
 * - 62083852635694 -> 6283852635694 (menghapus angka 0 berlebih setelah kode negara 62)
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  // Menghapus typo umum: awalan 6208... menjadi 628...
  if (cleaned.startsWith("6208")) {
    cleaned = "62" + cleaned.substring(3);
  } else if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

/**
 * Validasi apakah nomor telepon valid untuk WhatsApp
 */
export function isValidWhatsAppNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d]/g, "");
  return cleaned.length >= 9 && cleaned.length <= 16;
}

/**
 * Menyusun payload resmi Meta WhatsApp Business Cloud API (Graph API)
 * Mendukung template messages (disetujui Meta) dan direct text messages
 */
export function buildMetaCloudApiPayload(
  payload: WhatsAppNotificationPayload,
  formattedPhone: string
) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "id";
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (templateName) {
    const statusLabel = payload.status || "DIPROSES";
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: payload.recipientName },
              { type: "text", text: payload.serviceName },
              { type: "text", text: payload.nomorPengajuan },
              { type: "text", text: statusLabel },
              { type: "text", text: `${appUrl}/warga/pengajuan` },
            ],
          },
        ],
      },
    };
  }

  const textMessage = buildWhatsAppMessage(payload);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: {
      preview_url: true,
      body: textMessage,
    },
  };
}

/**
 * Menyusun pesan resmi WhatsApp berstandar pelayanan publik desa
 * Disesuaikan secara spesifik berdasarkan Peran Penerima (Warga, Staf, Supervisor, Kepala Desa)
 */
export function buildWhatsAppMessage(payload: WhatsAppNotificationPayload): string {
  const { event, recipientName, applicantName, nomorPengajuan, serviceName, status, note, message, targetRole = "WARGA" } = payload;
  const villageName = process.env.VILLAGE_NAME || "Pemerintah Desa Digital";
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const pemohonName = applicantName || recipientName;

  // ==========================================
  // A. NOTIFIKASI KHUSUS STAF DESA
  // ==========================================
  if (targetRole === "STAF") {
    switch (event) {
      case "SUBMIT_NEW":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemberitahuan Tugas: Pengajuan Baru Masuk*`,
          ``,
          `Halo *${recipientName}* (Staf Pelayanan),`,
          ``,
          `Terdapat pengajuan berkas baru yang masuk ke antrean verifikasi staf:`,
          `• Layanan  : *${serviceName}*`,
          `• Register : *${nomorPengajuan}*`,
          `• Pemohon  : *${pemohonName}*`,
          ``,
          `Silakan buka portal staf desa untuk verifikasi kelengkapan:`,
          `${appUrl}/staf/pengajuan`,
          ``,
          `Terima kasih.`,
          `_${villageName}_`,
        ].join("\n");

      case "RESUBMIT_REPAIR":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemberitahuan Tugas: Dokumen Perbaikan Masuk*`,
          ``,
          `Halo *${recipientName}* (Staf Pelayanan),`,
          ``,
          `Warga *${pemohonName}* telah mengirimkan dokumen perbaikan untuk:`,
          `• Layanan  : *${serviceName}*`,
          `• Register : *${nomorPengajuan}*`,
          ``,
          `Silakan lakukan verifikasi ulang berkas di antrean staf:`,
          `${appUrl}/staf/pengajuan`,
          ``,
          `Terima kasih.`,
          `_${villageName}_`,
        ].join("\n");

      case "SEND_OFFICIAL_LETTER":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan: Surat Resmi Telah Terbit & Dikirim*`,
          ``,
          `Halo *${recipientName}* (Staf Pelayanan),`,
          ``,
          `Dokumen surat resmi untuk permohonan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}* telah diterbitkan secara sah dan pelayanan dinyatakan selesai.`,
          ``,
          `${appUrl}/staf/pengajuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");

      case "STATUS_TRANSITION":
      default: {
        if (status === "PERLU_PERBAIKAN") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan: Permintaan Perbaikan Terkirim*`,
            ``,
            `Halo *${recipientName}* (Staf Pelayanan),`,
            ``,
            `Permintaan perbaikan berkas untuk *${serviceName}* (*${nomorPengajuan}*) telah diteruskan ke warga *${pemohonName}*.`,
            note ? `\n📌 *Catatan:* "${note}"\n` : ``,
            `Menunggu pemohon mengunggah perbaikan di portal.`,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DISETUJUI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan: Pengajuan Disetujui Kepala Desa*`,
            ``,
            `Halo *${recipientName}* (Staf Pelayanan),`,
            ``,
            `Permohonan *${serviceName}* (*${nomorPengajuan}*) untuk *${pemohonName}* telah disetujui Kepala Desa. Silakan lanjutkan ke penuntasan registrasi dan penerbitan surat resmi.`,
            ``,
            `${appUrl}/staf/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DITOLAK") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan: Pengajuan Ditolak oleh Kepala Desa*`,
            ``,
            `Halo *${recipientName}* (Staf Pelayanan),`,
            ``,
            `Permohonan *${serviceName}* (*${nomorPengajuan}*) untuk *${pemohonName}* diputuskan DITOLAK oleh Kepala Desa.${note ? `\nCatatan: "${note}"` : ""}`,
            ``,
            `${appUrl}/staf/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "SELESAI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan: Pelayanan Selesai Diproses*`,
            ``,
            `Halo *${recipientName}* (Staf Pelayanan),`,
            ``,
            `Pelayanan permohonan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}* telah tuntas diproses.`,
            ``,
            `${appUrl}/staf/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan Status Pengajuan (${status || "UPDATE"})*`,
          ``,
          `Halo *${recipientName}* (Staf Pelayanan),`,
          ``,
          `Status permohonan *${serviceName}* (*${nomorPengajuan}*) kini: *${status}*.`,
          message ? `\n${message}\n` : ``,
          `${appUrl}/staf/pengajuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");
      }
    }
  }

  // ==========================================
  // B. NOTIFIKASI KHUSUS SUPERVISOR DESA
  // ==========================================
  if (targetRole === "SUPERVISOR") {
    switch (event) {
      case "RESUBMIT_REPAIR":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemantauan Mutu: Dokumen Perbaikan Masuk*`,
          ``,
          `Halo *${recipientName}* (Supervisor Desa),`,
          ``,
          `Pemohon *${pemohonName}* telah memperbarui berkas perbaikan untuk *${serviceName}* (*${nomorPengajuan}*). Berkas saat ini dalam antrean verifikasi ulang staf.`,
          ``,
          `${appUrl}/supervisor/pengajuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");

      case "SEND_OFFICIAL_LETTER":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemantauan Mutu: Pelayanan Tuntas Diproses*`,
          ``,
          `Halo *${recipientName}* (Supervisor Desa),`,
          ``,
          `Surat resmi digital untuk *${serviceName}* (*${nomorPengajuan}*) telah diterbitkan sah dan siap diunduh warga. Pelayanan selesai.`,
          ``,
          `${appUrl}/supervisor/pengajuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");

      case "ERROR_ALERT":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `⚠️ *Peringatan Sistem: Kendala Fitur / Error*`,
          ``,
          `Halo *${recipientName}* (Supervisor Kendali Mutu),`,
          ``,
          `Terdeteksi laporan kendala operasional pada sistem:`,
          `• Layanan/Fitur : *${serviceName}*`,
          nomorPengajuan ? `• No. Registrasi : *${nomorPengajuan}*` : ``,
          `• Rincian Masalah:`,
          `${message || note || "Terjadi kesalahan pada alur proses pengajuan."}`,
          ``,
          `Silakan akses portal supervisor untuk memeriksa log & status:`,
          `${appUrl}/supervisor/dashboard`,
          ``,
          `_${villageName}_`,
        ].filter(Boolean).join("\n");

      case "STATUS_TRANSITION":
      default: {
        if (status === "REVIEW_SUPERVISOR") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan Tugas: Pengajuan Siap Ditelaah*`,
            ``,
            `Halo *${recipientName}* (Supervisor Desa),`,
            ``,
            `Staf Desa telah menyelesaikan verifikasi berkas dan penyiapan draf untuk:`,
            `• Layanan  : *${serviceName}*`,
            `• Register : *${nomorPengajuan}*`,
            `• Pemohon  : *${pemohonName}*`,
            ``,
            `Pengajuan kini siap untuk penelaahan kendali mutu Anda:`,
            `${appUrl}/supervisor/pengajuan`,
            ``,
            `Terima kasih.`,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "MENUNGGU_APPROVAL") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemantauan: Berkas Menuju Persetujuan Kades*`,
            ``,
            `Halo *${recipientName}* (Supervisor Desa),`,
            ``,
            `Permohonan *${serviceName}* (*${nomorPengajuan}*) telah diteruskan ke antrean keputusan akhir Kepala Desa.`,
            ``,
            `${appUrl}/supervisor/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DISETUJUI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemantauan: Pengajuan Telah Disetujui Kades*`,
            ``,
            `Halo *${recipientName}* (Supervisor Desa),`,
            ``,
            `Permohonan *${serviceName}* (*${nomorPengajuan}*) untuk *${pemohonName}* telah resmi disetujui Kepala Desa.`,
            ``,
            `${appUrl}/supervisor/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DITOLAK") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemantauan: Pengajuan Ditolak oleh Kades*`,
            ``,
            `Halo *${recipientName}* (Supervisor Desa),`,
            ``,
            `Permohonan *${serviceName}* (*${nomorPengajuan}*) untuk *${pemohonName}* diputuskan DITOLAK oleh Kepala Desa.${note ? `\nAlasan: "${note}"` : ""}`,
            ``,
            `${appUrl}/supervisor/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "SELESAI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemantauan: Pelayanan Selesai Diproses*`,
            ``,
            `Halo *${recipientName}* (Supervisor Desa),`,
            ``,
            `Pengajuan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}* telah tuntas diproses dan surat resmi telah diterbitkan.`,
            ``,
            `${appUrl}/supervisor/pengajuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan Mutu Pengajuan (${status || "UPDATE"})*`,
          ``,
          `Halo *${recipientName}* (Supervisor Desa),`,
          ``,
          `Status permohonan *${serviceName}* (*${nomorPengajuan}*) kini: *${status}*.`,
          message ? `\n${message}\n` : ``,
          `${appUrl}/supervisor/pengajuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");
      }
    }
  }

  // ==========================================
  // C. NOTIFIKASI KHUSUS KEPALA DESA
  // ==========================================
  if (targetRole === "KEPALA_DESA") {
    switch (event) {
      case "SEND_OFFICIAL_LETTER":
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Konfirmasi: Dokumen Resmi Terbit & Dikirim*`,
          ``,
          `Halo *${recipientName}* (Kepala Desa),`,
          ``,
          `Dokumen surat resmi bertanda tangan digital untuk permohonan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}* telah berhasil dikirimkan kepada warga. Pelayanan selesai.`,
          ``,
          `${appUrl}/kades/persetujuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");

      case "STATUS_TRANSITION":
      default: {
        if (status === "MENUNGGU_APPROVAL") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pemberitahuan Tugas: Menunggu Persetujuan & Tanda Tangan*`,
            ``,
            `Halo *${recipientName}* (Kepala Desa),`,
            ``,
            `Permohonan pelayanan warga berikut telah diverifikasi dan siap untuk keputusan akhir serta pengesahan resmi Anda:`,
            `• Layanan  : *${serviceName}*`,
            `• Register : *${nomorPengajuan}*`,
            `• Pemohon  : *${pemohonName}*`,
            ``,
            `Silakan buka portal persetujuan Kepala Desa untuk mengambil keputusan:`,
            `${appUrl}/kades/persetujuan`,
            ``,
            `Terima kasih.`,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DISETUJUI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Konfirmasi: Pengajuan Berhasil Anda Setujui*`,
            ``,
            `Halo *${recipientName}* (Kepala Desa),`,
            ``,
            `Anda telah memberikan persetujuan resmi untuk permohonan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}*.`,
            ``,
            `${appUrl}/kades/persetujuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "DITOLAK") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Konfirmasi: Penolakan Permohonan Berkas*`,
            ``,
            `Halo *${recipientName}* (Kepala Desa),`,
            ``,
            `Anda telah memutuskan untuk menolak permohonan *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}*.${note ? `\nAlasan: "${note}"` : ""}`,
            ``,
            `${appUrl}/kades/persetujuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        if (status === "SELESAI") {
          return [
            `🏛️ *${villageName.toUpperCase()}*`,
            `*Pembaruan: Pelayanan Selesai Tuntas*`,
            ``,
            `Halo *${recipientName}* (Kepala Desa),`,
            ``,
            `Surat resmi untuk *${serviceName}* (*${nomorPengajuan}*) atas nama *${pemohonName}* telah terbit dan pelayanan tuntas diproses.`,
            ``,
            `${appUrl}/kades/persetujuan`,
            ``,
            `_${villageName}_`,
          ].join("\n");
        }
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan Status Pengajuan (${status || "UPDATE"})*`,
          ``,
          `Halo *${recipientName}* (Kepala Desa),`,
          ``,
          `Status permohonan *${serviceName}* (*${nomorPengajuan}*) kini: *${status}*.`,
          message ? `\n${message}\n` : ``,
          `${appUrl}/kades/persetujuan`,
          ``,
          `_${villageName}_`,
        ].join("\n");
      }
    }
  }

  // ==========================================
  // D. NOTIFIKASI WARGA PEMOHON (DEFAULT)
  // ==========================================
  switch (event) {
    case "SUBMIT_NEW":
      return [
        `🏛️ *${villageName.toUpperCase()}*`,
        `*Konfirmasi Penerimaan Pengajuan*`,
        ``,
        `Halo *${recipientName}*,`,
        ``,
        `Permohonan pelayanan *${serviceName}* dengan nomor register *${nomorPengajuan}* telah berhasil diterima dalam sistem kami.`,
        ``,
        `📄 *Status saat ini:* DIAJUKAN`,
        `Dokumen Anda kini berada dalam antrean pemeriksaan berkas awal oleh Staf Pelayanan Desa.`,
        ``,
        `Anda dapat memantau proses pengajuan Anda kapan saja melalui portal resmi:`,
        `${appUrl}/warga/pengajuan`,
        ``,
        `Terima kasih.`,
        `_${villageName}_`,
      ].join("\n");

    case "RESUBMIT_REPAIR":
      return [
        `🏛️ *${villageName.toUpperCase()}*`,
        `*Konfirmasi Pengiriman Ulang Dokumen*`,
        ``,
        `Halo *${recipientName}*,`,
        ``,
        `Dokumen perbaikan untuk permohonan *${serviceName}* (*${nomorPengajuan}*) telah berhasil kami terima kembali.`,
        ``,
        `Petugas akan segera melakukan verifikasi ulang berkas persyaratan Anda.`,
        ``,
        `Pantau status permohonan Anda melalui:`,
        `${appUrl}/warga/pengajuan`,
        ``,
        `Terima kasih.`,
        `_${villageName}_`,
      ].join("\n");

    case "SEND_OFFICIAL_LETTER":
      return [
        `🏛️ *${villageName.toUpperCase()}*`,
        `*Surat Resmi Telah Diterbitkan & Selesai*`,
        ``,
        `Halo *${recipientName}*,`,
        ``,
        `Kabar baik! Pelayanan permohonan *${serviceName}* (*${nomorPengajuan}*) telah selesai diproses.`,
        ``,
        `Surat resmi digital telah disahkan secara sah oleh Kepala Desa dan siap diunduh melalui portal:`,
        `${appUrl}/warga/pengajuan`,
        ``,
        `Terima kasih telah memanfaatkan layanan administrasi desa secara digital.`,
        `_${villageName}_`,
      ].join("\n");

    case "STATUS_TRANSITION":
    default: {
      if (status === "DIVERIFIKASI") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan Status: Sedang Diverifikasi*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Permohonan pelayanan *${serviceName}* (*${nomorPengajuan}*) Anda saat ini *SEDANG DIVERIFIKASI* oleh Staf Pelayanan Desa.`,
          ``,
          `Petugas sedang memeriksa kelengkapan berkas dan dokumen persyaratan Anda.`,
          ``,
          `Pantau perkembangan status berkas Anda:`,
          `${appUrl}/warga/pengajuan`,
          ``,
          `Terima kasih.`,
          `_${villageName}_`,
        ].join("\n");
      }

      if (status === "MENUNGGU_APPROVAL") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pembaruan Status: Menunggu Persetujuan Kades*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Berkas permohonan *${serviceName}* (*${nomorPengajuan}*) Anda telah selesai diverifikasi oleh Staf Desa dan diteruskan kepada Kepala Desa untuk persetujuan serta tanda tangan resmi.`,
          ``,
          `Pantau kemajuan berkas Anda melalui portal resmi:`,
          `${appUrl}/warga/pengajuan`,
          ``,
          `Terima kasih.`,
          `_${villageName}_`,
        ].join("\n");
      }

      if (status === "PERLU_PERBAIKAN") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Instruksi Perbaikan Dokumen*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Petugas telah memeriksa permohonan *${serviceName}* (*${nomorPengajuan}*) Anda dan menyatakan bahwa terdapat dokumen persyaratan yang *memerlukan perbaikan*.`,
          note ? `\n📌 *Catatan Petugas:*\n"${note}"\n` : ``,
          `Silakan segera login dan unggah perbaikan dokumen melalui portal pelayanan:`,
          `${appUrl}/warga/pengajuan`,
          ``,
          `Terima kasih atas kerja samanya.`,
          `_${villageName}_`,
        ].join("\n");
      }

      if (status === "DISETUJUI") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemberitahuan: Permohonan Disetujui*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Kabar baik! Permohonan *${serviceName}* (*${nomorPengajuan}*) telah resmi *DISETUJUI* oleh Kepala Desa.`,
          ``,
          `Dokumen surat keputusan resmi saat ini sedang disiapkan dan ditandatangani untuk penerbitan.`,
          ``,
          `Pantau status permohonan Anda:`,
          `${appUrl}/warga/pengajuan`,
          ``,
          `Terima kasih.`,
          `_${villageName}_`,
        ].join("\n");
      }

      if (status === "DITOLAK") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemberitahuan Hasil Permohonan: Tidak Disetujui*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Mohon maaf, permohonan *${serviceName}* (*${nomorPengajuan}*) belum dapat disetujui oleh Pemerintah Desa.`,
          note ? `\n📌 *Alasan Penolakan Resmi:*\n"${note}"\n` : ``,
          `Silakan datang ke kantor Balai Desa untuk konsultasi persyaratan dan informasi lebih lanjut.`,
          ``,
          `_${villageName}_`,
        ].join("\n");
      }

      if (status === "SELESAI") {
        return [
          `🏛️ *${villageName.toUpperCase()}*`,
          `*Pemberitahuan: Pelayanan Selesai Diproses*`,
          ``,
          `Halo *${recipientName}*,`,
          ``,
          `Pelayanan permohonan *${serviceName}* (*${nomorPengajuan}*) telah selesai diproses. Surat resmi siap diunduh melalui portal:`,
          `${appUrl}/warga/pengajuan`,
          ``,
          `Terima kasih telah menggunakan sistem pelayanan kami.`,
          `_${villageName}_`,
        ].join("\n");
      }

      return [
        `🏛️ *${villageName.toUpperCase()}*`,
        `*Pembaruan Status Pengajuan*`,
        ``,
        `Halo *${recipientName}*,`,
        ``,
        `Status permohonan *${serviceName}* (*${nomorPengajuan}*) kini: *${status || "DIPROSES"}*.`,
        message ? `\n${message}\n` : ``,
        `Pantau kemajuan berkas Anda di portal:`,
        `${appUrl}/warga/pengajuan`,
        ``,
        `Terima kasih.`,
        `_${villageName}_`,
      ].join("\n");
    }
  }
}

/**
 * Menyamarkan nomor telepon pada catatan log untuk melindungi privasi warga.
 * Contoh: 083852635694 -> 0838****694
 */
export function maskPhone(phone: string): string {
  if (!phone) return "***";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 6) return "***";
  return cleaned.slice(0, 4) + "****" + cleaned.slice(-3);
}

/**
 * Menghapus kemungkinan bocornya password, bearer token, atau API key
 * dari pesan kesalahan (error message) penyedia WhatsApp.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "Terjadi kesalahan internal.";
  const str = error instanceof Error ? error.message : String(error);
  return str
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/Authorization:\s*['"]?[A-Za-z0-9_\-\.]+['"]?/gi, "Authorization: [REDACTED]")
    .replace(/(password|pass|secret|token|key)=['"]?[^'"\s]+['"]?/gi, "$1=[REDACTED]")
    .replace(/mysql:\/\/[^@]+@/gi, "mysql://[REDACTED]@")
    .slice(0, 300);
}

/**
 * Fetch helper dengan retry terbatas dan exponential backoff untuk menangani kegagalan sementara
 * (network timeout, rate limit 429, atau 5xx dari provider gateway).
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2, delayMs = 500): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  throw lastError;
}

/**
 * Mengirimkan notifikasi WhatsApp kepada setiap aktor (Warga, Staf, Supervisor, Kepala Desa)
 * dengan jaminan keandalan, masking log, retry kegagalan sementara, dan pembedaan status pengiriman.
 */
export async function sendWhatsAppNotification(payload: WhatsAppNotificationPayload): Promise<WhatsAppSendResult> {
  const roleLabel = payload.targetRole || "WARGA";

  // 1. Validasi ketat: jika nomor telepon tidak valid atau kosong, JANGAN kirim dan JANGAN karang nomor!
  if (!isValidWhatsAppNumber(payload.recipientPhone)) {
    console.warn(
      `[WhatsApp Undeliverable] Nomor WhatsApp untuk ${roleLabel} "${payload.recipientName}" tidak valid atau belum diisi ("${maskPhone(payload.recipientPhone)}"). Notifikasi WhatsApp TIDAK DAPAT DIKIRIM. Instruksi: Pemilik akun perlu memperbarui nomor WhatsApp di profil akun (/profil).`
    );
    return {
      success: false,
      phone: payload.recipientPhone || "",
      formattedPhone: "",
      message: "",
      waUrl: "",
      provider: "NONE",
      configured: false,
      targetRole: roleLabel,
      deliveryStatus: "PERMANENT_FAILURE",
      error: `Nomor WhatsApp tidak valid atau belum terdaftar pada profil akun ${payload.recipientName}. Silakan lengkapi nomor telepon di menu /profil.`,
    };
  }

  const formattedPhone = formatWhatsAppNumber(payload.recipientPhone);
  const message = buildWhatsAppMessage(payload);
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  console.log(`\n======================================================`);
  console.log(`[WHATSAPP NOTIFIKASI ${roleLabel}]`);
  console.log(`Penerima : ${payload.recipientName} (${maskPhone(payload.recipientPhone)} -> ${maskPhone(formattedPhone)})`);
  console.log(`Peran    : ${roleLabel}`);
  console.log(`Nomor    : ${payload.nomorPengajuan}`);
  console.log(`Layanan  : ${payload.serviceName}`);
  console.log(`Pesan    :\n${message}`);
  console.log(`Tautan WA: ${waUrl}`);
  console.log(`======================================================\n`);

  // 2. Periksa status integrasi penyedia layanan resmi WhatsApp
  const config = checkWhatsAppConfigStatus();

  // A. WhatsApp Business Platform / Cloud API (Meta Official Graph API)
  if (config.provider === "META_CLOUD_API") {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
    const metaEndpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const metaPayload = buildMetaCloudApiPayload(payload, formattedPhone);

    try {
      const res = await fetchWithRetry(metaEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      });

      const data = await res.json();
      if (res.ok && data?.messages?.[0]?.id) {
        console.log(`[WhatsApp Meta Cloud API Success] MessageId: ${data.messages[0].id}`);
        return {
          success: true,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "META_CLOUD_API",
          configured: true,
          deliveryStatus: "SENT",
          messageId: data.messages[0].id,
          targetRole: roleLabel,
        };
      } else {
        const errorMsg = sanitizeErrorMessage(data?.error?.message || `HTTP ${res.status}: Gagal mengirim pesan via WhatsApp Cloud API`);
        console.error(`[WhatsApp Meta Cloud API Error]`, data?.error?.type || "MetaAPIError");
        return {
          success: false,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "META_CLOUD_API",
          configured: true,
          deliveryStatus: "FAILED",
          error: errorMsg,
          targetRole: roleLabel,
        };
      }
    } catch (apiErr: unknown) {
      const errMsg = sanitizeErrorMessage(apiErr);
      console.error(`[WhatsApp Meta Cloud API Network Error]`, errMsg);
      return {
        success: false,
        phone: payload.recipientPhone,
        formattedPhone,
        message,
        waUrl,
        provider: "META_CLOUD_API",
        configured: true,
        deliveryStatus: "FAILED",
        error: errMsg,
        targetRole: roleLabel,
      };
    }
  }

  // B. Penyedia Layanan Resmi Indonesia (Fonnte BSP Gateway)
  if (config.provider === "FONNTE") {
    const fonnteToken = process.env.FONNTE_TOKEN || process.env.WHATSAPP_TOKEN!;
    try {
      const res = await fetchWithRetry("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: message,
        }),
      });
      const data = await res.json();
      console.log(`[WhatsApp Fonnte Response ${roleLabel}] status: ${data?.status}, process: ${data?.process || "-"}`);
      if (data?.status === true) {
        return {
          success: true,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "FONNTE",
          configured: true,
          deliveryStatus: "SENT",
          messageId: String(data.id || data.process || "fonnte-ok"),
          targetRole: roleLabel,
        };
      } else {
        const errorMsg = sanitizeErrorMessage(data?.reason || "Gagal mengirim pesan via Fonnte gateway");
        return {
          success: false,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "FONNTE",
          configured: true,
          deliveryStatus: "FAILED",
          error: errorMsg,
          targetRole: roleLabel,
        };
      }
    } catch (apiErr: unknown) {
      const errMsg = sanitizeErrorMessage(apiErr);
      console.error(`[WhatsApp Fonnte API Error ${roleLabel}]`, errMsg);
      return {
        success: false,
        phone: payload.recipientPhone,
        formattedPhone,
        message,
        waUrl,
        provider: "FONNTE",
        configured: true,
        deliveryStatus: "FAILED",
        error: errMsg,
        targetRole: roleLabel,
      };
    }
  }

  // C. Custom REST API Gateway Resmi Desa
  if (config.provider === "CUSTOM_API") {
    const waApiUrl = process.env.WHATSAPP_API_URL!;
    try {
      const res = await fetchWithRetry(waApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.WHATSAPP_API_KEY ? { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          phone: formattedPhone,
          target: formattedPhone,
          message: message,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "CUSTOM_API",
          configured: true,
          deliveryStatus: "SENT",
          targetRole: roleLabel,
        };
      } else {
        return {
          success: false,
          phone: payload.recipientPhone,
          formattedPhone,
          message,
          waUrl,
          provider: "CUSTOM_API",
          configured: true,
          deliveryStatus: "FAILED",
          error: sanitizeErrorMessage(data?.error || `HTTP ${res.status}`),
          targetRole: roleLabel,
        };
      }
    } catch (apiErr: unknown) {
      const errMsg = sanitizeErrorMessage(apiErr);
      console.error(`[WhatsApp Custom API Error ${roleLabel}]`, errMsg);
      return {
        success: false,
        phone: payload.recipientPhone,
        formattedPhone,
        message,
        waUrl,
        provider: "CUSTOM_API",
        configured: true,
        deliveryStatus: "FAILED",
        error: errMsg,
        targetRole: roleLabel,
      };
    }
  }

  // D. Gateway Belum Dikonfigurasi
  if (process.env.WHATSAPP_SIMULATION === "true") {
    return {
      success: true,
      phone: payload.recipientPhone,
      formattedPhone,
      message,
      waUrl,
      provider: "SIMULATION",
      configured: false,
      deliveryStatus: "SENT",
      targetRole: roleLabel,
    };
  }

  console.warn(
    `[WhatsApp Gateway Belum Dikonfigurasi] Kredensial WhatsApp Business API belum disetel pada file .env server. Pesan otomatis ke "${payload.recipientName}" (${maskPhone(formattedPhone)}) tidak dapat dikirim secara nyata.`
  );
  if (config.instructions) {
    console.info(config.instructions);
  }

  return {
    success: false,
    phone: payload.recipientPhone,
    formattedPhone,
    message,
    waUrl,
    provider: "NONE",
    configured: false,
    deliveryStatus: "PERMANENT_FAILURE",
    targetRole: roleLabel,
    error: "Layanan pengiriman WhatsApp Business API belum dikonfigurasi di server (.env). Pesan belum dikirim ke jaringan WhatsApp.",
    instructions: config.instructions,
  };
}

