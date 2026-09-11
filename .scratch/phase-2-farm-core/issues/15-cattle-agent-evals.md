# 15: Cattle agent evals

**What to build:** Automated evidence that the model actually picks the right tool for cattle work, which no unit test can provide. The failure that matters here is the model quietly choosing to display a table when the producer asked to move a herd, or choosing a lot when the request named no lot clearly enough.

The eval world gains lots, paddocks and occupancy so cattle cases have something real to reason about, and cases assert which tool was called with which arguments — never the wording of the reply.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] The eval world contains cattle lots, paddocks and open occupancy
- [ ] A case covers a clear movement request and asserts the correct tool and arguments
- [ ] A case covers an ambiguous lot reference where the correct behaviour is to ask, and asserts that nothing was written
- [ ] A case proves the movement is approval-gated and does not execute on its own
- [ ] A case asserts no cattle tool accepts a farm identifier
- [ ] Assertions are on tool calls and arguments, never on response text
- [ ] The recorded baseline is updated only after the run report has been reviewed
