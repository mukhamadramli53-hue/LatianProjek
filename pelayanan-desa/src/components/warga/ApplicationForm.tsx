"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Send,
  Loader2,
  AlertCircle,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Edit3,
} from "lucide-react";
import { DynamicForm } from "@/components/application/DynamicForm";
import { DocumentUploader, type UploadedDoc } from "@/components/application/DocumentUploader";
import { StepIndicator } from "@/components/application/StepIndicator";
import type { FormField } from "@/lib/validations/application";

interface Props {
  service: {
    id: string;
    code: string;
    name: string;
    requirements: string[];
    form_schema: FormField[];
  };
  initialData?: Record<string, string>;
}

export function ApplicationForm({ service, initialData = {} }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Form State
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Documents State
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  const [notes, setNotes] = useState("");

  const steps = [
    { number: 1, label: "Persyaratan", subLabel: "Cek Berkas" },
    { number: 2, label: "Isi Formulir", subLabel: "Data Pemohon" },
    { number: 3, label: "Unggah Dokumen", subLabel: "Lampiran Berkas" },
    { number: 4, label: "Review & Kirim", subLabel: "Konfirmasi Akhir" },
  ];

  const handleNext = () => {
    setGlobalError("");

    // Validasi Langkah 2 (Formulir)
    if (step === 2 && service.form_schema?.length > 0) {
      let isValid = true;
      const newErrors: Record<string, string> = {};

      for (const field of service.form_schema) {
        const val = formData[field.name];

        // Cek Required
        if (field.required && !val) {
          newErrors[field.name] = `${field.label} wajib diisi.`;
          isValid = false;
        }
        // Cek Pola/Regex jika ada
        else if (val && field.pattern) {
          try {
            const regex = new RegExp(field.pattern);
            if (!regex.test(val)) {
              newErrors[field.name] = `${field.label} formatnya tidak sesuai.`;
              isValid = false;
            }
          } catch (err) {
            console.error("Invalid regex pattern", field.pattern, err);
          }
        }
      }

      setFormErrors(newErrors);
      if (!isValid) {
        setGlobalError("Mohon lengkapi seluruh kolom wajib yang bertanda bintang (*).");
        return;
      }
    }

    // Validasi Langkah 3 (Dokumen)
    if (step === 3 && service.requirements.length > 0) {
      const mandatoryRequirements = service.requirements.filter((req) => {
        const lower = req.toLowerCase();
        return !lower.includes("jika ada") && !lower.includes("opsional");
      });
      const allMandatoryUploaded = mandatoryRequirements.every((requirement) =>
        documents.some((document) => document.requirement_name === requirement)
      );
      if (!allMandatoryUploaded) {
        setGlobalError("Harap lengkapi semua dokumen persyaratan wajib sebelum melanjutkan.");
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setGlobalError("");
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setGlobalError("");

    try {
      const docKeys = documents.map((d) => ({
        requirement_name: d.requirement_name,
        storage_key: d.storage_key,
      }));

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          form_data: formData,
          notes,
          documentKeys: docKeys,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setFormErrors(data.fieldErrors);
          setStep(2); // Kembali ke formulir
          setGlobalError("Terdapat kesalahan pada isian formulir. Silakan periksa kembali.");
        } else {
          setGlobalError(data.error || "Terjadi kesalahan saat menyimpan pengajuan.");
        }
        setIsSubmitting(false);
        return;
      }

      // Berhasil, arahkan ke detail pengajuan
      router.push(`/warga/pengajuan/${data.id}?success=true`);
      router.refresh();
    } catch {
      setGlobalError("Kesalahan jaringan, gagal menghubungi server.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
      {/* ── STEP INDICATOR CARD ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          padding: "24px 30px",
          boxShadow: "0 10px 30px 0 rgba(0, 0, 0, 0.04)",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          marginBottom: 24,
        }}
      >
        <StepIndicator steps={steps} currentStep={step} />
      </div>

      {/* ── MAIN CONTENT CONTAINER CARD ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "32px 36px" }}>
          {/* Global Error Banner */}
          {globalError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "16px 20px",
                background: "#feecee",
                border: "1.5px solid #f9b6c4",
                borderRadius: 12,
                color: "#842029",
                marginBottom: 24,
                animation: "fadeIn 0.2s ease",
              }}
            >
              <AlertCircle size={20} color="#f5365c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block", fontSize: 14, marginBottom: 2 }}>
                  Perhatian Diperlukan
                </strong>
                <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{globalError}</span>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              LANGKAH 1: PERSYARATAN BERKAS
              ═════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                  paddingBottom: 18,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(17, 205, 239, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                    Daftar Persyaratan Pelayanan
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                    Pastikan Anda telah menyiapkan dokumen persyaratan berikut sebelum mengisi formulir
                  </p>
                </div>
              </div>

              {service.requirements.length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    background: "#f8f9fa",
                    borderRadius: 14,
                    border: "1.5px dashed #cbd5e1",
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  Layanan ini tidak memerlukan dokumen persyaratan khusus. Anda dapat langsung melanjutkan.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {service.requirements.map((req, i) => {
                    const isOptional =
                      req.toLowerCase().includes("jika ada") ||
                      req.toLowerCase().includes("opsional");

                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                          padding: "18px 22px",
                          background: "#f8fafc",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: 14,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "#eafaf3",
                              color: "#2dce89",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                              {req}
                            </span>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: "#8898aa",
                                marginTop: 2,
                              }}
                            >
                              Scan atau foto dokumen asli/fotokopi yang terbaca jelas
                            </span>
                          </div>
                        </div>

                        {isOptional ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: "4px 12px",
                              borderRadius: 20,
                              background: "#e9ecef",
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Opsional
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: "4px 12px",
                              borderRadius: 20,
                              background: "#eff2fe",
                              color: "#5e72e4",
                              border: "1px solid #cfd7fc",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Wajib
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              LANGKAH 2: ISI FORMULIR
              ═════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                  paddingBottom: 18,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(94, 114, 228, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <FileCheck2 size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                    Isi Formulir Pelayanan
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                    Lengkapi kolom data kependudukan pemohon untuk pengajuan {service.name}
                  </p>
                </div>
              </div>

              <DynamicForm
                fields={service.form_schema || []}
                values={formData}
                errors={formErrors}
                onChange={(name, val) => {
                  setFormData((p) => ({ ...p, [name]: val }));
                  if (formErrors[name]) {
                    setFormErrors((p) => {
                      const next = { ...p };
                      delete next[name];
                      return next;
                    });
                  }
                }}
              />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              LANGKAH 3: UNGGAH DOKUMEN
              ═════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                  paddingBottom: 18,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(45, 206, 137, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <UploadCloud size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                    Unggah Dokumen Lampiran
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                    Lampirkan berkas dokumen digital pendukung (format PDF, JPG, atau PNG)
                  </p>
                </div>
              </div>

              <DocumentUploader
                requirements={service.requirements}
                uploadedDocs={documents}
                onDocUploaded={(document) => {
                  setDocuments((current) => [
                    ...current.filter((item) => item.requirement_name !== document.requirement_name),
                    document,
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

          {/* ═════════════════════════════════════════════════════════════
              LANGKAH 4: REVIEW & KIRIM PENGAJUAN
              ═════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 8,
                  paddingBottom: 18,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(251, 99, 64, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                    Tinjau Ulang Pengajuan
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                    Periksa kembali seluruh kelengkapan isian formulir dan dokumen sebelum dikirim
                  </p>
                </div>
              </div>

              {/* Ringkasan Data Formulir */}
              {service.form_schema?.length > 0 && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "24px 26px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                      borderBottom: "1px solid #e2e8f0",
                      paddingBottom: 12,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                      Data Formulir yang Diisi
                    </h3>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "#5e72e4",
                        cursor: "pointer",
                      }}
                    >
                      <Edit3 size={13} /> Ubah Data
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {service.form_schema.map((f) => (
                      <div
                        key={f.name}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "12px 16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#8898aa",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          {f.label}
                        </span>
                        <strong
                          style={{
                            fontSize: 14,
                            color: "#1e293b",
                            fontWeight: 600,
                            wordBreak: "break-word",
                          }}
                        >
                          {formData[f.name] || <span style={{ color: "#adb5bd" }}>—</span>}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ringkasan Dokumen */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "24px 26px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                    Dokumen Persyaratan Terlampir ({documents.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#2dce89",
                      cursor: "pointer",
                    }}
                  >
                    <Edit3 size={13} /> Kelola Dokumen
                  </button>
                </div>

                {documents.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa", fontStyle: "italic" }}>
                    Tidak ada file lampiran yang diunggah.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {documents.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "12px 16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <CheckCircle2 size={18} color="#2dce89" />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                              {d.requirement_name}
                            </span>
                            <span style={{ display: "block", fontSize: 12, color: "#8898aa" }}>
                              {d.file_name} &bull; {(d.file_size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 12,
                            background: "#eafaf3",
                            color: "#2dce89",
                          }}
                        >
                          Siap Dikirim
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catatan Tambahan (Opsional) */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "24px 26px",
                }}
              >
                <label
                  htmlFor="user-notes"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Catatan Tambahan untuk Petugas Desa (Opsional)
                </label>
                <textarea
                  id="user-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Berkas permohonan surat dibutuhkan mendesak untuk syarat pendaftaran beasiswa..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "#1e293b",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            NAVIGASI LANGKAH & TOMBOL AKSI
            ═════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 36px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                color: "#344767",
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeft size={16} />
              Sebelumnya
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 10,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(94, 114, 228, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              Lanjutkan
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 32px",
                borderRadius: 10,
                background: isSubmitting
                  ? "#cbd5e1"
                  : "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                color: isSubmitting ? "#64748b" : "#ffffff",
                border: "none",
                fontSize: 14,
                fontWeight: 800,
                cursor: isSubmitting ? "wait" : "pointer",
                boxShadow: isSubmitting
                  ? "none"
                  : "0 4px 14px rgba(45, 206, 137, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Memproses Pengajuan...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Kirim Pengajuan Sekarang
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
