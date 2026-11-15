"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createService, updateService } from "@/lib/actions/service";
import { Trash2, Plus, ArrowUp, ArrowDown, Loader2, FileText, CheckCircle2, ListPlus, Sparkles } from "lucide-react";
import type { Service } from "@prisma/client";

interface ServiceFormProps {
  initialData?: Service | null;
}

type FieldType = "text" | "textarea" | "number" | "select" | "date" | "email" | "tel";

interface FormFieldDef {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select
  placeholder?: string;
}

function parseRequirements(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { requirements?: unknown[] }).requirements)) {
        return (parsed as { requirements: unknown[] }).requirements.map(String);
      }
    } catch {
      return [];
    }
  } else if (typeof raw === "object" && raw !== null && Array.isArray((raw as { requirements?: unknown[] }).requirements)) {
    return (raw as { requirements: unknown[] }).requirements.map(String);
  }
  return [];
}

function parseFormSchema(raw: unknown): FormFieldDef[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FormFieldDef[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as FormFieldDef[];
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { fields?: FormFieldDef[] }).fields)) {
        return (parsed as { fields: FormFieldDef[] }).fields;
      }
    } catch {
      return [];
    }
  } else if (typeof raw === "object" && raw !== null) {
    if (Array.isArray((raw as { fields?: FormFieldDef[] }).fields)) {
      return (raw as { fields: FormFieldDef[] }).fields;
    }
  }
  return [];
}

export default function ServiceForm({ initialData }: ServiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [code, setCode] = useState(initialData?.code || "");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [estimatedTime, setEstimatedTime] = useState(initialData?.estimatedTime || "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  
  // Requirements & Form Schema (safely parsed to prevent [object Object] errors)
  const [requirements, setRequirements] = useState<string[]>(() => parseRequirements(initialData?.requirements));
  const [formSchema, setFormSchema] = useState<FormFieldDef[]>(() => parseFormSchema(initialData?.form_schema));

  // --- Handlers for Requirements ---
  const handleAddRequirement = () => setRequirements([...requirements, ""]);
  const handleRemoveRequirement = (index: number) => setRequirements(requirements.filter((_, i) => i !== index));
  const handleRequirementChange = (index: number, value: string) => {
    const newReqs = [...requirements];
    newReqs[index] = value;
    setRequirements(newReqs);
  };

  // --- Handlers for Form Schema ---
  const handleAddField = () => {
    setFormSchema([
      ...formSchema,
      { name: "", label: "", type: "text", required: true }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFormSchema(formSchema.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof FormFieldDef, value: string | boolean) => {
    const newSchema = [...formSchema];
    if (key === "options") {
      newSchema[index].options = String(value).split(",").map((s: string) => s.trim()).filter(Boolean);
    } else {
      newSchema[index] = { ...newSchema[index], [key]: value };
    }
    
    // Auto-generate name from label if name is empty
    if (key === "label" && !newSchema[index].name && typeof value === "string") {
      newSchema[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, '');
    }
    
    setFormSchema(newSchema);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newSchema = [...formSchema];
      [newSchema[index - 1], newSchema[index]] = [newSchema[index], newSchema[index - 1]];
      setFormSchema(newSchema);
    } else if (direction === "down" && index < formSchema.length - 1) {
      const newSchema = [...formSchema];
      [newSchema[index + 1], newSchema[index]] = [newSchema[index], newSchema[index + 1]];
      setFormSchema(newSchema);
    }
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const filteredReqs = requirements.filter((req) => req.trim() !== "");
    const validSchema = formSchema.filter(f => f.name.trim() !== "" && f.label.trim() !== "");

    try {
      if (initialData) {
        await updateService({
          id: initialData.id,
          code,
          name,
          description,
          requirements: filteredReqs,
          form_schema: validSchema,
          estimatedTime,
          isActive,
        });
      } else {
        await createService({
          code,
          name,
          description,
          requirements: filteredReqs,
          form_schema: validSchema,
          estimatedTime,
          isActive,
        });
      }
      router.push("/kades/layanan");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Terjadi kesalahan sistem saat menyimpan layanan.");
      } else {
        setError("Terjadi kesalahan sistem saat menyimpan layanan.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && (
        <div
          style={{
            padding: "16px 20px",
            background: "#feecee",
            color: "#f5365c",
            borderRadius: 12,
            border: "1px solid #fec5b8",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Section 1: Informasi Dasar ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "28px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <FileText size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              Informasi Dasar Layanan
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
              Identitas dan data pokok surat permohonan yang tampil di portal publik warga
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="code" style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>
              Kode Layanan <span style={{ color: "#f5365c" }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Contoh: SKTM atau SP-SKCK"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d2d6da",
                fontSize: 14,
                color: "#344767",
                outline: "none",
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="name" style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>
              Nama Layanan <span style={{ color: "#f5365c" }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Surat Pengantar Pembuatan SKCK"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d2d6da",
                fontSize: 14,
                color: "#344767",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          <label htmlFor="description" style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>
            Deskripsi Singkat Layanan
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan kegunaan dan fungsi permohonan surat ini bagi masyarakat..."
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #d2d6da",
              fontSize: 14,
              color: "#344767",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="estimatedTime" style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>
              Estimasi Waktu Penyelesaian
            </label>
            <input
              id="estimatedTime"
              type="text"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="Contoh: 1 Hari Kerja"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d2d6da",
                fontSize: 14,
                color: "#344767",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>
              Status Aktif Layanan
            </label>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
                cursor: "pointer",
                padding: "8px 14px",
                background: isActive ? "#eafaf3" : "#f8f9fa",
                borderRadius: 10,
                border: isActive ? "1px solid #bbf1dc" : "1px solid #e9ecef",
                width: "fit-content",
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#2dce89" }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? "#2dce89" : "#8898aa" }}>
                {isActive ? "Layanan Aktif (Dapat Diajukan Warga)" : "Nonaktif (Disembunyikan)"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Section 2: Persyaratan Dokumen ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "28px 32px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                Persyaratan Dokumen Lampiran
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                Tentukan dokumen identitas dan berkas fisik yang wajib diunggah pemohon
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRequirement}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              background: "#eff2fe",
              color: "#5e72e4",
              border: "1px solid #dce4fd",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Tambah Syarat Dokumen
          </button>
        </div>

        {requirements.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", background: "#f8f9fa", borderRadius: 12, border: "1px dashed #d2d6da" }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa" }}>
              Belum ada persyaratan dokumen. Klik tombol &ldquo;Tambah Syarat Dokumen&rdquo; di atas.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requirements.map((req, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#f8f9fa",
                  borderRadius: 10,
                  border: "1px solid #e9ecef",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#8898aa", width: 24, textAlign: "center" }}>
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleRequirementChange(index, e.target.value)}
                  placeholder="Nama dokumen, contoh: Fotokopi KTP (e-KTP)"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d2d6da",
                    fontSize: 13.5,
                    color: "#344767",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(index)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#feecee",
                    color: "#f5365c",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Hapus Syarat"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Formulir Isian Dinamis ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "28px 32px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <ListPlus size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                Formulir Isian Dinamis (Form Schema)
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                Tentukan kolom isian data teks, angka, pilihan, atau tanggal yang wajib diisi warga
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddField}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              background: "#e8f9fd",
              color: "#11cdef",
              border: "1px solid #c2f0f9",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Tambah Field Isian
          </button>
        </div>

        {formSchema.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", background: "#f8f9fa", borderRadius: 12, border: "1px dashed #d2d6da" }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa" }}>
              Tidak ada kolom isian khusus. Formulir hanya akan memuat identitas dasar pemohon.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {formSchema.map((field, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "16px 18px",
                  background: "#f8f9fa",
                  borderRadius: 12,
                  border: "1px solid #e9ecef",
                  alignItems: "flex-start",
                }}
              >
                {/* Reorder Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => moveField(index, "up")}
                    disabled={index === 0}
                    style={{
                      border: "1px solid #d2d6da",
                      background: "#ffffff",
                      borderRadius: 6,
                      padding: 4,
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      opacity: index === 0 ? 0.3 : 1,
                      color: "#344767",
                    }}
                    title="Pindah ke Atas"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, "down")}
                    disabled={index === formSchema.length - 1}
                    style={{
                      border: "1px solid #d2d6da",
                      background: "#ffffff",
                      borderRadius: 6,
                      padding: 4,
                      cursor: index === formSchema.length - 1 ? "not-allowed" : "pointer",
                      opacity: index === formSchema.length - 1 ? 0.3 : 1,
                      color: "#344767",
                    }}
                    title="Pindah ke Bawah"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Form Field Definition Grid */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#8898aa", marginBottom: 4, textTransform: "uppercase" }}>
                      Label Field
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                      placeholder="Misal: Keperluan Pembuatan"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #d2d6da",
                        fontSize: 13,
                        color: "#344767",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#8898aa", marginBottom: 4, textTransform: "uppercase" }}>
                      Key / Variabel
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, "name", e.target.value)}
                      placeholder="misal: keperluan"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #d2d6da",
                        fontSize: 13,
                        color: "#344767",
                        outline: "none",
                        fontFamily: "monospace",
                        background: "#f1f5f9",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#8898aa", marginBottom: 4, textTransform: "uppercase" }}>
                      Tipe Isian
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => handleFieldChange(index, "type", e.target.value as FieldType)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #d2d6da",
                        fontSize: 13,
                        color: "#344767",
                        outline: "none",
                        background: "#ffffff",
                      }}
                    >
                      <option value="text">Teks Pendek</option>
                      <option value="textarea">Teks Panjang (Paragraf)</option>
                      <option value="number">Angka</option>
                      <option value="date">Tanggal</option>
                      <option value="select">Pilihan (Select Dropdown)</option>
                      <option value="tel">Nomor Telepon</option>
                      <option value="email">Email</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 18 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "#5e72e4" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#344767" }}>Wajib Diisi</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(index)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "#feecee",
                        color: "#f5365c",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>

                  {field.type === "select" && (
                    <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#8898aa", marginBottom: 4 }}>
                        Daftar Opsi Pilihan (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={field.options?.join(", ") || ""}
                        onChange={(e) => handleFieldChange(index, "options", e.target.value)}
                        placeholder="Contoh: Belum Kawin, Kawin, Cerai Hidup, Cerai Mati"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #d2d6da",
                          fontSize: 13,
                          color: "#344767",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky Action Buttons ── */}
      <div
        style={{
          position: "sticky",
          bottom: 20,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/kades/layanan")}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            background: "#ffffff",
            color: "#67748e",
            border: "1px solid #d2d6da",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 10,
            background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
            color: "#ffffff",
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(45, 206, 137, 0.4)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Sparkles size={16} /> {initialData ? "Simpan Perubahan Layanan" : "Tambah Layanan Baru"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
