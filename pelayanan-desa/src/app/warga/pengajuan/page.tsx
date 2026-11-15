import Link from "next/link";
import { getMyApplications } from "@/lib/actions/application";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { DeleteApplicationButton } from "@/components/application/DeleteApplicationButton";
import { Clock, FileText, ArrowRight, Search, FileX, PlusCircle, FileDown } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";

export const metadata = {
  title: "Riwayat Pengajuan - Sistem Pelayanan Desa",
};

const statuses: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "DIAJUKAN", label: "Diajukan" },
  { value: "DIVERIFIKASI", label: "Sedang Diverifikasi" },
  { value: "DIPROSES", label: "Sedang Diproses" },
  { value: "PERLU_PERBAIKAN", label: "Perlu Perbaikan" },
  { value: "MENUNGGU_APPROVAL", label: "Menunggu Persetujuan Kepala Desa" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" },
  { value: "SELESAI", label: "Selesai" },
  { value: "REVIEW_SUPERVISOR", label: "Review Supervisor (Arsip)" },
];

const statusColor: Record<string, string> = {
  DIAJUKAN: "#17c1e8",
  DIVERIFIKASI: "#5e72e4",
  DIPROSES: "#5e72e4",
  REVIEW_SUPERVISOR: "#825ee4",
  MENUNGGU_APPROVAL: "#f5365c",
  DISETUJUI: "#2dce89",
  SELESAI: "#2dce89",
  PERLU_PERBAIKAN: "#fb6340",
  DITOLAK: "#f5365c",
};

export default async function WargaPengajuanPage(props: {
  searchParams?: Promise<{ search?: string; status?: string; sort?: string }>;
}) {
  const params = await props.searchParams;
  const status = statuses.some((item) => item.value === params?.status)
    ? (params?.status as ApplicationStatus)
    : undefined;
  const applications = await getMyApplications({
    search: params?.search?.trim() || undefined,
    status,
    sort: params?.sort === "asc" ? "asc" : "desc",
  });

  return (
    <div>
      {/* Filter Bar */}
      <div style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
        padding: "20px 24px",
        marginBottom: 24,
      }}>
        <form style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={16} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#7b809a",
            }} />
            <input
              type="text"
              name="search"
              placeholder="Cari nomor pengajuan..."
              defaultValue={params?.search}
              style={{
                width: "100%", paddingLeft: 38, paddingRight: 14,
                paddingTop: 10, paddingBottom: 10,
                border: "1px solid #d2d6da", borderRadius: 8,
                fontSize: 13, color: "#344767", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* Status */}
          <select
            name="status"
            defaultValue={params?.status || ""}
            style={{
              flex: "1 1 160px",
              border: "1px solid #d2d6da", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: "#344767",
              background: "#fff", outline: "none", fontFamily: "inherit",
            }}
          >
            <option value="">Semua Status</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            name="sort"
            defaultValue={params?.sort === "asc" ? "asc" : "desc"}
            style={{
              flex: "1 1 120px",
              border: "1px solid #d2d6da", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: "#344767",
              background: "#fff", outline: "none", fontFamily: "inherit",
            }}
          >
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>

          {/* Submit */}
          <button
            type="submit"
            style={{
              padding: "10px 22px",
              background: "linear-gradient(195deg, #5e72e4, #825ee4)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(94,114,228,0.4)",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            Terapkan
          </button>

          {/* Ajukan Baru */}
          <Link
            href="/warga/ajukan"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 18px",
              background: "linear-gradient(195deg, #2dce89, #2dcecc)",
              color: "#fff", borderRadius: 8,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 6px -1px rgba(45,206,137,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            <PlusCircle size={15} />
            Ajukan Baru
          </Link>
        </form>
      </div>

      {/* Applications */}
      {applications.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
          padding: "64px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#f8f9fa", border: "2px solid #e9ecef",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <FileX size={32} color="#7b809a" />
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#344767" }}>
            Belum ada pengajuan
          </h3>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#7b809a", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Anda belum pernah mengajukan layanan apapun. Silakan buat pengajuan pertama Anda.
          </p>
          <Link
            href="/warga/ajukan"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#5e72e4", fontWeight: 700, fontSize: 14,
              textDecoration: "none",
            }}
          >
            Jelajahi Layanan Desa →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {applications.map((app) => {
            const accentColor = statusColor[app.status] || "#5e72e4";
            const isCompleted = app.status === "DISETUJUI" || app.status === "SELESAI" || app.status === "DITOLAK";
            const officialLetter = (app.documents as Array<{ requirement_name: string; storage_key: string; file_name: string }> | undefined)?.find(
              (d) =>
                d.requirement_name === "Surat Resmi Terbit (PDF)" ||
                d.requirement_name.toLowerCase().includes("surat resmi")
            );

            return (
              <div
                key={app.id}
                className="warga-application-card"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  borderTop: `3px solid ${accentColor}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Card Header & Body */}
                <Link
                  href={`/warga/pengajuan/${app.id}`}
                  style={{ textDecoration: "none", padding: "18px 20px 14px", display: "block" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#7b809a",
                      background: "#f8f9fa", border: "1px solid #e9ecef",
                      padding: "3px 8px", borderRadius: 6, letterSpacing: "0.03em",
                      fontFamily: "monospace",
                    }}>
                      {app.nomor_pengajuan}
                    </span>
                    <ApplicationStatusBadge status={app.status} size="sm" />
                  </div>
                  <h3 style={{
                    margin: 0, fontSize: 15, fontWeight: 700,
                    color: "#344767", lineHeight: 1.4,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {app.service.name}
                  </h3>
                </Link>

                {/* Card Footer */}
                <div style={{
                  borderTop: "1px solid #f0f2f5",
                  padding: "12px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7b809a", fontSize: 12 }}>
                      <Clock size={12} />
                      {new Date(app.submitted_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7b809a", fontSize: 12 }}>
                      <FileText size={12} />
                      {app.documents.length} Dokumen
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Ikon Unduh PDF Surat jika sudah disetujui & di-upload Kepala Desa */}
                    {officialLetter && (
                      <a
                        href={`/api/files/${officialLetter.storage_key}?download=1`}
                        download={officialLetter.file_name}
                        title="Unduh PDF Surat Resmi"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#eafaf3",
                          border: "1px solid #bbf1dc",
                          color: "#2dce89",
                          fontWeight: 700,
                          fontSize: 11.5,
                          textDecoration: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <FileDown size={13} strokeWidth={2.5} />
                        Unduh PDF
                      </a>
                    )}

                    <Link
                      href={`/warga/pengajuan/${app.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: accentColor,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Detail <ArrowRight size={13} />
                    </Link>

                    {/* Tombol Hapus Arsip Pengajuan yang Selesai */}
                    {isCompleted && (
                      <DeleteApplicationButton
                        applicationId={app.id}
                        nomorPengajuan={app.nomor_pengajuan}
                        serviceName={app.service.name}
                        status={app.status}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .warga-application-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px 0 rgba(0,0,0,0.12) !important;
        }
      `}</style>
    </div>
  );
}
