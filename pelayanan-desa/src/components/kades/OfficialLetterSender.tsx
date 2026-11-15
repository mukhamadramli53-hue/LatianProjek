"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
} from "lucide-react";
import { sendOfficialLetter } from "@/lib/actions/application";

interface ExistingLetter {
  id: string;
  requirement_name: string;
  file_name: string;
  storage_key: string;
  file_size: number;
  uploaded_at?: Date | string;
}

interface OfficialLetterSenderProps {
  applicationId: string;
  status: string;
  citizenName: string;
  serviceName: string;
  existingLetter?: ExistingLetter | null;
}

export function OfficialLetterSender({
  applicationId,
  citizenName,
  existingLetter,
}: OfficialLetterSenderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("File harus berformat PDF (.pdf)");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran file tidak boleh melebihi 10MB");
      setSelectedFile(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Silakan pilih file PDF surat resmi terlebih dahulu.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("file", selectedFile);
    if (note.trim()) {
      formData.append("note", note.trim());
    }

    startTransition(async () => {
      const res = await sendOfficialLetter(formData);
      if (res.success) {
        setSuccessMessage("Surat resmi berhasil diunggah dan dikirimkan kepada warga!");
        setSelectedFile(null);
        setShowReplaceForm(false);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Gagal mengirimkan surat.");
      }
    });
  };

  const hasLetter = Boolean(existingLetter) && !showReplaceForm;

  return (
    <div
      id="kirim-surat"
      style={{
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
        border: "1.5px solid #2dce89",
        padding: "26px 28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative top corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 140,
          height: 140,
          background: "radial-gradient(circle, rgba(45, 206, 137, 0.12) 0%, rgba(255, 255, 255, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
          borderBottom: "1px solid #f0f2f5",
          paddingBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(45, 206, 137, 0.3)",
              flexShrink: 0,
            }}
          >
            <Send size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                Pengiriman Surat Resmi ke Warga (PDF)
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#2dce89",
                  background: "#eafaf3",
                  border: "1px solid #bbf1dc",
                  padding: "2px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                }}
              >
                Kepala Desa
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
              Unggah file surat keputusan resmi yang telah disahkan dan bertanda tangan untuk pemohon{" "}
              <strong style={{ color: "#344767" }}>{citizenName}</strong>
            </p>
          </div>
        </div>

        {hasLetter && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "#eafaf3",
              color: "#2dce89",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid #bbf1dc",
            }}
          >
            <CheckCircle2 size={15} />
            Surat Resmi Terkirim
          </span>
        )}
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "#eafaf3",
            border: "1px solid #bbf1dc",
            borderRadius: 10,
            color: "#2dce89",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "#feecee",
            border: "1px solid #fbb4b9",
            borderRadius: 10,
            color: "#f5365c",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* State A: Surat SUDAH Dikirim */}
      {hasLetter && existingLetter && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "18px 20px",
              background: "#f7fdfa",
              border: "1px solid #bbf1dc",
              borderRadius: 12,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 4px 10px rgba(245, 54, 92, 0.3)",
                  flexShrink: 0,
                }}
              >
                <FileText size={24} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#2dce89",
                    letterSpacing: "0.04em",
                  }}
                >
                  Dokumen Surat Resmi Aktif
                </span>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#344767" }}>
                  {existingLetter.file_name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12, color: "#8898aa" }}>
                  <span>{(existingLetter.file_size / 1024).toFixed(1)} KB</span>
                  <span>&bull;</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {existingLetter.uploaded_at
                      ? new Date(existingLetter.uploaded_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "Terkirim"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a
                href={`/api/files/${existingLetter.storage_key}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  borderRadius: 8,
                  background: "#eafaf3",
                  color: "#2dce89",
                  border: "1px solid #bbf1dc",
                  fontSize: 12.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Eye size={14} />
                Lihat Surat Terkirim
              </a>

              <button
                type="button"
                onClick={() => setShowReplaceForm(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  borderRadius: 8,
                  background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(94, 114, 228, 0.3)",
                }}
              >
                <UploadCloud size={14} />
                Unggah Revisi
              </button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa", fontStyle: "italic" }}>
            💡 Dokumen surat di atas sudah dapat dilihat dan diunduh langsung oleh pemohon (<strong>{citizenName}</strong>) di portal warga.
          </p>
        </div>
      )}

      {/* State B: Formulir Pengiriman Surat (Belum Ada atau Ingin Revisi) */}
      {(!hasLetter || showReplaceForm) && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "14px 16px",
              background: "#eafaf3",
              border: "1px solid #bbf1dc",
              borderRadius: 10,
              fontSize: 13,
              color: "#1e293b",
              lineHeight: 1.5,
            }}
          >
            <strong>Status: Permohonan telah disetujui.</strong> Silakan unggah dokumen PDF surat resmi yang telah disahkan dan bertanda tangan. Dokumen ini akan langsung terbit di akun warga pemohon dan dapat mereka unduh.
          </div>

          {/* File Picker Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #bbf1dc",
              borderRadius: 12,
              padding: "24px 20px",
              textAlign: "center",
              background: selectedFile ? "#f7fdfa" : "#f8f9fa",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: selectedFile
                  ? "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)"
                  : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                margin: "0 auto 12px",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              }}
            >
              {selectedFile ? <FileText size={24} /> : <UploadCloud size={24} />}
            </div>

            {selectedFile ? (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#2dce89" }}>
                  {selectedFile.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#8898aa" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB &bull; Klik untuk mengganti file
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#344767" }}>
                  Pilih atau Tarik File Surat Resmi (PDF)
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#8898aa" }}>
                  Format yang didukung: Dokumen PDF resmi (.pdf), maksimal 10MB
                </p>
              </div>
            )}
          </div>

          {/* Catatan Tambahan (Opsional) */}
          <div>
            <label
              htmlFor="kades-note"
              style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#344767", marginBottom: 6 }}
            >
              Catatan Pengesahan / Pesan untuk Warga (Opsional)
            </label>
            <textarea
              id="kades-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Surat permohonan telah ditandatangani Kepala Desa dan dibubuhi cap stempel basah resmi. Silakan unduh dokumen PDF."
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d2d6da",
                borderRadius: 8,
                fontSize: 13,
                color: "#344767",
                fontFamily: "inherit",
                boxSizing: "border-box",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            {showReplaceForm && (
              <button
                type="button"
                onClick={() => {
                  setShowReplaceForm(false);
                  setSelectedFile(null);
                }}
                disabled={isPending}
                style={{
                  padding: "10px 18px",
                  background: "#f8f9fa",
                  border: "1px solid #d2d6da",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#67748e",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isPending || !selectedFile}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                background:
                  isPending || !selectedFile
                    ? "#e9ecef"
                    : "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                color: isPending || !selectedFile ? "#adb5bd" : "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 800,
                cursor: isPending || !selectedFile ? "not-allowed" : "pointer",
                boxShadow:
                  isPending || !selectedFile ? "none" : "0 4px 14px rgba(45, 206, 137, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              {isPending ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Mengirimkan Surat...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Kirim Surat Resmi ke Warga
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
