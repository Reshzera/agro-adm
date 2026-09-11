import type { ToolContext } from '../types';
import { serialize } from '../utils';

export async function getCattleOverview(context: ToolContext) {
  const [lots, paddocks] = await Promise.all([
    context.cattle.listLots(context.farmId),
    context.cattle.listPaddocks(context.farmId),
  ]);

  return serialize({
    lots: lots.map((lot) => ({
      id: lot.id,
      name: lot.name,
      category: lot.category,
      headCount: lot.headCount,
      active: lot.active,
      currentPaddock: lot.currentOccupancy?.paddock ?? null,
    })),
    paddocks: paddocks.map((paddock) => ({
      id: paddock.id,
      name: paddock.name,
      active: paddock.active,
      plannedCapacityHead: paddock.plannedCapacityHead,
      occupiedBy: paddock.occupancies.map((occupancy) => occupancy.lot),
    })),
  });
}
