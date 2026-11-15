import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PaperLayoutClient } from "@/components/layout/PaperLayoutClient";
import { getMyUnreadNotificationCount } from "@/lib/actions/notification";

export default async function WargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect if not logged in or not WARGA
  if (!session?.user) {
    redirect("/login");
  }
  
  if (session.user.role !== "WARGA") {
    redirect("/403");
  }
  const unreadNotificationCount = await getMyUnreadNotificationCount();

  return (
    <PaperLayoutClient 
      name={session.user.name || "Warga"} 
      email={session.user.email || ""} 
      role={session.user.role}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </PaperLayoutClient>
  );
}
