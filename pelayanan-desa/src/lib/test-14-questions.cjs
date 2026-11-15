require("ts-node").register({ compilerOptions: { module: "CommonJS" } });

const assert = require("node:assert/strict");
const { answerQuestionWithDetails } = require("./ai/service.ts");

async function run14QuestionsVerification() {
  console.log("======================================================================");
  console.log("PENGUJIAN RESMI 14 PERTANYAAN (SECTION 11) - KEPALA DESA & MULTI-TURN");
  console.log("======================================================================\n");

  const conversationHistory = [];

  const questions = [
    {
      no: 1,
      q: "Berapa total seluruh pengajuan saat ini?",
      check: (ans) => ans.includes("9") && (ans.includes("SKTM") || ans.includes("SKCK") || ans.includes("seluruh")),
      expected: "Total 9 berkas pengajuan",
    },
    {
      no: 2,
      q: "Berapa pengajuan SKTM dan berapa pengajuan SKCK?",
      check: (ans) => ans.includes("3") && ans.includes("6") && ans.includes("SKTM") && ans.includes("SKCK"),
      expected: "SKTM: 3 berkas, SKCK: 6 berkas",
    },
    {
      no: 3,
      q: "Layanan apa yang paling banyak digunakan?",
      check: (ans) => ans.includes("SKCK") && (ans.includes("banyak") || ans.includes("6")),
      expected: "Surat Pengantar SKCK paling banyak (6 berkas)",
    },
    {
      no: 4,
      q: "Berapa rata-rata waktu penyelesaian layanan?",
      check: (ans) => (ans.includes("0.5") || ans.includes("0,5") || ans.includes("12") || ans.includes("hari")) && ans.includes("SLA"),
      expected: "Rata-rata 0.5 hari kerja (~12 jam)",
    },
    {
      no: 5,
      q: "Berapa pengajuan yang belum diverifikasi staf?",
      check: (ans) => (ans.includes("2") || ans.includes("dua")) && (ans.includes("DIAJUKAN") || ans.includes("Agus") || ans.includes("staf")),
      expected: "2 berkas belum diverifikasi staf (status DIAJUKAN)",
    },
    {
      no: 6,
      q: "Tampilkan datanya.",
      check: (ans) => ans.includes("PD-202610-0009") && ans.includes("PD-202610-0012"),
      expected: "Rincian nomor pengajuan PD-202610-0009 dan PD-202610-0012",
    },
    {
      no: 7,
      q: "Siapa yang mengajukan pengajuan tersebut?",
      check: (ans) => ans.includes("Rina Wati") || ans.includes("Rina"),
      expected: "Pemohon adalah Ibu Rina Wati",
    },
    {
      no: 8,
      q: "Sudah berapa lama pengajuan itu menunggu?",
      check: (ans) => ans.includes("21 Oktober") || ans.includes("23 Oktober") || ans.includes("hari") || ans.includes("menunggu"),
      expected: "Informasi tanggal pengajuan (21 & 23 Okt 2026 / durasi menunggu)",
    },
    {
      no: 9,
      q: "Dari data tadi, mana pengajuan yang paling lama menunggu?",
      check: (ans) => ans.includes("PD-202610-0009") && (ans.includes("21 Oktober") || ans.includes("lama") || ans.includes("terlama")),
      expected: "PD-202610-0009 (diajukan 21 Oktober 2026)",
    },
    {
      no: 10,
      q: "Berapa pengajuan yang menunggu persetujuan saya?",
      check: (ans) => (ans.includes("0") || ans.includes("tidak ada") || ans.includes("bersih")) && ans.includes("persetujuan"),
      expected: "0 berkas menunggu persetujuan Kades (MENUNGGU_APPROVAL)",
    },
    {
      no: 11,
      q: "Bandingkan pengajuan bulan ini dan bulan lalu.",
      check: (ans) => (ans.includes("Bulan Ini") || ans.includes("November")) && (ans.includes("Bulan Lalu") || ans.includes("Oktober")),
      expected: "Bulan ini (Nov: 0 berkas) vs Bulan lalu (Okt: 9 berkas)",
    },
    {
      no: 12,
      q: "Bagaimana dengan SKTM?",
      check: (ans) => ans.includes("SKTM") && ans.includes("3") && (ans.includes("2") || ans.includes("disetujui")),
      expected: "SKTM total 3 berkas (2 disetujui, 1 perlu perbaikan)",
    },
    {
      no: 13,
      q: "Jelaskan fungsi menu Master Layanan.",
      check: (ans) => (ans.includes("layanan") || ans.includes("surat")) && (ans.includes("persyaratan") || ans.includes("SLA") || ans.includes("form") || ans.includes("SKTM")),
      expected: "Penjelasan menu Master Layanan (/kades/layanan)",
    },
    {
      no: 14,
      q: "Buatkan ringkasan pelayanan hari ini.",
      check: (ans) => (ans.includes("Hari Ini") || ans.includes("ringkasan") || ans.includes("Ringkasan")) && (ans.includes("9") || ans.includes("0") || ans.includes("staf")),
      expected: "Ringkasan eksekutif transaksi pelayanan hari ini",
    },
  ];

  let successCount = 0;

  for (const item of questions) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Pertanyaan #${item.no}: "${item.q}"`);
    console.log(`Harapan: ${item.expected}`);

    const res = await answerQuestionWithDetails(
      item.q,
      conversationHistory,
      "KEPALA_DESA",
      "Budi Santoso",
      undefined,
      { provider: "grok" }
    );

    console.log(`Provider: ${res.provider} | Model: ${res.model}`);
    console.log(`Jawaban Bot:\n${res.answer.slice(0, 300)}...`);

    const passed = item.check(res.answer);
    if (passed) {
      console.log(`✅ HASIL: LULUS (Akurat & Sesuai Database)`);
      successCount++;
    } else {
      console.log(`❌ HASIL: GAGAL`);
      console.log(`Isi Jawaban Lengkap:\n${res.answer}`);
    }

    // Tambahkan pertanyaan dan jawaban ke conversation history untuk multi-turn continuity
    conversationHistory.push({ role: "user", content: item.q });
    conversationHistory.push({ role: "assistant", content: res.answer });
  }

  console.log("\n======================================================================");
  console.log(`HASIL AKHIR: ${successCount} dari ${questions.length} pertanyaan berhasil terverifikasi!`);
  console.log("======================================================================\n");

  assert.equal(successCount, questions.length, "Semua 14 pertanyaan harus lulus verifikasi!");
}

run14QuestionsVerification().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

