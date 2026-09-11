import type { FarmRule } from './rule.types';
import {
  GrazingReviewDueRule,
  PaddockRestPeriodRule,
  PaddockStockingLevelRule,
} from './rules';

// Deliberately explicit: execution order and the complete movement rule set are
// reviewable here without runtime discovery or decorator magic.
export const MOVEMENT_RULES: readonly FarmRule[] = [
  new PaddockStockingLevelRule(),
  new PaddockRestPeriodRule(),
  new GrazingReviewDueRule(),
];
