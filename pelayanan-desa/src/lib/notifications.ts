import { prisma } from "./db";
import { sendApplicationStatusEmail, isValidEmail } from "./email/service";
import { sendWhatsAppNotification, isValidWhatsAppNumber, formatWhatsAppNumber, maskPhone } from "./whatsapp/service";
import type { ApplicationStatus, NotificationType, Prisma } from "@prisma/client";

/**
 * Mapping pesan notifikasi berstandar bahasa pelayanan publik untuk Warga Pemohon.
 */
export function notificationForStatus(
  status: ApplicationStatus,
  serviceName: string,
  number: string,
  note?: string
) {
  switch (status) {
    case "DIAJUKAN":
      return {
        type: "APPLICATION_CREATED" as const,
        title: "Konfirmasi Penerimaan Pengajuan",
        message: `Permohonan ${serviceName} (${number}) telah berhasil diterima dalam sistem. Dokumen Anda kini dalam antrean pemeriksaan awal oleh Staf Pelayanan Desa.`,
      };

    case "DIVERIFIKASI":
      return {
        type: "STATUS_CHANGED" as const,
        title: "Pembaruan Status: Sedang Diverifikasi",
        message: `Staf Desa sedang memeriksa kelengkapan data dan dokumen persyaratan untuk ${serviceName} (${number}).`,
      };

    case "DIPROSES":
      return {
        type: "STATUS_CHANGED" as const,
        title: "Pembaruan Status: Sedang Diproses",
        message: `Staf Pelayanan Desa sedang menyusun naskah surat resmi dan memvalidasi nomor agenda register desa untuk permohonan ${serviceName} (${number}).`,
      };

    case "REVIEW_SUPERVISOR":
      return {
        type: "STATUS_CHANGED" as const,
        title: "Pembaruan Status: Penelaahan Berkas",
        message: `Pemeriksaan berkas persyaratan untuk ${serviceName} (${number}) telah selesai diverifikasi oleh Staf Desa dan diteruskan untuk persetujuan resmi.`,
      };

    case "MENUNGGU_APPROVAL":
      return {
        type: "STATUS_CHANGED" as const,
        title: "Pembaruan Status: Menunggu Persetujuan Kepala Desa",
        message: `Pengajuan ${serviceName} (${number}) telah selesai diverifikasi oleh Staf Desa dan saat ini menunggu persetujuan resmi Kepala Desa.`,
      };

    case "DISETUJUI":
      return {
        type: "APPROVED" as const,
        title: "Notifikasi Persetujuan: Pengajuan Disetujui",
        message: `Kabar baik! Kepala Desa telah memberikan persetujuan resmi atas permohonan ${serviceName} (${number}). Dokumen surat keputusan resmi bertanda tangan sedang disiapkan untuk diterbitkan.`,
      };

    case "SELESAI":
      return {
        type: "COMPLETED" as const,
        title: "Notifikasi Penyelesaian: Surat Resmi Terbit",
        message: `Pelayanan permohonan ${serviceName} (${number}) telah selesai diproses secara tuntas. Surat resmi telah diterbitkan secara sah oleh Pemerintah Desa dan siap diunduh.`,
      };

    case "PERLU_PERBAIKAN":
      return {
        type: "DOCUMENT_REPAIR" as const,
        title: "Instruksi Perbaikan Dokumen",
        message: `Petugas menemukan dokumen yang belum sesuai pada permohonan ${serviceName} (${number}).${
          note ? ` Catatan perbaikan petugas: "${note}".` : " Silakan buka pengajuan Anda untuk mengunggah perbaikan dokumen."
        }`,
      };

    case "DITOLAK":
      return {
        type: "STATUS_CHANGED" as const,
        title: "Pemberitahuan Hasil: Permohonan Tidak Disetujui",
        message: `Mohon maaf, permohonan ${serviceName} (${number}) belum dapat disetujui oleh Pemerintah Desa.${
          note ? ` Alasan penolakan resmi: "${note}".` : " Silakan datang ke kantor Balai Desa untuk konsultasi persyaratan."
        }`,
      };
  }
}

export interface ApplicationNotificationParams {
  event: "SUBMIT_NEW" | "STATUS_TRANSITION" | "RESUBMIT_REPAIR" | "SEND_OFFICIAL_LETTER";
  applicationId: string;
  nomorPengajuan: string;
  serviceName: string;
  applicant: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  newStatus?: ApplicationStatus;
  oldStatus?: ApplicationStatus | null;
  note?: string | null;
  officialLetterKey?: string | null;
  officialLetterName?: string | null;
}

interface InAppTarget {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface EmailTarget {
  email: string;
  name: string;
  title: string;
  message: string;
  targetRole: "WARGA" | "STAF" | "SUPERVISOR" | "KEPALA_DESA";
}

/**
 * Menyimpan seluruh In-App Notification ke dalam transaksi database
 * berdasarkan Tabel Aturan Notifikasi per peran:
 *
 * | Kejadian                     | Warga                     | Staf Desa                              | Supervisor                          | Kepala Desa                         |
 * |------------------------------|---------------------------|----------------------------------------|-------------------------------------|-------------------------------------|
 * | Pengajuan baru masuk         | Konfirmasi penerimaan     | Notifikasi pengajuan baru              | —                                   | —                                   |
 * | Dokumen perlu diperbaiki     | Instruksi perbaikan       | Notifikasi tindak lanjut jika perlu    | —                                   | —                                   |
 * | Warga kirim ulang dokumen    | Konfirmasi kirim ulang    | Notifikasi verifikasi ulang            | Notifikasi jika perlu review ulang  | —                                   |
 * | Verifikasi selesai           | Update status             | —                                      | Notifikasi siap direview            | —                                   |
 * | Review selesai               | Update status             | —                                      | —                                   | Notifikasi siap keputusan akhir     |
 * | Pengajuan disetujui          | Notifikasi persetujuan    | Update jika relevan                    | Update jika relevan                 | Konfirmasi tindakan bila perlu      |
 * | Pengajuan ditolak            | Notifikasi hasil & alasan | Update jika relevan                    | Update jika relevan                 | Konfirmasi tindakan bila perlu      |
 * | Pengajuan selesai diproses   | Notifikasi penyelesaian   | Update jika relevan                    | Update jika relevan                 | Update jika relevan                 |
 */
export async function recordInAppNotificationsForEvent(
  tx: Prisma.TransactionClient,
  params: ApplicationNotificationParams
) {
  const { event, applicationId, nomorPengajuan, serviceName, applicant, newStatus, note } = params;
  const inAppTargets: InAppTarget[] = [];

  // ==========================================
  // 1. Notifikasi untuk Warga (Pemohon Berkas)
  // ==========================================
  if (event === "SUBMIT_NEW") {
    // Row 1: Konfirmasi penerimaan
    inAppTargets.push({
      userId: applicant.id,
      type: "APPLICATION_CREATED",
      title: "Konfirmasi Penerimaan Pengajuan",
      message: `Permohonan ${serviceName} (${nomorPengajuan}) telah berhasil diterima dalam sistem. Dokumen Anda kini dalam antrean pemeriksaan berkas awal oleh Staf Pelayanan Desa.`,
    });
  } else if (event === "RESUBMIT_REPAIR") {
    // Row 3: Konfirmasi pengiriman ulang
    inAppTargets.push({
      userId: applicant.id,
      type: "STATUS_CHANGED",
      title: "Konfirmasi Pengiriman Ulang Dokumen",
      message: `Dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}) telah berhasil Anda kirimkan kembali. Menunggu verifikasi ulang oleh petugas.`,
    });
  } else if (event === "SEND_OFFICIAL_LETTER" || newStatus === "SELESAI") {
    // Row 8: Notifikasi penyelesaian
    inAppTargets.push({
      userId: applicant.id,
      type: "COMPLETED",
      title: "Notifikasi Penyelesaian: Surat Resmi Terbit",
      message: `Pelayanan permohonan ${serviceName} (${nomorPengajuan}) telah selesai diproses. Surat resmi digital telah disahkan dan siap Anda unduh.`,
    });
  } else if (event === "STATUS_TRANSITION" && newStatus) {
    if (newStatus === "PERLU_PERBAIKAN") {
      // Row 2: Instruksi perbaikan
      inAppTargets.push({
        userId: applicant.id,
        type: "DOCUMENT_REPAIR",
        title: "Instruksi Perbaikan Dokumen",
        message: `Petugas menyatakan dokumen permohonan ${serviceName} (${nomorPengajuan}) memerlukan perbaikan.${
          note ? ` Catatan perbaikan: "${note}".` : " Silakan buka pengajuan Anda untuk mengunggah perbaikan dokumen."
        }`,
      });
    } else if (newStatus === "DISETUJUI") {
      // Row 6: Notifikasi persetujuan
      inAppTargets.push({
        userId: applicant.id,
        type: "APPROVED",
        title: "Notifikasi Persetujuan: Pengajuan Disetujui",
        message: `Kabar baik! Kepala Desa telah menyetujui permohonan ${serviceName} (${nomorPengajuan}). Dokumen surat keputusan resmi sedang disiapkan untuk diterbitkan.`,
      });
    } else if (newStatus === "DITOLAK") {
      // Row 7: Notifikasi hasil dan alasan resmi
      inAppTargets.push({
        userId: applicant.id,
        type: "STATUS_CHANGED",
        title: "Pemberitahuan Hasil: Permohonan Tidak Disetujui",
        message: `Mohon maaf, permohonan ${serviceName} (${nomorPengajuan}) tidak disetujui oleh Pemerintah Desa.${
          note ? ` Alasan penolakan resmi: "${note}".` : " Silakan datang ke kantor Balai Desa untuk konsultasi persyaratan."
        }`,
      });
    } else {
      // Row 4 / 5: Update status
      const wargaNotif = notificationForStatus(newStatus, serviceName, nomorPengajuan, note || undefined);
      inAppTargets.push({
        userId: applicant.id,
        type: wargaNotif.type,
        title: wargaNotif.title,
        message: wargaNotif.message,
      });
    }
  }

  // ==========================================
  // 2. Notifikasi untuk Staf Desa
  // ==========================================
  let notifyStaff = false;
  let staffTitle = "";
  let staffMessage = "";
  let staffType: NotificationType = "STATUS_CHANGED";

  if (event === "SUBMIT_NEW") {
    // Row 1: Notifikasi pengajuan baru
    notifyStaff = true;
    staffType = "APPLICATION_CREATED";
    staffTitle = `Pengajuan ${serviceName} Baru Masuk (${nomorPengajuan})`;
    staffMessage = `Terdapat pengajuan ${serviceName} baru dari pemohon ${applicant.name} (${nomorPengajuan}) yang masuk ke antrean verifikasi staf desa.`;
  } else if (event === "RESUBMIT_REPAIR") {
    // Row 3: Notifikasi verifikasi ulang
    notifyStaff = true;
    staffType = "STATUS_CHANGED";
    staffTitle = `Verifikasi Ulang: Dokumen Perbaikan Masuk (${nomorPengajuan})`;
    staffMessage = `Pemohon ${applicant.name} telah mengirimkan ulang dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}). Silakan lakukan verifikasi ulang di antrean.`;
  } else if (event === "STATUS_TRANSITION") {
    if (newStatus === "PERLU_PERBAIKAN") {
      // Row 2: Notifikasi tindak lanjut jika diperlukan
      notifyStaff = true;
      staffType = "DOCUMENT_REPAIR";
      staffTitle = `Permintaan Perbaikan Berkas Terkirim: ${nomorPengajuan}`;
      staffMessage = `Permintaan perbaikan berkas untuk ${serviceName} (${nomorPengajuan}) telah diteruskan kepada warga ${applicant.name}. Menunggu pengiriman ulang.`;
    } else if (newStatus === "DISETUJUI") {
      // Row 6: Update jika relevan
      notifyStaff = true;
      staffType = "APPROVED";
      staffTitle = `Pembaruan: Pengajuan Telah Disetujui Kades (${nomorPengajuan})`;
      staffMessage = `Permohonan ${serviceName} (${nomorPengajuan}) untuk pemohon ${applicant.name} telah disetujui Kepala Desa. Silakan lanjutkan ke penuntasan pelayanan / penerbitan surat resmi.`;
    } else if (newStatus === "DITOLAK") {
      // Row 7: Update jika relevan
      notifyStaff = true;
      staffType = "STATUS_CHANGED";
      staffTitle = `Pembaruan: Pengajuan Ditolak oleh Kades (${nomorPengajuan})`;
      staffMessage = `Permohonan ${serviceName} (${nomorPengajuan}) untuk ${applicant.name} telah diputuskan ditolak oleh Kepala Desa.${note ? ` Alasan: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      // Row 8: Update jika relevan
      notifyStaff = true;
      staffType = "COMPLETED";
      staffTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
      staffMessage = `Pelayanan ${serviceName} (${nomorPengajuan}) untuk ${applicant.name} telah selesai diproses dan surat resmi telah diterbitkan.`;
    }
    // Verifikasi selesai (DIVERIFIKASI / DIPROSES / REVIEW_SUPERVISOR) & Review selesai (MENUNGGU_APPROVAL) -> Staf: "—" (tidak perlu notifikasi)
  } else if (event === "SEND_OFFICIAL_LETTER") {
    // Row 8: Update jika relevan
    notifyStaff = true;
    staffType = "COMPLETED";
    staffTitle = `Pembaruan: Surat Resmi Telah Terbit & Dikirim (${nomorPengajuan})`;
    staffMessage = `Kepala Desa telah menerbitkan dan mengunggah dokumen surat resmi (PDF) ${serviceName} untuk pemohon ${applicant.name}. Pelayanan dinyatakan selesai.`;
  }

  if (notifyStaff) {
    const staffUsers = await tx.user.findMany({
      where: { role: "STAF", isActive: true },
      select: { id: true },
    });
    for (const s of staffUsers) {
      inAppTargets.push({
        userId: s.id,
        type: staffType,
        title: staffTitle,
        message: staffMessage,
      });
    }
  }

  // ==========================================
  // 3. Notifikasi untuk Supervisor
  // ==========================================
  let notifySupervisor = false;
  let supTitle = "";
  let supMessage = "";
  let supType: NotificationType = "STATUS_CHANGED";

  if (event === "RESUBMIT_REPAIR") {
    // Row 3: Notifikasi jika perlu review ulang
    notifySupervisor = true;
    supType = "STATUS_CHANGED";
    supTitle = `Pembaruan Berkas Perbaikan: ${nomorPengajuan}`;
    supMessage = `Pemohon ${applicant.name} telah memperbarui dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}). Berkas kembali ke alur verifikasi staf sebelum ditelaah ulang.`;
  } else if (event === "STATUS_TRANSITION") {
    if (newStatus === "REVIEW_SUPERVISOR") {
      // Row 4: Notifikasi pengajuan siap direview
      notifySupervisor = true;
      supType = "STATUS_CHANGED";
      supTitle = `Pengajuan Siap Direview (Kendali Mutu): ${nomorPengajuan}`;
      supMessage = `Staf Desa telah menyelesaikan verifikasi berkas dan penyiapan draf untuk ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name}. Pengajuan kini siap untuk Anda review.`;
    } else if (newStatus === "MENUNGGU_APPROVAL") {
      // Notifikasi pemantauan alur untuk Supervisor
      notifySupervisor = true;
      supType = "STATUS_CHANGED";
      supTitle = `Pembaruan Pemantauan: Pengajuan Menuju Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah selesai diproses staf desa dan kini berada di antrean persetujuan Kepala Desa.`;
    } else if (newStatus === "DISETUJUI") {
      // Row 6: Update jika relevan
      notifySupervisor = true;
      supType = "APPROVED";
      supTitle = `Pembaruan: Pengajuan Disetujui Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah resmi disetujui oleh Kepala Desa.`;
    } else if (newStatus === "DITOLAK") {
      // Row 7: Update jika relevan
      notifySupervisor = true;
      supType = "STATUS_CHANGED";
      supTitle = `Pembaruan: Pengajuan Ditolak oleh Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah diputuskan ditolak oleh Kepala Desa.${note ? ` Alasan: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      // Row 8: Update jika relevan
      notifySupervisor = true;
      supType = "COMPLETED";
      supTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
      supMessage = `Pengajuan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah selesai diproses dan surat resmi telah diterbitkan.`;
    }
    // Pengajuan baru, dokumen perbaikan, review selesai -> Supervisor: "—"
  } else if (event === "SEND_OFFICIAL_LETTER") {
    // Row 8: Update jika relevan
    notifySupervisor = true;
    supType = "COMPLETED";
    supTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
    supMessage = `Pengajuan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah selesai diproses dan surat resmi telah diterbitkan.`;
  }

  if (notifySupervisor) {
    const supervisorUsers = await tx.user.findMany({
      where: { role: "SUPERVISOR", isActive: true },
      select: { id: true },
    });
    for (const sup of supervisorUsers) {
      inAppTargets.push({
        userId: sup.id,
        type: supType,
        title: supTitle,
        message: supMessage,
      });
    }
  }

  // ==========================================
  // 4. Notifikasi untuk Kepala Desa
  // ==========================================
  let notifyKades = false;
  let kadesTitle = "";
  let kadesMessage = "";
  let kadesType: NotificationType = "STATUS_CHANGED";

  if (event === "STATUS_TRANSITION") {
    if (newStatus === "MENUNGGU_APPROVAL") {
      // Row 5: Notifikasi jika siap keputusan akhir
      notifyKades = true;
      kadesType = "STATUS_CHANGED";
      kadesTitle = `Pengajuan Siap Keputusan Akhir & Pengesahan Kades: ${nomorPengajuan}`;
      kadesMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name} telah diverifikasi dan diproses oleh staf desa. Berkas siap mendapat keputusan akhir dan pengesahan resmi Anda.`;
    } else if (newStatus === "DISETUJUI") {
      // Row 6: Konfirmasi tindakan bila diperlukan
      notifyKades = true;
      kadesType = "APPROVED";
      kadesTitle = `Konfirmasi Persetujuan: ${nomorPengajuan}`;
      kadesMessage = `Anda telah memberikan persetujuan resmi untuk permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name}.`;
    } else if (newStatus === "DITOLAK") {
      // Row 7: Konfirmasi tindakan bila diperlukan
      notifyKades = true;
      kadesType = "STATUS_CHANGED";
      kadesTitle = `Konfirmasi Penolakan: ${nomorPengajuan}`;
      kadesMessage = `Anda telah memutuskan untuk menolak permohonan ${serviceName} (${nomorPengajuan}) atas nama ${applicant.name}.${note ? ` Alasan resmi: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      // Row 8: Update jika relevan
      notifyKades = true;
      kadesType = "COMPLETED";
      kadesTitle = `Pembaruan: Pengiriman Surat Resmi Selesai (${nomorPengajuan})`;
      kadesMessage = `Dokumen surat resmi ${serviceName} (${nomorPengajuan}) untuk ${applicant.name} telah berhasil dikirimkan kepada warga. Pelayanan selesai.`;
    }
    // Pengajuan baru, dokumen perbaikan, kirim ulang, verifikasi selesai -> Kepala Desa: "—"
  } else if (event === "SEND_OFFICIAL_LETTER") {
    // Row 8: Update jika relevan
    notifyKades = true;
    kadesType = "COMPLETED";
    kadesTitle = `Pembaruan: Pengiriman Surat Resmi Berhasil (${nomorPengajuan})`;
    kadesMessage = `Dokumen surat resmi ${serviceName} (${nomorPengajuan}) untuk ${applicant.name} telah berhasil dikirimkan kepada warga. Pelayanan selesai.`;
  }

  if (notifyKades) {
    const kadesUsers = await tx.user.findMany({
      where: { role: "KEPALA_DESA", isActive: true },
      select: { id: true },
    });
    for (const kd of kadesUsers) {
      inAppTargets.push({
        userId: kd.id,
        type: kadesType,
        title: kadesTitle,
        message: kadesMessage,
      });
    }
  }

  // Tulis seluruh notifikasi in-app ke basis data secara atomik dengan idempotensi (eventId)
  const eventId = `${applicationId}:${event}:${newStatus || "INIT"}`;

  for (const item of inAppTargets) {
    // 1. Periksa preferensi notifikasi in-app pengguna
    const pref = await tx.notificationPreference.findUnique({
      where: { userId: item.userId },
      select: { inAppEnabled: true, notifyOnStatus: true, notifyOnRepair: true },
    });

    if (pref) {
      if (pref.inAppEnabled === false) continue;
      if (item.type === "STATUS_CHANGED" && pref.notifyOnStatus === false) continue;
      if (item.type === "DOCUMENT_REPAIR" && pref.notifyOnRepair === false) continue;
    }

    // 2. Mekanisme Idempotensi: Cegah duplikasi notifikasi untuk kejadian yang sama
    const existing = await tx.notification.findFirst({
      where: {
        userId: item.userId,
        eventId,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await tx.notification.create({
      data: {
        userId: item.userId,
        applicationId,
        type: item.type,
        title: item.title,
        message: item.message,
        eventId,
      },
    });
  }
}

/**
 * Mengirimkan Notifikasi WhatsA/**
 * Mengirimkan Notifikasi WhatsApp kepada Warga Pemohon berdasarkan kontak profil di database.
 * TIDAK PERNAH menggunakan nomor hardcoded, nomor orang lain, atau mengarang kontak.
 * Jika kontak belum terisi, dicatat sebagai tidak dapat dikirim dengan instruksi melengkapi profil.
 */
export async function dispatchWhatsAppNotificationForWarga(params: ApplicationNotificationParams) {
  try {
    const { event, applicationId, nomorPengajuan, serviceName, applicant, newStatus, note, officialLetterName } = params;

    // 1. Ambil kontak profil TERBARU langsung dari basis data berdasarkan ID akun warga pemohon
    let latestUser: { id: string; name: string; email: string; phone: string | null } | null = null;
    if (applicant.id) {
      latestUser = await prisma.user.findUnique({
        where: { id: applicant.id },
        select: { id: true, name: true, email: true, phone: true },
      });
    }

    // Jika applicant.id tidak tersedia, telusuri relasi kepemilikan pengajuan di database (application.userId)
    if (!latestUser && applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
      latestUser = app?.user || null;
    }

    // Prioritas 1: Nomor WhatsApp resmi dari profil akun pemohon di database
    let phone: string | null = latestUser?.phone?.trim() || applicant.phone?.trim() || null;

    // Prioritas 2: Jika profil belum terisi, periksa formulir spesifik pengajuan milik pemohon bersangkutan
    if (!phone && applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { form_data: true },
      });
      const formData = app?.form_data as Record<string, string> | null;
      const formPhone = formData?.no_telepon || formData?.no_whatsapp || formData?.whatsapp || formData?.no_hp;
      if (formPhone) {
        phone = String(formPhone).trim();
      }
    }

    const wargaName = latestUser?.name || applicant.name || "Warga Pemohon";
    const wargaId = latestUser?.id || applicant.id || "unknown";

    // Validasi ketat: Jika nomor belum diisi atau tidak valid, JANGAN PERNAH mengarang kontak atau menggunakan kontak orang lain!
    if (!phone || !isValidWhatsAppNumber(phone)) {
      console.warn(
        `[WhatsApp Warga Undeliverable] Nomor WhatsApp untuk pemohon "${wargaName}" (ID: ${wargaId}) belum diisi pada profil akun atau tidak valid ("${phone}"). Notifikasi WhatsApp TIDAK DAPAT DIKIRIM. Instruksi: Pemohon disarankan memperbarui nomor WhatsApp di profil akun (/profil).`
      );
      return {
        success: false,
        reason: "MISSING_OR_INVALID_PHONE",
        instructions: `Nomor WhatsApp belum terdaftar pada profil pemohon (${wargaName}). Silakan lengkapi nomor telepon di menu Profil Saya (/profil).`,
      };
    }

    // 2. Hormati Preferensi Komunikasi Pengguna (NotificationPreference)
    if (latestUser?.id) {
      try {
        const pref = await prisma.notificationPreference.findUnique({
          where: { userId: latestUser.id },
          select: { notifyOnStatus: true, notifyOnRepair: true },
        });
        if (pref) {
          // Putusan resmi (DISETUJUI, DITOLAK, PERLU_PERBAIKAN) bersifat Wajib Sistem demi kepatuhan hukum
          const isMandatory = newStatus === "PERLU_PERBAIKAN" || newStatus === "DISETUJUI" || newStatus === "DITOLAK" || event === "SEND_OFFICIAL_LETTER";
          if (!isMandatory && event === "STATUS_TRANSITION" && newStatus === "DIVERIFIKASI" && pref.notifyOnStatus === false) {
            console.log(`[WhatsApp Preference] Warga menonaktifkan notifikasi pembaruan status minor. Melewati kirim.`);
            return { success: true, reason: "OPTED_OUT_BY_PREFERENCE" };
          }
        }
      } catch {
        // Fallback jika database preferensi sementara tidak dapat diakses
      }
    }

    const formattedPhone = formatWhatsAppNumber(phone);
    const statusVal = event === "SEND_OFFICIAL_LETTER" ? "SURAT_TERBIT" : newStatus || "DIAJUKAN";
    const waIdempotencyKey = `WA:${event}:${applicationId || "SYS"}:${statusVal}:${formattedPhone}`;

    // 3. Mekanisme Idempotensi: Cegah pengiriman WhatsApp ganda untuk peristiwa yang sama
    try {
      const existingAudit = await prisma.auditLog.findFirst({
        where: {
          entity: "WhatsAppDelivery",
          entityId: waIdempotencyKey,
        },
      });

      if (existingAudit) {
        const meta = existingAudit.metadata as Record<string, unknown> | null;
        if (meta?.status === "SENT" || meta?.status === "DELIVERED") {
          console.log(`[WhatsApp Idempotent] WhatsApp untuk ${waIdempotencyKey} sudah pernah berhasil dikirim. Melewati pengiriman duplikat.`);
          return {
            success: true,
            phone,
            formattedPhone,
            message: "",
            waUrl: "",
            provider: (meta?.provider as any) || "FONNTE",
            deliveryStatus: (meta?.status as any) || "SENT",
            messageId: String(meta?.messageId || "idempotent-cached"),
          };
        }
      }
    } catch {
      // Abaikan kendala pengecekan audit
    }

    // 4. Tentukan pesan spesifik status jika STATUS_TRANSITION
    let customMessage: string | undefined = undefined;
    if (newStatus) {
      const wargaNotif = notificationForStatus(newStatus, serviceName, nomorPengajuan, note || undefined);
      customMessage = wargaNotif.message;
    }

    // 5. Eksekusi pengiriman pesan WhatsApp via service terenkripsi
    const result = await sendWhatsAppNotification({
      recipientPhone: phone,
      recipientName: wargaName,
      applicantName: wargaName,
      nomorPengajuan,
      serviceName,
      status: newStatus,
      message: customMessage,
      note: note || null,
      officialLetterName: officialLetterName || null,
      event,
      targetRole: "WARGA",
    });

    // 6. Simpan Catatan Audit Pengiriman WhatsApp yang Aman (Tanpa membocorkan token atau credential)
    try {
      await prisma.auditLog.create({
        data: {
          actorId: latestUser?.id || null,
          action: "STATUS_CHANGE",
          entity: "WhatsAppDelivery",
          entityId: waIdempotencyKey,
          metadata: {
            channel: "WHATSAPP",
            idempotencyKey: waIdempotencyKey,
            applicationId: applicationId || null,
            recipientPhone: maskPhone(formattedPhone),
            recipientName: wargaName,
            targetRole: "WARGA",
            event,
            status: result?.deliveryStatus || (result?.success ? "SENT" : "FAILED"),
            provider: result?.provider || "NONE",
            messageId: result?.messageId || null,
            error: result?.error || null,
            sentAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr) {
      console.error("[WhatsApp AuditLog Error]", auditErr);
    }

    return result;
  } catch (err: unknown) {
    console.error("[dispatchWhatsAppNotificationForWarga Error]", err);
  }
}

/**
 * Mengirimkan Notifikasi Email dan WhatsApp otomatis ke seluruh role penerima yang berhak
 * (Warga, Staf, Supervisor, Kepala Desa) HANYA berdasarkan kontak profil akun di database.
 * Kontak diambil secara dinamis saat proses pengiriman untuk menjamin akurasi profil terbaru.
 */
export async function dispatchEmailNotificationsForEvent(params: ApplicationNotificationParams) {
  const { event, applicationId, nomorPengajuan, serviceName, applicant, newStatus, note, officialLetterKey, officialLetterName } = params;
  const emailTargets: EmailTarget[] = [];

  // ==========================================
  // 1. Ambil Data Profil Kontak TERBARU Pemohon dari Database
  // ==========================================
  let latestUser: { id: string; name: string; email: string; phone: string | null } | null = null;
  if (applicant.id) {
    try {
      latestUser = await prisma.user.findUnique({
        where: { id: applicant.id },
        select: { id: true, name: true, email: true, phone: true },
      });
    } catch {
      // ignore
    }
  }
  if (!latestUser && applicationId) {
    try {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
      latestUser = app?.user || null;
    } catch {
      // ignore
    }
  }

  const wargaName = latestUser?.name || applicant.name || "Warga Pemohon";
  const wargaId = latestUser?.id || applicant.id || "unknown";
  const wargaEmail = latestUser?.email?.trim() || applicant.email?.trim() || null;

  // A. Kanal WhatsApp Warga Pemohon
  await dispatchWhatsAppNotificationForWarga(params);

  // B. Kanal Email Warga Pemohon
  let wargaTitle = "Pembaruan Status Pengajuan Pelayanan";
  let wargaMessage = `Terdapat pembaruan pada permohonan ${serviceName} (${nomorPengajuan}).`;

  if (event === "SUBMIT_NEW") {
    wargaTitle = "Konfirmasi Penerimaan Pengajuan";
    wargaMessage = `Permohonan ${serviceName} (${nomorPengajuan}) telah berhasil diterima dalam sistem. Dokumen Anda kini dalam antrean pemeriksaan berkas awal oleh Staf Pelayanan Desa.`;
  } else if (event === "RESUBMIT_REPAIR") {
    wargaTitle = "Konfirmasi Pengiriman Ulang Dokumen";
    wargaMessage = `Dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}) telah berhasil Anda kirimkan kembali. Menunggu verifikasi ulang oleh petugas.`;
  } else if (event === "SEND_OFFICIAL_LETTER" || newStatus === "SELESAI") {
    wargaTitle = "Surat Resmi Telah Diterbitkan & Selesai";
    wargaMessage = `Pelayanan permohonan ${serviceName} (${nomorPengajuan}) telah selesai diproses. Surat resmi digital telah disahkan secara sah oleh Kepala Desa dan siap Anda unduh.`;
  } else if (event === "STATUS_TRANSITION" && newStatus) {
    if (newStatus === "DIVERIFIKASI") {
      wargaTitle = "Pembaruan Status: Sedang Diverifikasi";
      wargaMessage = `Staf Pelayanan Desa sedang memeriksa kelengkapan berkas dan dokumen persyaratan untuk permohonan ${serviceName} (${nomorPengajuan}).`;
    } else if (newStatus === "MENUNGGU_APPROVAL") {
      wargaTitle = "Pembaruan Status: Menunggu Persetujuan Kepala Desa";
      wargaMessage = `Berkas permohonan ${serviceName} (${nomorPengajuan}) telah diverifikasi oleh Staf Desa dan saat ini diteruskan kepada Kepala Desa untuk keputusan akhir dan tanda tangan resmi.`;
    } else if (newStatus === "PERLU_PERBAIKAN") {
      wargaTitle = "Instruksi Perbaikan Dokumen";
      wargaMessage = `Petugas menyatakan dokumen permohonan ${serviceName} (${nomorPengajuan}) memerlukan perbaikan.${
        note ? ` Catatan perbaikan: "${note}".` : " Silakan buka pengajuan Anda untuk mengunggah perbaikan dokumen."
      }`;
    } else if (newStatus === "DISETUJUI") {
      wargaTitle = "Notifikasi Persetujuan: Pengajuan Disetujui";
      wargaMessage = `Kabar baik! Kepala Desa telah menyetujui permohonan ${serviceName} (${nomorPengajuan}). Dokumen surat keputusan resmi sedang disiapkan untuk diterbitkan.`;
    } else if (newStatus === "DITOLAK") {
      wargaTitle = "Pemberitahuan Hasil: Permohonan Tidak Disetujui";
      wargaMessage = `Mohon maaf, permohonan ${serviceName} (${nomorPengajuan}) tidak disetujui oleh Pemerintah Desa.${
        note ? ` Alasan penolakan resmi: "${note}".` : " Silakan datang ke kantor Balai Desa untuk konsultasi persyaratan."
      }`;
    } else {
      const notif = notificationForStatus(newStatus, serviceName, nomorPengajuan, note || undefined);
      wargaTitle = notif.title;
      wargaMessage = notif.message;
    }
  }

  if (wargaEmail && isValidEmail(wargaEmail)) {
    emailTargets.push({
      email: wargaEmail,
      name: wargaName,
      title: wargaTitle,
      message: wargaMessage,
      targetRole: "WARGA",
    });
  } else {
    console.warn(
      `[Email Warga Undeliverable] Alamat email untuk pemohon "${wargaName}" (ID: ${wargaId}) belum diisi di profil akun atau tidak valid ("${wargaEmail}"). Notifikasi Email TIDAK DAPAT DIKIRIM. Instruksi: Pemohon disarankan melengkapi email profil di menu /profil.`
    );
  }

  // ==========================================
  // 2. Notifikasi untuk Staf Desa
  // Diambil secara dinamis dari kontak profil akun staf aktif
  // ==========================================
  let notifyStaff = false;
  let staffTitle = "";
  let staffMessage = "";

  if (event === "SUBMIT_NEW") {
    notifyStaff = true;
    staffTitle = `Pengajuan ${serviceName} Baru Masuk (${nomorPengajuan})`;
    staffMessage = `Terdapat pengajuan ${serviceName} baru dari pemohon ${wargaName} (${nomorPengajuan}) yang masuk ke antrean verifikasi staf desa.`;
  } else if (event === "RESUBMIT_REPAIR") {
    notifyStaff = true;
    staffTitle = `Verifikasi Ulang: Dokumen Perbaikan Masuk (${nomorPengajuan})`;
    staffMessage = `Pemohon ${wargaName} telah mengirimkan ulang dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}). Silakan lakukan verifikasi ulang di antrean.`;
  } else if (event === "STATUS_TRANSITION") {
    if (newStatus === "PERLU_PERBAIKAN") {
      notifyStaff = true;
      staffTitle = `Permintaan Perbaikan Berkas Terkirim: ${nomorPengajuan}`;
      staffMessage = `Permintaan perbaikan berkas untuk ${serviceName} (${nomorPengajuan}) telah diteruskan kepada warga ${wargaName}. Menunggu pengiriman ulang berkas.`;
    } else if (newStatus === "DISETUJUI") {
      notifyStaff = true;
      staffTitle = `Pembaruan: Pengajuan Telah Disetujui Kades (${nomorPengajuan})`;
      staffMessage = `Permohonan ${serviceName} (${nomorPengajuan}) untuk pemohon ${wargaName} telah disetujui Kepala Desa. Silakan lanjutkan ke penuntasan pelayanan / penerbitan surat resmi.`;
    } else if (newStatus === "DITOLAK") {
      notifyStaff = true;
      staffTitle = `Pembaruan: Pengajuan Ditolak oleh Kades (${nomorPengajuan})`;
      staffMessage = `Permohonan ${serviceName} (${nomorPengajuan}) untuk ${wargaName} telah diputuskan ditolak oleh Kepala Desa.${note ? ` Alasan: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      notifyStaff = true;
      staffTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
      staffMessage = `Pelayanan ${serviceName} (${nomorPengajuan}) untuk ${wargaName} telah selesai diproses dan surat resmi telah diterbitkan.`;
    }
  } else if (event === "SEND_OFFICIAL_LETTER") {
    notifyStaff = true;
    staffTitle = `Pembaruan: Surat Resmi Telah Terbit & Dikirim (${nomorPengajuan})`;
    staffMessage = `Kepala Desa telah menerbitkan dan mengunggah dokumen surat resmi (PDF) ${serviceName} untuk pemohon ${wargaName}. Pelayanan dinyatakan selesai.`;
  }

  if (notifyStaff) {
    try {
      const staffUsers = await prisma.user.findMany({
        where: { role: "STAF", isActive: true },
        select: { id: true, name: true, email: true, phone: true },
      });
      for (const s of staffUsers) {
        const staffName = s.name || "Staf Pelayanan";

        // Kontak Email Profil Staf
        if (s.email && isValidEmail(s.email)) {
          emailTargets.push({
            email: s.email.trim(),
            name: staffName,
            title: staffTitle,
            message: staffMessage,
            targetRole: "STAF",
          });
        } else {
          console.warn(
            `[Email Staf Undeliverable] Staf "${staffName}" (ID: ${s.id}) belum memiliki alamat email yang valid pada profilnya ("${s.email}"). Kanal Email TIDAK DAPAT DIKIRIM. Instruksi: Staf bersangkutan disarankan melengkapi email profil.`
          );
        }

        // Kontak WhatsApp Profil Staf
        if (s.phone && isValidWhatsAppNumber(s.phone)) {
          const stafPhone = formatWhatsAppNumber(s.phone);
          const stafWaKey = `WA:${event}:${applicationId || "SYS"}:${newStatus || "INIT"}:${stafPhone}`;
          prisma.auditLog.findFirst({
            where: { entity: "WhatsAppDelivery", entityId: stafWaKey },
          }).then(async (existingStafWa) => {
            const meta = existingStafWa?.metadata as Record<string, unknown> | null;
            if (meta?.status === "SENT" || meta?.status === "DELIVERED") {
              return;
            }
            const res = await sendWhatsAppNotification({
              recipientPhone: stafPhone,
              recipientName: staffName,
              applicantName: wargaName,
              nomorPengajuan,
              serviceName,
              status: newStatus,
              message: staffMessage,
              note: note || null,
              officialLetterName: officialLetterName || null,
              event,
              targetRole: "STAF",
            });
            await prisma.auditLog.create({
              data: {
                actorId: s.id,
                action: "STATUS_CHANGE",
                entity: "WhatsAppDelivery",
                entityId: stafWaKey,
                metadata: {
                  channel: "WHATSAPP",
                  idempotencyKey: stafWaKey,
                  applicationId: applicationId || null,
                  recipientPhone: maskPhone(stafPhone),
                  recipientName: staffName,
                  targetRole: "STAF",
                  event,
                  status: res?.deliveryStatus || (res?.success ? "SENT" : "FAILED"),
                  provider: res?.provider || "NONE",
                  messageId: res?.messageId || null,
                  error: res?.error || null,
                  sentAt: new Date().toISOString(),
                },
              },
            });
          }).catch((waErr) => console.error("[WhatsApp Staf Dispatch Error]", waErr));
        } else {
          console.warn(
            `[WhatsApp Staf Undeliverable] Staf "${staffName}" (ID: ${s.id}) belum memiliki nomor WhatsApp pada profil akunnya ("${maskPhone(s.phone || "")}"). Kanal WhatsApp dicatat TIDAK DAPAT DIKIRIM. Instruksi: Staf bersangkutan disarankan melengkapi nomor WhatsApp di /profil.`
          );
        }
      }
    } catch (err) {
      console.error("[dispatchStaffNotifications Error]", err);
    }
  }

  // ==========================================
  // 3. Notifikasi untuk Supervisor Desa
  // Diambil secara dinamis dari kontak profil akun supervisor aktif
  // ==========================================
  let notifySupervisor = false;
  let supTitle = "";
  let supMessage = "";

  if (event === "RESUBMIT_REPAIR") {
    notifySupervisor = true;
    supTitle = `Pembaruan Berkas Perbaikan: ${nomorPengajuan}`;
    supMessage = `Pemohon ${wargaName} telah memperbarui dokumen perbaikan untuk ${serviceName} (${nomorPengajuan}). Berkas kembali ke alur verifikasi staf sebelum ditelaah ulang.`;
  } else if (event === "STATUS_TRANSITION") {
    if (newStatus === "REVIEW_SUPERVISOR") {
      notifySupervisor = true;
      supTitle = `Pengajuan Siap Direview (Kendali Mutu): ${nomorPengajuan}`;
      supMessage = `Staf Desa telah menyelesaikan verifikasi berkas dan penyiapan draf untuk ${serviceName} (${nomorPengajuan}) atas nama ${wargaName}. Pengajuan kini siap untuk Anda review.`;
    } else if (newStatus === "MENUNGGU_APPROVAL") {
      notifySupervisor = true;
      supTitle = `Pembaruan Pemantauan: Pengajuan Menuju Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah selesai diproses staf desa dan kini berada di antrean persetujuan Kepala Desa.`;
    } else if (newStatus === "DISETUJUI") {
      notifySupervisor = true;
      supTitle = `Pembaruan: Pengajuan Disetujui Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah resmi disetujui oleh Kepala Desa.`;
    } else if (newStatus === "DITOLAK") {
      notifySupervisor = true;
      supTitle = `Pembaruan: Pengajuan Ditolak oleh Kades (${nomorPengajuan})`;
      supMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah diputuskan ditolak oleh Kepala Desa.${note ? ` Alasan: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      notifySupervisor = true;
      supTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
      supMessage = `Pengajuan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah selesai diproses dan surat resmi telah diterbitkan.`;
    }
  } else if (event === "SEND_OFFICIAL_LETTER") {
    notifySupervisor = true;
    supTitle = `Pembaruan: Pelayanan Selesai Diproses (${nomorPengajuan})`;
    supMessage = `Pengajuan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah selesai diproses dan surat resmi telah diterbitkan.`;
  }

  if (notifySupervisor) {
    try {
      const supervisorUsers = await prisma.user.findMany({
        where: { role: "SUPERVISOR", isActive: true },
        select: { id: true, name: true, email: true, phone: true },
      });
      for (const sup of supervisorUsers) {
        const supName = sup.name || "Supervisor Desa";

        // Kontak Email Profil Supervisor
        if (sup.email && isValidEmail(sup.email)) {
          emailTargets.push({
            email: sup.email.trim(),
            name: supName,
            title: supTitle,
            message: supMessage,
            targetRole: "SUPERVISOR",
          });
        } else {
          console.warn(
            `[Email Supervisor Undeliverable] Supervisor "${supName}" (ID: ${sup.id}) belum memiliki alamat email yang valid pada profilnya ("${sup.email}"). Kanal Email TIDAK DAPAT DIKIRIM. Instruksi: Supervisor disarankan melengkapi email profil.`
          );
        }

        // Kontak WhatsApp Profil Supervisor
        if (sup.phone && isValidWhatsAppNumber(sup.phone)) {
          sendWhatsAppNotification({
            recipientPhone: sup.phone.trim(),
            recipientName: supName,
            applicantName: wargaName,
            nomorPengajuan,
            serviceName,
            status: newStatus,
            message: supMessage,
            note: note || null,
            officialLetterName: officialLetterName || null,
            event,
            targetRole: "SUPERVISOR",
          }).catch((waErr) => console.error("[WhatsApp Supervisor Dispatch Error]", waErr));
        } else {
          console.warn(
            `[WhatsApp Supervisor Undeliverable] Supervisor "${supName}" (ID: ${sup.id}) belum memiliki nomor WhatsApp pada profil akunnya ("${sup.phone}"). Kanal WhatsApp dicatat TIDAK DAPAT DIKIRIM. Instruksi: Supervisor disarankan melengkapi nomor WhatsApp di /profil.`
          );
        }
      }
    } catch (err) {
      console.error("[dispatchSupervisorNotifications Error]", err);
    }
  }

  // ==========================================
  // 4. Notifikasi untuk Kepala Desa
  // Diambil secara dinamis dari kontak profil akun Kepala Desa aktif
  // ==========================================
  let notifyKades = false;
  let kadesTitle = "";
  let kadesMessage = "";

  if (event === "STATUS_TRANSITION") {
    if (newStatus === "MENUNGGU_APPROVAL") {
      notifyKades = true;
      kadesTitle = `Pengajuan Siap Keputusan Akhir & Pengesahan Kades: ${nomorPengajuan}`;
      kadesMessage = `Permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName} telah diverifikasi dan diproses oleh staf desa. Berkas siap mendapat keputusan akhir dan pengesahan resmi Anda.`;
    } else if (newStatus === "DISETUJUI") {
      notifyKades = true;
      kadesTitle = `Konfirmasi Persetujuan: ${nomorPengajuan}`;
      kadesMessage = `Anda telah memberikan persetujuan resmi untuk permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName}.`;
    } else if (newStatus === "DITOLAK") {
      notifyKades = true;
      kadesTitle = `Konfirmasi Penolakan: ${nomorPengajuan}`;
      kadesMessage = `Anda telah memutuskan untuk menolak permohonan ${serviceName} (${nomorPengajuan}) atas nama ${wargaName}.${note ? ` Alasan resmi: "${note}".` : ""}`;
    } else if (newStatus === "SELESAI") {
      notifyKades = true;
      kadesTitle = `Pembaruan: Pengiriman Surat Resmi Selesai (${nomorPengajuan})`;
      kadesMessage = `Dokumen surat resmi ${serviceName} (${nomorPengajuan}) untuk ${wargaName} telah berhasil dikirimkan kepada warga. Pelayanan selesai.`;
    }
  } else if (event === "SEND_OFFICIAL_LETTER") {
    notifyKades = true;
    kadesTitle = `Pembaruan: Pengiriman Surat Resmi Berhasil (${nomorPengajuan})`;
    kadesMessage = `Dokumen surat resmi ${serviceName} (${nomorPengajuan}) untuk ${wargaName} telah berhasil dikirimkan kepada warga. Pelayanan selesai.`;
  }

  if (notifyKades) {
    try {
      const kadesUsers = await prisma.user.findMany({
        where: { role: "KEPALA_DESA", isActive: true },
        select: { id: true, name: true, email: true, phone: true },
      });
      for (const kd of kadesUsers) {
        const kadesName = kd.name || "Kepala Desa";

        // Kontak Email Profil Kepala Desa
        if (kd.email && isValidEmail(kd.email)) {
          emailTargets.push({
            email: kd.email.trim(),
            name: kadesName,
            title: kadesTitle,
            message: kadesMessage,
            targetRole: "KEPALA_DESA",
          });
        } else {
          console.warn(
            `[Email Kades Undeliverable] Kepala Desa "${kadesName}" (ID: ${kd.id}) belum memiliki alamat email yang valid pada profilnya ("${kd.email}"). Kanal Email TIDAK DAPAT DIKIRIM. Instruksi: Kepala Desa disarankan melengkapi email profil.`
          );
        }

        // Kontak WhatsApp Profil Kepala Desa
        if (kd.phone && isValidWhatsAppNumber(kd.phone)) {
          const kadesPhone = formatWhatsAppNumber(kd.phone);
          const kadesWaKey = `WA:${event}:${applicationId || "SYS"}:${newStatus || "INIT"}:${kadesPhone}`;
          prisma.auditLog.findFirst({
            where: { entity: "WhatsAppDelivery", entityId: kadesWaKey },
          }).then(async (existingKadesWa) => {
            const meta = existingKadesWa?.metadata as Record<string, unknown> | null;
            if (meta?.status === "SENT" || meta?.status === "DELIVERED") {
              return;
            }
            const res = await sendWhatsAppNotification({
              recipientPhone: kadesPhone,
              recipientName: kadesName,
              applicantName: wargaName,
              nomorPengajuan,
              serviceName,
              status: newStatus,
              message: kadesMessage,
              note: note || null,
              officialLetterName: officialLetterName || null,
              event,
              targetRole: "KEPALA_DESA",
            });
            await prisma.auditLog.create({
              data: {
                actorId: kd.id,
                action: "STATUS_CHANGE",
                entity: "WhatsAppDelivery",
                entityId: kadesWaKey,
                metadata: {
                  channel: "WHATSAPP",
                  idempotencyKey: kadesWaKey,
                  applicationId: applicationId || null,
                  recipientPhone: maskPhone(kadesPhone),
                  recipientName: kadesName,
                  targetRole: "KEPALA_DESA",
                  event,
                  status: res?.deliveryStatus || (res?.success ? "SENT" : "FAILED"),
                  provider: res?.provider || "NONE",
                  messageId: res?.messageId || null,
                  error: res?.error || null,
                  sentAt: new Date().toISOString(),
                },
              },
            });
          }).catch((waErr) => console.error("[WhatsApp Kades Dispatch Error]", waErr));
        } else {
          console.warn(
            `[WhatsApp Kades Undeliverable] Kepala Desa "${kadesName}" (ID: ${kd.id}) belum memiliki nomor WhatsApp pada profil akunnya ("${maskPhone(kd.phone || "")}"). Kanal WhatsApp dicatat TIDAK DAPAT DIKIRIM. Instruksi: Kepala Desa disarankan melengkapi nomor WhatsApp di /profil.`
          );
        }
      }
    } catch (err) {
      console.error("[dispatchKadesNotifications Error]", err);
    }
  }

  // ==========================================
  // 5. Eksekusi Pengiriman Email ke Seluruh Target Role
  // Dengan mekanisme IDEMPOTENSI & AUDIT LOG
  // ==========================================
  // Cek apakah applicationId benar-benar ada di database untuk mencegah kegagalan foreign key
  let validAppId: string | null = null;
  if (applicationId) {
    try {
      const appExists = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { id: true },
      });
      if (appExists) {
        validAppId = applicationId;
      }
    } catch {
      validAppId = null;
    }
  }

  for (const t of emailTargets) {
    const statusVal = event === "SEND_OFFICIAL_LETTER" ? "SURAT_TERBIT" : newStatus || "DIAJUKAN";
    const idempotencyKey = `${event}:${applicationId || "SYS"}:${statusVal}:${t.email.toLowerCase().trim()}`;

    try {
      // 1. Cek keberadaan record idempotensi pengiriman
      let delivery = await prisma.emailDelivery.findUnique({
        where: { idempotencyKey },
      });

      if (delivery) {
        // Jika sudah terkirim, hindari pengiriman berulang (idempotensi mutlak)
        if (delivery.status === "SENT") {
          console.log(`[Email Idempotent] Email untuk ${idempotencyKey} sudah pernah berhasil dikirim. Melewati pengiriman duplikat.`);
          continue;
        }
        // Jika kegagalan permanen atau sudah melebihi batas retry, jangan kirim ulang terus-menerus
        if (delivery.status === "PERMANENT_FAILURE" || delivery.attempts >= delivery.maxAttempts) {
          console.warn(`[Email Idempotent] Email untuk ${idempotencyKey} berstatus ${delivery.status} (Percobaan: ${delivery.attempts}/${delivery.maxAttempts}). Tidak diulang.`);
          continue;
        }
      } else {
        // Buat record delivery baru berstatus PENDING
        delivery = await prisma.emailDelivery.create({
          data: {
            idempotencyKey,
            applicationId: validAppId,
            recipientEmail: t.email.trim(),
            recipientName: t.name,
            targetRole: t.targetRole,
            subject: t.title,
            status: "PENDING",
            attempts: 0,
            maxAttempts: 3,
          },
        });
      }

      // 2. Validasi format email penerima
      if (!isValidEmail(t.email)) {
        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "PERMANENT_FAILURE",
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
            failedAt: new Date(),
            errorMessage: "Format alamat email tidak valid (RFC 5322). Silakan perbarui profil akun di menu /profil.",
          },
        });
        continue;
      }

      // 3. Catat percobaan pengiriman
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      // 4. Lakukan pengiriman email via service
      const result = await sendApplicationStatusEmail({
        recipientEmail: t.email,
        recipientName: t.name,
        applicationId,
        nomorPengajuan,
        serviceName,
        status: statusVal,
        title: t.title,
        message: t.message,
        note: note || null,
        officialLetterKey,
        officialLetterName,
        targetRole: t.targetRole,
      });

      const inAppEventId = `${applicationId}:${event}:${newStatus || "INIT"}`;

      if (result.success) {
        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        // Sinkronisasi status email ke model Notifikasi terkait
        if (applicationId) {
          await prisma.notification.updateMany({
            where: { applicationId, eventId: inAppEventId },
            data: {
              emailStatus: "SENT",
              emailSentAt: new Date(),
            },
          });
        }
      } else {
        // Cek apakah error merupakan masalah konfigurasi server yang belum tersedia
        const isConfigMissing = result.error?.includes("belum dikonfigurasi");
        const nextStatus = isConfigMissing ? "PERMANENT_FAILURE" : (delivery.attempts + 1 >= delivery.maxAttempts ? "FAILED" : "FAILED");
        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: {
            status: nextStatus,
            failedAt: new Date(),
            errorMessage: result.error || "Gagal mengirimkan email.",
          },
        });

        // Sinkronisasi kegagalan email ke model Notifikasi terkait
        if (applicationId) {
          await prisma.notification.updateMany({
            where: { applicationId, eventId: inAppEventId },
            data: {
              emailStatus: nextStatus,
              emailFailedAt: new Date(),
            },
          });
        }
      }
    } catch (deliveryErr: unknown) {
      const errMsg = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr);
      console.error(`[Email Delivery Tracking Error] ${idempotencyKey}:`, errMsg);
    }
  }
}

export interface SupervisorErrorNotificationParams {
  errorTitle: string;
  errorMessage: string;
  sourceFeature?: string;
  applicationId?: string;
  nomorPengajuan?: string;
  errorDetails?: string;
}

/**
 * Mengirimkan Notifikasi Peringatan Gangguan / Error Fitur ke Kontak Profil Supervisor Desa
 * sesuai jenis pemberitahuan dan kewenangannya.
 */
export async function dispatchSupervisorErrorNotification(params: SupervisorErrorNotificationParams) {
  const { errorTitle, errorMessage, sourceFeature, applicationId, nomorPengajuan, errorDetails } = params;
  try {
    const supervisorUsers = await prisma.user.findMany({
      where: { role: "SUPERVISOR", isActive: true },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (supervisorUsers.length === 0) {
      console.warn("[Supervisor Error Alert] Tidak ada akun Supervisor aktif yang terdaftar di database.");
      return;
    }

    for (const sup of supervisorUsers) {
      const supName = sup.name || "Supervisor Desa";

      // 1. WhatsApp Alert ke nomor profil Supervisor
      if (sup.phone && isValidWhatsAppNumber(sup.phone)) {
        await sendWhatsAppNotification({
          recipientPhone: sup.phone.trim(),
          recipientName: supName,
          nomorPengajuan: nomorPengajuan || "SYS-ALERT",
          serviceName: sourceFeature || "Sistem Pelayanan Desa",
          title: `⚠️ Peringatan Error: ${errorTitle}`,
          message: `${errorMessage}${errorDetails ? `\nDetail: ${errorDetails}` : ""}`,
          event: "ERROR_ALERT",
          targetRole: "SUPERVISOR",
        }).catch((err) => console.error("[Supervisor WhatsApp Alert Error]", err));
      } else {
        console.warn(
          `[Supervisor WhatsApp Alert Undeliverable] Supervisor "${supName}" (ID: ${sup.id}) belum memiliki nomor WhatsApp pada profil akunnya. Kanal WhatsApp dicatat TIDAK DAPAT DIKIRIM. Instruksi: Lengkapi nomor telepon di menu /profil.`
        );
      }

      // 2. Email Alert ke email profil Supervisor
      if (sup.email && isValidEmail(sup.email)) {
        await sendApplicationStatusEmail({
          recipientEmail: sup.email.trim(),
          recipientName: supName,
          applicationId: applicationId || "system",
          nomorPengajuan: nomorPengajuan || "SYS-ALERT",
          serviceName: sourceFeature || "Sistem Pelayanan Desa",
          status: "DIPROSES",
          title: `⚠️ [Peringatan Sistem] Gangguan Fitur: ${errorTitle}`,
          message: `Terdeteksi kendala operasional pada ${sourceFeature || "sistem pelayanan"}: ${errorMessage}. Silakan periksa dashboard kendali mutu untuk tindak lanjut.`,
          note: errorDetails || null,
          targetRole: "SUPERVISOR",
        }).catch((err) => console.error("[Supervisor Email Alert Error]", err));
      } else {
        console.warn(
          `[Supervisor Email Alert Undeliverable] Supervisor "${supName}" (ID: ${sup.id}) belum memiliki email valid pada profil akunnya. Kanal Email dicatat TIDAK DAPAT DIKIRIM. Instruksi: Lengkapi alamat email di menu /profil.`
        );
      }
    }
  } catch (err) {
    console.error("[dispatchSupervisorErrorNotification Error]", err);
  }
}

export const dispatchNotificationsForEvent = dispatchEmailNotificationsForEvent;

