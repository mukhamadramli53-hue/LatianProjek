import Link from "next/link";
import { auth } from "@/lib/auth";
import { ShieldCheck, LogIn, LayoutDashboard } from "lucide-react";

export default async function LayananLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const getDashboardHref = (role?: string) => {
    switch (role) {
      case "WARGA": return "/warga/dashboard";
      case "STAF": return "/staf/dashboard";
      case "SUPERVISOR": return "/supervisor/dashboard";
      case "KEPALA_DESA": return "/kades/dashboard";
      default: return "/login";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "WARGA": return "Warga";
      case "STAF": return "Staf Desa";
      case "SUPERVISOR": return "Supervisor";
      case "KEPALA_DESA": return "Kepala Desa";
      default: return "Pengguna";
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8f9fa" }}>
      {/* ── Public Top Navbar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6%",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Pelayanan<span style={{ color: "#5e72e4" }}>Desa</span>
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8898aa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Platform Pelayanan Mandiri
              </span>
            </div>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href="/"
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "#64748b",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 8,
                transition: "all 0.2s ease",
              }}
            >
              Beranda
            </Link>
            <Link
              href="/layanan"
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#5e72e4",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 8,
                background: "#eff2fe",
              }}
            >
              Katalog Layanan
            </Link>
          </nav>
        </div>

        <div>
          {session?.user ? (
            <Link
              href={getDashboardHref(session.user.role)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 10,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
                transition: "transform 0.2s ease",
              }}
            >
              <LayoutDashboard size={15} />
              Portal {getRoleLabel(session.user.role)}
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 10,
                background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(94, 114, 228, 0.35)",
              }}
            >
              <LogIn size={15} />
              Masuk Sistem
            </Link>
          )}
        </div>
      </header>

      {/* ── Main Content Body ── */}
      <main style={{ flex: 1, padding: "36px 6% 60px" }}>
        {children}
      </main>

      {/* ── Public Footer ── */}
      <footer
        style={{
          padding: "24px 6%",
          background: "#ffffff",
          borderTop: "1px solid rgba(0, 0, 0, 0.05)",
          textAlign: "center",
          fontSize: 13,
          color: "#8392ab",
        }}
      >
        <p style={{ margin: 0 }}>
          &copy; {new Date().getFullYear()} Sistem Pelayanan Desa Digital. Pelayanan administrasi resmi cepat, transparan, dan terpercaya.
        </p>
      </footer>
    </div>
  );
}
