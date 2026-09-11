export type CattleCategory =
  | "CALVES"
  | "HEIFERS"
  | "COWS"
  | "BULLS"
  | "STEERS"
  | "FINISHING";

export type SettingSource = "PADDOCK" | "FARM" | "SYSTEM";

export type CattleLot = {
  id: string;
  name: string;
  category: CattleCategory;
  purpose: string | null;
  headCount: number;
  startedOn: string | null;
  notes: string | null;
  active: boolean;
  currentOccupancy: {
    id: string;
    startedAt: string;
    paddock: { id: string; name: string };
  } | null;
};

export type ResolvedSetting<T> = { value: T | null; source: SettingSource };

export type Paddock = {
  id: string;
  name: string;
  hectares: string | null;
  usableAreaHa: string | null;
  maxGrazingDays: number | null;
  minRestDays: number | null;
  plannedCapacityHead: number | null;
  forageType: string | null;
  active: boolean;
  occupancies: {
    id: string;
    startedAt: string;
    lot: { id: string; name: string; headCount: number };
  }[];
  effectiveSettings: {
    maxGrazingDays: ResolvedSetting<number>;
    minRestDays: ResolvedSetting<number>;
    stockingRateHeadPerHa: ResolvedSetting<string>;
  };
};

export type CattleMovementResult = {
  movement: {
    id: string;
    lot: { id: string; name: string; headCount: number };
    fromPaddock: { id: string; name: string };
    toPaddock: { id: string; name: string };
    occurredAt: string;
    recordedAt: string;
    reason: string | null;
    notes: string | null;
  };
  event: {
    id: string;
    correlationId: string;
    causationId: string | null;
  };
};

export type MovementPreview = {
  lot: { id: string; name: string; headCount: number };
  fromPaddock: { id: string; name: string };
  toPaddock: { id: string; name: string };
  occurredAt: string;
  headCount: number;
  destination: {
    headCountAfter: number | null;
    capacity: number | null;
    capacitySource: SettingSource | "UNCONFIGURED";
    utilizationPercent: number | null;
  };
  warnings: { ruleId: string; severity: string; message: string }[];
};
