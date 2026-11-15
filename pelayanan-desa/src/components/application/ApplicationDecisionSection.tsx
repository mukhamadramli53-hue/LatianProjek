"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionApplication } from "@/lib/actions/application";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
  UserCheck,
  Send,
  Sparkles,
  Info,
} from "lucide-react";
import type { ApplicationStatus, Role } from "@prisma/client";

export interface ActionItem {
  status: ApplicationStatus;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  description?: string;
}

export interface HistoryItem {
  id: string;
  oldStatus?: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  note?: string | null;
  createdAt: Date | string;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface ApplicationDecisionSectionProps {
  applicationId: string;
  status: ApplicationStatus;
  history: HistoryItem[];
  allowedTransitions: ActionItem[];
  role: Role;
}

export function ApplicationDecisionSection({
  applicationId,
  status,
  history,
  allowedTransitions,
  role,
}: ApplicationDecisionSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // Temukan riwayat keputusan terkait status saat ini
  const relevantHistory = [...history].reverse().find((h) => h.newStatus === status);

  async function handleAction(nextStatus: ApplicationStatus) {
    if ((nextStatus === "PERLU_PERBAIKAN" || nextStatus === "DITOLAK") && !note.trim()) {
      setError("Catatan tindakan / alasan resmi wajib diisi jika menolak atau meminta perbaikan berkas.");
      const noteInput = document.getElementById("action-note-input");
      if (noteInput) {
        noteInput.focus();
        noteInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setLoading(nextStatus);
    setError("");

    try {
      const res = await transitionApplication(applicationId, nextStatus, note);
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

  // JIKA ADA TINDAKAN YANG BISA DIAMBIL
  if (allowedTransitions.length > 0) {
    const isKades = role === "KEPALA_DESA";
    const isSupervisor = role === "SUPERVISOR";

    let sectionTitle = "Tindakan Pelayanan & Pemrosesan Berkas";
    let sectionSubtitle = "Pilih tindakan berikut sesuai dengan hasil verifikasi berkas pemohon:";
    let iconGradient = "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)";

    if (isKades) {
      sectionTitle = "Keputusan Persetujuan Resmi (Kepala Desa)";
      sectionSubtitle = "Tentukan keputusan final: Setujui dan sahkan penerbitan surat resmi, atau tolak permohonan.";
      iconGradient = "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)";
    } else if (isSupervisor) {
      sectionTitle = "Penanganan Berkas Antrean Terdahulu (Supervisor)";
      sectionSubtitle = "Tindak lanjut penanganan berkas riwayat terdahulu untuk diteruskan ke Kepala Desa atau dikembalikan untuk perbaikan.";
      iconGradient = "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)";
    }

    // Pisahkan aksi positif (Setuju/Lolos/Verifikasi/Mulai/Teruskan) dan aksi negatif (Tolak/Kembalikan/Perbaikan)
    const approveActions = allowedTransitions.filter(
      (a) => a.status === "DISETUJUI" || a.status === "MENUNGGU_APPROVAL" || a.status === "DIVERIFIKASI" || a.status === "DIPROSES" || a.status === "REVIEW_SUPERVISOR"
    );
    const rejectActions = allowedTransitions.filter(
      (a) => a.status === "DITOLAK" || a.status === "PERLU_PERBAIKAN"
    );

    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: isKades ? "2px solid #2dce89" : isSupervisor ? "2px solid #fb6340" : "1px solid #11cdef",
          padding: "26px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header Seksi Keputusan */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0f2f5", paddingBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: iconGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              {sectionTitle}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#8898aa" }}>
              {sectionSubtitle}
            </p>
          </div>
        </div>

        {/* Error Alert jika ada validasi */}
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
              gap: 10,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Input Catatan Tindakan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="action-note-input"
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
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fb6340" }}>
              * Wajib diisi jika menolak atau meminta perbaikan berkas
            </span>
          </label>
          <textarea
            id="action-note-input"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan catatan verifikasi, pertimbangan keputusan, nomor registrasi, instruksi perbaikan dokumen, atau alasan resmi penolakan..."
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #d2d6da",
              fontSize: 13.5,
              color: "#344767",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
              background: "#ffffff",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          />
        </div>

        {/* Tombol-Tombol Aksi Keputusan Berdampingan dengan Visual Sangat Kontras & Jelas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {/* Tombol Setuju / Lolos / Verifikasi */}
          {approveActions.map((action) => {
            const isLoading = loading === action.status;
            let btnBg = "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)";
            let btnShadow = "0 4px 14px rgba(45, 206, 137, 0.4)";
            let Icon = CheckCircle2;
            let helperText = "Sahkan berkas dan teruskan ke alur berikutnya";

            if (action.status === "DISETUJUI") {
              btnBg = "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)";
              helperText = "Surat resmi akan disahkan & siap diterbitkan untuk warga";
            } else if (action.status === "MENUNGGU_APPROVAL") {
              btnBg = "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)";
              btnShadow = "0 4px 14px rgba(94, 114, 228, 0.4)";
              helperText = "Berkas selesai diproses staf, ajukan ke Kepala Desa untuk persetujuan resmi";
            } else if (action.status === "DIVERIFIKASI") {
              btnBg = "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)";
              btnShadow = "0 4px 14px rgba(17, 205, 239, 0.4)";
              helperText = "Seluruh dokumen fisik dinyatakan lengkap & valid";
            } else if (action.status === "DIPROSES") {
              btnBg = "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)";
              btnShadow = "0 4px 14px rgba(94, 114, 228, 0.4)";
              Icon = Sparkles;
              helperText = "Mulai penyiapan draf surat resmi kependudukan";
            } else if (action.status === "REVIEW_SUPERVISOR") {
              btnBg = "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)";
              btnShadow = "0 4px 14px rgba(130, 94, 228, 0.4)";
              Icon = Send;
              helperText = "Kirim draf surat ke Supervisor untuk kendali mutu";
            }

            return (
              <div
                key={action.status}
                style={{
                  background: "#f8fdfa",
                  border: "1.5px solid #bbf1dc",
                  borderRadius: 14,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <CheckCircle2 size={16} color="#2dce89" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#2dce89", textTransform: "uppercase" }}>
                      Tindakan Persetujuan
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#67748e", lineHeight: 1.4 }}>
                    {helperText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction(action.status)}
                  disabled={loading !== null}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 20px",
                    borderRadius: 10,
                    background: btnBg,
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: loading !== null ? "not-allowed" : "pointer",
                    boxShadow: btnShadow,
                    opacity: loading !== null && !isLoading ? 0.6 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      <span>Memproses Keputusan...</span>
                    </>
                  ) : (
                    <>
                      <Icon size={18} />
                      <span>{action.label}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {/* Tombol Tolak / Kembalikan / Minta Perbaikan */}
          {rejectActions.map((action) => {
            const isLoading = loading === action.status;
            let btnBg = "linear-gradient(310deg, #f5365c 0%, #f56036 100%)";
            let btnShadow = "0 4px 14px rgba(245, 54, 92, 0.4)";
            let Icon = XCircle;
            let cardBorder = "#fec5b8";
            let cardBg = "#fff8f8";
            let titleColor = "#f5365c";
            let helperText = "Tolak pengajuan secara sah dan cantumkan alasan pada catatan";

            if (action.status === "PERLU_PERBAIKAN") {
              btnBg = "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)";
              btnShadow = "0 4px 14px rgba(251, 99, 64, 0.4)";
              Icon = AlertTriangle;
              cardBorder = "#ffdcd3";
              cardBg = "#fffdfb";
              titleColor = "#fb6340";
              helperText = "Kembalikan berkas ke pemohon agar dokumen yang kurang diperbaiki";
            }

            return (
              <div
                key={action.status}
                style={{
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: 14,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Icon size={16} color={titleColor} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: titleColor, textTransform: "uppercase" }}>
                      {action.status === "DITOLAK" ? "Tindakan Penolakan" : "Tindakan Koreksi"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#67748e", lineHeight: 1.4 }}>
                    {helperText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction(action.status)}
                  disabled={loading !== null}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 20px",
                    borderRadius: 10,
                    background: btnBg,
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: loading !== null ? "not-allowed" : "pointer",
                    boxShadow: btnShadow,
                    opacity: loading !== null && !isLoading ? 0.6 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      <span>Menyimpan Keputusan...</span>
                    </>
                  ) : (
                    <>
                      <Icon size={18} />
                      <span>{action.label}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // JIKA TIDAK ADA TINDAKAN AKTIF (STATUS TELAH DISETUJUI, DITOLAK, PERLU PERBAIKAN, ATAU SEDANG DI TANGAN PEJABAT LAIN)
  // Tampilkan banner hasil keputusan resmi yang sangat informatif dan memukau
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        padding: "26px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <Info size={18} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
            Status & Keputusan Resmi Berkas
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
            Informasi keputusan resmi dan posisi penanganan terkini
          </p>
        </div>
      </div>

      {status === "DISETUJUI" || status === "SELESAI" ? (
        <div
          style={{
            background: "#f7fdfa",
            border: "2px solid #2dce89",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "#2dce89",
                background: "#eafaf3",
                border: "1px solid #bbf1dc",
                padding: "4px 10px",
                borderRadius: 6,
                textTransform: "uppercase",
              }}
            >
              ✓ Keputusan: Telah Disetujui
            </span>
            {relevantHistory && (
              <span style={{ fontSize: 12, color: "#8898aa" }}>
                Diputuskan pada:{" "}
                <strong>
                  {new Date(relevantHistory.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </strong>
              </span>
            )}
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "#1e293b" }}>
            Pengajuan Telah Resmi Disetujui Kepala Desa
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#525f7f", lineHeight: 1.6 }}>
            Permohonan telah disahkan secara resmi oleh Kepala Desa. Dokumen surat kependudukan telah tervalidasi dan siap diterbitkan/diambil oleh pemohon.
          </p>

          {relevantHistory?.actor && (
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#67748e", display: "flex", alignItems: "center", gap: 6 }}>
              <UserCheck size={14} color="#2dce89" />
              <span>
                Disetujui oleh: <strong>{relevantHistory.actor.name}</strong> ({relevantHistory.actor.role})
              </span>
            </p>
          )}

          {relevantHistory?.note && (
            <div
              style={{
                marginTop: 10,
                padding: "12px 16px",
                background: "#ffffff",
                border: "1px solid #bbf1dc",
                borderRadius: 10,
                fontSize: 13,
                color: "#344767",
                fontStyle: "italic",
              }}
            >
              &ldquo;{relevantHistory.note}&rdquo;
            </div>
          )}
        </div>
      ) : status === "DITOLAK" ? (
        <div
          style={{
            background: "#fff8f8",
            border: "2px solid #f5365c",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "#f5365c",
                background: "#feecee",
                border: "1px solid #fec5b8",
                padding: "4px 10px",
                borderRadius: 6,
                textTransform: "uppercase",
              }}
            >
              ✕ Keputusan: Pengajuan Ditolak
            </span>
            {relevantHistory && (
              <span style={{ fontSize: 12, color: "#8898aa" }}>
                Diputuskan pada:{" "}
                <strong>
                  {new Date(relevantHistory.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </strong>
              </span>
            )}
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "#f5365c" }}>
            Pengajuan Surat Tidak Dapat Disetujui
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#525f7f", lineHeight: 1.6 }}>
            Permohonan surat resmi ini telah ditolak oleh pejabat desa berwenang karena tidak memenuhi kriteria kelayakan administrasi desa.
          </p>

          {relevantHistory?.actor && (
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#67748e", display: "flex", alignItems: "center", gap: 6 }}>
              <UserCheck size={14} color="#f5365c" />
              <span>
                Ditolak oleh: <strong>{relevantHistory.actor.name}</strong> ({relevantHistory.actor.role})
              </span>
            </p>
          )}

          {relevantHistory?.note && (
            <div
              style={{
                marginTop: 10,
                padding: "14px 18px",
                background: "#ffffff",
                border: "1.5px solid #fec5b8",
                borderRadius: 10,
                fontSize: 13.5,
                color: "#c92a2a",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#f5365c", display: "block", marginBottom: 4 }}>
                Alasan Resmi Penolakan:
              </span>
              &ldquo;{relevantHistory.note}&rdquo;
            </div>
          )}
        </div>
      ) : status === "PERLU_PERBAIKAN" ? (
        <div
          style={{
            background: "#fffdf9",
            border: "2px solid #fb6340",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "#fb6340",
                background: "#fff2ee",
                border: "1px solid #ffdcd3",
                padding: "4px 10px",
                borderRadius: 6,
                textTransform: "uppercase",
              }}
            >
              ⚠️ Berkas Dikembalikan (Perlu Perbaikan)
            </span>
            {relevantHistory && (
              <span style={{ fontSize: 12, color: "#8898aa" }}>
                Pada:{" "}
                <strong>
                  {new Date(relevantHistory.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </strong>
              </span>
            )}
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "#fb6340" }}>
            Berkas Memerlukan Perbaikan dari Pemohon
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#525f7f", lineHeight: 1.6 }}>
            Pengajuan ini sedang menunggu tindakan dari warga pemohon untuk merevisi berkas dokumen atau data formulir sesuai instruksi petugas.
          </p>

          {relevantHistory?.actor && (
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#67748e", display: "flex", alignItems: "center", gap: 6 }}>
              <UserCheck size={14} color="#fb6340" />
              <span>
                Dikembalikan oleh: <strong>{relevantHistory.actor.name}</strong> ({relevantHistory.actor.role})
              </span>
            </p>
          )}

          {relevantHistory?.note && (
            <div
              style={{
                marginTop: 10,
                padding: "14px 18px",
                background: "#ffffff",
                border: "1.5px solid #ffdcd3",
                borderRadius: 10,
                fontSize: 13.5,
                color: "#d9480f",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#fb6340", display: "block", marginBottom: 4 }}>
                Catatan Instruksi Perbaikan:
              </span>
              &ldquo;{relevantHistory.note}&rdquo;
            </div>
          )}
        </div>
      ) : status === "MENUNGGU_APPROVAL" ? (
        <div
          style={{
            background: "#faf9fe",
            border: "1.5px solid #cfd7fc",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Clock size={16} color="#5e72e4" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#5e72e4", textTransform: "uppercase" }}>
              Tahap Akhir • Menunggu Tanda Tangan Kepala Desa
            </span>
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
            Berkas Telah Selesai Diproses Staf Desa
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#525f7f", lineHeight: 1.5 }}>
            Berkas telah tuntas diverifikasi dan disiapkan oleh Staf Desa. Saat ini berkas berada di meja Kepala Desa untuk persetujuan dan tanda tangan resmi.
          </p>
        </div>
      ) : status === "REVIEW_SUPERVISOR" ? (
        <div
          style={{
            background: "#fbf9fe",
            border: "1.5px solid #e2d9fc",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Clock size={16} color="#825ee4" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#825ee4", textTransform: "uppercase" }}>
              Tahap Kendali Mutu • Ditelaah Supervisor
            </span>
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
            Sedang Dalam Evaluasi Mutu Redaksional & Syarat
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#525f7f", lineHeight: 1.5 }}>
            Draf surat kependudukan telah disiapkan oleh staf dan sedang ditelaah oleh Supervisor Desa sebelum diajukan ke Kepala Desa.
          </p>
        </div>
      ) : status === "DIPROSES" ? (
        <div
          style={{
            background: "#fffdf9",
            border: "1.5px solid #fed7aa",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Clock size={16} color="#fb6340" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fb6340", textTransform: "uppercase" }}>
              Tahap Penyiapan Berkas • Sedang Dikerjakan Staf
            </span>
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
            Penyusunan Draf Surat Sedang Berlangsung
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#525f7f", lineHeight: 1.5 }}>
            Staf administrasi desa sedang menyiapkan draf surat resmi kependudukan dan mencatatkan nomor registrasi berkas.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#f8f9fa",
            border: "1px dashed #d2d6da",
            borderRadius: 14,
            padding: "20px 22px",
            color: "#67748e",
            fontSize: 13.5,
          }}
        >
          Status pengajuan saat ini: <strong style={{ color: "#344767" }}>{status}</strong>. Tidak ada tindakan persetujuan aktif yang diperlukan dari akun Anda saat ini.
        </div>
      )}
    </div>
  );
}
