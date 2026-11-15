import { LoadingState } from "@/components/dashboard/DashboardComponents";

export default function WargaLoading() {
  return (
    <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
      <LoadingState />
    </div>
  );
}
