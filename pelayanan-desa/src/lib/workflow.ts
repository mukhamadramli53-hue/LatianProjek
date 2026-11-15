import type { ApplicationStatus, Role } from "@prisma/client";

export type WorkflowTransition = {
  from: ApplicationStatus;
  to: ApplicationStatus;
  roles: Role[];
};

export const WORKFLOW_TRANSITIONS: readonly WorkflowTransition[] = [
  { from: "DIAJUKAN", to: "DIVERIFIKASI", roles: ["STAF"] },
  { from: "DIAJUKAN", to: "PERLU_PERBAIKAN", roles: ["STAF"] },
  { from: "DIVERIFIKASI", to: "DIPROSES", roles: ["STAF"] },
  { from: "DIVERIFIKASI", to: "MENUNGGU_APPROVAL", roles: ["STAF"] },
  { from: "DIVERIFIKASI", to: "PERLU_PERBAIKAN", roles: ["STAF"] },
  { from: "DIPROSES", to: "MENUNGGU_APPROVAL", roles: ["STAF"] },
  { from: "DIPROSES", to: "PERLU_PERBAIKAN", roles: ["STAF"] },
  // Backward compatibility / penanganan transisi data terdahulu
  { from: "REVIEW_SUPERVISOR", to: "MENUNGGU_APPROVAL", roles: ["SUPERVISOR", "STAF"] },
  { from: "REVIEW_SUPERVISOR", to: "PERLU_PERBAIKAN", roles: ["SUPERVISOR", "STAF"] },
  { from: "MENUNGGU_APPROVAL", to: "DISETUJUI", roles: ["KEPALA_DESA"] },
  { from: "MENUNGGU_APPROVAL", to: "PERLU_PERBAIKAN", roles: ["KEPALA_DESA"] },
  { from: "MENUNGGU_APPROVAL", to: "DITOLAK", roles: ["KEPALA_DESA"] },
  { from: "DISETUJUI", to: "SELESAI", roles: ["STAF"] },
  // Resubmission is a controlled operation, not a generic status edit by warga.
  { from: "PERLU_PERBAIKAN", to: "DIAJUKAN", roles: ["WARGA"] },
];

export function canTransition(
  role: Role,
  from: ApplicationStatus,
  to: ApplicationStatus
): boolean {
  return WORKFLOW_TRANSITIONS.some(
    (transition) =>
      transition.from === from &&
      transition.to === to &&
      transition.roles.includes(role)
  );
}

export function getAllowedTransitions(
  role: Role,
  from: ApplicationStatus
): ApplicationStatus[] {
  return WORKFLOW_TRANSITIONS
    .filter((transition) => transition.from === from && transition.roles.includes(role))
    .map((transition) => transition.to);
}

/**
 * Label resmi status pengajuan untuk antarmuka pengguna sesuai standar alur:
 * Warga -> Staf Desa -> Kepala Desa
 */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DIAJUKAN: "Diajukan",
  DIVERIFIKASI: "Sedang Diverifikasi",
  DIPROSES: "Sedang Diproses",
  PERLU_PERBAIKAN: "Perlu Perbaikan",
  MENUNGGU_APPROVAL: "Menunggu Persetujuan Kepala Desa",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  SELESAI: "Selesai",
  REVIEW_SUPERVISOR: "Review Supervisor (Arsip)",
};

/**
 * Keterangan rinci makna setiap status pengajuan
 */
export const APPLICATION_STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  DIAJUKAN: "Warga berhasil mengirim pengajuan dan berkas masuk ke antrean Staf Desa.",
  DIVERIFIKASI: "Staf Desa sedang memeriksa kelengkapan data dan dokumen persyaratan.",
  DIPROSES: "Staf Desa sedang menyiapkan draf surat resmi kependudukan.",
  PERLU_PERBAIKAN: "Pengajuan dikembalikan kepada warga untuk diperbaiki atau dilengkapi.",
  MENUNGGU_APPROVAL: "Pengajuan telah diverifikasi oleh Staf Desa dan menunggu persetujuan resmi Kepala Desa.",
  DISETUJUI: "Kepala Desa telah menyetujui pengajuan dan dokumen surat resmi disahkan.",
  DITOLAK: "Kepala Desa menolak pengajuan dengan alasan yang sesuai.",
  SELESAI: "Layanan telah diselesaikan dan surat resmi telah diterbitkan.",
  REVIEW_SUPERVISOR: "Tahap penelaahan berkas terdahulu (arsip sistem).",
};