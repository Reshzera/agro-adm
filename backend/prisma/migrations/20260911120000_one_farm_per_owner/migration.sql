-- ReplaceIndex
DROP INDEX "farm_ownerUserId_idx";
CREATE UNIQUE INDEX "farm_ownerUserId_key" ON "farm"("ownerUserId");
