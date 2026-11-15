import Link from "next/link";
import { getMyNotifications } from "@/lib/actions/notification";
import NotificationList from "@/components/warga/NotificationList";
import { ArrowLeft, Bell, Settings } from "lucide-react";

export const metadata = { title: "Pusat Notifikasi | Pelayanan Desa" };

export default async function NotificationsPage() {
  const notifications = await getMyNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Top Bar: Tombol Kembali & Aksi Pengaturan ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link
          href="/warga/dashboard"
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
          <ArrowLeft size={16} color="#5e72e4" />
          Kembali ke Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/warga/notifikasi/pengaturan"
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
            <Settings size={15} color="#5e72e4" />
            Pengaturan Notifikasi & Email
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
              {unreadCount} Pemberitahuan Baru
            </span>
          )}
        </div>
      </div>

      {/* ── Header Title & Subtitle di atas banner ── */}
      <div>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
          Pusat Notifikasi Warga
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255, 255, 255, 0.92)", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
          Pantau setiap tahapan pemrosesan berkas, pengesahan Kepala Desa, dan ketersediaan surat resmi digital Anda.
        </p>
      </div>

      {/* ── Main Content: Notification List inside Solid White Argon Card ── */}
      <NotificationList initial={notifications} />
    </div>
  );
}
