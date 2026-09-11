import { ConflictException } from '@nestjs/common';

export type CattleMovementCheck =
  | 'movement.lot_exists'
  | 'movement.lot_active'
  | 'movement.destination_exists'
  | 'movement.destination_active'
  | 'movement.source_matches_current_location'
  | 'movement.destination_is_different'
  | 'movement.occurred_after_occupancy_started'
  | 'movement.idempotency_key_reused'
  | 'movement.concurrent_change';

export class CattleMovementInvariantError extends ConflictException {
  constructor(
    readonly check: CattleMovementCheck,
    message: string,
  ) {
    super({
      statusCode: 409,
      error: 'Cattle movement rejected',
      check,
      message,
    });
  }
}
