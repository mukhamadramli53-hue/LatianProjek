import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplicationDetail } from "@/lib/actions/application";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { ApplicationRepairForm } from "@/components/warga/ApplicationRepairForm";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  FileDown,
  Check,
  Eye,
  Sparkles,
  Info,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { FormField } from "@/lib/validations/application";
import type { ApplicationStatus } from "@prisma/client";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const application = await getApplicationDetail(params.id).catch(() => null);
  return {
    title: application
      ? `${application.nomor_pengajuan} - ${application.service.name}`
      : "Detail Pengajuan - Sistem Pelayanan Desa",
  };
}

interface WorkflowStep {
  key: string;
  number: number;
  label: string;
  actor: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: "DIAJUKAN",
    number: 1,
    label: "Diajukan",
    actor: "Warga Desa",
    description: "Warga berhasil mengirim pengajuan",
  },
  {
    key: "DIVERIFIKASI",
    number: 2,
    label: "Sedang Diverifikasi",
    actor: "Staf Desa",
    description: "Staf Desa memeriksa kelengkapan",
  },
  {
    key: "DIPROSES",
    number: 3,
    label: "Sedang Diproses",
    actor: "Staf Desa",
    description: "Penyiapan berkas surat resmi",
  },
  {
    key: "MENUNGGU_APPROVAL",
    number: 4,
    label: "Menunggu Persetujuan Kades",
    actor: "Kepala Desa",
    description: "Persetujuan resmi Kepala Desa",
  },
  {
    key: "SELESAI",
    number: 5,
    label: "Selesai",
    actor: "Pemerintah Desa",
    description: "Layanan selesai & surat terbit",
  },
];

function getStatusDetails(status: ApplicationStatus, notes?: string | null) {
  switch (status) {
    case "DIAJUKAN":
      return {
        badgeText: "Tahap 1 dari 5 • Diajukan",
        badgeBg: "#e8f9fd",
        badgeColor: "#17c1e8",
        borderTone: "#17c1e8",
        bgTone: "#f5fdff",
        title: "Pengajuan Berhasil Dikirim",
        description:
          "Warga berhasil mengirim pengajuan. Berkas kini berada dalam antrean pemeriksaan dokumen oleh Staf Desa.",
        actorName: "Staf Desa (Bapak Agus Wijaya)",
        nextStep: "Pemeriksaan kelengkapan data & dokumen fisik oleh Staf Desa.",
        activeStepNumber: 1,
      };
    case "DIVERIFIKASI":
      return {
        badgeText: "Tahap 2 dari 5 • Sedang Diverifikasi",
        badgeBg: "#eff2fe",
        badgeColor: "#5e72e4",
        borderTone: "#5e72e4",
        bgTone: "#f8f9fe",
        title: "Sedang Diverifikasi oleh Staf Desa",
        description:
          "Staf Desa sedang memeriksa kelengkapan data dan keabsahan dokumen persyaratan yang Anda lampirkan.",
        actorName: "Staf Desa (Bapak Agus Wijaya)",
        nextStep: "Verifikasi dokumen selesai dan berkas disiapkan untuk persetujuan Kepala Desa.",
        activeStepNumber: 2,
      };
    case "DIPROSES":
      return {
        badgeText: "Tahap 3 dari 5 • Sedang Diproses",
        badgeBg: "#fff8ec",
        badgeColor: "#fb6340",
        borderTone: "#fb6340",
        bgTone: "#fffdf9",
        title: "Sedang Dalam Proses Penyiapan Surat",
        description:
          "Berkas telah memenuhi syarat. Saat ini Staf Desa sedang menyusun naskah surat resmi dan memvalidasi nomor registrasi agenda desa.",
        actorName: "Staf Administrasi Desa (Bapak Agus Wijaya)",
        nextStep: "Penerusan langsung ke Kepala Desa untuk persetujuan resmi.",
        activeStepNumber: 3,
      };
    case "REVIEW_SUPERVISOR":
      return {
        badgeText: "Tahap Pemrosesan • Ditelaah",
        badgeBg: "#f4f1fd",
        badgeColor: "#825ee4",
        borderTone: "#825ee4",
        bgTone: "#faf9fe",
        title: "Sedang Dalam Penelaahan Berkas",
        description:
          "Draf surat resmi sedang ditelaah sebelum diajukan ke Kepala Desa untuk persetujuan resmi.",
        actorName: "Petugas Pelayanan Desa",
        nextStep: "Penerusan ke Kepala Desa untuk persetujuan resmi.",
        activeStepNumber: 3,
      };
    case "MENUNGGU_APPROVAL":
      return {
        badgeText: "Tahap 4 dari 5 • Menunggu Persetujuan Kepala Desa",
        badgeBg: "#feecee",
        badgeColor: "#f5365c",
        borderTone: "#f5365c",
        bgTone: "#fffbfc",
        title: "Menunggu Persetujuan Kepala Desa",
        description:
          "Pengajuan telah diverifikasi oleh Staf Desa. Saat ini pengajuan berada di meja Kepala Desa (Bapak Budi Santoso) untuk persetujuan resmi dan tanda tangan.",
        actorName: "Kepala Desa (Bapak Budi Santoso)",
        nextStep: "Pemeriksaan dan keputusan persetujuan resmi oleh Kepala Desa.",
        activeStepNumber: 4,
      };
    case "DISETUJUI":
      return {
        badgeText: "Tahap 5 dari 5 • Disetujui Kepala Desa",
        badgeBg: "#eafaf3",
        badgeColor: "#2dce89",
        borderTone: "#2dce89",
        bgTone: "#f7fdfa",
        title: "Pengajuan Disetujui Kepala Desa",
        description:
          "Kepala Desa menyetujui pengajuan Anda. Surat resmi sedang dalam tahap finalisasi penomoran dan siap diserahkan.",
        actorName: "Kepala Desa (Bapak Budi Santoso)",
        nextStep: "Layanan selesai dan surat resmi diterbitkan.",
        activeStepNumber: 5,
      };
    case "SELESAI":
      return {
        badgeText: "Selesai • Layanan Tuntas",
        badgeBg: "#eafaf3",
        badgeColor: "#2dce89",
        borderTone: "#2dce89",
        bgTone: "#f7fdfa",
        title: "Layanan Telah Diselesaikan",
        description:
          "Layanan telah diselesaikan. Surat resmi Anda telah diterbitkan secara sah oleh Pemerintah Desa. Silakan unduh dokumen atau ambil fisik surat di Balai Desa.",
        actorName: "Pemerintah Desa",
        nextStep: "Layanan selesai. Dokumen resmi dapat diunduh atau diambil di Balai Desa.",
        activeStepNumber: 5,
      };
    case "PERLU_PERBAIKAN":
      return {
        badgeText: "⚠️ Perlu Perbaikan",
        badgeBg: "#fff3f0",
        badgeColor: "#fb6340",
        borderTone: "#fb6340",
        bgTone: "#fffbfc",
        title: "Pengajuan Memerlukan Perbaikan",
        description:
          notes ||
          "Pengajuan dikembalikan kepada warga untuk dilengkapi. Silakan baca catatan perbaikan petugas dan unggah dokumen revisi pada formulir di bawah ini.",
        actorName: "Petugas Pelayanan Desa",
        nextStep: "Unggah dokumen perbaikan pada formulir di bawah agar pengajuan dapat diverifikasi kembali.",
        activeStepNumber: 2,
      };
    case "DITOLAK":
      return {
        badgeText: "Pengajuan Ditolak",
        badgeBg: "#feecee",
        badgeColor: "#f5365c",
        borderTone: "#f5365c",
        bgTone: "#fffbfc",
        title: "Pengajuan Ditolak oleh Kepala Desa",
        description:
          notes ||
          "Kepala Desa menolak pengajuan dengan alasan yang sesuai. Silakan hubungi kantor Balai Desa jika membutuhkan informasi lebih lanjut.",
        actorName: "Kepala Desa (Bapak Budi Santoso)",
        nextStep: "Konsultasikan dengan petugas desa di Balai Desa.",
        activeStepNumber: 0,
      };
  }
}

export default async function ApplicationDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  let application;
  try {
    application = await getApplicationDetail(params.id);
  } catch {
    notFound();
  }

  if (!application) {
    notFound();
  }

  // Parse Form Schema dari layanan
  let formSchema: FormField[] = [];
  try {
    if (application.service.form_schema) {
      const rawSchema =
        typeof application.service.form_schema === "string"
          ? JSON.parse(application.service.form_schema)
          : application.service.form_schema;
      if (Array.isArray(rawSchema)) {
        formSchema = rawSchema;
      } else if (
        rawSchema &&
        typeof rawSchema === "object" &&
        Array.isArray((rawSchema as { fields?: FormField[] }).fields)
      ) {
        formSchema = (rawSchema as { fields: FormField[] }).fields;
      }
    }
  } catch (e) {
    console.error("Failed to parse form_schema", e);
  }

  // Parse Requirements dari layanan
  let requirements: string[] = [];
  try {
    if (application.service.requirements) {
      const rawReq =
        typeof application.service.requirements === "string"
          ? JSON.parse(application.service.requirements)
          : application.service.requirements;
      if (Array.isArray(rawReq)) {
        requirements = rawReq.map(String);
      }
    }
  } catch (e) {
    console.error("Failed to parse requirements", e);
  }

  // Catatan perbaikan dari petugas jika PERLU_PERBAIKAN
  const repairHistory = application.history.filter((h) => h.newStatus === "PERLU_PERBAIKAN");
  const latestStaffNote = repairHistory[repairHistory.length - 1]?.note || application.notes || null;

  // Form Data isian warga
  const formData = (application.form_data as Record<string, string>) || {};

  // Deteksi dokumen Surat Resmi yang diunggah Kepala Desa
  const officialLetter = application.documents.find(
    (d) =>
      d.requirement_name === "Surat Resmi Terbit (PDF)" ||
      d.requirement_name.toLowerCase().includes("surat resmi")
  );

  // Info status & penjelasan terperinci
  const statusInfo = getStatusDetails(application.status, latestStaffNote);

  // Penentuan progres langkah alur (1-6)
  const isRejected = application.status === "DITOLAK";
  const isNeedsRepair = application.status === "PERLU_PERBAIKAN";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1040, margin: "0 auto" }}>
      {/* ── Top Bar: Tombol Kembali & Breadcrumb dengan kontras tinggi di atas banner ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link
          href="/warga/pengajuan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#ffffff",
            color: "#344767",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            transition: "all 0.2s ease",
          }}
        >
          <ArrowLeft size={16} color="#5e72e4" />
          Kembali ke Riwayat Pengajuan
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "monospace",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {application.nomor_pengajuan}
          </span>
        </div>
      </div>

      {/* ── BANNER SPESIAL: Surat Resmi Telah Disetujui & Diunggah Kepala Desa (Siap Diunduh) ── */}
      {officialLetter && (
        <div
          style={{
            background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
            borderRadius: 16,
            padding: "24px 28px",
            color: "#ffffff",
            boxShadow: "0 14px 28px rgba(17, 153, 142, 0.28)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient light bubble */}
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                flexShrink: 0,
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
              }}
            >
              <FileDown size={28} strokeWidth={2.3} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.25)",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Sparkles size={12} />
                  Dokumen Resmi Siap Diunduh
                </span>
                <span style={{ fontSize: 11.5, opacity: 0.9 }}>
                  {(officialLetter.file_size / 1024).toFixed(1)} KB
                </span>
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Surat Resmi Telah Diterbitkan & Siap Diunduh!
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255, 255, 255, 0.92)", maxWidth: 580, lineHeight: 1.45 }}>
                Kepala Desa telah menyetujui permohonan Anda dan mengunggah dokumen surat resmi bertanda tangan. Silakan klik tombol di samping untuk mengunduh dokumen PDF resmi.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, position: "relative", zIndex: 1 }}>
            <a
              href={`/api/files/${officialLetter.storage_key}?download=1`}
              download={officialLetter.file_name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                background: "#ffffff",
                color: "#0f766e",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13.5,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                transition: "all 0.2s ease",
              }}
            >
              <FileDown size={18} strokeWidth={2.5} />
              Unduh PDF Surat
            </a>

            <a
              href={`/api/files/${officialLetter.storage_key}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 18px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                color: "#ffffff",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                border: "1px solid rgba(255, 255, 255, 0.4)",
              }}
            >
              <Eye size={15} />
              Lihat Dokumen
            </a>
          </div>
        </div>
      )}

      {/* Alert Sukses Pengajuan Baru */}
      {searchParams.success === "true" && (
        <div
          style={{
            background: "#ffffff",
            borderLeft: "5px solid #2dce89",
            borderRadius: 14,
            padding: "18px 22px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <CheckCircle2 size={24} color="#2dce89" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#2dce89" }}>
              Pengajuan Berhasil Dikirimkan!
            </h4>
            <p style={{ margin: 0, fontSize: 13.5, color: "#525f7f", lineHeight: 1.5 }}>
              Permohonan Anda tercatat dengan nomor <strong>{application.nomor_pengajuan}</strong>. Berkas telah masuk
              ke antrean pelayanan Staf Desa untuk diverifikasi. Anda dapat memantau setiap perkembangan status secara
              berkala di halaman ini.
            </p>
          </div>
        </div>
      )}

      {/* ── KARTU 1: Header Utama Pengajuan ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#5e72e4",
                  background: "#eff2fe",
                  border: "1px solid #dce4fd",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {application.nomor_pengajuan}
              </span>
              <ApplicationStatusBadge status={application.status} size="md" />
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#1e293b", lineHeight: 1.3 }}>
              {application.service.name}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "#67748e", maxWidth: 640 }}>
              {application.service.description || "Layanan administrasi kependudukan resmi Pemerintah Desa."}
            </p>
          </div>

          <div
            style={{
              padding: "12px 18px",
              background: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 180,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>
              Estimasi Layanan
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#344767", display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color="#5e72e4" />
              {application.service.estimatedTime || "1 - 3 Hari Kerja"}
            </span>
          </div>
        </div>

        {/* Info Meta Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            paddingTop: 16,
            borderTop: "1px solid #f0f2f5",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#525f7f", fontSize: 13 }}>
            <Calendar size={15} color="#5e72e4" />
            <span>
              Diajukan:{" "}
              <strong>
                {new Date(application.submitted_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#525f7f", fontSize: 13 }}>
            <Clock size={15} color="#5e72e4" />
            <span>
              Waktu:{" "}
              <strong>
                {new Date(application.submitted_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#525f7f", fontSize: 13 }}>
            <FileText size={15} color="#5e72e4" />
            <span>
              Total Lampiran: <strong>{application.documents.length} Dokumen</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── KARTU 2: Penjelasan Status & Stepper Alur Transparan ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Info size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
              Status & Alur Pelayanan
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
              Pantau posisi terkini berkas pengajuan Anda pada tahapan resmi desa
            </p>
          </div>
        </div>

        {/* Banner Penjelasan Status Terkini */}
        <div
          style={{
            background: statusInfo.bgTone,
            borderLeft: `5px solid ${statusInfo.borderTone}`,
            border: `1px solid ${statusInfo.badgeBg}`,
            borderRadius: 14,
            padding: "20px 24px",
            marginBottom: 26,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: statusInfo.badgeColor,
                background: statusInfo.badgeBg,
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              {statusInfo.badgeText}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8898aa" }}>
              Petugas: <strong>{statusInfo.actorName}</strong>
            </span>
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
            {statusInfo.title}
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#525f7f", lineHeight: 1.6 }}>
            {statusInfo.description}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: 8,
              fontSize: 13,
              color: "#344767",
              border: "1px dashed rgba(0, 0, 0, 0.1)",
            }}
          >
            <ShieldCheck size={16} color={statusInfo.borderTone} style={{ flexShrink: 0 }} />
            <span>
              <strong>Langkah Selanjutnya:</strong> {statusInfo.nextStep}
            </span>
          </div>
        </div>

        {/* Visual Stepper 6 Langkah */}
        <div>
          <h4 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#8898aa", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Progres Tahapan Pelayanan Desa
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              position: "relative",
            }}
          >
            {WORKFLOW_STEPS.map((step) => {
              const currentActiveStep = statusInfo.activeStepNumber;
              const isPast = step.number < currentActiveStep;
              const isCurrent = step.number === currentActiveStep && !isRejected;
              const isWarning = isNeedsRepair && step.number === 2;

              let circleBg = "#e9ecef";
              let circleColor = "#8898aa";
              let cardBg = "#ffffff";
              let borderColor = "#e9ecef";
              let statusLabel = "Menunggu";
              let statusColor = "#8898aa";

              if (isPast) {
                circleBg = "#2dce89";
                circleColor = "#ffffff";
                cardBg = "#f7fdfa";
                borderColor = "#bbf1dc";
                statusLabel = "Selesai ✓";
                statusColor = "#2dce89";
              } else if (isWarning) {
                circleBg = "#fb6340";
                circleColor = "#ffffff";
                cardBg = "#fff8f6";
                borderColor = "#fec5b8";
                statusLabel = "Perlu Revisi ⚠️";
                statusColor = "#fb6340";
              } else if (isCurrent) {
                circleBg = "#5e72e4";
                circleColor = "#ffffff";
                cardBg = "#f8f9fe";
                borderColor = "#cfd7fc";
                statusLabel = "Sedang Berjalan ⚙️";
                statusColor = "#5e72e4";
              }

              return (
                <div
                  key={step.key}
                  style={{
                    background: cardBg,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: 12,
                    padding: "16px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 8,
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: circleBg,
                      color: circleColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      boxShadow: isCurrent ? "0 4px 10px rgba(94, 114, 228, 0.35)" : "none",
                    }}
                  >
                    {isPast ? <Check size={16} strokeWidth={3} /> : step.number}
                  </div>

                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      {step.label}
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#8898aa" }}>
                      {step.actor}
                    </span>
                  </div>

                  <span
                    style={{
                      marginTop: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      color: statusColor,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: isCurrent ? "#eff2fe" : isPast ? "#eafaf3" : "transparent",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── KARTU KHUSUS: Form Perbaikan Jika Status PERLU_PERBAIKAN ── */}
      {application.status === "PERLU_PERBAIKAN" && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "2px solid #fb6340",
            padding: "26px 28px",
          }}
        >
          <ApplicationRepairForm
            applicationId={application.id}
            nomorPengajuan={application.nomor_pengajuan}
            serviceName={application.service.name}
            requirements={requirements}
            formSchema={formSchema}
            initialFormData={formData}
            initialDocuments={application.documents}
            staffNote={latestStaffNote}
          />
        </div>
      )}

      {/* ── KARTU 3: Data Formulir Pemohon ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(310deg, #11cdef 0%, #1171ef 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <FileText size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
              Data Formulir Permohonan
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
              Rincian isian data kependudukan yang Anda cantumkan pada saat mengajukan layanan
            </p>
          </div>
        </div>

        {formSchema.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
            Layanan ini tidak memerlukan data isian formulir tambahan.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {formSchema.map((field) => (
              <div
                key={field.name}
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8898aa",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {field.label}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#344767",
                    wordBreak: "break-word",
                  }}
                >
                  {formData[field.name] || (
                    <span style={{ color: "#adb5bd", fontStyle: "italic", fontWeight: 400 }}>
                      Tidak diisi
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── KARTU 4: Dokumen Persyaratan Terlampir ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <FileDown size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
              Dokumen Persyaratan Terlampir
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
              Daftar file berkas identitas dan persyaratan resmi yang telah Anda unggah
            </p>
          </div>
        </div>

        {application.documents.length === 0 ? (
          <div
            style={{
              background: "#f8f9fa",
              borderRadius: 12,
              padding: "24px",
              textAlign: "center",
              border: "1px dashed #d2d6da",
            }}
          >
            <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa" }}>
              Tidak ada file dokumen terlampir pada pengajuan ini.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 14,
            }}
          >
            {application.documents.map((doc) => {
              const isOfficial =
                doc.requirement_name === "Surat Resmi Terbit (PDF)" ||
                doc.requirement_name.toLowerCase().includes("surat resmi");

              return (
                <div
                  key={doc.id}
                  style={{
                    background: isOfficial ? "#f7fdfa" : "#ffffff",
                    border: isOfficial ? "1.5px solid #bbf1dc" : "1px solid #e9ecef",
                    borderRadius: 12,
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    boxShadow: isOfficial
                      ? "0 4px 12px rgba(45, 206, 137, 0.12)"
                      : "0 2px 6px rgba(0, 0, 0, 0.04)",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isOfficial
                          ? "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)"
                          : "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {isOfficial ? <FileDown size={22} /> : <FileText size={20} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: isOfficial ? "#0f766e" : "#344767",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.requirement_name}
                        </p>
                        {isOfficial && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#2dce89",
                              background: "#eafaf3",
                              padding: "2px 6px",
                              borderRadius: 4,
                              border: "1px solid #bbf1dc",
                            }}
                          >
                            Surat Resmi
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 11.5,
                          color: "#8898aa",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.file_name} &bull; {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isOfficial && (
                      <a
                        href={`/api/files/${doc.storage_key}?download=1`}
                        download={doc.file_name}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "8px 14px",
                          background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#ffffff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 6px rgba(45, 206, 137, 0.3)",
                        }}
                      >
                        <FileDown size={13} strokeWidth={2.5} />
                        Unduh PDF
                      </a>
                    )}

                    <a
                      href={`/api/files/${doc.storage_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        background: isOfficial ? "#ffffff" : "#f8f9fe",
                        border: isOfficial ? "1px solid #bbf1dc" : "1px solid #dce4fd",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: isOfficial ? "#2dce89" : "#5e72e4",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Eye size={13} />
                      Lihat File
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── KARTU 5: Riwayat Penanganan Berkas (Audit Trail) ── */}
      {application.history.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            padding: "26px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(310deg, #825ee4 0%, #5e72e4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
                Riwayat & Kronologi Penanganan
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                Catatan resmi setiap pembaruan status oleh pejabat desa berwenang
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {application.history.map((h, idx) => (
              <div
                key={h.id || idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 18px",
                  background: "#f8f9fa",
                  borderRadius: 12,
                  border: "1px solid #e9ecef",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#344767" }}>
                      Perubahan Status:{" "}
                      <span style={{ color: "#5e72e4" }}>
                        {h.oldStatus ? `${h.oldStatus} → ` : ""}
                        {h.newStatus}
                      </span>
                    </span>
                    <span style={{ fontSize: 11.5, color: "#8898aa" }}>
                      {new Date(h.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#67748e", display: "flex", alignItems: "center", gap: 6 }}>
                    <UserCheck size={13} color="#8898aa" />
                    <span>
                      Diproses oleh: <strong>{h.actor?.name || "Petugas Desa"}</strong> ({h.actor?.role || "Staf"})
                    </span>
                  </p>

                  {h.note && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 14px",
                        background: "#ffffff",
                        borderRadius: 8,
                        border: "1px solid #e9ecef",
                        fontSize: 13,
                        color: "#495057",
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{h.note}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
