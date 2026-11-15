import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  testAiProviderConnection,
  sanitizeSecretText,
} from "@/lib/ai/config-store";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  provider: z.enum(["grok", "gemini", "nvidia"]),
  model: z.string().trim().min(1).max(150).optional(),
  apiKey: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sesi login tidak ditemukan. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive) {
    return NextResponse.json(
      { error: "Akun tidak aktif atau tidak ditemukan." },
      { status: 401 }
    );
  }

  if (dbUser.role !== "KEPALA_DESA") {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Kepala Desa yang dapat menguji koneksi AI." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format payload pengujian tidak valid." },
      { status: 400 }
    );
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter pengujian koneksi AI tidak valid." },
      { status: 400 }
    );
  }

  try {
    const result = await testAiProviderConnection({
      provider: parsed.data.provider,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey,
    });

    return NextResponse.json(result);
  } catch (err) {
    const safeMsg = sanitizeSecretText(
      err instanceof Error ? err.message : "Gagal menguji koneksi provider AI.",
      [parsed.data.apiKey]
    );
    return NextResponse.json(
      {
        ok: false,
        statusCode: "PROVIDER_UNREACHABLE",
        message: safeMsg,
        provider: parsed.data.provider,
        model: parsed.data.model || "",
        latencyMs: 0,
      },
      { status: 500 }
    );
  }
}

