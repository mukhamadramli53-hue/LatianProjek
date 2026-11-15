const { answerQuestionWithDetails } = require('../src/lib/ai/service');

async function testQuery(question, role, userName, userId, provider = 'grok') {
  console.log('\n==================================================');
  console.log(`Q: "${question}" (Role: ${role || 'PUBLIC'}, User: ${userName || 'None'}, Provider: ${provider})`);
  try {
    const result = await answerQuestionWithDetails(question, [], role, userName, userId, { provider });
    console.log(`[Provider: ${result.provider}, Model: ${result.model}]`);
    console.log('A:', result.answer);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

async function run() {
  // Test 1: Public question about services
  await testQuery('Layanan apa saja yang ada di desa ini?');

  // Test 2: Public question about requirements
  await testQuery('Apa saja syarat untuk membuat SKTM?');

  // Test 3: Public question asking general info
  await testQuery('Berapa lama proses pembuatan SKCK?');

  // Test 4: Warga asking about their application (userId: Rina Wati)
  await testQuery('Bagaimana status pengajuan saya?', 'WARGA', 'Rina Wati', 'cmtl8lus20003ez267kky7vv6');

  // Test 5: Warga asking about specific application
  await testQuery('Bagaimana status berkas PD-202610-0001?', 'WARGA', 'Rina Wati', 'cmtl8lus20003ez267kky7vv6');

  // Test 6: Kades asking about summary / database
  await testQuery('Berapa total pengajuan yang masuk dan bagaimana statusnya?', 'KEPALA_DESA', 'Budi Santoso', 'cmtl8lull0000ez26yd7r0xec');

  // Test 7: Kades asking about residents / demografi
  await testQuery('Berapa jumlah warga yang terdaftar di database desa dan bagaimana rinciannya?', 'KEPALA_DESA', 'Budi Santoso', 'cmtl8lull0000ez26yd7r0xec');
}

run().catch(console.error);

