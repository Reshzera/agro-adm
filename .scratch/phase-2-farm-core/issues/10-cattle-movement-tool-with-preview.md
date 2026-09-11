# 10: Cattle movement tool with preview and confirmation

**What to build:** The producer can move a lot by saying so. Asking to put a named lot into a named paddock resolves those names, and before anything happens the producer is shown what will actually change — how many head, from where, to where, and the real advisory warnings the rules produce, such as the destination reaching most of its configured stocking level. A raw dump of identifiers is not acceptable here; the confirmation has to be readable by someone standing in a field.

The preview runs the same invariants and the same rules the command runs, without writing anything, so the two can never disagree about what would happen. Approving executes through exactly the same command path the manual screen uses.

Creating a lot is included, because it is genuinely voice-shaped work. Editing paddock geometry is not: drawing a boundary is a spatial act, and a paddock created without one would break the map and every rule that divides by area.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] A natural-language request to move a named lot to a named paddock resolves both names and selects the movement tool
- [ ] The tool requires explicit approval before it executes
- [ ] The confirmation shows head count, origin, destination and the rules' actual warnings — not raw arguments
- [ ] The preview uses the same invariants and rule evaluators as the command and writes nothing
- [ ] Approving executes through the same command path as the manual screen; declining writes nothing at all
- [ ] Creating a cattle lot is available to the agent and also requires confirmation
- [ ] An ambiguous request — a lot name matching more than one lot, or none — asks rather than picking one
- [ ] No new tool accepts a farm identifier
