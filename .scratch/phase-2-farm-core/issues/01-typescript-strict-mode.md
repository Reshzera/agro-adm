# 01: TypeScript strict mode

**What to build:** Nothing changes for the user. This is a prefactor: the codebase stops accepting implicit `any` before the event and rule tables arrive, because those tables are built almost entirely on loosely-typed JSON payloads (event payloads, rule facts, suggested actions) and that is exactly where an implicit `any` stops being cosmetic. Doing this after the new domain lands means fixing a much larger surface.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Full strict mode is on in both the backend and the frontend, with no lingering per-flag opt-outs for implicit `any` or bind/call/apply checking
- [x] The unchecked casts bridging Prisma's JSON columns to AI SDK message types are replaced by a typed boundary or a runtime validator, rather than passed through
- [x] The backend test suite passes
- [x] The agent eval suite shows no regression against the recorded baseline
- [x] The frontend type-check and build pass
