const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rina = await prisma.user.findUnique({ where: { email: "warga@desa.local" } });
  const hendra = await prisma.user.findUnique({ where: { email: "warga2@desa.local" } });
  const staf = await prisma.user.findUnique({ where: { email: "staf@desa.local" } });
  const sktm = await prisma.service.findUnique({ where: { code: "SKTM" } });
  const skck = await prisma.service.findUnique({ where: { code: "SP-SKCK" } });

  if (!rina || !hendra || !staf || !sktm || !skck) {
    console.error("Missing required master data!");
    return;
  }

  // Clear existing demo applications
  await prisma.application.deleteMany({
    where: {
      userId: { in: [rina.id, hendra.id] }
    }
  });

  // 1. Rina - SKTM (PERLU_PERBAIKAN)
  const app1 = await prisma.application.create({
    data: {
      nomor_pengajuan: "PD-202610-0001",
      userId: rina.id,
      serviceId: sktm.id,
      status: "PERLU_PERBAIKAN",
      notes: "Pengajuan SKTM untuk persyaratan beasiswa pendidikan anak",
      form_data: {
        nama_pemohon: "Rina Wati",
        nik: "3201010101010004",
        no_kk: "3201010101010004",
        alamat_lengkap: "Jl. Melati No. 15, RT 02 / RW 04, Desa Mekar Wangi",
        pekerjaan: "Pedagang Kecil",
        penghasilan_bulanan: 850000,
        jumlah_tanggungan: 3,
        keperluan: "Beasiswa Pendidikan Kuliah Anak",
      },
      documents: {
        create: [
          {
            requirement_name: "Fotokopi KTP",
            file_name: "ktp_rina_wati.jpg",
            storage_key: "doc-ktp-rina-001",
            mime_type: "image/jpeg",
            file_size: 154200,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Fotokopi KK",
            file_name: "kartu_keluarga_rina.jpg",
            storage_key: "doc-kk-rina-001",
            mime_type: "image/jpeg",
            file_size: 212400,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Surat Pengantar RT/RW",
            file_name: "pengantar_rt_rw.pdf",
            storage_key: "doc-rt-rina-001",
            mime_type: "application/pdf",
            file_size: 320100,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Foto Rumah",
            file_name: "foto_rumah_tampak_depan_buram.jpg",
            storage_key: "doc-rumah-rina-001",
            mime_type: "image/jpeg",
            file_size: 89000,
            uploadedById: rina.id,
          },
        ],
      },
      history: {
        create: [
          {
            actorId: rina.id,
            oldStatus: null,
            newStatus: "DIAJUKAN",
            note: "Pengajuan baru dikirim oleh pemohon.",
            createdAt: new Date(Date.now() - 48 * 3600 * 1000),
          },
          {
            actorId: staf.id,
            oldStatus: "DIAJUKAN",
            newStatus: "PERLU_PERBAIKAN",
            note: "Foto Rumah Tinggal tampak depan buram dan terpotong. Mohon unggah ulang foto rumah tinggal tampak depan yang jelas, terang, dan memperlihatkan keseluruhan bangunan.",
            createdAt: new Date(Date.now() - 24 * 3600 * 1000),
          },
        ],
      },
    },
  });

  // 2. Rina - SP-SKCK (DIPROSES)
  const app2 = await prisma.application.create({
    data: {
      nomor_pengajuan: "PD-202610-0002",
      userId: rina.id,
      serviceId: skck.id,
      status: "DIPROSES",
      notes: "Keperluan melamar pekerjaan di BUMN",
      form_data: {
        nama_pemohon: "Rina Wati",
        nik: "3201010101010004",
        no_kk: "3201010101010004",
        tempat_lahir: "Bandung",
        tanggal_lahir: "1994-06-12",
        jenis_kelamin: "Perempuan",
        agama: "Islam",
        status_perkawinan: "Kawin",
        pekerjaan: "Karyawan Swasta",
        alamat_lengkap: "Jl. Melati No. 15, RT 02 / RW 04, Desa Mekar Wangi",
        keperluan: "Melamar Pekerjaan di PT Kereta Api Indonesia (Persero)",
      },
      documents: {
        create: [
          {
            requirement_name: "Fotokopi KTP (e-KTP)",
            file_name: "ktp_rina.jpg",
            storage_key: "doc-ktp-rina-002",
            mime_type: "image/jpeg",
            file_size: 160000,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Fotokopi Kartu Keluarga (KK)",
            file_name: "kk_rina.jpg",
            storage_key: "doc-kk-rina-002",
            mime_type: "image/jpeg",
            file_size: 215000,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Fotokopi Akta Kelahiran",
            file_name: "akta_kelahiran_rina.pdf",
            storage_key: "doc-akta-rina-002",
            mime_type: "application/pdf",
            file_size: 280000,
            uploadedById: rina.id,
          },
          {
            requirement_name: "Fotokopi Ijazah Terakhir",
            file_name: "ijazah_s1_rina.pdf",
            storage_key: "doc-ijazah-rina-002",
            mime_type: "application/pdf",
            file_size: 340000,
            uploadedById: rina.id,
          },
        ],
      },
      history: {
        create: [
          {
            actorId: rina.id,
            oldStatus: null,
            newStatus: "DIAJUKAN",
            note: "Pengajuan SKCK dikirim oleh warga.",
            createdAt: new Date(Date.now() - 36 * 3600 * 1000),
          },
          {
            actorId: staf.id,
            oldStatus: "DIAJUKAN",
            newStatus: "DIVERIFIKASI",
            note: "Seluruh berkas dokumen lengkap dan terverifikasi sah.",
            createdAt: new Date(Date.now() - 18 * 3600 * 1000),
          },
          {
            actorId: staf.id,
            oldStatus: "DIVERIFIKASI",
            newStatus: "DIPROSES",
            note: "Draf surat pengantar SKCK sedang disiapkan oleh staf desa.",
            createdAt: new Date(Date.now() - 6 * 3600 * 1000),
          },
        ],
      },
    },
  });

  // 3. Hendra (warga lain) - SKTM (REVIEW_SUPERVISOR)
  const app3 = await prisma.application.create({
    data: {
      nomor_pengajuan: "PD-202610-0003",
      userId: hendra.id,
      serviceId: sktm.id,
      status: "REVIEW_SUPERVISOR",
      notes: "Pengajuan SKTM untuk keringanan biaya rumah sakit",
      form_data: {
        nama_pemohon: "Hendra Kurniawan",
        nik: "3201010101010005",
        no_kk: "3201010101010005",
        alamat_lengkap: "Jl. Cempaka No. 20, Desa Mekar Wangi",
        pekerjaan: "Buruh Lepas",
        penghasilan_bulanan: 600000,
        jumlah_tanggungan: 4,
        keperluan: "Keringanan Biaya Operasi RSUD",
      },
      documents: {
        create: [
          {
            requirement_name: "Fotokopi KTP",
            file_name: "ktp_hendra.jpg",
            storage_key: "doc-ktp-hendra-003",
            mime_type: "image/jpeg",
            file_size: 140000,
            uploadedById: hendra.id,
          },
        ],
      },
      history: {
        create: [
          {
            actorId: hendra.id,
            oldStatus: null,
            newStatus: "DIAJUKAN",
            note: "Pengajuan baru.",
            createdAt: new Date(Date.now() - 20 * 3600 * 1000),
          },
          {
            actorId: staf.id,
            oldStatus: "DIAJUKAN",
            newStatus: "DIPROSES",
            note: "Berkas lengkap.",
            createdAt: new Date(Date.now() - 10 * 3600 * 1000),
          },
          {
            actorId: staf.id,
            oldStatus: "DIPROSES",
            newStatus: "REVIEW_SUPERVISOR",
            note: "Diteruskan ke Supervisor Desa untuk kendali mutu.",
            createdAt: new Date(Date.now() - 2 * 3600 * 1000),
          },
        ],
      },
    },
  });

  console.log("✅ Seeded demo applications:");
  console.log("- Rina Wati (warga@desa.local): PD-202610-0001 (PERLU_PERBAIKAN), PD-202610-0002 (DIPROSES)");
  console.log("- Hendra Kurniawan (warga2@desa.local): PD-202610-0003 (REVIEW_SUPERVISOR)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
