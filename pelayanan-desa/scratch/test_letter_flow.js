const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function testFlow() {
  const kades = await prisma.user.findFirst({ where: { role: 'KEPALA_DESA' } });
  const app = await prisma.application.findFirst({ where: { status: 'DISETUJUI' } });
  console.log('App found:', app?.nomor_pengajuan, 'Kades:', kades?.name);

  // Check upload dir
  const uploadDir = path.join(process.cwd(), 'private_uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storageKey = 'test-official-letter-' + Date.now();
  const filePath = path.join(uploadDir, storageKey + '.pdf');
  fs.writeFileSync(filePath, '%PDF-1.4\n%Test official letter PDF\n%%EOF');

  const doc = await prisma.applicationDocument.create({
    data: {
      applicationId: app.id,
      uploadedById: kades.id,
      requirement_name: 'Surat Resmi Terbit (PDF)',
      file_name: 'Surat_Keterangan_Resmi_Kades.pdf',
      storage_key: storageKey,
      mime_type: 'application/pdf',
      file_size: fs.statSync(filePath).size,
    }
  });

  console.log('Document created:', doc.requirement_name, 'storage_key:', doc.storage_key);

  const updatedApp = await prisma.application.findUnique({
    where: { id: app.id },
    include: { documents: true }
  });

  const letter = updatedApp.documents.find(d => d.requirement_name.includes('Surat Resmi'));
  console.log('Verified official letter on application:', Boolean(letter), letter?.file_name);
}

testFlow().finally(() => prisma.$disconnect());
