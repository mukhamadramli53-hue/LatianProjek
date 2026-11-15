/**
 * API Route: POST /api/upload
 *
 * Upload dokumen persyaratan pengajuan.
 * - Auth: hanya WARGA
 * - Validasi MIME type dan ukuran file di backend
 * - Simpan dengan storage_key UUID (bukan nama asli)
 * - Return: storage_key, file_name, mime_type, file_size
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "@/lib/validations/application";

const UPLOAD_DIR = join(process.cwd(), "private_uploads");

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_FILE_SIZE_BYTES + 256_000) {
      return NextResponse.json({ error: `Ukuran request melebihi batas ${MAX_FILE_SIZE_LABEL}.` }, { status: 413 });
    }
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
    if (!currentUser?.isActive || (currentUser.role !== "WARGA" && currentUser.role !== "KEPALA_DESA" && currentUser.role !== "STAF")) {
      return NextResponse.json({ error: "Forbidden: Akses upload tidak diizinkan." }, { status: 403 });
    }

    // 2. Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requirementName = formData.get("requirement_name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan dalam request." }, { status: 400 });
    }
    if (!requirementName) {
      return NextResponse.json({ error: "Nama persyaratan (requirement_name) wajib diisi." }, { status: 400 });
    }

    // 3. Backend validation: MIME type
    const allowedMimeTypes: readonly string[] = ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan. Gunakan: PDF, JPG, PNG, atau WebP.` },
        { status: 422 }
      );
    }

    // 4. Backend validation: file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas ${MAX_FILE_SIZE_LABEL}.` },
        { status: 422 }
      );
    }

    // 5. Backend validation: minimum size (prevent empty files)
    if (file.size < 100) {
      return NextResponse.json({ error: "File terlalu kecil atau kosong." }, { status: 422 });
    }

    // 6. Generate storage key dan simpan file
    const storageKey = randomUUID();
    const ext = getExtension(file.type);
    const storageFileName = `${storageKey}${ext}`;

    // Pastikan direktori ada
    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!hasValidSignature(buffer, file.type)) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan tipe yang dikirim." }, { status: 422 });
    }
    const filePath = join(UPLOAD_DIR, storageFileName);
    await writeFile(filePath, buffer);

    // 7. Simpan metadata ke DB (applicationId null dulu, akan di-link saat submit)
    const doc = await prisma.applicationDocument.create({
      data: {
        applicationId: null,
        uploadedById: currentUser.id,
        requirement_name: requirementName,
        file_name: sanitizeFileName(file.name),
        storage_key: storageKey,
        mime_type: file.type,
        file_size: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      storage_key: doc.storage_key,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      requirement_name: doc.requirement_name,
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Terjadi kesalahan saat mengupload file." }, { status: 500 });
  }

  function sanitizeFileName(name: string): string {
    const sanitized = name.replace(/[^\w.\- ()]/g, "_").slice(0, 120).trim();
    return sanitized || "dokumen";
  }

  function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    return false;
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
