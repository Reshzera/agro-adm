# 05: Cattle, paddock and event-trail schema

**What to build:** One migration laying down every table the rest of the phase needs, so later slices do not each race a migration of their own. Nothing is user-visible yet.

Two invariants are enforced by the database rather than by application code, because making the bad state unrepresentable removes the need to later write a rule that detects it:

```
UNIQUE (group_id) WHERE ended_at IS NULL          -- a lot occupies at most one paddock
UNIQUE (farm_id, rule_id, scope_id)               -- one open attention item per rule per scope
  WHERE status IN ('new','seen')
```

Occupancy is stored as intervals only. There is deliberately no denormalised "current paddock" pointer on the lot: a second source of truth drifts, and the interval table plus the index above cannot.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A single migration creates cattle lots, individual animals, paddock occupancy intervals, and cattle movements
- [ ] Individual animals are modelled but unused: a lot is fully workable with a head count and zero animal rows
- [ ] Paddocks gain optional management fields — usable area, maximum grazing days, minimum rest days, planned capacity, forage type — where null means "inherit the farm default"
- [ ] The farm gains coordinates
- [ ] Both partial unique indexes above exist and are exercised by a test that proves the duplicate is rejected
- [ ] Tables exist for the domain event ledger, the outbox, rule evaluations, attention items, and idempotency keys
- [ ] The event ledger records correlation and causation, distinguishes when something occurred from when it was recorded, and identifies whether the actor was a human, the agent, or the system
- [ ] The seed fixture and the in-memory test fakes gain lots and occupancy
- [ ] A full database reset runs clean
