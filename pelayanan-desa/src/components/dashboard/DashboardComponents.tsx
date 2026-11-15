import Link from "next/link";
import type { ComponentType } from "react";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import type { ApplicationStatus } from "@prisma/client";
import { AlertCircle, Clock, FileText, Activity, Calendar, TrendingUp, TrendingDown, Minus, FileDown, Send, CheckCircle2 } from "lucide-react";

// ============================================================
// STAT CARD — Premium Argon-style with floating icon
// ============================================================
export function StatCard({
  label,
  value,
  tone = "blue",
  icon: Icon,
  footerText = "Update sekarang",
  footerIcon: FooterIcon = Calendar,
  trend,
}: {
  label: string;
  value: number | string;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "indigo";
  icon?: ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  footerIcon?: ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  footerText?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const toneConfig: Record<string, { gradient: string; shadow: string }> = {
    blue:   { gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)", shadow: "rgba(94, 114, 228, 0.4)" },
    indigo: { gradient: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)", shadow: "rgba(94, 114, 228, 0.4)" },
    green:  { gradient: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)", shadow: "rgba(45, 206, 137, 0.4)" },
    amber:  { gradient: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)", shadow: "rgba(251, 99, 64, 0.4)" },
    red:    { gradient: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)", shadow: "rgba(245, 54, 92, 0.4)" },
    purple: { gradient: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)", shadow: "rgba(130, 94, 228, 0.4)" },
  };

  const cfg = toneConfig[tone] || toneConfig.blue;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#2dce89" : trend === "down" ? "#f5365c" : "#8392ab";

  return (
    <>
      <style>{`
        .argon-stat-card {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease !important;
        }
        .argon-stat-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 24px 38px 0 rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
      <div className="argon-stat-card" style={{
        background: "#ffffff",
        borderRadius: "1rem",
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(0, 0, 0, 0.04)",
        padding: "20px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        {/* Left Info Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 4px", fontSize: 11.5, fontWeight: 800, color: "#64748b",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {label}
          </p>
          <h3 style={{
            margin: "0 0 6px", fontSize: 26, fontWeight: 800,
            color: "#1e293b", lineHeight: 1.2, letterSpacing: "-0.02em",
          }}>
            {value}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            {trend && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 2,
                fontWeight: 700, color: trendColor, fontSize: 12,
              }}>
                <TrendIcon size={13} strokeWidth={2.5} />
                {trend === "up" ? "+55%" : trend === "down" ? "-12%" : "0%"}
              </span>
            )}
            {FooterIcon && !trend && <FooterIcon size={12} strokeWidth={2.2} style={{ color: "#64748b" }} />}
            <span style={{ fontSize: 12 }}>{footerText}</span>
          </div>
        </div>

        {/* Right Circular Gradient Icon Box (Argon 2 Signature) */}
        {Icon && (
          <div style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: cfg.gradient,
            boxShadow: `0 4px 14px ${cfg.shadow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
          }}>
            <Icon size={22} strokeWidth={2} />
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// APPLICATION TABLE — Clean, modern
// ============================================================
type TableApplication = {
  id: string;
  nomor_pengajuan: string;
  status: ApplicationStatus;
  service: { name: string };
  user?: { name: string };
  documents?: Array<{
    id: string;
    requirement_name: string;
    file_name: string;
    storage_key: string;
    file_size?: number;
  }>;
};

export function ApplicationTable({
  applications,
  showApplicant = false,
  baseRoute = "/warga/pengajuan",
}: {
  applications: TableApplication[];
  showApplicant?: boolean;
  baseRoute?: string;
}) {
  if (applications.length === 0) return <EmptyState title="Belum ada pengajuan" />;

  return (
    <div style={{ overflowX: "auto" }}>
      <style>{`
        .argon-action-btn {
          transition: all 0.2s ease !important;
        }
        .argon-action-btn:hover {
          background: linear-gradient(310deg, #5e72e4 0%, #825ee4 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(94, 114, 228, 0.35) !important;
          transform: translateY(-1px) !important;
        }
        .argon-table-row {
          transition: background 0.15s ease !important;
        }
        .argon-table-row:hover {
          background: #f8f9fa !important;
        }
      `}</style>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e9ecef" }}>
            <th style={{
              padding: "10px 16px", fontSize: "0.65rem", fontWeight: 700,
              textTransform: "uppercase", color: "#8392ab", letterSpacing: "0.05em",
            }}>Nomor</th>
            {showApplicant && (
              <th style={{
                padding: "10px 16px", fontSize: "0.65rem", fontWeight: 700,
                textTransform: "uppercase", color: "#8392ab", letterSpacing: "0.05em",
              }}>Warga</th>
            )}
            <th style={{
              padding: "10px 16px", fontSize: "0.65rem", fontWeight: 700,
              textTransform: "uppercase", color: "#8392ab", letterSpacing: "0.05em",
            }}>Layanan</th>
            <th style={{
              padding: "10px 16px", fontSize: "0.65rem", fontWeight: 700,
              textTransform: "uppercase", color: "#8392ab", letterSpacing: "0.05em",
            }}>Status</th>
            <th style={{
              padding: "10px 16px", fontSize: "0.65rem", fontWeight: 700,
              textTransform: "uppercase", color: "#8392ab", letterSpacing: "0.05em",
              textAlign: "right",
            }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const officialLetter = app.documents?.find(
              (d) =>
                d.requirement_name === "Surat Resmi Terbit (PDF)" ||
                d.requirement_name.toLowerCase().includes("surat resmi")
            );

            return (
              <tr key={app.id} className="argon-table-row" style={{ borderBottom: "1px solid #e9ecef" }}>
                <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                  <span style={{
                    fontFamily: "monospace", fontSize: 11.5, fontWeight: 700,
                    background: "#f8f9fa", color: "#344767",
                    border: "1px solid #e9ecef",
                    padding: "3px 8px", borderRadius: 6,
                    display: "inline-block",
                  }}>
                    {app.nomor_pengajuan}
                  </span>
                </td>
                {showApplicant && (
                  <td style={{ padding: "14px 16px", verticalAlign: "middle", color: "#344767", fontWeight: 600, fontSize: 13 }}>
                    {app.user?.name ?? "—"}
                  </td>
                )}
                <td style={{ padding: "14px 16px", verticalAlign: "middle", color: "#344767", fontWeight: 600, fontSize: 13 }}>
                  {app.service.name}
                </td>
                <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                  <ApplicationStatusBadge status={app.status} size="sm" />
                </td>
                <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    {/* Warga: Ikon Unduh PDF Surat jika sudah disetujui & di-upload */}
                    {officialLetter && baseRoute.includes("/warga") && (
                      <a
                        href={`/api/files/${officialLetter.storage_key}?download=1`}
                        download={officialLetter.file_name}
                        title="Unduh PDF Surat Resmi"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 11px",
                          borderRadius: "0.375rem",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background: "#eafaf3",
                          color: "#2dce89",
                          textDecoration: "none",
                          border: "1px solid #bbf1dc",
                        }}
                      >
                        <FileDown size={13} strokeWidth={2.5} />
                        Unduh PDF
                      </a>
                    )}

                    {/* Kades: Ikon Pengiriman Surat jika sudah disetujui */}
                    {baseRoute.includes("/kades") && (app.status === "DISETUJUI" || app.status === "SELESAI") && (
                      officialLetter ? (
                        <span
                          title="Surat Resmi Telah Dikirimkan ke Warga"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 10px",
                            borderRadius: "0.375rem",
                            fontSize: 11,
                            fontWeight: 700,
                            background: "#eafaf3",
                            color: "#2dce89",
                            border: "1px solid #bbf1dc",
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Surat Terkirim
                        </span>
                      ) : (
                        <Link
                          href={`${baseRoute}/${app.id}#kirim-surat`}
                          title="Kirim Surat Resmi ke Warga"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 12px",
                            borderRadius: "0.375rem",
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                            color: "#ffffff",
                            textDecoration: "none",
                            boxShadow: "0 2px 6px rgba(45, 206, 137, 0.35)",
                          }}
                        >
                          <Send size={12} />
                          Kirim Surat
                        </Link>
                      )
                    )}

                    <Link
                      href={`${baseRoute}/${app.id}`}
                      className="argon-action-btn"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "5px 14px", borderRadius: "0.375rem",
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                        background: "rgba(94, 114, 228, 0.08)", color: "#5e72e4",
                        textDecoration: "none",
                        border: "1px solid rgba(94, 114, 228, 0.18)",
                      }}
                    >
                      Detail →
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// RECENT ACTIVITY — Timeline
// ============================================================
type ActivityItem = {
  id: string;
  newStatus: ApplicationStatus;
  note: string | null;
  createdAt: Date;
  actor: { name: string };
  application: { nomor_pengajuan: string };
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <EmptyState title="Belum ada aktivitas" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
      {/* Timeline line */}
      <div style={{
        position: "absolute", left: 17, top: 18, bottom: 18,
        width: 2, background: "linear-gradient(180deg, #e9ecef, transparent)",
      }} />

      {items.map((item, i) => (
        <div key={item.id} style={{
          display: "flex", gap: 16, paddingBottom: 20,
          animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
        }}>
          {/* Dot */}
          <div style={{
            width: 36, height: 36, minWidth: 36, borderRadius: "50%",
            background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 4px 10px rgba(94, 114, 228, 0.35)",
            zIndex: 1, flexShrink: 0,
          }}>
            <Activity size={16} strokeWidth={2.2} />
          </div>

          {/* Card */}
          <div style={{
            flex: 1, background: "#ffffff", borderRadius: "0.75rem",
            border: "1px solid #e9ecef", padding: "12px 16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <strong style={{ fontSize: 13, color: "#344767", fontWeight: 700 }}>
                {item.actor.name}
              </strong>
              <time style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, color: "#8392ab", fontWeight: 500,
              }}>
                <Clock size={11} />
                {new Date(item.createdAt).toLocaleString("id-ID", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </time>
            </div>
            <p style={{ fontSize: 13, color: "#67748e", margin: 0, lineHeight: 1.5 }}>
              Ubah status{" "}
              <span style={{
                fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                background: "#f8f9fa", color: "#344767",
                border: "1px solid #e9ecef",
                padding: "2px 6px", borderRadius: 4,
              }}>
                {item.application.nomor_pengajuan}
              </span>{" "}
              → <strong style={{ color: "#344767" }}>{item.newStatus}</strong>
            </p>
            {item.note && (
              <p style={{
                marginTop: 8, fontSize: 12, color: "#8392ab", fontStyle: "italic",
                borderLeft: "3px solid #e9ecef", paddingLeft: 10,
              }}>
                &ldquo;{item.note}&rdquo;
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({
  title,
  description = "Data akan muncul setelah ada aktivitas.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", textAlign: "center",
      border: "1.5px dashed #e9ecef", borderRadius: "1rem", background: "#f8f9fa",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "linear-gradient(310deg, #f8f9fa, #e9ecef)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#8392ab", marginBottom: 14,
      }}>
        <FileText size={22} />
      </div>
      <p style={{ margin: 0, fontWeight: 700, color: "#344767", fontSize: 14 }}>{title}</p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8392ab", maxWidth: 280 }}>{description}</p>
    </div>
  );
}

// ============================================================
// LOADING STATE
// ============================================================
export function LoadingState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px",
    }} aria-label="Memuat data">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
            animation: `bounce 1s infinite ${i * 0.15}s`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 13, color: "#8392ab", fontWeight: 600 }}>Memuat data...</span>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
export function ErrorState({ message = "Data dashboard tidak dapat dimuat." }: { message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px", textAlign: "center",
      border: "1px solid rgba(245, 54, 92, 0.2)", borderRadius: "1rem",
      background: "rgba(245, 54, 92, 0.04)",
    }} role="alert">
      <AlertCircle size={28} style={{ color: "#f5365c", marginBottom: 12 }} />
      <strong style={{ fontWeight: 700, color: "#f5365c", marginBottom: 4, fontSize: 14 }}>
        Terjadi kendala
      </strong>
      <p style={{ fontSize: 13, color: "#67748e", margin: 0 }}>{message}</p>
    </div>
  );
}

// ============================================================
// DASHBOARD SECTION CARD — Argon 2 Card Container
// ============================================================
export function DashboardCard({
  children,
  title,
  subtitle,
  action,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "1rem",
      boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      border: "1px solid rgba(0, 0, 0, 0.04)",
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: "1px solid #f0f2f5",
        }}>
          <div>
            {subtitle && (
              <p style={{
                margin: "0 0 2px", fontSize: 11, fontWeight: 800, color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>{subtitle}</p>
            )}
            {title && (
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.01em" }}>{title}</h3>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: "20px 24px" }}>
        {children}
      </div>
    </div>
  );
}