import { getServices } from "@/lib/actions/service";
import Link from "next/link";
import { FileText, ArrowRight, Clock, Sparkles } from "lucide-react";

export const metadata = {
  title: "Pilih Layanan | Pelayanan Desa",
};

export default async function AjukanLayananPage() {
  const services = await getServices({ isActive: true });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
      {/* Header Info - Crisp White on Purple Banner */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(255, 255, 255, 0.22)", color: "#ffffff",
          padding: "6px 16px", borderRadius: 999, fontSize: 11.5, fontWeight: 800,
          marginBottom: 12, border: "1px solid rgba(255, 255, 255, 0.35)",
          textTransform: "uppercase", letterSpacing: "0.06em",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        }}>
          <Sparkles size={13} color="#ffffff" /> Katalog Layanan Resmi Desa
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 8px",
          letterSpacing: "-0.02em",
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}>
          Pilih Jenis Pelayanan
        </h2>
        <p style={{
          fontSize: 14.5, color: "#ffffff", maxWidth: 660, margin: 0, lineHeight: 1.6,
          fontWeight: 500, opacity: 0.95,
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
        }}>
          Proses cepat, transparan, dan terverifikasi secara berjenjang. Pilih surat permohonan yang Anda butuhkan.
        </p>
      </div>

      {/* Grid Services */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24,
      }}>
        {services.map((service, i) => {
          const isSKTM = service.code === "SKTM";
          return (
            <Link
              key={service.code}
              href={`/warga/ajukan/${service.code}`}
              className="argon-service-card"
              style={{
                textDecoration: "none",
                background: "#ffffff",
                borderRadius: "1rem",
                padding: "26px 26px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.06)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                position: "relative",
                overflow: "hidden",
                animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease",
              }}
            >
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%",
                    background: isSKTM
                      ? "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)"
                      : "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isSKTM
                      ? "0 4px 14px rgba(94, 114, 228, 0.4)"
                      : "0 4px 14px rgba(17, 205, 239, 0.4)",
                    flexShrink: 0,
                  }}>
                    <FileText size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span style={{
                      display: "inline-block", padding: "4px 10px", borderRadius: 6,
                      background: isSKTM ? "rgba(94, 114, 228, 0.12)" : "rgba(17, 205, 239, 0.15)",
                      color: isSKTM ? "#5e72e4" : "#0b96b0",
                      fontSize: 11.5, fontWeight: 800,
                      letterSpacing: "0.04em", marginBottom: 6,
                      border: isSKTM ? "1px solid rgba(94, 114, 228, 0.25)" : "1px solid rgba(17, 205, 239, 0.3)",
                    }}>
                      {service.code}
                    </span>
                    <h3 style={{
                      margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b", lineHeight: 1.35,
                    }}>
                      {service.name}
                    </h3>
                  </div>
                </div>

                <p style={{
                  margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.6, fontWeight: 450,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {service.description}
                </p>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderTop: "1px solid #f1f5f9", paddingTop: 16, marginTop: "auto",
                position: "relative", zIndex: 1,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                  <Clock size={15} style={{ color: "#5e72e4" }} />
                  <span>{service.estimatedTime || "1 Hari Kerja"}</span>
                </div>
                <div className="argon-service-btn" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "#ffffff",
                  fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                  background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  padding: "8px 16px", borderRadius: "0.5rem",
                  boxShadow: "0 4px 10px rgba(94, 114, 228, 0.35)",
                  transition: "all 0.2s ease",
                }}>
                  Ajukan <ArrowRight size={13} strokeWidth={2.5} />
                </div>
              </div>
            </Link>
          );
        })}

        {services.length === 0 && (
          <div style={{
            gridColumn: "1 / -1", textAlign: "center", padding: 60,
            background: "#ffffff", borderRadius: "1rem",
            border: "2px dashed #cbd5e1",
          }}>
            <FileText size={44} color="#64748b" style={{ margin: "0 auto 14px" }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Belum ada layanan aktif</h3>
            <p style={{ color: "#64748b", fontSize: 13.5, margin: 0 }}>Silakan hubungi staf desa atau administrator.</p>
          </div>
        )}
      </div>

      <style>{`
        .argon-service-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 24px 38px 0 rgba(0, 0, 0, 0.1) !important;
        }
        .argon-service-card:hover .argon-service-btn {
          filter: brightness(1.1) !important;
          box-shadow: 0 6px 14px rgba(94, 114, 228, 0.45) !important;
        }
      `}</style>
    </div>
  );
}
