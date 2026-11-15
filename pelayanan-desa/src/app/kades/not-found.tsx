import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/DashboardComponents";

export default function NotFound() {
  return (
    <RoleDashboardLayout 
      role="KEPALA_DESA" 
      title="Halaman Tidak Ditemukan" 
      subtitle="404 Error"
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <DashboardCard>
          <div style={{ textAlign: "center", padding: "64px 24px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>Halaman tidak ditemukan</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>Maaf, halaman yang Anda cari tidak ada atau sedang dalam perbaikan.</p>
            <Link href="/kades/dashboard" className="btn btn-primary" style={{ display: "inline-block" }}>
              Kembali ke Dashboard
            </Link>
          </div>
        </DashboardCard>
      </div>
    </RoleDashboardLayout>
  );
}
