/**
 * API Route: /api/notifications/preferences
 *
 * Endpoint untuk mengelola preferensi notifikasi pengguna aktif:
 * - GET: Mengambil preferensi notifikasi saat ini
 * - PUT: Memperbarui preferensi notifikasi (email, in-app, status, perbaikan berkas)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updatePreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  notifyOnStatus: z.boolean().optional(),
  notifyOnRepair: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      preferences: pref || {
        userId: session.user.id,
        emailEnabled: true,
        inAppEnabled: true,
        notifyOnStatus: true,
        notifyOnRepair: true,
      },
    });
  } catch (err) {
    console.error("[GET /api/notifications/preferences error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal memuat preferensi notifikasi." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = updatePreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Payload preferensi tidak valid." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
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

    return NextResponse.json({
      success: true,
      message: "Preferensi notifikasi berhasil diperbarui.",
      preferences: updated,
    });
  } catch (err) {
    console.error("[PUT /api/notifications/preferences error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui preferensi notifikasi." },
      { status: 500 }
    );
  }
}
