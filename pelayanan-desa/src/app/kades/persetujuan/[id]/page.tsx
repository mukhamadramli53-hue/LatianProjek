import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getApplicationDetail } from "@/lib/actions/application";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { ApplicationDecisionSection, type ActionItem } from "@/components/application/ApplicationDecisionSection";
import { OfficialLetterSender } from "@/components/kades/OfficialLetterSender";
import { auth } from "@/lib/auth";
import type { FormField } from "@/lib/validations/application";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Eye,
  User,
  UserCheck,
} from "lucide-react";

export const metadata = { title: "Detail Persetujuan - Kepala Desa" };

export default async function KadesPersetujuanDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "KEPALA_DESA") redirect("/403");

  const params = await props.params;
  const application = await getApplicationDetail(params.id);

  if (!application) notFound();

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
    console.error("Failed to parse form schema", e);
  }

  const formData = (application.form_data as Record<string, string>) || {};

  const officialLetter = application.documents.find(
    (d) =>
      d.requirement_name === "Surat Resmi Terbit (PDF)" ||
      d.requirement_name.toLowerCase().includes("surat resmi")
  );

  // Only KEPALA_DESA can approve/reject from MENUNGGU_APPROVAL
  const allowedActions: ActionItem[] = [];
  if (application.status === "MENUNGGU_APPROVAL") {
    allowedActions.push({
      status: "DISETUJUI",
      label: "Setujui Permohonan Surat",
      variant: "default",
    });
    allowedActions.push({
      status: "PERLU_PERBAIKAN",
      label: "Minta Perbaikan ke Warga",
      variant: "secondary",
    });
    allowedActions.push({
      status: "DITOLAK",
      label: "Tolak Pengajuan",
      variant: "destructive",
    });
  }

  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title="Persetujuan & Tanda Tangan Surat"
      subtitle="Tinjau berkas yang telah diverifikasi dan diproses staf desa untuk persetujuan resmi Kepala Desa"
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* ── Top Bar: Tombol Kembali ── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link
            href="/kades/persetujuan"
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
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s ease",
            }}
          >
            <ArrowLeft size={16} color="#2dce89" />
            Kembali ke Daftar Persetujuan
          </Link>

          <span
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "monospace",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {application.nomor_pengajuan}
          </span>
        </div>

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
                    color: "#2dce89",
                    background: "#eafaf3",
                    border: "1px solid #bbf1dc",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                  }}
                >
                  {application.nomor_pengajuan}
                </span>
                <ApplicationStatusBadge status={application.status} size="md" />
              </div>
              <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
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
                Pemohon Surat
              </span>
              <strong style={{ fontSize: 14, color: "#344767" }}>{application.user.name}</strong>
              <span style={{ fontSize: 11.5, color: "#8898aa", fontFamily: "monospace" }}>
                NIK: {application.user.nik || "-"}
              </span>
            </div>
          </div>

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
              <Calendar size={15} color="#2dce89" />
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
              <Clock size={15} color="#2dce89" />
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
              <FileText size={15} color="#2dce89" />
              <span>
                Total Lampiran: <strong>{application.documents.length} Dokumen</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── KARTU 2: Keputusan Persetujuan Resmi Kepala Desa (Atau Status Terkini) ── */}
        <ApplicationDecisionSection
          applicationId={application.id}
          status={application.status}
          history={application.history}
          allowedTransitions={allowedActions}
          role="KEPALA_DESA"
        />

        {/* ── KARTU 2B: Pengiriman Surat Resmi ke Warga (Saat Berstatus DISETUJUI / SELESAI) ── */}
        {(application.status === "DISETUJUI" || application.status === "SELESAI") && (
          <OfficialLetterSender
            applicationId={application.id}
            status={application.status}
            citizenName={application.user.name}
            serviceName={application.service.name}
            existingLetter={officialLetter}
          />
        )}

        {/* ── KARTU 3: Identitas Pemohon & Rincian Formulir ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            padding: "26px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
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
              <User size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                Rincian Formulir & Identitas Warga
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                Seluruh data isian kependudukan pemohon yang terdaftar pada pengajuan layanan ini
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>Nama Lengkap</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#344767" }}>{application.user.name}</span>
            </div>

            <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>Nomor Induk Kependudukan (NIK)</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#344767", fontFamily: "monospace" }}>{application.user.nik || "-"}</span>
            </div>

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
                <span style={{ fontSize: 11, fontWeight: 700, color: "#8898aa", textTransform: "uppercase" }}>
                  {field.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#344767", wordBreak: "break-word" }}>
                  {formData[field.name] || <span style={{ color: "#adb5bd", fontStyle: "italic" }}>Tidak diisi</span>}
                </span>
              </div>
            ))}
          </div>

          {application.notes && (
            <div style={{ marginTop: 18, padding: "14px 18px", background: "#fffdf9", borderRadius: 10, border: "1px solid #ffdcd3" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fb6340", textTransform: "uppercase" }}>Catatan Tambahan Pemohon</span>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#525f7f" }}>{application.notes}</p>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
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
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                Dokumen Persyaratan Terlampir
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                Periksa keabsahan file dokumen persyaratan resmi yang diunggah warga
              </p>
            </div>
          </div>

          {application.documents.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", background: "#f8f9fa", borderRadius: 12, border: "1px dashed #d2d6da" }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#8898aa" }}>Tidak ada file dokumen terlampir.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e9ecef",
                    borderRadius: 12,
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#344767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.requirement_name}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#8898aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.file_name} &bull; {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/api/files/${doc.storage_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      background: "#eafaf3",
                      border: "1px solid #bbf1dc",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#2dce89",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Eye size={13} />
                    Lihat File
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── KARTU 5: Riwayat Status & Kronologi Penanganan ── */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid #f0f2f5", paddingBottom: 14 }}>
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
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                  Riwayat & Kronologi Penanganan Berkas
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, color: "#8898aa" }}>
                  Catatan kronologis verifikasi staf dan kendali mutu supervisor
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
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(310deg, #2dce89 0%, #2dcecc 100%)",
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
                        <span style={{ color: "#2dce89" }}>
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
    </RoleDashboardLayout>
  );
}
