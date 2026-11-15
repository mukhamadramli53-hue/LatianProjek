"use client";

import type { ApplicationStatus } from "@prisma/client";
import { DashboardCard, StatCard } from "@/components/dashboard/DashboardComponents";
import { ApplicationStatusBadge } from "@/components/application/ApplicationStatusBadge";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflow";
import { FileText, CheckCircle, Clock, XCircle, ShieldCheck, FileCheck, Layers } from "lucide-react";

type Report = {
  total: number;
  totalSktm: number;
  totalSkck: number;
  menungguVerifikasi: number;
  menungguReview: number;
  menungguPersetujuan: number;
  disetujui: number;
  ditolak: number;
  completed: number;
  needsRepair: number;
  averageCompletionDays: number | null;
  byStatus: Array<{ status: ApplicationStatus; count: number }>;
  byService: Array<{ name: string; count: number }>;
  rows: Array<{ nomor_pengajuan: string; status: ApplicationStatus; submitted_at: Date; service: { name: string } }>;
};

function ReportSectionHeader({
  icon: Icon,
  iconGradient,
  iconShadow,
  title,
  subtitle,
  badgeText,
  badgeColor,
  badgeBg,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  iconGradient: string;
  iconShadow: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: string;
  badgeBg: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
        padding: "16px 22px",
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: iconGradient,
            boxShadow: `0 4px 14px ${iconShadow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#67748e", fontWeight: 500 }}>
            {subtitle}
          </p>
        </div>
      </div>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: badgeColor,
          background: badgeBg,
          padding: "6px 14px",
          borderRadius: 8,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          border: `1px solid ${badgeColor}33`,
        }}
      >
        {badgeText}
      </span>
    </div>
  );
}

export function ReportView({
  report,
  services,
  values,
}: {
  report: Report;
  services: Array<{ id: string; name: string }>;
  values: Record<string, string>;
}) {
  const maxStatus = Math.max(...report.byStatus.map((item) => item.count), 1);
  const maxService = Math.max(...report.byService.map((item) => item.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* ── Filter Card ── */}
      <DashboardCard
        title="Filter & Parameter Laporan"
        subtitle="Sesuaikan rentang tanggal, jenis layanan, dan status berkas pengajuan"
      >
        <form style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>Periode</label>
            <select name="period" defaultValue={values.period || ""} className="form-input">
              <option value="">Rentang tanggal</option>
              <option value="day">Hari ini</option>
              <option value="week">7 hari terakhir</option>
              <option value="month">Bulan ini</option>
            </select>
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>Dari</label>
            <input type="date" name="from" defaultValue={values.from} className="form-input" />
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>Sampai</label>
            <input type="date" name="to" defaultValue={values.to} className="form-input" />
          </div>
          <div style={{ flex: "2 1 200px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>Layanan</label>
            <select name="serviceId" defaultValue={values.serviceId || ""} className="form-input">
              <option value="">Semua layanan</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>Status</label>
            <select name="status" defaultValue={values.status || ""} className="form-input">
              <option value="">Semua status</option>
              {report.byStatus.map((item) => (
                <option key={item.status} value={item.status}>
                  {APPLICATION_STATUS_LABELS[item.status] || item.status}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "1 1 200px" }}>
            <button className="btn btn-primary" style={{ flex: 1 }}>Terapkan</button>
            <a
              href={`/api/reports/applications.csv?${new URLSearchParams(values).toString()}`}
              className="btn btn-ghost"
              style={{ flex: 1, background: "#f1f5f9", textAlign: "center" }}
            >
              Export CSV
            </a>
          </div>
        </form>
      </DashboardCard>

      {/* ── Summary Row 1: Volume Per Layanan (Data Sebenarnya) ── */}
      <div>
        <ReportSectionHeader
          icon={Layers}
          iconGradient="linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)"
          iconShadow="rgba(94, 114, 228, 0.35)"
          title="Statistik Pengajuan Berdasarkan Layanan"
          subtitle="Akumulasi dan rincian volume berkas permohonan surat warga berdasarkan jenis layanan"
          badgeText="Volume Layanan"
          badgeColor="#5e72e4"
          badgeBg="#eff2fe"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          <StatCard
            label="Total Pengajuan SKTM"
            value={report.totalSktm}
            icon={FileText}
            tone="blue"
            footerText="Surat Keterangan Tidak Mampu"
          />
          <StatCard
            label="Total Pengajuan SKCK"
            value={report.totalSkck}
            icon={FileCheck}
            tone="indigo"
            footerText="Surat Pengantar Pembuatan SKCK"
          />
          <StatCard
            label="Total Seluruh Pengajuan"
            value={report.total}
            icon={Layers}
            tone="purple"
            footerText="Hasil filter periode berjalan"
          />
        </div>
      </div>

      {/* ── Summary Row 2: Status & Alur Pengajuan ── */}
      <div>
        <ReportSectionHeader
          icon={Clock}
          iconGradient="linear-gradient(310deg, #fb6340 0%, #fbb140 100%)"
          iconShadow="rgba(251, 99, 64, 0.35)"
          title="Status & Tahapan Pengajuan"
          subtitle="Distribusi berkas berdasarkan alur verifikasi berkas staf desa dan persetujuan Kepala Desa"
          badgeText="Alur Pelayanan"
          badgeColor="#fb6340"
          badgeBg="#fff2ee"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          <StatCard
            label="Menunggu Verifikasi"
            value={report.menungguVerifikasi}
            icon={Clock}
            tone="amber"
            footerText="Status DIAJUKAN"
          />
          <StatCard
            label="Perlu Perbaikan"
            value={report.needsRepair}
            icon={ShieldCheck}
            tone="amber"
            footerText="Status PERLU_PERBAIKAN"
          />
          <StatCard
            label="Menunggu Persetujuan Kades"
            value={report.menungguPersetujuan}
            icon={Clock}
            tone="red"
            footerText="Status MENUNGGU_APPROVAL"
          />
          <StatCard
            label="Pengajuan Disetujui"
            value={report.disetujui}
            icon={CheckCircle}
            tone="green"
            footerText="Status DISETUJUI / SELESAI"
          />
          <StatCard
            label="Pengajuan Ditolak"
            value={report.ditolak}
            icon={XCircle}
            tone="red"
            footerText="Status DITOLAK"
          />
        </div>
      </div>

      {/* ── Breakdown Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        <DashboardCard title="Distribusi Berdasarkan Status">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {report.byStatus.map((item) => (
              <div key={item.status} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ width: "45%", fontSize: "13px", color: "#475569" }}>
                  {APPLICATION_STATUS_LABELS[item.status] || item.status}
                </span>
                <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#3b82f6", width: `${(item.count / maxStatus) * 100}%` }} />
                </div>
                <strong style={{ fontSize: "14px", color: "#334155", width: "30px", textAlign: "right" }}>{item.count}</strong>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Distribusi Berdasarkan Layanan">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {report.byService.length ? (
              report.byService.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ width: "45%", fontSize: "13px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.name}>
                    {item.name}
                  </span>
                  <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#10b981", width: `${(item.count / maxService) * 100}%` }} />
                  </div>
                  <strong style={{ fontSize: "14px", color: "#334155", width: "30px", textAlign: "right" }}>{item.count}</strong>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>Belum ada data.</p>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* ── Detail Table ── */}
      <DashboardCard title="Rincian Pengajuan Terdata">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor Pengajuan</th>
                <th>Layanan</th>
                <th>Status</th>
                <th>Tanggal Pengajuan</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length ? (
                report.rows.map((row) => (
                  <tr key={row.nomor_pengajuan}>
                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{row.nomor_pengajuan}</td>
                    <td>{row.service.name}</td>
                    <td>
                      <ApplicationStatusBadge status={row.status} size="sm" />
                    </td>
                    <td>{new Date(row.submitted_at).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                    Tidak ada pengajuan pada rentang filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
