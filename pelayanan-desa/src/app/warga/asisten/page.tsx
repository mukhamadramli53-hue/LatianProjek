import type { Metadata } from "next";
import AiChat from "@/components/ai/AiChat";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Asisten Virtual | Pelayanan Desa" };

export default function AsistenPage() {
  const isGeminiReady = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() &&
    process.env.GEMINI_API_KEY !== "GANTI_DENGAN_API_KEY_DARI_AI_STUDIO"
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 40 }}>
      {/* Argon Card Header */}
      <div style={{ 
        background: "#ffffff", borderRadius: "1rem", padding: "28px 32px", 
        boxShadow: "0 20px 27px 0 rgba(0, 0, 0, 0.05)", marginBottom: 24,
        border: "1px solid rgba(0, 0, 0, 0.04)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(94, 114, 228, 0.1)",
          color: "#5e72e4", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
        }}>
          <Sparkles size={13} /> Asisten Cerdas Desa
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#344767" }}>
          Panduan Layanan Digital
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "#8392ab", maxWidth: 680, lineHeight: 1.6 }}>
          Dapatkan panduan resmi terkait persyaratan, pengisian formulir, perbaikan dokumen, serta pemantauan status pengajuan SKTM dan Surat Pengantar SKCK.
        </p>
      </div>

      <AiChat role="WARGA" initialIsGeminiConfigured={isGeminiReady} />
    </div>
  );
}
