import Link from "next/link";
import { getStaffDashboard } from "@/lib/actions/dashboard";
import { ApplicationTable, EmptyState, StatCard, DashboardCard } from "@/components/dashboard/DashboardComponents";
import { FileText, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

export const metadata = { title: "Dashboard Staf | Sistem Pelayanan Desa" };

export default async function StaffDashboardPage() {
  const data = await getStaffDashboard();
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <StatCard
          label="Pengajuan Baru"
          value={data.newCount}
          tone="blue"
          icon={FileText}
          footerText="Menunggu penanganan"
        />
        <StatCard
          label="Perlu Diverifikasi"
          value={data.verification}
          tone="amber"
          icon={Clock}
          footerText="Tahap verifikasi berkas"
        />
        <StatCard
          label="Sedang Diproses"
          value={data.processing}
          tone="green"
          icon={CheckCircle}
          footerText="Dalam pengerjaan staf"
        />
        <StatCard
          label="Mendekati Batas Waktu"
          value={data.nearDeadline.length}
          tone="red"
          icon={AlertTriangle}
          footerText="Perhatian prioritas"
        />
      </div>

      <DashboardCard
        title="Daftar Pekerjaan Terbaru"
        subtitle="Antrian Pelayanan"
        action={
          <Link
            href="/staf/pengajuan"
            style={{
              fontSize: 12, fontWeight: 700, color: "#5e72e4",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Buka daftar pengajuan <ArrowRight size={13} />
          </Link>
        }
      >
        {data.recent.length ? (
          <ApplicationTable applications={data.recent} showApplicant baseRoute="/staf/pengajuan" />
        ) : (
          <EmptyState title="Tidak ada pekerjaan terbaru" />
        )}
      </DashboardCard>

      {data.nearDeadline.length > 0 && (
        <DashboardCard
          title="Perlu Perhatian Segera"
          subtitle="Tenggat Waktu Kritis"
        >
          <ApplicationTable applications={data.nearDeadline} showApplicant baseRoute="/staf/pengajuan" />
        </DashboardCard>
      )}
    </div>
  );
}