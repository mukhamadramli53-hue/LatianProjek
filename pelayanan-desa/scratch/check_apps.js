const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const apps = await prisma.application.findMany({
    include: {
      user: { select: { name: true, nik: true } },
      service: { select: { code: true, name: true } },
      documents: true
    }
  });
  console.log('Applications in DB:');
  for (const a of apps) {
    console.log({
      nomor_pengajuan: a.nomor_pengajuan,
      service: a.service.code,
      user: a.user.name,
      status: a.status,
      createdAt: a.createdAt,
      documentsCount: a.documents.length
    });
  }
  await prisma.$disconnect();
}

main().catch(console.error);

