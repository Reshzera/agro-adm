# 08: Outbox processor and rule engine

**What to build:** After a lot moves, the system checks the consequences and records what it found. Three deterministic rules run against every movement: whether the destination is now above its configured stocking level, whether the destination had rested long enough before the lot arrived, and whether a grazing review is now due. None of them block the move — the cattle may already have been moved in real life — they record findings.

Every evaluation stores the facts it used and the threshold it actually applied, including where that threshold came from, so an evaluation stays explainable even after someone changes the setting. A rule that lacks the data to decide records that it could not decide, rather than assuming a value.

No model is involved in any of this. The rules are deterministic functions over loaded state.

**Blocked by:** 07

**Status:** done

- [x] Events are published immediately after the transaction commits, and a periodic sweep recovers anything a crash left unprocessed
- [x] A handler that receives the same event twice does not double its effect
- [x] Failed processing is visible — attempt count and last error are recorded, not swallowed
- [x] The rule registry is an explicit list that can be read top to bottom
- [x] The three rules above evaluate on every movement and write an evaluation record each
- [x] Each evaluation stores its facts, the resolved threshold, where that threshold came from, and the rule version
- [x] A rule without sufficient data records that outcome explicitly instead of guessing
- [x] Each rule has tests covering the non-triggering case, the triggering case, the exact boundary, and the missing-data case
- [x] A documented note records that the processor assumes a single running instance, and what would need to change for more
