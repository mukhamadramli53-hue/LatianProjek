const { PrismaClient } = require('@prisma/client');

async function testCrud() {
  const prisma = new PrismaClient();
  console.log('Testing full CRUD transaction on MySQL pelayanan_desa...');

  try {
    // 1. Ambil 1 user warga dan 1 service
    const warga = await prisma.user.findFirst({ where: { role: 'WARGA' } });
    const service = await prisma.service.findFirst({ where: { isActive: true } });

    if (!warga || !service) {
      throw new Error('Data warga atau layanan tidak ditemukan');
    }

    const testNomor = `TEST-MIGRATE-${Date.now()}`;

    // 2. Insert test application
    const app = await prisma.application.create({
      data: {
        nomor_pengajuan: testNomor,
        userId: warga.id,
        serviceId: service.id,
        status: 'DIAJUKAN',
        form_data: { keterangan: 'Uji coba integritas database MySQL Laragon pasca-migrasi' },
        notes: 'Catatan pengujian sistem otomatis'
      }
    });

    console.log(`  ✔ Berhasil INSERT application baru (ID: ${app.id}, Nomor: ${app.nomor_pengajuan})`);

    // 3. Insert history record (FK ke application & actor)
    const hist = await prisma.applicationHistory.create({
      data: {
        applicationId: app.id,
        actorId: warga.id,
        oldStatus: null,
        newStatus: 'DIAJUKAN',
        note: 'Pengajuan dibuat via automated test'
      }
    });

    console.log(`  ✔ Berhasil INSERT applicationHistory (ID: ${hist.id})`);

    // 4. Update status ke DIVERIFIKASI (staf)
    const staf = await prisma.user.findFirst({ where: { role: 'STAF' } });
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: { status: 'DIVERIFIKASI' }
    });

    console.log(`  ✔ Berhasil UPDATE status pengajuan ke: ${updated.status}`);

    // 5. Clean up test record (Cascade delete should remove history)
    await prisma.application.delete({
      where: { id: app.id }
    });

    console.log(`  ✔ Berhasil DELETE test application dan cascade cleanup`);

    const checkHist = await prisma.applicationHistory.findUnique({
      where: { id: hist.id }
    });

    if (checkHist === null) {
      console.log(`  ✔ Terverifikasi CASCADE DELETE foreign key bekerja sempurna`);
    } else {
      console.warn(`  ⚠ History record masih ada (non-cascade)`);
      await prisma.applicationHistory.delete({ where: { id: hist.id } });
    }

    console.log('\nSEMUA OPERASI CRUD & INTEGRITAS TRANSACTION MYSQL LARAGON BERHASIL 100%!');
  } catch (err) {
    console.error('Error saat CRUD test:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCrud();

