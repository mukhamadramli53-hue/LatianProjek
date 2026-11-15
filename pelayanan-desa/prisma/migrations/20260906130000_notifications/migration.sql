CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NULL,
  `type` ENUM('APPLICATION_CREATED', 'STATUS_CHANGED', 'DOCUMENT_REPAIR', 'APPROVED', 'COMPLETED') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `notifications_userId_isRead_createdAt_idx` (`userId`, `isRead`, `createdAt`),
  INDEX `notifications_applicationId_createdAt_idx` (`applicationId`, `createdAt`),
  CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notifications_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
