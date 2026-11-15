import { notFound } from "next/navigation";
import { getServiceByCode } from "@/lib/actions/service";
import { isAllowedService } from "@/lib/validations/service";
import { ApplicationForm } from "@/components/warga/ApplicationForm";
import type { FormField } from "@/lib/validations/application";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function generateMetadata(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const service = await getServiceByCode(params.code);
  
  if (!service || !service.isActive || !isAllowedService(service)) {
    return { title: "Layanan Tidak Ditemukan" };
  }

  return {
    title: `Ajukan ${service.name} - Sistem Pelayanan Desa`,
  };
}

export default async function AjukanServicePage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const service = await getServiceByCode(params.code);

  if (!service || !service.isActive || !isAllowedService(service)) {
    notFound();
  }

  const session = await auth();
  const initialData: Record<string, string> = {};

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, nik: true, phone: true, address: true },
    });
    if (user) {
      if (user.name) {
        initialData.nama_pemohon = user.name;
        initialData.nama_lengkap = user.name;
      }
      if (user.nik) {
        initialData.nik = user.nik;
      }
      if (user.phone) {
        initialData.no_telepon = user.phone;
        initialData.no_whatsapp = user.phone;
        initialData.whatsapp = user.phone;
        initialData.no_hp = user.phone;
      }
      if (user.address) {
        initialData.alamat_lengkap = user.address;
      }
    }
  }

  // Parse Requirements (Array or JSON)
  let requirements: string[] = [];
  try {
    if (service.requirements) {
      const rawReq = typeof service.requirements === "string"
        ? JSON.parse(service.requirements)
        : service.requirements;
      if (Array.isArray(rawReq)) {
        requirements = rawReq.map(String);
      }
    }
  } catch (e) {
    console.error("Failed to parse requirements", e);
  }

  // Parse Form Schema (Array, { fields: [...] }, or JSON)
  let formSchema: FormField[] = [];
  try {
    if (service.form_schema) {
      const rawSchema = typeof service.form_schema === "string"
        ? JSON.parse(service.form_schema)
        : service.form_schema;
      if (Array.isArray(rawSchema)) {
        formSchema = rawSchema;
      } else if (rawSchema && typeof rawSchema === "object" && Array.isArray((rawSchema as { fields?: FormField[] }).fields)) {
        formSchema = (rawSchema as { fields: FormField[] }).fields;
      }
    }
  } catch (e) {
    console.error("Failed to parse form schema", e);
  }

  // Cek apakah sudah ada kolom pengisian nomor WhatsApp / telepon pada formulir layanan
  const hasWhatsAppField = formSchema.some((field) => {
    const name = field.name?.toLowerCase() || "";
    const label = field.label?.toLowerCase() || "";
    return (
      name === "no_telepon" ||
      name === "no_whatsapp" ||
      name === "whatsapp" ||
      name === "telepon" ||
      name === "no_hp" ||
      name === "phone" ||
      label.includes("whatsapp") ||
      label.includes("telepon") ||
      label.includes("hp")
    );
  });

  // Sesuai instruksi: Jika belum ada kolom pengisian nomor whatsapp ketika pengajuan, berikan kolom tersebut.
  // Jika sudah ada, jangan dirubah.
  if (!hasWhatsAppField) {
    formSchema.push({
      name: "no_whatsapp",
      label: "Nomor WhatsApp",
      type: "tel",
      required: false,
      placeholder: "Contoh: 083852635694",
      pattern: "^[0-9+ -]{9,16}$",
      maxLength: 16,
    });
  }

  const normalizedService = {
    id: service.id,
    code: service.code,
    name: service.name,
    requirements,
    form_schema: formSchema,
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 100 }}>
      {/* ── Top Bar: Kembali ke Pilihan Layanan ── */}
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/warga/ajukan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 12,
            background: "#ffffff",
            color: "#344767",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            transition: "all 0.2s ease",
          }}
        >
          <ArrowLeft size={16} color="#5e72e4" />
          Kembali ke Pilihan Layanan
        </Link>
      </div>

      {/* ── Header Card ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "32px 36px",
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent top gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#eff2fe",
                color: "#5e72e4",
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: "1px solid #cfd7fc",
              }}
            >
              <ShieldCheck size={14} />
              Layanan Administrasi Resmi
            </span>

            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11.5,
                fontWeight: 800,
                color: "#64748b",
                background: "#f1f5f9",
                padding: "5px 10px",
                borderRadius: 6,
              }}
            >
              KODE: {service.code}
            </span>
          </div>

          {service.estimatedTime && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                fontWeight: 700,
                color: "#2dce89",
                background: "#eafaf3",
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid #bbf1dc",
              }}
            >
              <Clock size={14} />
              Estimasi: {service.estimatedTime}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#1e293b",
            lineHeight: 1.3,
          }}
        >
          {service.name}
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            color: "#64748b",
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          {service.description ||
            "Lengkapi isian formulir dan unggah berkas persyaratan yang diminta untuk memproses permohonan surat resmi ini secara online."}
        </p>
      </div>

      {/* Main Form Component */}
      <ApplicationForm service={normalizedService} initialData={initialData} />
    </div>
  );
}
