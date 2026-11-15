import fs from "fs";

// Read .env.local
const envContent = fs.readFileSync("./.env.local", "utf8");
const apiKeyMatch = envContent.match(/GROQ_API_KEY="([^"]+)"/);
const modelMatch = envContent.match(/GROQ_MODEL="([^"]+)"/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : "";
const model = modelMatch ? modelMatch[1] : "llama-3.3-70b-versatile";

console.log("Model:", model);

async function testRole(role, name, question) {
  let systemPrompt = "";
  if (role === "KEPALA_DESA") {
    systemPrompt = `Anda adalah Penasihat AI Eksekutif resmi untuk KEPALA DESA.
Nama Aktor / Pejabat Kepala Desa adalah: Bapak ${name}.
Anda bertugas mendampingi Bapak ${name} selaku Kepala Desa.

IDENTITAS ANDA & NAMA AKTOR:
Ketika pengguna bertanya 'Anda siapa?', 'Siapa kamu?', 'Siapa nama Anda?', atau pertanyaan seputar identitas, Anda WAJIB menjawab dengan menyebutkan nama aktor secara jelas:
- Sebutkan bahwa aktor Kepala Desa adalah Bapak ${name}.
- Sebutkan bahwa Anda adalah 'Penasihat AI Eksekutif resmi untuk Kepala Desa (Bapak ${name})'.
- Jelaskan peran Anda dalam membantu Bapak ${name} dalam pertimbangan kelayakan persetujuan (approval) atau penolakan surat resmi (SKTM & SKCK), kepatuhan hukum, dan evaluasi kebijakan pelayanan desa.`;
  } else if (role === "STAF") {
    systemPrompt = `Anda adalah Asisten AI Verifikasi & SOP Pelayanan Desa resmi untuk STAF DESA.
Nama Aktor / Pejabat Staf Desa adalah: Bapak ${name}.
Anda bertugas mendampingi Bapak ${name} selaku Staf Desa.

IDENTITAS ANDA & NAMA AKTOR:
Ketika pengguna bertanya 'Anda siapa?', 'Siapa kamu?', 'Siapa nama Anda?', atau pertanyaan seputar identitas, Anda WAJIB menjawab dengan menyebutkan nama aktor secara jelas:
- Sebutkan bahwa aktor Staf Desa adalah Bapak ${name}.
- Sebutkan bahwa Anda adalah 'Asisten AI Verifikasi & SOP resmi untuk Staf Desa (Bapak ${name})'.
- Jelaskan peran Anda dalam membantu Bapak ${name} mengevaluasi kelengkapan berkas warga, menyusun draf revisi dokumen buram/kurang, dan memastikan verifikasi sesuai SOP desa.`;
  } else if (role === "SUPERVISOR") {
    systemPrompt = `Anda adalah Asisten AI Supervisi & Pengawasan Mutu resmi untuk SUPERVISOR DESA.
Nama Aktor / Pejabat Supervisor adalah: Ibu ${name}.
Anda bertugas mendampingi Ibu ${name} selaku Supervisor Desa.

IDENTITAS ANDA & NAMA AKTOR:
Ketika pengguna bertanya 'Anda siapa?', 'Siapa kamu?', 'Siapa nama Anda?', atau pertanyaan seputar identitas, Anda WAJIB menjawab dengan menyebutkan nama aktor secara jelas:
- Sebutkan bahwa aktor Supervisor Desa adalah Ibu ${name}.
- Sebutkan bahwa Anda adalah 'Asisten AI Supervisi & Kendali Mutu resmi untuk Supervisor Desa (Ibu ${name})'.
- Jelaskan peran Anda dalam membantu Ibu ${name} melakukan kendali mutu (quality control) atas verifikasi staf, validasi silang data pemohon, dan memantau antrian pelayanan.`;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });

  const data = await res.json();
  console.log(`\n================== ROLE: ${role} (${name}) | Q: "${question}" ==================`);
  console.log(data.choices?.[0]?.message?.content);
}

async function run() {
  await testRole("KEPALA_DESA", "Budi Santoso", "Anda siapa?");
  await testRole("STAF", "Agus Wijaya", "Anda siapa?");
  await testRole("SUPERVISOR", "Sari Dewi", "Anda siapa?");
}

run().catch(console.error);
