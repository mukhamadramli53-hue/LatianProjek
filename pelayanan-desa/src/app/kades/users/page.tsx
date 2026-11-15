import { prisma } from "@/lib/db";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import { DashboardCard } from "@/components/dashboard/DashboardComponents";
import { getWargaList } from "@/lib/actions/user";
import { WargaManagementClient } from "@/components/supervisor/WargaManagementClient";

export const metadata = { title: "Kelola User - Kepala Desa" };

export default async function UsersPage() {
  const [users, wargaList] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
    getWargaList(),
  ]);

  return (
    <RoleDashboardLayout 
      role="KEPALA_DESA" 
      title="Kelola User & Data Warga" 
      subtitle="Manajemen akun sistem dan pendaftaran warga desa baru."
    >
      <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Seksi Pendaftaran & Manajemen Warga */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 14px" }}>
            Data & Pendaftaran Warga Desa
          </h2>
          <WargaManagementClient initialWarga={wargaList} canAddWarga={true} />
        </div>

        {/* Seksi Seluruh Akun Sistem */}
        <DashboardCard
          title="Seluruh Akun Terdaftar di Sistem"
          subtitle="Daftar akun eksekutif, supervisor, staf pelayanan, dan warga"
        >
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>NIK</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#334155" }}>{user.name}</div>
                    </td>
                    <td style={{ color: "#475569" }}>{user.email}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#64748b" }}>{user.nik || "-"}</td>
                    <td>
                      <span style={{ 
                        fontFamily: "monospace", fontSize: 11, fontWeight: 600, 
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
