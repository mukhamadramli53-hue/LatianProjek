"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, X, Minimize2, Trash2, Clock, AlertCircle } from "lucide-react";
import AiRobotHead from "@/components/ai/AiRobotHead";
import AiVersionSelector, {
  DEFAULT_AI_VERSIONS,
  getAiVersionBadgeInfo,
  mergeVersionMetadata,
  type UnifiedAiVersionOption,
} from "@/components/ai/AiVersionSelector";
import type { AiProviderType, AiVersionId, AiVersionInfo } from "@/lib/ai/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  provider?: AiProviderType;
  version?: AiVersionId;
  versionLabel?: string;
  model?: string;
};

type ActorRole = "WARGA" | "STAF" | "SUPERVISOR" | "KEPALA_DESA" | "PUBLIC";

interface ActorConfig {
  role: ActorRole;
  bubbleText: string;
  channelSubtitle: string;
  badge: string;
  badgeColor: string;
  welcome: string;
  prompts: string[];
  placeholder: string;
  apiEndpoint: string;
}

const ACTOR_CONFIGS: Record<ActorRole, ActorConfig> = {
  WARGA: {
    role: "WARGA",
    bubbleText: "Tanya Asisten Desa",
    channelSubtitle: "Kanal Pelayanan Warga • Panduan Resmi",
    badge: "🟢 Warga Desa",
    badgeColor: "#10b981",
    welcome:
      "Halo! 👋 Saya Asisten Pelayanan Desa untuk Warga.\n\nSaya siap memandu Anda seputar:\n" +
      "1. 📄 Pengajuan & persyaratan resmi SKTM\n" +
      "2. 👮 Pengajuan & persyaratan resmi Surat Pengantar SKCK\n" +
      "3. 📝 Cara mengisi formulir dan mengunggah dokumen\n" +
      "4. 🔍 Memeriksa status pengajuan milik Anda yang sedang login\n" +
      "5. ⚠️ Memeriksa apakah dokumen Anda perlu diperbaiki\n" +
      "6. 🔄 Panduan tahapan alur proses pengajuan desa\n\n" +
      "Ada yang bisa saya bantu?",
    prompts: [
      "Status Pengajuan Saya",
      "Apakah Dokumen Saya Perlu Diperbaiki?",
      "Syarat Dokumen SKTM",
      "Syarat Dokumen SKCK",
      "Tahapan Pelayanan Desa",
    ],
    placeholder: "Tanyakan status pengajuan, perbaikan berkas, syarat SKTM/SKCK...",
    apiEndpoint: "/api/ai/chat",
  },
  STAF: {
    role: "STAF",
    bubbleText: "Asisten Staf Desa",
    channelSubtitle: "Kanal Verifikasi & Administrasi Staf",
    badge: "🔵 Staf Verifikator",
    badgeColor: "#3b82f6",
    welcome:
      "Halo Rekan Staf Desa, Bapak Agus Wijaya! 👋 Saya Asisten Pelayanan Desa bidang Verifikasi & Administrasi.\n\nSaya terhubung langsung ke database desa untuk membantu:\n" +
      "1. 📊 Jumlah pengajuan yang menunggu verifikasi staf (status DIAJUKAN)\n" +
      "2. 🔍 Pencarian pengajuan berdasarkan nomor atau kriteria pemohon\n" +
      "3. 📑 Pemeriksaan kelengkapan dokumen berdasarkan master data sistem\n" +
      "4. ⚠️ Daftar berkas yang perlu perbaikan (status PERLU_PERBAIKAN) & draf koreksi\n" +
      "5. 📋 Panduan prosedur verifikasi (SOP alur status desa)\n\n" +
      "🔒 *Batasan:* Tindakan administratif resmi dilakukan melalui tombol aksi resmi pada sistem.",
    prompts: [
      "Jumlah Pengajuan Menunggu Verifikasi",
      "Cari Pengajuan PD-202610-0003",
      "Cek Kelengkapan Dokumen PD-202610-0003",
      "Pengajuan Perlu Perbaikan",
      "Prosedur Verifikasi (SOP)",
    ],
    placeholder: "Cari pengajuan, kelengkapan berkas, antrean verifikasi, SOP...",
    apiEndpoint: "/api/ai/chat",
  },
  SUPERVISOR: {
    role: "SUPERVISOR",
    bubbleText: "Asisten Pemantauan",
    channelSubtitle: "Kanal Pemantauan Operasional & Aktor",
    badge: "🟣 Supervisor (Pemantauan)",
    badgeColor: "#8b5cf6",
    welcome:
      "Halo Ibu Sari Dewi (Supervisor Desa)! 👋 Saya Asisten Pelayanan Desa untuk Pemantauan Operasional Sistem.\n\nSaya siap membantu pengawasan kelancaran alur pelayanan dan pemantauan data sistem:\n" +
      "1. 👥 Pemantauan aktor sistem & data kependudukan warga di database\n" +
      "2. 📊 Pemantauan kelancaran alur pengajuan (Warga ➔ Staf Desa ➔ Kepala Desa)\n" +
      "3. ⚠️ Deteksi potensi kendala antrean pemrosesan berkas staf & keputusan kades\n" +
      "4. 📈 Statistik proses pengajuan real-time\n" +
      "5. 📑 Ringkasan laporan operasional sesuai izin akses\n\n" +
      "🔒 *Batasan Kewenangan:* Supervisor bertugas memantau sistem dan tidak mengambil alih keputusan resmi Kepala Desa.",
    prompts: [
      "Pemantauan Aktor di Database",
      "Status Alur Pengajuan Berjalan",
      "Deteksi Kendala Antrean Pelayanan",
      "Statistik Proses Pengajuan",
      "Ringkasan Laporan Pelayanan",
    ],
    placeholder: "Pantau aktor database, kelancaran alur, kendala antrean, atau laporan...",
    apiEndpoint: "/api/ai/chat",
  },
  KEPALA_DESA: {
    role: "KEPALA_DESA",
    bubbleText: "Asisten Eksekutif Kades",
    channelSubtitle: "Kanal Monitoring & Eksekutif Kepala Desa",
    badge: "👑 Kepala Desa (Approval)",
    badgeColor: "#f59e0b",
    welcome:
      "Selamat datang Bapak Budi Santoso (Kepala Desa)! 🏛️ Saya Asisten Pelayanan Desa untuk Monitoring dan Administrasi.\n\nSaya siap membantu pengawasan dan tata kelola administrasi berbasis database desa sesuai izin akses (RBAC):\n" +
      "1. 📑 Ringkasan pengajuan SKTM dan Surat Pengantar Pembuatan SKCK\n" +
      "2. 📊 Jumlah pengajuan berdasarkan status sistem\n" +
      "3. 📈 Laporan dan statistik pelayanan desa yang tersedia\n" +
      "4. 🔍 Pencarian pengajuan berdasarkan kriteria yang diizinkan\n" +
      "5. ⏱️ Ringkasan aktivitas proses pelayanan\n" +
      "6. 🛡️ Informasi audit log (sesuai izin akses eksekutif)\n" +
      "7. 👥 Membaca database: jumlah warga terdaftar dan rincian jenis kelaminnya\n" +
      "8. 📊 Membaca database metrik dashboard utama & aktivitas per hari ini\n\n" +
      "🔒 *Batasan:* Chatbot tidak memberikan persetujuan otomatis via chat dan tidak membocorkan kata sandi. Keputusan resmi dilakukan melalui tombol aksi di menu Persetujuan.",
    prompts: [
      "Data Dashboard & Database Hari Ini",
      "Ringkasan Pengajuan SKTM & SKCK",
      "Jumlah Pengajuan Berdasarkan Status",
      "Jumlah Warga dan Jenis Kelamin",
      "Laporan dan Statistik yang Tersedia",
      "Informasi Audit Log",
    ],
    placeholder: "Baca database dashboard, pengajuan hari ini, ringkasan SKTM/SKCK, audit log...",
    apiEndpoint: "/api/ai/chat",
  },
  PUBLIC: {
    role: "PUBLIC",
    bubbleText: "Tanya Asisten Desa",
    channelSubtitle: "Kanal Informasi Publik Desa",
    badge: "🌐 Publik / Tamu",
    badgeColor: "#64748b",
    welcome:
      "Halo! 👋 Saya Asisten Pelayanan Desa.\n\nSaya siap memberikan informasi dan panduan seputar:\n" +
      "1. 📄 Pengajuan SKTM (Surat Keterangan Tidak Mampu)\n" +
      "2. 👮 Pengajuan Surat Pengantar Pembuatan SKCK\n" +
      "3. 📂 Persyaratan berkas resmi yang tersedia\n" +
      "4. 📝 Cara mendaftar akun dan mengisi formulir\n\n" +
      "Ada yang bisa saya bantu?",
    prompts: [
      "Syarat Dokumen SKTM",
      "Syarat Dokumen SKCK",
      "Tahapan Pelayanan Desa",
      "Cara Mendaftar Akun",
    ],
    placeholder: "Tanyakan seputar SKTM, SKCK, formulir, atau panduan...",
    apiEndpoint: "/api/ai/public-chat",
  },
};

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
              padding: "2px 5px",
              borderRadius: 4,
              fontSize: "0.86em",
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

export default function ActorFloatingChatbot() {
  const pathname = usePathname();

  // Sembunyikan di halaman login atau halaman asisten penuh agar tidak bertumpuk
  if (pathname === "/login" || pathname.endsWith("/asisten")) {
    return null;
  }

  // Deteksi role aktif berdasarkan rute
  let activeRole: ActorRole = "PUBLIC";
  if (pathname.startsWith("/staf")) activeRole = "STAF";
  else if (pathname.startsWith("/supervisor")) activeRole = "SUPERVISOR";
  else if (pathname.startsWith("/kades")) activeRole = "KEPALA_DESA";
  else if (pathname.startsWith("/warga")) activeRole = "WARGA";

  return <ActorFloatingChatbotInner key={activeRole} activeRole={activeRole} />;
}

function ActorFloatingChatbotInner({ activeRole }: { activeRole: ActorRole }) {
  const config = ACTOR_CONFIGS[activeRole];
  const storageKey = `pelayanan-desa-floating-${activeRole.toLowerCase()}`;

  const defaultWelcome: Message = {
    role: "assistant",
    content: config.welcome,
    timestamp: "Sistem",
  };

  const [open, setOpen] = useState(false);
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

  // Periksa daftar versi AI saat komponen aktif (dengan cache-busting)
  useEffect(() => {
    fetch(`${config.apiEndpoint}?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.versions && Array.isArray(data.versions)) {
          setAvailableVersions(mergeVersionMetadata(data.versions as AiVersionInfo[]));
        }
      })
      .catch(() => {});
  }, [config.apiEndpoint]);

  // Bersihkan cache riwayat lama di localStorage agar selalu fresh
  useEffect(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
    return () => {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
    };
  }, [storageKey]);

  // Auto-scroll ke bawah saat window chat terbuka atau ada pesan baru
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Fokus input saat dibuka
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  async function sendMessage(textToSend: string) {
    const message = textToSend.trim();
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
      const isPublic = config.apiEndpoint === "/api/ai/public-chat";
      const payload = isPublic
        ? {
            message,
            version: activeVersion,
            history: priorHistory.slice(-8).map((m) => ({
              role: m.role,
              content: m.content,
              provider: m.provider,
              version: m.version,
              model: m.model,
            })),
          }
        : {
            message,
            version: activeVersion,
            history: priorHistory.slice(-12).map((m) => ({
              role: m.role,
              content: m.content,
              provider: m.provider,
              version: m.version,
              model: m.model,
            })),
          };

      const res = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        provider?: AiProviderType;
        version?: AiVersionId;
        versionLabel?: string;
        model?: string;
      };
      if (seq !== requestSeqRef.current) return;
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("⚠️ Terlalu banyak pesan dalam waktu singkat. Mohon tunggu 1 menit sebelum mencoba kembali.");
        }
        if (res.status === 401) {
          throw new Error("🔒 Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.");
        }
        throw new Error(data.error || "Gagal memproses pesan.");
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
    } catch (err) {
      if (seq !== requestSeqRef.current || (err instanceof DOMException && err.name === "AbortError")) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Data status belum dapat diperiksa saat ini. Silakan coba kembali."
      );
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function resetConversationState() {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    setLoading(false);
    setMessages([
      {
        role: "assistant",
        content: config.welcome,
        timestamp: "Sistem",
      },
    ]);
    setInput("");
    setError("");
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  function handleCloseChat() {
    setOpen(false);
    resetConversationState();
  }

  function handleOpenChat() {
    resetConversationState();
    setOpen(true);
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
        content: config.welcome,
        timestamp: formatCurrentTime(),
      },
    ]);
    setError("");
    setInput("");
  }

  return (
    <>
      {/* Chat Window Dialog */}
      {open && (
        <div
          className="chatbot-window"
          role="dialog"
          aria-label="Asisten Pelayanan Desa"
          aria-modal="true"
          style={{
            zIndex: 10000,
            borderRadius: 22,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            width: 410,
            maxHeight: 620,
            background: "#ffffff",
          }}
        >
          {/* ============================================================ */}
          {/* 1. Header dengan nama “Asisten Pelayanan Desa” & Indikator Role */}
          {/* ============================================================ */}
          <div
            className="chatbot-header"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              padding: "14px 18px",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div className="chatbot-header-info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Ikon chatbot konsisten */}
              <div
                className="chatbot-avatar"
                style={{
                  width: 40,
                  height: 40,
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                aria-hidden="true"
              >
                <AiRobotHead size={28} animated={false} />
              </div>

              <div>
                <p
                  className="chatbot-header-name"
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Asisten Pelayanan Desa
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  {/* Indikator Role Pengguna */}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "1px 8px",
                      borderRadius: 999,
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {config.badge}
                  </span>
                  <span style={{ fontSize: "0.72rem", opacity: 0.9, color: "rgba(255,255,255,0.9)" }}>
                    {loading ? "⏳ Memproses..." : "Online"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={clearHistory}
                className="chatbot-close-btn"
                title="Hapus riwayat chat"
                aria-label="Hapus chat"
                style={{
                  borderRadius: 10,
                  padding: 6,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={handleCloseChat}
                className="chatbot-close-btn"
                title="Tutup asisten"
                aria-label="Tutup asisten"
                style={{
                  borderRadius: 10,
                  padding: 6,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. Messages Feed (Bubble Chat AI vs Pengguna) */}
          {/* ============================================================ */}
          <div
            className="chatbot-messages"
            aria-live="polite"
            style={{
              flex: 1,
              maxHeight: 380,
              minHeight: 300,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            }}
          >
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`chatbot-message ${isUser ? "chatbot-message--user" : "chatbot-message--bot"}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  {/* Bot Avatar */}
                  {!isUser && (
                    <div
                      className="chatbot-bot-icon"
                      style={{
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginBottom: 2,
                      }}
                      aria-hidden="true"
                    >
                      <AiRobotHead size={20} animated={false} />
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: "84%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      className="chatbot-bubble"
                      style={{
                        background: isUser ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "#ffffff",
                        color: isUser ? "#ffffff" : "#0f172a",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        padding: "10px 14px",
                        fontSize: 13,
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                        boxShadow: isUser
                          ? "0 4px 12px rgba(79, 70, 229, 0.25)"
                          : "0 2px 8px rgba(0,0,0,0.04)",
                        border: isUser ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
                      }}
                    >
                      {isUser ? msg.content : renderFormattedContent(msg.content)}
                    </div>

                    {/* Waktu Pesan & Provider Badge jika tersedia */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10,
                        color: isUser ? "#6366f1" : "#94a3b8",
                        marginTop: 3,
                        padding: "0 4px",
                      }}
                    >
                      {msg.timestamp && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} />
                          {msg.timestamp}
                        </span>
                      )}
                      {!isUser && (msg.version || msg.provider) && (() => {
                        const badge = getAiVersionBadgeInfo(msg.version, msg.versionLabel, msg.provider);
                        return (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "0 5px",
                              borderRadius: 3,
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
                </div>
              );
            })}

            {/* Indikator Sedang Memproses */}
            {loading && (
              <div className="chatbot-message chatbot-message--bot" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div
                  className="chatbot-bot-icon"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <AiRobotHead size={20} animated={false} />
                </div>
                <div
                  className="chatbot-bubble chatbot-bubble--typing"
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "10px 14px",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>Memproses...</span>
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
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
                role="alert"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError("")}
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ============================================================ */}
          {/* 3. Contoh Pertanyaan Sesuai Role (Suggestion Pills) */}
          {/* ============================================================ */}
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "8px 12px",
              overflowX: "auto",
              borderTop: "1px solid var(--border-divider, #e2e8f0)",
              background: "#ffffff",
              scrollbarWidth: "none",
            }}
          >
            {config.prompts.map((promptText) => (
              <button
                key={promptText}
                type="button"
                onClick={() => sendMessage(promptText)}
                disabled={loading}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(79, 70, 229, 0.2)",
                  background: "rgba(79, 70, 229, 0.07)",
                  color: "#4338ca",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(79, 70, 229, 0.15)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(79, 70, 229, 0.07)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(79, 70, 229, 0.2)";
                }}
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* ============================================================ */}
          {/* 4. Input Pesan: Enter Kirim, Shift+Enter Baris Baru */}
          {/* ============================================================ */}
          <form
            onSubmit={submit}
            className="chatbot-form"
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={800}
              rows={1}
              placeholder={config.placeholder}
              className="chatbot-input"
              aria-label="Pertanyaan"
              style={{
                flex: 1,
                fontSize: 13,
                resize: "none",
                maxHeight: 80,
                minHeight: 34,
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                lineHeight: 1.45,
                background: "#ffffff",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="chatbot-send-btn"
              aria-label="Kirim"
              style={{
                background:
                  loading || !input.trim()
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                width: 36,
                height: 36,
                borderRadius: 12,
                border: "none",
                color: "#ffffff",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow:
                  loading || !input.trim()
                    ? "none"
                    : "0 3px 10px rgba(79,70,229,0.35)",
                transition: "all 0.15s ease",
              }}
            >
              <Send size={15} />
            </button>
          </form>

          {/* Pilihan Versi AI di Bawah */}
          <AiVersionSelector
            activeVersion={activeVersion}
            onChange={(ver) => {
              setActiveVersion(ver);
              setError("");
            }}
            versions={availableVersions}
            disabled={loading}
            compact={true}
          />

          {/* Role Disclaimer & Pintasan */}
          <div
            style={{
              padding: "4px 10px 6px",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
              color: "#64748b",
            }}
          >
            <span>Enter ↵ kirim • Shift+Enter baris baru</span>
            <span>{config.channelSubtitle}</span>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="chatbot-trigger-container" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
        {!open && (
          <div
            className="chatbot-speech-bubble"
            onClick={handleOpenChat}
            style={{ cursor: "pointer" }}
          >
            {config.bubbleText}
          </div>
        )}
        <button
          type="button"
          onClick={() => (open ? handleCloseChat() : handleOpenChat())}
          className="chatbot-trigger"
          aria-label={open ? "Tutup Asisten Pelayanan Desa" : "Buka Asisten Pelayanan Desa"}
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            boxShadow: "0 8px 24px rgba(79, 70, 229, 0.4)",
            width: 58,
            height: 58,
            borderRadius: "50%",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          {open ? (
            <X size={24} color="#ffffff" />
          ) : (
            <AiRobotHead size={40} animated={true} />
          )}
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .chatbot-window {
            right: 10px !important;
            bottom: 84px !important;
            width: calc(100vw - 20px) !important;
            max-height: calc(100vh - 100px) !important;
          }
          .chatbot-trigger-container {
            right: 14px !important;
            bottom: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
