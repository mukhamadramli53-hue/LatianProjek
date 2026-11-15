import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getWargaList } from "@/lib/actions/user";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import { DashboardCard } from "@/components/dashboard/DashboardComponents";
import { WargaManagementClient } from "@/components/supervisor/WargaManagementClient";

export const metadata = {
  title: "Data & Pendaftaran Warga - Supervisor",
};

export default async function SupervisorWargaPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERVISOR" && session?.user?.role !== "KEPALA_DESA") {
    redirect("/403");
  }

  const [wargaList, users] = await Promise.all([
    getWargaList(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <RoleDashboardLayout
      role="SUPERVISOR"
      title="Data & Pendaftaran Warga"
      subtitle="Kelola data kependudukan warga desa, pantau akses seluruh aktor sistem, dan bantu pendaftaran warga baru."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Seksi Manajemen Warga & Pendaftaran Warga Baru */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 14px" }}>
            Data Kependudukan & Pendaftaran Warga Baru
          </h2>
          <WargaManagementClient initialWarga={wargaList} canAddWarga={true} />
        </div>

        {/* Seksi Seluruh Aktor Terdaftar di Sistem */}
        <DashboardCard
          title="Seluruh Akun Aktor Terdaftar di Database"
          subtitle="Pemantauan akun pejabat eksekutif, staf verifikator, supervisor, dan warga"
        >
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Aktor</th>
                  <th>Email</th>
                  <th>NIK</th>
                  <th>Role (Peran)</th>
                  <th>Status Akses</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#334155" }}>{user.name}</div>
                    </td>
                    <td style={{ color: "#475569" }}>{user.email}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#64748b" }}>{user.nik || "—"}</td>
                    <td>
                      <span style={{ 
                        fontFamily: "monospace", fontSize: 11, fontWeight: 700, 
                        background: "#f1f5f9", padding: "4px 8px", borderRadius: 6,
                        color: user.role === "WARGA" ? "#64748b" : "#3b82f6" 
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>
    </RoleDashboardLayout>
  );
}
