import { prisma } from "@/lib/db";
import type { AuditAction, Prisma } from "@prisma/client";

type SafeMetadata = Record<string, string | number | boolean | null>;

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: SafeMetadata;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
