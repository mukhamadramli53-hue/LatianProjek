/**
 * Prisma Seed Script - Sistem Pelayanan Desa
 *
 * PENTING: Script ini HANYA untuk development/testing lokal.
 * Password yang digunakan bukan untuk production.
 *
 * Jalankan dengan: npx prisma db seed
 * atau: npm run db:seed
 *
 * Demo credentials (LOCAL ONLY):
 * ==============================
 * Kepala Desa: kades@desa.local   / Demo@12345
 * Supervisor:  supervisor@desa.local / Demo@12345
 * Staf:        staf@desa.local    / Demo@12345
 * Warga:       warga@desa.local   / Demo@12345
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const DEMO_PASSWORD = "Demo@12345";

async function main() {
  console.log("🌱 Starting database seed...");

  // Hash password demo
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // ============================================================
  // SEED USERS
  // ============================================================
  const users = [
    {
      name: "Budi Santoso",
      email: "kades@desa.local",
      role: Role.KEPALA_DESA,
      nik: "3201010101010001",
      phone: "081200000001",
      address: "Jl. Balai Desa No. 1",
    },
    {
      name: "Sari Dewi",
      email: "supervisor@desa.local",
      role: Role.SUPERVISOR,
      nik: "3201010101010002",
      phone: "081200000002",
      address: "Jl. Mawar No. 5",
    },
    {
      name: "Agus Wijaya",
      email: "staf@desa.local",
      role: Role.STAF,
      nik: "3201010101010003",
      phone: "081200000003",
      address: "Jl. Kenanga No. 10",
    },
    {
      name: "Rina Wati",
      email: "warga@desa.local",
      role: Role.WARGA,
      nik: "3201010101010004",
      phone: "083852635694",
      address: "Jl. Melati No. 15",
    },
    {
      name: "Hendra Kurniawan",
      email: "warga2@desa.local",
      role: Role.WARGA,
      nik: "3201010101010005",
      phone: "083852635694",
      address: "Jl. Cempaka No. 20",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { phone: user.phone },
      create: {
        ...user,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });
    console.log(`  ✅ User: ${user.name} (${user.role})`);
  }

  // ============================================================
  // SEED MASTER SERVICES (HANYA SKTM & PENGANTAR PEMBUATAN SKCK)
  // ============================================================
  const allowedCodes = ["SKTM", "SP-SKCK"];

  // Nonaktifkan/hapus layanan selain dua layanan yang diizinkan
  await prisma.service.deleteMany({
    where: {
      code: { notIn: allowedCodes },
    },
  });

  const services = [
    {
      code: "SKTM",
      name: "Surat Keterangan Tidak Mampu",
      description: "Surat keterangan kondisi ekonomi untuk kebutuhan bantuan sosial, beasiswa, atau jaminan kesehatan",
      requirements: ["Fotokopi KTP", "Fotokopi KK", "Surat Pengantar RT/RW", "Foto Rumah"],
      estimatedTime: "2 Hari Kerja",
      form_schema: {
        fields: [
          { name: "nama_pemohon", label: "Nama Lengkap Pemohon", type: "text", required: true, placeholder: "Masukkan nama lengkap sesuai KTP" },
          { name: "nik", label: "Nomor Induk Kependudukan (NIK)", type: "text", required: true, placeholder: "16 digit NIK pemohon", pattern: "^[0-9]{16}$", maxLength: 16 },
          { name: "no_kk", label: "Nomor Kartu Keluarga (No. KK)", type: "text", required: true, placeholder: "16 digit Nomor Kartu Keluarga", pattern: "^[0-9]{16}$", maxLength: 16 },
          { name: "alamat_lengkap", label: "Alamat Lengkap", type: "textarea", required: true, placeholder: "RT/RW, Dusun, Desa" },
          { name: "no_telepon", label: "Nomor Telepon / WhatsApp", type: "tel", required: false, placeholder: "Contoh: 081234567890 (opsional)", pattern: "^[0-9+ -]{9,16}$", maxLength: 16 },
          { name: "pekerjaan", label: "Pekerjaan Pemohon / Kepala Keluarga", type: "text", required: true, placeholder: "Contoh: Petani, Buruh harian, Pedagang kecil, Tidak bekerja" },
          { name: "penghasilan_bulanan", label: "Penghasilan Bulanan Rata-rata (Rp)", type: "number", required: true, placeholder: "Contoh: 500000" },
          { name: "jumlah_tanggungan", label: "Jumlah Tanggungan Keluarga", type: "number", required: true, placeholder: "Contoh: 3" },
          { name: "keperluan", label: "Keperluan Pengajuan SKTM", type: "textarea", required: true, placeholder: "Contoh: Beasiswa pendidikan, keringanan biaya RS / BPJS PBI, bantuan sosial" },
        ],
      },
    },
    {
      code: "SP-SKCK",
      name: "Surat Pengantar Pembuatan SKCK",
      description: "Layanan permohonan surat pengantar resmi dari desa untuk penerbitan Surat Keterangan Catatan Kepolisian (SKCK) di Polsek atau Polres setempat",
      requirements: [
        "Fotokopi KTP (e-KTP)",
        "Fotokopi Kartu Keluarga (KK)",
        "Fotokopi Akta Kelahiran",
        "Fotokopi Ijazah Terakhir",
        "Pas foto 4x6 background merah jika ada"
      ],
      estimatedTime: "1 Hari Kerja",
      form_schema: {
        fields: [
          { name: "nama_pemohon", label: "Nama Lengkap Pemohon", type: "text", required: true, placeholder: "Masukkan nama pemohon sesuai KTP / KK" },
          { name: "nik", label: "Nomor Induk Kependudukan (NIK)", type: "text", required: true, placeholder: "16 digit NIK pemohon", pattern: "^[0-9]{16}$", maxLength: 16 },
          { name: "no_kk", label: "Nomor Kartu Keluarga (No. KK)", type: "text", required: true, placeholder: "16 digit Nomor Kartu Keluarga", pattern: "^[0-9]{16}$", maxLength: 16 },
          { name: "tempat_lahir", label: "Tempat Lahir", type: "text", required: true, placeholder: "Contoh: Bandung" },
          { name: "tanggal_lahir", label: "Tanggal Lahir", type: "date", required: true },
          { name: "jenis_kelamin", label: "Jenis Kelamin", type: "select", required: true, options: ["Laki-laki", "Perempuan"] },
          { name: "agama", label: "Agama", type: "select", required: true, options: ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Khonghucu"] },
          { name: "status_perkawinan", label: "Status Perkawinan", type: "select", required: true, options: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"] },
          { name: "pekerjaan", label: "Pekerjaan", type: "text", required: true, placeholder: "Contoh: Pelajar/Mahasiswa, Karyawan Swasta, Wiraswasta" },
          { name: "alamat_lengkap", label: "Alamat Lengkap", type: "textarea", required: true, placeholder: "RT ... / RW ..., Dusun ..., Desa ..." },
          { name: "no_telepon", label: "Nomor Telepon / WhatsApp", type: "tel", required: false, placeholder: "Contoh: 081234567890 (opsional)", pattern: "^[0-9+ -]{9,16}$", maxLength: 16 },
          { name: "keperluan", label: "Keperluan Pembuatan SKCK", type: "textarea", required: true, placeholder: "Contoh: Melamar Pekerjaan di Perusahaan/BUMN, Persyaratan CPNS, Melanjutkan Pendidikan" },
        ],
      },
    },
  ];

  for (const service of services) {
    const s = await prisma.service.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        description: service.description,
        requirements: service.requirements,
        estimatedTime: service.estimatedTime,
        form_schema: service.form_schema,
        isActive: true,
      },
      create: service,
    });
    console.log(`  ✅ Service: ${service.name}`);

    // Seed Knowledge Documents for each service
    if (service.code === "SKTM") {
      await prisma.knowledgeDocument.deleteMany({ where: { serviceId: s.id } });
      await prisma.knowledgeDocument.createMany({
        data: [
          {
            title: "SOP Verifikasi & Kriteria Kelayakan SKTM",
            kind: "SOP",
            serviceId: s.id,
            content: "Kriteria penerima SKTM: 1) Penghasilan gabungan keluarga di bawah UMR/UMK wilayah, 2) Foto kondisi fisik rumah tinggal menunjukkan kesederhanaan, 3) Adanya surat pengantar sah dari RT/RW setempat. Verifikasi wajib mencocokkan NIK pemohon pada e-KTP dan Kartu Keluarga.",
          },
          {
            title: "FAQ Kendala Berkas SKTM",
            kind: "FAQ",
            serviceId: s.id,
            content: "Jika foto rumah buram atau surat pengantar RT/RW belum bertanda tangan, staf desa wajib mengubah status menjadi PERLU_PERBAIKAN dan mencantumkan catatan spesifik dokumen mana yang harus diunggah ulang.",
          },
        ],
      });
    } else if (service.code === "SP-SKCK") {
      await prisma.knowledgeDocument.deleteMany({ where: { serviceId: s.id } });
      await prisma.knowledgeDocument.createMany({
        data: [
          {
            title: "SOP Penerbitan Surat Pengantar SKCK",
            kind: "SOP",
            serviceId: s.id,
            content: "Syarat wajib SP-SKCK: e-KTP, Kartu Keluarga, Akta Kelahiran, dan Ijazah Terakhir. Berkas diverifikasi oleh staf desa dalam waktu 1 hari kerja, disupervisi oleh supervisor, dan disahkan oleh Kepala Desa.",
          },
          {
            title: "FAQ Keperluan Surat Pengantar SKCK",
            kind: "FAQ",
            serviceId: s.id,
            content: "Surat pengantar SKCK dari desa digunakan untuk pengurusan SKCK di tingkat Polsek atau Polres setempat, terutama untuk melamar pekerjaan BUMN/swasta, pendaftaran CPNS/TNI/Polri, atau melanjutkan studi.",
          },
        ],
      });
    }
  }

  console.log("\n✨ Seed selesai!");
  console.log("\n📋 Demo Credentials (LOCAL ONLY):");
  console.log("  Kepala Desa : kades@desa.local      | Demo@12345");
  console.log("  Supervisor  : supervisor@desa.local | Demo@12345");
  console.log("  Staf        : staf@desa.local       | Demo@12345");
  console.log("  Warga       : warga@desa.local      | Demo@12345");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
