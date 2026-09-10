-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('MANUAL', 'WEB_AGENT', 'WHATSAPP_TEXT', 'WHATSAPP_AUDIO', 'WHATSAPP_IMAGE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'FEED_AND_SUPPLEMENT', 'FERTILIZER_AND_SEED', 'PESTICIDE', 'ANIMAL_HEALTH', 'PASTURE_AND_CROP_WORK', 'MACHINERY_AND_MAINTENANCE', 'LABOR', 'OTHER');

-- CreateEnum
CREATE TYPE "FarmAreaType" AS ENUM ('PASTURE', 'CROP_FIELD', 'OTHER');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT,
    "totalAreaHa" DECIMAL(12,2),
    "primaryActivity" TEXT,
    "location" TEXT,
    "agentContext" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "source" "EntrySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_allocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "areaId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "source" "EntrySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_action" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "pending_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_map_image" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_map_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_area" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "mapImageId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FarmAreaType" NOT NULL,
    "hectares" DECIMAL(10,2),
    "shape" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_phone_idx" ON "user"("phone");

-- CreateIndex
CREATE INDEX "farm_ownerUserId_idx" ON "farm"("ownerUserId");

-- CreateIndex
CREATE INDEX "chat_farmId_updatedAt_idx" ON "chat"("farmId", "updatedAt");

-- CreateIndex
CREATE INDEX "message_chatId_createdAt_idx" ON "message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "expense_farmId_date_idx" ON "expense"("farmId", "date");

-- CreateIndex
CREATE INDEX "expense_farmId_category_idx" ON "expense"("farmId", "category");

-- CreateIndex
CREATE INDEX "expense_allocation_expenseId_idx" ON "expense_allocation"("expenseId");

-- CreateIndex
CREATE INDEX "expense_allocation_areaId_idx" ON "expense_allocation"("areaId");

-- CreateIndex
CREATE INDEX "revenue_farmId_date_idx" ON "revenue"("farmId", "date");

-- CreateIndex
CREATE INDEX "pending_action_farmId_status_idx" ON "pending_action"("farmId", "status");

-- CreateIndex
CREATE INDEX "farm_map_image_farmId_idx" ON "farm_map_image"("farmId");

-- CreateIndex
CREATE INDEX "farm_area_farmId_idx" ON "farm_area"("farmId");

-- CreateIndex
CREATE INDEX "farm_area_mapImageId_idx" ON "farm_area"("mapImageId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_area_farmId_name_key" ON "farm_area"("farmId", "name");

-- AddForeignKey
ALTER TABLE "farm" ADD CONSTRAINT "farm_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocation" ADD CONSTRAINT "expense_allocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocation" ADD CONSTRAINT "expense_allocation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "farm_area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_action" ADD CONSTRAINT "pending_action_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_map_image" ADD CONSTRAINT "farm_map_image_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_area" ADD CONSTRAINT "farm_area_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_area" ADD CONSTRAINT "farm_area_mapImageId_fkey" FOREIGN KEY ("mapImageId") REFERENCES "farm_map_image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
