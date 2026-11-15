import { getStaffApplications } from "@/lib/actions/application";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardCard } from "@/components/dashboard/DashboardComponents";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Daftar Pengajuan - Staf" };

export default async function StaffApplicationsPage() {
  const session = await auth();
  if (session?.user?.role !== "STAF") redirect("/403");

  const applications = await getStaffApplications();

  return (
    <RoleDashboardLayout
      role="STAF"
      title="Pengajuan Warga"
      subtitle="Kelola dan verifikasi pengajuan layanan SKTM & Surat Pengantar SKCK dari warga."
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <DashboardCard
          title="Daftar Pengajuan Masuk"
          subtitle="Antrian Pelayanan"
        >
          <p style={{ fontSize: "13px", color: "#8392ab", marginBottom: "16px", marginTop: "-8px" }}>
            Antrean berkas warga untuk verifikasi, penyiapan surat, atau penerusan langsung ke Kepala Desa.
          </p>

          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#8392ab" }}>
              Belum ada pengajuan masuk.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Pengajuan</TableHead>
                    <TableHead>Warga</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium font-mono text-xs">{app.nomor_pengajuan}</TableCell>
                      <TableCell style={{ fontWeight: 600, color: "#344767" }}>{app.user.name}</TableCell>
                      <TableCell>{app.service.name}</TableCell>
                      <TableCell style={{ color: "#8392ab", fontSize: 13 }}>
                        {new Date(app.submitted_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={app.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/staf/pengajuan/${app.id}`}
                          className="btn btn-sm btn-primary"
                        >
                          Proses →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DashboardCard>
      </div>
    </RoleDashboardLayout>
  );
}
