# 06: Cattle lot and paddock management

**What to build:** A producer can create, list and edit cattle lots and paddocks by hand, and place a lot into a paddock for the first time. This is the direct-manipulation surface — no commands, no events, no agent involvement yet. It exists so that the vertical slice in ticket 07 has something real to move.

A lot is identified by name, category and head count. It must be fully usable without registering a single individual animal, because most producers manage by lot.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] A producer can create, list and edit cattle lots, and create, list and edit paddocks including their management settings
- [ ] A lot can be placed into a paddock for the first time, opening an occupancy
- [ ] A lot with no individual animals behaves normally everywhere
- [ ] Every read and write is scoped to the requesting user's farm; another farm's lot or paddock is not found
- [ ] Leaving a management setting empty means the farm default applies, and the screen says so rather than showing a blank
- [ ] No domain events are emitted in this ticket
