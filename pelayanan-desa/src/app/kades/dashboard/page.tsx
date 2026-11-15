import { getKadesDashboard } from "@/lib/actions/dashboard";
import { EmptyState, StatCard, DashboardCard } from "@/components/dashboard/DashboardComponents";
import { FileText, Clock, CheckCircle, XCircle, ShieldCheck, FileCheck, Layers } from "lucide-react";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Dashboard Kepala Desa | Sistem Pelayanan Desa" };

export default async function KadesDashboardPage() {
  const data = await getKadesDashboard();
  const max = Math.max(...data.serviceStats.map((item) => item.count), 1);

  return (
    <RoleDashboardLayout 
      role="KEPALA_DESA" 
      title="Dashboard Utama" 
      subtitle="Ringkasan pemantauan real-time pelayanan SKTM dan Surat Pengantar Pembuatan SKCK."
    >
      <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* ── Section 1: Total Pengajuan Per Layanan ── */}
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "14px" }}>
            Total Pengajuan Berdasarkan Layanan
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <StatCard 
              label="Total Pengajuan SKTM" 
              value={data.totalSktm} 
              icon={FileText} 
              tone="blue"
              footerText="Surat Keterangan Tidak Mampu" 
            />
            <StatCard 
              label="Total Pengajuan SKCK" 
              value={data.totalSkck} 
              icon={FileCheck} 
              tone="indigo"
              footerText="Surat Pengantar Pembuatan SKCK" 
            />
            <StatCard 
              label="Total Seluruh Pengajuan" 
              value={data.total} 
              icon={Layers} 
              tone="purple"
              footerText="Akumulasi seluruh layanan desa" 
            />
          </div>
        </div>

        {/* ── Section 2: Status Alur Pengajuan ── */}
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "14px" }}>
            Status & Tahapan Pengajuan
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <StatCard 
              label="Menunggu Verifikasi" 
              value={data.menungguVerifikasi} 
              icon={Clock} 
              tone="amber"
              footerText="Antrean Staf (DIAJUKAN)" 
            />
            <StatCard 
              label="Sedang Diproses Staf" 
              value={data.sedangDiproses} 
              icon={ShieldCheck} 
              tone="indigo"
              footerText="Penyiapan berkas (DIPROSES)" 
            />
            <StatCard 
              label="Menunggu Persetujuan" 
              value={data.menungguPersetujuan} 
              icon={Clock} 
              tone="red"
              footerText="Meja Kepala Desa (APPROVAL)" 
            />
            <StatCard 
              label="Pengajuan Disetujui" 
              value={data.disetujui} 
              icon={CheckCircle} 
              tone="green"
              footerText="Telah disetujui / Selesai" 
            />
            <StatCard 
              label="Pengajuan Ditolak" 
              value={data.ditolak} 
              icon={XCircle} 
              tone="red"
              footerText="Tidak memenuhi persyaratan" 
            />
          </div>
        </div>

        {/* ── Section 3: Grafik Layanan & Performa ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <DashboardCard title="Statistik Volume Layanan">
            {data.serviceStats.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {data.serviceStats.map((item) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }} key={item.name}>
                    <span style={{ width: "45%", fontSize: "14px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.name}>
                      {item.name}
                    </span>
                    <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          height: "100%", 
                          background: item.name.includes("SKTM") 
                            ? "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)" 
                            : "linear-gradient(90deg, #6366f1 0%, #4338ca 100%)", 
                          borderRadius: "10px", 
                          transition: "width 0.5s ease-out", 
                          width: `${(item.count / max) * 100}%` 
                        }} 
                      />
                    </div>
                    <strong style={{ width: "40px", textAlign: "right", color: "#334155", fontFamily: "monospace", fontSize: "14px" }}>
                      {item.count}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Belum ada data pelayanan" />
            )}
          </DashboardCard>

          <DashboardCard title="Performa Penyelesaian Layanan">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "180px" }}>
              <div style={{ width: "100%", maxWidth: "320px" }}>
                <StatCard 
                  label="Rata-rata Waktu Proses" 
                  value={data.performance.averageCompletionDays === null ? "Belum ada data" : `${data.performance.averageCompletionDays.toFixed(1)} hari`} 
                  tone="green" 
                  footerText={`Dihitung dari ${data.performance.completedSample} pengajuan selesai`}
                />
              </div>
            </div>
          </DashboardCard>
        </div>

      </div>
    </RoleDashboardLayout>
  );
}