# 13: Georeferenced map and paddock drawing

**What to build:** The producer draws paddock boundaries on satellite imagery, in real coordinates, and edits them afterwards by dragging vertices. This reverses an earlier decision in this codebase to store boundaries relative to an uploaded image: real coordinates are what make computed area, satellite imagery and future weather possible, and the stored shape already records which space it was drawn in, so old image-relative shapes remain readable.

Computed area is shown beside the producer's own usable-area figure, but does not replace it. A polygon traced on satellite imagery includes scrub, rock, water and tracks, so geometric area systematically overstates what cattle can actually graze — and a stocking rule fed the overstated number under-warns exactly when it matters most. The producer's figure stays authoritative for rules; a large divergence between the two is surfaced as an observation, never as an automatic correction.

**Blocked by:** 05, 11

**Status:** ready-for-agent

- [ ] A paddock boundary can be drawn and re-edited over satellite imagery, stored in real world coordinates
- [ ] Each stored shape records the space it was drawn in, and previously stored image-relative shapes still load without error
- [ ] Computed geometric area is displayed next to the producer-entered usable area
- [ ] Rules continue to use the producer-entered figure; the computed one is advisory
- [ ] A large divergence between the two is surfaced to the producer and changes nothing on its own
- [ ] The agent can focus the map on given paddocks, but cannot create or edit a boundary
- [ ] The satellite tile source is a single configuration value, not a dependency spread through the code
- [ ] The shared fixture farm is converted to real coordinates and its paddocks render correctly
