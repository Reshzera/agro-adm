-- A retried outbox delivery must not duplicate a rule's effect.
CREATE UNIQUE INDEX "rule_evaluation_triggerEventId_ruleId_ruleVersion_key"
ON "rule_evaluation"("triggerEventId", "ruleId", "ruleVersion");
