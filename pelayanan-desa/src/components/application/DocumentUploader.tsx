"use client";

/**
 * DocumentUploader - Upload dokumen per persyaratan dengan preview
 *
 * Features:
 * - Upload file via /api/upload
 * - Preview gambar (JPG/PNG/WebP) dan PDF (nama saja)
 * - Validasi tipe dan ukuran file di frontend (double-check di backend)
 * - Tampilkan status upload: idle, uploading, success, error
 */

import { useState, useRef } from "react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "@/lib/validations/application";
import { Check, File, Trash2, CloudUpload, AlertCircle } from "lucide-react";

export interface UploadedDoc {
 requirement_name: string;
 storage_key: string;
 file_name: string;
 mime_type: string;
 file_size: number;
}

interface RequirementUploadProps {
 requirementName: string;
 uploadedDoc?: UploadedDoc;
 onUploaded: (doc: UploadedDoc) => void;
 onRemove: () => void;
}

function RequirementUpload({
 requirementName,
 uploadedDoc,
 onUploaded,
 onRemove,
}: RequirementUploadProps) {
 const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
 const [errorMsg, setErrorMsg] = useState("");
 const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Frontend pre-validation
 const allowedMimeTypes: readonly string[] = ALLOWED_MIME_TYPES;
 if (!allowedMimeTypes.includes(file.type)) {
 setErrorMsg("Tipe file tidak diizinkan. Gunakan PDF, JPG, PNG, atau WebP.");
 return;
 }
 if (file.size > MAX_FILE_SIZE_BYTES) {
 setErrorMsg(`Ukuran file melebihi batas ${MAX_FILE_SIZE_LABEL}.`);
 return;
 }

 setErrorMsg("");
 setStatus("uploading");

 // Preview untuk gambar
 if (file.type.startsWith("image/")) {
 const url = URL.createObjectURL(file);
 setPreviewUrl(url);
 } else {
 setPreviewUrl(null);
 }

 // Upload ke backend
 const fd = new FormData();
 fd.append("file", file);
 fd.append("requirement_name", requirementName);

 try {
 const res = await fetch("/api/upload", { method: "POST", body: fd });
 const data = await res.json();

 if (!res.ok) {
 setStatus("error");
 setErrorMsg(data.error ?? "Upload gagal. Silakan coba lagi.");
 setPreviewUrl(null);
 return;
 }

 setStatus("idle");
 onUploaded(data as UploadedDoc);
 } catch {
 setStatus("error");
 setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
 setPreviewUrl(null);
 }

 // Reset input agar bisa upload file yang sama lagi
 if (inputRef.current) inputRef.current.value = "";
 };

 const formatSize = (bytes: number) => {
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
 return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
 };

  return (
    <div style={{
      border: uploadedDoc ? "1px solid #34d399" : errorMsg ? "1px solid #f87171" : "1px solid #e2e8f0",
      background: uploadedDoc ? "rgba(52, 211, 153, 0.05)" : errorMsg ? "rgba(248, 113, 113, 0.05)" : "#fff",
      borderRadius: 16, padding: "16px 20px",
      transition: "all 0.2s ease",
      marginBottom: 12,
      display: "flex", alignItems: "flex-start", gap: 16,
      boxShadow: uploadedDoc ? "none" : "0 2px 4px rgba(0,0,0,0.02)"
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: uploadedDoc ? "#d1fae5" : "#f1f5f9",
        color: uploadedDoc ? "#059669" : "#64748b",
        marginTop: 2
      }}>
        {uploadedDoc ? <Check size={18} strokeWidth={2.5} /> : <File size={18} strokeWidth={2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 4px" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{requirementName}</p>
          {requirementName.toLowerCase().includes("jika ada") || requirementName.toLowerCase().includes("opsional") ? (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#64748b" }}>
              Opsional
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#eff6ff", color: "#2563eb" }}>
              Wajib
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>PDF, JPG, PNG, WebP — maks. {MAX_FILE_SIZE_LABEL}</p>

        {uploadedDoc ? (
          <div style={{ 
            marginTop: 14, display: "flex", alignItems: "center", gap: 12, 
            background: "#fff", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0" 
          }}>
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#059669", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{uploadedDoc.file_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{formatSize(uploadedDoc.file_size)}</p>
            </div>
            <button type="button" onClick={onRemove} style={{ 
              padding: 8, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", transition: "all 0.2s ease" 
            }}>
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <input
              ref={inputRef} type="file" id={`upload-${requirementName}`}
              accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange}
              disabled={status === "uploading"}
              style={{ display: "none" }}
            />
            <label
              htmlFor={`upload-${requirementName}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: status === "uploading" ? "not-allowed" : "pointer",
                background: status === "uploading" ? "#f1f5f9" : "#fff",
                color: status === "uploading" ? "#94a3b8" : "#5b6ef5",
                border: status === "uploading" ? "1px solid #e2e8f0" : "1px solid rgba(91, 110, 245, 0.4)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                transition: "all 0.2s ease"
              }}
            >
              {status === "uploading" ? (
                <>Loading...</>
              ) : (
                <><CloudUpload size={16} /> Pilih File</>
              )}
            </label>
          </div>
        )}

        {errorMsg && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <AlertCircle size={14} /> {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface Props {
 requirements: string[];
 uploadedDocs: UploadedDoc[];
 onDocUploaded: (doc: UploadedDoc) => void;
 onDocRemoved: (requirementName: string) => void;
}

export function DocumentUploader({ requirements, uploadedDocs, onDocUploaded, onDocRemoved }: Props) {
 const uploadedCount = uploadedDocs.length;
 const totalCount = requirements.length;
 const allUploaded = uploadedCount === totalCount;

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-sm text-slate-600">
 Upload semua dokumen persyaratan di bawah ini.
 </p>
 <span className={`text-sm font-semibold ${allUploaded ? "text-emerald-700" : "text-slate-500"}`}>
 {uploadedCount}/{totalCount} terupload
 </span>
 </div>

 {/* Progress bar */}
 <div className="h-2 overflow-hidden rounded-full bg-slate-200">
 <div
 className="h-full rounded-full bg-emerald-500 transition-all duration-500"
 style={{ width: `${totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0}%` }}
 />
 </div>

 <div className="space-y-3">
 {requirements.map((req) => {
 const doc = uploadedDocs.find((d) => d.requirement_name === req);
 return (
 <RequirementUpload
 key={req}
 requirementName={req}
 uploadedDoc={doc}
 onUploaded={onDocUploaded}
 onRemove={() => onDocRemoved(req)}
 />
 );
 })}
 </div>

 {requirements.length === 0 && (
 <div className="py-6 text-center text-slate-500">
 <p className="text-sm text-slate-500">Tidak ada dokumen persyaratan untuk layanan ini.</p>
        </div>
      )}
    </div>
  );
}
