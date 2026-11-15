CREATE TABLE `knowledge_documents` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `kind` ENUM('FAQ', 'SOP', 'GENERAL') NOT NULL,
  `serviceId` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `knowledge_documents_kind_isActive_idx` (`kind`, `isActive`),
  INDEX `knowledge_documents_serviceId_isActive_idx` (`serviceId`, `isActive`),
  CONSTRAINT `knowledge_documents_serviceId_fkey`
    FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
