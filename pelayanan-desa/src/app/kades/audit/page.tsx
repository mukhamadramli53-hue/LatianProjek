import { getAuditLogs } from "@/lib/actions/reporting";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AuditLogTable from "@/components/audit/AuditLogTable";

export const metadata = { title: "Audit Log & Jejak Aktivitas - Kepala Desa" };

export default async function AuditPage() {
  const logs = await getAuditLogs();
  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
  }));

  return (
    <RoleDashboardLayout 
      role="KEPALA_DESA" 
      title="Audit Log" 
      subtitle="Catatan aktivitas penting sistem. Data ini hanya dapat diakses oleh Kepala Desa dan Supervisor."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <AuditLogTable
          initialLogs={serializedLogs}
          role="KEPALA_DESA"
          title="Rekaman Jejak Audit Sistem Desa"
          subtitle="Aktivitas Seluruh Aktor dan Sistem — Dilengkapi Fitur Hapus Catatan Log"
        />
      </div>
    </RoleDashboardLayout>
  );
}

