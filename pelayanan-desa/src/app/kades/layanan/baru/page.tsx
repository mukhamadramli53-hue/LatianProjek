import Link from "next/link";
import ServiceForm from "../ServiceForm";
import { ArrowLeft } from "lucide-react";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = {
  title: "Tambah Layanan Baru - Sistem Pelayanan Desa",
};

export default function BaruPage() {
  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title="Tambah Layanan Baru"
      subtitle="Buat jenis layanan baru dan tentukan persyaratan dokumen serta isian formulir warga"
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link
            href="/kades/layanan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              background: "#ffffff",
              color: "#344767",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <ArrowLeft size={16} color="#2dce89" /> Kembali ke Daftar Layanan
          </Link>
        </div>

        <ServiceForm />
      </div>
    </RoleDashboardLayout>
  );
}
