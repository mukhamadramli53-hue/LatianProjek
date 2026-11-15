# Sistem Pelayanan Desa

Platform Next.js untuk pengajuan layanan administrasi desa, tracking status, notifikasi, AI assistant berbasis data resmi, pelaporan, dan audit log.

## Menjalankan project

Prasyarat: Node.js 20+, MySQL 8+, dan npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

## Environment variables

- `DATABASE_URL`: connection string MySQL.
- `AUTH_SECRET`: secret acak minimal 32 karakter; wajib diganti di production.
- `NEXTAUTH_URL`: URL aplikasi.
- `AI_PROVIDER`: provider abstraction, saat ini `openai-compatible`.
- `AI_API_KEY`: API key server-side; jangan gunakan prefix `NEXT_PUBLIC_`.
- `AI_API_URL`: endpoint chat provider.
- `AI_MODEL`: nama model provider.

Jangan commit `.env.local`. Gunakan secret manager pada production dan rotasi `AUTH_SECRET` jika pernah terekspos.

## Database setup

```bash
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

Migration mencakup pengajuan, histori workflow, notifikasi, knowledge document AI, audit log, dan ownership dokumen upload.

Untuk production, gunakan MySQL managed dengan backup otomatis harian, point-in-time recovery bila tersedia, uji restore berkala, dan retensi backup sesuai kebijakan desa. Folder `private_uploads` juga harus dicadangkan terenkripsi atau dipindahkan ke object storage private.

## Seed data

```bash
npm run db:seed
```

Seed membuat akun contoh untuk Warga, Staf, Supervisor, dan Kepala Desa. Ganti password akun seed sebelum deployment.

## Test, lint, dan build

```bash
npm run lint
npm run test
npm run build
```

Test workflow berada di `src/lib/workflow.test.cjs`. Build menjalankan type-check TypeScript Next.js.

## Struktur project

- `src/app`: App Router, halaman role, API route, dan export CSV.
- `src/components`: komponen UI dan form.
- `src/lib/actions`: server actions dengan authorization dan query Prisma.
- `src/lib/ai`: provider abstraction dan retrieval knowledge resmi.
- `src/lib/audit.ts`: penulisan audit log server-side.
- `prisma/schema.prisma`: model dan relasi database.
- `prisma/migrations`: migration database berurutan.
- `private_uploads`: storage dokumen lokal, tidak boleh diekspos sebagai folder publik.

## Role pengguna

- **WARGA**: membuat dan melihat pengajuan sendiri, upload dokumen, notifikasi, dan AI assistant.
- **STAF**: verifikasi, memproses, dan menyelesaikan tahap operasional.
- **SUPERVISOR**: review, monitoring, laporan, dan audit read-only.
- **KEPALA_DESA**: approval, penolakan, master layanan, laporan, audit, dan pengelolaan user.

Authorization selalu diperiksa di server. Status workflow tidak boleh diubah langsung oleh browser.

## Arsitektur singkat

UI Next.js memanggil server actions/API route. Auth.js menyediakan session, Prisma menjadi source of truth, dan MySQL menyimpan data transaksi. Setiap perubahan workflow ditulis atomik ke histori, notifikasi, dan audit log. Laporan membaca data pengajuan langsung dari database dan dapat diekspor ke CSV.

Dokumen upload menggunakan UUID storage key, ownership uploader, validasi ukuran/MIME di backend, serta endpoint file yang melakukan authorization.

## Mengaktifkan AI

Isi variable berikut pada `.env.local`:

```env
AI_PROVIDER="openai-compatible"
AI_API_KEY="..."
AI_API_URL="https://api.openai.com/v1/chat/completions"
AI_MODEL="gpt-4o-mini"
```

AI hanya menerima konteks layanan, persyaratan, FAQ/SOP, dan informasi umum resmi. AI tidak mengambil keputusan approval dan mengarahkan warga ke petugas jika informasi tidak tersedia.
