-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `password` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `nik` VARCHAR(191) NULL,
    `role` ENUM('WARGA', 'STAF', 'SUPERVISOR', 'KEPALA_DESA') NOT NULL DEFAULT 'WARGA',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_nik_key`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `accounts_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_tokens_token_key`(`token`),
    UNIQUE INDEX `verification_tokens_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `requirements` JSON NULL,
    `form_schema` JSON NULL,
    `estimatedTime` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `services_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_requests` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `details` JSON NOT NULL,
    `notes` VARCHAR(191) NULL,
    `processedById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_requests_requestNumber_key`(`requestNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_histories` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('DRAFT', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'COMPLETED') NULL,
    `newStatus` ENUM('DRAFT', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applications` (
    `id` VARCHAR(191) NOT NULL,
    `nomor_pengajuan` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `status` ENUM('DIAJUKAN', 'DIPROSES', 'SELESAI', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN',
    `form_data` JSON NOT NULL,
    `notes` TEXT NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `applications_nomor_pengajuan_key`(`nomor_pengajuan`),
    INDEX `applications_userId_idx`(`userId`),
    INDEX `applications_serviceId_idx`(`serviceId`),
    INDEX `applications_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_documents` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `requirement_name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `storage_key` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `application_documents_storage_key_key`(`storage_key`),
    INDEX `application_documents_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_histories` ADD CONSTRAINT `request_histories_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_histories` ADD CONSTRAINT `request_histories_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `service_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
