/**
 * API Route: /api/notifications
 *
 * Endpoint API Notifikasi Terlindungi (Protected Endpoint).
 * - Wajib autentikasi (NextAuth session).
 * - Warga hanya dapat mengakses notifikasi miliknya sendiri (where: userId).
 * - Petugas (Staf, Supervisor, Kades) hanya mengakses notifikasi sesuai ID akun miliknya.
 * - Akses tanpa login akan ditolak secara ketat dengan status HTTP 401 Unauthorized.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const markReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

/**
 * GET /api/notifications
 * Mengambil daftar notifikasi pengguna yang sedang login.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan login terlebih dahulu untuk mengakses notifikasi." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Akun Anda tidak aktif atau tidak ditemukan." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const unreadOnly = searchParams.get("unread") === "true";

    const whereClause: { userId: string; isRead?: boolean } = {
      userId: user.id,
    };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          application: {
            select: {
              id: true,
              nomor_pengajuan: true,
              status: true,
              service: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("[GET /api/notifications error]", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server internal saat memuat notifikasi." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Menandai satu atau seluruh notifikasi sebagai sudah dibaca (isRead: true).
 * Dibatasi secara mutlak pada userId milik sesi login aktif.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Akun Anda tidak aktif." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Payload permintaan tidak valid." },
        { status: 400 }
      );
    }

    const { id, all } = parsed.data;

    if (all) {
      const updateResult = await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: "Seluruh notifikasi berhasil ditandai telah dibaca.",
        count: updateResult.count,
      });
    }

    if (id) {
      // Hanya mengupdate jika id DAN userId cocok (mencegah manipulasi status pengguna lain)
      const updateResult = await prisma.notification.updateMany({
        where: { id, userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      if (updateResult.count === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Notifikasi tidak ditemukan, sudah dibaca, atau Anda tidak memiliki hak akses.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notifikasi berhasil ditandai telah dibaca.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Parameter 'id' atau 'all: true' wajib disertakan." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[PATCH /api/notifications error]", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server internal saat memperbarui notifikasi." },
      { status: 500 }
    );
  }
}
