import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AiChat from "@/components/ai/AiChat";

export const metadata = { title: "Asisten AI Supervisi - Supervisor Desa" };

export default async function SupervisorAsistenPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERVISOR") redirect("/403");

  const isGeminiReady = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() &&
    process.env.GEMINI_API_KEY !== "GANTI_DENGAN_API_KEY_DARI_AI_STUDIO"
  );

  return (
    <RoleDashboardLayout
      role="SUPERVISOR"
      title="Asisten AI Supervisi & Pengawasan"
      subtitle="Bantuan penelaahan mutu verifikasi staf, kepatuhan SOP berkas, dan analisis hambatan antrian."
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
        <AiChat role="SUPERVISOR" initialIsGeminiConfigured={isGeminiReady} />
      </div>
    </RoleDashboardLayout>
  );
}
