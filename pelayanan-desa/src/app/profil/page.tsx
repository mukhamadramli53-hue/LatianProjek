import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMyUnreadNotificationCount } from "@/lib/actions/notification";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { PaperLayoutClient } from "@/components/layout/PaperLayoutClient";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Profil Saya | Sistem Pelayanan Desa",
  description: "Kelola informasi data diri, kontak, dan keamanan akun pengguna.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      address: true,
      nik: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const unreadNotificationCount = await getMyUnreadNotificationCount();
  const resolvedSearchParams = await searchParams;
  const initialTab = (
    resolvedSearchParams?.tab === "keamanan"
      ? "keamanan"
      : resolvedSearchParams?.tab === "info"
      ? "info"
      : "biodata"
  ) as "biodata" | "keamanan" | "info";

  // Fetch role-specific statistics
  let stats: {
    total?: number;
    processed?: number;
    needsRepair?: number;
    completed?: number;
    rejected?: number;
    auditCount?: number;
  } = {};

  if (user.role === "WARGA") {
    const appGroup = await prisma.application.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { _all: true },
    });

    let total = 0;
    let processed = 0;
    let needsRepair = 0;
    let completed = 0;
    let rejected = 0;

    for (const g of appGroup) {
      const cnt = g._count._all;
      total += cnt;
      if (
        g.status === "DIAJUKAN" ||
        g.status === "DIVERIFIKASI" ||
        g.status === "DIPROSES" ||
        g.status === "REVIEW_SUPERVISOR" ||
        g.status === "MENUNGGU_APPROVAL"
      ) {
        processed += cnt;
      } else if (g.status === "PERLU_PERBAIKAN") {
        needsRepair += cnt;
      } else if (g.status === "SELESAI" || g.status === "DISETUJUI") {
        completed += cnt;
      } else if (g.status === "DITOLAK") {
        rejected += cnt;
      }
    }

    stats = { total, processed, needsRepair, completed, rejected };
  } else if (user.role === "STAF") {
    const totalApps = await prisma.application.count();
    const pendingApps = await prisma.application.count({
      where: { status: { in: ["DIAJUKAN", "PERLU_PERBAIKAN"] } },
    });
    const completedApps = await prisma.application.count({
      where: { status: "SELESAI" },
    });
    stats = { total: totalApps, processed: pendingApps, completed: completedApps };
  } else if (user.role === "SUPERVISOR") {
    const totalAudits = await prisma.auditLog.count();
    const totalWarga = await prisma.user.count({ where: { role: "WARGA" } });
    stats = { total: totalAudits, processed: totalWarga };
  } else if (user.role === "KEPALA_DESA") {
    const pendingApproval = await prisma.application.count({
      where: { status: "MENUNGGU_APPROVAL" },
    });
    const totalCompleted = await prisma.application.count({
      where: { status: "SELESAI" },
    });
    stats = { total: totalCompleted, processed: pendingApproval };
  }

  // Render within appropriate layout shell
  if (user.role === "WARGA") {
    return (
      <PaperLayoutClient
        role={user.role}
        name={user.name}
        email={user.email}
        unreadNotificationCount={unreadNotificationCount}
      >
        <ProfileClient user={user} stats={stats} initialTab={initialTab} />
      </PaperLayoutClient>
    );
  }

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      email={user.email}
      title="Profil Saya"
      subtitle="Kelola informasi data diri, kontak kependudukan, dan keamanan akun Anda."
      unreadNotificationCount={unreadNotificationCount}
    >
      <ProfileClient user={user} stats={stats} initialTab={initialTab} />
    </DashboardShell>
  );
}
