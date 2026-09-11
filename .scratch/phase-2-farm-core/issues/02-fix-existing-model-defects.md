# 02: Fix existing model defects

**What to build:** Two correctness bugs that the new domain would otherwise build on top of. First, one farm per user is currently guaranteed only by an auth hook, and the farm for a request is resolved by taking whichever row comes back first with no ordering — so if a second farm ever exists for a user, which one they get is undefined. Second, filtering financial entries by category silently removes every revenue from the result, because revenues have no category; the user sees a shorter list and is told nothing.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The database enforces one farm per owner, via migration
- [ ] Farm context for a request resolves through a unique lookup rather than an unordered "first match"
- [ ] Filtering entries by category no longer silently drops revenues: either they remain in the result, or the endpoint states plainly that the filtered view is expenses-only
- [ ] A test covers each of the two, including the cross-farm case
