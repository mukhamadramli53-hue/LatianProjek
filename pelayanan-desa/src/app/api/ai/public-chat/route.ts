import { NextResponse } from "next/server";
import { z } from "zod";
import {
  answerQuestionWithDetails,
  getAvailableAiProviders,
  getAvailableAiVersions,
} from "@/lib/ai/service";

const requestSchema = z.object({
  message: z.string().trim().min(2).max(500),
  version: z.enum(["fast", "standard", "pro"]).optional(),
  provider: z.enum(["grok", "gemini", "nvidia"]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
        provider: z.enum(["grok", "gemini", "nvidia"]).optional(),
        version: z.enum(["fast", "standard", "pro"]).optional(),
        model: z.string().optional(),
      })
    )
    .max(8)
    .optional()
    .default([]),
});

// Simple in-memory rate limiter by IP
const ipLimits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const providers = getAvailableAiProviders();
  const versions = getAvailableAiVersions();
  return NextResponse.json(
    {
      versions,
      defaultVersion: "standard",
      providers,
      defaultProvider: "grok",
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
  // Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const usage = ipLimits.get(ip);
  if (!usage || usage.resetAt <= now) {
    ipLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (usage.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Terlalu banyak pertanyaan. Silakan tunggu sebentar." },
      { status: 429 }
    );
  } else {
    usage.count += 1;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Pertanyaan tidak valid." }, { status: 400 });

  const selectedVersion = parsed.data.version;
  const selectedProvider = parsed.data.provider;
  if (selectedProvider === "gemini") {
    const providers = getAvailableAiProviders();
    const gemini = providers.find((p) => p.id === "gemini");
    if (!gemini?.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Layanan Google Gemini AI belum dikonfigurasi di server. Silakan hubungi administrator untuk menyetel GEMINI_API_KEY pada file .env.local.",
        },
        { status: 400 }
      );
    }
  }

  if (selectedProvider === "nvidia") {
    const providers = getAvailableAiProviders();
    const nvidia = providers.find((p) => p.id === "nvidia");
    if (!nvidia?.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Layanan NVIDIA NIM AI belum dikonfigurasi di server. Silakan hubungi administrator untuk menyetel NVIDIA_API_KEY pada file .env.local.",
        },
        { status: 400 }
      );
    }
  }

  try {
    const result = await answerQuestionWithDetails(
      parsed.data.message,
      parsed.data.history,
      undefined,
      undefined,
      undefined,
      {
        version: selectedVersion ?? (selectedProvider ? undefined : "standard"),
        provider: selectedProvider,
      }
    );
    return NextResponse.json({
      answer: result.answer,
      version: result.version,
      versionLabel: result.versionLabel,
      provider: result.provider,
      model: result.model,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses pertanyaan. Coba lagi sebentar." },
      { status: 502 }
    );
  }
}
