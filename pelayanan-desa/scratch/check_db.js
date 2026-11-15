const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const services = await prisma.service.findMany();
  console.log('Services in DB:', services.map(s => ({ id: s.id, code: s.code, name: s.name, isActive: s.isActive })));
  const docs = await prisma.knowledgeDocument.findMany();
  console.log('Knowledge docs count:', docs.length);
  const apps = await prisma.application.count();
  console.log('Total applications in DB:', apps);
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, email: true } });
  console.log('Users in DB:', users);
  await prisma.$disconnect();
}

main().catch(console.error);

