import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/actions/service";
import ServiceForm from "../../ServiceForm";
import { ArrowLeft } from "lucide-react";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = {
  title: "Edit Layanan - Sistem Pelayanan Desa",
};

export default async function EditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const service = await getServiceById(params.id);

  if (!service) {
    notFound();
  }

  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title={`Edit Layanan: ${service.name}`}
      subtitle="Perbarui konfigurasi kode, persyaratan dokumen, dan skema formulir isian warga"
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

        <ServiceForm initialData={service} />
      </div>
    </RoleDashboardLayout>
  );
}
