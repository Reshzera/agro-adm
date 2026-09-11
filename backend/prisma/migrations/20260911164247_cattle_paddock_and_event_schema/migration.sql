-- CreateEnum
CREATE TYPE "CattleCategory" AS ENUM ('CALVES', 'HEIFERS', 'COWS', 'BULLS', 'STEERS', 'FINISHING');

-- CreateEnum
CREATE TYPE "CattleSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CattleAnimalStatus" AS ENUM ('ACTIVE', 'SOLD', 'DECEASED', 'TRANSFERRED', 'MISSING');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'AGENT', 'SYSTEM', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "DomainEventSource" AS ENUM ('WEB', 'AGENT', 'SYSTEM', 'IMPORT', 'INTEGRATION', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RuleEvaluationStatus" AS ENUM ('PASSED', 'TRIGGERED', 'INSUFFICIENT_DATA', 'ERROR');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AttentionItemStatus" AS ENUM ('NEW', 'SEEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AttentionScopeType" AS ENUM ('FARM', 'PADDOCK', 'LOT', 'ANIMAL');

-- AlterTable
ALTER TABLE "farm" ADD COLUMN     "defaultMaxGrazingDays" INTEGER,
ADD COLUMN     "defaultMinRestDays" INTEGER,
ADD COLUMN     "defaultStockingRateHeadPerHa" DECIMAL(8,2),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "farm_area" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "forageType" TEXT,
ADD COLUMN     "maxGrazingDays" INTEGER,
ADD COLUMN     "minRestDays" INTEGER,
ADD COLUMN     "plannedCapacityHead" INTEGER,
ADD COLUMN     "usableAreaHa" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "cattle_lot" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CattleCategory" NOT NULL,
    "purpose" TEXT,
    "headCount" INTEGER NOT NULL DEFAULT 0,
    "startedOn" DATE,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cattle_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cattle_animal" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "lotId" TEXT,
    "visualTag" TEXT,
    "electronicTag" TEXT,
    "sex" "CattleSex" NOT NULL,
    "breed" TEXT,
    "bornOn" DATE,
    "origin" TEXT,
    "acquiredOn" DATE,
    "acquisitionCost" DECIMAL(14,2),
    "status" "CattleAnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "sireId" TEXT,
    "damId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cattle_animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paddock_occupancy" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "paddockId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paddock_occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cattle_movement" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "fromPaddockId" TEXT,
    "toPaddockId" TEXT NOT NULL,
    "headCount" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "source" "DomainEventSource" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "correlationId" TEXT NOT NULL,

    CONSTRAINT "cattle_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_event" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "source" "DomainEventSource" NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_message" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_evaluation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "triggerEventId" TEXT,
    "correlationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "status" "RuleEvaluationStatus" NOT NULL,
    "severity" "RuleSeverity",
    "scopeType" "AttentionScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "configSnapshot" JSONB,
    "suggestedAction" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "errorCode" TEXT,

    CONSTRAINT "rule_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_attention_item" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "scopeType" "AttentionScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "ruleEvaluationId" TEXT,
    "correlationId" TEXT,
    "category" TEXT NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "titleCode" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "suggestedAction" JSONB,
    "status" "AttentionItemStatus" NOT NULL DEFAULT 'NEW',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "farm_attention_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_key" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cattle_lot_farmId_active_idx" ON "cattle_lot"("farmId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "cattle_lot_farmId_name_key" ON "cattle_lot"("farmId", "name");

-- CreateIndex
CREATE INDEX "cattle_animal_farmId_status_idx" ON "cattle_animal"("farmId", "status");

-- CreateIndex
CREATE INDEX "cattle_animal_lotId_idx" ON "cattle_animal"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "cattle_animal_farmId_visualTag_key" ON "cattle_animal"("farmId", "visualTag");

-- CreateIndex
CREATE UNIQUE INDEX "cattle_animal_farmId_electronicTag_key" ON "cattle_animal"("farmId", "electronicTag");

-- CreateIndex
CREATE INDEX "paddock_occupancy_farmId_startedAt_idx" ON "paddock_occupancy"("farmId", "startedAt");

-- CreateIndex
CREATE INDEX "paddock_occupancy_paddockId_startedAt_idx" ON "paddock_occupancy"("paddockId", "startedAt");

-- CreateIndex
CREATE INDEX "paddock_occupancy_lotId_startedAt_idx" ON "paddock_occupancy"("lotId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "paddock_occupancy_open_lot_key" ON "paddock_occupancy"("lotId") WHERE ("endedAt" IS NULL);

-- CreateIndex
CREATE INDEX "cattle_movement_farmId_occurredAt_idx" ON "cattle_movement"("farmId", "occurredAt");

-- CreateIndex
CREATE INDEX "cattle_movement_lotId_occurredAt_idx" ON "cattle_movement"("lotId", "occurredAt");

-- CreateIndex
CREATE INDEX "cattle_movement_toPaddockId_occurredAt_idx" ON "cattle_movement"("toPaddockId", "occurredAt");

-- CreateIndex
CREATE INDEX "cattle_movement_correlationId_idx" ON "cattle_movement"("correlationId");

-- CreateIndex
CREATE INDEX "domain_event_farmId_occurredAt_idx" ON "domain_event"("farmId", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_event_aggregateType_aggregateId_occurredAt_idx" ON "domain_event"("aggregateType", "aggregateId", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_event_correlationId_idx" ON "domain_event"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_message_eventId_key" ON "outbox_message"("eventId");

-- CreateIndex
CREATE INDEX "outbox_message_status_availableAt_idx" ON "outbox_message"("status", "availableAt");

-- CreateIndex
CREATE INDEX "rule_evaluation_farmId_evaluatedAt_idx" ON "rule_evaluation"("farmId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "rule_evaluation_correlationId_idx" ON "rule_evaluation"("correlationId");

-- CreateIndex
CREATE INDEX "rule_evaluation_ruleId_evaluatedAt_idx" ON "rule_evaluation"("ruleId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "farm_attention_item_farmId_status_severity_idx" ON "farm_attention_item"("farmId", "status", "severity");

-- CreateIndex
CREATE INDEX "farm_attention_item_correlationId_idx" ON "farm_attention_item"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_attention_item_open_rule_scope_key" ON "farm_attention_item"("farmId", "ruleId", "scopeId") WHERE (status IN ('NEW', 'SEEN'));

-- CreateIndex
CREATE INDEX "idempotency_key_expiresAt_idx" ON "idempotency_key"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_key_farmId_scope_key_key" ON "idempotency_key"("farmId", "scope", "key");

-- AddForeignKey
ALTER TABLE "cattle_lot" ADD CONSTRAINT "cattle_lot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_animal" ADD CONSTRAINT "cattle_animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_animal" ADD CONSTRAINT "cattle_animal_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "cattle_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_animal" ADD CONSTRAINT "cattle_animal_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "cattle_animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_animal" ADD CONSTRAINT "cattle_animal_damId_fkey" FOREIGN KEY ("damId") REFERENCES "cattle_animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paddock_occupancy" ADD CONSTRAINT "paddock_occupancy_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paddock_occupancy" ADD CONSTRAINT "paddock_occupancy_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "cattle_lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paddock_occupancy" ADD CONSTRAINT "paddock_occupancy_paddockId_fkey" FOREIGN KEY ("paddockId") REFERENCES "farm_area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_movement" ADD CONSTRAINT "cattle_movement_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_movement" ADD CONSTRAINT "cattle_movement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "cattle_lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_movement" ADD CONSTRAINT "cattle_movement_fromPaddockId_fkey" FOREIGN KEY ("fromPaddockId") REFERENCES "farm_area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cattle_movement" ADD CONSTRAINT "cattle_movement_toPaddockId_fkey" FOREIGN KEY ("toPaddockId") REFERENCES "farm_area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_event" ADD CONSTRAINT "domain_event_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_message" ADD CONSTRAINT "outbox_message_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "domain_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_evaluation" ADD CONSTRAINT "rule_evaluation_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_evaluation" ADD CONSTRAINT "rule_evaluation_triggerEventId_fkey" FOREIGN KEY ("triggerEventId") REFERENCES "domain_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_attention_item" ADD CONSTRAINT "farm_attention_item_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_attention_item" ADD CONSTRAINT "farm_attention_item_ruleEvaluationId_fkey" FOREIGN KEY ("ruleEvaluationId") REFERENCES "rule_evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
