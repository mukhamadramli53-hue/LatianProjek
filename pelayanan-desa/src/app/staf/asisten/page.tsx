import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RoleDashboardLayout from "@/components/dashboard/RoleDashboardLayout";
import AiChat from "@/components/ai/AiChat";

export const metadata = { title: "Asisten AI Verifikasi - Staf Desa" };

export default async function StaffAsistenPage() {
  const session = await auth();
  if (session?.user?.role !== "STAF") redirect("/403");

  const isGeminiReady = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() &&
    process.env.GEMINI_API_KEY !== "GANTI_DENGAN_API_KEY_DARI_AI_STUDIO"
  );

  return (
    <RoleDashboardLayout
      role="STAF"
      title="Asisten AI Verifikasi & SOP"
      subtitle="Bantuan evaluasi kelengkapan berkas, draf catatan koreksi perbaikan untuk warga, dan panduan regulasi SOP."
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
        <AiChat role="STAF" initialIsGeminiConfigured={isGeminiReady} />
      </div>
    </RoleDashboardLayout>
  );
}
