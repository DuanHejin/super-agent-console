-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Conversation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(64) NOT NULL,
    `conversationId` VARCHAR(64) NOT NULL,
    `role` ENUM('system', 'developer', 'user', 'assistant', 'tool') NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Message_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentRun` (
    `id` VARCHAR(64) NOT NULL,
    `conversationId` VARCHAR(64) NOT NULL,
    `messageId` VARCHAR(64) NOT NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `status` ENUM('created', 'running', 'model_calling', 'tool_calling', 'skill_running', 'generating', 'completed', 'failed') NOT NULL DEFAULT 'created',
    `input` TEXT NOT NULL,
    `finalAnswer` TEXT NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AgentRun_messageId_key`(`messageId`),
    INDEX `AgentRun_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `AgentRun_traceId_idx`(`traceId`),
    INDEX `AgentRun_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentEvent` (
    `id` VARCHAR(64) NOT NULL,
    `eventId` VARCHAR(64) NOT NULL,
    `runId` VARCHAR(64) NOT NULL,
    `toolCallId` VARCHAR(64) NULL,
    `skillRunId` VARCHAR(64) NULL,
    `conversationId` VARCHAR(64) NOT NULL,
    `messageId` VARCHAR(64) NOT NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `status` ENUM('created', 'running', 'model_calling', 'tool_calling', 'skill_running', 'generating', 'completed', 'failed') NOT NULL,
    `name` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `data` JSON NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AgentEvent_eventId_key`(`eventId`),
    INDEX `AgentEvent_runId_createdAt_idx`(`runId`, `createdAt`),
    INDEX `AgentEvent_traceId_idx`(`traceId`),
    INDEX `AgentEvent_eventType_idx`(`eventType`),
    UNIQUE INDEX `AgentEvent_runId_sequence_key`(`runId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ToolCall` (
    `id` VARCHAR(64) NOT NULL,
    `toolCallId` VARCHAR(64) NOT NULL,
    `runId` VARCHAR(64) NOT NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `toolName` VARCHAR(128) NOT NULL,
    `arguments` JSON NOT NULL,
    `result` JSON NULL,
    `status` ENUM('created', 'running', 'completed', 'failed') NOT NULL DEFAULT 'created',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ToolCall_toolCallId_key`(`toolCallId`),
    INDEX `ToolCall_runId_createdAt_idx`(`runId`, `createdAt`),
    INDEX `ToolCall_traceId_idx`(`traceId`),
    INDEX `ToolCall_toolName_idx`(`toolName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SkillRun` (
    `id` VARCHAR(64) NOT NULL,
    `skillRunId` VARCHAR(64) NOT NULL,
    `runId` VARCHAR(64) NOT NULL,
    `toolCallId` VARCHAR(64) NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `stepId` VARCHAR(128) NOT NULL,
    `skillName` VARCHAR(128) NOT NULL,
    `input` JSON NOT NULL,
    `result` JSON NULL,
    `status` ENUM('created', 'running', 'completed', 'failed') NOT NULL DEFAULT 'created',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SkillRun_skillRunId_key`(`skillRunId`),
    INDEX `SkillRun_runId_createdAt_idx`(`runId`, `createdAt`),
    INDEX `SkillRun_toolCallId_createdAt_idx`(`toolCallId`, `createdAt`),
    INDEX `SkillRun_traceId_idx`(`traceId`),
    INDEX `SkillRun_skillName_idx`(`skillName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdempotencyRecord` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(128) NOT NULL,
    `clientRequestId` VARCHAR(128) NOT NULL,
    `conversationId` VARCHAR(64) NOT NULL,
    `messageId` VARCHAR(64) NOT NULL,
    `runId` VARCHAR(64) NOT NULL,
    `response` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IdempotencyRecord_runId_idx`(`runId`),
    UNIQUE INDEX `IdempotencyRecord_userId_clientRequestId_key`(`userId`, `clientRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentRun` ADD CONSTRAINT `AgentRun_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentRun` ADD CONSTRAINT `AgentRun_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentEvent` ADD CONSTRAINT `AgentEvent_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `AgentRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentEvent` ADD CONSTRAINT `AgentEvent_toolCallId_fkey` FOREIGN KEY (`toolCallId`) REFERENCES `ToolCall`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentEvent` ADD CONSTRAINT `AgentEvent_skillRunId_fkey` FOREIGN KEY (`skillRunId`) REFERENCES `SkillRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ToolCall` ADD CONSTRAINT `ToolCall_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `AgentRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SkillRun` ADD CONSTRAINT `SkillRun_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `AgentRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SkillRun` ADD CONSTRAINT `SkillRun_toolCallId_fkey` FOREIGN KEY (`toolCallId`) REFERENCES `ToolCall`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
