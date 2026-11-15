/**
 * RBAC (Role-Based Access Control) Utilities
 *
 * Definisi permission dan helper functions untuk otorisasi.
 * Semua keputusan akses terpusat di sini agar mudah dipelihara.
 */

import { Role } from "@prisma/client";

// ============================================================
// TIPE & KONSTANTA
// ============================================================

/** Urutan hierarki role dari terendah ke tertinggi */
export const ROLE_HIERARCHY: Record<Role, number> = {
  WARGA: 0,
  STAF: 1,
  SUPERVISOR: 2,
  KEPALA_DESA: 3,
};

/** Label tampilan untuk setiap role */
export const ROLE_LABELS: Record<Role, string> = {
  WARGA: "Warga",
  STAF: "Staf Desa",
  SUPERVISOR: "Supervisor",
  KEPALA_DESA: "Kepala Desa",
};

/** Rute dashboard berdasarkan role */
export const ROLE_DASHBOARD_ROUTES: Record<Role, string> = {
  WARGA: "/warga/dashboard",
  STAF: "/staf/dashboard",
  SUPERVISOR: "/supervisor/dashboard",
  KEPALA_DESA: "/kades/dashboard",
};

/** Definisi permission per fitur */
export type Permission =
  | "service_request:create"       // Membuat pengajuan
  | "service_request:view_own"     // Lihat pengajuan sendiri
  | "service_request:view_all"     // Lihat semua pengajuan
  | "service_request:verify"       // Verifikasi pengajuan (staf)
  | "service_request:approve"      // Approve pengajuan (kades)
  | "service_request:reject"       // Tolak pengajuan
  | "user:manage"                  // Kelola user (kades)
  | "user:view_all"                // Lihat semua user
  | "report:view"                  // Lihat laporan
  | "dashboard:staff"              // Akses dashboard staf
  | "dashboard:supervisor"         // Akses dashboard supervisor
  | "dashboard:kades";             // Akses dashboard kepala desa

/** Permission matrix per role */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  WARGA: [
    "service_request:create",
    "service_request:view_own",
  ],
  STAF: [
    "service_request:view_all",
    "service_request:verify",
    "service_request:reject",
    "dashboard:staff",
  ],
  SUPERVISOR: [
    "service_request:view_all",
    "service_request:verify",
    "service_request:reject",
    "report:view",
    "user:view_all",
    "dashboard:staff",
    "dashboard:supervisor",
  ],
  KEPALA_DESA: [
    "service_request:view_all",
    "service_request:approve",
    "service_request:reject",
    "report:view",
    "user:manage",
    "user:view_all",
    "dashboard:staff",
    "dashboard:supervisor",
    "dashboard:kades",
  ],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Cek apakah role memiliki permission tertentu.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Cek apakah role memiliki salah satu dari beberapa permission.
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Cek apakah role memiliki semua permission yang diberikan.
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Cek apakah role memiliki level yang cukup (berdasarkan hierarki).
 * Berguna untuk "minimal role" check.
 */
export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Cek apakah role adalah staf desa atau lebih tinggi (bukan warga).
 */
export function isStaffOrAbove(role: Role): boolean {
  return hasMinimumRole(role, "STAF");
}

/**
 * Dapatkan URL dashboard berdasarkan role.
 */
export function getDashboardUrl(role: Role): string {
  return ROLE_DASHBOARD_ROUTES[role];
}

/**
 * Dapatkan label role untuk ditampilkan ke UI.
 */
export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
