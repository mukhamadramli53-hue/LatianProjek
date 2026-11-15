import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSafeAiConfigForUi,
  saveAiConfiguration,
  sanitizeSecretText,
  testAiProviderConnection,
  getRuntimeAiSettings,
  AI_PROVIDER_CATALOG,
} from "@/lib/ai/config-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const providerUpdateSchema = z.object({
  apiKey: z.string().max(500).optional(),
  selectedModel: z.string().trim().min(1).max(150).optional(),
  clearApiKey: z.boolean().optional(),
});

const updateConfigSchema = z.object({
  activeProvider: z.enum(["grok", "gemini", "nvidia"]).optional(),
  providers: z
    .object({
      grok: providerUpdateSchema.optional(),
      gemini: providerUpdateSchema.optional(),
      nvidia: providerUpdateSchema.optional(),
    })
    .optional(),
});

async function requireKepalaDesa() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Sesi login tidak ditemukan. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive) {
    return {
      error: NextResponse.json(
        { error: "Akun Anda tidak aktif atau tidak ditemukan." },
        { status: 401 }
      ),
    };
  }

  if (dbUser.role !== "KEPALA_DESA") {
    return {
      error: NextResponse.json(
        { error: "Akses ditolak. Hanya Kepala Desa yang dapat mengelola Konfigurasi AI." },
        { status: 403 }
      ),
    };
  }

  return { user: dbUser };
}

export async function GET() {
  const authResult = await requireKepalaDesa();
  if (authResult.error) return authResult.error;

  try {
    const config = await getSafeAiConfigForUi();
    return NextResponse.json(
      { ok: true, config },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const msg = sanitizeSecretText(err instanceof Error ? err.message : "Gagal memuat konfigurasi.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authResult = await requireKepalaDesa();
  if (authResult.error) return authResult.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format payload JSON tidak valid." },
      { status: 400 }
    );
  }

  const parsed = updateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data konfigurasi AI tidak valid.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validasi keamanan: jika pengguna memasukkan API Key baru yang berbeda dari kunci terpasang, uji koneksi terlebih dahulu.
  // Jika API Key baru tidak valid, tolak perubahan dan pertahankan API Key lama di database.
  if (parsed.data.providers) {
    const runtime = await getRuntimeAiSettings();
    for (const [providerKey, pVal] of Object.entries(parsed.data.providers)) {
      const pId = providerKey as "grok" | "gemini" | "nvidia";
      const newKey = pVal?.apiKey?.trim();
      const currentKey = runtime.providers[pId]?.apiKey?.trim();

      if (newKey && newKey.length > 0 && newKey !== currentKey) {
        const testRes = await testAiProviderConnection({
          provider: pId,
          apiKey: newKey,
          model: pVal?.selectedModel || AI_PROVIDER_CATALOG[pId]?.defaultModel,
        });

        if (!testRes.ok) {
          const providerName = AI_PROVIDER_CATALOG[pId]?.name || pId;
          return NextResponse.json(
            {
              error: `API Key baru untuk ${providerName} tidak valid (${testRes.message}). API Key lama Anda tetap aman dan dipertahankan.`,
            },
            { status: 400 }
          );
        }
      }
    }
  }

  try {
    const config = await saveAiConfiguration(parsed.data, authResult.user.id);
    return NextResponse.json({
      ok: true,
      message: "Konfigurasi AI berhasil disimpan.",
      config,
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi AI.";
    const safeMsg = sanitizeSecretText(rawMsg);
    const isValidation =
      safeMsg.includes("tidak dapat diaktifkan") ||
      safeMsg.includes("tidak didukung") ||
      safeMsg.includes("tidak boleh kosong");

    return NextResponse.json(
      { error: safeMsg },
      { status: isValidation ? 400 : 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

