"use client";

/**
 * ApplicationStatusBadge - Creative Tim Argon Dashboard 2 Gradient Pill Badges
 */

import type { ApplicationStatus } from "@prisma/client";

interface Props {
  status: ApplicationStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; background: string; color: string; shadow?: string }
> = {
  DIAJUKAN: {
    label: "Diajukan",
    background: "linear-gradient(310deg, #17c1e8 0%, #11cdef 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(23, 193, 232, 0.3)",
  },
  DIVERIFIKASI: {
    label: "Sedang Diverifikasi",
    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(94, 114, 228, 0.3)",
  },
  DIPROSES: {
    label: "Sedang Diproses",
    background: "linear-gradient(310deg, #5e72e4 0%, #1171ef 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(94, 114, 228, 0.3)",
  },
  PERLU_PERBAIKAN: {
    label: "Perlu Perbaikan",
    background: "linear-gradient(310deg, #fb6340 0%, #fbb140 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(251, 99, 64, 0.3)",
  },
  MENUNGGU_APPROVAL: {
    label: "Menunggu Persetujuan Kades",
    background: "linear-gradient(310deg, #344767 0%, #141727 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(52, 71, 103, 0.3)",
  },
  DISETUJUI: {
    label: "Disetujui",
    background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(45, 206, 137, 0.3)",
  },
  DITOLAK: {
    label: "Ditolak",
    background: "linear-gradient(310deg, #f5365c 0%, #f56036 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(245, 54, 92, 0.3)",
  },
  SELESAI: {
    label: "Selesai",
    background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(45, 206, 137, 0.3)",
  },
  REVIEW_SUPERVISOR: {
    label: "Review Supervisor (Arsip)",
    background: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(130, 94, 228, 0.3)",
  },
};


export function ApplicationStatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status] || {
    label: status,
    background: "linear-gradient(310deg, #8392ab 0%, #67748e 100%)",
    color: "#ffffff",
    shadow: "0 2px 4px rgba(131, 146, 171, 0.3)",
  };

  const isSm = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: isSm ? "3px 8px" : "4px 12px",
        borderRadius: "0.375rem",
        background: config.background,
        color: config.color,
        boxShadow: config.shadow,
        fontSize: isSm ? "0.65rem" : "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#ffffff",
          display: "inline-block",
          opacity: 0.9,
        }}
      />
      {config.label}
    </span>
  );
}
