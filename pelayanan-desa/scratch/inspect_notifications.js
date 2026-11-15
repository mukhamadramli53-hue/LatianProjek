const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifs = await prisma.notification.findMany({
    include: {
      application: {
        select: {
          nomor_pengajuan: true,
          status: true,
          service: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(notifs, null, 2));
}

main().finally(() => prisma.$disconnect());
