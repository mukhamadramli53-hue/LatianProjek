/**
 * API Route: /api/notifications/unread-count
 *
 * Endpoint ringan untuk menghitung notifikasi belum dibaca milik pengguna aktif.
 * Memerlukan autentikasi NextAuth.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (err) {
    console.error("[GET /api/notifications/unread-count error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal menghitung notifikasi belum dibaca." },
      { status: 500 }
    );
  }
}
