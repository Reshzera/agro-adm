/*
  Warnings:

  - A unique constraint covering the columns `[farmId,ruleId,scopeId]` on the table `farm_attention_item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "farm_attention_item_open_rule_scope_key";

-- CreateIndex
CREATE UNIQUE INDEX "farm_attention_item_open_rule_scope_key" ON "farm_attention_item"("farmId", "ruleId", "scopeId") WHERE (status IN ('NEW', 'SEEN'));
