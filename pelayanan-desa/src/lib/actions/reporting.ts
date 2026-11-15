"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ApplicationStatus, Role } from "@prisma/client";

const statuses: ApplicationStatus[] = ["DIAJUKAN", "DIVERIFIKASI", "DIPROSES", "REVIEW_SUPERVISOR", "MENUNGGU_APPROVAL", "DISETUJUI", "SELESAI", "PERLU_PERBAIKAN", "DITOLAK"];

async function requireReportingAccess() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.role || !(["SUPERVISOR", "KEPALA_DESA"] as Role[]).includes(session.user.role)) {
    redirect("/403");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive || !(["SUPERVISOR", "KEPALA_DESA"] as Role[]).includes(user.role)) {
    redirect("/403");
  }
  return user;
}

export type ReportFilters = {
  period?: "day" | "week" | "month";
  from?: string;
  to?: string;
  serviceId?: string;
  status?: ApplicationStatus;
};

function dateRange(filters: ReportFilters) {
  const where: { gte?: Date; lt?: Date } = {};
  if (filters.period) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (filters.period === "day") {
      where.gte = start;
    } else if (filters.period === "week") {
      start.setDate(start.getDate() - 6);
      where.gte = start;
    } else {
      start.setDate(1);
      where.gte = start;
    }
    return where;
  }
  if (filters.from) where.gte = new Date(`${filters.from}T00:00:00`);
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    where.lt = end;
  }
  return Object.keys(where).length ? where : undefined;
}

export async function getReport(filters: ReportFilters = {}) {
  await requireReportingAccess();
  const submittedAt = dateRange(filters);
  const where = {
    ...(submittedAt ? { submitted_at: submittedAt } : {}),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const applications = await prisma.application.findMany({
    where,
    select: { id: true, nomor_pengajuan: true, status: true, submitted_at: true, updatedAt: true, service: { select: { id: true, code: true, name: true } } },
    orderBy: { submitted_at: "desc" },
  });
  const byStatus = statuses.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));
  const serviceMap = new Map<string, { name: string; count: number }>();
  for (const item of applications) {
    const current = serviceMap.get(item.service.id) || { name: item.service.name, count: 0 };
    current.count += 1;
    serviceMap.set(item.service.id, current);
  }
  const totalSktm = applications.filter((item) => item.service.code === "SKTM").length;
  const totalSkck = applications.filter((item) => item.service.code === "SP-SKCK" || item.service.code === "SKCK").length;
  const menungguVerifikasi = applications.filter((item) => item.status === "DIAJUKAN").length;
  const menungguReview = applications.filter((item) => item.status === "REVIEW_SUPERVISOR").length;
  const menungguPersetujuan = applications.filter((item) => item.status === "MENUNGGU_APPROVAL").length;
  const disetujui = applications.filter((item) => item.status === "DISETUJUI" || item.status === "SELESAI").length;
  const ditolak = applications.filter((item) => item.status === "DITOLAK").length;
  const completed = applications.filter((item) => item.status === "SELESAI");
  const repair = applications.filter((item) => item.status === "PERLU_PERBAIKAN").length;
  const averageCompletionDays = completed.length
    ? completed.reduce((sum, item) => sum + (item.updatedAt.getTime() - item.submitted_at.getTime()) / 86_400_000, 0) / completed.length
    : null;
  return {
    total: applications.length,
    totalSktm,
    totalSkck,
    menungguVerifikasi,
    menungguReview,
    menungguPersetujuan,
    disetujui,
    ditolak,
    completed: completed.length,
    needsRepair: repair,
    averageCompletionDays,
    byStatus,
    byService: [...serviceMap.values()].sort((a, b) => b.count - a.count),
    rows: applications,
  };
}

export async function getAuditLogs(filters: { from?: string; to?: string; action?: string } = {}) {
  await requireReportingAccess();
  const createdAt = dateRange(filters);
  return prisma.auditLog.findMany({
    where: { ...(createdAt ? { createdAt } : {}), ...(filters.action ? { action: filters.action as never } : {}) },
    include: { actor: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function getReportServices() {
  await requireReportingAccess();
  return prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function deleteAuditLog(id: string) {
  await requireReportingAccess();
  try {
    const existing = await prisma.auditLog.findUnique({
      where: { id },
      select: { id: true, action: true, entity: true },
    });
    if (!existing) {
      return { success: false, error: "Catatan audit log tidak ditemukan atau telah dihapus." };
    }
    await prisma.auditLog.delete({
      where: { id },
    });
    revalidatePath("/supervisor/audit");
    revalidatePath("/kades/audit");
    return { success: true };
  } catch (error) {
    console.error("[deleteAuditLog] Gagal menghapus log:", error);
    return { success: false, error: "Terjadi kesalahan saat menghapus catatan audit log." };
  }
}

export async function deleteMultipleAuditLogs(ids: string[]) {
  await requireReportingAccess();
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "Tidak ada catatan log yang dipilih untuk dihapus." };
    }
    const result = await prisma.auditLog.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/supervisor/audit");
    revalidatePath("/kades/audit");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("[deleteMultipleAuditLogs] Gagal menghapus banyak log:", error);
    return { success: false, error: "Terjadi kesalahan saat menghapus log terpilih." };
  }
}

export async function clearAllAuditLogs() {
  await requireReportingAccess();
  try {
    const result = await prisma.auditLog.deleteMany({});
    revalidatePath("/supervisor/audit");
    revalidatePath("/kades/audit");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("[clearAllAuditLogs] Gagal membersihkan audit log:", error);
    return { success: false, error: "Terjadi kesalahan saat membersihkan seluruh log audit." };
  }
}

