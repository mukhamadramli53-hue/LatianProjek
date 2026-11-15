import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleDashboardLayout
      role="STAF"
      title="Dashboard Staf"
      subtitle="Verifikasi dan proses pengajuan layanan desa"
    >
      {children}
    </RoleDashboardLayout>
  );
}