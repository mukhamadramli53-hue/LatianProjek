import { Suspense } from "react";
import Link from "next/link";
import { getServices } from "@/lib/actions/service";
import ServiceTable from "./ServiceTable";
import { Search, Plus } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardComponents";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";

export const metadata = {
 title: "Master Layanan - Sistem Pelayanan Desa",
};

export default async function MasterLayananPage(props: {
 searchParams?: Promise<{ search?: string; filter?: string }>
}) {
 const searchParams = await props.searchParams;
 const search = searchParams?.search || "";
 const filter = searchParams?.filter || "all";
 
 const isActive = filter === "active" ? true : filter === "inactive" ? false : undefined;

 const services = await getServices({ search, isActive });

 return (
 <RoleDashboardLayout 
   role="KEPALA_DESA" 
   title="Master Layanan Desa" 
   subtitle="Kelola jenis-jenis pelayanan untuk warga"
  >
  <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
 <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-8px" }}>
 <Link href="/kades/layanan/baru" className="btn btn-primary">
 <Plus size={16} />
 Tambah Layanan
 </Link>
 </div>

 <DashboardCard>
 <form style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
 <div style={{ position: "relative", flex: "1 1 250px" }}>
 <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
 <Search size={16} />
 </div>
 <input
 type="text"
 name="search"
 placeholder="Cari nama atau kode layanan..."
 defaultValue={search}
 className="form-input"
 style={{ paddingLeft: "36px" }}
 />
 </div>
 <select
 name="filter"
 defaultValue={filter}
 className="form-input"
 style={{ flex: "0 0 160px" }}
 >
 <option value="all">Semua Status</option>
 <option value="active">Aktif</option>
 <option value="inactive">Nonaktif</option>
 </select>
 <button type="submit" className="btn btn-ghost" style={{ background: "#f1f5f9" }}>
 Filter
 </button>
 </form>

 <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>Memuat data...</div>}>
 <ServiceTable services={services} />
 </Suspense>
 </DashboardCard>
 </div>
 </RoleDashboardLayout>
 );
}
