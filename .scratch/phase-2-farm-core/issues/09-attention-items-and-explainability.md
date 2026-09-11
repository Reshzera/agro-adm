# 09: Attention items and explainability

**What to build:** A triggered rule becomes something the producer can be shown, and can ask about. Triggering the same rule again for the same paddock updates the existing item rather than stacking a second copy. Crucially, when the condition stops being true — the cattle were moved, the rest period completed — the item resolves itself. An alert that lingers after the producer has already acted destroys trust in the feed faster than a missing alert does.

Any item can be explained from stored facts alone, with no model involved: what was measured, what threshold applied, which events led here, and which version of the rule decided. The explanation is identical whether or not the AI is available, and an evaluation from last month still explains itself correctly after the threshold has since been changed.

**Blocked by:** 08

**Status:** implemented

- [x] A triggered rule produces an attention item carrying severity and the facts behind it
- [x] Re-triggering updates the existing item — last-seen time, facts, and the evaluation it points at — instead of creating a duplicate
- [x] When a previously triggering rule stops triggering, the open item resolves automatically
- [x] An explanation can be retrieved for any item, returning facts, the configuration used, the source events and the rule version
- [x] The explanation requires no model call and is complete without one
- [x] Changing a threshold afterwards does not alter the explanation of an earlier evaluation
- [x] Every attention item is traceable back to its originating movement by correlation id
