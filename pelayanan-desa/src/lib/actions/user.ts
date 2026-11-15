"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";

const createWargaSchema = z.object({
  name: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nik: z
    .string()
    .length(16, "NIK harus tepat 16 digit angka")
    .regex(/^\d+$/, "NIK hanya boleh berisi angka"),
  email: z.string().email("Format alamat email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor WhatsApp/HP minimal 10 digit")
    .regex(/^(\+62|62|08)[0-9]{8,13}$/, "Format nomor HP tidak valid (contoh: 081234567890)"),
  address: z.string().min(5, "Alamat domisili minimal 5 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
});

export type CreateWargaResult =
  | { success: true; user: { id: string; name: string; email: string; nik: string | null } }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function createWarga(formData: FormData): Promise<CreateWargaResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const currentRole = session.user.role as Role;
    if (currentRole !== "SUPERVISOR" && currentRole !== "KEPALA_DESA") {
      return {
        success: false,
        error: "Forbidden: Hanya Supervisor dan Kepala Desa yang berwenang menambahkan warga baru.",
      };
    }

    const rawInput = {
      name: (formData.get("name") as string)?.trim(),
      nik: (formData.get("nik") as string)?.trim(),
      email: (formData.get("email") as string)?.trim().toLowerCase(),
      phone: (formData.get("phone") as string)?.trim(),
      address: (formData.get("address") as string)?.trim(),
      password: (formData.get("password") as string)?.trim() || "Warga@123",
    };

    const parsed = createWargaSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues[0];
        }
      }
      return {
        success: false,
        error: "Terdapat data yang belum sesuai validasi.",
        fieldErrors,
      };
    }

    const { name, nik, email, phone, address, password } = parsed.data;
    const finalPassword = password && password.length >= 6 ? password : "Warga@123";

    // Cek keunikan email
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      return {
        success: false,
        error: "Alamat email ini sudah terdaftar dalam sistem.",
        fieldErrors: { email: "Email sudah digunakan warga lain" },
      };
    }

    // Cek keunikan NIK
    const existingNik = await prisma.user.findUnique({
      where: { nik },
      select: { id: true },
    });
    if (existingNik) {
      return {
        success: false,
        error: "Nomor Induk Kependudukan (NIK) ini sudah terdaftar dalam sistem.",
        fieldErrors: { nik: "NIK sudah terdaftar sebelumnya" },
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // Buat warga baru dan catat di audit log secara atomik
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          nik,
          email,
          phone,
          address,
          role: "WARGA",
          password: hashedPassword,
          emailVerified: new Date(),
          isActive: true,
        },
        select: { id: true, name: true, email: true, nik: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "UPDATE_USER",
          entity: "User",
          entityId: created.id,
          metadata: {
            operation: "CREATE_WARGA",
            actorRole: currentRole,
            actorName: session.user.name,
            wargaName: name,
            wargaNik: nik,
            wargaEmail: email,
          },
        },
      });

      return created;
    });

    revalidatePath("/supervisor/warga");
    revalidatePath("/supervisor/dashboard");
    revalidatePath("/kades/users");
    revalidatePath("/kades/dashboard");

    return { success: true, user: newUser };
  } catch (err) {
    console.error("[createWarga]", err);
    return { success: false, error: "Terjadi kesalahan internal saat mendaftarkan warga baru." };
  }
}

export async function getWargaList(searchQuery?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = session.user.role as Role;
  if (role !== "SUPERVISOR" && role !== "KEPALA_DESA" && role !== "STAF") {
    throw new Error("Forbidden");
  }

  return prisma.user.findMany({
    where: {
      role: "WARGA",
      ...(searchQuery?.trim()
        ? {
            OR: [
              { name: { contains: searchQuery.trim() } },
              { nik: { contains: searchQuery.trim() } },
              { email: { contains: searchQuery.trim() } },
              { phone: { contains: searchQuery.trim() } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      nik: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

const updateProfileSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format alamat email tidak valid (contoh: nama@domain.com)")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|08)[0-9]{8,13}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890 atau +6281234567890)")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(3, "Alamat domisili minimal 3 karakter").optional().or(z.literal("")),
  currentPassword: z.string().optional().or(z.literal("")),
});

export type UpdateProfileResult =
  | { success: true; message: string; emailVerified?: Date | string | null }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function updateMyProfile(formData: FormData): Promise<UpdateProfileResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const rawInput = {
      email: (formData.get("email") as string)?.trim().toLowerCase() || "",
      phone: (formData.get("phone") as string)?.trim() || "",
      address: (formData.get("address") as string)?.trim() || "",
      currentPassword: (formData.get("currentPassword") as string) || "",
    };

    const parsed = updateProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues[0];
        }
      }
      return { success: false, error: "Terdapat data yang belum valid.", fieldErrors };
    }

    const { email, phone, address, currentPassword } = parsed.data;

    // Ambil data profil terkini pengguna
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, phone: true, address: true, password: true, name: true, role: true },
    });

    if (!currentUser) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    let isEmailChanged = false;
    if (email && email !== currentUser.email.toLowerCase()) {
      isEmailChanged = true;

      // Cek keunikan email pada pengguna lain
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      if (existingEmail) {
        return {
          success: false,
          error: "Alamat email tersebut sudah digunakan oleh akun lain.",
          fieldErrors: { email: "Email sudah terdaftar pada akun lain" },
        };
      }

      // Jika akun memiliki password dan pengguna mengubah email, validasi password saat ini jika disertakan
      if (currentUser.password && currentPassword) {
        const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isPasswordValid) {
          return {
            success: false,
            error: "Kata sandi saat ini tidak cocok untuk otentikasi perubahan email.",
            fieldErrors: { currentPassword: "Kata sandi salah" },
          };
        }
      }
    }

    // Update database profil pengguna
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(isEmailChanged ? { email, emailVerified: null } : {}),
        phone: phone || null,
        address: address || null,
      },
      select: { id: true, email: true, phone: true, address: true, emailVerified: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_USER",
        entity: "UserProfile",
        entityId: session.user.id,
        metadata: {
          operation: "UPDATE_PROFILE",
          actorName: session.user.name,
          actorRole: currentUser.role,
          updatedFields: {
            oldEmail: currentUser.email,
            newEmail: updated.email,
            oldPhone: currentUser.phone,
            newPhone: updated.phone,
            oldAddress: currentUser.address,
            newAddress: updated.address,
            emailChanged: isEmailChanged,
          },
        },
      },
    });

    revalidatePath("/profil");
    revalidatePath("/warga/dashboard");
    revalidatePath("/staf/dashboard");
    revalidatePath("/supervisor/dashboard");
    revalidatePath("/kades/dashboard");

    const message = isEmailChanged
      ? "Kontak berhasil diperbarui. Status verifikasi email direset untuk alamat baru."
      : "Informasi kontak profil Anda berhasil diperbarui dengan aman!";

    return { success: true, message, emailVerified: updated.emailVerified };
  } catch (err) {
    console.error("[updateMyProfile]", err);
    return { success: false, error: "Gagal memperbarui profil. Silakan coba kembali." };
  }
}

export async function verifyMyContactEmail(): Promise<UpdateProfileResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true, name: true, role: true },
    });

    if (!user) {
      return { success: false, error: "User tidak ditemukan." };
    }

    if (user.emailVerified) {
      return { success: true, message: "Alamat email Anda sudah berstatus terverifikasi.", emailVerified: user.emailVerified };
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: now },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_USER",
        entity: "EmailVerification",
        entityId: user.id,
        metadata: {
          operation: "VERIFY_EMAIL",
          actorName: user.name,
          actorRole: user.role,
          email: user.email,
          verifiedAt: now.toISOString(),
        },
      },
    });

    revalidatePath("/profil");
    return {
      success: true,
      message: "Alamat email berhasil diverifikasi resmi dan aktif menerima korespondensi desa!",
      emailVerified: now,
    };
  } catch (err) {
    console.error("[verifyMyContactEmail]", err);
    return { success: false, error: "Gagal memverifikasi email. Silakan coba kembali." };
  }
}

export async function updateWargaContactByOfficer(
  targetUserId: string,
  formData: FormData
): Promise<UpdateProfileResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const currentRole = session.user.role as Role;
    if (currentRole !== "SUPERVISOR" && currentRole !== "KEPALA_DESA") {
      return {
        success: false,
        error: "Forbidden: Hanya Supervisor dan Kepala Desa yang berwenang memperbarui kontak warga.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, phone: true, address: true, role: true },
    });

    if (!targetUser) {
      return { success: false, error: "Pengguna warga tidak ditemukan." };
    }

    if (targetUser.role !== "WARGA") {
      return { success: false, error: "Hanya data kontak warga yang dapat diperbarui melalui fitur ini." };
    }

    const rawInput = {
      email: (formData.get("email") as string)?.trim().toLowerCase() || "",
      phone: (formData.get("phone") as string)?.trim() || "",
      address: (formData.get("address") as string)?.trim() || "",
    };

    const parsed = updateProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues[0];
        }
      }
      return { success: false, error: "Terdapat data yang belum sesuai format validasi.", fieldErrors };
    }

    const { email, phone, address } = parsed.data;

    let isEmailChanged = false;
    if (email && email !== targetUser.email.toLowerCase()) {
      isEmailChanged = true;
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: targetUserId },
        },
        select: { id: true },
      });

      if (existingEmail) {
        return {
          success: false,
          error: "Alamat email tersebut sudah digunakan oleh akun lain.",
          fieldErrors: { email: "Email sudah digunakan" },
        };
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(isEmailChanged ? { email, emailVerified: null } : {}),
        phone: phone || null,
        address: address || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_USER",
        entity: "User",
        entityId: targetUserId,
        metadata: {
          operation: "OFFICER_UPDATE_WARGA_CONTACT",
          officerName: session.user.name,
          officerRole: currentRole,
          wargaName: targetUser.name,
          oldEmail: targetUser.email,
          newEmail: email,
          oldPhone: targetUser.phone,
          newPhone: phone,
        },
      },
    });

    revalidatePath("/supervisor/warga");
    revalidatePath("/kades/users");
    return { success: true, message: `Kontak warga "${targetUser.name}" berhasil diperbarui dengan aman!` };
  } catch (err) {
    console.error("[updateWargaContactByOfficer]", err);
    return { success: false, error: "Gagal memperbarui data kontak warga. Silakan coba kembali." };
  }
}

export async function updateMyPassword(formData: FormData): Promise<UpdateProfileResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    if (!currentPassword) {
      return { success: false, error: "Password saat ini wajib diisi.", fieldErrors: { currentPassword: "Wajib diisi" } };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter.", fieldErrors: { newPassword: "Minimal 6 karakter" } };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: "Konfirmasi password baru tidak cocok.", fieldErrors: { confirmPassword: "Password tidak cocok" } };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return { success: false, error: "User tidak ditemukan." };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Password saat ini yang Anda masukkan salah.", fieldErrors: { currentPassword: "Password saat ini salah" } };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_USER",
        entity: "User",
        entityId: session.user.id,
        metadata: {
          operation: "CHANGE_PASSWORD",
          actorName: session.user.name,
        },
      },
    });

    return { success: true, message: "Kata sandi akun Anda berhasil diperbarui dengan aman!" };
  } catch (err) {
    console.error("[updateMyPassword]", err);
    return { success: false, error: "Gagal mengubah kata sandi. Silakan coba kembali." };
  }
}

export type DeleteWargaResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function deleteWarga(targetUserId: string): Promise<DeleteWargaResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const currentRole = session.user.role as Role;
    if (currentRole !== "SUPERVISOR" && currentRole !== "KEPALA_DESA") {
      return {
        success: false,
        error: "Forbidden: Hanya Kepala Desa dan Supervisor yang berwenang menghapus data warga.",
      };
    }

    if (session.user.id === targetUserId) {
      return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, nik: true, email: true, role: true },
    });

    if (!targetUser) {
      return { success: false, error: "Data warga tidak ditemukan." };
    }

    if (targetUser.role !== "WARGA") {
      return { success: false, error: "Hanya akun dengan peran WARGA yang dapat dihapus melalui fitur ini." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Bersihkan aplikasi yang diajukan warga ini
      const userApps = await tx.application.findMany({
        where: { userId: targetUserId },
        select: { id: true },
      });
      const appIds = userApps.map((a) => a.id);

      if (appIds.length > 0) {
        await tx.emailDelivery.deleteMany({
          where: { applicationId: { in: appIds } },
        });
        await tx.applicationDocument.deleteMany({
          where: { applicationId: { in: appIds } },
        });
        await tx.applicationHistory.deleteMany({
          where: { applicationId: { in: appIds } },
        });
        await tx.application.deleteMany({
          where: { id: { in: appIds } },
        });
      }

      // 2. Bersihkan request histories jika pernah ada
      const userReqs = await tx.serviceRequest.findMany({
        where: { userId: targetUserId },
        select: { id: true },
      });
      const reqIds = userReqs.map((r) => r.id);
      if (reqIds.length > 0) {
        await tx.attachment.deleteMany({
          where: { requestId: { in: reqIds } },
        });
        await tx.requestHistory.deleteMany({
          where: { requestId: { in: reqIds } },
        });
        await tx.serviceRequest.deleteMany({
          where: { id: { in: reqIds } },
        });
      }

      // 3. Bersihkan notifikasi, preferensi, akun, dan sesi
      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.notificationPreference.deleteMany({ where: { userId: targetUserId } });
      await tx.account.deleteMany({ where: { userId: targetUserId } });
      await tx.session.deleteMany({ where: { userId: targetUserId } });

      // 4. Catat Audit Log
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "UPDATE_USER",
          entity: "User",
          entityId: targetUserId,
          metadata: {
            operation: "DELETE_WARGA",
            officerName: session.user.name,
            officerRole: currentRole,
            deletedWargaName: targetUser.name,
            deletedWargaNik: targetUser.nik,
            deletedWargaEmail: targetUser.email,
          },
        },
      });

      // 5. Hapus user
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    revalidatePath("/kades/users");
    revalidatePath("/kades/dashboard");
    revalidatePath("/supervisor/warga");
    revalidatePath("/supervisor/dashboard");

    return {
      success: true,
      message: `Data warga "${targetUser.name}" berhasil dihapus dari sistem.`,
    };
  } catch (err) {
    console.error("[deleteWarga]", err);
    return { success: false, error: "Gagal menghapus data warga. Terjadi kendala internal pada server." };
  }
}


