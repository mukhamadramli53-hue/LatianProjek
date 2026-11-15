ALTER TABLE `application_documents`
  ADD COLUMN `uploadedById` VARCHAR(191) NULL,
  ADD INDEX `application_documents_uploadedById_idx` (`uploadedById`),
  ADD CONSTRAINT `application_documents_uploadedById_fkey`
    FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
