# 03: Server-side agent loop

**What to build:** The agent finishes a multi-step thought on the server instead of relying on the browser to notice it is unfinished and re-send. Today the server runs exactly one model step per request and the client closes the loop, which means the eval suite and production exercise different loop semantics — the green baseline is measuring something production does not do. After this, a single user turn can call a query tool and then act on the result without a browser round-trip, which every later workspace ticket depends on.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The server runs multiple model steps within one request, bounded by an explicit step limit
- [ ] The conversation advances without the client having to auto-resend assistant-role messages to continue it
- [ ] Eval and production share the same loop configuration and step limit
- [ ] The existing approval flow for deleting an expense still works end to end
- [ ] The agent eval suite shows no regression against the recorded baseline
