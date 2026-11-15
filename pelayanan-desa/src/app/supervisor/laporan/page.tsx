import { getReport, getReportServices } from "@/lib/actions/reporting";
import { ReportView } from "@/components/reporting/ReportView";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Laporan Pelayanan" };

export default async function SupervisorReportPage(props: { searchParams?: Promise<Record<string, string>> }) {
 const session = await auth();
 if (!session?.user || session.user.role !== "SUPERVISOR") redirect("/403");
 const params = await props.searchParams;
 const [report, services] = await Promise.all([
 getReport({ period: params?.period as never, from: params?.from, to: params?.to, serviceId: params?.serviceId, status: params?.status as never }),
 getReportServices(),
 ]);
 return <DashboardShell role="SUPERVISOR" name={session.user.name || "Supervisor"} email={session.user.email || ""} title="Laporan" subtitle="Ringkasan aktivitas pelayanan desa."><ReportView report={report} services={services} values={params || {}} /></DashboardShell>;
}
