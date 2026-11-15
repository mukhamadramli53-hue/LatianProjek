ALTER TABLE `applications`
  MODIFY `status` ENUM('DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES', 'REVIEW_SUPERVISOR', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'SELESAI', 'PERLU_PERBAIKAN', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN';

CREATE TABLE `application_histories` (
  `id` VARCHAR(191) NOT NULL,
  `application_id` VARCHAR(191) NOT NULL,
  `actor_id` VARCHAR(191) NOT NULL,
  `oldStatus` ENUM('DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES', 'REVIEW_SUPERVISOR', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'SELESAI', 'PERLU_PERBAIKAN', 'DITOLAK') NULL,
  `newStatus` ENUM('DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES', 'REVIEW_SUPERVISOR', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'SELESAI', 'PERLU_PERBAIKAN', 'DITOLAK') NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `application_histories_application_id_createdAt_idx` (`application_id`, `createdAt`),
  INDEX `application_histories_actor_id_idx` (`actor_id`),
  CONSTRAINT `application_histories_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `application_histories_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;