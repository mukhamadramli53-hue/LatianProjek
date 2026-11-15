"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { type Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import {
  createServiceSchema,
  updateServiceSchema,
  ALLOWED_SERVICE_CODES,
  isAllowedService,
  isAllowedServiceCode,
  type CreateServiceInput,
  type UpdateServiceInput,
} from "../validations/service";

// Helpers
async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.role !== Role.KEPALA_DESA) {
    throw new Error("Unauthorized. Only Kepala Desa can manage master services.");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive || user.role !== Role.KEPALA_DESA) {
    throw new Error("Unauthorized. Akun tidak aktif atau role sudah berubah.");
  }
  return user;
}

export async function getServices(params?: { search?: string; isActive?: boolean }) {
  const where: Prisma.ServiceWhereInput = {
    code: { in: [...ALLOWED_SERVICE_CODES] },
  };
  
  if (params?.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: params.search } },
          { code: { contains: params.search } }
        ],
      },
    ];
  }

  if (params?.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return services;
}

export async function getServiceById(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (service && !isAllowedService(service)) return null;
  return service;
}

export async function getServiceByCode(code: string) {
  let service = await prisma.service.findUnique({ where: { code } });
  if (!service && (code === "SKCK" || code === "skck")) {
    service = await prisma.service.findUnique({ where: { code: "SP-SKCK" } });
  }
  if (!service && (code === "SP-SKCK" || code === "sp-skck")) {
    service = await prisma.service.findUnique({ where: { code: "SKCK" } });
  }
  if (service && !isAllowedService(service)) return null;
  return service;
}

export async function createService(input: CreateServiceInput) {
  const actor = await checkAdmin();
  const parsed = createServiceSchema.parse(input);

  if (!isAllowedServiceCode(parsed.code)) {
    throw new Error("Sistem saat ini hanya mengizinkan layanan SKTM dan Pengantar Pembuatan SKCK (SP-SKCK).");
  }

  const existing = await prisma.service.findUnique({ where: { code: parsed.code } });
  if (existing) {
    throw new Error("Kode layanan sudah digunakan");
  }

  const service = await prisma.service.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
      requirements: parsed.requirements,
      form_schema: parsed.form_schema,
      estimatedTime: parsed.estimatedTime,
      isActive: parsed.isActive,
    }
  });
  await writeAuditLog({ actorId: actor.id, action: "CREATE_SERVICE", entity: "Service", entityId: service.id, metadata: { code: service.code } });

  revalidatePath("/kades/layanan");
  revalidatePath("/layanan");
  return service;
}

export async function updateService(input: UpdateServiceInput) {
  const actor = await checkAdmin();
  const parsed = updateServiceSchema.parse(input);

  const existing = await prisma.service.findUnique({ where: { code: parsed.code } });
  if (existing && existing.id !== parsed.id) {
    throw new Error("Kode layanan sudah digunakan oleh layanan lain");
  }

  const service = await prisma.service.update({
    where: { id: parsed.id },
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
      requirements: parsed.requirements,
      form_schema: parsed.form_schema,
      estimatedTime: parsed.estimatedTime,
      isActive: parsed.isActive,
    }
  });
  await writeAuditLog({ actorId: actor.id, action: "UPDATE_SERVICE", entity: "Service", entityId: service.id, metadata: { code: service.code } });

  revalidatePath("/kades/layanan");
  revalidatePath("/layanan");
  return service;
}

export async function toggleServiceStatus(id: string, isActive: boolean) {
  const actor = await checkAdmin();
  
  const service = await prisma.service.update({
    where: { id },
    data: { isActive }
  });
  await writeAuditLog({ actorId: actor.id, action: "TOGGLE_SERVICE", entity: "Service", entityId: service.id, metadata: { isActive } });

  revalidatePath("/kades/layanan");
  revalidatePath("/layanan");
  return service;
}
