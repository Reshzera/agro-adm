-- CreateEnum
CREATE TYPE "ChatSource" AS ENUM ('WEB', 'WHATSAPP');

-- AlterTable
ALTER TABLE "chat"
ADD COLUMN "source" "ChatSource" NOT NULL DEFAULT 'WEB',
ADD COLUMN "archivedAt" TIMESTAMP(3);

-- ReplaceIndex
DROP INDEX "chat_farmId_updatedAt_idx";
CREATE INDEX "chat_farmId_archivedAt_updatedAt_idx" ON "chat"("farmId", "archivedAt", "updatedAt");
