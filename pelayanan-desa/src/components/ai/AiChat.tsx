"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Trash2, User, Sparkles, AlertCircle, Clock } from "lucide-react";
import AiRobotHead from "@/components/ai/AiRobotHead";
import AiVersionSelector, {
  DEFAULT_AI_VERSIONS,
  getAiVersionBadgeInfo,
  mergeVersionMetadata,
  type UnifiedAiVersionOption,
} from "@/components/ai/AiVersionSelector";
import type { AiProviderType, AiVersionId, AiVersionInfo } from "@/lib/ai/types";
import type { Role } from "@prisma/client";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  provider?: AiProviderType;
  version?: AiVersionId;
  versionLabel?: string;
  model?: string;
};

interface RolePreset {
  channelName: string;
  subtitle: string;
  roleBadge: string;
  roleColor: string;
  actorLabel: string;
  welcome: string;
  prompts: string[];
  placeholder: string;
}

const ROLE_PRESETS: Record<Role, RolePreset> = {
  WARGA: {
    channelName: "Kanal Pelayanan Warga",
    subtitle: "Panduan persyaratan, formulir, perbaikan dokumen, & alur status",
    roleBadge: "🟢 Warga Desa",
    roleColor: "#10b981",
    actorLabel: "Ibu Rina Wati (Warga)",
    welcome:
      "Halo! 👋 Saya Asisten Pelayanan Desa untuk Warga.\n\nSaya siap memberikan informasi dan panduan seputar:\n" +
      "1. 📄 Pengajuan & persyaratan resmi SKTM (Surat Keterangan Tidak Mampu)\n" +
      "2. 👮 Pengajuan & persyaratan resmi Surat Pengantar Pembuatan SKCK\n" +
      "3. 📝 Cara mengisi formulir dan mengunggah dokumen\n" +
      "4. 🔍 Memeriksa status pengajuan milik Anda yang sedang login\n" +
      "5. ⚠️ Memeriksa apakah dokumen Anda perlu diperbaiki\n" +
      "6. 🔄 Panduan tahapan proses pengajuan resmi desa\n\n" +
      "Ada yang bisa saya bantu?",
    prompts: [
      "Status Pengajuan Saya",
      "Apakah Dokumen Saya Perlu Diperbaiki?",
      "Syarat Dokumen SKTM",
      "Syarat Dokumen SKCK",
      "Bagaimana Alur Tahapan Pelayanan Desa?",
    ],
    placeholder: "Tanyakan status pengajuan, perbaikan berkas, syarat SKTM/SKCK...",
  },
  STAF: {
    channelName: "Kanal Verifikasi & Administrasi Staf",
    subtitle: "Pengecekan antrean database, kelengkapan berkas, draf revisi, & SOP verifikasi",
    roleBadge: "🔵 Staf Verifikator",
    roleColor: "#3b82f6",
    actorLabel: "Bapak Agus Wijaya (Staf)",
    welcome:
      "Halo Rekan Staf Desa, Bapak Agus Wijaya! 👋 Saya Asisten Pelayanan Desa bidang Verifikasi & Administrasi.\n\nSaya terhubung langsung dengan database desa dan siap membantu tugas verifikasi Anda:\n" +
      "1. 📊 Menampilkan jumlah pengajuan yang menunggu verifikasi staf (status DIAJUKAN)\n" +
      "2. 🔍 Mencari pengajuan berdasarkan nomor pengajuan atau nama pemohon\n" +
      "3. 📑 Memeriksa kelengkapan dokumen berdasarkan persyaratan yang tersimpan di sistem\n" +
      "4. ⚠️ Menjelaskan pengajuan yang berstatus PERLU_PERBAIKAN dan draf catatan koreksinya\n" +
      "5. 📋 Membantu memahami prosedur verifikasi standar (SOP desa)\n\n" +
      "🔒 *Catatan Keamanan:* Tindakan administratif resmi (persetujuan, penolakan, perubahan status) dilakukan melalui tombol resmi pada sistem.\n\n" +
      "Ada pengajuan atau antrean yang ingin Anda periksa?",
    prompts: [
      "Jumlah Pengajuan Menunggu Verifikasi",
      "Cari Pengajuan PD-202610-0003",
      "Cek Kelengkapan Dokumen PD-202610-0003",
      "Pengajuan Perlu Perbaikan",
      "Prosedur Verifikasi (SOP)",
    ],
    placeholder: "Cari pengajuan, cek kelengkapan dokumen, antrian verifikasi, atau SOP...",
  },
  SUPERVISOR: {
    channelName: "Kanal Pemantauan Operasional & Aktor",
    subtitle: "Pemantauan aktor database, kelancaran alur pelayanan, deteksi kendala, & laporan",
    roleBadge: "🟣 Supervisor (Pemantauan)",
    roleColor: "#8b5cf6",
    actorLabel: "Ibu Sari Dewi (Supervisor)",
    welcome:
      "Halo Ibu Sari Dewi (Supervisor Desa)! 👋 Saya Asisten Pelayanan Desa untuk Pemantauan Operasional Sistem.\n\nSaya siap membantu pengawasan operasional dan pemantauan data sistem:\n" +
      "1. 👥 Pemantauan aktor sistem & data kependudukan warga di database\n" +
      "2. 📊 Pemantauan kelancaran alur pengajuan (Warga ➔ Staf Desa ➔ Kepala Desa)\n" +
      "3. ⚠️ Deteksi potensi kendala berkas atau keterlambatan antrean staf & kades\n" +
      "4. 📈 Statistik proses pengajuan dan ringkasan audit log operasional\n" +
      "5. 📑 Ringkasan laporan pelayanan desa real-time\n\n" +
      "🔒 *Catatan Kewenangan:* Supervisor bertugas memantau sistem dan membantu mengatasi kendala operasional, serta tidak mengambil alih keputusan resmi Kepala Desa.\n\n" +
      "Ada indikator alur pelayanan atau data aktor di database yang ingin Anda pantau?",
    prompts: [
      "Pemantauan Aktor di Database",
      "Status Alur Pengajuan Berjalan",
      "Deteksi Kendala Antrean Pelayanan",
      "Statistik Proses Pengajuan",
      "Ringkasan Laporan Pelayanan",
    ],
    placeholder: "Pantau aktor database, kelancaran alur, kendala antrean, atau laporan...",
  },
  KEPALA_DESA: {
    channelName: "Kanal Eksekutif & Monitoring Kepala Desa",
    subtitle: "Ringkasan SKTM & SKCK, status pengajuan, laporan statistik, audit log, & demografi",
    roleBadge: "👑 Kepala Desa (Approval)",
    roleColor: "#f59e0b",
    actorLabel: "Bapak Budi Santoso (Kades)",
    welcome:
      "Selamat datang Bapak Budi Santoso (Kepala Desa)! 🏛️ Saya Asisten Pelayanan Desa untuk Monitoring dan Administrasi.\n\nSaya siap membantu pengawasan dan tata kelola administrasi berbasis database desa sesuai hak izin akses (RBAC):\n" +
      "1. 📑 Menampilkan ringkasan pengajuan SKTM dan Surat Pengantar Pembuatan SKCK\n" +
      "2. 📊 Menampilkan jumlah pengajuan berdasarkan 9 status alur kerja sistem\n" +
      "3. 📈 Menampilkan laporan dan statistik pelayanan desa yang tersedia\n" +
      "4. 🔍 Membantu menemukan pengajuan berdasarkan kriteria yang diizinkan\n" +
      "5. ⏱️ Memberikan ringkasan aktivitas proses pelayanan\n" +
      "6. 🛡️ Menemukan informasi audit log sesuai hak izin akses eksekutif\n" +
      "7. 👥 Membaca database: jumlah warga terdaftar dan rincian jenis kelaminnya\n\n" +
      "🔒 *Catatan Keamanan (RBAC):* Chatbot tidak memberikan persetujuan otomatis via chat dan tidak membocorkan kata sandi. Keputusan resmi diproses melalui tombol aksi di menu Persetujuan.\n\n" +
      "Ada aspek monitoring berkas, data kependudukan, atau laporan yang ingin Anda periksa?",
    prompts: [
      "Ringkasan Pengajuan SKTM & SKCK",
      "Jumlah Pengajuan Berdasarkan Status",
      "Laporan dan Statistik yang Tersedia",
      "Jumlah Warga dan Jenis Kelamin",
      "Ringkasan Aktivitas Proses Pelayanan",
      "Informasi Audit Log",
    ],
    placeholder: "Tanyakan ringkasan SKTM/SKCK, status pengajuan, demografi warga, atau audit log...",
  },
};

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Render aman teks terformat dengan dukungan link markdown [title](url),
 * inline code `code`, bold **text**, dan baris baru.
 */
function renderFormattedContent(content: string) {
  const lines = content.split("\n");
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/;

  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const match = remaining.match(regex);
      if (!match || match.index === undefined) {
        parts.push(remaining);
        break;
      }

      if (match.index > 0) {
        parts.push(remaining.substring(0, match.index));
      }

      const fullMatch = match[0];
      if (fullMatch.startsWith("[") && match[2] && match[3]) {
        const label = match[2];
        const url = match[3];
        parts.push(
          <a
            key={`l-${lineIdx}-${keyIdx++}`}
            href={url}
            style={{
              color: "#4f46e5",
              fontWeight: 700,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {label}
          </a>
        );
      } else if (fullMatch.startsWith("`") && match[4]) {
        parts.push(
          <code
            key={`c-${lineIdx}-${keyIdx++}`}
            style={{
              background: "rgba(79, 70, 229, 0.08)",
              color: "#4338ca",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: "0.88em",
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            {match[4]}
          </code>
        );
      } else if (fullMatch.startsWith("**") && match[5]) {
        parts.push(
          <strong key={`b-${lineIdx}-${keyIdx++}`} style={{ fontWeight: 700 }}>
            {match[5]}
          </strong>
        );
      }

      remaining = remaining.substring(match.index + fullMatch.length);
    }

    return (
      <span key={`line-${lineIdx}`} style={{ display: "block", minHeight: line.length === 0 ? "0.6em" : undefined }}>
        {parts.length > 0 ? parts : "\u00A0"}
      </span>
    );
  });
}

interface AiChatProps {
  role?: Role;
  initialIsGeminiConfigured?: boolean;
}

export default function AiChat({ role = "WARGA" }: AiChatProps) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.WARGA;
  const storageKey = `pelayanan-desa-ai-history-${role.toLowerCase()}`;

  const defaultWelcome: Message = {
    role: "assistant",
    content: preset.welcome,
    timestamp: "Sistem",
  };

  const [messages, setMessages] = useState<Message[]>([defaultWelcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeVersion, setActiveVersion] = useState<AiVersionId>("standard");
  const [availableVersions, setAvailableVersions] = useState<UnifiedAiVersionOption[]>(DEFAULT_AI_VERSIONS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Muat daftar versi AI yang tersedia saat komponen dimuat (dengan cache-busting)
  useEffect(() => {
    fetch(`/api/ai/chat?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => {
        if (!res.ok) {
          return fetch(`/api/ai/public-chat?_t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }).then((r) => r.json());
        }
        return res.json();
      })
      .then((data: { versions?: AiVersionInfo[]; defaultVersion?: AiVersionId }) => {
        if (data?.versions && Array.isArray(data.versions)) {
          setAvailableVersions(mergeVersionMetadata(data.versions));
        }
        if (data?.defaultVersion) {
          setActiveVersion(data.defaultVersion);
        }
      })
      .catch(() => {});
  }, []);

  // Muat riwayat percakapan dari localStorage jika ada
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, [storageKey]);

  // Simpan riwayat percakapan ke localStorage saat berubah
  useEffect(() => {
    try {
      if (messages.length > 1) {
        window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
      }
    } catch {}
  }, [messages, storageKey]);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage(textToSend?: string) {
    const rawText = textToSend !== undefined ? textToSend : input;
    const message = rawText.trim();
    if (!message || loading) return;

    const seq = ++requestSeqRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const time = formatCurrentTime();
    const priorHistory = messages;
    setInput("");
    setError("");

    const next: Message[] = [...priorHistory, { role: "user", content: message, timestamp: time }];
    setMessages(next);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          version: activeVersion,
          history: priorHistory.slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
            version: m.version,
            provider: m.provider,
            model: m.model,
          })),
        }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        provider?: AiProviderType;
        version?: AiVersionId;
        versionLabel?: string;
        model?: string;
      };
      if (seq !== requestSeqRef.current) return;
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("⚠️ Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu 1 menit sebelum mengirim pesan lagi.");
        }
        if (response.status === 401) {
          throw new Error("🔒 Sesi login Anda telah berakhir. Silakan muat ulang halaman atau login kembali.");
        }
        throw new Error(data.error || "Gagal memproses pertanyaan.");
      }

      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer || "Informasi belum tersedia saat ini.",
          timestamp: formatCurrentTime(),
          provider: data.provider,
          version: data.version || activeVersion,
          versionLabel: data.versionLabel,
          model: data.model,
        },
      ]);
    } catch (caught) {
      if (seq !== requestSeqRef.current || (caught instanceof DOMException && caught.name === "AbortError")) {
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Data status belum dapat diperiksa saat ini. Silakan coba kembali."
      );
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    handleSendMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function clearHistory() {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    setLoading(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
    setMessages([
      {
        role: "assistant",
        content: preset.welcome,
        timestamp: formatCurrentTime(),
      },
    ]);
    setError("");
  }

  return (
    <div
      className="aichat-container"
      style={{
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 24,
        boxShadow: "0 14px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.8)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 250px)",
        minHeight: 560,
        border: "1px solid rgba(226, 232, 240, 0.8)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. Header dengan nama “Asisten Pelayanan Desa” & Indikator Role */}
      {/* ============================================================ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          zIndex: 10,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Ikon chatbot konsisten */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              boxShadow: "0 6px 16px rgba(79,70,229,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AiRobotHead size={36} animated={false} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                Asisten Pelayanan Desa
              </h2>
              {/* Indikator Role Pengguna */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: `${preset.roleColor}15`,
                  color: preset.roleColor,
                  border: `1px solid ${preset.roleColor}35`,
                  letterSpacing: "0.01em",
                }}
              >
                {preset.roleBadge}
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              {loading ? "⏳ Sedang merumuskan jawaban berbasis data..." : preset.subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={clearHistory}
            type="button"
            title="Bersihkan riwayat percakapan"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 700,
              transition: "all 0.2s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fee2e2";
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
              (e.currentTarget as HTMLElement).style.borderColor = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#ffffff";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
              (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
            }}
          >
            <Trash2 size={14} /> Bersihkan Riwayat
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. Area Percakapan (Messages Feed) */}
      {/* ============================================================ */}
      <div
        className="aichat-feed"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
        aria-live="polite"
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div
              key={`${index}-${message.role}`}
              style={{
                display: "flex",
                gap: 12,
                justifyContent: isUser ? "flex-end" : "flex-start",
                alignItems: "flex-end",
              }}
            >
              {/* Avatar AI */}
              {!isUser && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    boxShadow: "0 3px 10px rgba(79,70,229,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                  aria-hidden="true"
                >
                  <AiRobotHead size={26} animated={false} />
                </div>
              )}

              {/* Bubble Chat */}
              <div
                style={{
                  maxWidth: "82%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    background: isUser
                      ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                      : "#ffffff",
                    color: isUser ? "#ffffff" : "#0f172a",
                    borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                    padding: "14px 18px",
                    boxShadow: isUser
                      ? "0 4px 14px rgba(79, 70, 229, 0.28)"
                      : "0 4px 16px rgba(0,0,0,0.04)",
                    border: isUser ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
                    fontSize: 14,
                    lineHeight: 1.65,
                    wordBreak: "break-word",
                  }}
                >
                  {isUser ? message.content : renderFormattedContent(message.content)}
                </div>

                {/* Waktu Pesan & Provider Badge jika tersedia */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    color: isUser ? "#6366f1" : "#94a3b8",
                    marginTop: 4,
                    padding: "0 4px",
                  }}
                >
                  {message.timestamp && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} />
                      <span>{message.timestamp}</span>
                    </span>
                  )}
                  {!isUser && (message.version || message.provider) && (() => {
                    const badge = getAiVersionBadgeInfo(message.version, message.versionLabel, message.provider);
                    return (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Avatar User */}
              {isUser && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    minWidth: 34,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
                    boxShadow: "0 2px 8px rgba(14, 165, 233, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    marginBottom: 4,
                  }}
                  aria-hidden="true"
                >
                  <User size={18} />
                </div>
              )}
            </div>
          );
        })}

        {/* Indikator Sedang Memproses (Loading Animation) */}
        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div
              style={{
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 3px 10px rgba(79,70,229,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <AiRobotHead size={26} animated={false} />
            </div>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px 20px 20px 4px",
                padding: "14px 18px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#4f46e5",
                      animation: `aichat-bounce 1s infinite ${i * 0.16}s`,
                    }}
                  />
                ))}
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginLeft: 6 }}>
                  Sedang memeriksa data aktual...
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Asisten menyaring data berdasarkan kewenangan hak akses dan menyusun jawaban akurat.
              </span>
            </div>
          </div>
        )}

        {/* Pesan Error yang Mudah Dipahami */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "14px 18px",
              borderRadius: 16,
              fontSize: 13.5,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)",
            }}
            role="alert"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={20} color="#dc2626" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError("")}
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              Tutup
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ============================================================ */}
      {/* 3. Tampilan Awal: Contoh Pertanyaan Sesuai Role (Suggestion Pills) */}
      {/* ============================================================ */}
      <div
        style={{
          padding: "12px 20px 16px",
          background: "#ffffff",
          borderTop: "1px solid rgba(226, 232, 240, 0.8)",
        }}
      >
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="#4f46e5" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Contoh Pertanyaan ({preset.roleBadge}):
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "none",
          }}
        >
          {preset.prompts.map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleSendMessage(promptText)}
              disabled={loading}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(79, 70, 229, 0.07)",
                color: "#4338ca",
                border: "1px solid rgba(79, 70, 229, 0.2)",
                cursor: loading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(79,70,229,0.04)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(79, 70, 229, 0.14)";
                  (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(79, 70, 229, 0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(79, 70, 229, 0.2)";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* 4. Input Pesan: Enter Kirim, Shift+Enter Baris Baru, Tombol Kirim */}
        {/* ============================================================ */}
        <form
          onSubmit={submit}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: 18,
            border: "1px solid #cbd5e1",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
            marginTop: 6,
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={1000}
            rows={1}
            placeholder={preset.placeholder}
            aria-label="Pertanyaan untuk asisten pelayanan desa"
            style={{
              flex: 1,
              border: "none",
              padding: "8px 6px",
              fontSize: 14,
              color: "#0f172a",
              outline: "none",
              fontFamily: "inherit",
              background: "transparent",
              resize: "none",
              maxHeight: 120,
              minHeight: 28,
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Kirim Pesan"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "none",
              background:
                loading || !input.trim()
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: loading || !input.trim() ? "#94a3b8" : "#ffffff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow:
                loading || !input.trim()
                  ? "none"
                  : "0 4px 14px rgba(79,70,229,0.38)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "none";
            }}
          >
            <Send size={18} />
          </button>
        </form>

        {/* Pilihan Versi AI di Bawah */}
        <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <AiVersionSelector
            activeVersion={activeVersion}
            onChange={(ver) => {
              setActiveVersion(ver);
              setError("");
            }}
            versions={availableVersions}
            disabled={loading}
            compact={false}
          />
        </div>

        {/* Petunjuk Pintasan Keyboard */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            padding: "0 4px",
            fontSize: 11,
            color: "#64748b",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span>
            💡 <strong>Enter ↵</strong> untuk kirim • <strong>Shift + Enter</strong> untuk baris baru
          </span>
          <span style={{ fontWeight: 500 }}>
            {role === "WARGA"
              ? "🔒 Hak akses dibatasi pada data pribadi pemohon"
              : "🔒 Berbasis RBAC & query database aktual"}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes aichat-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-7px); opacity: 1; }
        }
        @media (max-width: 640px) {
          .aichat-container {
            height: calc(100vh - 180px) !important;
            min-height: 480px !important;
            border-radius: 16px !important;
          }
          .aichat-feed {
            padding: 16px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
