import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceByCode } from "@/lib/actions/service";
import { isAllowedService } from "@/lib/validations/service";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
  Info,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { auth } from "@/lib/auth";

export async function generateMetadata(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const service = await getServiceByCode(params.code);

  if (!service || !service.isActive || !isAllowedService(service)) {
    return { title: "Layanan Tidak Ditemukan" };
  }

  return {
    title: `${service.name} - Sistem Pelayanan Desa`,
    description: service.description,
  };
}

export default async function ServiceDetailPage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const service = await getServiceByCode(params.code);

  if (!service || !service.isActive || !isAllowedService(service)) {
    notFound();
  }

  const session = await auth();
  const userRole = session?.user?.role;
  const isWarga = userRole === "WARGA";

  // Parse requirements
  let requirements: string[] = [];
  try {
    if (service.requirements) {
      const rawReq =
        typeof service.requirements === "string"
          ? JSON.parse(service.requirements)
          : service.requirements;
      if (Array.isArray(rawReq)) {
        requirements = rawReq.map(String);
      }
    }
  } catch (e) {
    console.error("Failed to parse requirements", e);
  }

  const getDashboardHref = (role?: string) => {
    switch (role) {
      case "WARGA": return "/warga/dashboard";
      case "STAF": return "/staf/dashboard";
      case "SUPERVISOR": return "/supervisor/dashboard";
      case "KEPALA_DESA": return "/kades/dashboard";
      default: return "/login";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "WARGA": return "Warga Desa";
      case "STAF": return "Staf Pelayanan Desa";
      case "SUPERVISOR": return "Supervisor Desa";
      case "KEPALA_DESA": return "Kepala Desa";
      default: return "Pengguna";
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Tombol Navigasi Kembali ── */}
      <div>
        <Link
          href="/layanan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            background: "#ffffff",
            color: "#344767",
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            transition: "all 0.2s ease",
          }}
        >
          <ArrowLeft size={16} color="#5e72e4" />
          Kembali ke Katalog Layanan
        </Link>
      </div>

      {/* ── KARTU 1: Hero Header Layanan (Argon 2 White Card) ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "36px 40px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#5e72e4",
              background: "#eff2fe",
              border: "1px solid #dce4fd",
              padding: "5px 12px",
              borderRadius: 8,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            {service.code}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#2dce89",
              background: "#eafaf3",
              border: "1px solid #bbf1dc",
              padding: "5px 12px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <ShieldCheck size={14} /> Layanan Resmi Desa Aktif
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 30,
            fontWeight: 800,
            color: "#1e293b",
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}
        >
          {service.name}
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: 15,
            color: "#67748e",
            lineHeight: 1.65,
            maxWidth: 820,
          }}
        >
          {service.description || "Layanan penerbitan surat pengantar dan administrasi resmi pemerintah desa."}
        </p>

        {/* Info Strip (Estimasi, Biaya, Format) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            paddingTop: 24,
            borderTop: "1px solid #f0f2f5",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 18px",
              background: "#f8f9fa",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>
                Estimasi Proses
              </span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#344767" }}>
                {service.estimatedTime || "1 - 3 Hari Kerja"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 18px",
              background: "#f8f9fa",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>
                Biaya Retribusi
              </span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2dce89" }}>
                Gratis (Rp 0,-)
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 18px",
              background: "#f8f9fa",
              borderRadius: 12,
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>
                Metode Pengajuan
              </span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#344767" }}>
                Online Mandiri 24 Jam
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KARTU 2 & 3: Konten 2 Kolom (Persyaratan & Tindakan Aksi) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Kolom Kiri: Persyaratan & Alur */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, gridColumn: "span 2" }}>
          {/* Card Persyaratan */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              padding: "28px 32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
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
                <FileText size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                  Persyaratan Pengajuan
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                  Siapkan pindaian dokumen berikut dalam format PDF atau foto jelas (JPG/PNG)
                </p>
              </div>
            </div>

            {requirements.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  background: "#f8f9fa",
                  borderRadius: 12,
                  border: "1px dashed #d2d6da",
                }}
              >
                <p style={{ margin: 0, fontSize: 14, color: "#8898aa" }}>
                  Tidak ada dokumen persyaratan khusus yang diperlukan untuk layanan ini.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {requirements.map((req, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 18px",
                      background: "#f8f9fa",
                      borderRadius: 12,
                      border: "1px solid #e9ecef",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <CheckCircle2 size={18} color="#2dce89" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#344767" }}>
                        {req}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#5e72e4",
                        background: "#eff2fe",
                        padding: "3px 8px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      Wajib
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card Alur Pelayanan Desa */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              padding: "28px 32px",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              Tahapan & Alur Pelayanan Desa
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              {[
                { step: 1, title: "Pengajuan Mandiri", desc: "Isi data formulir dan unggah dokumen via portal", color: "#5e72e4" },
                { step: 2, title: "Verifikasi Berkas", desc: "Staf memeriksa kelengkapan persyaratan fisik", color: "#11cdef" },
                { step: 3, title: "Kendali Mutu (QC)", desc: "Supervisor menelaah draf redaksional surat", color: "#fb6340" },
                { step: 4, title: "Persetujuan Kades", desc: "Kepala Desa menerbitkan surat resmi desa", color: "#2dce89" },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    padding: "16px",
                    background: "#f8f9fa",
                    borderRadius: 12,
                    border: "1px solid #e9ecef",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: item.color,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.step}
                  </div>
                  <strong style={{ fontSize: 13.5, color: "#1e293b" }}>{item.title}</strong>
                  <p style={{ margin: 0, fontSize: 12, color: "#67748e", lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Aksi Pengajuan & Bantuan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, gridColumn: "span 1" }}>
          {/* Card Aksi Utama */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              padding: "28px 26px",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              Aksi Pengajuan
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#8898aa" }}>
              Mulai permohonan surat secara online langsung dari tempat Anda
            </p>

            {isWarga ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Link
                  href={`/warga/ajukan/${service.code}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 12,
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 6px 18px rgba(94, 114, 228, 0.4)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  Ajukan Surat Sekarang <ArrowRight size={18} />
                </Link>
                <p style={{ margin: 0, fontSize: 12, color: "#67748e", textAlign: "center", lineHeight: 1.4 }}>
                  Permohonan akan langsung masuk antrean pemeriksaan staf desa secara otomatis.
                </p>
              </div>
            ) : session?.user ? (
              <div
                style={{
                  background: "#fff8ec",
                  border: "1px solid #ffdcd3",
                  borderRadius: 12,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Info size={18} color="#fb6340" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#fb6340" }}>
                      Masuk sebagai {getRoleLabel(userRole)}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#525f7f", lineHeight: 1.5 }}>
                      Akun <strong>{session.user.name}</strong> ({userRole}) bertugas dalam alur pemeriksaan internal.
                      Pembuatan permohonan baru hanya dapat diajukan langsung oleh akun <strong>Warga Desa</strong>.
                    </p>
                  </div>
                </div>

                <Link
                  href={getDashboardHref(userRole)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "#fb6340",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(251, 99, 64, 0.3)",
                  }}
                >
                  Buka Portal {getRoleLabel(userRole)} <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    background: "#f8f9fe",
                    border: "1px solid #dce4fd",
                    borderRadius: 12,
                    padding: "16px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: "#525f7f", lineHeight: 1.5 }}>
                    Silakan masuk dengan akun Warga Desa Anda (menggunakan NIK atau Email) untuk mengajukan layanan ini.
                  </p>
                </div>

                <Link
                  href="/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 18px",
                    borderRadius: 10,
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(94, 114, 228, 0.35)",
                  }}
                >
                  Masuk dengan Akun Warga
                </Link>
              </div>
            )}
          </div>

          {/* Card Informasi Bantuan */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              padding: "24px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#eff2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#5e72e4",
                flexShrink: 0,
              }}
            >
              <HelpCircle size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                Butuh Bantuan?
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: "#67748e", lineHeight: 1.5 }}>
                Kantor Balai Desa melayani konsultasi fisik pada hari kerja: <strong>Senin - Jumat (08.00 - 15.00 WIB)</strong> atau gunakan fitur Asisten AI Desa di pojok kanan bawah.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
