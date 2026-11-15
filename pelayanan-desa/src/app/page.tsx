import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, ArrowRight, ShieldCheck, Zap, Globe, Smartphone, FileText, Bot } from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
 title: "Selamat Datang | Sistem Pelayanan Desa",
 description:
 "Platform digital untuk memudahkan warga dalam mengajukan layanan administrasi desa secara online, cepat, dan transparan.",
};

export default function HomePage() {
 return (
 <>
 <main className={styles.main}>
 {/* Navigation Bar */}
 <nav className={styles.navbar}>
 <Link href="/" className={styles.logo}>
 <div className={styles.logoIcon}>
 <ShieldCheck size={18} color="#fff" />
 </div>
 <span>PelayananDesa</span>
 </Link>
 <div className={styles.navLinks}>
 <a href="#fitur">Fitur Unggulan</a>
 <a href="#statistik">Statistik</a>
 </div>
 <div className={styles.navActions}>
 <Link href="/login" className={styles.btnPrimary} style={{ padding: "8px 18px", fontSize: "13px" }}>
 Masuk Sistem <LogIn size={14} />
 </Link>
 </div>
 </nav>

 {/* Hero Section */}
 <section className={styles.hero}>
 <div className={styles.badge} role="presentation">
 <span className={styles.badgeDot} />
 <span>Platform Layanan Digital Desa v2.0</span>
 </div>

 <h1 className={styles.title}>
 Birokrasi Desa yang <br />
 <span className={styles.titleAccent}>Cepat & Transparan</span>
 </h1>

 <p className={styles.description}>
 Akses layanan administrasi desa kapan saja, dari mana saja. 
 Tinggalkan antrean panjang, pantau status surat pengajuan Anda secara real-time.
 </p>

 <div className={styles.actions}>
 <Link href="/login" className={styles.btnPrimary}>
 <LogIn size={18} />
 Mulai Sekarang
 </Link>
 <a href="#fitur" className={styles.btnSecondary}>
 Pelajari Lebih Lanjut <ArrowRight size={18} />
 </a>
 </div>

 {/* Stats */}
 <div id="statistik" className={styles.stats}>
 {[
 { value: "100%", label: "Berbasis Digital" },
 { value: "4", label: "Tingkat Akses (Role)" },
 { value: "24/7", label: "Akses Layanan" },
 { value: "Aman", label: "Enkripsi Data" },
 ].map((stat) => (
 <div key={stat.label} className={styles.statItem}>
 <span className={styles.statValue}>{stat.value}</span>
 <span className={styles.statLabel}>{stat.label}</span>
 </div>
 ))}
 </div>
 </section>

 {/* Features */}
 <section id="fitur" className={styles.features}>
 <h2 className={styles.featuresTitle}>Dirancang untuk Kemudahan</h2>
 <div className={styles.featureGrid}>
 {features.map((feature) => (
 <div key={feature.title} className={styles.featureCard}>
 <div className={styles.featureIcon} aria-hidden="true">
 {feature.icon}
 </div>
 <h3 className={styles.featureCardTitle}>{feature.title}</h3>
 <p className={styles.featureCardDesc}>{feature.description}</p>
 </div>
 ))}
 </div>
 </section>

 {/* Footer */}
 <footer className={styles.footer}>
 <p>&copy; {new Date().getFullYear()} Sistem Pelayanan Desa Digital. Hak Cipta Dilindungi.</p>
 </footer>
    </main>
    </>
  );
}

const features = [
 {
 icon: <FileText size={24} />,
 title: "Pengajuan Tanpa Kertas",
 description: "Unggah dokumen pendukung secara digital. Seluruh proses pembuatan surat tidak memerlukan kertas fisik.",
 },
 {
 icon: <Zap size={24} />,
 title: "Pelacakan Real-time",
 description: "Ketahui pasti di mana posisi pengajuan Anda—apakah sedang direview staf atau menunggu tanda tangan Kepala Desa.",
 },
 {
 icon: <ShieldCheck size={24} />,
 title: "Keamanan Berlapis",
 description: "Akses terpisah antara Warga, Staf, Supervisor, dan Kades menjamin integritas setiap data dan keputusan.",
 },
 {
 icon: <Bot size={24} />,
 title: "Asisten AI Cerdas",
 description: "Dilengkapi asisten virtual berbasis kecerdasan buatan yang siap menjawab pertanyaan dan memandu Anda 24 jam.",
 },
 {
 icon: <Smartphone size={24} />,
 title: "Desain Responsif",
 description: "Antarmuka modern yang secara otomatis menyesuaikan dengan layar ponsel pintar, tablet, maupun desktop.",
 },
 {
 icon: <Globe size={24} />,
 title: "Transparansi Penuh",
 description: "Sistem log audit yang mencatat seluruh aktivitas penting. Meningkatkan kepercayaan publik terhadap kinerja desa.",
 },
];
