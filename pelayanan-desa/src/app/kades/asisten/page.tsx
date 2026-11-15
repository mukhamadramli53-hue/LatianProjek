import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AiChat from "@/components/ai/AiChat";

export const metadata = { title: "Penasihat AI Eksekutif - Kepala Desa" };

export default async function KadesAsistenPage() {
  const session = await auth();
  if (session?.user?.role !== "KEPALA_DESA") redirect("/403");

  const isGeminiReady = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() &&
    process.env.GEMINI_API_KEY !== "GANTI_DENGAN_API_KEY_DARI_AI_STUDIO"
  );

  return (
    <RoleDashboardLayout
      role="KEPALA_DESA"
      title="Penasihat AI Eksekutif Kepala Desa"
      subtitle="Dukungan pertimbangan persetujuan (approval) atau penolakan berkas, ringkasan eksekutif, dan kebijakan pelayanan."
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
        <AiChat role="KEPALA_DESA" initialIsGeminiConfigured={isGeminiReady} />
      </div>
    </RoleDashboardLayout>
  );
}
