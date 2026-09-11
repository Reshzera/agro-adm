import { CattleMovementInvariantError } from '../errors/cattle-movement-invariant.error';

type MovementIntent = {
  fromPaddockId: string;
  toPaddockId: string;
  occurredAt: string;
};

type MovementSubjects<Lot, Destination, Occupancy> = {
  lot: Lot | null;
  destination: Destination | null;
  current: Occupancy | null;
};

/**
 * The one place the movement invariants live, so the preview and the command
 * can never disagree about whether a movement is allowed.
 */
export function assertMovementInvariants<
  Lot extends { id: string; active: boolean },
  Destination extends { id: string; active: boolean },
  Occupancy extends { paddockId: string; startedAt: Date },
>(
  input: MovementIntent,
  subjects: MovementSubjects<Lot, Destination, Occupancy>,
): { lot: Lot; destination: Destination; current: Occupancy } {
  const { lot, destination, current } = subjects;

  if (!lot) {
    throw new CattleMovementInvariantError(
      'movement.lot_exists',
      'The cattle lot does not exist in this farm.',
    );
  }
  if (!lot.active) {
    throw new CattleMovementInvariantError(
      'movement.lot_active',
      'An inactive cattle lot cannot be moved.',
    );
  }
  if (!destination) {
    throw new CattleMovementInvariantError(
      'movement.destination_exists',
      'The destination paddock does not exist in this farm.',
    );
  }
  if (!destination.active) {
    throw new CattleMovementInvariantError(
      'movement.destination_active',
      'The destination paddock is inactive.',
    );
  }
  if (!current || current.paddockId !== input.fromPaddockId) {
    throw new CattleMovementInvariantError(
      'movement.source_matches_current_location',
      'The stated origin does not match the lot current occupancy.',
    );
  }
  if (current.paddockId === destination.id) {
    throw new CattleMovementInvariantError(
      'movement.destination_is_different',
      'The destination must be different from the current paddock.',
    );
  }
  if (new Date(input.occurredAt) < current.startedAt) {
    throw new CattleMovementInvariantError(
      'movement.occurred_after_occupancy_started',
      'The movement cannot occur before the current occupancy started.',
    );
  }

  return { lot, destination, current };
}
