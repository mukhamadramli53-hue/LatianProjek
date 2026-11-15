import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "36px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: "#eff6ff",
            color: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <FileQuestion size={28} />
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "8px",
          }}
        >
          Halaman Tidak Ditemukan
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Halaman atau fitur yang Anda cari tidak tersedia atau tautan sudah berpindah.
        </p>

        <Link
          href="/"
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          <Home size={16} />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
