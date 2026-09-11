# 14: Attention items in the workspace

**What to build:** The producer can see what needs attention and ask why. Items appear in the panel ordered by severity, each stating the situation in concrete terms — how many days the lot has been in the paddock against how many the farm asked for — rather than a vague warning. Asking the agent why an item is there returns the stored facts behind it, not an improvisation.

Items that have resolved themselves are gone from the panel without the producer dismissing them.

**Blocked by:** 09, 11

**Status:** ready-for-agent

- [ ] The panel lists current attention items with their severity
- [ ] Each item states the measured value and the configured threshold, not a bare warning
- [ ] Opening an item shows the deterministic explanation, including which rule and which version decided
- [ ] Asking the agent why an item appeared answers from the stored facts, and does not invent supporting detail
- [ ] The explanation still renders when the model is unavailable
- [ ] An item that resolved itself no longer appears
- [ ] Each item links through to the paddock or lot it concerns
