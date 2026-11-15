"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error]", error);
  }, [error]);

  const isDatabaseError =
    error.message?.includes("database") ||
    error.message?.includes("prisma") ||
    error.message?.includes("Can't reach database server");

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
          maxWidth: "520px",
          width: "100%",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "36px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "8px",
          }}
        >
          Terjadi Gangguan Sistem
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          {isDatabaseError
            ? "Tidak dapat terhubung ke server database. Pastikan MySQL di Laragon sudah aktif (Start All)."
            : "Halaman ini sementara tidak dapat dimuat karena terjadi kesalahan teknis."}
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div
            style={{
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              fontFamily: "monospace",
              color: "#475569",
              textAlign: "left",
              maxHeight: "120px",
              overflowY: "auto",
              marginBottom: "24px",
            }}
          >
            {error.message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => reset()}
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
            <RefreshCw size={16} />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="btn btn-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: "14px",
              background: "#f1f5f9",
            }}
          >
            <Home size={16} />
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
