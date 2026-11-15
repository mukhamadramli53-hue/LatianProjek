import { getStaffApplications } from "@/lib/actions/application";
import { DashboardCard, ApplicationTable, StatCard } from "@/components/dashboard/DashboardComponents";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import { Send, CheckCircle2, Clock } from "lucide-react";

export const metadata = { title: "Persetujuan & Pengiriman Surat - Kepala Desa" };

export default async function KadesPersetujuanPage() {
  const session = await auth();
  if (session?.user?.role !== "KEPALA_DESA") redirect("/403");

  const applications = await getStaffApplications();

  // Filter pengajuan berdasarkan tahapan
  const pendingApproval = applications.filter((app) => app.status === "MENUNGGU_APPROVAL");

  const approvedApplications = applications.filter(
    (app) => app.status === "DISETUJUI" || app.status === "SELESAI"
  );

  const pendingLetterCount = approvedApplications.filter((app) => {
    const hasOfficialDoc = app.documents?.some(
      (d) =>
        d.requirement_name === "Surat Resmi Terbit (PDF)" ||
        d.requirement_name.toLowerCase().includes("surat resmi")
    );
    return !hasOfficialDoc;
  }).length;

  const sentLetterCount = approvedApplications.filter((app) => {
    return app.documents?.some(
      (d) =>
        d.requirement_name === "Surat Resmi Terbit (PDF)" ||
        d.requirement_name.toLowerCase().includes("surat resmi")
    );
  }).length;

  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title="Persetujuan & Pengiriman Surat Resmi"
      subtitle="Tinjau permohonan warga, berikan pengesahan resmi, dan kirimkan dokumen surat keputusan (PDF) kepada warga."
    >
      <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* ── Ringkasan Metrik Pengesahan & Pengiriman ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}>
          <StatCard
            label="Menunggu Persetujuan"
            value={pendingApproval.length}
            tone="red"
            icon={Clock}
            footerText="Memerlukan tanda tangan / keputusan"
          />
          <StatCard
            label="Disetujui • Belum Kirim Surat"
            value={pendingLetterCount}
            tone="amber"
            icon={Send}
            footerText="Siap diunggah file surat PDF"
          />
          <StatCard
            label="Surat Resmi Terkirim"
            value={sentLetterCount}
            tone="green"
            icon={CheckCircle2}
            footerText="Telah diterima warga pemohon"
          />
        </div>

        {/* ── KARTU 1: Menunggu Persetujuan Final ── */}
        <DashboardCard
          title="Menunggu Persetujuan Akhir"
          subtitle="Antrean Verifikasi Pejabat"
        >
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", marginTop: "-10px" }}>
            Pengajuan berikut telah diverifikasi dan disiapkan oleh Staf Desa, kini menantikan keputusan persetujuan resmi Kepala Desa.
          </p>

          <ApplicationTable
            applications={pendingApproval}
            showApplicant={true}
            baseRoute="/kades/persetujuan"
          />
        </DashboardCard>

        {/* ── KARTU 2: Pengajuan Telah Disetujui & Pengiriman Surat Resmi ke Warga ── */}
        <DashboardCard
          title="Pengajuan Disetujui & Pengiriman Surat Resmi ke Warga"
          subtitle="Penerbitan Dokumen Resmi PDF"
        >
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", marginTop: "-10px" }}>
            Daftar permohonan yang telah Anda setujui. Klik ikon <strong>&ldquo;Kirim Surat&rdquo;</strong> untuk mengunggah surat PDF bertanda tangan agar langsung dapat diunduh oleh warga pemohon.
          </p>

          <ApplicationTable
            applications={approvedApplications}
            showApplicant={true}
            baseRoute="/kades/persetujuan"
          />
        </DashboardCard>

      </div>
    </RoleDashboardLayout>
  );
}
