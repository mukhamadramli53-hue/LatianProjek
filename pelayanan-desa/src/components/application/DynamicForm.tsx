"use client";

import React from "react";
import { type FormField } from "@/lib/validations/application";
import {
  AlertCircle,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Briefcase,
  Home,
  FileText,
  HelpCircle,
  Users,
  Banknote,
  Heart,
  ChevronDown,
  Sparkles,
  Info,
} from "lucide-react";

interface Props {
  fields: FormField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

// Menentukan icon yang tepat untuk setiap field formulir
function getFieldIcon(name: string, type?: string) {
  const n = name.toLowerCase();
  if (n.includes("nik")) return CreditCard;
  if (n.includes("kk")) return Users;
  if (n.includes("nama")) return User;
  if (n.includes("tempat")) return MapPin;
  if (n.includes("tanggal") || type === "date") return Calendar;
  if (n.includes("kelamin")) return User;
  if (n.includes("agama")) return Sparkles;
  if (n.includes("perkawinan") || n.includes("status")) return Heart;
  if (n.includes("pekerjaan")) return Briefcase;
  if (n.includes("alamat")) return Home;
  if (n.includes("telepon") || n.includes("whatsapp") || n.includes("hp") || n.includes("phone")) return Phone;
  if (n.includes("penghasilan") || n.includes("gaji") || n.includes("biaya")) return Banknote;
  if (n.includes("tanggungan") || n.includes("anak")) return Users;
  if (n.includes("keperluan")) return HelpCircle;
  return FileText;
}

// Menentukan apakah field cocok mengambil lebar penuh (full span)
function isFullSpanField(field: FormField) {
  if (field.type === "textarea") return true;
  const n = field.name.toLowerCase();
  if (n.includes("alamat")) return true;
  if (n.includes("keperluan")) return true;
  if (n === "nama_pemohon" || n === "nama_lengkap") return true;
  return false;
}

// Mengelompokkan field-field ke dalam kategori visual yang rapi & terstruktur
function groupFields(fields: FormField[]) {
  const groups: {
    id: string;
    title: string;
    subtitle: string;
    icon: typeof User;
    gradient: string;
    fields: FormField[];
  }[] = [
    {
      id: "identitas",
      title: "Data Identitas Pemohon",
      subtitle: "Pastikan data diri sesuai dengan dokumen resmi (e-KTP & Kartu Keluarga)",
      icon: User,
      gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
      fields: [],
    },
    {
      id: "personal",
      title: "Kelahiran & Informasi Pribadi",
      subtitle: "Informasi tanggal lahir, status perkawinan, dan pekerjaan saat ini",
      icon: Calendar,
      gradient: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
      fields: [],
    },
    {
      id: "kontak",
      title: "Kontak & Tempat Tinggal",
      subtitle: "Alamat domisili saat ini dan nomor WhatsApp aktif untuk notifikasi berkas",
      icon: MapPin,
      gradient: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
      fields: [],
    },
    {
      id: "keperluan",
      title: "Rincian & Keterangan Pengajuan",
      subtitle: "Informasi detail terkait maksud dan tujuan permohonan surat",
      icon: FileText,
      gradient: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
      fields: [],
    },
  ];

  for (const field of fields) {
    const n = field.name.toLowerCase();

    if (n.includes("nik") || n.includes("no_kk") || n.includes("nama")) {
      groups[0].fields.push(field);
    } else if (
      n.includes("tempat") ||
      n.includes("lahir") ||
      n.includes("tanggal") ||
      n.includes("kelamin") ||
      n.includes("agama") ||
      n.includes("perkawinan") ||
      n.includes("pekerjaan")
    ) {
      groups[1].fields.push(field);
    } else if (
      n.includes("alamat") ||
      n.includes("telepon") ||
      n.includes("whatsapp") ||
      n.includes("hp") ||
      n.includes("phone")
    ) {
      groups[2].fields.push(field);
    } else {
      groups[3].fields.push(field);
    }
  }

  // Hanya tampilkan grup yang memiliki minimal 1 field
  return groups.filter((g) => g.fields.length > 0);
}

export function DynamicForm({ fields, values, errors, onChange }: Props) {
  if (fields.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "#f8f9fa",
          borderRadius: 16,
          border: "1.5px dashed #cbd5e1",
        }}
      >
        <p style={{ margin: 0, fontSize: 15, color: "#64748b", fontWeight: 600 }}>
          Tidak ada formulir khusus yang perlu diisi untuk layanan ini.
        </p>
      </div>
    );
  }

  const sections = groupFields(fields);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <style>{`
        .dyn-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 22px;
        }
        @media (max-width: 680px) {
          .dyn-form-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
          .dyn-col-span-2 {
            grid-column: span 1 !important;
          }
        }
        .dyn-col-span-2 {
          grid-column: span 2;
        }
        .dyn-input-field {
          width: 100%;
          height: 54px;
          padding: 14px 18px 14px 50px;
          font-size: 16px;
          font-weight: 500;
          color: #0f172a;
          background: #ffffff;
          border: 2px solid #cbd5e1;
          border-radius: 14px;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          font-family: inherit;
        }
        .dyn-input-field:hover {
          border-color: #64748b;
        }
        .dyn-input-field:focus {
          border-color: #5e72e4;
          box-shadow: 0 0 0 4px rgba(94, 114, 228, 0.2);
          background: #ffffff;
        }
        .dyn-input-field::placeholder {
          color: #94a3b8;
          font-weight: 400;
          font-size: 15px;
        }
        .dyn-textarea-field {
          width: 100%;
          min-height: 120px;
          padding: 16px 18px 16px 50px;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.65;
          color: #0f172a;
          background: #ffffff;
          border: 2px solid #cbd5e1;
          border-radius: 14px;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          resize: vertical;
          font-family: inherit;
        }
        .dyn-textarea-field:hover {
          border-color: #64748b;
        }
        .dyn-textarea-field:focus {
          border-color: #5e72e4;
          box-shadow: 0 0 0 4px rgba(94, 114, 228, 0.2);
          background: #ffffff;
        }
        .dyn-textarea-field::placeholder {
          color: #94a3b8;
          font-weight: 400;
          font-size: 15px;
        }
        .dyn-select-field {
          width: 100%;
          height: 54px;
          padding: 14px 44px 14px 50px;
          font-size: 16px;
          font-weight: 500;
          color: #0f172a;
          background: #ffffff;
          border: 2px solid #cbd5e1;
          border-radius: 14px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          cursor: pointer;
          font-family: inherit;
        }
        .dyn-select-field:hover {
          border-color: #64748b;
        }
        .dyn-select-field:focus {
          border-color: #5e72e4;
          box-shadow: 0 0 0 4px rgba(94, 114, 228, 0.2);
          background: #ffffff;
        }
        .dyn-input-error {
          border-color: #f5365c !important;
          background: #fff8f9 !important;
        }
        .dyn-input-error:focus {
          box-shadow: 0 0 0 3.5px rgba(245, 54, 92, 0.16) !important;
        }
      `}</style>

      {/* Info Banner Ramah Pengguna */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          padding: "16px 20px",
          background: "linear-gradient(135deg, #eff2fe 0%, #f4f6ff 100%)",
          border: "1.5px solid #cfd7fc",
          borderRadius: 14,
          color: "#273a8f",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#5e72e4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
            marginTop: 1,
            boxShadow: "0 2px 6px rgba(94, 114, 228, 0.3)",
          }}
        >
          <Info size={17} strokeWidth={2.4} />
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
          <strong style={{ display: "block", color: "#1e293b", fontSize: 14, marginBottom: 2 }}>
            Data Terisi Otomatis
          </strong>
          Nama lengkap, NIK, nomor kontak, dan alamat telah disinkronkan otomatis dari akun Anda.
          Silakan periksa kembali dan sesuaikan isian formulir di bawah ini dengan dokumen resmi Anda.
        </div>
      </div>

      {/* Render Grup-Grup Formulir */}
      {sections.map((section, sIdx) => {
        const HeaderIcon = section.icon;

        return (
          <div
            key={section.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: "26px 28px",
              boxShadow: "0 4px 18px rgba(0, 0, 0, 0.03)",
              transition: "box-shadow 0.2s ease",
            }}
          >
            {/* Section Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 22,
                paddingBottom: 16,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: section.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)",
                }}
              >
                <HeaderIcon size={20} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#1e293b",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {section.title}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#64748b",
                      background: "#f1f5f9",
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    Bagian {sIdx + 1}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
                  {section.subtitle}
                </p>
              </div>
            </div>

            {/* Grid Fields */}
            <div className="dyn-form-grid">
              {section.fields.map((field) => {
                const FieldIcon = getFieldIcon(field.name, field.type);
                const isFullSpan = isFullSpanField(field);
                const hasError = Boolean(errors[field.name]);
                const curVal = values[field.name] ?? "";

                return (
                  <div
                    key={field.name}
                    className={isFullSpan ? "dyn-col-span-2" : ""}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    {/* Label & Badges Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                        gap: 8,
                      }}
                    >
                      <label
                        htmlFor={`field-${field.name}`}
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0f172a",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                      >
                        {field.label}
                        {field.required ? (
                          <span
                            title="Wajib diisi"
                            style={{
                              color: "#f5365c",
                              fontWeight: 800,
                              fontSize: 15,
                            }}
                          >
                            *
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#94a3b8",
                              marginLeft: 4,
                            }}
                          >
                            (Opsional)
                          </span>
                        )}
                      </label>

                      {/* Character Counter or Helper Badge */}
                      {field.maxLength && field.type !== "select" && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            padding: "3px 10px",
                            borderRadius: 6,
                            background:
                              curVal.length === field.maxLength
                                ? "#eafaf3"
                                : "#f8f9fa",
                            color:
                              curVal.length === field.maxLength
                                ? "#2dce89"
                                : "#64748b",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {curVal.length}/{field.maxLength} digit
                        </span>
                      )}
                    </div>

                    {/* Input Field with Left Anchor Icon */}
                    <div style={{ position: "relative" }}>
                      {/* Left Anchor Icon */}
                      <div
                        style={{
                          position: "absolute",
                          left: 16,
                          top: field.type === "textarea" ? 18 : "50%",
                          transform: field.type === "textarea" ? "none" : "translateY(-50%)",
                          color: hasError ? "#f5365c" : "#64748b",
                          pointerEvents: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FieldIcon size={20} strokeWidth={2.2} />
                      </div>

                      {/* Input Variant */}
                      {field.type === "textarea" ? (
                        <textarea
                          id={`field-${field.name}`}
                          name={field.name}
                          value={curVal}
                          onChange={(e) => onChange(field.name, e.target.value)}
                          placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                          maxLength={field.maxLength}
                          rows={3}
                          className={`dyn-textarea-field ${hasError ? "dyn-input-error" : ""}`}
                        />
                      ) : field.type === "select" ? (
                        <div style={{ position: "relative" }}>
                          <select
                            id={`field-${field.name}`}
                            name={field.name}
                            value={curVal}
                            onChange={(e) => onChange(field.name, e.target.value)}
                            className={`dyn-select-field ${hasError ? "dyn-input-error" : ""}`}
                          >
                            <option value="">-- Pilih {field.label} --</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          {/* Right Chevron for Select */}
                          <div
                            style={{
                              position: "absolute",
                              right: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#64748b",
                              pointerEvents: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronDown size={17} strokeWidth={2.5} />
                          </div>
                        </div>
                      ) : (
                        <input
                          id={`field-${field.name}`}
                          name={field.name}
                          type={field.type}
                          value={curVal}
                          onChange={(e) => onChange(field.name, e.target.value)}
                          placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                          maxLength={field.maxLength}
                          min={field.min}
                          max={field.max}
                          className={`dyn-input-field ${hasError ? "dyn-input-error" : ""}`}
                        />
                      )}
                    </div>

                    {/* Error Message */}
                    {hasError && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#f5365c",
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{errors[field.name]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
