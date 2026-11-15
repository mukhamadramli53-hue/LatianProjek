import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { getUserNotificationProfile } from "@/lib/actions/notification";
import NotificationSettingsForm from "@/components/warga/NotificationSettingsForm";

export const metadata = { title: "Pengaturan Notifikasi & Email | Pelayanan Desa" };

export default async function NotificationSettingsPage() {
  const profileData = await getUserNotificationProfile();

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── Top Bar: Tombol Kembali & Breadcrumb ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link
          href="/warga/notifikasi"
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
          Kembali ke Pusat Notifikasi
        </Link>

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
          <Settings size={14} />
          Preferensi Akun
        </span>
      </div>

      {/* ── Header Title & Subtitle di atas banner ── */}
      <div>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
          Pengaturan Saluran Notifikasi & Email
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255, 255, 255, 0.92)", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
          Kelola preferensi penerimaan email, verifikasi alamat resmi, dan pahami kebijakan transparansi pelayanan desa.
        </p>
      </div>

      {/* ── Main Form Component ── */}
      <NotificationSettingsForm
        initialUser={profileData.user}
        initialPreferences={profileData.preferences}
        policyDescription={profileData.mandatoryPolicy.description}
      />
    </div>
  );
}
