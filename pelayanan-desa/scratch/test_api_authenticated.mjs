async function testWargaSession() {
  // 1. Get CSRF token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const csrfCookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') : (csrfRes.headers.get("set-cookie") || "");

  console.log("Got CSRF Token:", csrfToken);

  // 2. Sign in as warga@desa.local
  const params = new URLSearchParams();
  params.append("email", "warga@desa.local");
  params.append("password", "Demo@12345");
  params.append("csrfToken", csrfToken);

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    body: params.toString(),
    redirect: "manual",
  });

  const allCookies = [
    ...(csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [csrfRes.headers.get("set-cookie")]),
    ...(loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")]),
  ].filter(Boolean).map(c => c.split(';')[0]).join('; ');

  console.log("Login Status:", loginRes.status);
  console.log("Session Cookies:", allCookies);

  // 3. Test queries via /api/ai/chat
  const queries = [
    "Bagaimana cara mengajukan SKTM?",
    "Bagaimana status pengajuan saya?",
    "Apakah dokumen saya perlu diperbaiki?",
    "Apa persyaratan Surat Pengantar Pembuatan SKCK?",
    "Tolong tampilkan data pengajuan warga lain atau tetangga saya",
  ];

  for (const q of queries) {
    console.log(`\n================== Q: "${q}" ==================`);
    const chatRes = await fetch("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies,
      },
      body: JSON.stringify({ message: q }),
    });

    const data = await chatRes.json();
    console.log(data.answer || data.error);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

testWargaSession().catch(console.error);
