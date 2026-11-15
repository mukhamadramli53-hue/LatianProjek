import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db";
import type { AiProviderType } from "./types";

export interface SupportedModelOption {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export interface ProviderDefinition {
  id: AiProviderType;
  name: string;
  shortName: string;
  description: string;
  defaultModel: string;
  supportedModels: SupportedModelOption[];
}

export const AI_PROVIDER_ORDER: AiProviderType[] = ["grok", "gemini", "nvidia"];

export const AI_PROVIDER_CATALOG: Record<AiProviderType, ProviderDefinition> = {
  grok: {
    id: "grok",
    name: "Grok AI",
    shortName: "Grok",
    description: "Inference cepat melalui API Groq yang terpasang pada layanan AI aplikasi.",
    defaultModel: "qwen/qwen3.8-27b",
    supportedModels: [
      {
        id: "qwen/qwen3.8-27b",
        label: "qwen/qwen3.8-27b (Default Sistem)",
        description: "Model default integrasi Groq/Grok untuk penalaran cepat.",
        isDefault: true,
      },
      {
        id: "openai/gpt-oss-120b",
        label: "openai/gpt-oss-120b",
        description: "Model open-weights kapasitas besar untuk analisis komprehensif.",
      },
      {
        id: "openai/gpt-oss-20b",
        label: "openai/gpt-oss-20b",
        description: "Model ringan dan responsif untuk pertanyaan operasional.",
      },
      {
        id: "allam-2-7b",
        label: "allam-2-7b",
        description: "Model 7B ringan yang tersedia pada endpoint Groq.",
      },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Gemini AI Studio",
    shortName: "Gemini",
    description: "Google AI Studio / Gemini untuk analisis cerdas, pelaporan, dan monitoring desa.",
    defaultModel: "gemini-3.1-flash-lite",
    supportedModels: [
      {
        id: "gemini-3.1-flash-lite",
        label: "gemini-3.1-flash-lite (Default Cepat & Cerdas)",
        description: "Model stabil, responsif, dan cerdas untuk analisis data desa.",
        isDefault: true,
      },
      {
        id: "gemini-3.5-flash",
        label: "gemini-3.5-flash",
        description: "Model Gemini 3.5 Flash untuk analisis teks mendalam.",
      },
      {
        id: "gemini-3.6-flash",
        label: "gemini-3.6-flash",
        description: "Varian Gemini 3.6 Flash untuk pemrosesan teks umum.",
      },
      {
        id: "gemini-3.5-flash-lite",
        label: "gemini-3.5-flash-lite",
        description: "Varian ringan Gemini 3.5 untuk respons hemat kuota.",
      },
      {
        id: "gemini-3.8-flash",
        label: "gemini-3.8-flash",
        description: "Model Gemini 3.8 Flash preview.",
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "gemini-3.1-pro-preview",
        description: "Model Pro preview untuk penalaran analitik mendalam.",
      },
    ],
  },
  nvidia: {
    id: "nvidia",
    name: "NVIDIA AI",
    shortName: "NVIDIA",
    description: "NVIDIA NIM API untuk model Nemotron yang terhubung pada layanan backend.",
    defaultModel: "nvidia/nemotron-3.5-lightning-30b-a3b",
    supportedModels: [
      {
        id: "nvidia/nemotron-3.5-lightning-30b-a3b",
        label: "nvidia/nemotron-3.5-lightning-30b-a3b (Default Sistem)",
        description: "Model default integrasi NVIDIA NIM saat ini.",
        isDefault: true,
      },
      {
        id: "nvidia/nemotron-3.5-super-vl-120b-a12b",
        label: "nvidia/nemotron-3.5-super-vl-120b-a12b",
        description: "Model Nemotron 3.5 kapasitas tinggi 120B.",
      },
      {
        id: "nvidia/nemotron-3.5-bolt-e4b",
        label: "nvidia/nemotron-3.5-bolt-e4b",
        description: "Varian ultra-cepat Nemotron 3.5 Bolt.",
      },
    ],
  },
};

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function getEncryptionKey(): Buffer {
  const rawSecret =
    process.env.AI_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (!rawSecret) {
    throw new Error(
      "Konfigurasi keamanan server belum lengkap (AI_ENCRYPTION_KEY / AUTH_SECRET tidak ditemukan)."
    );
  }

  return crypto
    .createHash("sha256")
    .update(`pelayanan-desa-ai-key-v1:${rawSecret}`)
    .digest();
}

export function encryptApiKey(plainApiKey: string): string {
  const trimmed = plainApiKey.trim();
  if (!trimmed) {
    throw new Error("API Key tidak boleh kosong.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(payload: string | null | undefined): string | null {
  if (!payload || !payload.startsWith("v1:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new Error("Format data API Key terenkripsi tidak valid.");
  }

  const [, ivB64, tagB64, cipherB64] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function sanitizeSecretText(input: string, extraSecrets: Array<string | null | undefined> = []): string {
  let clean = input || "";
  for (const s of extraSecrets) {
    const t = s?.trim();
    if (t && t.length >= 6) {
      clean = clean.split(t).join("[REDACTED]");
    }
  }
  return clean
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, "[REDACTED]")
    .replace(/gsk_[0-9A-Za-z\-_]{16,}/g, "[REDACTED]")
    .replace(/nvapi-[0-9A-Za-z\-_]{16,}/g, "[REDACTED]")
    .replace(/xai-[0-9A-Za-z\-_]{16,}/g, "[REDACTED]")
    .replace(/sk-[0-9A-Za-z\-_]{16,}/g, "[REDACTED]");
}

function getEnvApiKey(provider: AiProviderType): string | undefined {
  if (provider === "grok") {
    return process.env.GROQ_API_KEY?.trim() || process.env.GROK_API_KEY?.trim() || undefined;
  }
  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY?.trim() || undefined;
  }
  return process.env.NVIDIA_API_KEY?.trim() || undefined;
}

function getEnvModel(provider: AiProviderType): string {
  const catalog = AI_PROVIDER_CATALOG[provider];
  const raw =
    provider === "grok"
      ? process.env.GROQ_MODEL?.trim() || process.env.GROK_MODEL?.trim()
      : provider === "gemini"
      ? process.env.GEMINI_MODEL?.trim()
      : process.env.NVIDIA_MODEL?.trim();

  // Hindari gemini-3.8-flash sebagai default pasif env karena sering 503; pilih manual di DB jika dibutuhkan
  if (provider === "gemini" && raw === "gemini-3.8-flash") {
    return catalog.defaultModel;
  }

  if (raw && isSupportedModel(provider, raw)) {
    return raw;
  }
  return catalog.defaultModel;
}

export function isValidProvider(provider: string): provider is AiProviderType {
  return provider === "grok" || provider === "gemini" || provider === "nvidia";
}

export function isSupportedModel(provider: AiProviderType, model: string): boolean {
  return AI_PROVIDER_CATALOG[provider].supportedModels.some((m) => m.id === model);
}

export interface SafeProviderConfigView {
  id: AiProviderType;
  name: string;
  shortName: string;
  description: string;
  selectedModel: string;
  defaultModel: string;
  supportedModels: SupportedModelOption[];
  hasApiKey: boolean;
  hasDatabaseKey: boolean;
  hasEnvKey: boolean;
  keySource: "database" | "env" | "none";
  apiKey?: string;
  isActive: boolean;
  updatedAt: string | null;
}

export interface SafeAiConfigSnapshot {
  activeProvider: AiProviderType;
  activeModel: string;
  hasActiveDbConfig: boolean;
  providers: SafeProviderConfigView[];
}

export interface RuntimeProviderSettings {
  provider: AiProviderType;
  apiKey?: string;
  model: string;
  keySource: "database" | "env" | "none";
  isActive: boolean;
  isConfigured: boolean;
}

export interface RuntimeAiSettings {
  activeProvider: AiProviderType;
  activeModel: string;
  hasActiveDbConfig: boolean;
  providers: Record<AiProviderType, RuntimeProviderSettings>;
}

// Cache singkat di memory server agar chat beruntun cepat, langsung di-invalidate saat simpan konfigurasi atau env berubah
let runtimeCache: { value: RuntimeAiSettings; expiresAt: number; envFingerprint: string } | null = null;
const RUNTIME_CACHE_TTL_MS = 5000;

function getEnvFingerprint(): string {
  return AI_PROVIDER_ORDER.map((id) => `${id}:${getEnvApiKey(id) ?? ""}:${getEnvModel(id)}`).join("|");
}

export function invalidateAiConfigCache(): void {
  runtimeCache = null;
}

export async function getRuntimeAiSettings(forceFresh = false): Promise<RuntimeAiSettings> {
  const envFingerprint = getEnvFingerprint();
  if (!forceFresh && runtimeCache && Date.now() < runtimeCache.expiresAt && runtimeCache.envFingerprint === envFingerprint) {
    return runtimeCache.value;
  }

  let rows: Array<{
    provider: AiProviderType;
    encryptedApiKey: string | null;
    selectedModel: string;
    isActive: boolean;
    updatedAt: Date;
  }> = [];

  try {
    rows = await prisma.aiProviderConfig.findMany({
      select: {
        provider: true,
        encryptedApiKey: true,
        selectedModel: true,
        isActive: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.warn(
      "[ai-config] Gagal membaca ai_configurations, menggunakan env fallback:",
      err instanceof Error ? sanitizeSecretText(err.message) : "Unknown error"
    );
  }

  const rowMap = new Map(rows.map((r) => [r.provider, r]));
  const providers = {} as Record<AiProviderType, RuntimeProviderSettings>;

  for (const id of AI_PROVIDER_ORDER) {
    const row = rowMap.get(id);
    let dbKey: string | undefined;
    if (row?.encryptedApiKey) {
      try {
        dbKey = decryptApiKey(row.encryptedApiKey) || undefined;
      } catch (err) {
        console.warn(
          `[ai-config] Gagal dekripsi API Key ${id}:`,
          err instanceof Error ? sanitizeSecretText(err.message) : "Decrypt error"
        );
      }
    }

    const envKey = getEnvApiKey(id);
    const resolvedKey = dbKey || envKey;
    const keySource: "database" | "env" | "none" = dbKey
      ? "database"
      : envKey
      ? "env"
      : "none";

    const selectedModel =
      row?.selectedModel && isSupportedModel(id, row.selectedModel)
        ? row.selectedModel
        : getEnvModel(id);

    providers[id] = {
      provider: id,
      apiKey: resolvedKey,
      model: selectedModel,
      keySource,
      isActive: Boolean(row?.isActive),
      isConfigured: Boolean(resolvedKey),
    };
  }

  const activeDbRow = rows.find((r) => r.isActive && providers[r.provider]?.isConfigured);
  let activeProvider: AiProviderType;
  let hasActiveDbConfig = false;

  if (activeDbRow) {
    activeProvider = activeDbRow.provider;
    hasActiveDbConfig = true;
  } else if (providers.grok.isConfigured) {
    activeProvider = "grok";
  } else if (providers.gemini.isConfigured) {
    activeProvider = "gemini";
  } else if (providers.nvidia.isConfigured) {
    activeProvider = "nvidia";
  } else {
    activeProvider = "grok";
  }

  const settings: RuntimeAiSettings = {
    activeProvider,
    activeModel: providers[activeProvider].model,
    hasActiveDbConfig,
    providers,
  };

  runtimeCache = {
    value: settings,
    expiresAt: Date.now() + RUNTIME_CACHE_TTL_MS,
    envFingerprint,
  };

  return settings;
}

export async function getSafeAiConfigForUi(): Promise<SafeAiConfigSnapshot> {
  const rows = await prisma.aiProviderConfig.findMany({
    select: {
      provider: true,
      encryptedApiKey: true,
      selectedModel: true,
      isActive: true,
      updatedAt: true,
    },
  });

  const rowMap = new Map(rows.map((r) => [r.provider, r]));

  const providerViews: SafeProviderConfigView[] = AI_PROVIDER_ORDER.map((id) => {
    const def = AI_PROVIDER_CATALOG[id];
    const row = rowMap.get(id);
    const hasDatabaseKey = Boolean(row?.encryptedApiKey);
    const hasEnvKey = Boolean(getEnvApiKey(id));
    const hasApiKey = hasDatabaseKey || hasEnvKey;
    const keySource: "database" | "env" | "none" = hasDatabaseKey
      ? "database"
      : hasEnvKey
      ? "env"
      : "none";
    const selectedModel =
      row?.selectedModel && isSupportedModel(id, row.selectedModel)
        ? row.selectedModel
        : getEnvModel(id);

    let installedKey: string | undefined = undefined;
    if (row?.encryptedApiKey) {
      try {
        installedKey = decryptApiKey(row.encryptedApiKey) || undefined;
      } catch {}
    }
    if (!installedKey) {
      installedKey = getEnvApiKey(id) || undefined;
    }

    return {
      id,
      name: def.name,
      shortName: def.shortName,
      description: def.description,
      selectedModel,
      defaultModel: def.defaultModel,
      supportedModels: def.supportedModels,
      hasApiKey,
      hasDatabaseKey,
      hasEnvKey,
      keySource,
      apiKey: installedKey,
      isActive: false,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    };
  });

  const activeDbRow = rows.find((r) => {
    const view = providerViews.find((p) => p.id === r.provider);
    return r.isActive && Boolean(view?.hasApiKey);
  });

  let activeProvider: AiProviderType;
  let hasActiveDbConfig = false;

  if (activeDbRow) {
    activeProvider = activeDbRow.provider;
    hasActiveDbConfig = true;
  } else {
    const firstConfigured =
      providerViews.find((p) => p.id === "grok" && p.hasApiKey) ||
      providerViews.find((p) => p.id === "gemini" && p.hasApiKey) ||
      providerViews.find((p) => p.id === "nvidia" && p.hasApiKey) ||
      providerViews[0];
    activeProvider = firstConfigured.id;
  }

  for (const view of providerViews) {
    view.isActive = view.id === activeProvider;
  }

  const activeView = providerViews.find((p) => p.id === activeProvider)!;

  return {
    activeProvider,
    activeModel: activeView.selectedModel,
    hasActiveDbConfig,
    providers: providerViews,
  };
}

export interface ProviderSaveInput {
  apiKey?: string;
  selectedModel?: string;
  clearApiKey?: boolean;
}

export interface SaveAiConfigPayload {
  activeProvider?: AiProviderType;
  providers?: Partial<Record<AiProviderType, ProviderSaveInput>>;
}

export async function saveAiConfiguration(
  payload: SaveAiConfigPayload,
  updatedById: string
): Promise<SafeAiConfigSnapshot> {
  const existingRows = await prisma.aiProviderConfig.findMany({
    select: {
      provider: true,
      encryptedApiKey: true,
      selectedModel: true,
      isActive: true,
    },
  });
  const existingMap = new Map(existingRows.map((r) => [r.provider, r]));

  // Validasi model setiap provider yang dikirim
  for (const id of AI_PROVIDER_ORDER) {
    const input = payload.providers?.[id];
    if (!input) continue;
    if (input.selectedModel !== undefined && !isSupportedModel(id, input.selectedModel)) {
      throw new Error(
        `Model "${input.selectedModel}" tidak didukung oleh integrasi ${AI_PROVIDER_CATALOG[id].name}.`
      );
    }
  }

  // Tentukan provider aktif setelah perubahan ini
  const currentActiveRow = existingRows.find((r) => r.isActive);
  let targetActiveProvider: AiProviderType | undefined = payload.activeProvider;
  if (!targetActiveProvider && currentActiveRow) {
    targetActiveProvider = currentActiveRow.provider;
  }

  // Cek apakah provider target aktif memiliki API Key valid (baru, DB, atau env fallback kecuali dihapus)
  if (targetActiveProvider) {
    const targetInput = payload.providers?.[targetActiveProvider];
    const targetExisting = existingMap.get(targetActiveProvider);
    const hasNewKey = Boolean(targetInput?.apiKey && targetInput.apiKey.trim().length > 0);
    const clearedKey = Boolean(targetInput?.clearApiKey);
    const hasExistingDbKey = Boolean(targetExisting?.encryptedApiKey) && !clearedKey;
    const hasEnvKey = Boolean(getEnvApiKey(targetActiveProvider));

    if (!hasNewKey && !hasExistingDbKey && !hasEnvKey) {
      throw new Error(
        `${AI_PROVIDER_CATALOG[targetActiveProvider].name} tidak dapat diaktifkan karena API Key belum dikonfigurasi.`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const id of AI_PROVIDER_ORDER) {
      const input = payload.providers?.[id];
      const existing = existingMap.get(id);

      // Jangan hapus atau menimpa provider lain jika tidak diubah pada request ini
      const hasAnyUpdateForProvider =
        input !== undefined || targetActiveProvider !== undefined;

      if (!hasAnyUpdateForProvider && !existing) {
        continue;
      }

      const trimmedKey = input?.apiKey?.trim();
      let nextEncryptedKey = existing?.encryptedApiKey ?? null;
      if (input?.clearApiKey) {
        nextEncryptedKey = null;
      } else if (trimmedKey) {
        nextEncryptedKey = encryptApiKey(trimmedKey);
      }

      const nextModel =
        input?.selectedModel ||
        (existing?.selectedModel && isSupportedModel(id, existing.selectedModel)
          ? existing.selectedModel
          : getEnvModel(id));

      const nextIsActive = targetActiveProvider
        ? id === targetActiveProvider
        : Boolean(existing?.isActive);

      if (existing) {
        await tx.aiProviderConfig.update({
          where: { provider: id },
          data: {
            encryptedApiKey: nextEncryptedKey,
            selectedModel: nextModel,
            isActive: nextIsActive,
            updatedById,
          },
        });
      } else if (trimmedKey || input?.selectedModel || nextIsActive) {
        await tx.aiProviderConfig.create({
          data: {
            provider: id,
            encryptedApiKey: nextEncryptedKey,
            selectedModel: nextModel,
            isActive: nextIsActive,
            updatedById,
          },
        });
      }
    }
  });

  invalidateAiConfigCache();
  return getSafeAiConfigForUi();
}

export type ConnectionTestStatusCode =
  | "SUCCESS"
  | "MISSING_CONFIG"
  | "INVALID_API_KEY"
  | "MODEL_UNAVAILABLE"
  | "QUOTA_OR_RATE_LIMIT"
  | "PROVIDER_UNREACHABLE";

export interface ConnectionTestResult {
  ok: boolean;
  statusCode: ConnectionTestStatusCode;
  message: string;
  provider: AiProviderType;
  model: string;
  latencyMs: number;
}

export async function testAiProviderConnection(params: {
  provider: AiProviderType;
  model?: string;
  apiKey?: string;
}): Promise<ConnectionTestResult> {
  const { provider } = params;
  const runtime = await getRuntimeAiSettings(true);
  const current = runtime.providers[provider];

  const candidateKey = params.apiKey?.trim() || current.apiKey;
  const candidateModel = params.model?.trim() || current.model;

  if (!isSupportedModel(provider, candidateModel)) {
    return {
      ok: false,
      statusCode: "MODEL_UNAVAILABLE",
      message: "Model tidak tersedia.",
      provider,
      model: candidateModel,
      latencyMs: 0,
    };
  }

  if (!candidateKey) {
    return {
      ok: false,
      statusCode: "MISSING_CONFIG",
      message: "Konfigurasi belum lengkap.",
      provider,
      model: candidateModel,
      latencyMs: 0,
    };
  }

  const startedAt = Date.now();

  try {
    if (provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: candidateKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: candidateModel,
          contents: "Jawab dengan satu kata: OK",
          config: {
            temperature: 0,
            maxOutputTokens: 128,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
      } catch (innerErr) {
        const innerMsg = innerErr instanceof Error ? innerErr.message.toLowerCase() : "";
        if (innerMsg.includes("thinking") && (innerMsg.includes("not supported") || innerMsg.includes("invalid"))) {
          response = await ai.models.generateContent({
            model: candidateModel,
            contents: "Jawab dengan satu kata: OK",
            config: {
              temperature: 0,
              maxOutputTokens: 256,
            },
          });
        } else if (
          (innerMsg.includes("503") || innerMsg.includes("unavailable") || innerMsg.includes("high demand")) &&
          candidateModel !== "gemini-3.1-flash-lite"
        ) {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: "Jawab dengan satu kata: OK",
            config: {
              temperature: 0,
              maxOutputTokens: 128,
              thinkingConfig: { thinkingBudget: 0 },
            },
          });
        } else {
          throw innerErr;
        }
      }
      if (!response.text || !response.text.trim()) {
        return {
          ok: false,
          statusCode: "PROVIDER_UNREACHABLE",
          message: "Provider tidak mengembalikan respons yang valid.",
          provider,
          model: candidateModel,
          latencyMs: Date.now() - startedAt,
        };
      }

      return {
        ok: true,
        statusCode: "SUCCESS",
        message: "Koneksi berhasil.",
        provider,
        model: candidateModel,
        latencyMs: Date.now() - startedAt,
      };
    }

    const endpoint = provider === "grok" ? GROQ_CHAT_URL : NVIDIA_CHAT_URL;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${candidateKey}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: candidateModel,
        messages: [
          { role: "system", content: "Jawab singkat." },
          { role: "user", content: "Jawab satu kata: OK." },
        ],
        temperature: 0,
        max_tokens: 16,
      }),
    });

    const rawBody = await response.text().catch(() => "");
    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      let parsedContent = "";
      try {
        const json = JSON.parse(rawBody) as {
          choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
        };
        parsedContent =
          json.choices?.[0]?.message?.content?.trim() ||
          json.choices?.[0]?.message?.reasoning_content?.trim() ||
          "";
      } catch {
        parsedContent = "";
      }

      if (!parsedContent && !rawBody) {
        return {
          ok: false,
          statusCode: "PROVIDER_UNREACHABLE",
          message: "Provider tidak dapat dihubungi.",
          provider,
          model: candidateModel,
          latencyMs,
        };
      }

      return {
        ok: true,
        statusCode: "SUCCESS",
        message: "Koneksi berhasil.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    const lowerBody = rawBody.toLowerCase();
    if (
      response.status === 401 ||
      lowerBody.includes("invalid api key") ||
      lowerBody.includes("invalid_api_key") ||
      lowerBody.includes("api_key_invalid") ||
      lowerBody.includes("unauthorized") ||
      lowerBody.includes("authentication") ||
      lowerBody.includes("authorization failed")
    ) {
      return {
        ok: false,
        statusCode: "INVALID_API_KEY",
        message: "API Key tidak valid atau ditolak oleh server provider.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (
      response.status === 404 ||
      lowerBody.includes("model_not_found") ||
      lowerBody.includes("does not exist") ||
      lowerBody.includes("unknown model") ||
      lowerBody.includes("not found")
    ) {
      return {
        ok: false,
        statusCode: "MODEL_UNAVAILABLE",
        message: "Model AI tidak tersedia pada endpoint provider.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (response.status === 429 || lowerBody.includes("rate limit") || lowerBody.includes("quota")) {
      return {
        ok: false,
        statusCode: "QUOTA_OR_RATE_LIMIT",
        message: "Batas kuota penggunaan (rate limit) provider telah tercapai.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (response.status === 403) {
      return {
        ok: false,
        statusCode: "PROVIDER_UNREACHABLE",
        message: "Akses ke server provider ditolak (HTTP 403) atau diblokir oleh jaringan.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    return {
      ok: false,
      statusCode: "PROVIDER_UNREACHABLE",
      message: "Provider tidak dapat dihubungi (HTTP " + response.status + ").",
      provider,
      model: candidateModel,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const rawMsg = err instanceof Error ? err.message : String(err);
    const msg = sanitizeSecretText(rawMsg, [candidateKey]).toLowerCase();

    if (
      msg.includes("api_key_invalid") ||
      msg.includes("api key not valid") ||
      msg.includes("invalid api key") ||
      msg.includes("401") ||
      msg.includes("unauthorized")
    ) {
      return {
        ok: false,
        statusCode: "INVALID_API_KEY",
        message: "API Key tidak valid atau ditolak oleh server provider.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (
      msg.includes("model") &&
      (msg.includes("not found") || msg.includes("404") || msg.includes("not supported"))
    ) {
      return {
        ok: false,
        statusCode: "MODEL_UNAVAILABLE",
        message: "Model AI tidak tersedia pada endpoint provider.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
      return {
        ok: false,
        statusCode: "QUOTA_OR_RATE_LIMIT",
        message: "Batas kuota penggunaan (rate limit) provider telah tercapai.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    if (msg.includes("timeout") || msg.includes("abort")) {
      return {
        ok: false,
        statusCode: "PROVIDER_UNREACHABLE",
        message: "Waktu koneksi habis (timeout). Server provider sedang lambat atau koneksi internet terputus.",
        provider,
        model: candidateModel,
        latencyMs,
      };
    }

    return {
      ok: false,
      statusCode: "PROVIDER_UNREACHABLE",
      message: "Tidak dapat terhubung ke server provider AI. Periksa koneksi internet Anda.",
      provider,
      model: candidateModel,
      latencyMs,
    };
  }
}

