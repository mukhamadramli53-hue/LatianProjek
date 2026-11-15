"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { deleteCompletedApplication } from "@/lib/actions/application";

interface DeleteApplicationButtonProps {
  applicationId: string;
  nomorPengajuan: string;
  serviceName: string;
  status: string;
}

export function DeleteApplicationButton({
  applicationId,
  nomorPengajuan,
  serviceName,
  status,
}: DeleteApplicationButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await deleteCompletedApplication(applicationId);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Gagal menghapus pengajuan.");
      }
    } catch {
      setError("Terjadi kesalahan sistem saat menghapus pengajuan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "5px 7px",
          borderRadius: 6,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#ef4444",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title={`Hapus arsip pengajuan ${nomorPengajuan}`}
        aria-label={`Hapus arsip pengajuan ${nomorPengajuan}`}
      >
        <Trash2 size={12} strokeWidth={2.2} />
      </button>

      {/* Modal Konfirmasi Hapus Pengajuan */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              width: "100%",
              maxWidth: 440,
              padding: 24,
              position: "relative",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#fee2e2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                  Hapus Arsip Pengajuan
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  Bersihkan pengajuan yang telah selesai agar tidak menumpuk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loading && setIsOpen(false)}
                disabled={loading}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 6,
                  padding: 5,
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                }}
                aria-label="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            {/* Error Message jika ada */}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#b91c1c",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Ringkasan Pengajuan */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Nomor:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>
                  {nomorPengajuan}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Layanan:</span>
                <span style={{ fontWeight: 600, color: "#1e293b", textAlign: "right" }}>
                  {serviceName}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Status:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: status === "DISETUJUI" || status === "SELESAI" ? "#16a34a" : "#dc2626",
                  }}
                >
                  {status}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 18px", lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus arsip pengajuan <strong>{nomorPengajuan}</strong>?
            </p>

            {/* Tombol Aksi */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.25)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
