"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionApplication } from "@/lib/actions/application";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";

interface ActionItem {
  status: ApplicationStatus;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

interface ApplicationActionFormProps {
  applicationId: string;
  allowedTransitions: ActionItem[];
}

export function ApplicationActionForm({ applicationId, allowedTransitions }: ApplicationActionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function handleAction(status: ApplicationStatus) {
    if ((status === "PERLU_PERBAIKAN" || status === "DITOLAK") && !note.trim()) {
      setError("Catatan tindakan wajib diisi untuk perbaikan berkas atau penolakan pengajuan.");
      return;
    }

    setLoading(status);
    setError("");

    try {
      const res = await transitionApplication(applicationId, status, note);
      if (res.success) {
        setNote("");
        router.refresh();
      } else {
        setError(res.error || "Gagal memperbarui status pengajuan");
      }
    } catch {
      setError("Terjadi kesalahan sistem saat memproses tindakan.");
    } finally {
      setLoading(null);
    }
  }

  if (allowedTransitions.length === 0) return null;

  const getActionStyle = (status: ApplicationStatus) => {
    switch (status) {
      case "DISETUJUI":
        return {
          bg: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
          shadow: "0 4px 14px rgba(45, 206, 137, 0.4)",
          color: "#ffffff",
          icon: CheckCircle2,
        };
      case "DITOLAK":
        return {
          bg: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)",
          shadow: "0 4px 14px rgba(245, 54, 92, 0.4)",
          color: "#ffffff",
          icon: XCircle,
        };
      case "PERLU_PERBAIKAN":
        return {
          bg: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
          shadow: "0 4px 14px rgba(251, 99, 64, 0.4)",
          color: "#ffffff",
          icon: AlertTriangle,
        };
      case "MENUNGGU_APPROVAL":
        return {
          bg: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
          shadow: "0 4px 14px rgba(94, 114, 228, 0.4)",
          color: "#ffffff",
          icon: CheckCircle2,
        };
      case "REVIEW_SUPERVISOR":
        return {
          bg: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
          shadow: "0 4px 14px rgba(130, 94, 228, 0.4)",
          color: "#ffffff",
          icon: Send,
        };
      case "DIPROSES":
        return {
          bg: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
          shadow: "0 4px 14px rgba(94, 114, 228, 0.4)",
          color: "#ffffff",
          icon: Sparkles,
        };
      case "DIVERIFIKASI":
        return {
          bg: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
          shadow: "0 4px 14px rgba(17, 205, 239, 0.4)",
          color: "#ffffff",
          icon: CheckCircle2,
        };
      default:
        return {
          bg: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
          shadow: "0 4px 14px rgba(94, 114, 228, 0.35)",
          color: "#ffffff",
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#feecee",
            color: "#f5365c",
            borderRadius: 10,
            border: "1px solid #fec5b8",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="action-note"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#344767",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Catatan Tindakan / Instruksi Resmi</span>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: "#8898aa" }}>
            Wajib jika perbaikan / penolakan
          </span>
        </label>
        <textarea
          id="action-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tuliskan catatan verifikasi, nomor registrasi, instruksi perbaikan, atau alasan penolakan..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #d2d6da",
            fontSize: 13.5,
            color: "#344767",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.5,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            background: "#ffffff",
          }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
        {allowedTransitions.map((t) => {
          const style = getActionStyle(t.status);
          const Icon = style.icon;
          const isCurrentLoading = loading === t.status;

          return (
            <button
              key={t.status}
              type="button"
              onClick={() => handleAction(t.status)}
              disabled={loading !== null}
              style={{
                flex: "1 1 200px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: 10,
                background: style.bg,
                color: style.color,
                fontSize: 13.5,
                fontWeight: 700,
                border: "none",
                cursor: loading !== null ? "not-allowed" : "pointer",
                boxShadow: style.shadow,
                opacity: loading !== null && !isCurrentLoading ? 0.5 : 1,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {isCurrentLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Icon size={16} />
                  <span>{t.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
