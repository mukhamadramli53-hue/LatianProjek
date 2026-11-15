import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  answerQuestionWithDetails,
  getDefaultActorName,
  getAvailableAiProvidersAsync,
  getAvailableAiVersionsAsync,
} from "@/lib/ai/service";
import { getRuntimeAiSettings, sanitizeSecretText } from "@/lib/ai/config-store";
import type { AiMessage } from "@/lib/ai/types";

const requestSchema = z.object({
  message: z.string().trim().min(2).max(1000),
  version: z.enum(["fast", "standard", "pro"]).optional(),
  provider: z.enum(["grok", "gemini", "nvidia"]).optional(),
  userName: z.string().trim().max(100).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
    provider: z.enum(["grok", "gemini", "nvidia"]).optional(),
    version: z.enum(["fast", "standard", "pro"]).optional(),
    model: z.string().optional(),
  })).max(12).default([]),
});

const limits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [providers, versions, runtime] = await Promise.all([
    getAvailableAiProvidersAsync(),
    getAvailableAiVersionsAsync(),
    getRuntimeAiSettings(),
  ]);
  return NextResponse.json(
    {
      versions,
      defaultVersion: "standard",
      providers,
      defaultProvider: runtime.activeProvider,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(request: Request) {
  // 1. Autentikasi: Validasi sesi login dari sumber tepercaya (NextAuth server session)
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json(
      { error: "Akses hanya tersedia untuk pengguna yang sudah login." },
      { status: 401 }
    );
  }

  // 2. Rate Limiting: Mencegah spam atau penyalahgunaan per user
  const current = Date.now();
  const usage = limits.get(session.user.id);
  if (!usage || usage.resetAt <= current) {
    limits.set(session.user.id, { count: 1, resetAt: current + WINDOW_MS });
  } else if (usage.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Batas pertanyaan tercapai. Silakan coba lagi sebentar." },
      { status: 429 }
    );
  } else {
    usage.count += 1;
  }

  // 3. Validasi Input: Memastikan format JSON dan tipe data sesuai skema Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format data permintaan tidak valid." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pertanyaan tidak valid atau melebihi batas panjang karakter." },
      { status: 400 }
    );
  }

  // Validasi ketersediaan provider / versi yang dipilih (berdasarkan konfigurasi DB & env server)
  const selectedVersion = parsed.data.version;
  const selectedProvider = parsed.data.provider;
  if (selectedProvider) {
    const providers = await getAvailableAiProvidersAsync();
    const targetProvider = providers.find((p) => p.id === selectedProvider);
    if (!targetProvider?.isConfigured) {
      return NextResponse.json(
        {
          error: `Layanan ${targetProvider?.name || selectedProvider} belum dikonfigurasi. Silakan atur API Key melalui menu Konfigurasi AI.`,
        },
        { status: 400 }
      );
    }
  }

  // 4. Identitas Tepercaya: userId dan role diambil HANYA dari sesi server tepercaya,
  // BUKAN dari parameter request yang bisa dimanipulasi oleh klien (Anti-IDOR).
  const trustedUserId = session.user.id;
  const trustedRole = session.user.role;
  const actorName =
    session.user.name ||
    parsed.data.userName ||
    getDefaultActorName(trustedRole);

  // 5. Eksekusi & Penanganan Error
  try {
    const result = await answerQuestionWithDetails(
      parsed.data.message,
      parsed.data.history as AiMessage[],
      trustedRole,
      actorName,
      trustedUserId,
      {
        version: selectedVersion ?? (selectedProvider ? undefined : "standard"),
        provider: selectedProvider,
      }
    );

    console.info("[ai] answered", {
      role: trustedRole,
      actorName,
      userId: trustedUserId,
      version: result.version,
      provider: result.provider,
      model: result.model,
      messageLength: parsed.data.message.length,
    });

    return NextResponse.json({
      answer: result.answer,
      version: result.version,
      versionLabel: result.versionLabel,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : "unknown error";
    const errorMsg = sanitizeSecretText(rawMsg);
    console.error("[ai] provider error", errorMsg);

    // Tampilkan pesan error operasional secara transparan tanpa membocorkan kredensial atau stack trace
    const lowerErr = errorMsg.toLowerCase();
    const isSafeOperationalError =
      errorMsg.includes("API Key") ||
      errorMsg.includes("kuota") ||
      errorMsg.includes("belum dikonfigurasi") ||
      lowerErr.includes("rate limit") ||
      lowerErr.includes("timeout") ||
      lowerErr.includes("unavailable") ||
      lowerErr.includes("model") ||
      lowerErr.includes("provider") ||
      lowerErr.includes("gangguan");
    const clientMessage = isSafeOperationalError
      ? errorMsg
      : "Gagal memperoleh respons dari layanan AI. Silakan periksa ketersediaan provider atau coba lagi.";

    return NextResponse.json(
      { error: clientMessage },
      { status: 502 }
    );
  }
}
