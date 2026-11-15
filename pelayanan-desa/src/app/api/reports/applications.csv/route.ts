import { NextRequest } from "next/server";
import { getReport } from "@/lib/actions/reporting";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const report = await getReport({
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      serviceId: params.get("serviceId") || undefined,
      status: (params.get("status") || undefined) as never,
    });
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["Nomor Pengajuan", "Layanan", "Status", "Tanggal Pengajuan"],
      ...report.rows.map((row) => [row.nomor_pengajuan, row.service.name, row.status, new Date(row.submitted_at).toISOString()]),
    ];
    return new Response(`\uFEFF${lines.map((line) => line.map(escape).join(",")).join("\r\n")}`, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=laporan-pengajuan.csv" },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
