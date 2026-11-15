"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import layoutStyles from "@/components/layout/Layout.module.css";

const roleGradients: Record<Role, { bg: string; title: string }> = {
  WARGA: {
    bg: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
    title: "Portal Layanan Warga",
  },
  STAF: {
    bg: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
    title: "Portal Pelayanan Staf",
  },
  SUPERVISOR: {
    bg: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
    title: "Portal Pengawasan Supervisor",
  },
  KEPALA_DESA: {
    bg: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
    title: "Portal Eksekutif Kepala Desa",
  },
};

export function PaperLayoutClient({ 
  role, 
  name, 
  email, 
  unreadNotificationCount = 0,
  children 
}: { 
  role: Role; 
  name: string; 
  email: string; 
  unreadNotificationCount?: number;
  children: React.ReactNode 
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = roleGradients[role] || roleGradients.WARGA;

  return (
    <div className={`${layoutStyles.wrapper} ${menuOpen ? layoutStyles.menuOpen : ""}`}>
      {/* Creative Tim Argon 2 Top Background Banner (Spans full viewport width behind sidebar and main panel) */}
      <div 
        className={layoutStyles.topBackgroundBanner}
        style={{ background: cfg.bg }}
      >
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 350, height: 350, borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)", filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: "20%",
          width: 250, height: 250, borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.05)", filter: "blur(30px)",
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
          {children}
        </div>
      </div>
    </div>
  );
}
