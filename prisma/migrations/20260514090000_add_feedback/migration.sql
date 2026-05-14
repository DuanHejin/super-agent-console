-- CreateTable
CREATE TABLE `Feedback` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(128) NULL,
    `content` TEXT NOT NULL,
    `contact` VARCHAR(255) NULL,
    `pageUrl` VARCHAR(512) NULL,
    `userAgent` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Feedback_createdAt_idx`(`createdAt`),
    INDEX `Feedback_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
