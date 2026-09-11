# 12: Workspace charts

**What to build:** The producer can turn a question into a chart. Asking to see expenses by category over time produces one in the panel, and asking to change how it is broken down redraws it.

The numbers are never the model's. They come from the same deterministic queries that feed the tables; the model chooses only the presentation — which shape, what to group by, what to put on each axis.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Bar, line and pie charts render in the workspace panel from a single charting tool
- [ ] Every value displayed comes from a query result, never from the model
- [ ] Changing the grouping or the period redraws the existing chart rather than opening a second one
- [ ] A requested chart shape that is not supported degrades with a clear message instead of a broken panel
- [ ] Charts are readable in both light and dark presentation
