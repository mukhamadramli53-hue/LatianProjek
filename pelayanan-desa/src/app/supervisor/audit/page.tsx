import { getAuditLogs } from "@/lib/actions/reporting";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AuditLogTable from "@/components/audit/AuditLogTable";

export const metadata = { title: "Audit Log & Jejak Aktivitas - Supervisor" };

export default async function SupervisorAuditPage() {
  const logs = await getAuditLogs();
  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
  }));

  return (
    <RoleDashboardLayout
      role="SUPERVISOR"
      title="Audit Log & Pemantauan Sistem"
      subtitle="Jejak audit dan rekaman aktivitas sistem real-time untuk memantau integritas operasional dan penanganan kendala."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <AuditLogTable
          initialLogs={serializedLogs}
          role="SUPERVISOR"
          title="Rekaman Jejak Audit (Audit Trail)"
          subtitle="Aktivitas Seluruh Aktor dan Sistem — Dilengkapi Fitur Hapus Catatan Log"
        />
      </div>
    </RoleDashboardLayout>
  );
}

