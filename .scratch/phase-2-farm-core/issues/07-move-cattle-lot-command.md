# 07: Move a cattle lot — command, invariants, event and outbox

**What to build:** Moving a lot from one paddock to another, through a real business command rather than a row update. This is the vertical slice that proves the architecture: one operation travelling the whole path, traceable end to end by a single correlation id.

Impossible moves are refused before anything is written — a lot that does not exist or belongs to another farm, a destination that does not exist, belongs to another farm, or is inactive, a destination that is the same as where the lot already is, or an origin that disagrees with the lot's open occupancy. Everything that does happen happens together: the old occupancy closes, the movement is recorded, the new occupancy opens, the domain event is written and the outbox row is queued, in one transaction. A repeated request does not move the lot twice.

Backdating matters and must work: producers register movements that already happened in the field, so the time something occurred is recorded separately from the time it was written down.

This is the largest ticket in the phase. It is deliberately not split, because either half on its own cannot be demonstrated or verified.

**Blocked by:** 04, 06

**Status:** ready-for-agent

- [ ] Moving a lot goes through a command whose payload is validated by a single schema definition
- [ ] The agent-facing tool schema is derived from that same command schema, and therefore cannot accept a farm identifier
- [ ] Each blocking invariant listed above rejects with a typed error naming which check failed, before any write
- [ ] One transaction closes the previous occupancy, records the movement, opens the new occupancy, writes the domain event and queues the outbox row — a failure at any point leaves none of it
- [ ] The domain event carries correlation and causation identifiers, and distinguishes occurrence time from recording time
- [ ] Replaying the same request returns the original outcome instead of moving the lot again or emitting a second event
- [ ] A backdated movement is accepted and preserves the stated occurrence time
- [ ] The open-occupancy invariant from ticket 05 holds after every move
