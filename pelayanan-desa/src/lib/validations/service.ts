import { z } from "zod";

export const ALLOWED_SERVICE_CODES = ["SKTM", "SP-SKCK", "SKCK"] as const;

export function isAllowedServiceCode(code?: string | null): boolean {
  if (!code) return false;
  const normalized = code.trim().toUpperCase();
  return ALLOWED_SERVICE_CODES.includes(normalized as typeof ALLOWED_SERVICE_CODES[number]);
}

export function isAllowedService(service?: { code: string; name?: string | null } | null): boolean {
  if (!service) return false;
  if (isAllowedServiceCode(service.code)) return true;
  const nameLower = (service.name || "").toLowerCase();
  if (nameLower.includes("tidak mampu") || nameLower.includes("sktm")) return true;
  if (nameLower.includes("skck")) return true;
  return false;
}

export const createServiceSchema = z.object({
  code: z.string().min(1, "Kode layanan wajib diisi").max(20, "Kode layanan maksimal 20 karakter"),
  name: z.string().min(1, "Nama layanan wajib diisi").max(100, "Nama layanan maksimal 100 karakter"),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  form_schema: z.any().optional(),
  estimatedTime: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  id: z.string().cuid("ID tidak valid"),
  code: z.string().min(1, "Kode layanan wajib diisi").max(20, "Kode layanan maksimal 20 karakter"),
  name: z.string().min(1, "Nama layanan wajib diisi").max(100, "Nama layanan maksimal 100 karakter"),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  form_schema: z.any().optional(),
  estimatedTime: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

