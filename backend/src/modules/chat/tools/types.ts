import type { CattleService } from '../../cattle/cattle.service';
import type { FinancialService } from '../../financial/financial.service';
import type { FarmService } from '../../farm/farm.service';

export type ToolContext = {
  farmId: string;
  actorId: string;
  now: Date;
  financial: FinancialService;
  farms: FarmService;
  cattle: CattleService;
};
