const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPastNotifications() {
  const notifs = await prisma.notification.findMany({
    include: {
      application: {
        select: {
          nomor_pengajuan: true,
          status: true,
          service: { select: { name: true } }
        }
      }
    }
  });

  for (const n of notifs) {
    let newTitle = n.title;
    let newMessage = n.message;
    const sName = n.application?.service?.name || 'Layanan Desa';
    const num = n.application?.nomor_pengajuan || 'Pengajuan';

    if (n.message.includes('berubah menjadi Review Supervisor')) {
      newTitle = 'Pemeriksaan Kendali Mutu (Supervisor)';
      newMessage = `Draf surat resmi untuk ${sName} (${num}) sedang ditelaah oleh Supervisor Desa guna memastikan akurasi data administrasi dan format baku desa sebelum diajukan ke Kepala Desa.`;
    } else if (n.message.includes('berubah menjadi Menunggu Approval')) {
      newTitle = 'Menunggu Pengesahan & Tanda Tangan Kepala Desa';
      newMessage = `Berkas permohonan ${sName} (${num}) telah lolos verifikasi kendali mutu dan saat ini berada di meja Kepala Desa untuk persetujuan akhir serta tanda tangan resmi.`;
    } else if (n.title.toLowerCase() === 'pengajuan disetujui') {
      newTitle = 'Pengajuan Telah Disetujui Kepala Desa';
      newMessage = `Kepala Desa telah memberikan persetujuan resmi atas permohonan ${sName} (${num}). Dokumen surat keputusan resmi bertanda tangan sedang disiapkan dan segera dikirimkan ke akun Anda.`;
    } else if (n.title.includes('Surat Resmi Telah Diterbitkan')) {
      newTitle = 'Surat Resmi Telah Diterbitkan & Siap Diunduh';
      newMessage = `Surat resmi untuk permohonan ${sName} (${num}) telah disahkan dan diunggah oleh Kepala Desa. Anda dapat langsung mengunduh dokumen PDF resmi desa.`;
    }

    if (newTitle !== n.title || newMessage !== n.message) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { title: newTitle, message: newMessage }
      });
      console.log(`Updated notification ${n.id} -> ${newTitle}`);
    }
  }

  console.log('Finished updating past notifications.');
}

cleanPastNotifications().finally(() => prisma.$disconnect());
