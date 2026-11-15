"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Settings, LogOut, User, Menu, Search, Sun, Moon } from "lucide-react";
import styles from "./Layout.module.css";
import type { Role } from "@prisma/client";
import { usePathname } from "next/navigation";
import NotificationDropdown from "@/components/layout/NotificationDropdown";

interface NavbarProps {
  userName: string;
  userEmail: string;
  userRole: Role;
  unreadNotificationCount?: number;
  onMenuClick: () => void;
}

function getPageTitle(pathname: string): { label: string; title: string } {
  if (pathname.includes("/dashboard")) return { label: "Pages", title: "Dashboard" };
  if (pathname.includes("/pengajuan")) return { label: "Pages", title: "Pengajuan" };
  if (pathname.includes("/ajukan")) return { label: "Pages", title: "Ajukan Layanan" };
  if (pathname.includes("/persetujuan")) return { label: "Pages", title: "Persetujuan" };
  if (pathname.includes("/layanan")) return { label: "Pages", title: "Master Layanan" };
  if (pathname.includes("/users")) return { label: "Pages", title: "Kelola User" };
  if (pathname.includes("/laporan")) return { label: "Pages", title: "Laporan" };
  if (pathname.includes("/audit")) return { label: "Pages", title: "Audit Log" };
  if (pathname.includes("/asisten")) return { label: "Pages", title: "Asisten Virtual" };
  if (pathname.includes("/profil")) return { label: "Pages", title: "Profil Saya" };
  return { label: "Pages", title: "Dashboard" };
}

export default function Navbar({
  userName,
  userEmail,
  userRole,
  unreadNotificationCount = 0,
  onMenuClick,
}: NavbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { label, title } = getPageTitle(pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const applyTheme = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      if (document.body) document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      if (document.body) document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved === "dark" || (!saved && prefersDark);
    requestAnimationFrame(() => applyTheme(shouldBeDark));
  }, []);

  const toggleTheme = () => {
    applyTheme(!isDark);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ callbackUrl: "/login" });
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}
      data-role={userRole}
    >
      {/* Left: Toggle + Authentic Argon Breadcrumb */}
      <div className={styles.navbarLeft}>
        <button type="button" className={styles.navbarToggler} onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className={styles.navbarBreadcrumb}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255, 255, 255, 0.9)", fontWeight: 600 }}>
            <span>{label}</span>
            <span style={{ opacity: 0.7 }}>/</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>{title}</span>
          </div>
          <h6 style={{
            margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "#ffffff",
            letterSpacing: "-0.01em", textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}>
            {title}
          </h6>
        </div>
      </div>

      {/* Right: Actions */}
      <div className={styles.navbarRight}>
        {/* Search input in Argon style */}
        <div
          className={styles.navbarSearch}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            marginRight: 6,
          }}
        >
          <input
            type="text"
            placeholder="Cari..."
            className={styles.navbarSearchInput}
            style={{
              padding: "8px 14px 8px 34px",
              borderRadius: "0.5rem",
              background: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              color: "#1e293b",
              fontSize: 12.5,
              fontWeight: 600,
              width: 180,
              outline: "none",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
              transition: "all 0.2s ease",
            }}
          />
          <Search size={14} style={{ position: "absolute", left: 12, color: "#64748b", pointerEvents: "none" }} />
        </div>

        {/* Notifications Dropdown Panel */}
        <NotificationDropdown
          userRole={userRole}
          initialUnreadCount={unreadNotificationCount}
        />

        {/* Tombol Ikon Mode Gelap / Terang */}
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.navbarBtn}
          title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
          aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
          style={{
            cursor: "pointer",
            padding: "7px 10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: 8,
            transition: "all 0.2s ease",
          }}
        >
          {isDark ? (
            <Sun size={17} style={{ color: "#ffd166" }} />
          ) : (
            <Moon size={17} style={{ color: "#ffffff" }} />
          )}
        </button>

        <div className={styles.navDivider} />

        {/* Profile Dropdown */}
        <div className={styles.navItem}>
          <button
            className={styles.navbarBtn}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: userRole === "KEPALA_DESA" ? "#2dce89" : userRole === "STAF" ? "#11cdef" : userRole === "SUPERVISOR" ? "#fb6340" : "#5e72e4",
              fontWeight: 800,
              fontSize: 11,
              flexShrink: 0,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}>
              {initials}
            </div>
            <span className={styles.navbarBtnText}>{userName.split(" ")[0]}</span>
          </button>

          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 999 }}
                onClick={() => setIsDropdownOpen(false)}
              />
              <ul className={styles.dropdownMenu} style={{ zIndex: 1000 }}>
                <li>
                  <div className={styles.dropdownHeader}>
                    <div
                      className={styles.dropdownAvatar}
                      style={{
                        background: userRole === "KEPALA_DESA"
                          ? "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)"
                          : userRole === "STAF"
                          ? "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)"
                          : userRole === "SUPERVISOR"
                          ? "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)"
                          : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                      }}
                    >
                      {initials}
                    </div>
                    <p className={styles.dropdownName}>{userName}</p>
                    <p className={styles.dropdownEmail}>{userEmail}</p>
                  </div>
                </li>
                <li>
                  <Link
                    href="/profil"
                    className={styles.dropdownItem}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User size={15} /> Profil Saya
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profil/settings"
                    className={styles.dropdownItem}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings size={15} /> Pengaturan
                  </Link>
                </li>
                <li>
                  <button
                    className={`${styles.dropdownItem} ${styles.danger}`}
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={{ width: "100%" }}
                  >
                    <LogOut size={15} /> {isLoggingOut ? "Keluar..." : "Keluar"}
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
