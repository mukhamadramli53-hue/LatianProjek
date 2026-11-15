import Link from "next/link";
import { getWargaDashboard } from "@/lib/actions/dashboard";
import { ApplicationTable, EmptyState, StatCard, DashboardCard } from "@/components/dashboard/DashboardComponents";
import {
  FileText, Clock, AlertTriangle, CheckCircle,
  Calendar, PlusCircle, ArrowRight, Sparkles,
} from "lucide-react";

export const metadata = { title: "Dashboard Warga | Pelayanan Desa" };

export default async function WargaDashboardPage() {
  const data = await getWargaDashboard();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Stat Cards Row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 20,
      }}>
        <StatCard
          label="Total Pengajuan" value={data.total} tone="indigo"
          icon={FileText} footerIcon={Calendar} footerText="Seluruh waktu"
          trend="neutral"
        />
        <StatCard
          label="Sedang Diproses" value={data.processed} tone="blue"
          icon={Clock} footerIcon={Calendar} footerText="Dalam antrian"
          trend="up"
        />
        <StatCard
          label="Perlu Diperbaiki" value={data.needsRepair} tone="amber"
          icon={AlertTriangle} footerIcon={Calendar} footerText="Segera lengkapi"
          trend={data.needsRepair > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Selesai" value={data.completed} tone="green"
          icon={CheckCircle} footerIcon={Calendar} footerText="Telah disetujui"
          trend="up"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
        gap: 24,
        alignItems: "start",
      }}>

        {/* Pengajuan Terbaru */}
        <DashboardCard
          title="Pengajuan Saya"
          subtitle="Daftar Berkas Terbaru"
          action={
            <Link href="/warga/pengajuan" style={{
              fontSize: 12, fontWeight: 700, color: "#5e72e4",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}>
              Lihat semua <ArrowRight size={13} />
            </Link>
          }
        >
          {data.recent.length
            ? <ApplicationTable applications={data.recent} />
            : <EmptyState
                title="Belum ada pengajuan"
                description="Mulai dengan memilih layanan SKTM atau Surat Pengantar SKCK."
              />
          }
        </DashboardCard>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Akses Cepat */}
          <DashboardCard title="Akses Cepat" subtitle="Navigasi Cepat">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/warga/ajukan"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px 18px", borderRadius: "0.5rem", textDecoration: "none",
                  background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  color: "#fff", fontWeight: 700, fontSize: 11.5, textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  boxShadow: "0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.2s ease",
                }}
              >
                <PlusCircle size={15} />
                Ajukan Pelayanan
              </Link>
              <Link
                href="/warga/pengajuan"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px 18px", borderRadius: "0.5rem", textDecoration: "none",
                  border: "1px solid #d2d6da",
                  color: "#344767", fontWeight: 700, fontSize: 11.5, textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: "#ffffff",
                  transition: "all 0.2s ease",
                }}
              >
                <FileText size={15} />
                Riwayat Pengajuan
              </Link>
            </div>
          </DashboardCard>

          {/* Panduan Digital Card — Argon Dark Navy */}
          <div style={{
            background: "linear-gradient(310deg, #141727 0%, #3a416f 100%)",
            borderRadius: "1rem",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)",
          }}>
            <div style={{
              position: "absolute", top: -20, right: -20,
              width: 100, height: 100, borderRadius: "50%",
              background: "rgba(94, 114, 228, 0.35)", filter: "blur(30px)",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(310deg, #5e72e4 0%, #825ee4 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles size={15} color="#fff" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  Panduan Layanan Digital
                </span>
              </div>
              <p style={{
                margin: "0 0 14px", fontSize: 12, color: "rgba(255,255,255,0.75)",
                lineHeight: 1.5,
              }}>
                Pelajari syarat, prosedur, dan tata cara pengajuan berkas SKTM dan Surat Pengantar SKCK.
              </p>
              <Link
                href="/warga/asisten"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 14px", borderRadius: "0.5rem",
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.04em", textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Buka Panduan <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}