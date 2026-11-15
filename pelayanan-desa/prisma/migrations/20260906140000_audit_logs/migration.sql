CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `action` ENUM('LOGIN', 'LOGOUT', 'CREATE_APPLICATION', 'STATUS_CHANGE', 'APPROVE_APPLICATION', 'REJECT_APPLICATION', 'UPDATE_SERVICE', 'CREATE_SERVICE', 'TOGGLE_SERVICE', 'UPDATE_USER', 'CHANGE_USER_ROLE') NOT NULL,
  `entity` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_createdAt_idx` (`createdAt`),
  INDEX `audit_logs_actorId_createdAt_idx` (`actorId`, `createdAt`),
  INDEX `audit_logs_action_entity_idx` (`action`, `entity`),
  CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
