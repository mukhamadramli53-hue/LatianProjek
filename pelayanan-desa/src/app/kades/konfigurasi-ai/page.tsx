import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AiConfigClient from "@/components/kades/AiConfigClient";
import { getSafeAiConfigForUi } from "@/lib/ai/config-store";

export const metadata = {
  title: "Konfigurasi AI Assistant - Kepala Desa",
};

export const dynamic = "force-dynamic";

export default async function KonfigurasiAiPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "KEPALA_DESA") {
    redirect("/403");
  }

  const initialConfig = await getSafeAiConfigForUi();

  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title="Konfigurasi AI Assistant"
      subtitle="Kelola API Key, provider AI, dan model yang digunakan oleh AI Chatbot Sistem Pelayanan Desa."
    >
      <AiConfigClient initialConfig={initialConfig} />
    </RoleDashboardLayout>
  );
}

