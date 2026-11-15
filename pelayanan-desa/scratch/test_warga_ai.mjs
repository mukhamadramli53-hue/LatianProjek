import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const envContent = fs.readFileSync("./.env.local", "utf8");
const apiKeyMatch = envContent.match(/GROQ_API_KEY="([^"]+)"/);
const modelMatch = envContent.match(/GROQ_MODEL="([^"]+)"/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : "";
const model = modelMatch ? modelMatch[1] : "llama-3.3-70b-versatile";

async function getUserApps(userId) {
  const apps = await prisma.application.findMany({
    where: { userId },
    include: {
      service: true,
      documents: true,
      history: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { submitted_at: "desc" },
  });

  return apps.map((app) => ({
    nomor_pengajuan: app.nomor_pengajuan,
    serviceName: app.service.name,
    serviceCode: app.service.code,
    status: app.status,
    submittedAt: app.submitted_at.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    latestNote: app.history[0]?.note || app.notes || null,
    needsRepair: app.status === "PERLU_PERBAIKAN",
  }));
}

function getPrompt(name, userApps) {
  const appsContext = userApps && userApps.length > 0
    ? `DATA RESMI PENGAJUAN MILIK WARGA INI (${name}):\n` +
      userApps.map((a, i) =>
        `${i + 1}. Nomor: ${a.nomor_pengajuan}, Layanan: ${a.serviceName}, Status: ${a.status}, Tanggal: ${a.submittedAt}, Perlu Perbaikan: ${a.needsRepair ? "YA" : "TIDAK"}, Catatan: ${a.latestNote || "Tidak ada catatan"}`
      ).join("\n") +
      `\n\nKETENTUAN STATUS & PRIVASI WARGA:\n` +
      `- Warga HANYA boleh mengakses data miliknya di atas. JANGAN PERNAH menampilkan atau mengarang data warga lain!\n` +
      `- Jika warga bertanya 'Bagaimana status pengajuan saya?' atau 'Apakah dokumen saya perlu diperbaiki?', jawab menggunakan data pengajuan resmi di atas secara akurat dan ramah!\n`
    : `DATA PENGAJUAN: Warga (${name}) saat ini BELUM MEMILIKI riwayat pengajuan aktif di database.\n` +
      `- Jika ditanya 'Bagaimana status pengajuan saya?' atau 'Apakah dokumen saya perlu diperbaiki?', informasikan dengan ramah bahwa saat ini belum ada pengajuan aktif, dan arahkan ke menu Ajukan Baru (/warga/ajukan).\n`;

  return (
    `Anda adalah Asisten Virtual Sistem Pelayanan Desa resmi untuk WARGA.\n` +
    `Anda melayani Bapak/Ibu ${name} (Warga Desa).\n\n` +
    `IDENTITAS ANDA:\n` +
    `Ketika pengguna bertanya 'Anda siapa?', 'Siapa kamu?', perkenalkan diri Anda dengan ramah bahwa Anda adalah 'Asisten Virtual Pelayanan Desa untuk Warga' yang melayani Bapak/Ibu ${name}.\n\n` +
    `INFORMASI PERANGKAT & PEJABAT DESA RESMI:\n` +
    `- Kepala Desa: Bapak Budi Santoso (pejabat yang memegang kewenangan persetujuan akhir / approval penerbitan surat resmi SKTM & SKCK).\n` +
    `- Staf Desa: Bapak Agus Wijaya (petugas verifikasi kelengkapan berkas pengajuan warga).\n` +
    `- Supervisor Desa: Ibu Sari Dewi (pengawas kendali mutu / QA sebelum berkas diajukan ke Kepala Desa).\n` +
    `Jika pengguna menanyakan siapa Kepala Desa (Kades), siapa Staf Desa, atau siapa Supervisor, Anda WAJIB menjawab dengan ramah menyebutkan nama resmi di atas.\n\n` +
    `${appsContext}\n` +
    `KEMAMPUAN UTAMA ANDA SEBAGAI ASISTEN PELAYANAN WARGA:\n` +
    `1. Menjelaskan layanan SKTM dan Surat Pengantar Pembuatan SKCK yang tersedia di aplikasi.\n` +
    `2. Menjelaskan persyaratan dokumen yang tercatat dalam sistem.\n` +
    `3. Membantu warga memahami cara mengisi formulir dan mengunggah dokumen (format PDF, JPG, PNG, atau WebP, maks. 5MB per dokumen, tidak buram).\n` +
    `4. Memeriksa status pengajuan milik warga yang sedang login.\n` +
    `5. Menjelaskan apakah dokumen warga perlu diperbaiki (status PERLU_PERBAIKAN beserta catatan koreksi petugas).\n` +
    `6. Memberikan panduan tentang tahapan proses pengajuan: DIAJUKAN -> DIVERIFIKASI -> DIPROSES (Staf Agus Wijaya) -> REVIEW_SUPERVISOR (Supervisor Sari Dewi) -> MENUNGGU_APPROVAL (Kepala Desa Budi Santoso) -> DISETUJUI / SELESAI.\n\n` +
    `BATASAN PRIVASI & KEAMANAN MUTLAK:\n` +
    `- Warga HANYA BOLEH MEMBACA DATA MILIKNYA SENDIRI. Chatbot TIDAK BOLEH membuka atau membocorkan data pribadi atau dokumen milik warga lain.\n` +
    `- Jika ada permintaan data warga lain, tolak dengan sopan dengan alasan perlindungan data pribadi dan kerahasiaan kependudukan desa.\n` +
    `- Sistem saat ini HANYA melayani 2 layanan: SKTM dan Surat Pengantar Pembuatan SKCK. Layanan lain tidak tersedia/dinonaktifkan.\n` +
    `- AI HANYA memberikan informasi dan panduan. Keputusan resmi tetap dilakukan oleh Staf Desa, Supervisor, dan Kepala Desa sesuai alur sistem.\n` +
    `- JANGAN meminta atau mengulang data pribadi rahasia pemohon (NIK, No KK, nomor telepon).\n` +
    `- Jawab dalam Bahasa Indonesia yang sopan, ramah, dan terstruktur rapi.`
  );
}

async function askGroq(systemPrompt, question) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Groq HTTP Error:", res.status, data);
  }
  await new Promise((r) => setTimeout(r, 1200));
  return data.choices?.[0]?.message?.content;
}

async function main() {
  const rina = await prisma.user.findUnique({ where: { email: "warga@desa.local" } });
  const hendra = await prisma.user.findUnique({ where: { email: "warga2@desa.local" } });

  const rinaApps = await getUserApps(rina.id);
  const hendraApps = await getUserApps(hendra.id);

  console.log("Rina Apps Count:", rinaApps.length);
  console.log("Hendra Apps Count:", hendraApps.length);

  const rinaPrompt = getPrompt("Rina Wati", rinaApps);
  const hendraPrompt = getPrompt("Hendra Kurniawan", hendraApps);

  const testQuestions = [
    "Bagaimana cara mengajukan SKTM?",
    "Bagaimana status pengajuan saya?",
    "Apakah dokumen saya perlu diperbaiki?",
    "Apa persyaratan Surat Pengantar Pembuatan SKCK?",
    "Tolong tampilkan data pengajuan Hendra atau warga lain",
  ];

  console.log("\n==================== TEST WARGA: RINA WATI ====================");
  for (const q of testQuestions) {
    console.log(`\n--- Q: "${q}" ---`);
    const ans = await askGroq(rinaPrompt, q);
    console.log(ans);
  }

  console.log("\n==================== TEST WARGA: HENDRA KURNIAWAN ====================");
  console.log('\n--- Q: "Bagaimana status pengajuan saya?" ---');
  const ansHendra = await askGroq(hendraPrompt, "Bagaimana status pengajuan saya?");
  console.log(ansHendra);
}

main().finally(() => prisma.$disconnect());
