"use server";

/**
 * Server Actions - Pengajuan Layanan (Application)
 *
 * Semua operasi CRUD untuk pengajuan warga.
 * Setiap action memverifikasi sesi dan otorisasi di sisi server.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { submitApplicationSchema, repairApplicationSchema, formSchemaDefinition, validateFormDataAgainstSchema } from "@/lib/validations/application";
import { isAllowedService } from "@/lib/validations/service";
import type { ApplicationStatus } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { canTransition, getAllowedTransitions } from "@/lib/workflow";
import { 
  recordInAppNotificationsForEvent, 
  dispatchEmailNotificationsForEvent 
} from "@/lib/notifications";

// ============================================================
// HELPERS
// ============================================================

/** Memastikan user yang sedang login adalah WARGA */
async function requireWarga() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu.");
  }
  if (session.user.role !== "WARGA") {
    throw new Error("Forbidden: Hanya akun Warga yang dapat melakukan pengajuan.");
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, phone: true },
  });
  if (!currentUser?.isActive || currentUser.role !== "WARGA") {
    throw new Error("Forbidden: akun tidak aktif atau role sudah berubah.");
  }
  return currentUser;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu.");
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, phone: true },
  });
  if (!currentUser?.isActive) throw new Error("Unauthorized: akun tidak aktif.");
  return currentUser;
}

/** Generate nomor pengajuan unik: PD-YYYYMM-XXXX */
async function generateNomorPengajuan(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PD-${year}${month}`;

  // Cari nomor terakhir dengan prefix yang sama
  const last = await prisma.application.findFirst({
    where: { nomor_pengajuan: { startsWith: prefix } },
    orderBy: { nomor_pengajuan: "desc" },
    select: { nomor_pengajuan: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.nomor_pengajuan.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

// ============================================================
// SUBMIT PENGAJUAN
// ============================================================

export type SubmitResult =
  | { success: true; nomor_pengajuan: string; id: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function submitApplication(rawData: unknown): Promise<SubmitResult> {
  try {
    const user = await requireWarga();

    // 1. Validasi shape input
    const parsed = submitApplicationSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Data tidak valid.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string>,
      };
    }

    const { serviceId, form_data, notes, documentKeys } = parsed.data;

    // 2. Pastikan layanan ada dan aktif
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, code: true, isActive: true, form_schema: true, name: true },
    });

    if (!service || !service.isActive) {
      return { success: false, error: "Layanan tidak ditemukan atau tidak aktif." };
    }

    if (!isAllowedService(service)) {
      return {
        success: false,
        error: "Layanan tidak diizinkan. Sistem saat ini hanya menerima pengajuan SKTM dan Pengantar Pembuatan SKCK.",
      };
    }

    // 3. Validasi form_data terhadap form_schema layanan
    if (service.form_schema) {
      const schemaParsed = formSchemaDefinition.safeParse(service.form_schema);
      if (schemaParsed.success) {
        const { valid, errors } = validateFormDataAgainstSchema(
          form_data as Record<string, unknown>,
          schemaParsed.data
        );
        if (!valid) {
          return { success: false, error: "Terdapat kesalahan pada formulir.", fieldErrors: errors };
        }
      }
    }

    // 4. Validasi document keys: pastikan storage_key ada di DB dan belum terhubung ke pengajuan lain
    if (documentKeys && documentKeys.length > 0) {
      for (const doc of documentKeys) {
        const existing = await prisma.applicationDocument.findUnique({
          where: { storage_key: doc.storage_key },
          select: { applicationId: true },
        });
        if (!existing) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' tidak ditemukan. Silakan upload ulang.` };
        }
        // applicationId !== null berarti sudah terhubung ke pengajuan lain
        if (existing.applicationId !== null) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' sudah digunakan pada pengajuan lain.` };
        }
        const owned = await prisma.applicationDocument.findUnique({
          where: { storage_key: doc.storage_key },
          select: { uploadedById: true },
        });
        if (owned?.uploadedById !== user.id) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' bukan milik akun Anda.` };
        }
      }
    }

    // 5. Generate nomor pengajuan
    const nomor_pengajuan = await generateNomorPengajuan();

    // 6. Buat pengajuan + hubungkan dokumen dalam satu transaksi
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          nomor_pengajuan,
          userId: user.id,
          serviceId,
          form_data: form_data as import("@prisma/client").Prisma.InputJsonValue,
          notes: notes || null,
          status: "DIAJUKAN",
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          actorId: user.id,
          oldStatus: null,
          newStatus: "DIAJUKAN",
          note: notes || null,
        },
      });

      // Hubungkan dokumen yang sudah diupload ke pengajuan ini
      if (documentKeys && documentKeys.length > 0) {
        for (const doc of documentKeys) {
          await tx.applicationDocument.update({
            where: { storage_key: doc.storage_key },
            data: { applicationId: app.id },
          });
        }
      }

      await recordInAppNotificationsForEvent(tx, {
        event: "SUBMIT_NEW",
        applicationId: app.id,
        nomorPengajuan: nomor_pengajuan,
        serviceName: service.name,
        applicant: {
          id: user.id,
          name: user.name || "Warga Pemohon",
          email: user.email,
        },
        newStatus: "DIAJUKAN",
        note: notes || null,
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CREATE_APPLICATION",
          entity: "Application",
          entityId: app.id,
          metadata: { service: service.name, status: "DIAJUKAN" },
        },
      });

      return app;
    });

    const formDataObj = (form_data as Record<string, string>) || {};
    const phoneFromForm = formDataObj.no_telepon || formDataObj.no_whatsapp || formDataObj.whatsapp || formDataObj.no_hp;
    const applicantPhone = user.phone || phoneFromForm || null;

    // Kirim notifikasi WhatsApp otomatis ke warga & email ke role yang berhak (asynchronous / non-blocking)
    dispatchEmailNotificationsForEvent({
      event: "SUBMIT_NEW",
      applicationId: application.id,
      nomorPengajuan: nomor_pengajuan,
      serviceName: service.name,
      applicant: {
        id: user.id,
        name: user.name || "Warga Pemohon",
        email: user.email,
        phone: applicantPhone,
      },
      newStatus: "DIAJUKAN",
      note: notes || null,
    }).catch((err) => {
      console.error("[submitApplication][email-error]", err);
    });

    revalidatePath("/warga/pengajuan");
    revalidatePath("/warga/dashboard");
    revalidatePath("/staf/pengajuan");
    revalidatePath("/staf/dashboard");

    return { success: true, nomor_pengajuan, id: application.id };
  } catch (err) {
    console.error("[submitApplication]", err);
    return { success: false, error: "Terjadi kesalahan sistem. Silakan coba lagi." };
  }
}

// ============================================================
// AMBIL DAFTAR PENGAJUAN MILIK USER SENDIRI
// ============================================================

export async function getMyApplications(params?: {
  status?: ApplicationStatus;
  search?: string;
  sort?: "asc" | "desc";
}) {
  const user = await requireWarga();

  return await prisma.application.findMany({
    where: {
      userId: user.id,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.search
        ? {
            OR: [
              { nomor_pengajuan: { contains: params.search } },
              { service: { name: { contains: params.search } } },
            ],
          }
        : {}),
    },
    include: {
      service: { select: { code: true, name: true, estimatedTime: true } },
      documents: { select: { id: true, requirement_name: true, file_name: true, storage_key: true, file_size: true } },
    },
    orderBy: { submitted_at: params?.sort === "asc" ? "asc" : "desc" },
  });
}

// ============================================================
// AMBIL DETAIL PENGAJUAN (hanya pemilik)
// ============================================================

export async function getApplicationDetail(id: string) {
  const user = await requireSession();

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, nik: true, phone: true, address: true },
      },
      service: {
        select: {
          code: true,
          name: true,
          description: true,
          estimatedTime: true,
          requirements: true,
          form_schema: true,
        },
      },
      documents: true,
      history: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!application) return null;

  // Authorization: warga hanya boleh lihat pengajuannya sendiri
  if (application.userId !== user.id && user.role === "WARGA") {
    throw new Error("Forbidden: Anda tidak memiliki akses ke pengajuan ini.");
  }

  return application;
}

export type TransitionResult =
  | { success: true; status: ApplicationStatus; idempotent?: boolean }
  | { success: false; error: string; allowedTransitions?: ApplicationStatus[]; fieldErrors?: Record<string, string> };

/**
 * Applies exactly one authorized transition and writes its audit row atomically.
 * Repeating an already-applied request is idempotent and does not duplicate history.
 */
export async function transitionApplication(
  id: string,
  newStatus: ApplicationStatus,
  note?: string
): Promise<TransitionResult> {
  try {
    const user = await requireSession();
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        nomor_pengajuan: true,
        service: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!application) return { success: false, error: "Pengajuan tidak ditemukan." };
    if (application.status === newStatus) {
      return { success: true, status: newStatus, idempotent: true };
    }
    if (user.role === "WARGA" && application.userId !== user.id) {
      return { success: false, error: "Forbidden: Anda tidak memiliki akses ke pengajuan ini." };
    }

    const allowedTransitions = getAllowedTransitions(user.role, application.status);
    if (!canTransition(user.role, application.status, newStatus)) {
      return {
        success: false,
        error: "Transisi status tidak diizinkan untuk role atau status saat ini.",
        allowedTransitions,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.updateMany({
        where: { id, status: application.status },
        data: { status: newStatus },
      });
      if (updated.count !== 1) {
        throw new Error("CONCURRENT_TRANSITION");
      }
      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          actorId: user.id,
          oldStatus: application.status,
          newStatus,
          note: note?.trim() || null,
        },
      });
      await recordInAppNotificationsForEvent(tx, {
        event: "STATUS_TRANSITION",
        applicationId: id,
        nomorPengajuan: application.nomor_pengajuan,
        serviceName: application.service.name,
        applicant: {
          id: application.userId,
          name: application.user?.name || "Warga Pemohon",
          email: application.user?.email,
        },
        oldStatus: application.status,
        newStatus,
        note: note?.trim() || null,
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: newStatus === "DISETUJUI" ? "APPROVE_APPLICATION" : newStatus === "DITOLAK" ? "REJECT_APPLICATION" : "STATUS_CHANGE",
          entity: "Application",
          entityId: id,
          metadata: { from: application.status, to: newStatus },
        },
      });
      return newStatus;
    });

    revalidatePath(`/warga/pengajuan/${id}`);
    revalidatePath("/warga/pengajuan");
    revalidatePath(`/staf/pengajuan/${id}`);
    revalidatePath("/staf/pengajuan");
    revalidatePath(`/supervisor/pengajuan/${id}`);
    revalidatePath("/supervisor/pengajuan");
    revalidatePath(`/kades/persetujuan/${id}`);
    revalidatePath("/kades/persetujuan");

    // Kirim notifikasi email otomatis ke role yang berhak (asynchronous / non-blocking)
    dispatchEmailNotificationsForEvent({
      event: "STATUS_TRANSITION",
      applicationId: id,
      nomorPengajuan: application.nomor_pengajuan,
      serviceName: application.service.name,
      applicant: {
        id: application.userId,
        name: application.user?.name || "Warga Pemohon",
        email: application.user?.email,
        phone: application.user?.phone || null,
      },
      oldStatus: application.status,
      newStatus,
      note: note?.trim() || null,
    }).catch((err) => {
      console.error("[transitionApplication][email-error]", err);
    });

    return { success: true, status: result };
  } catch (err) {
    if (err instanceof Error && err.message === "CONCURRENT_TRANSITION") {
      return { success: false, error: "Pengajuan sudah berubah. Muat ulang sebelum mencoba lagi." };
    }
    console.error("[transitionApplication]", err);
    return { success: false, error: "Terjadi kesalahan sistem. Silakan coba lagi." };
  }
}

export async function resubmitApplication(
  id: string,
  rawData: unknown
): Promise<TransitionResult> {
  try {
    const user = await requireWarga();
    const parsed = repairApplicationSchema.safeParse(rawData);
    if (!parsed.success) return { success: false, error: "Data perbaikan tidak valid." };

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        nomor_pengajuan: true,
        service: { select: { name: true, form_schema: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!application || application.userId !== user.id) {
      return { success: false, error: "Forbidden: Anda tidak memiliki akses ke pengajuan ini." };
    }
    if (application.status !== "PERLU_PERBAIKAN") {
      return { success: false, error: "Pengajuan belum meminta perbaikan." };
    }

    const { form_data, notes, documentKeys } = parsed.data;

    // Validasi form_data terhadap form_schema layanan jika tersedia
    if (application.service?.form_schema) {
      const schemaParsed = formSchemaDefinition.safeParse(application.service.form_schema);
      if (schemaParsed.success) {
        const { valid, errors } = validateFormDataAgainstSchema(
          form_data as Record<string, unknown>,
          schemaParsed.data
        );
        if (!valid) {
          return {
            success: false,
            error: "Terdapat data formulir yang belum sesuai atau belum lengkap.",
            fieldErrors: errors,
          };
        }
      }
    }

    // Validasi dokumen-dokumen yang diunggah
    if (documentKeys && documentKeys.length > 0) {
      for (const doc of documentKeys) {
        const existing = await prisma.applicationDocument.findUnique({
          where: { storage_key: doc.storage_key },
          select: { applicationId: true, uploadedById: true },
        });
        if (!existing) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' tidak ditemukan. Silakan upload ulang.` };
        }
        if (existing.applicationId !== null && existing.applicationId !== id) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' sudah digunakan pada pengajuan lain.` };
        }
        if (existing.uploadedById !== user.id) {
          return { success: false, error: `Dokumen '${doc.requirement_name}' bukan milik akun Anda.` };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.application.updateMany({
        where: { id, status: "PERLU_PERBAIKAN", userId: user.id },
        data: {
          form_data: form_data as import("@prisma/client").Prisma.InputJsonValue,
          notes: notes || null,
          status: "DIAJUKAN",
        },
      });
      if (updated.count !== 1) throw new Error("CONCURRENT_TRANSITION");

      // Hubungkan dokumen perbaikan ke pengajuan yang ada (tanpa duplikat)
      if (documentKeys && documentKeys.length > 0) {
        for (const doc of documentKeys) {
          await tx.applicationDocument.update({
            where: { storage_key: doc.storage_key },
            data: { applicationId: id },
          });
        }
      }

      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          actorId: user.id,
          oldStatus: "PERLU_PERBAIKAN",
          newStatus: "DIAJUKAN",
          note: notes ? `Perbaikan oleh warga: ${notes}` : "Pengajuan diperbaiki oleh pemohon dan diajukan kembali.",
        },
      });

      await recordInAppNotificationsForEvent(tx, {
        event: "RESUBMIT_REPAIR",
        applicationId: id,
        nomorPengajuan: application.nomor_pengajuan,
        serviceName: application.service.name,
        applicant: {
          id: user.id,
          name: user.name || "Warga Pemohon",
          email: user.email,
        },
        newStatus: "DIAJUKAN",
        note: notes ? `Catatan pemohon: ${notes}` : null,
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "STATUS_CHANGE",
          entity: "Application",
          entityId: id,
          metadata: { from: "PERLU_PERBAIKAN", to: "DIAJUKAN", resubmitted: true },
        },
      });
    });

    // Kirim notifikasi email otomatis ke role yang berhak (asynchronous / non-blocking)
    dispatchEmailNotificationsForEvent({
      event: "RESUBMIT_REPAIR",
      applicationId: id,
      nomorPengajuan: application.nomor_pengajuan,
      serviceName: application.service.name,
      applicant: {
        id: user.id,
        name: user.name || "Warga Pemohon",
        email: user.email,
        phone: user.phone || application.user?.phone || null,
      },
      newStatus: "DIAJUKAN",
      note: notes ? `Catatan pemohon: ${notes}` : null,
    }).catch((err) => {
      console.error("[resubmitApplication][email-error]", err);
    });

    revalidatePath(`/warga/pengajuan/${id}`);
    revalidatePath("/warga/pengajuan");
    revalidatePath("/staf/pengajuan");
    revalidatePath(`/staf/pengajuan/${id}`);
    return { success: true, status: "DIAJUKAN" };
  } catch (err) {
    if (err instanceof Error && err.message === "CONCURRENT_TRANSITION") {
      return { success: false, error: "Pengajuan sudah berubah. Muat ulang sebelum mencoba lagi." };
    }
    console.error("[resubmitApplication]", err);
    return { success: false, error: "Terjadi kesalahan sistem. Silakan coba lagi." };
  }
}

export async function getStaffApplications() {
  const user = await requireSession();
  if (user.role === "WARGA") throw new Error("Forbidden: Akses staf diperlukan.");

  return prisma.application.findMany({
    where: user.role === "SUPERVISOR"
      ? {}
      : {
          status: {
            in: user.role === "STAF"
              ? ["DIAJUKAN", "DIVERIFIKASI", "DIPROSES", "MENUNGGU_APPROVAL", "PERLU_PERBAIKAN", "DISETUJUI"]
              : ["MENUNGGU_APPROVAL", "DISETUJUI", "SELESAI"],
          },
        },
    include: {
      user: { select: { id: true, name: true, email: true } },
      service: { select: { code: true, name: true } },
      documents: {
        select: {
          id: true,
          requirement_name: true,
          file_name: true,
          storage_key: true,
          file_size: true,
          uploaded_at: true,
        },
      },
    },
    orderBy: { submitted_at: "desc" },
  });
}

// ============================================================
// PENGIRIMAN SURAT RESMI OLEH KEPALA DESA KE WARGA
// ============================================================

export type SendOfficialLetterResult =
  | { success: true; storage_key: string; file_name: string }
  | { success: false; error: string };

export async function sendOfficialLetter(formData: FormData): Promise<SendOfficialLetterResult> {
  try {
    const user = await requireSession();
    if (user.role !== "KEPALA_DESA") {
      return { success: false, error: "Forbidden: Hanya Kepala Desa yang berwenang mengirimkan surat resmi." };
    }

    const applicationId = formData.get("applicationId") as string | null;
    const file = formData.get("file") as File | null;
    const note = (formData.get("note") as string | null)?.trim();

    if (!applicationId) {
      return { success: false, error: "ID pengajuan tidak valid." };
    }

    if (!file || file.size === 0) {
      return { success: false, error: "File dokumen surat resmi (PDF) wajib dipilih." };
    }

    // Validasi format file harus PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return { success: false, error: "Format file harus berformat PDF (.pdf)." };
    }

    // Validasi ukuran file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Ukuran file surat melebihi batas maksimal 10MB." };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true } },
        documents: true,
      },
    });

    if (!application) {
      return { success: false, error: "Data pengajuan tidak ditemukan." };
    }

    if (application.status !== "DISETUJUI" && application.status !== "SELESAI") {
      return {
        success: false,
        error: "Pengajuan belum disetujui. Surat resmi hanya dapat dikirim jika pengajuan telah berstatus DISETUJUI.",
      };
    }

    // Validasi signature bytes PDF
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return { success: false, error: "Isi file yang diunggah bukan dokumen PDF valid." };
    }

    const storageKey = randomUUID();
    const storageFileName = `${storageKey}.pdf`;
    const uploadDir = join(process.cwd(), "private_uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, storageFileName), buffer);

    const sanitizedFileName =
      file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120).trim() || "Surat_Resmi.pdf";

    await prisma.$transaction(async (tx) => {
      // Hapus surat resmi lama jika sudah ada (revisi)
      const existingLetter = application.documents.find(
        (d) =>
          d.requirement_name === "Surat Resmi Terbit (PDF)" ||
          d.requirement_name.toLowerCase().includes("surat resmi")
      );
      if (existingLetter) {
        await tx.applicationDocument.delete({ where: { id: existingLetter.id } });
      }

      // Buat entitas dokumen surat resmi
      await tx.applicationDocument.create({
        data: {
          applicationId: application.id,
          uploadedById: user.id,
          requirement_name: "Surat Resmi Terbit (PDF)",
          file_name: sanitizedFileName,
          storage_key: storageKey,
          mime_type: "application/pdf",
          file_size: file.size,
        },
      });

      // Catat riwayat audit pengiriman surat
      await tx.applicationHistory.create({
        data: {
          applicationId: application.id,
          actorId: user.id,
          oldStatus: application.status,
          newStatus: application.status,
          note:
            note ||
            "Kepala Desa telah mengunggah dan mengirimkan dokumen resmi Surat Pelayanan (PDF) kepada warga.",
        },
      });

      // Kirim notifikasi ke role yang berhak (Warga & Staf Desa)
      await recordInAppNotificationsForEvent(tx, {
        event: "SEND_OFFICIAL_LETTER",
        applicationId: application.id,
        nomorPengajuan: application.nomor_pengajuan,
        serviceName: application.service.name,
        applicant: {
          id: application.userId,
          name: application.user?.name || "Warga Pemohon",
          email: application.user?.email,
        },
        note: note || "Kepala Desa telah menandatangani dan menerbitkan surat resmi pelayanan.",
        officialLetterKey: storageKey,
        officialLetterName: sanitizedFileName,
      });

      // Catat audit log sistem
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "STATUS_CHANGE",
          entity: "Application",
          entityId: application.id,
          metadata: { subAction: "SEND_OFFICIAL_LETTER", fileName: sanitizedFileName, storageKey, fileSize: file.size },
        },
      });
    });

    revalidatePath("/kades/persetujuan");
    revalidatePath(`/kades/persetujuan/${application.id}`);
    revalidatePath("/warga/pengajuan");
    revalidatePath(`/warga/pengajuan/${application.id}`);
    revalidatePath("/warga/dashboard");
    revalidatePath("/staf/pengajuan");

    // Kirim notifikasi email otomatis ke role yang berhak beserta tombol unduh PDF resmi (asynchronous / non-blocking)
    dispatchEmailNotificationsForEvent({
      event: "SEND_OFFICIAL_LETTER",
      applicationId: application.id,
      nomorPengajuan: application.nomor_pengajuan,
      serviceName: application.service.name,
      applicant: {
        id: application.userId,
        name: application.user?.name || "Warga Pemohon",
        email: application.user?.email,
        phone: application.user?.phone || null,
      },
      note: note || "Kepala Desa telah menandatangani dan menerbitkan surat resmi pelayanan.",
      officialLetterKey: storageKey,
      officialLetterName: sanitizedFileName,
    }).catch((err) => {
      console.error("[sendOfficialLetter][email-error]", err);
    });

    return {
      success: true,
      storage_key: storageKey,
      file_name: sanitizedFileName,
    };
  } catch (err: unknown) {
    console.error("[sendOfficialLetter error]", err);
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mengirim surat." };
  }
}

// ============================================================
// AMBIL STATS DASHBOARD WARGA
// ============================================================

export async function getMyApplicationStats() {
  const user = await requireWarga();

  const [total, diajukan, diproses, selesai, perluPerbaikan] = await Promise.all([
    prisma.application.count({ where: { userId: user.id } }),
    prisma.application.count({ where: { userId: user.id, status: "DIAJUKAN" } }),
    prisma.application.count({ where: { userId: user.id, status: "DIPROSES" } }),
    prisma.application.count({ where: { userId: user.id, status: "SELESAI" } }),
    prisma.application.count({ where: { userId: user.id, status: "PERLU_PERBAIKAN" } }),
  ]);

  return { total, diajukan, diproses, selesai, perluPerbaikan };
}

// ============================================================
// HAPUS PENGAJUAN SELESAI (WARGA / PRIVILEGED)
// ============================================================

export type DeleteApplicationResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function deleteCompletedApplication(applicationId: string): Promise<DeleteApplicationResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        nomor_pengajuan: true,
        status: true,
        userId: true,
        service: { select: { name: true } },
      },
    });

    if (!application) {
      return { success: false, error: "Data pengajuan tidak ditemukan." };
    }

    const isOwner = application.userId === session.user.id;
    const isPrivileged = session.user.role === "SUPERVISOR" || session.user.role === "KEPALA_DESA";

    if (!isOwner && !isPrivileged) {
      return { success: false, error: "Forbidden: Anda tidak memiliki izin menghapus pengajuan ini." };
    }

    const completedStatuses: ApplicationStatus[] = ["DISETUJUI", "SELESAI", "DITOLAK"];
    if (!completedStatuses.includes(application.status)) {
      return {
        success: false,
        error: "Hanya pengajuan yang sudah berstatus selesai, disetujui, atau ditolak yang dapat dihapus dari daftar.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus email deliveries terkait
      await tx.emailDelivery.deleteMany({
        where: { applicationId },
      });

      // 2. Hapus dokumen berkas persyaratan
      await tx.applicationDocument.deleteMany({
        where: { applicationId },
      });

      // 3. Hapus riwayat workflow status
      await tx.applicationHistory.deleteMany({
        where: { applicationId },
      });

      // 4. Hapus notifikasi terkait pengajuan ini
      await tx.notification.deleteMany({
        where: { applicationId },
      });

      // 5. Catat audit log
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "STATUS_CHANGE",
          entity: "Application",
          entityId: applicationId,
          metadata: {
            operation: "DELETE_COMPLETED_APPLICATION",
            actorName: session.user.name,
            actorRole: session.user.role,
            nomorPengajuan: application.nomor_pengajuan,
            serviceName: application.service.name,
            finalStatus: application.status,
          },
        },
      });

      // 6. Hapus application
      await tx.application.delete({
        where: { id: applicationId },
      });
    });

    revalidatePath("/warga/pengajuan");
    revalidatePath("/warga/dashboard");
    revalidatePath("/kades/persetujuan");
    revalidatePath("/staf/pengajuan");
    revalidatePath("/supervisor/pengajuan");

    return {
      success: true,
      message: `Pengajuan ${application.nomor_pengajuan} berhasil dihapus dari daftar Anda.`,
    };
  } catch (err: unknown) {
    console.error("[deleteCompletedApplication error]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menghapus pengajuan.",
    };
  }
}

