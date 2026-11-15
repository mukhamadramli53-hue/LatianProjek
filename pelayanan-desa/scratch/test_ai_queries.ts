import { answerQuestionWithDetails } from '../src/lib/ai/service';
import type { Role } from '@prisma/client';

async function testQuery(question: string, role?: Role, userName?: string, userId?: string, provider: 'grok' | 'gemini' = 'grok') {
  console.log('\n==================================================');
  console.log(`Q: "${question}" (Role: ${role || 'PUBLIC'}, User: ${userName || 'None'}, Provider: ${provider})`);
  try {
    const result = await answerQuestionWithDetails(question, [], role, userName, userId, { provider });
    console.log(`[Provider: ${result.provider}, Model: ${result.model}]`);
    console.log('A:\n', result.answer);
  } catch (err: any) {
    console.error('ERROR:', err.message);
  }
}

async function run() {
  await testQuery('Layanan apa saja yang ada di desa ini?');
  await testQuery('Apa saja syarat untuk membuat SKTM?');
  await testQuery('Bagaimana status pengajuan saya?', 'WARGA' as Role, 'Rina Wati', 'cmtl8lus20003ez267kky7vv6');
  await testQuery('Berapa total pengajuan yang masuk dan bagaimana statusnya?', 'KEPALA_DESA' as Role, 'Budi Santoso', 'cmtl8lull0000ez26yd7r0xec');
  await testQuery('Berapa jumlah warga yang terdaftar di database desa dan bagaimana rinciannya?', 'KEPALA_DESA' as Role, 'Budi Santoso', 'cmtl8lull0000ez26yd7r0xec');
}

run().catch(console.error);

