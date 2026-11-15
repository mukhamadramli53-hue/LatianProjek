"use client";

import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRoleLabel } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import styles from "./DashboardHeader.module.css";
import { ChevronDown, User, LogOut, Sun, Moon } from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";

interface DashboardHeaderProps {
 userName: string;
 userEmail: string;
 userRole: Role;
 unreadNotificationCount?: number;
}

export default function DashboardHeader({
 userName,
 userEmail,
 userRole,
 unreadNotificationCount = 0,
}: DashboardHeaderProps) {
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [isLoggingOut, setIsLoggingOut] = useState(false);
 const [isDark, setIsDark] = useState(false);
 const pathname = usePathname();

 useEffect(() => {
   const saved = localStorage.getItem("theme");
   const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
   if (saved === "dark" || (!saved && prefersDark)) {
     requestAnimationFrame(() => setIsDark(true));
     document.documentElement.setAttribute("data-theme", "dark");
     document.documentElement.classList.add("dark");
   }
 }, []);

 const toggleTheme = () => {
   const next = !isDark;
   setIsDark(next);
   if (next) {
     document.documentElement.setAttribute("data-theme", "dark");
     document.documentElement.classList.add("dark");
     localStorage.setItem("theme", "dark");
   } else {
     document.documentElement.setAttribute("data-theme", "light");
     document.documentElement.classList.remove("dark");
     localStorage.setItem("theme", "light");
   }
 };

 const handleLogout = async () => {
 setIsLoggingOut(true);
 await fetch("/api/auth/logout", { method: "POST" });
 await signOut({ callbackUrl: "/login" });
 };

 const roleLabel = getRoleLabel(userRole);
 const roleBadgeClass = getRoleBadgeClass(userRole);

 // Initial untuk avatar
 const initials = userName
 .split(" ")
 .slice(0, 2)
 .map((n) => n[0])
 .join("")
 .toUpperCase();

 return (
 <header className={styles.header}>
 <div className={styles.inner}>
 {/* Logo */}
 <Link href="/" className={styles.logo} aria-label="Beranda Sistem Pelayanan Desa">
 <span className={styles.logoIcon}>🏛️</span>
 <span className={styles.logoText}>Pelayanan Desa</span>
 </Link>

 {/* Nav Links (Desktop) */}
 <nav className={styles.nav} aria-label="Navigasi utama">
 <NavLinks role={userRole} pathname={pathname} />
 </nav>

 <NotificationDropdown
   userRole={userRole}
   initialUnreadCount={unreadNotificationCount}
 />

 {/* Tombol Ikon Mode Gelap / Terang */}
 <button
   type="button"
   onClick={toggleTheme}
   title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
   aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
   style={{
     background: "rgba(255, 255, 255, 0.15)",
     border: "1px solid rgba(255, 255, 255, 0.25)",
     borderRadius: "8px",
     padding: "6px 10px",
     cursor: "pointer",
     color: isDark ? "#ffd166" : "#ffffff",
     display: "inline-flex",
     alignItems: "center",
     justifyContent: "center",
     transition: "all 0.2s ease",
     marginRight: "4px",
   }}
 >
   {isDark ? <Sun size={17} /> : <Moon size={17} />}
 </button>

 {/* User Menu */}
 <div className={styles.userSection}>
 <button
 id="user-menu-btn"
 className={styles.userButton}
 onClick={() => setIsMenuOpen(!isMenuOpen)}
 aria-expanded={isMenuOpen}
 aria-haspopup="true"
 aria-label="Menu pengguna"
 >
 <div className={styles.avatar} aria-hidden="true">
 {initials}
 </div>
 <div className={styles.userInfo}>
 <span className={styles.userName}>{userName}</span>
 <span className={`badge ${roleBadgeClass} ${styles.roleBadge}`}>
 {roleLabel}
 </span>
 </div>
 <ChevronDown
 className={`${styles.chevron} ${isMenuOpen ? styles.chevronOpen : ""}`}
 size={16}
 aria-hidden="true"
 />
 </button>

 {/* Dropdown Menu */}
 {isMenuOpen && (
 <>
 <div
 className={styles.overlay}
 onClick={() => setIsMenuOpen(false)}
 aria-hidden="true"
 />
 <div className={styles.dropdown} role="menu" aria-label="Menu pengguna">
 <div className={styles.dropdownHeader}>
 <p className={styles.dropdownName}>{userName}</p>
 <p className={styles.dropdownEmail}>{userEmail}</p>
 </div>
 <div className={styles.dropdownDivider} />
 <Link
 href="/profil"
 className={styles.dropdownItem}
 role="menuitem"
 onClick={() => setIsMenuOpen(false)}
 >
 <User size={16} aria-hidden="true" />
 Profil Saya
 </Link>
 <div className={styles.dropdownDivider} />
 <button
 id="logout-btn"
 className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
 onClick={handleLogout}
 disabled={isLoggingOut}
 role="menuitem"
 aria-busy={isLoggingOut}
 >
 {isLoggingOut ? (
 <>
 <span className="spinner" style={{ borderTopColor: "currentColor" }} aria-hidden="true" />
 Keluar...
 </>
 ) : (
 <>
 <LogOut size={16} aria-hidden="true" />
 Keluar
 </>
 )}
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </header>
 );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function NavLinks({ role, pathname }: { role: Role; pathname: string }) {
 const links = getNavLinks(role);

 return (
 <>
 {links.map((link) => (
 <Link
 key={link.href}
 href={link.href}
 className={`${styles.navLink} ${pathname.startsWith(link.href) ? styles.navLinkActive : ""}`}
 >
 {link.label}
 </Link>
 ))}
 </>
 );
}

// ============================================================
// HELPERS
// ============================================================

function getNavLinks(role: Role): { href: string; label: string }[] {
 const base: Record<Role, { href: string; label: string }[]> = {
 WARGA: [
 { href: "/warga/dashboard", label: "Dashboard" },
 { href: "/warga/pengajuan", label: "Pengajuan Saya" },
 { href: "/warga/ajukan", label: "Ajukan Baru" },
 { href: "/warga/asisten", label: "Asisten AI" },
 ],
 STAF: [
 { href: "/staf/dashboard", label: "Dashboard" },
 { href: "/staf/pengajuan", label: "Daftar Pengajuan" },
 { href: "/staf/asisten", label: "Asisten AI" },
 ],
 SUPERVISOR: [
 { href: "/supervisor/dashboard", label: "Dashboard" },
 { href: "/supervisor/pengajuan", label: "Pemantauan Pengajuan" },
 { href: "/supervisor/warga", label: "Data Warga" },
 { href: "/supervisor/laporan", label: "Laporan" },
 { href: "/supervisor/audit", label: "Audit Log" },
 { href: "/supervisor/asisten", label: "Asisten AI Supervisi" },
 ],
 KEPALA_DESA: [
 { href: "/kades/dashboard", label: "Dashboard" },
 { href: "/kades/persetujuan", label: "Persetujuan" },
 { href: "/kades/asisten", label: "Asisten AI" },
 { href: "/kades/layanan", label: "Master Layanan" },
 { href: "/kades/users", label: "Kelola User" },
 { href: "/kades/laporan", label: "Laporan" },
 { href: "/kades/audit", label: "Audit Log" },
 ],
 };

 return base[role] ?? [];
}

function getRoleBadgeClass(role: Role): string {
 const map: Record<Role, string> = {
 WARGA: "badge-primary",
 STAF: "badge-success",
 SUPERVISOR: "badge-warning",
 KEPALA_DESA: "badge-danger",
 };
 return map[role] ?? "badge-primary";
}
