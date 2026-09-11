import type { CattleCategory } from "./responses";

export type CattleLotPayload = {
  name: string;
  category: CattleCategory;
  headCount: number;
  purpose?: string | null;
  startedOn?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type PaddockPayload = {
  name: string;
  hectares?: string | null;
  usableAreaHa?: string | null;
  maxGrazingDays?: number | null;
  minRestDays?: number | null;
  plannedCapacityHead?: number | null;
  forageType?: string | null;
  active?: boolean;
};

export type CattleMovementPayload = {
  lotId: string;
  fromPaddockId: string;
  toPaddockId: string;
  occurredAt: string;
  reason?: string | null;
  notes?: string | null;
  idempotencyKey: string;
};

export type CattleMovementIntent = Omit<CattleMovementPayload, "idempotencyKey">;
