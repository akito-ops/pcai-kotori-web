# Local Responder Cutover Safety Gate

This document defines the conditions for switching `app.js` from the legacy inline Kotori reply logic to the persona-specific local responder.

## Current state

- Production/main is untouched.
- Work continues only on `refactor/modular-pcai-core`.
- Known-good rollback branch: `safety/responder-pre-cutover`.
- `PCAILocalResponder` is created during bootstrap and exposed read-only.
- `createLocalReplyRouter()` exists and falls back to the legacy responder on exceptions or empty replies.
- The legacy inline responder remains in `app.js` until staged cutover is verified.

## Required gates before cutover

1. `npm test` succeeds on the exact cutover commit.
2. Repository-wide JavaScript syntax checks succeed.
3. Persona/runtime/model/memory safety invariants succeed.
4. Local responder parity tests succeed for identity, greetings, emotional branches, memory recall, temporal recall, and lifecycle messages.
5. Bootstrap responder wiring test succeeds.
6. The new route keeps the legacy reply function available as an immediate fallback.
7. Storage key remains `pcai.kagaribi-kotori.web.v02` during this migration.
8. No paid AI fallback, autonomous actions, tool execution, persona-core rewrite, or invented-memory behavior is enabled.
9. `main` must not be changed until the branch passes final review and browser-level verification.

## Staged cutover

### Stage A — shadow-ready

- New responder exists and is tested.
- Legacy responder remains active.
- No behavior change for users.

### Stage B — guarded cutover

- `app.js` prefers `PCAILocalResponder.reply()` through `createLocalReplyRouter()`.
- Legacy inline reply remains callable as fallback.
- Lifecycle greetings may remain legacy until reply routing is proven stable.

### Stage C — lifecycle cutover

- Initial/returning/reset/sleep messages move to the persona responder.
- Legacy lifecycle strings remain temporarily available for rollback.

### Stage D — legacy removal

Only after browser-level verification and repeated CI success:

- Remove the inline Kotori responder from `app.js`.
- Add regression checks preventing persona-specific dialogue from returning to the generic app engine.

## Immediate rollback conditions

Rollback to the previous known-good commit/branch if any of the following occurs:

- Existing memories are not visible or writable.
- Local responder throws during normal offline conversation.
- Persona identity or facts become inconsistent.
- AI connection behavior changes unexpectedly.
- Any safety CI step fails.
- Unknown persona/use-case/model is accepted instead of failing closed.

## Rollback reference

`safe responder pre-cutover`: `safety/responder-pre-cutover`

Do not merge this refactor to `main` solely because unit/contract CI is green. Browser-level functional verification is still required before production merge.
