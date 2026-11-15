import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";
import { Check } from "lucide-react";

export const metadata: Metadata = {
 title: "Masuk",
 description: "Masuk ke Sistem Pelayanan Desa untuk mengajukan dan memantau layanan.",
};

export default function LoginPage() {
 return (
 <main className={styles.main}>
 {/* Background orbs */}
 <div className={styles.bgOrb1} aria-hidden="true" />
 <div className={styles.bgOrb2} aria-hidden="true" />

 <div className={styles.container}>
 {/* Left panel - Branding */}
 <div className={styles.brandPanel}>
 <div className={styles.brandContent}>
 <div className={styles.logo} aria-label="Logo Pelayanan Desa">
 🏛️
 </div>
 <h1 className={styles.brandTitle}>Sistem Pelayanan Desa</h1>
 <p className={styles.brandDesc}>
 Platform digital untuk pelayanan administrasi desa yang cepat, mudah, dan transparan.
 </p>
 <div className={styles.brandFeatures}>
 {[
 "Pengajuan surat online 24/7",
 "Pantau status real-time",
 "Aman & terpercaya",
 ].map((item) => (
 <div key={item} className={styles.brandFeatureItem}>
 <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Login Form */}
        <div className={styles.formPanel}>
          <div className={`card-glass ${styles.formCard}`}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Selamat Datang</h2>
              <p className={styles.formSubtitle}>
                Masuk dengan akun Anda untuk melanjutkan
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
