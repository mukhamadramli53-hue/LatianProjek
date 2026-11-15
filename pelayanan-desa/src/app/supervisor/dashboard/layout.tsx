import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleDashboardLayout
      role="SUPERVISOR"
      title="Dashboard Supervisor"
      subtitle="Review dan evaluasi pengajuan layanan desa"
    >
      {children}
    </RoleDashboardLayout>
  );
}