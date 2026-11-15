import Link from "next/link";
import { getMyNotifications } from "@/lib/actions/notification";
import NotificationList from "@/components/warga/NotificationList";
import { ArrowLeft, Bell } from "lucide-react";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = { title: "Pusat Notifikasi Staf | Pelayanan Desa" };

export default async function StafNotificationsPage() {
  const notifications = await getMyNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <RoleDashboardLayout
      role="STAF"
      title="Pusat Notifikasi Staf Pelayanan"
      subtitle="Pantau berkas baru masuk, kiriman ulang perbaikan warga, dan tugas verifikasi"
    >
      <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link
            href="/staf/dashboard"
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
            <ArrowLeft size={16} color="#11cdef" />
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
              {unreadCount} Pemberitahuan Tugas Baru
            </span>
          )}
        </div>

        <NotificationList
          initial={notifications}
          baseRoute="/staf/pengajuan"
          actorRole="STAF"
        />
      </div>
    </RoleDashboardLayout>
  );
}
