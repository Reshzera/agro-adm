# Outbox processing deployment note

The processor currently assumes one running application instance. Its in-memory
active set prevents duplicate work within that process, while the database
transaction and the unique event/rule/version key make handler effects
idempotent.

Before running multiple instances, add a database-backed claim/lease to each
outbox message (for PostgreSQL, `SELECT ... FOR UPDATE SKIP LOCKED` or an atomic
claim update with an expiry). Keep handlers idempotent because delivery remains
at least once, and monitor expired claims alongside failed messages.
