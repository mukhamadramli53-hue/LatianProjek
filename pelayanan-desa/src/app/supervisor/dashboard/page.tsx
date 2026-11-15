import Link from "next/link";
import { getSupervisorDashboard } from "@/lib/actions/dashboard";
import { RecentActivity, StatCard, DashboardCard, EmptyState } from "@/components/dashboard/DashboardComponents";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { Layers, Clock, AlertTriangle, Users, UserCheck, ShieldCheck, UserPlus, ArrowRight } from "lucide-react";

export const metadata = { title: "Dashboard Supervisor | Sistem Pelayanan Desa" };

export default async function SupervisorDashboardPage() {
  const data = await getSupervisorDashboard();
  const max = Math.max(...data.statusStats.map((item) => item.count), 1);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── Ringkasan Metrik Pengajuan & Aktor ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <StatCard
          label="Total Pengajuan"
          value={data.total}
          tone="indigo"
          icon={Layers}
          footerText="Akumulasi pelayanan dipantau"
        />
        <StatCard
          label="Menunggu Persetujuan Kades"
          value={data.review}
          tone="red"
          icon={Clock}
          footerText="Berkas di meja Kepala Desa"
        />
        <StatCard
          label="Sedang Diproses Staf"
          value={data.pending}
          tone="amber"
          icon={AlertTriangle}
          footerText="Antrean staf & perbaikan"
        />
        <StatCard
          label="Total Aktor di Database"
          value={data.actorsSummary.totalUsers}
          tone="blue"
          icon={Users}
          footerText={`${data.actorsSummary.warga} Warga • ${data.actorsSummary.staf} Staf • ${data.actorsSummary.kades + data.actorsSummary.supervisor} Pejabat`}
        />
      </div>

      {/* ── Seksi Pemantauan Aktor Sistem di Database ── */}
      <DashboardCard
        title="Pemantauan Aktor Sistem di Database"
        subtitle="Data Aktor Terdaftar"
        action={
          <Link
            href="/supervisor/warga"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#5e72e4",
              textDecoration: "none",
            }}
          >
            <UserPlus size={14} /> Kelola & Tambah Warga <ArrowRight size={13} />
          </Link>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Mini cards peran */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f8fafd", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Warga Desa</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>{data.actorsSummary.warga}</div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Pemohon layanan</span>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f8fdfa", border: "1px solid #d1fae5" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>Staf Pelayanan</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>{data.actorsSummary.staf}</div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Verifikator berkas</span>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef8f8", border: "1px solid #fee2e2" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Kepala Desa</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>{data.actorsSummary.kades}</div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Pejabat pengesah</span>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fbf9fe", border: "1px solid #ede9fe" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Supervisor</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>{data.actorsSummary.supervisor}</div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Pemantauan sistem</span>
            </div>
          </div>

          {/* Tabel aktor terkini */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e9ecef" }}>
                  <th style={{ padding: "8px 12px", color: "#8392ab", fontSize: 11, textTransform: "uppercase" }}>Nama Aktor</th>
                  <th style={{ padding: "8px 12px", color: "#8392ab", fontSize: 11, textTransform: "uppercase" }}>Email</th>
                  <th style={{ padding: "8px 12px", color: "#8392ab", fontSize: 11, textTransform: "uppercase" }}>NIK</th>
                  <th style={{ padding: "8px 12px", color: "#8392ab", fontSize: 11, textTransform: "uppercase" }}>Peran (Role)</th>
                  <th style={{ padding: "8px 12px", color: "#8392ab", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.actorsList.map((actor) => (
                  <tr key={actor.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#344767" }}>{actor.name}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{actor.email}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{actor.nik || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            actor.role === "WARGA"
                              ? "#eff6ff"
                              : actor.role === "STAF"
                              ? "#f0fdf4"
                              : actor.role === "KEPALA_DESA"
                              ? "#fef2f2"
                              : "#faf5ff",
                          color:
                            actor.role === "WARGA"
                              ? "#1d4ed8"
                              : actor.role === "STAF"
                              ? "#15803d"
                              : actor.role === "KEPALA_DESA"
                              ? "#b91c1c"
                              : "#6b21a8",
                        }}
                      >
                        {actor.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: actor.isActive ? "#2dce89" : "#f5365c",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: actor.isActive ? "#2dce89" : "#f5365c" }} />
                        {actor.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardCard>

      {/* ── Distribusi Status & Log Aktivitas Pelayanan ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        <DashboardCard
          title="Statistik Berdasarkan Status"
          subtitle="Distribusi Pelayanan"
        >
          {data.statusStats.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.statusStats.map((item) => (
                <div key={item.status} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <ApplicationStatusBadge status={item.status} size="sm" />
                  </div>
                  <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                        borderRadius: 99,
                        width: `${(item.count / max) * 100}%`,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <strong style={{ width: 36, textAlign: "right", color: "#344767", fontFamily: "monospace", fontSize: 13 }}>
                    {item.count}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada data status" />
          )}
        </DashboardCard>

        <DashboardCard
          title="Monitoring Aktivitas Pelayanan"
          subtitle="Log Tindakan Alur"
        >
          <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 6 }}>
            <RecentActivity items={data.activity} />
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}