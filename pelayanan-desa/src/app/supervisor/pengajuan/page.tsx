import { getStaffApplications } from "@/lib/actions/application";
import { DashboardCard, ApplicationTable } from "@/components/dashboard/DashboardComponents";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Daftar Pemantauan Pengajuan - Supervisor" };

export default async function SupervisorApplicationsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERVISOR") redirect("/403");

  // getStaffApplications menampilkan seluruh pengajuan untuk fungsi pemantauan Supervisor
  const applications = await getStaffApplications();

  return (
    <RoleDashboardLayout 
      role="SUPERVISOR" 
      title="Pemantauan Pengajuan" 
      subtitle="Pantau seluruh alur pengajuan layanan warga, deteksi kendala pemrosesan, dan bantu tangani kendala operasional jika diperlukan."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <DashboardCard 
          title="Daftar Pengajuan Dipantau" 
          subtitle="Monitoring Seluruh Alur Layanan Desa"
        >
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", marginTop: "-10px" }}>
            Sebagai Supervisor, Anda bertugas memantau kelancaran alur pelayanan dari Warga ke Staf Desa hingga Kepala Desa, serta membantu menangani kendala jika ditemukan hambatan berkas atau keterlambatan antrean.
          </p>
          
          <ApplicationTable 
            applications={applications} 
            showApplicant={true} 
            baseRoute="/supervisor/pengajuan" 
          />
        </DashboardCard>
      </div>
    </RoleDashboardLayout>
  );
}
