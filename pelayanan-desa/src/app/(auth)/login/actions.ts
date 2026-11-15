"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { getDashboardUrl } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";

export interface LoginState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  try {
    // Dapatkan role user untuk redirect yang benar
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true },
    });

    if (!user) {
      return { error: "Email atau password salah." };
    }

    if (!user.isActive) {
      return { error: "Akun Anda telah dinonaktifkan. Hubungi admin." };
    }

    const auditUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    await writeAuditLog({ actorId: auditUser?.id, action: "LOGIN", entity: "Auth", metadata: { method: "credentials" } });
    await signIn("credentials", {
      email,
      password,
      redirectTo: getDashboardUrl(user.role as Role),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email atau password salah." };
        default:
          return { error: "Terjadi kesalahan saat masuk. Silakan coba lagi." };
      }
    }

    // NEXT_REDIRECT bukan error nyata, biarkan meneruskan redirect
    if (
      (typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof (error as { digest?: unknown }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")) ||
      (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
    ) {
      throw error;
    }

    console.error("[loginAction] Database/Server error:", error);
    return {
      error:
        "Tidak dapat terhubung ke database. Pastikan database MySQL di Laragon sudah berjalan.",
    };
  }
}
