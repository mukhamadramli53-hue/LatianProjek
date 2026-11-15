/**
 * API Route: GET /api/files/[storageKey]
 *
 * Serve file dokumen dengan authorization check.
 * - Path asli storage tidak pernah di-expose ke client
 * - User hanya bisa akses file milik pengajuannya sendiri
 * - Staf/Admin ke atas bisa akses semua
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "private_uploads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storageKey: string }> }
) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { storageKey } = await params;
    if (!storageKey) {
      return new NextResponse("Bad Request: storage key required", { status: 400 });
    }

    // 2. Cari dokumen di DB
    const doc = await prisma.applicationDocument.findUnique({
      where: { storage_key: storageKey },
      include: {
        application: { select: { userId: true } },
      },
    });

    if (!doc) {
      return new NextResponse("File tidak ditemukan", { status: 404 });
    }

    // 3. Authorization check:
    //    - WARGA: hanya bisa akses file milik pengajuannya sendiri
    //    - STAF, SUPERVISOR, KEPALA_DESA: bisa akses semua
    const userId = session.user.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!currentUser?.isActive) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (currentUser.role === "WARGA") {
      if (!doc.application || doc.application.userId !== currentUser.id) {
        return new NextResponse("Forbidden: Anda tidak memiliki akses ke file ini.", { status: 403 });
      }
    }

    // 4. Tentukan nama file fisik
    const ext = getExtension(doc.mime_type);
    const physicalFileName = `${storageKey}${ext}`;
    const filePath = join(UPLOAD_DIR, physicalFileName);

    if (!existsSync(filePath)) {
      return new NextResponse("File tidak ditemukan di storage", { status: 404 });
    }

    // 5. Baca dan serve file
    const fileBuffer = await readFile(filePath);

    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const disposition = isDownload ? "attachment" : "inline";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(doc.file_name)}"`,
        "Content-Length": String(doc.file_size),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[GET /api/files/[storageKey]]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? "";
}
