"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { sendApplicationStatusEmail, isValidEmail } from "@/lib/email/service";
import bcrypt from "bcryptjs";

async function requireActiveUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu.");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive) throw new Error("Forbidden: akun tidak aktif.");
  return user.id;
}

async function requireOfficerUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu.");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true, name: true },
  });
  if (!user?.isActive) throw new Error("Forbidden: akun tidak aktif.");
  if (user.role === "WARGA") {
    throw new Error("Forbidden: hanya petugas/administrator desa yang dapat mengakses fitur ini.");
  }
  return user;
}

export async function getMyNotifications() {
  const userId = await requireActiveUserId();
  return prisma.notification.findMany({
    where: { userId },
    include: {
      application: {
        select: {
          id: true,
          nomor_pengajuan: true,
          status: true,
          service: { select: { name: true } },
          documents: {
            select: {
              id: true,
              requirement_name: true,
              file_name: true,
              storage_key: true,
              file_size: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function getRecentNotifications(limit = 6) {
  try {
    const userId = await requireActiveUserId();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          application: {
            select: {
              id: true,
              nomor_pengajuan: true,
              status: true,
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      success: true as const,
      notifications,
      unreadCount,
    };
  } catch (err: unknown) {
    console.error("[getRecentNotifications error]", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Gagal memuat notifikasi terbaru.",
      notifications: [],
      unreadCount: 0,
    };
  }
}

export async function markNotificationRead(id: string) {
  const userId = await requireActiveUserId();
  await prisma.notification.updateMany({
    where: { id, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/warga/notifikasi");
  revalidatePath("/staf/notifikasi");
  revalidatePath("/supervisor/notifikasi");
  revalidatePath("/kades/notifikasi");
}

export async function markAllNotificationsRead() {
  const userId = await requireActiveUserId();
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/warga/notifikasi");
  revalidatePath("/staf/notifikasi");
  revalidatePath("/supervisor/notifikasi");
  revalidatePath("/kades/notifikasi");
}

/**
 * Mengambil log status pengiriman email aktual untuk administrator (Staf, Supervisor, Kades).
 * Memisahkan status notifikasi in-app dari status pengiriman email.
 */
export async function getEmailDeliveryLogs(options?: {
  page?: number;
  pageSize?: number;
  status?: EmailDeliveryStatus;
  applicationId?: string;
}) {
  await requireOfficerUser();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.EmailDeliveryWhereInput = {};
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.applicationId) {
    where.applicationId = options.applicationId;
  }

  const [deliveries, total, sentCount, failedCount, pendingCount, permanentFailCount] =
    await Promise.all([
      prisma.emailDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.emailDelivery.count({ where }),
      prisma.emailDelivery.count({ where: { status: "SENT" } }),
      prisma.emailDelivery.count({ where: { status: "FAILED" } }),
      prisma.emailDelivery.count({ where: { status: "PENDING" } }),
      prisma.emailDelivery.count({ where: { status: "PERMANENT_FAILURE" } }),
    ]);

  return {
    success: true as const,
    deliveries,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      sent: sentCount,
      failed: failedCount,
      pending: pendingCount,
      permanentFailure: permanentFailCount,
    },
  };
}

export interface UnifiedDeliveryLogItem {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  idempotencyKey: string;
  applicationId: string | null;
  recipient: string;
  recipientName: string;
  targetRole: string;
  subjectOrEvent: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "PERMANENT_FAILURE";
  attempts: number;
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * Mengambil log status pengiriman notifikasi multi-kanal (Email & WhatsApp)
 * khusus untuk petugas/administrator desa (Staf, Supervisor, Kepala Desa).
 * Membatasi akses secara ketat dengan RBAC sehingga Warga tidak dapat melihat log orang lain.
 */
export async function getNotificationDeliveryLogs(options?: {
  page?: number;
  pageSize?: number;
  channel?: "EMAIL" | "WHATSAPP" | "ALL";
  status?: string;
  applicationId?: string;
}) {
  await requireOfficerUser();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const channel = options?.channel || "ALL";

  const emailWhere: Prisma.EmailDeliveryWhereInput = {};
  if (options?.status) {
    emailWhere.status = options.status as EmailDeliveryStatus;
  }
  if (options?.applicationId) {
    emailWhere.applicationId = options.applicationId;
  }

  const items: UnifiedDeliveryLogItem[] = [];

  // 1. Ambil Email Deliveries jika channel ALL atau EMAIL
  if (channel === "ALL" || channel === "EMAIL") {
    const emailRows = await prisma.emailDelivery.findMany({
      where: emailWhere,
      orderBy: { createdAt: "desc" },
      take: pageSize * page,
    });
    for (const row of emailRows) {
      items.push({
        id: row.id,
        channel: "EMAIL",
        idempotencyKey: row.idempotencyKey,
        applicationId: row.applicationId,
        recipient: row.recipientEmail,
        recipientName: row.recipientName || "Penerima",
        targetRole: row.targetRole,
        subjectOrEvent: row.subject,
        status: row.status as any,
        attempts: row.attempts,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt,
      });
    }
  }

  // 2. Ambil WhatsApp Deliveries dari AuditLog jika channel ALL atau WHATSAPP
  if (channel === "ALL" || channel === "WHATSAPP") {
    const waAudits = await prisma.auditLog.findMany({
      where: {
        entity: "WhatsAppDelivery",
        ...(options?.applicationId ? { entityId: { contains: options.applicationId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: pageSize * page,
    });

    for (const audit of waAudits) {
      const meta = audit.metadata as Record<string, unknown> | null;
      const statusVal = ((meta?.status as string) || "SENT").toUpperCase();
      if (options?.status && statusVal !== options.status) continue;

      items.push({
        id: audit.id,
        channel: "WHATSAPP",
        idempotencyKey: audit.entityId || "N/A",
        applicationId: (meta?.applicationId as string) || null,
        recipient: (meta?.recipientPhone as string) || "***",
        recipientName: (meta?.recipientName as string) || "Penerima",
        targetRole: (meta?.targetRole as string) || "WARGA",
        subjectOrEvent: `WhatsApp: ${(meta?.event as string) || "Notifikasi Layanan"}`,
        status: statusVal as any,
        attempts: 1,
        errorMessage: (meta?.error as string) || null,
        createdAt: audit.createdAt,
      });
    }
  }

  // Urutkan gabungan berdasarkan createdAt terbaru
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = items.length;
  const skip = (page - 1) * pageSize;
  const paginated = items.slice(skip, skip + pageSize);

  const summary = {
    sent: items.filter((i) => i.status === "SENT").length,
    delivered: items.filter((i) => i.status === "DELIVERED").length,
    pending: items.filter((i) => i.status === "PENDING").length,
    failed: items.filter((i) => i.status === "FAILED").length,
    permanentFailure: items.filter((i) => i.status === "PERMANENT_FAILURE").length,
  };

  return {
    success: true as const,
    deliveries: paginated,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary,
  };
}

/**
 * Mencoba kembali pengiriman email yang gagal dengan batasan maksimal percobaan (maxAttempts).
 */
export async function retryFailedEmailDelivery(deliveryId: string) {
  const officer = await requireOfficerUser();
  const delivery = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      application: {
        select: {
          id: true,
          nomor_pengajuan: true,
          status: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!delivery) {
    return { success: false, error: "Record pengiriman email tidak ditemukan." };
  }

  if (delivery.status === "SENT") {
    return { success: false, error: "Email ini sudah pernah berhasil dikirim." };
  }

  if (!isValidEmail(delivery.recipientEmail)) {
    return { success: false, error: "Format alamat email tidak valid. Pengiriman tidak dapat dicoba." };
  }

  if (delivery.attempts >= delivery.maxAttempts && delivery.status === "PERMANENT_FAILURE") {
    return { success: false, error: "Batas percobaan maksimal (3x) telah tercapai." };
  }

  // Tambahkan jumlah percobaan
  await prisma.emailDelivery.update({
    where: { id: deliveryId },
    data: {
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  const sendResult = await sendApplicationStatusEmail({
    recipientEmail: delivery.recipientEmail,
    recipientName: delivery.recipientName || "Penerima",
    applicationId: delivery.applicationId || "",
    nomorPengajuan: delivery.application?.nomor_pengajuan || "N/A",
    serviceName: delivery.application?.service?.name || "Pelayanan Desa",
    status: delivery.application?.status || "DIAJUKAN",
    title: delivery.subject,
    message: "Percobaan ulang pengiriman notifikasi resmi Pelayanan Desa.",
    targetRole: delivery.targetRole,
  });

  if (sendResult.success) {
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        errorMessage: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: officer.id,
        action: "STATUS_CHANGE",
        entity: "EmailDelivery",
        entityId: deliveryId,
        metadata: {
          subAction: "RETRY_EMAIL_SUCCESS",
          recipientEmail: delivery.recipientEmail,
          attempts: delivery.attempts + 1,
        },
      },
    });

    return { success: true, messageId: sendResult.messageId };
  } else {
    const isConfigMissing = sendResult.error?.includes("belum dikonfigurasi");
    const newStatus = isConfigMissing ? "PERMANENT_FAILURE" : "FAILED";
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        failedAt: new Date(),
        errorMessage: sendResult.error || "Gagal pengiriman ulang.",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: officer.id,
        action: "STATUS_CHANGE",
        entity: "EmailDelivery",
        entityId: deliveryId,
        metadata: {
          subAction: "RETRY_EMAIL_FAILED",
          recipientEmail: delivery.recipientEmail,
          attempts: delivery.attempts + 1,
          error: sendResult.error,
        },
      },
    });

    return { success: false, error: sendResult.error };
  }
}

/**
 * Aturan Retensi Data Notifikasi & Email Resmi Desa
 */
export async function getNotificationRetentionPolicy() {
  return {
    success: true as const,
    policy: {
      code: "DESA_RETENTION_5_YEARS",
      title: "Aturan Retensi Data Notifikasi & Email Resmi Desa",
      rules: [
        "Notifikasi in-app disimpan secara persisten selama akun pengguna dan berkas permohonan aktif.",
        "Riwayat pengiriman email (delivery log) dan audit trail disimpan minimal 5 (lima) tahun sesuai standar retensi arsip pelayanan publik desa.",
        "Penghapusan otomatis (auto-purge) tidak diaktifkan untuk mencegah hilangnya bukti korespondensi resmi.",
        "Pemberitahuan yang sudah dibaca (isRead: true) tetap dapat diakses di riwayat arsip notifikasi warga dan petugas.",
      ],
    },
  };
}

/**
 * Mengambil preferensi notifikasi untuk pengguna yang sedang login.
 * Jika belum ada record preferensi, default konfigurasi aktif dibuat otomatis.
 */
export async function getNotificationPreferences() {
  const userId = await requireActiveUserId();
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    return {
      success: true as const,
      preferences: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        notifyOnStatus: true,
        notifyOnRepair: true,
      },
    };
  }

  return {
    success: true as const,
    preferences: pref,
  };
}

/**
 * Memperbarui preferensi notifikasi milik pengguna yang sedang login.
 */
export async function updateNotificationPreferences(data: {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  notifyOnStatus?: boolean;
  notifyOnRepair?: boolean;
}) {
  const userId = await requireActiveUserId();

  const updated = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      emailEnabled: data.emailEnabled ?? true,
      inAppEnabled: data.inAppEnabled ?? true,
      notifyOnStatus: data.notifyOnStatus ?? true,
      notifyOnRepair: data.notifyOnRepair ?? true,
    },
    update: {
      ...(typeof data.emailEnabled === "boolean" ? { emailEnabled: data.emailEnabled } : {}),
      ...(typeof data.inAppEnabled === "boolean" ? { inAppEnabled: data.inAppEnabled } : {}),
      ...(typeof data.notifyOnStatus === "boolean" ? { notifyOnStatus: data.notifyOnStatus } : {}),
      ...(typeof data.notifyOnRepair === "boolean" ? { notifyOnRepair: data.notifyOnRepair } : {}),
    },
  });

  return {
    success: true as const,
    preferences: updated,
  };
}

/**
 * Mengambil profil akun dan status verifikasi email pengguna yang sedang login
 * beserta preferensi notifikasinya.
 */
export async function getUserNotificationProfile() {
  const userId = await requireActiveUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      notificationPreference: true,
    },
  });

  if (!user) {
    throw new Error("Pengguna tidak ditemukan.");
  }

  const preferences = user.notificationPreference || {
    id: "default",
    userId: user.id,
    emailEnabled: true,
    inAppEnabled: true,
    notifyOnStatus: true,
    notifyOnRepair: true,
  };

  return {
    success: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
    },
    preferences,
    mandatoryPolicy: {
      enforced: true,
      description:
        "Notifikasi keputusan resmi Kepala Desa (Persetujuan/Penolakan) dan instruksi perbaikan dokumen berstatus WAJIB SISTEM demi kepatuhan hukum dan transparansi pelayanan publik desa.",
    },
  };
}

/**
 * Memperbarui alamat email pengguna dengan validasi keamanan ketat:
 * 1. Format RFC 5322
 * 2. Cek keunikan email di database
 * 3. Verifikasi kata sandi lama (jika akun memiliki password)
 * 4. Pencatatan audit trail
 */
export async function updateUserEmail(data: {
  newEmail: string;
  currentPassword?: string;
}) {
  const userId = await requireActiveUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true, name: true },
  });

  if (!user) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  const cleanEmail = data.newEmail?.trim().toLowerCase();
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return { success: false, error: "Format alamat email baru tidak valid (contoh: nama@domain.com)." };
  }

  if (cleanEmail === user.email.toLowerCase()) {
    return { success: false, error: "Alamat email baru sama dengan alamat email saat ini." };
  }

  // Cek apakah email sudah terdaftar pada pengguna lain
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== user.id) {
    return { success: false, error: "Alamat email tersebut sudah terdaftar pada akun warga/petugas lain." };
  }

  // Verifikasi kata sandi saat ini jika akun menggunakan password
  if (user.password) {
    if (!data.currentPassword) {
      return { success: false, error: "Konfirmasi kata sandi saat ini diperlukan untuk mengubah alamat email." };
    }
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Kata sandi saat ini tidak cocok. Perubahan email dibatalkan." };
    }
  }

  // Update email di database dan reset emailVerified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      email: cleanEmail,
      emailVerified: null, // Reset status verifikasi karena email berganti
    },
    select: { id: true, email: true, emailVerified: true },
  });

  // Catat ke Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "UPDATE_USER",
      entity: "UserEmail",
      entityId: user.id,
      metadata: {
        oldEmail: user.email,
        newEmail: cleanEmail,
      },
    },
  });

  revalidatePath("/warga/notifikasi/pengaturan");
  revalidatePath("/warga/notifikasi");

  return {
    success: true,
    email: updatedUser.email,
    emailVerified: updatedUser.emailVerified,
    message: "Alamat email berhasil diperbarui. Status verifikasi direset untuk alamat email baru.",
  };
}

/**
 * Simulasi / Pengajuan verifikasi alamat email terdaftar
 */
export async function requestEmailVerification() {
  const userId = await requireActiveUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  if (user.emailVerified) {
    return { success: true, message: "Email Anda sudah terverifikasi sebelumnya." };
  }

  // Tandai email terverifikasi
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "UPDATE_USER",
      entity: "EmailVerification",
      entityId: user.id,
      metadata: { email: user.email, verifiedAt: new Date().toISOString() },
    },
  });

  revalidatePath("/warga/notifikasi/pengaturan");

  return {
    success: true,
    message: "Alamat email resmi berhasil diverifikasi dan aktif menerima korespondensi desa.",
  };
}


