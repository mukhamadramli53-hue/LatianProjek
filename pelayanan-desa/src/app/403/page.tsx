import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import styles from "./forbidden.module.css";

export const metadata: Metadata = {
 title: "403 - Akses Ditolak",
 description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
};

export default function ForbiddenPage() {
 return (
 <main className={styles.main}>
 <div className={styles.content}>
 <div className={styles.icon} aria-hidden="true">🚫</div>
 <div className={styles.code}>403</div>
 <h1 className={styles.title}>Akses Ditolak</h1>
 <p className={styles.description}>
 Anda tidak memiliki izin untuk mengakses halaman ini.
 Halaman ini hanya dapat diakses oleh role tertentu.
 </p>
 <div className={styles.actions}>
 <Link href="/" className="btn btn-primary" id="btn-back-home">
 <Home size={16} aria-hidden="true" />
 Kembali ke Beranda
 </Link>
 <Link href="/login" className="btn btn-ghost" id="btn-login-again">
            Ganti Akun
          </Link>
        </div>
      </div>
    </main>
  );
}
