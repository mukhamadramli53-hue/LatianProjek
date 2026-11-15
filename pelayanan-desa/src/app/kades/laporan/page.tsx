import { getReport, getReportServices } from "@/lib/actions/reporting";
import { ReportView } from "@/components/reporting/ReportView";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Laporan Pelayanan" };

export default async function ReportPage(props: { searchParams?: Promise<Record<string, string>> }) {
  const params = await props.searchParams;
  const [report, services] = await Promise.all([
    getReport({ period: params?.period as never, from: params?.from, to: params?.to, serviceId: params?.serviceId, status: params?.status as never }),
    getReportServices(),
  ]);
  return (
    <RoleDashboardLayout 
      role="KEPALA_DESA" 
      title="Laporan Pelayanan" 
      subtitle="Unduh dan tinjau rekapitulasi data pelayanan desa."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
        <ReportView report={report} services={services} values={params || {}} />
      </div>
    </RoleDashboardLayout>
  );
}
