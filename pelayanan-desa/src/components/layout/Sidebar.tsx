"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { Role } from "@prisma/client";
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  CheckSquare, 
  List, 
  Users, 
  BarChart, 
  History,
  Bot,
  User,
  Settings,
} from "lucide-react";
import styles from "./Layout.module.css";

interface SidebarProps {
  userRole: Role;
}

const navGradients: Record<string, string> = {
  "/profil":                "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  "/warga/dashboard":       "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  "/warga/pengajuan":       "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
  "/warga/ajukan":          "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
  "/staf/dashboard":        "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  "/staf/pengajuan":        "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
  "/supervisor/dashboard":  "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  "/supervisor/pengajuan":  "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
  "/supervisor/warga":      "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
  "/supervisor/laporan":    "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
  "/supervisor/audit":      "linear-gradient(310deg, #344767 0%, #141727 100%)",
  "/kades/dashboard":       "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
  "/kades/persetujuan":     "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
  "/kades/layanan":         "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
  "/kades/users":           "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
  "/kades/laporan":         "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
  "/kades/audit":           "linear-gradient(310deg, #344767 0%, #141727 100%)",
  "/warga/asisten":         "linear-gradient(310deg, #7928ca 0%, #ff0080 100%)",
  "/staf/asisten":          "linear-gradient(310deg, #7928ca 0%, #ff0080 100%)",
  "/supervisor/asisten":    "linear-gradient(310deg, #7928ca 0%, #ff0080 100%)",
  "/kades/asisten":         "linear-gradient(310deg, #7928ca 0%, #ff0080 100%)",
  "/kades/konfigurasi-ai":  "linear-gradient(310deg, #5e72e4 0%, #2dcecc 100%)",
};

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const links = getNavLinks(userRole);

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.sidebarLogo}>
        <div className={styles.logoIcon}>
          🏛️
        </div>
        <div>
          <span className={styles.logoText}>Pelayanan Desa</span>
          <span className={styles.logoSubtext}>Sistem Pelayanan Desa Digital</span>
        </div>
      </div>

      <div className={styles.sidebarWrapper}>
        <div className={styles.navSectionLabel}>
          Menu Navigasi
        </div>
        <ul className={styles.nav}>
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/warga/dashboard" && link.href !== "/staf/dashboard" && link.href !== "/supervisor/dashboard" && link.href !== "/kades/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            const gradient = navGradients[link.href] || "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)";

            return (
              <li key={link.href} className={isActive ? styles.active : ""}>
                <Link href={link.href}>
                  <div
                    className={styles.navIconBox}
                    style={{
                      background: gradient,
                      boxShadow: isActive ? "0 4px 10px rgba(94, 114, 228, 0.4)" : "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <p>{link.label}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function getNavLinks(role: Role) {
  const base: Record<Role, { href: string; label: string; icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }[]> = {
    WARGA: [
      { href: "/warga/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/warga/pengajuan", label: "Pengajuan Saya", icon: FileText },
      { href: "/warga/ajukan", label: "Ajukan Baru", icon: PlusCircle },
      { href: "/warga/asisten", label: "Asisten AI", icon: Bot },
      { href: "/profil", label: "Profil Saya", icon: User },
    ],
    STAF: [
      { href: "/staf/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/staf/pengajuan", label: "Daftar Pengajuan", icon: FileText },
      { href: "/staf/asisten", label: "Asisten AI Verifikasi", icon: Bot },
      { href: "/profil", label: "Profil Saya", icon: User },
    ],
    SUPERVISOR: [
      { href: "/supervisor/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/supervisor/pengajuan", label: "Pemantauan Pengajuan", icon: CheckSquare },
      { href: "/supervisor/warga", label: "Data Warga", icon: Users },
      { href: "/supervisor/laporan", label: "Laporan", icon: BarChart },
      { href: "/supervisor/audit", label: "Audit Log", icon: History },
      { href: "/supervisor/asisten", label: "Asisten AI Supervisi", icon: Bot },
      { href: "/profil", label: "Profil Saya", icon: User },
    ],
    KEPALA_DESA: [
      { href: "/kades/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/kades/persetujuan", label: "Persetujuan", icon: CheckSquare },
      { href: "/kades/layanan", label: "Master Layanan", icon: List },
      { href: "/kades/users", label: "Kelola User", icon: Users },
      { href: "/kades/laporan", label: "Laporan", icon: BarChart },
      { href: "/kades/audit", label: "Audit Log", icon: History },
      { href: "/kades/asisten", label: "Asisten AI Eksekutif", icon: Bot },
      { href: "/profil", label: "Profil Saya", icon: User },
      { href: "/kades/konfigurasi-ai", label: "Konfigurasi AI", icon: Settings },
    ],
  };

  return base[role] ?? [];
}
