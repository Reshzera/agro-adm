# 11: Workspace store and panel

**What to build:** The main screen gains a third area the agent drives. Asking for data opens a table in that panel instead of dumping rows into the conversation, and a follow-up question replaces what is on screen rather than appending another copy below it. The chat answers in a sentence; the panel holds the state.

The panel is agent-owned for now: the agent writes it, the producer reads it. The agent cannot see changes it did not make, so every command it sends must describe the whole view rather than a change to the current one. A partial update like "add this filter" is out; the command carries the complete specification every time.

The workspace state is one view at a time, plus a bounded history so going back is possible. The existing financial screen is untouched and stays agent-free — that duplication is deliberate and temporary.

**Blocked by:** 03, 06

**Status:** ready-for-agent

- [ ] The main application screen gains an agent-driven panel alongside the conversation
- [ ] Workspace state lives outside the React render cycle and can be read imperatively at request time
- [ ] Opening a table and opening a single entity are available as tools that render on the client rather than executing on the server
- [ ] Every workspace command is complete in itself; no command expresses a delta against what is currently displayed
- [ ] A follow-up question replaces the current view instead of stacking a new one
- [ ] Going back to the previous view works, with a bounded history
- [ ] The client's mechanism for returning a tool result is no longer tied to one specific tool
- [ ] Page, entity and date range are reflected in the URL so a link still resolves
- [ ] Unit tests cover the state reducer and command validation, including an unrecognised command
- [ ] The existing financial screen still works, unchanged and without agent involvement
