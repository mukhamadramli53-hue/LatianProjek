import Link from "next/link";
import { getServices } from "@/lib/actions/service";
import { Search, Info, Clock, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Katalog Layanan Desa - Sistem Pelayanan Desa",
  description:
    "Jelajahi berbagai layanan administrasi kependudukan yang disediakan oleh pemerintah desa. Ajukan surat dan dokumen secara online.",
};

export default async function LayananPublicPage(props: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams?.search || "";

  const services = await getServices({ search, isActive: true });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Header & Search Hero Card ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "36px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#5e72e4",
            background: "#eff2fe",
            padding: "5px 14px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShieldCheck size={14} /> Pelayanan Administrasi Desa
        </span>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 30,
            fontWeight: 800,
            color: "#1e293b",
            letterSpacing: "-0.02em",
          }}
        >
          Katalog Layanan Mandiri Desa
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            fontSize: 15,
            color: "#67748e",
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          Pilih jenis surat atau dokumen yang Anda butuhkan. Seluruh proses permohonan dapat dipantau langsung secara real-time.
        </p>

        {/* Search Bar */}
        <form
          action="/layanan"
          method="GET"
          style={{
            width: "100%",
            maxWidth: 540,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f8f9fa",
            borderRadius: 14,
            padding: "6px 8px 6px 16px",
            border: "1.5px solid #e9ecef",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Search size={18} color="#8898aa" style={{ flexShrink: 0 }} />
          <input
            type="text"
            name="search"
            placeholder="Cari surat... (contoh: SKTM, SKCK)"
            defaultValue={search}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 14,
              color: "#344767",
              outline: "none",
              padding: "6px 0",
            }}
          />
          <button
            type="submit"
            style={{
              border: "none",
              background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(94, 114, 228, 0.3)",
            }}
          >
            Cari
          </button>
        </form>
      </div>

      {/* ── Daftar Kartu Layanan ── */}
      {services.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <Info size={40} color="#8898aa" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            Layanan Tidak Ditemukan
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa" }}>
            Tidak ada layanan yang sesuai dengan kata kunci &ldquo;{search}&rdquo;. Silakan coba kata kunci lain.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                background: "#ffffff",
                borderRadius: 16,
                boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                padding: "26px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 18,
                transition: "all 0.2s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: "#5e72e4",
                      background: "#eff2fe",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontFamily: "monospace",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {service.code}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2dce89",
                      background: "#eafaf3",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    Resmi Aktif
                  </span>
                </div>

                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#1e293b",
                    lineHeight: 1.35,
                  }}
                >
                  {service.name}
                </h2>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    color: "#67748e",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {service.description || "Layanan pengajuan administrasi kependudukan resmi desa."}
                </p>
              </div>

              <div
                style={{
                  paddingTop: 16,
                  borderTop: "1px solid #f0f2f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8898aa", fontWeight: 600 }}>
                  <Clock size={14} color="#5e72e4" />
                  <span>{service.estimatedTime || "1 - 3 Hari"}</span>
                </div>

                <Link
                  href={`/layanan/${service.code}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "#f8f9fe",
                    color: "#5e72e4",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid #dce4fd",
                    transition: "all 0.15s ease",
                  }}
                >
                  Lihat Detail <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
