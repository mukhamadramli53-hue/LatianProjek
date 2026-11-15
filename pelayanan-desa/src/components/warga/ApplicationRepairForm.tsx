"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Send, Loader2, RefreshCw, FileText, UploadCloud, MessageSquare } from "lucide-react";
import { DynamicForm } from "@/components/application/DynamicForm";
import { DocumentUploader, type UploadedDoc } from "@/components/application/DocumentUploader";
import { resubmitApplication } from "@/lib/actions/application";
import type { FormField } from "@/lib/validations/application";

interface Props {
  applicationId: string;
  nomorPengajuan: string;
  serviceName: string;
  requirements: string[];
  formSchema: FormField[];
  initialFormData: Record<string, string>;
  initialDocuments: Array<{
    id: string;
    requirement_name: string;
    file_name: string;
    storage_key: string;
    file_size: number;
    mime_type: string;
  }>;
  staffNote: string | null;
}

export function ApplicationRepairForm({
  applicationId,
  nomorPengajuan,
  serviceName,
  requirements,
  formSchema,
  initialFormData,
  initialDocuments,
  staffNote,
}: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<UploadedDoc[]>(
    initialDocuments.map((d) => ({
      requirement_name: d.requirement_name,
      storage_key: d.storage_key,
      file_name: d.file_name,
      file_size: d.file_size,
      mime_type: d.mime_type,
    }))
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const validateForm = (): boolean => {
    let isValid = true;
    const errors: Record<string, string> = {};

    for (const field of formSchema) {
      const val = formData[field.name];
      if (field.required && (!val || val.trim() === "")) {
        errors[field.name] = `${field.label} wajib diisi.`;
        isValid = false;
      } else if (val && field.pattern) {
        try {
          const reg = new RegExp(field.pattern);
          if (!reg.test(val)) {
            errors[field.name] = `${field.label} formatnya tidak sesuai.`;
            isValid = false;
          }
        } catch {
          // ignore pattern error
        }
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const validateDocuments = (): boolean => {
    if (requirements.length === 0) return true;

    // Filter dokumen wajib (tanpa kata 'jika ada' atau 'opsional')
    const mandatoryRequirements = requirements.filter((req) => {
      const lower = req.toLowerCase();
      return !lower.includes("jika ada") && !lower.includes("opsional");
    });

    const allMandatoryUploaded = mandatoryRequirements.every((req) =>
      documents.some((d) => d.requirement_name === req)
    );

    if (!allMandatoryUploaded) {
      setGlobalError("Harap lengkapi seluruh dokumen persyaratan wajib sebelum mengirim perbaikan.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMsg("");

    // 1. Validasi formulir
    const isFormValid = validateForm();
    if (!isFormValid) {
      setGlobalError("Terdapat data formulir yang belum sesuai atau belum lengkap. Harap periksa kembali.");
      return;
    }

    // 2. Validasi dokumen
    const isDocsValid = validateDocuments();
    if (!isDocsValid) return;

    setIsSubmitting(true);

    try {
      const docKeys = documents.map((d) => ({
        requirement_name: d.requirement_name,
        storage_key: d.storage_key,
      }));

      const res = await resubmitApplication(applicationId, {
        form_data: formData,
        notes: notes.trim(),
        documentKeys: docKeys,
      });

      if (!res.success) {
        setGlobalError(res.error || "Gagal mengirim perbaikan.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("Perbaikan pengajuan berhasil dikirimkan kembali! Halaman akan dimuat ulang.");
      setTimeout(() => {
        router.refresh();
      }, 1200);
    } catch {
      setGlobalError("Terjadi kesalahan jaringan atau sistem.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(251, 99, 64, 0.08) 0%, rgba(255, 255, 255, 0) 100%)",
        border: "1px solid rgba(251, 99, 64, 0.2)",
        borderRadius: 14,
        padding: "20px 24px",
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
          color: "#ffffff",
          padding: "5px 14px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 10,
          boxShadow: "0 2px 6px rgba(251, 99, 64, 0.3)",
        }}>
          <RefreshCw size={13} />
          Instruksi Perbaikan Pengajuan
        </div>
        <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.01em" }}>
          Perbaiki Dokumen {serviceName} ({nomorPengajuan})
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#64748b", lineHeight: 1.6 }}>
          Silakan periksa dan perbarui data isian formulir atau unggah ulang dokumen yang diminta oleh petugas di bawah ini. Nomor pengajuan Anda tetap sama dan akan diprioritaskan untuk pemeriksaan ulang.
        </p>
      </div>

      {/* Catatan dari Petugas */}
      {staffNote && (
        <div style={{
          background: "#fffaf0",
          border: "1px solid #fed7aa",
          borderLeft: "5px solid #fb6340",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 2px 8px rgba(251, 99, 64, 0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AlertCircle size={17} color="#fb6340" />
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Catatan Resmi dari Petugas Verifikator:
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#7c2d12", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {staffNote}
          </p>
        </div>
      )}

      {/* Global Alerts */}
      {globalError && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderLeft: "5px solid #ef4444",
          borderRadius: 12,
          padding: "16px 20px",
          color: "#991b1b",
        }}>
          <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14 }}>Perhatian</p>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{globalError}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderLeft: "5px solid #10b981",
          borderRadius: 12,
          padding: "16px 20px",
          color: "#166534",
        }}>
          <CheckCircle2 size={20} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14 }}>Berhasil</p>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{successMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Section 1: Formulir Data */}
        {formSchema.length > 0 && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "24px 26px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(94, 114, 228, 0.3)",
              }}>
                <FileText size={17} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1e293b" }}>
                1. Perbaikan Data Formulir
              </h3>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Periksa dan perbarui data isian formulir yang belum sesuai di bawah ini:
            </p>
            <DynamicForm
              fields={formSchema}
              values={formData}
              errors={formErrors}
              onChange={(name, val) => {
                setFormData((prev) => ({ ...prev, [name]: val }));
                if (formErrors[name]) {
                  setFormErrors((prev) => {
                    const updated = { ...prev };
                    delete updated[name];
                    return updated;
                  });
                }
              }}
            />
          </div>
        )}

        {/* Section 2: Dokumen Persyaratan */}
        {requirements.length > 0 && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "24px 26px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(17, 205, 239, 0.3)",
              }}>
                <UploadCloud size={17} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1e293b" }}>
                2. Perbaikan Dokumen Persyaratan
              </h3>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Unggah ulang dokumen yang buram, salah, atau belum lengkap sesuai instruksi catatan petugas:
            </p>
            <DocumentUploader
              requirements={requirements}
              uploadedDocs={documents}
              onDocUploaded={(doc) => {
                setDocuments((current) => [
                  ...current.filter((item) => item.requirement_name !== doc.requirement_name),
                  doc,
                ]);
              }}
              onDocRemoved={(requirementName) => {
                setDocuments((current) =>
                  current.filter((item) => item.requirement_name !== requirementName)
                );
              }}
            />
          </div>
        )}

        {/* Section 3: Catatan Warga untuk Petugas (Opsional) */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "24px 26px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(45, 206, 137, 0.3)",
            }}>
              <MessageSquare size={17} />
            </div>
            <label htmlFor="repair-notes" style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1e293b", cursor: "pointer" }}>
              3. Catatan Warga untuk Petugas (Opsional)
            </label>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            Tuliskan penjelasan singkat mengenai bagian yang telah Anda perbaiki agar memudahkan petugas dalam memeriksa ulang:
          </p>
          <textarea
            id="repair-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Sudah diunggah ulang fotokopi KK yang baru dan diperbaiki alamat pada formulir..."
            style={{
              width: "100%",
              minHeight: 110,
              resize: "vertical",
              borderRadius: 12,
              border: "1.5px solid #cbd5e1",
              background: "#f8fafc",
              padding: "14px 18px",
              fontSize: 14,
              fontWeight: 500,
              color: "#1e293b",
              lineHeight: 1.6,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#5e72e4";
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(94, 114, 228, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* ── Action Section: Tombol Pengajuan Ulang yang Sangat Jelas & Premium ── */}
        <div style={{
          background: "linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%)",
          border: "1.5px solid #dbeafe",
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "0 4px 16px rgba(94, 114, 228, 0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 280px" }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                Sudah selesai melakukan perbaikan?
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                Nomor pengajuan Anda tetap sama. Berkas akan langsung masuk ke antrean verifikasi petugas.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: isSubmitting
                ? "#94a3b8"
                : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
              color: "#ffffff",
              border: "none",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.02em",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: isSubmitting
                ? "none"
                : "0 8px 20px rgba(94, 114, 228, 0.35), 0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              outline: "none",
              flex: "0 0 auto",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(94, 114, 228, 0.45), 0 4px 8px rgba(0, 0, 0, 0.12)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(94, 114, 228, 0.35), 0 2px 4px rgba(0, 0, 0, 0.1)";
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                <span>Mengirimkan Perbaikan...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Kirim Ulang Perbaikan Pengajuan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
