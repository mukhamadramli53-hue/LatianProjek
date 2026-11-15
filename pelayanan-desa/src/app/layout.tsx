import type { Metadata } from "next";
import "./globals.css";
import ActorFloatingChatbot from "@/components/ai/ActorFloatingChatbot";

export const metadata: Metadata = {
  title: {
    template: "%s | Sistem Pelayanan Desa",
    default: "Sistem Pelayanan Desa",
  },
  description:
    "Platform digital pelayanan desa yang memudahkan warga dalam mengajukan surat dan layanan desa secara online.",
  keywords: ["pelayanan desa", "surat keterangan", "administrasi desa", "online"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <ActorFloatingChatbot />
      </body>
    </html>
  );
}
