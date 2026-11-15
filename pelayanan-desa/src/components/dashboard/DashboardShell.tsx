"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import layoutStyles from "@/components/layout/Layout.module.css";

const roleConfig: Record<Role, { label: string; color: string; bg: string }> = {
  WARGA:       { label: "Portal Warga",        color: "#5e72e4", bg: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)" },
  STAF:        { label: "Portal Staf",          color: "#11cdef", bg: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)" },
  SUPERVISOR:  { label: "Portal Supervisor",    color: "#fb6340", bg: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)" },
  KEPALA_DESA: { label: "Portal Kepala Desa",   color: "#2dce89", bg: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)" },
};

export function DashboardShell({
  role,
  name,
  email,
  title,
  subtitle,
  unreadNotificationCount = 0,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  title?: string;
  subtitle?: string;
  unreadNotificationCount?: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = roleConfig[role] || roleConfig.WARGA;

  return (
    <div className={`${layoutStyles.wrapper} ${menuOpen ? layoutStyles.menuOpen : ""}`}>
      {/* Full-width Argon Top Background Banner */}
      <div 
        className={layoutStyles.topBackgroundBanner}
        style={{ background: cfg.bg }}
      >
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 350, height: 350, borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)", filter: "blur(40px)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: "20%",
          width: 250, height: 250, borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.05)", filter: "blur(30px)",
          pointerEvents: "none",
        }} />
      </div>

      <Sidebar userRole={role} />

      <div className={layoutStyles.mainPanel}>
        <Navbar
          userName={name}
          userEmail={email}
          userRole={role}
          unreadNotificationCount={unreadNotificationCount}
          onMenuClick={() => setMenuOpen(!menuOpen)}
        />

        <div className={layoutStyles.content}>
          {(title || subtitle) && (
            <div style={{ marginBottom: 18 }}>
              {title && (
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                  {title}
                </h4>
              )}
              {subtitle && (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255, 255, 255, 0.85)", lineHeight: 1.5 }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}