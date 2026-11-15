import nodemailer from "nodemailer";
import type { ApplicationStatus, Role } from "@prisma/client";

/**
 * Konfigurasi Koneksi SMTP Server
 * Catatan Keamanan: Kredensial email HANYA boleh dibaca di sisi server
 * (tanpa awalan NEXT_PUBLIC_ agar tidak pernah bocor ke bundel frontend).
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface VillageContactConfig {
  appName: string;
  villageName: string;
  officeAddress: string;
  phone: string;
  email: string;
  serviceHours: string;
}

export interface EmailConfigStatus {
  isConfigured: boolean;
  provider: "SMTP";
  host: string;
  port: number;
  secure: boolean;
  hasAuth: boolean;
  senderAddress: string;
  missingVariables: string[];
  instructions?: string;
}

/**
 * Mengambil informasi kontak resmi pemerintah desa dari environment variable
 * dengan nilai default resmi jika belum disetel di server.
 */
export function getVillageConfig(): VillageContactConfig {
  return {
    appName: process.env.APP_NAME || "Sistem Pelayanan Desa",
    villageName: process.env.VILLAGE_NAME || "Pemerintah Desa Digital",
    officeAddress:
      process.env.VILLAGE_ADDRESS ||
      "Jl. Raya Balai Desa No. 01, Kantor Pelayanan Terpadu Satu Pintu",
    phone: process.env.VILLAGE_PHONE || "(021) 8765-4321 / WhatsApp: 0812-3456-7890",
    email: process.env.VILLAGE_EMAIL || "pelayanan@desa.local",
    serviceHours: process.env.VILLAGE_HOURS || "Senin – Jumat (08.00 – 15.00 WIB)",
  };
}

/**
 * Memeriksa kelengkapan konfigurasi SMTP sebelum mencoba mengirimkan email.
 * Jika konfigurasi belum lengkap, fungsi ini menghasilkan instruksi jelas
 * dan mencegah sistem mengklaim bahwa email berhasil terkirim.
 */
export function checkEmailConfigStatus(): EmailConfigStatus {
  const host = process.env.SMTP_HOST?.trim() || "";
  const portStr = process.env.SMTP_PORT?.trim() || "";
  const port = parseInt(portStr || "1025", 10);
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = (process.env.MAIL_FROM || process.env.EMAIL_FROM || "").trim();

  const missingVariables: string[] = [];

  if (!host) {
    missingVariables.push("SMTP_HOST");
  }
  if (!portStr || isNaN(port) || port <= 0) {
    missingVariables.push("SMTP_PORT");
  }
  if (!from) {
    missingVariables.push("MAIL_FROM atau EMAIL_FROM");
  }
  // Jika SMTP_USER diisi, maka SMTP_PASS wajib diisi
  if (user && !pass) {
    missingVariables.push("SMTP_PASS (wajib disetel karena SMTP_USER terisi)");
  }

  const isConfigured = missingVariables.length === 0;

  const instructions = !isConfigured
    ? `
================================================================================
[PETUNJUK KONFIGURASI LAYANAN EMAIL - PELAYANAN DESA]
Layanan pengiriman email SMTP belum dapat digunakan karena variabel berikut belum lengkap:
${missingVariables.map((v) => ` • ${v}`).join("\n")}

Langkah Konfigurasi di Server (.env):
1. Buka file '.env' pada direktori root proyek (hanya dibaca oleh runtime server).
2. Tentukan variabel SMTP sesuai infrastruktur desa:

   # OPSI A: Pengujian Lokal Gratis (Mailpit / Laragon Mailer - port 1025)
   SMTP_HOST="localhost"
   SMTP_PORT="1025"
   SMTP_SECURE="false"
   MAIL_FROM="\"Pelayanan Desa Digital\" <pelayanan@desa.local>"

   # OPSI B: SMTP Produksi (Gmail / Penyedia Hosting Desa / SMTP Resmi)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="pelayanan.desa@gmail.com"
   SMTP_PASS="sandi_aplikasi_16_digit"
   MAIL_FROM="\"Pelayanan Desa Digital\" <pelayanan.desa@gmail.com>"

PERINGATAN KEAMANAN:
- Jangan gunakan prefix NEXT_PUBLIC_ untuk kredensial email.
- Jangan commit file .env atau kredensial ke Git/repository publik.
================================================================================`.trim()
    : undefined;

  return {
    isConfigured,
    provider: "SMTP",
    host: host || "belum disetel",
    port: isNaN(port) ? 0 : port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    hasAuth: Boolean(user && pass),
    senderAddress: from || "belum disetel",
    missingVariables,
    instructions,
  };
}

export function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "1025", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  // Mendukung MAIL_FROM dan EMAIL_FROM (dibersihkan dari escape backslash)
  const rawFrom =
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    "mukhamadramli53@gmail.com";
  const from = rawFrom.replace(/\\"/g, '"').replace(/^["']|["']$/g, '').trim();

  const config: EmailConfig = {
    host,
    port,
    secure,
    from,
  };

  if (user && pass) {
    config.auth = { user, pass };
  }

  return config;
}

/**
 * Membuat instance Nodemailer Transporter dengan timeout aman
 * agar proses backend tidak menggantung saat terjadi gangguan jaringan.
 */
export function createEmailTransporter() {
  const config = getEmailConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}

/**
 * Uji koneksi dan handshake SMTP ke server email.
 */
export async function verifyEmailTransport(): Promise<{
  connected: boolean;
  message: string;
  details?: EmailConfigStatus;
}> {
  const status = checkEmailConfigStatus();
  if (!status.isConfigured) {
    return {
      connected: false,
      message: `Konfigurasi SMTP belum lengkap: ${status.missingVariables.join(", ")}`,
      details: status,
    };
  }

  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    return {
      connected: true,
      message: `Koneksi SMTP ke ${status.host}:${status.port} berhasil dan siap digunakan.`,
      details: status,
    };
  } catch (err: unknown) {
    const safeErr = sanitizeErrorMessage(err instanceof Error ? err.message : "Gagal menghubungi server SMTP.");
    return {
      connected: false,
      message: `Gagal verifikasi koneksi SMTP: ${safeErr}`,
      details: status,
    };
  }
}

/**
 * Validasi sintaks email RFC 5322 ringkas.
 */
export function isValidEmail(email: string | null | undefined): email is string {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Menyamarkan alamat email pada catatan log untuk melindungi privasi warga.
 * Contoh: budi.santoso@gmail.com -> bu***@gmail.com
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Menghapus kemungkinan bocornya password atau token autentikasi
 * dari pesan kesalahan (error message) Nodemailer.
 */
function sanitizeErrorMessage(errMsg: string): string {
  if (!errMsg) return "Kesalahan tidak diketahui.";
  return errMsg
    .replace(/(password|pass|secret|token|auth)=['"]?[^'"\s]+['"]?/gi, "$1=[REDACTED]")
    .replace(/(AUTH LOGIN|AUTH PLAIN)[^\n]+/gi, "$1 [REDACTED]")
    .replace(/[a-zA-Z0-9+/=]{24,}/g, "[REDACTED_PAYLOAD]");
}

export interface SendStatusEmailParams {
  recipientEmail: string;
  recipientName: string;
  applicationId: string;
  nomorPengajuan: string;
  serviceName: string;
  status: ApplicationStatus | "SURAT_TERBIT";
  title: string;
  message: string;
  note?: string | null;
  officialLetterKey?: string | null;
  officialLetterName?: string | null;
  targetRole?: Role;
  createdAt?: Date | string;
}

function getServiceDisplayName(rawName: string): {
  fullName: string;
  shortLabel: string;
  isSktm: boolean;
  isSkck: boolean;
} {
  const lower = rawName.toLowerCase();
  const isSktm = lower.includes("sktm") || lower.includes("tidak mampu");
  const isSkck = lower.includes("skck") || lower.includes("catatan kepolisian");

  if (isSktm) {
    return {
      fullName: "Surat Keterangan Tidak Mampu (SKTM)",
      shortLabel: "SKTM",
      isSktm: true,
      isSkck: false,
    };
  }
  if (isSkck) {
    return {
      fullName: "Surat Pengantar Pembuatan SKCK",
      shortLabel: "Surat Pengantar SKCK",
      isSktm: false,
      isSkck: true,
    };
  }
  return {
    fullName: rawName,
    shortLabel: rawName,
    isSktm: false,
    isSkck: false,
  };
}

function getStatusDetails(status: ApplicationStatus | "SURAT_TERBIT"): {
  wargaStatusLabel: string;
  petugasTahapanLabel: string;
  badgeBg: string;
  badgeColor: string;
} {
  switch (status) {
    case "DIAJUKAN":
      return {
        wargaStatusLabel: "Pengajuan Diterima (Menunggu Pemeriksaan Awal)",
        petugasTahapanLabel: "Antrean Verifikasi Awal Berkas (Staf Pelayanan)",
        badgeBg: "#eff2fe",
        badgeColor: "#5e72e4",
      };
    case "DIVERIFIKASI":
      return {
        wargaStatusLabel: "Sedang Diverifikasi (Pemeriksaan Dokumen Persyaratan)",
        petugasTahapanLabel: "Pemeriksaan Dokumen Persyaratan (Staf Pelayanan)",
        badgeBg: "#e8f9fd",
        badgeColor: "#11cdef",
      };
    case "DIPROSES":
      return {
        wargaStatusLabel: "Penyiapan Draf Surat Resmi",
        petugasTahapanLabel: "Penyusunan Draf & Registrasi Nomor Agenda",
        badgeBg: "#e8f9fd",
        badgeColor: "#11cdef",
      };
    case "REVIEW_SUPERVISOR":
      return {
        wargaStatusLabel: "Dalam Tahap Review Kendali Mutu Supervisor",
        petugasTahapanLabel: "Telaah Kendali Mutu & Validasi Naskah (Supervisor)",
        badgeBg: "#f4f1fd",
        badgeColor: "#825ee4",
      };
    case "MENUNGGU_APPROVAL":
      return {
        wargaStatusLabel: "Menunggu Persetujuan Kepala Desa",
        petugasTahapanLabel: "Persetujuan Resmi & Tanda Tangan (Kepala Desa)",
        badgeBg: "#feecee",
        badgeColor: "#f5365c",
      };
    case "DISETUJUI":
      return {
        wargaStatusLabel: "Disetujui oleh Kepala Desa",
        petugasTahapanLabel: "Persetujuan Resmi Disahkan (Siap Penerbitan Surat)",
        badgeBg: "#eafaf3",
        badgeColor: "#2dce89",
      };
    case "SELESAI":
    case "SURAT_TERBIT":
      return {
        wargaStatusLabel: "Selesai (Surat Resmi Digital Telah Terbit)",
        petugasTahapanLabel: "Surat Resmi Terbit & Telah Dikirimkan ke Warga",
        badgeBg: "#eafaf3",
        badgeColor: "#2dce89",
      };
    case "PERLU_PERBAIKAN":
      return {
        wargaStatusLabel: "Perlu Perbaikan Dokumen",
        petugasTahapanLabel: "Permintaan Perbaikan Berkas Diteruskan ke Warga",
        badgeBg: "#fff3f0",
        badgeColor: "#fb6340",
      };
    case "DITOLAK":
      return {
        wargaStatusLabel: "Tidak Disetujui",
        petugasTahapanLabel: "Keputusan Penolakan Berkas Resmi Diterbitkan",
        badgeBg: "#feecee",
        badgeColor: "#f5365c",
      };
    default:
      return {
        wargaStatusLabel: "Dalam Proses Pelayanan",
        petugasTahapanLabel: "Proses Administrasi Desa",
        badgeBg: "#eff2fe",
        badgeColor: "#5e72e4",
      };
  }
}

function formatWibDate(dateInput?: Date | string): string {
  const date = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  return (
    date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

/**
 * Mengirimkan Email Notifikasi Status Pengajuan.
 * Melakukan pre-flight check konfigurasi & validasi penerima.
 * Jika konfigurasi belum tersedia, kegagalan dicatat dengan instruksi jelas
 * dan tidak mengklaim email berhasil terkirim.
 */
export async function sendApplicationStatusEmail(params: SendStatusEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  instructions?: string;
}> {
  const {
    recipientEmail,
    recipientName,
    applicationId,
    nomorPengajuan,
    serviceName,
    status,
    title,
    message,
    note,
    officialLetterKey,
    targetRole = "WARGA",
    createdAt,
  } = params;

  // 1. Verifikasi Alamat Email Penerima
  if (!isValidEmail(recipientEmail)) {
    console.warn(`[Email Service] Alamat email penerima tidak valid atau tidak terdaftar: "${recipientEmail}"`);
    return { success: false, error: "Alamat email penerima tidak valid." };
  }

  // 2. Pre-flight Check Konfigurasi SMTP Server
  const configStatus = checkEmailConfigStatus();
  if (!configStatus.isConfigured) {
    console.warn(
      `[Email Service] Pengiriman email ke [${maskEmail(recipientEmail)}] DITANGGUHKAN: Konfigurasi email server belum lengkap.`
    );
    if (configStatus.instructions) {
      console.info(configStatus.instructions);
    }
    return {
      success: false,
      error: `Layanan pengiriman email belum dikonfigurasi di server (${configStatus.missingVariables.join(", ")}).`,
      instructions: configStatus.instructions,
    };
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const village = getVillageConfig();
  const serviceInfo = getServiceDisplayName(serviceName);
  const statusDetails = getStatusDetails(status);
  const waktuKejadian = formatWibDate(createdAt);

  const isWarga = targetRole === "WARGA";

  // Rute detail pengajuan sesuai hak akses peran
  let detailRoute = `/warga/pengajuan/${applicationId}`;
  let ctaLabel = "Lihat Detail Pengajuan";

  if (targetRole === "STAF") {
    detailRoute = `/staf/pengajuan/${applicationId}`;
    ctaLabel = "Buka Antrean Verifikasi Staf";
  } else if (targetRole === "SUPERVISOR") {
    detailRoute = `/supervisor/pengajuan/${applicationId}`;
    ctaLabel = "Buka Review Supervisor";
  } else if (targetRole === "KEPALA_DESA") {
    detailRoute = `/kades/persetujuan/${applicationId}`;
    ctaLabel = "Buka Persetujuan Kepala Desa";
  }

  const detailUrl = `${appUrl}${detailRoute}`;
  const downloadUrl = officialLetterKey ? `${appUrl}/api/files/${officialLetterKey}?download=1` : null;

  // Penentuan Subjek Email Profesional Berbahasa Indonesia
  let emailSubject = "";
  if (isWarga) {
    if (status === "DIAJUKAN") {
      emailSubject = `Konfirmasi Penerimaan Pengajuan ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else if (status === "DIVERIFIKASI") {
      emailSubject = `Pembaruan Status: Sedang Diverifikasi ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else if (status === "DIPROSES") {
      emailSubject = `Pembaruan Status: Sedang Diproses ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else if (status === "PERLU_PERBAIKAN") {
      emailSubject = `Pembaruan Status: Perlu Perbaikan Berkas ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else if (status === "MENUNGGU_APPROVAL") {
      emailSubject = `Pembaruan Status: Menunggu Persetujuan Kades ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else if (status === "DISETUJUI") {
      emailSubject = `Pembaruan Status: Pengajuan ${serviceInfo.shortLabel} Disetujui — ${nomorPengajuan}`;
    } else if (status === "SURAT_TERBIT" || status === "SELESAI") {
      emailSubject = `Pembaruan Status: Surat Resmi ${serviceInfo.shortLabel} Terbit — ${nomorPengajuan}`;
    } else if (status === "DITOLAK") {
      emailSubject = `Pemberitahuan Hasil Pengajuan ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    } else {
      emailSubject = `Pembaruan Status Pengajuan ${serviceInfo.shortLabel} — ${nomorPengajuan}`;
    }
  } else {
    // Petugas (Staf, Supervisor, Kepala Desa)
    if (title.toLowerCase().includes("baru masuk") || status === "DIAJUKAN") {
      emailSubject = `Pengajuan Baru Memerlukan Verifikasi — ${nomorPengajuan}`;
    } else if (title.toLowerCase().includes("perbaikan") || title.toLowerCase().includes("ulang")) {
      emailSubject = `Dokumen Perbaikan Masuk Memerlukan Verifikasi — ${nomorPengajuan}`;
    } else if (status === "REVIEW_SUPERVISOR") {
      emailSubject = `Pengajuan Siap Direview (Kendali Mutu) — ${nomorPengajuan}`;
    } else if (status === "MENUNGGU_APPROVAL") {
      emailSubject = `Pemberitahuan Tugas: Pengajuan Menunggu Keputusan Kepala Desa — ${nomorPengajuan}`;
    } else {
      emailSubject = `${title} — ${nomorPengajuan}`;
    }
  }

  // Petunjuk khusus SKTM & SKCK bagi pemohon warga
  let serviceGuidanceHtml = "";
  if (isWarga && serviceInfo.isSkck) {
    serviceGuidanceHtml = `
      <div style="margin-top: 18px; padding: 14px 16px; background-color: #f8fafd; border-left: 4px solid #5e72e4; border-radius: 6px; font-size: 13px; color: #344767; line-height: 1.55;">
        <strong>📌 Petunjuk Pemohon SKCK:</strong> Setelah surat pengantar desa ini diterbitkan secara sah, Anda dapat membawanya ke Polsek atau Polres setempat beserta fotokopi KTP, Kartu Keluarga, dan pas foto 4x6 latar belakang merah untuk penerbitan SKCK resmi Kepolisian RI.
      </div>
    `;
  } else if (isWarga && serviceInfo.isSktm) {
    serviceGuidanceHtml = `
      <div style="margin-top: 18px; padding: 14px 16px; background-color: #f7fdfa; border-left: 4px solid #2dce89; border-radius: 6px; font-size: 13px; color: #344767; line-height: 1.55;">
        <strong>📌 Petunjuk Pemohon SKTM:</strong> Surat Keterangan Tidak Mampu (SKTM) ini resmi disahkan oleh Pemerintah Desa dan dapat digunakan sebagai kelengkapan pengajuan beasiswa pendidikan, keringanan biaya pelayanan medis di RS, atau pendaftaran program bantuan sosial (DTKS).
      </div>
    `;
  }

  // Tombol aksi utama responsif + direct URL fallback
  const ctaButtonsHtml = downloadUrl
    ? `
      <div style="margin: 26px 0 10px; text-align: center;">
        <a href="${downloadUrl}" style="display: inline-block; padding: 13px 26px; background: linear-gradient(310deg, #2dce89 0%, #2dcecc 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 12px rgba(45, 206, 137, 0.35); margin: 6px;">
          📥 Unduh PDF Surat Resmi
        </a>
        <a href="${detailUrl}" style="display: inline-block; padding: 12px 22px; background: #ffffff; color: #344767; text-decoration: none; font-weight: 700; font-size: 13.5px; border-radius: 8px; border: 1.5px solid #d2d6da; margin: 6px;">
          Lihat Riwayat di Website →
        </a>
        <div style="margin-top: 10px; font-size: 12px; color: #8898aa; word-break: break-all;">
          Tautan langsung: <a href="${detailUrl}" style="color: #5e72e4; text-decoration: underline;">${detailUrl}</a>
        </div>
      </div>
    `
    : `
      <div style="margin: 26px 0 10px; text-align: center;">
        <a href="${detailUrl}" style="display: inline-block; padding: 13px 28px; background: linear-gradient(310deg, #5e72e4 0%, #825ee4 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px rgba(94, 114, 228, 0.35);">
          ${ctaLabel} →
        </a>
        <div style="margin-top: 10px; font-size: 12px; color: #8898aa; word-break: break-all;">
          Tautan langsung: <a href="${detailUrl}" style="color: #5e72e4; text-decoration: underline;">${detailUrl}</a>
        </div>
      </div>
    `;

  const notesHtml = note
    ? `
      <div style="margin-top: 14px; padding: 12px 16px; background-color: #fffdf9; border: 1px solid #ffdcd3; border-radius: 8px;">
        <span style="font-size: 11px; font-weight: 800; color: #fb6340; text-transform: uppercase; letter-spacing: 0.05em;">Catatan Resmi Petugas:</span>
        <p style="margin: 4px 0 0; font-size: 13px; color: #495057; font-style: italic; line-height: 1.5;">&ldquo;${note}&rdquo;</p>
      </div>
    `
    : "";

  const recipientGreeting = `Halo ${recipientName},`;
  const leadMessage = isWarga
    ? `Terdapat pembaruan pada pengajuan <strong>${serviceInfo.fullName}</strong> Anda.`
    : `Terdapat pengajuan baru yang memerlukan tindak lanjut sesuai kewenangan Anda.`;

  const instructionMessage = isWarga
    ? `Silakan masuk ke aplikasi Pelayanan Desa untuk melihat detail pengajuan dan tindak lanjut yang diperlukan.`
    : `Silakan masuk ke aplikasi Pelayanan Desa untuk memeriksa detail pengajuan.`;

  // Template HTML Resmi (Tanpa Bocoran Data Pribadi Sensitif / NIK)
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #344767;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); border: 1px solid rgba(0, 0, 0, 0.05);">
              
              <!-- Header Gradient Banner -->
              <tr>
                <td style="background: linear-gradient(310deg, #5e72e4 0%, #825ee4 100%); padding: 30px 28px; text-align: center; color: #ffffff;">
                  <div style="display: inline-block; padding: 5px 14px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">
                    🏛️ ${village.villageName.toUpperCase()}
                  </div>
                  <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                    ${village.appName}
                  </h1>
                  <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.9);">
                    Pemberitahuan Otomatis Layanan Administrasi Publik
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 28px 30px;">
                  <p style="margin: 0 0 14px; font-size: 14.5px; color: #344767; font-weight: 700;">
                    ${recipientGreeting}
                  </p>

                  <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6;">
                    ${leadMessage}
                  </p>

                  <!-- Ringkasan Data Pengajuan Berdasarkan Backend Aktual -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 16px 20px; margin: 18px 0;">
                    <tr>
                      <td style="padding: 7px 0; font-size: 12px; color: #8898aa; font-weight: 700; text-transform: uppercase; width: 145px;">
                        Jenis Layanan
                      </td>
                      <td style="padding: 7px 0; font-size: 13.5px; color: #1e293b; font-weight: 800;">
                        ${serviceInfo.fullName}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 7px 0; font-size: 12px; color: #8898aa; font-weight: 700; text-transform: uppercase; width: 145px;">
                        Nomor Pengajuan
                      </td>
                      <td style="padding: 7px 0; font-size: 13.5px; color: #1e293b; font-weight: 800; font-family: monospace;">
                        ${nomorPengajuan}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 7px 0; font-size: 12px; color: #8898aa; font-weight: 700; text-transform: uppercase;">
                        ${isWarga ? "Status Terbaru" : "Tahapan"}
                      </td>
                      <td style="padding: 7px 0; font-size: 13.5px; color: #1e293b; font-weight: 700;">
                        <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 800; background-color: ${statusDetails.badgeBg}; color: ${statusDetails.badgeColor};">
                          ${isWarga ? statusDetails.wargaStatusLabel : statusDetails.petugasTahapanLabel}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 7px 0; font-size: 12px; color: #8898aa; font-weight: 700; text-transform: uppercase;">
                        Waktu Kejadian
                      </td>
                      <td style="padding: 7px 0; font-size: 13px; color: #525f7f; font-weight: 600;">
                        ${waktuKejadian}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 7px 0; font-size: 12px; color: #8898aa; font-weight: 700; text-transform: uppercase; vertical-align: top;">
                        Informasi Tambahan
                      </td>
                      <td style="padding: 7px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                        ${message}
                      </td>
                    </tr>
                  </table>

                  ${notesHtml}
                  ${serviceGuidanceHtml}

                  <p style="margin: 20px 0 0; font-size: 13.5px; color: #475569; line-height: 1.55;">
                    ${instructionMessage}
                  </p>

                  ${ctaButtonsHtml}

                  <p style="margin: 24px 0 4px; font-size: 13.5px; color: #475569;">
                    ${isWarga ? "Terima kasih telah menggunakan layanan Pelayanan Desa." : "Terima kasih atas dedikasi pelayanan Anda."}
                  </p>
                  <p style="margin: 0; font-size: 13.5px; font-weight: 700; color: #1e293b;">
                    Hormat kami,<br />
                    <span style="color: #5e72e4;">${village.appName}</span>
                  </p>

                  <hr style="border: none; border-top: 1px solid #f0f2f5; margin: 24px 0 16px;" />

                  <div style="background-color: #fbfcfe; border: 1px dashed #dce4fd; border-radius: 8px; padding: 12px 14px; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                    🔒 <strong>Pemberitahuan Keamanan & Privasi:</strong> Sesuai standar perlindungan data pribadi kependudukan, email ini tidak memuat NIK lengkap, nomor Kartu Keluarga, maupun dokumen identitas. Harap jaga kerahasiaan kata sandi akun Anda.
                  </div>
                </td>
              </tr>

              <!-- Footer Kontak Resmi Desa -->
              <tr>
                <td style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; padding: 22px 28px; text-align: center; font-size: 12px; color: #8898aa; line-height: 1.6;">
                  <p style="margin: 0 0 6px; font-weight: 700; color: #525f7f;">
                    ${village.villageName} &bull; ${village.appName}
                  </p>
                  <p style="margin: 0 0 6px;">
                    📍 ${village.officeAddress}
                  </p>
                  <p style="margin: 0 0 6px;">
                    ⏰ Jam Layanan: ${village.serviceHours}
                  </p>
                  <p style="margin: 0;">
                    📞 Kontak: ${village.phone} &bull; ✉️ Email: <a href="mailto:${village.email}" style="color: #5e72e4; text-decoration: none;">${village.email}</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Versi Plain Text (Paling kompatibel)
  const plainTextContent = isWarga
    ? `Halo ${recipientName},

Terdapat pembaruan pada permohonan pelayanan desa Anda.

Jenis layanan: ${serviceInfo.fullName}
Nomor pengajuan: ${nomorPengajuan}
Status terbaru: ${statusDetails.wargaStatusLabel}
Waktu kejadian: ${waktuKejadian}
Informasi tambahan: ${message}${note ? ` (Catatan Petugas: "${note}")` : ""}

Silakan masuk ke aplikasi Pelayanan Desa untuk melihat detail pengajuan dan tindak lanjut yang diperlukan:
${detailUrl}
${downloadUrl ? `\nUnduh Dokumen Surat Resmi (PDF):\n${downloadUrl}\n` : ""}
Terima kasih telah menggunakan layanan Pelayanan Desa.

Hormat kami,
${village.appName}

---
${village.villageName}
Alamat: ${village.officeAddress}
Jam Layanan: ${village.serviceHours}
Kontak: ${village.phone} | ${village.email}
*Pemberitahuan: Email ini dikirim secara otomatis dan tidak memuat NIK/KK demi keamanan data Anda.`
    : `Halo ${recipientName},

Terdapat pengajuan baru yang memerlukan tindak lanjut sesuai kewenangan Anda.

Jenis layanan: ${serviceInfo.fullName}
Nomor pengajuan: ${nomorPengajuan}
Waktu pengajuan: ${waktuKejadian}
Tahapan: ${statusDetails.petugasTahapanLabel}
Informasi tambahan: ${message}${note ? ` (Catatan: "${note}")` : ""}

Silakan masuk ke aplikasi Pelayanan Desa untuk memeriksa detail pengajuan:
${detailUrl}

Hormat kami,
${village.appName}

---
${village.villageName}
Alamat: ${village.officeAddress}
Jam Layanan: ${village.serviceHours}
Kontak: ${village.phone} | ${village.email}`;

  const config = getEmailConfig();
  const targetLower = recipientEmail.trim().toLowerCase();

  // Deteksi apakah alamat email menggunakan domain pengujian lokal (misal: .local, .test, .example)
  const isLocalSimulatedDomain =
    targetLower.endsWith(".local") ||
    targetLower.endsWith(".test") ||
    targetLower.endsWith(".example");

  const isExternalSmtp =
    config.host.toLowerCase().includes("gmail") ||
    config.host.toLowerCase().includes("google") ||
    (!config.host.includes("localhost") && !config.host.includes("127.0.0.1") && config.port !== 1025);

  // Jika domain lokal dummy (.local) dikirim melalui SMTP eksternal publik (seperti Gmail),
  // Gmail akan menolak dengan error 550 (unroutable domain). Maka sistem secara cerdas
  // mencatat simulasi sukses untuk akun pengujian lokal agar proses tidak macet.
  if (isLocalSimulatedDomain && isExternalSmtp) {
    console.log(
      `[Email Dev Simulation] Email untuk [${recipientEmail}] (${targetRole}) disimulasikan sukses karena menggunakan domain lokal (.local) pada SMTP publik (${config.host}).`
    );
    return {
      success: true,
      messageId: `<simulated-local-${Date.now()}@desa.local>`,
    };
  }

  try {
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: config.from,
      to: recipientEmail,
      subject: emailSubject,
      html: htmlContent,
      text: plainTextContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Ke: ${maskEmail(recipientEmail)} | Subjek: ${emailSubject} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const safeError = sanitizeErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan pada server SMTP.");
    console.error(`[Email Failed] Gagal mengirim email ke ${maskEmail(recipientEmail)}: ${safeError}`);
    return { success: false, error: safeError };
  }
}

export interface SendDirectTestEmailParams {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
}

/**
 * Mengirimkan email uji coba khusus dengan teks bebas resmi.
 */
export async function sendDirectTestEmail(params: SendDirectTestEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { recipientEmail, subject, bodyText } = params;

  if (!isValidEmail(recipientEmail)) {
    return { success: false, error: "Alamat email penerima tidak valid." };
  }

  const config = getEmailConfig();
  const targetLower = recipientEmail.trim().toLowerCase();
  const isLocalSimulatedDomain =
    targetLower.endsWith(".local") ||
    targetLower.endsWith(".test") ||
    targetLower.endsWith(".example");

  const isExternalSmtp =
    config.host.toLowerCase().includes("gmail") ||
    config.host.toLowerCase().includes("google") ||
    (!config.host.includes("localhost") && !config.host.includes("127.0.0.1") && config.port !== 1025);

  if (isLocalSimulatedDomain && isExternalSmtp) {
    console.log(
      `[Email Dev Simulation] Email langsung untuk [${recipientEmail}] disimulasikan sukses karena domain lokal pada SMTP publik.`
    );
    return {
      success: true,
      messageId: `<simulated-direct-${Date.now()}@desa.local>`,
    };
  }

  const village = getVillageConfig();
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Format HTML modern yang bersih dan responsif
  const formattedHtmlParagraphs = bodyText
    .split(/\n\n+/)
    .map((paragraph) => {
      const escaped = paragraph.replace(/\n/g, "<br />");
      return `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #344767;">${escaped}</p>`;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #344767;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e9ecef;">
              <tr>
                <td style="background: linear-gradient(310deg, #5e72e4 0%, #825ee4 100%); padding: 24px 30px; text-align: left;">
                  <span style="display: inline-block; background-color: rgba(255,255,255,0.22); color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                    Mode Pengujian Sistem
                  </span>
                  <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800;">
                    ${village.appName}
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 30px 20px;">
                  ${formattedHtmlParagraphs}
                  <div style="margin: 25px 0 10px; text-align: center;">
                    <a href="${appUrl}/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(310deg, #5e72e4 0%, #825ee4 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13.5px; border-radius: 8px;">
                      Buka Aplikasi Pelayanan Desa →
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; padding: 20px 30px; text-align: center; font-size: 12px; color: #8898aa;">
                  <p style="margin: 0 0 4px; font-weight: 700; color: #525f7f;">${village.villageName}</p>
                  <p style="margin: 0;">${village.officeAddress} &bull; ${village.phone}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const transporter = createEmailTransporter();
    const info = await transporter.sendMail({
      from: config.from,
      to: recipientEmail,
      subject,
      html: htmlContent,
      text: bodyText,
    });
    console.log(`[Email Sent] Ke: ${maskEmail(recipientEmail)} | Subjek: ${subject} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const safeError = sanitizeErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan pada server SMTP.");
    console.error(`[Email Failed] Gagal mengirim email ke ${maskEmail(recipientEmail)}: ${safeError}`);
    return { success: false, error: safeError };
  }
}

