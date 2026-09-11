# 04: Ambient transaction seam

**What to build:** Nothing changes for the user. Repositories currently hold a database connection directly, which means a write issued inside a transaction opened elsewhere silently runs outside that transaction. Until that is fixed, no single business operation can span more than one repository atomically — which the cattle movement in ticket 07 requires, since it must close an occupancy, write a movement, open an occupancy, record an event and queue an outbox row all or nothing.

This is a wide but additive change: the new way of obtaining a client coexists with the old, so the migration can proceed repository by repository with everything green throughout.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Repositories obtain their database client from an ambient transaction context rather than holding one directly
- [ ] Outside a transaction, behaviour is identical to today
- [ ] A test demonstrates two different repositories writing inside one transaction and rolling back together
- [ ] No public service signatures change
- [ ] The existing test and eval suites are unaffected
