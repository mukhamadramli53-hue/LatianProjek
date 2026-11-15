"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ApplicationStatus, Role } from "@prisma/client";

const activeStatuses: ApplicationStatus[] = [
  "DIAJUKAN",
  "DIVERIFIKASI",
  "DIPROSES",
  "REVIEW_SUPERVISOR",
  "MENUNGGU_APPROVAL",
  "DISETUJUI",
];

async function requireRole(roles: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user?.isActive || !roles.includes(user.role)) redirect("/403");
  return user;
}

function estimatedDays(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const days = Number(match[1].replace(",", "."));
  return value.toLowerCase().includes("jam") ? days / 24 : days;
}

function isNearDeadline(submittedAt: Date, estimate: string | null): boolean {
  const days = estimatedDays(estimate);
  if (days === null) return false;
  const elapsedDays = (Date.now() - submittedAt.getTime()) / 86_400_000;
  return days - elapsedDays <= 1 && elapsedDays < days;
}

export async function getWargaDashboard() {
  const user = await requireRole(["WARGA"]);
  const where = { userId: user.id };

  const [total, processed, needsRepair, completed, recent] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.count({ where: { ...where, status: { in: activeStatuses } } }),
    prisma.application.count({ where: { ...where, status: "PERLU_PERBAIKAN" } }),
    prisma.application.count({ where: { ...where, status: "SELESAI" } }),
    prisma.application.findMany({
      where,
      include: {
        service: { select: { name: true } },
        documents: { select: { id: true, requirement_name: true, file_name: true, storage_key: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return { total, processed, needsRepair, completed, recent };
}

export async function getStaffDashboard() {
  await requireRole(["STAF"]);
  const sinceYesterday = new Date(Date.now() - 86_400_000);
  const [newCount, verification, processing, applications] = await Promise.all([
    prisma.application.count({ where: { submitted_at: { gte: sinceYesterday } } }),
    prisma.application.count({ where: { status: "DIAJUKAN" } }),
    prisma.application.count({ where: { status: "DIPROSES" } }),
    prisma.application.findMany({
      where: { status: { in: activeStatuses } },
      include: {
        user: { select: { name: true } },
        service: { select: { name: true, estimatedTime: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const nearDeadline = applications.filter((application) =>
    isNearDeadline(application.submitted_at, application.service.estimatedTime)
  );

  return {
    newCount,
    verification,
    processing,
    nearDeadline,
    recent: applications.slice(0, 5),
  };
}

export async function getSupervisorDashboard() {
  await requireRole(["SUPERVISOR"]);
  const [
    total,
    pendingApproval,
    pending,
    grouped,
    activity,
    totalWarga,
    totalStaf,
    totalKades,
    totalSupervisor,
    actorsList,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: "MENUNGGU_APPROVAL" } }),
    prisma.application.count({ where: { status: { in: ["DIAJUKAN", "DIVERIFIKASI", "DIPROSES", "PERLU_PERBAIKAN"] } } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.applicationHistory.findMany({
      include: {
        actor: { select: { name: true, role: true } },
        application: { select: { nomor_pengajuan: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.count({ where: { role: "WARGA" } }),
    prisma.user.count({ where: { role: "STAF" } }),
    prisma.user.count({ where: { role: "KEPALA_DESA" } }),
    prisma.user.count({ where: { role: "SUPERVISOR" } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        nik: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    total,
    review: pendingApproval,
    pending,
    statusStats: grouped.map((item) => ({ status: item.status, count: item._count._all })),
    activity,
    actorsSummary: {
      warga: totalWarga,
      staf: totalStaf,
      kades: totalKades,
      supervisor: totalSupervisor,
      totalUsers: totalWarga + totalStaf + totalKades + totalSupervisor,
    },
    actorsList,
  };
}

export async function getKadesDashboard() {
  await requireRole(["KEPALA_DESA"]);
  const [
    totalSktm,
    totalSkck,
    menungguVerifikasi,
    sedangDiproses,
    menungguReview,
    menungguPersetujuan,
    disetujui,
    ditolak,
    perluPerbaikan,
    total,
    byService,
    completedApplications,
  ] = await Promise.all([
    prisma.application.count({ where: { service: { code: "SKTM" } } }),
    prisma.application.count({ where: { service: { code: { in: ["SP-SKCK", "SKCK"] } } } }),
    prisma.application.count({ where: { status: "DIAJUKAN" } }),
    prisma.application.count({ where: { status: { in: ["DIVERIFIKASI", "DIPROSES"] } } }),
    prisma.application.count({ where: { status: "REVIEW_SUPERVISOR" } }),
    prisma.application.count({ where: { status: "MENUNGGU_APPROVAL" } }),
    prisma.application.count({ where: { status: { in: ["DISETUJUI", "SELESAI"] } } }),
    prisma.application.count({ where: { status: "DITOLAK" } }),
    prisma.application.count({ where: { status: "PERLU_PERBAIKAN" } }),
    prisma.application.count(),
    prisma.application.groupBy({ by: ["serviceId"], _count: { _all: true } }),
    prisma.application.findMany({
      where: { status: { in: ["DISETUJUI", "SELESAI"] } },
      select: { submitted_at: true, updatedAt: true },
    }),
  ]);

  const services = await prisma.service.findMany({
    where: { id: { in: byService.map((item) => item.serviceId) } },
    select: { id: true, name: true },
  });
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const averageCompletionDays = completedApplications.length === 0
    ? null
    : completedApplications.reduce(
        (sum, item) => sum + (item.updatedAt.getTime() - item.submitted_at.getTime()) / 86_400_000,
        0
      ) / completedApplications.length;

  return {
    total,
    totalSktm,
    totalSkck,
    menungguVerifikasi,
    sedangDiproses,
    menungguReview,
    menungguPersetujuan,
    disetujui,
    ditolak,
    perluPerbaikan,
    approval: menungguPersetujuan,
    completed: disetujui,
    rejected: ditolak,
    serviceStats: byService.map((item) => ({
      name: serviceNames.get(item.serviceId) ?? "Layanan",
      count: item._count._all,
    })).sort((a, b) => b.count - a.count),
    performance: { completedSample: completedApplications.length, averageCompletionDays },
  };
}