"use client";

import { FormEvent, useRef, useState, useEffect } from "react";
import { Send, X, Minimize2 } from "lucide-react";
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
  provider?: AiProviderType;
  version?: AiVersionId;
  versionLabel?: string;
  model?: string;
};

const welcome: Message = {
  role: "assistant",
  content:
    "Halo! 👋 Saya Asisten Virtual Pelayanan Desa.\n\nSaya siap memberikan informasi dan panduan seputar:\n" +
    "1. 📄 Pengajuan SKTM (Surat Keterangan Tidak Mampu)\n" +
    "2. 👮 Pengajuan Surat Pengantar Pembuatan SKCK\n" +
    "3. 📂 Persyaratan dokumen yang tersedia\n" +
    "4. 📝 Cara mengisi formulir pengajuan\n" +
    "5. 🔧 Cara memperbaiki dokumen jika diminta revisi\n" +
    "6. 🔍 Cara memantau status alur pengajuan\n\n" +
    "Ada yang bisa saya bantu?",
};

const QUICK_PROMPTS = [
  "Syarat Dokumen SKTM",
  "Syarat Dokumen SKCK",
  "Cara Mengisi Formulir",
  "Cara Memperbaiki Dokumen",
  "Cara Memantau Status",
];

export default function PublicChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeVersion, setActiveVersion] = useState<AiVersionId>("standard");
  const [availableVersions, setAvailableVersions] = useState<UnifiedAiVersionOption[]>(DEFAULT_AI_VERSIONS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetch(`/api/ai/public-chat?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => res.json())
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

  function handleClose() {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    setLoading(false);
    setOpen(false);
    setMessages([welcome]);
    setInput("");
    setError("");
  }

  function handleOpen() {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    setLoading(false);
    setMessages([welcome]);
    setInput("");
    setError("");
    setOpen(true);
  }

  // Auto-scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, loading]);

  // Fokus input saat dibuka
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage(textToSend: string) {
    const message = textToSend.trim();
    if (!message || loading) return;

    const seq = ++requestSeqRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const priorHistory = messages;
    setInput("");
    setError("");
    const next: Message[] = [...priorHistory, { role: "user", content: message }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          version: activeVersion,
          history: priorHistory.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
            version: m.version,
            provider: m.provider,
            model: m.model,
          })),
        }),
      });
      
      const contentType = res.headers.get("content-type");
      if (seq !== requestSeqRef.current) return;
      if (contentType && contentType.includes("application/json")) {
        const data = (await res.json()) as {
          answer?: string;
          error?: string;
          provider?: AiProviderType;
          version?: AiVersionId;
          versionLabel?: string;
          model?: string;
        };
        if (seq !== requestSeqRef.current) return;
        if (!res.ok) throw new Error(data.error || "Permintaan gagal.");
        setMessages([
          ...next,
          {
            role: "assistant",
            content: data.answer || "Maaf, saya belum bisa menjawab saat ini.",
            provider: data.provider,
            version: data.version || activeVersion,
            versionLabel: data.versionLabel,
            model: data.model,
          },
        ]);
      } else {
        throw new Error("Asisten sedang sibuk atau ada gangguan server. Silakan coba lagi.");
      }
    } catch (err) {
      if (seq !== requestSeqRef.current || (err instanceof DOMException && err.name === "AbortError")) {
        return;
      }
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="Asisten Virtual Desa" aria-modal="true">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar" aria-hidden="true">
                <AiRobotHead size={24} animated={false} />
              </div>
              <div>
                <p className="chatbot-header-name">Asisten Desa</p>
                <p className="chatbot-header-status">
                  <span className="chatbot-status-dot" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="chatbot-close-btn"
              aria-label="Tutup chat"
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" aria-live="polite" aria-label="Percakapan">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-message ${msg.role === "user" ? "chatbot-message--user" : "chatbot-message--bot"}`}
              >
                {msg.role === "assistant" && (
                  <div className="chatbot-bot-icon" aria-hidden="true">
                    <AiRobotHead size={18} animated={false} />
                  </div>
                )}
                <div>
                  <div className="chatbot-bubble">{msg.content}</div>
                  {msg.role === "assistant" && (msg.version || msg.provider) && (() => {
                    const badge = getAiVersionBadgeInfo(msg.version, msg.versionLabel, msg.provider);
                    return (
                      <div style={{ marginTop: 2, paddingLeft: 4 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-message chatbot-message--bot">
                <div className="chatbot-bot-icon" aria-hidden="true">
                  <AiRobotHead size={18} animated={false} />
                </div>
                <div className="chatbot-bubble chatbot-bubble--typing">
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                </div>
              </div>
            )}
            {error && (
              <p className="chatbot-error" role="alert">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div style={{
            display: "flex",
            gap: 6,
            padding: "8px 12px",
            overflowX: "auto",
            borderTop: "1px solid var(--border-divider, #e2e8f0)",
            background: "var(--bg-surface, #f8fafc)",
          }}>
            {QUICK_PROMPTS.map((promptText) => (
              <button
                key={promptText}
                type="button"
                onClick={() => sendMessage(promptText)}
                disabled={loading}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(91, 110, 245, 0.25)",
                  background: "rgba(91, 110, 245, 0.08)",
                  color: "#4338ca",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={submit} className="chatbot-form">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              maxLength={500}
              placeholder="Tanyakan seputar SKTM, SKCK, formulir..."
              className="chatbot-input"
              aria-label="Pertanyaan"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="chatbot-send-btn"
              aria-label="Kirim"
            >
              <Send size={16} />
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

          <p className="chatbot-disclaimer">
            AI hanya memberikan informasi dan panduan. Keputusan resmi tetap dilakukan oleh Staf Desa, Supervisor, dan Kepala Desa sesuai alur sistem.
          </p>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="chatbot-trigger-container">
        {!open && (
          <div
            className="chatbot-speech-bubble"
            onClick={handleOpen}
            role="button"
            tabIndex={0}
            title="Klik untuk bertanya ke Asisten AI"
          >
            <span className="chatbot-speech-bubble-text">Tanya AI</span>
            <span className="chatbot-speech-bubble-arrow" />
          </div>
        )}
        <button
          onClick={() => (open ? handleClose() : handleOpen())}
          className={`chatbot-trigger ${open ? "chatbot-trigger--open" : "chatbot-trigger--robot"}`}
          aria-label={open ? "Tutup asisten virtual" : "Buka asisten virtual"}
          aria-expanded={open}
        >
          {open ? (
            <X size={24} />
          ) : (
            <div className="chatbot-robot-badge-wrapper">
              <span className="chatbot-robot-ping" />
              <AiRobotHead size={46} animated />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
