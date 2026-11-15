/**
 * Validation Schemas - Pengajuan Layanan
 *
 * Semua validasi form pengajuan dan upload dokumen.
 * Backend selalu re-validasi, tidak bergantung pada frontend saja.
 */

import { z } from "zod";

// ============================================================
// CONSTANTS
// ============================================================

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE_LABEL = "5MB";

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

// ============================================================
// APPLICATION SUBMISSION SCHEMA
// ============================================================

export const submitApplicationSchema = z.object({
  serviceId: z.string().cuid("Service ID tidak valid"),
  form_data: z.record(z.string(), z.unknown()),
  notes: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
  documentKeys: z
    .array(
      z.object({
        requirement_name: z.string().min(1),
        storage_key: z.string().uuid("Storage key tidak valid"),
      })
    )
    .optional()
    .default([]),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const repairApplicationSchema = z.object({
  form_data: z.record(z.string(), z.unknown()),
  notes: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
  documentKeys: z
    .array(
      z.object({
        requirement_name: z.string().min(1),
        storage_key: z.string().uuid("Storage key tidak valid"),
      })
    )
    .optional()
    .default([]),
});

export type RepairApplicationInput = z.infer<typeof repairApplicationSchema>;

// ============================================================
// FORM DATA FIELD SCHEMA (Dynamic form definition)
// ============================================================

export const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "select", "date", "number", "tel"]),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(), // Untuk type 'select'
  pattern: z.string().optional(),         // Regex validation
  maxLength: z.number().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
});

export const formSchemaDefinition = z.object({
  fields: z.array(formFieldSchema),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchemaDefinition = z.infer<typeof formSchemaDefinition>;

// ============================================================
// HELPER: Validate form_data against a service's form_schema
// ============================================================

export function validateFormDataAgainstSchema(
  formData: Record<string, unknown>,
  schema: FormSchemaDefinition
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const value = formData[field.name];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");

    if (field.required && isEmpty) {
      errors[field.name] = `${field.label} wajib diisi`;
      continue;
    }

    if (!isEmpty && typeof value === "string") {
      if (field.maxLength && value.length > field.maxLength) {
        errors[field.name] = `${field.label} maksimal ${field.maxLength} karakter`;
      }

      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors[field.name] = `Format ${field.label} tidak valid`;
        }
      }

      if (field.type === "select" && field.options && !field.options.includes(value)) {
        errors[field.name] = `Pilihan ${field.label} tidak valid`;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
