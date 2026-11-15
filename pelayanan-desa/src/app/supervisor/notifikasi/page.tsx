import Link from "next/link";
import { getMyNotifications } from "@/lib/actions/notification";
import NotificationList from "@/components/warga/NotificationList";
import { ArrowLeft, Bell } from "lucide-react";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Pusat Notifikasi Supervisor | Pelayanan Desa" };

export default async function SupervisorNotificationsPage() {
  const notifications = await getMyNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <RoleDashboardLayout
      role="SUPERVISOR"
      title="Pusat Notifikasi Pemantauan Supervisor"
      subtitle="Pantau dinamika alur pelayanan warga, deteksi hambatan berkas, dan aktivitas operasional sistem"
    >
      <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link
            href="/supervisor/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              background: "#ffffff",
              color: "#344767",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              transition: "all 0.2s ease",
            }}
          >
            <ArrowLeft size={16} color="#fb6340" />
            Kembali ke Dashboard
          </Link>

          {unreadCount > 0 && (
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(8px)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                border: "1px solid rgba(255, 255, 255, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Bell size={14} />
              {unreadCount} Notifikasi Pemantauan Baru
            </span>
          )}
        </div>

        <NotificationList
          initial={notifications}
          baseRoute="/supervisor/pengajuan"
          actorRole="SUPERVISOR"
        />
      </div>
    </RoleDashboardLayout>
  );
}
