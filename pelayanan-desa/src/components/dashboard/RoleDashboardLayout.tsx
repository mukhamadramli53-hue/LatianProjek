import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { DashboardShell } from "./DashboardShell";
import { getMyUnreadNotificationCount } from "@/lib/actions/notification";

export default async function RoleDashboardLayout({ 
  role, 
  title, 
  subtitle, 
  children 
}: { 
  role: Role; 
  title: string; 
  subtitle: string; 
  children: React.ReactNode 
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== role) redirect("/403");

  const unreadNotificationCount = await getMyUnreadNotificationCount();

  return (
    <DashboardShell 
      role={role} 
      name={session.user.name || "Pengguna"} 
      email={session.user.email || ""} 
      title={title} 
      subtitle={subtitle}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </DashboardShell>
  );
}