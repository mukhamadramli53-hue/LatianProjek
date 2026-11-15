"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  PlugZap,
  Save,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Bot,
  Zap,
} from "lucide-react";
import type { AiProviderType } from "@/lib/ai/types";
import type {
  SafeAiConfigSnapshot,
  SafeProviderConfigView,
  ConnectionTestResult,
} from "@/lib/ai/config-store";

interface AiConfigClientProps {
  initialConfig: SafeAiConfigSnapshot;
}

interface ProviderMeta {
  id: "grok" | "gemini";
  name: string;
  shortName: string;
  defaultModel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  borderActive: string;
  pillBg: string;
  icon: typeof Sparkles;
}

const SUPPORTED_PROVIDERS: ProviderMeta[] = [
  {
    id: "grok",
    name: "Grok AI",
    shortName: "Grok",
    defaultModel: "qwen/qwen3.8-27b",
    description: "Inference cepat Grok AI untuk respon cerdas dan analisis pelayanan desa.",
    badgeBg: "linear-gradient(310deg, #1e293b 0%, #334155 100%)",
    badgeText: "#f8fafc",
    borderActive: "#64748b",
    pillBg: "#f1f5f9",
    icon: Zap,
  },
  {
    id: "gemini",
    name: "Gemini AI Studio",
    shortName: "Gemini",
    defaultModel: "gemini-3.1-flash-lite",
    description: "Google AI Studio / Gemini untuk analisis cerdas, pelaporan, dan monitoring desa.",
    badgeBg: "linear-gradient(310deg, #1a73e8 0%, #4285f4 100%)",
    badgeText: "#ffffff",
    borderActive: "#1a73e8",
    pillBg: "#eff6ff",
    icon: Sparkles,
  },
];

export default function AiConfigClient({ initialConfig }: AiConfigClientProps) {
  const [config, setConfig] = useState<SafeAiConfigSnapshot>(initialConfig);

  // Default provider aktif di UI hanya antara Grok AI atau Gemini AI Studio
  const initialActive =
    initialConfig.activeProvider === "grok" || initialConfig.activeProvider === "gemini"
      ? initialConfig.activeProvider
      : "grok";

  const [activeProvider, setActiveProvider] = useState<"grok" | "gemini">(initialActive);

  // Input teks API Key terpasang per provider (disembunyikan secara default, dapat ditampilkan via ikon mata)
  const [apiKeys, setApiKeys] = useState<{ grok: string; gemini: string }>(() => ({
    grok: initialConfig.providers.find((p) => p.id === "grok")?.apiKey || "",
    gemini: initialConfig.providers.find((p) => p.id === "gemini")?.apiKey || "",
  }));

  // Toggle tampilkan / sembunyikan karakter API Key
  const [showKeys, setShowKeys] = useState<{ grok: boolean; gemini: boolean }>({
    grok: false,
    gemini: false,
  });

  // State loading dan feedback
  const [testingId, setTestingId] = useState<"grok" | "gemini" | null>(null);
  const [savingId, setSavingId] = useState<"grok" | "gemini" | "active" | null>(null);
  const [testResults, setTestResults] = useState<{
    grok?: ConnectionTestResult;
    gemini?: ConnectionTestResult;
  }>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper mendapatkan konfigurasi provider dari snapshot server
  function getProviderView(id: "grok" | "gemini"): SafeProviderConfigView | undefined {
    return config.providers.find((p) => p.id === id);
  }

  // Cek apakah provider memiliki key yang sudah tersimpan atau sedang diketik
  function hasKey(id: "grok" | "gemini"): boolean {
    const view = getProviderView(id);
    return Boolean(view?.hasApiKey || apiKeys[id].trim().length > 0);
  }

  // 1. Aksi Uji Koneksi API Key
  async function handleTestConnection(providerId: "grok" | "gemini") {
    setTestingId(providerId);
    setBanner(null);

    const meta = SUPPORTED_PROVIDERS.find((p) => p.id === providerId)!;
    const typedKey = apiKeys[providerId].trim();

    try {
      const res = await fetch("/api/kades/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          model: meta.defaultModel,
          ...(typedKey ? { apiKey: typedKey } : {}),
        }),
      });

      const data = (await res.json()) as ConnectionTestResult & { error?: string };
      if (!res.ok && data.error) {
        setTestResults((prev) => ({
          ...prev,
          [providerId]: {
            ok: false,
            statusCode: "PROVIDER_UNREACHABLE",
            message: data.error || "Gagal menguji koneksi.",
            provider: providerId,
            model: meta.defaultModel,
            latencyMs: 0,
          },
        }));
        return;
      }

      setTestResults((prev) => ({
        ...prev,
        [providerId]: data,
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          ok: false,
          statusCode: "PROVIDER_UNREACHABLE",
          message: "Tidak dapat terhubung ke server provider AI. Periksa koneksi internet Anda.",
          provider: providerId,
          model: meta.defaultModel,
          latencyMs: 0,
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  // 2. Aksi Simpan / Ganti API Key untuk satu provider
  async function handleSaveKey(providerId: "grok" | "gemini") {
    setBanner(null);
    setSavingId(providerId);

    const meta = SUPPORTED_PROVIDERS.find((p) => p.id === providerId)!;
    const typedKey = apiKeys[providerId].trim();

    if (!typedKey && !getProviderView(providerId)?.hasApiKey) {
      setBanner({
        type: "error",
        text: `Masukkan API Key ${meta.name} terlebih dahulu sebelum menyimpan.`,
      });
      setSavingId(null);
      return;
    }

    try {
      const payload: {
        activeProvider?: AiProviderType;
        providers: Record<string, { apiKey?: string; selectedModel?: string }>;
      } = {
        activeProvider: activeProvider,
        providers: {
          [providerId]: {
            selectedModel: meta.defaultModel,
            ...(typedKey ? { apiKey: typedKey } : {}),
          },
        },
      };

      const res = await fetch("/api/kades/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        config?: SafeAiConfigSnapshot;
      };

      if (!res.ok || !data.config) {
        throw new Error(data.error || `Gagal menyimpan API Key ${meta.name}.`);
      }

      // Berhasil: perbarui snapshot state dan sinkronkan input teks dengan kunci tersimpan
      setConfig(data.config);
      const savedKey = data.config.providers.find((p) => p.id === providerId)?.apiKey || typedKey;
      setApiKeys((prev) => ({ ...prev, [providerId]: savedKey }));
      setTestResults((prev) => ({ ...prev, [providerId]: undefined }));

      setBanner({
        type: "success",
        text: typedKey
          ? `API Key ${meta.name} baru berhasil diuji, dienkripsi, dan disimpan ke sistem.`
          : `Konfigurasi ${meta.name} berhasil diperbarui.`,
      });
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan API Key.",
      });
    } finally {
      setSavingId(null);
    }
  }

  // 3. Aksi Simpan Provider Aktif Chatbot
  async function handleSaveActiveProvider(targetId: "grok" | "gemini") {
    setBanner(null);
    setSavingId("active");

    const meta = SUPPORTED_PROVIDERS.find((p) => p.id === targetId)!;
    if (!hasKey(targetId)) {
      setBanner({
        type: "error",
        text: `${meta.name} belum memiliki API Key. Masukkan dan simpan API Key ${meta.name} terlebih dahulu.`,
      });
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch("/api/kades/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider: targetId,
          providers: {
            [targetId]: {
              selectedModel: meta.defaultModel,
            },
          },
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        config?: SafeAiConfigSnapshot;
      };

      if (!res.ok || !data.config) {
        throw new Error(data.error || "Gagal mengubah provider aktif.");
      }

      setConfig(data.config);
      setActiveProvider(targetId);
      setBanner({
        type: "success",
        text: `${meta.name} sekarang aktif digunakan oleh AI Chatbot Kepala Desa.`,
      });
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal menyimpan pilihan provider aktif.",
      });
    } finally {
      setSavingId(null);
    }
  }

  // 4. Muat ulang dari DB
  async function handleRefresh() {
    setBanner(null);
    try {
      const res = await fetch(`/api/kades/ai-config?_t=${Date.now()}`, { cache: "no-store" });
      const data = (await res.json()) as { config?: SafeAiConfigSnapshot; error?: string };
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Gagal memuat ulang data.");
      }
      setConfig(data.config);
      if (data.config.activeProvider === "grok" || data.config.activeProvider === "gemini") {
        setActiveProvider(data.config.activeProvider);
      }
      setApiKeys({
        grok: data.config.providers.find((p) => p.id === "grok")?.apiKey || "",
        gemini: data.config.providers.find((p) => p.id === "gemini")?.apiKey || "",
      });
      setBanner({
        type: "success",
        text: "Konfigurasi terbaru berhasil dimuat dari database.",
      });
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal memuat konfigurasi.",
      });
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1080px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Notifikasi Banner Status */}
      {banner && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderRadius: "12px",
            background: banner.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${banner.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: banner.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "13.5px",
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
          }}
        >
          {banner.type === "success" ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* SEKSI 1: Pilihan Provider AI Aktif Chatbot */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(310deg, #5e72e4 0%, #2dcecc 100%)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={18} />
              </span>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Provider AI Aktif (Chatbot Kepala Desa)
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Pilih provider yang digunakan oleh Chatbot untuk menjawab pertanyaan dan membaca database desa.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Muat Ulang
          </button>
        </div>

        {/* Kartu Pilihan AI Aktif: Grok AI vs Gemini AI Studio */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {SUPPORTED_PROVIDERS.map((provider) => {
            const isCurrentlyActive = config.activeProvider === provider.id;
            const isSelected = activeProvider === provider.id;
            const keyConfigured = hasKey(provider.id);
            const Icon = provider.icon;

            return (
              <div
                key={provider.id}
                style={{
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: isCurrentlyActive
                    ? "2px solid #10b981"
                    : isSelected
                    ? "2px solid #5e72e4"
                    : "1px solid #e2e8f0",
                  background: isCurrentlyActive
                    ? "#f0fdf4"
                    : isSelected
                    ? "#f8faff"
                    : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: provider.badgeBg,
                        color: provider.badgeText,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                        {provider.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Model: {provider.defaultModel}
                      </div>
                    </div>
                  </div>

                  {isCurrentlyActive ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: "999px",
                        background: "#d1fae5",
                        color: "#065f46",
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                      Aktif di Sistem
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        background: keyConfigured ? "#f1f5f9" : "#fff7ed",
                        color: keyConfigured ? "#475569" : "#c2410c",
                      }}
                    >
                      {keyConfigured ? "Siap Dipakai" : "Key Belum Diisi"}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {isCurrentlyActive ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        border: "1px solid #a7f3d0",
                        background: "#ffffff",
                        color: "#059669",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "default",
                      }}
                    >
                      ✓ Sedang Aktif
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingId === "active" || !keyConfigured}
                      onClick={() => handleSaveActiveProvider(provider.id)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background:
                          !keyConfigured || savingId === "active"
                            ? "#cbd5e1"
                            : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: !keyConfigured || savingId === "active" ? "not-allowed" : "pointer",
                        boxShadow: keyConfigured ? "0 4px 10px rgba(94, 114, 228, 0.25)" : "none",
                      }}
                    >
                      {savingId === "active" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        `Aktifkan ${provider.shortName}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEKSI 2: Kartu Pengaturan API Key Sederhana (Grok AI & Gemini AI Studio) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {SUPPORTED_PROVIDERS.map((provider) => {
          const view = getProviderView(provider.id);
          const typedKey = apiKeys[provider.id];
          const showKey = showKeys[provider.id];
          const hasSavedKey = Boolean(view?.hasApiKey);
          const isTesting = testingId === provider.id;
          const isSaving = savingId === provider.id;
          const testRes = testResults[provider.id];

          // Status koneksi: Terhubung (hijau) atau Belum Terhubung (abu/merah)
          const isConnected =
            testRes !== undefined ? testRes.ok : hasSavedKey;

          return (
            <div
              key={provider.id}
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* 1. Header: Nama Provider & Status Koneksi */}
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    {provider.name}
                  </h3>
                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                    Model: <code style={{ color: "#334155", fontWeight: 600 }}>{provider.defaultModel}</code>
                  </div>
                </div>

                {/* 2. Status Koneksi: Terhubung atau Belum Terhubung */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 11px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: isConnected ? "#ecfdf5" : "#f1f5f9",
                    color: isConnected ? "#047857" : "#64748b",
                    border: `1px solid ${isConnected ? "#a7f3d0" : "#cbd5e1"}`,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: isConnected ? "#10b981" : "#94a3b8",
                    }}
                  />
                  {isConnected ? "Terhubung" : "Belum Terhubung"}
                </div>
              </div>

              {/* Konten Input & Aksi */}
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  flex: 1,
                }}
              >
                {/* 3 & 4. Kolom API Key + Tombol Tampilkan/Sembunyikan */}
                <div>
                  <label
                    htmlFor={`input-${provider.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1e293b",
                      marginBottom: "6px",
                    }}
                  >
                    <KeyRound size={14} />
                    API Key {provider.name}
                  </label>

                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      id={`input-${provider.id}`}
                      type={showKey ? "text" : "password"}
                      autoComplete="new-password"
                      value={typedKey}
                      onChange={(e) =>
                        setApiKeys((prev) => ({
                          ...prev,
                          [provider.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        hasSavedKey
                          ? "•••••••••••••••••••••••• (API Key sudah tersimpan)"
                          : `Masukkan API Key ${provider.name}`
                      }
                      style={{
                        width: "100%",
                        padding: "10px 42px 10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />

                    {/* Tombol Tampilkan / Sembunyikan */}
                    <button
                      type="button"
                      aria-label={showKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      style={{
                        position: "absolute",
                        right: "8px",
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#64748b" }}>
                    {hasSavedKey
                      ? "API Key tersimpan aman (terenkripsi AES-256). Isi kolom di atas hanya jika ingin menggantinya."
                      : "API Key akan dienkripsi secara aman saat disimpan di server."}
                  </p>
                </div>

                {/* Hasil Uji Koneksi Real-time */}
                {testRes && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      background: testRes.ok ? "#ecfdf5" : "#fef2f2",
                      border: `1px solid ${testRes.ok ? "#a7f3d0" : "#fecaca"}`,
                      color: testRes.ok ? "#065f46" : "#991b1b",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <span>
                      {testRes.ok ? "✅ " : "❌ "}
                      {testRes.message}
                    </span>
                    {testRes.latencyMs > 0 && (
                      <span style={{ fontSize: "11px", fontWeight: 500, opacity: 0.85 }}>
                        Kecepatan respons: {testRes.latencyMs} ms
                      </span>
                    )}
                  </div>
                )}

                {/* 5 & 6. Tombol Uji Koneksi & Tombol Simpan API Key */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "10px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  {/* Tombol Uji Koneksi */}
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() => handleTestConnection(provider.id)}
                    style={{
                      flex: "1 1 120px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: isTesting ? "wait" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isTesting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <PlugZap size={15} />
                    )}
                    {isTesting ? "Menguji..." : "Uji Koneksi"}
                  </button>

                  {/* Tombol Simpan / Ganti API Key */}
                  <button
                    type="button"
                    disabled={isSaving || isTesting}
                    onClick={() => handleSaveKey(provider.id)}
                    style={{
                      flex: "1 1 140px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        isSaving || isTesting
                          ? "#94a3b8"
                          : "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: isSaving || isTesting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(45, 206, 137, 0.25)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSaving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {isSaving
                      ? "Menyimpan..."
                      : typedKey.trim()
                      ? "Simpan API Key Baru"
                      : hasSavedKey
                      ? "Simpan Konfigurasi"
                      : "Simpan API Key"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
